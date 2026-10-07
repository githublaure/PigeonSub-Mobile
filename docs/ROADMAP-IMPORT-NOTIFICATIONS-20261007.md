# Feuille de route, prototype CSV et vérification des notifications

## Notifications : état réel

Les rappels classiques sont implémentés comme notifications locales avec Expo Notifications, dans l’application installée. Ils nécessitent l’autorisation du téléphone et l’activation de « Rappel à 9 h » sur une fiche. La date de sûreté choisie, le préavis et l’avance sont pris en compte. Le gratuit couvre les cinq abonnements actifs autorisés ; Plus étend l’accès aux autres abonnements.

La planification est actualisée à l’ouverture, au retour au premier plan, après modification des données et changement des droits. Le clic sur une notification ouvre la fiche si sa portée correspond à la session. Jusqu’à 12 cycles par abonnement et 60 prochaines notifications sont préparés. Les dates déjà passées ne produisent pas de rattrapage. Les essais ne produisent qu’un rappel avant leur fin.

Dans cette version de PigeonSub, le Web, Expo Go et la démo ne programment aucun rappel réel. Cette restriction d’Expo Go est un choix du code de l’app ; elle ne signifie pas que toutes les notifications locales Expo sont incompatibles avec Expo Go. La visite guidée temporaire préserve la programmation personnelle.

**La réception réelle sur iPhone/Android n’a pas été vérifiée ici.** Le calcul, l’appel au planificateur et les contrôles logiciels ne remplacent pas cette vérification.

### Vérification utilisateur ajoutée

Profil → **Notifications · vérifier mes rappels** :

- Statut de permission, nombre de notifications en attente pour l’espace courant et prochaine date connue.
- « Vérifier mes rappels » resynchronise la programmation et expose les erreurs.
- « Tester une notification » demande l’autorisation si nécessaire et programme un test dans 10 secondes. Il ne change ni abonnement ni date de sûreté. Un même identifiant remplace le test précédent ; les synchronisations courantes le préservent et le changement d’espace le nettoie.
- Aucun bouton actif en démo/Web/Expo Go ; aucun faux succès de réception.

Dans la prochaine version installée, tester le bouton en mettant l’app en arrière-plan ; puis tester un vrai rappel à 9 h et le clic vers la bonne fiche. Contrôler aussi refus/réactivation de permission et modes Concentration/silencieux. La programmation n’est pas une garantie de livraison par le système.

## Feuille de route

Accès discret depuis Profil et en bas de la page Premium. Aucun nouvel onglet principal.

| Option | Statut affiché | Offre envisagée / actuelle |
|---|---|---|
| Import CSV | Prototype disponible | Aperçu gratuit ; ajout individuel dans la limite des cinq abonnements ; import groupé Plus |
| Capture ou photo vers abonnement | À l’étude | Plus envisagé, non disponible |
| Rappels vocaux | À l’étude | Plus envisagé, non disponible |
| Bons plans communautaires | À l’étude | Aucune restriction payante annoncée |
| Avis communautaires | À l’étude | Aucune restriction payante annoncée ; notes personnelles toujours gratuites |

Les fonctions à l’étude ne sont pas des avantages achetables. Aucun calendrier ni quota IA illimité promis. La plume « Plus envisagé » ne déclenche pas un achat.

### Votes réellement exploitables

- Compte connecté : GET `/api/roadmap` et PUT `/api/roadmap/:feature`, authentification requise. Un vote par utilisateur/idée, insertion idempotente, retrait possible, validation des identifiants et du booléen. Les votes ne sont pas exposés à d’autres utilisateurs.
- Table `roadmap_votes` créée au démarrage du backend, clé `(user_id, feature_id)`, suppression en cascade avec le compte. Elle nécessite le redéploiement du backend.
- Mode sans compte : votes stockés uniquement sur l’appareil. L’écran le précise et n’affirme pas qu’ils sont transmis. Pas de transfert silencieux à la connexion.
- Démo : votes fictifs isolés, effacés à la remise à zéro.
- L’export des données inclut les votes de l’espace courant. Les erreurs serveur ne modifient pas visuellement le vote précédent.

Pour consulter les priorités depuis l’accès PostgreSQL administrateur déjà autorisé :

```sql
SELECT feature_id, COUNT(*) AS interested_accounts
FROM roadmap_votes
GROUP BY feature_id
ORDER BY interested_accounts DESC;
```

Aucun tableau de bord public, aucun compteur inventé et aucune nouvelle télémétrie d’achat.

