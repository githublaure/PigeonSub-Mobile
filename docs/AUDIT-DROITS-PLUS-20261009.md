# Droits gratuits / Plus — audit et correctif du 9 octobre 2026

Base examinée : `main` à `74013fe59dea32a6aa25c6537ec461df02baac01` (PR #17). La PR #14 et les documents Premium existants ont été relus. Aucun achat, appel à un compte RevenueCat réel, déploiement backend, EAS Build, EAS Update ou envoi TestFlight n'a été effectué.

## Résultat de l'audit

Le constat initial est confirmé : `POST /api/subscriptions` et `PUT /api/subscriptions/:id` authentifiaient l'utilisateur, mais ne validaient ni quota ni entitlement. Les écritures pouvaient contourner les paywalls mobiles. L'import groupé CSV était une boucle de POST ordinaires. Les requêtes simultanées pouvaient aussi dépasser un quota calculé avant l'écriture.

| Surface | Contrôle avant | Correctif / limite réelle |
| --- | --- | --- |
| Ajout et réactivation | Client seulement | Contrôle serveur de 5 actifs, après verrou PostgreSQL par utilisateur, dans la même transaction que l'écriture. |
| Essais, achats à vie, prix zéro | Quota client | Occupent chacun un emplacement s'ils sont actifs. Un essai dont la date est passée n'est pas automatiquement résilié. |
| Archives et expiration de Plus | Quota client | Lecture, export, modification ordinaire, désactivation et suppression restent possibles. Pas de suppression automatique des données au-delà de 5. Les nouveaux actifs et réactivations sont bloqués. |
| Résiliation confirmée | Suivi stocké sur le téléphone | Nouvelle date `cancelled_effective_on`, enregistrée sur le serveur. Libération à la date d'effet en Europe/Paris ; annuler/décaler une résiliation échue est une réactivation contrôlée. |
| Dates de sûreté | Client seulement | Réglages réservés aux 5 premiers actifs par date de création/id, ou Plus. Désactivation gratuite ; report d'un décalage existant lors du passage d'un essai au paiement conservé. |
| Import groupé connecté | Boucle de POST, paywall client | Nouvelle route `/api/subscriptions/import` (2–50 lignes), Plus vérifié, validation préalable et transaction atomique. Reprise d'un lot identique sans doublon. Aucun repli automatique sur des POST libres si la route échoue. |
| Ajout individuel issu d'un CSV | Client | Reste gratuit jusqu'au quota. Le serveur ne peut pas distinguer une saisie manuelle d'un script qui reproduit les mêmes requêtes : il impose le plafond global dans tous les cas. |
| Offre d'un compte connecté | SDK RevenueCat | `/api/billing/entitlements` authentifié ; le mobile adopte le verdict serveur. Aucune dérogation en cas de 404/503 ou de déclaration `isPlus` du client. |
| Invité | Stockage local + SDK | Conservé. Contrôle supplémentaire dans la transaction locale contre les doubles clics. Un invité Plus conserve la vérification SDK et ses données locales. Il n'accède pas aux écritures serveur sans authentification. |
| Démo | Espace local distinct | Conservé, fonctions Plus explorables, aucun achat. Aucun en-tête, paramètre ou champ « demo » ne dispense une route serveur de ses contrôles. |
| Photos, icônes personnalisées, historique, simulations, notifications locales | Fonctions exécutées / stockées localement | Les comptes utilisent maintenant les droits relus sur le serveur ; les invités utilisent le SDK. Une app ou un stockage local modifié ne peut pas être rendu inviolable par cette API. Aucun faux contrôle serveur sur des données qui n'y sont pas envoyées. |
| Budget, catégories, carnet de coupons, export | Gratuits | Pas de nouveau paywall. Les routes settings/stats conservent leur accès gratuit authentifié. |
| Ancienne route vocale | Authentification, propriété de l'abonnement, clé ElevenLabs fournie par l'utilisateur | Route historique hors des bénéfices Plus actuels, non utilisée par le service de rappels locaux. Aucun appel vocal réalisé. Avant une offre vocale payante, ajouter droits, quotas de consommation et une vraie gestion de l'audio. |

L'ancienne route `auth/demo-login` reste une identité de démonstration partagée, sans exemption Plus. Le mobile actuel utilise la démo locale. Ne jamais associer un achat réel ou une autorisation sandbox à ce compte partagé.

## Choix RevenueCat

L'intégration utilise déjà `react-native-purchases` 10.11.0, l'entitlement exact `plus` et l'identité `pigeonsub_user_<id>` pour les comptes ; les invités ont une identité anonyme persistée. Ces identités et les produits Monthly / Annual / Lifetime sont conservés pour éviter de perdre les droits existants.

Le serveur dérive l'identité **exclusivement du JWT vérifié**, puis appelle en lecture `GET https://api.revenuecat.com/v1/subscribers/<identité>` avec sa clé secrète API v1. Il n'accepte pas d'identifiant RevenueCat externe fourni par le client. L'original_app_user_id peut être un alias anonyme légitime : il n'est pas comparé naïvement à l'identifiant demandé.

Vérification de l'entitlement exact, de sa date d'expiration, d'une éventuelle période de grâce et de la transaction qui le fournit. Les achats à vie sont traités explicitement ; un champ d'expiration manquant ou invalide n'est jamais assimilé à un achat à vie. Remboursement détecté et achats sandbox non autorisés sont refusés. Une annulation du renouvellement conserve les droits jusqu'à leur expiration.

Pas de cache positif persistant ni de webhook dans ce premier lot : chaque opération protégée relit RevenueCat, avec un délai maximal de 5 secondes. Cela évite une seconde source de vérité et des droits périmés servis en cas d'erreur. Cela implique un appel par opération protégée et un verrou utilisateur tenu pendant la vérification. Si le trafic le justifie, ajouter ensuite un cache court avec invalidation vérifiée par webhook, limitation des appels et tests d'expiration ; ne jamais remplacer une erreur par « Plus ».

Une panne, clé absente/invalide, réponse ambiguë ou limite RevenueCat donne `503 BILLING_UNAVAILABLE`. Les 5 créations gratuites n'ont pas besoin d'un appel RevenueCat. Un droit explicitement absent donne `403 PLUS_LIMIT`, `PLUS_IMPORT` ou `PLUS_SAFETY` selon l'opération. Aucune erreur de vérification ne déclenche un achat.

L'identifiant historique est devinable : RevenueCat recommande des identifiants opaques. Sa migration devra être un lot distinct avec correspondance serveur et stratégie d'alias/restauration vérifiée, pas un remplacement aveugle qui déconnecterait les acheteurs. La politique RevenueCat de transfert invité → compte reste à vérifier dans la console ; aucun réglage de transfert n'a été modifié ici.

Sources techniques consultées :
- https://www.revenuecat.com/docs/api-v1/customers
- https://www.revenuecat.com/docs/api-v1/customer-info-model
- https://www.revenuecat.com/docs/customers/identifying-customers
- https://www.revenuecat.com/docs/test-and-launch/sandbox

## Intégration progressive

1. Tester la branche et la CI, puis examiner les changements. Ne pas fusionner comme si un déploiement avait déjà été validé.
2. Sur un backend de test du **même projet RevenueCat**, ajouter `REVENUECAT_SECRET_API_KEY` (clé secrète API v1 `sk_…`). Ne jamais utiliser `EXPO_PUBLIC_`, une clé Apple ou un secret dans le dépôt. Conserver les clés publiques SDK mobiles actuelles.
3. Pour les tests Sandbox/TestFlight uniquement, `REVENUECAT_SANDBOX_USER_IDS` accepte une liste d'identifiants **backend** explicitement réservés aux testeurs, ex. `12,14`. Vide par défaut. Préférer un backend et des comptes de test séparés ; ne pas accorder le sandbox à tous les comptes de production.
4. Déployer d'abord le backend, qui applique une migration additive (`cancelled_effective_on` + index) au démarrage. Les anciennes routes restent disponibles et sont protégées aussi pour les anciens clients. Ne pas déployer sans la clé si des comptes payants doivent dépasser 5.
5. Vérifier avec des comptes contrôlés : 5 gratuits, refus du sixième, compte Plus connu, expiration, restauration, accès invité, démo, résiliation effective et réactivation. Le code/test fourni simule RevenueCat ; la configuration réelle Apple/RevenueCat n'a pas été validée.
6. Livrer ensuite le mobile : la nouvelle route d'entitlement et la route d'import doivent déjà exister. Un nouveau client contre un ancien backend bloque les opérations Plus avec une erreur, sans contournement de secours.
7. Les confirmations de résiliation **enregistrées auparavant seulement sur le téléphone** ne sont pas téléversées en masse sans contrôle. Si elles doivent libérer des emplacements côté serveur, les enregistrer à nouveau depuis la fiche concernée. Les notes et l'historique existants sont conservés. Une migration automatique multi-appareils devra résoudre explicitement les décisions contradictoires.
8. Relever le nombre d'utilisateurs déjà au-delà de 5 avant déploiement. Le correctif conserve leurs données et leurs opérations ordinaires ; seuls les ajouts/réactivations nécessitent Plus ou des emplacements libérés. Aucun nettoyage destructif n'est prévu.

Retour arrière : conserver les colonnes ajoutées ; ne pas supprimer les dates existantes. Revenir à l'ancien backend rouvrirait le contournement du quota. Préférer corriger la configuration ou suspendre les seules opérations protégées. Aucun interrupteur public « ignorer les droits » n'est livré.

## Icône et onboarding

`app.json` ne contenait aucune référence d'icône. Le fichier existant `pigeonsub-appstore-contours-nets-1024.png`, créé le 6 octobre, est repris **sans modification** dans `assets/branding/app-icon.png` : 1024 × 1024, RGB, sans canal alpha. Il est référencé pour Expo, iOS et Android. Le pigeon à l'envers est distinct de la mascotte avec café utilisée dans le contenu.

L'utilisatrice a confirmé que la plume s'affiche bien à l'ouverture. Son animation n'a donc pas été réécrite. L'onboarding initial est normalement proposé en l'absence de session ; une session invitée/démo/compte restaurée mène directement à l'app. Le code seul ne prouve pas si le premier lancement de l'iPhone a été sauté. Le nouveau bouton **Profil → Revoir l'introduction** rejoue la plume et les trois écrans sans changer la session, sans inscription/achat et sans effacer les données. Réduction des animations et échec de chargement du masque conservent les comportements accessibles existants.

L'icône native nécessitera une nouvelle compilation signée. Attention : ce `main` déclare encore `com.pigeonsub.app` alors que la fiche TestFlight historique utilise `app.replit.pigeonsub` et que Replit/EAS peut injecter une configuration extérieure au dépôt. **Contrôler la configuration effective du prochain build et conserver l'identité de la fiche existante**, ainsi que le propriétaire/projet EAS actuellement utilisé. Aucun identifiant d'application ni publication n'a été changé dans ce lot.

Référence : https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/

## Vérification reproductible

```bash
npm ci --include=dev
npm ci --prefix backend --include=dev
npx --no-install tsc --noEmit
npm test
npm run test:backend
npm run mobile:export:ios
```

- 76 tests mobiles réussis : dont résolveur des droits connecté/invité/démo, import groupé sans fallback, quotas locaux concurrents et isolation des espaces.
- 19 tests backend réussis : vraies routes HTTP, vrais JWT et SQL PostgreSQL exécuté dans PGlite, RevenueCat simulé. Faux tokens, faux droits, changement d'utilisateur, sixième abonnement, essais, archives, réactivations, annulation des résiliations, dégradation Plus, période de grâce, lifetime, remboursement, sandbox, panne/configuration, lots atomiques et reprise sont couverts.
- TypeScript et export iOS Metro/Hermes réussis. Configuration publique Expo résolue avec l'icône attendue.
- PGlite ne teste pas plusieurs connexions PostgreSQL concurrentes : son adaptateur sérialise les transactions. Le workflow `Entitlements and mobile checks` exécute les mêmes scénarios HTTP sur PostgreSQL 16 avec un pool réel. Il doit passer avant fusion. Pour reproduire : `TEST_DATABASE_URL=postgresql://... npm run test:backend`. Le test crée et supprime uniquement un schéma aléatoire dédié.
- Aucun test natif signé sur iPhone, achat sandbox réel ou test de l'icône installée effectué. Le lancement du navigateur de vérification locale a été empêché par l'indisponibilité de son binaire ; l'interface d'introduction n'est pas présentée comme visuellement validée sur appareil.
