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

function mount(data = fixture, options = {}) {
  const { React, state } = hooks()
  const tab = options.tab ?? 'applications'
  const cpu = options.cpu
  const fetches = []
  const store = new Map([
    ['dsh-monitor:tab', tab],
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
    fetches.push(key)
    if (key.includes('/systeme/api/etat')) return { ok: true, status: 200, json: async () => data }
    if (key.includes('/systeme/api/cpu')) {
      if (cpu === 'error') return { ok: false, status: 500, json: async () => ({ error: 'relevé indisponible' }) }
      if (!cpu) return { ok: false, status: 404, json: async () => ({ error: 'pas de route' }) }
      return { ok: true, status: 200, json: async () => cpu }
    }
    if (key.includes('/systeme/api/app/footprint')) return { ok: true, status: 200, json: async () => footprint }
    if (key.includes('/systeme/api/action')) return { ok: true, status: 200, json: async () => ({ receipt: { name: 'Slack', bytes: 0, footprint } }) }
    if (key.includes('/systeme/api/disque')) {
      if (options.disque === 'pending') return new Promise(() => {})
      if (options.disque === 'error') return { ok: false, status: 503, json: async () => ({ error: 'docker system df a expiré' }) }
      return { ok: true, status: 200, json: async () => options.disque }
    }
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

  return { seats, settle, fetches }
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

const diskPayload = {
  checkedAt: '2026-11-05T07:13:58.485Z',
  total: 243451037,
  categories: [
    { id: 'images', label: 'Images', bytes: 82585846, reclaimable: 41000000 },
    { id: 'build-cache', label: 'Cache de construction', bytes: 12345678, reclaimable: 0 },
  ],
  categoriesError: '',
  colima: {
    available: true,
    docker: { mount: '/var/lib/docker', used: 82145000, free: 123450000, total: 205595000, percent: 40 },
  },
  items: [
    { id: 'docker', label: 'Docker', bytes: 82585846, detail: 'images et cache, sans volumes' },
    { id: 'cache-dsh', label: 'Cache DSH', bytes: 16571076, detail: '~/.dsh/cache' },
    {
      id: 'artifacts',
      label: 'Artefacts',
      bytes: 144294115,
      detail: '2 dossiers',
      targets: [{ repo: 'manager', path: 'dist', label: '2026-09-30 · dist', bytes: 144294115 }],
    },
  ],
}

const dialogOf = (tree) => nodes(tree).find((node) => node.props?.role === 'dialog' && node.props?.['aria-label'] === 'Libérer de l’espace')
const spinOf = (tree) => nodes(tree).find((node) => String(node.props?.className ?? '') === 'sync-spin')
const diskButtonOf = (tree) => nodes(tree).find((node) => node.tag === 'a' && String(node.props.className ?? '') === 'more' && text(node).includes('Libérer de l’espace'))

async function diskCase(options) {
  const { settle } = mount(fixture, { tab: 'machine', ...options })
  const panel = await settle(props)
  const opener = diskButtonOf(panel)
  assert.ok(opener, 'la carte Machine porte l’entrée « Libérer de l’espace »')
  opener.props.onClick({ preventDefault() {} })
  return { tree: await settle(props), settle }
}

const closeOf = (tree) => nodes(tree).find((node) => node.tag === 'button' && String(node.props.className ?? '') === 'btn-o' && text(node) === 'Fermer')

async function diskScenarios() {
  // Given la modale ouverte sur une analyse encore en cours
  const analysing = await diskCase({ disque: 'pending' })
  const loadingText = panelText(analysing.tree)
  assert.ok(spinOf(analysing.tree), 'l’analyse porte le spinner du panneau')
  assert.match(loadingText, /Analyse des cibles…/, 'l’analyse est nommée')
  assert.match(loadingText, /démarrée à \d{1,2}:\d{2}:\d{2}/, 'l’heure de départ est affichée')
  assert.match(loadingText, /place Docker, disque Colima et cibles inactives des dépôts/, 'ce qui est mesuré est nommé')
  assert.doesNotMatch(loadingText, /Total repéré/, 'aucun chiffre n’est affiché avant le relevé')
  const busyDialog = dialogOf(analysing.tree)
  assert.ok(busyDialog, 'la modale du disque est un dialogue nommé')
  assert.equal(busyDialog.props['aria-busy'], 'true', 'la modale se déclare occupée pendant l’analyse')

  // When le relevé arrive
  const read = await diskCase({ disque: diskPayload })
  const readText = panelText(read.tree)
  assert.equal(spinOf(read.tree), undefined, 'le loader disparaît au relevé')
  assert.doesNotMatch(readText, /Analyse des cibles…/, 'le libellé d’analyse s’efface')
  assert.match(readText, /Total repéré : 232,2 Mo/, 'le total repéré prend la place du loader')
  assert.match(readText, /Répartition du moteur/, 'la répartition Docker est rendue')
  assert.match(readText, /Disque de Colima/, 'le disque Colima est rendu')
  assert.equal(dialogOf(read.tree).props['aria-busy'], 'false', 'la modale n’est plus occupée')

  // When l’analyse échoue
  const failed = await diskCase({ disque: 'error' })
  const failedText = panelText(failed.tree)
  assert.equal(spinOf(failed.tree), undefined, 'l’erreur ne laisse pas le loader en place')
  assert.match(failedText, /docker system df a expiré/, 'l’erreur est nommée')
  assert.ok(
    nodes(failed.tree).some((node) => String(node.props.className ?? '') === 'errbar'),
    'l’erreur garde son bandeau',
  )

  // When la modale est fermée pendant l’analyse
  const closer = closeOf(analysing.tree)
  assert.ok(closer, 'le pied garde son bouton Fermer pendant l’analyse')
  closer.props.onClick()
  const closed = await analysing.settle(props)
  assert.equal(dialogOf(closed), undefined, 'fermer pendant l’analyse referme la modale')
  assert.doesNotMatch(panelText(closed), /Analyse des cibles…/, 'le loader part avec la modale')

  console.log('modale du disque : loader d’analyse, relevé, erreur et fermeture pendant l’analyse')
}

function cpuPayload() {
  const end = Date.parse('2026-11-05T08:00:00.000Z')
  const points = []
  for (let index = 0; index < 10; index += 1) {
    points.push({ at: new Date(end - (30 - index) * 60000).toISOString(), cpu: 8 + index * 4, max: 9 + index * 4, count: 1 })
  }
  points.push({ at: new Date(end - 6 * 60000).toISOString(), cpu: 88.4, max: 96.2, count: 3 })
  return {
    window: '1h',
    at: new Date(end).toISOString(),
    step: 30000,
    cadence: 60,
    retention: 24,
    file: '~/.dsh/storages/dsh-monitor/cpu.jsonl',
    points,
    summary: { current: 88.4, min: 8, average: 38.9, max: 96.2, samples: 13 },
    total: 13,
  }
}

async function machineScenarios() {
  const { seats, settle, fetches } = mount(fixture, { tab: 'machine', cpu: cpuPayload() })
  assert.ok(seats.some((seat) => seat.options.name === 'main'), 'le panneau main est enregistré')

  const panel = await settle(props)
  const rendered = panelText(panel)
  assert.match(rendered, /Processeur/, 'la carte Processeur est rendue')
  assert.match(rendered, /cpu\.jsonl/, 'la carte nomme son fichier')
  assert.match(rendered, /24 h de rétention, panneau fermé compris/, 'la note dit la rétention et le remplissage hors panneau')
  assert.match(rendered, /Fenêtre 1 h · 60 s par point/)
  assert.match(rendered, /Actuel 88,4 %/)
  assert.match(rendered, /minimum 8,0 %/)
  assert.match(rendered, /moyenne 38,9 %/)
  assert.match(rendered, /maximum 96,2 %/)
  assert.match(rendered, /13 mesures/)
  assert.doesNotMatch(rendered, /24 dernières minutes/, 'l’ancienne barre des 24 traits a disparu')
  assert.equal(nodes(panel).some((node) => String(node.props?.className ?? '').includes('spark')), false, 'aucun trait de l’ancienne barre')

  const chart = nodes(panel).find((node) => node.tag === 'svg' && String(node.props['aria-label'] ?? '').includes('processeur'))
  assert.ok(chart, 'la courbe porte son svg nommé')
  const chartNodes = nodes(chart)
  assert.equal(chartNodes.filter((node) => node.tag === 'path' && node.props.fill === 'none').length, 1, 'la coupure sépare la courbe en un seul trait continu')
  assert.equal(chartNodes.filter((node) => node.tag === 'path' && node.props.fill === 'url(#cpufill)').length, 1, 'le trait large porte son aire remplie')
  assert.match(chartNodes.find((node) => node.tag === 'path' && node.props.fill === 'none').props.d, / C[\d.]/, 'la courbe est lissée')
  assert.equal(chartNodes.filter((node) => node.tag === 'circle').length, 1, 'la mesure isolée reste un point')
  const bands = chartNodes.filter((node) => node.tag === 'rect' && String(node.props.fill) === 'transparent')
  assert.equal(bands.length, 11, 'une bande de survol par point agrégé')
  assert.ok(bands.some((band) => text(band).includes('au plus sur 3 mesures')), 'la bande agrégée dit son maximum')

  const windows = nodes(panel).filter((node) => node.tag === 'button' && ['1 h', '6 h', '24 h'].includes(text(node).trim()))
  assert.equal(windows.length, 3, 'trois fenêtres offertes')
  assert.equal(windows[0].props['aria-pressed'], 'true', 'la fenêtre d’ouverture est à 1 h')
  assert.equal(windows[1].props['aria-pressed'], 'false')
  windows[1].props.onClick()
  const six = await settle(props)
  assert.match(panelText(six), /Fenêtre 6 h · 60 s par point/, 'la bascule change la fenêtre')
  assert.ok(fetches.some((url) => url.includes('/systeme/api/cpu?fenetre=6h')), 'la bascule relit les mesures')

  const vide = mount(fixture, { tab: 'machine', cpu: { ...cpuPayload(), points: [], summary: { current: null, min: null, average: null, max: null, samples: 0 }, total: 0 } })
  const emptyPanel = await vide.settle(props)
  assert.match(panelText(emptyPanel), /Aucune mesure encore/, 'le premier lancement explique le fichier qui se remplit')
  assert.match(panelText(emptyPanel), /panneau fermé compris/)

  const casse = mount(fixture, { tab: 'machine', cpu: 'error' })
  const brokenPanel = await casse.settle(props)
  assert.match(panelText(brokenPanel), /Les mesures ne répondent pas/, 'une route muette ne casse pas l’onglet')

  console.log('carte Processeur rendue : courbe, fenêtres, état vide et route muette')
}

async function main() {
  await filterScenarios()
  await brewScenarios()
  await machineScenarios()
  await diskScenarios()

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
