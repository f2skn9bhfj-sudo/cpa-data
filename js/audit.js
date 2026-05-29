/* ═══════════════════════════════════════════════
   Module Audit — Swiss CPA + Pratique EY
   Vague 1 : squelette UI (6 onglets) + état
   Le contenu est rempli en Vagues 2-4.
   ═══════════════════════════════════════════════ */

const AUDIT_TABS = [
    { id: 'cours',        label: 'Cours MSA',     icon: '📚', desc: 'Base de cours — contrôle ordinaire (MSA) + restreint (NCR)' },
    { id: 'canvas',       label: 'Canvas Perso',  icon: '🏢', desc: 'Tes propres engagements d\'audit' },
    { id: 'mission',      label: 'Mission Lab',   icon: '🎬', desc: 'Mission immersive end-to-end chez EY' },
    { id: 'seuils',       label: 'Seuils & Exos', icon: '🎯', desc: 'Comprendre tous les seuils + exercices pas-à-pas' },
    { id: 'nas',          label: 'NAS / ISA',     icon: '📐', desc: 'Normes d\'audit suisses + équivalents ISA' },
    { id: 'annuaire',     label: 'Annuaire ISA',  icon: '📇', desc: 'Répertoire exhaustif de TOUTES les ISA (200-810) en détail + ISRE/ISAE/ISRS/ISQM' },
    { id: 'cadre_legal',  label: 'Cadre légal',   icon: '⚖️', desc: 'CO 727ss, LSR, MSA, indépendance' },
    { id: 'comparatifs',  label: 'Comparatifs',   icon: '📊', desc: 'IFRS vs RPC vs CO — sujets d\'audit' },
    { id: 'cycles',       label: 'Cycles',        icon: '🔄', desc: 'Ventes, achats, paie, stocks, immo, tréso, FP, impôts' },
    { id: 'terrain',      label: 'Terrain EY',    icon: '🛠️', desc: 'Phases de mission, livrables, soft skills' },
    { id: 'outils',       label: 'Outils',        icon: '🧮', desc: 'Calculateurs (matérialité, sampling, opinion), wording, glossaire' },
    { id: 'lexique',      label: 'Lexique',       icon: '📖', desc: 'Acronymes audit (ISA/NAS/CO/LSR), vocabulaire FR↔EN, latin, jargon EY, phrases types' },
    { id: 'quiz',         label: 'Quiz',          icon: '🎯', desc: 'Quiz par NAS, arbres de décision, simulateur' },
];

const AUDIT_ACCENT = '#805ad5';   // Cohérent avec Audit / ISA dans COLORS
const AUDIT_BG     = '#553c9a';
const AUDIT_LIGHT  = '#faf5ff';
const AUDIT_BORDER = '#e9d8fd';

let _auditData = null;
let _auditCurrentSubTab = 'nas';

async function renderAudit(container, subTab) {
    container.innerHTML = '<div class="text-center" style="padding:60px"><div class="page-title">Chargement du module Audit...</div></div>';

    if (!_auditData) {
        _auditData = await api('get_audit_data');
    }

    if (!_auditData) {
        container.innerHTML = `
            <div style="padding:40px;text-align:center">
                <div style="font-size:48px;margin-bottom:12px">⚠️</div>
                <div style="color:#fca5a5;font-size:16px;margin-bottom:6px">Module Audit indisponible</div>
                <div style="color:#94a3b8;font-size:13px">Le fichier <code>data/audit.json</code> n'a pas pu être chargé.</div>
            </div>`;
        return;
    }

    _auditCurrentSubTab = subTab || _auditCurrentSubTab || 'nas';

    container.innerHTML = `
        <div class="audit-module">
            ${_renderAuditHeader()}
            ${_renderAuditSubTabs(_auditCurrentSubTab)}
            <div id="auditContent" style="margin-top:20px"></div>
        </div>`;

    _renderAuditSubContent(_auditCurrentSubTab);
}

function _renderAuditHeader() {
    const meta = _auditData._meta || {};
    return `
        <div style="margin-bottom:20px;padding:18px 22px;border-radius:12px;
                    background:linear-gradient(135deg, ${AUDIT_BG} 0%, #4c1d95 100%);
                    border:1px solid ${AUDIT_ACCENT};
                    box-shadow:0 4px 16px rgba(128,90,213,0.25)">
            <div style="display:flex;align-items:center;gap:14px">
                <div style="font-size:36px">🔍</div>
                <div style="flex:1">
                    <div style="font-size:20px;font-weight:800;color:#e9d8fd;letter-spacing:-0.3px">
                        Module Audit
                    </div>
                    <div style="font-size:13px;color:#c4b5fd;margin-top:2px">
                        Swiss CPA · NAS / ISA · Pratique EY · ${meta.version ? 'v' + meta.version : ''}
                    </div>
                </div>
                <div style="text-align:right;font-size:11px;color:#a78bfa;line-height:1.5">
                    <div>📚 ${(_auditData.nas?.norms?.length) || 0} NAS</div>
                    <div>🔄 ${(_auditData.cycles?.items?.length) || 0} cycles</div>
                    <div>🎯 ${(_auditData.quiz?.decks?.length) || 0} decks quiz</div>
                </div>
            </div>
        </div>`;
}

function _renderAuditSubTabs(active) {
    return `
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:6px;background:#0f172a;
                    border:1px solid #1e293b;border-radius:10px">
            ${AUDIT_TABS.map(t => {
                const isActive = t.id === active;
                return `
                    <button onclick="navigateAudit('${t.id}')"
                            title="${escapeHtml(t.desc)}"
                            style="flex:1 1 140px;padding:10px 12px;border-radius:7px;cursor:pointer;
                                   font-size:13px;font-weight:600;transition:all 0.15s;
                                   border:1px solid ${isActive ? AUDIT_ACCENT : 'transparent'};
                                   background:${isActive ? '#3c1d6e' : 'transparent'};
                                   color:${isActive ? '#e9d8fd' : '#94a3b8'}">
                        <span style="font-size:15px;margin-right:6px">${t.icon}</span>${t.label}
                    </button>`;
            }).join('')}
        </div>`;
}

function navigateAudit(subTab) {
    _auditCurrentSubTab = subTab;
    // Update sub-tab buttons
    const audit = document.querySelector('.audit-module');
    if (audit) {
        const subTabsHost = audit.children[1];
        if (subTabsHost) subTabsHost.outerHTML = _renderAuditSubTabs(subTab);
    }
    _renderAuditSubContent(subTab);
    // Persist last audit subtab
    try {
        const ctx = JSON.parse(localStorage.getItem('swisscpa_last_ctx') || '{}');
        ctx.tab = 'audit';
        ctx.sub = subTab;
        ctx.label = 'Audit › ' + (AUDIT_TABS.find(t => t.id === subTab)?.label || subTab);
        localStorage.setItem('swisscpa_last_ctx', JSON.stringify(ctx));
    } catch (_) {}
}

function _renderAuditSubContent(subTab) {
    const host = document.getElementById('auditContent');
    if (!host) return;

    switch (subTab) {
        case 'cours':
            if (typeof window._renderAuditCours === 'function') window._renderAuditCours(host);
            else host.innerHTML = '<p>Module Cours indisponible.</p>';
            break;
        case 'canvas':
            if (typeof renderCanvas === 'function') renderCanvas(host);
            else host.innerHTML = '<p>Module Canvas indisponible.</p>';
            break;
        case 'mission':
            if (typeof renderMission === 'function') renderMission(host);
            else host.innerHTML = '<p>Module Mission indisponible.</p>';
            break;
        case 'seuils':
            if (typeof renderAuditSeuils === 'function') renderAuditSeuils(host);
            else host.innerHTML = '<p>Module Seuils indisponible.</p>';
            break;
        case 'nas':         _renderAuditNas(host);        break;
        case 'cadre_legal': _renderAuditCadre(host);      break;
        case 'comparatifs': _renderAuditComparatifs(host); break;
        case 'cycles':      _renderAuditCycles(host);     break;
        case 'terrain':     _renderAuditTerrain(host);    break;
        case 'outils':      _renderAuditOutils(host); _initOutilsCalculators(); break;
        case 'lexique':     _renderAuditLexique(host);    break;
        case 'annuaire':    _renderAuditAnnuaire(host);   break;
        case 'quiz':        _renderAuditQuiz(host);       break;
        default:            _renderAuditNas(host);
    }
}

// ─────────────────────────────────────────────────────────────────
// ANNUAIRE ISA — Répertoire exhaustif de toutes les normes ISA en détail
// ─────────────────────────────────────────────────────────────────
let _annuaireFilterSerie = 'all';
let _annuaireSearch = '';

function _renderAuditAnnuaire(host) {
    const ann = _auditData.annuaire || {};
    const series = ann.series || [];
    const totalStd = series.reduce((s, sr) => s + (sr.standards?.length || 0), 0);

    host.innerHTML = `
        <div class="ref-section-title">${ann._icon || '📇'} ${escapeHtml(ann._label || 'Annuaire ISA')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:14px">
            ${escapeHtml(ann._description || '')}
        </p>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
            <span style="background:#3c1d6e;padding:4px 10px;border-radius:12px;font-size:12px;color:#c4b5fd">
                📚 ${totalStd} normes
            </span>
            <span style="background:#3c1d6e;padding:4px 10px;border-radius:12px;font-size:12px;color:#c4b5fd">
                🗂️ ${series.length} séries
            </span>
            <input type="text" id="annuaireSearch" placeholder="🔍 Rechercher (ex: 315, going concern, fraude, KAM…)"
                   value="${escapeHtml(_annuaireSearch)}"
                   oninput="_filterAnnuaire(this.value)"
                   style="flex:1;min-width:240px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;
                          padding:8px 12px;border-radius:7px;font-size:13px" />
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px">
            <button onclick="_setAnnuaireSerie('all')"
                    style="padding:7px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;
                           background:${_annuaireFilterSerie === 'all' ? AUDIT_ACCENT : '#1e293b'};
                           color:${_annuaireFilterSerie === 'all' ? '#fff' : '#94a3b8'};
                           border:1px solid ${_annuaireFilterSerie === 'all' ? AUDIT_ACCENT : '#334155'}">
                🔍 Toutes (${totalStd})
            </button>
            ${series.map(sr => `
                <button onclick="_setAnnuaireSerie('${sr.id}')"
                        title="${escapeHtml(sr.intro || '')}"
                        style="padding:7px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;
                               background:${_annuaireFilterSerie === sr.id ? (sr.color || AUDIT_ACCENT) : '#1e293b'};
                               color:${_annuaireFilterSerie === sr.id ? '#fff' : '#94a3b8'};
                               border:1px solid ${_annuaireFilterSerie === sr.id ? (sr.color || AUDIT_ACCENT) : '#334155'}">
                    ${escapeHtml(sr.range)} (${sr.standards.length})
                </button>
            `).join('')}
        </div>
        <div id="annuaireList">
            ${series.map(sr => _renderAnnuaireSerie(sr)).join('')}
        </div>
    `;
    _applyAnnuaireFilter();
}

function _renderAnnuaireSerie(sr) {
    const color = sr.color || AUDIT_ACCENT;
    return `
        <div class="annuaire-serie" data-serie-id="${sr.id}" style="margin-bottom:22px">
            <div style="padding:10px 14px;border-radius:8px 8px 0 0;background:linear-gradient(135deg, ${color}33, transparent);
                        border-left:4px solid ${color};margin-bottom:2px">
                <div style="font-size:15px;font-weight:800;color:${color}">${escapeHtml(sr.label)}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:3px;line-height:1.5">${escapeHtml(sr.intro || '')}</div>
            </div>
            ${(sr.standards || []).map((std, idx) => _renderAnnuaireStandard(sr.id, idx, std, color)).join('')}
        </div>`;
}

function _renderAnnuaireStandard(serieId, idx, std, color) {
    const id = `ann-${serieId}-${idx}`;
    const searchHay = [std.num, std.code, std.title_fr, std.title_en, std.objective, std.scope,
                       (std.requirements || []).join(' '), std.swiss, std.exam_tip,
                       (std.related || []).join(' ')]
        .filter(Boolean).join(' ').toLowerCase();
    return `
        <div class="annuaire-item" data-ann-search="${escapeHtml(searchHay)}" data-serie-id="${serieId}"
             style="border:1px solid #1e293b;border-left:3px solid ${color};border-radius:6px;margin-bottom:8px;background:#0d1424">
            <div onclick="_toggleAnnuaire('${id}')"
                 style="padding:12px 16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;
                        transition:background 0.15s" onmouseover="this.style.background='#141d33'" onmouseout="this.style.background=''">
                <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                        <span style="background:${color};color:#fff;font-size:12px;font-weight:800;padding:3px 10px;border-radius:5px;letter-spacing:0.3px;flex-shrink:0">
                            ${escapeHtml(std.code)}
                        </span>
                        <span style="font-size:13px;font-weight:700;color:${AUDIT_LIGHT}">${escapeHtml(std.title_fr)}</span>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:5px;font-size:11px">
                        ${std.status ? `<span style="color:#a78bfa;background:#1e1b4b;padding:1px 8px;border-radius:10px">${escapeHtml(std.status)}</span>` : ''}
                        ${std.effective ? `<span style="color:#64748b">🕰️ ${escapeHtml(std.effective)}</span>` : ''}
                    </div>
                </div>
                <span id="${id}-arrow" style="color:${color};font-size:14px;flex-shrink:0">▸</span>
            </div>
            <div id="${id}" style="display:none;padding:0 18px 18px 18px">
                <div style="font-size:12px;color:#7dd3fc;font-style:italic;margin:4px 0 14px 0;padding-left:10px;border-left:2px solid #1e3a5f">
                    🇬🇧 ${escapeHtml(std.title_en || '')}
                </div>

                ${std.objective ? `
                    <div style="margin-bottom:14px">
                        <div style="font-size:12px;font-weight:700;color:${color};margin-bottom:5px">🎯 Objectif</div>
                        <div style="font-size:13px;color:#cbd5e1;line-height:1.6">${_auditCrossRef(std.objective)}</div>
                    </div>` : ''}

                ${std.scope ? `
                    <div style="margin-bottom:14px">
                        <div style="font-size:12px;font-weight:700;color:${color};margin-bottom:5px">📋 Champ d'application</div>
                        <div style="font-size:13px;color:#cbd5e1;line-height:1.6">${_auditCrossRef(std.scope)}</div>
                    </div>` : ''}

                ${(std.requirements || []).length ? `
                    <div style="margin-bottom:14px">
                        <div style="font-size:12px;font-weight:700;color:${color};margin-bottom:6px">🔑 Exigences clés</div>
                        <ul style="margin:0;padding-left:20px;color:#cbd5e1;font-size:13px;line-height:1.7">
                            ${std.requirements.map(r => `<li>${_auditCrossRef(r)}</li>`).join('')}
                        </ul>
                    </div>` : ''}

                ${std.swiss ? `
                    <div style="margin-bottom:14px;padding:10px 12px;background:#3f1612;border-left:3px solid #dc2626;border-radius:5px">
                        <div style="font-size:12px;font-weight:700;color:#fca5a5;margin-bottom:5px">🇨🇭 Spécificité suisse</div>
                        <div style="font-size:12px;color:#fecaca;line-height:1.6">${_auditCrossRef(std.swiss)}</div>
                    </div>` : ''}

                ${(std.related || []).length ? `
                    <div style="margin-bottom:14px">
                        <div style="font-size:12px;font-weight:700;color:${color};margin-bottom:6px">🔗 Normes liées</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap">
                            ${std.related.map(r => `<span style="font-size:11px;background:#1e293b;color:#94a3b8;padding:3px 9px;border-radius:5px;border:1px solid #334155">${escapeHtml(r)}</span>`).join('')}
                        </div>
                    </div>` : ''}

                ${std.exam_tip ? `
                    <div style="padding:10px 12px;background:#1e1b0a;border-left:3px solid #fbbf24;border-radius:5px">
                        <div style="font-size:12px;font-weight:700;color:#fbbf24;margin-bottom:5px">💡 Astuce examen</div>
                        <div style="font-size:12px;color:#fde68a;line-height:1.6">${_auditCrossRef(std.exam_tip)}</div>
                    </div>` : ''}
            </div>
        </div>`;
}

