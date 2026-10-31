# dsh-monitor — panneau Système

Panneau de santé de la machine, du runtime DSH, du workspace konoha, des dépôts de `~/projects` et du cluster kind-devspace. Il s'ouvre par l'entrée « Système » de la barre latérale (ordre -100, en tête, avant Missions).

## Ce qu'il montre

- **Machine** : CPU, mémoire, disque, charge, batterie, swap, sparkline CPU 24 minutes, top processus.
- **DSH** : sessions actives, coût du jour (cost-meter), jobs en cours, erreurs de démarrage sur 24 h, cache, sessions récentes.
- **Workspace konoha** : branche et état git, missions par statut, file d'ordonnancement, prochaine action, cohérence des fiches.
- **Dépôts** : état git des dépôts de `~/projects` (sale, ahead/behind, dernier commit), branches de mission.
- **Kubernetes** : cluster kind-devspace, contexte, nœuds, pods, deployments, jobs, événements, Docker/colima, dernier état connu quand le cluster est arrêté.
- **Journal des remédiations** : chaque action confirmée, datée, avec sa cible, son impact et son résultat.

Le panneau se rafraîchit à l'ouverture, au retour de focus, puis toutes les 60 secondes tant qu'il est visible. Aucun sondage en arrière-plan. Le dernier état reçu est conservé en `localStorage` ; à l'ouverture suivante, le panneau l'affiche immédiatement pendant que le serveur recalcule l'état.

## Remédiations

Chaque action exige une confirmation qui nomme la cible et l'impact mesuré. Rien ne part sans `confirm: true`. Le résultat est écrit dans le journal et l'état se rafraîchit.

| Famille | Actions |
| --- | --- |
| Processus | SIGTERM, puis SIGKILL après 5 s ; PID 1, processus système et hôte DSH protégés |
| DSH | Arrêt d'un job de la session courante, vidage de `~/.dsh/cache` |
| Disque | Purge Docker sans volumes, vidage du cache DSH, `node_modules` des dépôts sans commit depuis 30 jours, artefacts `dist/build/.next/target` de ces dépôts |
| Kubernetes | `rollout restart` d'un deployment, suppression d'un pod, purge d'un job terminé |
| Devspace | Démarrage de colima puis du cluster kind-devspace (commande documentée du dépôt devspace-saasoffice) ; arrêt par `colima stop` — le cluster kind et ses volumes sont conservés, aucun `kind delete` |

Garde-fous : aucune suppression d'un fichier suivi par git, aucun volume Docker, aucun secret lu, aucune écriture git, aucune action AKS, aucune remédiation automatique.

## Seuils

Valeurs par défaut, modifiables dans le panneau :

| Mesure | Attention | Alerte |
| --- | --- | --- |
| Disque libre | < 20 % | < 10 % |
| Mémoire utilisée | > 80 % | > 90 % |
| Charge | > 1 × cœurs | > 2 × cœurs |
| Batterie | < 20 % | < 10 % |
| Dépôt sale | > 3 jours | > 7 jours |
| Redémarrages de pod | > 2 | > 5 |

Configuration : `~/.dsh/storages/dsh-monitor/config.json`. Journal : `~/.dsh/storages/dsh-monitor/journal.jsonl`. Dernier état Kubernetes : `~/.dsh/storages/dsh-monitor/k8s-last.json`.

## Installation

```sh
# depuis la racine du dépôt konoha
cd config/tools/dsh-monitor
npm pack
mkdir -p dist && mv dsh-monitor-0.1.0.tgz dist/

# sauvegarde du profil avant écriture
mkdir -p ~/.dsh/backups/SLV-77-$(date +%Y%m%d)
for f in package.json pnpm-lock.yaml cordis.patch.yml cordis.yml pnpm-workspace.yaml; do
  cp -L ~/.dsh/profiles/desktop/$f ~/.dsh/backups/SLV-77-$(date +%Y%m%d)/$f
done
(cd ~/.dsh/backups/SLV-77-$(date +%Y%m%d) && shasum -a 256 * > SHA256SUMS)

# installation puis redémarrage complet de l'application (Cmd+Q)
dsh plugin --profile desktop add file:$PWD/dist/dsh-monitor-0.1.0.tgz
```

Le redémarrage complet est nécessaire : une nouvelle route serveur n'est pas chargée par un simple rechargement du client.

Désinstallation :

```sh
dsh plugin --profile desktop remove dsh-monitor
```

Les fichiers de `~/.dsh/storages/dsh-monitor/` restent en place ; les supprimer manuellement si nécessaire.

## Architecture

- `lib/index.js` : serveur (collecteurs, seuils, actions, journal). Routes `/systeme/api/etat`, `/systeme/api/disque`, `/systeme/api/action`, `/systeme/api/journal`, `/systeme/api/reglages`.
- `lib/client.js` : panneau React chargé par le client DSH, styles scopés sous `.dsh-systeme`.
- `cordis.patch.yml` : insertion du bundle `systeme`.

## Limites

- macOS local uniquement pour la machine ; les collecteurs supposent `ps`, `df`, `sysctl`, `pmset`.
- Pas d'AKS, pas d'alerting hors application, pas d'historique de métriques, pas de remédiation automatique.
- Le panneau lit le disque et les dépôts ; il ne modifie aucun fichier suivi par git.
- Le service jobs est fourni par le client DSH ; l'arrêt d'un job n'est disponible que pour la session courante.
