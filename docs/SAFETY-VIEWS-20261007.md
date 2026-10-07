# Dates de sûreté et visibilité du gratuit — 7 octobre 2026

## Règle de l’offre

L’offre gratuite comprend 5 abonnements actifs, essais compris. Chacun peut avoir une date de sûreté personnalisée, un rappel et 5 photos. Le budget, les économies estimées, le calendrier, les coupons et l’export restent gratuits. Plus étend le nombre d’abonnements et leurs réglages, et ajoute les fonctionnalités déjà recensées dans l’audit Premium.

Après un retour de Plus vers Gratuit, les données existantes restent lisibles ; les réglages sont réservés aux cinq abonnements actifs les plus anciens. Le bouton d’affichage/tri ne modifie pas ces droits.

Les avantages gratuits ont une carte à coches vertes dans Profil et dans les offres Premium. Le formulaire et la fiche d’abonnement précisent que la date personnalisée et le rappel sont inclus gratuitement lorsqu’ils le sont. Les présentations contextuelles distinguent « Inclus gratuitement » et « En plus avec Premium ».

## Bouton à trois états

Disponible sous le titre des échéances de l’accueil et dans les commandes de la liste Abos.

| État | Icône et libellé | Effet |
|---|---|---|
| Initial | Bouclier contour · Afficher la sûreté | Dates masquées sur les cartes ; ordre habituel. |
| Premier clic | Bouclier coché · Sûreté visible | Affiche les dates sans changer l’ordre. |
| Deuxième clic | Entonnoir et flèche · Tri par sûreté | Dates dépassées d’abord, puis dates futures par ordre croissant. |
| Troisième clic | Bouclier contour | Masque les dates et restitue l’ordre précédent. |

Sur l’accueil, le tri est appliqué à toutes les échéances avant d’en afficher cinq : un renouvellement éloigné avec un long préavis peut ainsi remonter. Les abonnements sans date restent en fin de liste dans Abos ; le tri ne supprime aucun résultat. Les archives ne montrent pas de date de sûreté active. Les vues, la recherche et la sélection de jour restent applicables. Choisir un autre tri dans Abos conserve les dates visibles et désactive le tri par sûreté.

Le réglage d’affichage est propre à chaque écran et revient à l’état initial après un rechargement ou un changement de session. Les calculs existants (préavis, date personnalisée, marge avant échéance, renouvellements et essais) ne changent pas. L’affichage d’une date n’active pas un rappel.

## Vérifications

- 61 tests réussis, dont un cas de tri avec préavis long, essai dépassé, date personnalisée, égalités, résiliation confirmée, archive, achat unique et absence de date.
- TypeScript sans erreur et export Expo iOS réussi ; aucun build TestFlight effectué.
- Parcours navigateur `scripts/check-safety-web.cjs` : trois états sur les deux écrans, conservation du tri précédent, recherche/vues, tri accessible en gratuit, réglages disponibles sur les cinq premiers abonnements et verrouillés sur un sixième conservé après rétrogradation.
- Inspection visuelle à 390 px en clair et 320 px en sombre, sans débordement horizontal ni erreur de page ou de boutons imbriqués.

## Aperçus

- [Accueil trié par sûreté](previews/safety-home-sorted.png)
- [Liste des abonnements](previews/safety-subscriptions-sorted.png)
- [Avantages gratuits dans Profil](previews/safety-free-benefits.png)
- [Affichage sombre étroit](previews/safety-dark-narrow.png)
