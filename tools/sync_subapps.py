#!/usr/bin/env python3
"""
sync_subapps.py — resynchronise les sous-apps assemblées (<app>/index.html)
avec leurs fichiers sources (JSON de données + .jsx).

Chaque sous-app (audit, conso, english, fs, fusion, hec, oral, podcasts,
references, social, eymanual) est une page AUTONOME qui embarque :
  1. ses données :  window.__X__ = <json.dumps(obj, ensure_ascii=False)>;
  2. son code    :  en-tête d'imports (HEAD) + concaténation des .jsx + ligne
                    de montage (FOOT), COMPILÉ en JavaScript par
                    tools/compile_jsx.js (node + vendor/babel.min.js) :
                    <script type="module" id="app-code"> (importmap → ../vendor/)
                    ou, pour fusion/eymanual (React UMD), <script id="…-src">.
Le navigateur ne charge donc plus Babel (3 Mo, ~4 s sur téléphone).
Ne jamais éditer le code dans index.html : modifier le .jsx puis --write.

Il régénère aussi data/qcm_catalog.json (banque de QCM pré-calculée, voir
tools/build_qcm_catalog.js) : à relancer après toute modification d'un QCM.

Usage (depuis la racine du dépôt) :
  python3 tools/sync_subapps.py            # --check : signale les écarts
  python3 tools/sync_subapps.py --write    # réécrit les index.html concernés
  python3 tools/sync_subapps.py --write audit conso   # seulement ces apps
  python3 tools/sync_subapps.py --write qcm           # seulement data/qcm_catalog.json
  python3 tools/sync_subapps.py --icons    # icônes lucide utilisées (build_vendor.sh)

Données SANS source dans le dépôt (éditer directement dans index.html) :
  audit   : __PLAN_COMPTABLE__, __NESTLE__ (23 états et notes)
  podcasts: groupes M2 et M4 (seul le groupe ISA+ vient de data/podcasts_extra.json)
  social  : __SOCIAL__ entier
L'outil conserve ces blocs tels quels.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEC = json.JSONDecoder()


def rd(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def jl(p):
    return json.loads(rd(p))


# ───────────────────────── Constructeurs de données ─────────────────────────

def _flatten_book(section):
    """manifest audit → structure plate embarquée (__AUDIT_BOOK__)."""
    out = {'titre': section['titre'], 'parties': []}
    for part in section['parties']:
        fiches = []

        def add(node, depth):
            if 'fichier' in node:
                path = node['fichier']
                fiche = jl('audit/' + path) if path.endswith('.json') else rd('audit/' + path)
                fiches.append({'id': node['id'], 'titre': node['titre'],
                               'statut': node.get('statut'), 'depth': depth,
                               'path': path, 'fiche': fiche})
                return
            fiches.append({'id': node['id'], 'titre': node['titre'],
                           'header': True, 'depth': depth})
            for key, val in node.items():
                if isinstance(val, list) and val and isinstance(val[0], dict) and \
                        ('fichier' in val[0] or any(isinstance(v, list) for v in val[0].values())):
                    for sub in val:
                        add(sub, depth + 1)

        for node in part['fiches']:
            add(node, 0)
        out['parties'].append({'id': part['id'], 'titre': part['titre'], 'fiches': fiches})
    return out


def build_audit_book(_old):
    m = jl('audit/manifest.json')
    return {'_meta': m['_meta'],
            'controle_ordinaire': _flatten_book(m['controle_ordinaire']),
            'controle_restreint': _flatten_book(m['controle_restreint'])}


def build_english(_old):
    e = jl('data/english_module.json')
    e['my_notes'] = jl('data/english_my_notes.json')
    e['meeting'] = jl('data/english_meeting.json')
    e['toeic'] = jl('data/english_toeic.json')
    e['audit_lab'] = jl('data/english_audit_lab.json')
    return e


def build_hec(_old):
    m = jl('hec/manifest.json')
    files = {}
    for d in sorted(os.listdir(os.path.join(ROOT, 'hec'))):
        full = os.path.join(ROOT, 'hec', d)
        if not os.path.isdir(full):
            continue
        for f in sorted(os.listdir(full)):
            if f.endswith(('.json', '.md')):
                files[d + '/' + f] = rd('hec/' + d + '/' + f)
    return {'manifest': m, 'files': files}


def build_podcasts(old):
    extra = jl('data/podcasts_extra.json')['groups']
    extra_ids = {g['id'] for g in extra}
    groups = [g for g in old['groups'] if g['id'] not in extra_ids]
    for g in extra:
        items = []
        order = ('id', 'path', 'title', 'kind', 'mime', 'code', 'ref')  # ordre de l'app
        for it in g['items']:
            stem = os.path.splitext(os.path.basename(it['path']))[0]
            it = dict(it, id=it.get('id', stem))
            items.append({k: it[k] for k in order if k in it} |
                         {k: v for k, v in it.items() if k not in order})
        groups.append(dict(g, items=items))
    return {'groups': groups}


def from_file(path):
    return lambda _old: jl(path)


KEEP = None  # bloc sans source : conservé tel quel


def _head(*icons, hooks=(), fmt=False):
    """En-tête d'imports commun des sous-apps « module » (importmap)."""
    h = 'import React from "react";\n'
    if hooks:
        h += 'import { ' + ', '.join(hooks) + ' } from "react";\n'
    h += 'import { createRoot } from "react-dom/client";\n'
    if icons:
        h += 'import { ' + ', '.join(icons) + ' } from "lucide-react";\n'
    if fmt:
        h += ('const fmt = (n) => { if (n === null || n === undefined || isNaN(n)) return \'–\'; '
              'return Math.round(n).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, "\'"); };\n')
    return h


