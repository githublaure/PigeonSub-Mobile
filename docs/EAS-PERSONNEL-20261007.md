# PigeonSub — préparation EAS personnel, 7 octobre 2026

Cette branche prépare un build avec le compte Expo `githublaure` vers la fiche
Apple existante. Elle ne transfère pas le projet EAS géré par Replit.
Aucun build, envoi TestFlight ou changement de certificat n'a été effectué.

## Identité confirmée par Laure

- Bundle ID Apple : `app.replit.pigeonsub`.
- Apple ID numérique de l'application : `6807818710`.
- Propriétaire Expo prévu : `githublaure`.
- Slug conservé : `pigeonsub`.

`app.json` contenait `com.pigeonsub.app` pour iOS : cette branche le corrige.
`eas.json` vise la fiche existante via `ascAppId`. Aucun `projectId` EAS
n'est inventé : il sera ajouté par `eas init` dans la session de Laure.
La version utilisateur reste `1.0.0` en attendant de connaître la dernière
version TestFlight. Le compteur distant doit être initialisé AVANT le build.

Les dépendances, le SDK 57, le code fonctionnel, Android et le workflow Replit
sont conservés. Il n'y a pas de source native iOS/Android suivie dans la base
de cette branche. Les dossiers générés sont ignorés pour qu'EAS régénère le
natif avec le Bundle ID corrigé. Ne pas y conserver de modifications natives
manuelles non reportées dans des config plugins.

## 1. Comparer l'état Replit au dépôt avant de préparer la copie

Dans le Shell Replit à la racine du projet :

```sh
git fetch origin
git status --short --branch
git log --oneline origin/main..main
```

Le dernier état communiqué était `main [ahead 3]`, avant actualisation des
références. Si la dernière commande liste encore des commits, examiner leurs
différences et intégrer les changements utiles dans la branche EAS avant tout
build. Une branche distante ne contient pas automatiquement les commits et
fichiers modifiés restés dans Replit. Ne pas faire de reset forcé.

Une fois les différences examinées, créer une copie Git de travail séparée.
Exécuter les commandes une à une et arrêter en cas d'erreur :

```sh
git worktree add -b build/eas-personal-20261007 ../pigeonsub-eas-personal origin/build/eas-personal-20261007
cd ../pigeonsub-eas-personal
npm ci --include=dev
npm run mobile:check
npx eas-cli@latest whoami
```

Si cette branche ou ce dossier existe déjà, inspecter son état au lieu de le
remplacer. La copie principale conserve ses workflows et ses fichiers locaux.
Les fichiers ignorés, notamment `.env`, ne sont pas copiés dans un worktree.

## 2. Lier le projet EAS personnel

Si `whoami` indique déjà `githublaure`, conserver cette connexion.
Sinon, utiliser `npx eas-cli@latest login` et vérifier de nouveau le compte.

```sh
npx eas-cli@latest init
npx eas-cli@latest project:info
git diff -- app.json
```

Vérifier `@githublaure/pigeonsub` et le `extra.eas.projectId` généré.
Si un projet homonyme existe, vérifier qu'il correspond à PigeonSub avant
d'accepter de le lier. Ne pas remplacer un identifiant géré par Replit avec
`--force`. Conserver ensuite le véritable `projectId` sur cette branche :

```sh
git add app.json
git commit -m "Link PigeonSub to personal EAS project"
git push -u origin build/eas-personal-20261007
```

## 3. Reprendre le compteur TestFlight

Dans App Store Connect → PigeonSub → TestFlight → iOS, relever la dernière
version et son numéro de build (par exemple `1.0.0 (27)`, exemple seulement).
Vérifier également les builds récents en cours de traitement.

Adapter `expo.version` si nécessaire. Initialiser le compteur EAS avec le
dernier numéro de build existant, pas avec un numéro arbitraire :

```sh
npx eas-cli@latest build:version:set --platform ios --profile production
```

