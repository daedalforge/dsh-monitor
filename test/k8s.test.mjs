import assert from 'node:assert/strict'
import test from 'node:test'
import { buildK8sModel } from '../lib/k8s.js'

const now = Date.parse('2026-11-03T10:00:00.000Z')
const minutesAgo = (minutes) => new Date(now - minutes * 60_000).toISOString()

function pod(name, namespace, options = {}) {
  const restarts = options.restarts ?? 0
  const container = {
    name,
    restartCount: restarts,
    ready: options.ready ?? true,
    state: options.waiting ? { waiting: { reason: options.waiting } } : { running: {} },
  }
  return {
    metadata: {
      name,
      namespace,
      creationTimestamp: minutesAgo(options.age ?? 30),
      ownerReferences: options.owner ? [{ kind: options.owner, name: options.ownerName ?? name }] : [],
    },
    spec: { containers: [{ name, resources: { requests: options.requests ?? { cpu: '250m', memory: '256Mi' } } }] },
    status: {
      phase: options.phase ?? 'Running',
      containerStatuses: [container],
      conditions: [{ type: 'Ready', status: options.ready === false ? 'False' : 'True' }],
    },
  }
}

function deployment(name, namespace, available, desired, ready) {
  return {
    metadata: { name, namespace, creationTimestamp: minutesAgo(600) },
    spec: { replicas: desired },
    status: {
      replicas: desired,
      availableReplicas: available,
      readyReplicas: ready,
      updatedReplicas: desired,
      observedGeneration: 1,
      conditions: [{ type: 'Available', status: available > 0 ? 'True' : 'False' }],
    },
  }
}

function node(name, version) {
  return {
    metadata: { name, creationTimestamp: minutesAgo(60 * 24 * 3) },
    spec: { taints: [] },
    status: {
      nodeInfo: { kubeletVersion: version },
      conditions: [{ type: 'Ready', status: 'True' }],
      capacity: { cpu: '6', memory: '12Gi', pods: '110' },
      allocatable: { cpu: '6', memory: '12Gi', pods: '110' },
    },
  }
}

function externalSecret(name, namespace, reason) {
  const synced = reason === 'SecretSynced'
  return {
    metadata: { name, namespace, creationTimestamp: minutesAgo(120) },
    status: {
      conditions: [{ type: 'Ready', status: synced ? 'True' : 'False', reason, message: synced ? '' : 'could not get secret data from provider' }],
    },
  }
}

