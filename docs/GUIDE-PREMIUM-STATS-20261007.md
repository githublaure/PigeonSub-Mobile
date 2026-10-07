# Guide, Premium et statistiques — 7 octobre 2026

## Livraison

- **Guide en 13 étapes** proposé à la première entrée dans l’application, après l’onboarding. Il navigue vers les vrais écrans, fait défiler la zone concernée et la souligne. Précédent, Suivant, Fermer, reprise après interruption et relance depuis **Profil → Revoir le guide pas à pas**.
- La progression reste sur cet appareil. Le guide terminé n’est pas réimposé à chaque connexion. La visite ouvre désormais toujours une démo préremplie (16 abonnements dont 4 essais, 8 coupons et 8 justificatifs fictifs). Fermer ou terminer restaure l’espace d’origine, y compris une session connectée, sans ajouter d’exemples aux données personnelles. Un rechargement restaure également cette session, puis propose de reprendre la visite en démo. Les options Plus restent explorables avec leurs plumes dorées. Les rappels personnels programmés ne sont pas effacés à l’entrée dans cette visite temporaire.
- Chaque étape précise le gratuit et le supplément Plus. Les **plumes dorées** ouvrent une présentation de l’option concernée. Quitter le paywall retourne à l’écran précédent ; le guide peut reprendre après consultation de l’offre.
- Carte **Passer à Premium** placée en haut du profil, avant l’apparence et les réglages ordinaires. « Plus » reste le nom de l’offre Premium.
- **Jauge de budget** dans l’accueil et les statistiques : budget modifiable, comparaison avec le coût actuel ou simulé, dépassement explicite. Les écarts utilisent les montants arrondis au centime affichés à l’écran.
- **Carrousel d’abonnements à éviter** : flèches gauche/droite et compteur. Il s’appuie sur les faibles notes, le faible usage et les intentions de résiliation. Il exclut les abonnements archivés, à résiliation confirmée, conservés explicitement et les achats sans récurrence. Le montant correspond à une échéance, pas à une économie acquise. Un préavis dépassé appelle une vérification.
- **Abonnements** : calendrier compact sur sept jours, sélection/effacement d’une date, tags visibles sous le calendrier (actifs, sous sept jours, essais, peu utilisés, notes 1–2, à résilier, archives), recherche et tri par coût mensuel équivalent. Les cartes montrent l’usage et la note, avec le nom sur deux lignes si nécessaire.
- **Statistiques** : titre « Vos chiffres », sélection 3/6/12 mois, courbe violette avec montants, mascotte professeur, cartes d’économies et de résiliations confirmées, jauge, répartition par catégorie et premier poste de dépense, puis abonnements peu utilisés.
- L’historique des décisions est désormais une carte autonome : il reste consultable avec Plus même après un retour à « Conserver ».

La courbe est une **projection à tarifs constants**, avec hypothèses sur les essais. Ce n’est pas un historique bancaire. La période choisie pilote cette projection ; les économies confirmées restent une estimation **annuelle**, distincte d’un remboursement et d’un cumul encaissé sur la période.

## Audit des paywalls effectivement présents

« Vérifié » ci-dessous signifie contrôle dans le code et vérification locale, pas achat réel effectué dans une boutique.

