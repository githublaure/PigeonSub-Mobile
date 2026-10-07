# Essai Plus, guidelines commerciales et légende — 7 octobre 2026

## Correction livrée

La légende du calendrier mensuel utilisait une chaîne de texte uniformément grise, y compris le caractère représentant le point de sûreté. Les calendriers mensuel et hebdomadaire utilisent maintenant le même composant : un véritable point orange `#F59E0B` pour la sûreté, violet pour les prélèvements et fins d’essai, et leurs libellés. Le point orange reste orange sur un jour sélectionné et dans les deux thèmes. Les dates et notifications ne sont pas modifiées.

## Quand commencent les sept jours ?

Le mode gratuit permet de suivre cinq abonnements actifs sans limite de durée. La démo et le guide montrent des exemples avec les options Plus accessibles ; ils ne souscrivent aucune offre.

Pour un essai réel de PigeonSub Plus sur iPhone :

1. L’application charge l’offre réellement disponible dans la boutique et vérifie l’éligibilité à son offre d’introduction.
2. Si le produit choisi propose effectivement une période gratuite de sept jours et si l’éligibilité est positive, le bouton présente les sept jours gratuits et le tarif qui suivra.
3. Le clic ouvre la confirmation d’achat Apple. La souscription, avec sa période gratuite, commence après validation ; fermer cette fenêtre ne l’active pas.
4. Plus est débloqué lorsque RevenueCat confirme un entitlement `plus` actif. À la fin de l’essai, l’abonnement se renouvelle au tarif de l’offre, sauf annulation selon les conditions de la boutique.

Le code ne lance pas de compte à rebours à l’installation, à l’onboarding, à la création du compte ou à l’ouverture du guide. Le tarif annuel de 19,99 € est un tarif prévu dans le code ; la boutique fournit le montant réel localisé.

Apple limite l’offre d’introduction à une utilisation par groupe d’abonnements. L’éligibilité dépend notamment de l’historique du compte Apple ; créer un autre compte PigeonSub ne garantit donc pas un nouvel essai. La vérification RevenueCat est indicative et la fenêtre native de paiement confirme les conditions applicables. Apple demande d’annuler au moins 24 heures avant la fin de l’essai pour éviter son renouvellement.

`hasSevenDayTrial` est uniquement le contrôle d’affichage : produit présent, prix d’introduction nul, une période de sept jours ou une semaine, éligibilité positive. Son test ne configure aucune offre et ne prouve pas qu’un paiement ou un essai fonctionne en production.

Les essais de Netflix, Canva, etc. saisis dans PigeonSub sont différents : l’utilisateur renseigne leur date de fin et leur tarif futur. PigeonSub les suit ; il ne les déclenche pas chez le fournisseur et ne confirme pas automatiquement leur passage payant.

## Comparaison avec le document joint

| Guideline | État observé dans le code | Écart ou suite à donner |
|---|---|---|
| Choisir/ajouter ses abonnements avant le premier dashboard | Partiel : onboarding explicatif, visite guidée en démo, ajout personnel via le bouton + | Il n’existe pas de sélection personnalisée d’abonnements intégrée à l’onboarding. |
| Montrer dépenses mensuelles et annuelles | Présent : accueil, statistiques et calculs d’économies | Distinguer les coûts récurrents, les essais et les économies potentielles. |
| Mettre en évidence une prochaine somme à payer | Présent : échéances, montants, dates de sûreté, carrousel et tri | Les montants sont calculés à partir des saisies, pas de transactions bancaires vérifiées. |
| Proposer un paywall avec ce résultat personnel | Partiel : texte selon la fonctionnalité déclenchée | Le paywall ne reprend pas encore les montants, noms et prochaines échéances propres à l’utilisateur. |
| Bloquer le sixième abonnement | Présent dans le client, essais inclus | L’API ne contrôle pas encore le quota avec les droits RevenueCat côté serveur. |
| Bloquer toute création de date de sûreté | Différent, conformément à la demande plus récente | Date personnalisée et rappel inclus pour les cinq abonnements gratuits ; Plus étend ces réglages. Ne pas remettre ce paywall général sans changer cette décision commerciale. |
| Bloquer un rappel vocal derrière Premium | Non finalisé | Écran technique masqué des onglets et routes existantes, mais pas de parcours natif opérationnel ni de contrôle Premium serveur. Ne pas le vendre comme disponible. |
| Parcours complet de résiliation Premium | Différent | Démarche, confirmation et justificatifs de base gratuits ; historique Premium. Le fournisseur doit confirmer la résiliation. |
| Justificatifs supplémentaires Premium | Présent | Cinq photos gratuites pour chacun des cinq abonnements ; davantage avec Plus. Ne pas promettre des justificatifs « illimités ». |
| Titre axé sur le bénéfice | Partiel | Les raisons `limit`, `photos`, `safety`, `history`, `stats` ont un titre contextualisé ; l’entrée générique conserve « Passez à PigeonSub Plus ». |
| Trois bénéfices seulement sur le paywall | Non appliqué à la lettre | Les blocs gratuit/Plus et les explications rendent la page plus longue. Une simplification doit préserver la visibilité du gratuit demandée récemment. |
| Annuel sélectionné, mensuel secondaire | Présent | Une troisième offre Fondateur à vie existe également lorsqu’elle est disponible. |
| 19,99 €/an, 1,67 €/mois, économie de 15,89 € | Partiel | Tarifs prévus et équivalent mensuel présents ; économie comparée à douze mensualités non affichée. Calculer cette différence à partir de tarifs boutique de même devise. |
| CTA de sept jours gratuits et tarif après essai | Prévu conditionnellement sur iOS | Affiché uniquement avec une véritable offre éligible ; configuration boutique et achat natif à vérifier. L’offre Fondateur n’est pas un abonnement à renouvellement. |
| Pas de toggle artificiel activant l’essai | Respecté | Les toggles « essai » des formulaires servent à suivre un service externe, pas à activer Plus. |
| Restaurer, conditions, confidentialité | Liens présents | Restauration native à tester et politique publique HTTPS à vérifier dans la configuration du build. Les conditions pointent vers l’EULA standard Apple. |