def _mount(comp):
    return f'createRoot(document.getElementById("root")).render(<{comp} />);\n'


ENGINE_ICONS = ('Info', 'AlertTriangle', 'CheckCircle2', 'ArrowRight', 'ArrowLeft', 'ChevronDown',
                'Calculator', 'GraduationCap', 'Search')

APPS = {
    'audit': {
        'data': {
            '__AUDIT__': from_file('data/audit.json'),
            '__AUDIT_BOOK__': build_audit_book,
            '__AUDIT_SEUILS__': from_file('data/audit_seuils.json'),
            '__PLAN_COMPTABLE__': KEEP,
            '__FRAUDE_POSTES__': from_file('data/fraude_postes.json'),
            '__ANNEXES__': from_file('data/audit_annexes.json'),
            '__AMORTISSEMENTS__': from_file('data/audit_amortissements.json'),
            '__NESTLE__': KEEP,
        },
        'code': ['conso/lesson_engine.jsx', 'audit/audit_app.jsx'],
        'head': _head(*ENGINE_ICONS, 'BookOpen', 'Layers', 'Scale', 'ArrowLeftRight', 'FileText',
                      'Banknote', 'Eye', 'TrendingUp', 'TrendingDown', 'Lightbulb', 'ChevronRight',
                      'Gavel', hooks=('useState', 'useEffect', 'useMemo'), fmt=True),
        'foot': _mount('AuditApp'),
    },
    'conso': {
        'data': {'__CONSO_LESSONS__': lambda _o: {'ifrs': jl('conso/lessons_ifrs.json'),
                                                  'swissgaap': jl('conso/lessons_swissgaap.json')}},
        'code': ['conso/wizard.jsx', 'conso/lesson_engine.jsx'],
        'head': _head(),
        'foot': _mount('App'),
    },
    'english': {'data': {'__ENGLISH__': build_english}, 'code': ['english/english_app.jsx'],
                'head': _head('Languages', hooks=('useState', 'useEffect', 'useMemo', 'useRef')),
                'foot': _mount('EnglishApp')},
    'fs': {'data': {'__FS__': from_file('data/financial_statements.json')},
           'code': ['conso/lesson_engine.jsx', 'fs/fs_app.jsx'],
           'head': _head(*ENGINE_ICONS, hooks=('useState', 'useEffect'), fmt=True),
           'foot': _mount('FsApp')},
    # fusion et eymanual : React UMD (vendor/ propre), code en <script> classique + amorce
    'fusion': {'data': {'__FUSION__': from_file('fusion/lessons_fusion.json')},
               'code': ['conso/lesson_engine.jsx', 'fusion/fusion_app.jsx'],
               'script_id': 'fusion-src', 'head': '', 'foot': ''},
    'hec': {'data': {'__HEC__': build_hec}, 'code': ['hec/hec_app.jsx'],
            'head': _head('GraduationCap', 'ArrowLeft', hooks=('useState', 'useEffect', 'useRef')),
            'foot': _mount('HecApp')},
    'oral': {'data': {'__ORAL__': from_file('data/oral.json')},
             'code': ['conso/lesson_engine.jsx', 'oral/oral_app.jsx'],
             'head': _head(*ENGINE_ICONS, 'Mic', 'Clock', 'RotateCcw', 'Shuffle',
                           hooks=('useState', 'useEffect'), fmt=True),
             'foot': _mount('OralApp')},
    'podcasts': {'data': {'__PODCASTS__': build_podcasts}, 'code': ['podcasts/podcasts_app.jsx'],
                 'head': _head('Headphones', 'Play', 'Pause', 'RotateCcw', 'RotateCw', 'Search',
                               'CheckCircle2', 'X', 'ListMusic', 'Disc3', 'Repeat', 'Clock',
                               hooks=('useState', 'useEffect', 'useMemo', 'useRef')),
                 'foot': _mount('PodcastsApp')},
    'references': {'data': {'__REFS__': from_file('data/references.json')},
                   'code': ['references/references_app.jsx'],
                   'head': _head('BookOpen', 'GraduationCap', 'FileText', 'Languages', 'Ruler',
                                 'Network', 'Calculator', 'GitBranch', 'Recycle', 'ClipboardCheck',
                                 'Search', 'ChevronDown', 'RotateCcw', 'Check',
                                 hooks=('useState', 'useEffect', 'useMemo')),
                   'foot': _mount('ReferencesApp')},
    # social_app.jsx se termine lui-même par createRoot(...)
    'social': {'data': {'__SOCIAL__': KEEP}, 'code': ['social/social_app.jsx'],
               'head': _head(hooks=('useState', 'useMemo')), 'foot': ''},
    'eymanual': {'data': {}, 'code': ['eymanual/field-manual.jsx'], 'script_id': 'fm-src',
                 'head': 'const { useState, useMemo } = React;\n', 'foot': ''},
}


