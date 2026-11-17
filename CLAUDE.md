# Swiss CPA — application de révision (site statique)

Application web de révision du diplôme fédéral d'expert-comptable, publiée par
GitHub Pages depuis la **racine de `main`** (`.nojekyll`, pas de build côté
GitHub). URL : https://f2skn9bhfj-sudo.github.io/cpa-data/ — tout `push` sur
`main` est en ligne ~1-2 min après (workflow « pages build and deployment »).

Le README dit que ce dépôt est généré par `build_mobile.py` depuis un dépôt
« desktop » (pywebview + `api.py`). **Ce dépôt desktop n'est pas ici** et les
commits récents modifient ce dépôt directement : on le traite comme la source.
Les scripts `build_*.py` d'origine sont absents ; `tools/sync_subapps.py` les
remplace pour les sous-apps (voir plus bas).

Langue : tout le contenu et les commits sont en **français**. Commits au format
`feat(scope): …` / `fix(scope): …` / `style(scope): …` (scopes vus : audit,
audit/annuaire, modules, recherche, english, M3, manuel-ey, theme, fusion,
grandlivre…).

## Architecture

```
index.html            coquille SPA : barre d'onglets + <main id="mainContent">
js/api-client-static.js  chargé EN PREMIER : installe window.pywebview.api (122
                      méthodes) qui imite l'API Python desktop → lit data/*.json
                      par fetch, progression en localStorage (préfixe
                      swisscpa_static_), stubs pour IA / PDF / Excel.
js/app.js             routeur : navigate(tab) → render<Onglet>(main) ; helper
                      global api(method, ...args) ; thème (clair par défaut),
                      zoom, Pomodoro, « décharge mentale », raccourcis Ctrl+K/Q/D/T.
js/*.js               un fichier par onglet natif + utilitaires (voir tableau)
css/style.css         styles globaux (thème sombre de base, body.light-mode)
<app>/index.html      11 sous-apps React AUTONOMES, ouvertes dans une <iframe>
                      par un petit wrapper js/<app>.js (+ grandlivre en HTML pur)
audio/*.m4a           39 podcasts (531 Mo) lus par l'onglet Podcasts
```

**Cache-busting** : toutes les balises de `index.html` portent `?v=1785430077`
et les wrappers d'iframe recopient ce `v` dans l'URL de la sous-app. Après une
modification de JS/CSS/sous-app, **remplacer ce nombre partout dans
`index.html`** (ex. `date +%s`) sinon les navigateurs gardent l'ancienne version.

### Onglets

