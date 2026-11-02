import { execFile } from 'node:child_process'
import { appendFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { homedir, loadavg, cpus, totalmem } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { promisify } from 'node:util'

export const name = 'dsh-monitor'
export const inject = ['webServer']

const execFileAsync = promisify(execFile)
const HOME = homedir()
const KONOHA = join(HOME, 'konoha')
const MISSIONS_DIR = join(KONOHA, 'missions')
const PROJECTS = join(HOME, 'projects')
const DEVSPACE = join(PROJECTS, 'devspace-saasoffice')
const SESSIONS_DIR = join(HOME, '.dsh', 'sessions')
const LOGS_DIR = join(HOME, '.dsh', 'logs')
const COST_LEDGER = join(HOME, '.dsh', 'storages', 'cost-meter', 'ledger.json')
const DSH_CACHE = join(HOME, '.dsh', 'cache')
const STATE_DIR = join(HOME, '.dsh', 'storages', 'dsh-monitor')
const CONFIG_PATH = join(STATE_DIR, 'config.json')
const JOURNAL_PATH = join(STATE_DIR, 'journal.jsonl')
const K8S_LAST_PATH = join(STATE_DIR, 'k8s-last.json')
const NAMESPACE = 'cowork'
const EXPECTED_CONTEXT = 'kind-devspace'
const MAX_BODY = 256 * 1024
const MAX_AGE_SESSION = 15
const INACTIVE_DAYS = 30
const ALLOWED_ARTIFACTS = new Set(['node_modules', 'dist', 'build', '.next', 'target'])
const REFRESHABLE_STATUSES = new Set(['draft', 'ready', 'active', 'awaiting_validation', 'abandoned', 'done'])
const STATUS_RANK = { active: 0, awaiting_validation: 1, ready: 2, draft: 3, done: 4, abandoned: 5 }

const DEFAULT_CONFIG = {
  disk: { attention: 20, alerte: 10 },
  memoire: { attention: 80, alerte: 90 },
  charge: { coefAttention: 1, coefAlerte: 2 },
  batterie: { attention: 20, alerte: 10 },
  depots: { attentionJours: 3, alerteJours: 7 },
  pods: { attentionRedemarrages: 2, alerteRedemarrages: 5 },
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

async function runShell(script, options = {}) {
  return run('/bin/zsh', ['-lc', script], options)
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

function parseMission(text) {
  const match = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/)
  const meta = {}
  if (!match) return meta
  for (const line of match[1].split(/\r?\n/)) {
    const found = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (!found) continue
    let value = found[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    meta[found[1]] = value
  }
  return meta
}

function missionTitle(text, fallback) {
  const match = String(text).match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : fallback
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

async function readMemory() {
  const total = totalmem()
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
  const result = await run('/usr/sbin/sysctl', ['-n', 'vm.swapusage'])
  const text = result.ok ? result.stdout : ''
  const toBytes = (match) => (match ? Math.round(Number(match[1]) * (match[2] === 'G' ? 1024 ** 3 : 1024 ** 2)) : 0)
  return {
    total: toBytes(text.match(/total = ([\d.]+)([MG])/)),
    used: toBytes(text.match(/used = ([\d.]+)([MG])/)),
  }
}

async function readBattery() {
  const result = await run('/usr/bin/pmset', ['-g', 'batt'])
  if (!result.ok || !/InternalBattery|Battery/i.test(result.stdout)) return null
  const percent = Number((result.stdout.match(/(\d+)%/) ?? [])[1] ?? 0)
  const charging = !/discharging/i.test(result.stdout) && /charging|charged|AC Power/i.test(result.stdout)
  return { percent, charging }
}

async function readCpu() {
  const result = await run('/usr/bin/top', ['-l', '1', '-n', '0'], { timeout: 10000 })
  const match = result.ok ? result.stdout.match(/CPU usage:\s*([\d.]+)% user,\s*([\d.]+)% sys,\s*([\d.]+)% idle/) : null
  if (!match) return 0
  return Math.round((100 - Number(match[3])) * 10) / 10
}

function canKill(pid, name) {
  if (!Number.isInteger(pid) || pid <= 1) return false
  if (pid === process.pid || pid === process.ppid) return false
  const base = String(name || '').toLowerCase()
  if (PROTECTED.has(base)) return false
  return !/deepseek harness|windowserver|launchd|kernel_task|electron|colima|qemu-system|docker|containerd|kubelet|kind/.test(base)
}

async function readProcesses(limit = 6) {
  const result = await run('/bin/ps', ['-Ao', 'pid=,pcpu=,rss=,comm=', '-r'])
  if (!result.ok) return []
  const rows = []
  for (const line of result.stdout.split('\n')) {
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

async function collectMachine(config) {
  const cores = Math.max(1, cpus().length)
  const load = loadavg()
  const [disk, swap, battery, cpu, processes, memory] = await Promise.all([
    readDisk(),
    readSwap(),
    readBattery(),
    readCpu(),
    readProcesses(5),
    readMemory(),
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
  const rows = [
    { id: 'cpu', label: 'Processeur', value: `${cpu} %`, percent: cpu, state: 'ok', detail: `${cores} cœurs` },
    { id: 'memoire', label: 'Mémoire', value: `${memoryPct} %`, percent: memoryPct, state: memState, detail: `${formatBytes(memory.used)} / ${formatBytes(total)} · actif ${formatBytes(memory.active + memory.wired)}, compressé ${formatBytes(memory.compressed)}` },
    { id: 'disque', label: 'Disque libre', value: `${disk.freePct.toFixed(1).replace('.', ',')} %`, percent: disk.freePct, state: diskState, detail: `${formatBytes(disk.free)} / ${formatBytes(disk.total)}` },
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
    load: { one: load[0], five: load[1], fifteen: load[2], ratio: loadRatio },
    swap,
    battery,
    rows,
    top: processes,
  }
}

async function collectCost() {
  const ledger = await readJsonFile(COST_LEDGER, {})
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

async function scanMissions() {
  let entries = []
  try {
    entries = await readdir(MISSIONS_DIR, { withFileTypes: true })
  } catch {
    return []
  }
  const missions = []
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^SLV-\d+$/.test(entry.name)) continue
    const dir = join(MISSIONS_DIR, entry.name)
    const missionText = await readFile(join(dir, 'mission.md'), 'utf8').catch(() => '')
    const journal = await readFile(join(dir, 'journal.md'), 'utf8').catch(() => null)
    const meta = parseMission(missionText)
    missions.push({
      id: entry.name,
      title: missionTitle(missionText, entry.name),
      meta,
      hasMission: missionText.length > 0,
      hasJournal: journal !== null,
      hasNextAction: journal ? /prochaine action/i.test(journal) : false,
    })
  }
  return missions
}

function missionStatus(mission) {
  return String(mission.meta?.status ?? '').trim()
}

function missionIsOpen(mission) {
  const status = missionStatus(mission)
  return status !== '' && status !== 'done' && status !== 'abandoned'
}

async function collectKonoha() {
  const missions = await scanMissions()
  const open = missions.filter(missionIsOpen)
  const awaiting = missions.filter((mission) => missionStatus(mission) === 'awaiting_validation')
  const queued = missions.filter((mission) => {
    const queue = String(mission.meta?.queue ?? '').trim()
    return queue !== '' && queue !== '[]'
  })
  const missingJournal = missions.filter((mission) => !mission.hasJournal).length
  const missingNext = open.filter((mission) => !mission.hasNextAction).length
  const missingMission = missions.filter((mission) => !mission.hasMission).length
  const invalidStatus = missions.filter((mission) => !REFRESHABLE_STATUSES.has(missionStatus(mission))).length
  const idMismatch = missions.filter((mission) => String(mission.meta?.id ?? '').trim() !== '' && String(mission.meta?.id ?? '').trim() !== mission.id).length
  const anomalies = missingJournal + missingNext + missingMission + invalidStatus + idMismatch
  const sorted = open.slice().sort((a, b) => {
    const rankA = STATUS_RANK[missionStatus(a)] ?? 9
    const rankB = STATUS_RANK[missionStatus(b)] ?? 9
    if (rankA !== rankB) return rankA - rankB
    return b.id.localeCompare(a.id)
  })
  const next = sorted[0] ?? null
  const queueReadable = await exists(join(KONOHA, 'workflows', 'queue.md'))
  const git = await collectGit(KONOHA)
  const checks = [
    { id: 'journal', label: 'Fiches sans journal', value: String(missingJournal), state: missingJournal ? 'bad' : 'ok' },
    { id: 'action', label: 'Missions sans prochaine action', value: String(missingNext), state: missingNext ? 'warn' : 'ok' },
    { id: 'file', label: 'File de SLV-76 lisible', value: queueReadable ? 'Oui · non implémentée' : 'Non', state: queueReadable ? 'ok' : 'warn' },
  ]
  const state = anomalies > 0 ? 'warn' : 'ok'
  return {
    state,
    alert: anomalies > 0 ? `${anomalies} anomalies` : 'ok',
    detail: `${missions.length} missions · ${open.length} ouvertes`,
    note: anomalies > 0 ? `${anomalies} anomalies · corriger la fiche concernée` : 'Workspace cohérent',
    git: {
      branch: git.branch || '—',
      dirty: git.dirty,
      ahead: git.ahead,
      behind: git.behind,
      state: git.ok && (git.dirty > 0 || git.behind > 0) ? 'warn' : git.ok ? 'ok' : 'bad',
      detail: `${git.dirty} modifié(s)`,
    },
    missions: {
      total: missions.length,
      open: open.length,
      awaiting: awaiting.length,
      done: missions.filter((mission) => missionStatus(mission) === 'done').length,
      queued: queued.length,
      anomalies,
    },
    items: sorted.slice(0, 2).map((mission) => ({
      id: mission.id,
      title: mission.title,
      status: missionStatus(mission),
      queue: String(mission.meta?.queue ?? '').trim(),
      nextAction: mission.hasNextAction,
    })),
    next: next
      ? { id: next.id, title: next.title, status: missionStatus(next), queue: String(next.meta?.queue ?? '').trim() }
      : null,
    queue: { readable: queueReadable, count: queued.length, source: 'SLV-76' },
    checks,
  }
}

async function readLastCommit(dir) {
  const result = await run('git', ['-C', dir, 'log', '-1', '--format=%ct'], { timeout: 8000 })
  if (!result.ok || !result.stdout.trim()) return 0
  return Number(result.stdout.trim()) * 1000
}

async function readMissionBranches(dir) {
  const result = await run('git', ['-C', dir, 'for-each-ref', '--format=%(refname:short)', 'refs/heads'], { timeout: 8000 })
  if (!result.ok) return []
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((branch) => /^SLV-\d+/.test(branch))
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
  const dir = join(PROJECTS, name)
  if (!(await exists(join(dir, '.git')))) return null
  const git = await collectGit(dir)
  if (!git.ok) return null
  const [lastCommit, branches, oldestDirty] = await Promise.all([
    readLastCommit(dir),
    readMissionBranches(dir),
    git.dirty > 0 ? readOldestDirty(dir, git.paths) : 0,
  ])
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
    entries = await readdir(PROJECTS, { withFileTypes: true })
  } catch {
    return { state: 'bad', alert: '~/projects absent', detail: '', items: [], total: 0 }
  }
  const names = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
  const collected = await mapLimit(names, 6, (name) => collectRepo(name, config))
  const items = []
  const missionBranches = []
  for (const result of collected) {
    if (!result) continue
    items.push(result.item)
    for (const branch of result.branches) missionBranches.push({ repo: result.item.name, branch })
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
    missionBranches: missionBranches.slice(0, 8),
    missionBranchCount: missionBranches.length,
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

async function readDevspaceVersion() {
  const binary = await tool('devspace')
  if (!binary) return ''
  const result = await run(binary, ['version'], { timeout: 8000 })
  const match = result.stdout.match(/(\d+\.\d+\.\d+)/)
  return match ? match[1] : ''
}

async function collectK8s(config) {
  const [docker, colima, kind, kubectl, k9s, kubectx, yq, curl] = await Promise.all([
    tool('docker'),
    tool('colima'),
    tool('kind'),
    tool('kubectl'),
    tool('k9s'),
    tool('kubectx'),
    tool('yq'),
    tool('curl'),
  ])
  const [dockerInfo, contextResult] = await Promise.all([
    docker ? run(docker, ['info'], { timeout: 6000 }) : Promise.resolve({ ok: false, stdout: '', stderr: '', error: '' }),
    kubectl ? run(kubectl, ['config', 'current-context'], { timeout: 6000 }) : Promise.resolve({ ok: false, stdout: '' }),
  ])
  const dockerUp = Boolean(docker) && dockerInfo.ok
  const context = contextResult.ok ? contextResult.stdout.trim() : ''
  let clusterExists = false
  if (dockerUp && kind) {
    const list = await run(kind, ['get', 'clusters'], { timeout: 10000 })
    if (list.ok) clusterExists = list.stdout.split('\n').map((line) => line.trim()).includes('devspace')
  }
  let liveError = ''
  if (!dockerUp) liveError = colima ? "Docker n'est pas démarré (colima)" : "Docker n'est pas démarré"
  else if (!kubectl) liveError = 'kubectl absent'
  else if (!clusterExists) liveError = "le cluster kind-devspace n'existe pas"
  let nodes = []
  let pods = []
  let deployments = []
  let jobs = []
  let events = []
  if (dockerUp && kubectl && clusterExists) {
    const [nodesResult, podsResult, deploymentsResult, jobsResult, eventsResult] = await Promise.all([
      kubectlGet(['get', 'nodes', '-o', 'json']),
      kubectlGet(['get', 'pods', '-o', 'json', '-n', NAMESPACE]),
      kubectlGet(['get', 'deployments', '-o', 'json', '-n', NAMESPACE]),
      kubectlGet(['get', 'jobs', '-o', 'json', '-n', NAMESPACE]),
      kubectlGet(['get', 'events', '-o', 'json', '-n', NAMESPACE, '--sort-by=.lastTimestamp']),
    ])
    if (nodesResult.ok) nodes = nodesResult.data?.items ?? []
    else liveError = nodesResult.error
    if (podsResult.ok) pods = podsResult.data?.items ?? []
    if (deploymentsResult.ok) deployments = deploymentsResult.data?.items ?? []
    if (jobsResult.ok) jobs = jobsResult.data?.items ?? []
    if (eventsResult.ok) events = (eventsResult.data?.items ?? []).slice(-8)
  }
  const nodesView = nodes.map((node) => ({
    name: node?.metadata?.name ?? '?',
    ready: nodeReady(node),
  }))
  const podsView = pods.map((pod) => {
    const restarts = podRestarts(pod)
    const waiting = podWaiting(pod)
    const phase = String(pod?.status?.phase ?? '')
    const start = pod?.status?.startTime ? new Date(pod.status.startTime).getTime() : 0
    const age = start ? Math.max(0, Math.floor((Date.now() - start) / 60000)) : 0
    let state = 'ok'
    if (['CrashLoopBackOff', 'ImagePullBackOff', 'ErrImagePull', 'Error'].includes(waiting)) state = 'bad'
    else if (restarts >= config.pods.alerteRedemarrages) state = 'bad'
    else if (restarts >= config.pods.attentionRedemarrages || (phase === 'Pending' && age > 5) || waiting) state = 'warn'
    return {
      name: pod?.metadata?.name ?? '?',
      phase,
      restarts,
      waiting,
      age,
      state,
      target: { namespace: NAMESPACE, kind: 'pod', name: pod?.metadata?.name ?? '' },
    }
  })
  const deploymentsView = deployments.map((deployment) => {
    const desired = Number(deployment?.spec?.replicas ?? 0)
    const available = Number(deployment?.status?.availableReplicas ?? 0)
    return {
      name: deployment?.metadata?.name ?? '?',
      desired,
      available,
      state: available < desired ? 'warn' : 'ok',
      target: { namespace: NAMESPACE, kind: 'deployment', name: deployment?.metadata?.name ?? '' },
    }
  })
  const jobsView = jobs.map((job) => {
    const succeeded = Number(job?.status?.succeeded ?? 0)
    const failed = Number(job?.status?.failed ?? 0)
    return {
      name: job?.metadata?.name ?? '?',
      succeeded,
      failed,
      state: failed > 0 ? 'warn' : 'ok',
      target: { namespace: NAMESPACE, kind: 'job', name: job?.metadata?.name ?? '' },
    }
  })
  const eventsView = events.map((event) => ({
    type: String(event?.type ?? ''),
    reason: String(event?.reason ?? ''),
    message: String(event?.message ?? '').slice(0, 240),
    at: String(event?.lastTimestamp ?? event?.eventTime ?? ''),
  }))
  const warnings = eventsView.filter((event) => event.type === 'Warning')
  const nodeBad = nodesView.some((node) => !node.ready)
  const podBad = podsView.some((pod) => pod.state === 'bad')
  const podWarn = podsView.some((pod) => pod.state === 'warn')
  const deployWarn = deploymentsView.some((deployment) => deployment.state === 'warn')
  const jobWarn = jobsView.some((job) => job.state === 'warn')
  const down = !dockerUp || !kubectl || !clusterExists || Boolean(liveError)
  const state = down ? 'down' : nodeBad || podBad ? 'bad' : podWarn || deployWarn || jobWarn || warnings.length ? 'warn' : 'ok'
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
        ? 'un nœud n’est pas prêt'
        : 'un pod redémarre trop souvent'
      : state === 'warn'
        ? 'des ressources ne sont pas disponibles'
        : 'tous les indicateurs sont au vert'
  const lastCached = await readJsonFile(K8S_LAST_PATH, null)
  let last = lastCached && typeof lastCached === 'object' ? lastCached : null
  if (!down && nodesResultOk(nodesView, liveError)) {
    last = { at: nowIso(), cluster: EXPECTED_CONTEXT, context: context || EXPECTED_CONTEXT, nodes: nodesView.length, pods: podsView.length }
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
      state: context === EXPECTED_CONTEXT ? 'ok' : context ? 'warn' : 'bad',
    },
    {
      id: 'docker',
      label: 'Docker · colima',
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
  const devspace = {
    repo: DEVSPACE,
    exists: await exists(DEVSPACE),
    version: await readDevspaceVersion(),
    cluster: EXPECTED_CONTEXT,
    canStart: Boolean(kind && yq && curl && (docker || colima)),
    startHint: 'colima start, puis relance des conteneurs kind (création si absent)',
  }
  return {
    state,
    alert,
    detail: down ? lastDetail : `${nodesView.length} nœud${nodesView.length > 1 ? 's' : ''} · ${podsView.length} pod${podsView.length > 1 ? 's' : ''}`,
    reason,
    down,
    context,
    checks,
    last,
    lastDetail,
    devspace,
    nodes: nodesView,
    pods: podsView,
    deployments: deploymentsView,
    jobs: jobsView,
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

async function collectDisk() {
  const items = []
  const docker = await tool('docker')
  let dockerBytes = 0
  let dockerDetail = 'Docker arrêté'
  if (docker) {
    const info = await run(docker, ['info'], { timeout: 5000 })
    if (info.ok) {
      const df = await run(docker, ['system', 'df', '--format', '{{json .}}'], { timeout: 15000 })
      if (df.ok) {
        for (const line of df.stdout.split('\n').filter(Boolean)) {
          try {
            const row = JSON.parse(line)
            dockerBytes += parseDockerSize(row.Reclaimable ?? row.Size ?? '0')
          } catch {
            continue
          }
        }
        dockerDetail = 'images et cache, sans volumes'
      }
    }
  }
  items.push({ id: 'docker', label: 'Images et cache Docker', bytes: dockerBytes, detail: dockerDetail, state: 'ok' })
  const cache = await collectCache()
  items.push({ id: 'cache-dsh', label: 'Cache DSH', bytes: cache.bytes, detail: '~/.dsh/cache', state: 'ok' })
  let repoEntries = []
  try {
    repoEntries = await readdir(PROJECTS, { withFileTypes: true })
  } catch {
    repoEntries = []
  }
  const nodeTargets = []
  const artifactTargets = []
  for (const entry of repoEntries) {
    if (!entry.isDirectory()) continue
    const dir = join(PROJECTS, entry.name)
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
  }
}

const SECTION_TTL = { machine: 15000, k8s: 20000, repos: 180000, konoha: 90000, dsh: 90000, journal: 30000 }
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
  const [machine, dsh, konoha, repos, k8s, journal] = await Promise.all([
    cachedSection('machine', () => collectMachine(config)),
    cachedSection('dsh', () => collectDsh()),
    cachedSection('konoha', () => collectKonoha()),
    cachedSection('repos', () => collectRepos(config)),
    cachedSection('k8s', () => collectK8s(config)),
    cachedSection('journal', () => readJournal()),
  ])
  return {
    at: nowIso(),
    config,
    machine,
    dsh,
    konoha,
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

async function startDocker() {
  const colima = await tool('colima')
  if (colima) {
    const started = await run(colima, ['start'], { timeout: 180000 })
    if (!started.ok) throw new HttpError(422, `colima start : ${(started.stderr || started.error || '').slice(-400)}`)
  } else {
    const opened = await run('/usr/bin/open', ['-a', 'Docker'], { timeout: 15000 })
    if (!opened.ok) throw new HttpError(422, 'Docker Desktop est introuvable et colima n’est pas installé')
  }
  const docker = await tool('docker')
  if (!docker) throw new HttpError(422, 'docker est introuvable')
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const info = await run(docker, ['info'], { timeout: 6000 })
    if (info.ok) return
    await sleep(3000)
  }
  throw new HttpError(422, 'Docker ne répond pas après 90 s')
}

async function waitForNodes() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = await kubectlGet(['get', 'nodes', '-o', 'json'], 6000)
    if (result.ok) {
      const nodes = result.data?.items ?? []
      if (nodes.length > 0 && nodes.every((node) => nodeReady(node))) return nodes.length
    }
    await sleep(3000)
  }
  throw new HttpError(422, 'les nœuds kind ne sont pas prêts')
}

async function startKindContainers() {
  const docker = await tool('docker')
  if (!docker) return
  const listed = await run(docker, ['ps', '-a', '--filter', 'label=io.x-k8s.kind.cluster=devspace', '--format', '{{.Names}}\t{{.State}}'], { timeout: 15000 })
  if (!listed.ok) return
  for (const line of listed.stdout.split('\n')) {
    const [name, state] = line.split('\t')
    if (name && state && state.trim() !== 'running') {
      await run(docker, ['start', name.trim()], { timeout: 60000 })
    }
  }
}

async function startCluster() {
  await startDocker()
  const kind = await tool('kind')
  if (!kind) throw new HttpError(422, 'kind est introuvable')
  const existing = await run(kind, ['get', 'clusters'], { timeout: 10000 })
  const clusters = existing.ok ? existing.stdout.split('\n').map((line) => line.trim()) : []
  if (!clusters.includes('devspace')) {
    const yq = await tool('yq')
    const curl = await tool('curl')
    if (!yq || !curl) throw new HttpError(422, 'yq et curl sont requis pour créer le cluster')
    if (!(await exists(join(DEVSPACE, 'common', 'devspace.yaml')))) throw new HttpError(422, 'common/devspace.yaml est introuvable')
    const version = await run(yq, ['-r', '.vars.K8S_VERSION.value', 'common/devspace.yaml'], { cwd: DEVSPACE, timeout: 10000 })
    const k8sVersion = version.ok ? version.stdout.trim() : ''
    if (!k8sVersion) throw new HttpError(422, 'K8S_VERSION est illisible')
    const script = `set -e
export K8S_VERSION="${k8sVersion}"
curl -fsL https://raw.githubusercontent.com/kubernetes/ingress-nginx/refs/tags/helm-chart-4.12.3/build/kind.yaml | yq -r '(.nodes[0].kubeadmConfigPatches[0]|from_yaml) as $pa | $pa.nodeRegistration.kubeletExtraArgs as $kua | .nodes[0].kubeadmConfigPatches |= [$pa|.apiVersion|= "kubeadm.k8s.io/v1beta3"|to_yaml, ($pa|.apiVersion|= "kubeadm.k8s.io/v1beta4"|.nodeRegistration.kubeletExtraArgs|=($kua|to_entries|(.[].key | key) = "name"))|to_yaml]|.networking |={"apiServerPort":6443} | .nodes[0].extraPortMappings += [{"containerPort":30006,"hostPort":3306,"protocol":"TCP"},{"containerPort":30432,"hostPort":5432,"protocol":"TCP"}]' | kind create cluster --image kindest/node:\${K8S_VERSION} -n devspace --config=-`
    const created = await runShell(script, { cwd: DEVSPACE, timeout: 240000 })
    if (!created.ok) throw new HttpError(422, `kind create cluster : ${(created.stderr || created.error || '').slice(-600)}`)
  }
  await startKindContainers()
  return waitForNodes()
}

async function stopCluster() {
  const colima = await tool('colima')
  if (colima) {
    const stopped = await run(colima, ['stop'], { timeout: 120000 })
    if (!stopped.ok) throw new HttpError(422, `colima stop : ${(stopped.stderr || stopped.error || '').slice(-400)}`)
    return
  }
  const quit = await run('/usr/bin/osascript', ['-e', 'tell application "Docker" to quit'], { timeout: 30000 })
  if (!quit.ok) throw new HttpError(422, 'Docker Desktop est introuvable et colima n’est pas installé')
}

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
    const dir = join(PROJECTS, repo)
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
    } else if (famille === 'k8s' && action === 'restart') {
      const name = String(body.name ?? '')
      if (!validName(name)) throw new HttpError(400, 'nom de deployment invalide')
      const kubectl = await tool('kubectl')
      if (!kubectl) throw new HttpError(422, 'kubectl est introuvable')
      const restarted = await run(kubectl, ['rollout', 'restart', 'deployment', name, '-n', NAMESPACE], { timeout: 30000 })
      if (!restarted.ok) throw new HttpError(422, `rollout restart : ${(restarted.stderr || restarted.error || '').slice(-300)}`)
      cible = `deployment/${name}`
      impact = 'redémarrage progressif, service maintenu'
      result = `deployment/${name} redémarré`
    } else if (famille === 'k8s' && action === 'delete') {
      const name = String(body.name ?? '')
      if (!validName(name)) throw new HttpError(400, 'nom de pod invalide')
      const kubectl = await tool('kubectl')
      if (!kubectl) throw new HttpError(422, 'kubectl est introuvable')
      const deleted = await run(kubectl, ['delete', 'pod', name, '-n', NAMESPACE, '--wait=false'], { timeout: 30000 })
      if (!deleted.ok) throw new HttpError(422, `delete pod : ${(deleted.stderr || deleted.error || '').slice(-300)}`)
      cible = `pod/${name}`
      impact = 'pod supprimé, recréé par son deployment'
      result = `pod/${name} supprimé`
    } else if (famille === 'k8s' && action === 'purge') {
      const name = String(body.name ?? '')
      if (!validName(name)) throw new HttpError(400, 'nom de job invalide')
      const kubectl = await tool('kubectl')
      if (!kubectl) throw new HttpError(422, 'kubectl est introuvable')
      const deleted = await run(kubectl, ['delete', 'job', name, '-n', NAMESPACE, '--wait=false'], { timeout: 30000 })
      if (!deleted.ok) throw new HttpError(422, `delete job : ${(deleted.stderr || deleted.error || '').slice(-300)}`)
      cible = `job/${name}`
      impact = 'job terminé supprimé'
      result = `job/${name} supprimé`
    } else if (famille === 'devspace' && action === 'start') {
      const nodes = await startCluster()
      cible = EXPECTED_CONTEXT
      impact = 'Docker + cluster kind, aucun déploiement devspace'
      result = `${nodes} nœud${nodes > 1 ? 's' : ''} prêt${nodes > 1 ? 's' : ''}`
    } else if (famille === 'devspace' && action === 'stop') {
      await stopCluster()
      cible = EXPECTED_CONTEXT
      impact = 'Docker arrêté, cluster kind conservé'
      result = 'Cluster arrêté, kind conservé'
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

export function apply(ctx) {
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
