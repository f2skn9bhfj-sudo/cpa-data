/* ═══════════════════════════════════════════════════════════════
   Onglet 🔎 RECHERCHE — moteur plein-texte sur TOUTE l'application
   (normes M1-M16, leçons, fiches Notion, flashcards, cours ISA,
   lexique audit, seuils, anglais, comparaisons, oral, références…)
   + assistant IA optionnel (Mistral, clé stockée en localStorage).
   Indépendant du dropdown historique js/search.js.
   ═══════════════════════════════════════════════════════════════ */

let _stIndex = null;          // [{t,ic,ti,br,x,full,act}] — construit une seule fois
let _stBuilding = null;       // promesse de construction en cours
let _stResults = [];          // derniers résultats affichés
let _stFilter = '';           // filtre type actif
let _stQuery = '';

const ST_TYPES = {
    norme:     { ic: '📘', label: 'Normes',        color: '#3b82f6' },
    lecon:     { ic: '📖', label: 'Leçons',        color: '#8b5cf6' },
    notion:    { ic: '📝', label: 'Fiches Notion', color: '#a78bfa' },
    flashcard: { ic: '🃏', label: 'Flashcards',    color: '#f59e0b' },
    audit:     { ic: '🔍', label: 'Cours audit',   color: '#10b981' },
    lexique:   { ic: '📔', label: 'Lexique audit', color: '#14b8a6' },
    seuil:     { ic: '🎯', label: 'Seuils',        color: '#ef4444' },
    anglais:   { ic: '🇬🇧', label: 'Anglais',       color: '#6366f1' },
    comparaison:{ ic: '⚖️', label: 'Comparaisons', color: '#eab308' },
    oral:      { ic: '🎤', label: 'Oral',          color: '#ec4899' },
    reference: { ic: '📚', label: 'Références',    color: '#64748b' },
};

/* ── Normalisation longueur-préservée (accents/casse) pour chercher ET surligner ── */
function stNorm(s) {
    if (!s) return '';
    let out = '';
    const low = String(s).toLowerCase();
    for (const ch of low) {
        const d = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
        out += (d.length === 1 ? d : (d[0] || ch));
    }
    return out;
}

/* ── Chargement des sources ── */
async function stFetchJson(file) {
    for (const base of ['data/', '../data/']) {
        try {
            const r = await fetch(base + file, { cache: 'no-cache' });
            if (r.ok) return await r.json();
        } catch (e) { /* essaie le chemin suivant */ }
    }
    return null;
}

function stWalkText(obj, cap) {
    // Concatène toutes les chaînes d'un objet (générique, avec plafond)
    const parts = [];
    let n = 0;
    (function walk(o) {
        if (n > cap) return;
        if (typeof o === 'string') { if (o.length > 2 && !o.startsWith('http')) { parts.push(o); n += o.length; } }
        else if (Array.isArray(o)) o.forEach(walk);
        else if (o && typeof o === 'object') Object.values(o).forEach(walk);
    })(obj);
    return parts.join(' • ').slice(0, cap);
}

