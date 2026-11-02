import { execFile } from 'node:child_process'
import { appendFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { homedir, loadavg, cpus, totalmem } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { promisify } from 'node:util'

export const name = '@daedalforge/dsh-monitor'
export const inject = ['webServer']

const execFileAsync = promisify(execFile)
const DARWIN = process.platform === 'darwin'
const HOME = homedir()
const DEFAULT_PROJECTS_ROOT = '~/projects'
const SESSIONS_DIR = join(HOME, '.dsh', 'sessions')
const LOGS_DIR = join(HOME, '.dsh', 'logs')
const DSH_CACHE = join(HOME, '.dsh', 'cache')
const STATE_DIR = join(HOME, '.dsh', 'storages', 'dsh-monitor')
const CONFIG_PATH = join(STATE_DIR, 'config.json')
const JOURNAL_PATH = join(STATE_DIR, 'journal.jsonl')
const K8S_LAST_PATH = join(STATE_DIR, 'k8s-last.json')
const MAX_BODY = 256 * 1024
const MAX_AGE_SESSION = 15
const INACTIVE_DAYS = 30
const ALLOWED_ARTIFACTS = new Set(['node_modules', 'dist', 'build', '.next', 'target'])

const DEFAULT_CONFIG = {
  disk: { attention: 20, alerte: 10 },
  memoire: { attention: 80, alerte: 90 },
  charge: { coefAttention: 1, coefAlerte: 2 },
  batterie: { attention: 20, alerte: 10 },
  depots: { attentionJours: 3, alerteJours: 7 },
  pods: { attentionRedemarrages: 2, alerteRedemarrages: 5 },
}

const PLUGIN_CONFIG = {
  projectsRoot: DEFAULT_PROJECTS_ROOT,
  k8sContext: '',
  clusterName: '',
  costLedger: '',
}

function projectsRoot() {
  return expand(PLUGIN_CONFIG.projectsRoot || DEFAULT_PROJECTS_ROOT)
}

function costLedgerPath() {
  const value = String(PLUGIN_CONFIG.costLedger ?? '').trim()
  return value ? expand(value) : ''
}

function clusterContext() {
  const expected = String(PLUGIN_CONFIG.k8sContext ?? '').trim()
  if (expected) return expected
  const name = String(PLUGIN_CONFIG.clusterName ?? '').trim()
  return name ? `kind-${name}` : ''
}

function applyPluginConfig(raw) {
  if (!raw || typeof raw !== 'object') return
  for (const key of ['projectsRoot', 'k8sContext', 'clusterName', 'costLedger']) {
    const value = raw[key]
    if (typeof value === 'string') PLUGIN_CONFIG[key] = value
  }
}

const META = `
    <meta name="dsh-monitor" content="1">
    <meta name="dsh-monitor-etat" content="/systeme/api/etat">
    <meta name="dsh-monitor-journal" content="/systeme/api/journal">`

const PROTECTED = new Set([
  'launchd',
  'windowserver',
  'kernel_task',
  'loginwindow',
  'finder',
  'dock',
  'systemuiserver',
  'deepseek harness',
  'electron',
  'node',
  'colima',
  'qemu-system-aarch64',
  'com.docker',
  'docker',
  'containerd',
  'kubelet',
  'kind',
])

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function expand(path) {
  const raw = String(path || '').trim()
  if (!raw) return ''
  if (raw === '~') return HOME
  return raw.startsWith('~/') ? join(HOME, raw.slice(2)) : raw
}

function sendJson(res, status, value) {
  const payload = JSON.stringify(value)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(payload)
}

function fail(res, status, message) {
  sendJson(res, status, { error: message })
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'corps de requête trop volumineux'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function readJson(req) {
  const text = await readBody(req)
  if (!text.trim()) return {}
  try {
    const value = JSON.parse(text)
    return value && typeof value === 'object' ? value : {}
  } catch {
    throw new HttpError(400, 'JSON invalide')
  }
}

function isTrustedRequest(req) {
  const remote = req.socket.remoteAddress ?? ''
  const local = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
  if (!local) return false
  const origin = req.headers.origin
  if (!origin) return true
  try {
    const parsed = new URL(origin)
    return parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '[::1]'
  } catch {
    return false
  }
}

async function writeAtomic(path, content) {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.tmp-${process.pid}-${Date.now()}`
  await writeFile(temporary, content, 'utf8')
  await rename(temporary, path)
}

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

function inside(dir, name) {
  const base = resolve(dir)
  const path = resolve(base, name)
  if (path === base || !path.startsWith(base + sep)) throw new HttpError(422, 'chemin hors périmètre')
  return path
}

async function readJsonFile(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch {
    return fallback
  }
}

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms))
}

function nowIso() {
  return new Date().toISOString()
}

async function run(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      cwd: options.cwd,
      timeout: options.timeout ?? 15000,
      maxBuffer: options.maxBuffer ?? 32 * 1024 * 1024,
      encoding: 'utf8',
    })
    return { ok: true, stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') }
  } catch (error) {
    return {
      ok: false,
      stdout: String(error?.stdout ?? ''),
      stderr: String(error?.stderr ?? ''),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

const SHELL = (() => {
  const candidate = process.env.SHELL ?? ''
  if (/\/(zsh|bash|sh)$/.test(candidate)) return candidate
  return DARWIN ? '/bin/zsh' : '/bin/bash'
})()

async function runShell(script, options = {}) {
  return run(SHELL, ['-lc', script], options)
}

const toolCache = new Map()

async function tool(name) {
  if (!/^[a-z0-9-]+$/.test(name)) return ''
  if (toolCache.has(name)) return toolCache.get(name)
  const result = await runShell(`command -v ${name}`)
  const path = result.ok ? result.stdout.trim().split('\n')[0] : ''
  toolCache.set(name, path)
  return path
}

function formatBytes(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '0 o'
  const units = ['o', 'Ko', 'Mo', 'Go', 'To']
  let index = 0
  let size = value
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024
    index += 1
  }
  return `${size.toFixed(index === 0 ? 0 : 1).replace('.', ',')} ${units[index]}`
}

function ageMinutes(timestamp) {
  return Math.max(0, Math.round((Date.now() - timestamp) / 60000))
}

function ageLabel(minutes) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} h`
  return `${Math.round(hours / 24)} j`
}

function stateRank(state) {
  if (state === 'bad') return 2
  if (state === 'warn') return 1
  return 0
}

function worstState(states) {
  return states.reduce((acc, state) => (stateRank(state) > stateRank(acc) ? state : acc), 'ok')
}

function countStates(rows) {
  return {
    bad: rows.filter((row) => row.state === 'bad').length,
    warn: rows.filter((row) => row.state === 'warn').length,
  }
}

async function readSettings() {
  const raw = await readJsonFile(CONFIG_PATH, {})
  const config = {}
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    config[key] = { ...DEFAULT_CONFIG[key] }
    if (raw && typeof raw[key] === 'object' && raw[key] !== null) {
      for (const field of Object.keys(DEFAULT_CONFIG[key])) {
        const value = Number(raw[key][field])
        if (Number.isFinite(value)) config[key][field] = value
      }
    }
  }
  return config
}

async function appendJournal(entry) {
  await mkdir(dirname(JOURNAL_PATH), { recursive: true })
  await appendFile(JOURNAL_PATH, `${JSON.stringify(entry)}\n`, 'utf8')
}

async function readJournal() {
  try {
    const lines = (await readFile(JOURNAL_PATH, 'utf8')).split('\n').filter(Boolean)
    const entries = []
    for (const line of lines.slice(-80)) {
      try {
        const entry = JSON.parse(line)
        if (entry && typeof entry === 'object') entries.push(entry)
      } catch {
        continue
      }
    }
    return entries.reverse().slice(0, 60)
  } catch {
    return []
  }
}

async function dirSize(path) {
  let total = 0
  const stack = [path]
  while (stack.length) {
    const current = stack.pop()
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) stack.push(full)
      else if (entry.isFile()) {
        try {
          total += (await stat(full)).size
        } catch {
          continue
        }
      }
    }
  }
  return total
}

async function readDisk() {
  const result = await run('/bin/df', ['-k', '/'])
  if (!result.ok) return { total: 0, used: 0, free: 0, freePct: 0 }
  const line = result.stdout.split('\n').find((row) => !row.startsWith('Filesystem') && row.trim()) ?? ''
  const parts = line.trim().split(/\s+/)
  const total = Number(parts[1] ?? 0) * 1024
  const used = Number(parts[2] ?? 0) * 1024
  const free = Number(parts[3] ?? 0) * 1024
  return { total, used, free, freePct: total > 0 ? (free / total) * 100 : 0 }
}

