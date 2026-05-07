# Swiss CPA — Mobile

Version mobile/web statique de l'app de révision Swiss CPA.

**Source** : générée automatiquement par `build_mobile.py` à partir du repo desktop principal. Ne pas éditer ce dossier directement — modifier la source desktop puis relancer le build.

## Déploiement GitHub Pages

```bash
# Premier setup (une seule fois)
cd dist_mobile
git init
git remote add origin git@github.com:<TON_USER>/swiss-cpa-mobile.git
git branch -M main
git add -A
git commit -m "Initial mobile build"
git push -u origin main

# Active GitHub Pages dans : Settings → Pages → Source = main branch / root

# À chaque update :
cd <repo desktop>
python build_mobile.py
cd dist_mobile
git add -A && git commit -m "update" && git push
```

## Limitations connues (vs desktop)

- **AI désactivée** : le correcteur d'anglais et l'assistant IA (via Groq) ne tournent pas en mobile. Visible dans `static/js/api-client-static.js`.
- **Pas d'export PDF** ni de templates Excel audit.
- **Progression localStorage** : la progression sur le mobile est séparée de celle du desktop. Pas de sync automatique.
- **Lecture seule des fichiers** : l'open externe et le file tree sont stub.

Le reste (1200+ QCMs, 316 flashcards, leçons M1-M2-M6-M7-M8, normes M3/M4, module Anglais, recherche, dark/light mode) marche normalement.
