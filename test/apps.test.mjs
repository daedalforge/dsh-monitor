import assert from 'node:assert/strict'
import test from 'node:test'
import { access, lstat, mkdir, mkdtemp, readFile, readdir, readlink, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { collectApps, collectAppDetail, collectAppFootprint, buildBrewSyncPlan, compareVersions, syncBrew } = (await import('../lib/index.js')).__internals

function plist({ version, executable }) {
  return JSON.stringify({
    CFBundleShortVersionString: version,
    CFBundleVersion: version,
    CFBundleExecutable: executable,
    CFBundleIdentifier: `test.${executable.toLowerCase()}`,
    LSMinimumSystemVersion: '13.0',
  })
}

async function bundle(dir, name, options) {
  const path = join(dir, `${name}.app`)
  await mkdir(join(path, 'Contents', 'MacOS'), { recursive: true })
  await writeFile(join(path, 'Contents', 'Info.plist'), plist(options))
  if (options.executableOnDisk !== false) await writeFile(join(path, 'Contents', 'MacOS', options.executable), 'binaire')
  return path
}

function env(root) {
  return {
    darwin: true,
    brew: false,
    home: root,
    domains: [
      { dir: join(root, 'Applications'), domain: 'system', label: 'Système' },
      { dir: join(root, 'Applications', 'Utilities'), domain: 'system', label: 'Système', flat: true },
      { dir: join(root, 'Accueil'), domain: 'user', label: 'Utilisateur' },
    ],
    run: async (command, args) => {
      if (command === 'plutil') {
        try {
          return { ok: true, stdout: await readFile(args[args.length - 1], 'utf8'), stderr: '' }
        } catch (error) {
          return { ok: false, stdout: '', stderr: String(error), error: String(error) }
        }
      }
      return { ok: false, stdout: '', stderr: 'indisponible en test', error: 'indisponible en test' }
    },
    tool: async () => '',
    readdir: (path) => readdir(path),
    stat: (path) => stat(path),
    lstat: (path) => lstat(path),
    readlink: (path) => readlink(path),
    exists: async (path) => {
      try {
        await access(path)
        return true
      } catch {
        return false
      }
    },
  }
}

async function sandbox() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-monitor-apps-'))
  await mkdir(join(root, 'Applications'), { recursive: true })
  await mkdir(join(root, 'Accueil'), { recursive: true })
  return root
}