function fixture() {
  return {
    nodes: [node('devspace-control-plane', 'v1.34.3')],
    pods: [
      pod('backend-6d9f-abc', 'corpo', { owner: 'ReplicaSet' }),
      pod('connect-webhook-79f9-xyz', 'corpo', { owner: 'ReplicaSet', restarts: 38, waiting: 'CrashLoopBackOff', age: 24 }),
      pod('anonymizer-reset-9f2', 'corpo', { phase: 'Succeeded', age: 180 }),
      pod('monitoring-7c8-zzz', 'monitoring', { owner: 'ReplicaSet', restarts: 29, age: 20 }),
    ],
    deployments: [
      deployment('core-service', 'corpo', 1, 1, 1),
      deployment('backend', 'corpo', 0, 0, 0),
      deployment('connect-webhook', 'corpo', 0, 1, 0),
    ],
    statefulsets: [
      {
        metadata: { name: 'mysql', namespace: 'mysql', creationTimestamp: minutesAgo(900) },
        spec: { replicas: 1 },
        status: { readyReplicas: 1, replicas: 1, currentReplicas: 1, updatedReplicas: 1 },
      },
    ],
    daemonsets: [
      {
        metadata: { name: 'kindnet', namespace: 'kube-system' },
        spec: { desiredNumberScheduled: 1 },
        status: { numberReady: 1, desiredNumberScheduled: 1, currentNumberScheduled: 1, numberAvailable: 1 },
      },
    ],
    jobs: [],
    cronjobs: [],
    namespaces: ['corpo', 'monitoring', 'mysql', 'kube-system', 'slv-95-empty'].map((name) => ({ metadata: { name } })),
    pvcs: [
      { metadata: { name: 'data-mysql-0', namespace: 'mysql' }, spec: { storageClassName: 'standard' }, status: { phase: 'Bound', capacity: { storage: '8Gi' } } },
    ],
    services: [
      { metadata: { name: 'backend', namespace: 'corpo' }, spec: { type: 'ClusterIP', ports: [{ port: 8080 }] } },
      { metadata: { name: 'mysql', namespace: 'mysql' }, spec: { type: 'ClusterIP', ports: [{ port: 3306 }] } },
    ],
    ingresses: [
      {
        metadata: { name: 'backend', namespace: 'corpo' },
        spec: { rules: [{ host: 'backend.local.saas-office.io', http: { paths: [{ path: '/', backend: { service: { name: 'backend', port: { number: 8080 } } } }] } }] },
      },
    ],
    externalSecrets: [
      externalSecret('backend', 'corpo', 'SecretSyncedError'),
      externalSecret('backend-zitadel', 'corpo', 'SecretSynced'),
      externalSecret('monitoring-tls', 'monitoring', 'SecretSyncedError'),
    ],
    events: [
      {
        type: 'Warning',
        reason: 'UpdateFailed',
        count: 12,
        lastTimestamp: minutesAgo(10),
        involvedObject: { kind: 'ExternalSecret', namespace: 'corpo', name: 'backend' },
        message: 'error processing spec.data[0]: azure.BearerAuthorizer#WithAuthorization: StatusCode=401 AADSTS7000215: Invalid client secret provided.',
      },
    ],
  }
}

const env = { context: 'kind-devspace', contexts: ['kind-devspace'], watched: 'kind-devspace', runtime: 'docker', runtimeUp: true, os: 'Mac', colima: true, kubectl: true, k9s: true, kubectx: true }

test('the model is built from the cluster without inventing numbers', () => {
  const model = buildK8sModel({ raw: fixture(), env, config: {}, now })

  assert.equal(model.state, 'bad')
  assert.equal(model.counts.pods.total, 4)
  assert.equal(model.counts.pods.running, 3)
  assert.equal(model.counts.pods.succeeded, 1)
  assert.equal(model.counts.namespaces.total, 5)
  assert.equal(model.counts.services.total, 2)
  assert.equal(model.counts.routes.total, 1)
  assert.equal(model.counts.secrets.total, 3)
  assert.equal(model.counts.secrets.failed, 2)
  assert.equal(model.counts.pvcs.bound, 1)
  assert.equal(model.counts.deployments.total, 3)
})

test('an Azure secret error is explained with the code found in the events', () => {
  const model = buildK8sModel({ raw: fixture(), env, config: {}, now })
  const secrets = model.causes.find((cause) => cause.id === 'secrets')

  assert.ok(secrets, 'the secrets cause is missing')
  assert.equal(secrets.severity, 'bad')
  assert.match(secrets.title, /2 secrets Azure/)
  assert.match(secrets.detail, /AADSTS7000215/)
  assert.deepEqual(secrets.chips.filter((chip) => chip.tone === 'bad').map((chip) => chip.text), ['corpo 1', 'monitoring 1'])
  const failed = model.externalSecrets.find((secret) => secret.name === 'backend')
  assert.equal(failed.code, 'AADSTS7000215')
  assert.equal(model.externalSecrets.find((secret) => secret.name === 'backend-zitadel').code, '')
})

