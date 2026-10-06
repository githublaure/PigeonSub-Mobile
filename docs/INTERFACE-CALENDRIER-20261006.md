# Démarrage plume, calendrier et formulaires simplifiés

## Comportement

- La plume couvre la restauration du thème et de la session, puis la redirection initiale. Le contenu de l’app est révélé ensuite. L’animation est jouée une fois au lancement, pas à chaque navigation.
- Le mot-symbole de l’onboarding utilise la plume existante à la place de l’emoji pigeon.
- Les dates se choisissent dans un calendrier commun à iOS, Android et à la preview web : échéance, fin d’essai, sûreté, souscription, fin de coupon et fin effective de résiliation. Touchez le mois pour choisir un autre mois ou changer d’année.
- Les champs vides affichent « Choisir une date ». Aucune date d’exemple n’est présentée comme une valeur enregistrée.
- Une sûreté exige une échéance réelle et doit la précéder. Une échéance manquante est signalée sur le bon champ ; les erreurs sont actualisées quand une autre date change. Les jours incompatibles sont désactivés dans le calendrier.
- Le dégradé et les couleurs prédéfinies restent disponibles ; les commandes de luminosité et les légendes répétitives sont retirées. Le statut « Archivé » est explicite.
- Les limites gratuit/Plus, les calculs et les données restent ceux de la version précédente. Aucun changement de dépendances, de projet Expo ou d’identifiants Apple.

## Validation

- 47 tests automatisés, dont le cas sûreté au 1er décembre et prélèvement au 31 décembre, l’échéance vide, les fins d’essai et le 29 février.
- TypeScript et contrôle local Expo SDK 57.
- Parcours navigateur : démarrage avec chargement d’image volontairement retardé, mode invité, création/modification/rechargement de dates, contraintes entre dates, calendrier en sombre et à 320 px, coupon, réduction des animations.
- Export iOS de production. Ce contrôle n’est pas un build signé ni un essai sur iPhone.

Le passage du splash natif à la plume doit encore être confirmé dans TestFlight. Expo Go peut montrer son propre écran de lancement ; il ne reproduit pas exactement le splash de l’app publiée. Référence : https://docs.expo.dev/versions/latest/sdk/splash-screen/

## Récupération Replit

Arrêter Run puis exécuter chaque commande séparément. S’arrêter si une commande échoue.

```bash
cd ~/workspace
git status --short --branch
```

Si des modifications locales apparaissent, les conserver avant le changement de branche :

```bash
git branch backup/replit-before-calendar-$(date +%Y%m%d-%H%M%S)
git stash push -u -m "avant-correctifs-calendrier-20261006"
```

Ne pas réappliquer automatiquement ce stash. Il peut contenir une configuration de publication à examiner séparément.

```bash
git fetch origin
git switch main
git pull --ff-only origin main
npm run mobile:check
```

Si le contrôle signale des dépendances absentes, lancer `npm ci --include=dev`, puis refaire `npm run mobile:check`. Les versions des dépendances n’ont pas changé dans cette livraison.

Relancer Run pour Expo Go. Pour la preview navigateur :

```bash
npm run preview:web
```

Ouvrir le port 8083 dans Preview. Pour tester l’ordre du démarrage, fermer puis rouvrir l’app, ou recharger complètement la page ; Fast Refresh n’est pas un démarrage à froid.

## Sauvegarde

Le main précédent est conservé sur `backup/main-before-calendar-20261006-7476a5f`, au commit `7476a5f8cd00be393bf61faf36b53c1ebafd9542`.

## Accueil : dépenses, économies et renouvellements

- Le premier bloc doré regroupe « Ce que vous dépensez » (mensuel et annuel, hors essais) et « Économies potentielles ». Le potentiel correspond aux démarches de résiliation en cours ; ce n’est pas la totalité des dépenses, ni une économie déjà réalisée.
- Les résiliations confirmées restent distinctes, sous forme d’estimation annuelle.
- Les cinq prochaines échéances sont classées par date de renouvellement ou de fin d’essai. Les essais terminés à confirmer restent visibles. Les achats uniques et les échéances effectivement annulées ne sont pas affichés.
- Un raccourci signale une date de sûreté prioritaire si elle appartient à un autre abonnement, y compris au-delà des cinq renouvellements affichés.
- Les cartes montrent le nom, le tarif, l’échéance et la sûreté, avec les actions Conserver / Résilier. Les grands encadrés d’économie par abonnement sont supprimés de l’accueil ; le détail reste dans la fiche.
- La vue des essais est accessible par une ligne compacte. La démo reste un petit badge.

Validation complémentaire : 48 tests au total, TypeScript, parcours navigateur (ordres des échéances, distinction des trois montants, actions, essais, deux thèmes, affichage à 320 px et sûreté au-delà des cinq premières échéances), export iOS. Aucun build signé TestFlight lancé.

Captures : [clair](previews/home-summary-light.png), [sombre](previews/home-summary-dark.png), [écran étroit](previews/home-summary-narrow.png).