test('un bundle aligné, un bundle hors cask et un bundle invalide se distinguent', async () => {
  const root = await sandbox()
  try {
    await bundle(join(root, 'Applications'), 'Alpha', { version: '1.2.0', executable: 'Alpha' })
    await bundle(join(root, 'Applications'), 'Beta', { version: '2.0.0', executable: 'Beta' })
    const path = await bundle(join(root, 'Applications'), 'Gamma', { version: '3.0.0', executable: 'Gamma', executableOnDisk: false })
    const state = await collectApps(env(root))
    const byName = Object.fromEntries(state.apps.map((app) => [app.name, app]))

    assert.equal(state.available, true)
    assert.equal(state.counts.bundles, 3)
    assert.equal(state.counts.system, 3)
    assert.equal(state.counts.invalid, 1)
    assert.equal(byName.Alpha.version, '1.2.0')
    assert.equal(byName.Alpha.state, 'direct')
    assert.equal(byName.Gamma.path, path)
    assert.equal(byName.Gamma.state, 'invalid')
    assert.equal(byName.Gamma.bundles[0].brokenLink, true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('un bundle vide ne s’ouvre pas et un lien cassé est nommé', async () => {
  const root = await sandbox()
  try {
    await mkdir(join(root, 'Accueil', 'Vide.app'), { recursive: true })
    await symlink(join(root, 'disparu.app'), join(root, 'Accueil', 'Lien.app'))
    const state = await collectApps(env(root))
    const byName = Object.fromEntries(state.apps.map((app) => [app.name, app]))

    assert.equal(state.counts.user, 2)
    assert.equal(byName.Vide.bundles[0].empty, true)
    assert.equal(byName.Vide.state, 'invalid')
    assert.equal(byName.Lien.bundles[0].symlinkTarget, join(root, 'disparu.app'))
    assert.equal(byName.Lien.state, 'invalid')

    const causes = state.causes.map((cause) => cause.id)
    assert.ok(causes.includes('invalid'))
    const invalid = state.causes.find((cause) => cause.id === 'invalid')
    assert.match(invalid.desc, /Vide/)
    assert.match(invalid.desc, /Lien/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('la lecture d’un bundle ne juge pas une version distante', async () => {
  const root = await sandbox()
  try {
    const path = await bundle(join(root, 'Applications'), 'Delta', { version: '4.1.0', executable: 'Delta' })
    const detail = await collectAppDetail(env(root), 'Delta')
    assert.equal(detail.name, 'Delta')
    assert.equal(detail.path, path)
    assert.equal(detail.bundles.length, 1)
    assert.equal(detail.bundles[0].bundleId, 'test.delta')
    assert.equal(detail.cask, null)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('sans Homebrew interrogé, les applications restent lisibles et la cause est nommée', async () => {
  const root = await sandbox()
  try {
    await bundle(join(root, 'Applications'), 'Epsilon', { version: '5.0.0', executable: 'Epsilon' })
    const state = await collectApps(env(root))
    assert.equal(state.brew.present, false)
    assert.equal(state.counts.casks, 0)
    assert.equal(state.counts.direct, 1)
    const direct = state.causes.find((cause) => cause.id === 'direct')
    assert.match(direct.desc, /aucune version distante/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

function footprintEnv(root, options = {}) {
  const base = env(root)
  return {
    ...base,
    tool: async (name) => (['du', 'pkgutil', 'pgrep'].includes(name) ? `/usr/bin/${name}` : ''),
    run: async (command, args) => {
      if (command === 'du') {
        const paths = args.filter((value) => !value.startsWith('-'))
        return { ok: true, stdout: paths.map((path) => `1024\t${path}`).join('\n'), stderr: '' }
      }
      if (command === 'pkgutil') {
        return options.pkgId
          ? { ok: true, stdout: `volume: /\npath: ${args[1]}\n\npkgid: ${options.pkgId}\n`, stderr: '' }
          : { ok: false, stdout: '', stderr: '', error: 'aucun reçu' }
      }
      if (command === 'pgrep') return options.pid ? { ok: true, stdout: `${options.pid}\n`, stderr: '' } : { ok: false, stdout: '', stderr: '', error: 'aucun processus' }
      return { ok: false, stdout: '', stderr: '', error: 'indisponible en test' }
    },
  }
}

test('le relevé nomme les données, la configuration et ce qui reste', async () => {
  const root = await sandbox()
  try {
    await bundle(join(root, 'Applications'), 'Alpha', { version: '1.2.0', executable: 'Alpha' })
    await mkdir(join(root, 'Library', 'Caches', 'test.alpha'), { recursive: true })
    await mkdir(join(root, 'Library', 'Application Support', 'Alpha'), { recursive: true })
    await mkdir(join(root, 'Library', 'Group Containers', 'group.test.alpha.shared'), { recursive: true })
    await mkdir(join(root, 'Library', 'Preferences'), { recursive: true })
    await writeFile(join(root, 'Library', 'Preferences', 'test.alpha.plist'), 'x')
    const state = await collectApps(env(root))
    const footprint = await collectAppFootprint(footprintEnv(root), 'Alpha', state)

    assert.equal(footprint.blocked, null)
    assert.equal(footprint.app.bytes, 1048576)
    assert.deepEqual(footprint.data.map((item) => item.tag), ['', 'nom'])
    assert.match(footprint.data[0].path, /Library\/Caches\/test\.alpha$/)
    assert.match(footprint.data[1].path, /Application Support\/Alpha$/)
    assert.equal(footprint.config.length, 1)
    assert.match(footprint.config[0].path, /Preferences\/test\.alpha\.plist$/)
    assert.equal(footprint.keep.length, 3)
    assert.match(footprint.keep[0].path, /group\.test\.alpha\.shared$/)
    assert.equal(footprint.keep[2].path, '/Library/Application Support')
    assert.equal(footprint.totals.count, 4)
    assert.equal(footprint.totals.bytes, 4194304)
    assert.equal(footprint.totals.places, 4)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('le relevé refuse un bundle de macOS et nomme le paquet qui possède un bundle', async () => {
  const root = await sandbox()
  try {
    await mkdir(join(root, 'System', 'Applications'), { recursive: true })
    await bundle(join(root, 'System', 'Applications'), 'Safari', { version: '17.0', executable: 'Safari' })
    await symlink(join(root, 'System', 'Applications', 'Safari.app'), join(root, 'Applications', 'Safari.app'))
    await bundle(join(root, 'Applications'), 'Zeta', { version: '6.0.0', executable: 'Zeta' })
    const system = await collectApps(env(root))

    const safari = await collectAppFootprint(footprintEnv(root), 'Safari', system)
    assert.equal(safari.blocked.code, 'system')
    assert.equal(safari.pkgId, '')

    const zeta = await collectAppFootprint(footprintEnv(root, { pkgId: 'com.example.zeta' }), 'Zeta', system)
    assert.equal(zeta.blocked.code, 'pkg')
    assert.match(zeta.blocked.reason, /com\.example\.zeta/)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('le relevé dit qu’une application tourne encore', async () => {
  const root = await sandbox()
  try {
    await bundle(join(root, 'Applications'), 'Omega', { version: '7.0.0', executable: 'Omega' })
    const state = await collectApps(env(root))
    const idle = await collectAppFootprint(footprintEnv(root), 'Omega', state)
    assert.equal(idle.running.on, false)
    const busy = await collectAppFootprint(footprintEnv(root, { pid: 4242 }), 'Omega', state)
    assert.equal(busy.running.on, true)
    assert.deepEqual(busy.running.pids, [4242])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

function brewEnv(root) {
  const base = env(root)
  return {
    ...base,
    brew: true,
    tool: async (name) => (name === 'brew' ? '/opt/homebrew/bin/brew' : ''),
    run: async (command, args) => {
      if (command === 'plutil') {
        try {
          return { ok: true, stdout: await readFile(args[args.length - 1], 'utf8'), stderr: '' }
        } catch (error) {
          return { ok: false, stdout: '', stderr: String(error), error: String(error) }
        }
      }
      const line = args.join(' ')
      if (!command.endsWith('brew')) return { ok: false, stdout: '', stderr: 'indisponible en test', error: 'indisponible en test' }
      if (line === '--version') return { ok: true, stdout: 'Homebrew 4.6.0\ntap: /opt/homebrew', stderr: '' }
      if (line === 'list --formula --versions') return { ok: true, stdout: 'foo 1.0\nbar 2.0\n', stderr: '' }
      if (line === 'list --cask --versions') return { ok: true, stdout: 'bruno 4.2.0\ngoogle-chrome 156.0\n', stderr: '' }
      if (line === 'outdated --cask --greedy --json=v2') {
        return {
          ok: true,
          stdout: JSON.stringify({
            casks: [
              { name: 'bruno', installed_versions: ['4.2.0'], current_version: '4.3.0' },
              { name: 'google-chrome', installed_versions: ['156.0'], current_version: '157.0' },
            ],
          }),
          stderr: '',
        }
      }
      if (line === 'outdated --json=v2') {
        return {
          ok: true,
          stdout: JSON.stringify({ formulae: [{ name: 'foo', installed_versions: ['1.0'], current_version: '2.0' }] }),
          stderr: '',
        }
      }
      if (line === '--repository') return { ok: true, stdout: '/opt/homebrew', stderr: '' }
      return { ok: false, stdout: '', stderr: 'indisponible en test', error: 'indisponible en test' }
    },
  }
}

test('le relevé nomme les formules en retard et garde les casks à part', async () => {
  const root = await sandbox()
  try {
    await bundle(join(root, 'Applications'), 'Bruno', { version: '4.3.0', executable: 'Bruno' })
    await bundle(join(root, 'Applications'), 'Google Chrome', { version: '156.0', executable: 'Google Chrome' })
    const state = await collectApps(brewEnv(root))
    const byName = Object.fromEntries(state.apps.map((app) => [app.name, app]))

    assert.equal(state.brew.present, true)
    assert.equal(state.brew.outdatedFormulae.length, 1)
    assert.equal(state.brew.outdatedFormulae[0].name, 'foo')
    assert.equal(state.counts.formulae, 2)
    assert.equal(state.counts.formulaeOutdated, 1)
    assert.equal(state.counts.casksOutdated, 2)
    assert.equal(byName.Bruno.state, 'desync')
    assert.equal(byName.Bruno.cask.token, 'bruno')
    assert.equal(byName.Bruno.cask.latest, '4.3.0')
    assert.equal(byName['Google Chrome'].state, 'outdated')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('le plan de synchronisation écarte un cask dont le bundle dépasse la recette', () => {
  const state = {
    brew: {
      outdatedCasks: [
        { token: 'bruno', installed: '4.2.0', latest: '4.3.0' },
        { token: 'ghostty', installed: '1.3.1', latest: '1.4.0' },
      ],
      outdatedFormulae: [{ name: 'foo', installed: '1.0', latest: '2.0' }],
    },
    apps: [
      { name: 'Bruno', version: '4.4.0', cask: { token: 'bruno' } },
      { name: 'Ghostty', version: '1.2.0', cask: { token: 'ghostty' } },
    ],
  }
  const plan = buildBrewSyncPlan(state)
  assert.deepEqual(plan.formulae.map((item) => item.name), ['foo'])
  assert.deepEqual(plan.casks.map((item) => item.token), ['ghostty'])
  assert.deepEqual(plan.skipped.map((item) => item.token), ['bruno'])
  assert.equal(plan.empty, false)
  assert.deepEqual(plan.steps.map((step) => step.id), ['update', 'formula', 'cask:ghostty'])
  assert.deepEqual(plan.steps[2].args, ['upgrade', '--cask', '--greedy', 'ghostty'])

  const nothing = buildBrewSyncPlan({ brew: { outdatedCasks: [], outdatedFormulae: [] }, apps: [] })
  assert.equal(nothing.empty, true)
  assert.deepEqual(nothing.steps, [])
})

test('les versions se comparent segment par segment, suffixes ignorés', () => {
  assert.equal(compareVersions('1.4.0', '1.3.1'), 1)
  assert.equal(compareVersions('2026.8.2115.0', '2026.6.822.0'), 1)
  assert.equal(compareVersions('4.3.0', '4.3.0'), 0)
  assert.equal(compareVersions('4.2.0', '4.3.0'), -1)
})

async function planOf() {
  return {
    brew: {
      present: true,
      outdatedCasks: [{ token: 'ghostty', installed: '1.3.1', latest: '1.4.0' }],
      outdatedFormulae: [{ name: 'foo', installed: '1.0', latest: '2.0' }],
    },
    apps: [],
    counts: {},
  }
}

test('un brew update en échec arrête les mises à jour, sans les lancer', async () => {
  const calls = []
  const outcome = await syncBrew({
    snapshot: await planOf(),
    brew: '/opt/homebrew/bin/brew',
    run: async (command, args) => {
      calls.push(args.join(' '))
      return { ok: false, stdout: '', stderr: 'boom' }
    },
    collect: async () => ({ counts: { formulaeOutdated: 1, casksOutdated: 1, desync: 0 } }),
  })
  assert.deepEqual(calls, ['update'])
  assert.deepEqual(outcome.failed, ['update'])
  assert.equal(outcome.steps.filter((step) => step.skipped).length, 2)
  assert.equal(outcome.residual.casksOutdated, 1)
})

test('un upgrade de formule en échec laisse le cask se faire', async () => {
  const calls = []
  const outcome = await syncBrew({
    snapshot: await planOf(),
    brew: '/opt/homebrew/bin/brew',
    run: async (command, args) => {
      calls.push(args.join(' '))
      if (args[0] === 'update') return { ok: true, stdout: 'Updated 1 tap', stderr: '' }
      if (args[1] === '--formula') return { ok: false, stdout: '', stderr: 'foo: échec' }
      return { ok: true, stdout: 'ghostty 1.3.1 -> 1.4.0', stderr: '' }
    },
    collect: async () => ({ counts: { formulaeOutdated: 1, casksOutdated: 0, desync: 0 } }),
  })
  assert.deepEqual(calls, ['update', 'upgrade --formula', 'upgrade --cask --greedy ghostty'])
  assert.deepEqual(outcome.failed, ['formula'])
  assert.equal(outcome.steps.find((step) => step.id === 'cask:ghostty').ok, true)
  assert.equal(outcome.residual.formulaeOutdated, 1)
})
