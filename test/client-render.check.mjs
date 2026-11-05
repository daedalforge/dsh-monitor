import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url)
const source = readFileSync(new URL('lib/client.js', root), 'utf8')
const fixture = JSON.parse(readFileSync(new URL('test/fixtures/etat-applications.json', root), 'utf8'))

const footprint = {
  name: 'Slack',
  path: '/Applications/Slack.app',
  version: '4.53.276',
  origin: 'installation directe',
  cask: null,
  pkgId: '',
  running: { on: false, pids: [] },
  blocked: null,
  app: { items: [{ path: '/Applications/Slack.app', bytes: 286306304 }], bytes: 286306304 },
  data: [{ path: '/Users/slack/Library/Caches/com.tinyspeck.slackmacgap', bytes: 3231744, tag: '' }],
  config: [{ path: '/Users/slack/Library/Preferences/com.tinyspeck.slackmacgap.plist', bytes: 4096 }],
  keep: [{ path: '~/Library/Group Containers/group.com.tinyspeck.slackmacgap', why: 'relu par l’extension de partage' }],
  totals: { count: 3, bytes: 289542144, places: 3 },
  items: [],
}

function hooks() {
  const state = { slots: [], cursor: 0, dirty: false, effects: [], seen: [] }
  const React = {
    Fragment: 'fragment',
    createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.length ? children : (props?.children ?? []) } }),
    useState(initial) {
      const index = state.cursor++
      if (!(index in state.slots)) state.slots[index] = typeof initial === 'function' ? initial() : initial
      return [state.slots[index], (value) => {
        state.slots[index] = typeof value === 'function' ? value(state.slots[index]) : value
        state.dirty = true
      }]
    },
    useRef(initial) {
      const index = state.cursor++
      if (!(index in state.slots)) state.slots[index] = { current: initial }
      return state.slots[index]
    },
    useMemo(run) {
      const index = state.cursor++
      if (!(index in state.slots)) state.slots[index] = run()
      return state.slots[index]
    },
    useCallback(fn) {
      state.cursor += 1
      return fn
    },
    useEffect(run, deps) {
      state.effects.push({ index: state.cursor++, run, key: JSON.stringify(deps ?? null) })
    },
    useSyncExternalStore(get) {
      state.cursor += 1
      return get()
    },
  }
  return { React, state }
}

function build(node, stack) {
  if (node === null || node === undefined || node === false || node === true) return null
  if (Array.isArray(node)) return node.map((child) => build(child, stack))
  if (typeof node !== 'object') return String(node)
  const { type, props } = node
  if (typeof type === 'function') {
    stack.push(type.name || 'anonyme')
    try {
      return build(type(props), stack)
    } catch (error) {
      error.message = `${stack.join(' › ')} — ${error.message}`
      throw error
    } finally {
      stack.pop()
    }
  }
  if (type === 'fragment') return build(props.children, stack)
  return { tag: type, props, children: build(props.children, stack) }
}

function text(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(text).join(' ')
  if (typeof node === 'object') return text(node.children)
  return String(node)
}

function nodes(node, out = []) {
  if (!node) return out
  if (Array.isArray(node)) {
    node.forEach((child) => nodes(child, out))
    return out
  }
  if (typeof node === 'object') {
    out.push(node)
    nodes(node.children, out)
  }
  return out
}

function estate(items) {
  const data = structuredClone(fixture)
  data.apps.apps = items
  data.apps.counts = {
    ...data.apps.counts,
    total: items.length,
    bundles: items.length,
    invalid: items.filter((item) => item.state === 'invalid').length,
    brew: items.filter((item) => item.cask).length,
    casksOutdated: items.filter((item) => item.cask?.outdated).length,
    formulaeOutdated: 0,
    desync: items.filter((item) => item.state === 'desync').length,
  }
  return data
}

const row = (name, state, extra = {}) => ({
  name,
  path: `/Applications/${name}.app`,
  version: '1.0',
  state,
  domain: 'user',
  system: false,
  bundles: [],
  installedAt: '2026-10-01T09:00:00.000Z',
  ...extra,
})

