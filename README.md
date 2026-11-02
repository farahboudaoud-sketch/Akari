# Akari 灯

Jeu de logique Akari (« lumière » en japonais) pour Android, dans l'esthétique de la série : fond bleu nuit, encre blanc cassé, lanternes bordeaux.

## Installer l'application sur le téléphone

1. Sur ton téléphone, ouvre la page **Releases** de ce dépôt (colonne de droite sur GitHub, ou `…/akari/releases`).
2. Dans la dernière version, touche le fichier `akari-1.0.X.apk` pour le télécharger.
3. Ouvre le fichier téléchargé. Android demande d'autoriser l'installation depuis cette source : accepte, puis touche **Installer**.
4. Si Google Play Protect affiche un avertissement (« application inconnue »), choisis **Installer quand même**. C'est normal pour une appli qui ne vient pas du Play Store.

Les mises à jour s'installent par-dessus l'ancienne version sans perdre la partie en cours ni les records.

## Le jeu

- **Règles** : placer des lanternes qui éclairent leur ligne et leur colonne jusqu'au premier mur ; toutes les cases blanches doivent être éclairées, deux lanternes ne doivent jamais se voir, et un mur chiffré indique le nombre exact de lanternes qui le touchent.
- **5 niveaux** : Facile 7×7, Moyen 10×10, Difficile 12×12, Expert 14×16, Maître 16×20. Chaque grille est générée au hasard et un solveur vérifie qu'elle n'a qu'une seule solution. Facile et Moyen se résolvent par déductions directes ; Maître demande de nombreux raisonnements par l'absurde.
- **Niveau personnalisé** : largeur et hauteur au choix, style classique ou difficile.
- **Commandes** : toucher une case pose une lanterne, puis une marque (·), puis vide ; glisser marque ou efface plusieurs cases.
- **Indices progressifs** (zone, case, déduction expliquée), **vérifier**, annuler, effacer, chrono, records, mode clair / sombre, zoom au pincement, sauvegarde automatique. Fonctionne hors connexion.

## Structure

- `src/` : sources de l'appli. `core.js` (noyau commun à la série : accueil, niveaux, zoom, indices, records, thème), `template.html`, les fichiers du jeu, `app.json` (nom, kanji). `python3 src/build.py` assemble `www/index.html` (APK, polices incluses) et `preview.html` (version web).
- `assets/` : icône et écran de démarrage (sources des images générées dans `android/`).
- `android/` : projet Android généré par Capacitor, signé avec une clé fixe pour que les mises à jour s'installent par-dessus.
- `.github/workflows/build-apk.yml` : compile l'APK et le publie dans les Releases à chaque modification sur `main` (ou à la demande depuis l'onglet **Actions**).

## Modifier l'appli

Modifier les fichiers de `src/`, lancer `python3 src/build.py`, puis tester dans un navigateur : servir le dossier `www/` (par exemple `python3 -m http.server` dans `www/`) et ouvrir la page en mode mobile.
