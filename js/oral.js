/* ═══════════════════════════════════════════════════════════════
   Module ORAL — préparation de l'examen oral (diplôme fédéral
   d'expert-comptable, règlement 2026).
   Navigation : Accueil (7 thèmes) → Thème (cours + angle oral) → Cours.
   ═══════════════════════════════════════════════════════════════ */

let _oralData = null;
let _oralRevealAll = false;
const ORAL_STAR_KEY = 'swisscpa_oral_principaux';
const ORAL_REVOIR_KEY = 'swisscpa_oral_revoir';

// ── Simulateur : état + chrono ──
let _oralSimMode = 'technique';   // technique | comportement | scenario
let _oralSimScope = 'principaux'; // principaux | tout | <id thème>
let _oralSimCurrent = null;
let _oralTimerInt = null;

function _oralStopTimer() { if (_oralTimerInt) { clearInterval(_oralTimerInt); _oralTimerInt = null; } }
function _oralStartTimer(seconds, elId) {
    _oralStopTimer();
    let t = seconds;
    const tick = () => {
        const el = document.getElementById(elId);
        if (!el) { _oralStopTimer(); return; }   // vue changée
        const m = Math.floor(Math.max(0, t) / 60), s = ((Math.max(0, t) % 60));
        el.textContent = t > 0 ? `⏱️ ${m}:${String(s).padStart(2, '0')}` : '⏱️ Temps écoulé — conclus !';
        el.style.color = (t <= 0) ? '#ef4444' : (t <= 30 ? '#ef4444' : (t <= 60 ? '#f59e0b' : '#22d3ee'));
        if (t <= 0) { _oralStopTimer(); return; }
        t--;
    };
    tick();
    _oralTimerInt = setInterval(tick, 1000);
}

function _oralStars() {
    try { return new Set(JSON.parse(localStorage.getItem(ORAL_STAR_KEY) || '[]')); }
    catch (_) { return new Set(); }
}
function _oralSaveStars(set) {
    try { localStorage.setItem(ORAL_STAR_KEY, JSON.stringify([...set])); } catch (_) {}
}
function _oralEsc(s) {
    const d = document.createElement('div');
    d.textContent = (s == null) ? '' : String(s);
    return d.innerHTML;
}
function _oralMd(t) {
    return _oralEsc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}
function _oralHost() { return document.getElementById('mainContent'); }

const _ORAL_CALLOUT = {
    key:     { bg: '#1e1b0a', bd: '#d97706', col: '#fbbf24', icon: '🔑', lbl: 'À RETENIR' },
    info:    { bg: '#0a0f1c', bd: '#3b82f6', col: '#60a5fa', icon: 'ℹ️',  lbl: 'INFO' },
    warn:    { bg: '#3f1612', bd: '#dc2626', col: '#fca5a5', icon: '⚠️', lbl: 'ATTENTION' },
    example: { bg: '#0a1a0f', bd: '#16a34a', col: '#4ade80', icon: '📌', lbl: 'EXEMPLE' },
    tip:     { bg: '#06141a', bd: '#0891b2', col: '#22d3ee', icon: '💡', lbl: 'ASTUCE' },
    legal:   { bg: '#0f1419', bd: '#64748b', col: '#cbd5e1', icon: '⚖️', lbl: 'CADRE LÉGAL' },
};

async function renderOral(host) {
    host = host || _oralHost();
    if (!host) return;
    if (!_oralData) {
        host.innerHTML = '<div style="padding:60px;text-align:center;color:#94a3b8">Chargement du module Oral…</div>';
        try { _oralData = await pywebview.api.get_oral_data(); }
        catch (e) {
            try { _oralData = await window.pywebview.api.get_oral_data(); }
            catch (_) { _oralData = { themes: [] }; }
        }
    }
    _oralRenderHome(host);
}

function _oralThemeFlash(t) {
    return (t.courses || []).reduce((n, c) => n + (c.flashcards || []).length, 0);
}
function _oralFindTheme(id) { return ((_oralData || {}).themes || []).find(t => t.id === id); }
function _oralFindCourse(t, cid) { return (t.courses || []).find(c => c.id === cid); }

/* ── Accueil : 7 thèmes ── */
function _oralThemeLabel(t) { return t.general ? 'Révision générale' : ('Thème ' + t.num); }

function _oralRenderHome(host) {
    const d = _oralData || {};
    const allThemes = d.themes || [];
    const themes = allThemes.filter(t => !t.general);
    const revgen = allThemes.find(t => t.general);
    const stars = _oralStars();
    const intro = d.intro || {};
    host.innerHTML = `
        <div class="page-title">🎤 Examen oral — thèmes principaux</div>
        <div class="page-subtitle">Diplôme fédéral d'expert-comptable · règlement 2026</div>
        <div class="oral-banner">
            <div class="oral-banner-row">
                <span class="oral-pill">⏱️ ${_oralEsc(intro.duree || '70 min')}</span>
                <span class="oral-pill oral-pill-weight">⚖️ ${_oralEsc(intro.poids || '50% de la note')}</span>
            </div>
            <div class="oral-banner-fmt">${_oralEsc(intro.format || '')}</div>
            <div class="oral-banner-hint">⭐ Marque tes <b>2 thèmes principaux</b> choisis pour la discussion technique — ils seront mis en avant.</div>
        </div>
        ${d.examen ? `
        <div class="oral-section-title">📋 Préparation à l'examen</div>
        <div class="oral-exam-row">
            <div class="oral-exam-card oral-exam-card-sim" onclick="_oralOpenExamen('simulateur')">
                <div class="oral-exam-ic">🎲</div>
                <div><div class="oral-exam-t">Simulateur d'oral <span class="oral-sim-badge">entraînement</span></div><div class="oral-exam-d">Tirage au sort + chrono → réponds à voix haute, puis compare au modèle (et fais-toi noter par l'IA)</div></div>
                <div class="oral-course-go">›</div>
            </div>
            <div class="oral-exam-card" onclick="_oralOpenExamen('deroulement')">
                <div class="oral-exam-ic">📋</div>
                <div><div class="oral-exam-t">Déroulement & conseils</div><div class="oral-exam-d">Les 3 épreuves (70 min, 50 %), critères, conseils & pièges + méthode de la Présentation</div></div>
                <div class="oral-course-go">›</div>
            </div>
            <div class="oral-exam-card" onclick="_oralOpenExamen('comportements')">
                <div class="oral-exam-ic">🎭</div>
                <div><div class="oral-exam-t">Présentation : les 19 comportements</div><div class="oral-exam-d">Pour chaque comportement tiré au sort : situation-type, conseils, pièges, formulations</div></div>
                <div class="oral-course-go">›</div>
            </div>
            ${(d.examen.scenarios_transversaux || []).length ? `
            <div class="oral-exam-card" onclick="_oralOpenExamen('transversal')">
                <div class="oral-exam-ic">🔗</div>
                <div><div class="oral-exam-t">Mises en situation transversales</div><div class="oral-exam-d">${d.examen.scenarios_transversaux.length} scénarios « discussion d'experts » qui croisent plusieurs thèmes (compétence interdisciplinaire)</div></div>
                <div class="oral-course-go">›</div>
            </div>` : ''}
        </div>` : ''}
        <div class="oral-section-title">🎯 Thèmes principaux — discussion technique <span class="oral-st-note">(2 de tes thèmes testés sur les 4 domaines)</span></div>
        <div class="oral-grid">
            ${themes.map(t => _oralThemeCard(t, stars.has(t.id))).join('')}
        </div>
        ${revgen ? `
        <div class="oral-section-title">📋 Révision générale <span class="oral-st-note">(les 2 autres domaines de la discussion technique)</span></div>
        <div class="oral-grid">${_oralThemeCard(revgen, false)}</div>` : ''}`;
}