function mount(data = fixture) {
  const { React, state } = hooks()
  const store = new Map([
    ['dsh-monitor:tab', 'applications'],
    ['dsh-monitor:etat', JSON.stringify({ data: fixture, at: Date.parse(fixture.at) || Date.now() })],
  ])
  const windowStub = {
    __ModuleLoader__: { load: ({ factory }) => { windowStub.__factory = factory } },
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, value),
      removeItem: (key) => store.delete(key),
    },
    addEventListener() {},
    removeEventListener() {},
    setInterval: () => 0,
    clearInterval() {},
    requestAnimationFrame: (run) => { const timer = setTimeout(run, 0); timer.unref?.(); return 0 },
    setTimeout: (run, delay) => { const timer = setTimeout(run, delay ?? 0); timer.unref?.(); return timer },
    clearTimeout: (timer) => clearTimeout(timer),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    location: { href: 'http://127.0.0.1:3080/' },
  }
  const documentStub = {
    visibilityState: 'visible',
    head: { appendChild() {}, append() {} },
    createElement: () => ({ dataset: {}, remove() {} }),
    addEventListener() {},
    removeEventListener() {},
    querySelectorAll: () => [],
  }

  globalThis.fetch = async (url) => {
    const key = String(url)
    if (key.includes('/systeme/api/etat')) return { ok: true, status: 200, json: async () => data }
    if (key.includes('/systeme/api/app/footprint')) return { ok: true, status: 200, json: async () => footprint }
    if (key.includes('/systeme/api/action')) return { ok: true, status: 200, json: async () => ({ receipt: { name: 'Slack', bytes: 0, footprint } }) }
    return { ok: false, status: 404, json: async () => ({ error: 'pas de route' }) }
  }

  new Function('window', 'document', 'require', 'module', 'exports', source)(
    windowStub, documentStub, (id) => (id === 'react' ? React : {}), { exports: {} }, {},
  )
  const plugin = windowStub.__factory((id) => (id === 'react' ? React : {}))
  const seats = []
  plugin.apply({
    slots: { register: (options, component) => { seats.push({ options, component }); return () => {} }, inject: (name, run) => run() },
    get: () => undefined,
    effect: (run) => run(),
  })

  const settle = async (props) => {
    let tree = null
    let stable = 0
    for (let pass = 0; pass < 40 && stable < 4; pass += 1) {
      state.cursor = 0
      state.effects = []
      state.dirty = false
      tree = build({ type: seats.find((seat) => seat.options.name === 'main').component, props }, [])
      for (const effect of state.effects) {
        if (state.seen[effect.index] === effect.key) continue
        state.seen[effect.index] = effect.key
        effect.run()
      }
      await new Promise((resolve) => setTimeout(resolve, 6))
      stable = state.dirty ? 0 : stable + 1
    }
    return tree
  }

  return { seats, settle }
}

const tableOf = (tree) => nodes(tree).find((node) => node.tag === 'table' && String(node.props.className ?? '').includes('app-table'))
const tableText = (tree) => text(tableOf(tree)).replace(/\s+/g, ' ')
const panelText = (tree) => text(tree).replace(/\s+/g, ' ')
const figureOf = (tree, label) => nodes(tree).find((node) => node.tag === 'button'
  && String(node.props.className ?? '').includes('git-kpi action')
  && text(node).includes(label))
const props = { services: { getService: () => undefined }, jobs: {}, ctx: {} }

async function filterScenarios() {
  const three = [
    row('ChatGPT', 'invalid'),
    row('Slack', 'current'),
    row('Safari', 'system', { domain: 'system', system: true }),
  ]
  const { settle } = mount(estate(three))
  const panel = await settle(props)
  assert.match(panelText(panel), /3 lignes · 3 bundles/, 'la table rend tout le relevé avant le clic')
  const figure = figureOf(panel, 'Bundles invalides')
  assert.ok(figure, 'la carte Bundles invalides est un bouton quand un bundle invalide existe')
  assert.equal(figure.props['aria-pressed'], 'false', 'la carte n’est pas pressée au repos')
  assert.match(String(figure.props.title), /Filtrer la table sur le bundle invalide/)

  figure.props.onClick()
  const filtered = await settle(props)
  assert.match(panelText(filtered), /1 \/ 3 lignes · 3 bundles/, 'l’en-tête compte les lignes filtrées')
  assert.match(tableText(filtered), /ChatGPT/)
  assert.doesNotMatch(tableText(filtered), /Slack/, 'seules les applications invalides restent')
  assert.doesNotMatch(tableText(filtered), /Safari/)
  assert.equal(figureOf(filtered, 'Bundles invalides').props['aria-pressed'], 'true', 'la carte pressée porte son état')
  assert.ok(
    nodes(filtered).some((node) => String(node.props.className ?? '') === 'git-chip on' && text(node).includes('Invalides')),
    'la puce Invalides porte le filtre',
  )

  figureOf(filtered, 'Bundles invalides').props.onClick()
  const back = await settle(props)
  assert.match(panelText(back), /3 lignes · 3 bundles/, 'un second clic rend le relevé entier')
  assert.match(tableText(back), /Slack/)

  const { settle: settleZero } = mount(estate([row('Slack', 'current'), row('Safari', 'system', { domain: 'system', system: true })]))
  const zero = await settleZero(props)
  assert.equal(figureOf(zero, 'Bundles invalides'), undefined, 'à zéro invalide la carte n’est pas un bouton')
  assert.ok(
    nodes(zero).some((node) => node.tag === 'div' && String(node.props.className ?? '').includes('git-kpi') && /rien à filtrer/.test(String(node.props.title))),
    'la carte inerte dit pourquoi elle ne fait rien',
  )
  const zeroChip = nodes(zero).find((node) => node.tag === 'button' && String(node.props.className ?? '').includes('git-chip') && text(node).includes('Invalides'))
  zeroChip.props.onClick()
  const empty = await settleZero(props)
  assert.match(panelText(empty), /0 \/ 2 lignes/)
  assert.match(tableText(empty), /Aucun bundle invalide sur ce relevé : chaque application listée s’ouvre\./, 'la table vide nomme l’absence')

  console.log('carte et puce filtrant sur les bundles invalides, relevé à zéro compris')
}

