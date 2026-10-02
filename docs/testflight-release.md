# PigeonSub — candidat TestFlight

## Identité de l'application

- Bundle ID iOS : `app.replit.pigeonsub` (fiche App Store Connect existante).
- Équipe Apple : `6M88NDW8HP`.
- Source de cette préparation : `feat/store-ready-v1`, commit `89aa0b266126bb27049c1f536b082e595ae8ff02`.
- Objectif demandé : certificat réservé à PigeonSub. Aucun certificat n'est sélectionné par cette modification.

Le certificat reste un certificat de l'équipe Apple : « réservé » signifie qu'on choisit de ne l'utiliser que pour PigeonSub. Il faut sa clé privée, en plus du certificat public. Un fichier `.cer` seul ne permet pas de signer.

## Informations encore nécessaires

1. Identifier le projet de publication utilisé par Replit/Launch ou EAS (propriétaire + projectId). Le dépôt ne renseigne pas encore ces valeurs pour PigeonSub.
2. Rendre disponible dans ce projet une identité de signature valide réservée à PigeonSub, puis un profil App Store pour `app.replit.pigeonsub` signé par ce certificat. Ne pas révoquer une identité dont les dépendances restent inconnues.
3. Vérifier la variable `EXPO_PUBLIC_API_BASE_URL` dans l'environnement qui produit le build : URL HTTPS du backend publié et accessible sans le workspace Replit ouvert. Le placeholder dans `app.json` n'est pas une URL utilisable. La variable est publique et ne doit contenir aucun secret.
4. Relever l'Apple ID numérique de la fiche PigeonSub dans App Store Connect avant soumission.
5. Vérifier le dernier numéro de build déjà envoyé à Apple ; initialiser le compteur distant EAS en conséquence si nécessaire.

## Avec Replit/Launch

Sélectionner la fiche Apple existante PigeonSub. Contrôler dans la configuration effective du workflow que le Bundle ID est `app.replit.pigeonsub`, et que le certificat choisi est celui réservé à l'app. Launch peut générer ou remplacer la configuration Expo/EAS ; les fichiers de ce dépôt ne prouvent pas à eux seuls les valeurs utilisées par Launch.

## Avec EAS CLI

Cette voie nécessite l'accès au projet EAS choisi et la préparation des points ci-dessus ; elle n'est pas une migration automatique du projet géré par Replit.

Depuis le checkout de ce candidat, avec les dépendances installées :

```bash
npx eas-cli@latest whoami
npx eas-cli@latest project:info
npx expo config --type public
npx eas-cli@latest credentials -p ios
```

Dans les identifiants iOS, choisir `production` et vérifier l'association app/profil/certificat. Ne pas accepter une nouvelle création ou révocation pour contourner le quota sans avoir établi ce qui doit être conservé. Les clés privées et fichiers `.p12` restent dans les outils de signature autorisés, jamais dans le dépôt ou une conversation.

`eas.json` fournit un profil App Store nommé `production`, utilise les identifiants distants et incrémente le numéro de build. La configuration seule ne crée ni certificat ni association avec un projet EAS.

Après validation de l'identité, du backend et des identifiants :

```bash
npx eas-cli@latest build --platform ios --profile production
```

Après réussite du build, soumettre son identifiant précis :

```bash
npx eas-cli@latest submit --platform ios --profile production --id <ID_DU_BUILD_VALIDE>
```

Vérifier la fiche PigeonSub ciblée lors de la soumission. Après traitement par Apple, installer via TestFlight et tester connexion, liste des abonnements et persistance. L'envoi TestFlight ne publie pas automatiquement l'app sur l'App Store public.

## Validation de cette préparation

Les fichiers JSON et le changement ciblé de Bundle ID peuvent être vérifiés localement. La compilation iOS, la signature, le backend publié et l'installation TestFlight doivent encore être validés avec les accès correspondants.

Références : [EAS Build](https://docs.expo.dev/build/eas-json/), [numéros de build](https://docs.expo.dev/build-reference/app-versions/), [signature iOS](https://docs.expo.dev/app-signing/local-credentials/), [soumission iOS](https://docs.expo.dev/submit/ios/).
