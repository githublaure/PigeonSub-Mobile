# Achats à vie dans « Où part votre argent ? »

Chantier partiel de l’issue #21, préparé sur `feat/lifetime-amortization-20261012` à partir de `feat/custom-categories-20261011` (`b0d27e1`). Attendre la validation et l’intégration des PR #18, #19 et #20 avant intégration finale. Cette branche ne modifie pas leurs références.

## Convention retenue

- Interrupteur local à la carte, désactivé au montage et réinitialisé au changement de session. Aucun enregistrement ni mutation des abonnements.
- Prix / 12 pendant l’intervalle de dates civiles `[date d’achat, premier anniversaire[`. Le jour d’achat est inclus ; le premier anniversaire est exclu. Pour un 29 février, l’anniversaire tombe le 28 février suivant. Pas de prorata journalier.
- La vraie `purchaseDate` est obligatoire. Dates absentes ou impossibles : montant amorti nul et lien vers le formulaire. Aucun remplacement par la date de création ou de renouvellement.
- Dates futures, achats anciens, essais non confirmés et enregistrements archivés/résiliés effectivement : aucune contribution à la carte.
- Prix nuls, négatifs ou non finis : zéro sans exception. Prix décimaux avec virgule acceptés. Calculs à pleine précision ; montants affichés arrondis au centime. Les pourcentages entiers sont répartis par plus grands restes pour totaliser 100 %. L’anneau conserve les parts exactes.

## Séparation des données réelles et analytiques

`monthlyCost()` et `currentMonthlyCost()` restent à zéro pour `lifetime`. Les budgets, projections 3/6/12 mois, économies de résiliation et échéances conservent leur base récurrente.

La carte affiche un total comparé, sa part récurrente et sa part amortie. Le détail donne le prix payé une fois, le coût amorti et la période. Les résiliations simulées d’un achat à vie ne sont pas présentées comme des prélèvements évitables. Le formulaire appelle son champ « Date d’achat » et masque « Prochain prélèvement » pour un achat à vie.

`categoryBreakdown()` reçoit les enregistrements déjà sélectionnés par `statsScenario()`. Anneau, légende, détails et premier poste consomment les mêmes groupes et contributions. Les identifiants de catégorie servent au regroupement ; les noms restent issus du catalogue actuel.

Le mode Famille complet n’est pas implémenté par cette PR. L’amortissement n’a aucune dépendance envers ce mode. Le paramètre facultatif `recurringCost` permet de composer une base récurrente calculée indépendamment avec l’amortissement ; les tests couvrent cette composition, sans inférer de participation familiale. Le futur chantier Famille doit encore gérer ses montants brut/net/potentiel, sa saisie, ses droits et la politique de contributions sur achats uniques. Aucun deuxième interrupteur inactif n’est présenté.

## Vérification automatisée

- `npm test` : suite existante et 18 tests supplémentaires (12 calculs, 6 contrats de composants/interactions).
- `npx --no-install tsc --noEmit`.
- `TZ=Europe/Paris node --test tests/lifetime-amortization.test.js` et même commande avec `TZ=America/Los_Angeles` : dates civiles, anniversaire, année bissextile.
- Export Metro/Hermes iOS et export statique Web.

Les tests de composants exécutent l’écran et les composants réels, avec des adaptateurs pour les éléments natifs, les hooks de service et l’état des hooks React. Ils couvrent les événements toucher/survol/focus, les liens, les valeurs et les libellés en paramètres iOS/Web, clair/sombre, 320/390/1280 px. Ce ne sont pas des tests de mise en page native ou de navigateur réel.

Le navigateur Chromium local était indisponible ; son téléchargement a échoué (archive invalide). Aucun essai sur iPhone réel, EAS ou TestFlight n’a été réalisé.

## Recette visuelle à effectuer avant intégration

1. Avec 20 €/mois récurrents et un achat à vie de 120 € récent : interrupteur désactivé = 20 €, activé = 30 € comparés (20 € récurrents + 10 € amortis). La projection et le budget restent à 20 €.
2. Vérifier au toucher mobile, au survol et au clavier Web les détails : 120 € payés une fois, 10 €/mois amortis, dates et absence de prélèvement récurrent. Le bouton Fermer doit replier le détail.
3. Retirer la date de l’achat : exclusion du total et lien vers « Date d’achat ». Remettre une date de plus d’un an : aucun coût amorti. Tester aussi un écran sans aucun coût récurrent.
4. Changer les vues statistiques, renommer/reclasser/supprimer une catégorie et vérifier l’accord entre le premier poste, l’anneau, la légende et les détails.
5. Vérifier petit écran, texte agrandi, thèmes clair/sombre, VoiceOver et clavier Web. Recharger/changer de session : simulation désactivée. Retirer Plus : retour à une vue autorisée sans masquer les achats.

Après validation des dépendances, reprendre uniquement le commit de ce chantier ou rebaser sur la base validée. Ne pas fusionner cette PR dans la branche de la PR #20 pour l’intégrer indirectement.