function _setAnnuaireSerie(serieId) {
    _annuaireFilterSerie = serieId;
    const host = document.getElementById('auditContent');
    if (host) _renderAuditAnnuaire(host);
    setTimeout(() => {
        const search = document.getElementById('annuaireSearch');
        if (search) search.focus();
    }, 0);
}

function _filterAnnuaire(value) {
    _annuaireSearch = (value || '').toLowerCase().trim();
    _applyAnnuaireFilter();
}

function _applyAnnuaireFilter() {
    const items = document.querySelectorAll('.annuaire-item');
    const series = document.querySelectorAll('.annuaire-serie');
    const serieCounts = {};

    items.forEach(it => {
        const serieId = it.dataset.serieId;
        const hay = it.dataset.annSearch || '';
        const matchSerie = (_annuaireFilterSerie === 'all') || (serieId === _annuaireFilterSerie);
        const matchSearch = !_annuaireSearch || hay.includes(_annuaireSearch);
        const visible = matchSerie && matchSearch;
        it.style.display = visible ? '' : 'none';
        if (visible) serieCounts[serieId] = (serieCounts[serieId] || 0) + 1;
    });

    series.forEach(sr => {
        const serieId = sr.dataset.serieId;
        sr.style.display = (serieCounts[serieId] || 0) > 0 ? '' : 'none';
    });
}

function _toggleAnnuaire(id) {
    const el = document.getElementById(id);
    const arrow = document.getElementById(id + '-arrow');
    if (!el) return;
    if (el.style.display === 'none') {
        el.style.display = 'block';
        if (arrow) arrow.textContent = '▾';
    } else {
        el.style.display = 'none';
        if (arrow) arrow.textContent = '▸';
    }
}

// ─────────────────────────────────────────────────────────────────
// LEXIQUE — Acronymes, vocabulaire FR/EN, latin, jargon EY, phrases types
// ─────────────────────────────────────────────────────────────────
let _lexiqueFilterCat = 'all';
let _lexiqueSearch = '';

function _renderAuditLexique(host) {
    const lex = _auditData.lexique || {};
    const cats = lex.categories || [];
    const totalItems = cats.reduce((s, c) => s + (c.items?.length || 0), 0);

    host.innerHTML = `
        <div class="ref-section-title">${lex._icon || '📖'} ${escapeHtml(lex._label || 'Lexique Audit')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:14px">
            ${escapeHtml(lex._description || '')}
        </p>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
            <span style="background:#3c1d6e;padding:4px 10px;border-radius:12px;font-size:12px;color:#c4b5fd">
                📚 ${totalItems} entrées
            </span>
            <span style="background:#3c1d6e;padding:4px 10px;border-radius:12px;font-size:12px;color:#c4b5fd">
                🗂️ ${cats.length} catégories
            </span>
            <input type="text" id="lexiqueSearch" placeholder="🔍 Rechercher acronyme, FR, EN, contexte…"
                   value="${escapeHtml(_lexiqueSearch)}"
                   oninput="_filterLexique(this.value)"
                   style="flex:1;min-width:240px;background:#0f172a;border:1px solid #334155;color:#e2e8f0;
                          padding:8px 12px;border-radius:7px;font-size:13px" />
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px">
            <button onclick="_setLexiqueCat('all')"
                    style="padding:7px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;
                           background:${_lexiqueFilterCat === 'all' ? AUDIT_ACCENT : '#1e293b'};
                           color:${_lexiqueFilterCat === 'all' ? '#fff' : '#94a3b8'};
                           border:1px solid ${_lexiqueFilterCat === 'all' ? AUDIT_ACCENT : '#334155'}">
                🔍 Toutes (${totalItems})
            </button>
            ${cats.map(c => `
                <button onclick="_setLexiqueCat('${c.id}')"
                        style="padding:7px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;
                               background:${_lexiqueFilterCat === c.id ? (c.color || AUDIT_ACCENT) : '#1e293b'};
                               color:${_lexiqueFilterCat === c.id ? '#fff' : '#94a3b8'};
                               border:1px solid ${_lexiqueFilterCat === c.id ? (c.color || AUDIT_ACCENT) : '#334155'}">
                    ${escapeHtml(c.label)} (${c.items.length})
                </button>
            `).join('')}
        </div>
        <div id="lexiqueGroupList">
            ${cats.map(c => _renderLexiqueGroup(c)).join('')}
        </div>
    `;
    _applyLexiqueFilter();
}

function _renderLexiqueGroup(c) {
    const color = c.color || AUDIT_ACCENT;
    const groupId = `lex-${c.id}`;
    return `
        <div class="card lexique-group" data-cat-id="${c.id}" style="margin-bottom:14px;border-left:3px solid ${color}">
            <div onclick="_toggleLexiqueGroup('${groupId}')"
                 style="padding:12px 16px;font-size:14px;font-weight:700;color:${color};
                        border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;
                        cursor:pointer;transition:background 0.15s"
                 onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background=''">
                <span>${escapeHtml(c.label)}</span>
                <span style="font-size:11px;color:#64748b;font-weight:500">
                    ${c.items?.length || 0} entrée(s)
                    <span id="${groupId}-arrow" style="margin-left:6px;color:${color}">▾</span>
                </span>
            </div>
            <div id="${groupId}" style="display:block">
                ${(c.items || []).map((it, idx) => _renderLexiqueItem(c.id, idx, it, color)).join('')}
            </div>
        </div>`;
}

function _renderLexiqueItem(catId, idx, item, color) {
    const searchHay = [item.acronym, item.fr, item.en, item.context]
        .filter(Boolean).join(' ').toLowerCase();
    return `
        <div class="lexique-item" data-lex-search="${escapeHtml(searchHay)}" data-cat-id="${catId}"
             style="padding:12px 16px;border-bottom:1px solid #0f172a">
            <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
                <div style="flex:0 0 200px;min-width:160px">
                    <div style="font-size:14px;font-weight:800;color:${color};line-height:1.3">
                        ${escapeHtml(item.acronym || '—')}
                    </div>
                    ${item.context ? `<div style="font-size:11px;color:#64748b;margin-top:4px;font-style:italic">${escapeHtml(item.context)}</div>` : ''}
                </div>
                <div style="flex:1;min-width:240px;display:flex;flex-direction:column;gap:6px">
                    <div style="display:flex;gap:8px;align-items:flex-start">
                        <span style="background:#1e1b4b;color:#a78bfa;font-size:10px;font-weight:700;
                                     padding:2px 7px;border-radius:4px;letter-spacing:0.5px;flex-shrink:0;margin-top:2px">FR</span>
                        <span style="font-size:13px;color:#e2e8f0;line-height:1.5">${escapeHtml(item.fr || '—')}</span>
                    </div>
                    <div style="display:flex;gap:8px;align-items:flex-start">
                        <span style="background:#1e3a5f;color:#7dd3fc;font-size:10px;font-weight:700;
                                     padding:2px 7px;border-radius:4px;letter-spacing:0.5px;flex-shrink:0;margin-top:2px">EN</span>
                        <span style="font-size:13px;color:#cbd5e1;line-height:1.5">${escapeHtml(item.en || '—')}</span>
                    </div>
                </div>
            </div>
        </div>`;
}

function _setLexiqueCat(catId) {
    _lexiqueFilterCat = catId;
    const host = document.getElementById('auditContent');
    if (host) _renderAuditLexique(host);
    // Restore search input focus
    setTimeout(() => {
        const search = document.getElementById('lexiqueSearch');
        if (search) search.focus();
    }, 0);
}

function _filterLexique(value) {
    _lexiqueSearch = (value || '').toLowerCase().trim();
    _applyLexiqueFilter();
}

function _applyLexiqueFilter() {
    const items = document.querySelectorAll('.lexique-item');
    const groups = document.querySelectorAll('.lexique-group');
    const groupCounts = {};

    items.forEach(it => {
        const catId = it.dataset.catId;
        const hay = it.dataset.lexSearch || '';
        const matchCat = (_lexiqueFilterCat === 'all') || (catId === _lexiqueFilterCat);
        const matchSearch = !_lexiqueSearch || hay.includes(_lexiqueSearch);
        const visible = matchCat && matchSearch;
        it.style.display = visible ? '' : 'none';
        if (visible) groupCounts[catId] = (groupCounts[catId] || 0) + 1;
    });

    groups.forEach(g => {
        const catId = g.dataset.catId;
        const count = groupCounts[catId] || 0;
        g.style.display = count > 0 ? '' : 'none';
    });
}

function _toggleLexiqueGroup(groupId) {
    const el = document.getElementById(groupId);
    const arrow = document.getElementById(groupId + '-arrow');
    if (!el) return;
    if (el.style.display === 'none') {
        el.style.display = 'block';
        if (arrow) arrow.textContent = '▾';
    } else {
        el.style.display = 'none';
        if (arrow) arrow.textContent = '▸';
    }
}

// Safe helper — use crossref addCrossRefs if available, fallback to escapeHtml.
function _auditCrossRef(text) {
    if (typeof window.addCrossRefs === 'function') return window.addCrossRefs(text || '');
    return escapeHtml(text || '');
}

// ── Sub-renderers (Vague 1 : placeholders informatifs) ──

function _scaffoldCard(icon, title, description, items) {
    const list = (items && items.length)
        ? `<ul style="margin:10px 0 0 0;padding-left:20px;color:#cbd5e1;font-size:13px;line-height:1.7">
              ${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
           </ul>`
        : '';
    return `
        <div class="card" style="border-left:3px solid ${AUDIT_ACCENT};margin-bottom:14px">
            <div style="padding:14px 18px">
                <div style="font-size:15px;font-weight:700;color:${AUDIT_LIGHT};margin-bottom:4px">
                    ${icon} ${escapeHtml(title)}
                </div>
                <div style="font-size:13px;color:#94a3b8;line-height:1.6">${escapeHtml(description)}</div>
                ${list}
            </div>
        </div>`;
}

function _comingSoonBanner(vague) {
    return `
        <div style="margin-top:14px;padding:12px 16px;border-radius:8px;
                    background:#1e1b4b;border:1px dashed ${AUDIT_ACCENT};
                    color:#c4b5fd;font-size:12px">
            ⏳ Contenu détaillé arrivant en <strong>Vague ${vague}</strong>.
            Cette section affiche pour l'instant le squelette validé.
        </div>`;
}

function _renderAuditNas(host) {
    const nas = _auditData.nas || {};
    const cats = nas.categories || [];
    const totalNas = cats.reduce((s, c) => s + (c.norms?.length || 0), 0);

    host.innerHTML = `
        <div class="ref-section-title">${nas._icon || '📐'} ${escapeHtml(nas._label || 'NAS / ISA')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:14px">
            ${escapeHtml(nas._description || '')}
        </p>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:18px;font-size:12px;color:#a78bfa">
            <span style="background:#3c1d6e;padding:4px 10px;border-radius:12px">📚 ${totalNas} normes</span>
            <span style="background:#3c1d6e;padding:4px 10px;border-radius:12px">🗂️ ${cats.length} groupes</span>
            <input type="text" id="nasSearch" placeholder="Rechercher dans les NAS…"
                   oninput="_filterAuditNas(this.value)"
                   style="flex:1;background:#0f172a;border:1px solid #334155;color:#e2e8f0;
                          padding:6px 10px;border-radius:6px;font-size:12px;margin-left:8px" />
        </div>
        <div id="nasGroupList">
            ${cats.map(c => _renderNasGroup(c)).join('')}
        </div>
    `;
}

