# Preview Replit — retour au lancement mobile direct, 7 octobre 2026

## Ce qui a changé

Le premier correctif du 7 octobre lançait un aperçu web en plus du natif et
activait `EXPO_UNSTABLE_HEADLESS=1` dans `scripts/start-preview.cjs` pour éviter
le débogueur desktop, qui échouait sur une bibliothèque Linux manquante.

L'inspection du paquet exact `@expo/cli@57.0.27` confirme que ce mode désactive
aussi l'interface interactive et son QR lorsque `expo start` installe son journal.
Cela explique l'absence possible du QR dans la console ; cela ne démontre pas
que le script contrôle les boutons Replit **Open in Expo Go** ou **TestFlight**.

Le commit `6ecc632`, ajouté pendant le diagnostic, a retiré le workflow web et
rétabli `npm start -- --go --port 8081`. Le présent complément conserve ce choix
et restaure explicitement le proxy HTTPS natif que l'ancien wrapper configurait.

## Configuration actuelle

- **Run → Project** démarre **Start Expo** et **Start Backend**.
- **Start Expo** lance directement l'Expo local via `npm start`, avec `--go`
  et le port 8081.
- Le workflow définit `EXPO_PACKAGER_PROXY_URL` à partir de
  `REPLIT_EXPO_DEV_DOMAIN`. Il s'arrête avec un message explicite si cette
  variable manque, plutôt que de construire une adresse incomplète.
- Le port natif conserve le mapping **8081 → 80** et le backend **8082 → 3000**.
- Run ne passe plus par `scripts/start-preview.cjs` et ne force donc plus son
  réglage headless.
- Le workflow web et son mapping **8083 → 3001** sont retirés de la configuration
  Replit. Les scripts web restent dans le dépôt pour des usages manuels, mais
  l'ancien lien externe sur 3001 n'est plus le parcours normal.

Ce complément ne change ni le SDK et le lockfile, ni les identifiants
Expo/Apple, ni les données, ni la configuration de publication backend.

## Récupérer dans Replit

1. Cliquer **Stop** et arrêter aussi un éventuel ancien workflow web.
2. À la racine du projet, examiner l'état local :

```sh
git status --short --branch
```

Si des fichiers modifiés sont listés, les conserver avant le changement de branche :

```sh
git stash push -u -m "avant-retour-preview-mobile-20261007"
```

Le stash ne doit pas être réappliqué intégralement sans examiner son contenu :
il pourrait rétablir l'ancienne configuration. Les secrets ignorés par Git ne
sont pas inclus dans le stash.

Après conservation des changements locaux, récupérer main une commande à la fois :

```sh
git fetch origin
git switch main
git pull --ff-only origin main
npm run mobile:check
```

Les dépendances ne changent pas : une réinstallation systématique n'est pas
nécessaire. Si `mobile:check` signale une installation absente ou différente du
lockfile, arrêter Metro puis exécuter `npm ci`. Si Git refuse une divergence,
conserver le message et comparer les changements, sans forcer la récupération.

3. Rafraîchir l'éditeur Replit pour recharger les workflows.
4. Cliquer **Run**, puis ouvrir **Console → Start Expo**.
5. Dans **Preview**, ouvrir le sélecteur d'appareil et vérifier l'accès Expo Go.
6. Vérifier séparément le bloc **Production** dans **Publishing** pour le parcours
   App Store/TestFlight.

## Si l'accès Expo Go reste absent

Le QR normal d'Expo exige un terminal interactif. Son absence dans une console
non interactive ne signifie pas que le serveur natif est arrêté.

Avec Run en marche, contrôler son endpoint depuis un Shell :

```sh
curl -fsS 'http://127.0.0.1:8081/_expo/open?platform=ios&runtime=expo'
```

La réponse doit annoncer le runtime `expo` et le domaine natif Replit. Les URLs
de bundle du manifeste iOS doivent utiliser le proxy HTTPS, sans port 8081.
La réponse du CLI peut représenter le lien sous la forme `exp://domaine:443`.
Pour une ouverture explicite avec HTTPS dans Expo Go, le lien du proxy natif est
`exps://<REPLIT_EXPO_DEV_DOMAIN>`.

Si `REPLIT_EXPO_DEV_DOMAIN` manque, ou si le menu mobile et le parcours Apple
restent absents, conserver les captures et les logs du Replit réel : cette
configuration ne peut pas recréer à elle seule les métadonnées de projet de la
plateforme. Ne pas changer les comptes Expo ou les certificats pour ce diagnostic.

Le lancement direct peut réafficher l'erreur du débogueur desktop auparavant
évitée par headless. Distinguer cette erreur des messages de démarrage de Metro ;
le débogueur est un composant séparé. Ne pas réactiver aveuglément headless si
l'objectif est de retrouver l'interface Expo standard.

## Portée de la validation

Les contrôles portent sur le lancement et le proxy natif, dans une application
minimale utilisant les dépendances réelles verrouillées de PigeonSub. Ils ne
remplacent pas un essai des parcours de l'application dans le Replit réel, un
scan sur l'iPhone ou un build signé. Les résultats précis sont consignés dans la
pull request du complément.

## Sources

- [Expo CLI : cible Expo Go, proxy et endpoint de lien](https://docs.expo.dev/more/expo-cli/)
- [CLI 57.0.27 : conditions de l'interface interactive](https://github.com/expo/expo/blob/9349d1457178dd9cccb8bdd3aed47473c49134e1/packages/@expo/cli/src/utils/interactive.ts)
- [Parcours mobile Replit](https://docs.replit.com/features/artifact-types/building-mobile-apps)