// Machine : macOS interroge ses outils système (vm_stat, sysctl, pmset, top),
// Linux lit /proc et sysfs — mêmes champs, mêmes unités, mêmes seuils.
async function meminfo() {
  const text = await readFile('/proc/meminfo', 'utf8').catch(() => '')
  return (label) => {
    const match = text.match(new RegExp(`^${label}:\\s+(\\d+) kB`, 'm'))
    return match ? Number(match[1]) * 1024 : 0
  }
}

async function zramCompressed() {
  const text = await readFile('/sys/block/zram0/mm_stat', 'utf8').catch(() => '')
  const compressed = Number(text.trim().split(/\s+/)[1] ?? 0)
  return Number.isFinite(compressed) ? compressed : 0
}

async function readMemory() {
  const total = totalmem()
  if (!DARWIN) {
    const kb = await meminfo()
    const installed = kb('MemTotal') || total
    // MemAvailable est l'estimation du noyau de ce qui reste mobilisable :
    // l'équivalent Linux de la « mémoire d'application » du Moniteur d'activité.
    const available = kb('MemAvailable') || kb('MemFree') + kb('Buffers') + kb('Cached') + kb('SReclaimable')
    const used = Math.max(0, installed - available)
    return {
      total: installed,
      used,
      free: available,
      percent: installed > 0 ? (used / installed) * 100 : 0,
      app: used,
      wired: 0,
      compressed: await zramCompressed(),
      cached: kb('Cached') + kb('Buffers') + kb('SReclaimable'),
      active: used,
    }
  }
  const result = await run('/usr/bin/vm_stat', [])
  if (!result.ok) return { total, used: 0, free: total, percent: 0, app: 0, wired: 0, compressed: 0, cached: 0, active: 0 }
  const pageSize = Number((result.stdout.match(/page size of (\d+) bytes/) ?? [])[1] ?? 16384)
  const pages = (label) => {
    const match = result.stdout.match(new RegExp(`^${label}:\\s+(\\d+)\\.?\\s*$`, 'm'))
    return Number(match?.[1] ?? 0) * pageSize
  }
  const free = pages('Pages free')
  const active = pages('Pages active')
  const anonymous = pages('Anonymous pages')
  const purgeable = pages('Pages purgeable')
  const wired = pages('Pages wired down')
  const compressed = pages('Pages occupied by compressor')
  const cached = pages('File-backed pages')
  const app = Math.max(0, anonymous - purgeable)
  const used = app + wired + compressed
  return { total, used, free, percent: total > 0 ? (used / total) * 100 : 0, app, wired, compressed, cached, active }
}

async function readSwap() {
  if (!DARWIN) {
    const kb = await meminfo()
    const total = kb('SwapTotal')
    return { total, used: Math.max(0, total - kb('SwapFree')) }
  }
  const result = await run('/usr/sbin/sysctl', ['-n', 'vm.swapusage'])
  const text = result.ok ? result.stdout : ''
  const toBytes = (match) => (match ? Math.round(Number(match[1]) * (match[2] === 'G' ? 1024 ** 3 : 1024 ** 2)) : 0)
  return {
    total: toBytes(text.match(/total = ([\d.]+)([MG])/)),
    used: toBytes(text.match(/used = ([\d.]+)([MG])/)),
  }
}

async function readBattery() {
  if (!DARWIN) {
    try {
      const dirs = await readdir('/sys/class/power_supply')
      for (const dir of dirs) {
        const base = join('/sys/class/power_supply', dir)
        const type = (await readFile(join(base, 'type'), 'utf8').catch(() => '')).trim()
        if (type !== 'Battery') continue
        const percent = Number((await readFile(join(base, 'capacity'), 'utf8').catch(() => '')).trim())
        if (!Number.isFinite(percent)) continue
        const status = (await readFile(join(base, 'status'), 'utf8').catch(() => '')).trim().toLowerCase()
        return { percent, charging: status === 'charging' || status === 'full' }
      }
    } catch {
      /* pas de batterie : poste fixe */
    }
    return null
  }
  const result = await run('/usr/bin/pmset', ['-g', 'batt'])
  if (!result.ok || !/InternalBattery|Battery/i.test(result.stdout)) return null
  const percent = Number((result.stdout.match(/(\d+)%/) ?? [])[1] ?? 0)
  const charging = !/discharging/i.test(result.stdout) && /charging|charged|AC Power/i.test(result.stdout)
  return { percent, charging }
}

async function readCpu() {
  if (!DARWIN) {
    const sample = async () => {
      const text = await readFile('/proc/stat', 'utf8').catch(() => '')
      const line = text.split('\n').find((row) => row.startsWith('cpu ')) ?? ''
      const parts = line.trim().split(/\s+/).slice(1).map(Number)
      const idle = (parts[3] ?? 0) + (parts[4] ?? 0)
      return { idle, total: parts.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0) }
    }
    const first = await sample()
    await new Promise((resolve) => setTimeout(resolve, 200))
    const second = await sample()
    const dTotal = second.total - first.total
    if (dTotal <= 0) return 0
    return Math.round((1 - (second.idle - first.idle) / dTotal) * 1000) / 10
  }
  // « top -l 1 » renvoie la moyenne depuis le démarrage ; le second échantillon
  // de « top -l 2 -s 1 » est le delta sur la dernière seconde, comme le delta
  // de /proc/stat sous Linux.
  const result = await run('/usr/bin/top', ['-l', '2', '-n', '0', '-s', '1'], { timeout: 12000 })
  const samples = result.ok
    ? [...result.stdout.matchAll(/CPU usage:\s*([\d.]+)% user,\s*([\d.]+)% sys,\s*([\d.]+)% idle/g)]
    : []
  const match = samples.at(-1)
  if (!match) return 0
  return Math.round((100 - Number(match[3])) * 10) / 10
}

function canKill(pid, name) {
  if (!Number.isInteger(pid) || pid <= 1) return false
  if (pid === process.pid || pid === process.ppid) return false
  const base = String(name || '').toLowerCase()
  if (PROTECTED.has(base)) return false
  return !/deepseek harness|windowserver|launchd|kernel_task|electron|colima|qemu-system|docker|containerd|kubelet|kind|systemd|dbus-daemon|xorg|kwin|plasmashell|gnome-shell|pipewire/.test(base)
}

function parseProcesses(stdout, limit) {
  const rows = []
  for (const line of String(stdout ?? '').split('\n')) {
    const match = line.match(/^\s*(\d+)\s+([\d.]+)\s+(\d+)\s+(.+)$/)
    if (!match) continue
    const pid = Number(match[1])
    const name = basename(match[4].trim())
    rows.push({
      pid,
      cpu: Number(match[2]),
      rss: Number(match[3]) * 1024,
      name,
      canKill: canKill(pid, name),
    })
    if (rows.length >= limit) break
  }
  return rows
}

async function readProcesses(limit = 6) {
  const args = DARWIN
    ? ['-Ao', 'pid=,pcpu=,rss=,comm=', '-r']
    : ['-eo', 'pid=,pcpu=,rss=,comm=', '--sort=-pcpu']
  const result = await run('/bin/ps', args)
  if (!result.ok) return []
  return parseProcesses(result.stdout, limit)
}

