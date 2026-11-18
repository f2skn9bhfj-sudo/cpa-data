# Swiss CPA — application de révision

Application web statique de révision du diplôme fédéral d'expert-comptable,
publiée par GitHub Pages depuis la racine de la branche `main` :
https://f2skn9bhfj-sudo.github.io/cpa-data/

Contenu : 16 modules (M1–M16), ~3 900 QCM (examen blanc noté sur 6), ~1 590 flashcards, 80 normes
(CO, Swiss GAAP RPC, IFRS/IAS, ISA…), 47 normes ISA en cours complets, le
Manuel suisse d'audit (54 fiches), Conso, Fusion, Social, Oral, Anglais, HEC
et 39 podcasts.

Ce dépôt est la source : on le modifie directement (il n'y a plus de build
depuis un dépôt desktop). Un `push` sur `main` est en ligne en 1 à 2 minutes.

## Organisation

- `index.html` + `js/` + `css/` : la coquille et les onglets natifs.
- `data/` : les données JSON lues par les onglets natifs.
- `<onglet>/index.html` : les sous-apps (Audit, Conso, Oral…), autonomes,
  qui embarquent leurs données et leur code déjà compilé. On modifie leurs
  sources (`.jsx`, JSON) puis on les régénère avec
  `python3 tools/sync_subapps.py --write` (node requis : il compile le JSX et
  recalcule aussi la banque de QCM `data/qcm_catalog.json`).
- `vendor/` : React, Tailwind et les icônes utilisées, en copies locales figées
  (aucune dépendance à un CDN) ; Babel n'y sert qu'à la compilation.

La carte détaillée (schémas des données, procédures de modification, pièges)
est dans `CLAUDE.md`.

## Vérifier avant de publier

```bash
python3 tools/sync_subapps.py      # sous-apps et banque de QCM « à jour »
node tools/smoke_test.js           # les 18 pages s'ouvrent sans erreur
```

Après une modification de JS, CSS ou d'une sous-app, changer le numéro
`?v=` dans `index.html` (même valeur partout) pour que les navigateurs
rechargent les fichiers.

## Limites de la version web

- Assistant IA, correcteur d'anglais, exports PDF/Excel : réservés à
  l'ancienne version desktop (la Recherche propose une IA Mistral optionnelle,
  avec une clé saisie par l'utilisateur).
- Progression enregistrée dans le navigateur (localStorage), propre à chaque
  appareil ; l'onglet Progression permet de la sauvegarder dans un fichier et
  de la restaurer sur un autre appareil.