async function stBuildIndex(onProgress) {
    const docs = [];
    const push = (t, ti, br, text, act, full) => {
        if (!ti) return;
        docs.push({ t, ti: String(ti), br: br || '', x: stNorm(ti + ' ' + (br || '') + ' ' + (text || '')), raw: (text || '').slice(0, 4000), full: (full || text || '').slice(0, 2500), act: act || null });
    };
    const prog = (m) => { try { onProgress(m, docs.length); } catch (e) {} };

    // 1) Modules unifiés : normes + leçons IFP
    prog('Modules & normes…');
    let uni = null;
    try { uni = await api('get_unified_modules'); } catch (e) {}
    if (!uni) uni = await stFetchJson('unified_modules.json');
    const modules = (uni && uni.modules) || [];
    for (const m of modules) {
        for (const nrm of (m.norms || [])) {
            if (!nrm || typeof nrm !== 'object') continue;
            const secTxt = (nrm.sections || []).map(s => s && (s.title + ' ' + (s.content || '') + ' ' + (s.key_point || '') + ' ' + (s.example || '') + ' ' + (s.warning || ''))).join(' ');
            const extras = [(nrm.summary || ''), (nrm.key_rules || []).join(' '), (nrm.exam_tips || []).join(' '),
                Array.isArray(nrm.mnemonics) ? nrm.mnemonics.join(' ') : (nrm.mnemonics || ''),
                (nrm.thresholds || []).map(t => t && (t.label + ' ' + t.value)).join(' '),
                (nrm.questions || []).map(q => q && (q.question + ' ' + (q.explanation || ''))).join(' ')].join(' ');
            const _t0 = nrm.title || nrm.code || '';
            push('norme', (nrm.code && !_t0.startsWith(nrm.code)) ? nrm.code + ' — ' + _t0 : _t0, 'Module ' + m.id + ' · ' + (m.name || ''),
                secTxt + ' ' + extras, { k: 'norm', code: nrm.code }, (nrm.summary || '') + '\n\n' + secTxt);
        }
        for (const l of (m.lessons_ifp || [])) {
            const body = (l.content || []).map(c => (c && (c.title ? c.title + ' — ' : '') + (c.body || '')) || '').join('\n');
            push('lecon', l.title || ('Leçon ' + (l.number || '')), 'Module ' + m.id + ' · ' + (m.name || ''), body, { k: 'module', mid: m.id }, body);
        }
    }

    // 2) Fiches Notion
    prog('Fiches Notion…');
    const notion = await stFetchJson('notion_lessons.json');
    if (Array.isArray(notion)) {
        for (const it of notion) {
            if (!it || !it.concept) continue;
            push('notion', it.concept, (it.module ? 'Module ' + it.module : '') + (it.section ? ' · ' + it.section : ''),
                (it.notes || '') + ' ' + (it.type || ''), it.module ? { k: 'module', mid: it.module } : { k: 'tab', tab: 'modules' }, it.notes || '');
        }
    }

    // 3) Flashcards
    prog('Flashcards…');
    const fcs = await stFetchJson('flashcards.json');
    if (Array.isArray(fcs)) {
        for (const c of fcs) {
            if (!c || !c.q) continue;
            push('flashcard', c.q, (c.cat || '') + (c.sub ? ' › ' + c.sub : ''), c.a || '', { k: 'tab', tab: 'fcdb' }, 'Q : ' + c.q + '\n\nR : ' + (c.a || ''));
        }
    }

    // 4) Audit : cours ISA + lexique + autres blocs
    prog('Cours audit (ISA)…');
    const audit = await stFetchJson('audit.json');
    if (audit) {
        const ac = audit.annuaire_cours || {};
        for (const num of Object.keys(ac)) {
            const c = ac[num] || {};
            const txt = [(c.tldr || ''), (c.intro || ''), stWalkText(c.sections, 6000), stWalkText(c.pieges, 1500), (c.synthese || '')].join(' ');
            push('audit', 'ISA ' + num + (c.titre ? ' — ' + c.titre : ''), 'Audit · Base de cours', txt, { k: 'tab', tab: 'audit' }, (c.tldr || '') + '\n\n' + (c.intro || ''));
        }
        for (const cat of ((audit.lexique && audit.lexique.categories) || [])) {
            for (const it of (cat.items || [])) {
                if (!it || !it.acronym) continue;
                push('lexique', it.acronym + ' — ' + (it.fr || it.en || ''), 'Audit · Lexique · ' + (cat.label || ''),
                    (it.en || '') + ' ' + (it.context || ''), { k: 'tab', tab: 'audit' },
                    (it.fr || '') + (it.en ? '\nEN : ' + it.en : '') + (it.context ? '\n\n' + it.context : ''));
            }
        }
    }

    // 5) Seuils & exercices
    prog('Seuils…');
    const seuils = await stFetchJson('audit_seuils.json');
    for (const cat of ((seuils && seuils.categories) || [])) {
        const am = cat.aide_memoire || {};
        const txt = [(am.concept || ''), stWalkText(am.niveaux, 2500), (am.mental_model || ''), (am.pitfalls || []).join(' '),
            (cat.exercises || []).map(e => e && (e.scenario + ' ' + e.question)).join(' ')].join(' ');
        push('seuil', cat.label, 'Audit · Seuils & Exercices', txt, { k: 'tab', tab: 'audit' }, (am.concept || '') + '\n\n' + (am.mental_model || '') + '\n\nPièges :\n• ' + (am.pitfalls || []).join('\n• '));
    }

    // 6) Anglais : vocabulaire + phrases
    prog('Anglais…');
    const eng = await stFetchJson('english_module.json');
    if (eng) {
        for (const v of (eng.vocab || [])) {
            if (!v || !v.en) continue;
            push('anglais', v.en + ' — ' + (v.fr || ''), 'Anglais · Vocabulaire' + (v.domain ? ' · ' + v.domain : ''),
                (v.notes || '') + ' ' + stWalkText(v.examples, 300), { k: 'tab', tab: 'english' }, (v.ipa ? '/' + v.ipa + '/\n' : '') + (v.notes || ''));
        }
        for (const p of (eng.phrases || [])) {
            if (!p || !p.en) continue;
            push('anglais', p.fr || p.en, 'Anglais · Phrases', p.en + ' ' + (p.context || ''), { k: 'tab', tab: 'english' }, p.en + (p.context ? '\n\n' + p.context : ''));
        }
    }

    // 7) Comparaisons
    prog('Comparaisons…');
    const comp = await stFetchJson('comparisons.json');
    for (const th of ((comp && comp.themes) || [])) {
        push('comparaison', th.title || th.id || 'Comparaison', 'Comparaisons', stWalkText(th, 4000), { k: 'tab', tab: 'compare' });
    }

    // 8) Oral
    prog('Oral…');
    const oral = await stFetchJson('oral.json');
    for (const th of ((oral && oral.themes) || [])) {
        push('oral', th.titre || th.title || th.id || 'Thème oral', 'Examen oral', stWalkText(th, 4000), { k: 'tab', tab: 'oral' });
    }

    // 9) Références (mémos, cas chiffrés, arbres…)
    prog('Références…');
    const refs = await stFetchJson('references.json');
    if (refs && typeof refs === 'object') {
        const label = { memo_co: 'Mémo CO', memo_rpc: 'Mémo RPC', memo_ifrs: 'Mémo IFRS', cas_chiffres: 'Cas chiffrés', arbres_decision: 'Arbres de décision', restructuration: 'Restructuration', terrain: 'Terrain' };
        for (const key of Object.keys(label)) {
            const sec = refs[key];
            if (!sec) continue;
            const items = Array.isArray(sec) ? sec : (sec.items || sec.cas || sec.arbres || []);
            if (Array.isArray(items)) {
                for (const it of items) {
                    const ti = it && (it.titre || it.title || it.nom || it.t);
                    if (ti) push('reference', ti, 'Références · ' + label[key], stWalkText(it, 3000), { k: 'tab', tab: 'references' });
                }
            }
        }
    }

    prog('Finalisation…');
    return docs;
}

