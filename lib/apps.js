const SYSTEM_APPS = '/System/Applications'
const DOMAINS = [
  { dir: '/Applications', domain: 'system', label: 'Système' },
  { dir: '/Applications/Utilities', domain: 'system', label: 'Système', flat: true },
  { dir: '~/Applications', domain: 'user', label: 'Utilisateur' },
]

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function iso(value) {
  const time = Number(value) || 0
  return time ? new Date(time).toISOString() : ''
}

function stateRank(state) {
  if (state === 'bad') return 3
  if (state === 'warn') return 2
  return 1
}

async function readAppInfo(env, bundlePath) {
  const plist = `${bundlePath}/Contents/Info.plist`
  const result = await env.run('plutil', ['-convert', 'json', '-o', '-', plist], { timeout: 4000 })
  if (!result.ok) return { plist: null, raw: result.stderr || result.error || '' }
  try {
    return { plist: JSON.parse(result.stdout || '{}'), raw: '' }
  } catch {
    return { plist: null, raw: 'Info.plist illisible' }
  }
}

function bundleRow(dir, name, domain, label) {
  return { name: name.replace(/\.app$/i, ''), path: `${dir}/${name}`, domain, label, bundles: [`${dir}/${name}`] }
}

function vendorRow(dir, name, domain, label) {
  return { name, path: `${dir}/${name}`, domain, label, bundles: [], vendor: true }
}

function expandHome(env, value) {
  return value.startsWith('~/') ? `${env.home}${value.slice(1)}` : value
}

async function scanFolder(env, spec) {
  const rows = []
  const dir = expandHome(env, spec.dir)
  const entries = await env.readdir(dir).catch(() => [])
  for (const entry of entries) {
    if (!entry || entry.startsWith('.')) continue
    const full = `${dir}/${entry}`
    if (/\.app$/i.test(entry)) {
      rows.push(bundleRow(dir, entry, spec.domain, spec.label))
      continue
    }
    if (spec.flat || entry === 'Utilities') continue
    const stat = await env.stat(full).catch(() => null)
    if (!stat || !stat.isDirectory()) continue
    const children = await env.readdir(full).catch(() => [])
    const apps = children.filter((child) => /\.app$/i.test(child) && !child.startsWith('.'))
    if (!apps.length) continue
    const row = vendorRow(dir, entry, spec.domain, spec.label)
    row.bundles = apps.map((app) => `${full}/${app}`)
    rows.push(row)
  }
  return rows
}

async function readBrew(env) {
  const brew = await env.tool('brew')
  if (!brew) return { present: false, available: false, formulae: [], casks: [], outdatedCasks: [], outdatedFormulae: [] }
  const [version, formulae, casks, outdated, repoPath] = await Promise.all([
    env.run(brew, ['--version'], { timeout: 8000 }),
    env.run(brew, ['list', '--formula', '--versions'], { timeout: 12000 }),
    env.run(brew, ['list', '--cask', '--versions'], { timeout: 15000 }),
    env.run(brew, ['outdated', '--cask', '--greedy', '--json=v2'], { timeout: 20000 }),
    env.run(brew, ['--repository'], { timeout: 6000 }),
  ])
  const firstLine = String(version.stdout || '').split('\n')[0] ?? ''
  const headShort = (firstLine.match(/Homebrew\s+(\S+)/) ?? [])[1] ?? ''
  const formulaRows = String(formulae.stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...versions] = line.split(/\s+/)
      return { name, version: versions.at(-1) ?? '' }
    })
  const caskRows = String(casks.stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [token, ...versions] = line.split(/\s+/)
      return { token, version: versions.at(-1) ?? '' }
    })
  let outdatedCasks = []
  let outdatedFormulae = []
  if (outdated.ok) {
    try {
      const parsed = JSON.parse(outdated.stdout || '{}')
      outdatedCasks = (parsed.casks ?? []).map((item) => ({
        token: item.name ?? item.token ?? '',
        installed: (item.installed_versions ?? []).at(-1) ?? item.current_version ?? '',
        latest: item.current_version ?? '',
        autoUpdates: Boolean(item.auto_updates),
      }))
      outdatedFormulae = (parsed.formulae ?? []).map((item) => ({ name: item.name ?? '', installed: (item.installed_versions ?? []).at(-1) ?? '', latest: item.current_version ?? '' }))
    } catch {
      outdatedCasks = []
      outdatedFormulae = []
    }
  }
  const repo = String(repoPath.stdout || '').trim()
  let lastUpdate = ''
  let updateBehind = 0
  if (repo) {
    const fetchHead = await env.stat(`${repo}/.git/FETCH_HEAD`).catch(() => null)
    lastUpdate = iso(fetchHead?.mtimeMs)
    const behind = await env.run('git', ['-C', repo, 'rev-list', '--count', 'HEAD..FETCH_HEAD'], { timeout: 8000 })
    updateBehind = behind.ok ? Number(String(behind.stdout).trim()) || 0 : 0
  }
  return {
    present: true,
    available: true,
    version: firstLine.replace(/^Homebrew\s+/, ''),
    headShort,
    formulae: formulaRows,
    casks: caskRows,
    outdatedCasks,
    outdatedFormulae,
    lastUpdate,
    updateBehind,
  }
}

