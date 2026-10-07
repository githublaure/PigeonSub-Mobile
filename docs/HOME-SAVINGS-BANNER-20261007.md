# Accueil : économies et pigeon à la calculatrice

La carte d’accueil reprend la hiérarchie de la référence fournie : dépenses en violet, économies possibles en grand et en doré, sur une carte claire à contour uniforme et ombre douce. Le montant annuel des dépenses, son équivalent mensuel d’économies et les explications répétées ont été retirés de cette carte. Les détails restent accessibles dans Stats en touchant sa dernière ligne.

Les montants restent calculés à partir des abonnements. Les économies possibles correspondent aux démarches en cours ; « par an après résiliation » conserve leur caractère conditionnel. Les résiliations confirmées restent séparées, en vert. Aucun montant publicitaire, prix de Plus ou gain net garanti n’est repris de l’image de référence.

La plume près des échéances appartenait au bouton d’ajout : au-delà des cinq emplacements gratuits, l’ajout nécessite Plus (essayable en démo). Le badge avec la plume et le mot « Plus » est maintenant superposé au coin du bouton, et son aide d’accessibilité explique cette limite. Les prochaines échéances ne deviennent pas payantes.

## Mascotte

Nouvel asset transparent : `assets/mascots/pigeon-calculator.png`, utilisé dans la carte d’accueil. Le pigeon à bourse reste disponible dans les autres écrans.

Génération via l’outil intégré ImageGen, à partir de la capture fournie du 7 octobre à 01:49. La version finale est celle retouchée et fournie par Laure dans « Savvy pigeon with calculator and receipt(1).png » : tache claire parasite retirée. Son fichier PNG RGBA est repris à l’identique, avec sa transparence.

Prompt final :

> Use case: stylized-concept. Asset type: transparent PNG mascot for the PigeonSub subscription-savings dashboard. The attached screenshot is a reference, not the output layout: create ONLY the pigeon character with calculator and long receipt from the right side of its card, isolated on a genuinely transparent background. Preserve its identity: grey adult pigeon, round sturdy body, darker head and wings, confident mischievous half-lidded eyes, orange beak and orange feet, clean dark contours, slightly textured hand-drawn fill, refined app illustration rather than baby cartoon. One wing holds a small dark calculator to the viewer's left, the other holds a long ivory receipt curling naturally toward the ground on the viewer's right. Keep the face, calculator and receipt clearly readable at a small UI size; a compact full-body silhouette with the receipt close to the body. Calculator screen pale grey-green without legible amounts; receipt has subtle short grey printed lines without readable words or numbers. No mask, no money pouch. No banner, card, typography, slogan, logos, numbers, buttons, crown, sparkles or background. Whole character and receipt inside the frame, minimal transparent margins, very subtle oval soft shadow under feet only. Square composition.

## Vérification

TypeScript et parcours navigateur réussis : montants inchangés, zéro économie après conservation, reprise de résiliation, séparation confirmé/potentiel, accès Stats et essais, ordre des échéances, sûreté prioritaire, badge attaché au bouton, thèmes clair/sombre et écran de 320 px. Aucun débordement horizontal ni erreur JavaScript observé. Aucun changement de dépendance, configuration Expo ou achat intégré. Aucun build TestFlight lancé.

[Clair](previews/home-calculator-light.png) · [Sombre](previews/home-calculator-dark.png) · [320 px](previews/home-calculator-narrow.png)

Sauvegarde du main avant intégration : `backup/main-before-banner-20261007-aa35ad5`.