function _renderNasGroup(c) {
    const accent = c.color || AUDIT_ACCENT;
    return `
        <div class="card" style="margin-bottom:14px;border-left:3px solid ${accent}">
            <div style="padding:12px 16px;font-size:14px;font-weight:700;color:${accent};
                        border-bottom:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center">
                <span>📘 ${escapeHtml(c.label)}</span>
                <span style="font-size:11px;color:#64748b;font-weight:500">${c.norms?.length || 0} norme(s)</span>
            </div>
            <div style="padding:6px 0">
                ${(c.norms || []).map((n, idx) => _renderNasItem(c.id, idx, n, accent)).join('')}
            </div>
        </div>`;
}

function _renderNasItem(catId, idx, n, accent) {
    const id = `nas-${catId}-${idx}`;
    const searchHay = [n.code, n.title, n.summary, (n.key_points || []).join(' '), n.swiss_specifics || '']
        .filter(Boolean).join(' ').toLowerCase();
    return `
        <div class="nas-item" data-nas-search="${searchHay}"
             style="border-bottom:1px solid #0f172a">
            <div onclick="_toggleNas('${id}')"
                 style="padding:10px 16px;cursor:pointer;display:flex;justify-content:space-between;
                        align-items:center;transition:background 0.15s;gap:12px"
                 onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background=''">
                <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:700;color:${AUDIT_LIGHT}">
                        ${escapeHtml(n.code)} <span style="color:#a78bfa;font-weight:500">— ${escapeHtml(n.title)}</span>
                    </div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:3px;font-size:11px">
                        ${n.co_ref && n.co_ref !== '—' ? `<span style="color:#64748b">⚖️ ${_auditCrossRef(n.co_ref)}</span>` : ''}
                        ${n.revised_on ? `<span style="color:#94a3b8;background:#1e1b4b;padding:1px 8px;border-radius:10px">🕰️ Rév. ${escapeHtml(n.revised_on)}</span>` : ''}
                        ${n.swiss_specifics ? `<span style="color:#dc2626;background:#3f1612;padding:1px 8px;border-radius:10px;font-weight:600">🇨🇭 Swiss</span>` : ''}
                    </div>
                </div>
                <span id="${id}-arrow" style="color:${accent};font-size:14px">▸</span>
            </div>
            <div id="${id}" style="display:none;padding:0 18px 16px 18px;background:#0a0f1c">
                ${n.summary ? `<div style="margin:10px 0 14px 0;color:#cbd5e1;font-size:13px;line-height:1.6;
                                font-style:italic;border-left:2px solid ${accent};padding-left:12px">
                                ${_auditCrossRef(n.summary)}
                            </div>` : ''}
                ${(n.key_points || []).length ? `
                    <div style="font-size:12px;font-weight:700;color:${accent};margin-bottom:6px">🔑 Points clés</div>
                    <ul style="margin:0 0 14px 0;padding-left:20px;color:#cbd5e1;font-size:13px;line-height:1.7">
                        ${n.key_points.map(p => `<li>${_auditCrossRef(p)}</li>`).join('')}
                    </ul>` : ''}
                ${n.swiss_specifics ? `
                    <div style="margin:10px 0 6px 0;padding:10px 12px;background:#3f1612;border-left:3px solid #dc2626;border-radius:5px">
                        <div style="font-size:12px;font-weight:700;color:#fca5a5;margin-bottom:6px">🇨🇭 Spécificités suisses</div>
                        <div style="color:#fecaca;font-size:12px;line-height:1.6">${_auditCrossRef(n.swiss_specifics)}</div>
                    </div>` : ''}
                ${(n.exam_traps || []).length ? `
                    <div style="font-size:12px;font-weight:700;color:#fbbf24;margin-bottom:6px;margin-top:10px">⚠️ Pièges examen</div>
                    <ul style="margin:0;padding-left:20px;color:#fde68a;font-size:13px;line-height:1.7">
                        ${n.exam_traps.map(p => `<li>${_auditCrossRef(p)}</li>`).join('')}
                    </ul>` : ''}
                ${n.detail ? `
                    <div style="margin-top:16px;padding-top:12px;border-top:1px dashed ${accent}">
                        <button onclick="_toggleNasDetail('${id}-detail')"
                                style="background:linear-gradient(135deg, ${accent}, #4c1d95);border:none;color:white;
                                       padding:9px 18px;border-radius:7px;cursor:pointer;font-size:13px;font-weight:700;
                                       box-shadow:0 2px 8px rgba(128,90,213,0.4)">
                            📚 Voir la fiche complète (incollable)
                        </button>
                        <div id="${id}-detail" style="display:none;margin-top:14px">
                            ${_renderNasFullDetail(n.detail, accent)}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>`;
}

function _renderNasFullDetail(d, accent) {
    if (!d) return '';
    const sect = (icon, title, content, color) => {
        if (!content || (Array.isArray(content) && content.length === 0)) return '';
        return `
            <details style="margin-bottom:10px;border-left:3px solid ${color || accent};background:#0a0f1c;border-radius:6px" open>
                <summary style="padding:10px 14px;cursor:pointer;font-size:13px;font-weight:700;color:${color || accent};
                                list-style:none;display:flex;justify-content:space-between;align-items:center">
                    <span>${icon} ${escapeHtml(title)}</span>
                    <span style="font-size:11px;color:#64748b">cliquer pour plier/déplier</span>
                </summary>
                <div style="padding:4px 16px 14px 16px">
                    ${content}
                </div>
            </details>`;
    };
    const listHtml = (arr) => `<ul style="margin:6px 0;padding-left:20px;color:#cbd5e1;font-size:13px;line-height:1.7">
        ${arr.map(x => `<li>${_auditCrossRef(x)}</li>`).join('')}
    </ul>`;

    return `
        <div style="padding:12px;background:#0f172a;border-radius:8px;border:1px solid #1e293b">
            <div style="font-size:11px;color:#a78bfa;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.5px">
                📚 Fiche complète · Pour être incollable à l'examen et sur le terrain
            </div>

            ${d.objective ? sect('🎯', 'Objectif de la norme',
                `<div style="color:#cbd5e1;font-size:13px;line-height:1.7;font-style:italic">${_auditCrossRef(d.objective)}</div>`,
                '#10b981') : ''}

            ${d.scope ? sect('📐', 'Champ d\'application',
                `<div style="color:#cbd5e1;font-size:13px;line-height:1.6">${_auditCrossRef(d.scope)}</div>`,
                '#3b82f6') : ''}

            ${(d.definitions || []).length ? sect('📖', 'Définitions clés',
                `<dl style="margin:0">
                    ${d.definitions.map(de => `
                        <dt style="font-weight:700;color:${accent};font-size:13px;margin-top:8px">${escapeHtml(de.term)}</dt>
                        <dd style="margin:2px 0 0 0;color:#cbd5e1;font-size:12px;line-height:1.6;padding-left:12px;border-left:2px solid ${accent}">
                            ${_auditCrossRef(de.def)}
                        </dd>
                    `).join('')}
                </dl>`,
                accent) : ''}

            ${(d.obligations || []).length ? sect('⚙️', 'Obligations de l\'auditeur (paragraphes)',
                `<div style="display:grid;gap:8px">
                    ${d.obligations.map(o => `
                        <div style="padding:8px 12px;background:#1e1b4b;border-radius:5px;font-size:12px;color:#cbd5e1">
                            <strong style="color:#a78bfa">${escapeHtml(o.para || '')}</strong> —
                            ${_auditCrossRef(o.rule || '')}
                        </div>
                    `).join('')}
                </div>`,
                '#ef4444') : ''}

            ${(d.procedures || []).length ? sect('🔧', 'Procédures requises', listHtml(d.procedures), '#f59e0b') : ''}

            ${(d.documentation || []).length ? sect('📄', 'Documentation à produire', listHtml(d.documentation), '#8b5cf6') : ''}

            ${(d.communications || []).length ? sect('📢', 'Communications requises', listHtml(d.communications), '#06b6d4') : ''}

            ${(d.examples || []).length ? sect('💡', 'Exemples pratiques',
                `<div style="display:grid;gap:8px">
                    ${d.examples.map(ex => `
                        <div style="padding:10px 12px;background:#422006;border-left:3px solid #fbbf24;border-radius:5px">
                            <div style="font-size:12px;font-weight:700;color:#fbbf24;margin-bottom:4px">${escapeHtml(ex.title)}</div>
                            <div style="font-size:12px;color:#fde68a;line-height:1.6">${_auditCrossRef(ex.body)}</div>
                        </div>
                    `).join('')}
                </div>`,
                '#fbbf24') : ''}

            ${(d.cross_refs || []).length ? sect('🔗', 'Liens avec d\'autres NAS',
                `<div style="display:grid;gap:6px">
                    ${d.cross_refs.map(c => `
                        <div style="padding:6px 10px;background:#0a0f1c;border-radius:4px;font-size:12px;color:#cbd5e1">
                            <strong style="color:${accent}">${escapeHtml(c.nas)}</strong> — ${_auditCrossRef(c.relation)}
                        </div>
                    `).join('')}
                </div>`,
                '#14b8a6') : ''}

            ${(d.faq || []).length ? sect('❓', 'FAQ — Questions d\'examen',
                `<div style="display:grid;gap:10px">
                    ${d.faq.map(f => `
                        <div style="padding:10px 12px;background:#1e1b4b;border-radius:5px">
                            <div style="font-size:12px;font-weight:700;color:#93c5fd;margin-bottom:4px">
                                Q : ${escapeHtml(f.q)}
                            </div>
                            <div style="font-size:12px;color:#cbd5e1;line-height:1.6">
                                R : ${_auditCrossRef(f.a)}
                            </div>
                        </div>
                    `).join('')}
                </div>`,
                '#3b82f6') : ''}

            ${(d.ey_checklist || []).length ? sect('✅', 'Checklist terrain EY',
                `<ul style="margin:0;padding-left:0;list-style:none">
                    ${d.ey_checklist.map(item => `
                        <li style="padding:5px 0;font-size:12px;color:#cbd5e1;display:flex;gap:8px;align-items:flex-start">
                            <span style="flex-shrink:0;color:#10b981">☐</span>
                            <span>${_auditCrossRef(item)}</span>
                        </li>
                    `).join('')}
                </ul>`,
                '#10b981') : ''}

            ${(d.wordings || []).length ? sect('📝', 'Wordings types',
                `<div style="display:grid;gap:8px">
                    ${d.wordings.map(w => `
                        <div>
                            <div style="font-size:11px;color:${accent};font-weight:600;margin-bottom:4px">
                                ${escapeHtml(w.context || '')}
                            </div>
                            <div style="padding:10px 12px;background:#0a0f1c;border-radius:5px;font-family:Georgia,serif;
                                        font-style:italic;color:#cbd5e1;font-size:12px;line-height:1.7">
                                « ${escapeHtml(w.text || '')} »
                            </div>
                        </div>
                    `).join('')}
                </div>`,
                '#8b5cf6') : ''}

            ${d.mnemonic ? sect('🧠', 'Mnémotechnique',
                `<div style="padding:10px 14px;background:#3f1612;border-left:3px solid #ef4444;border-radius:5px;
                            color:#fca5a5;font-size:13px;font-weight:600;font-family:'Courier New',monospace">
                    ${escapeHtml(d.mnemonic)}
                </div>`,
                '#ef4444') : ''}
        </div>`;
}

function _toggleNasDetail(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function _toggleNas(id) {
    const panel = document.getElementById(id);
    const arrow = document.getElementById(id + '-arrow');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (arrow) arrow.textContent = isOpen ? '▸' : '▾';
}

function _filterAuditNas(query) {
    const q = query.trim().toLowerCase();
    document.querySelectorAll('.nas-item').forEach(el => {
        const txt = el.dataset.nasSearch || '';
        el.style.display = (q === '' || txt.includes(q)) ? '' : 'none';
    });
}

function _renderAuditCadre(host) {
    const cadre = _auditData.cadre_legal || {};
    const sections = cadre.sections || [];
    host.innerHTML = `
        <div class="ref-section-title">${cadre._icon || '⚖️'} ${escapeHtml(cadre._label || 'Cadre légal')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:18px">
            ${escapeHtml(cadre._description || '')}
        </p>
        ${sections.map((s, si) => _renderCadreSection(s, si)).join('')}
    `;
}

function _renderCadreSection(s, si) {
    return `
        <div class="card" style="margin-bottom:16px;border-left:3px solid ${AUDIT_ACCENT}">
            <div style="padding:14px 18px;border-bottom:1px solid #1e293b">
                <div style="font-size:15px;font-weight:700;color:${AUDIT_LIGHT}">📜 ${escapeHtml(s.title)}</div>
                ${s.intro ? `<div style="font-size:12px;color:#94a3b8;margin-top:6px;line-height:1.6">${escapeHtml(s.intro)}</div>` : ''}
            </div>
            <div style="padding:6px 0">
                ${(s.subsections || []).map((ss, ssi) => _renderCadreSubsection(s.id, ssi, ss)).join('')}
            </div>
        </div>`;
}

function _renderCadreSubsection(secId, idx, ss) {
    const id = `cad-${secId}-${idx}`;
    return `
        <div style="border-bottom:1px solid #0f172a">
            <div onclick="_toggleNas('${id}')"
                 style="padding:9px 16px;cursor:pointer;display:flex;justify-content:space-between;
                        align-items:center;transition:background 0.15s"
                 onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background=''">
                <div style="font-size:13px;font-weight:600;color:#cbd5e1">${escapeHtml(ss.title)}</div>
                <span id="${id}-arrow" style="color:${AUDIT_ACCENT};font-size:13px">▸</span>
            </div>
            <div id="${id}" style="display:none;padding:0 18px 14px 18px;background:#0a0f1c">
                ${ss.content ? `<div style="margin:10px 0 12px 0;color:#cbd5e1;font-size:13px;line-height:1.7">
                                ${_auditCrossRef(ss.content)}
                            </div>` : ''}
                ${(ss.key_points || []).length ? `
                    <div style="font-size:12px;font-weight:700;color:${AUDIT_ACCENT};margin-bottom:6px">🔑 Points clés</div>
                    <ul style="margin:0;padding-left:20px;color:#cbd5e1;font-size:13px;line-height:1.7">
                        ${ss.key_points.map(p => `<li>${_auditCrossRef(p)}</li>`).join('')}
                    </ul>` : ''}
            </div>
        </div>`;
}

// ── Comparatifs (#7) ──

function _renderAuditComparatifs(host) {
    const comp = _auditData.comparatifs || {};
    const themes = comp.themes || [];

    host.innerHTML = `
        <div class="ref-section-title">${comp._icon || '📊'} ${escapeHtml(comp._label || 'Comparatifs')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:14px">
            ${escapeHtml(comp._description || '')}
        </p>
        <input type="text" id="compSearch" placeholder="Rechercher un thème ou mot-clé…"
               oninput="_filterComparatifs(this.value)"
               style="width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;
                      padding:8px 12px;border-radius:6px;font-size:13px;margin-bottom:16px;box-sizing:border-box" />
        ${themes.map(t => _renderComparatifTheme(t)).join('')}
    `;
}

function _renderComparatifTheme(t) {
    const searchHay = [t.title, t.nas_ref, ...(t.rows || []).flatMap(r => Object.values(r))]
        .filter(Boolean).join(' ').toLowerCase();
    return `
        <div class="comp-theme" data-comp-search="${searchHay}"
             style="margin-bottom:18px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT}">
                    📊 ${escapeHtml(t.title)}
                </div>
                ${t.nas_ref ? `<span style="font-size:11px;color:#a78bfa;background:#1e1b4b;padding:2px 10px;border-radius:10px">
                    ${_auditCrossRef(t.nas_ref)}
                </span>` : ''}
            </div>
            <div class="card" style="border-left:3px solid ${AUDIT_ACCENT};overflow:hidden">
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                    <thead>
                        <tr style="background:#1e1b4b;color:${AUDIT_LIGHT}">
                            <th style="text-align:left;padding:8px 12px;font-weight:600;width:22%">Aspect</th>
                            <th style="text-align:left;padding:8px 12px;font-weight:600;color:#22c55e">IFRS / IAS</th>
                            <th style="text-align:left;padding:8px 12px;font-weight:600;color:#3b82f6">Swiss GAAP RPC</th>
                            <th style="text-align:left;padding:8px 12px;font-weight:600;color:#f59e0b">CO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(t.rows || []).map(r => `
                            <tr style="border-top:1px solid #1e293b">
                                <td style="padding:8px 12px;color:${AUDIT_LIGHT};font-weight:500">${escapeHtml(r.aspect)}</td>
                                <td style="padding:8px 12px;color:#cbd5e1;line-height:1.5">${_auditCrossRef(r.ifrs)}</td>
                                <td style="padding:8px 12px;color:#cbd5e1;line-height:1.5">${_auditCrossRef(r.rpc)}</td>
                                <td style="padding:8px 12px;color:#cbd5e1;line-height:1.5">${_auditCrossRef(r.co)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
}

function _filterComparatifs(query) {
    const q = query.trim().toLowerCase();
    document.querySelectorAll('.comp-theme').forEach(el => {
        const txt = el.dataset.compSearch || '';
        el.style.display = (q === '' || txt.includes(q)) ? '' : 'none';
    });
}

let _selectedCycleId = null;

function _renderAuditCycles(host) {
    const cyc = _auditData.cycles || {};
    const items = cyc.items || [];
    if (!_selectedCycleId && items.length) _selectedCycleId = items[0].id;
    const selected = items.find(i => i.id === _selectedCycleId) || items[0];

    host.innerHTML = `
        <div class="ref-section-title">${cyc._icon || '🔄'} ${escapeHtml(cyc._label || 'Cycles d\'audit')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:18px">
            ${escapeHtml(cyc._description || '')}
        </p>

        <!-- Cycle selector chips -->
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
            ${items.map(i => {
                const isActive = i.id === _selectedCycleId;
                return `
                    <button onclick="_selectCycle('${i.id}')"
                            style="padding:8px 14px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;
                                   border:1px solid ${isActive ? AUDIT_ACCENT : '#334155'};
                                   background:${isActive ? '#3c1d6e' : '#0f172a'};
                                   color:${isActive ? '#e9d8fd' : '#cbd5e1'}">
                        ${i.icon || '🔄'} ${escapeHtml(i.title)}
                    </button>`;
            }).join('')}
        </div>

        <div id="cycleDetail">${_renderCycleDetail(selected)}</div>
    `;
}

function _selectCycle(id) {
    _selectedCycleId = id;
    const cyc = _auditData.cycles || {};
    const items = cyc.items || [];
    const selected = items.find(i => i.id === id);
    // Re-render full cycles tab to update active chip
    const host = document.getElementById('auditContent');
    if (host) _renderAuditCycles(host);
}

function _renderCycleDetail(c) {
    if (!c) return '<p style="color:#94a3b8">Sélectionnez un cycle.</p>';
    const block = (icon, title, items, color) => {
        if (!items || !items.length) return '';
        return `
            <div style="margin-bottom:16px">
                <div style="font-size:13px;font-weight:700;color:${color};margin-bottom:8px">
                    ${icon} ${escapeHtml(title)} <span style="color:#64748b;font-weight:500;font-size:11px">(${items.length})</span>
                </div>
                <ul style="margin:0;padding-left:22px;color:#cbd5e1;font-size:13px;line-height:1.7">
                    ${items.map(i => `<li>${_auditCrossRef(i)}</li>`).join('')}
                </ul>
            </div>`;
    };
    return `
        <div class="card" style="border-left:3px solid ${AUDIT_ACCENT};padding:18px 22px">
            <div style="font-size:18px;font-weight:800;color:${AUDIT_LIGHT};margin-bottom:14px">
                ${c.icon || '🔄'} ${escapeHtml(c.title)}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                <div>
                    ${block('⚠️', 'Risques typiques (NAS 315)', c.risks, '#ef4444')}
                    ${block('🎯', 'Assertions concernées', c.assertions, '#3b82f6')}
                </div>
                <div>
                    ${block('🛡️', 'Contrôles clés du SCI', c.controls, '#10b981')}
                    ${block('🔬', 'Tests substantifs (TOD)', c.tests_substantive, '#8b5cf6')}
                </div>
            </div>
            <div style="margin-top:8px;padding-top:14px;border-top:1px solid #1e293b">
                ${block('💡', 'Tips terrain EY', c.ey_tips, '#fbbf24')}
            </div>
        </div>`;
}

function _renderAuditTerrain(host) {
    const ter = _auditData.terrain || {};
    const phases = ter.phases || [];
    const soft = ter.soft_skills || {};

    // Restore checked state from localStorage
    const stateKey = 'audit_terrain_checked';
    const checked = JSON.parse(localStorage.getItem(stateKey) || '{}');
    let totalItems = 0, doneItems = 0;
    phases.forEach(p => (p.checklist || []).forEach((_, i) => {
        totalItems++;
        if (checked[`${p.id}_${i}`]) doneItems++;
    }));
    const pct = totalItems > 0 ? Math.round(100 * doneItems / totalItems) : 0;

    host.innerHTML = `
        <div class="ref-section-title">${ter._icon || '🛠️'} ${escapeHtml(ter._label || 'Terrain EY')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:14px">
            ${escapeHtml(ter._description || '')}
        </p>

        <!-- Progress -->
        <div style="margin-bottom:18px;padding:12px 16px;background:#0f172a;border:1px solid #334155;border-radius:8px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
                <span style="color:#94a3b8">Progression checklist mission</span>
                <span style="color:${AUDIT_LIGHT};font-weight:600">${doneItems} / ${totalItems} (${pct}%)</span>
            </div>
            <div style="height:6px;background:#1e293b;border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg, ${AUDIT_ACCENT}, #c4b5fd);transition:width 0.3s"></div>
            </div>
        </div>

        <!-- Phases -->
        ${phases.map(p => _renderTerrainPhase(p, checked)).join('')}

        <!-- Soft skills -->
        <div style="margin-top:24px;font-size:14px;font-weight:700;color:${AUDIT_LIGHT}">
            🎓 Soft skills & pièges classiques
        </div>
        ${_renderSoftSkills(soft)}
    `;
}

function _renderTerrainPhase(p, checked) {
    const items = p.checklist || [];
    const phaseDone = items.filter((_, i) => checked[`${p.id}_${i}`]).length;
    const phasePct = items.length > 0 ? Math.round(100 * phaseDone / items.length) : 0;

    return `
        <div class="card" style="margin-bottom:14px;border-left:3px solid ${AUDIT_ACCENT}">
            <div style="padding:14px 18px;border-bottom:1px solid #1e293b">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
                    <div style="flex:1">
                        <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT}">
                            ${p.icon || '✅'} ${escapeHtml(p.title)}
                        </div>
                        ${p.objective ? `<div style="font-size:12px;color:#94a3b8;margin-top:4px;line-height:1.5">
                                            🎯 ${escapeHtml(p.objective)}
                                        </div>` : ''}
                    </div>
                    <div style="font-size:11px;color:${AUDIT_ACCENT};font-weight:600;white-space:nowrap">
                        ${phaseDone}/${items.length} (${phasePct}%)
                    </div>
                </div>
            </div>

            ${items.length ? `
                <div style="padding:6px 0">
                    ${items.map((it, i) => {
                        const key = `${p.id}_${i}`;
                        const isDone = !!checked[key];
                        return `
                            <div onclick="_toggleTerrain('${key}')"
                                 style="display:flex;align-items:flex-start;gap:12px;padding:9px 18px;cursor:pointer;
                                        border-bottom:1px solid #0f172a;transition:background 0.15s"
                                 onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background=''">
                                <div style="flex-shrink:0;width:18px;height:18px;border-radius:4px;margin-top:2px;
                                            border:2px solid ${isDone ? '#10b981' : '#475569'};
                                            background:${isDone ? '#065f46' : 'transparent'};
                                            display:flex;align-items:center;justify-content:center">
                                    ${isDone ? '<span style="color:#6ee7b7;font-size:11px">✓</span>' : ''}
                                </div>
                                <div style="flex:1;font-size:13px;line-height:1.5;color:${isDone ? '#64748b' : '#cbd5e1'};
                                            text-decoration:${isDone ? 'line-through' : 'none'}">
                                    ${escapeHtml(it)}
                                </div>
                            </div>`;
                    }).join('')}
                </div>` : ''}

            ${(p.deliverables || []).length || (p.tools || []).length ? `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:12px 18px;background:#0a0f1c;border-top:1px solid #1e293b">
                    ${(p.deliverables || []).length ? `
                        <div>
                            <div style="font-size:11px;font-weight:700;color:#3b82f6;margin-bottom:6px">📄 Livrables</div>
                            <ul style="margin:0;padding-left:18px;color:#94a3b8;font-size:12px;line-height:1.6">
                                ${p.deliverables.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
                            </ul>
                        </div>` : '<div></div>'}
                    ${(p.tools || []).length ? `
                        <div>
                            <div style="font-size:11px;font-weight:700;color:#fbbf24;margin-bottom:6px">🔧 Outils</div>
                            <ul style="margin:0;padding-left:18px;color:#94a3b8;font-size:12px;line-height:1.6">
                                ${p.tools.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
                            </ul>
                        </div>` : ''}
                </div>` : ''}
        </div>`;
}

function _toggleTerrain(key) {
    const stateKey = 'audit_terrain_checked';
    const checked = JSON.parse(localStorage.getItem(stateKey) || '{}');
    checked[key] = !checked[key];
    localStorage.setItem(stateKey, JSON.stringify(checked));
    _renderAuditTerrain(document.getElementById('auditContent'));
}

function _renderSoftSkills(soft) {
    const blocks = [
        { key: 'client_communication', label: 'Communication client', icon: '💬', color: '#3b82f6' },
        { key: 'time_management',      label: 'Gestion du temps',     icon: '⏱️', color: '#10b981' },
        { key: 'review_notes_handling', label: 'Review notes',         icon: '📝', color: '#f59e0b' },
        { key: 'common_mistakes',      label: 'Erreurs classiques',   icon: '🚫', color: '#ef4444' }
    ];
    return `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;margin-top:10px">
            ${blocks.map(b => {
                const items = soft[b.key] || [];
                if (!items.length) return '';
                return `
                    <div class="card" style="padding:14px;border-left:3px solid ${b.color}">
                        <div style="font-size:13px;font-weight:700;color:${b.color};margin-bottom:8px">
                            ${b.icon} ${escapeHtml(b.label)}
                        </div>
                        <ul style="margin:0;padding-left:18px;color:#cbd5e1;font-size:12px;line-height:1.6">
                            ${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
                        </ul>
                    </div>`;
            }).join('')}
        </div>`;
}

function _renderAuditOutils(host) {
    const outils = _auditData.outils || {};
    const calc = outils.calculators || {};
    const tools = outils.ey_tools || [];
    const wordings = outils.wording_library?.rapports || {};
    const glossaire = outils.glossaire_audit?.terms || [];

    host.innerHTML = `
        <div class="ref-section-title">${outils._icon || '🧮'} ${escapeHtml(outils._label || 'Outils')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:18px">
            ${escapeHtml(outils._description || '')}
        </p>

        <!-- Wording library — rapports -->
        <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin:10px 0 10px 0">
            📝 Wording library — Rapports d'audit
        </div>
        ${Object.entries(wordings).map(([k, w]) => _renderWording(k, w)).join('')}

        <!-- Outils EY -->
        <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin:24px 0 10px 0">
            🔧 Outils EY
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
            ${tools.map(t => `
                <div class="card" style="padding:14px;border-left:3px solid ${AUDIT_ACCENT}">
                    <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin-bottom:4px">
                        🔧 ${escapeHtml(t.name)}
                    </div>
                    <div style="font-size:12px;color:#94a3b8;margin-bottom:8px">${escapeHtml(t.purpose)}</div>
                    ${(t.key_features || []).length ? `
                        <ul style="margin:0;padding-left:18px;color:#cbd5e1;font-size:12px;line-height:1.6">
                            ${t.key_features.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
                        </ul>` : ''}
                </div>
            `).join('')}
        </div>

        <!-- Calculateurs interactifs -->
        <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin:24px 0 10px 0">
            🧮 Calculateurs interactifs
        </div>
        ${_renderMaterialityCalculator()}
        ${_renderOpinionCalculator()}
        ${_renderSamplingCalculator()}
        ${_renderGoingConcernChecklist()}

        <!-- Findings library -->
        <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin:24px 0 10px 0">
            📋 Findings library — ${(outils.wording_library?.findings || []).length} cas types
        </div>
        ${(outils.wording_library?.findings || []).map(f => _renderFinding(f)).join('')}

        <!-- Management letter & communications templates -->
        <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin:24px 0 10px 0">
            ✉️ Templates lettres
        </div>
        ${[...(outils.wording_library?.management_letter || []), ...(outils.wording_library?.communications || [])]
            .map(t => _renderLetterTemplate(t)).join('')}

        <!-- Excel templates (#12) -->
        <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin:24px 0 10px 0">
            📥 Bibliothèque Excel — Templates EY téléchargeables
        </div>
        <div id="auditExcelTemplates" style="color:#94a3b8;font-size:12px">Chargement des templates…</div>`;

    // Load Excel templates async
    _loadExcelTemplates();

    // Suffix epilogue to avoid breaking the template string assignment below.
    host.insertAdjacentHTML('beforeend', `

        <!-- Glossaire trilingue -->
        <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin:24px 0 10px 0">
            🌐 Glossaire trilingue (FR · EN · DE) — ${glossaire.length} termes
        </div>
        <input type="text" id="auditGlossSearch" placeholder="Rechercher un terme…"
               oninput="_filterAuditGlossary(this.value)"
               style="width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;
                      padding:8px 12px;border-radius:6px;font-size:13px;margin-bottom:10px;box-sizing:border-box" />
        <div class="card" style="border-left:3px solid ${AUDIT_ACCENT};overflow:hidden">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead>
                    <tr style="background:#1e1b4b;color:${AUDIT_LIGHT}">
                        <th style="text-align:left;padding:10px 14px;font-weight:600">🇫🇷 Français</th>
                        <th style="text-align:left;padding:10px 14px;font-weight:600">🇬🇧 English</th>
                        <th style="text-align:left;padding:10px 14px;font-weight:600">🇩🇪 Deutsch</th>
                    </tr>
                </thead>
                <tbody>
                    ${glossaire.map(g => `
                        <tr class="gloss-row" data-gloss-search="${(g.fr + ' ' + g.en + ' ' + g.de).toLowerCase()}"
                            style="border-top:1px solid #1e293b">
                            <td style="padding:8px 14px;color:#cbd5e1;font-weight:500">${escapeHtml(g.fr)}</td>
                            <td style="padding:8px 14px;color:#a78bfa">${escapeHtml(g.en)}</td>
                            <td style="padding:8px 14px;color:#94a3b8">${escapeHtml(g.de)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `);
}

function _renderWording(key, w) {
    const colorMap = {
        clean: '#10b981',
        qualifie: '#f59e0b',
        defavorable: '#ef4444',
        impossibilite: '#dc2626',
        going_concern_emphasis: '#3b82f6',
        restraint_negative: '#8b5cf6'
    };
    const c = colorMap[key] || AUDIT_ACCENT;
    return `
        <div class="card" style="margin-bottom:12px;border-left:3px solid ${c}">
            <div style="padding:12px 16px;border-bottom:1px solid #1e293b">
                <div style="font-size:13px;font-weight:700;color:${c}">${escapeHtml(w.label || key)}</div>
                ${w.context ? `<div style="font-size:12px;color:#94a3b8;margin-top:4px;line-height:1.5">
                                ${escapeHtml(w.context)}
                            </div>` : ''}
            </div>
            ${w.wording_fr ? `
                <div style="padding:12px 16px;background:#0a0f1c;font-family:Georgia,serif;
                            color:#cbd5e1;font-size:13px;line-height:1.7;font-style:italic;
                            position:relative">
                    « ${escapeHtml(w.wording_fr)} »
                    <button onclick="_copyWording(this, ${JSON.stringify(w.wording_fr).replace(/"/g, '&quot;')})"
                            style="position:absolute;top:10px;right:10px;background:#1e293b;border:1px solid #334155;
                                   color:#a78bfa;padding:4px 8px;border-radius:5px;cursor:pointer;font-size:11px;
                                   font-style:normal;font-family:system-ui,sans-serif">
                        📋 Copier
                    </button>
                </div>` : ''}
        </div>`;
}

function _copyWording(btn, text) {
    if (typeof text !== 'string') return;
    navigator.clipboard?.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓ Copié';
        btn.style.background = '#065f46';
        setTimeout(() => { btn.textContent = orig; btn.style.background = '#1e293b'; }, 1500);
    });
}

function _filterAuditGlossary(query) {
    const q = query.trim().toLowerCase();
    document.querySelectorAll('.gloss-row').forEach(el => {
        const txt = el.dataset.glossSearch || '';
        el.style.display = (q === '' || txt.includes(q)) ? '' : 'none';
    });
}

// ── Quiz state ──
let _quizState = {
    mode: 'menu',     // 'menu' | 'deck' | 'tree' | 'simulator'
    deckId: null,
    treeId: null,
    scenarioId: null,
    qIndex: 0,
    answers: [],      // [{ chosenIdx, correct }]
    treeCurrent: null,
    treePath: [],
    simStep: 0,
    simAnswers: []
};

function _renderAuditQuiz(host) {
    const q = _auditData.quiz || {};
    if (_quizState.mode === 'menu')      return _renderQuizMenu(host, q);
    if (_quizState.mode === 'deck')      return _renderQuizDeck(host, q);
    if (_quizState.mode === 'tree')      return _renderDecisionTree(host, q);
    if (_quizState.mode === 'simulator') return _renderSimulator(host, q);
}

function _quizGoMenu() {
    _quizState = { mode: 'menu', deckId: null, treeId: null, scenarioId: null, qIndex: 0, answers: [], treeCurrent: null, treePath: [], simStep: 0, simAnswers: [] };
    const host = document.getElementById('auditContent');
    if (host) _renderAuditQuiz(host);
}

function _renderQuizMenu(host, q) {
    const decks = q.decks || [];
    const trees = q.decision_trees || {};
    const sim = q.simulator || {};
    const scenarios = sim.scenarios || [];

    host.innerHTML = `
        <div class="ref-section-title">${q._icon || '🎯'} ${escapeHtml(q._label || 'Quiz')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:18px">
            ${escapeHtml(q._description || '')}
        </p>

        <!-- Decks de quiz -->
        <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin:10px 0 10px 0">
            🃏 Decks de quiz — ${decks.reduce((s,d) => s + (d.questions?.length || 0), 0)} questions au total
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
            ${decks.map(d => `
                <div onclick="_startQuizDeck('${d.id}')"
                     class="card" style="padding:16px;border-left:3px solid ${AUDIT_ACCENT};cursor:pointer;
                                          transition:transform 0.15s,background 0.15s"
                     onmouseover="this.style.transform='translateY(-2px)';this.style.background='#1e1b4b'"
                     onmouseout="this.style.transform='';this.style.background=''">
                    <div style="font-size:24px;margin-bottom:6px">${d.icon || '🃏'}</div>
                    <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin-bottom:4px">
                        ${escapeHtml(d.title)}
                    </div>
                    <div style="font-size:11px;color:#a78bfa">▶ ${d.questions?.length || 0} questions</div>
                </div>
            `).join('')}
        </div>

        <!-- Arbres de décision -->
        <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin:24px 0 10px 0">
            🌳 Arbres de décision interactifs
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
            ${Object.entries(trees).map(([id, t]) => `
                <div onclick="_startDecisionTree('${id}')"
                     class="card" style="padding:16px;border-left:3px solid #10b981;cursor:pointer;
                                          transition:transform 0.15s,background 0.15s"
                     onmouseover="this.style.transform='translateY(-2px)';this.style.background='#022c22'"
                     onmouseout="this.style.transform='';this.style.background=''">
                    <div style="font-size:24px;margin-bottom:6px">${t.icon || '🌳'}</div>
                    <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin-bottom:4px">
                        ${escapeHtml(t.title)}
                    </div>
                    <div style="font-size:11px;color:#6ee7b7">▶ Démarrer la navigation</div>
                </div>
            `).join('')}
        </div>

        <!-- Simulateur -->
        ${scenarios.length ? `
            <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin:24px 0 10px 0">
                🎬 Simulateur de mission
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
                ${scenarios.map(s => `
                    <div onclick="_startSimulator('${s.id}')"
                         class="card" style="padding:16px;border-left:3px solid #f59e0b;cursor:pointer;
                                              transition:transform 0.15s,background 0.15s"
                         onmouseover="this.style.transform='translateY(-2px)';this.style.background='#3f1612'"
                         onmouseout="this.style.transform='';this.style.background=''">
                        <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};margin-bottom:4px">
                            ${escapeHtml(s.title)}
                        </div>
                        <div style="font-size:12px;color:#cbd5e1;margin-top:6px;line-height:1.5">
                            ${escapeHtml((s.intro || '').substring(0, 140))}…
                        </div>
                        <div style="font-size:11px;color:#fbbf24;margin-top:8px">▶ ${s.steps?.length || 0} étapes</div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
}

// ── Deck mode ──

function _startQuizDeck(deckId) {
    _quizState = { ...(_quizState), mode: 'deck', deckId, qIndex: 0, answers: [] };
    const host = document.getElementById('auditContent');
    if (host) _renderAuditQuiz(host);
}

function _renderQuizDeck(host, q) {
    const deck = (q.decks || []).find(d => d.id === _quizState.deckId);
    if (!deck) return _quizGoMenu();
    const total = deck.questions.length;
    const idx = _quizState.qIndex;

    if (idx >= total) return _renderQuizResult(host, deck);

    const question = deck.questions[idx];
    const answer = _quizState.answers[idx]; // { chosenIdx, correct } or undefined
    const answered = !!answer;

    host.innerHTML = `
        <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px">
            <button onclick="_quizGoMenu()"
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px">← Retour</button>
            <div style="flex:1;font-size:14px;font-weight:700;color:${AUDIT_LIGHT}">
                ${deck.icon || '🃏'} ${escapeHtml(deck.title)}
            </div>
            <div style="font-size:12px;color:#a78bfa">Question ${idx + 1} / ${total}</div>
        </div>

        <!-- Progress bar -->
        <div style="height:6px;background:#1e293b;border-radius:3px;overflow:hidden;margin-bottom:18px">
            <div style="height:100%;width:${Math.round(100 * (idx + (answered ? 1 : 0)) / total)}%;
                        background:linear-gradient(90deg, ${AUDIT_ACCENT}, #c4b5fd);transition:width 0.3s"></div>
        </div>

        <!-- Question -->
        <div class="card" style="padding:20px;border-left:3px solid ${AUDIT_ACCENT};margin-bottom:14px">
            <div style="font-size:15px;font-weight:600;color:${AUDIT_LIGHT};line-height:1.6;margin-bottom:16px">
                ${escapeHtml(question.q)}
            </div>
            ${question.options.map((opt, i) => _renderQuizOption(opt, i, answer, !answered)).join('')}
            ${question.ref ? `<div style="margin-top:12px;font-size:11px;color:#64748b">📚 Réf : ${escapeHtml(question.ref)}</div>` : ''}
        </div>

        <!-- Explanation after answer -->
        ${answered ? _renderQuizExplanation(question, answer) : ''}

        <!-- Navigation -->
        <div style="display:flex;justify-content:space-between;margin-top:14px">
            <button onclick="_quizPrev()" ${idx === 0 ? 'disabled' : ''}
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:8px 16px;border-radius:6px;cursor:${idx === 0 ? 'not-allowed' : 'pointer'};
                           font-size:13px;opacity:${idx === 0 ? '0.4' : '1'}">← Précédente</button>
            ${answered ? `
                <button onclick="_quizNext()"
                        style="background:${AUDIT_ACCENT};border:none;color:white;
                               padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
                    ${idx + 1 === total ? 'Voir le résultat 🏆' : 'Suivante →'}
                </button>` : '<div></div>'}
        </div>
    `;
}

function _renderQuizOption(opt, i, answer, clickable) {
    let bg = '#0f172a', border = '#334155', color = '#cbd5e1', cursor = 'pointer';
    if (answer) {
        cursor = 'default';
        if (i === answer.chosenIdx) {
            bg = opt.ok ? '#022c22' : '#3f1612';
            border = opt.ok ? '#10b981' : '#ef4444';
            color = opt.ok ? '#6ee7b7' : '#fca5a5';
        } else if (opt.ok) {
            border = '#10b981';
            color = '#6ee7b7';
        }
    }
    return `
        <div ${clickable ? `onclick="_quizAnswer(${i})"` : ''}
             style="display:flex;align-items:flex-start;gap:10px;padding:11px 14px;margin-bottom:8px;
                    border-radius:7px;border:1px solid ${border};background:${bg};color:${color};
                    cursor:${cursor};transition:background 0.15s;font-size:13px;line-height:1.5"
             ${clickable ? 'onmouseover="this.style.background=\'#1e293b\'" onmouseout="this.style.background=\'#0f172a\'"' : ''}>
            <div style="flex-shrink:0;width:22px;height:22px;border-radius:50%;border:1px solid ${border};
                        display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">
                ${answer && i === answer.chosenIdx ? (opt.ok ? '✓' : '✗') : (answer && opt.ok ? '✓' : String.fromCharCode(65 + i))}
            </div>
            <div>${escapeHtml(opt.t)}</div>
        </div>`;
}

function _renderQuizExplanation(question, answer) {
    const correctOpt = question.options[answer.chosenIdx];
    const isCorrect = correctOpt.ok;
    return `
        <div class="card" style="padding:14px 18px;border-left:3px solid ${isCorrect ? '#10b981' : '#ef4444'};
                                  background:${isCorrect ? '#022c22' : '#3f1612'}">
            <div style="font-size:13px;font-weight:700;color:${isCorrect ? '#6ee7b7' : '#fca5a5'};margin-bottom:6px">
                ${isCorrect ? '✅ Correct !' : '❌ Incorrect'}
            </div>
            <div style="font-size:13px;color:#cbd5e1;line-height:1.6">
                ${escapeHtml(correctOpt.x || '')}
            </div>
            ${!isCorrect ? `
                <div style="margin-top:8px;padding-top:8px;border-top:1px solid #334155;
                            font-size:12px;color:#94a3b8;line-height:1.6">
                    💡 Réponse correcte : <strong style="color:#6ee7b7">
                        ${escapeHtml(question.options.find(o => o.ok)?.t || '')}
                    </strong>
                </div>` : ''}
        </div>`;
}

function _quizAnswer(i) {
    // Dispatch selon le mode (deck ou simulator)
    if (_quizState.mode === 'simulator') return _quizAnswerSim(i);
    const deck = (_auditData.quiz.decks || []).find(d => d.id === _quizState.deckId);
    if (!deck) return;
    const question = deck.questions[_quizState.qIndex];
    if (!question) return;
    _quizState.answers[_quizState.qIndex] = { chosenIdx: i, correct: !!question.options[i].ok };
    const host = document.getElementById('auditContent');
    if (host) _renderAuditQuiz(host);
}

function _quizPrev() {
    if (_quizState.qIndex > 0) {
        _quizState.qIndex--;
        const host = document.getElementById('auditContent');
        if (host) _renderAuditQuiz(host);
    }
}

function _quizNext() {
    _quizState.qIndex++;
    const host = document.getElementById('auditContent');
    if (host) _renderAuditQuiz(host);
}

function _renderQuizResult(host, deck) {
    const total = deck.questions.length;
    const correct = _quizState.answers.filter(a => a && a.correct).length;
    const pct = Math.round(100 * correct / total);
    let mood = '🎉 Excellent !', color = '#10b981';
    if (pct < 60) { mood = '📚 À retravailler'; color = '#ef4444'; }
    else if (pct < 80) { mood = '💪 Bon effort'; color = '#f59e0b'; }

    // Persist via API (silently)
    api('save_audit_progress', 'quiz', deck.id, 'completed', `score:${correct}/${total}`);

    host.innerHTML = `
        <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px">
            <button onclick="_quizGoMenu()"
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px">← Menu Quiz</button>
        </div>

        <div class="card" style="padding:32px;text-align:center;border-left:3px solid ${color}">
            <div style="font-size:48px;margin-bottom:10px">${mood.split(' ')[0]}</div>
            <div style="font-size:18px;font-weight:700;color:${AUDIT_LIGHT};margin-bottom:14px">
                ${deck.title} — terminé
            </div>
            <div style="font-size:36px;font-weight:800;color:${color};margin-bottom:6px">${correct} / ${total}</div>
            <div style="font-size:14px;color:#94a3b8">Score : ${pct}% — ${mood}</div>

            <div style="margin-top:24px;display:flex;gap:10px;justify-content:center">
                <button onclick="_startQuizDeck('${deck.id}')"
                        style="background:${AUDIT_ACCENT};border:none;color:white;
                               padding:10px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
                    🔁 Refaire ce deck
                </button>
                <button onclick="_quizGoMenu()"
                        style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                               padding:10px 20px;border-radius:6px;cursor:pointer;font-size:13px">
                    📋 Choisir un autre deck
                </button>
            </div>
        </div>

        <!-- Question review -->
        <div style="font-size:13px;font-weight:700;color:${AUDIT_LIGHT};margin:20px 0 10px 0">
            📝 Revoir les réponses
        </div>
        ${deck.questions.map((qq, i) => {
            const a = _quizState.answers[i];
            const ok = a && a.correct;
            return `
                <div style="padding:10px 14px;margin-bottom:6px;border-radius:6px;
                            background:${ok ? '#022c22' : '#3f1612'};
                            border-left:3px solid ${ok ? '#10b981' : '#ef4444'};
                            font-size:12px;color:#cbd5e1;line-height:1.5">
                    <strong>${i + 1}.</strong> ${escapeHtml(qq.q)}
                    <span style="float:right;font-weight:700;color:${ok ? '#6ee7b7' : '#fca5a5'}">${ok ? '✓' : '✗'}</span>
                </div>`;
        }).join('')}
    `;
}

// ── Decision tree mode ──

function _startDecisionTree(treeId) {
    const tree = _auditData.quiz.decision_trees?.[treeId];
    if (!tree) return;
    _quizState = { ...(_quizState), mode: 'tree', treeId, treeCurrent: tree.root, treePath: [] };
    const host = document.getElementById('auditContent');
    if (host) _renderAuditQuiz(host);
}

function _renderDecisionTree(host, q) {
    const tree = q.decision_trees?.[_quizState.treeId];
    if (!tree) return _quizGoMenu();
    const current = tree.nodes[_quizState.treeCurrent];
    if (!current) return _quizGoMenu();

    const isLeaf = !!current.result;

    host.innerHTML = `
        <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px">
            <button onclick="_quizGoMenu()"
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px">← Menu</button>
            <div style="flex:1;font-size:14px;font-weight:700;color:${AUDIT_LIGHT}">
                ${tree.icon || '🌳'} ${escapeHtml(tree.title)}
            </div>
        </div>

        <!-- Path breadcrumbs -->
        ${_quizState.treePath.length ? `
            <div style="font-size:11px;color:#64748b;margin-bottom:14px">
                ${_quizState.treePath.map((step, i) => `
                    <span style="color:#a78bfa">${escapeHtml(step.label)}</span>
                    ${i < _quizState.treePath.length - 1 ? ' → ' : ''}
                `).join('')}
            </div>` : ''}

        ${isLeaf
            ? _renderTreeLeaf(current)
            : _renderTreeQuestion(current, tree)}

        <div style="margin-top:14px;display:flex;gap:10px">
            ${_quizState.treePath.length > 0 ? `
                <button onclick="_treePrev()"
                        style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                               padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px">← Étape précédente</button>` : ''}
            ${isLeaf ? `
                <button onclick="_startDecisionTree('${_quizState.treeId}')"
                        style="background:${AUDIT_ACCENT};border:none;color:white;
                               padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
                    🔁 Recommencer
                </button>` : ''}
        </div>
    `;
}

function _renderTreeQuestion(node, tree) {
    return `
        <div class="card" style="padding:20px;border-left:3px solid ${AUDIT_ACCENT}">
            <div style="font-size:15px;font-weight:700;color:${AUDIT_LIGHT};line-height:1.6;margin-bottom:16px">
                ❓ ${escapeHtml(node.q)}
            </div>
            ${(node.options || []).map(opt => `
                <div onclick="_treeChoose('${opt.next}', ${JSON.stringify(opt.label).replace(/"/g, '&quot;')})"
                     style="padding:12px 16px;margin-bottom:8px;border-radius:7px;
                            border:1px solid #334155;background:#0f172a;color:#cbd5e1;
                            cursor:pointer;transition:all 0.15s;font-size:13px;line-height:1.5"
                     onmouseover="this.style.background='#1e293b';this.style.borderColor='${AUDIT_ACCENT}'"
                     onmouseout="this.style.background='#0f172a';this.style.borderColor='#334155'">
                    ▶ ${escapeHtml(opt.label)}
                </div>
            `).join('')}
        </div>`;
}

function _renderTreeLeaf(node) {
    const c = node.color || AUDIT_ACCENT;
    return `
        <div class="card" style="padding:24px;border-left:3px solid ${c};background:rgba(15,23,42,0.6)">
            <div style="font-size:24px;font-weight:800;color:${c};margin-bottom:14px;line-height:1.4">
                ${escapeHtml(node.result)}
            </div>
            ${node.wording ? `
                <div style="margin:14px 0;padding:14px;background:#0a0f1c;border-radius:6px;
                            font-family:Georgia,serif;color:#cbd5e1;font-size:13px;line-height:1.7;
                            border-left:2px solid ${c}">
                    ${escapeHtml(node.wording)}
                </div>` : ''}
            ${node.tip ? `
                <div style="margin-top:12px;padding:10px 14px;background:#1e1b4b;border-radius:6px;
                            color:#c4b5fd;font-size:12px;line-height:1.6">
                    💡 ${escapeHtml(node.tip)}
                </div>` : ''}
        </div>`;
}

function _treeChoose(nextNodeId, label) {
    _quizState.treePath.push({ from: _quizState.treeCurrent, label });
    _quizState.treeCurrent = nextNodeId;
    const host = document.getElementById('auditContent');
    if (host) _renderAuditQuiz(host);
}

function _treePrev() {
    if (_quizState.treePath.length === 0) return;
    const last = _quizState.treePath.pop();
    _quizState.treeCurrent = last.from;
    const host = document.getElementById('auditContent');
    if (host) _renderAuditQuiz(host);
}

// ── Simulator mode ──

function _startSimulator(scenarioId) {
    _quizState = { ...(_quizState), mode: 'simulator', scenarioId, simStep: 0, simAnswers: [] };
    const host = document.getElementById('auditContent');
    if (host) _renderAuditQuiz(host);
}

function _renderSimulator(host, q) {
    const sim = q.simulator || {};
    const scenario = (sim.scenarios || []).find(s => s.id === _quizState.scenarioId);
    if (!scenario) return _quizGoMenu();
    const total = scenario.steps.length;
    const idx = _quizState.simStep;

    if (idx >= total) return _renderSimResult(host, scenario);

    const step = scenario.steps[idx];
    const ans = _quizState.simAnswers[idx];
    const answered = !!ans;

    host.innerHTML = `
        <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px">
            <button onclick="_quizGoMenu()"
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px">← Menu</button>
            <div style="flex:1;font-size:14px;font-weight:700;color:${AUDIT_LIGHT}">
                🎬 ${escapeHtml(scenario.title)}
            </div>
            <div style="font-size:12px;color:#fbbf24">Étape ${idx + 1} / ${total}</div>
        </div>

        ${idx === 0 ? `
            <div class="card" style="padding:16px;margin-bottom:14px;border-left:3px solid #f59e0b;
                                      background:rgba(245,158,11,0.1)">
                <div style="font-size:12px;font-weight:700;color:#fbbf24;margin-bottom:6px">📋 Contexte</div>
                <div style="font-size:13px;color:#cbd5e1;line-height:1.6">${escapeHtml(scenario.intro)}</div>
            </div>` : ''}

        <div class="card" style="padding:20px;border-left:3px solid ${AUDIT_ACCENT};margin-bottom:14px">
            <div style="font-size:15px;font-weight:700;color:${AUDIT_LIGHT};line-height:1.6;margin-bottom:16px">
                ${escapeHtml(step.q)}
            </div>
            ${step.options.map((opt, i) => _renderQuizOption(opt, i, ans, !answered)).join('')}
        </div>

        ${answered ? _renderQuizExplanation(step, ans) : ''}

        <div style="display:flex;justify-content:space-between;margin-top:14px">
            <button onclick="_simPrev()" ${idx === 0 ? 'disabled' : ''}
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:8px 16px;border-radius:6px;cursor:${idx === 0 ? 'not-allowed' : 'pointer'};
                           font-size:13px;opacity:${idx === 0 ? '0.4' : '1'}">← Précédente</button>
            ${answered ? `
                <button onclick="_simNext()"
                        style="background:${AUDIT_ACCENT};border:none;color:white;
                               padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
                    ${idx + 1 === total ? 'Voir le bilan 🏆' : 'Étape suivante →'}
                </button>` : '<div></div>'}
        </div>
    `;
}

function _quizAnswerSim(i) {
    const sim = _auditData.quiz.simulator || {};
    const scenario = (sim.scenarios || []).find(s => s.id === _quizState.scenarioId);
    if (!scenario) return;
    const step = scenario.steps[_quizState.simStep];
    if (!step) return;
    _quizState.simAnswers[_quizState.simStep] = { chosenIdx: i, correct: !!step.options[i].ok };
    const host = document.getElementById('auditContent');
    if (host) _renderAuditQuiz(host);
}

function _simPrev() {
    if (_quizState.simStep > 0) {
        _quizState.simStep--;
        const host = document.getElementById('auditContent');
        if (host) _renderAuditQuiz(host);
    }
}

function _simNext() {
    _quizState.simStep++;
    const host = document.getElementById('auditContent');
    if (host) _renderAuditQuiz(host);
}

function _renderSimResult(host, scenario) {
    const total = scenario.steps.length;
    const correct = _quizState.simAnswers.filter(a => a && a.correct).length;
    const pct = Math.round(100 * correct / total);
    let mood = '🏆 Excellent jugement !', color = '#10b981';
    if (pct < 60) { mood = '⚠️ Mission risquée'; color = '#ef4444'; }
    else if (pct < 80) { mood = '👍 Décisions solides'; color = '#f59e0b'; }

    api('save_audit_progress', 'simulator', scenario.id, 'completed', `score:${correct}/${total}`);

    host.innerHTML = `
        <div style="margin-bottom:14px">
            <button onclick="_quizGoMenu()"
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px">← Menu Quiz</button>
        </div>
        <div class="card" style="padding:32px;text-align:center;border-left:3px solid ${color}">
            <div style="font-size:48px;margin-bottom:10px">${mood.split(' ')[0]}</div>
            <div style="font-size:18px;font-weight:700;color:${AUDIT_LIGHT};margin-bottom:14px">
                ${escapeHtml(scenario.title)} — terminé
            </div>
            <div style="font-size:36px;font-weight:800;color:${color};margin-bottom:6px">${correct} / ${total}</div>
            <div style="font-size:14px;color:#94a3b8">Score : ${pct}% — ${mood}</div>
            <div style="margin-top:24px;display:flex;gap:10px;justify-content:center">
                <button onclick="_startSimulator('${scenario.id}')"
                        style="background:${AUDIT_ACCENT};border:none;color:white;
                               padding:10px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
                    🔁 Recommencer
                </button>
                <button onclick="_quizGoMenu()"
                        style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                               padding:10px 20px;border-radius:6px;cursor:pointer;font-size:13px">
                    📋 Menu
                </button>
            </div>
        </div>
    `;
}

// ── Calculateurs interactifs (Vague 3) ──

function _renderMaterialityCalculator() {
    return `
        <div class="card" style="margin-bottom:14px;border-left:3px solid ${AUDIT_ACCENT};padding:16px">
            <div style="font-size:13px;font-weight:700;color:${AUDIT_LIGHT};margin-bottom:10px">
                🧮 Matérialité (PM, TE, SUD)
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;line-height:1.5">
                Choisis une base + un % puis ajuste Performance Materiality (% de PM) et SUD (% de PM).
                Benchmarks usuels : RAI 5%, CA 0.5-2%, Total actif 1-5%, FP 1-5%.
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div>
                    <label style="font-size:11px;color:#94a3b8">Base (CHF)</label>
                    <input type="number" id="matBase" value="5000000" oninput="_recomputeMateriality()"
                           style="width:100%;background:#0f172a;border:1px solid #334155;color:${AUDIT_LIGHT};
                                  padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box" />
                </div>
                <div>
                    <label style="font-size:11px;color:#94a3b8">Type de base</label>
                    <select id="matType" onchange="_setMaterialityRecommended()"
                            style="width:100%;background:#0f172a;border:1px solid #334155;color:${AUDIT_LIGHT};
                                   padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box">
                        <option value="rai">Résultat avant impôt (RAI)</option>
                        <option value="ca">Chiffre d'affaires</option>
                        <option value="actif">Total de l'actif</option>
                        <option value="fp">Fonds propres</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px;color:#94a3b8">% Materiality globale (PM)</label>
                    <input type="number" id="matPct" value="5" step="0.5" min="0.1" max="10" oninput="_recomputeMateriality()"
                           style="width:100%;background:#0f172a;border:1px solid #334155;color:${AUDIT_LIGHT};
                                  padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box" />
                </div>
                <div>
                    <label style="font-size:11px;color:#94a3b8">% Performance Materiality (de PM)</label>
                    <input type="number" id="matPmPct" value="65" step="5" min="50" max="85" oninput="_recomputeMateriality()"
                           style="width:100%;background:#0f172a;border:1px solid #334155;color:${AUDIT_LIGHT};
                                  padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box" />
                </div>
                <div>
                    <label style="font-size:11px;color:#94a3b8">% SUD (clearly trivial threshold)</label>
                    <input type="number" id="matSudPct" value="5" step="1" min="1" max="10" oninput="_recomputeMateriality()"
                           style="width:100%;background:#0f172a;border:1px solid #334155;color:${AUDIT_LIGHT};
                                  padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box" />
                </div>
            </div>
            <div id="matResult" style="background:#0a0f1c;border:1px solid #3c1d6e;border-radius:6px;padding:12px;margin-top:6px"></div>
        </div>`;
}

function _setMaterialityRecommended() {
    const type = document.getElementById('matType')?.value;
    const recommended = { rai: 5, ca: 1, actif: 2, fp: 3 };
    const pct = document.getElementById('matPct');
    if (pct && recommended[type] != null) pct.value = recommended[type];
    _recomputeMateriality();
}

function _recomputeMateriality() {
    const base = parseFloat(document.getElementById('matBase')?.value) || 0;
    const pct = parseFloat(document.getElementById('matPct')?.value) || 0;
    const pmPct = parseFloat(document.getElementById('matPmPct')?.value) || 65;
    const sudPct = parseFloat(document.getElementById('matSudPct')?.value) || 5;
    const PM = base * (pct / 100);
    const TE = PM * (pmPct / 100);
    const SUD = PM * (sudPct / 100);
    const fmt = v => v.toLocaleString('fr-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const out = document.getElementById('matResult');
    if (!out) return;
    out.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;text-align:center">
            <div>
                <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Materiality (PM)</div>
                <div style="font-size:20px;font-weight:800;color:#10b981;margin-top:2px">CHF ${fmt(PM)}</div>
            </div>
            <div>
                <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Performance (TE)</div>
                <div style="font-size:20px;font-weight:800;color:#3b82f6;margin-top:2px">CHF ${fmt(TE)}</div>
            </div>
            <div>
                <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">SUD (trivial)</div>
                <div style="font-size:20px;font-weight:800;color:#f59e0b;margin-top:2px">CHF ${fmt(SUD)}</div>
            </div>
        </div>`;
}

function _renderOpinionCalculator() {
    return `
        <div class="card" style="margin-bottom:14px;border-left:3px solid ${AUDIT_ACCENT};padding:16px">
            <div style="font-size:13px;font-weight:700;color:${AUDIT_LIGHT};margin-bottom:10px">
                ⚖️ Calculateur — Type d'opinion (NAS 705)
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;line-height:1.5">
                Entre l'anomalie identifiée ou la limitation d'étendue. Le verdict + wording te sont suggérés.
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div>
                    <label style="font-size:11px;color:#94a3b8">Matérialité globale (CHF)</label>
                    <input type="number" id="opMat" value="800000" oninput="_recomputeOpinion()"
                           style="width:100%;background:#0f172a;border:1px solid #334155;color:${AUDIT_LIGHT};
                                  padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box" />
                </div>
                <div>
                    <label style="font-size:11px;color:#94a3b8">Situation rencontrée</label>
                    <select id="opSituation" onchange="_recomputeOpinion()"
                            style="width:100%;background:#0f172a;border:1px solid #334155;color:${AUDIT_LIGHT};
                                   padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box">
                        <option value="none">Aucun problème (comptes conformes)</option>
                        <option value="anomalie">Anomalie non corrigée par la direction</option>
                        <option value="limitation">Limitation d'étendue (éléments probants insuffisants)</option>
                        <option value="gc_inapproprie">Going concern inapproprié</option>
                        <option value="gc_incertitude">Going concern — incertitude significative adéquatement divulguée</option>
                    </select>
                </div>
                <div id="opAmountWrap">
                    <label style="font-size:11px;color:#94a3b8">Montant anomalie / impact limitation (CHF)</label>
                    <input type="number" id="opAmount" value="500000" oninput="_recomputeOpinion()"
                           style="width:100%;background:#0f172a;border:1px solid #334155;color:${AUDIT_LIGHT};
                                  padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box" />
                </div>
                <div id="opPervasiveWrap" style="display:flex;flex-direction:column;justify-content:flex-end">
                    <label style="font-size:11px;color:#94a3b8;margin-bottom:6px">Caractère DIFFUS (pervasive) ?</label>
                    <div style="display:flex;gap:8px">
                        <label style="flex:1;display:flex;align-items:center;gap:6px;padding:6px 10px;
                                      background:#0f172a;border:1px solid #334155;border-radius:5px;cursor:pointer;font-size:12px">
                            <input type="radio" name="opPervasive" value="false" checked onchange="_recomputeOpinion()" />
                            Non (isolé)
                        </label>
                        <label style="flex:1;display:flex;align-items:center;gap:6px;padding:6px 10px;
                                      background:#0f172a;border:1px solid #334155;border-radius:5px;cursor:pointer;font-size:12px">
                            <input type="radio" name="opPervasive" value="true" onchange="_recomputeOpinion()" />
                            Oui (fondamental)
                        </label>
                    </div>
                </div>
            </div>
            <div id="opResult" style="background:#0a0f1c;border:1px solid #3c1d6e;border-radius:6px;padding:14px;margin-top:6px"></div>
        </div>`;
}

function _recomputeOpinion() {
    const mat = parseFloat(document.getElementById('opMat')?.value) || 0;
    const situation = document.getElementById('opSituation')?.value || 'none';
    const amount = parseFloat(document.getElementById('opAmount')?.value) || 0;
    const pervasive = document.querySelector('input[name="opPervasive"]:checked')?.value === 'true';
    const out = document.getElementById('opResult');
    if (!out) return;

    // Toggle input visibility
    const amountWrap = document.getElementById('opAmountWrap');
    const pervasiveWrap = document.getElementById('opPervasiveWrap');
    const needsDetails = (situation === 'anomalie' || situation === 'limitation');
    if (amountWrap) amountWrap.style.visibility = needsDetails ? 'visible' : 'hidden';
    if (pervasiveWrap) pervasiveWrap.style.visibility = needsDetails ? 'visible' : 'hidden';

    // Decision logic
    let verdict, color, wording, nas, tip;
    const isSignificant = amount > mat;

    if (situation === 'none') {
        verdict = '✅ Opinion SANS RÉSERVE (Clean / Unqualified)';
        color = '#10b981';
        nas = 'NAS 700';
        wording = '« À notre avis, les comptes annuels donnent une image fidèle … en conformité avec [référentiel]. »';
        tip = 'Vérifier si KAM (EIP) ou § Observation (going concern) nécessaires.';
    } else if (situation === 'gc_incertitude') {
        verdict = '🔵 Opinion sans réserve + § OBSERVATION going concern';
        color = '#3b82f6';
        nas = 'NAS 706 / NAS 570';
        wording = '« Sans modifier notre opinion, nous attirons l\'attention sur la note [X] qui décrit l\'existence d\'une incertitude significative … »';
        tip = 'L\'incertitude est adéquatement divulguée → pas de modification d\'opinion.';
    } else if (situation === 'gc_inapproprie') {
        verdict = '🔴 Opinion DÉFAVORABLE (base going concern inappropriée)';
        color = '#ef4444';
        nas = 'NAS 570 §21';
        wording = '« À notre avis, parce que les comptes ont été établis selon le principe de continuité d\'exploitation alors que celui-ci n\'est pas approprié, les comptes ne donnent pas une image fidèle. »';
        tip = 'En Suisse : si surendettement (CO 725b) et CA inactif → AVIS AU JUGE obligatoire (CO 728c/729c).';
    } else if (situation === 'anomalie') {
        if (!isSignificant) {
            verdict = '✅ Opinion sans réserve (anomalie SOUS matérialité)';
            color = '#10b981';
            nas = 'NAS 450';
            wording = '« À notre avis, les comptes annuels donnent une image fidèle … »';
            tip = '⚠️ Vérifier le CUMUL des SAD (anomalies non corrigées) vs matérialité globale. Ne jamais conclure sur une seule anomalie.';
        } else if (pervasive) {
            verdict = '🔴 Opinion DÉFAVORABLE (anomalie significative ET diffuse)';
            color = '#ef4444';
            nas = 'NAS 705 §8';
            wording = '« À notre avis, en raison de l\'importance des points décrits, les comptes annuels NE DONNENT PAS une image fidèle … »';
            tip = 'Très rare — requiert justification forte. Communication renforcée à la gouvernance.';
        } else {
            verdict = '🟡 Opinion AVEC RÉSERVE — Anomalie (Qualified)';
            color = '#f59e0b';
            nas = 'NAS 705 §7';
            wording = '« À notre avis, SOUS RÉSERVE des effets de [point décrit dans "Fondement"], les comptes annuels donnent une image fidèle … »';
            tip = 'Section "Fondement de l\'opinion avec réserve" OBLIGATOIRE avant l\'opinion.';
        }
    } else if (situation === 'limitation') {
        if (!isSignificant) {
            verdict = '✅ Opinion sans réserve (limitation non significative)';
            color = '#10b981';
            nas = 'NAS 705';
            wording = '« À notre avis, les comptes annuels donnent une image fidèle … »';
            tip = 'Impact de la limitation < matérialité → pas de modification. Documenter l\'évaluation.';
        } else if (pervasive) {
            verdict = '⚫ IMPOSSIBILITÉ d\'exprimer une opinion (Disclaimer)';
            color = '#dc2626';
            nas = 'NAS 705 §10';
            wording = '« Compte tenu de l\'importance des points décrits, nous N\'AVONS PAS PU obtenir d\'éléments probants suffisants. Par conséquent, nous N\'EXPRIMONS PAS d\'opinion sur les comptes annuels. »';
            tip = 'Cas extrême. Si limitation imposée par direction → escalade gouvernance + envisager démission.';
        } else {
            verdict = '🟡 Opinion AVEC RÉSERVE — Limitation (Qualified)';
            color = '#f59e0b';
            nas = 'NAS 705 §7';
            wording = '« À notre avis, SOUS RÉSERVE des ajustements possibles qui auraient pu être nécessaires si nous avions pu obtenir [éléments probants], les comptes annuels donnent une image fidèle … »';
            tip = 'Décrire précisément la limitation et son impact potentiel.';
        }
    }

    out.innerHTML = `
        <div style="font-size:16px;font-weight:800;color:${color};margin-bottom:10px">${verdict}</div>
        <div style="font-size:11px;color:#a78bfa;margin-bottom:10px">📚 ${nas}</div>
        <div style="padding:12px;background:#0a0f1c;border-left:2px solid ${color};border-radius:4px;
                    color:#cbd5e1;font-size:13px;line-height:1.7;font-family:Georgia,serif;font-style:italic">
            ${wording}
        </div>
        <div style="margin-top:10px;font-size:12px;color:#fde68a;line-height:1.5">
            💡 ${tip}
        </div>
        <button onclick="_copyFinding(this, ${JSON.stringify(verdict + '\n\n' + wording + '\n\nTip : ' + tip).replace(/"/g, '&quot;')})"
                style="margin-top:10px;background:#1e293b;border:1px solid #334155;color:#a78bfa;
                       padding:5px 10px;border-radius:5px;cursor:pointer;font-size:11px;font-family:system-ui,sans-serif">
            📋 Copier verdict + wording
        </button>`;
}

function _renderSamplingCalculator() {
    return `
        <div class="card" style="margin-bottom:14px;border-left:3px solid ${AUDIT_ACCENT};padding:16px">
            <div style="font-size:13px;font-weight:700;color:${AUDIT_LIGHT};margin-bottom:10px">
                🎲 Sampling — taille échantillon
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;line-height:1.5">
                <strong>MUS</strong> (Monetary Unit Sampling) pour tests substantifs ·
                <strong>Attribute sampling</strong> pour tests des contrôles.
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div>
                    <label style="font-size:11px;color:#94a3b8">Type de test</label>
                    <select id="sampType" onchange="_recomputeSampling()"
                            style="width:100%;background:#0f172a;border:1px solid #334155;color:${AUDIT_LIGHT};
                                   padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box">
                        <option value="mus">MUS — Test substantif</option>
                        <option value="attr">Attribute — Test des contrôles</option>
                    </select>
                </div>
                <div id="sampPopWrap">
                    <label style="font-size:11px;color:#94a3b8">Population (CHF) — pour MUS</label>
                    <input type="number" id="sampPop" value="10000000" oninput="_recomputeSampling()"
                           style="width:100%;background:#0f172a;border:1px solid #334155;color:${AUDIT_LIGHT};
                                  padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box" />
                </div>
                <div id="sampTeWrap">
                    <label style="font-size:11px;color:#94a3b8">Performance Materiality (CHF)</label>
                    <input type="number" id="sampTe" value="200000" oninput="_recomputeSampling()"
                           style="width:100%;background:#0f172a;border:1px solid #334155;color:${AUDIT_LIGHT};
                                  padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box" />
                </div>
                <div>
                    <label style="font-size:11px;color:#94a3b8">Niveau de confiance</label>
                    <select id="sampConf" onchange="_recomputeSampling()"
                            style="width:100%;background:#0f172a;border:1px solid #334155;color:${AUDIT_LIGHT};
                                   padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box">
                        <option value="high">Haute (95% / facteur 3.0)</option>
                        <option value="moderate" selected>Modérée (90% / facteur 2.3)</option>
                        <option value="low">Faible (80% / facteur 1.6)</option>
                    </select>
                </div>
                <div id="sampFreqWrap" style="display:none">
                    <label style="font-size:11px;color:#94a3b8">Fréquence du contrôle</label>
                    <select id="sampFreq" onchange="_recomputeSampling()"
                            style="width:100%;background:#0f172a;border:1px solid #334155;color:${AUDIT_LIGHT};
                                   padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box">
                        <option value="annual">Annuel (1)</option>
                        <option value="quarterly">Trimestriel (2)</option>
                        <option value="monthly">Mensuel (5)</option>
                        <option value="weekly">Hebdomadaire (15)</option>
                        <option value="daily" selected>Quotidien (25)</option>
                        <option value="multiple_daily">Plusieurs fois par jour (45-60)</option>
                    </select>
                </div>
            </div>
            <div id="sampResult" style="background:#0a0f1c;border:1px solid #3c1d6e;border-radius:6px;padding:12px;margin-top:6px"></div>
        </div>`;
}

function _recomputeSampling() {
    const type = document.getElementById('sampType')?.value;
    const conf = document.getElementById('sampConf')?.value;
    const out = document.getElementById('sampResult');
    if (!out) return;

    // Toggle relevant inputs
    const popWrap = document.getElementById('sampPopWrap');
    const teWrap = document.getElementById('sampTeWrap');
    const freqWrap = document.getElementById('sampFreqWrap');
    if (popWrap && teWrap && freqWrap) {
        popWrap.style.display = type === 'mus' ? '' : 'none';
        teWrap.style.display = type === 'mus' ? '' : 'none';
        freqWrap.style.display = type === 'attr' ? '' : 'none';
    }

    if (type === 'mus') {
        const pop = parseFloat(document.getElementById('sampPop')?.value) || 0;
        const te = parseFloat(document.getElementById('sampTe')?.value) || 1;
        const factors = { high: 3.0, moderate: 2.3, low: 1.6 };
        const factor = factors[conf] || 2.3;
        const n = Math.ceil(pop / te * factor);
        out.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;text-align:center">
                <div>
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase">Sample size (MUS)</div>
                    <div style="font-size:24px;font-weight:800;color:#8b5cf6;margin-top:2px">${n} items</div>
                </div>
                <div>
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase">Sampling interval</div>
                    <div style="font-size:18px;font-weight:700;color:#cbd5e1;margin-top:5px">CHF ${Math.floor(te / factor).toLocaleString('fr-CH')}</div>
                </div>
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-top:10px;line-height:1.5">
                Formule : n = (Population / Performance Materiality) × facteur de confiance (${factor}).
                Méthode : sélectionner 1 unité monétaire tous les ${Math.floor(te / factor).toLocaleString('fr-CH')} CHF cumulés.
            </div>`;
    } else {
        const freq = document.getElementById('sampFreq')?.value || 'daily';
        // GAM-style table (approx)
        const table = {
            high: { annual: 1, quarterly: 2, monthly: 6, weekly: 25, daily: 45, multiple_daily: 60 },
            moderate: { annual: 1, quarterly: 2, monthly: 5, weekly: 15, daily: 25, multiple_daily: 45 },
            low: { annual: 1, quarterly: 2, monthly: 3, weekly: 10, daily: 18, multiple_daily: 30 }
        };
        const n = table[conf]?.[freq] || 25;
        out.innerHTML = `
            <div style="text-align:center">
                <div style="font-size:10px;color:#94a3b8;text-transform:uppercase">Sample size (Attribute)</div>
                <div style="font-size:24px;font-weight:800;color:#10b981;margin-top:2px">${n} items</div>
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-top:10px;line-height:1.5">
                Basé sur la matrice EY GAM (attribute sampling). Si exception détectée → investiguer + élargir échantillon.
            </div>`;
    }
}

function _renderGoingConcernChecklist() {
    const indicators = [
        { cat: 'Financiers', items: [
            'Pertes opérationnelles récurrentes',
            'Fonds propres négatifs ou en réduction (CO 725a/b)',
            'Trésorerie négative ou en forte dégradation',
            'Rupture ou risque de rupture de covenants bancaires',
            'Incapacité à refinancer les dettes arrivant à échéance',
            'Retards de paiement aux fournisseurs / créanciers'
        ]},
        { cat: 'Opérationnels', items: [
            'Départ de la direction clé sans remplacement',
            'Perte d\'un client / fournisseur / marché majeur',
            'Conflits sociaux ou pénurie de matières premières',
            'Procédures réglementaires défavorables'
        ]},
        { cat: 'Autres', items: [
            'Litiges majeurs en cours susceptibles de jugement défavorable',
            'Changement réglementaire impactant le business model',
            'Catastrophe naturelle ou crise sanitaire majeure',
            'Surendettement au sens du CO 725b → obligation avis juge'
        ]}
    ];
    return `
        <div class="card" style="margin-bottom:14px;border-left:3px solid ${AUDIT_ACCENT};padding:16px">
            <div style="font-size:13px;font-weight:700;color:${AUDIT_LIGHT};margin-bottom:10px">
                🔍 Going concern — checklist indicateurs (NAS 570)
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:12px;line-height:1.5">
                Évaluer la capacité à poursuivre l'exploitation sur min. 12 mois depuis la date des comptes.
                <strong>Suisse :</strong> surendettement (CO 725b) déclenche avis au juge si CA inactif (CO 728c/729c).
            </div>
            ${indicators.map(g => `
                <div style="margin-bottom:14px">
                    <div style="font-size:12px;font-weight:700;color:${AUDIT_ACCENT};margin-bottom:6px">
                        ${escapeHtml(g.cat)}
                    </div>
                    ${g.items.map((it, i) => {
                        const key = `gc_${g.cat}_${i}`;
                        return `
                            <label style="display:flex;align-items:flex-start;gap:8px;padding:5px 8px;cursor:pointer;
                                          font-size:12px;color:#cbd5e1">
                                <input type="checkbox" id="${key}" style="margin-top:2px;flex-shrink:0" />
                                <span>${escapeHtml(it)}</span>
                            </label>`;
                    }).join('')}
                </div>
            `).join('')}
        </div>`;
}

function _renderFinding(f) {
    const severityColor = {
        'Significant deficiency': '#ef4444',
        'Audit difference': '#f59e0b',
        'Material weakness': '#dc2626',
        'Observation': '#3b82f6'
    }[f.severity] || AUDIT_ACCENT;
    const id = 'find-' + f.id;
    return `
        <div class="card" style="margin-bottom:10px;border-left:3px solid ${severityColor}">
            <div onclick="_toggleNas('${id}')"
                 style="padding:11px 16px;cursor:pointer;display:flex;justify-content:space-between;
                        align-items:center;transition:background 0.15s"
                 onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background=''">
                <div style="flex:1">
                    <div style="font-size:13px;font-weight:700;color:${AUDIT_LIGHT}">
                        ${escapeHtml(f.title)}
                    </div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px">
                        <span style="background:${severityColor};color:white;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">
                            ${escapeHtml(f.severity)}
                        </span>
                        <span style="margin-left:8px">${escapeHtml(f.category)}</span>
                    </div>
                </div>
                <span id="${id}-arrow" style="color:${severityColor}">▸</span>
            </div>
            <div id="${id}" style="display:none;padding:0 18px 14px 18px;background:#0a0f1c">
                <div style="margin-top:10px;font-size:12px;font-weight:700;color:${severityColor};margin-bottom:4px">📋 Constatation</div>
                <div style="color:#cbd5e1;font-size:12px;line-height:1.6;font-family:Georgia,serif;font-style:italic">
                    « ${escapeHtml(f.wording)} »
                </div>
                <div style="margin-top:12px;font-size:12px;font-weight:700;color:#10b981;margin-bottom:4px">💡 Recommandation</div>
                <div style="color:#cbd5e1;font-size:12px;line-height:1.6">
                    ${escapeHtml(f.recommendation)}
                </div>
                <button onclick="_copyFinding(this, ${JSON.stringify(f.wording + '\n\nRecommandation : ' + f.recommendation).replace(/"/g, '&quot;')})"
                        style="margin-top:10px;background:#1e293b;border:1px solid #334155;color:#a78bfa;
                               padding:5px 10px;border-radius:5px;cursor:pointer;font-size:11px">
                    📋 Copier finding + recommandation
                </button>
            </div>
        </div>`;
}

function _copyFinding(btn, text) {
    if (typeof text !== 'string') return;
    navigator.clipboard?.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓ Copié';
        setTimeout(() => { btn.textContent = orig; }, 1500);
    });
}

function _renderLetterTemplate(t) {
    if (!t) return '';
    const id = 'lt-' + t.id;
    return `
        <div class="card" style="margin-bottom:10px;border-left:3px solid ${AUDIT_ACCENT}">
            <div onclick="_toggleNas('${id}')"
                 style="padding:11px 16px;cursor:pointer;display:flex;justify-content:space-between;
                        align-items:center;transition:background 0.15s"
                 onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background=''">
                <div style="font-size:13px;font-weight:700;color:${AUDIT_LIGHT}">
                    ✉️ ${escapeHtml(t.title)}
                </div>
                <span id="${id}-arrow" style="color:${AUDIT_ACCENT}">▸</span>
            </div>
            <div id="${id}" style="display:none;padding:14px 18px;background:#0a0f1c">
                <pre style="white-space:pre-wrap;font-family:Georgia,serif;color:#cbd5e1;font-size:12px;
                            line-height:1.7;margin:0">${escapeHtml(t.wording)}</pre>
                <button onclick="_copyFinding(this, ${JSON.stringify(t.wording).replace(/"/g, '&quot;')})"
                        style="margin-top:10px;background:#1e293b;border:1px solid #334155;color:#a78bfa;
                               padding:5px 10px;border-radius:5px;cursor:pointer;font-size:11px;font-family:system-ui,sans-serif">
                    📋 Copier le template
                </button>
            </div>
        </div>`;
}

// Trigger initial calculator computation when Outils tab opens
function _initOutilsCalculators() {
    setTimeout(() => {
        if (document.getElementById('matResult')) _recomputeMateriality();
        if (document.getElementById('sampResult')) _recomputeSampling();
        if (document.getElementById('opResult')) _recomputeOpinion();
    }, 50);
}

async function _loadExcelTemplates() {
    const host = document.getElementById('auditExcelTemplates');
    if (!host) return;
    const templates = await api('list_audit_templates');
    if (!templates || templates.length === 0) {
        host.innerHTML = `
            <div style="padding:12px;color:#94a3b8;font-size:12px">
                Templates indisponibles (module <code>audit_templates</code> manquant ou <code>openpyxl</code> non installé).
            </div>`;
        return;
    }
    host.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
            ${templates.map(t => `
                <div class="card" style="padding:14px;border-left:3px solid #10b981">
                    <div style="font-size:13px;font-weight:700;color:${AUDIT_LIGHT};margin-bottom:4px">
                        ${t.icon || '📥'} ${escapeHtml(t.name)}
                    </div>
                    <div style="font-size:11px;color:#94a3b8;line-height:1.5;margin-bottom:10px">
                        ${escapeHtml(t.description)}
                    </div>
                    <button onclick="_downloadAuditTemplate('${t.id}', this)"
                            style="width:100%;background:#065f46;border:1px solid #10b981;color:#6ee7b7;
                                   padding:7px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">
                        📥 Télécharger .xlsx
                    </button>
                </div>
            `).join('')}
        </div>`;
}

async function _downloadAuditTemplate(templateId, btn) {
    const orig = btn.textContent;
    btn.textContent = '⏳ Génération…';
    btn.disabled = true;
    try {
        const res = await api('download_audit_template', templateId);
        if (res && res.ok) {
            btn.textContent = '✅ Ouvert';
            btn.style.background = '#10b981';
            setTimeout(() => { btn.textContent = orig; btn.style.background = '#065f46'; btn.disabled = false; }, 2000);
        } else if (res && res.cancelled) {
            btn.textContent = orig;
            btn.disabled = false;
        } else {
            btn.textContent = '❌ Erreur';
            btn.style.background = '#7f1d1d';
            console.error('Template download error:', res);
            setTimeout(() => { btn.textContent = orig; btn.style.background = '#065f46'; btn.disabled = false; }, 3000);
        }
    } catch (e) {
        console.error(e);
        btn.textContent = '❌ Erreur';
        btn.disabled = false;
    }
}

// Helper local au cas où escapeHtml ne serait pas chargé en premier
if (typeof window !== 'undefined' && typeof window.escapeHtml !== 'function') {
    window.escapeHtml = function(s) {
        if (s == null) return '';
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };
}
