import assert from 'node:assert/strict'
import test from 'node:test'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const sandbox = await mkdtemp(join(tmpdir(), 'dsh-monitor-config-'))
process.env.HOME = sandbox
process.env.USERPROFILE = sandbox

const { Config, apply } = await import('../lib/index.js')

function mount(config, events) {
  const routes = []
  apply(
    {
      effect: (task) => task(),
      on: events ? (name, listener) => events.on(name, listener) : undefined,
      webServer: {
        tapIndex: () => {},
        register: (options) => {
          routes.push(options)
        },
      },
    },
    config,
  )
  return routes[0].handler
}

function call(handler, url) {
  return new Promise((resolve) => {
    const req = new EventEmitter()
    req.method = 'GET'
    req.url = url
    req.headers = {}
    req.socket = { remoteAddress: '127.0.0.1' }
    const res = {
      statusCode: 0,
      payload: '',
      writeHead(status) {
        this.statusCode = status
      },
      end(chunk) {
        this.payload = String(chunk ?? '')
        resolve(this)
      },
    }
    handler(req, res)
    req.emit('end')
  })
}

async function state(config, events) {
  const handler = mount(config, events)
  const response = await call(handler, '/systeme/api/etat?refresh=1')
  assert.equal(response.statusCode, 200)
  return JSON.parse(response.payload)
}

async function reglages(config, events) {
  return (await state(config, events)).reglages
}

test('la page de réglages publie six champs volatils', () => {
  const schema = Config.toJSON()
  const text = JSON.stringify(schema)
  for (const key of ['projectsRoot', 'k8sContext', 'costLedger', 'refreshSeconds', 'showRepos', 'showK8s']) {
    assert.match(text, new RegExp(`"${key}"`))
  }
  assert.equal((text.match(/"volatile":true/g) ?? []).length, 6)
})

test('les cartes s’affichent par défaut et se masquent à l’interrupteur', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-monitor-repos-'))
  const visible = await state({ projectsRoot: root })
  assert.equal(visible.repos.hidden, false)
  assert.equal(visible.reglages.showRepos, true)
  assert.equal(visible.reglages.showK8s, true)
  const hidden = await state({ projectsRoot: root, showRepos: false, showK8s: false })
  assert.equal(hidden.repos.hidden, true)
  assert.equal(hidden.k8s.hidden, true)
  assert.equal(hidden.reglages.showRepos, false)
  assert.equal(hidden.reglages.showK8s, false)
})

test('la cadence par défaut est d’une minute', async () => {
  const values = await reglages({ projectsRoot: join(sandbox, 'projects'), k8sContext: 'kind-essai' })
  assert.equal(values.refreshSeconds, 60)
  assert.ok(values.costLedger.endsWith('/storages/cost-meter/ledger.json'))
  assert.equal(values.k8sContext, 'kind-essai')
  assert.equal(values.projectsRoot, join(sandbox, 'projects'))
})

test('la cadence est bornée entre 15 secondes et 15 minutes', async () => {
  assert.equal((await reglages({ refreshSeconds: 1 })).refreshSeconds, 15)
  assert.equal((await reglages({ refreshSeconds: 99999 })).refreshSeconds, 900)
  assert.equal((await reglages({ refreshSeconds: 120 })).refreshSeconds, 120)
})

test('le paquet livre la cadence dans son patch', async () => {
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  assert.match(patch, /refreshSeconds: 60/)
})

test('les valeurs volatiles sont lues à l’usage', async () => {
  const values = await reglages({
    projectsRoot: { get: () => join(sandbox, 'atelier') },
    refreshSeconds: { get: () => 240 },
  })
  assert.equal(values.refreshSeconds, 240)
  assert.equal(values.projectsRoot, join(sandbox, 'atelier'))
})

test('un changement volatil est repris au tour suivant', async () => {
  const events = new EventEmitter()
  let projects = join(sandbox, 'un')
  let refresh = 30
  const config = {
    projectsRoot: { get: () => projects },
    refreshSeconds: { get: () => refresh },
  }
  const handler = mount(config, events)
  const first = JSON.parse((await call(handler, '/systeme/api/etat?refresh=1')).payload).reglages
  assert.equal(first.refreshSeconds, 30)
  projects = join(sandbox, 'deux')
  refresh = 120
  events.emit('loader/volatile-update', [['refreshSeconds']])
  const second = JSON.parse((await call(handler, '/systeme/api/etat?refresh=1')).payload).reglages
  assert.equal(second.refreshSeconds, 120)
  assert.equal(second.projectsRoot, join(sandbox, 'deux'))
})
