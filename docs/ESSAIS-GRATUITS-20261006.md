# PigeonSub — essais gratuits et cohérence de l’offre

## Source et sauvegarde

Travail depuis `main` au commit `3c4deda9229584f5fa9efcf2784a58a112df427f`.
Sauvegarde GitHub créée **avant toute fusion** :
`backup/main-before-trials-20261006-3c4deda`.
Branche de correction : `feat/free-trials-consistency`.
Les sauvegardes TestFlight SDK 54 et des précédentes livraisons restent disponibles.

## Règles produit retenues

| Fonction | Gratuit | Plus |
|---|---|---|
| Abonnements actifs, essais compris | 5 au total | Nombre illimité |
| Date de sûreté personnalisée | Les 5 abonnements gratuits | Tous |
| Rappel local | Un rappel par échéance ; un seul pour la fin d’un essai | Même comportement, sur tous les abonnements |
| Photos | 5 par abonnement gratuit | Capacité étendue par abonnement |
| Coûts, calendrier, stats, économies estimées | Inclus | Inclus |
| Aide générique à la résiliation et confirmation | Incluses | Incluses |
| Historique des décisions et résiliations | Dernier état accessible | Historique affiché |
| Export personnel | Gratuit, archives comprises, photos locales en option | Identique |

Le plafond technique des photos Plus reste de 10 par abonnement. Il n’est pas mis en avant dans le parcours commercial ; aucune promesse de photos illimitées n’est faite. Après un retour au gratuit, aucune donnée ni photo existante n’est supprimée. Les cinq enregistrements actifs les plus anciens conservent leurs options gratuites. La désactivation d’un rappel existant reste possible même en dehors de ces cinq emplacements.

Le document de stratégie qui proposait un seul essai gratuit actif, trois documents et des dates de sûreté exclusivement payantes est remplacé, pour cette livraison, par les règles ci-dessus.

## Essais suivis chez d’autres services

- Dans l’ajout/modification : choix « Abonnement en période d’essai », date de fin obligatoire, tarif après essai, fréquence récurrente, premier prélèvement facultatif s’il coïncide avec la fin de l’essai, date de sûreté.
- Un premier prélèvement antérieur à la fin de l’essai est refusé. Un achat à vie ne peut pas être déclaré comme essai d’un abonnement récurrent.
- Une vue « Essais gratuits » dans Coupons utilise les mêmes fiches que la liste des abonnements. Aucune seconde copie n’est créée.
- Accueil et fiche affichent la fin de l’essai, le tarif futur et l’action « Arrêter l’essai ». Un lien HTTPS personnel de gestion/annulation peut être enregistré sur la fiche.
- Le total actuel exclut tout essai non confirmé payant. Un second total montre le coût si les essais non résiliés deviennent payants. Le graphique de projection les inclut seulement à partir du premier prélèvement prévu et reste explicitement conditionnel.
- Après la date de fin, l’essai devient « terminé · à confirmer ». L’utilisateur vérifie chez le fournisseur, puis confirme le passage payant ou suit son annulation. Aucun paiement bancaire n’est présumé observé.
- La fin d’essai est une échéance unique : elle n’est jamais répétée mensuellement dans les notifications. Les abonnements confirmés payants reprennent leurs échéances récurrentes.
- Les économies restent des projections annualisées ; une confirmation manuelle de résiliation n’est ni un remboursement ni un historique bancaire.

La conversion utilise les champs existants (`isTrial`, `trialEndsAt`, `nextRenewal`). **Aucune migration de base de données n’est nécessaire.** Liens personnels, décisions, coupons et nouvelles photos restent locaux et isolés par compte, invité et démo. Le lien d’annulation est ouvert uniquement à la demande de l’utilisateur. La démo présente un essai fictif Canva.

## Export gratuit

Profil → Mes données et confidentialité → Exporter mes données.

JSON comprenant abonnements actifs/archivés, suivis, réglages et coupons de l’espace ouvert. Option pour inclure les images locales encodées ; les anciennes pièces jointes par URL restent des liens. Aucune lecture globale du stockage, aucun jeton d’accès ni justificatif d’achat Apple n’est exporté. Le changement de session pendant la collecte interrompt l’export.

Web : téléchargement. iOS/Android : feuille native de partage pour enregistrer dans Fichiers ou un autre emplacement choisi. L’utilisateur doit vérifier l’enregistrement après avoir fermé la feuille. **Pas d’import automatique dans cette version.**