| Fonction | Gratuit | PigeonSub Plus | Contrôle installé et état | Reste à faire ou à valider |
| --- | --- | --- | --- | --- |
| Abonnements et essais | 5 actifs au total, essais inclus | Suivi illimité | Boutons d’ajout, formulaire/API cliente, réactivation ; paywall `limit`. Vérifié. | Test de dépassement puis déblocage après achat Store dans une version signée. |
| Dates de sûreté personnalisées | Sur les 5 emplacements gratuits | Sur tous les abonnements | `canCustomizeSubscription`, formulaire et panneau de sûreté ; plume/paywall `safety`. Vérifié. | Tester permissions, refus, modification et réception des notifications sur iPhone. |
| Rappels locaux | Rappel avant échéance pour les 5 emplacements gratuits | Même fonctionnement sur tous les abonnements | Planification native filtrée selon les droits. Calculs testés. La démo ne programme aucune notification réelle. | Réception native et reprogrammation après changement d’offre à valider ; ce n’est pas un service push serveur. |
| Photos et justificatifs | 5 photos pour chacun des 5 emplacements gratuits | Davantage de photos par abonnement, sur tous les abonnements | Quota dans le formulaire, la galerie et l’écriture du stockage ; plume/paywall `photos`. Vérifié. | Tester photothèque, caméra et permissions natives. Les photos restent locales, sans synchronisation entre appareils. |
| Historique des décisions/résiliations | Décisions et confirmations utilisables ; consultation de l’historique verrouillée | Consultation de l’historique | Carte dédiée, contrôle `canUsePlus` et paywall `history`. Vérifié, y compris sur un abonnement conservé. | Vérification après expiration et restauration réelles de Plus. |
| Simulations statistiques | Coût actuel et après résiliations | Sans les peu utilisés, sans notes 1–2, vue combinée | Menu avec plumes, redirection `stats`, repli sur la vue gratuite si les droits sont perdus. Vérifié. | Validation du déblocage après achat et du repli après expiration Store. |
| Budget, projections 3/6/12 mois, catégories | Inclus | Inclus | Aucune restriction Premium ajoutée. | Aucun paywall à ajouter pour cette livraison. |
| Filtres simples de la liste et carrousel | Inclus | Inclus | Distincts des simulations de budget Premium. | Aucun paywall à ajouter pour cette livraison. |
| Carnet de coupons et suivi d’essais | Carnet inclus ; essais soumis au plafond commun de 5 actifs | Carnet inclus ; suivi des essais illimité | Gestion manuelle des offres et dates ; pas de catalogue de coupons commerciaux vérifiés. | Une éventuelle collecte/validation automatique d’offres serait une fonction séparée. |
| Guide, thèmes et export des données | Inclus | Inclus | Guide relançable, apparence, export depuis Confidentialité. | Validation ergonomique du guide sur iPhone physique. |
| Achat et restauration | Aucun achat automatique | Droits activés à partir de l’entitlement RevenueCat `plus` | SDK, offres, achat, restauration et changement d’identité présents. Achat désactivé dans la démo, sur le Web et dans Expo Go. | **Disponibilité commerciale non vérifiée ici** : produits, offering, clé SDK et politique publique à vérifier, puis achats Sandbox/TestFlight. |
| Essai de 7 jours de PigeonSub Plus | Aucun essai démarré à l’onboarding | Affiché seulement pour une véritable offre gratuite de 7 jours et une éligibilité vérifiée | Contrôle `hasSevenDayTrial` testé. | Configurer/valider l’offre d’introduction et son éligibilité dans la boutique. À distinguer des essais de services suivis dans l’app. |

Les tarifs de secours du code sont **des tarifs prévus** : 2,99 €/mois, 19,99 €/an et 34,99 € en achat Fondateur. Lorsqu’une offre réelle est chargée, son tarif localisé vient de la boutique. Une absence de produit disponible ou d’URL de confidentialité empêche le bouton d’achat de fonctionner. Les configurations externes n’ont pas été consultées ni modifiées pendant cette livraison : leur absence dans la copie locale ne prouve pas leur absence dans Replit ou App Store Connect.

## Ce qui reste nécessaire avant de déclarer le paiement opérationnel

1. Vérifier dans RevenueCat l’application concernée, les produits effectivement vendus, une offering courante et l’entitlement exact `plus`. Les packages reconnus par le code sont Monthly, Annual et Lifetime. Le produit Fondateur n’est proposé après connexion boutique que s’il est effectivement disponible.
2. Vérifier la clé SDK publique iOS `EXPO_PUBLIC_REVENUECAT_IOS_KEY` dans les variables du build ; la clé Android est distincte. Ne pas placer de clé privée dans une variable `EXPO_PUBLIC_*`.
3. Renseigner une politique de confidentialité publique HTTPS via `EXPO_PUBLIC_PRIVACY_POLICY_URL` et contrôler les informations de distribution dans la boutique.
4. Produire une nouvelle compilation iOS signée. Tester achat, annulation du dialogue, achat différé, restauration, expiration/renouvellement et passage invité → compte avec la politique de transfert RevenueCat attendue.
5. Tester les permissions photo/caméra et les rappels sur l’appareil : un refus doit conserver les données, et la démo ne doit pas émettre de notification réelle.

Le backend existant authentifie et isole les données par utilisateur, mais **ne vérifie pas les entitlements RevenueCat ni le quota Premium dans ses routes d’écriture**. Les restrictions actuelles de cette application sont dans le client. Si le quota doit être imposé aussi aux appels directs à l’API, ajouter une vérification serveur des droits et du nombre d’abonnements, avec les mêmes règles d’archives/essais. Toute future API Premium ou IA payante devra également vérifier les droits côté serveur. Aucun déploiement backend n’est inclus ici.