async function collectMachine(config) {
  const cores = Math.max(1, cpus().length)
  const load = loadavg()
  const [disk, swap, battery, cpu, processes, memory, colimaDisk] = await Promise.all([
    readDisk(),
    readSwap(),
    readBattery(),
    readCpu(),
    readProcesses(5),
    readMemory(),
    cachedSection('colima', probeColimaDisk),
  ])
  const total = memory.total
  const memoryPct = Math.round(memory.percent)
  const history = collectMachine.history ?? []
  history.push(cpu)
  while (history.length > 24) history.shift()
  collectMachine.history = history

  const memState = memoryPct >= config.memoire.alerte ? 'bad' : memoryPct >= config.memoire.attention ? 'warn' : 'ok'
  const diskState = disk.freePct <= config.disk.alerte ? 'bad' : disk.freePct <= config.disk.attention ? 'warn' : 'ok'
  const loadRatio = load[0] / cores
  const loadState = loadRatio >= config.charge.coefAlerte ? 'bad' : loadRatio >= config.charge.coefAttention ? 'warn' : 'ok'
  let batteryState = 'ok'
  if (battery && !battery.charging) {
    batteryState = battery.percent <= config.batterie.alerte ? 'bad' : battery.percent <= config.batterie.attention ? 'warn' : 'ok'
  }
  const colimaMount = colimaDisk?.docker ?? colimaDisk?.root ?? null
  const colimaStopped = Boolean(colimaDisk?.stopped)
  const colimaFreePct = colimaMount && colimaMount.total > 0 ? (colimaMount.free / colimaMount.total) * 100 : 0
  const colimaState = colimaStopped ? 'grey' : colimaMount ? (colimaFreePct <= config.disk.alerte ? 'bad' : colimaFreePct <= config.disk.attention ? 'warn' : 'ok') : 'ok'
  const colimaDetail = colimaStopped
    ? 'La VM est arrêtée ; le disque se lit après démarrage'
    : colimaMount
      ? `${formatBytes(colimaMount.used)} utilisés / ${formatBytes(colimaMount.total)} · ${formatBytes(colimaMount.free)} libres`
      : colimaDisk?.error ?? colimaDisk?.reason ?? 'colima indisponible'
  const rows = [
    { id: 'cpu', label: 'Processeur', value: `${cpu} %`, percent: cpu, state: 'ok', detail: `${cores} cœurs` },
    { id: 'memoire', label: 'Mémoire', value: `${memoryPct} %`, percent: memoryPct, state: memState, detail: `${formatBytes(memory.used)} / ${formatBytes(total)} · actif ${formatBytes(memory.active + memory.wired)}, compressé ${formatBytes(memory.compressed)}` },
    { id: 'disque', label: 'Disque libre', value: `${disk.freePct.toFixed(1).replace('.', ',')} %`, percent: disk.freePct, state: diskState, detail: `${formatBytes(disk.free)} / ${formatBytes(disk.total)}` },
    { id: 'colima', label: 'Disque Colima', value: colimaStopped ? 'VM arrêtée' : colimaMount ? `${colimaFreePct.toFixed(1).replace('.', ',')} % libres` : '—', percent: colimaFreePct, state: colimaState, detail: colimaDetail },
    { id: 'charge', label: 'Charge', value: `${load[0].toFixed(1).replace('.', ',')}`, percent: Math.min(100, loadRatio * 100), state: loadState, detail: `${loadRatio.toFixed(1).replace('.', ',')}× ${cores} cœurs` },
    { id: 'batterie', label: 'Batterie', value: battery ? `${battery.percent} %` : '—', percent: battery ? battery.percent : 0, state: batteryState, detail: battery ? (battery.charging ? 'en charge' : 'sur batterie') : 'secteur' },
    { id: 'swap', label: 'Swap', value: formatBytes(swap.used), percent: swap.total > 0 ? (swap.used / swap.total) * 100 : 0, state: 'ok', detail: `${formatBytes(swap.total)} au total` },
  ]
  const counts = countStates(rows)
  return {
    at: nowIso(),
    state: worstState(rows.map((row) => row.state)),
    alert: counts.bad ? `${counts.bad} alerte` : counts.warn ? `${counts.warn} attention` : 'ok',
    alerts: counts.bad,
    warnings: counts.warn,
    cpu,
    cpuCount: cores,
    cpuHistory: history.slice(-24),
    memory: { ...memory, percent: memoryPct },
    disk: { ...disk, label: 'libres' },
    colima: { ...colimaDisk, mount: colimaMount, freePct: colimaFreePct, state: colimaState },
    load: { one: load[0], five: load[1], fifteen: load[2], ratio: loadRatio },
    swap,
    battery,
    rows,
    top: processes,
  }
}

async function collectCost() {
  const path = costLedgerPath()
  if (!path) return null
  const ledger = await readJsonFile(path, {})
  const today = new Date().toISOString().slice(0, 10)
  const day = ledger?.days?.[today] ?? {}
  const config = ledger?.config ?? {}
  return {
    amount: Number(day.cost ?? 0),
    currency: String(config.currency ?? 'USD'),
    symbol: String(config.symbol ?? '$'),
    calls: Number(day.calls ?? 0),
    label: "Aujourd'hui",
    detail: day.calls ? `${Number(day.calls)} appels` : 'aucun appel',
  }
}

async function collectSessions() {
  const items = []
  let workspaces = []
  try {
    workspaces = await readdir(SESSIONS_DIR, { withFileTypes: true })
  } catch {
    return { count: 0, items: [], label: '0 session', detail: 'actives · 15 min' }
  }
  for (const workspace of workspaces) {
    if (!workspace.isDirectory()) continue
    let sessions = []
    try {
      sessions = await readdir(join(SESSIONS_DIR, workspace.name), { withFileTypes: true })
    } catch {
      continue
    }
    const label = workspace.name.replace(/^-+|-+$/g, '').split('-').filter(Boolean).slice(-1)[0] ?? workspace.name
    for (const session of sessions) {
      if (!session.isDirectory()) continue
      try {
        const dir = join(SESSIONS_DIR, workspace.name, session.name)
        const lock = await stat(join(dir, 'session.lock'))
        const log = await stat(join(dir, 'session.v4.jsonl.zstd')).catch(() => null)
        const dirInfo = await stat(dir)
        const last = Math.max(lock.mtimeMs, log?.mtimeMs ?? 0, dirInfo.mtimeMs)
        const minutes = ageMinutes(last)
        items.push({
          id: session.name,
          label,
          detail: `${session.name.slice(0, 8)} · ${ageLabel(minutes)}`,
          ageMin: minutes,
          active: minutes < MAX_AGE_SESSION,
        })
      } catch {
        continue
      }
    }
  }
  items.sort((a, b) => a.ageMin - b.ageMin)
  const active = items.filter((item) => item.active)
  return {
    count: active.length,
    items: items.slice(0, 6),
    label: `${active.length} session(s)`,
    detail: 'actives · 15 min',
  }
}

async function collectErrors() {
  let files = []
  try {
    files = (await readdir(LOGS_DIR))
      .filter((entry) => entry.startsWith('startup-') && entry.endsWith('.log'))
      .sort()
  } catch {
    files = []
  }
  let count = 0
  const items = []
  for (const file of files.slice(-3)) {
    try {
      const text = await readFile(join(LOGS_DIR, file), 'utf8')
      for (const line of text.split('\n')) {
        if (/(error|erreur|failed|fatal|exception)/i.test(line)) {
          count += 1
          if (items.length < 5) items.push(line.trim().slice(0, 200))
        }
      }
    } catch {
      continue
    }
  }
  return {
    count,
    label: `${count} erreur(s)`,
    detail: files.length ? `24 h · ${files.length} log(s)` : 'aucun log',
    items,
    state: count > 0 ? 'warn' : 'ok',
  }
}

async function collectCache() {
  const bytes = await dirSize(DSH_CACHE).catch(() => 0)
  return { bytes, label: formatBytes(bytes), detail: '~/.dsh/cache' }
}

async function collectDsh() {
  const [cost, sessions, errors, cache] = await Promise.all([
    collectCost(),
    collectSessions(),
    collectErrors(),
    collectCache(),
  ])
  const processes = await readProcesses(40)
  const self = processes.find((entry) => entry.pid === process.pid) ?? {
    pid: process.pid,
    rss: process.memoryUsage().rss,
    cpu: 0,
    name: 'dsh-monitor',
  }
  return {
    state: errors.state,
    alert: errors.count > 0 ? errors.label : 'ok',
    detail: 'runtime DSH',
    cost,
    sessions,
    errors,
    cache,
    process: { pid: self.pid, rss: self.rss, cpu: self.cpu, name: self.name },
  }
}

