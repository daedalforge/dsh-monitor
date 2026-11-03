import { execFile } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { appendFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { homedir, loadavg, cpus, totalmem } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { promisify } from 'node:util'
import Schema from '@deepseek-ai/schemastery'
import { buildK8sModel } from './k8s.js'

export const name = '@daedalforge/dsh-monitor'
export const inject = ['webServer']

const { version: VERSION } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

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

const REFRESH_MIN_SECONDS = 15
const REFRESH_MAX_SECONDS = 900
const DEFAULT_REFRESH_SECONDS = 60
const DEFAULT_COST_LEDGER = '~/.dsh/storages/cost-meter/ledger.json'

let runtimeConfig = {}

export const Config = Schema.object({
  projectsRoot: Schema.string()
    .default(DEFAULT_PROJECTS_ROOT)
    .description('Dossier des dépôts git à surveiller')
    .volatile(),
  k8sContext: Schema.string()
    .default('')
    .description('Contexte kubectl surveillé ; vide suit le contexte courant')
    .volatile(),
  costLedger: Schema.string()
    .default(DEFAULT_COST_LEDGER)
    .description('Journal JSON des coûts écrit par dsh-cost-meter ; vide masque le coût du jour')
    .volatile(),
  refreshSeconds: Schema.number()
    .default(DEFAULT_REFRESH_SECONDS)
    .description('Cadence de rafraîchissement du panneau, en secondes')
    .volatile(),
  showRepos: Schema.boolean()
    .default(true)
    .description('Afficher la carte Dépôts du panneau')
    .volatile(),
  showK8s: Schema.boolean()
    .default(true)
    .description('Afficher la carte Kubernetes du panneau')
    .volatile(),
}).description('Réglages du panneau Système')

function configValue(key) {
  const value = runtimeConfig?.[key]
  return value && typeof value === 'object' && typeof value.get === 'function' ? value.get() : value
}

function configText(key) {
  const value = configValue(key)
  return typeof value === 'string' ? value : ''
}

function projectsRoot() {
  return expand(configText('projectsRoot') || DEFAULT_PROJECTS_ROOT)
}

function costLedgerPath() {
  const raw = configValue('costLedger')
  if (raw === undefined || raw === null) return expand(DEFAULT_COST_LEDGER)
  const value = String(raw).trim()
  return value ? expand(value) : ''
}

function clusterContext() {
  return configText('k8sContext').trim()
}

function clampRefresh(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.min(REFRESH_MAX_SECONDS, Math.max(REFRESH_MIN_SECONDS, Math.round(n)))
}

function refreshSeconds() {
  return clampRefresh(configValue('refreshSeconds')) ?? DEFAULT_REFRESH_SECONDS
}

function configFlag(key) {
  const value = configValue(key)
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.trim().toLowerCase() !== 'false'
  return true
}

function setRuntimeConfig(raw) {
  runtimeConfig = raw && typeof raw === 'object' ? raw : {}
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

async function readLastCommit(dir) {
  const result = await run('git', ['-C', dir, 'log', '-1', '--format=%ct'], { timeout: 8000 })
  if (!result.ok || !result.stdout.trim()) return 0
  return Number(result.stdout.trim()) * 1000
}

function parseStatusV2(stdout) {
  const lines = String(stdout).split('\n')
  let oid = ''
  let branch = ''
  let upstream = ''
  let detached = false
  let ahead = 0
  let behind = 0
  let tracked = 0
  let untracked = 0
  let conflicts = 0
  let staged = 0
  let unstaged = 0
  const paths = []
  const files = []
  for (const line of lines) {
    if (!line) continue
    if (line.startsWith('# branch.oid ')) {
      oid = line.slice(14).trim()
      continue
    }
    if (line.startsWith('# branch.head ')) {
      const value = line.slice(14).trim()
      if (value === '(detached)') detached = true
      else branch = value
      continue
    }
    if (line.startsWith('# branch.upstream ')) {
      upstream = line.slice(18).trim()
      continue
    }
    if (line.startsWith('# branch.ab ')) {
      const match = line.match(/\+(\d+) -(\d+)/)
      if (match) {
        ahead = Number(match[1])
        behind = Number(match[2])
      }
      continue
    }
    const kind = line[0]
    const space = line[1]
    if (space !== ' ') continue
    if (kind === '1') {
      tracked += 1
      const xy = line.slice(2, 4)
      if (xy[0] !== '.') staged += 1
      if (xy[1] !== '.') unstaged += 1
      paths.push(line.split(' ').slice(8).join(' '))
      files.push({ path: paths[paths.length - 1], code: xy })
      continue
    }
    if (kind === '2') {
      tracked += 1
      const xy = line.slice(2, 4)
      if (xy[0] !== '.') staged += 1
      if (xy[1] !== '.') unstaged += 1
      const head = line.split('\t')[0]
      paths.push(head.split(' ').slice(9).join(' '))
      files.push({ path: paths[paths.length - 1], code: xy })
      continue
    }
    if (kind === 'u') {
      tracked += 1
      conflicts += 1
      staged += 1
      unstaged += 1
      paths.push(line.split(' ').slice(10).join(' '))
      files.push({ path: paths[paths.length - 1], code: 'UU' })
      continue
    }
    if (kind === '?') {
      untracked += 1
      paths.push(line.slice(2))
      files.push({ path: line.slice(2), code: '??' })
    }
  }
  return {
    ok: true,
    oid,
    branch: detached ? 'detached' : branch,
    detached,
    upstream,
    ahead,
    behind,
    dirty: tracked + untracked,
    tracked,
    untracked,
    conflicts,
    staged,
    unstaged,
    paths,
    files,
  }
}

async function collectGit(dir) {
  const result = await run('git', ['-C', dir, 'status', '--porcelain=v2', '--branch'], { timeout: 10000 })
  if (!result.ok) {
    return { ok: false, branch: '', detached: false, ahead: 0, behind: 0, dirty: 0, paths: [], error: result.stderr || result.error }
  }
  return parseStatusV2(result.stdout)
}

async function readLastDetail(dir) {
  const result = await run('git', ['-C', dir, 'log', '-1', '--format=%ct%x09%h%x09%s'], { timeout: 8000 })
  if (!result.ok || !result.stdout.trim()) return { at: 0, sha: '', subject: '' }
  const [ct = '0', sha = '', subject = ''] = result.stdout.trim().split('\t')
  return { at: Number(ct) * 1000, sha, subject }
}

function parseTrack(track) {
  return {
    gone: /\bgone\b/.test(track),
    ahead: Number((track.match(/ahead (\d+)/) ?? [])[1] ?? 0),
    behind: Number((track.match(/behind (\d+)/) ?? [])[1] ?? 0),
  }
}

async function readBranches(dir) {
  const result = await run('git', ['-C', dir, 'for-each-ref', '--format=%(refname:short)%09%(upstream:short)%09%(upstream:track)%09%(committerdate:unix)%09%(objectname:short)', 'refs/heads'], { timeout: 8000 })
  if (!result.ok) return { all: [], count: 0 }
  const all = result.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name = '', upstream = '', track = '', date = '0', sha = ''] = line.split('\t')
      const state = parseTrack(track)
      return { name, upstream, gone: state.gone, ahead: state.ahead, behind: state.behind, at: Number(date) * 1000, sha }
    })
  return { all, count: all.length }
}