test('pods restarting in a loop become a cause with the affected pods', () => {
  const model = buildK8sModel({ raw: fixture(), env, config: {}, now })
  const crash = model.causes.find((cause) => cause.id.startsWith('restarts:corpo/connect-webhook'))

  assert.ok(crash, 'the crashloop cause is missing')
  assert.equal(crash.severity, 'bad')
  assert.match(crash.title, /connect-webhook.*redémarre en boucle/)
  assert.deepEqual(crash.chips.map((chip) => chip.text), ['corpo', '1 replica', '38 redémarrages', 'deployment'])
})

test('namespaces are aggregated, classified and flagged when empty', () => {
  const model = buildK8sModel({ raw: fixture(), env, config: {}, now })
  const byName = new Map(model.namespaceRows.map((row) => [row.name, row]))

  assert.equal(byName.get('corpo').domain, 'app')
  assert.equal(byName.get('mysql').domain, 'data')
  assert.equal(byName.get('monitoring').domain, 'obs')
  assert.equal(byName.get('kube-system').domain, 'platform')
  assert.equal(byName.get('slv-95-empty').empty, true)
  assert.equal(byName.get('corpo').restarts, 38)
  assert.equal(byName.get('corpo').secretErrors, 1)
  assert.equal(byName.get('mysql').statefulsets, 1)
  assert.deepEqual(model.domains.map((domain) => domain.key), ['app', 'data', 'obs', 'platform'])
})

test('capacity compares requests with the allocatable of the node', () => {
  const model = buildK8sModel({ raw: fixture(), env, config: {}, now })

  assert.equal(model.capacity.cpu.requested, 0.75)
  assert.equal(model.capacity.cpu.allocatable, 6)
  assert.equal(model.capacity.cpu.percent, 12.5)
  assert.equal(model.capacity.pods.requested, 3)
  assert.equal(model.capacity.pods.allocatable, 110)
})

test('the panel reports the cluster as stopped when the API does not answer', () => {
  const model = buildK8sModel({ raw: {}, env: { ...env, runtimeUp: false, down: true }, config: {}, now })

  assert.equal(model.state, 'down')
  assert.equal(model.alert, 'Cluster arrêté')
  assert.equal(model.down, true)
  assert.equal(model.counts.pods.total, 0)
  assert.equal(model.kpis.every((kpi) => kpi.value.startsWith('0')), true)
})

test('a remote cluster without a local runtime keeps the runtime row out', () => {
  const model = buildK8sModel({ raw: { nodes: [node('devspace-control-plane', 'v1.31.0')] }, env: { ...env, runtime: '', runtimeUp: false, colima: false, os: 'Linux' }, config: {}, now })

  assert.equal(model.checks.some((check) => check.id === 'runtime'), false)
  assert.equal(model.topology.machine.runtime, null)
  assert.equal(model.topology.machine.host, 'Linux')
  assert.equal(model.topology.machine.note, 'Aucun moteur de conteneurs local.')
})

test('the runtime found on the machine is the one the panel names', () => {
  const model = buildK8sModel({ raw: { nodes: [node('devspace-control-plane', 'v1.31.0')] }, env: { ...env, runtime: 'podman', colima: false }, config: {}, now })

  assert.equal(model.topology.machine.runtime, 'podman')
  assert.equal(model.topology.machine.runtimeUp, true)
  assert.equal(model.topology.machine.note, 'podman répond.')
  assert.equal(model.checks.find((check) => check.id === 'runtime').label, 'podman')
  assert.equal(model.checks.find((check) => check.id === 'runtime').state, 'ok')
})

test('the keys shown by the header follow the counts', () => {
  const model = buildK8sModel({ raw: fixture(), env, config: {}, now })
  const values = model.kpis.map((kpi) => [kpi.value, kpi.unit])

  assert.deepEqual(values, [['1 / 1', 'prêt'], ['3', 'sur 4'], ['1 / 3', 'actifs'], ['2', '≥ 5 arrêts'], ['2 / 3', 'en erreur'], ['1 / 1', 'liés']])
  assert.equal(model.headline, 'Le cluster répond. 4 points demandent votre attention.')
})
