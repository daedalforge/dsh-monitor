const GB = 1024 ** 3
const MB = 1024 ** 2
const DOMAIN_RULES = [
  { key: 'data', label: 'Données', test: (name) => /^(mysql|postgres|postgresql|redis|mailpit|mongo|mariadb|minio|elastic|opensearch|clickhouse|cassandra|rabbitmq)(-|$)/.test(name) },
  { key: 'obs', label: 'Observabilité', test: (name) => /^(monitoring|prometheus|grafana|alertmanager|loki|tempo|otel|jaeger|thanos|metrics)(-|$)/.test(name) },
  { key: 'platform', label: 'Plateforme', test: (name) => /^(kube-|default$|ingress|external-secrets|cert-manager|local-path|reloader|metrics-server|zitadel|terraformer|gatekeeper|node-problem|descheduler)/.test(name) },
]

function domainOf(name, hasStatefulset, hasDeployment) {
  const hit = DOMAIN_RULES.find((rule) => rule.test(name))
  if (hit) return hit
  if (hasDeployment) return { key: 'app', label: 'Applicatif' }
  if (hasStatefulset) return DOMAIN_RULES[0]
  return DOMAIN_RULES[2]
}

export function fr(value, digits = 1) {
  const number = Number(value) || 0
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(number)
}

export function pctFr(value) {
  return (Number(value) || 0).toFixed(1).replace('.', ',')
}

export function bytesFr(bytes) {
  const value = Number(bytes) || 0
  if (value >= GB) return `${(value / GB).toFixed(1).replace('.', ',')} Gio`
  if (value >= MB) return `${(value / MB).toFixed(0)} Mio`
  if (value >= 1024) return `${Math.round(value / 1024)} Kio`
  return `${Math.round(value)} o`
}