/* ── Recherche + scoring ── */
// Tokens « référentiel » : quand la requête contient rpc/ifrs/co…, on booste
// fortement les documents dont le titre/la catégorie portent ce référentiel
// (ex. « goodwill RPC » → le cours RPC sur le goodwill remonte en tête).
const ST_REF_TOKENS = { rpc: 1, ifrs: 1, ias: 1, co: 1, isa: 1, nas: 1, lfus: 1, tva: 1, lia: 1, lifd: 1 };
const ST_COURSE_TYPES = { norme: 1, lecon: 1, audit: 1, seuil: 1, reference: 1 };

function stSearch(query) {
    const q = stNorm(query.trim());
    if (!q || q.length < 2 || !_stIndex) return [];
    const tokens = q.split(/\s+/).filter(t => t.length >= 2);
    if (!tokens.length) return [];
    const out = [];
    for (const d of _stIndex) {
        const tiN = stNorm(d.ti), brN = stNorm(d.br);
        let ok = true;
        for (const t of tokens) { if (!d.x.includes(t) && !tiN.includes(t) && !brN.includes(t)) { ok = false; break; } }
        if (!ok) continue;
        let score = 0;
        if (tiN === q) score += 400;
        else if (tiN.includes(q)) score += 160;
        if (tiN.startsWith(q)) score += 90;
        for (const t of tokens) {
            if (tiN.includes(t)) score += 40;
            if (brN.includes(t)) score += 12;
            // Fréquence du terme dans le texte : un cours qui parle VRAIMENT du
            // sujet (goodwill × 15) bat une carte qui le mentionne une fois.
            let occ = 0, p = 0;
            while (occ < 12 && (p = d.x.indexOf(t, p)) >= 0) { occ++; p += t.length; }
            score += Math.min(occ, 12) * 5;
            // Bonus référentiel : « rpc » dans la requête + titre/catégorie RPC
            if (ST_REF_TOKENS[t] && (tiN.includes(t) || brN.includes(t))) score += 55;
        }
        if (d.x.includes(q)) score += 60;
        // Priorité pédagogique : les COURS avant les cartes isolées
        if (d.t === 'norme') score += 28;
        else if (d.t === 'lecon' || d.t === 'audit') score += 20;
        else if (d.t === 'seuil') score += 14;
        else if (d.t === 'notion') score += 4;
        else if (d.t === 'flashcard') score -= 12;
        else if (d.t === 'anglais') score -= 10;
        out.push({ d, score });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, 400).map(o => o.d);
}

function stHighlight(raw, query, maxLen) {
    const rawN = stNorm(raw);
    const q = stNorm(query.trim());
    const tokens = q.split(/\s+/).filter(t => t.length >= 2);
    let start = 0;
    const phrasePos = rawN.indexOf(q);
    const firstTok = phrasePos >= 0 ? phrasePos : (tokens.map(t => rawN.indexOf(t)).filter(p => p >= 0).sort((a, b) => a - b)[0] ?? -1);
    if (firstTok > 60) start = Math.max(0, firstTok - 60);
    let slice = raw.slice(start, start + maxLen);
    const sliceN = rawN.slice(start, start + maxLen);
    // Repérage des zones à surligner dans la tranche (via l'index normalisé)
    const marks = [];
    for (const t of (phrasePos >= 0 ? [q] : tokens)) {
        let p = 0;
        while (marks.length < 12 && (p = sliceN.indexOf(t, p)) >= 0) { marks.push([p, p + t.length]); p += t.length; }
    }
    marks.sort((a, b) => a[0] - b[0]);
    let html = '', cur = 0;
    for (const [a, b] of marks) {
        if (a < cur) continue;
        html += escapeHtml(slice.slice(cur, a)) + '<mark class="st-mark">' + escapeHtml(slice.slice(a, b)) + '</mark>';
        cur = b;
    }
    html += escapeHtml(slice.slice(cur));
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*\*/g, '');
    return (start > 0 ? '…' : '') + html + (raw.length > start + maxLen ? '…' : '');
}

/* ── Rendu ── */
async function renderRechercheTab(container) {
    container.innerHTML = stStyles() + `
    <div class="st-page fade-in">
        <div class="st-hero">
            <h1 class="st-title">🔎 Recherche</h1>
            <p class="st-sub">Toute l'application en une recherche : normes, cours, flashcards, audit, seuils, anglais, comparaisons…</p>
            <div class="st-box-wrap">
                <input id="stInput" class="st-box" type="text" placeholder="Cherche un article, un seuil, un concept… (ex. réserve légale, IFRS 16, 653k)"
                    autocomplete="off" oninput="stOnInput(this.value)" onkeydown="stOnKey(event)" />
                <button class="st-clear" onclick="stClear()" title="Effacer (Échap)">✕</button>
            </div>
            <div class="st-meta" id="stMeta"></div>
            <div class="st-chips" id="stChips"></div>
        </div>
        <div id="stAiPanel"></div>
        <div id="stResults"></div>
    </div>`;

    stRenderAiPanel();
    const meta = document.getElementById('stMeta');
    if (!_stIndex) {
        if (!_stBuilding) {
            _stBuilding = stBuildIndex((msg, count) => {
                const m = document.getElementById('stMeta');
                if (m) m.innerHTML = `<span class="st-build">⏳ Indexation — ${escapeHtml(msg)} <b>${count}</b> documents</span>`;
            }).then(docs => { _stIndex = docs; _stBuilding = null; })
              .catch(e => { _stBuilding = null; console.error('[recherche] indexation:', e); });
        }
        try { await _stBuilding; } catch (e) { /* géré ci-dessous */ }
        if (!_stIndex) {
            const m = document.getElementById('stMeta');
            if (m) m.innerHTML = `<span style="color:#fca5a5">⚠️ Indexation interrompue.</span> <button class="st-recent" onclick="renderRechercheTab(document.getElementById('mainContent'))">↻ Réessayer</button>`;
            return;
        }
    }
    stShowHome();
    const inp = document.getElementById('stInput');
    if (inp) { inp.focus(); if (_stQuery) { inp.value = _stQuery; stRun(_stQuery); } }
}