function _oralThemeCard(t, starred) {
    const c = t.color || '#7c3aed';
    const gen = !!t.general;
    return `
        <div class="oral-card ${starred ? 'oral-card-on' : ''}" style="--oc:${c}" onclick="_oralOpenTheme('${t.id}')">
            ${gen ? '' : `<button class="oral-star ${starred ? 'on' : ''}" title="Marquer comme thème principal"
                    onclick="event.stopPropagation();_oralToggleStar('${t.id}')">${starred ? '⭐' : '☆'}</button>`}
            <div class="oral-card-icon" style="background:${c}22;border:1px solid ${c}55">${t.icon || '📚'}</div>
            <div class="oral-card-num">${gen ? 'Révision générale' : 'Thème ' + t.num}</div>
            <div class="oral-card-title">${_oralEsc(t.title)}</div>
            <div class="oral-card-tag">${_oralEsc(t.tagline || '')}</div>
            <div class="oral-card-meta"><span>${(t.courses || []).length} cours</span><span>·</span><span>${_oralThemeFlash(t)} flashcards</span></div>
            ${starred ? '<div class="oral-card-badge">★ Thème principal</div>' : ''}
        </div>`;
}

function _oralToggleStar(id) {
    const stars = _oralStars();
    if (stars.has(id)) stars.delete(id); else stars.add(id);
    _oralSaveStars(stars);
    const host = _oralHost();
    // Re-render the current view to reflect the star
    if (host && host.querySelector('.oral-theme-view') && host.querySelector('.oral-theme-view').dataset.tid === id) _oralOpenTheme(id);
    else if (host) _oralRenderHome(host);
}

/* ── Module Examen : déroulement & comportements ── */
function _oralOpenExamen(which) {
    if (which === 'comportements') _oralComportementsView();
    else if (which === 'transversal') _oralTransversalView();
    else if (which === 'simulateur') _oralSimView();
    else _oralDeroulementView();
}

// Révélation (réponse modèle d'un scénario / résolution d'un cas)
function _oralReveal(id) {
    const el = document.getElementById(id);
    const btn = document.getElementById(id + '-btn');
    if (!el) return;
    const show = el.style.display === 'none';
    el.style.display = show ? 'block' : 'none';
    if (btn) btn.textContent = show ? '▴ Masquer' : (btn.dataset.lbl || 'Voir la réponse modèle ▾');
}