function caskFor(name, caskTokens) {
  const target = normalize(name)
  if (!target) return ''
  const hit = caskTokens.find((token) => normalize(token) === target)
  return hit ?? ''
}

function resolveFrom(bundlePath, target) {
  if (target.startsWith('/')) return target
  const parts = `${bundlePath.slice(0, bundlePath.lastIndexOf('/'))}`.split('/').filter(Boolean)
  for (const part of target.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return `/${parts.join('/')}`
}

async function hasExecutable(env, exePath) {
  const stat = await env.lstat(exePath).catch(() => null)
  if (!stat) return false
  if (!stat.isSymbolicLink()) return true
  const target = await env.readlink(exePath).catch(() => '')
  if (!target) return false
  const resolved = resolveFrom(exePath, target.startsWith('~/') ? `${env.home}${target.slice(1)}` : target)
  return env.exists(resolved)
}

async function describeBundle(env, bundlePath) {
  const info = await readAppInfo(env, bundlePath)
  const stat = await env.stat(bundlePath).catch(() => null)
  const linkStat = await env.lstat(bundlePath).catch(() => null)
  const symlinkTarget = linkStat?.isSymbolicLink() ? await env.readlink(bundlePath).catch(() => '') : ''
  const resolvedTarget = symlinkTarget ? resolveFrom(bundlePath, symlinkTarget.startsWith('~/') ? `${env.home}${symlinkTarget.slice(1)}` : symlinkTarget) : ''
  const entries = await env.readdir(`${bundlePath}/Contents`).catch(() => null)
  const executable = String(info.plist?.CFBundleExecutable ?? '')
  const brokenExecutable = executable ? !(await hasExecutable(env, `${bundlePath}/Contents/MacOS/${executable}`)) : false
  return {
    path: bundlePath,
    plist: info.plist,
    raw: info.raw,
    size: null,
    installedAt: iso(stat?.birthtimeMs),
    symlinkTarget,
    resolvedTarget,
    empty: !Array.isArray(entries) || entries.length === 0,
    brokenLink: brokenExecutable || (Boolean(resolvedTarget) && !(await env.exists(resolvedTarget))),
  }
}

export async function collectApps(env) {
  if (!env.darwin) {
    return { available: false, at: new Date().toISOString(), apps: [], brew: { present: false, available: false }, counts: emptyCounts(), causes: [] }
  }
  const brewTask = env.brew === false
    ? Promise.resolve({ present: false, available: false, disabled: true, version: '', branch: '', lastUpdate: null, updateBehind: 0, taps: [], formulae: [], casks: [], outdatedCasks: [], outdatedFormulae: [] })
    : readBrew(env)
  const domains = env.domains ?? DOMAINS
  const [brew, ...folders] = await Promise.all([brewTask, ...domains.map((spec) => scanFolder(env, spec))])
  const caskTokens = brew.casks.map((item) => item.token)
  const [systemRows, utilitiesRows, userRows] = folders
  const rows = [...systemRows, ...utilitiesRows, ...userRows]
  const outdatedByToken = new Map(brew.outdatedCasks.map((item) => [item.token, item]))
  const apps = []
  for (const row of rows) {
    const descriptions = await Promise.all(row.bundles.map((bundlePath) => describeBundle(env, bundlePath)))
    const primary = descriptions[0] ?? {}
    const plist = primary.plist ?? {}
    const isSystem = row.bundles.every((bundlePath) => bundlePath.startsWith(`${SYSTEM_APPS}/`))
      || String(primary.symlinkTarget ?? '').startsWith(SYSTEM_APPS)
      || String(primary.resolvedTarget ?? '').includes('/System/')
    const token = caskFor(row.name, caskTokens)
    const cask = brew.casks.find((item) => item.token === token) ?? null
    const outdatedCask = token ? outdatedByToken.get(token) ?? null : null
    const diskVersion = String(plist.CFBundleShortVersionString ?? '')
    const caskVersion = String(cask?.version ?? '').split(',')[0]
    const state = !descriptions.length || descriptions.some((item) => item.empty || item.brokenLink)
      ? 'invalid'
      : isSystem
        ? 'system'
        : cask && caskVersion && diskVersion && caskVersion !== diskVersion
          ? 'desync'
          : outdatedCask
            ? 'outdated'
            : cask
              ? 'current'
              : 'direct'
    apps.push({
      name: row.name,
      path: row.path,
      domain: row.domain,
      label: row.label,
      vendor: Boolean(row.vendor),
      bundles: descriptions.map((item, index) => ({
        path: row.bundles[index],
        version: String(item.plist?.CFBundleShortVersionString ?? ''),
        build: String(item.plist?.CFBundleVersion ?? ''),
        empty: item.empty,
        brokenLink: item.brokenLink,
        symlinkTarget: item.symlinkTarget,
      })),
      bundleId: String(plist.CFBundleIdentifier ?? ''),
      version: diskVersion,
      build: String(plist.CFBundleVersion ?? ''),
      installedAt: primary.installedAt ?? '',
      size: primary.size ?? 0,
      executable: String(plist.CFBundleExecutable ?? ''),
      cask: token ? { token, version: String(cask?.version ?? ''), installed: caskVersion, outdated: Boolean(outdatedCask), latest: outdatedCask?.latest ?? '', autoUpdates: Boolean(outdatedCask?.autoUpdates) } : null,
      system: isSystem,
      state,
      raw: primary.raw ?? '',
    })
  }
  apps.sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  const counts = countApps(apps, brew)
  return {
    available: true,
    at: new Date().toISOString(),
    apps,
    brew,
    counts,
    causes: buildCauses(apps, brew, counts),
  }
}

function emptyCounts() {
  return { total: 0, bundles: 0, system: 0, user: 0, brew: 0, outOfDate: 0, invalid: 0, desync: 0, direct: 0, current: 0, formulae: 0, formulaeOutdated: 0, casks: 0, casksOutdated: 0 }
}

function countApps(apps, brew) {
  const bundles = apps.reduce((total, app) => total + app.bundles.length, 0)
  return {
    total: apps.length,
    bundles,
    system: apps.filter((app) => app.domain === 'system').reduce((total, app) => total + app.bundles.length, 0),
    user: apps.filter((app) => app.domain === 'user').reduce((total, app) => total + app.bundles.length, 0),
    brew: apps.filter((app) => app.cask).length,
    outOfDate: apps.filter((app) => app.state === 'outdated' || app.state === 'desync').length,
    invalid: apps.filter((app) => app.state === 'invalid').length,
    desync: apps.filter((app) => app.state === 'desync').length,
    direct: apps.filter((app) => app.state === 'direct').length,
    current: apps.filter((app) => app.state === 'current').length,
    formulae: brew.formulae?.length ?? 0,
    formulaeOutdated: brew.outdatedFormulae?.length ?? 0,
    casks: brew.casks?.length ?? 0,
    casksOutdated: brew.outdatedCasks?.length ?? 0,
  }
}

export function stateTone(state) {
  if (state === 'invalid' || state === 'outdated' || state === 'desync') return 'bad'
  if (state === 'direct' || state === 'system') return 'ok'
  return 'ok'
}

export const STATE_LABELS = {
  invalid: 'invalide',
  desync: 'désynchronisé',
  outdated: 'en retard',
  current: 'à jour',
  direct: 'installation directe',
  system: 'lien système',
}

function invalidSentence(emptyBundles, brokenBundles) {
  const empty = [...new Set(emptyBundles.map((app) => app.name))]
  const broken = [...new Set(brokenBundles.map((app) => app.name))].filter((name) => !empty.includes(name))
  const parts = []
  if (empty.length) parts.push(`${empty.join(', ')} ${empty.length > 1 ? 'n’exposent' : 'n’expose'} aucun fichier à exécuter`)
  if (broken.length) parts.push(`${broken.join(', ')} ${broken.length > 1 ? 'pointent' : 'pointe'} vers un binaire absent`)
  const total = empty.length + broken.length
  const tail = total > 1
    ? 'Aucun ne s’ouvre : ils portent une version et ne sont pas des applications.'
    : 'Il ne s’ouvre pas : il porte une version et ce n’est pas une application.'
  return `${parts.join(', et ')}. ${tail}`
}

function buildCauses(apps, brew, counts) {
  const causes = []
  const emptyBundles = apps.filter((app) => app.bundles.some((bundle) => bundle.empty))
  const brokenBundles = apps.filter((app) => app.bundles.some((bundle) => bundle.brokenLink))
  if (emptyBundles.length || brokenBundles.length) {
    causes.push({
      id: 'invalid',
      icon: 'alert',
      title: 'Des bundles qui ne sont pas des applications',
      desc: invalidSentence(emptyBundles, brokenBundles),
      evidence: 'plutil -convert json -o - <bundle>/Contents/Info.plist ; ls <bundle>/Contents ; readlink <bundle>',
      fix: 'Retirer le bundle vide ; réinstaller celui dont le binaire a disparu.',
      tone: 'bad',
    })
  }
  const desync = apps.filter((app) => app.state === 'desync')
  const outdated = apps.filter((app) => app.state === 'outdated')
  if (desync.length || outdated.length) {
    causes.push({
      id: 'drift',
      icon: 'up',
      title: 'Homebrew et le disque ne disent pas la même version',
      desc: `${desync.length ? `${desync.map((app) => `${app.name} (Caskroom ${app.cask.installed}, disque ${app.version})`).join(', ')} ` : ''}${outdated.length ? `${outdated.map((app) => `${app.name} ${app.cask.installed} → ${app.cask.latest}`).join(', ')}` : ''}. Le cask est installé, la version enregistrée n’est pas celle du bundle ; ces casks se mettent à jour seuls, Homebrew les ignore.`,
      evidence: 'brew list --cask --versions ; brew outdated --cask --greedy --json=v2 ; plutil -convert json -o - <bundle>/Contents/Info.plist',
      fix: 'Laisser l’application se mettre à jour, ou lancer `brew upgrade --cask <token>`.',
      tone: 'bad',
    })
  }
  if (brew.present && brew.lastUpdate) {
    const age = Math.round((Date.now() - Date.parse(brew.lastUpdate)) / 3600000)
    if (age > 24) {
      causes.push({
        id: 'stale',
        icon: 'refresh',
        title: 'Le relevé Homebrew a deux jours',
        desc: `Aucune mise à jour n’a été cherchée depuis \`brew update\`, ${age > 48 ? `il y a ${Math.round(age / 24)} jours` : 'hier'}. \`brew outdated\` ne voit pas les versions publiées depuis : il lit ce que le dépôt local contient.${brew.updateBehind ? ` ${brew.updateBehind} commits d’avance dans FETCH_HEAD.` : ''}`,
        evidence: 'stat <repo>/.git/FETCH_HEAD ; git rev-list --count HEAD..FETCH_HEAD',
        fix: 'Lancer `brew update` avant de conclure qu’une formule est à jour.',
        tone: 'warn',
      })
    }
  }
  const direct = apps.filter((app) => app.state === 'direct')
  if (direct.length) {
    causes.push({
      id: 'direct',
      icon: 'info',
      title: 'Des applications hors Homebrew',
      desc: `${direct.length} bundles installés directement ne déclarent aucune version distante : le panneau ne sait pas s’ils sont à jour, et ne le suppose pas.`,
      evidence: 'aucun cask ne porte le nom du bundle dans `brew list --cask`',
      fix: '',
      tone: 'idle',
    })
  }
  return causes
}

export async function collectAppDetail(env, name, snapshot) {
  if (!env.darwin) throw Object.assign(new Error('macOS uniquement'), { status: 400 })
  const wanted = String(name ?? '').trim()
  if (!wanted) throw Object.assign(new Error('nom manquant'), { status: 400 })
  const state = snapshot ?? (await collectApps(env))
  const named = state.apps.filter((item) => item.name.toLowerCase() === wanted.toLowerCase())
  if (!named.length) throw Object.assign(new Error('application inconnue'), { status: 404 })
  const wantedPath = String(env.path ?? '').trim()
  const app = (wantedPath ? named.find((item) => item.path === wantedPath) : null) ?? named[0]
  const bundles = await Promise.all(app.bundles.map(async (bundle) => {
    const path = bundle.path ?? bundle
    const info = await describeBundle(env, path)
    const codesign = await env.run('codesign', ['-dvv', '--keychain', '/dev/null', path], { timeout: 6000 })
    const team = String(codesign.stderr ?? '').match(/TeamIdentifier=(\S+)/)
    const authority = String(codesign.stderr ?? '').match(/Authority=([^\n]+)/)
    const quarantine = await env.run('xattr', ['-p', 'com.apple.quarantine', path], { timeout: 4000 })
    const assess = await env.run('spctl', ['--assess', '--type', 'execute', '-vv', path], { timeout: 6000 })
    const size = await env.run('du', ['-skL', path], { timeout: 15000 })
    const kb = Number(String(size.stdout ?? '').split(/\s+/)[0]) || 0
    return {
      path,
      version: String(info.plist?.CFBundleShortVersionString ?? ''),
      build: String(info.plist?.CFBundleVersion ?? ''),
      bundleId: String(info.plist?.CFBundleIdentifier ?? ''),
      executable: String(info.plist?.CFBundleExecutable ?? ''),
      architecture: await describeArch(env, path),
      size: kb * 1024,
      installedAt: info.installedAt,
      signer: authority ? authority[1].replace(/^Developer ID Application:\s*/, '').replace(/^Apple\s*/, '') : '',
      team: team ? team[1] : '',
      quarantine: quarantine.ok ? String(quarantine.stdout).trim() : '',
      notarized: (String(assess.stderr ?? '').match(/source=([^\n]+)/) ?? [])[1] ?? '',
      empty: info.empty,
      brokenLink: info.brokenLink,
      symlinkTarget: info.symlinkTarget,
      raw: info.raw,
      id: path,
    }
  }))
  const primary = bundles.find((bundle) => !bundle.empty && !bundle.brokenLink) ?? bundles[0] ?? null
  const measured = bundles.reduce((total, bundle) => total + (bundle.size ?? 0), 0)
  return {
    name: app.name,
    path: app.path,
    domain: app.domain,
    label: app.label,
    state: app.state,
    cask: app.cask,
    version: app.version,
    bundleId: app.bundleId,
    installedAt: app.installedAt,
    size: measured || null,
    architecture: primary?.architecture ?? '',
    signer: primary?.signer ?? '',
    quarantine: primary?.quarantine ?? '',
    notarized: primary?.notarized ?? '',
    bundles,
  }
}

async function describeArch(env, bundlePath) {
  const plist = (await readAppInfo(env, bundlePath)).plist ?? {}
  const executable = String(plist.CFBundleExecutable ?? '')
  if (!executable) return ''
  const lipo = await env.run('lipo', ['-archs', `${bundlePath}/Contents/MacOS/${executable}`], { timeout: 4000 })
  const archs = lipo.ok ? String(lipo.stdout).trim() : ''
  if (!archs) return ''
  return archs.split(/\s+/).length > 1 ? `universal (${archs})` : archs
}

export const __internal = { normalize, caskFor, countApps }