async function collectGit(dir) {
  const result = await run('git', ['-C', dir, 'status', '--porcelain=v1', '--branch'], { timeout: 10000 })
  if (!result.ok) {
    return { ok: false, branch: '', ahead: 0, behind: 0, dirty: 0, paths: [], error: result.stderr || result.error }
  }
  const lines = result.stdout.split('\n').filter(Boolean)
  const head = lines.find((line) => line.startsWith('## ')) ?? ''
  const branchMatch = head.match(/^## (?:No commits yet on )?(.+?)(?:\.\.\.|$)/)
  let branch = branchMatch ? branchMatch[1].trim() : ''
  if (branch === 'HEAD (no branch)') branch = 'detached'
  const ahead = Number((head.match(/ahead (\d+)/) ?? [])[1] ?? 0)
  const behind = Number((head.match(/behind (\d+)/) ?? [])[1] ?? 0)
  const paths = lines
    .filter((line) => !line.startsWith('## '))
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
  return { ok: true, branch, ahead, behind, dirty: paths.length, paths }
}

async function readLastCommit(dir) {
  const result = await run('git', ['-C', dir, 'log', '-1', '--format=%ct'], { timeout: 8000 })
  if (!result.ok || !result.stdout.trim()) return 0
  return Number(result.stdout.trim()) * 1000
}

async function readLocalBranches(dir) {
  const result = await run('git', ['-C', dir, 'for-each-ref', '--format=%(refname:short)', 'refs/heads'], { timeout: 8000 })
  if (!result.ok) return []
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

async function readOldestDirty(dir, paths) {
  let oldest = 0
  for (const path of paths.slice(0, 20)) {
    const clean = path.split(' -> ').pop()
    try {
      const info = await stat(join(dir, clean))
      if (!oldest || info.mtimeMs < oldest) oldest = info.mtimeMs
    } catch {
      continue
    }
  }
  return oldest
}

async function mapLimit(items, limit, task) {
  const results = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const current = next++
      results[current] = await task(items[current], current)
    }
  })
  await Promise.all(workers)
  return results
}

async function collectRepo(name, config) {
  const dir = join(projectsRoot(), name)
  if (!(await exists(join(dir, '.git')))) return null
  const git = await collectGit(dir)
  if (!git.ok) return null
  const [lastCommit, allBranches, oldestDirty] = await Promise.all([
    readLastCommit(dir),
    readLocalBranches(dir),
    git.dirty > 0 ? readOldestDirty(dir, git.paths) : 0,
  ])
  const branches = allBranches.filter((branch) => branch !== git.branch)
  const lastDays = lastCommit ? Math.max(0, Math.floor((Date.now() - lastCommit) / 86400000)) : 0
  const dirtyDays = oldestDirty ? Math.max(0, Math.floor((Date.now() - oldestDirty) / 86400000)) : 0
  const bad = git.dirty > 0 && dirtyDays >= config.depots.alerteJours
  const warn = git.dirty > 0 || git.ahead > 0 || git.behind > 0
  const state = bad ? 'bad' : warn ? 'warn' : 'ok'
  return {
    branches,
    item: {
      name,
      branch: git.branch || '—',
      dirty: git.dirty,
      ahead: git.ahead,
      behind: git.behind,
      oldestDirtyDays: dirtyDays,
      last: lastCommit ? `${lastDays} j` : '—',
      lastDays,
      state,
      sync: git.ahead > 0 ? `${git.ahead} ahead` : git.behind > 0 ? `${git.behind} behind` : 'à jour',
    },
  }
}

async function collectRepos(config) {
  let entries = []
  try {
    entries = await readdir(projectsRoot(), { withFileTypes: true })
  } catch {
    return { state: 'bad', alert: `${projectsRoot()} introuvable`, detail: '', items: [], total: 0, hidden: true }
  }
  const names = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
  const collected = await mapLimit(names, 6, (name) => collectRepo(name, config))
  const items = []
  const branches = []
  for (const result of collected) {
    if (!result) continue
    items.push(result.item)
    for (const branch of result.branches) branches.push({ repo: result.item.name, branch })
  }
  items.sort((a, b) => {
    const rank = stateRank(b.state) - stateRank(a.state)
    if (rank !== 0) return rank
    return a.name.localeCompare(b.name)
  })
  const dirtyCount = items.filter((item) => item.dirty > 0).length
  const behindCount = items.filter((item) => item.behind > 0).length
  const aheadCount = items.filter((item) => item.ahead > 0).length
  const oldestDirtyDays = items.reduce((max, item) => Math.max(max, item.oldestDirtyDays), 0)
  const state = items.reduce((acc, item) => worstState([acc, item.state]), 'ok')
  return {
    state,
    alert: dirtyCount ? `${dirtyCount} sales` : 'ok',
    detail: `${items.length} dépôts · ${dirtyCount} sales · ${behindCount} en retard`,
    total: items.length,
    dirtyCount,
    behindCount,
    aheadCount,
    oldestDirtyDays,
    items,
    branches: branches.slice(0, 8),
    branchCount: branches.length,
  }
}

async function kubectlGet(args, timeout = 8000) {
  const binary = await tool('kubectl')
  if (!binary) return { ok: false, error: 'kubectl absent', data: null }
  const result = await run(binary, [...args, '--request-timeout=6s'], { timeout })
  if (!result.ok) return { ok: false, error: result.stderr.trim() || result.error || 'kubectl a échoué', data: null }
  try {
    return { ok: true, data: JSON.parse(result.stdout), error: '' }
  } catch {
    return { ok: false, error: 'réponse kubectl illisible', data: null }
  }
}

function podRestarts(pod) {
  return (pod?.status?.containerStatuses ?? []).reduce((sum, status) => sum + Number(status?.restartCount ?? 0), 0)
}

function quantityCpu(value) {
  const match = String(value ?? '').trim().match(/^([\d.]+)(m|u|n)?$/)
  if (!match) return 0
  const units = { '': 1, m: 1e-3, u: 1e-6, n: 1e-9 }
  return Number(match[1]) * (units[match[2] ?? ''] ?? 1)
}