async function readWorktrees(dir) {
  const result = await run('git', ['-C', dir, 'worktree', 'list', '--porcelain'], { timeout: 8000 })
  if (!result.ok) return []
  let resolved = dir
  try {
    resolved = realpathSync(dir)
  } catch {
    resolved = dir
  }
  return result.stdout
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const entry = { path: '', head: '', branch: '', detached: false, locked: false, prunable: false, bare: false, main: false }
      for (const line of block.split('\n')) {
        if (line.startsWith('worktree ')) entry.path = line.slice(9)
        else if (line.startsWith('HEAD ')) entry.head = line.slice(5)
        else if (line.startsWith('branch ')) entry.branch = line.slice(7).replace('refs/heads/', '')
        else if (line === 'detached') entry.detached = true
        else if (line === 'bare') entry.bare = true
        else if (line.startsWith('locked')) entry.locked = true
        else if (line.startsWith('prunable')) entry.prunable = true
      }
      entry.main = entry.path === resolved
      entry.label = entry.path.split('/').pop() ?? entry.path
      return entry
    })
}

async function readStashes(dir) {
  const result = await run('git', ['-C', dir, 'stash', 'list', '--format=%gd%x09%cr'], { timeout: 8000 })
  if (!result.ok) return { count: 0, items: [] }
  const items = result.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [ref = '', age = ''] = line.split('\t')
      return { ref, age }
    })
  return { count: items.length, items: items.slice(0, 5) }
}

async function readFetchHours(dir) {
  try {
    const info = await stat(join(dir, '.git', 'FETCH_HEAD'))
    return Math.max(0, Math.floor((Date.now() - info.mtimeMs) / 3600000))
  } catch {
    return null
  }
}

async function readActivity(dir) {
  const result = await run('git', ['-C', dir, 'rev-list', '--count', '--since=24.hours.ago', 'HEAD'], { timeout: 8000 })
  return result.ok ? Number(result.stdout.trim()) || 0 : 0
}

