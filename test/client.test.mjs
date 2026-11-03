import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)

test('the client module registers under the package name', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
  const client = await readFile(new URL('lib/client.js', root), 'utf8')
  const match = client.match(/__ModuleLoader__\.load\(\{\s*id:\s*'([^']+)'/)

  assert.ok(match, 'the client bundle does not call __ModuleLoader__.load')
  assert.equal(match[1], pkg.name)
})

function stubReact() {
  const noop = () => null
  return new Proxy({}, { get: (_, key) => (key === 'Fragment' ? 'Fragment' : noop) })
}

function loadClient() {
  const source = readFileSync(new URL('lib/client.js', root), 'utf8')
  const seats = []
  const injected = []
  let factory = null
  const browser = {
    __ModuleLoader__: { load: ({ factory: build }) => { factory = build } },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    addEventListener() {},
    removeEventListener() {},
    setInterval: () => 0,
    clearInterval() {},
    setTimeout: () => 0,
    clearTimeout() {},
  }
  const page = { visibilityState: 'visible', createElement: () => ({ dataset: {}, remove() {} }), head: { appendChild() {} } }
  const load = (id) => (id === 'react' ? stubReact() : {})
  new Function('window', 'document', 'require', 'module', 'exports', source)(browser, page, load, { exports: {} }, {})
  const plugin = factory(load)
  const host = {
    get: () => undefined,
    slots: {
      inject: (seat, run) => { injected.push(seat); run() },
      register: (options) => { seats.push(options); return options },
    },
    layout: { selectPanel() {} },
    effect: () => {},
  }
  plugin.apply(host)
  return { plugin, seats, injected }
}

test('the client declares the two panels and their settings seats', () => {
  const { plugin, seats } = loadClient()

  assert.deepEqual(plugin.inject, ['slots'])
  assert.deepEqual(seats.map((seat) => `${seat.name}:${seat.id ?? seat.key}`), [
    'sidebar.panellist:systeme',
    'main:systeme',
    'sidebar.panellist:kubernetes',
    'main:kubernetes',
    'plugins.bundle.config:@daedalforge/dsh-monitor',
    'plugins.row.config:@daedalforge/dsh-monitor#systeme',
  ])
  assert.equal(seats.find((seat) => seat.key === 'kubernetes').name, 'main')
  assert.equal(seats.find((seat) => seat.id === 'kubernetes').label, 'Kubernetes')
})