function stShowHome() {
    const meta = document.getElementById('stMeta');
    const res = document.getElementById('stResults');
    const chips = document.getElementById('stChips');
    if (!_stIndex || !meta || !res) return;
    const counts = {};
    _stIndex.forEach(d => counts[d.t] = (counts[d.t] || 0) + 1);
    meta.innerHTML = `<span class="st-ok">✅ ${_stIndex.length.toLocaleString('fr-CH')} documents indexés</span>`;
    if (chips) chips.innerHTML = Object.keys(ST_TYPES).filter(t => counts[t]).map(t =>
        `<span class="st-chip st-chip-static" style="--c:${ST_TYPES[t].color}">${ST_TYPES[t].ic} ${ST_TYPES[t].label} <b>${counts[t]}</b></span>`).join('');
    const recents = stRecents();
    res.innerHTML = `
        <div class="st-home">
            ${recents.length ? `<div class="st-home-h">Recherches récentes</div>
            <div class="st-recents">${recents.map(r => `<button class="st-recent" onclick="stSet('${escapeAttr(r)}')">${escapeHtml(r)}</button>`).join('')}</div>` : ''}
            <div class="st-home-h">Essaie par exemple</div>
            <div class="st-recents">${['réserve légale', 'IFRS 16', 'surendettement', 'impôt anticipé', 'cut-off', 'goodwill', 'opting-out', 'materiality'].map(r =>
                `<button class="st-recent st-ex" onclick="stSet('${escapeAttr(r)}')">${escapeHtml(r)}</button>`).join('')}</div>
        </div>`;
}

function stRecents() { try { return JSON.parse(localStorage.getItem('swisscpa_search_recents') || '[]'); } catch (e) { return []; } }
function stPushRecent(q) {
    try {
        let r = stRecents().filter(x => x !== q); r.unshift(q); r = r.slice(0, 8);
        localStorage.setItem('swisscpa_search_recents', JSON.stringify(r));
    } catch (e) {}
}

let _stDebounce = null;
function stOnInput(v) {
    clearTimeout(_stDebounce);
    _stDebounce = setTimeout(() => stRun(v), 160);
}
function stSet(q) { const i = document.getElementById('stInput'); if (i) { i.value = q; i.focus(); } stRun(q); }
function stClear() { const i = document.getElementById('stInput'); if (i) { i.value = ''; i.focus(); } _stQuery = ''; _stFilter = ''; stShowHome(); }
function stOnKey(e) {
    if (e.key === 'Escape') { stClear(); }
    else if (e.key === 'Enter') { const first = _stResults[0]; if (first) stOpen(_stResults.indexOf(first)); }
}

