import assert from 'node:assert/strict'
import test from 'node:test'
import { EventEmitter } from 'node:events'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const sandbox = await mkdtemp(join(tmpdir(), 'dsh-monitor-state-'))
process.env.HOME = sandbox
process.env.USERPROFILE = sandbox

const { apply } = await import('../lib/index.js')

function mount(config) {
  const routes = []
  apply(
    {
      effect: (task) => task(),
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

test('le panneau démarre sans projectsRoot ni workspace', async () => {
  const handler = mount({ projectsRoot: join(sandbox, 'projects-absents'), clusterName: 'essai' })
  const response = await call(handler, '/systeme/api/etat?refresh=1')
  assert.equal(response.statusCode, 200)
  const state = JSON.parse(response.payload)

  assert.deepEqual(Object.keys(state).sort(), ['at', 'config', 'dsh', 'journal', 'k8s', 'machine', 'repos', 'stale'])

  assert.equal(state.repos.hidden, true)
  assert.equal(state.repos.state, 'bad')
  assert.match(state.repos.alert, /introuvable/)

  assert.equal(state.k8s.context, '')
})
