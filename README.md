# dsh-monitor

A monitoring plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): machine health, runtime state, the git repositories you work in, and the Kubernetes cluster you develop on — from one sidebar entry, without leaving the app.

The **Système** entry carries three sub-views, switched from the tabs at the top of the panel: **Machine** answers « is this machine healthy? » in one scroll, **Kubernetes** answers « what runs in the cluster, what is degraded, and why? », and **Dépôts** answers « what is the state of the git workspace, and what is left to push? ». The three interfaces are written in French.

## What it shows

- **Machine** — CPU, memory, disk, load average, battery, swap, a 24-minute CPU sparkline and the top processes. Memory follows the Activity Monitor definition (app + wired + compressed) instead of the naive `total - free`, which sits at ~99 % as soon as the OS keeps inactive pages. CPU is a delta over a real time window on both platforms: a `/proc/stat` sample on Linux, the second `top -l 2 -s 1` sample on macOS. Linux reads `/proc/meminfo`, `/proc/stat`, `/proc/swaps` and `/sys/class/power_supply` directly. When Colima is present, its VM disk is measured through `colima ssh -- df -kP` and reported separately from the host disk.
- **DSH** — active sessions, running jobs, startup errors over 24 h, cache size, recent sessions, and today's cost when `costLedger` points to a JSON ledger.
- **Dépôts** — the git workspace read as a mission board: a banner states the workspace in one sentence (how many repositories are watched, how many carry a remainder, whether a PR is failing); six headline figures (repositories, repositories to watch, dirty repositories and files, behind, mission worktrees, mission PRs); **À traiter** groups the remainder by cause — a stale clone, uncommitted files, a mission that never left the machine — one card per cause with its evidence (`git` command), its scope and the repository it touches; the **Dépôts** table lists every repository with its branch, state, sync, upstream, last commit and PR, filterable by watch state and by worktrees; **Où vit le travail** shows the clone and its linked worktrees, one line per checkout with its PR or its « not pushed » flag; **Missions en cours** joins the mission branches with their PRs; **Activité récente** sums the last 24 h of commits per checkout; **Comprendre les chiffres** explains the figures and opens a twelve-term glossary. A repository opens a drawer (branch and upstream, checkouts, pull requests, last commits, changed files, working-tree state, last raw read) and a cause opens its proof. Everything is read-only: the panel never runs a git write, and a command is offered as a copy, not as a button.
- **Kubernetes · contexte** — the header carries the context picker: it lists the contexts `kubectl` declares on the machine plus an automatic entry that follows the current context, and writes the choice straight to `k8sContext`. Next to it, a **Ressources** window lists deployments, pods, jobs, statefulsets, daemonsets, cronjobs and unbound volumes with per-namespace filtering and remediation gestures.
- **Kubernetes · écran** — the cluster read as a place to work, not as an inventory. A banner states the cluster in one sentence (how many pods run, on how many nodes, how many secrets are stuck, whether a service is down); six headline figures; **À traiter** groups what is degraded by cause — one card per cause, carrying its evidence, its scope and the namespaces it touches; **Où tourne quoi** draws machine → node → four domains (Applicatif, Données, Observabilité, Plateforme) → HTTP entries, one dot per pod; the **Namespaces** table joins workloads, pods, restarts, secrets and state per namespace; **Capacité du nœud** compares reservations with allocatable; **Composants** checks context, Docker, kubectl, ingress, CoreDNS, metrics-server and external-secrets; **Activité récente** retells the last 24 h in sentences; **Comprendre les chiffres** explains each figure and opens a twelve-term glossary. A namespace opens a drawer (what to watch, pods, workloads, Azure secrets, network) and a cause opens its explanation. Every number is read from Kubernetes; a figure without a source says so instead of showing zero.
- **Empty sections hide themselves** — the repositories block disappears while `projectsRoot` does not exist, and the cluster sections while the machine has neither docker, kind, kubectl nor colima. Both come back on their own.

The panel refreshes on open, on window focus, and every 60 s while visible — no background polling. The last snapshot is cached in `localStorage` and painted immediately on the next open.

`/systeme/api/etat` always answers with the latest snapshot (stale-while-revalidate) and rebuilds in the background, so the panel never blocks on a slow probe. A snapshot is rebuilt at most every 15 s, with per-section caching for the expensive parts (repositories 3 min, pull requests 60 s, runtime 90 s, cluster 20 s, machine and Colima disk 15 s). Pull requests are read with `gh pr list` when `gh` is installed and authenticated; without it the column stays at « — » and the rest of the view still renders. `?refresh=1` forces a rebuild after a remediation.

