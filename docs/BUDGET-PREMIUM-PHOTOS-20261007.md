# Budget, vues Plus et photos dès le formulaire

## Cette version

- Stats propose un budget mensuel modifiable et conservé dans l’espace courant (personnel ou démo), avec comparaison au coût réel et au scénario choisi. Les essais gratuits sont exclus du coût courant.
- Le menu propose deux vues gratuites : coût actuel et après les résiliations prévues. Les vues sans les peu utilisés, sans les notes de 1 à 2 étoiles et la vue combinée nécessitent Plus. Les abonnements sans note ne sont pas traités comme mal notés. La vue combinée ne compte pas deux fois un abonnement correspondant à plusieurs critères.
- Ces vues sont des simulations : elles ne suppriment ni ne résilient les abonnements. Les dépenses évitables restent conditionnées à une résiliation effective. Le graphique projette les tarifs après essai selon la date prévue, avec les fins confirmées.
- Les fonctions Plus portent une plume dorée, y compris en démo où elles restent essayables : vues avancées, historique, suivi au-delà des cinq abonnements gratuits, personnalisation au-delà des cinq emplacements et photos supplémentaires.
- L’accueil, l’onboarding et le profil retirent les paragraphes répétitifs sur la connexion. Les informations sur le stockage et la séparation des espaces restent dans Confidentialité ; l’inscription rappelle brièvement la séparation des données.
- L’accès au formulaire se fait par un grand bouton + accessible sur l’accueil et la liste des abonnements.
- Les photos peuvent être sélectionnées, prévisualisées et retirées dès le formulaire d’ajout ou de modification. Elles sont enregistrées avec l’abonnement. Un échec d’enregistrement du lot conserve la galerie précédente ; une nouvelle tentative sur le formulaire ne crée pas un second abonnement.
- Le pigeon fourni remplace exactement le fichier partagé utilisé dans Stats, Coupons, l’onboarding et l’état vide des abonnements. L’icône App Store n’est pas concernée par cette substitution.

## Validation

52 tests automatisés, TypeScript, contrôle Expo SDK 57, parcours navigateur et export iOS réussis. Le parcours vérifie les cinq photos gratuites, une erreur de stockage simulée et sa reprise, la modification des photos, le budget avec virgule, sa persistance, les filtres et leurs accès, les deux thèmes et un écran de 320 px. Les espaces démo et personnel conservent des budgets et photos séparés.

Aucune dépendance ajoutée ou modifiée. Aucun achat réel ni build signé TestFlight effectué. Le sélecteur natif de photos/caméra et les achats réels restent à vérifier sur iPhone.

Captures : [Budget clair](previews/stats-budget-light.png), [simulation](previews/stats-simulation-light.png), [menu](previews/stats-views-menu.png), [photos dans le formulaire](previews/form-photos-light.png), [sombre](previews/stats-budget-dark.png), [320 px](previews/stats-budget-narrow.png).

## Récupérer dans Replit

Arrêter Run. Exécuter une ligne à la fois et s’arrêter si une commande échoue.

```bash
cd ~/workspace
git status --short --branch
git branch backup/replit-before-budget-$(date +%Y%m%d-%H%M%S)
git stash push -u -m "avant-budget-premium-photos"
git fetch origin
git switch main
git pull --ff-only origin main
npm run mobile:check
```

Ne pas réappliquer automatiquement le stash. Les dépendances sont inchangées ; si elles manquent, exécuter `npm ci --include=dev`, puis `npm run mobile:check`.

Relancer Run pour Expo Go. Pour l’aperçu web :

```bash
npm run preview:web
```

Ouvrir le port 8083. Entrer à nouveau dans la démo depuis Profil réinitialise ses exemples, dont un budget de 50 € et des notes variées, sans modifier les données personnelles.

## Sauvegarde avant fusion

`backup/main-before-budget-20261007-c243ec6` conserve le main précédent `c243ec6ed51f3950d428c1db853b944cbdca9d28`.
