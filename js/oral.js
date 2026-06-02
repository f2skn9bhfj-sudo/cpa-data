/* ═══════════════════════════════════════════════════════════════
   Module ORAL — préparation de l'examen oral (diplôme fédéral
   d'expert-comptable, règlement 2026). 7 thèmes principaux.
   ═══════════════════════════════════════════════════════════════ */

let _oralData = null;
let _oralRevealAll = false;
const ORAL_STAR_KEY = 'swisscpa_oral_principaux';

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
// Markdown léger : **gras**
function _oralMd(t) {
    return _oralEsc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

const _ORAL_CALLOUT = {
    key:     { bg: '#1e1b0a', bd: '#d97706', col: '#fbbf24', icon: '🔑', lbl: 'À RETENIR' },
    info:    { bg: '#0a0f1c', bd: '#3b82f6', col: '#60a5fa', icon: 'ℹ️',  lbl: 'INFO' },
    warn:    { bg: '#3f1612', bd: '#dc2626', col: '#fca5a5', icon: '⚠️', lbl: 'ATTENTION' },
    example: { bg: '#0a1a0f', bd: '#16a34a', col: '#4ade80', icon: '📌', lbl: 'EXEMPLE' },
    tip:     { bg: '#06141a', bd: '#0891b2', col: '#22d3ee', icon: '💡', lbl: 'ASTUCE' },
    legal:   { bg: '#0f1419', bd: '#64748b', col: '#cbd5e1', icon: '⚖️', lbl: 'CADRE LÉGAL' },
};

async function renderOral(host) {
    if (!host) return;
    if (!_oralData) {
        host.innerHTML = '<div style="padding:60px;text-align:center;color:#94a3b8">Chargement du module Oral…</div>';
        try {
            _oralData = await pywebview.api.get_oral_data();
        } catch (e) {
            try { _oralData = await window.pywebview.api.get_oral_data(); }
            catch (_) { _oralData = { themes: [] }; }
        }
    }
    _oralRenderHome(host);
}

function _oralRenderHome(host) {
    const d = _oralData || {};
    const themes = d.themes || [];
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

        <div class="oral-grid">
            ${themes.map(t => _oralCard(t, stars.has(t.id))).join('')}
        </div>
    `;
}

function _oralCard(t, starred) {
    const c = t.color || '#7c3aed';
    return `
        <div class="oral-card ${starred ? 'oral-card-on' : ''}" style="--oc:${c}" onclick="_oralOpenCourse('${t.id}')">
            <button class="oral-star ${starred ? 'on' : ''}" title="Marquer comme thème principal"
                    onclick="event.stopPropagation();_oralToggleStar('${t.id}')">${starred ? '⭐' : '☆'}</button>
            <div class="oral-card-icon" style="background:${c}22;border:1px solid ${c}55">${t.icon || '📚'}</div>
            <div class="oral-card-num">Thème ${t.num}</div>
            <div class="oral-card-title">${_oralEsc(t.title)}</div>
            <div class="oral-card-tag">${_oralEsc(t.tagline || '')}</div>
            <div class="oral-card-meta">
                <span>${(t.sections || []).length} sections</span>
                <span>·</span>
                <span>${(t.flashcards || []).length} flashcards</span>
            </div>
            ${starred ? '<div class="oral-card-badge">★ Thème principal</div>' : ''}
        </div>`;
}

function _oralToggleStar(id) {
    const stars = _oralStars();
    if (stars.has(id)) stars.delete(id); else stars.add(id);
    _oralSaveStars(stars);
    const host = document.getElementById('mainContent');
    if (host) _oralRenderHome(host);
}

function _oralFindTheme(id) {
    return ((_oralData || {}).themes || []).find(t => t.id === id);
}

function _oralOpenCourse(id, mode) {
    const t = _oralFindTheme(id);
    const host = document.getElementById('mainContent');
    if (!t || !host) return;
    _oralRevealAll = false;
    const c = t.color || '#7c3aed';

    if (mode === 'revision') {
        host.innerHTML = _oralRevisionView(t, c);
        window.scrollTo(0, 0);
        return;
    }

    host.innerHTML = `
        <div class="oral-cours" style="--oc:${c}">
            <div class="oral-cours-bar">
                <button class="oral-btn" onclick="renderOral(document.getElementById('mainContent'))">← Tous les thèmes</button>
                <button class="oral-btn oral-btn-rev" onclick="_oralOpenCourse('${t.id}','revision')">🎴 Mode révision (flashcards)</button>
            </div>

            <div class="oral-hero" style="background:linear-gradient(135deg,${c}33,${c}0a 60%,transparent);border:1px solid ${c}55">
                <div class="oral-hero-icon">${t.icon || '📚'}</div>
                <div>
                    <div class="oral-hero-num">Thème ${t.num} · examen oral</div>
                    <div class="oral-hero-title">${_oralEsc(t.title)}</div>
                    <div class="oral-hero-tag">${_oralEsc(t.tagline || '')}</div>
                </div>
            </div>

            ${(t.objectifs || []).length ? `
                <div class="oral-block oral-objectifs">
                    <div class="oral-block-hd">🎯 Objectifs d'apprentissage</div>
                    <ul>${t.objectifs.map(o => `<li>${_oralMd(o)}</li>`).join('')}</ul>
                </div>` : ''}

            ${(t.sections || []).map((s, i) => _oralSection(s, c, i + 1)).join('')}

            ${(t.bases || []).length ? `
                <div class="oral-block">
                    <div class="oral-block-hd" style="color:#cbd5e1">⚖️ Bases normatives clés</div>
                    <div class="oral-bases">
                        ${t.bases.map(b => `<div class="oral-base"><span class="oral-base-ref" style="color:${c}">${_oralEsc(b.ref)}</span><span class="oral-base-detail">${_oralMd(b.detail)}</span></div>`).join('')}
                    </div>
                </div>` : ''}

            ${(t.exemples || []).length ? `
                <div class="oral-block">
                    <div class="oral-block-hd" style="color:#4ade80">🧮 Exemples chiffrés / cas pratiques</div>
                    ${t.exemples.map(_oralExemple).join('')}
                </div>` : ''}

            ${(t.pieges || []).length ? `
                <div class="oral-block oral-pieges">
                    <div class="oral-block-hd" style="color:#fbbf24">⚠️ Pièges fréquents</div>
                    <ul>${t.pieges.map(p => `<li>${_oralMd(p)}</li>`).join('')}</ul>
                </div>` : ''}

            ${_oralAngleOral(t.angle_oral, c)}

            <div class="oral-block">
                <div class="oral-block-hd" style="color:#c084fc">🎴 Flashcards type oral <span class="oral-rev-link" onclick="_oralOpenCourse('${t.id}','revision')">→ mode révision</span></div>
                ${_oralFlashList(t.flashcards, t.id, false)}
            </div>

            ${(t.liens || []).length ? `
                <div class="oral-block oral-liens">
                    <div class="oral-block-hd" style="color:#38bdf8">🔗 Liens interdisciplinaires</div>
                    ${t.liens.map(l => `<div class="oral-lien"><span class="oral-lien-th">${_oralEsc(l.theme)}</span> ${_oralMd(l.lien)}</div>`).join('')}
                </div>` : ''}

            <div class="oral-cours-bar" style="margin-top:18px">
                <button class="oral-btn" onclick="renderOral(document.getElementById('mainContent'))">← Tous les thèmes</button>
            </div>
        </div>
    `;
    window.scrollTo(0, 0);
}

function _oralSection(s, c, idx) {
    const callouts = (s.callouts || []).map(co => {
        const cfg = _ORAL_CALLOUT[co.type] || _ORAL_CALLOUT.info;
        return `<div class="oral-callout" style="background:${cfg.bg};border-left:3px solid ${cfg.bd}">
            <div class="oral-callout-hd" style="color:${cfg.col}">${cfg.icon} ${_oralEsc(co.label || cfg.lbl)}</div>
            <div class="oral-callout-tx">${_oralMd(co.text || '')}</div>
        </div>`;
    }).join('');
    return `
        <div class="oral-section">
            <div class="oral-section-hd"><span class="oral-section-n" style="background:${c}">${idx}</span>${_oralEsc(s.titre || '')}</div>
            ${s.body ? `<div class="oral-section-body">${_oralMd(s.body)}</div>` : ''}
            ${s.compare ? _oralCompare(s.compare, c) : ''}
            ${callouts}
        </div>`;
}

function _oralCompare(cmp, c) {
    if (!cmp) return '';
    return `<div class="oral-compare">
        ${cmp.title ? `<div class="oral-compare-hd" style="color:${c}">🔀 ${_oralEsc(cmp.title)}</div>` : ''}
        <div style="overflow-x:auto"><table class="oral-table">
            <thead><tr>${(cmp.headers || []).map(h => `<th style="color:${c};border-bottom:2px solid ${c}">${_oralEsc(h)}</th>`).join('')}</tr></thead>
            <tbody>${(cmp.rows || []).map(r => `<tr>${r.map((cell, ci) => `<td class="${ci === 0 ? 'oral-td-key' : ''}">${_oralMd(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
    </div>`;
}

function _oralExemple(ex) {
    return `<div class="oral-exemple">
        <div class="oral-exemple-hd">📌 ${_oralEsc(ex.titre || 'Cas')}</div>
        ${ex.enonce ? `<div class="oral-exemple-en"><b>Énoncé :</b> ${_oralMd(ex.enonce)}</div>` : ''}
        ${ex.resolution ? `<div class="oral-exemple-res"><b>Résolution :</b> ${_oralMd(ex.resolution)}</div>` : ''}
    </div>`;
}

function _oralAngleOral(a, c) {
    if (!a) return '';
    return `
        <div class="oral-block oral-angle" style="border:1px solid ${c}55;background:linear-gradient(135deg,${c}14,#0a0f1c)">
            <div class="oral-block-hd" style="color:${c}">🎙️ Angle oral — structurer, prendre position, recommander</div>
            ${a.intro ? `<div class="oral-angle-intro">${_oralMd(a.intro)}</div>` : ''}
            <div class="oral-angle-cols">
                ${(a.structure || []).length ? `<div class="oral-angle-col">
                    <div class="oral-angle-lbl">🧭 Trame d'une réponse (≈ 7,5 min)</div>
                    <ol>${a.structure.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ol>
                </div>` : ''}
                ${(a.recommandations || []).length ? `<div class="oral-angle-col">
                    <div class="oral-angle-lbl">✅ Recommandations à formuler</div>
                    <ul>${a.recommandations.map(x => `<li>${_oralMd(x)}</li>`).join('')}</ul>
                </div>` : ''}
            </div>
            ${(a.phrases || []).length ? `<div class="oral-angle-phrases">
                <div class="oral-angle-lbl">💬 Formulations prêtes à l'emploi (prise de position)</div>
                ${a.phrases.map(p => `<div class="oral-phrase">« ${_oralMd(p)} »</div>`).join('')}
            </div>` : ''}
        </div>`;
}

function _oralFlashList(cards, tid, big) {
    if (!cards || !cards.length) return '';
    return `<div class="oral-flash-grid ${big ? 'big' : ''}">
        ${cards.map((q, i) => {
            const fid = `oral-fc-${tid}-${i}`;
            return `<div class="oral-flash" onclick="_oralFlip('${fid}')">
                <div class="oral-flash-q">❓ ${_oralMd(q.q)}</div>
                <div class="oral-flash-a" id="${fid}" style="display:${_oralRevealAll ? 'block' : 'none'}">✅ ${_oralMd(q.a)}</div>
                <div class="oral-flash-hint" id="${fid}-h" style="display:${_oralRevealAll ? 'none' : 'block'}">👆 cliquer pour la réponse</div>
            </div>`;
        }).join('')}
    </div>`;
}

function _oralFlip(fid) {
    const a = document.getElementById(fid);
    const h = document.getElementById(fid + '-h');
    if (!a) return;
    const show = a.style.display === 'none';
    a.style.display = show ? 'block' : 'none';
    if (h) h.style.display = show ? 'none' : 'block';
}

function _oralRevisionView(t, c) {
    return `
        <div class="oral-cours" style="--oc:${c}">
            <div class="oral-cours-bar">
                <button class="oral-btn" onclick="_oralOpenCourse('${t.id}')">← Cours complet</button>
                <button class="oral-btn" onclick="renderOral(document.getElementById('mainContent'))">Tous les thèmes</button>
                <button class="oral-btn oral-btn-rev" onclick="_oralRevealToggle('${t.id}')" id="oralRevealBtn">
                    ${_oralRevealAll ? '🙈 Tout masquer' : '👁️ Tout révéler'}
                </button>
            </div>
            <div class="oral-hero" style="background:linear-gradient(135deg,${c}33,${c}0a 60%,transparent);border:1px solid ${c}55">
                <div class="oral-hero-icon">${t.icon || '📚'}</div>
                <div>
                    <div class="oral-hero-num">🎴 Mode révision · ${(t.flashcards || []).length} flashcards</div>
                    <div class="oral-hero-title">${_oralEsc(t.title)}</div>
                    <div class="oral-hero-tag">Clique une carte pour révéler la réponse modèle</div>
                </div>
            </div>
            ${_oralFlashList(t.flashcards, t.id, true)}
            <div class="oral-cours-bar" style="margin-top:18px">
                <button class="oral-btn" onclick="_oralOpenCourse('${t.id}')">← Cours complet</button>
            </div>
        </div>`;
}

function _oralRevealToggle(id) {
    _oralRevealAll = !_oralRevealAll;
    const t = _oralFindTheme(id);
    const host = document.getElementById('mainContent');
    if (t && host) host.innerHTML = _oralRevisionView(t, t.color || '#7c3aed');
}

// ── Styles (injectés une fois) ──
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

    .oral-cours { max-width:980px; margin:0 auto; }
    .oral-cours-bar { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
    .oral-btn { background:#1e293b; border:1px solid #334155; color:#cbd5e1; padding:9px 15px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; }
    .oral-btn:hover { border-color:var(--oc); color:#fff; }
    .oral-btn-rev { background:linear-gradient(135deg,#3c1d6e,#553c9a); border-color:#7c3aed; color:#e9d5ff; font-weight:700; }
    .oral-hero { display:flex; gap:16px; align-items:center; padding:22px; border-radius:14px; margin-bottom:18px; }
    .oral-hero-icon { font-size:48px; flex-shrink:0; }
    .oral-hero-num { font-size:11px; font-weight:800; color:var(--oc); text-transform:uppercase; letter-spacing:0.06em; }
    .oral-hero-title { font-size:22px; font-weight:900; color:#fff; line-height:1.2; margin:4px 0; }
    .oral-hero-tag { font-size:13px; color:#cbd5e1; }
    .oral-block { background:#0a0f1c; border:1px solid #16203a; border-radius:12px; padding:16px 18px; margin-bottom:16px; }
    .oral-block-hd { font-size:14px; font-weight:800; margin-bottom:12px; }
    .oral-objectifs ul, .oral-pieges ul { margin:0; padding-left:20px; line-height:1.9; }
    .oral-objectifs li { color:#d1fae5; font-size:13.5px; }
    .oral-pieges { background:#1a1206; border-color:#fbbf2433; }
    .oral-pieges li { color:#fde68a; font-size:13.5px; }
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
    .oral-angle { }
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