function quantityBytes(value) {
  const match = String(value ?? '').trim().match(/^([\d.]+)\s*(Ki|Mi|Gi|Ti|K|M|G|T)?$/)
  if (!match) return 0
  const units = { '': 1, Ki: 1024, Mi: 1024 ** 2, Gi: 1024 ** 3, Ti: 1024 ** 4, K: 1e3, M: 1e6, G: 1e9, T: 1e12 }
  return Math.round(Number(match[1]) * (units[match[2] ?? ''] ?? 1))
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

function round2(value) {
  return Math.round(value * 100) / 100
}

function podWaiting(pod) {
  for (const status of pod?.status?.containerStatuses ?? []) {
    if (status?.state?.waiting?.reason) return String(status.state.waiting.reason)
    if (status?.state?.terminated?.reason) return String(status.state.terminated.reason)
  }
  return ''
}

function nodeReady(node) {
  return (node?.status?.conditions ?? []).some((condition) => condition.type === 'Ready' && condition.status === 'True')
}

async function collectK8s(config) {
  const [docker, colima, kind, kubectl, k9s, kubectx] = await Promise.all([
    tool('docker'),
    tool('colima'),
    tool('kind'),
    tool('kubectl'),
    tool('k9s'),
    tool('kubectx'),
  ])
  const [dockerInfo, contextResult] = await Promise.all([
    docker ? run(docker, ['info'], { timeout: 6000 }) : Promise.resolve({ ok: false, stdout: '', stderr: '', error: '' }),
    kubectl ? run(kubectl, ['config', 'current-context'], { timeout: 6000 }) : Promise.resolve({ ok: false, stdout: '' }),
  ])
  const dockerUp = Boolean(docker) && dockerInfo.ok
  const context = contextResult.ok ? contextResult.stdout.trim() : ''
  const expectedCluster = String(PLUGIN_CONFIG.clusterName ?? '').trim()
  let clusterExists = true
  if (dockerUp && kind && expectedCluster) {
    const list = await run(kind, ['get', 'clusters'], { timeout: 10000 })
    if (list.ok) clusterExists = list.stdout.split('\n').map((line) => line.trim()).includes(expectedCluster)
  }
  let liveError = ''
  if (!dockerUp) liveError = colima ? "Docker n'est pas démarré (colima)" : "Docker n'est pas démarré"
  else if (!kubectl) liveError = 'kubectl absent'
  else if (!clusterExists) liveError = `le cluster kind-${expectedCluster} n'existe pas`
  let nodes = []
  let pods = []
  let deployments = []
  let statefulsets = []
  let daemonsets = []
  let jobs = []
  let cronjobs = []
  let namespaces = []
  let pvcs = []
  let events = []
  if (dockerUp && kubectl && clusterExists) {
    const [nodesResult, podsResult, deploymentsResult, statefulsetsResult, daemonsetsResult, jobsResult, cronjobsResult, namespacesResult, pvcsResult, eventsResult] = await Promise.all([
      kubectlGet(['get', 'nodes', '-o', 'json']),
      kubectlGet(['get', 'pods', '-o', 'json', '--all-namespaces']),
      kubectlGet(['get', 'deployments', '-o', 'json', '--all-namespaces']),
      kubectlGet(['get', 'statefulsets', '-o', 'json', '--all-namespaces']),
      kubectlGet(['get', 'daemonsets', '-o', 'json', '--all-namespaces']),
      kubectlGet(['get', 'jobs', '-o', 'json', '--all-namespaces']),
      kubectlGet(['get', 'cronjobs', '-o', 'json', '--all-namespaces']),
      kubectlGet(['get', 'namespaces', '-o', 'json']),
      kubectlGet(['get', 'pvc', '-o', 'json', '--all-namespaces']),
      kubectlGet(['get', 'events', '-o', 'json', '--all-namespaces', '--sort-by=.lastTimestamp']),
    ])
    if (nodesResult.ok) nodes = nodesResult.data?.items ?? []
    else liveError = nodesResult.error
    if (podsResult.ok) pods = podsResult.data?.items ?? []
    if (deploymentsResult.ok) deployments = deploymentsResult.data?.items ?? []
    if (statefulsetsResult.ok) statefulsets = statefulsetsResult.data?.items ?? []
    if (daemonsetsResult.ok) daemonsets = daemonsetsResult.data?.items ?? []
    if (jobsResult.ok) jobs = jobsResult.data?.items ?? []
    if (cronjobsResult.ok) cronjobs = cronjobsResult.data?.items ?? []
    if (namespacesResult.ok) namespaces = namespacesResult.data?.items ?? []
    if (pvcsResult.ok) pvcs = pvcsResult.data?.items ?? []
    if (eventsResult.ok) events = (eventsResult.data?.items ?? []).slice(-400)
  }
  const namespaceOf = (item) => String(item?.metadata?.namespace ?? '')
  const nameOf = (item) => String(item?.metadata?.name ?? '?')
  const nodesView = nodes.map((node) => {
    const pressure = ['MemoryPressure', 'DiskPressure', 'PIDPressure'].filter((type) => (node?.status?.conditions ?? []).some((condition) => condition.type === type && condition.status === 'True'))
    return {
      name: nameOf(node),
      ready: nodeReady(node),
      pressure,
      cpu: quantityCpu(node?.status?.allocatable?.cpu),
      memory: quantityBytes(node?.status?.allocatable?.memory),
      pods: Number(node?.status?.allocatable?.pods ?? 0),
    }
  })
  const podsView = pods.map((pod) => {
    const restarts = podRestarts(pod)
    const waiting = podWaiting(pod)
    const phase = String(pod?.status?.phase ?? '')
    const start = pod?.status?.startTime ? new Date(pod.status.startTime).getTime() : 0
    const age = start ? Math.max(0, Math.floor((Date.now() - start) / 60000)) : 0
    const succeeded = phase === 'Succeeded'
    const ready = succeeded || (pod?.status?.conditions ?? []).some((condition) => condition.type === 'Ready' && condition.status === 'True')
    const oom = (pod?.status?.containerStatuses ?? []).some((status) => status?.lastState?.terminated?.reason === 'OOMKilled')
    let state = 'ok'
    if (phase === 'Failed') state = 'bad'
    else if (!succeeded) {
      if (['CrashLoopBackOff', 'ImagePullBackOff', 'ErrImagePull', 'InvalidImageName', 'CreateContainerConfigError', 'Error'].includes(waiting)) state = 'bad'
      else if (restarts >= config.pods.alerteRedemarrages) state = 'bad'
      else if (restarts >= config.pods.attentionRedemarrages || !ready || waiting) state = 'warn'
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
      oom,
      age,
      state,
      requests: podRequests(pod),
      target: { namespace, kind: 'pod', name },
    }
  })
  const deploymentsView = deployments.map((deployment) => {
    const desired = Number(deployment?.spec?.replicas ?? 0)
    const available = Number(deployment?.status?.availableReplicas ?? 0)
    const ready = Number(deployment?.status?.readyReplicas ?? 0)
    const updated = Number(deployment?.status?.updatedReplicas ?? 0)
    const zero = desired === 0 && available === 0
    const state = zero ? 'ok' : available < desired ? (available === 0 ? 'bad' : 'warn') : updated < desired ? 'warn' : 'ok'
    const namespace = namespaceOf(deployment)
    const name = nameOf(deployment)
    return {
      name,
      namespace,
      desired,
      available,
      ready,
      updated,
      zero,
      state,
      target: { namespace, kind: 'deployment', name },
    }
  })
  const statefulsetsView = statefulsets.map((set) => {
    const desired = Number(set?.spec?.replicas ?? 0)
    const ready = Number(set?.status?.readyReplicas ?? 0)
    const namespace = namespaceOf(set)
    const name = nameOf(set)
    return { name, namespace, desired, ready, state: desired > 0 && ready < desired ? 'warn' : 'ok', target: { namespace, kind: 'statefulset', name } }
  })
  const daemonsetsView = daemonsets.map((set) => {
    const desired = Number(set?.status?.desiredNumberScheduled ?? 0)
    const ready = Number(set?.status?.numberReady ?? 0)
    const namespace = namespaceOf(set)
    const name = nameOf(set)
    return { name, namespace, desired, ready, state: desired > 0 && ready < desired ? 'warn' : 'ok', target: { namespace, kind: 'daemonset', name } }
  })
  const jobsView = jobs.map((job) => {
    const succeeded = Number(job?.status?.succeeded ?? 0)
    const failed = Number(job?.status?.failed ?? 0)
    const active = Number(job?.status?.active ?? 0)
    const completions = Number(job?.spec?.completions ?? 1)
    const namespace = namespaceOf(job)
    const name = nameOf(job)
    return {
      name,
      namespace,
      succeeded,
      failed,
      active,
      completions,
      state: failed > 0 ? 'bad' : 'ok',
      target: { namespace, kind: 'job', name },
    }
  })
  const cronjobsView = cronjobs.map((cronjob) => {
    const namespace = namespaceOf(cronjob)
    const name = nameOf(cronjob)
    return {
      name,
      namespace,
      schedule: String(cronjob?.spec?.schedule ?? ''),
      suspended: cronjob?.spec?.suspend === true,
      active: Number(cronjob?.status?.active?.length ?? 0),
      lastSchedule: String(cronjob?.status?.lastScheduleTime ?? ''),
      state: cronjob?.spec?.suspend === true ? 'warn' : 'ok',
    }
  })
  const pvcsView = pvcs.map((claim) => {
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
  const namespaceNames = [...new Set([
    ...namespaces.map((item) => nameOf(item)),
    ...podsView.map((pod) => pod.namespace),
    ...deploymentsView.map((deployment) => deployment.namespace),
    ...jobsView.map((job) => job.namespace),
  ])].filter(Boolean).sort()
  const counts = {
    nodes: { total: nodesView.length, ready: nodesView.filter((node) => node.ready).length },
    pods: {
      total: podsView.length,
      running: podsView.filter((pod) => pod.phase === 'Running').length,
      pending: podsView.filter((pod) => pod.phase === 'Pending').length,
      succeeded: podsView.filter((pod) => pod.phase === 'Succeeded').length,
      failed: podsView.filter((pod) => pod.phase === 'Failed').length,
      notReady: podsView.filter((pod) => !pod.ready).length,
    },
    deployments: {
      total: deploymentsView.length,
      available: deploymentsView.filter((deployment) => !deployment.zero && deployment.available >= deployment.desired).length,
      unavailable: deploymentsView.filter((deployment) => !deployment.zero && deployment.available < deployment.desired).length,
      zero: deploymentsView.filter((deployment) => deployment.zero).length,
    },
    statefulsets: { total: statefulsetsView.length, ready: statefulsetsView.filter((set) => set.state === 'ok').length },
    daemonsets: { total: daemonsetsView.length, ready: daemonsetsView.filter((set) => set.state === 'ok').length },
    jobs: {
      total: jobsView.length,
      active: jobsView.filter((job) => job.active > 0).length,
      succeeded: jobsView.filter((job) => job.succeeded > 0).length,
      failed: jobsView.filter((job) => job.failed > 0).length,
    },
    cronjobs: { total: cronjobsView.length, suspended: cronjobsView.filter((cronjob) => cronjob.suspended).length },
    pvcs: { total: pvcsView.length, bound: pvcsView.filter((claim) => claim.state === 'ok').length },
    namespaces: { total: namespaceNames.length },
  }
  let requestedCpu = 0
  let requestedMemory = 0
  let requestedPods = 0
  for (const pod of podsView) {
    if (pod.phase === 'Succeeded' || pod.phase === 'Failed') continue
    requestedCpu += pod.requests.cpu
    requestedMemory += pod.requests.memory
    requestedPods += 1
  }
  const allocatableCpu = nodesView.reduce((sum, node) => sum + node.cpu, 0)
  const allocatableMemory = nodesView.reduce((sum, node) => sum + node.memory, 0)
  const allocatablePods = nodesView.reduce((sum, node) => sum + node.pods, 0)
  const shareOf = (value, total) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0)
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
  addSignal('crashloop', 'Pods en CrashLoopBackOff', podsView.filter((pod) => pod.waiting === 'CrashLoopBackOff'), 'conteneur qui redémarre sans fin')
  addSignal('image', 'Pods en erreur d’image', podsView.filter((pod) => ['ImagePullBackOff', 'ErrImagePull', 'InvalidImageName', 'CreateContainerConfigError'].includes(pod.waiting)), 'image absente ou registre injoignable')
  addSignal('redemarrages', 'Redémarrages au-delà du seuil', podsView.filter((pod) => pod.phase !== 'Succeeded' && pod.phase !== 'Failed' && pod.restarts >= config.pods.attentionRedemarrages && pod.waiting !== 'CrashLoopBackOff'), `seuil ${config.pods.attentionRedemarrages} · alerte ${config.pods.alerteRedemarrages}`)
  addSignal('pending', 'Pods Pending depuis plus de 5 min', podsView.filter((pod) => pod.phase === 'Pending' && pod.age > 5), 'placement impossible')
  addSignal('oom', 'Conteneurs tués par OOM', podsView.filter((pod) => pod.oom), 'mémoire épuisée (OOMKilled)')
  addSignal('rollout', 'Deployments indisponibles', deploymentsView.filter((deployment) => deployment.state === 'bad'), 'aucune réplique disponible')
  addSignal('rollout-bloque', 'Rollouts bloqués', deploymentsView.filter((deployment) => deployment.state === 'warn'), 'répliques disponibles en retard sur le souhaité')
  addSignal('jobs', 'Jobs échoués', jobsView.filter((job) => job.failed > 0), 'échec de job')
  addSignal('pvc', 'PVC non Bound', pvcsView.filter((claim) => claim.state !== 'ok'), 'volume non lié')
  addSignal('noeuds', 'Nœuds non prêts ou sous pression', nodesView.filter((node) => !node.ready || node.pressure.length > 0), 'santé du nœud')
  const grouped = new Map()
  for (const event of events) {
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
    grouped.set(key, { reason, kind, namespace, name, count: Number(event?.count ?? 1), at, message: String(event?.message ?? '').slice(0, 200) })
  }
  const eventsView = [...grouped.values()].sort((a, b) => b.count - a.count || String(b.at).localeCompare(String(a.at))).slice(0, 6)
  const nodeBad = nodesView.some((node) => !node.ready || node.pressure.length > 0)
  const badPods = podsView.filter((pod) => pod.state === 'bad')
  const podBad = badPods.length > 0
  const podWarn = podsView.some((pod) => pod.state === 'warn')
  const deployBad = deploymentsView.some((deployment) => deployment.state === 'bad')
  const deployWarn = deploymentsView.some((deployment) => deployment.state === 'warn')
  const jobBad = jobsView.some((job) => job.state === 'bad')
  const pvcBad = pvcsView.some((claim) => claim.state !== 'ok')
  const crashBad = badPods.some((pod) => ['CrashLoopBackOff', 'ImagePullBackOff', 'ErrImagePull', 'InvalidImageName', 'CreateContainerConfigError'].includes(pod.waiting))
  const down = !dockerUp || !kubectl || !clusterExists || Boolean(liveError)
  const state = down ? 'down' : nodeBad || podBad || deployBad || jobBad || pvcBad ? 'bad' : podWarn || deployWarn || eventsView.length ? 'warn' : 'ok'
  const alert = down
    ? 'Cluster arrêté'
    : state === 'bad'
      ? 'Cluster dégradé'
      : state === 'warn'
        ? 'Attention'
        : 'Cluster sain'
  const reason = down
    ? liveError
    : state === 'bad'
      ? nodeBad
        ? 'un nœud n’est pas prêt ou subit une pression'
        : deployBad
          ? 'un deployment n’a aucune réplique disponible'
          : jobBad
            ? 'un job a échoué'
            : pvcBad
              ? 'un volume n’est pas lié'
              : crashBad
                ? 'un pod est bloqué au démarrage'
                : `${badPods.length} pod${badPods.length > 1 ? 's' : ''} au-delà du seuil de redémarrages`
      : state === 'warn'
        ? eventsView.length
          ? `${eventsView.length} cause${eventsView.length > 1 ? 's' : ''} de Warning`
          : 'des ressources ne sont pas disponibles'
        : 'tous les indicateurs sont au vert'
  const lastCached = await readJsonFile(K8S_LAST_PATH, null)
  let last = lastCached && typeof lastCached === 'object' ? lastCached : null
  if (!down && nodesResultOk(nodesView, liveError)) {
    last = { at: nowIso(), cluster: clusterContext(), context: context || clusterContext(), nodes: nodesView.length, pods: podsView.length }
    await writeAtomic(K8S_LAST_PATH, `${JSON.stringify(last, null, 2)}\n`).catch(() => {})
  }
  const lastDetail = last
    ? `${Number(last.nodes ?? 0)} nœud${Number(last.nodes ?? 0) > 1 ? 's' : ''} · ${Number(last.pods ?? 0)} pod${Number(last.pods ?? 0) > 1 ? 's' : ''}${last.at ? ` · ${ageLabel(ageMinutes(new Date(last.at).getTime()))}` : ''}`
    : '—'
  const checks = [
    {
      id: 'contexte',
      label: 'Contexte kubectl',
      value: context || '—',
      state: !context ? 'bad' : clusterContext() && context !== clusterContext() ? 'warn' : 'ok',
    },
    {
      id: 'docker',
      label: DARWIN ? 'Docker · colima' : 'Docker',
      value: dockerUp ? 'en marche' : colima ? 'arrêté (colima)' : 'arrêté',
      state: dockerUp ? 'ok' : 'bad',
    },
    {
      id: 'kubectl',
      label: 'kubectl · k9s',
      value: [kubectl ? 'kubectl' : '', k9s ? 'k9s' : ''].filter(Boolean).join(' · ') || 'absent',
      state: kubectl ? (k9s ? 'ok' : 'warn') : 'bad',
    },
    {
      id: 'kind',
      label: 'kind',
      value: kind ? 'installé' : 'absent',
      state: kind ? 'ok' : 'bad',
    },
    {
      id: 'kubectx',
      label: 'kubectx',
      value: kubectx ? 'installé' : 'absent',
      state: kubectx ? 'ok' : 'warn',
    },
  ]
  return {
    state,
    alert,
    detail: down
      ? lastDetail
      : `${counts.nodes.ready}/${counts.nodes.total} nœud${counts.nodes.total > 1 ? 's' : ''} · ${counts.pods.total} pods · ${counts.deployments.total} deployments`,
    reason,
    down,
    hidden: Boolean(!docker && !colima && !kind && !kubectl),
    context,
    checks,
    last,
    lastDetail,
    counts,
    capacity,
    signals,
    namespaces: namespaceNames,
    nodes: nodesView,
    pods: podsView,
    deployments: deploymentsView,
    statefulsets: statefulsetsView,
    daemonsets: daemonsetsView,
    jobs: jobsView,
    cronjobs: cronjobsView,
    pvcs: pvcsView,
    events: eventsView,
    targets: {
      deployments: deploymentsView.map((deployment) => deployment.target),
      pods: podsView.map((pod) => pod.target),
      jobs: jobsView.map((job) => job.target),
    },
  }
}

function nodesResultOk(nodesView, liveError) {
  return nodesView.length > 0 && !liveError
}

function parseDockerSize(value) {
  const match = String(value).match(/([\d.]+)\s*([kKmMgGtT]?B)/)
  if (!match) return 0
  const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 }
  return Math.round(Number(match[1]) * (units[match[2].toUpperCase()] ?? 1))
}

async function probeColimaDisk() {
  const colima = await tool('colima')
  if (!colima) return { available: false, reason: 'colima absent' }
  const probe = await run(colima, ['ssh', '--', 'df', '-kP', '/', '/var/lib/docker'], { timeout: 8000 })
  if (!probe.ok) {
    const status = await run(colima, ['status'], { timeout: 5000 })
    if (!status.ok) return { available: true, stopped: true }
    return { available: true, error: (probe.stderr || probe.error || '').slice(-200) }
  }
  const rows = []
  for (const line of probe.stdout.split('\n')) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 6 || !/^\d+$/.test(parts[1])) continue
    rows.push({
      mount: parts[5],
      total: Number(parts[1]) * 1024,
      used: Number(parts[2]) * 1024,
      free: Number(parts[3]) * 1024,
      percent: Number(String(parts[4]).replace('%', '')),
    })
  }
  return {
    available: true,
    root: rows.find((row) => row.mount === '/') ?? null,
    docker: rows.find((row) => row.mount === '/var/lib/docker') ?? null,
  }
}