Le profil `production` active `autoIncrement` : le build suivant incrémentera
ce compteur. Si une autre chaîne de publication continue à produire des builds,
coordonner les numéros avant le lancement pour éviter les doublons.

## 4. Configurer le backend pour le cloud

Le code lit `EXPO_PUBLIC_API_BASE_URL`. La valeur de secours dans `app.json`
est encore un placeholder et ne fournit pas de backend utilisable.
Les variables Replit et les anciens secrets d'un autre projet EAS ne sont pas
automatiquement copiés vers le projet personnel.

Dans les variables du projet EAS personnel, environnement `production`,
définir `EXPO_PUBLIC_API_BASE_URL` avec l'URL HTTPS publiée et vérifiée du
backend PigeonSub. Cette URL est publique et intégrée au bundle.
Ne pas utiliser une URL Metro (`exp.direct` ou `expo.kirk.replit.dev`) ni
`localhost`. Ne pas inventer une URL de production.

Reporter aussi les variables publiques déjà utilisées et nécessaires :
`EXPO_PUBLIC_REVENUECAT_IOS_KEY` et `EXPO_PUBLIC_PRIVACY_POLICY_URL`,
si les achats doivent fonctionner. Les clés privées Apple, de base de données
et de services backend ne doivent jamais être placées dans `EXPO_PUBLIC_*`.

## 5. Vérifier la signature Apple

```sh
npx eas-cli@latest credentials --platform ios
```

Choisir le profil `production` et l'équipe Apple qui possède
`app.replit.pigeonsub`. Vérifier cette équipe à l'écran avant de valider.

La présence d'un certificat sur le portail Apple n'assure pas que sa clé
privée soit accessible depuis le compte Expo personnel. Pour réutiliser une
signature, EAS doit disposer du certificat AVEC sa clé privée (.p12) et d'un
profil compatible. Le projet EAS personnel ne récupère pas automatiquement
les credentials stockés dans le projet géré par Replit.

Compte tenu de la limite de certificats déjà rencontrée, ne pas révoquer un
certificat ni en créer un aveuglément. Si EAS ne propose pas de signature
réutilisable, relever le message : il faudra récupérer les credentials
autorisés existants ou décider explicitement d'une autre signature.
Ne pas transmettre les clés privées ou leurs mots de passe dans le chat.

## 6. Construire et soumettre après résolution des points précédents

Vérifier également l'icône de publication : la configuration de départ ne
définit pas `expo.icon`. Ce correctif de compte/signature ne fournit pas
une nouvelle icône.

La commande suivante déclenche un build iOS cloud :

```sh
npx eas-cli@latest build --platform ios --profile production
```

Quand le build a réussi, utiliser son identifiant précis pour l'envoi :

```sh
npx eas-cli@latest submit --platform ios --profile production --id ID_DU_BUILD_REUSSI
```

Remplacer `ID_DU_BUILD_REUSSI` par l'ID EAS obtenu. La cible Apple du profil
est `6807818710`. L'envoi à TestFlight ne constitue pas une publication
publique sur l'App Store.

## Vérification et limites

La configuration a été résolue avec @expo/config et les dépendances SDK 57
existantes dans une copie isolée : propriétaire, Bundle ID et sept plugins
chargés. Les champs EAS et la portée du diff ont été contrôlés. Ces contrôles
ne valident pas la disponibilité de l'API de production,
les credentials Apple, la compilation Xcode, la réception TestFlight ou le
fonctionnement sur iPhone. Ces contrôles nécessitent les sessions concernées.

## Références

- [EAS Submit et ascAppId](https://docs.expo.dev/submit/ios/)
- [Compteur distant et build:version:set](https://docs.expo.dev/build-reference/app-versions/)
- [Configuration eas.json](https://docs.expo.dev/eas/json/)
- [Variables EAS](https://docs.expo.dev/eas/environment-variables/)
- [Credentials existants](https://docs.expo.dev/app-signing/existing-credentials/)
