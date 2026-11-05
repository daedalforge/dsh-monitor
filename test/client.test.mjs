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

test('the client declares one panel, its sub-views and its settings seats', () => {
  const { plugin, seats } = loadClient()

  assert.deepEqual(plugin.inject, ['slots'])
  assert.deepEqual(seats.map((seat) => `${seat.name}:${seat.id ?? seat.key}`), [
    'sidebar.panellist:systeme',
    'main:systeme',
    'plugins.bundle.config:@daedalforge/dsh-monitor',
    'plugins.row.config:@daedalforge/dsh-monitor#systeme',
  ])
  assert.equal(seats.find((seat) => seat.id === 'systeme').label, 'Système')
  assert.equal(seats.some((seat) => seat.id === 'kubernetes' || seat.key === 'kubernetes'), false)
})

test('the client carries the Dépôts tab and its drawer route', async () => {
  const client = await readFile(new URL('lib/client.js', root), 'utf8')
  assert.match(client, /id: 'depots', label: 'Dépôts'/)
  assert.match(client, /function DepotsPanel/)
  assert.match(client, /systeme\/api\/depot\?name=/)
  assert.match(client, /showRepos/)
})

test('the client reads the mission key of any branch prefix', () => {
  const { plugin } = loadClient()
  assert.equal(plugin.missionId('slv-97'), 'SLV-97')
  assert.equal(plugin.missionId('feat/proj3-4/ajout'), 'PROJ3-4')
  assert.equal(plugin.missionId('dependabot/npm_and_yarn/lodash-4.17.21'), '')
  assert.equal(plugin.missionId('main'), '')
})

test('le panneau Applications porte la suppression, sa modale et son relevé', async () => {
  const client = await readFile(new URL('lib/client.js', root), 'utf8')
  assert.match(client, /function RemoveModal/)
  assert.match(client, /systeme\/api\/app\/footprint/)
  assert.match(client, /famille: 'apps'/)
  assert.match(client, /action: 'supprimer'/)
  assert.match(client, /onRemove: setRemove/)
  assert.match(client, /className: `cmodal rmodal/)
})

test('the Applications view filters on invalid bundles from the headline figure', async () => {
  const client = await readFile(new URL('lib/client.js', root), 'utf8')
  assert.match(client, /chip\('invalid', 'Invalides'\)/)
  assert.match(client, /if \(filter === 'invalid'\) return item\.state === 'invalid'/)
  assert.match(client, /git-kpi action/)
  assert.match(client, /className: 'git-empty'/)
  assert.match(client, /block: 'nearest'/)
})

test('la synchronisation Homebrew passe par une modale qui bloque pendant l’action', async () => {
  const client = await readFile(new URL('lib/client.js', root), 'utf8')
  assert.match(client, /function SyncModal/)
  assert.match(client, /systeme\/api\/homebrew\/plan/)
  assert.match(client, /famille: 'homebrew', action: 'synchroniser'/)
  assert.match(client, /const close = \(\) => \{ if \(busy\) return; onClose\(\) \}/)
  assert.match(client, /aria-busy': busy \? 'true' : 'false'/)
  assert.match(client, /sync-spin/)
  assert.match(client, /chip\('brew', 'Homebrew'\)/)
  assert.match(client, /onClick: close, disabled: busy \}, 'Annuler'\)/)
  assert.match(client, /à lancer au terminal/)
  assert.match(client, /navigator\.clipboard\.writeText\(text\)/)
})