async function dockerCategories() {
  const docker = await tool('docker')
  if (!docker) return { error: 'Docker arrêté', items: [] }
  const df = await run(docker, ['system', 'df', '--format', '{{json .}}'], { timeout: 15000 })
  if (!df.ok) return { error: `docker system df : ${(df.stderr || df.error || '').slice(-200)}`, items: [] }
  const labels = new Map([
    ['Images', 'Images'],
    ['Containers', 'Conteneurs'],
    ['Local Volumes', 'Volumes'],
    ['Build Cache', 'Cache de construction'],
  ])
  const items = []
  for (const line of df.stdout.split('\n').filter(Boolean)) {
    let row = null
    try {
      row = JSON.parse(line)
    } catch {
      continue
    }
    const label = labels.get(String(row?.Type ?? ''))
    if (!label) continue
    items.push({
      id: String(row.Type).toLowerCase().replace(/\s+/g, '-'),
      label,
      bytes: parseDockerSize(row.Size),
      reclaimable: parseDockerSize(row.Reclaimable),
      reclaimableLabel: String(row.Reclaimable ?? '—'),
    })
  }
  return { items }
}

async function collectDisk() {
  const items = []
  const [categories, colimaDisk] = await Promise.all([dockerCategories(), cachedSection('colima', probeColimaDisk)])
  let dockerBytes = 0
  let dockerDetail = categories.error === 'Docker arrêté' ? 'Docker arrêté' : categories.error
  for (const category of categories.items) {
    if (category.id === 'images' || category.id === 'build-cache') dockerBytes += category.reclaimable
  }
  if (!categories.error) dockerDetail = 'images et cache, sans volumes'
  items.push({ id: 'docker', label: 'Images et cache Docker', bytes: dockerBytes, detail: dockerDetail, state: 'ok' })
  const cache = await collectCache()
  items.push({ id: 'cache-dsh', label: 'Cache DSH', bytes: cache.bytes, detail: '~/.dsh/cache', state: 'ok' })
  let repoEntries = []
  try {
    repoEntries = await readdir(projectsRoot(), { withFileTypes: true })
  } catch {
    repoEntries = []
  }
  const nodeTargets = []
  const artifactTargets = []
  for (const entry of repoEntries) {
    if (!entry.isDirectory()) continue
    const dir = join(projectsRoot(), entry.name)
    if (!(await exists(join(dir, '.git')))) continue
    const last = await readLastCommit(dir)
    if (last && Date.now() - last < INACTIVE_DAYS * 86400000) continue
    for (const name of ['node_modules']) {
      const path = join(dir, name)
      if (!(await exists(path))) continue
      const bytes = await dirSize(path)
      if (bytes) nodeTargets.push({ repo: entry.name, path: name, bytes, label: formatBytes(bytes) })
    }
    for (const name of ['dist', 'build', '.next', 'target']) {
      const path = join(dir, name)
      if (!(await exists(path))) continue
      const bytes = await dirSize(path)
      if (bytes) artifactTargets.push({ repo: entry.name, path: name, bytes, label: formatBytes(bytes) })
    }
  }
  items.push({
    id: 'node_modules',
    label: 'node_modules inactifs',
    bytes: nodeTargets.reduce((sum, target) => sum + target.bytes, 0),
    detail: nodeTargets.length ? `${nodeTargets.length} dépôts · >${INACTIVE_DAYS} j` : 'aucun',
    targets: nodeTargets,
    state: 'ok',
  })
  items.push({
    id: 'artifacts',
    label: 'Artefacts de build inactifs',
    bytes: artifactTargets.reduce((sum, target) => sum + target.bytes, 0),
    detail: artifactTargets.length ? `${artifactTargets.length} dossiers · >${INACTIVE_DAYS} j` : 'aucun',
    targets: artifactTargets,
    state: 'ok',
  })
  return {
    items,
    total: items.reduce((sum, item) => sum + Number(item.bytes ?? 0), 0),
    checkedAt: nowIso(),
    categories: categories.items,
    categoriesError: categories.error ?? null,
    colima: colimaDisk,
  }
}

