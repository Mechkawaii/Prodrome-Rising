# Prodrome Rising

Roguelite plateformeur / shooter pixel-art dans l'univers **Mechkawaii**.
Les Prodromes ont envahi la planète. Pilote un Mechkawaii, reprends 6 secteurs et remonte jusqu'au vaisseau mère.

- JavaScript vanilla + canvas, aucun framework, jouable sur iPhone, iPad et navigateur.
- Appli web installable (PWA) : « Sur l'écran d'accueil » → plein écran, fonctionne hors ligne.

## Développement

Le code est dans `src/` (`core`, `sprites`, `data`, `game`, `render`, `ui`) et `shell.html` (interface).
`bash build.sh` assemble le tout dans `index.html`, qui est ce que GitHub Pages sert.

## Publication

Settings → Pages → Deploy from a branch → `main` / `(root)`.