function stRun(query) {
    _stQuery = query;
    const res = document.getElementById('stResults');
    const meta = document.getElementById('stMeta');
    const chips = document.getElementById('stChips');
    if (!res) return;
    if (!query || stNorm(query).length < 2) { stShowHome(); return; }
    const t0 = performance.now();
    let hits = stSearch(query);
    const counts = {};
    hits.forEach(d => counts[d.t] = (counts[d.t] || 0) + 1);
    if (_stFilter) hits = hits.filter(d => d.t === _stFilter);
    _stResults = hits;
    const ms = Math.max(1, Math.round(performance.now() - t0));
    if (query.trim().length >= 3) stPushRecent(query.trim());
    if (meta) meta.innerHTML = `<span class="st-ok">${hits.length.toLocaleString('fr-CH')} résultat${hits.length > 1 ? 's' : ''}</span> <span class="st-ms">en ${ms} ms</span>`;
    if (chips) {
        chips.innerHTML = `<button class="st-chip ${!_stFilter ? 'st-chip-on' : ''}" style="--c:#6366f1" onclick="stSetFilter('')">Tous <b>${Object.values(counts).reduce((a, b) => a + b, 0)}</b></button>`
            + Object.keys(ST_TYPES).filter(t => counts[t]).map(t =>
                `<button class="st-chip ${_stFilter === t ? 'st-chip-on' : ''}" style="--c:${ST_TYPES[t].color}" onclick="stSetFilter('${t}')">${ST_TYPES[t].ic} ${ST_TYPES[t].label} <b>${counts[t]}</b></button>`).join('');
    }
    if (!hits.length) {
        res.innerHTML = `<div class="st-empty"><div style="font-size:40px;opacity:.3">🤷</div><div>Aucun résultat pour « ${escapeHtml(query)} »${_stFilter ? ' dans ' + escapeHtml(ST_TYPES[_stFilter].label) : ''}.</div>
            <div class="st-empty-sub">Essaie moins de mots, ou vérifie l'orthographe. ${window._stAiOn ? 'Ou demande à l\'IA ci-dessus 🤖' : ''}</div></div>`;
        return;
    }
    // 🎓 Bandeau « Cours recommandés » : les 3 meilleurs documents de type
    // cours (norme / leçon / cours audit / seuil) épinglés en tête, pour
    // atterrir directement sur LE cours (ex. « goodwill RPC » → RPC 2).
    let pinned = '';
    if (!_stFilter) {
        const courses = [];
        hits.forEach((d, i) => { if (courses.length < 3 && ST_COURSE_TYPES[d.t] && d.act) courses.push({ d, i }); });
        if (courses.length) {
            pinned = `<div class="st-pin"><div class="st-pin-h">🎓 Cours recommandés</div><div class="st-pin-row">`
                + courses.map(({ d, i }) => {
                    const ty = ST_TYPES[d.t] || { ic: '📄', label: d.t, color: '#64748b' };
                    return `<div class="st-pin-card" style="--c:${ty.color}" onclick="stOpen(${i})">
                        <span class="st-pin-type">${ty.ic} ${ty.label}</span>
                        <div class="st-pin-title">${escapeHtml(d.ti.slice(0, 90))}</div>
                        <div class="st-pin-br">${escapeHtml(d.br)}</div>
                        <span class="st-pin-open">Ouvrir le cours →</span>
                    </div>`;
                }).join('') + `</div></div>`;
        }
    }
    const MAXSHOW = 60;
    res.innerHTML = pinned + hits.slice(0, MAXSHOW).map((d, i) => {
        const ty = ST_TYPES[d.t] || { ic: '📄', label: d.t, color: '#64748b' };
        return `<div class="st-card" id="stCard${i}">
            <div class="st-card-head" onclick="stToggle(${i})">
                <span class="st-type" style="--c:${ty.color}">${ty.ic} ${ty.label}</span>
                <div class="st-card-main">
                    <div class="st-card-title">${stHighlight(d.ti, query, 160)}</div>
                    ${d.br ? `<div class="st-card-br">${escapeHtml(d.br)}</div>` : ''}
                    <div class="st-card-snip">${stHighlight(d.raw, query, 210)}</div>
                </div>
                <div class="st-card-actions">
                    ${d.act ? `<button class="st-open" onclick="event.stopPropagation();stOpen(${i})">Ouvrir →</button>` : ''}
                    <span class="st-expand" id="stExp${i}">▾</span>
                </div>
            </div>
            <div class="st-card-full" id="stFull${i}" style="display:none"></div>
        </div>`;
    }).join('') + (hits.length > MAXSHOW ? `<div class="st-more">… et ${hits.length - MAXSHOW} autres résultats — affine ta recherche ou filtre par type.</div>` : '');
}

function stSetFilter(t) { _stFilter = t; stRun(_stQuery); }

function stToggle(i) {
    const full = document.getElementById('stFull' + i);
    const exp = document.getElementById('stExp' + i);
    if (!full) return;
    const d = _stResults[i];
    if (full.style.display === 'none') {
        full.innerHTML = `<div class="st-full-text">${stHighlight(d.full || d.raw, _stQuery, 2400).replace(/\n/g, '<br>')}</div>`;
        full.style.display = 'block';
        if (exp) exp.textContent = '▴';
    } else { full.style.display = 'none'; if (exp) exp.textContent = '▾'; }
}

function stOpenDoc(d) {
    if (!d || !d.act) return;
    const a = d.act;
    if (a.k === 'norm' && typeof navigateToNormByCode === 'function') { navigateToNormByCode(a.code); return; }
    if (a.k === 'module') {
        navigate('modules');
        setTimeout(() => { try { modSelectModule(a.mid); } catch (e) {} }, 700);
        return;
    }
    if (a.k === 'tab') { navigate(a.tab); return; }
}
function stOpen(i) { stOpenDoc(_stResults[i]); }
function stOpenAiHit(i) { stOpenDoc((window._stAiHits || [])[i]); }

/* ── Assistant IA (Mistral) ── */
function stAiKey() { try { return localStorage.getItem('swisscpa_mistral_key') || ''; } catch (e) { return ''; } }
function stAiModel() { try { return localStorage.getItem('swisscpa_mistral_model') || 'mistral-small-latest'; } catch (e) { return 'mistral-small-latest'; } }
window._stAiOn = (function () { try { return localStorage.getItem('swisscpa_ai_search') === '1'; } catch (e) { return false; } })();