const SECTION_TTL = { machine: 15000, k8s: 20000, repos: 180000, dsh: 90000, journal: 30000, colima: 15000 }
const sections = new Map()

function cachedSection(key, task) {
  const ttl = SECTION_TTL[key] ?? 30000
  const current = sections.get(key) ?? {}
  if (current.value !== undefined && Date.now() - current.at < ttl) return Promise.resolve(current.value)
  if (current.pending) return current.pending
  const pending = task()
    .then((value) => {
      sections.set(key, { at: Date.now(), value })
      return value
    })
    .catch((error) => {
      sections.set(key, { at: current.at ?? 0, value: current.value })
      throw error
    })
  sections.set(key, { ...current, pending })
  return pending
}

async function buildState() {
  const config = await readSettings()
  const [machine, dsh, repos, k8s, journal] = await Promise.all([
    cachedSection('machine', () => collectMachine(config)),
    cachedSection('dsh', () => collectDsh()),
    cachedSection('repos', () => collectRepos(config)),
    cachedSection('k8s', () => collectK8s(config)),
    cachedSection('journal', () => readJournal()),
  ])
  return {
    at: nowIso(),
    config,
    machine,
    dsh,
    repos,
    k8s,
    journal: journal.slice(0, 5),
  }
}

const STATE_TTL_MS = 15000
let lastState = null
let lastBuildAt = 0
let pendingBuild = null

function buildOnce() {
  if (!pendingBuild) {
    pendingBuild = buildState()
      .then((state) => {
        lastState = state
        lastBuildAt = Date.now()
        return state
      })
      .finally(() => {
        pendingBuild = null
      })
  }
  return pendingBuild
}

async function stateForClient(force = false) {
  if (force) return { ...(await buildOnce()), stale: false }
  const age = Date.now() - lastBuildAt
  if (lastState && age < STATE_TTL_MS) return { ...lastState, stale: false }
  if (lastState) {
    buildOnce().catch(() => {})
    return { ...lastState, stale: true }
  }
  return { ...(await buildOnce()), stale: false }
}

async function isTracked(dir, path) {
  const result = await run('git', ['-C', dir, 'ls-files', '--', path], { timeout: 8000 })
  if (!result.ok) throw new HttpError(422, `git ls-files a échoué pour ${path}`)
  return result.stdout.trim().length > 0
}

async function clearDshCache() {
  const bytes = await dirSize(DSH_CACHE).catch(() => 0)
  await rm(DSH_CACHE, { recursive: true, force: true })
  await mkdir(DSH_CACHE, { recursive: true })
  return bytes
}

// Docker Desktop sous Linux tourne en service utilisateur : la sonde ne demande
// pas de mot de passe, contrairement au service système docker.service.
function validName(name) {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)
}

async function killProcess(pid) {
  const target = Number(pid)
  if (!Number.isInteger(target) || target <= 1) throw new HttpError(400, 'pid invalide')
  if (target === process.pid || target === process.ppid) throw new HttpError(400, 'processus protégé')
  const info = await run('/bin/ps', ['-p', String(target), '-o', 'comm='], { timeout: 5000 })
  if (!info.ok || !info.stdout.trim()) throw new HttpError(404, 'processus introuvable')
  const processName = basename(info.stdout.trim())
  if (!canKill(target, processName)) throw new HttpError(400, `${processName} est protégé`)
  try {
    process.kill(target, 'SIGTERM')
  } catch (error) {
    throw new HttpError(422, `SIGTERM impossible : ${error instanceof Error ? error.message : String(error)}`)
  }
  await sleep(5000)
  try {
    process.kill(target, 0)
    process.kill(target, 'SIGKILL')
    return { name: processName, forced: true }
  } catch {
    return { name: processName, forced: false }
  }
}

