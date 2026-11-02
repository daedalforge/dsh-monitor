import assert from 'node:assert/strict'
import test from 'node:test'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const sandbox = await mkdtemp(join(tmpdir(), 'dsh-monitor-test-'))
process.env.HOME = sandbox
process.env.USERPROFILE = sandbox

const { apply, inject, name } = await import('../lib/index.js')

function mount(config = {}) {
  const routes = []
  const indexes = []
  apply({
    effect: (task) => task(),
    webServer: {
      tapIndex: (task) => {
        indexes.push(task)
      },
      register: (options) => {
        routes.push(options)
      },
    },
  }, config)
  return { handler: routes[0].handler, route: routes[0], indexes }
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

test('the package and the patch agree on the plugin name', async () => {
  assert.equal(name, '@daedalforge/dsh-monitor')
  assert.deepEqual(inject, ['webServer'])
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  assert.match(patch, /name: '@daedalforge\/dsh-monitor'/)
  for (const key of ['projectsRoot', 'k8sContext', 'clusterName', 'costLedger']) {
    assert.match(patch, new RegExp(`${key}:`))
  }
})

test('apply registers the api prefix and injects the client metadata', () => {
  const { route, indexes } = mount({})
  assert.equal(route.kind, 'prefix')
  assert.equal(route.path, '/systeme/api')
  const html = indexes[0]('<html><head></head><body></body></html>')
  assert.match(html, /<meta name="dsh-monitor-etat" content="\/systeme\/api\/etat">/)
})

test('requests from outside the host are refused', async () => {
  const { handler } = mount({})
  const remote = await call(handler, { url: '/systeme/api/reglages', remote: '10.0.0.7' })
  assert.equal(remote.statusCode, 403)
  assert.equal(json(remote).error, 'origine non autorisée')
  const foreign = await call(handler, { url: '/systeme/api/reglages', headers: { origin: 'https://example.com' } })
  assert.equal(foreign.statusCode, 403)
})

test('settings expose the default thresholds', async () => {
  const { handler } = mount({})
  const response = await call(handler, { url: '/systeme/api/reglages' })
  assert.equal(response.statusCode, 200)
  const { config } = json(response)
  assert.equal(config.disk.attention, 20)
  assert.equal(config.memoire.alerte, 90)
  assert.equal(config.depots.alerteJours, 7)
})

test('unknown routes answer 404', async () => {
  const { handler } = mount({})
  const response = await call(handler, { url: '/systeme/api/inconnu' })
  assert.equal(response.statusCode, 404)
})

test('an unknown action is refused with 400', async () => {
  const { handler } = mount({})
  const response = await call(handler, {
    method: 'POST',
    url: '/systeme/api/action',
    headers: { host: '127.0.0.1:6000', origin: 'http://127.0.0.1:6000', 'content-type': 'application/json' },
    body: { confirm: true, famille: 'inconnu', action: 'start' },
  })
  assert.equal(response.statusCode, 400)
  assert.equal(json(response).error, 'action inconnue : inconnu/start')
})