function stRenderAiPanel() {
    const el = document.getElementById('stAiPanel');
    if (!el) return;
    const on = window._stAiOn, hasKey = !!stAiKey();
    el.innerHTML = `
    <div class="st-ai ${on ? 'st-ai-on' : ''}">
        <div class="st-ai-head">
            <label class="st-ai-toggle"><input type="checkbox" ${on ? 'checked' : ''} onchange="stAiToggle(this.checked)"> <span>🤖 Recherche assistée par IA <b>Mistral</b></span></label>
            ${on ? `<button class="st-ai-gear" onclick="stAiSettings()" title="Configurer la clé API">⚙️ ${hasKey ? 'Configuré' : 'Configurer la clé'}</button>` : '<span class="st-ai-hint">Décris ce que tu cherches, l\'IA te trouve le bon cours</span>'}
        </div>
        ${on ? `<div class="st-ai-ask">
            <input id="stAiQ" class="st-ai-input" type="text" placeholder="Décris ce que tu cherches… (ex. le cours qui compare le goodwill entre RPC et IFRS)" onkeydown="if(event.key==='Enter')stAskAI()">
            <button class="st-ai-btn" onclick="stAskAI()">🔍 Trouver mon cours</button>
        </div>
        <div id="stAiOut"></div>` : ''}
    </div>`;
}
function stAiToggle(v) {
    window._stAiOn = v;
    try { localStorage.setItem('swisscpa_ai_search', v ? '1' : '0'); } catch (e) {}
    stRenderAiPanel();
}
function stAiSettings() {
    const cur = stAiKey();
    const key = prompt('Clé API Mistral (stockée uniquement sur cet appareil, dans ton navigateur) :\nCrée-la gratuitement sur console.mistral.ai → API Keys.', cur || '');
    if (key === null) return;
    try { localStorage.setItem('swisscpa_mistral_key', key.trim()); } catch (e) {}
    stRenderAiPanel();
}
// Extraction des candidats pour l'IA : une phrase naturelle (« je cherche le
// cours qui parle du goodwill en RPC ») ne doit pas donner 0 candidat.
// → retire les mots vides FR, puis recherche ; en secours, union par mot-clé.
const ST_STOPWORDS = new Set(('je tu il elle on nous vous ils elles le la les un une des du de d en et ou où qui que quoi dont ne pas plus est sont suis c ce cette ces cet mon ma mes ton ta tes son sa ses au aux avec dans pour sur par comme mais donc or ni car si y a ai as avons avez ont être avoir fait faire veux veut voulez cherche cherches recherche recherchent trouver trouve trouvez montre montrer donne donner cours truc chose parle parlent parlant traite traitent concernant concerne sujet propos').split(' '));
function stAiCandidates(question) {
    const toks = stNorm(question).split(/[^a-z0-9]+/).filter(t => t.length >= 2 && !ST_STOPWORDS.has(t));
    let hits = toks.length ? stSearch(toks.join(' ')) : stSearch(question);
    if (hits.length < 5 && toks.length > 1) {
        // Mode OU : union des meilleures réponses par mot-clé
        const seen = new Set(hits);
        for (const t of toks) {
            for (const d of stSearch(t).slice(0, 15)) { if (!seen.has(d)) { seen.add(d); hits.push(d); } }
        }
    }
    return hits.slice(0, 25);
}

async function stAskAI() {
    const qEl = document.getElementById('stAiQ');
    const out = document.getElementById('stAiOut');
    if (!qEl || !out) return;
    const question = qEl.value.trim() || _stQuery.trim();
    if (!question) { out.innerHTML = `<div class="st-ai-err">Décris d'abord ce que tu cherches 🙂</div>`; return; }
    const key = stAiKey();
    if (!key) { out.innerHTML = `<div class="st-ai-err">Pas de clé API — clique ⚙️ pour la configurer (gratuite sur console.mistral.ai).</div>`; return; }
    // Candidats : top 25 de la recherche locale (titre + extrait court) —
    // l'IA sert à CHOISIR le bon cours parmi eux, pas à répondre à la question.
    const hits = stAiCandidates(question);
    const extracts = hits.map((d, i) => `[${i + 1}] (${ST_TYPES[d.t] ? ST_TYPES[d.t].label : d.t}) ${d.ti} — ${d.br}\n${(d.raw || '').slice(0, 220)}`).join('\n\n');
    out.innerHTML = `<div class="st-ai-loading">🤖 Mistral cherche le bon cours…</div>`;
    try {
        const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
            body: JSON.stringify({
                model: stAiModel(), temperature: 0.3, max_tokens: 900,
                messages: [
                    { role: 'system', content: "Tu es le moteur de recherche intelligent d'une application de révision pour le diplôme fédéral suisse d'expert-comptable (CO, Swiss GAAP RPC, IFRS, audit ISA/NAS, fiscalité). L'utilisateur décrit ce qu'il CHERCHE (parfois vaguement, avec des synonymes ou du franglais). Ta mission : identifier parmi les DOCUMENTS CANDIDATS ceux qui correspondent le mieux à sa recherche. Tu ne réponds PAS à la question de fond — tu ORIENTES vers le bon cours.\n\nRéponds STRICTEMENT dans ce format (rien d'autre) :\nRECO: <numéro> | <raison en une courte phrase (pourquoi c'est LE bon document)>\nRECO: <numéro> | <raison>\n(1 à 4 lignes RECO, du plus au moins pertinent)\nTERMES: <2 à 4 termes de recherche alternatifs séparés par des virgules (synonymes, terme technique exact, équivalent FR/EN)>\n\nSi aucun candidat ne convient, écris « RECO: aucun » puis la ligne TERMES avec de meilleurs mots-clés." },
                    { role: 'user', content: 'RECHERCHE DE L\'UTILISATEUR : ' + question + '\n\nDOCUMENTS CANDIDATS :\n\n' + (extracts || '(aucun candidat trouvé)') }
                ]
            })
        });
        if (!r.ok) {
            const msg = r.status === 401 ? 'Clé API invalide (401) — vérifie-la via ⚙️.' : 'Erreur Mistral HTTP ' + r.status;
            out.innerHTML = `<div class="st-ai-err">${escapeHtml(msg)}</div>`;
            return;
        }
        const j = await r.json();
        const txt = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
        window._stAiHits = hits;
        // Parse « RECO: n | raison » (1-4 lignes) + « TERMES: a, b, c »
        const recos = [];
        for (const line of txt.split('\n')) {
            const m = line.match(/^\s*RECO\s*:\s*(\d+)\s*(?:\|\s*(.*))?$/i);
            if (m) {
                const n = parseInt(m[1], 10) - 1;
                if (n >= 0 && n < hits.length && !recos.some(r => r.n === n)) recos.push({ n, why: (m[2] || '').trim() });
            }
        }
        const termesM = txt.match(/TERMES\s*:\s*(.+)/i);
        const termes = termesM ? termesM[1].split(/[,;]/).map(t => t.trim()).filter(t => t && t.length < 40).slice(0, 4) : [];
        const recoHtml = recos.length ? `<div class="st-ai-reco"><div class="st-pin-h">🎯 Cours trouvés pour ta recherche</div><div class="st-pin-row">`
            + recos.slice(0, 4).map(({ n, why }) => {
                const d = hits[n], ty = ST_TYPES[d.t] || { ic: '📄', label: d.t, color: '#64748b' };
                return `<div class="st-pin-card" style="--c:${ty.color}" onclick="stOpenAiHit(${n})">
                    <span class="st-pin-type">${ty.ic} ${ty.label}</span>
                    <div class="st-pin-title">${escapeHtml(d.ti.slice(0, 90))}</div>
                    <div class="st-pin-br">${escapeHtml(d.br)}</div>
                    ${why ? `<div class="st-ai-why">💡 ${escapeHtml(why.slice(0, 140))}</div>` : ''}
                    <span class="st-pin-open">Ouvrir le cours →</span>
                </div>`;
            }).join('') + `</div></div>`
            : `<div class="st-ai-err">L'IA n'a pas trouvé de cours correspondant${termes.length ? ' — essaie les termes ci-dessous' : ''}.</div>`;
        const termesHtml = termes.length ? `<div class="st-ai-termes"><span class="st-ai-termes-l">Essaie aussi :</span> ${termes.map(t =>
            `<button class="st-recent st-ex" onclick="stSet('${escapeAttr(t)}')">${escapeHtml(t)}</button>`).join(' ')}</div>` : '';
        out.innerHTML = recoHtml + termesHtml;
    } catch (e) {
        out.innerHTML = `<div class="st-ai-err">Impossible de joindre l'API Mistral (${escapeHtml(String(e).slice(0, 80))}). Vérifie ta connexion.</div>`;
    }
}