async function readDivergence(dir, branch) {
  if (!branch || branch === 'detached' || branch === 'main') return { ahead: 0, behind: 0 }
  if (branch === 'main-so') return { ahead: 0, behind: 0 }
  const result = await run('git', ['-C', dir, 'rev-list', '--left-right', '--count', `main...${branch}`], { timeout: 8000 })
  if (!result.ok) return { ahead: 0, behind: 0 }
  const [behind = 0, ahead = 0] = result.stdout.trim().split(/\s+/).map(Number)
  return { ahead: ahead || 0, behind: behind || 0 }
}

async function readOldestDirty(dir, paths) {
  let oldest = 0
  let oldestPath = ''
  for (const path of paths.slice(0, 20)) {
    const clean = path.split(' -> ').pop()
    try {
      const info = await stat(join(dir, clean))
      if (!oldest || info.mtimeMs < oldest) {
        oldest = info.mtimeMs
        oldestPath = clean
      }
    } catch {
      continue
    }
  }
  return { at: oldest, path: oldestPath }
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

function checksState(rollup) {
  const rows = Array.isArray(rollup) ? rollup : []
  const states = rows
    .map((row) => String(row?.conclusion ?? row?.state ?? '').toUpperCase())
    .filter(Boolean)
  if (!states.length) return 'none'
  if (states.some((state) => ['FAILURE', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE'].includes(state))) return 'failure'
  if (states.some((state) => !['SUCCESS', 'NEUTRAL', 'SKIPPED'].includes(state))) return 'pending'
  return 'success'
}

async function collectRepo(name, config, root = projectsRoot()) {
  const dir = join(root, name)
  let dotgit = null
  try {
    dotgit = await stat(join(dir, '.git'))
  } catch {
    return null
  }
  if (!dotgit.isDirectory()) return null
  const git = await collectGit(dir)
  if (!git.ok) return null
  const [last, branches, worktrees, stashes, fetchHours, commits24h, divergence, oldestDirty] = await Promise.all([
    readLastDetail(dir),
    readBranches(dir),
    readWorktrees(dir),
    readStashes(dir),
    readFetchHours(dir),
    readActivity(dir),
    readDivergence(dir, git.branch),
    git.dirty > 0 ? readOldestDirty(dir, git.paths) : Promise.resolve({ at: 0, path: '' }),
  ])
  const current = branches.all.find((branch) => branch.name === git.branch) ?? null
  const upstream = current?.upstream || git.upstream || ''
  const upstreamGone = Boolean(current?.gone)
  const upstreamMissing = !git.detached && git.branch !== '' && git.branch !== 'main' && !upstream
  const lastDays = last.at ? Math.max(0, Math.floor((Date.now() - last.at) / 86400000)) : 0
  const dirtyDays = oldestDirty.at ? Math.max(0, Math.floor((Date.now() - oldestDirty.at) / 86400000)) : 0
  const linked = worktrees.filter((worktree) => !worktree.main)
  const linkedStates = await mapLimit(linked, 4, async (worktree) => {
    const info = branches.all.find((branch) => branch.name === worktree.branch) ?? null
    const drift = await readDivergence(dir, worktree.branch)
    const lastWt = await readLastDetail(worktree.path)
    return {
      ...worktree,
      upstream: info?.upstream ?? '',
      gone: Boolean(info?.gone),
      commits24h: await readActivity(worktree.path),
      lastAt: lastWt.at,
      lastSha: lastWt.sha,
      lastSubject: lastWt.subject,
      upstreamMissing: Boolean(worktree.branch && worktree.branch !== 'main' && !info?.upstream && !worktree.detached),
      aheadMain: drift.ahead,
      behindMain: drift.behind,
    }
  })
  const bad = git.behind >= 10 || (git.dirty > 0 && upstreamMissing)
  const warn = git.dirty > 0 || git.behind > 0 || git.ahead > 0 || (upstreamMissing && /^(feat|fix)\//.test(git.branch)) || upstreamGone || git.detached || linked.length >= 2
  const state = bad ? 'bad' : warn ? 'warn' : 'ok'
  const item = {
    name,
    path: dir,
    branch: git.detached ? 'detached' : git.branch || '—',
    detached: git.detached,
    dirty: git.dirty,
    tracked: git.tracked,
    untracked: git.untracked,
    conflicts: git.conflicts,
    staged: git.staged,
    unstaged: git.unstaged,
    dirtyFiles: git.files,
    oldestDirtyDays: dirtyDays,
    oldestDirtyPath: oldestDirty.path,
    ahead: git.ahead,
    behind: git.behind,
    upstream,
    upstreamGone,
    upstreamMissing,
    aheadMain: divergence.ahead,
    behindMain: divergence.behind,
    last: last.at ? `${lastDays} j` : '—',
    lastDays,
    lastAt: last.at,
    lastSha: last.sha,
    lastSubject: last.subject,
    sync: git.ahead > 0 ? `${git.ahead} ahead` : git.behind > 0 ? `${git.behind} behind` : 'à jour',
    worktrees: linkedStates.map((worktree) => ({ path: worktree.path, label: worktree.label, branch: worktree.branch, detached: worktree.detached, locked: worktree.locked, prunable: worktree.prunable, upstream: worktree.upstream, gone: worktree.gone, upstreamMissing: worktree.upstreamMissing, aheadMain: worktree.aheadMain, behindMain: worktree.behindMain, commits24h: worktree.commits24h, lastAt: worktree.lastAt, lastSha: worktree.lastSha, lastSubject: worktree.lastSubject })),
    worktreeCount: linked.length,
    stashCount: stashes.count,
    stashItems: stashes.items,
    branchCount: branches.count,
    branches: branches.all.filter((branch) => branch.name !== git.branch).map((branch) => branch.name).slice(0, 12),
    dirtyPaths: git.paths.slice(0, 12),
    goneCount: branches.all.filter((branch) => branch.gone).length,
    fetchHours,
    commits24h,
    state,
    sev: state,
  }
  return { item, branches: branches.all.filter((branch) => branch.name !== git.branch).map((branch) => branch.name) }
}

async function collectRepos(config, root = projectsRoot()) {
  let entries = []
  try {
    entries = await readdir(root, { withFileTypes: true })
  } catch {
    return { state: 'bad', alert: `${root} introuvable`, detail: '', items: [], total: 0, hidden: true, causes: [] }
  }
  const names = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort()
  const collected = await mapLimit(names, 6, (name) => collectRepo(name, config, root))
  const items = []
  const branches = []
  const worktrees = []
  for (const result of collected) {
    if (!result) continue
    items.push(result.item)
    for (const branch of result.branches) branches.push({ repo: result.item.name, branch })
    for (const worktree of result.item.worktrees) worktrees.push({ repo: result.item.name, ...worktree })
  }
  items.sort((a, b) => {
    const rank = stateRank(b.state) - stateRank(a.state)
    if (rank !== 0) return rank
    return a.name.localeCompare(b.name)
  })
  const dirtyItems = items.filter((item) => item.dirty > 0)
  const dirtyCount = dirtyItems.length
  const dirtyFiles = dirtyItems.reduce((sum, item) => sum + item.dirty, 0)
  const untrackedCount = dirtyItems.reduce((sum, item) => sum + item.untracked, 0)
  const behindCount = items.filter((item) => item.behind > 0).length
  const aheadCount = items.filter((item) => item.ahead > 0).length
  const worktreeCount = worktrees.length
  const oldestDirtyDays = items.reduce((max, item) => Math.max(max, item.oldestDirtyDays), 0)
  const commits24h = items.reduce((sum, item) => sum + item.commits24h, 0)
  const fetchStaleCount = items.filter((item) => item.fetchHours === null || item.fetchHours > 24).length
  const state = items.reduce((acc, item) => worstState([acc, item.state]), 'ok')
  return {
    state,
    alert: dirtyCount ? `${dirtyCount} sales` : 'ok',
    detail: `${items.length} dépôts · ${dirtyCount} sales · ${behindCount} en retard`,
    total: items.length,
    dirtyCount,
    dirtyFiles,
    untrackedCount,
    behindCount,
    aheadCount,
    worktreeCount,
    branchCount: items.reduce((sum, item) => sum + item.branchCount, 0),
    commits24h,
    fetchStaleCount,
    attentionCount: items.filter((item) => item.state !== 'ok').length,
    oldestDirtyDays,
    items,
    branches: branches.slice(0, 8),
    branchCountAll: branches.length,
    worktrees,
    prAvailable: false,
    prCount: 0,
    prFailCount: 0,
    causes: [],
  }
}

async function collectPrs(repos, ghPath = undefined) {
  const gh = ghPath === undefined ? await tool('gh') : ghPath
  if (!gh) return { available: false, at: nowIso(), map: {} }
  const seen = new Set()
  const candidates = []
  for (const item of repos.items) {
    const branches = [item.branch, ...(item.worktrees ?? []).map((worktree) => worktree.branch)]
    for (const branch of branches) {
      if (!branch || branch === 'main' || branch === 'master' || branch === 'detached') continue
      const key = `${item.name}::${branch}`
      if (seen.has(key)) continue
      seen.add(key)
      candidates.push({ name: item.name, path: item.path, branch })
    }
  }
  const map = {}
  await mapLimit(candidates, 4, async (candidate) => {
    const result = await run(gh, ['pr', 'list', '--head', candidate.branch, '--state', 'open', '--json', 'number,title,isDraft,reviewDecision,statusCheckRollup,url', '--limit', '1'], { timeout: 8000, cwd: candidate.path })
    if (!result.ok) return
    let rows = []
    try {
      rows = JSON.parse(result.stdout)
    } catch {
      return
    }
    const pr = Array.isArray(rows) ? rows[0] : null
    if (!pr) return
    map[`${candidate.name}::${candidate.branch}`] = {
      number: pr.number,
      title: pr.title ?? '',
      isDraft: Boolean(pr.isDraft),
      reviewDecision: pr.reviewDecision ?? '',
      checks: checksState(pr.statusCheckRollup),
      url: pr.url ?? '',
    }
  })
  return { available: true, at: nowIso(), map }
}

function plural(count, word) {
  return `${count} ${word}${count > 1 ? 's' : ''}`
}

function fetchLabel(hours) {
  if (hours === null || hours === undefined) return 'aucun fetch enregistré'
  if (hours < 1) return 'moins d’une heure'
  if (hours < 48) return `${hours} h`
  return `${Math.floor(hours / 24)} j`
}

function missionId(branch) {
  const match = String(branch).match(/(?:soc|so|slv|poc|df|bdo)-\d+/i)
  return match ? match[0].toUpperCase() : ''
}

function buildCauses(items) {
  const causes = []
  const behindItems = items.filter((item) => item.behind > 0).sort((a, b) => b.behind - a.behind)
  if (behindItems.length) {
    const top = behindItems[0]
    const others = behindItems.slice(1)
    const fetchText = top.fetchHours === null ? 'aucun fetch enregistré' : `dernier fetch il y a ${fetchLabel(top.fetchHours)}`
    const dirtyText = top.dirty > 0 && top.oldestDirtyPath
      ? ` Le fichier ${top.oldestDirtyPath} est modifié depuis ${top.oldestDirtyDays} j et retient le fast-forward.`
      : ''
    causes.push({
      id: 'behind',
      tone: 'bad',
      icon: 'down',
      title: `${top.name} a ${plural(top.behind, 'commit')} de retard`,
      desc: `Le clone suit ${top.upstream || 'origin/main'} ; ${fetchText}.${dirtyText}`,
      evidence: `git rev-list --left-right --count @{u}...HEAD → ${top.behind} 0`,
      scope: `${top.name} · clone principal${others.length ? ` · aussi ${others.map((item) => item.name).join(', ')}` : ''}`,
      repo: top.name,
    })
  }
  const dirtyItems = items.filter((item) => item.dirty > 0)
  if (dirtyItems.length) {
    const files = dirtyItems.reduce((sum, item) => sum + item.dirty, 0)
    const tracked = dirtyItems.reduce((sum, item) => sum + item.tracked, 0)
    const untracked = dirtyItems.reduce((sum, item) => sum + item.untracked, 0)
    const top = dirtyItems.slice().sort((a, b) => b.dirty - a.dirty)[0]
    const counts = new Map()
    for (const item of dirtyItems) {
      for (const path of item.dirtyPaths ?? []) counts.set(path, (counts.get(path) ?? 0) + 1)
    }
    const artifact = [...counts.entries()].filter(([, count]) => count >= 3).sort((a, b) => b[1] - a[1])[0]
    let artifactText = ''
    if (artifact) {
      const [path, count] = artifact
      const ages = dirtyItems.filter((item) => (item.dirtyPaths ?? []).includes(path)).map((item) => item.oldestDirtyDays)
      artifactText = ` Le même chemin (${path}) est modifié dans ${count} dépôts${ages.length ? `, jusqu’à ${Math.max(...ages)} j` : ''} : artefact local probable, pas du travail de mission.`
    }
    causes.push({
      id: 'dirty',
      tone: 'warn',
      icon: 'file',
      title: `${plural(dirtyItems.length, 'dépôt')} ${dirtyItems.length > 1 ? 'portent' : 'porte'} ${plural(files, 'fichier')} non commité${files > 1 ? 's' : ''}`,
      desc: `${tracked} suivi${tracked > 1 ? 's' : ''}, ${untracked} non suivi${untracked > 1 ? 's' : ''}. ${top.name} en porte ${top.dirty}${top.oldestDirtyDays ? ` depuis ${top.oldestDirtyDays} j` : ''}.${artifactText}`,
      evidence: `git status --porcelain=v2 --branch | wc -l → ${files} lignes sur ${dirtyItems.length} dépôts`,
      scope: `${dirtyItems.slice(0, 4).map((item) => item.name).join(', ')}${dirtyItems.length > 4 ? ` +${dirtyItems.length - 4}` : ''}`,
      repo: top.name,
    })
  }
  const pushed = []
  for (const item of items) {
    if (item.upstreamMissing && !item.detached && /^(feat|fix)\//.test(item.branch)) {
      pushed.push({ repo: item.name, branch: item.branch, ahead: item.aheadMain, files: item.dirty })
    }
    for (const worktree of item.worktrees ?? []) {
      if (worktree.upstreamMissing && /^(feat|fix)\//.test(worktree.branch)) {
        pushed.push({ repo: item.name, branch: worktree.branch, ahead: worktree.aheadMain, files: 0 })
      }
    }
  }
  const failing = []
  for (const item of items) {
    for (const pr of item.prs ?? []) {
      if (pr.checks === 'failure' && !failing.some((entry) => entry.pr.number === pr.number)) failing.push({ repo: item.name, pr })
    }
  }
  const rest = pushed.length + failing.length
  if (rest) {
    const details = pushed
      .slice()
      .sort((a, b) => b.ahead - a.ahead)
      .slice(0, 3)
      .map((entry) => {
        const ahead = entry.ahead > 0 ? `, ${plural(entry.ahead, 'commit')} d’avance sur main` : ''
        const files = entry.files > 0 ? `, ${plural(entry.files, 'fichier')} non commité${entry.files > 1 ? 's' : ''}` : ''
        return `${missionId(entry.branch) || entry.branch} (${entry.repo}) : aucun upstream${ahead}${files}`
      })
    for (const entry of failing.slice(0, 2)) details.push(`${entry.repo} : PR #${entry.pr.number} en échec`)
    const title = pushed.length
      ? `${rest === 1 ? 'Une mission laisse' : `${plural(rest, 'mission')} laissent`} un reste`
      : `${plural(failing.length, 'PR de mission')} en échec`
    const evidence = [
      pushed.length ? `git for-each-ref --format='%(refname:short) %(upstream:track)' → ${pushed.length} sans upstream` : '',
      failing.length ? `gh pr checks ${failing.map((entry) => entry.pr.number).join(' ')} → échec` : '',
    ].filter(Boolean).join(' · ')
    causes.push({
      id: 'push',
      tone: 'warn',
      icon: 'git',
      title,
      desc: `${details.join('. ')}.`,
      evidence,
      scope: [...pushed.map((entry) => entry.repo), ...failing.map((entry) => entry.repo)].filter((name, index, list) => list.indexOf(name) === index).slice(0, 4).join(', '),
      repo: pushed[0]?.repo ?? failing[0]?.repo ?? '',
    })
  }
  return causes
}

function finalizeRepos(repos, prs) {
  if (!repos || repos.hidden) return repos
  const map = prs?.map ?? {}
  const items = repos.items.map((item) => {
    const pr = map[`${item.name}::${item.branch}`] ?? null
    const worktrees = (item.worktrees ?? []).map((worktree) => ({ ...worktree, pr: map[`${item.name}::${worktree.branch}`] ?? null }))
    const all = [pr, ...worktrees.map((worktree) => worktree.pr)].filter(Boolean)
    const failure = all.some((entry) => entry.checks === 'failure')
    const state = failure && item.state === 'ok' ? 'warn' : item.state
    return { ...item, pr, worktrees, prs: all, state, sev: state }
  })
  items.sort((a, b) => {
    const rank = stateRank(b.state) - stateRank(a.state)
    if (rank !== 0) return rank
    return a.name.localeCompare(b.name)
  })
  const numbers = new Set()
  const failed = new Set()
  for (const item of items) {
    for (const pr of item.prs ?? []) {
      numbers.add(pr.number)
      if (pr.checks === 'failure') failed.add(pr.number)
    }
  }
  const prCount = numbers.size
  const prFailCount = failed.size
  return {
    ...repos,
    items,
    prAvailable: Boolean(prs?.available),
    prCount,
    prFailCount,
    attentionCount: items.filter((item) => item.state !== 'ok').length,
    causes: buildCauses(items),
  }
}

async function collectDepot(rawName, root = projectsRoot()) {
  const name = String(rawName ?? '').trim()
  if (!name || name.includes('/') || name.includes('\\') || name === '.' || name === '..' || name.startsWith('.')) throw new HttpError(400, 'dépôt invalide')
  const dir = join(root, name)
  try {
    const info = await stat(join(dir, '.git'))
    if (!info.isDirectory()) throw new Error('pas un dépôt principal')
  } catch {
    throw new HttpError(404, `${name} n’est pas un dépôt`)
  }
  const [log, status, stashes] = await Promise.all([
    run('git', ['-C', dir, 'log', '-4', '--format=%h%x09%ct%x09%s'], { timeout: 8000 }),
    run('git', ['-C', dir, 'status', '--porcelain=v2', '--branch'], { timeout: 8000 }),
    readStashes(dir),
  ])
  const commits = log.ok
    ? log.stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha = '', at = '0', subject = ''] = line.split('\t')
        return { sha, at: Number(at) * 1000, subject }
      })
    : []
  return { name, path: dir, commits, status: status.ok ? status.stdout.slice(0, 12000) : '', stashes, at: nowIso() }
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

function parseColima(stdout) {
  try {
    const parsed = JSON.parse(String(stdout).trim() || 'null')
    const entry = Array.isArray(parsed) ? parsed.find((item) => item?.name === 'default') ?? parsed[0] : parsed
    if (!entry || typeof entry !== 'object') return null
    return {
      name: String(entry.name ?? 'default'),
      running: String(entry.status ?? '').toLowerCase() === 'running',
      cpus: Number(entry.cpus ?? 0),
      memory: Number(entry.memory ?? 0),
      disk: Number(entry.disk ?? 0),
    }
  } catch {
    return null
  }
}

const K8S_COLLECTIONS = [
  ['nodes', ['get', 'nodes', '-o', 'json']],
  ['pods', ['get', 'pods', '-o', 'json', '--all-namespaces']],
  ['deployments', ['get', 'deployments', '-o', 'json', '--all-namespaces']],
  ['statefulsets', ['get', 'statefulsets', '-o', 'json', '--all-namespaces']],
  ['daemonsets', ['get', 'daemonsets', '-o', 'json', '--all-namespaces']],
  ['jobs', ['get', 'jobs', '-o', 'json', '--all-namespaces']],
  ['cronjobs', ['get', 'cronjobs', '-o', 'json', '--all-namespaces']],
  ['namespaces', ['get', 'namespaces', '-o', 'json']],
  ['pvcs', ['get', 'pvc', '-o', 'json', '--all-namespaces']],
  ['events', ['get', 'events', '-o', 'json', '--all-namespaces', '--sort-by=.lastTimestamp']],
  ['services', ['get', 'services', '-o', 'json', '--all-namespaces']],
  ['ingresses', ['get', 'ingresses', '-o', 'json', '--all-namespaces']],
  ['externalSecrets', ['get', 'externalsecrets', '-o', 'json', '--all-namespaces']],
]

async function collectK8s(config) {
  const [docker, colima, kind, kubectl, k9s, kubectx] = await Promise.all([
    tool('docker'),
    tool('colima'),
    tool('kind'),
    tool('kubectl'),
    tool('k9s'),
    tool('kubectx'),
  ])
  const [dockerInfo, contextResult, contextsResult, colimaList] = await Promise.all([
    docker ? run(docker, ['info'], { timeout: 6000 }) : Promise.resolve({ ok: false, stdout: '', stderr: '', error: '' }),
    kubectl ? run(kubectl, ['config', 'current-context'], { timeout: 6000 }) : Promise.resolve({ ok: false, stdout: '' }),
    kubectl ? run(kubectl, ['config', 'get-contexts', '-o', 'name'], { timeout: 6000 }) : Promise.resolve({ ok: false, stdout: '' }),
    colima ? run(colima, ['list', '-j'], { timeout: 6000 }) : Promise.resolve({ ok: false, stdout: '' }),
  ])
  const dockerUp = Boolean(docker) && dockerInfo.ok
  const context = contextResult.ok ? contextResult.stdout.trim() : ''
  const contexts = contextsResult.ok ? contextsResult.stdout.split('\n').map((line) => line.trim()).filter(Boolean) : []
  const watched = clusterContext() || context
  const expectedCluster = watched.startsWith('kind-') ? watched.slice(5) : ''
  let clusterExists = true
  if (dockerUp && kind && expectedCluster) {
    const list = await run(kind, ['get', 'clusters'], { timeout: 10000 })
    if (list.ok) clusterExists = list.stdout.split('\n').map((line) => line.trim()).includes(expectedCluster)
  }
  let liveError = ''
  if (!dockerUp) liveError = colima ? "Docker n'est pas démarré (colima)" : "Docker n'est pas démarré"
  else if (!kubectl) liveError = 'kubectl absent'
  else if (!clusterExists) liveError = `le cluster kind-${expectedCluster} n'existe pas`
  const live = dockerUp && Boolean(kubectl) && clusterExists
  const raw = {}
  for (const [key] of K8S_COLLECTIONS) raw[key] = []
  if (live) {
    const results = await Promise.all(K8S_COLLECTIONS.map(([, args]) => kubectlGet(args)))
    K8S_COLLECTIONS.forEach(([key], index) => {
      const result = results[index]
      if (!result.ok) {
        if (!liveError) liveError = result.error
        return
      }
      const items = result.data?.items ?? []
      raw[key] = key === 'events' ? items.slice(-400) : items
    })
  }
  const failingSecrets = (raw.externalSecrets ?? []).some((item) => (item?.status?.conditions ?? []).some((condition) => String(condition?.status ?? '') !== 'True'))
  if (live && kubectl && failingSecrets) {
    const logs = await run(kubectl, ['-n', 'external-secrets', 'logs', 'deploy/external-secrets', '--since=60m', '--tail=300'], { timeout: 8000 })
    if (logs.ok) {
      const codes = [...String(logs.stdout).matchAll(/AADSTS\d+/g)].map((match) => match[0])
      const errors = String(logs.stdout).split('\n').filter((line) => line.includes('"level":"error"'))
      raw.secretsLog = codes.length
        ? { code: codes[0], occurrences: codes.length, message: errors.at(-1)?.slice(0, 240) ?? '' }
        : errors.length ? { code: '', occurrences: errors.length, message: errors.at(-1).slice(0, 240) } : null
    }
  }
  const previous = await readJsonFile(K8S_LAST_PATH, null)
  const last = previous && typeof previous === 'object' ? previous : null
  const now = Date.now()
  const model = buildK8sModel({
    raw,
    config,
    now,
    last,
    env: {
      down: !live || Boolean(liveError && !raw.nodes.length),
      liveError,
      context,
      contexts,
      watched: clusterContext(),
      dockerUp,
      darwin: DARWIN,
      colima: Boolean(colima),
      colimaInfo: colimaList.ok ? parseColima(colimaList.stdout) : null,
      kind: Boolean(kind),
      kubectl: Boolean(kubectl),
      k9s: Boolean(k9s),
      kubectx: Boolean(kubectx),
      hidden: Boolean(!docker && !colima && !kind && !kubectl),
    },
  })
  if (!model.down && raw.nodes.length) {
    await writeAtomic(K8S_LAST_PATH, `${JSON.stringify({ at: nowIso(), cluster: clusterContext(), context: context || clusterContext(), nodes: model.nodes.length, pods: model.pods.length }, null, 2)}\n`).catch(() => {})
  }
  return model
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

const SECTION_TTL = { machine: 15000, k8s: 20000, repos: 180000, prs: 60000, dsh: 90000, journal: 30000, colima: 15000 }
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
  const [machine, dsh, reposRaw, k8s, journal] = await Promise.all([
    cachedSection('machine', () => collectMachine(config)),
    cachedSection('dsh', () => collectDsh()),
    cachedSection('repos', () => collectRepos(config)),
    cachedSection('k8s', () => collectK8s(config)),
    cachedSection('journal', () => readJournal()),
  ])
  const prs = reposRaw?.hidden ? { available: false, map: {} } : await cachedSection('prs', () => collectPrs(reposRaw))
  const repos = finalizeRepos(reposRaw, prs)
  return {
    at: nowIso(),
    version: VERSION,
    config,
    reglages: {
      projectsRoot: expand(configText('projectsRoot') || DEFAULT_PROJECTS_ROOT),
      k8sContext: configValue('k8sContext'),
      costLedger: costLedgerPath(),
      refreshSeconds: refreshSeconds(),
      showRepos: configFlag('showRepos'),
      showK8s: configFlag('showK8s'),
    },
    machine,
    dsh,
    repos: { ...repos, hidden: Boolean(repos?.hidden) || !configFlag('showRepos') },
    k8s: { ...k8s, hidden: Boolean(k8s?.hidden) || !configFlag('showK8s') },
    journal: journal.slice(0, 5),
  }
}

const STATE_TTL_MS = 15000
let lastState = null
let lastBuildAt = 0
let pendingBuild = null

function invalidateState() {
  sections.clear()
  lastState = null
  lastBuildAt = 0
}

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
  setRuntimeConfig(config)
  if (typeof ctx.on === 'function') {
    ctx.on('loader/volatile-update', () => invalidateState())
    ctx.on('config', (next) => {
      if (next && typeof next === 'object' && !Array.isArray(next)) setRuntimeConfig(next.config ?? next)
      invalidateState()
    })
  }
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

      if (path === '/systeme/api/depot' && method === 'GET') {
        return sendJson(res, 200, await collectDepot(url.searchParams.get('name')))
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

export const __internals = {
  collectGit,
  collectRepo,
  collectRepos,
  collectPrs,
  finalizeRepos,
  buildCauses,
  parseStatusV2,
  readWorktrees,
  readBranches,
  readStashes,
  readFetchHours,
  readActivity,
  readDivergence,
  collectDepot,
}
