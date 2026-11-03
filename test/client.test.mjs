import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)

test('the client module registers under the package name', async () => {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'))
  const client = await readFile(new URL('lib/client.js', root), 'utf8')
  const match = client.match(/__ModuleLoader__\.load\(\{\s*id:\s*'([^']+)'/)

  assert.ok(match, 'the client bundle does not call __ModuleLoader__.load')
  assert.equal(match[1], pkg.name)
})
