import assert from 'node:assert/strict'
import test from 'node:test'
import { access, lstat, mkdir, mkdtemp, readFile, readdir, readlink, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { collectApps, collectAppDetail } = (await import('../lib/index.js')).__internals

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