| Onglet (data-tab) | Rendu | Type | Données |
|---|---|---|---|
| dashboard | dashboard.js `renderDashboard` | natif | flashcards (carte du jour), HUB_SECTIONS |
| recherche | search_tab.js `renderRechercheTab` | natif | index plein-texte de 10 fichiers data/ + IA Mistral optionnelle (clé saisie par l'utilisateur, localStorage) |
| modules | modules.js `renderModules` (2965 l.) | natif | unified_modules, trainer_courses, norms_ifrs_rpc, notion_lessons, flashcards |
| trainer | trainer.js `renderTrainer` | natif | sprints SM-2 (flashcards) + cours (trainer_courses) |
| qcm | qcm.js `renderQcm` | natif | `get_qcm_catalog` = trainer_courses + unified_modules + audit.json annuaire_cours → **3290 QCM** |
| fcdb | fcdb.js `renderFcdb` | natif | flashcards.json (**1513** cartes) |
| compare | comparisons.js `renderComparisons` | natif | comparisons.json (25 thèmes) |
| fs, references, audit, english, oral, conso, hec, social, fusion, eymanual, grandlivre | js/<app>.js → iframe `<app>/index.html` | sous-app | embarquées (voir plus bas) |
| podcasts | podcasts.js → iframe persistante dans `#podcastHost` (l'audio continue en changeant d'onglet ; mini-lecteur `_pcRenderMini`) | sous-app | `__PODCASTS__` |

L'onglet Audit relaie par `postMessage({type:'openAuditNative', module})` vers 3
modules natifs de la page parente : `renderCanvas` (canvas.js),
`renderMission` (mission.js — scénarios vides en web) et `renderAuditSeuils`
(audit_seuils.js). `audit_cours.js` sert la base MSA/NCR via
`get_audit_manifest`/`get_audit_fiche`.

**Fichiers JS non chargés (code mort, desktop)** : `api-client.js`,
`fiscalite.js`, `ifrs.js`, `norms.js`, `ref_*.js`. Ne pas les modifier en
croyant changer le site.

## Données (`data/`)

| Fichier | Lu par | Contenu |
|---|---|---|
| unified_modules.json (6,3 Mo) | modules, qcm, recherche, pdf_export | `{modules:[16]}` M1–M16 ; module = `{code,name,norms[],lessons_ifp[],lessons_notion,flashcard_count,…}` ; leçon IFP = `{id,code,title,content[{title,body,section_id}],questions[],mindmap_md,title_en,content_en,…}` ; question = `{id,type:"mcq"|"vrai_faux",question,options,answer,explanation,difficulty,section_id}` |
| trainer_courses.json (2,7 Mo) | trainer, modules, qcm | `{courses:[119 {norm_code,norm_title,category,module,module_code,lessons[{id,title,duration_min,content,key_points,questions}]}]}` |
| norms_ifrs_rpc.json (1,5 Mo) | modules (fiche norme) | `{norms:[80 {id,code,title,category,sections,key_rules,thresholds,cross_refs,flashcard_ids,comparisons,html_content,memo_items,course_items}]}` (RPC, IAS/IFRS, CO, LIFD, LTVA, ISA…) |
| norms_enrichment.json | modules | `{enrichments:{rpc1:{…},…}}` |
| flashcards.json (1 Mo) | trainer, fcdb, dashboard, recherche | **liste** de `{id:int,cat,sub,d,q,a}` — ids uniques, max 2195 ; cat ∈ Fiscalité, Swiss GAAP RPC, IFRS / IAS, Audit / ISA, Audit, Expert suisse |
| notion_lessons.json | modules, recherche | liste de 661 `{concept,year,module,notes,priority,section,status,type}` |
| notion_modules.json | API | 16 modules (planning) |
| comparisons.json | compare, recherche | `{themes:[25]}` |
| audit.json (3,9 Mo) | sous-app audit, qcm, recherche | sections `nas, cadre_legal, cycles, terrain, outils, quiz, comparatifs, lexique, annuaire{series[7]→standards[47]}, cas_pratiques, arbres, procedures_assertions, independance, modeles, examens_blancs, timeline, fraude, goingconcern, actualites, annuaire_cours{"200":{tldr,intro,sections,mnemo,schema,quiz,synthese,pieges,mcq[],fiche_revision},…}` (47 normes ISA, 566 QCM) |
| audit_seuils.json | audit_seuils.js, sous-app audit | `{categories:[8]}` |
| canvas_library.json | canvas.js | modèles de feuilles de travail |
| oral.json (1,5 Mo) | sous-app oral, recherche | `{intro,themes[8 {id,title,courses,scenarios,cas_examen,…}],examen}` |
| references.json | sous-app references, recherche | 13 rubriques (courses_ifrs, memo_co, seuils, arbres_decision…) |
| english_module.json + english_{my_notes,meeting,toeic,audit_lab}.json | sous-app english | vocab 461, phrases 200, patterns, vidéos, conversations… |
| financial_statements.json | sous-app fs | `{statements[4],notes[23]}` |
| fraude_postes, audit_referencement, audit_annexes, audit_amortissements, audit_metier | sous-app audit (embarqués) | — |
| podcasts_extra.json | sous-app podcasts | groupe « ISA+ » (8 épisodes) |
| ifrs.json, fiscalite_modules.json | uniquement code mort | — |
| knowledge_graph.json, norm_enrichments_store.json | **orphelins** (aucun code) | — |
| nestle_fs.json | **obsolète** : 5 états ; l'app audit embarque une version à 23 états | — |

Autres sources : `audit/manifest.json` + `audit/controle_{ordinaire,restreint}/**`
(54 fiches MSA/NCR), `hec/manifest.json` + `hec/cours_*/` (15 fichiers),
`conso/lessons_{ifrs,swissgaap}.json`, `fusion/lessons_fusion.json`.

Progression utilisateur : uniquement localStorage du navigateur (clés
`swisscpa_*`), propre à chaque appareil. Aucune base distante.

## Sous-apps : comment elles sont faites et comment les modifier

Chaque `<app>/index.html` embarque **ses données** (`window.__X__ = <JSON>;`,
format exact `json.dumps(obj, ensure_ascii=False)`) **et son code** (un
`<script type="text/babel">` = en-tête d'imports + concaténation des `.jsx` +
`createRoot(...).render(<App/>)`). React/Tailwind/Babel viennent de CDN
(esm.sh, cdn.tailwindcss.com, unpkg — versions **non figées** pour Babel,
Tailwind et lucide-react) sauf `eymanual` et `fusion` qui ont un dossier
`vendor/`.

| Sous-app | Code source | Données embarquées ← source |
|---|---|---|
| audit | conso/lesson_engine.jsx + audit/audit_app.jsx | `__AUDIT__`←data/audit.json, `__AUDIT_BOOK__`←audit/manifest.json+fiches, `__AUDIT_SEUILS__`, `__FRAUDE_POSTES__`, `__REFERENCEMENT__`, `__ANNEXES__`, `__AMORTISSEMENTS__`, `__METIER__` ← data/… ; **sans source** : `__PLAN_COMPTABLE__`, `__NESTLE__`, `__TESTS__`, `__JOURNAL__` |
| conso | conso/wizard.jsx + conso/lesson_engine.jsx | `__CONSO_LESSONS__` ← conso/lessons_*.json |
| english | english/english_app.jsx | `__ENGLISH__` ← data/english_*.json |
| fs | lesson_engine + fs/fs_app.jsx | `__FS__` ← data/financial_statements.json |
| fusion | lesson_engine (LJournal renommé) + fusion/fusion_app.jsx | `__FUSION__` ← fusion/lessons_fusion.json |
| hec | hec/hec_app.jsx | `__HEC__` ← hec/manifest.json + hec/cours_*/* |
| oral | lesson_engine + oral/oral_app.jsx | `__ORAL__` ← data/oral.json |
| podcasts | podcasts/podcasts_app.jsx | `__PODCASTS__` : M2/M4 **sans source**, ISA+ ← data/podcasts_extra.json |
| references | references/references_app.jsx | `__REFS__` ← data/references.json |
| social | social/social_app.jsx | `__SOCIAL__` **sans source** |
| eymanual | eymanual/field-manual.jsx (contenu dans le JSX : SECTIONS, GLOSSARY, QUIZ, FS_DATA…) | — |
| grandlivre | **aucune source** : HTML pur, 26 `<section class="module">` | — |

⚠️ `conso/lesson_engine.jsx` est partagé par **5** sous-apps (audit, conso, fs,
fusion, oral).

### Procédure de modification d'une sous-app

1. Modifier la **source** (le `.jsx` ou le JSON listé ci-dessus).
2. `python3 tools/sync_subapps.py` → liste les pages à resynchroniser.
3. `python3 tools/sync_subapps.py --write [app…]` → réécrit les `index.html`.
4. Pour un bloc **sans source** (tableau ci-dessus) ou grandlivre : éditer
   directement `<app>/index.html` (remplacement de texte ciblé).
5. Bumper `?v=` dans `index.html`, puis `node tools/smoke_test.js`.

`sync_subapps.py` reproduit l'assemblage à l'octet près (vérifié : 11/11 « à
jour » sur l'état actuel). Limite : pour `__AUDIT_BOOK__`, la structure est
reconstruite depuis `audit/manifest.json` (entrées `fichier`, et nœuds à
`sous_fiches`/`cycles` → en-tête `header:true` + enfants `depth+1`).

## Modifier des données JSON

- Valider après chaque modification :
  `python3 -c "import json,glob;[json.load(open(p,encoding='utf-8')) for p in glob.glob('**/*.json',recursive=True)]"`
- Préférer des remplacements de texte ciblés. Si on réécrit un fichier en
  Python : `json.dumps(o, ensure_ascii=False, indent=2)` (indent=1 pour
  audit_annexes, audit_referencement, fraude_postes,
  conso/lessons_*, fusion/lessons_fusion) + `\n` final si le fichier en avait
  un. Ces 10 fichiers ont une mise en forme manuelle (ne pas les réécrire en
  bloc) : audit/manifest.json, hec/manifest.json, data/{audit_amortissements,
  audit_metier, canvas_library, comparisons, norms_enrichment,
  podcasts_extra}.json, 2 fiches audit (03_planification, 07_communication).
- Nouvelle flashcard : id entier unique (> 2195), champs courts `cat/sub/d/q/a`.
- Nouveau QCM : `type` "mcq" (options[], answer = index) ou "vrai_faux" ; `id`
  unique dans tout le catalogue (sinon dédoublonné silencieusement).
- Les données lues par les **sous-apps** sont embarquées : toute modif de
  data/audit.json, oral.json, references.json, english_*, financial_statements,
  podcasts_extra… exige `tools/sync_subapps.py --write`.

## Vérifications

- `node tools/smoke_test.js` : serveur local + Chromium, parcourt les 19
  onglets, signale erreurs JS et fichiers locaux manquants. Dans le conteneur
  cloud, les CDN sont bloqués : les sous-apps CDN restent vides (normal) ; seuls
  eymanual, grandlivre, fusion et les onglets natifs sont vérifiables à fond.
- `python3 tools/sync_subapps.py` doit répondre « à jour » partout avant commit.

## Pièges connus

- Fonctions IA (correcteur anglais, chat_explain), export PDF/Excel, Mission
  Lab, pièces jointes Canvas : stubs en version web.
- `.devmode` est présent mais n'agit qu'en desktop (pywebview).
- `404.html` redirige vers `index.html`.