function _oralScenarioCard(s, id) {
    return `<div class="oral-scn">
        <div class="oral-scn-role">🎙️ ${_oralEsc(s.role || 'Partie prenante')}</div>
        ${s.contexte ? `<div class="oral-scn-ctx">${_oralMd(s.contexte)}</div>` : ''}
        ${s.question ? `<div class="oral-scn-q">❓ ${_oralMd(s.question)}</div>` : ''}
        <button class="oral-reveal-btn" data-lbl="Voir la réponse modèle ▾" id="${id}-btn" onclick="_oralReveal('${id}')">Voir la réponse modèle ▾</button>
        <div class="oral-scn-ans" id="${id}" style="display:none">
            <div class="oral-scn-ans-tx">${_oralMd(s.reponse_modele || '')}</div>
            ${(s.points_cles || []).length ? `<div class="oral-scn-sub"><div class="oral-angle-lbl" style="color:#4ade80">✅ Points clés à mentionner</div><ul class="oral-ul">${s.points_cles.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : ''}
            ${(s.pieges || []).length ? `<div class="oral-scn-sub oral-pieges" style="margin-top:8px"><div class="oral-angle-lbl" style="color:#fbbf24">⚠️ À éviter</div><ul class="oral-ul">${s.pieges.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : ''}
        </div>
    </div>`;
}

function _oralCasCard(c, id) {
    return `<div class="oral-cas">
        <div class="oral-cas-hd">${c.niveau ? `<span class="oral-cas-niv">${_oralEsc(c.niveau)}</span>` : ''}${_oralEsc(c.titre || 'Cas')}</div>
        ${c.enonce ? `<div class="oral-cas-en">${_oralMd(c.enonce)}</div>` : ''}
        <button class="oral-reveal-btn" data-lbl="Voir la résolution ▾" id="${id}-btn" onclick="_oralReveal('${id}')">Voir la résolution ▾</button>
        <div class="oral-cas-res" id="${id}" style="display:none">${_oralMd(c.resolution || '')}</div>
    </div>`;
}

function _oralTransversalView() {
    const scn = ((_oralData || {}).examen || {}).scenarios_transversaux || [];
    const host = _oralHost();
    if (!host) return;
    const c = '#0891b2';
    host.innerHTML = `
        <div class="oral-cours" style="--oc:${c}">
            <div class="oral-cours-bar"><button class="oral-btn" onclick="renderOral()">← Tous les thèmes</button></div>
            <div class="oral-hero" style="background:linear-gradient(135deg,${c}33,${c}0a 60%,transparent);border:1px solid ${c}55">
                <div class="oral-hero-icon">🔗</div>
                <div><div class="oral-hero-num">Discussion d'experts · compétence interdisciplinaire</div>
                    <div class="oral-hero-title">Mises en situation transversales</div>
                    <div class="oral-hero-tag">Des scénarios qui croisent plusieurs thèmes. Prépare ta réponse, puis révèle le modèle.</div></div>
            </div>
            ${scn.map((s, i) => _oralScenarioCard(s, `tr-${i}`)).join('')}
            <div class="oral-cours-bar" style="margin-top:18px"><button class="oral-btn" onclick="renderOral()">← Tous les thèmes</button></div>
        </div>`;
    window.scrollTo(0, 0);
}

/* ── Simulateur d'oral ── */
function _oralFlashPool(scope) {
    const d = _oralData || {}; const stars = _oralStars(); const pool = [];
    (d.themes || []).forEach(t => {
        if (scope === 'principaux' && !stars.has(t.id)) return;
        if (scope === 'revgen' && !t.general) return;
        if (scope !== 'principaux' && scope !== 'tout' && scope !== 'revgen' && t.id !== scope) return;
        (t.courses || []).forEach(co => (co.flashcards || []).forEach(f => pool.push({ type: 'flash', q: f.q, a: f.a, theme: t.title, course: co.title })));
    });
    return pool;
}
function _oralScenarioPool() {
    const d = _oralData || {}; const pool = [];
    (d.themes || []).forEach(t => (t.scenarios || []).forEach(s => pool.push(Object.assign({ type: 'scenario', theme: t.title }, s))));
    (((d.examen || {}).scenarios_transversaux) || []).forEach(s => pool.push(Object.assign({ type: 'scenario', theme: 'Transversal' }, s)));
    return pool;
}
function _oralCompPool() {
    return (((_oralData || {}).examen || {}).comportements || []).map(c => Object.assign({ type: 'comportement' }, c));
}

function _oralSimView() {
    const host = _oralHost(); if (!host) return;
    const modes = [{ k: 'technique', l: '🧠 Question technique', d: '7,5 min' }, { k: 'comportement', l: '🎭 Comportement', d: '15 min' }, { k: 'scenario', l: '💬 Scénario d\'experts', d: '7,5 min' }];
    const scopes = [{ k: 'principaux', l: '⭐ Mes 2 principaux' }, { k: 'revgen', l: '📋 Révision générale' }, { k: 'tout', l: 'Tout' }];
    host.innerHTML = `
        <div class="oral-cours" style="--oc:#9333ea">
            <div class="oral-cours-bar"><button class="oral-btn" onclick="_oralStopTimer();renderOral()">← Tous les thèmes</button></div>
            <div class="oral-hero" style="background:linear-gradient(135deg,#9333ea33,#9333ea0a 60%,transparent);border:1px solid #9333ea55">
                <div class="oral-hero-icon">🎲</div>
                <div><div class="oral-hero-num">Entraînement en conditions réelles</div>
                    <div class="oral-hero-title">Simulateur d'oral</div>
                    <div class="oral-hero-tag">Tire au sort, lance le chrono, réponds <b>à voix haute</b>, puis compare au modèle.</div></div>
            </div>
            <div class="oral-block">
                <div class="oral-sim-modes">${modes.map(m => `<button class="oral-sim-mode ${_oralSimMode === m.k ? 'on' : ''}" onclick="_oralSimSetMode('${m.k}')">${m.l} <span class="oral-sim-mode-d">${m.d}</span></button>`).join('')}</div>
                <div class="oral-sim-scopes" style="display:${_oralSimMode === 'technique' ? 'flex' : 'none'}">${scopes.map(s => `<button class="oral-sim-scope ${_oralSimScope === s.k ? 'on' : ''}" onclick="_oralSimSetScope('${s.k}')">${s.l}</button>`).join('')}</div>
                <div id="oralSimItem"></div>
            </div>
        </div>`;
    _oralSimDraw();
    window.scrollTo(0, 0);
}
function _oralSimSetMode(m) { _oralSimMode = m; _oralSimView(); }
function _oralSimSetScope(s) { _oralSimScope = s; _oralSimView(); }
function _oralRenderSimItem(html) { const el = document.getElementById('oralSimItem'); if (el) el.innerHTML = html; }

function _oralSimDraw() {
    let pool, dur;
    if (_oralSimMode === 'comportement') { pool = _oralCompPool(); dur = 900; }
    else if (_oralSimMode === 'scenario') { pool = _oralScenarioPool(); dur = 450; }
    else { pool = _oralFlashPool(_oralSimScope); dur = 450; }
    if (!pool.length) {
        _oralSimCurrent = null; _oralStopTimer();
        _oralRenderSimItem(`<div class="oral-sim-empty">Aucune question dans cette sélection. ${(_oralSimMode === 'technique' && _oralSimScope === 'principaux') ? 'Marque d\'abord tes 2 thèmes principaux ⭐ sur l\'accueil.' : ''}</div>`);
        return;
    }
    _oralSimCurrent = pool[Math.floor(Math.random() * pool.length)];
    _oralRenderSimItem(_oralSimItemHtml(_oralSimCurrent));
    _oralStartTimer(dur, 'oralSimTimer');
}

function _oralSimItemHtml(cur) {
    let head = '', modele = '';
    if (cur.type === 'flash') {
        head = `<div class="oral-sim-src">${_oralEsc(cur.theme)} · ${_oralEsc(cur.course)}</div><div class="oral-sim-q">${_oralMd(cur.q)}</div>`;
        modele = `<div class="oral-scn-ans-tx">✅ ${_oralMd(cur.a)}</div>`;
    } else if (cur.type === 'scenario') {
        head = `<div class="oral-sim-src">${_oralEsc(cur.theme)} · 🎙️ ${_oralEsc(cur.role || '')}</div>${cur.contexte ? `<div class="oral-scn-ctx">${_oralMd(cur.contexte)}</div>` : ''}<div class="oral-sim-q">❓ ${_oralMd(cur.question || '')}</div>`;
        modele = `<div class="oral-scn-ans-tx">${_oralMd(cur.reponse_modele || '')}</div>` + ((cur.points_cles || []).length ? `<div class="oral-scn-sub"><div class="oral-angle-lbl" style="color:#4ade80">✅ Points clés</div><ul class="oral-ul">${cur.points_cles.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : '');
    } else {
        head = `<div class="oral-sim-src">Présentation · comportement tiré au sort</div><div class="oral-sim-q">🎭 ${_oralEsc(cur.nom)}</div><div class="oral-scn-ctx">Prépare une <b>présentation (3-5 min)</b> à partir d'une <b>situation de ton travail quotidien</b> où ce comportement joue un rôle : (1) situation & ton rôle · (2) complexité (opportunités/risques) · (3) décision & motifs.</div>`;
        modele = `<div class="oral-scn-ans-tx"><b>Définition.</b> ${_oralMd(cur.definition || '')}</div><div class="oral-scn-sub"><div class="oral-angle-lbl">🎬 Situation-type</div><div class="oral-scn-ans-tx">${_oralMd(cur.situation_modele || '')}</div></div>` + ((cur.conseils || []).length ? `<div class="oral-scn-sub"><div class="oral-angle-lbl" style="color:#4ade80">✅ Conseils</div><ul class="oral-ul">${cur.conseils.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : '');
    }
    return `
        <div class="oral-sim-card">
            <div class="oral-sim-timer" id="oralSimTimer">⏱️</div>
            ${head}
            <textarea id="oralSimAnswer" class="oral-sim-answer" placeholder="(Optionnel) Tape les points de ta réponse pour te faire évaluer par l'IA — mais surtout, réponds À VOIX HAUTE."></textarea>
            <div class="oral-sim-actions">
                <button class="oral-btn oral-btn-rev" data-lbl="👁️ Voir le modèle ▾" id="oralSimModele-btn" onclick="_oralReveal('oralSimModele')">👁️ Voir le modèle ▾</button>
                <button class="oral-btn" onclick="_oralSimEval()">🤖 Évalue ma réponse</button>
                <button class="oral-btn" onclick="_oralSimDraw()">🎲 Suivante</button>
            </div>
            <div class="oral-sim-eval" id="oralSimEval"></div>
            <div class="oral-scn-ans" id="oralSimModele" style="display:none">${modele}</div>
        </div>`;
}

async function _oralSimEval() {
    const ta = document.getElementById('oralSimAnswer');
    const out = document.getElementById('oralSimEval');
    if (!ta || !out) return;
    const ans = (ta.value || '').trim();
    if (!ans) { out.innerHTML = '<span style="color:#94a3b8">✍️ Écris d\'abord les points de ta réponse ci-dessus, puis je la fais évaluer.</span>'; return; }
    const cur = _oralSimCurrent || {};
    const q = cur.q || cur.question || cur.nom || '';
    const modele = cur.a || cur.reponse_modele || cur.situation_modele || '';
    out.innerHTML = '<span style="color:#94a3b8">🤖 Évaluation en cours…</span>';
    const prompt = `Tu es examinateur/examinatrice à l'examen oral du diplôme fédéral suisse d'expert-comptable. Évalue la réponse du candidat à la question ci-dessous selon les critères officiels : connaissances techniques approfondies et axées stratégie, langage technique exact (articles/normes), structure, argumentation et justification, recommandations applicables, communication.\n\nQUESTION POSÉE :\n${q}\n\nÉLÉMENTS DE RÉPONSE ATTENDUS (référence) :\n${modele}\n\nRÉPONSE DU CANDIDAT :\n${ans}\n\nRends en français, concis : une **note sur 10**, 2-3 **points forts**, 2-3 **points à améliorer**, et **ce qui manquait** par rapport à la référence. Exigeant mais constructif.`;
    try {
        const api = window.pywebview && window.pywebview.api;
        let res = null;
        if (api && typeof api.chat_explain === 'function') res = await api.chat_explain([{ role: 'user', content: prompt }]);
        if (res && res.reply) out.innerHTML = _oralMd(res.reply).replace(/\n/g, '<br>');
        else if (res && res.error) out.innerHTML = '<span style="color:#fca5a5">⚠️ ' + _oralEsc(res.error) + '</span>';
        else out.innerHTML = '<span style="color:#94a3b8">🤖 L\'examinateur IA est disponible dans l\'app bureau (clé Groq configurée). En attendant, clique « Voir le modèle » et compare honnêtement ta réponse.</span>';
    } catch (e) {
        out.innerHTML = '<span style="color:#94a3b8">IA indisponible ici. Clique « Voir le modèle » et compare ta réponse.</span>';
    }
}

function _oralExamPart(p, c) {
    return `<div class="oral-block" style="border-left:4px solid ${c}">
        <div class="oral-exam-part-hd"><span class="oral-exam-part-name" style="color:${c}">${_oralEsc(p.nom)}</span>
            <span class="oral-exam-part-meta">${_oralEsc(p.duree || '')} · ${_oralEsc(p.poids || '')}${p.domaine ? ` · domaine ${_oralEsc(p.domaine)}` : ''}</span></div>
        ${p.description ? `<div class="oral-section-body" style="margin-bottom:10px">${_oralMd(p.description)}</div>` : ''}
        <div class="oral-exam-grid">
            ${(p.criteres || []).length ? `<div class="oral-exam-col"><div class="oral-angle-lbl">📊 Critères d'évaluation</div><ul class="oral-ul">${p.criteres.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : ''}
            ${(p.conseils || []).length ? `<div class="oral-exam-col"><div class="oral-angle-lbl" style="color:#4ade80">✅ Conseils</div><ul class="oral-ul">${p.conseils.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : ''}
        </div>
        ${(p.pieges || []).length ? `<div class="oral-exam-pieges"><div class="oral-angle-lbl" style="color:#fbbf24">⚠️ Pièges</div><ul class="oral-ul">${p.pieges.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : ''}
    </div>`;
}

function _oralPresentationBlock(pres) {
    return `<div class="oral-block" style="border:1px solid #7c3aed55">
        <div class="oral-block-hd" style="color:#c084fc">🎭 Réussir la Présentation du comportement</div>
        ${pres.intro ? `<div class="oral-angle-intro">${_oralMd(pres.intro)}</div>` : ''}
        <div class="oral-pres-steps">${(pres.structure || []).map((s, i) => `<div class="oral-pres-step"><div class="oral-pres-step-n">${i + 1}</div><div><div class="oral-pres-step-t">${_oralEsc(s.titre)}</div><div class="oral-pres-step-d">${_oralMd(s.detail || '')}</div></div></div>`).join('')}</div>
        <div class="oral-exam-grid" style="margin-top:12px">
            ${(pres.methode || []).length ? `<div class="oral-exam-col"><div class="oral-angle-lbl">⏱️ Préparer en 15 min</div><ul class="oral-ul">${pres.methode.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : ''}
            ${(pres.conseils || []).length ? `<div class="oral-exam-col"><div class="oral-angle-lbl" style="color:#4ade80">✅ Conseils</div><ul class="oral-ul">${pres.conseils.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : ''}
        </div>
        ${(pres.pieges || []).length ? `<div class="oral-exam-pieges"><div class="oral-angle-lbl" style="color:#fbbf24">⚠️ Pièges</div><ul class="oral-ul">${pres.pieges.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : ''}
    </div>`;
}

function _oralDeroulementView() {
    const ex = (_oralData || {}).examen || {};
    const der = ex.deroulement || {};
    const pres = ex.presentation || {};
    const host = _oralHost();
    if (!host) return;
    const colors = ['#7c3aed', '#3b82f6', '#16a34a'];
    host.innerHTML = `
        <div class="oral-cours" style="--oc:#7c3aed">
            <div class="oral-cours-bar">
                <button class="oral-btn" onclick="renderOral()">← Tous les thèmes</button>
                <button class="oral-btn oral-btn-rev" onclick="_oralOpenExamen('comportements')">🎭 Les 19 comportements →</button>
            </div>
            <div class="oral-hero" style="background:linear-gradient(135deg,#7c3aed33,#7c3aed0a 60%,transparent);border:1px solid #7c3aed55">
                <div class="oral-hero-icon">📋</div>
                <div><div class="oral-hero-num">Examen oral · règlement 2026</div>
                    <div class="oral-hero-title">Déroulement & conseils</div>
                    <div class="oral-hero-tag">70 min · 50 % de la note · 3 épreuves</div></div>
            </div>
            ${der.intro ? `<div class="oral-block"><div class="oral-apercu">${_oralMd(der.intro)}</div></div>` : ''}
            ${ex.reperes ? `<div class="oral-block">
                <div class="oral-block-hd" style="color:#7dd3fc">🧭 Repères clés</div>
                ${ex.reperes.note_themes ? `<div class="oral-callout" style="background:#0a0f1c;border-left:3px solid #3b82f6"><div class="oral-callout-tx">${_oralMd(ex.reperes.note_themes)}</div></div>` : ''}
                ${ex.reperes.langue ? `<div class="oral-callout" style="background:#06141a;border-left:3px solid #0891b2"><div class="oral-callout-hd" style="color:#22d3ee">🗣️ Langue</div><div class="oral-callout-tx">${_oralMd(ex.reperes.langue)}</div></div>` : ''}
                ${(ex.reperes.domaines || []).length ? `<div class="oral-compare-hd" style="color:#7dd3fc;margin-top:12px">Domaines de compétence évalués (réf. Directives)</div><div style="overflow-x:auto"><table class="oral-table"><thead><tr><th>Épreuve</th><th>Poids</th><th>Domaines</th><th>Focus</th></tr></thead><tbody>${ex.reperes.domaines.map(r => `<tr><td class="oral-td-key">${_oralEsc(r.epreuve)}</td><td>${_oralEsc(r.poids || '')}</td><td style="font-weight:700;color:#7dd3fc">${_oralEsc(r.domaines || '')}</td><td>${_oralMd(r.focus || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}
            </div>` : ''}
            ${(der.parts || []).map((p, i) => _oralExamPart(p, colors[i % 3])).join('')}
            ${(pres.structure || []).length ? _oralPresentationBlock(pres) : ''}
            ${(der.logistique || []).length ? `<div class="oral-block"><div class="oral-block-hd" style="color:#cbd5e1">🧳 Logistique le jour J</div><ul class="oral-ul">${der.logistique.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : ''}
            ${(der.conseils_generaux || []).length ? `<div class="oral-block oral-angle" style="border:1px solid #7c3aed55;background:linear-gradient(135deg,#7c3aed14,#0a0f1c)"><div class="oral-block-hd" style="color:#c084fc">💡 Conseils transversaux (toutes épreuves)</div><ul class="oral-ul">${der.conseils_generaux.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : ''}
            <div class="oral-cours-bar" style="margin-top:18px"><button class="oral-btn" onclick="renderOral()">← Tous les thèmes</button></div>
        </div>`;
    window.scrollTo(0, 0);
}

function _oralComportementsView() {
    const comps = ((_oralData || {}).examen || {}).comportements || [];
    const host = _oralHost();
    if (!host) return;
    host.innerHTML = `
        <div class="oral-cours" style="--oc:#9333ea">
            <div class="oral-cours-bar">
                <button class="oral-btn" onclick="renderOral()">← Tous les thèmes</button>
                <button class="oral-btn" onclick="_oralOpenExamen('deroulement')">📋 Déroulement & conseils</button>
            </div>
            <div class="oral-hero" style="background:linear-gradient(135deg,#9333ea33,#9333ea0a 60%,transparent);border:1px solid #9333ea55">
                <div class="oral-hero-icon">🎭</div>
                <div><div class="oral-hero-num">Présentation · 1/5 de la note · domaine G</div>
                    <div class="oral-hero-title">Les 19 comportements</div>
                    <div class="oral-hero-tag">Tu en tires UN au sort → 15 min pour préparer une situation de ton quotidien. Clique pour la fiche.</div></div>
            </div>
            <div class="oral-comp-grid">
                ${comps.map((cc, i) => `<div class="oral-comp-card" onclick="_oralOpenComportement(${i})"><span class="oral-comp-n">${i + 1}</span><span class="oral-comp-nom">${_oralEsc(cc.nom)}</span><span class="oral-comp-go">›</span></div>`).join('')}
            </div>
            <div class="oral-cours-bar" style="margin-top:18px"><button class="oral-btn" onclick="renderOral()">← Tous les thèmes</button></div>
        </div>`;
    window.scrollTo(0, 0);
}

function _oralOpenComportement(idx) {
    const comps = ((_oralData || {}).examen || {}).comportements || [];
    const cc = comps[idx];
    const host = _oralHost();
    if (!cc || !host) return;
    const c = '#9333ea';
    host.innerHTML = `
        <div class="oral-cours" style="--oc:${c}">
            <div class="oral-cours-bar">
                <button class="oral-btn" onclick="_oralOpenExamen('comportements')">← Les 19 comportements</button>
                ${idx > 0 ? `<button class="oral-btn" onclick="_oralOpenComportement(${idx - 1})">‹ Précédent</button>` : ''}
                ${idx < comps.length - 1 ? `<button class="oral-btn" onclick="_oralOpenComportement(${idx + 1})">Suivant ›</button>` : ''}
            </div>
            <div class="oral-hero" style="background:linear-gradient(135deg,${c}33,${c}0a 60%,transparent);border:1px solid ${c}55">
                <div class="oral-hero-icon">🎭</div>
                <div><div class="oral-hero-num">Comportement ${idx + 1}/19 · Présentation</div>
                    <div class="oral-hero-title">${_oralEsc(cc.nom)}</div></div>
            </div>
            <div class="oral-block"><div class="oral-block-hd" style="color:${c}">📖 Définition</div><div class="oral-section-body">${_oralMd(cc.definition)}</div></div>
            <div class="oral-block"><div class="oral-block-hd" style="color:#60a5fa">🔍 Dans le métier d'expert-comptable</div><div class="oral-section-body">${_oralMd(cc.contexte)}</div></div>
            <div class="oral-block oral-exemple" style="margin-bottom:16px"><div class="oral-exemple-hd">🎬 Situation-type à présenter</div><div class="oral-exemple-res">${_oralMd(cc.situation_modele)}</div></div>
            <div class="oral-exam-grid">
                ${(cc.conseils || []).length ? `<div class="oral-block oral-exam-col"><div class="oral-angle-lbl" style="color:#4ade80">✅ Bien le présenter</div><ul class="oral-ul">${cc.conseils.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : ''}
                ${(cc.pieges || []).length ? `<div class="oral-block oral-exam-col oral-pieges"><div class="oral-angle-lbl" style="color:#fbbf24">⚠️ Pièges</div><ul class="oral-ul">${cc.pieges.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : ''}
            </div>
            ${(cc.phrases || []).length ? `<div class="oral-block"><div class="oral-block-hd" style="color:${c}">💬 Formulations prêtes à l'emploi</div>${cc.phrases.map(p => `<div class="oral-phrase">« ${_oralMd(p)} »</div>`).join('')}</div>` : ''}
            <div class="oral-cours-bar" style="margin-top:18px"><button class="oral-btn" onclick="_oralOpenExamen('comportements')">← Les 19 comportements</button></div>
        </div>`;
    window.scrollTo(0, 0);
}

/* ── Vue thème : aperçu + angle oral + cours ── */
function _oralOpenTheme(id) {
    const t = _oralFindTheme(id);
    const host = _oralHost();
    if (!t || !host) return;
    const c = t.color || '#7c3aed';
    const stars = _oralStars();
    const starred = stars.has(t.id);
    host.innerHTML = `
        <div class="oral-cours oral-theme-view" data-tid="${t.id}" style="--oc:${c}">
            <div class="oral-cours-bar">
                <button class="oral-btn" onclick="renderOral()">← Tous les thèmes</button>
                <button class="oral-btn oral-btn-rev" onclick="_oralRevision('${t.id}',null)">🎴 Réviser tout le thème (${_oralThemeFlash(t)})</button>
                ${t.general ? '' : `<button class="oral-btn ${starred ? 'oral-btn-star' : ''}" onclick="_oralToggleStar('${t.id}')">${starred ? '⭐ Thème principal' : '☆ Marquer principal'}</button>`}
            </div>
            <div class="oral-hero" style="background:linear-gradient(135deg,${c}33,${c}0a 60%,transparent);border:1px solid ${c}55">
                <div class="oral-hero-icon">${t.icon || '📚'}</div>
                <div>
                    <div class="oral-hero-num">${_oralThemeLabel(t)} · examen oral${starred ? ' · ⭐ principal' : ''}</div>
                    <div class="oral-hero-title">${_oralEsc(t.title)}</div>
                    <div class="oral-hero-tag">${_oralEsc(t.tagline || '')}</div>
                </div>
            </div>
            ${t.apercu ? `<div class="oral-block"><div class="oral-block-hd" style="color:${c}">📖 Aperçu du thème</div><div class="oral-apercu">${_oralMd(t.apercu)}</div></div>` : ''}
            ${_oralAngleOral(t.angle_oral, c)}
            <div class="oral-block">
                <div class="oral-block-hd" style="color:${c}">📚 Cours du thème (${(t.courses || []).length})</div>
                <div class="oral-course-grid">
                    ${(t.courses || []).map((co, i) => _oralCourseCard(t, co, i + 1)).join('')}
                </div>
            </div>
            ${(t.scenarios || []).length ? `
            <div class="oral-block">
                <div class="oral-block-hd" style="color:#c084fc">🎭 Mises en situation — discussion d'experts (${t.scenarios.length})</div>
                <div class="oral-block-sub">Tu joues l'expert-comptable face à une partie prenante. Prépare ta réponse à voix haute, puis révèle le modèle (position → analyse → recommandations → conclusion).</div>
                ${t.scenarios.map((s, i) => _oralScenarioCard(s, `scn-${t.id}-${i}`)).join('')}
            </div>` : ''}
            ${(t.cas_examen || []).length ? `
            <div class="oral-block">
                <div class="oral-block-hd" style="color:#4ade80">🧮 Cas chiffrés d'examen (${t.cas_examen.length})</div>
                <div class="oral-block-sub">Pose-toi le calcul, puis vérifie la résolution.</div>
                ${t.cas_examen.map((cx, i) => _oralCasCard(cx, `cas-${t.id}-${i}`)).join('')}
            </div>` : ''}
            <div class="oral-cours-bar" style="margin-top:6px">
                <button class="oral-btn" onclick="renderOral()">← Tous les thèmes</button>
            </div>
        </div>`;
    window.scrollTo(0, 0);
}

function _oralCourseCard(t, co, n) {
    const c = t.color || '#7c3aed';
    return `
        <div class="oral-course-card" style="--oc:${c}" onclick="_oralOpenCourse('${t.id}','${co.id}')">
            <div class="oral-course-n" style="background:${c}">${n}</div>
            <div class="oral-course-body">
                <div class="oral-course-title">${_oralEsc(co.title)}</div>
                <div class="oral-course-tag">${_oralEsc(co.tagline || '')}</div>
                <div class="oral-course-meta">${(co.sections || []).length} sections · ${(co.flashcards || []).length} flashcards · ${(co.exemples || []).length} cas</div>
            </div>
            <div class="oral-course-go">›</div>
        </div>`;
}

/* ── Vue cours ── */
function _oralOpenCourse(tid, cid) {
    const t = _oralFindTheme(tid);
    if (!t) return;
    const co = _oralFindCourse(t, cid);
    const host = _oralHost();
    if (!co || !host) return;
    _oralRevealAll = false;
    const c = t.color || '#7c3aed';
    host.innerHTML = `
        <div class="oral-cours" style="--oc:${c}">
            <div class="oral-cours-bar">
                <button class="oral-btn" onclick="_oralOpenTheme('${t.id}')">← ${_oralEsc(t.title).slice(0, 34)}</button>
                <button class="oral-btn oral-btn-rev" onclick="_oralRevision('${t.id}','${co.id}')">🎴 Réviser ce cours</button>
            </div>
            <div class="oral-hero" style="background:linear-gradient(135deg,${c}33,${c}0a 60%,transparent);border:1px solid ${c}55">
                <div class="oral-hero-icon">${t.icon || '📚'}</div>
                <div>
                    <div class="oral-hero-num">${_oralThemeLabel(t)} · ${_oralEsc(t.title)}</div>
                    <div class="oral-hero-title">${_oralEsc(co.title)}</div>
                    <div class="oral-hero-tag">${_oralEsc(co.tagline || '')}</div>
                </div>
            </div>
            ${(co.objectifs || []).length ? `<div class="oral-block oral-objectifs"><div class="oral-block-hd">🎯 Objectifs</div><ul>${co.objectifs.map(o => `<li>${_oralMd(o)}</li>`).join('')}</ul></div>` : ''}
            ${(co.sections || []).map((s, i) => _oralSection(s, c, i + 1)).join('')}
            ${(co.bases || []).length ? `<div class="oral-block"><div class="oral-block-hd" style="color:#cbd5e1">⚖️ Bases normatives clés</div><div class="oral-bases">${co.bases.map(b => `<div class="oral-base"><span class="oral-base-ref" style="color:${c}">${_oralEsc(b.ref)}</span><span class="oral-base-detail">${_oralMd(b.detail)}</span></div>`).join('')}</div></div>` : ''}
            ${(co.exemples || []).length ? `<div class="oral-block"><div class="oral-block-hd" style="color:#4ade80">🧮 Exemples chiffrés / cas pratiques</div>${co.exemples.map(_oralExemple).join('')}</div>` : ''}
            ${(co.pieges || []).length ? `<div class="oral-block oral-pieges"><div class="oral-block-hd" style="color:#fbbf24">⚠️ Pièges fréquents</div><ul>${co.pieges.map(p => `<li>${_oralMd(p)}</li>`).join('')}</ul></div>` : ''}
            <div class="oral-block"><div class="oral-block-hd" style="color:#c084fc">🎴 Flashcards <span class="oral-rev-link" onclick="_oralRevision('${t.id}','${co.id}')">→ mode révision</span></div>${_oralFlashList(co.flashcards, co.id, false)}</div>
            ${(co.liens || []).length ? `<div class="oral-block oral-liens"><div class="oral-block-hd" style="color:#38bdf8">🔗 Liens interdisciplinaires</div>${co.liens.map(l => `<div class="oral-lien"><span class="oral-lien-th">${_oralEsc(l.theme)}</span> ${_oralMd(l.lien)}</div>`).join('')}</div>` : ''}
            <div class="oral-cours-bar" style="margin-top:18px"><button class="oral-btn" onclick="_oralOpenTheme('${t.id}')">← Retour au thème</button></div>
        </div>`;
    window.scrollTo(0, 0);
}

function _oralSection(s, c, idx) {
    const callouts = (s.callouts || []).map(co => {
        const cfg = _ORAL_CALLOUT[co.type] || _ORAL_CALLOUT.info;
        return `<div class="oral-callout" style="background:${cfg.bg};border-left:3px solid ${cfg.bd}">
            <div class="oral-callout-hd" style="color:${cfg.col}">${cfg.icon} ${_oralEsc(co.label || cfg.lbl)}</div>
            <div class="oral-callout-tx">${_oralMd(co.text || '')}</div></div>`;
    }).join('');
    return `<div class="oral-section">
        <div class="oral-section-hd"><span class="oral-section-n" style="background:${c}">${idx}</span>${_oralEsc(s.titre || '')}</div>
        ${s.body ? `<div class="oral-section-body">${_oralMd(s.body)}</div>` : ''}
        ${s.compare ? _oralCompare(s.compare, c) : ''}
        ${callouts}</div>`;
}
function _oralCompare(cmp, c) {
    if (!cmp) return '';
    return `<div class="oral-compare">
        ${cmp.title ? `<div class="oral-compare-hd" style="color:${c}">🔀 ${_oralEsc(cmp.title)}</div>` : ''}
        <div style="overflow-x:auto"><table class="oral-table">
            <thead><tr>${(cmp.headers || []).map(h => `<th style="color:${c};border-bottom:2px solid ${c}">${_oralEsc(h)}</th>`).join('')}</tr></thead>
            <tbody>${(cmp.rows || []).map(r => `<tr>${r.map((cell, ci) => `<td class="${ci === 0 ? 'oral-td-key' : ''}">${_oralMd(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div></div>`;
}
function _oralExemple(ex) {
    return `<div class="oral-exemple">
        <div class="oral-exemple-hd">📌 ${_oralEsc(ex.titre || 'Cas')}</div>
        ${ex.enonce ? `<div class="oral-exemple-en"><b>Énoncé :</b> ${_oralMd(ex.enonce)}</div>` : ''}
        ${ex.resolution ? `<div class="oral-exemple-res"><b>Résolution :</b> ${_oralMd(ex.resolution)}</div>` : ''}</div>`;
}
function _oralAngleOral(a, c) {
    if (!a) return '';
    return `<div class="oral-block oral-angle" style="border:1px solid ${c}55;background:linear-gradient(135deg,${c}14,#0a0f1c)">
        <div class="oral-block-hd" style="color:${c}">🎙️ Angle oral — structurer, prendre position, recommander</div>
        ${a.intro ? `<div class="oral-angle-intro">${_oralMd(a.intro)}</div>` : ''}
        <div class="oral-angle-cols">
            ${(a.structure || []).length ? `<div class="oral-angle-col"><div class="oral-angle-lbl">🧭 Trame d'une réponse (≈ 7,5 min)</div><ol>${a.structure.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ol></div>` : ''}
            ${(a.recommandations || []).length ? `<div class="oral-angle-col"><div class="oral-angle-lbl">✅ Recommandations à formuler</div><ul>${a.recommandations.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul></div>` : ''}
        </div>
        ${(a.phrases || []).length ? `<div class="oral-angle-phrases"><div class="oral-angle-lbl">💬 Formulations prêtes à l'emploi (prise de position)</div>${a.phrases.map(p => `<div class="oral-phrase">« ${_oralMd(p)} »</div>`).join('')}</div>` : ''}
    </div>`;
}

/* ── Flashcards ── */
function _oralFlashList(cards, key, big) {
    if (!cards || !cards.length) return '';
    return `<div class="oral-flash-grid ${big ? 'big' : ''}">
        ${cards.map((q, i) => {
            const fid = `oral-fc-${key}-${i}`;
            return `<div class="oral-flash" onclick="_oralFlip('${fid}')">
                <div class="oral-flash-q">❓ ${_oralMd(q.q)}</div>
                <div class="oral-flash-a" id="${fid}" style="display:${_oralRevealAll ? 'block' : 'none'}">✅ ${_oralMd(q.a)}</div>
                <div class="oral-flash-hint" id="${fid}-h" style="display:${_oralRevealAll ? 'none' : 'block'}">👆 cliquer pour la réponse</div>
            </div>`;
        }).join('')}
    </div>`;
}
function _oralFlip(fid) {
    const a = document.getElementById(fid), h = document.getElementById(fid + '-h');
    if (!a) return;
    const show = a.style.display === 'none';
    a.style.display = show ? 'block' : 'none';
    if (h) h.style.display = show ? 'none' : 'block';
}

/* ── Mode révision (thème entier ou un cours) ── */
function _oralRevision(tid, cid) {
    const t = _oralFindTheme(tid);
    const host = _oralHost();
    if (!t || !host) return;
    const c = t.color || '#7c3aed';
    let cards, label, backFn;
    if (cid) {
        const co = _oralFindCourse(t, cid);
        cards = (co.flashcards || []).map(f => ({ ...f, src: '' }));
        label = co.title;
        backFn = `_oralOpenCourse('${t.id}','${cid}')`;
    } else {
        cards = [];
        (t.courses || []).forEach(co => (co.flashcards || []).forEach(f => cards.push({ ...f, src: co.title })));
        label = 'Tout le thème — ' + t.title;
        backFn = `_oralOpenTheme('${t.id}')`;
    }
    host.innerHTML = `
        <div class="oral-cours" style="--oc:${c}">
            <div class="oral-cours-bar">
                <button class="oral-btn" onclick="${backFn}">← Retour</button>
                <button class="oral-btn" onclick="renderOral()">Tous les thèmes</button>
                <button class="oral-btn oral-btn-rev" onclick="_oralRevealToggle('${tid}','${cid || ''}')" id="oralRevealBtn">${_oralRevealAll ? '🙈 Tout masquer' : '👁️ Tout révéler'}</button>
            </div>
            <div class="oral-hero" style="background:linear-gradient(135deg,${c}33,${c}0a 60%,transparent);border:1px solid ${c}55">
                <div class="oral-hero-icon">🎴</div>
                <div>
                    <div class="oral-hero-num">Mode révision · ${cards.length} flashcards</div>
                    <div class="oral-hero-title">${_oralEsc(label)}</div>
                    <div class="oral-hero-tag">Clique une carte pour révéler la réponse modèle</div>
                </div>
            </div>
            <div class="oral-flash-grid big">
                ${cards.map((q, i) => {
                    const fid = `oral-rv-${i}`;
                    return `<div class="oral-flash" onclick="_oralFlip('${fid}')">
                        ${q.src ? `<div class="oral-flash-src">${_oralEsc(q.src)}</div>` : ''}
                        <div class="oral-flash-q">❓ ${_oralMd(q.q)}</div>
                        <div class="oral-flash-a" id="${fid}" style="display:${_oralRevealAll ? 'block' : 'none'}">✅ ${_oralMd(q.a)}</div>
                        <div class="oral-flash-hint" id="${fid}-h" style="display:${_oralRevealAll ? 'none' : 'block'}">👆 cliquer</div>
                    </div>`;
                }).join('')}
            </div>
            <div class="oral-cours-bar" style="margin-top:18px"><button class="oral-btn" onclick="${backFn}">← Retour</button></div>
        </div>`;
    window.scrollTo(0, 0);
}
function _oralRevealToggle(tid, cid) {
    _oralRevealAll = !_oralRevealAll;
    _oralRevision(tid, cid || null);
}

/* ── Styles ── */
(function _oralInjectCss() {
    if (document.getElementById('oral-styles')) return;
    const st = document.createElement('style');
    st.id = 'oral-styles';
    st.textContent = `
    .oral-banner { background:#0d1424; border:1px solid #1e293b; border-radius:12px; padding:16px 18px; margin:14px 0 20px; }
    .oral-banner-row { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:8px; }
    .oral-pill { font-size:13px; font-weight:700; color:#93c5fd; background:#0f1f3a; border:1px solid #1e40af55; padding:5px 12px; border-radius:20px; }
    .oral-pill-weight { color:#fca5a5; background:#2a1414; border-color:#dc262655; }
    .oral-banner-fmt { font-size:12.5px; color:#94a3b8; line-height:1.6; }
    .oral-banner-hint { font-size:12.5px; color:#cbd5e1; margin-top:10px; padding-top:10px; border-top:1px solid #1e293b; }
    .oral-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:14px; }
    .oral-card { position:relative; background:#0d1424; border:1px solid #1e293b; border-radius:14px; padding:18px 16px 16px; cursor:pointer; transition:all .15s; overflow:hidden; }
    .oral-card::before { content:''; position:absolute; top:0; left:0; right:0; height:4px; background:var(--oc); }
    .oral-card:hover { transform:translateY(-3px); border-color:var(--oc); box-shadow:0 8px 24px rgba(0,0,0,.4); }
    .oral-star { position:absolute; top:9px; right:9px; z-index:2; background:transparent; border:none; font-size:21px; cursor:pointer; line-height:1; padding:2px; color:#475569; transition:transform .12s; }
    .oral-star:hover { transform:scale(1.25); }
    .oral-star.on { color:#fbbf24; filter:drop-shadow(0 0 6px #fbbf2488); }
    .oral-card-icon { width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:24px; margin-bottom:10px; }
    .oral-card-num { font-size:10.5px; font-weight:800; color:var(--oc); text-transform:uppercase; letter-spacing:0.06em; }
    .oral-card-title { font-size:15px; font-weight:800; color:#f1f5f9; line-height:1.3; margin:3px 0 6px; padding-right:18px; }
    .oral-card-tag { font-size:12px; color:#94a3b8; line-height:1.5; min-height:34px; }
    .oral-card-meta { display:flex; gap:6px; font-size:11px; color:#64748b; margin-top:10px; }
    .oral-card-badge { margin-top:10px; display:inline-block; font-size:10.5px; font-weight:800; color:#fde68a; background:#3a2c0a; border:1px solid #fbbf2455; padding:2px 9px; border-radius:10px; }
    .oral-card.oral-card-on { border-color:#fbbf2466; box-shadow:0 0 0 1px #fbbf2433 inset; }
    .oral-section-title { font-size:13px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em; margin:22px 0 12px; }
    .oral-st-note { font-size:11px; font-weight:500; color:#64748b; text-transform:none; letter-spacing:0; }
    .oral-exam-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:14px; margin-bottom:6px; }
    .oral-block-sub { font-size:12px; color:#94a3b8; margin:-6px 0 12px; line-height:1.5; }
    .oral-scn { background:#0d1424; border:1px solid #1e293b; border-radius:11px; padding:14px 16px; margin-bottom:12px; }
    .oral-scn-role { font-size:12.5px; font-weight:800; color:#a78bfa; margin-bottom:6px; }
    .oral-scn-ctx { font-size:13px; color:#cbd5e1; line-height:1.7; margin-bottom:8px; }
    .oral-scn-q { font-size:13.5px; font-weight:700; color:#f1f5f9; line-height:1.6; background:#160b1f; border-left:3px solid #9333ea; border-radius:6px; padding:8px 12px; margin-bottom:10px; }
    .oral-reveal-btn { background:linear-gradient(135deg,#3c1d6e,#553c9a); border:1px solid #7c3aed; color:#e9d5ff; padding:8px 16px; border-radius:8px; cursor:pointer; font-size:12.5px; font-weight:700; }
    .oral-reveal-btn:hover { background:#553c9a; }
    .oral-scn-ans { margin-top:12px; padding:12px 14px; background:#0a0f1c; border:1px solid #16203a; border-radius:9px; }
    .oral-scn-ans-tx { font-size:13px; color:#e2e8f0; line-height:1.75; white-space:pre-wrap; }
    .oral-scn-sub { margin-top:10px; }
    .oral-cas { background:#0a1a0f; border:1px solid #16a34a2e; border-radius:11px; padding:14px 16px; margin-bottom:12px; }
    .oral-cas-hd { font-size:14px; font-weight:800; color:#86efac; margin-bottom:8px; }
    .oral-cas-niv { font-size:12px; margin-right:8px; }
    .oral-cas-en { font-size:13px; color:#cbd5e1; line-height:1.7; margin-bottom:10px; white-space:pre-wrap; }
    .oral-cas-res { margin-top:12px; padding:12px 14px; background:#0a0f1c; border:1px solid #16a34a33; border-radius:9px; font-size:13px; color:#d1fae5; line-height:1.75; white-space:pre-wrap; }
    .oral-exam-card-sim { background:linear-gradient(135deg,#2a1245,#3c1d6e); border-color:#a855f7; }
    .oral-sim-badge { font-size:9.5px; font-weight:800; color:#1a0f2e; background:#c084fc; padding:1px 7px; border-radius:8px; margin-left:6px; vertical-align:middle; text-transform:uppercase; }
    .oral-sim-modes { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; }
    .oral-sim-mode { background:#0d1424; border:1px solid #334155; color:#cbd5e1; padding:9px 14px; border-radius:9px; cursor:pointer; font-size:13px; font-weight:700; }
    .oral-sim-mode.on { background:#3c1d6e; border-color:#9333ea; color:#e9d5ff; }
    .oral-sim-mode-d { font-size:10.5px; font-weight:500; color:#94a3b8; }
    .oral-sim-scopes { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
    .oral-sim-scope { background:#0a0f1c; border:1px solid #334155; color:#94a3b8; padding:6px 12px; border-radius:18px; cursor:pointer; font-size:12px; font-weight:600; }
    .oral-sim-scope.on { background:#1e1b4b; border-color:#a855f7; color:#e9d5ff; }
    .oral-sim-card { background:#0d1424; border:1px solid #1e293b; border-radius:12px; padding:16px 18px; }
    .oral-sim-timer { float:right; font-size:19px; font-weight:800; color:#22d3ee; background:#0a0f1c; border:1px solid #1e293b; border-radius:10px; padding:5px 12px; margin:-2px 0 6px 10px; }
    .oral-sim-src { font-size:11px; font-weight:700; color:#a78bfa; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; }
    .oral-sim-q { font-size:16px; font-weight:800; color:#f1f5f9; line-height:1.5; margin-bottom:10px; }
    .oral-sim-answer { width:100%; box-sizing:border-box; min-height:90px; background:#0a0f1c; border:1px solid #334155; color:#e2e8f0; border-radius:9px; padding:10px 12px; font-size:13px; line-height:1.6; resize:vertical; margin:8px 0; font-family:inherit; }
    .oral-sim-answer:focus { outline:none; border-color:#9333ea; }
    .oral-sim-actions { display:flex; gap:8px; flex-wrap:wrap; }
    .oral-sim-eval { margin-top:12px; font-size:13px; color:#e2e8f0; line-height:1.7; }
    .oral-sim-eval:not(:empty) { background:#06141a; border:1px solid #0891b255; border-left:3px solid #0891b2; border-radius:9px; padding:12px 14px; }
    .oral-sim-empty { color:#94a3b8; font-size:13.5px; padding:14px; font-style:italic; }
    .oral-exam-card { display:flex; align-items:center; gap:14px; background:linear-gradient(135deg,#1a0f2e,#0d1424); border:1px solid #7c3aed44; border-radius:13px; padding:16px 18px; cursor:pointer; transition:all .14s; }
    .oral-exam-card:hover { border-color:#9333ea; transform:translateY(-2px); box-shadow:0 6px 20px rgba(124,58,237,.25); }
    .oral-exam-card > div:nth-child(2) { flex:1; }
    .oral-exam-ic { font-size:30px; flex-shrink:0; }
    .oral-exam-t { font-size:15px; font-weight:800; color:#f1f5f9; }
    .oral-exam-d { font-size:12px; color:#a5b4fc; line-height:1.5; margin-top:3px; }
    .oral-ul { margin:0; padding-left:20px; line-height:1.75; }
    .oral-ul li { font-size:13px; color:#cbd5e1; margin-bottom:5px; }
    .oral-exam-part-hd { display:flex; align-items:baseline; gap:12px; flex-wrap:wrap; margin-bottom:8px; }
    .oral-exam-part-name { font-size:16px; font-weight:800; }
    .oral-exam-part-meta { font-size:11.5px; color:#64748b; font-weight:600; }
    .oral-exam-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .oral-block.oral-exam-col { margin-bottom:0; }
    .oral-exam-pieges { margin-top:12px; padding:10px 14px; background:#1a1206; border:1px solid #fbbf2433; border-radius:8px; }
    .oral-pres-steps { display:flex; flex-direction:column; gap:10px; margin:6px 0; }
    .oral-pres-step { display:flex; gap:12px; align-items:flex-start; background:#0a0f1c; border-radius:9px; padding:11px 13px; }
    .oral-pres-step-n { width:26px; height:26px; border-radius:50%; background:#7c3aed; color:#fff; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .oral-pres-step-t { font-size:13.5px; font-weight:800; color:#e9d5ff; }
    .oral-pres-step-d { font-size:12.5px; color:#cbd5e1; line-height:1.6; margin-top:3px; }
    .oral-comp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:10px; }
    .oral-comp-card { display:flex; align-items:center; gap:11px; background:#160b1f; border:1px solid #9333ea44; border-radius:10px; padding:12px 14px; cursor:pointer; transition:all .13s; }
    .oral-comp-card:hover { border-color:#c084fc; transform:translateY(-2px); background:#1d1030; }
    .oral-comp-n { width:26px; height:26px; border-radius:7px; background:#9333ea; color:#fff; font-size:13px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .oral-comp-nom { flex:1; font-size:13.5px; font-weight:700; color:#e9d5ff; line-height:1.35; }
    .oral-comp-go { color:#9333ea; font-size:20px; }
    @media (max-width:680px) { .oral-exam-row { grid-template-columns:1fr; } .oral-exam-grid { grid-template-columns:1fr; } }

    .oral-cours { max-width:980px; margin:0 auto; }
    .oral-cours-bar { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
    .oral-btn { background:#1e293b; border:1px solid #334155; color:#cbd5e1; padding:9px 15px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; }
    .oral-btn:hover { border-color:var(--oc); color:#fff; }
    .oral-btn-rev { background:linear-gradient(135deg,#3c1d6e,#553c9a); border-color:#7c3aed; color:#e9d5ff; font-weight:700; }
    .oral-btn-star { background:#3a2c0a; border-color:#fbbf24; color:#fde68a; }
    .oral-hero { display:flex; gap:16px; align-items:center; padding:22px; border-radius:14px; margin-bottom:18px; }
    .oral-hero-icon { font-size:48px; flex-shrink:0; }
    .oral-hero-num { font-size:11px; font-weight:800; color:var(--oc); text-transform:uppercase; letter-spacing:0.05em; }
    .oral-hero-title { font-size:22px; font-weight:900; color:#fff; line-height:1.2; margin:4px 0; }
    .oral-hero-tag { font-size:13px; color:#cbd5e1; }
    .oral-block { background:#0a0f1c; border:1px solid #16203a; border-radius:12px; padding:16px 18px; margin-bottom:16px; }
    .oral-block-hd { font-size:14px; font-weight:800; margin-bottom:12px; }
    .oral-apercu { font-size:13.5px; color:#cbd5e1; line-height:1.8; white-space:pre-wrap; }
    .oral-objectifs ul, .oral-pieges ul { margin:0; padding-left:20px; line-height:1.9; }
    .oral-objectifs li { color:#d1fae5; font-size:13.5px; }
    .oral-pieges { background:#1a1206; border-color:#fbbf2433; }
    .oral-pieges li { color:#fde68a; font-size:13.5px; }
    .oral-course-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:12px; }
    .oral-course-card { display:flex; align-items:center; gap:12px; background:#0d1424; border:1px solid #1e293b; border-radius:11px; padding:13px 14px; cursor:pointer; transition:all .13s; }
    .oral-course-card:hover { border-color:var(--oc); transform:translateY(-2px); background:#0f1830; }
    .oral-course-n { width:30px; height:30px; border-radius:8px; color:#fff; font-size:14px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .oral-course-body { flex:1; min-width:0; }
    .oral-course-title { font-size:14px; font-weight:800; color:#f1f5f9; line-height:1.3; }
    .oral-course-tag { font-size:12px; color:#94a3b8; line-height:1.45; margin:2px 0 5px; }
    .oral-course-meta { font-size:10.5px; color:#64748b; }
    .oral-course-go { font-size:24px; color:var(--oc); font-weight:400; flex-shrink:0; }
    .oral-section { margin-bottom:18px; }
    .oral-section-hd { display:flex; align-items:center; gap:10px; font-size:16px; font-weight:800; color:#fff; margin-bottom:10px; padding-bottom:7px; border-bottom:2px solid var(--oc); }
    .oral-section-n { width:26px; height:26px; border-radius:7px; color:#fff; font-size:14px; font-weight:800; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
    .oral-section-body { font-size:13.5px; color:#cbd5e1; line-height:1.8; white-space:pre-wrap; }
    .oral-callout { margin:10px 0; padding:11px 14px; border-radius:6px; }
    .oral-callout-hd { font-size:11px; font-weight:800; margin-bottom:4px; letter-spacing:0.04em; }
    .oral-callout-tx { font-size:13px; color:#e2e8f0; line-height:1.65; }
    .oral-compare { margin:12px 0; }
    .oral-compare-hd { font-size:12px; font-weight:800; margin-bottom:8px; }
    .oral-table { width:100%; border-collapse:collapse; font-size:12.5px; }
    .oral-table th { text-align:left; padding:8px 10px; background:#0d1424; font-weight:800; white-space:nowrap; }
    .oral-table td { padding:8px 10px; color:#cbd5e1; line-height:1.55; border-bottom:1px solid #1e293b; vertical-align:top; }
    .oral-td-key { color:#e2e8f0; font-weight:700; }
    .oral-bases { display:flex; flex-direction:column; gap:8px; }
    .oral-base { display:flex; gap:12px; padding:8px 10px; background:#0d1424; border-radius:8px; }
    .oral-base-ref { font-weight:800; font-size:12.5px; white-space:nowrap; min-width:120px; }
    .oral-base-detail { font-size:12.5px; color:#cbd5e1; line-height:1.6; }
    .oral-exemple { background:#0a1a0f; border:1px solid #16a34a33; border-radius:10px; padding:13px 15px; margin-bottom:10px; }
    .oral-exemple-hd { font-size:13.5px; font-weight:800; color:#4ade80; margin-bottom:6px; }
    .oral-exemple-en { font-size:13px; color:#cbd5e1; line-height:1.7; margin-bottom:6px; }
    .oral-exemple-res { font-size:13px; color:#bbf7d0; line-height:1.7; }
    .oral-angle-intro { font-size:13.5px; color:#e2e8f0; line-height:1.7; margin-bottom:12px; }
    .oral-angle-cols { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .oral-angle-col { background:#0a0f1c; border-radius:10px; padding:12px 14px; }
    .oral-angle-lbl { font-size:11.5px; font-weight:800; color:#cbd5e1; margin-bottom:8px; }
    .oral-angle-col ol, .oral-angle-col ul { margin:0; padding-left:18px; line-height:1.7; }
    .oral-angle-col li { font-size:12.5px; color:#cbd5e1; margin-bottom:5px; }
    .oral-angle-phrases { margin-top:12px; }
    .oral-phrase { font-size:13px; color:#e9d5ff; background:#160b1f; border-left:3px solid #9333ea; border-radius:6px; padding:9px 12px; margin:6px 0; font-style:italic; line-height:1.6; }
    .oral-flash-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:10px; }
    .oral-flash-grid.big { grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); }
    .oral-flash { background:#160b1f; border:1px solid #9333ea44; border-radius:10px; padding:13px 15px; cursor:pointer; transition:border-color .15s; }
    .oral-flash:hover { border-color:#c084fc; }
    .oral-flash-src { font-size:10px; font-weight:700; color:#a78bfa; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:5px; }
    .oral-flash-q { font-size:13px; font-weight:700; color:#e9d5ff; line-height:1.55; }
    .oral-flash-a { font-size:13px; color:#86efac; line-height:1.65; margin-top:9px; padding-top:9px; border-top:1px dashed #9333ea55; }
    .oral-flash-hint { font-size:10.5px; color:#7c3aed; font-style:italic; margin-top:8px; }
    .oral-rev-link { font-size:11px; font-weight:600; color:#c084fc; cursor:pointer; margin-left:8px; }
    .oral-rev-link:hover { text-decoration:underline; }
    .oral-liens .oral-lien { font-size:12.5px; color:#cbd5e1; line-height:1.6; padding:6px 0; border-bottom:1px solid #16203a; }
    .oral-lien-th { font-weight:800; color:#7dd3fc; }
    @media (max-width:680px) { .oral-angle-cols { grid-template-columns:1fr; } .oral-base { flex-direction:column; gap:3px; } .oral-base-ref { min-width:0; } }
    `;
    document.head.appendChild(st);
})();