## Prototype d’import CSV

Accès Abonnements → **Importer un CSV · prototype**, ou depuis la feuille de route.

1. Choisir un fichier `.csv` ou l’exemple fictif clairement identifié.
2. Vérifier les colonnes date, libellé et montant, puis le signe des débits.
3. Analyser localement. Rien n’est envoyé à un fournisseur IA ou au backend à cette étape.
4. Sélectionner les suggestions ; corriger noms, montants, fréquence et prochaine échéance estimée.
5. Vérifier le récapitulatif et confirmer explicitement les ajouts. Aucun rappel ni date de sûreté n’est activé automatiquement.

### Formats et limites

- CSV UTF-8, séparateur virgule/point-virgule/tabulation, BOM et ligne `sep=;` acceptés, cellules entre guillemets et guillemets échappés.
- 500 Ko, 2 000 transactions et 50 colonnes maximum ; 50 premières suggestions affichées.
- Dates `JJ/MM/AAAA` ou `AAAA-MM-JJ`. Montants en euros ; virgule/point décimal, séparateurs de milliers usuels. Une colonne `Devise`/`Currency` renseignée autrement qu’EUR/€ fait ignorer la ligne.
- Débits négatifs par défaut, positifs si une colonne débit est reconnue ; choix modifiable. Crédits/remboursements/zéros ignorés.
- Au moins deux transactions au libellé normalisé identique, intervalles compatibles semaine/mois/an. Les paiements isolés, rythmes irréguliers ou trimestriels ne sont pas automatiquement reconnus. Ce sont des suggestions, pas des abonnements certifiés.
- Les montants variables sont signalés ; le dernier tarif est proposé. Le CSV ne prouve pas qu’un abonnement reste actif, ne renseigne pas le préavis et ne détermine pas une date de sûreté contractuelle.
- Contrôle des transactions répétées dans le fichier et des abonnements déjà présents (même nom normalisé, fréquence et montant), y compris pendant une reprise d’import partiellement terminé.
- Validation de toute la sélection avant la première écriture, arrêt en cas de changement de session, droits contrôlés au démarrage puis pendant le lot. Les règles de création existantes conservent la limite gratuite. Le contrôle Premium reste côté client, comme les autres fonctions actuelles ; les routes serveur ne constituent pas encore une validation d’entitlement RevenueCat.
- Le CSV reste en mémoire durant l’écran. La copie temporaire native créée par le sélecteur est supprimée après lecture. Seuls les abonnements confirmés sont sauvegardés dans l’espace courant. Le fichier original n’est pas modifié.

Aucune IA, aucune connexion bancaire, aucun abonnement détecté depuis une photo dans cette livraison. L’exemple peut être essayé dans le compte démo pour éviter tout ajout personnel.

## Validation et mise en service

- TypeScript, **69 tests unitaires** : calcul des rappels, droits, CSV, guillemets, devises, crédits, doublons, validation avant écriture, reprise partielle, changements de session, votes locaux et diagnostic de notifications.
- `scripts/check-roadmap-api.cjs` : route HTTP réelle, base et identité de test isolées ; insertion/retrait idempotents, validation et isolation des comptes. Pas de requête à une base de production.
- `scripts/check-roadmap-web.cjs` : parcours mobile Web, votes persistants et séparés, notifications indisponibles explicites, sélection de fichier réelle, colonnes, aperçu/corrections, annulation/confirmation, paywall groupé gratuit, doublons, import groupé démo, thème sombre 320 px ; compte connecté simulé, requêtes de vote et conservation après erreur serveur.
- Export iOS SDK 57 réussi. Ajout du module compatible `expo-document-picker ~57.0.3` : une **nouvelle compilation native** est nécessaire pour le sélecteur dans TestFlight.
- Ni déploiement Replit, ni build signé, ni réception de notification, ni sélection de fichier sur appareil physique effectués ici.

Récupérer main, lancer `npm ci` à la racine puis `npm ci --prefix backend`, redéployer le backend pour les votes, produire une nouvelle version native et effectuer le test de notification sur téléphone.

## Aperçus

- [Feuille de route](previews/roadmap-ideas.png)
- [Suggestions CSV](previews/roadmap-csv-preview.png)
- [Écran de vérification des notifications](previews/roadmap-notifications.png)
- [Feuille de route sombre à 320 px](previews/roadmap-dark.png)

## Documentation de référence

- https://docs.expo.dev/versions/v57.0.0/sdk/notifications/
- https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/