/* ── Styles ── */
function stStyles() {
    return `<style>
.st-page { max-width: 1000px; margin: 0 auto; padding: 8px 4px 40px; }
.st-hero { text-align: center; padding: 22px 10px 6px; }
.st-title { font-size: 30px; font-weight: 800; color: #e2e8f0; letter-spacing: -0.02em; margin: 0 0 6px; }
.st-sub { color: #94a3b8; font-size: 14px; margin: 0 0 18px; }
.st-box-wrap { position: relative; max-width: 720px; margin: 0 auto; }
.st-box { width: 100%; box-sizing: border-box; font-size: 17px; padding: 15px 44px 15px 20px; border-radius: 16px;
  background: #1e293b; border: 2px solid #334155; color: #e2e8f0; outline: none; transition: border-color .15s, box-shadow .15s; }
.st-box:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,.15); }
.st-clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #64748b; font-size: 16px; cursor: pointer; padding: 6px; }
.st-clear:hover { color: #e2e8f0; }
.st-meta { min-height: 22px; margin: 10px 0 4px; font-size: 13px; color: #94a3b8; }
.st-ok { color: #34d399; font-weight: 700; } .st-ms { color: #64748b; } .st-build { color: #fbbf24; }
.st-chips { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin: 8px 0 4px; }
.st-chip { font-size: 12.5px; font-weight: 700; color: #cbd5e1; background: #1e293b; border: 1px solid #334155; border-radius: 999px; padding: 5px 12px; cursor: pointer; transition: all .12s; }
.st-chip b { color: var(--c); }
.st-chip:hover { border-color: var(--c); }
.st-chip-on { background: var(--c); color: #fff; border-color: var(--c); } .st-chip-on b { color: #fff; }
.st-chip-static { cursor: default; }
.st-home { text-align: center; padding: 18px 0; }
.st-home-h { font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #64748b; margin: 18px 0 10px; }
.st-recents { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.st-recent { font-size: 13px; color: #cbd5e1; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 7px 14px; cursor: pointer; }
.st-recent:hover { border-color: #6366f1; color: #fff; }
.st-ex { border-style: dashed; }
.st-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; margin: 10px 0; overflow: hidden; transition: border-color .15s; }
.st-card:hover { border-color: #475569; }
.st-card-head { display: flex; gap: 14px; padding: 13px 16px; cursor: pointer; align-items: flex-start; }
.st-type { flex: 0 0 auto; font-size: 11px; font-weight: 800; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); border-radius: 8px; padding: 4px 9px; white-space: nowrap; margin-top: 2px; }
.st-card-main { flex: 1; min-width: 0; }
.st-card-title { font-size: 15px; font-weight: 700; color: #e2e8f0; line-height: 1.35; }
.st-card-br { font-size: 11.5px; color: #64748b; margin-top: 2px; }
.st-card-snip { font-size: 13px; color: #94a3b8; line-height: 1.55; margin-top: 6px; }
.st-mark { background: rgba(250,204,21,.3); color: #fde047; border-radius: 3px; padding: 0 2px; }
.st-card-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 10px; }
.st-open { font-size: 12.5px; font-weight: 700; color: #a5b4fc; background: rgba(99,102,241,.12); border: 1px solid rgba(99,102,241,.4); border-radius: 9px; padding: 7px 13px; cursor: pointer; white-space: nowrap; }
.st-open:hover { background: rgba(99,102,241,.25); color: #fff; }
.st-expand { color: #64748b; font-size: 13px; }
.st-card-full { border-top: 1px solid #334155; padding: 14px 18px; }
.st-full-text { font-size: 13.5px; color: #cbd5e1; line-height: 1.7; max-height: 420px; overflow-y: auto; }
.st-more { text-align: center; color: #64748b; font-size: 13px; padding: 16px; }
.st-empty { text-align: center; color: #94a3b8; padding: 40px 10px; font-size: 15px; }
.st-empty-sub { font-size: 13px; color: #64748b; margin-top: 8px; }
.st-pin { margin: 12px 0 16px; }
.st-pin-h { font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; color: #a5b4fc; margin: 0 0 8px; }
.st-pin-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
.st-pin-card { background: linear-gradient(135deg, rgba(99,102,241,.14), rgba(99,102,241,.04)); border: 1px solid rgba(99,102,241,.4);
  border-radius: 14px; padding: 12px 14px; cursor: pointer; transition: border-color .15s, transform .12s; }
.st-pin-card:hover { border-color: #818cf8; transform: translateY(-2px); }
.st-pin-type { font-size: 10.5px; font-weight: 800; color: var(--c); }
.st-pin-title { font-size: 13.5px; font-weight: 700; color: #e2e8f0; line-height: 1.3; margin: 5px 0 3px; }
.st-pin-br { font-size: 11px; color: #64748b; }
.st-pin-open { display: inline-block; font-size: 11.5px; font-weight: 700; color: #a5b4fc; margin-top: 8px; }
.st-ai-reco { margin: 10px 0 4px; }
.st-ai-why { font-size: 11.5px; color: #94a3b8; line-height: 1.4; margin-top: 6px; }
.st-ai-termes { margin: 10px 0 4px; font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.st-ai-termes-l { font-weight: 700; }
body.light-mode .st-ai-why { color: #64748b; }
body.light-mode .st-pin-card { background: #eef2ff; border-color: #c7d2fe; }
body.light-mode .st-pin-title { color: #0f172a; }
body.light-mode .st-pin-h { color: #4f46e5; }
body.light-mode .st-pin-open { color: #4f46e5; }
.st-ai { max-width: 720px; margin: 10px auto 18px; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 12px 16px; }
.st-ai-on { border-color: rgba(99,102,241,.5); }
.st-ai-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.st-ai-toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: #cbd5e1; cursor: pointer; }
.st-ai-hint { font-size: 12px; color: #64748b; }
.st-ai-gear { font-size: 12px; color: #94a3b8; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 5px 10px; cursor: pointer; }
.st-ai-ask { display: flex; gap: 8px; margin-top: 12px; }
.st-ai-input { flex: 1; font-size: 14px; padding: 10px 14px; border-radius: 10px; background: #0f172a; border: 1px solid #334155; color: #e2e8f0; outline: none; }
.st-ai-input:focus { border-color: #6366f1; }
.st-ai-btn { font-size: 13.5px; font-weight: 700; color: #fff; background: #6366f1; border: none; border-radius: 10px; padding: 10px 18px; cursor: pointer; }
.st-ai-btn:hover { background: #818cf8; }
.st-ai-loading { color: #a5b4fc; font-size: 14px; padding: 14px 4px; }
.st-ai-err { color: #fca5a5; font-size: 13px; padding: 12px 4px; }
.st-ai-answer { font-size: 14px; color: #e2e8f0; line-height: 1.7; padding: 14px 4px 6px; }
.st-ai-answer strong { color: #fff; }
.st-ai-li { display: block; padding-left: 10px; }
.st-ai-src { color: #a5b4fc; font-weight: 700; font-size: 12px; }
.st-ai-sources { font-size: 11.5px; color: #64748b; padding: 8px 4px; display: flex; flex-wrap: wrap; gap: 6px; }
.st-ai-schip { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 3px 8px; }
body.light-mode .st-title { color: #0f172a; }
body.light-mode .st-box { background: #fff; border-color: #e2e8f0; color: #0f172a; }
body.light-mode .st-chip, body.light-mode .st-recent { background: #fff; border-color: #e2e8f0; color: #475569; }
body.light-mode .st-chip-on { color: #fff; }
body.light-mode .st-card { background: #fff; border-color: #e2e8f0; }
body.light-mode .st-card-title { color: #0f172a; }
body.light-mode .st-card-snip { color: #475569; }
body.light-mode .st-mark { background: #fef08a; color: #713f12; }
body.light-mode .st-card-full { border-color: #e2e8f0; }
body.light-mode .st-full-text { color: #334155; }
body.light-mode .st-ai { background: #fff; border-color: #e2e8f0; }
body.light-mode .st-ai-input { background: #f8fafc; border-color: #e2e8f0; color: #0f172a; }
body.light-mode .st-ai-answer { color: #1e293b; }
body.light-mode .st-ai-answer strong { color: #0f172a; }
</style>`;
}