The repositories view also exposes `/systeme/api/depot?name=<repository>`, which returns the last four commits, the raw `git status --porcelain=v2 --branch` output and the stashes of one repository; the name is restricted to a direct child of `projectsRoot`.

## Configuration

The plugin is configured on its `cordis.patch.yml` entry, from a page the package brings to **Plugins → Système**. Saving the page writes the values into the profile patch (the YAML below), so the configuration stays in the profile's own file.

The page is split in three sections: **Général** first, with the panel refresh cadence, then **Dépôts git** and **Kubernetes**. The context picker sits in the header of the Kubernetes view: it lists the contexts `kubectl` declares on the machine, plus an automatic entry, the default, that follows the current context, and writes the choice straight to `k8sContext`. `kind-*` contexts are recognised by their prefix for the cluster check. Each of those last two opens with a switch that hides the matching tab — the switch only changes what the panel shows, the collection keeps running in the background so the view comes back with its current values when switched on again.

| Key | Default | Meaning |
| --- | --- | --- |
| `projectsRoot` | `~/projects` | Directory holding the git repositories to watch |
| `showRepos` | `true` | Show the Dépôts tab |
| `k8sContext` | `''` | Watched `kubectl` context, chosen from the Kubernetes card of the panel among the contexts the machine detects; empty follows the current context |
| `showK8s` | `true` | Show the Kubernetes sections |
| `costLedger` | `~/.dsh/storages/cost-meter/ledger.json` | Ledger written by `dsh-cost-meter` (`days.<YYYY-MM-DD>.cost`, `.calls`, `config.currency`/`config.symbol`); empty hides the cost row. Not shown on the page — override it in the YAML only when the ledger lives elsewhere |
| `refreshSeconds` | `60` | Panel refresh cadence, in seconds, clamped between `15` and `900` |

```yaml
- insert:
    - id: systeme
      name: '@daedalforge/dsh-monitor'
      config:
        refreshSeconds: 60
        projectsRoot: '~/projects'
        showRepos: true
        k8sContext: ''
        showK8s: true
```

An empty field clears its key and falls back to the schema default. The panel follows `refreshSeconds` and the two card switches without a restart: they are volatile values, read at each build of the state.

Thresholds are edited from the panel and stored in `~/.dsh/storages/dsh-monitor/config.json`:

| Measure | Attention | Alert |
| --- | --- | --- |
| Free disk (host and Colima VM) | < 20 % | < 10 % |
| Memory used | > 80 % | > 90 % |
| Load | > 1 × cores | > 2 × cores |
| Battery | < 20 % | < 10 % |
| Dirty repository | > 3 days | > 7 days |
| Pod restarts | > 2 | > 5 |

Journal: `~/.dsh/storages/dsh-monitor/journal.jsonl`. Last Kubernetes state: `~/.dsh/storages/dsh-monitor/k8s-last.json`.

## Remediations

Every action requires a confirmation naming the target and the measured impact. Nothing runs without `confirm: true`; the outcome is written to the journal and the panel refreshes.

| Family | Actions |
| --- | --- |
| Process | SIGTERM then SIGKILL after 5 s — PID 1, system processes, the DSH host and container runtimes are protected |
| DSH | Stop a job of the current session, empty `~/.dsh/cache` |
| Disk | Docker prune without volumes, DSH cache, `node_modules` of repositories with no commit in 30 days, `dist/build/.next/target` artifacts of those repositories — never a git-tracked file |
| Kubernetes | `rollout restart` of a deployment, delete a pod, purge a finished job |

No Docker volume is ever removed, no secret is read, no git write is performed, no automatic remediation runs.

## Prerequisites

- DeepSeek Harness `>=0.2.1-rc.5 <0.3.0-0`. The range sits in `engines.dsh`, so a host outside it refuses the plugin rather than loading a panel it was never tested against.
- The app's own Node runtime, 20 or later. Nothing else is installed for the panel to work.
- macOS or Linux. Windows is not supported: the machine collectors branch on `process.platform` and otherwise read procfs.
- Optional tools. Each one enables a part of the panel; without it that part is hidden or reads `—`, never an error:

| Tool | Without it |
| --- | --- |
| `gh`, authenticated | pull request columns show `—` |
| `kubectl`, plus `docker` or `colima`, plus `kind` | the `Kubernetes` tab is hidden |
| `git`, with checkouts under `projectsRoot` | the `Dépôts` tab is hidden |

- No configuration file is required: the defaults (`~/projects`, a 60 s refresh, local same-origin requests only) apply as is.