async function brewScenarios() {
  const chrome = row('Google Chrome', 'outdated', {
    cask: { token: 'google-chrome', version: '157.0', installed: '156.0', outdated: true, latest: '157.0', autoUpdates: false },
  })
  const bruno = row('Bruno', 'desync', {
    cask: { token: 'bruno', version: '4.2.0', installed: '4.2.0', outdated: true, latest: '4.3.0', autoUpdates: false },
  })
  const rows = [chrome, bruno, row('Slack', 'current'), row('Safari', 'system', { domain: 'system', system: true })]
  const { settle } = mount(estate(rows))
  const panel = await settle(props)
  assert.match(panelText(panel), /4 lignes · 4 bundles/, 'la table rend tout le relevé avant le clic')
  const figure = figureOf(panel, 'Gérées par Homebrew')
  assert.ok(figure, 'la carte Gérées par Homebrew est un bouton quand une app vient d’un cask')
  assert.equal(figure.props['aria-pressed'], 'false', 'la carte n’est pas pressée au repos')
  assert.match(String(figure.props.title), /Filtrer la table sur les 2 applications gérées par Homebrew/)

  figure.props.onClick()
  const filtered = await settle(props)
  assert.match(panelText(filtered), /2 \/ 4 lignes · 4 bundles/, 'l’en-tête compte les lignes filtrées')
  assert.match(tableText(filtered), /Google Chrome/)
  assert.match(tableText(filtered), /Bruno/)
  assert.doesNotMatch(tableText(filtered), /Slack/, 'seules les applications Homebrew restent')
  assert.doesNotMatch(tableText(filtered), /Safari/)
  assert.equal(figureOf(filtered, 'Gérées par Homebrew').props['aria-pressed'], 'true', 'la carte pressée porte son état')
  assert.ok(
    nodes(filtered).some((node) => String(node.props.className ?? '') === 'git-chip on' && text(node).includes('Homebrew')),
    'la puce Homebrew porte le filtre',
  )

  figureOf(filtered, 'Gérées par Homebrew').props.onClick()
  const back = await settle(props)
  assert.match(panelText(back), /4 lignes · 4 bundles/, 'un second clic rend le relevé entier')
  assert.match(tableText(back), /Slack/)

  const { settle: settleZero } = mount(estate([row('Slack', 'current'), row('Safari', 'system', { domain: 'system', system: true })]))
  const zero = await settleZero(props)
  assert.equal(figureOf(zero, 'Gérées par Homebrew'), undefined, 'sans cask la carte n’est pas un bouton')
  assert.ok(
    nodes(zero).some((node) => node.tag === 'div' && String(node.props.className ?? '').includes('git-kpi') && /Aucune application gérée par Homebrew/.test(String(node.props.title))),
    'la carte inerte dit pourquoi elle ne fait rien',
  )
  const zeroChip = nodes(zero).find((node) => node.tag === 'button' && String(node.props.className ?? '').includes('git-chip') && text(node).includes('Homebrew'))
  zeroChip.props.onClick()
  const empty = await settleZero(props)
  assert.match(panelText(empty), /0 \/ 2 lignes/)
  assert.match(tableText(empty), /Aucune application gérée par Homebrew sur ce relevé : les bundles listés sont installés directement\./, 'la table vide nomme l’absence')
  const syncButton = nodes(empty).find((node) => node.tag === 'button' && String(node.props.className ?? '').includes('btn-o btn-sm') && text(node).includes('Synchroniser'))
  assert.ok(syncButton, 'la carte Homebrew porte le bouton de synchronisation')
  assert.equal(syncButton.props.disabled, true, 'à zéro paquet en retard le bouton reste inerte')

  console.log('carte et puce filtrant sur les applications Homebrew, carte de synchronisation comprise')
}

async function main() {
  await filterScenarios()
  await brewScenarios()

  const { seats, settle } = mount()
  assert.ok(seats.some((seat) => seat.options.name === 'main'), 'le panneau main est enregistré')

  const panel = await settle({ services: { getService: () => undefined }, jobs: {}, ctx: {} })
  const rendered = text(panel).replace(/\s+/g, ' ')
  assert.match(rendered, /Applications/)
  assert.match(rendered, /bundles/)

  const bins = nodes(panel).filter((node) => node.tag === 'button' && String(node.props.className ?? '').includes('rm-cell'))
  assert.equal(bins.length, 1, 'une corbeille par ligne supprimable, verrou compris dans la cellule')
  assert.equal(bins[0].props.onClick !== undefined, true, 'la corbeille porte son clic')

  bins[0].props.onClick({ stopPropagation() {}, preventDefault() {} })
  const withModal = await settle({ services: { getService: () => undefined }, jobs: {}, ctx: {} })
  const modal = text(withModal).replace(/\s+/g, ' ')
  assert.match(modal, /Supprimer Slack/)
  assert.match(modal, /Ce qui n’est pas touché/)
  assert.match(modal, /reconnu par le nom|Seront supprimés/)

  console.log('panneau Applications rendu, corbeille et modale comprises')
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