## Offres PigeonSub Plus

Les tarifs prévus restent 2,99 €/mois, 19,99 €/an mis en avant et 34,99 € pour Fondateur à vie. Les prix réellement retournés par la boutique priment. Le Lifetime concerne les fonctions Plus décrites, sans promesse de futures fonctions IA illimitées.

Le suivi des essais des services tiers est distinct des **7 jours d’essai de PigeonSub Plus**. Le bouton de sept jours apparaît uniquement si RevenueCat retourne une offre réellement gratuite de sept jours et une éligibilité vérifiée. Aucun essai ne démarre lors de l’onboarding. Sans configuration boutique, l’achat reste indisponible et le gratuit utilisable.

À vérifier dans App Store Connect et RevenueCat avant d’annoncer l’essai Plus actif : produit annuel, offre d’introduction gratuite d’une semaine, groupe d’abonnements, produits/offering/entitlement et clés publiques pour la bonne app, puis achat/annulation/restauration dans TestFlight. Cette configuration externe n’a pas été modifiée ici.

Ne pas annoncer comme disponibles : rappels multiples par échéance, voix IA finalisée, synchronisation complète des données locales, import automatique ou résiliation automatique chez les fournisseurs.

## Récupérer la version dans Replit

À la racine du projet mobile. Exécuter chaque étape uniquement si la précédente réussit.

```sh
cd ~/workspace
git status --short --branch
git branch backup/replit-before-trials-20261006
git stash push -u -m "replit-before-trials-20261006"
git fetch origin
git switch main
git pull --ff-only origin main
npm ci --include=dev
npm run mobile:check
npm test
npx tsc --noEmit
npm run preview:web
```

Si la branche de sauvegarde locale existe déjà, conserver cette branche et choisir un nouveau suffixe pour une sauvegarde supplémentaire. Un stash reste **local** à Replit et n’est pas envoyé par `git push`. Les fichiers ignorés, notamment les variables d’environnement, ne sont pas déplacés par `stash -u`. Ne pas réappliquer automatiquement le stash sur la nouvelle version.

Si le pull refuse à cause de commits locaux divergents, conserver cette sauvegarde et examiner les différences ; ne pas utiliser `reset --hard` ou un push forcé.

La commande de preview garde le terminal occupé. Pour les autres commandes, ouvrir un autre Shell. Le retour à Expo Go peut utiliser `npx expo start --tunnel --go` avec Expo Go compatible SDK 57.

## Préparer le prochain build TestFlight

```sh
npm run mobile:export:ios
```

Cette commande vérifie le bundle de production iOS ; **elle ne lance pas un build signé ni un envoi TestFlight**.

Dans la publication mobile Replit, réutiliser le projet Expo géré par Replit et l’application App Store Connect existants. Sélectionner le `main` actualisé et un numéro de build supérieur au dernier envoyé. Ne pas créer un nouveau projet Expo ni changer l’owner, le bundle identifier ou l’équipe Apple. Le flux Replit ayant déjà réussi peut injecter ses identifiants dans `app.json` ; comparer les paramètres de publication avec la sauvegarde locale si nécessaire, sans restaurer tout l’ancien fichier.

Les nouveaux modules d’export sont compatibles SDK 57 et verrouillés : `expo-file-system` ~57.0.7 et `expo-sharing` ~57.0.22. Le lockfile conserve exclusivement des URL HTTPS publiques npm avec intégrités, ainsi que le correctif `shell-quote` 1.11.0.

## Vérifications

- Tests métier : dates, limites gratuites communes, expiration non automatique, confirmation payante, projections, rappel d’essai unique et liens HTTPS.
- Parcours web réel en largeur téléphone : création/validation, conservation de la date de sûreté, fin d’essai, confirmation/annulation, coûts, photo réellement ajoutée et export JSON avec cette photo, archives, séparation invité/démo, thèmes clair/sombre et largeur 320 px.
- TypeScript, installation propre, contrôle du lockfile, export iOS de production et prebuild iOS isolé.
- Restent à vérifier sur iPhone : feuille de partage vers Fichiers, réception d’une notification réelle et achats/restaurations/offre Apple de sept jours. Aucun build signé n’a été lancé depuis cet environnement.
