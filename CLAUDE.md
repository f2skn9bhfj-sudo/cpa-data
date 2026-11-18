# Swiss CPA — application de révision (site statique)

Application web de révision du diplôme fédéral d'expert-comptable, publiée par
GitHub Pages depuis la **racine de `main`** (`.nojekyll`, pas de build côté
GitHub). URL : https://f2skn9bhfj-sudo.github.io/cpa-data/ — tout `push` sur
`main` est en ligne ~1-2 min après (workflow « pages build and deployment »).

Historiquement généré depuis un dépôt « desktop » (pywebview + `api.py`) qui
n'est pas ici. **Ce dépôt est désormais la source** : on le modifie
directement. `tools/sync_subapps.py` remplace les anciens scripts `build_*.py`.

Langue : contenu et commits en **français**. Commits au format
`feat(scope): …` / `fix(scope): …` / `style(scope): …`.

## Architecture

```
index.html            coquille SPA : barre d'onglets + <main id="mainContent">
js/api-client-static.js  chargé EN PREMIER : installe window.pywebview.api qui
                      imite l'API Python desktop → lit data/*.json par fetch,
                      progression en localStorage (préfixe swisscpa_static_),
                      stubs pour IA / PDF / Excel.
js/app.js             routeur : navigate(tab) → render<Onglet>(main) ; helper
                      global api(method, ...args) ; COLORS (couleur par catégorie
                      de flashcard) ; HIDDEN_TABS ; thème (clair par défaut),
                      zoom, Pomodoro, « décharge mentale », Ctrl+K/Q/D/T.
js/*.js               un fichier par onglet natif + utilitaires (voir tableau)
css/style.css, pdf_export.css   styles de la coquille et des onglets natifs
<app>/index.html      11 sous-apps React AUTONOMES, ouvertes dans une <iframe>
                      par un petit wrapper js/<app>.js (+ grandlivre en HTML pur)
vendor/               React 18.3.1, lucide-react 1.74.0 (seulement les icônes
                      importées par les sous-apps), Tailwind 3.4.16 — copies locales
                      figées (tools/build_vendor.sh) ; babel.min.js 7.29.14 ne sert
                      qu'à l'outil de compilation (jamais chargé par les pages)
audio/*.m4a           39 podcasts (531 Mo) lus par l'onglet Podcasts
tools/                sync_subapps.py (+ compile_jsx.js, build_qcm_catalog.js),
                      build_vendor.sh, smoke_test.js
```

**Cache-busting** : toutes les balises de `index.html` portent `?v=<nombre>`
(même valeur partout) et les wrappers d'iframe recopient ce `v` dans l'URL de
la sous-app. Après une modification de JS/CSS/sous-app, **remplacer ce nombre
partout dans `index.html`** (ex. `date +%s`).

### Navigation : 4 rubriques → pages

La barre du haut n'affiche que des **rubriques** (`NAV_GROUPS`, app.js) ; la
rubrique active liste ses pages dans la sous-barre collante `#subTabBar`
(`renderNavState`). Noms et icônes des pages : `TAB_META` (app.js), réutilisés
par l'accueil (`HUB_SECTIONS`, dashboard.js, mêmes rubriques et même ordre).
`navigate(page)` est inchangé ; `navigateGroup(id)` rouvre la dernière page de
la rubrique (localStorage `swisscpa_nav_last`). Sur mobile, les 4 rubriques
restent dans la barre ; le menu ☰ contient recherche, PDF, thème, et les
boutons 💭 (décharge mentale) / 🍅 (Pomodoro), qui ne flottent plus en bas
d'écran sur téléphone (≤ 768 px).

| Rubrique | Pages (ordre de la sous-barre) |
|---|---|
| 🏠 Accueil | dashboard |
| 📚 Cours | modules, audit, conso, fusion, social, hec, english, podcasts |
| 🎯 S'entraîner | trainer (« Révision active »), qcm, fcdb, oral, progress |
| 🧰 Ressources | references, compare, fs, recherche |

