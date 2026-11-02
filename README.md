# dsh-monitor

A system panel for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): machine health, runtime state, the git repositories you work in, and a Kubernetes cluster — in one sidebar entry, without leaving the app.

The panel opens from the sidebar entry **Système** (order -100, first). Its interface is written in French.

## What it shows

- **Machine** — CPU, memory, disk, load average, battery, swap, a 24-minute CPU sparkline and the top processes. Memory follows the Activity Monitor definition (app + wired + compressed) instead of the naive `total - free`, which sits at ~99 % as soon as the OS keeps inactive pages. CPU is a delta over a real time window on both platforms: a `/proc/stat` sample on Linux, the second `top -l 2 -s 1` sample on macOS. Linux reads `/proc/meminfo`, `/proc/stat`, `/proc/swaps` and `/sys/class/power_supply` directly. When Colima is present, its VM disk is measured through `colima ssh -- df -kP` and reported separately from the host disk.
- **DSH** — active sessions, today's cost (from `dsh-cost-meter` when installed), running jobs, startup errors over 24 h, cache size, recent sessions.
- **Repositories** — git state of every repository under `projectsRoot` (dirty, ahead/behind, last commit, other local branches).
- **Kubernetes** — every namespace: ready nodes, active and non-ready pods, available and zero-replica deployments, jobs, statefulsets, daemonsets, suspended cronjobs, bound volumes, three reservation gauges against node allocatable, deduplicated signals (CrashLoopBackOff, ImagePullBackOff, pending pods, OOMKilled, restart thresholds, stuck rollouts, failed jobs, unbound volumes, node pressure) and recent Warning events grouped by (reason, object). The **Ressources** window lists deployments, pods, jobs, statefulsets, daemonsets, cronjobs and unbound volumes with per-namespace filtering and remediation gestures.
- **Empty sections hide themselves** — the Kubernetes block disappears while none of docker, kind, kubectl or colima is installed; the repositories block disappears while `projectsRoot` does not exist. Both come back on their own.

The panel refreshes on open, on window focus, and every 60 s while visible — no background polling. The last snapshot is cached in `localStorage` and painted immediately on the next open.

`/systeme/api/etat` always answers with the latest snapshot (stale-while-revalidate) and rebuilds in the background, so the panel never blocks on a slow probe. A snapshot is rebuilt at most every 15 s, with per-section caching for the expensive parts (repositories 3 min, runtime 90 s, cluster 20 s, machine and Colima disk 15 s). `?refresh=1` forces a rebuild after a remediation.

## Configuration

The plugin is configured on its `cordis.patch.yml` entry:

| Key | Default | Meaning |
| --- | --- | --- |
| `projectsRoot` | `~/projects` | Directory holding the git repositories to watch |
| `devspacePath` | `''` | Optional repository that owns the Kubernetes cluster definition (`common/devspace.yaml`); empty disables cluster creation |
| `k8sContext` | `''` | Expected `kubectl` context; empty means any context is accepted |
| `clusterName` | `devspace` | kind cluster name; the expected context defaults to `kind-<clusterName>` |

```yaml
- insert:
    - id: systeme
      name: '@daedalforge/dsh-monitor'
      config:
        projectsRoot: '~/projects'
        devspacePath: ''
        k8sContext: 'kind-devspace'
        clusterName: 'devspace'
```

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
| Cluster | Start Docker then the kind cluster (creation only when `devspacePath` is configured), stop with `colima stop` — the cluster and its volumes are kept, never `kind delete` |

No Docker volume is ever removed, no secret is read, no git write is performed, no automatic remediation runs.

## Install

```sh
dsh plugin --profile desktop add @daedalforge/dsh-monitor
```

Restart the application completely (Cmd+Q) — a new server route is not picked up by a client reload.

From a tarball or a git checkout:

```sh
dsh plugin --profile desktop add file:/path/to/daedalforge-dsh-monitor-0.3.0.tgz
```

Uninstall:

```sh
dsh plugin --profile desktop remove @daedalforge/dsh-monitor
```

Files under `~/.dsh/storages/dsh-monitor/` stay in place; delete them by hand if you want a clean slate.

## Architecture

- `lib/index.js` — server side: collectors, thresholds, actions, journal. Routes `/systeme/api/etat`, `/systeme/api/disque`, `/systeme/api/action`, `/systeme/api/journal`, `/systeme/api/reglages`. Requests must be local and same-origin; anything else gets a 403.
- `lib/client.js` — the React panel loaded by the DSH client, styles scoped under `.dsh-systeme`.
- `cordis.patch.yml` — inserts the `systeme` entry.

## Limits

- Machine metrics use macOS tools (`vm_stat`, `sysctl`, `pmset`, `top`) or procfs/sysfs on Linux; `ps` and `df` are used on both. Kubernetes and cluster start-up assume `docker` (or `colima`), `kind` and `kubectl`.
- No alerting outside the app, no metric history, no automatic remediation.
- The panel reads the disk and the repositories; it never modifies a git-tracked file.
- Stopping a job is only available for the current session.

## License

MIT — see [LICENSE](LICENSE).