# ───────────────────────── Transformations du code ─────────────────────────

def transform(app, path, src):
    """Reproduit les retouches faites par l'assemblage d'origine."""
    if app == 'eymanual':
        src = src.replace('import { useState, useMemo } from "react";\n', '')
        src = src.replace('export default function App', 'function App')
    if app == 'fusion' and path == 'conso/lesson_engine.jsx':
        # fusion_app.jsx définit son propre LJournal → l'original est renommé
        src = src.replace('function LJournal(', 'function LJournalMoteurNonUtilise(')
    return src.strip()


# Bloc de code : ancien format (JSX compilé par le navigateur) ou format compilé.
CODE_RE = re.compile(r'(<script (?:type="text/(?:babel|plain)"[^>]*|type="module" id="app-code"|'
                     r'id="(?:fusion-src|fm-src)")>)(.*?)(</script>)', re.S)
# Amorce des pages React UMD (fusion, eymanual) : plus de Babel.transform.
OLD_BOOT = re.compile(r"\n    var src = document\.getElementById\('[a-z-]+'\)\.textContent;\n"
                      r"    var out = Babel\.transform\(src, \{ presets: \[\['react', \{ runtime: 'classic' \}\]\] \}\)\.code;\n"
                      r"    \(0, eval\)\(out\);\n")
NEW_BOOT = "\n    if (typeof App !== 'function') throw new Error('code de l\\'application absent');\n"


def assemble(app):
    """JSX complet d'une app : en-tête + fichiers sources + ligne de montage."""
    cfg = APPS[app]
    parts = [transform(app, p, rd(p)) for p in cfg['code']]
    return cfg['head'] + '\n' + '\n\n\n'.join(parts) + '\n\n' + cfg['foot']


def compile_all(apps):
    """Compile le JSX de plusieurs apps en un seul appel à node (tools/compile_jsx.js)."""
    import subprocess
    jobs = {a: {'code': assemble(a), 'mode': 'script' if 'script_id' in APPS[a] else 'module'}
            for a in apps}
    try:
        r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'compile_jsx.js')],
                           input=json.dumps(jobs), capture_output=True, text=True, check=True)
    except FileNotFoundError:
        raise SystemExit('node introuvable : il sert à compiler le JSX (tools/compile_jsx.js).')
    except subprocess.CalledProcessError as e:
        raise SystemExit('Erreur de compilation JSX :\n' + e.stderr)
    return json.loads(r.stdout)


def dump(obj):
    s = json.dumps(obj, ensure_ascii=False)
    if '</script' in s.lower():
        raise ValueError('"</script" dans les données : casserait la page')
    return s