export function ageLabel(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0))
  if (value < 1) return "moins d'une minute"
  if (value < 60) return `${value} min`
  const hours = Math.floor(value / 60)
  const rest = value % 60
  if (hours < 24) return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`
  const days = Math.floor(hours / 24)
  const dayHours = hours % 24
  return dayHours ? `${days} j ${dayHours} h` : `${days} j`
}

export function minutesSince(iso, now) {
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return 0
  return Math.max(0, Math.round((now - at) / 60000))
}

export function quantityCpu(value) {
  const match = String(value ?? '').trim().match(/^([\d.]+)(m|u|n)?$/)
  if (!match) return 0
  const units = { '': 1, m: 1e-3, u: 1e-6, n: 1e-9 }
  return Number(match[1]) * (units[match[2] ?? ''] ?? 1)
}

export function quantityBytes(value) {
  const match = String(value ?? '').trim().match(/^([\d.]+)\s*(Ki|Mi|Gi|Ti|K|M|G|T)?$/)
  if (!match) return 0
  const units = { '': 1, Ki: 1024, Mi: 1024 ** 2, Gi: 1024 ** 3, Ti: 1024 ** 4, K: 1e3, M: 1e6, G: 1e9, T: 1e12 }
  return Math.round(Number(match[1]) * (units[match[2] ?? ''] ?? 1))
}

function podRestarts(pod) {
  return (pod?.status?.containerStatuses ?? []).reduce((sum, status) => sum + Number(status?.restartCount ?? 0), 0)
}

function podWaiting(pod) {
  for (const status of pod?.status?.containerStatuses ?? []) {
    if (status?.state?.waiting?.reason) return String(status.state.waiting.reason)
    if (status?.state?.terminated?.reason) return String(status.state.terminated.reason)
  }
  return ''
}

function podRequests(pod) {
  let cpu = 0
  let memory = 0
  for (const container of pod?.spec?.containers ?? []) {
    cpu += quantityCpu(container?.resources?.requests?.cpu)
    memory += quantityBytes(container?.resources?.requests?.memory)
  }
  return { cpu, memory }
}

function nodeReady(node) {
  return (node?.status?.conditions ?? []).some((condition) => condition.type === 'Ready' && condition.status === 'True')
}

const namespaceOf = (item) => String(item?.metadata?.namespace ?? '')
const nameOf = (item) => String(item?.metadata?.name ?? '?')

function secretCode(externalSecret, fallback) {
  const conditions = externalSecret?.status?.conditions ?? []
  for (const condition of conditions) {
    const message = String(condition?.message ?? '')
    const code = message.match(/AADSTS\d+/)
    if (code) return code[0]
  }
  return fallback || ''
}

function secretMessage(externalSecret) {
  const conditions = externalSecret?.status?.conditions ?? []
  const failing = conditions.find((condition) => String(condition?.status ?? '') !== 'True' || String(condition?.reason ?? '') !== 'SecretSynced')
  return String(failing?.message ?? conditions[0]?.message ?? '').replace(/\s+/g, ' ').slice(0, 240)
}

function sharedPrefix(names) {
  if (names.length < 2) return ''
  let prefix = names[0]
  for (const name of names.slice(1)) {
    let index = 0
    while (index < prefix.length && index < name.length && prefix[index] === name[index]) index += 1
    prefix = prefix.slice(0, index)
    if (!prefix) break
  }
  return prefix.replace(/[-_]$/, '')
}

function groupBy(items, key) {
  const map = new Map()
  for (const item of items) {
    const value = key(item)
    const bucket = map.get(value)
    if (bucket) bucket.push(item)
    else map.set(value, [item])
  }
  return map
}

function sortNames(entries) {
  return [...entries].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function buildK8sModel({ raw = {}, env = {}, config = {}, now = Date.now(), last = null } = {}) {
  const nodesRaw = raw.nodes ?? []
  const podsRaw = raw.pods ?? []
  const deploymentsRaw = raw.deployments ?? []
  const statefulsetsRaw = raw.statefulsets ?? []
  const daemonsetsRaw = raw.daemonsets ?? []
  const jobsRaw = raw.jobs ?? []
  const cronjobsRaw = raw.cronjobs ?? []
  const namespacesRaw = raw.namespaces ?? []
  const pvcsRaw = raw.pvcs ?? []
  const eventsRaw = raw.events ?? []
  const servicesRaw = raw.services ?? []
  const ingressesRaw = raw.ingresses ?? []
  const secretsRaw = raw.externalSecrets ?? []

  const attention = Number(config?.pods?.attentionRedemarrages ?? 2)
  const alerte = Number(config?.pods?.alerteRedemarrages ?? 5)

  const nodes = nodesRaw.map((node) => {
    const pressure = ['MemoryPressure', 'DiskPressure', 'PIDPressure'].filter((type) => (node?.status?.conditions ?? []).some((condition) => condition.type === type && condition.status === 'True'))
    return {
      name: nameOf(node),
      ready: nodeReady(node),
      pressure,
      cpu: quantityCpu(node?.status?.allocatable?.cpu),
      memory: quantityBytes(node?.status?.allocatable?.memory),
      pods: Number(node?.status?.allocatable?.pods ?? 0),
      version: String(node?.status?.nodeInfo?.kubeletVersion ?? ''),
      os: String(node?.status?.nodeInfo?.osImage ?? ''),
      age: minutesSince(node?.metadata?.creationTimestamp, now),
    }
  })

  const pods = podsRaw.map((pod) => {
    const restarts = podRestarts(pod)
    const waiting = podWaiting(pod)
    const phase = String(pod?.status?.phase ?? '')
    const start = pod?.status?.startTime ? Date.parse(pod.status.startTime) : 0
    const age = start ? Math.max(0, Math.floor((now - start) / 60000)) : 0
    const succeeded = phase === 'Succeeded'
    const ready = succeeded || (pod?.status?.conditions ?? []).some((condition) => condition.type === 'Ready' && condition.status === 'True')
    const oom = (pod?.status?.containerStatuses ?? []).some((status) => status?.lastState?.terminated?.reason === 'OOMKilled')
    const blocked = ['CrashLoopBackOff', 'ImagePullBackOff', 'ErrImagePull', 'InvalidImageName', 'CreateContainerConfigError', 'Error'].includes(waiting)
    const restartTimes = (pod?.status?.containerStatuses ?? [])
      .map((status) => status?.lastState?.terminated?.finishedAt ?? status?.state?.running?.startedAt ?? '')
      .filter(Boolean)
      .sort()
    let state = 'ok'
    if (phase === 'Failed') state = 'bad'
    else if (!succeeded) {
      if (blocked) state = 'bad'
      else if (restarts >= alerte) state = 'warn'
      else if (restarts >= attention || !ready || waiting) state = 'warn'
    }
    const namespace = namespaceOf(pod)
    const name = nameOf(pod)
    return {
      name,
      namespace,
      phase,
      ready,
      restarts,
      waiting,
      blocked,
      lastRestart: String(restartTimes.at(-1) ?? ''),
      containerStarted: String((pod?.status?.containerStatuses ?? []).map((status) => status?.state?.running?.startedAt ?? '').filter(Boolean).sort().at(-1) ?? ''),
      oom,
      age,
      state,
      owner: String(pod?.metadata?.ownerReferences?.[0]?.name ?? ''),
      ownerKind: String(pod?.metadata?.ownerReferences?.[0]?.kind ?? ''),
      requests: podRequests(pod),
      target: { namespace, kind: 'pod', name },
    }
  })

  const restartsByOwner = new Map()
  for (const pod of pods) {
    if (!pod.owner) continue
    const key = `${pod.namespace}/${pod.owner}`
    restartsByOwner.set(key, (restartsByOwner.get(key) ?? 0) + pod.restarts)
  }
  const restartsOf = (namespace, name) => restartsByOwner.get(`${namespace}/${name}`) ?? 0

  const deployments = deploymentsRaw.map((deployment) => {
    const desired = Number(deployment?.spec?.replicas ?? 0)
    const available = Number(deployment?.status?.availableReplicas ?? 0)
    const ready = Number(deployment?.status?.readyReplicas ?? 0)
    const updated = Number(deployment?.status?.updatedReplicas ?? 0)
    const zero = desired === 0 && available === 0
    const state = zero ? 'ok' : available < desired ? (available === 0 ? 'bad' : 'warn') : updated < desired ? 'warn' : 'ok'
    const namespace = namespaceOf(deployment)
    const name = nameOf(deployment)
    return {
      kind: 'deployment',
      kindLabel: 'Deployment',
      name,
      namespace,
      desired,
      available,
      ready,
      updated,
      zero,
      restarts: restartsOf(namespace, name),
      state,
      target: { namespace, kind: 'deployment', name },
    }
  })

  const statefulsets = statefulsetsRaw.map((set) => {
    const namespace = namespaceOf(set)
    const name = nameOf(set)
    const desired = Number(set?.spec?.replicas ?? 0)
    const ready = Number(set?.status?.readyReplicas ?? 0)
    return {
      kind: 'statefulset',
      kindLabel: 'StatefulSet',
      name,
      namespace,
      desired,
      available: ready,
      ready,
      zero: desired === 0,
      restarts: restartsOf(namespace, name),
      state: desired > 0 && ready < desired ? 'warn' : 'ok',
      target: { namespace, kind: 'statefulset', name },
    }
  })

  const daemonsets = daemonsetsRaw.map((set) => {
    const namespace = namespaceOf(set)
    const name = nameOf(set)
    const desired = Number(set?.status?.desiredNumberScheduled ?? 0)
    const ready = Number(set?.status?.numberReady ?? 0)
    return {
      kind: 'daemonset',
      kindLabel: 'DaemonSet',
      name,
      namespace,
      desired,
      available: ready,
      ready,
      zero: desired === 0,
      restarts: 0,
      state: desired > 0 && ready < desired ? 'warn' : 'ok',
      target: { namespace, kind: 'daemonset', name },
    }
  })

  const jobs = jobsRaw.map((job) => {
    const succeeded = Number(job?.status?.succeeded ?? 0)
    const failed = Number(job?.status?.failed ?? 0)
    const active = Number(job?.status?.active ?? 0)
    const completions = Number(job?.spec?.completions ?? 1)
    const namespace = namespaceOf(job)
    const name = nameOf(job)
    const finishedAt = job?.status?.completionTime ?? job?.status?.startTime
    return {
      name,
      namespace,
      succeeded,
      failed,
      active,
      completions,
      finishedAt: String(finishedAt ?? ''),
      state: failed > 0 ? 'bad' : 'ok',
      target: { namespace, kind: 'job', name },
    }
  })

  const cronjobs = cronjobsRaw.map((cronjob) => {
    const namespace = namespaceOf(cronjob)
    const name = nameOf(cronjob)
    return {
      name,
      namespace,
      schedule: String(cronjob?.spec?.schedule ?? ''),
      suspended: cronjob?.spec?.suspend === true,
      active: Number(cronjob?.status?.active?.length ?? 0),
      lastSchedule: String(cronjob?.status?.lastScheduleTime ?? ''),
      created: String(cronjob?.metadata?.creationTimestamp ?? ''),
      state: cronjob?.spec?.suspend === true ? 'warn' : 'ok',
    }
  })

  const pvcs = pvcsRaw.map((claim) => {
    const namespace = namespaceOf(claim)
    const name = nameOf(claim)
    const phase = String(claim?.status?.phase ?? '')
    return {
      name,
      namespace,
      phase,
      storageClass: String(claim?.spec?.storageClassName ?? ''),
      capacity: quantityBytes(claim?.status?.capacity?.storage),
      state: phase === 'Bound' ? 'ok' : 'bad',
    }
  })

  const services = servicesRaw.map((service) => {
    const spec = service?.spec ?? {}
    const ports = (spec.ports ?? []).map((port) => ({
      port: Number(port?.port ?? 0),
      nodePort: Number(port?.nodePort ?? 0),
      protocol: String(port?.protocol ?? 'TCP'),
    }))
    return {
      name: nameOf(service),
      namespace: namespaceOf(service),
      type: String(spec.type ?? 'ClusterIP'),
      clusterIp: String(spec.clusterIP ?? ''),
      ports,
      selector: Object.keys(spec.selector ?? {}),
    }
  })

  const routes = []
  for (const ingress of ingressesRaw) {
    const namespace = namespaceOf(ingress)
    const name = nameOf(ingress)
    const tls = (ingress?.spec?.tls ?? []).flatMap((entry) => entry?.hosts ?? [])
    for (const rule of ingress?.spec?.rules ?? []) {
      const host = String(rule?.host ?? '')
      const paths = rule?.http?.paths ?? []
      if (!paths.length) routes.push({ ingress: name, namespace, host, path: '/', service: '', port: 0, tls: tls.includes(host) })
      for (const entry of paths) {
        routes.push({
          ingress: name,
          namespace,
          host,
          path: String(entry?.path ?? '/'),
          service: String(entry?.backend?.service?.name ?? ''),
          port: Number(entry?.backend?.service?.port?.number ?? 0),
          tls: tls.includes(host),
        })
      }
    }
  }

  const logCode = String(raw.secretsLog?.code ?? '')
  const eventCodes = new Map()
  for (const event of eventsRaw) {
    const object = event?.involvedObject ?? {}
    if (String(object.kind ?? '') !== 'ExternalSecret') continue
    const code = String(event?.message ?? '').match(/AADSTS\d+/)
    if (!code) continue
    eventCodes.set(`${object.namespace}/${object.name}`, code[0])
  }
  const externalSecrets = secretsRaw.map((secret) => {
    const conditions = secret?.status?.conditions ?? []
    const synced = conditions.some((condition) => String(condition?.status ?? '') === 'True')
    const reason = String(conditions.find((condition) => String(condition?.status ?? '') !== 'True')?.reason ?? conditions[0]?.reason ?? '')
    const at = String(conditions[0]?.lastTransitionTime ?? '')
    return {
      name: nameOf(secret),
      namespace: namespaceOf(secret),
      state: synced ? 'ok' : 'bad',
      reason,
      code: synced ? '' : secretCode(secret, eventCodes.get(`${namespaceOf(secret)}/${nameOf(secret)}`) || logCode),
      message: secretMessage(secret),
      at,
      target: { namespace: namespaceOf(secret), kind: 'externalsecret', name: nameOf(secret) },
    }
  })

  const nsStatefulsets = groupBy(statefulsets, (set) => set.namespace)
  const nsDeployments = groupBy(deployments, (deployment) => deployment.namespace)
  const nsPods = groupBy(pods, (pod) => pod.namespace)
  const nsServices = groupBy(services, (service) => service.namespace)
  const nsSecrets = groupBy(externalSecrets, (secret) => secret.namespace)
  const nsRoutes = groupBy(routes, (route) => route.namespace)

  const workloads = [...deployments, ...statefulsets, ...daemonsets]
  const namespaceNames = [...new Set([
    ...namespacesRaw.map((item) => nameOf(item)),
    ...pods.map((pod) => pod.namespace),
    ...workloads.map((item) => item.namespace),
    ...jobs.map((job) => job.namespace),
    ...cronjobs.map((cronjob) => cronjob.namespace),
  ])].filter(Boolean).sort()

  const namespaceRows = namespaceNames.map((name) => {
    const items = nsPods.get(name) ?? []
    const deploys = nsDeployments.get(name) ?? []
    const sets = nsStatefulsets.get(name) ?? []
    const secrets = nsSecrets.get(name) ?? []
    const badPods = items.filter((pod) => pod.state === 'bad').length
    const warnPods = items.filter((pod) => pod.state === 'warn').length
    const secretErrors = secrets.filter((secret) => secret.state === 'bad').length
    const restarts = items.reduce((sum, pod) => sum + pod.restarts, 0)
    const activeWorkloads = [...deploys, ...sets].filter((item) => !item.zero)
    const empty = items.length === 0 && activeWorkloads.length === 0
    const unstable = items.filter((pod) => pod.restarts >= alerte && pod.phase !== 'Succeeded').length
    let state = 'ok'
    if (badPods > 0 || activeWorkloads.some((item) => item.state === 'bad')) state = 'bad'
    else if (unstable > 0 || secretErrors > 0 || activeWorkloads.some((item) => item.state === 'warn')) state = 'warn'
    const domain = domainOf(name, sets.length > 0, deploys.length > 0)
    return {
      name,
      domain: domain.key,
      domainLabel: domain.label,
      state,
      empty,
      pods: items.length,
      unstable,
      warnPods,
      restarts,
      workloads: deploys.length + sets.length,
      activeWorkloads: activeWorkloads.length,
      daemonsets: (workloads.filter((item) => item.namespace === name && item.kind === 'daemonset')).length,
      statefulsets: sets.length,
      services: (nsServices.get(name) ?? []).length,
      routes: (nsRoutes.get(name) ?? []).length,
      secrets: secrets.length,
      secretErrors,
      target: { namespace: name },
    }
  })

  const domainGroups = new Map()
  for (const row of namespaceRows) {
    const bucket = domainGroups.get(row.domain) ?? { key: row.domain, label: row.domainLabel, namespaces: [], pods: 0, workloads: 0, services: 0, routes: 0, secretErrors: 0, state: 'ok' }
    bucket.namespaces.push(row.name)
    bucket.pods += row.pods
    bucket.workloads += row.activeWorkloads
    bucket.services += row.services
    bucket.routes += row.routes
    bucket.secretErrors += row.secretErrors
    if (row.state === 'bad') bucket.state = 'bad'
    else if (row.state === 'warn' && bucket.state !== 'bad') bucket.state = 'warn'
    domainGroups.set(row.domain, bucket)
  }
  const domainOrder = ['app', 'data', 'obs', 'platform']
  const domains = domainOrder.map((key) => domainGroups.get(key)).filter(Boolean)

  const ingressServices = services.filter((service) => service.namespace === 'ingress-nginx' && service.type === 'NodePort')
  const nodePort = ingressServices.flatMap((service) => service.ports.map((port) => port.nodePort)).find((port) => port > 0) ?? 0
  const ingressRoutes = routes.filter((route) => route.namespace === 'ingress-nginx' || route.host)
  const domainsByHost = groupBy(routes, (route) => route.host)

  const counts = {
    nodes: { total: nodes.length, ready: nodes.filter((node) => node.ready).length },
    pods: {
      total: pods.length,
      running: pods.filter((pod) => pod.phase === 'Running').length,
      pending: pods.filter((pod) => pod.phase === 'Pending').length,
      succeeded: pods.filter((pod) => pod.phase === 'Succeeded').length,
      failed: pods.filter((pod) => pod.phase === 'Failed').length,
      notReady: pods.filter((pod) => !pod.ready).length,
      unstable: pods.filter((pod) => pod.restarts >= alerte && pod.phase !== 'Succeeded').length,
    },
    deployments: {
      total: deployments.length,
      available: deployments.filter((deployment) => !deployment.zero && deployment.available >= deployment.desired).length,
      unavailable: deployments.filter((deployment) => !deployment.zero && deployment.available < deployment.desired).length,
      zero: deployments.filter((deployment) => deployment.zero).length,
    },
    statefulsets: { total: statefulsets.length, ready: statefulsets.filter((set) => set.state === 'ok').length },
    daemonsets: { total: daemonsets.length, ready: daemonsets.filter((set) => set.state === 'ok').length },
    jobs: {
      total: jobs.length,
      active: jobs.filter((job) => job.active > 0).length,
      succeeded: jobs.filter((job) => job.succeeded > 0).length,
      failed: jobs.filter((job) => job.failed > 0).length,
    },
    cronjobs: { total: cronjobs.length, suspended: cronjobs.filter((cronjob) => cronjob.suspended).length },
    pvcs: { total: pvcs.length, bound: pvcs.filter((claim) => claim.state === 'ok').length },
    namespaces: { total: namespaceNames.length, busy: namespaceRows.filter((row) => !row.empty).length },
    services: { total: services.length },
    routes: { total: routes.length, hosts: domainsByHost.size },
    secrets: {
      total: externalSecrets.length,
      synced: externalSecrets.filter((secret) => secret.state === 'ok').length,
      failed: externalSecrets.filter((secret) => secret.state === 'bad').length,
    },
  }

  let requestedCpu = 0
  let requestedMemory = 0
  let requestedPods = 0
  for (const pod of pods) {
    if (pod.phase === 'Succeeded' || pod.phase === 'Failed') continue
    requestedCpu += pod.requests.cpu
    requestedMemory += pod.requests.memory
    requestedPods += 1
  }
  const allocatableCpu = nodes.reduce((sum, node) => sum + node.cpu, 0)
  const allocatableMemory = nodes.reduce((sum, node) => sum + node.memory, 0)
  const allocatablePods = nodes.reduce((sum, node) => sum + node.pods, 0)
  const shareOf = (value, total) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0)
  const round2 = (value) => Math.round(value * 100) / 100
  const capacity = {
    cpu: { requested: round2(requestedCpu), allocatable: round2(allocatableCpu), percent: shareOf(requestedCpu, allocatableCpu) },
    memory: { requested: requestedMemory, allocatable: allocatableMemory, percent: shareOf(requestedMemory, allocatableMemory) },
    pods: { requested: requestedPods, allocatable: allocatablePods, percent: shareOf(requestedPods, allocatablePods) },
  }

  const signals = []
  const addSignal = (id, label, items, detail) => {
    if (!items.length) return
    const bad = items.some((item) => item.state === 'bad')
    signals.push({
      id,
      label,
      count: items.length,
      state: bad ? 'bad' : 'warn',
      detail,
      names: items.slice(0, 3).map((item) => (item.namespace ? `${item.namespace}/${item.name}` : item.name)),
    })
  }
  const crashPods = pods.filter((pod) => pod.blocked)
  addSignal('crashloop', 'Pods bloqués au démarrage', crashPods, 'conteneur qui ne démarre pas')
  addSignal('redemarrages', 'Pods qui redémarrent', pods.filter((pod) => !pod.blocked && pod.phase !== 'Succeeded' && pod.phase !== 'Failed' && pod.restarts >= alerte), `seuil ${alerte} redémarrages`)
  addSignal('attention', 'Pods au-dessus du seuil d’attention', pods.filter((pod) => pod.phase !== 'Succeeded' && pod.phase !== 'Failed' && pod.restarts >= attention && pod.restarts < alerte), `seuil ${attention} redémarrages`)
  addSignal('pending', 'Pods Pending depuis plus de 5 min', pods.filter((pod) => pod.phase === 'Pending' && pod.age > 5), 'placement impossible')
  addSignal('oom', 'Conteneurs tués par OOM', pods.filter((pod) => pod.oom), 'mémoire épuisée (OOMKilled)')
  addSignal('rollout', 'Deployments indisponibles', deployments.filter((deployment) => deployment.state === 'bad'), 'aucune réplique disponible')
  addSignal('rollout-bloque', 'Rollouts bloqués', deployments.filter((deployment) => deployment.state === 'warn'), 'répliques disponibles en retard sur le souhaité')
  addSignal('secrets', 'ExternalSecrets en erreur', externalSecrets.filter((secret) => secret.state === 'bad'), 'synchronisation Azure interrompue')
  addSignal('jobs', 'Jobs échoués', jobs.filter((job) => job.failed > 0), 'échec de job')
  addSignal('pvc', 'PVC non liés', pvcs.filter((claim) => claim.state !== 'ok'), 'volume non lié')
  addSignal('noeuds', 'Nœuds non prêts ou sous pression', nodes.filter((node) => !node.ready || node.pressure.length > 0), 'santé du nœud')

  const grouped = new Map()
  for (const event of eventsRaw) {
    if (String(event?.type ?? '') !== 'Warning') continue
    const reason = String(event?.reason ?? '?')
    const kind = String(event?.involvedObject?.kind ?? '?')
    const namespace = String(event?.involvedObject?.namespace ?? '')
    const name = String(event?.involvedObject?.name ?? '?')
    const key = `${reason}|${kind}|${namespace}|${name}`
    const at = String(event?.lastTimestamp ?? event?.eventTime ?? '')
    const current = grouped.get(key)
    if (current) {
      current.count += Number(event?.count ?? 1)
      if (at > current.at) current.at = at
      continue
    }
    grouped.set(key, { reason, kind, namespace, name, count: Number(event?.count ?? 1), at, message: String(event?.message ?? '').replace(/\s+/g, ' ').slice(0, 200) })
  }
  const events = [...grouped.values()].sort((a, b) => b.count - a.count || String(b.at).localeCompare(String(a.at))).slice(0, 6)

  const failedSecrets = externalSecrets.filter((secret) => secret.state === 'bad')
  const failedByCode = groupBy(failedSecrets, (secret) => secret.code || secret.reason || 'inconnu')
  const failedByNamespace = sortNames([...groupBy(failedSecrets, (secret) => secret.namespace)].map(([name, items]) => ({ name, count: items.length })))
  const unstablePods = pods.filter((pod) => pod.restarts >= alerte && pod.phase !== 'Succeeded' && pod.phase !== 'Failed').sort((a, b) => b.restarts - a.restarts)

  const causes = []
  if (failedSecrets.length) {
    const [code, items] = [...failedByCode.entries()].sort((a, b) => b[1].length - a[1].length)[0]
    const spread = failedByNamespace.filter((entry) => entry.count > 0)
    const top = spread.slice(0, 3)
    causes.push({
      id: 'secrets',
      severity: 'bad',
      title: `${failedSecrets.length} secret${failedSecrets.length > 1 ? 's' : ''} Azure ${failedSecrets.length > 1 ? 'ne se rafraîchissent' : 'ne se rafraîchit'} plus`,
      detail: code.startsWith('AADSTS')
        ? `Azure Key Vault refuse le jeton du client (${code} : secret expiré ou remplacé). Les secrets déjà chargés restent en place ; les certificats TLS ne seront plus renouvelés.`
        : 'Azure Key Vault refuse le jeton du client. Les secrets déjà chargés restent en place ; les certificats TLS ne seront plus renouvelés.',
      chips: [
        { text: `${spread.length} namespace${spread.length > 1 ? 's' : ''}`, tone: '' },
        ...top.map((entry) => ({ text: `${entry.name} ${entry.count}`, tone: 'bad' })),
        { text: `${failedSecrets.length} ressource${failedSecrets.length > 1 ? 's' : ''}`, tone: '' },
      ],
      scope: spread.map((entry) => ({ label: entry.name, count: entry.count })),
      targets: items.slice(0, 3).map((secret) => secret.target),
      names: items.slice(0, 3).map((secret) => `${secret.namespace}/${secret.name}`),
      trace: `Relu toutes les ${config?.refreshSeconds ?? 30} s ; capturé au dernier rafraîchissement du panneau.`,
    })
  }
  for (const pod of unstablePods.slice(0, 2)) {
    const workload = pod.ownerKind === 'ReplicaSet' ? pod.owner.replace(/-[a-z0-9]+$/, '') : pod.owner
    causes.push({
      id: `restarts:${pod.namespace}/${pod.name}`,
      severity: 'bad',
      title: `${workload || pod.name} redémarre en boucle`,
      detail: `${pod.restarts} arrêts en ${ageLabel(pod.age)}. « Prêt » entre deux crashes ne veut pas dire stable.`,
      chips: [
        { text: pod.namespace, tone: '' },
        { text: pod.ownerKind === 'ReplicaSet' ? '1 replica' : pod.ownerKind || 'pod', tone: '' },
        { text: `${pod.restarts} redémarrages`, tone: 'bad' },
        { text: pod.ownerKind === 'ReplicaSet' ? 'deployment' : pod.ownerKind.toLowerCase() || 'pod', tone: '' },
      ],
      scope: [{ label: pod.namespace, count: 1 }],
      targets: [pod.target, workload ? { namespace: pod.namespace, kind: 'deployment', name: workload } : null].filter(Boolean),
      names: [`${pod.namespace}/${pod.name}`],
      trace: `Dernier arrêt ${pod.lastRestart ? `il y a ${ageLabel(minutesSince(pod.lastRestart, now))}` : 'inconnu'} ; restarts cumulés depuis la création du pod.`,
    })
  }
  for (const deployment of deployments.filter((item) => item.state === 'bad').slice(0, 2)) {
    causes.push({
      id: `deployment:${deployment.namespace}/${deployment.name}`,
      severity: 'bad',
      title: `${deployment.name} n’a aucune réplique disponible`,
      detail: `${deployment.available} réplique(s) disponible(s) sur ${deployment.desired} demandée(s). Le service est arrêté.`,
      chips: [{ text: deployment.namespace, tone: '' }, { text: `${deployment.available}/${deployment.desired}`, tone: 'bad' }],
      scope: [{ label: deployment.namespace, count: 1 }],
      targets: [deployment.target],
      names: [`${deployment.namespace}/${deployment.name}`],
      trace: 'État déclaré par le deployment au moment de la mesure.',
    })
  }
  for (const claim of pvcs.filter((item) => item.state !== 'ok').slice(0, 2)) {
    causes.push({
      id: `pvc:${claim.namespace}/${claim.name}`,
      severity: 'bad',
      title: `${claim.name} n’est pas lié`,
      detail: `Le volume est en attente (${claim.phase || 'inconnu'}) ; le pod qui l’utilise ne peut pas démarrer.`,
      chips: [{ text: claim.namespace, tone: '' }, { text: claim.storageClass || 'sans classe', tone: '' }],
      scope: [{ label: claim.namespace, count: 1 }],
      targets: [],
      names: [`${claim.namespace}/${claim.name}`],
      trace: 'État déclaré par le PVC au moment de la mesure.',
    })
  }
  for (const node of nodes.filter((item) => !item.ready || item.pressure.length > 0)) {
    causes.push({
      id: `node:${node.name}`,
      severity: 'bad',
      title: `Le nœud ${node.name} n’est pas sain`,
      detail: node.ready ? `Pression ${node.pressure.join(', ')} : Kubernetes peut expulser des pods.` : 'Le nœud ne répond pas : tout ce qu’il porte est indisponible.',
      chips: node.pressure.map((type) => ({ text: type, tone: 'bad' })),
      scope: [{ label: node.name, count: 1 }],
      targets: [],
      names: [node.name],
      trace: 'Conditions du nœud au moment de la mesure.',
    })
  }
  causes.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'bad' ? -1 : 1))

  const activity = []
  const pushActivity = (entry) => activity.push(entry)
  if (failedSecrets.length) {
    const latest = failedSecrets.map((secret) => secret.at).filter(Boolean).sort().at(-1)
    const namespaces = new Set(failedSecrets.map((secret) => secret.namespace))
    pushActivity({
      at: latest ?? '',
      tone: 'red',
      title: `Azure refuse le jeton des secrets`,
      meta: `${failedSecrets.length} ressources · ${namespaces.size} namespace${namespaces.size > 1 ? 's' : ''}`,
      minutes: latest ? minutesSince(latest, now) : 0,
    })
  }
  for (const pod of unstablePods.slice(0, 3)) {
    const workload = pod.ownerKind === 'ReplicaSet' ? pod.owner.replace(/-[a-z0-9]+$/, '') : pod.name
    const at = pod.lastRestart || pod.containerStarted
    pushActivity({
      at,
      tone: 'warn',
      title: `${workload} a redémarré ${pod.restarts} fois`,
      meta: `état ${pod.phase || 'inconnu'} · ${pod.namespace}`,
      minutes: at ? minutesSince(at, now) : pod.age,
    })
  }
  for (const job of jobs.filter((item) => item.succeeded > 0 && item.finishedAt).slice(0, 2)) {
    pushActivity({
      at: job.finishedAt,
      tone: 'ok',
      title: `Job ${job.name} terminé`,
      meta: `${job.namespace} · ${job.succeeded} pod${job.succeeded > 1 ? 's' : ''} réussi${job.succeeded > 1 ? 's' : ''}`,
      minutes: minutesSince(job.finishedAt, now),
    })
  }
  for (const cronjob of cronjobs.filter((item) => item.suspended).slice(0, 1)) {
    pushActivity({
      at: '',
      tone: 'purple',
      title: `Cronjob ${cronjob.name} suspendu`,
      meta: `${cronjob.namespace} · voulu, pas une erreur`,
      minutes: cronjob.lastSchedule ? minutesSince(cronjob.lastSchedule, now) : cronjob.created ? minutesSince(cronjob.created, now) : 0,
    })
  }
  for (const node of nodes.filter((item) => item.ready).slice(0, 1)) {
    pushActivity({
      at: '',
      tone: 'ok',
      title: `Cluster ${env.context || 'courant'} joignable`,
      meta: `${nodes.length} nœud${nodes.length > 1 ? 's' : ''} · ${node.version}`,
      minutes: node.age,
    })
  }
  for (const set of daemonsets.filter((item) => item.state === 'warn').slice(0, 1)) {
    pushActivity({
      at: '',
      tone: 'warn',
      title: `${set.name} n’est pas complet`,
      meta: `${set.namespace} · ${set.ready}/${set.desired} prêts`,
      minutes: 0,
    })
  }
  activity.sort((a, b) => a.minutes - b.minutes)
  const activityView = activity.slice(0, 6)

  const ingressPresent = services.some((service) => service.namespace === 'ingress-nginx')
  const coreDns = deployments.filter((deployment) => deployment.name.includes('coredns'))
  const metricsServer = deployments.some((deployment) => deployment.name.includes('metrics-server'))
  const externalSecretsEngine = deployments.filter((deployment) => deployment.name.includes('external-secrets'))

  const nodeBad = nodes.some((node) => !node.ready || node.pressure.length > 0)
  const deployBad = deployments.some((deployment) => deployment.state === 'bad')
  const jobBad = jobs.some((job) => job.state === 'bad')
  const pvcBad = pvcs.some((claim) => claim.state !== 'ok')
  const blocked = crashPods.length > 0
  const warn = unstablePods.length > 0 || failedSecrets.length > 0 || events.length > 0 || deployments.some((deployment) => deployment.state === 'warn') || nodes.some((node) => node.pressure.length > 0) || cronjobs.some((cronjob) => cronjob.suspended)
  const down = Boolean(env.down)
  const state = down ? 'down' : nodeBad || deployBad || jobBad || pvcBad || blocked ? 'bad' : warn ? 'warn' : 'ok'
  const alert = down ? 'Cluster arrêté' : state === 'bad' ? 'Cluster dégradé' : state === 'warn' ? 'Attention' : 'Cluster sain'
  const parts = []
  if (nodeBad) parts.push('un nœud n’est pas prêt')
  if (blocked) parts.push(`${crashPods.length} pod${crashPods.length > 1 ? 's' : ''} bloqué${crashPods.length > 1 ? 's' : ''} au démarrage`)
  if (deployBad) parts.push(`${deployments.filter((item) => item.state === 'bad').length} déploiement${deployments.filter((item) => item.state === 'bad').length > 1 ? 's' : ''} indisponible${deployments.filter((item) => item.state === 'bad').length > 1 ? 's' : ''}`)
  if (jobBad) parts.push('un job a échoué')
  if (pvcBad) parts.push('un volume n’est pas lié')
  if (failedSecrets.length) parts.push(`${failedSecrets.length} secret${failedSecrets.length > 1 ? 's' : ''} Azure en erreur`)
  if (unstablePods.length) parts.push(`${unstablePods.length} pod${unstablePods.length > 1 ? 's' : ''} qui redémarre${unstablePods.length > 1 ? 'nt' : ''} en boucle`)
  const reason = down ? String(env.liveError || '') : parts.length ? parts.join(' · ') : 'tous les indicateurs sont au vert'

  const headline = down
    ? (env.liveError || 'Le cluster ne répond pas.')
    : causes.length
      ? `Le cluster répond. ${causes.length === 1 ? 'Un point demande' : `${causes.length} points demandent`} votre attention.`
      : 'Le cluster répond. Aucun point ne demande votre attention.'
  const summaryParts = []
  if (!down) {
    summaryParts.push(`${counts.pods.running} pods tournent sur ${counts.nodes.ready} nœud${counts.nodes.ready > 1 ? 's' : ''} prêt${counts.nodes.ready > 1 ? 's' : ''}.`)
    if (failedSecrets.length) summaryParts.push(`${failedSecrets.length} secret${failedSecrets.length > 1 ? 's' : ''} Azure ${failedSecrets.length > 1 ? 'ne se rafraîchissent' : 'ne se rafraîchit'} plus.`)
    if (unstablePods.length) summaryParts.push(`${unstablePods.length} pod${unstablePods.length > 1 ? 's' : ''} redémarre${unstablePods.length > 1 ? 'nt' : ''} en boucle.`)
    if (!deployBad) summaryParts.push('Aucun service n’est arrêté.')
  }

  const checks = [
    { id: 'contexte', label: 'Contexte kubectl', value: env.context || '—', state: !env.context ? 'bad' : env.watched && env.context !== env.watched ? 'warn' : 'ok' },
    ...(env.runtime ? [{ id: 'runtime', label: env.runtime, value: env.runtimeUp ? 'en marche' : 'arrêté', state: env.runtimeUp ? 'ok' : 'warn' }] : []),
    { id: 'kubectl', label: 'kubectl · k9s', value: [env.kubectl ? 'kubectl' : '', env.k9s ? 'k9s' : ''].filter(Boolean).join(' · ') || 'absent', state: env.kubectl ? (env.k9s ? 'ok' : 'warn') : 'bad' },
    { id: 'ingress', label: 'Ingress', value: ingressPresent ? `${counts.routes.hosts} route${counts.routes.hosts > 1 ? 's' : ''}` : 'absent', state: ingressPresent ? 'ok' : 'warn' },
    { id: 'coredns', label: 'CoreDNS', value: coreDns.length ? `${coreDns.reduce((sum, item) => sum + item.available, 0)} / ${coreDns.reduce((sum, item) => sum + item.desired, 0)}` : 'absent', state: coreDns.some((item) => item.state !== 'ok') ? 'warn' : coreDns.length ? 'ok' : 'warn' },
    { id: 'metrics', label: 'metrics-server', value: metricsServer ? 'installé' : 'absent', state: metricsServer ? 'ok' : 'warn' },
    { id: 'secrets', label: 'external-secrets', value: externalSecrets.length ? `${failedSecrets.length} erreur${failedSecrets.length > 1 ? 's' : ''}` : 'absent', state: failedSecrets.length ? 'bad' : externalSecretsEngine.length ? 'ok' : 'warn' },
  ]
  const checksBad = checks.filter((check) => check.state === 'bad').length
  const checksWarn = checks.filter((check) => check.state === 'warn').length
  const checksOk = checks.filter((check) => check.state === 'ok').length

  const kpis = [
    {
      id: 'node',
      label: 'Nœud',
      icon: 'server',
      value: `${counts.nodes.ready} / ${counts.nodes.total}`,
      unit: 'prêt',
      detail: nodes.length ? `${fr(nodes[0].cpu, 0)} cœurs · ${bytesFr(nodes[0].memory)} · ${fr(nodes[0].pods, 0)} pods max` : 'aucun nœud',
      state: counts.nodes.ready < counts.nodes.total ? 'bad' : 'ok',
      bar: [{ share: counts.nodes.total ? (counts.nodes.ready / counts.nodes.total) * 100 : 0, tone: 'ok' }],
    },
    {
      id: 'pods',
      label: 'Pods actifs',
      icon: 'box',
      value: fr(counts.pods.running, 0),
      unit: `sur ${counts.pods.total}`,
      detail: `${counts.pods.succeeded} job${counts.pods.succeeded > 1 ? 's' : ''} terminé${counts.pods.succeeded > 1 ? 's' : ''} · ${counts.pods.pending} en attente · ${counts.pods.failed} en échec`,
      state: counts.pods.failed || counts.pods.pending ? 'warn' : 'ok',
      bar: [
        { share: counts.pods.total ? (counts.pods.running / counts.pods.total) * 100 : 0, tone: 'ok' },
        { share: counts.pods.total ? (counts.pods.succeeded / counts.pods.total) * 100 : 0, tone: 'off' },
        { share: counts.pods.total ? ((counts.pods.pending + counts.pods.failed) / counts.pods.total) * 100 : 0, tone: 'bad' },
      ],
    },
    {
      id: 'deployments',
      label: 'Déploiements',
      icon: 'layers',
      value: `${counts.deployments.available} / ${deployments.length}`,
      unit: 'actifs',
      detail: `${counts.deployments.zero} désactivé${counts.deployments.zero > 1 ? 's' : ''} (0/0) · ${counts.deployments.unavailable} en échec`,
      state: counts.deployments.unavailable ? 'bad' : 'ok',
      bar: [
        { share: deployments.length ? (counts.deployments.available / deployments.length) * 100 : 0, tone: 'ok' },
        { share: deployments.length ? (counts.deployments.zero / deployments.length) * 100 : 0, tone: 'off' },
        { share: deployments.length ? (counts.deployments.unavailable / deployments.length) * 100 : 0, tone: 'bad' },
      ],
    },
    {
      id: 'unstable',
      label: 'Pods instables',
      icon: 'loop',
      value: fr(counts.pods.unstable, 0),
      unit: `≥ ${alerte} arrêts`,
      detail: unstablePods.length ? `${unstablePods.slice(0, 2).map((pod) => pod.restarts).join(' et ')} redémarrages · ${[...new Set(unstablePods.map((pod) => pod.namespace))].slice(0, 2).join(', ')}` : 'aucun pod au-delà du seuil',
      state: unstablePods.length ? 'bad' : 'ok',
      bar: [{ share: counts.pods.total ? (counts.pods.unstable / counts.pods.total) * 100 : 0, tone: 'bad' }],
    },
    {
      id: 'secrets',
      label: 'Secrets',
      icon: 'key',
      value: `${counts.secrets.failed} / ${counts.secrets.total}`,
      unit: 'en erreur',
      detail: counts.secrets.total ? `${[...failedByCode.keys()][0]?.startsWith('AADSTS') ? 'Azure 401' : [...failedByCode.keys()][0] || 'sans code'} · ${counts.secrets.synced} synchronisé${counts.secrets.synced > 1 ? 's' : ''}` : 'aucun ExternalSecret',
      state: counts.secrets.failed ? 'bad' : 'ok',
      bar: [
        { share: counts.secrets.total ? (counts.secrets.failed / counts.secrets.total) * 100 : 0, tone: 'bad' },
        { share: counts.secrets.total ? (counts.secrets.synced / counts.secrets.total) * 100 : 0, tone: 'ok' },
      ],
    },
    {
      id: 'volumes',
      label: 'Volumes',
      icon: 'disk',
      value: `${counts.pvcs.bound} / ${counts.pvcs.total}`,
      unit: 'liés',
      detail: counts.pvcs.total ? `${counts.pvcs.bound === counts.pvcs.total ? 'Aucun volume orphelin' : `${counts.pvcs.total - counts.pvcs.bound} orphelin(s)`} · ${counts.pvcs.total} PVC` : 'aucun volume',
      state: counts.pvcs.bound < counts.pvcs.total ? 'bad' : 'ok',
      bar: [{ share: counts.pvcs.total ? (counts.pvcs.bound / counts.pvcs.total) * 100 : 0, tone: 'ok' }],
    },
  ]

  const topology = {
    machine: {
      host: env.os || 'Machine',
      runtime: env.runtime || null,
      colima: env.colimaInfo ?? null,
      runtimeUp: Boolean(env.runtimeUp),
      note: env.runtime ? `${env.runtime} ${env.runtimeUp ? 'répond' : 'ne répond pas'}.` : 'Aucun moteur de conteneurs local.',
    },
    node: nodes[0] ? { name: nodes[0].name, version: nodes[0].version, ready: nodes[0].ready, age: nodes[0].age } : null,
    groups: domains.map((domain) => {
      const rows = namespaceRows.filter((row) => row.domain === domain.key)
      const domainPods = pods.filter((pod) => rows.some((row) => row.name === pod.namespace))
      const stateCounts = { ok: 0, warn: 0, bad: 0, done: 0 }
      for (const pod of domainPods) {
        if (pod.phase === 'Succeeded') stateCounts.done += 1
        else if (pod.state === 'bad') stateCounts.bad += 1
        else if (pod.state === 'warn') stateCounts.warn += 1
        else stateCounts.ok += 1
      }
      const notes = []
      if (domain.key === 'app') notes.push(`${rows.length} namespace${rows.length > 1 ? 's' : ''}`, `${domain.workloads} déploiements`)
      if (domain.key === 'data') notes.push(rows.map((row) => row.name).slice(0, 3).join(' · '), `${statefulsets.filter((set) => rows.some((row) => row.name === set.namespace)).length} StatefulSets`)
      if (domain.key === 'obs') notes.push(rows.map((row) => row.name).slice(0, 2).join(' · '), metricsServer ? '' : 'metrics absent')
      if (domain.key === 'platform') notes.push(rows.map((row) => row.name).slice(0, 3).join(' · '), failedSecrets.length ? `${failedSecrets.length} secrets en erreur` : 'moteur sain')
      return {
        key: domain.key,
        label: domain.label,
        state: domain.state,
        namespaces: rows.map((row) => row.name),
        pods: domainPods.length,
        workloads: domain.workloads,
        services: domain.services,
        routes: domain.routes,
        note: notes.filter(Boolean).join(' · '),
        dots: { ...stateCounts },
      }
    }),
    ingress: {
      present: ingressPresent,
      nodePort,
      label: 'Entrées HTTP',
      detail: ingressPresent ? `ingress-nginx${nodePort ? ` · NodePort ${nodePort}` : ''}` : 'ingress-nginx absent',
      hosts: [...domainsByHost.keys()].filter(Boolean).slice(0, 3),
      otherHosts: Math.max(0, [...domainsByHost.keys()].filter(Boolean).length - 3),
      chain: nodePort ? `NodePort ${nodePort} → ingress-nginx → services` : 'ingress-nginx → services',
    },
    legend: [
      { tone: 'ok', label: 'pod sain' },
      { tone: 'warn', label: 'redémarrages' },
      { tone: 'bad', label: 'instable' },
      { tone: 'done', label: 'job terminé' },
    ],
    caption: 'chaque point = 1 pod',
  }

  const measuredAt = new Date(now).toISOString()
  const lastDetail = last ? `${Number(last.nodes ?? 0)} nœud${Number(last.nodes ?? 0) > 1 ? 's' : ''} · ${Number(last.pods ?? 0)} pod${Number(last.pods ?? 0) > 1 ? 's' : ''}` : '—'

  return {
    state,
    alert,
    reason,
    detail: `${counts.nodes.ready}/${counts.nodes.total} nœud${counts.nodes.total > 1 ? 's' : ''} · ${counts.pods.total} pods · ${counts.deployments.total} deployments`,
    down,
    hidden: Boolean(env.hidden),
    context: env.context || '',
    contexts: env.contexts ?? [],
    checks,
    checksSummary: { ok: checksOk, warn: checksWarn, bad: checksBad },
    last,
    lastDetail,
    measuredAt,
    version: nodes[0]?.version ?? '',
    headline,
    summary: summaryParts.join(' '),
    counts,
    capacity,
    signals,
    kpis,
    causes,
    activity: activityView,
    namespaces: namespaceNames,
    namespaceRows,
    domains,
    topology,
    nodes,
    pods,
    workloads,
    deployments,
    statefulsets,
    daemonsets,
    jobs,
    cronjobs,
    pvcs,
    services,
    routes,
    externalSecrets,
    events,
    targets: {
      deployments: deployments.map((deployment) => deployment.target),
      pods: pods.map((pod) => pod.target),
      jobs: jobs.map((job) => job.target),
    },
  }
}
