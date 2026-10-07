# Accueil, catégories et Alertes — 7 octobre 2026

L’accueil présente les prix avant les libellés, une jauge de budget modifiable au crayon et un encadré doré avec les économies annuelles estimées après résiliations confirmées. En démo : 206,79 €/an confirmés et, séparément, 161,88 €/an supplémentaires possibles si la résiliation de Netflix est terminée. Il ne s’agit pas d’un solde bancaire ni d’argent déjà encaissé.

Les trois raccourcis donnent accès aux actifs, aux échéances sous sept jours et au calcul des économies. Les montants du petit raccourci sont arrondis à l’euro (« env. ») ; la grande carte et le détail gardent les centimes. Les essais déjà expirés restent visibles dans Essais et À surveiller et ne gonflent plus le compteur des échéances à venir.

Le pigeon chanteur illustre le carrousel À surveiller. La mention « à éviter cette semaine » s’affiche uniquement pour une échéance entre aujourd’hui et J+7 ; les autres suggestions portent « à examiner ». Les flèches continuent de parcourir les abonnements peu utilisés, mal notés ou à résilier. « Me le rappeler » ouvre leurs réglages de sûreté.

## Abonnements et catégories

- Abos ouvre toujours la liste, avec Tous par défaut, archives et essais inclus, triée par date d’ajout décroissante puis identifiant en cas d’égalité. Un deuxième appui sur l’onglet reste dans la liste. Les raccourcis de l’accueil appliquent la vue correspondante.
- Les vues et catégories défilent horizontalement, par glissement ou par flèches. Recherche, tri par échéance/nom/coût et bouton de sûreté restent combinables.
- Les icônes des catégories sont modifiables via le bouton de réglage à droite de CATÉGORIES. Le choix s’applique aux abonnements, essais et coupons. Les préférences sont locales, séparées par compte/invité/démo, incluses dans l’export et effacées avec le compte ou la réinitialisation de la démo concernée.
- Un coupon possède désormais une catégorie sélectionnable lors de l’ajout et de la modification. Les anciennes offres sans catégorie restent lisibles dans Autre. Les nouveaux exemples de démo sont catégorisés.
- Les catégories et leurs pictogrammes sont gratuits. L’import d’une photo comme icône d’un abonnement reste une fonction Plus, avec le même contrôle d’accès qu’avant.

## Alertes

L’onglet Agenda devient Alertes ; la route interne `/calendar` est conservée pour les liens et le guide. Les petites icônes dans les cases et la liste reprennent les photos d’abonnements déjà importées, avec une initiale en repli. Un compteur signale les autres événements du même jour.

La sélection d’un jour affiche les échéances **à partir de cette date**, sur les douze mois suivants, dans l’ordre chronologique. La liste charge trente événements à la fois ; le bouton suivant donne accès au reste de cette projection. Les filtres s’appliquent à la fois au mois et à la liste : orange pour la date de sûreté, violet pour le prélèvement/la fin d’essai/le premier paiement prévu. Les fins confirmées interrompent les projections et les dates passées ne sont pas un historique bancaire.

Le calendrier ne vaut pas activation d’une notification : celle-ci se règle dans la fiche. Les restrictions existantes sur web, Expo Go et démo restent en vigueur. Cette itération n’ajoute aucun achat ni nouveau paywall, aucune dépendance ni migration serveur.

## Vérification

- TypeScript sans erreur ; 73 tests unitaires réussis, notamment ordre Tous/récents, catégories anciennes/nouvelles, isolation des icônes, et événements filtrés après la date choisie.
- Parcours Chromium à 390 px et 320 px en thème sombre : chiffres, carrousel, fiche → Abos, nouvel appui Abos, vues d’accueil, catégories, icône conservée après rechargement et commune aux coupons, modification de catégorie d’une offre, essais filtrés, calendrier/listes/couleurs et absence de débordement horizontal.
- Guide complet sur démo remplie, accès aux rappels, budget, paywalls et restauration des espaces personnels contrôlés par `scripts/check-guide-web.cjs`. Le contrôle du défilement attend son résultat visible plutôt qu’un délai fixe pendant l’animation.
- Export JavaScript iOS de production réussi. Aucun build signé, achat réel, livraison de notification sur iPhone physique ou déploiement Replit n’est attesté par ces vérifications.

## Récupérer dans Replit

Arrêter Run, conserver d’éventuelles modifications locales, puis :

```sh
git stash push -u -m "avant-accueil-alertes"
git fetch origin
git switch main
git pull --ff-only origin main
```

Relancer Run et recharger la preview ou Expo Go. Les dépendances n’ont pas changé. Une publication du backend ne remplace pas le rafraîchissement du client Expo.