async function deleteDiskTargets(targets) {
  let freed = 0
  const removed = []
  for (const raw of targets.slice(0, 40)) {
    const repo = String(raw?.repo ?? '')
    const path = String(raw?.path ?? '')
    if (!repo || !path) continue
    if (!/^[A-Za-z0-9._-]+$/.test(repo)) throw new HttpError(422, `dépôt invalide : ${repo}`)
    if (!ALLOWED_ARTIFACTS.has(path)) throw new HttpError(422, `chemin non autorisé : ${path}`)
    const dir = join(projectsRoot(), repo)
    if (!(await exists(join(dir, '.git')))) throw new HttpError(422, `${repo} n'est pas un dépôt`)
    const targetPath = inside(dir, path)
    const last = await readLastCommit(dir)
    if (last && Date.now() - last < INACTIVE_DAYS * 86400000) throw new HttpError(422, `${repo} a un commit de moins de ${INACTIVE_DAYS} jours`)
    if (await isTracked(dir, path)) throw new HttpError(422, `${repo}/${path} contient des fichiers suivis`)
    const bytes = await dirSize(targetPath)
    await rm(targetPath, { recursive: true, force: true })
    freed += bytes
    removed.push(`${repo}/${path}`)
  }
  if (!removed.length) throw new HttpError(400, 'aucune cible valide')
  return { freed, removed }
}

async function performAction(body) {
  if (body.confirm !== true) throw new HttpError(400, 'confirmation requise')
  const famille = String(body.famille ?? '')
  const action = String(body.action ?? '')
  let cible = String(body.cible ?? '')
  let impact = ''
  let result = ''
  try {
    if (famille === 'processus' && action === 'kill') {
      const info = await killProcess(body.pid)
      cible = `${info.name} · PID ${Number(body.pid)}`
      impact = info.forced ? 'SIGTERM puis SIGKILL après 5 s' : 'SIGTERM, processus déjà arrêté'
      result = `${info.name} arrêté`
    } else if (famille === 'dsh' && action === 'cache') {
      const freed = await clearDshCache()
      cible = '~/.dsh/cache'
      impact = `${formatBytes(freed)} libérés`
      result = 'Cache DSH vidé'
    } else if (famille === 'disque' && action === 'cache-dsh') {
      const freed = await clearDshCache()
      cible = '~/.dsh/cache'
      impact = `${formatBytes(freed)} libérés`
      result = 'Cache DSH vidé'
    } else if (famille === 'disque' && action === 'docker') {
      const docker = await tool('docker')
      if (!docker) throw new HttpError(422, 'docker est introuvable')
      const before = await readDisk()
      const images = await run(docker, ['image', 'prune', '-a', '-f'], { timeout: 120000 })
      if (!images.ok) throw new HttpError(422, `docker image prune : ${(images.stderr || images.error || '').slice(-300)}`)
      await run(docker, ['builder', 'prune', '-f'], { timeout: 120000 })
      const after = await readDisk()
      const freed = Math.max(0, after.free - before.free)
      cible = 'images et cache Docker'
      impact = `${formatBytes(freed)} libérés`
      result = 'Images et cache purgés, volumes conservés'
    } else if (famille === 'disque' && (action === 'node_modules' || action === 'artifacts')) {
      const targets = Array.isArray(body.targets) ? body.targets : []
      const outcome = await deleteDiskTargets(targets)
      cible = outcome.removed.slice(0, 4).join(', ') + (outcome.removed.length > 4 ? '…' : '')
      impact = `${formatBytes(outcome.freed)} libérés`
      result = `${outcome.removed.length} cible(s) supprimée(s)`
    } else if (famille === 'k8s' && (action === 'restart' || action === 'delete' || action === 'purge')) {
      const namespace = String(body.namespace ?? '')
      const name = String(body.name ?? '')
      const kind = action === 'restart' ? 'deployment' : action === 'delete' ? 'pod' : 'job'
      if (!validName(namespace)) throw new HttpError(400, 'namespace invalide')
      if (!validName(name)) throw new HttpError(400, `nom de ${kind} invalide`)
      const kubectl = await tool('kubectl')
      if (!kubectl) throw new HttpError(422, 'kubectl est introuvable')
      const args = action === 'restart'
        ? ['rollout', 'restart', 'deployment', name, '-n', namespace]
        : ['delete', kind, name, '-n', namespace, '--wait=false']
      const outcome = await run(kubectl, args, { timeout: 30000 })
      if (!outcome.ok) throw new HttpError(422, `${action} ${kind} : ${(outcome.stderr || outcome.error || '').slice(-300)}`)
      cible = `${kind}/${namespace}/${name}`
      impact = action === 'restart'
        ? 'redémarrage progressif, service maintenu'
        : action === 'delete'
          ? 'pod supprimé, recréé par son deployment'
          : 'job terminé supprimé'
      result = action === 'restart' ? `${kind}/${name} redémarré` : `${kind}/${name} supprimé`
    } else {
      throw new HttpError(400, `action inconnue : ${famille}/${action}`)
    }
    const entry = { at: nowIso(), famille, action, cible, impact, result, ok: true }
    await appendJournal(entry)
    return entry
  } catch (error) {
    const entry = {
      at: nowIso(),
      famille,
      action,
      cible: cible || `${famille}/${action}`,
      impact: '',
      result: error instanceof Error ? error.message : 'échec',
      ok: false,
    }
    await appendJournal(entry).catch(() => {})
    throw error
  }
}

export function apply(ctx, config) {
  applyPluginConfig(config)
  ctx.effect(() => ctx.webServer.tapIndex((html) => (html.includes('</head>') ? html.replace('</head>', `${META}\n  </head>`) : html)))

  const handle = async (req, res) => {
    let url
    try {
      url = new URL(req.url ?? '/', 'http://localhost')
    } catch {
      return fail(res, 400, 'requête invalide')
    }
    const path = url.pathname
    if (!path.startsWith('/systeme/api/')) return
    if (!isTrustedRequest(req)) return fail(res, 403, 'origine non autorisée')
    const method = req.method ?? 'GET'

    try {
      if (path === '/systeme/api/etat' && method === 'GET') {
        return sendJson(res, 200, await stateForClient(url.searchParams.get('refresh') === '1'))
      }

      if (path === '/systeme/api/journal' && method === 'GET') {
        return sendJson(res, 200, { entries: await readJournal() })
      }

      if (path === '/systeme/api/journal' && method === 'POST') {
        const body = await readJson(req)
        const entry = {
          at: nowIso(),
          famille: String(body.famille ?? ''),
          action: String(body.action ?? ''),
          cible: String(body.cible ?? ''),
          impact: String(body.impact ?? ''),
          result: String(body.result ?? ''),
          ok: body.ok !== false,
        }
        await appendJournal(entry)
        return sendJson(res, 200, { entry })
      }

      if (path === '/systeme/api/reglages' && method === 'GET') {
        return sendJson(res, 200, { config: await readSettings() })
      }

      if (path === '/systeme/api/reglages' && method === 'POST') {
        const body = await readJson(req)
        const current = await readSettings()
        for (const key of Object.keys(DEFAULT_CONFIG)) {
          if (!body[key] || typeof body[key] !== 'object') continue
          for (const field of Object.keys(DEFAULT_CONFIG[key])) {
            const value = Number(body[key][field])
            if (Number.isFinite(value)) current[key][field] = value
          }
        }
        await writeAtomic(CONFIG_PATH, `${JSON.stringify(current, null, 2)}\n`)
        return sendJson(res, 200, { config: current })
      }

      if (path === '/systeme/api/disque' && method === 'GET') {
        return sendJson(res, 200, await collectDisk())
      }

      if (path === '/systeme/api/action' && method === 'POST') {
        const body = await readJson(req)
        return sendJson(res, 200, await performAction(body))
      }

      return fail(res, 404, 'route inconnue')
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500
      return fail(res, status, error instanceof Error ? error.message : 'erreur interne')
    }
  }

  ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: '/systeme/api', handler: handle }))
}