Ajouter une page : un `case` dans `navigate()`, une entrée `TAB_META`, sa place
dans `NAV_GROUPS` (et une carte `HUB_SECTIONS` si elle doit être à l'accueil).
`flashcards` (ancien écran des modes Libre/Quiz/Rappel/Examen blanc, atteint
depuis la Révision active) est un alias de `fcdb` pour la navigation
(`TAB_ALIAS`). La barre de recherche du haut ouvre la page `recherche`
(`openFullSearch`, search.js) : un seul moteur dans l'app.

| Page | Rendu | Type | Données |
|---|---|---|---|
| dashboard | dashboard.js `renderDashboard` : « Plan du jour » (`renderDashPlan`) + question du jour + tuiles `HUB_SECTIONS` | natif | flashcards, suivi QCM, journal quotidien |
| recherche | search_tab.js `renderRechercheTab` (reprend `_stQuery`) | natif | index plein-texte de 9 fichiers data/ + IA Mistral optionnelle (clé saisie par l'utilisateur, localStorage) |
| modules | modules.js `renderModules` (~3000 l.) | natif | unified_modules, trainer_courses, norms_ifrs_rpc, notion_lessons, flashcards ; `navigateToNormByCode(code)` ouvre une norme |
| trainer | trainer.js `renderTrainer` | natif | sprints SM-2 (flashcards) + cours (trainer_courses) ; `launchSprintFromIds` (sélection venue de Flashcards ou du Plan du jour, via sessionStorage `fcdbReviewIds`) |
| qcm | qcm.js `renderQcm` | natif | `get_qcm_catalog` → **data/qcm_catalog.json** (pré-calculé à partir de trainer_courses + unified_modules + audit.json annuaire_cours) → **3762 QCM** (dédoublonnés par texte ; M1–M16 tous couverts, examen blanc pondéré par domaine) |
| fcdb | fcdb.js `renderFcdb` | natif | flashcards.json (**1581** cartes) ; « Réviser la sélection » → sprint |
| compare | comparisons.js `renderComparisons` | natif | comparisons.json (25 thèmes) ; boutons « Normes liées » → `compGoNorm` |
| progress | progress.js `renderProgress` | natif | `get_module_stats` (liste par module : flashcards, leçons de la Révision active, QCM réussis) + sauvegarde/restauration |
| fs, references, audit, english, oral, conso, hec, social, fusion | js/<app>.js → iframe `<app>/index.html` | sous-app | embarquées (voir plus bas) |
| podcasts | podcasts.js → iframe persistante dans `#podcastHost` (l'audio continue en changeant de page ; mini-lecteur `_pcRenderMini`) | sous-app | `__PODCASTS__` |
| eymanual, grandlivre | **masqués** (voir ci-dessous) | sous-app | — |

**Pages masquées** : `eymanual` (Manuel EY) et `grandlivre` (Grand Livre) ne
sont dans aucune rubrique ni dans `HUB_SECTIONS`, et figurent dans
`HIDDEN_TABS` (le bandeau « Reprendre » les ignore). Code et dossiers restent :
`navigate('grandlivre')` fonctionne. Réactiver = l'ajouter à une rubrique de
`NAV_GROUPS` (+ carte d'accueil) et le retirer de `HIDDEN_TABS`.

## Données (`data/`)

| Fichier | Lu par | Contenu |
|---|---|---|
| unified_modules.json (6,3 Mo) | modules, qcm, recherche, pdf_export, podcasts | `{modules:[16]}` M1–M16 ; module = `{code,name,norms[],lessons_ifp[],lessons_notion,flashcard_count,…}` ; leçon IFP = `{id,code,title,content[{title,body,section_id}],questions[],mindmap_md,title_en,content_en,…}` ; norme = `{code,title,id,sections,mindmap_md,questions,memo_items…}` ; question = `{id,type:"mcq"|"vrai_faux",question,options,answer,explanation,difficulty,section_id}` |
| trainer_courses.json (2,7 Mo) | trainer, modules, qcm | `{courses:[119 {norm_code,norm_title,category,module,module_code,lessons[{id,title,duration_min,content,key_points,questions}]}]}` |
| norms_ifrs_rpc.json (1,5 Mo) | modules (fiche norme) | `{norms:[80 {id,code,title,category,sections,key_rules,thresholds,cross_refs,flashcard_ids,comparisons,html_content,memo_items,course_items}]}` |
| flashcards.json (1 Mo) | trainer, fcdb, dashboard, recherche | **liste** de `{id:int,cat,sub,d,q,a}` — ids uniques (max 2269) ; cat ∈ **Fiscalité, Swiss GAAP RPC, IFRS / IAS, Audit / ISA, Expert suisse** (M1) ; d ∈ facile, moyen, difficile, piège |
| notion_lessons.json | modules, recherche | liste de 661 `{concept,year,module,notes,priority,section,status,type}` |
| qcm_catalog.json (3,4 Mo) | qcm, progression, plan du jour | **GÉNÉRÉ** par `sync_subapps.py` (tools/build_qcm_catalog.js exécute `_build_qcm_catalog` d'api-client-static.js) : ne pas éditer, relancer `sync_subapps.py --write qcm` après toute modification d'un QCM |
| comparisons.json | compare, recherche | `{themes:[25 {…, norms:{ifrs,rpc,co}}]}` |
| audit.json (3,9 Mo) | sous-app audit, qcm, recherche | sections `nas, cadre_legal, cycles, outils, quiz, comparatifs, lexique, annuaire{series[7]→standards[47]}, cas_pratiques, arbres, procedures_assertions, independance, modeles, examens_blancs, timeline, fraude, goingconcern, actualites, annuaire_cours{"200":{…,mcq[]}}` (47 ISA, 566 QCM) ; chaque section a `_label/_icon/_description` (affichés sur l'accueil Audit) |
| audit_seuils.json | sous-app audit, recherche | `{categories:[8]}` |
| oral.json (1,5 Mo) | sous-app oral, recherche | `{intro,themes[8],examen}` |
| references.json | sous-app references, recherche | 13 rubriques (courses_ifrs, memo_co, seuils, cas_chiffres…) |
| english_module.json + english_{my_notes,meeting,toeic,audit_lab}.json | sous-app english (+ recherche) | vocab 456, phrases 194… |
| financial_statements.json | sous-app fs | `{statements[4],notes[23]}` |
| fraude_postes, audit_annexes, audit_amortissements | sous-app audit | — |
| podcasts_extra.json | sous-app podcasts | groupe « ISA+ » |

Autres sources : `audit/manifest.json` + `audit/controle_{ordinaire,restreint}/**`
(54 fiches MSA/NCR, toutes « complet »), `hec/manifest.json` + `hec/cours_*/`,
`conso/lessons_{ifrs,swissgaap}.json`, `fusion/lessons_fusion.json`.

**Paramètres sociaux** : les valeurs de référence sont celles de **2027**
(rente AVS max 30'720 = 2'560/mois, min 15'360 ; LPP seuil 23'040, coordination
26'880, plafond 92'160, coordonné 3'840–65'280, intérêt minimal 2 % ; 3a 7'373 /
36'864 ; PDS 23'040 / 61'440 ; AVS indépendants et non-actifs min 541, dégressif
10'300–61'500 ; AC/LAA 148'200 ; TVA 8,1/2,6/3,8 %). Les valeurs 2025-2026
n'apparaissent qu'en rappel explicite (« 22'680 en 2025-2026 »). Le calculateur
du module Social utilise `parametres_2027` (social/index.html, bloc sans source).

**Plan du jour** (accueil, `renderDashPlan`) : 3 actions (sprint de cartes en retard sinon
10 nouvelles → `dashPlanCards` ; leçon à continuer ← `swisscpa_mod_last` écrit par
`modPlayPrepare` ; 10 QCM via `qcmPlanStart` : à revoir → points faibles → erreurs → jamais
vues), objectif quotidien (`swisscpa_daily_goal`, 15/30/50) et série 🔥. Journal commun
`window.swisscpaDaily` (api-client-static.js) : `swisscpa_daily` = {jour:{fc,q,l}} alimenté par
`update_flashcard`, `qcm_record_attempt`, `save_lesson_progress` et les leçons des Modules ;
la série de la Révision active (`getStreak`) en est dérivée. QCM : répétition espacée
(`next_review` : ratée → 1 j, réussie → 4/10/30/90 j), `due_ids` calculé à la lecture ;
`qcm_get_selection` renvoie des **identifiants** (point faible = ≥ 2 essais et < 60 %).

**Comptabilité générale** : M1-L9 à M1-L21 (« Compta 1 » à « Compta 13 », rédigées d'après les
classeurs ComptaLearn : bilan, débit/crédit, bouclement, plan comptable PME, principes, marchandises,
TVA en comptabilité, résultat financier, liquidités, titres, compte privé, immeubles, provisions).
Les leçons TVA (M8-L1 à L12) et de fiscalité directe (M7-L1 à L15) ont chacune une section « 🧩 Cas pratique » en fin de leçon. Contenu
écrit en mots propres (le site est public) : ne pas recopier les classeurs fournis par l'utilisateur.
Mise en forme des textes (crossref.js `_mdEmphasis`) : `**gras**` et `*italique*`.
**Format EXPERTsuisse** : 60 QCM (M7, M8, M1) reprennent la forme de l'examen — début de phrase
à compléter + `\n(Identifiez la réponse correcte)`, options qui complètent la phrase, pièges sur un
mot. Détectés par ce libellé (`_qcmIsEsStyle`, qcm.js) → bouton « 🎓 Format EXPERTsuisse » (20 au
hasard). Énoncés uniques obligatoires (le catalogue dédoublonne par texte).

Leçons des Modules en « mode ludique » (modules.js, `modPlay*`) : bandeau ⏱/étapes/questions
flash, questions de chaque section affichées sous la section (`section_id`), bouton « J'ai
compris », bilan + trophée ; progression dans `swisscpa_mod_read` ({lessonId:{s:[sections],done}}),
badge ✓ sur les cartes et la barre latérale. Anglais : barre adaptative (5 rubriques les plus
utilisées, `swisscpa_eng_usage` / `swisscpa_eng_pins`, reste dans « Plus » ; Écriture retirée).

Progression utilisateur : uniquement localStorage du navigateur (clés
`swisscpa_*` ; `cpa_audit_progress` ne sert plus depuis le retrait du
catalogue des tests, mais reste sauvegardé s'il existe), propre à chaque
appareil. Onglet Progression → « Sauvegarde » : export/import d'un fichier JSON
(`progressExportBackup` / `progressImportBackup`, progress.js ; la clé Mistral
n'est jamais exportée).

## Sous-apps

Chaque `<app>/index.html` embarque **ses données** (`window.__X__ = <JSON>;`,
format exact `json.dumps(obj, ensure_ascii=False)`) **et son code COMPILÉ** :
en-tête d'imports (`head` dans `APPS`, sync_subapps.py) + concaténation des `.jsx`
+ `createRoot(...).render(<App/>)` (`foot`), transformés en JavaScript par
`tools/compile_jsx.js` (node + vendor/babel.min.js, preset react) dans
`<script type="module" id="app-code">`. Le navigateur ne charge plus Babel
(c'était ~4 s de plus sur téléphone). Les imports sont résolus par une importmap
vers `../vendor/` ; eymanual et fusion utilisent React UMD (leur propre `vendor/`)
et un `<script id="fm-src|fusion-src">` classique + une petite amorce.
**Ne jamais éditer le code dans index.html** : modifier le `.jsx`, puis `--write`.

| Sous-app | Code source | Données embarquées ← source |
|---|---|---|
| audit | conso/lesson_engine.jsx + audit/audit_app.jsx | `__AUDIT__`←data/audit.json, `__AUDIT_BOOK__`←audit/manifest.json+fiches, `__AUDIT_SEUILS__`, `__FRAUDE_POSTES__`, `__ANNEXES__`, `__AMORTISSEMENTS__` ← data/… ; **sans source** : `__PLAN_COMPTABLE__`, `__NESTLE__` (23 états/notes) |
| conso | conso/wizard.jsx + conso/lesson_engine.jsx | `__CONSO_LESSONS__` ← conso/lessons_*.json |
| english | english/english_app.jsx | `__ENGLISH__` ← data/english_*.json |
| fs | lesson_engine + fs/fs_app.jsx | `__FS__` ← data/financial_statements.json |
| fusion | lesson_engine (LJournal renommé) + fusion/fusion_app.jsx | `__FUSION__` ← fusion/lessons_fusion.json |
| hec | hec/hec_app.jsx | `__HEC__` ← hec/manifest.json + hec/cours_*/* |
| oral | lesson_engine + oral/oral_app.jsx | `__ORAL__` ← data/oral.json |
| podcasts | podcasts/podcasts_app.jsx | `__PODCASTS__` : M2/M4 **sans source**, ISA+ ← data/podcasts_extra.json |
| references | references/references_app.jsx | `__REFS__` ← data/references.json |
| social | social/social_app.jsx | `__SOCIAL__` **sans source** |
| eymanual | eymanual/field-manual.jsx (contenu dans le JSX) | — |
| grandlivre | **aucune source** : HTML pur, 26 `<section class="module">` | — |

⚠️ `conso/lesson_engine.jsx` est partagé par **5** sous-apps (audit, conso, fs,
fusion, oral).

**Accueil Audit** (`AuditHome` dans audit_app.jsx) : tuiles regroupées par
`AUDIT_HOME_GROUPS` (6 groupes). Une entrée `"@x"` = vue spéciale déclarée dans
`SPECIAL` (revision, book, nestle, plan, fraudepostes, annexes,
amortissements, seuils) ; sinon une section de
data/audit.json. Une section non listée tombe dans le dernier groupe. Les
compteurs (normes ISA, schémas de fraude, tests, chapitres) sont calculés.
Canvas Perso et Mission Lab (desktop uniquement) ont été retirés, puis (nov. 2026,
à la demande de l'utilisateur) « Une journée d'auditeur », « Catalogue des tests
d'audit », « Référencement croisé » et « Terrain EY » : code, données embarquées
(`__METIER__`, `__TESTS__`, `__JOURNAL__`, `__REFERENCEMENT__`), fichiers
data/audit_{metier,referencement}.json et section `terrain` d'audit.json.
**Masqués** (code et données conservés, réversibles) : la tuile « Cas pratiques »
(`AUDIT_HIDDEN` dans audit_app.jsx), les « Tips terrain EY » des cycles
(`SHOW_EY_TIPS = false`) et la rubrique « Terrain EY » des Références (retirée de
`VALID` dans references_app.jsx).

### Procédure de modification d'une sous-app

1. Modifier la **source** (le `.jsx` ou le JSON listé ci-dessus).
2. `python3 tools/sync_subapps.py` → liste les pages à resynchroniser (node requis).
3. `python3 tools/sync_subapps.py --write [app…]` → réécrit les `index.html`
   (et `qcm` → data/qcm_catalog.json).
4. Bloc **sans source** ou grandlivre : éditer directement `<app>/index.html`
   (pour un bloc JSON : charger avec `json.JSONDecoder().raw_decode`, modifier,
   réécrire avec `json.dumps(obj, ensure_ascii=False)`).
5. Bumper `?v=` dans `index.html`, puis `node tools/smoke_test.js`.

Icônes : `vendor/lucide-react.js` ne contient que les icônes importées (en-têtes
+ `.jsx`, `sync_subapps.py --icons`). Une nouvelle icône → `bash tools/build_vendor.sh`
(npm requis) ; `sync_subapps.py` signale l'oubli, sinon la sous-app plante
(« does not provide an export named … »).

## Modifier des données JSON

- Valider : `python3 -c "import json,glob;[json.load(open(p,encoding='utf-8')) for p in glob.glob('**/*.json',recursive=True)]"`
- Réécriture en Python : `json.dumps(o, ensure_ascii=False, indent=2)` (indent=1
  pour audit_annexes, fraude_postes, conso/lessons_*,
  fusion/lessons_fusion) + `\n` final si le fichier en avait un. Mise en forme
  manuelle (remplacements ciblés uniquement) : audit/manifest.json,
  hec/manifest.json, data/{audit_amortissements, comparisons,
  podcasts_extra}.json, 2 fiches audit (03_planification, 07_communication).
- Nouvelle flashcard : id entier unique (> 2269), champs `cat/sub/d/q/a`, `cat`
  parmi les 5 catégories ci-dessus.
- Nouveau QCM : `type` "mcq" (options[], answer = index) ou "vrai_faux"
  (answer booléen) ; `id` unique dans tout le catalogue ; puis
  `python3 tools/sync_subapps.py --write qcm` (catalogue pré-calculé).
- Les données des **sous-apps** sont embarquées : toute modif de data/audit.json,
  oral.json, references.json, english_*, financial_statements, podcasts_extra…
  exige `tools/sync_subapps.py --write`.

## Vérifications

- `node tools/smoke_test.js` : serveur local + Chromium, parcourt les 18 pages
  des rubriques (attend le rendu des iframes), vérifie que la navigation suit
  la page, signale erreurs JS, fichiers locaux
  manquants et sous-apps vides. Tout est vérifiable hors ligne (vendor/).
- `python3 tools/sync_subapps.py` doit répondre « à jour » partout (sous-apps
  et `qcm`), sans alerte d'icône, avant commit.
- `bash tools/build_vendor.sh` uniquement pour changer de version de React,
  Babel, lucide ou Tailwind (npm requis).

## Pièges connus

- Fonctions IA (correcteur anglais, chat_explain), exports PDF/Excel : stubs.
- `api-client-static.js` doit renvoyer les mêmes formes que l'API desktop
  (ex. `get_trainer_progress` → liste) : un objet à la place d'une liste a
  déjà bloqué l'onglet Entraînement.
- `404.html` redirige vers `index.html`.
- `escapeHtml` (crossref.js) n'échappe pas les guillemets : pour un attribut
  (`onclick="…"`), échapper `"` en `&quot;` à part.
- Les flashcards n'ont pas de module dans flashcards.json : `_fcModuleOf`
  (api-client-static.js) le déduit de `sub` (« M2L7 ») ou de `cat` (Fiscalité →
  M7, TVA → M8, RPC → M3, IFRS → M4, ISA → M5/M10, RPC 30/IFRS 3/IAS 28 → M11).
- `formatAnswer` (crossref.js) : une ligne « ⚠️ … » / « 💡 … » d'un texte multiligne
  devient un encadré `.cr-note` ; ailleurs, classes `.cr-hl-*` (le gras suit la couleur
  de la ligne). Ne pas réintroduire de `style="color:…"` en ligne : les onglets
  colorent `<strong>` et le texte devenait bicolore.
- Les onglets natifs injectent leur `<style>` après style.css : une règle
  mobile qui doit l'emporter va dans ce `<style>` (ex. qcm.js), pas dans style.css.
