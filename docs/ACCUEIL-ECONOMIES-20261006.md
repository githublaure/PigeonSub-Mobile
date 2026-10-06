# PigeonSub — accueil économies, couleurs et archives

## État de GitHub

La PR #2 (onboarding, démo, Plus, thèmes et SDK 57) a été fusionnée dans `main` le 6 octobre 2026 : commit de fusion `f59cfb542fadd5b8fb74cc854ac18b0ea16451e2`.

Le main précédent reste sauvegardé dans `backup/main-before-sdk57-20261006-e94acca` au commit `e94accafa3ec11aaf93baa1428cc1ce4554d2e8c`. Les sauvegardes antérieures sont conservées.

Les nouvelles retouches sont isolées dans `feat/savings-home-polish`, créée depuis ce main fusionné. Elles ne sont pas encore fusionnées dans main. Aucun nouveau build TestFlight n'a été lancé.

## Ce qui change dans cette branche

- **Accueil** : les économies potentielles passent en premier dans une carte verte avec montant annuel en grand, équivalent mensuel et nombre de démarches à terminer. Les économies confirmées par l'utilisateur restent identifiées séparément. Les coûts mensuel/annuel sont affichés juste dessous.
- **Échéances** : les cartes restent triées par date limite d'action, en tenant compte du préavis. La limite est mise en évidence ; l'économie possible d'une résiliation a son propre encadré. Les achats uniques ne sont plus proposés dans les décisions de renouvellement.
- **Démo** : petit badge en haut, ouvrant le profil pour gérer/quitter la démo, à la place du grand bandeau. Les exemples restent explicitement fictifs.
- **Couleur d'abonnement** : six couleurs prédéfinies et un dégradé interactif de teinte/nuance. Aucun code hexadécimal à saisir. La représentation interne reste compatible avec les abonnements existants. Même sélecteur dans l'ajout et la modification.
- **Apparence** : seulement Clair et Sombre. Le choix est conservé. Une ancienne préférence Système est convertie une fois en la couleur alors utilisée par l'appareil ; elle ne suit plus ensuite les changements du système. Une nouvelle installation commence en clair.
- **Archives** : fond, texte et barre latérale gris, libellé Archivé, aucune fausse échéance urgente. La fiche reste ouvrable. L'état archivé tient aussi compte d'une résiliation dont la date de fin est atteinte. Le bouton Archives continue d'inclure les archives dans la liste des abonnements actifs.

Les formules d'économies ne changent pas : une demande de résiliation reste potentielle ; la confirmation et sa date d'effet restent nécessaires. Les montants annualisés ne sont ni un remboursement ni une mesure vérifiée auprès d'une banque.

Aucune modification de `package.json`, `package-lock.json`, `app.json`, du backend ou de `.replit`. Aucun paquet ajouté. Expo reste verrouillé à 57.0.26.

## Récupérer main dans Replit

À la racine du projet mobile, cliquer Stop puis :

```sh
git status
```

Si l'arbre de travail est propre :

```sh
git fetch origin
git switch main
git pull --ff-only origin main
npm ci
npm run mobile:check
```

Le main distant est déjà fusionné : il n'y a pas à refaire `git merge feat/onboarding-safety-paywall`. Run relance ensuite cette version main dans Replit. Un changement de branche ne déclenche pas à lui seul une publication TestFlight.

Si des fichiers modifiés ou non suivis apparaissent, les conserver avant de changer de branche :

```sh
git stash push -u -m "replit-before-main-sdk57-polish"
git stash list
```

Ce stash reste local et n'inclut pas les fichiers ignorés, notamment les secrets `.env`. Ne pas réappliquer d'anciens paramètres de publication ou un lockfile complet sans les comparer. Si Git signale une divergence, conserver le message et les commits locaux ; ne pas utiliser `reset --hard` ou `push --force`.

## Tester les nouvelles retouches dans Replit

Après la récupération de main, arrêter le workflow, vérifier que le travail local est conservé et passer sur la nouvelle branche :

```sh
git fetch origin
git switch feat/savings-home-polish
git pull --ff-only origin feat/savings-home-polish
npm ci
npm run mobile:check
```

Puis Run et ouvrir le nouveau QR/lien dans Expo Go SDK 57. Les dépendances étant les mêmes que main, `npm ci` est une réinstallation reproductible, pas une nouvelle migration. Le preview web reste disponible avec `npm run preview:web` sur le port 8083 déjà déclaré dans Replit.

Pour revenir au main intégré : Stop, vérifier/conserver les changements locaux, `git switch main`, puis Run. Après validation des retouches, fusionner leur PR vers main et refaire `git pull --ff-only origin main` dans Replit avant la publication habituelle.

## Vérifications réalisées

- `npm ci` réussi et contrôle `mobile:check` : SDK 57.0.26, lockfile public cohérent.
- TypeScript sans erreur et **28 tests réussis** : logique existante, conversion des couleurs et migration de l'ancienne préférence Système.
- Export iOS de production réussi.
- Navigateur au format téléphone : économies en haut de l'écran, badge démo compact, deux thèmes persistants, archives grises/ouvrables, sélection et glissement dans le dégradé, ajout puis rechargement/modification, distinction économie potentielle/confirmée après clic Résilier. Aucune erreur JavaScript non interceptée lors de ces parcours.
- Captures inspectées en clair et sombre.

Ces vérifications locales ne sont pas une compilation Xcode signée ni un test du toucher sur iPhone ou du simulateur distant de Replit. À confirmer sur ces appareils avant de republier. Les prérequis Apple/RevenueCat et notifications restent ceux du guide initial.

## Captures web au format téléphone

![Accueil clair](previews/home-savings-light.png)

![Accueil sombre](previews/home-savings-dark.png)

![Archives grises](previews/archives-gray.png)

![Sélecteur de couleur](previews/color-gradient.png)
