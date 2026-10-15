# Préparation TestFlight — 15 octobre 2026

## Branche et périmètre

- Branche dédiée : `release/testflight-family-20261015`.
- Base : `release/pigeonsub-testflight-20261011`, commit `e39c673ce0a4ac23d1ce776db8bb4594fb8e8d11`.
- Cette base contient déjà les fonctionnalités des PR #18, #19 et #20, avec la configuration utilisée pour publier. Ne pas réappliquer ces PR.
- Seul le commit additionnel de #22 (`7283d7a16660d58846fdd604f01e79d1505820ef`) a été repris pour l’amortissement.
- Aucune fusion dans `main`, aucun changement de base des quatre PR, aucune branche supprimée.
- `eas.json`, `.replit`, `.easignore`, `.npmrc`, les dépendances verrouillées et le script de construction mobile sont conservés. `app.json` reprend uniquement la déclaration Apple `ITSAppUsesNonExemptEncryption: false` déjà présente dans le commit local Replit `2ce356465be179f611caf4e368dceddd09faecc5` ; les autres paramètres restent identiques à la base.

## Catégories et rappels

La confirmation de suppression des catégories est rendue dans l’interface et fonctionne sans `Alert.alert`. Les catégories et leurs abonnements locaux sont désormais enregistrés ensemble : en cas d’échec de stockage, il n’y a pas de réaffectation partielle. L’ancien catalogue local est repris, avec conservation de son ancienne clé. Le serveur utilise une transaction sous verrou du compte. Les archives, prix, notes et justificatifs sont conservés ; la catégorie supprimée devient « Autre ».

Les formulaires périmés ne peuvent plus réutiliser une catégorie supprimée ou un identifiant personnalisé inconnu. Les nouvelles icônes du catalogue priment sur les anciennes préférences locales. Le titre de fiche respecte le nom personnalisé. Les résultats asynchrones de l’API sont rejetés si la session change. Un échec de programmation des notifications restaure le réglage antérieur, sans écrire dans le compte suivant.

## Famille — suivi déclaratif de l’issue #21

Ce mode ne crée pas de comptes familiaux et ne gère ni invitations, ni collecte de paiements, ni connexion à une plateforme de partage. Le caractère partageable et les places autorisées sont renseignés par l’utilisateur selon les conditions de son fournisseur, jamais déduits du nom du service.

- Places autorisées et occupées, titulaire compris ; une valeur inconnue reste inconnue.
- Contribution totale déjà reçue, explicitement confirmée lors de l’enregistrement.
- Hypothèse facultative par place libre, séparée du reste à charge.
- Prix fournisseur inchangé. Des places occupées sans montant reçu ne réduisent aucun coût.
- Montants récurrents exprimés par période de facturation, puis normalisés mensuellement pour l’analyse. Ce n’est pas un historique comptable.
- Pour un achat à vie, contributions uniques réparties sur les mêmes douze premiers mois que l’achat. Aucune recette récurrente créée.
- Reste à charge et potentiel plafonnés pour ne jamais devenir négatifs ou dépasser la dépense restante. Un changement de fréquence suspend la déduction jusqu’à une nouvelle déclaration ; une baisse du prix plafonne la déduction et affiche un avertissement.
- Fiche de saisie, indicateur dans les cartes, rappel des places libres dans Alertes, et interrupteur de simulation dans le graphique des catégories.
- Simulation combinable avec l’amortissement et les vues existantes. Anneau, catégories et détails utilisent le même calcul. Budget, prélèvements, projection et économies de résiliation restent inchangés.
- Modification protégée par RevenueCat côté serveur sur une route dédiée, indépendamment des affirmations du client. Consultation et retrait des métadonnées possibles après perte de Plus. L’expiration réinitialise la simulation et conserve les données.

## Migration serveur et compatibilité

L’ajout serveur est `family_sharing JSONB`, nullable, dans la migration additive existante. Aucun remplissage, suppression ou transformation des anciennes dépenses n’est requis. Les anciens clients continuent à fonctionner ; leurs mises à jour ordinaires ne modifient pas ces métadonnées. Les nouveaux clients nécessitent le backend de cette branche pour enregistrer les partages des comptes connectés.

L’ancien serveur ignore ce champ. Un retour au serveur précédent ne doit jamais supprimer la colonne, le catalogue ou les données locales. Conserver les données pour une reprise ultérieure.

## Vérifications

Validations locales réussies le 15 octobre : TypeScript, 107 tests mobiles, 27 tests serveur, contrôle de la CLI Expo 57.0.27 et exports iOS/Web. Aucun test sur iPhone physique effectué dans cet environnement.

Inspection Replit en lecture seule : dernier build iOS réussi `993bb596-7a4d-4800-822a-009270c78c8e`, version 1.0.0 build 5, commit `e39c673`, profil/environnement production. Ses logs confirment l’API `https://pigeonsub-mobile-app.replit.app/api`. La session Expo `githublaure`, le certificat, le profil de provisioning et la clé de soumission existent ; leur validité sera confirmée par le prochain build/envoi. Le commit local `2ce3564` est exclusivement la déclaration Apple ci-dessus ; l’inspection la plus récente ne détecte plus de modification non enregistrée.

Les commandes de référence sont `npx tsc --noEmit`, `npm test`, `npm run test:backend`, `npm run mobile:check`, `npm run mobile:export:ios` et `npx expo export --platform web --output-dir dist/web`.

Tests ajoutés : catégories supprimées et concurrence, restauration après échec, reprise du catalogue local, migrations répétées et ancien schéma, authentification et propriété des partages, indisponibilité RevenueCat, perte de Plus, montants invalides/nulls/zéro/partiels/complets, annuel et à vie, cumul des simulations, changement de fréquence, changement de compte, notification refusée. Les contrats d’interface sont exercés sur adaptateurs iOS/Web, largeurs 320/390/1280, thèmes clair/sombre ; ils ne remplacent pas une recette visuelle réelle.

Les tests serveur locaux utilisent PGlite avec SQL PostgreSQL réel mais transactions sérialisées. Le workflow GitHub utilise PostgreSQL 16 et teste les verrous sur plusieurs connexions. Ne pas présenter les tests locaux comme la preuve de cette concurrence réelle.

## Publication et recette à effectuer

1. Vérifier que le projet Replit existant est propre, préserver tout travail non enregistré, puis utiliser uniquement le commit validé de cette branche. Ne pas basculer `main`.
2. Identifier l’URL API et les variables du dernier build réussi. Réutiliser les environnements et secrets existants ; ne pas les recopier dans Git ou les journaux.
3. Déployer le backend compatible en conservant ses paramètres et données ; vérifier santé, accès authentifié et rejet des opérations protégées sans Plus avec des comptes de test.
4. Construire iOS avec le profil `production` existant. Identité attendue : `app.replit.pigeonsub`, projet EAS `bffd77a0-5f4b-4443-a05e-4e38dce18ce8`, propriétaire `githublaure`.
5. Soumettre exclusivement l’identifiant du build obtenu à l’application App Store Connect `6807818710`, puis vérifier sa disponibilité TestFlight. Ne pas utiliser « latest » sans vérifier le commit.
6. Sur iPhone réel, faire la recette avant toute fusion ou diffusion App Store : démarrage, connexion/déconnexion, achat/restauration Plus en sandbox, catégories utilisées et archivées, notifications, mode Famille, montants annuels/à vie, thèmes et petit écran.

Un export JavaScript iOS local réussi n’est pas un build natif signé ni une soumission TestFlight. Les identifiants et résultats de publication doivent être enregistrés seulement après vérification effective.
