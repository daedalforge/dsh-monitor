import assert from 'node:assert/strict'
import test from 'node:test'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const {
  parseStatusV2,
  collectRepo,
  readWorktrees,
  collectPrs,
  finalizeRepos,
  buildCauses,
  collectDepot,
} = (await import('../lib/index.js')).__internals

const CONFIG = { depots: { attentionJours: 3, alerteJours: 7, detail: 8 } }

function git(dir, ...args) {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

async function makeRepo(root, name) {
  const dir = join(root, name)
  await mkdir(dir, { recursive: true })
  git(dir, 'init', '-q', '-b', 'main')
  git(dir, 'config', 'user.email', 'test@example.test')
  git(dir, 'config', 'user.name', 'Test')
  await writeFile(join(dir, 'a.txt'), 'one\n')
  git(dir, 'add', '.')
  git(dir, 'commit', '-q', '-m', 'initial')
  return dir
}

function item(overrides = {}) {
  return {
    name: 'demo', path: '/tmp/demo', branch: 'main', detached: false, upstream: 'origin/main',
    ahead: 0, behind: 0, dirty: 0, tracked: 0, untracked: 0, conflicts: 0, staged: 0, unstaged: 0,
    dirtyPaths: [], dirtyFiles: [], oldestDirtyAt: null, oldestDirtyDays: 0, oldestDirtyPath: '',
    last: 'maintenant', lastDays: 0, lastSha: 'abc1234', aheadMain: 0, behindMain: 0,
    state: 'ok', sev: 'ok', sync: 'à jour', worktrees: [], worktreeCount: 0, worktreePaths: [],
    branches: [], branchCount: 1, stashCount: 0, fetchHours: 1, commits24: 0, ...overrides,
  }
}

test('parseStatusV2 sépare les fichiers suivis, non suivis et les conflits', () => {
  const status = [
    '# branch.oid 1234567',
    '# branch.head feat/demo',
    '# branch.upstream origin/feat/demo',
    '# branch.ab +2 -5',
    '1 .M N... 100644 100644 100644 a b file.txt',
    '? new.txt',
    'u UU N... 100644 100644 100644 100644 a b c conflit.txt',
  ].join('\n')
  const parsed = parseStatusV2(status)
  assert.equal(parsed.branch, 'feat/demo')
  assert.equal(parsed.upstream, 'origin/feat/demo')
  assert.equal(parsed.ahead, 2)
  assert.equal(parsed.behind, 5)
  assert.equal(parsed.dirty, 3)
  assert.equal(parsed.tracked, 2)
  assert.equal(parsed.untracked, 1)
  assert.equal(parsed.conflicts, 1)
  assert.deepEqual(parsed.files.map((file) => file.code), ['.M', '??', 'UU'])
})

test('parseStatusV2 reconnaît un HEAD détaché', () => {
  const parsed = parseStatusV2('# branch.oid 7654321\n# branch.head (detached)\n')
  assert.equal(parsed.detached, true)
  assert.equal(parsed.branch, 'detached')
})

test('collectRepo lit un worktree lié, un stash et un HEAD resté sur main', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-git-'))
  try {
    const dir = await makeRepo(root, 'demo')
    const side = join(root, 'demo-side')
    git(dir, 'worktree', 'add', '-q', side, '-b', 'feat/demo')
    await writeFile(join(side, 'a.txt'), 'two\n')
    await writeFile(join(dir, 'a.txt'), 'stashed\n')
    git(dir, 'stash', 'push', '-q', '-m', 'wip local')

    const repo = (await collectRepo('demo', CONFIG, root)).item
    assert.equal(repo.branch, 'main')
    assert.equal(repo.worktreeCount, 1)
    assert.equal(repo.worktrees[0].branch, 'feat/demo')
    assert.equal(repo.worktrees[0].upstreamMissing, true)
    assert.equal(repo.stashCount, 1)
    assert.equal(repo.state, 'ok')
    assert.equal(repo.dirty, 0)

    const trees = await readWorktrees(dir)
    assert.equal(trees.length, 2)
    assert.equal(trees.filter((tree) => tree.main).length, 1)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('collectRepo signale un HEAD détaché', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-git-'))
  try {
    const dir = await makeRepo(root, 'solo')
    git(dir, 'checkout', '-q', '--detach', 'HEAD')
    const repo = (await collectRepo('solo', CONFIG, root)).item
    assert.equal(repo.detached, true)
    assert.equal(repo.branch, 'detached')
    assert.equal(repo.state, 'warn')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('finalizeRepos rattache la PR d’un worktree et compte une PR en échec', () => {
  const worktree = { path: '/tmp/demo-side', branch: 'feat/demo', main: false, detached: false, upstreamMissing: true, aheadMain: 2, pr: null }
  const repos = { items: [item({ worktrees: [worktree], worktreeCount: 1 })], total: 1, dirtyCount: 0, behindCount: 0, aheadCount: 0, branchCount: 1 }
  const prs = {
    available: true,
    at: 'maintenant',
    map: { 'demo::feat/demo': { number: 42, title: 'x', isDraft: true, reviewDecision: '', checks: 'failure', url: '' } },
  }
  const done = finalizeRepos(repos, prs)
  assert.equal(done.items[0].pr, null)
  assert.equal(done.items[0].worktrees[0].pr.number, 42)
  assert.equal(done.items[0].state, 'warn')
  assert.equal(done.prCount, 1)
  assert.equal(done.prFailCount, 1)
  const push = done.causes.find((cause) => cause.id === 'push')
  assert.ok(push)
  assert.match(push.title, /mission/i)
  assert.match(push.desc, /PR #42 en échec/)
})

test('buildCauses déduplique les dépôts entre retard, saleté et poussée', () => {
  const causes = buildCauses([
    item({ name: 'a', behind: 15, upstream: 'origin/main', fetchHours: 27, state: 'bad' }),
    item({ name: 'b', dirty: 3, tracked: 3, dirtyPaths: ['x'], oldestDirtyDays: 4, dirtyFiles: [] }),
    item({ name: 'c', upstreamMissing: true, branch: 'feat/soc-1', aheadMain: 2 }),
  ])
  assert.deepEqual(causes.map((cause) => cause.id), ['behind', 'dirty', 'push'])
  assert.match(causes[0].title, /a 15 commits de retard/)
  assert.match(causes[1].title, /1 dépôt porte 3 fichiers/)
  assert.match(causes[2].title, /Une mission laisse un reste/)
})

test('collectPrs renonce proprement sans gh', async () => {
  const prs = await collectPrs({ items: [item({ name: 'demo', branch: 'feat/x' })] }, '')
  assert.equal(prs.available, false)
  assert.deepEqual(prs.map, {})
})

test('collectDepot refuse un nom hors du dossier des projets', async () => {
  await assert.rejects(collectDepot('../demo'), /dépôt invalide/)
  await assert.rejects(collectDepot('a/b'), /dépôt invalide/)
  await assert.rejects(collectDepot(''), /dépôt invalide/)
})

test('collectDepot rend les derniers commits et le statut brut', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-git-'))
  try {
    await makeRepo(root, 'demo')
    const depot = await collectDepot('demo', root)
    assert.equal(depot.name, 'demo')
    assert.equal(depot.commits.length, 1)
    assert.match(depot.commits[0].subject, /initial/)
    assert.match(depot.status, /# branch\.head main/)
    assert.equal(depot.stashes.items.length, 0)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
