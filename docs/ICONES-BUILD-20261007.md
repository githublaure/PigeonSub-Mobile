# Icônes Premium, liste épurée et build Replit — 7 octobre 2026

## Interface

- Le mini agenda de la page Abonnements est supprimé, ainsi que son filtre de jour. Les vues, compteurs, recherche et tris restent en tête de liste. L’onglet Agenda conserve le calendrier complet et la légende orange.
- Le formulaire d’ajout et de modification propose « Icône personnalisée » avec une plume dorée, l’import d’une photo, un aperçu et le retour à l’icône par défaut. Le guide et les avantages Plus mentionnent cette option.
- L’import est utilisable avec Plus et dans la démo ; un compte gratuit ouvre le paywall `reason=icons`. Le contrôle est refait avant la sauvegarde. L’annulation du formulaire ne modifie pas l’icône enregistrée.
- L’image est recadrée au carré, réduite à 256 × 256 et enregistrée en JPEG local, indépendamment des justificatifs et de leur quota. Limite de stockage : 180 000 caractères par icône ; aucune URL de cache temporaire persistée.
- Les icônes apparaissent dans les cartes Abonnements, la fiche, les prochaines échéances et le carrousel d’accueil. Une initiale remplace l’image absente ou illisible.
- Les données sont séparées par espace invité, compte et démo. Une icône existante reste visible après expiration de Plus et sa suppression reste gratuite. L’export avec photos inclut les icônes ; la suppression d’un abonnement/compte et la remise à zéro de la démo nettoient les icônes concernées.
- Un accès direct au formulaire de modification retourne désormais à la fiche si aucun écran précédent n’est disponible.

## Blocage du build

Le message fourni est un E403 de Socket Security, distinct des suggestions génériques `npm audit fix`. Il ne nomme pas le paquet téléchargé. Le build déclaré dans `.replit` exécute `npm ci --prefix backend`.

L’audit du verrou backend retrouvait une vulnérabilité critique de `proxy-addr@2.0.7`, correspondant au niveau de blocage annoncé : [avis du mainteneur GHSA-jqcg-44mw-7w3h / CVE-2026-90711](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h). Cette correspondance est une cause probable, pas une identification certaine de la requête Socket sans le journal npm détaillé.

Mises à jour compatibles, sans migration majeure :

| Paquet | Avant | Après |
|---|---:|---:|
| express | 4.22.2 | 4.22.3 |
| body-parser | 1.20.6 | 1.20.8 |
| proxy-addr | 2.0.7 | 2.0.8 |
| qs | 6.15.3 | 6.16.0 |

Le manifeste demande Express `^4.22.3`. Le verrou conserve les sommes d’intégrité et utilise les URLs publiques npm pour être portable entre les environnements. Aucun contrôle de sécurité Socket n’a été désactivé. Le build Replit reste inchangé.

Après installation propre du backend : audit **0 vulnérabilité**. L’audit mobile séparé reste à **34 alertes (21 élevées, 13 modérées, aucune critique)** ; aucune remise à niveau massive d’Expo/React Native n’est incluse dans cette correction. `npm audit fix --force` propose notamment une rétrogradation incompatible d’Expo ; ne pas l’exécuter aveuglément.

## Validation

- TypeScript et 63 tests unitaires passent, dont droits Plus, expiration, suppression, isolation des comptes, remise à zéro de la démo, rejet de session obsolète/image invalide et conservation après erreur de stockage.
- `npm ci --prefix backend` et `npm audit --prefix backend` passent.
- Test HTTP local avec les dépendances backend mises à jour : santé, corps JSON, paramètres de requête ; test de la correction du réseau de confiance IPv6/IPv4 décrit dans l’avis. Aucun accès à une base de production.
- Parcours navigateur : `scripts/check-icons-web.cjs` (import réel de fichier, aperçu, ajout/modification, persistance après rechargement, annulation, suppression après expiration simulée, paywall gratuit, indépendance démo/invité, calendrier restant disponible, affichage sombre à 320 px).
- Export iOS vérifié ; ce n’est pas une compilation signée ni un test du sélecteur photo sur appareil physique.

La publication Replit n’a pas été relancée ici. Après récupération de main, relancer le build. Si Socket retourne encore un E403, relever la ligne du journal détaillé qui nomme le paquet et sa version (le Request ID seul ne les fournit pas).

## Aperçus

- [Import et aperçu](previews/icons-form.png)
- [Liste sans mini agenda](previews/icons-list.png)
- [Paywall des icônes](previews/icons-paywall.png)
- [Formulaire sombre, 320 px](previews/icons-dark-form.png)
