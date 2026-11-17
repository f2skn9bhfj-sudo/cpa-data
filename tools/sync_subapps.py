#!/usr/bin/env python3
"""
sync_subapps.py — resynchronise les sous-apps assemblées (<app>/index.html)
avec leurs fichiers sources (JSON de données + .jsx).

Chaque sous-app (audit, conso, english, fs, fusion, hec, oral, podcasts,
references, social, eymanual) est une page AUTONOME qui embarque :
  1. ses données :  window.__X__ = <json.dumps(obj, ensure_ascii=False)>;
  2. son code    :  <script type="text/babel"> (ou text/plain) = en-tête
                    d'imports + concaténation des .jsx + ligne de montage.
Les scripts d'assemblage d'origine (build_*.py) vivent dans le dépôt desktop,
absent d'ici. Cet outil reproduit leur résultat à l'octet près.

Usage (depuis la racine du dépôt) :
  python3 tools/sync_subapps.py            # --check : signale les écarts
  python3 tools/sync_subapps.py --write    # réécrit les index.html concernés
  python3 tools/sync_subapps.py --write audit conso   # seulement ces apps

Données SANS source dans le dépôt (éditer directement dans index.html) :
  audit   : __PLAN_COMPTABLE__, __NESTLE__ (23 états et notes), __TESTS__, __JOURNAL__
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

APPS = {
    'audit': {
        'data': {
            '__AUDIT__': from_file('data/audit.json'),
            '__AUDIT_BOOK__': build_audit_book,
            '__AUDIT_SEUILS__': from_file('data/audit_seuils.json'),
            '__PLAN_COMPTABLE__': KEEP,
            '__FRAUDE_POSTES__': from_file('data/fraude_postes.json'),
            '__REFERENCEMENT__': from_file('data/audit_referencement.json'),
            '__ANNEXES__': from_file('data/audit_annexes.json'),
            '__AMORTISSEMENTS__': from_file('data/audit_amortissements.json'),
            '__NESTLE__': KEEP,
            '__METIER__': from_file('data/audit_metier.json'),
            '__TESTS__': KEEP,
            '__JOURNAL__': KEEP,
        },
        'code': ['conso/lesson_engine.jsx', 'audit/audit_app.jsx'],
    },
    'conso': {
        'data': {'__CONSO_LESSONS__': lambda _o: {'ifrs': jl('conso/lessons_ifrs.json'),
                                                  'swissgaap': jl('conso/lessons_swissgaap.json')}},
        'code': ['conso/wizard.jsx', 'conso/lesson_engine.jsx'],
    },
    'english': {'data': {'__ENGLISH__': build_english}, 'code': ['english/english_app.jsx']},
    'fs': {'data': {'__FS__': from_file('data/financial_statements.json')},
           'code': ['conso/lesson_engine.jsx', 'fs/fs_app.jsx']},
    'fusion': {'data': {'__FUSION__': from_file('fusion/lessons_fusion.json')},
               'code': ['conso/lesson_engine.jsx', 'fusion/fusion_app.jsx']},
    'hec': {'data': {'__HEC__': build_hec}, 'code': ['hec/hec_app.jsx']},
    'oral': {'data': {'__ORAL__': from_file('data/oral.json')},
             'code': ['conso/lesson_engine.jsx', 'oral/oral_app.jsx']},
    'podcasts': {'data': {'__PODCASTS__': build_podcasts}, 'code': ['podcasts/podcasts_app.jsx']},
    'references': {'data': {'__REFS__': from_file('data/references.json')},
                   'code': ['references/references_app.jsx']},
    'social': {'data': {'__SOCIAL__': KEEP}, 'code': ['social/social_app.jsx']},
    'eymanual': {'data': {}, 'code': ['eymanual/field-manual.jsx']},
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


CODE_RE = re.compile(r'(<script type="text/(?:babel|plain)"[^>]*>)(.*?)(</script>)', re.S)


def dump(obj):
    s = json.dumps(obj, ensure_ascii=False)
    if '</script' in s.lower():
        raise ValueError('"</script" dans les données : casserait la page')
    return s


def sync(app, write):
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

    # 2) Code
    cm = CODE_RE.search(new)
    code = cm.group(2)
    segs = []
    cur = 0
    old_segments_found = True
    for p in cfg['code']:
        # On repère le segment actuel grâce à ses premières/dernières lignes non vides.
        cur_src = transform(app, p, rd(p))
        i = code.find(cur_src, cur)
        if i >= 0:
            segs.append((i, i + len(cur_src), cur_src))
            cur = i + len(cur_src)
            continue
        old_segments_found = False
        report.append(f'  ~ code {p} modifié (ou segment non retrouvé)')
        break
    if not old_segments_found:
        # Repli : on repère chaque segment embarqué par son DÉBUT (préfixe) et sa
        # FIN (suffixe), pris dans la source actuelle ou dans sa version git HEAD.
        # Marche tant qu'une modification ne touche pas à la fois les premières
        # et les dernières lignes d'un même fichier.
        import subprocess

        def versions(p):
            out = [transform(app, p, rd(p))]
            try:
                head = subprocess.run(['git', 'show', 'HEAD:' + p], cwd=ROOT, capture_output=True,
                                      text=True, check=True).stdout
                out.append(transform(app, p, head))
            except subprocess.CalledProcessError:
                pass
            return out

        files = cfg['code']
        vers = [versions(p) for p in files]
        starts, cur = [], 0
        for k, p in enumerate(files):
            pos = None
            for v in vers[k]:
                for n in (400, 200, 100, 60):
                    i = code.find(v[:n], cur)
                    if i >= 0:
                        pos = i
                        break
                if pos is not None:
                    break
            if pos is None:
                raise SystemExit(f'{app}: début du segment {p} introuvable dans index.html — corriger à la main.')
            starts.append(pos)
            cur = pos + 1
        tail = code.rfind('createRoot(')
        segs = []
        for k, p in enumerate(files):
            bound = starts[k + 1] if k + 1 < len(files) else (tail if tail > starts[k] else len(code))
            end = None
            for v in vers[k]:
                for n in (400, 200, 100, 60):
                    j = code.rfind(v[-n:], starts[k], bound)
                    if j >= 0:
                        end = j + n
                        break
                if end is not None:
                    break
            if end is None:
                raise SystemExit(f'{app}: fin du segment {p} introuvable dans index.html — corriger à la main.')
            segs.append((starts[k], end, vers[k][0]))
        out, last = [], 0
        for a, b, repl in segs:
            out.append(code[last:a])
            out.append(repl)
            last = b
        out.append(code[last:])
        new_code = ''.join(out)
        if '</script' in new_code.lower():
            raise SystemExit(f'{app}: "</script" dans le code')
        new = new[:cm.start(2)] + new_code + new[cm.end(2):]

    changed = new != page
    if changed and write:
        with open(page_path, 'w', encoding='utf-8') as f:
            f.write(new)
    status = ('ÉCRIT' if write else 'À SYNCHRONISER') if changed else 'à jour'
    print(f'{app:10s} {status}')
    for r in report:
        print(r)
    return changed


def main(argv):
    write = '--write' in argv
    apps = [a for a in argv if not a.startswith('--')] or list(APPS)
    unknown = [a for a in apps if a not in APPS]
    if unknown:
        raise SystemExit(f'apps inconnues : {unknown} (connues : {", ".join(APPS)})')
    dirty = [a for a in apps if sync(a, write)]
    if dirty and not write:
        print('\n→ relancer avec --write pour mettre à jour ces pages.')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