def sync(app, write, compiled):
    cfg = APPS[app]
    page_path = os.path.join(ROOT, app, 'index.html')
    page = rd(app + '/index.html')
    new = page
    report = []

    # 1) Données
    for name, builder in cfg['data'].items():
        m = re.search(r'window\.' + name + r'\s*=\s*', new)
        if not m:
            report.append(f'  ! {name} introuvable dans la page')
            continue
        old_obj, end = DEC.raw_decode(new, m.end())
        if builder is KEEP:
            continue
        txt = dump(builder(old_obj))
        if new[m.end():end] != txt:
            report.append(f'  ~ données {name} différentes de la source')
            new = new[:m.end()] + txt + new[end:]

    # 2) Code (compilé)
    cm = CODE_RE.search(new)
    if not cm:
        raise SystemExit(f'{app}: bloc de code introuvable dans index.html')
    srcs = ', '.join(cfg['code'])
    body = (f'\n// Généré par tools/sync_subapps.py depuis {srcs} : modifier ces fichiers, pas cette page.\n'
            + compiled + '\n')
    for bad in ('</script', '<!--'):
        if bad in body.lower():
            raise SystemExit(f'{app}: "{bad}" dans le code compilé : casserait la page')
    tag = f'<script id="{cfg["script_id"]}">' if 'script_id' in cfg else '<script type="module" id="app-code">'
    if cm.group(1) != tag or cm.group(2) != body:
        report.append(f'  ~ code ({srcs}) à recompiler')
        new = new[:cm.start()] + tag + body + '</script>' + new[cm.end():]
    # Babel n'est plus chargé par la page
    new = re.sub(r'<script src="(?:\.\./)?vendor/babel\.min\.js"></script>\n', '', new)
    new = OLD_BOOT.sub(NEW_BOOT, new)

    changed = new != page
    if changed and write:
        with open(page_path, 'w', encoding='utf-8') as f:
            f.write(new)
    status = ('ÉCRIT' if write else 'À SYNCHRONISER') if changed else 'à jour'
    print(f'{app:10s} {status}')
    for r in report:
        print(r)
    return changed


def used_icons():
    """Icônes lucide importées par les sous-apps « module » : en-têtes ET fichiers .jsx
    (conso/wizard.jsx importe les siennes)."""
    icons = set()
    for cfg in APPS.values():
        if 'script_id' in cfg:
            continue  # React UMD : pas de lucide
        for txt in [cfg['head']] + [rd(p) for p in cfg['code']]:
            for m in re.finditer(r'import\s*\{([^}]*)\}\s*from\s*["\']lucide-react["\']', txt):
                icons |= {x.split(' as ')[0].strip() for x in m.group(1).split(',') if x.strip()}
    return sorted(icons)


def check_icons():
    """vendor/lucide-react.js ne contient que les icônes listées : signale un manque."""
    blocks = re.findall(r'export\{([^}]*)\}', rd('vendor/lucide-react.js'))
    if not blocks:
        return
    exported = {x.split(' as ')[-1].strip() for x in blocks[-1].split(',')}
    missing = [i for i in used_icons() if i not in exported]
    if missing:
        print(f'! icônes absentes de vendor/lucide-react.js : {", ".join(missing)} '
              '→ lancer bash tools/build_vendor.sh (la page planterait)')
    return missing


def sync_qcm_catalog(write):
    """data/qcm_catalog.json : banque de QCM pré-calculée (tools/build_qcm_catalog.js)
    à partir de trainer_courses, unified_modules et audit.json — à régénérer après
    toute modification d'un QCM."""
    import subprocess
    try:
        r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'build_qcm_catalog.js')],
                           capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as e:
        raise SystemExit('Erreur build_qcm_catalog.js :\n' + e.stderr)
    path = os.path.join(ROOT, 'data', 'qcm_catalog.json')
    old = rd('data/qcm_catalog.json') if os.path.exists(path) else None
    changed = old != r.stdout
    if changed and write:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(r.stdout)
    n = len(json.loads(r.stdout)['questions'])
    status = ('ÉCRIT' if write else 'À SYNCHRONISER') if changed else 'à jour'
    print(f'{"qcm":10s} {status} (data/qcm_catalog.json, {n} questions)')
    return changed


def main(argv):
    if '--icons' in argv:
        print(', '.join(used_icons()))
        return 0
    missing_icons = check_icons()
    write = '--write' in argv
    apps = [a for a in argv if not a.startswith('--')] or list(APPS) + ['qcm']
    do_qcm = 'qcm' in apps
    apps = [a for a in apps if a != 'qcm']
    unknown = [a for a in apps if a not in APPS]
    if unknown:
        raise SystemExit(f'apps inconnues : {unknown} (connues : {", ".join(APPS)})')
    compiled = compile_all(apps) if apps else {}
    dirty = [a for a in apps if sync(a, write, compiled[a])]
    if do_qcm and sync_qcm_catalog(write):
        dirty.append('qcm')
    if dirty and not write:
        print('\n→ relancer avec --write pour mettre à jour ces pages.')
        return 1
    return 1 if missing_icons else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
