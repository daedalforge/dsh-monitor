# dsh-monitor — panneau Système

Panneau de santé de la machine, du runtime DSH, du workspace konoha, des dépôts de `~/projects` et du cluster kind-devspace. Il s'ouvre par l'entrée « Système » de la barre latérale (ordre -100, en tête, avant Missions).

## Ce qu'il montre

- **Machine** : CPU, mémoire, disque, charge, batterie, swap, sparkline CPU 24 minutes, top processus. La ligne « Mémoire » suit la définition du Moniteur d'activité (mémoire d'application + câblée + compressée) ; elle n'affiche donc plus le `total − libre` de `os.freemem()`, qui plafonne à ~99 % dès que macOS garde des pages inactives et du cache de fichiers. La part active (pages actives + câblées) est affichée à côté : c'est le chiffre que rapporte btop, plus bas que celui du Moniteur d'activité de tout le volume compressé. Le CPU est un delta sur une vraie fenêtre de temps des deux côtés : échantillon de `/proc/stat` sous Linux, second échantillon de `top -l 2 -s 1` sous macOS (et non la moyenne depuis le démarrage que donne `top -l 1`). Sous Linux, les mêmes mesures viennent directement du noyau — `/proc/meminfo` (pourcentage au sens `MemAvailable`), `/proc/stat`, `/proc/swaps` et `/sys/class/power_supply` — donc sans installer d'outil : la source est la même que celle de `free` et de btop.
- **DSH** : sessions actives, coût du jour (cost-meter), jobs en cours, erreurs de démarrage sur 24 h, cache, sessions récentes.
- **Workspace konoha** : branche et état git, missions par statut, file d'ordonnancement, prochaine action, cohérence des fiches.
- **Dépôts** : état git des dépôts de `~/projects` (sale, ahead/behind, dernier commit), branches de mission.
- **Kubernetes** : cluster kind-devspace, contexte, nœuds, pods, deployments, jobs, événements, Docker/colima, dernier état connu quand le cluster est arrêté. Le démarrage et l'arrêt de Docker suivent la plateforme : colima puis Docker Desktop sur macOS, service utilisateur `docker-desktop` sous Linux — le service système `docker.service` demande root et le panneau ne le lance pas lui-même.
- **Sections vides** : le bloc Kubernetes — carte, indicateur « Cluster » du bandeau et mention dans le sous-titre — est masqué tant qu'aucun outil de la chaîne (docker, kind, kubectl, colima) n'est installé ; la section Dépôts l'est si `~/projects` n'existe pas. La grille des indicateurs se répartit sur le nombre de cartes restantes. Tout réapparaît de lui-même dès que la condition est remplie.

Le panneau se rafraîchit à l'ouverture, au retour de focus, puis toutes les 60 secondes tant qu'il est visible. Aucun sondage en arrière-plan. Le dernier état reçu est conservé en `localStorage` ; à l'ouverture suivante, le panneau l'affiche immédiatement pendant que le serveur recalcule l'état.

L'endpoint `/systeme/api/etat` répond toujours avec le dernier instantané disponible (stale-while-revalidate) et lance la reconstruction en arrière-plan : le panneau ne reste jamais bloqué sur un calcul de 20 s. Un instantané est reconstruit au plus toutes les 15 s, et les sections les plus coûteuses sont mises en cache pour éviter de relancer des dizaines de processus à chaque sondage : dépôts 3 min, workspace konoha et runtime DSH 90 s, cluster 20 s, machine 15 s. `?refresh=1` force une reconstruction (après une remédiation), et le panneau enchaîne jusqu'à quatre revalidations à 3 s d'intervalle tant que l'instantané reçu est marqué `stale`.

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

Configuration : `~/.dsh/storages/dsh-monitor/config.json`. Journal : `~/.dsh/storages/dsh-monitor/journal.jsonl` — toujours écrit, plus affiché dans le panneau. Dernier état Kubernetes : `~/.dsh/storages/dsh-monitor/k8s-last.json`.

## Installation

```sh
# depuis la racine du dépôt konoha
cd config/tools/dsh-monitor
npm pack
mkdir -p dist && mv dsh-monitor-0.1.4.tgz dist/

# sauvegarde du profil avant écriture
mkdir -p ~/.dsh/backups/SLV-77-$(date +%Y%m%d)
for f in package.json pnpm-lock.yaml cordis.patch.yml cordis.yml pnpm-workspace.yaml; do
  cp -L ~/.dsh/profiles/desktop/$f ~/.dsh/backups/SLV-77-$(date +%Y%m%d)/$f
done
(cd ~/.dsh/backups/SLV-77-$(date +%Y%m%d) && shasum -a 256 * > SHA256SUMS)

# installation puis redémarrage complet de l'application (Cmd+Q)
dsh plugin --profile desktop add file:$PWD/dist/dsh-monitor-0.1.4.tgz
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

- Machine : macOS par ses outils système (`vm_stat`, `sysctl`, `pmset`, `top`), Linux par `/proc` et `/sys` (`ps`/`df` dans les deux cas). Les sections DSH, konoha et dépôts sont communes ; Kubernetes et Devspace supposent `docker`, `kind` et `colima`.
- Pas d'AKS, pas d'alerting hors application, pas d'historique de métriques, pas de remédiation automatique.
- Le panneau lit le disque et les dépôts ; il ne modifie aucun fichier suivi par git.
- Le service jobs est fourni par le client DSH ; l'arrêt d'un job n'est disponible que pour la session courante.