Les rappels vocaux IA ont encore un écran technique et des routes dédiées, mais ne sont pas proposés dans le parcours courant ni vendus par ce paywall. Il reste à finaliser leur accès utilisateur, leur intégration serveur et leur éventuelle politique Premium avant de les annoncer comme disponibles.

## Vérifications de cette livraison

- `npm test` : **60 tests réussis**. Les cas ajoutés couvrent filtres/suggestions, budget nul ou dépassé, événements de calendrier avec préavis progression du guide et maintien des rappels personnels pendant la visite temporaire.
- `npx tsc --noEmit` : réussi.
- `npm run mobile:export:ios` : réussi, Expo SDK 57 ; inclut la mascotte RGBA.
- Parcours Web mobile : invitation initiale, démarrage depuis un compte vide vers une démo remplie, justificatifs existants, interruption/reprise, consultation d’un paywall et reprise, guide complet en démo, historique/proofs, carrousel, vues, jauge persistante, sixième abonnement bloqué en gratuit, vues avancées bloquées, historique gratuit verrouillé, cinq photos gratuites puis accès au paywall.
- Vérification du retour à l’écran d’origine depuis une plume, absence d’action parasite sur le choix d’une vue et absence d’avertissement de boutons imbriqués.
- Inspection visuelle en clair à 390 px et en sombre à 320 px ; montants non tronqués et absence de débordement horizontal.
- **Aucun achat réel, build TestFlight ou envoi Apple n’a été effectué.** L’export JavaScript/ressources iOS ne remplace pas ces validations.

Le script optionnel `scripts/check-guide-web.cjs` rejoue le parcours navigateur dans un contexte isolé. Il utilise Playwright et Chromium installés séparément ; `PIGEONSUB_PLAYWRIGHT` et `PIGEONSUB_CHROMIUM` permettent d’en fournir les chemins. Il écrit ses captures dans `docs/previews/` (désactivable avec `PIGEONSUB_SKIP_SCREENSHOTS=1`) et n’utilise aucun compte ni achat réel. La restauration d’une session connectée est vérifiée avec une API locale simulée ; les modifications pendant le guide restent dans la démo.

## Aperçus

- [Invitation au guide](previews/guide-invitation.png)
- [Étape avec zone mise en évidence](previews/guide-first-step.png)
- [Accueil et jauge](previews/guide-home-budget.png)
- [Carrousel](previews/guide-review-carousel.png)
- [Calendrier compact et vues](previews/guide-subscription-views.png)
- [Statistiques](previews/guide-stats-redesign.png)
- [Comparaison budgétaire](previews/guide-budget-comparison.png)
- [Statistiques en sombre à 320 px](previews/guide-stats-dark-narrow.png)
- [Premium dans le profil](previews/guide-premium-settings.png)
- [Paywall d’une simulation](previews/guide-free-paywall.png)

## Mascotte

Fichier intégré : `assets/mascots/pigeon-professor.png`, PNG RGBA de 1408 × 1117 px, fond transparent. Génération réalisée avec l’outil d’image intégré à partir de la capture du pigeon avec baguette, en conservant son identité, ses lunettes et sa pose, avec des yeux cohérents et sans tache blanche sur l’aile.

Prompt final utilisé :

> Use case: precise-object-edit. Asset type: transparent mascot for the PigeonSub mobile statistics page. Edit target: the attached grey pigeon teacher wearing round gold glasses and holding a wooden pointer. Preserve the same character identity, adult mischievous expression, charcoal head, warm-grey feathered body, orange beak and feet, gold round glasses, pose, wooden pointer pointing up-left and clean hand-drawn shaded illustration style. Correct only the eyes and the stray pale spot: make the two eyes natural and coherent behind the glasses, small dark pupils looking in the same direction, normal eyelids, no cross-eyed bulging or mismatched eyes, no creepy expression. Remove the circular white/beige mark on the right-side wing entirely, replacing it with the matching uninterrupted feather color. Keep the whole pigeon, both feet and the entire pointer comfortably inside the frame. Output the isolated mascot on a truly transparent background, no text, no cards, no decorative elements, no detached white spots, no ground shadow. High-quality clean silhouette suitable for small in-app use.
