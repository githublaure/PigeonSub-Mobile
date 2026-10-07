# Démo enrichie et calcul des économies — 7 octobre 2026

Les 161,88 € de l’accueil correspondent à Netflix : 13,49 € par mois × 12 mois. La résiliation est demandée, mais reste à confirmer. Ce montant est une économie annuelle potentielle.

## Interface

- L’accueil affiche « Si vous résiliez », le nom de l’abonnement concerné et « Voir le calcul ».
- Le détail distingue les résiliations en cours des résiliations confirmées et explique chaque montant avec la fréquence réelle de facturation.
- Les justificatifs sont visibles en miniatures dans les fiches. La galerie existante permet de les agrandir ou de les retirer.
- Dans Profil, « Réinitialiser les exemples de démo » puis « Charger les exemples » remplace les modifications de la démo par ces exemples. Les données personnelles sont conservées. Une ancienne démo n’est pas écrasée automatiquement.

## Contenu de démonstration

| Contenu | Exemples |
| --- | --- |
| 16 abonnements au total | Vidéo, musique, sport, stockage, création, productivité, Internet, lecture, langues |
| 4 essais inclus | Canva Pro, Méditation, Livres audio, Cours de langues |
| 8 offres et coupons | 6 à suivre, 1 utilisée et 1 expirée ; dont une offre au dernier jour |
| 8 images de justificatifs | 3 reçus, 2 confirmations d’essai, 1 demande de résiliation et 2 confirmations de résiliation |

Les échéances sont relatives au jour de chargement : un essai terminé à vérifier, plusieurs échéances proches et des dates de sûreté. Les fréquences, notes et usages variés alimentent les simulations de budget existantes.

Tous les tarifs, coupons et documents sont fictifs. Les coupons de démonstration n’ouvrent aucun site marchand. Les images sont marquées « DÉMO · DOCUMENT FICTIF » et n’ont aucune valeur de justificatif réel.

### Montants initiaux

- Dépenses mensuelles actuelles : **130,66 €**, hors essais non confirmés et abonnements résiliés.
- Budget mensuel : **120 €**.
- Coût mensuel des quatre essais s’ils sont conservés : **31,61 €**. Le passage payant de l’essai terminé reste à vérifier.
- Économie annuelle potentielle : **161,88 €**, Netflix uniquement.
- Résiliations confirmées : **206,79 € par an**, soit Magazine (8,90 € × 12 = 106,80 €) + Microsoft 365 (99,99 € par an). C’est un coût annualisé évité, pas un remboursement déjà reçu.

### Justificatifs

| Abonnement | Images disponibles |
| --- | --- |
| Netflix | Reçu et demande de résiliation en attente |
| Spotify | Reçu |
| Canva Pro | Confirmation d’essai |
| Magazine | Confirmation de résiliation |
| Box Internet | Reçu |
| Méditation | Confirmation d’essai |
| Microsoft 365 | Confirmation de résiliation |

Les images sont embarquées pour fonctionner hors ligne. Le chargement de la galerie ne touche que l’espace démo ; un échec d’écriture des images conserve l’ancienne galerie. Les limites ordinaires de photos restent applicables.

## Vérifications

- `npm test` : **55 tests réussis**, dont cohérence des exemples, calculs par fréquence, séparation des espaces et conservation de la galerie en cas d’échec.
- `npx tsc --noEmit` : réussi après génération des routes Expo.
- `npm run mobile:export:ios` : réussi, SDK Expo 57.
- Parcours navigateur : calcul et liens, affichage/décodage des images, agrandissement, retrait persistant, réinitialisation, accès aux preuves des abonnements archivés, offres, essais, budget et sortie de démo sans changement des données invité.
- Vérification visuelle à 390 px et en thème sombre à 320 px, sans débordement horizontal.
- Aucune compilation ni soumission TestFlight n’a été lancée.

## Aperçus

- [Accueil](previews/demo-expanded-home.png)
- [Détail du calcul](previews/demo-savings-calculation.png)
- [Miniatures des justificatifs](previews/demo-proof-thumbnails.png)
- [Reçu agrandi](previews/demo-proof-fullscreen.png)
- [Confirmation de résiliation](previews/demo-cancellation-proof.png)
- [Coupons](previews/demo-coupons-expanded.png)
- [Essais](previews/demo-trials-expanded.png)
- [Petit écran sombre](previews/demo-expanded-narrow.png)

## Régénérer les documents

La source éditable est `scripts/demo-documents.json`. L’outil optionnel `scripts/render-demo-documents.cjs` utilise Playwright et Chromium, installés séparément dans un environnement de développement. Les variables `PIGEONSUB_PLAYWRIGHT` et `PIGEONSUB_CHROMIUM` permettent d’indiquer leurs chemins. Il régénère les JPEG de `assets/demo-proofs/` et les données embarquées de `src/lib/demo-proofs.ts`. Aucune dépendance Playwright n’est nécessaire pour utiliser ou compiler l’application.
