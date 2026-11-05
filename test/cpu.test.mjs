import assert from 'node:assert/strict'
import test from 'node:test'
import { EventEmitter } from 'node:events'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const sandbox = await mkdtemp(join(tmpdir(), 'dsh-monitor-cpu-'))
process.env.HOME = sandbox
process.env.USERPROFILE = sandbox

const STATE_DIR = join(sandbox, '.dsh', 'storages', 'dsh-monitor')
const HISTORY = join(STATE_DIR, 'cpu.jsonl')

let instances = 0

async function fresh() {
  instances += 1
  return import(`../lib/index.js?cpu=${instances}`)
}

async function seed(samples) {
  await mkdir(STATE_DIR, { recursive: true })
  await writeFile(HISTORY, samples.map((sample) => `${JSON.stringify(sample)}\n`).join(''), 'utf8')
}

async function readLines() {
  const text = await readFile(HISTORY, 'utf8').catch(() => '')
  return text.split('\n').filter(Boolean).map((line) => JSON.parse(line))
}

function mount(apply, config = {}) {
  const routes = []
  apply({
    effect: (task) => task(),
    webServer: {
      tapIndex: () => {},
      register: (options) => {
        routes.push(options)
      },
    },
  }, config)
  return routes[0].handler
}

function call(handler, options) {
  const { method = 'GET', url, headers = {}, body = null, remote = '127.0.0.1' } = options
  return new Promise((resolve) => {
    const req = new EventEmitter()
    req.method = method
    req.url = url
    req.headers = headers
    req.socket = { remoteAddress: remote }
    const res = {
      statusCode: 0,
      headers: {},
      payload: '',
      writeHead(status, responseHeaders) {
        this.statusCode = status
        this.headers = responseHeaders
      },
      end(chunk) {
        this.payload = String(chunk ?? '')
        resolve(this)
      },
    }
    handler(req, res)
    if (body !== null) req.emit('data', Buffer.from(JSON.stringify(body)))
    req.emit('end')
  })
}

const json = (response) => JSON.parse(response.payload)

test('parseCpuSample écarte les lignes illisibles et borne la valeur', async () => {
  const { __internals } = await fresh()
  assert.deepEqual(__internals.parseCpuSample('{"at":"2026-11-05T07:00:00.000Z","cpu":12.34}'), {
    at: Date.parse('2026-11-05T07:00:00.000Z'),
    cpu: 12.3,
  })
  assert.deepEqual(__internals.parseCpuSample('{"at":"2026-11-05T07:00:00.000Z","cpu":140}'), {
    at: Date.parse('2026-11-05T07:00:00.000Z'),
    cpu: 100,
  })
  assert.equal(__internals.parseCpuSample('pas du json'), null)
  assert.equal(__internals.parseCpuSample('{"at":"hier","cpu":12}'), null)
  assert.equal(__internals.parseCpuSample('{"at":"2026-11-05T07:00:00.000Z","cpu":"beaucoup"}'), null)
})

test('recordCpuSample écrit une ligne horodatée et garde le fichier dans la rétention', async () => {
  await seed([])
  const { __internals } = await fresh()
  const at = Date.parse('2026-11-05T07:00:00.000Z')
  const sample = await __internals.recordCpuSample(12.34, at)
  assert.deepEqual(sample, { at, cpu: 12.3 })
  assert.deepEqual(await readLines(), [{ at: '2026-11-05T07:00:00.000Z', cpu: 12.3 }])

  const old = [
    { at: new Date(at - 25 * 3600000).toISOString(), cpu: 10 },
    { at: new Date(at - 24 * 3600000 - 60000).toISOString(), cpu: 11 },
  ]
  await seed(old)
  const reloaded = await fresh()
  await reloaded.__internals.loadCpuHistory(at)
  assert.deepEqual(await readLines(), [], 'au chargement, les lignes hors rétention quittent le fichier')

  const sliding = await fresh()
  for (let index = 0; index < 60; index += 1) {
    await sliding.__internals.recordCpuSample(20, at - (60 - index) * 60000)
  }
  const kept = await readLines()
  assert.equal(kept.length, 60, 'l’élagage réécrit le fichier au soixantième échantillon')
  assert.ok(kept.every((line) => Date.parse(line.at) >= at - 24 * 3600000), 'aucune ligne plus vieille que la rétention')
})

test('loadCpuHistory relit le fichier, trie et jette les lignes périmées', async () => {
  const now = Date.parse('2026-11-05T08:00:00.000Z')
  await seed([
    { at: new Date(now - 2 * 60000).toISOString(), cpu: 42 },
    { at: new Date(now - 27 * 3600000).toISOString(), cpu: 50 },
    { at: new Date(now - 60000).toISOString(), cpu: 43 },
    { at: 'pas une date', cpu: 12 },
  ])
  const { __internals } = await fresh()
  const samples = await __internals.loadCpuHistory(now)
  assert.deepEqual(samples.map((sample) => sample.cpu), [42, 43])
  assert.equal((await readLines()).length, 2, 'les lignes périmées quittent le fichier au chargement')
})

test('cpuSeries agrège par pas, borne la fenêtre et résume', async () => {
  const now = Date.now()
  const samples = []
  for (let index = 0; index < 90; index += 1) {
    samples.push({ at: new Date(now - 5 * 60000 - (89 - index) * 60000).toISOString(), cpu: index % 10 })
  }
  await seed(samples)
  const { __internals } = await fresh()
  await __internals.loadCpuHistory()

  const hour = __internals.cpuSeries('1h')
  assert.equal(hour.window, '1h')
  assert.equal(hour.step, 30000)
  assert.equal(hour.cadence, 60)
  assert.equal(hour.retention, 24)
  assert.match(hour.file, /cpu\.jsonl$/)
  assert.ok(hour.points.length >= 50 && hour.points.length <= 60, `points de l’heure : ${hour.points.length}`)
  assert.ok(hour.summary.samples >= 50 && hour.summary.samples <= 60, `mesures de l’heure : ${hour.summary.samples}`)
  assert.equal(hour.summary.min, 0)
  assert.equal(hour.summary.max, 9)
  assert.equal(hour.summary.current, 9)
  assert.ok(hour.points.every((point) => point.count === 1 && point.max >= point.cpu))

  const day = __internals.cpuSeries('24h')
  assert.equal(day.step, 720000)
  assert.ok(day.points.length < hour.points.length, 'sur 24 h les mesures se serrent dans moins de points')

  const fallback = __internals.cpuSeries('n’importe quoi')
  assert.equal(fallback.window, '1h')
})

test('la route /systeme/api/cpu rend la fenêtre demandée', async () => {
  const now = Date.now()
  await seed([{ at: new Date(now - 120000).toISOString(), cpu: 33.3 }])
  const { apply } = await fresh()
  const handler = mount(apply)

  const response = await call(handler, { url: '/systeme/api/cpu?fenetre=6h' })
  assert.equal(response.statusCode, 200)
  const body = json(response)
  assert.equal(body.window, '6h')
  assert.equal(body.points.length, 1)
  assert.equal(body.points[0].cpu, 33.3)
  assert.equal(body.total, 1)

  const defaut = await call(handler, { url: '/systeme/api/cpu' })
  assert.equal(json(defaut).window, '1h')

  const inconnue = await call(handler, { url: '/systeme/api/cpu?fenetre=7j' })
  assert.equal(json(inconnue).window, '1h')

  const distante = await call(handler, { url: '/systeme/api/cpu', remote: '10.0.0.7' })
  assert.equal(distante.statusCode, 403, 'la route reste réservée à l’hôte')
})