Le document mélange des recommandations commerciales et des exigences de présentation de la boutique. Trois bénéfices, deux cartes et un titre précis sont des choix de conversion, pas des exigences universelles d’Apple. Les recommandations Apple consultées demandent notamment de rendre explicites le prix total facturé, la durée, les conditions après essai et les liens nécessaires. Elles ne suffisent pas à déclarer une acceptation App Review garantie, ni une interdiction générale de tout toggle.

## Conditions encore à vérifier pour commercialiser l’essai

1. Dans App Store Connect : application → abonnements → groupe → produit annuel → prix → offre d’introduction. Configurer une période gratuite d’une semaine, les territoires et la période de disponibilité. La date de début de disponibilité commerciale n’est pas le début des sept jours de chaque utilisateur.
2. Dans RevenueCat : vérifier le produit correspondant, sa présence dans l’offering courante, l’entitlement `plus` et la clé SDK publique iOS utilisée par le build.
3. Vérifier le prix réel et l’URL de confidentialité publique dans le build signé.
4. Tester sur appareil avec Sandbox/TestFlight : compte éligible, compte non éligible, annulation de la confirmation, essai confirmé, restauration, expiration et renouvellement. Le Web, Expo Go et la démo ne permettent pas ces achats dans ce code.
5. Pour Android, finaliser la lecture des offres Google Play : la méthode RevenueCat de vérification d’éligibilité utilisée ici est propre à iOS. La parité d’affichage n’est pas implémentée.

Les configurations privées Apple/RevenueCat n’ont pas été inspectées ou modifiées dans cet audit. L’absence de validation réelle ne signifie pas qu’aucun produit n’existe déjà dans ces consoles.

## Ordre de travail conseillé

1. Vérifier et tester la chaîne produit → offre d’introduction → achat → droits Plus.
2. Personnaliser le paywall avec une échéance et un montant réels saisis par l’utilisateur ; signaler les exemples de démo.
3. Réduire son premier écran à un bénéfice principal et trois avantages Premium, puis une comparaison gratuit/Plus consultable.
4. Conserver les limites gratuites déjà décidées ; différer la promesse de rappels vocaux jusqu’à un fonctionnement réel et des droits serveur.

## Sources officielles consultées

- [Apple — configuration des offres d’introduction](https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions/)
- [Apple — présentation des abonnements et essais](https://developer.apple.com/app-store/subscriptions/)
- [Apple — annuler un abonnement et un essai](https://support.apple.com/fr-fr/118428)
- [RevenueCat — offres, essais et éligibilité iOS/Android](https://www.revenuecat.com/docs/subscription-guidance/subscription-offers)

## Aperçus de la correction

Vérification : TypeScript réussi ; contrôle ciblé de l’affichage d’un véritable essai gratuit de sept jours réussi ; calendriers mensuel/hebdomadaire inspectés dans le navigateur à 390 px, puis thème sombre à 320 px. Les marqueurs d’événements et de légende utilisent bien la même couleur orange. Aucun achat, modification des consoles de facturation ou build TestFlight effectué.

- [Calendrier mensuel](previews/calendar-legend-fixed.png)
- [Calendrier hebdomadaire](previews/calendar-week-legend-fixed.png)