## Install

```sh
dsh plugin --profile desktop add @daedalforge/dsh-monitor
```

Restart the application completely (Cmd+Q) — a new server route is not picked up by a client reload.

From a tarball or a git checkout:

```sh
dsh plugin --profile desktop add file:/path/to/daedalforge-dsh-monitor-<version>.tgz
```

Uninstall:

```sh
dsh plugin --profile desktop remove @daedalforge/dsh-monitor
```

Files under `~/.dsh/storages/dsh-monitor/` stay in place; delete them by hand if you want a clean slate.

## Architecture

- `lib/index.js` — server side: collectors, thresholds, actions, journal. Routes `/systeme/api/etat`, `/systeme/api/disque`, `/systeme/api/action`, `/systeme/api/journal`, `/systeme/api/reglages`. Requests must be local and same-origin; anything else gets a 403.
- `lib/k8s.js` — the Kubernetes reading: raw `kubectl` objects in, one model out (counters, capacity, causes, namespace rows, topology, components, activity). Pure and unit-tested, so the panel logic is verified without a live cluster.
- `lib/client.js` — the React panel loaded by the DSH client — `Système`, with its `Machine`, `Kubernetes` and `Dépôts` views — styles scoped under `.dsh-systeme` and `.dsh-kube`.
- `cordis.patch.yml` — inserts the `systeme` entry.

## Releases

The version is never set by hand. Every push to `main` reads the commits since the last `vX.Y.Z` tag and takes the highest bump their messages ask for:

| Commit messages since the last tag | Version |
| --- | --- |
| one starts with `feat:` | minor — `y` plus one, `z` back to zero |
| one carries `!` before the colon (`feat!:`, `fix!:`) or a `BREAKING CHANGE:` footer | major — `x` plus one, `y` and `z` back to zero |
| anything else (`fix:`, `chore:`, `docs:`, a plain sentence) | patch — `z` plus one |

It writes that version into `package.json` with a commit created through the GitHub API, so GitHub signs it; tags the commit; and opens a GitHub release. The release commit is skipped by the same trigger, so the workflow never loops. With no tag yet, the version sitting in `package.json` is released as is — that is the first release.

Opening the release is what publishes: a second workflow runs on `release: published`, checks the tag against `package.json`, runs the tests, publishes to npm with provenance, and attaches the tarball to the release. Publishing a release by hand from the GitHub interface therefore works the same way.

The release workflow writes to `main`, which a branch ruleset guards with a pull request and a verified signature. It does so under a dedicated GitHub App, whose installation token it mints with `actions/create-github-app-token`; that app sits on the bypass list of both rulesets, so the version commit, the tag and the release land without weakening the rules. Two secrets carry the identity: `APP_ID`, and `APP_PRIVATE_KEY` holding the app's private key. The release must be opened with that app token and not with `GITHUB_TOKEN`, or the `Publish` workflow would never run.

Trusted publishing only adds a version to a package that already exists; it cannot create the package. The very first version therefore has to be pushed by a person holding the npm account, with two-factor authentication enabled — a security key or an authenticator app, which npm asks for in the browser. From the tagged commit:

```sh
npm login
npm publish --access public
```

That first version is the only one without provenance. Everything after it goes through the workflow, which authenticates through npm trusted publishing: no token is stored in the repository, the workflow file is the credential.

```sh
npm trust github @daedalforge/dsh-monitor --repo daedalforge/dsh-monitor --file publish.yml --allow-publish
```

Run that once the package exists. The trust configuration lives inside the package, so deleting the package deletes it too — including the placeholder npm creates on its own while a staged publish is pending, and removes again when that staged publish is rejected.

A publish that fails can be replayed from the Actions tab, with the tag to publish as input.


## Limits

- Machine metrics use macOS tools (`vm_stat`, `sysctl`, `pmset`, `top`) or procfs/sysfs on Linux; `ps` and `df` are used on both. Kubernetes inspection assumes `docker` (or `colima`), `kind` and `kubectl`; the cluster itself is never created, started or stopped by the panel. The plugin reads nodes, pods, deployments, statefulsets, daemonsets, jobs, cronjobs, namespaces, PVCs, services, ingresses and external secrets, plus Warning events, and needs no metrics-server: reservations come from the pod specs, not from measured usage.
- No alerting outside the app, no metric history, no automatic remediation.
- The panel reads the disk and the repositories; it never modifies a git-tracked file.
- Stopping a job is only available for the current session.

## License

MIT — see [LICENSE](LICENSE).
