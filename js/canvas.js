/* ═══════════════════════════════════════════════
   Canvas Perso — Ton cockpit d'audit personnel
   Engagements, workpapers, review notes, SAD, time tracking, PDF export
   ═══════════════════════════════════════════════ */

const CANVAS_ACCENT = '#805ad5';
const CANVAS_LIGHT = '#e9d8fd';

let _canvasState = {
    view: 'picker',        // 'picker' | 'create' | 'cockpit' | 'wp_edit'
    activeEid: null,
    snapshot: null,
    panel: 'overview',     // 'overview' | 'tb' | 'wps' | 'notes' | 'sad' | 'time' | 'library'
    editWpId: null,
    library: null,
};

async function renderCanvas(container) {
    container.innerHTML = '<div class="text-center" style="padding:60px"><div class="page-title">Chargement Canvas Perso…</div></div>';
    if (!_canvasState.library) _canvasState.library = await api('canvas_library');

    if (_canvasState.view === 'picker')   return _renderCanvasPicker(container);
    if (_canvasState.view === 'create')   return _renderCanvasCreate(container);
    if (_canvasState.view === 'cockpit')  return _renderCanvasCockpit(container);
    if (_canvasState.view === 'wp_edit')  return _renderWpEditor(container);
}

// ── Picker ──

async function _renderCanvasPicker(container) {
    const engagements = await api('canvas_list_engagements') || [];
    const active = engagements.filter(e => e.status === 'in_progress');
    const done = engagements.filter(e => e.status !== 'in_progress');

    container.innerHTML = `
        <div style="margin-bottom:18px;padding:18px 22px;border-radius:12px;
                    background:linear-gradient(135deg, #553c9a, #4c1d95);
                    border:1px solid ${CANVAS_ACCENT}">
            <div style="display:flex;align-items:center;gap:14px">
                <div style="font-size:36px">🏢</div>
                <div style="flex:1">
                    <div style="font-size:20px;font-weight:800;color:${CANVAS_LIGHT}">Canvas Perso</div>
                    <div style="font-size:13px;color:#c4b5fd;margin-top:2px">
                        Cockpit d'audit pour TES propres engagements · Workpapers · Review notes · SAD · Export PDF
                    </div>
                </div>
                <button onclick="_canvasGoCreate()"
                        style="background:${CANVAS_ACCENT};border:none;color:white;padding:10px 18px;border-radius:7px;
                               cursor:pointer;font-size:13px;font-weight:700">
                    + Nouveau mandat
                </button>
            </div>
        </div>

        ${active.length ? `
            <div style="font-size:14px;font-weight:700;color:${CANVAS_LIGHT};margin:8px 0 10px 0">
                ▶️ Mandats en cours (${active.length})
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;margin-bottom:18px">
                ${active.map(e => _renderEngagementCard(e, true)).join('')}
            </div>
        ` : `
            <div style="padding:32px;text-align:center;background:#0f172a;border-radius:10px;margin-bottom:18px;
                        border:1px dashed #334155">
                <div style="font-size:48px;margin-bottom:10px">📂</div>
                <div style="color:#94a3b8;font-size:14px">Aucun mandat en cours.</div>
                <div style="color:#64748b;font-size:12px;margin-top:4px">Clique <strong>+ Nouveau mandat</strong> pour commencer.</div>
            </div>
        `}

        ${done.length ? `
            <div style="font-size:14px;font-weight:700;color:${CANVAS_LIGHT};margin:24px 0 10px 0">
                ✅ Mandats terminés (${done.length})
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
                ${done.map(e => _renderEngagementCard(e, false)).join('')}
            </div>
        ` : ''}
    `;
}

function _renderEngagementCard(e, active) {
    const color = active ? '#10b981' : '#64748b';
    const updated = new Date(e.updated_at || e.created_at).toLocaleDateString('fr-CH');
    return `
        <div class="card" style="padding:14px;border-left:3px solid ${color}">
            <div style="font-size:14px;font-weight:800;color:${CANVAS_LIGHT};margin-bottom:4px">
                ${escapeHtml(e.client_name || '')}
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:6px">
                ${escapeHtml(e.industry || '')} · ${escapeHtml(e.regime || '')} · Ex. ${escapeHtml(e.exercise_year || '')}
            </div>
            <div style="font-size:11px;color:#64748b;margin-bottom:10px">
                Mis à jour ${updated} · Phase : ${escapeHtml(e.current_phase || '-')}
            </div>
            <div style="display:flex;gap:6px">
                <button onclick="_canvasOpen(${e.id})"
                        style="flex:1;background:#1e293b;border:1px solid #334155;color:${CANVAS_LIGHT};
                               padding:7px 10px;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600">
                    ▶ Ouvrir
                </button>
                <button onclick="_canvasDelete(${e.id})"
                        style="background:#3f1612;border:1px solid #7f1d1d;color:#fca5a5;
                               padding:7px 10px;border-radius:5px;cursor:pointer;font-size:12px"
                        title="Supprimer">🗑️</button>
            </div>
        </div>`;
}

function _canvasGoCreate() {
    _canvasState.view = 'create';
    const host = document.getElementById('auditContent');
    if (host) renderCanvas(host);
}

async function _canvasOpen(eid) {
    _canvasState.activeEid = eid;
    _canvasState.view = 'cockpit';
    _canvasState.panel = 'overview';
    const host = document.getElementById('auditContent');
    if (host) renderCanvas(host);
}

async function _canvasDelete(eid) {
    if (!confirm('Supprimer ce mandat ? Toutes les données (workpapers, notes, SAD) seront perdues.')) return;
    await api('canvas_delete_engagement', eid);
    const host = document.getElementById('auditContent');
    if (host) renderCanvas(host);
}

async function _canvasBackToPicker() {
    _canvasState.view = 'picker';
    _canvasState.activeEid = null;
    _canvasState.snapshot = null;
    const host = document.getElementById('auditContent');
    if (host) renderCanvas(host);
}

// ── Create form ──

function _renderCanvasCreate(container) {
    container.innerHTML = `
        <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px">
            <button onclick="_canvasBackToPicker()"
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:6px 12px;border-radius:5px;cursor:pointer;font-size:12px">← Retour</button>
            <div style="font-size:16px;font-weight:800;color:${CANVAS_LIGHT}">Nouveau mandat Canvas</div>
        </div>

        <div class="card" style="padding:20px;border-left:3px solid ${CANVAS_ACCENT};max-width:880px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                ${_formField('cli_name', 'Nom du client', 'text', 'AcmeCorp SA', true)}
                ${_formField('cli_industry', 'Industrie', 'text', 'Distribution')}
                ${_formField('cli_form', 'Forme juridique', 'text', 'Société anonyme (SA)')}
                ${_formField('cli_year', 'Exercice', 'text', '2025')}
                ${_formField('cli_regime', 'Régime', 'select', '', false,
                    ['', 'Révision ordinaire', 'Contrôle restreint', 'Opting-out', 'ESPI (cotée)'])}
                ${_formField('cli_framework', 'Référentiel', 'select', '', false,
                    ['', 'CO', 'Swiss GAAP RPC', 'IFRS', 'CO + RPC'])}
                ${_formField('cli_revenue', 'CA (CHF)', 'number', '0')}
                ${_formField('cli_balance', 'Total bilan (CHF)', 'number', '0')}
                ${_formField('cli_employees', 'Employés (ETP)', 'number', '0')}
                ${_formField('cli_mat_pm', 'Matérialité globale (CHF)', 'number', '100000')}
                ${_formField('cli_mat_pe', 'Performance Materiality (CHF)', 'number', '65000')}
                ${_formField('cli_mat_sud', 'SUD (CHF)', 'number', '5000')}
                ${_formField('cli_partner', 'Engagement partner', 'text', '')}
                ${_formField('cli_senior', 'Senior', 'text', '')}
            </div>
            <div style="margin-top:14px">
                <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#cbd5e1;cursor:pointer">
                    <input type="checkbox" id="cli_seed" checked />
                    Créer automatiquement les workpapers de base (24 WPs templates)
                </label>
            </div>
            <div style="margin-top:18px;display:flex;gap:10px">
                <button onclick="_canvasBackToPicker()"
                        style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                               padding:10px 18px;border-radius:6px;cursor:pointer;font-size:13px">
                    Annuler
                </button>
                <button onclick="_canvasSubmitCreate()"
                        style="background:${CANVAS_ACCENT};border:none;color:white;
                               padding:10px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700">
                    ✓ Créer le mandat
                </button>
            </div>
        </div>`;
}

function _formField(id, label, type, placeholder, required, options) {
    if (type === 'select') {
        return `
            <div>
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">
                    ${escapeHtml(label)}${required ? ' *' : ''}
                </label>
                <select id="${id}"
                        style="width:100%;background:#0f172a;border:1px solid #334155;color:${CANVAS_LIGHT};
                               padding:7px 10px;border-radius:5px;font-size:13px;box-sizing:border-box">
                    ${(options || []).map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o) || '—'}</option>`).join('')}
                </select>
            </div>`;
    }
    return `
        <div>
            <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">
                ${escapeHtml(label)}${required ? ' *' : ''}
            </label>
            <input type="${type}" id="${id}" placeholder="${escapeHtml(placeholder)}"
                   style="width:100%;background:#0f172a;border:1px solid #334155;color:${CANVAS_LIGHT};
                          padding:7px 10px;border-radius:5px;font-size:13px;box-sizing:border-box" />
        </div>`;
}

async function _canvasSubmitCreate() {
    const data = {
        client_name: document.getElementById('cli_name').value.trim(),
        industry: document.getElementById('cli_industry').value.trim(),
        form: document.getElementById('cli_form').value.trim(),
        exercise_year: document.getElementById('cli_year').value.trim(),
        regime: document.getElementById('cli_regime').value,
        framework: document.getElementById('cli_framework').value,
        revenue: parseFloat(document.getElementById('cli_revenue').value) || 0,
        balance_sheet: parseFloat(document.getElementById('cli_balance').value) || 0,
        employees: parseInt(document.getElementById('cli_employees').value) || 0,
        materiality_pm: parseFloat(document.getElementById('cli_mat_pm').value) || 0,
        materiality_performance: parseFloat(document.getElementById('cli_mat_pe').value) || 0,
        materiality_sud: parseFloat(document.getElementById('cli_mat_sud').value) || 0,
        partner: document.getElementById('cli_partner').value.trim(),
        senior: document.getElementById('cli_senior').value.trim(),
        seed_workpapers: document.getElementById('cli_seed').checked,
    };
    if (!data.client_name) {
        alert('Nom du client obligatoire');
        return;
    }
    const r = await api('canvas_create_engagement', data);
    if (r && r.ok) {
        _canvasState.activeEid = r.id;
        _canvasState.view = 'cockpit';
        _canvasState.panel = 'overview';
        const host = document.getElementById('auditContent');
        if (host) renderCanvas(host);
    } else {
        alert('Erreur création : ' + (r && r.error || 'inconnue'));
    }
}

// ── Cockpit ──

async function _renderCanvasCockpit(container) {
    const snap = await api('canvas_get_engagement', _canvasState.activeEid);
    if (!snap) { _canvasBackToPicker(); return; }
    _canvasState.snapshot = snap;
    const eng = snap.engagement;
    const stats = snap.stats;
    const fmt = v => (v || 0).toLocaleString('fr-CH', {minimumFractionDigits:0, maximumFractionDigits:0});

    container.innerHTML = `
        <!-- Header -->
        <div style="margin-bottom:14px;padding:14px 18px;border-radius:10px;
                    background:linear-gradient(135deg, #553c9a, #4c1d95);border:1px solid ${CANVAS_ACCENT}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
                <div>
                    <div style="font-size:11px;color:#c4b5fd;text-transform:uppercase">🏢 Mandat Canvas</div>
                    <div style="font-size:18px;font-weight:800;color:${CANVAS_LIGHT};margin-top:2px">
                        ${escapeHtml(eng.client_name)}
                    </div>
                    <div style="font-size:12px;color:#c4b5fd;margin-top:2px">
                        ${escapeHtml(eng.industry || '')} · ${escapeHtml(eng.regime || '')} · Ex. ${escapeHtml(eng.exercise_year || '')}
                    </div>
                </div>
                <div style="text-align:right;font-size:11px;color:#c4b5fd">
                    <div>PM : CHF ${fmt(eng.materiality_pm)}</div>
                    <div>TE : CHF ${fmt(eng.materiality_performance)}</div>
                    <div>SUD : CHF ${fmt(eng.materiality_sud)}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px">
                    <button onclick="_canvasBackToPicker()"
                            style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                                   padding:6px 12px;border-radius:5px;cursor:pointer;font-size:11px">
                        ← Mandats
                    </button>
                    <button onclick="_canvasExportPdf()"
                            style="background:#10b981;border:none;color:white;
                                   padding:6px 12px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600">
                        📥 Export PDF
                    </button>
                </div>
            </div>
        </div>

        <!-- KPI strip -->
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:14px">
            ${_kpi('📂', stats.wp_count, 'Workpapers', '#3b82f6')}
            ${_kpi('✓', stats.wp_by_status?.signed || 0, 'Signés', '#10b981')}
            ${_kpi('⚡', stats.notes_open || 0, 'Review notes ouvertes', '#f59e0b')}
            ${_kpi('🚨', snap.sad.length, 'SAD items', '#ef4444')}
            ${_kpi('⏱️', stats.time_total_hours.toFixed(1) + 'h', 'Temps cumulé', '#a78bfa')}
        </div>

        <!-- Panel tabs -->
        <div style="display:flex;gap:6px;margin-bottom:14px;padding:6px;background:#0f172a;
                    border:1px solid #1e293b;border-radius:10px;flex-wrap:wrap">
            ${_canvasPanelTab('overview', '🎯 Overview')}
            ${_canvasPanelTab('tb', '📊 Balance')}
            ${_canvasPanelTab('pbc', '📋 PBC')}
            ${_canvasPanelTab('wps', '📂 Workpapers')}
            ${_canvasPanelTab('notes', '📝 Review notes')}
            ${_canvasPanelTab('sad', '🚨 SAD')}
            ${_canvasPanelTab('memos', '📝 Completion memos')}
            ${_canvasPanelTab('report', '📄 Rapport')}
            ${_canvasPanelTab('time', '⏱️ Temps')}
            ${_canvasPanelTab('library', '📚 Bibliothèque')}
        </div>

        <div id="canvasPanelContent"></div>
    `;
    _renderCanvasPanel();
}

function _kpi(icon, value, label, color) {
    return `
        <div class="card" style="padding:12px;text-align:center;border-left:3px solid ${color}">
            <div style="font-size:20px">${icon}</div>
            <div style="font-size:20px;font-weight:800;color:${color};margin:2px 0">${value}</div>
            <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
        </div>`;
}

function _canvasPanelTab(id, label) {
    const active = _canvasState.panel === id;
    return `
        <button onclick="_canvasSwitchPanel('${id}')"
                style="flex:1 1 120px;padding:8px 12px;border-radius:7px;cursor:pointer;
                       font-size:12px;font-weight:600;border:1px solid ${active ? CANVAS_ACCENT : 'transparent'};
                       background:${active ? '#3c1d6e' : 'transparent'};
                       color:${active ? CANVAS_LIGHT : '#94a3b8'}">
            ${label}
        </button>`;
}

async function _canvasSwitchPanel(panel) {
    _canvasState.panel = panel;
    // Re-render header (active tab indicator) + panel
    const host = document.getElementById('auditContent');
    if (host && _canvasState.view === 'cockpit') _renderCanvasCockpit(host);
}

function _renderCanvasPanel() {
    const host = document.getElementById('canvasPanelContent');
    if (!host) return;
    const p = _canvasState.panel;
    if (p === 'overview') _renderOverviewPanel(host);
    else if (p === 'tb') _renderTBPanel(host);
    else if (p === 'pbc') _renderPbcPanel(host);
    else if (p === 'wps') _renderWpsPanel(host);
    else if (p === 'notes') _renderNotesPanel(host);
    else if (p === 'sad') _renderSadPanel(host);
    else if (p === 'memos') _renderMemosPanel(host);
    else if (p === 'report') _renderReportPanel(host);
    else if (p === 'time') _renderTimePanel(host);
    else if (p === 'library') _renderLibraryPanel(host);
}

// ── Overview ──

function _renderOverviewPanel(host) {
    const snap = _canvasState.snapshot;
    const eng = snap.engagement;
    const wps = snap.workpapers;
    const byPhase = {};
    wps.forEach(w => {
        byPhase[w.phase || 'autre'] = byPhase[w.phase || 'autre'] || [];
        byPhase[w.phase || 'autre'].push(w);
    });
    const phaseOrder = ['planning', 'risk_assessment', 'walkthrough', 'toc', 'substantive', 'wrap_up', 'reporting'];
    const phaseLabels = {
        planning: '📅 Planning', risk_assessment: '⚡ Risk Assessment',
        walkthrough: '🚶 Walkthrough', toc: '🧪 TOC', substantive: '🔬 Substantive',
        wrap_up: '✅ Wrap-up', reporting: '📄 Reporting'
    };

    host.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <!-- Phase progression -->
            <div class="card" style="padding:16px;border-left:3px solid ${CANVAS_ACCENT}">
                <div style="font-size:13px;font-weight:700;color:${CANVAS_LIGHT};margin-bottom:12px">
                    🎯 Progression par phase
                </div>
                ${phaseOrder.map(p => {
                    const list = byPhase[p] || [];
                    const done = list.filter(w => ['signed', 'reviewed'].includes(w.status)).length;
                    const pct = list.length ? Math.round(100 * done / list.length) : 0;
                    return `
                        <div style="margin-bottom:10px">
                            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                                <span style="color:#cbd5e1">${phaseLabels[p]}</span>
                                <span style="color:${CANVAS_ACCENT}">${done}/${list.length}</span>
                            </div>
                            <div style="height:5px;background:#1e293b;border-radius:3px;overflow:hidden">
                                <div style="height:100%;width:${pct}%;background:${CANVAS_ACCENT};transition:width 0.3s"></div>
                            </div>
                        </div>`;
                }).join('')}
            </div>

            <!-- Infos + SAD summary -->
            <div class="card" style="padding:16px;border-left:3px solid #10b981">
                <div style="font-size:13px;font-weight:700;color:${CANVAS_LIGHT};margin-bottom:12px">
                    🏢 Infos mandat
                </div>
                ${_infoRow('Partner', eng.partner)}
                ${_infoRow('Senior', eng.senior)}
                ${_infoRow('Framework', eng.framework)}
                ${_infoRow('CA', eng.revenue ? 'CHF ' + (eng.revenue).toLocaleString('fr-CH') : '')}
                ${_infoRow('Total bilan', eng.balance_sheet ? 'CHF ' + (eng.balance_sheet).toLocaleString('fr-CH') : '')}
                ${_infoRow('Employés', eng.employees)}
                ${_infoRow('Phase actuelle', eng.current_phase)}
                <div style="margin-top:12px;padding-top:10px;border-top:1px solid #1e293b">
                    <button onclick="_canvasEditEngagement()"
                            style="background:#1e293b;border:1px solid #334155;color:${CANVAS_LIGHT};
                                   padding:6px 12px;border-radius:5px;cursor:pointer;font-size:12px">
                        ✏️ Modifier
                    </button>
                </div>
            </div>
        </div>`;
}

function _infoRow(label, value) {
    return `
        <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #0f172a;font-size:12px">
            <span style="color:#94a3b8">${escapeHtml(label)}</span>
            <span style="color:${CANVAS_LIGHT};font-weight:500">${escapeHtml(value || '—')}</span>
        </div>`;
}

async function _canvasEditEngagement() {
    alert('Édition : Phase panel Overview — possible mais pour l\'instant via TB / Add/Delete WP. Utilise Phases sous-panels pour modifier.');
}

// ── TB Panel ──

function _renderTBPanel(host) {
    const snap = _canvasState.snapshot;
    const tb = snap.engagement.trial_balance || [];
    const fmt = v => (v || 0).toLocaleString('fr-CH', {minimumFractionDigits:0, maximumFractionDigits:0});

    host.innerHTML = `
        <div style="margin-bottom:14px;display:flex;gap:10px;align-items:center">
            <button onclick="_canvasShowTbImport()"
                    style="background:${CANVAS_ACCENT};border:none;color:white;padding:8px 14px;
                           border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">
                📥 Importer / coller TB
            </button>
            <span style="font-size:12px;color:#94a3b8">${tb.length} lignes</span>
        </div>

        ${tb.length === 0 ? `
            <div style="padding:40px;text-align:center;background:#0f172a;border-radius:10px;border:1px dashed #334155">
                <div style="font-size:32px;margin-bottom:8px">📊</div>
                <div style="color:#94a3b8;font-size:13px">Aucune balance. Importe ton TB pour générer les lead schedules automatiquement.</div>
            </div>
        ` : `
            <div class="card" style="border-left:3px solid ${CANVAS_ACCENT};overflow:hidden">
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                    <thead>
                        <tr style="background:#1e1b4b;color:${CANVAS_LIGHT}">
                            <th style="text-align:left;padding:8px 12px">Compte</th>
                            <th style="text-align:left;padding:8px 12px">Libellé</th>
                            <th style="text-align:right;padding:8px 12px">N (CHF)</th>
                            <th style="text-align:right;padding:8px 12px">N-1 (CHF)</th>
                            <th style="text-align:right;padding:8px 12px">Var %</th>
                            <th style="text-align:center;padding:8px 12px">Cycle</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tb.map(r => {
                            const varPct = r.n1 ? ((r.n - r.n1) / Math.abs(r.n1)) * 100 : 0;
                            const varColor = Math.abs(varPct) > 20 ? '#fbbf24' : '#94a3b8';
                            return `
                                <tr style="border-top:1px solid #1e293b">
                                    <td style="padding:6px 12px;color:${CANVAS_ACCENT};font-family:monospace">${escapeHtml(r.compte || '')}</td>
                                    <td style="padding:6px 12px;color:#cbd5e1">${escapeHtml(r.libelle || '')}</td>
                                    <td style="padding:6px 12px;text-align:right;color:#cbd5e1;font-variant-numeric:tabular-nums">${fmt(r.n)}</td>
                                    <td style="padding:6px 12px;text-align:right;color:#94a3b8;font-variant-numeric:tabular-nums">${fmt(r.n1)}</td>
                                    <td style="padding:6px 12px;text-align:right;color:${varColor};font-variant-numeric:tabular-nums">
                                        ${r.n1 ? (varPct > 0 ? '+' : '') + varPct.toFixed(1) + '%' : '—'}
                                    </td>
                                    <td style="padding:6px 12px;text-align:center;color:#64748b;font-size:11px">${escapeHtml(r.cycle || '')}</td>
                                </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `}
    `;
}

function _canvasShowTbImport() {
    const modal = document.createElement('div');
    modal.id = 'tbImportModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `
        <div style="background:#0f172a;border:1px solid ${CANVAS_ACCENT};border-radius:10px;max-width:800px;width:100%;max-height:85vh;overflow:auto;padding:20px">
            <div style="font-size:16px;font-weight:700;color:${CANVAS_LIGHT};margin-bottom:10px">
                📥 Importer Trial Balance
            </div>
            <div style="font-size:12px;color:#94a3b8;margin-bottom:12px;line-height:1.6">
                Colle ton TB au format CSV (séparateur : tabulation ou virgule).<br/>
                <strong>Colonnes attendues :</strong> <code>compte</code>, <code>libelle</code>, <code>n</code>, <code>n1</code>, <code>cycle</code>
                (cycles valides : treso, ventes_ar, achats_ap, stocks, immo, paie, fp, impots)
            </div>
            <textarea id="tbPasteArea" placeholder="1020\tCaisse\t18500\t21000\ttreso&#10;1100\tCréances clients\t2500000\t2200000\tventes_ar&#10;..."
                style="width:100%;min-height:300px;background:#0a0f1c;color:${CANVAS_LIGHT};
                       border:1px solid #334155;border-radius:6px;padding:12px;
                       font-family:'Courier New',monospace;font-size:12px;box-sizing:border-box;resize:vertical"></textarea>
            <div style="margin-top:14px;display:flex;gap:10px;justify-content:flex-end">
                <button onclick="document.getElementById('tbImportModal').remove()"
                        style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                               padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px">
                    Annuler
                </button>
                <button onclick="_canvasImportTbNow()"
                        style="background:${CANVAS_ACCENT};border:none;color:white;
                               padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700">
                    ✓ Importer
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('tbPasteArea')?.focus(), 50);
}

async function _canvasImportTbNow() {
    const text = document.getElementById('tbPasteArea').value.trim();
    if (!text) { alert('Colle ton TB d\'abord.'); return; }
    const rows = _parseTb(text);
    if (rows.length === 0) { alert('Aucune ligne détectée. Vérifie le format.'); return; }
    const r = await api('canvas_import_tb', _canvasState.activeEid, rows);
    document.getElementById('tbImportModal').remove();
    const msg = r && r.ok ? `✓ ${rows.length} ligne(s) importée(s). ${r.leads_created} lead schedule(s) créé(s).` : 'Erreur';
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:20px;right:20px;z-index:1001;background:#10b981;color:white;padding:12px 18px;border-radius:6px;font-size:13px;font-weight:600';
    flash.textContent = msg;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 3000);
    _canvasOpen(_canvasState.activeEid);
}

function _parseTb(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const rows = [];
    for (const line of lines) {
        // Try tab first, then semicolon, then comma
        const parts = line.includes('\t') ? line.split('\t')
                     : line.includes(';') ? line.split(';')
                     : line.split(',');
        if (parts.length < 3) continue;
        const [compte, libelle, n, n1, cycle] = parts.map(p => p.trim());
        rows.push({
            compte: compte || '',
            libelle: libelle || '',
            n: parseFloat((n || '0').replace(/[' ]/g, '').replace(',', '.')) || 0,
            n1: parseFloat((n1 || '0').replace(/[' ]/g, '').replace(',', '.')) || 0,
            cycle: cycle || '',
        });
    }
    return rows;
}

// ── Workpapers panel (hierarchical tree) ──

// Track collapsed nodes in memory (by parent ref)
let _canvasCollapsed = {};

function _wpDepth(ref) {
    // Compute depth from ref pattern: "A" = 0, "A.1" = 1, "A.1.1" = 2, "A.1.1.a" = 3
    if (!ref) return 0;
    const parts = ref.split('.');
    return parts.length - 1;
}

function _wpParentRef(ref) {
    if (!ref) return null;
    const i = ref.lastIndexOf('.');
    if (i <= 0) return null;
    return ref.substring(0, i);
}

function _buildWpTree(list) {
    // Returns an ordered array where children immediately follow their parent.
    // Uses parent_ref if set, otherwise infers from ref dotted structure.
    const byRef = new Map(list.map(w => [w.ref, w]));
    const childrenMap = new Map();
    const roots = [];
    list.forEach(w => {
        const parent = w.parent_ref || _wpParentRef(w.ref);
        if (parent && byRef.has(parent)) {
            if (!childrenMap.has(parent)) childrenMap.set(parent, []);
            childrenMap.get(parent).push(w);
        } else {
            roots.push(w);
        }
    });
    const sortByRef = (a, b) => a.ref.localeCompare(b.ref, undefined, {numeric: true});
    roots.sort(sortByRef);
    childrenMap.forEach(arr => arr.sort(sortByRef));

    const out = [];
    const push = (node, depth) => {
        node._depth = depth;
        node._children = childrenMap.get(node.ref) || [];
        node._hasChildren = node._children.length > 0;
        out.push(node);
        if (!_canvasCollapsed[node.ref]) {
            node._children.forEach(c => push(c, depth + 1));
        }
    };
    roots.forEach(r => push(r, 0));
    return out;
}

function _renderWpsPanel(host) {
    const wps = _canvasState.snapshot.workpapers;
    const phaseOrder = ['planning', 'risk_assessment', 'walkthrough', 'toc', 'substantive', 'wrap_up', 'reporting'];
    const phaseLabels = {
        planning: '📅 Planning', risk_assessment: '⚡ Risk Assessment',
        walkthrough: '🚶 Walkthrough', toc: '🧪 TOC', substantive: '🔬 Substantive',
        wrap_up: '✅ Wrap-up', reporting: '📄 Reporting'
    };
    const byPhase = {};
    wps.forEach(w => {
        const p = w.phase || 'autre';
        byPhase[p] = byPhase[p] || [];
        byPhase[p].push(w);
    });

    host.innerHTML = `
        <div style="margin-bottom:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <button onclick="_canvasAddWp()"
                    style="background:${CANVAS_ACCENT};border:none;color:white;padding:8px 14px;
                           border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">
                + Nouveau WP racine
            </button>
            <button onclick="_canvasExpandAllWps()"
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:7px 12px;border-radius:5px;cursor:pointer;font-size:11px">
                ▾ Tout déplier
            </button>
            <button onclick="_canvasCollapseAllWps()"
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:7px 12px;border-radius:5px;cursor:pointer;font-size:11px">
                ▸ Tout plier
            </button>
            <input type="text" id="wpSearch" placeholder="Rechercher dans les workpapers…"
                   oninput="_filterWps(this.value)"
                   style="flex:1;background:#0f172a;border:1px solid #334155;color:${CANVAS_LIGHT};
                          padding:7px 10px;border-radius:5px;font-size:12px;box-sizing:border-box;min-width:200px" />
        </div>

        ${phaseOrder.map(p => {
            const list = byPhase[p] || [];
            if (list.length === 0) return '';
            const tree = _buildWpTree(list);
            return `
                <div style="margin-bottom:14px">
                    <div style="font-size:12px;font-weight:700;color:${CANVAS_ACCENT};margin-bottom:8px">
                        ${phaseLabels[p] || p} (${list.length})
                    </div>
                    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;overflow:hidden">
                        ${tree.map(w => _renderWpRow(w)).join('')}
                    </div>
                </div>`;
        }).join('')}
    `;
}

function _renderWpRow(w) {
    const statusColor = {
        open: '#64748b', in_progress: '#3b82f6', prepared: '#f59e0b',
        reviewed: '#8b5cf6', signed: '#10b981'
    }[w.status] || '#64748b';
    const statusLabel = {
        open: 'À faire', in_progress: 'En cours', prepared: 'Préparé',
        reviewed: 'Reviewé', signed: 'Signé'
    }[w.status] || w.status;
    const searchHay = ((w.ref||'') + ' ' + (w.title||'') + ' ' + (w.cycle||'') + ' ' + (w.phase||'')).toLowerCase();
    const depth = w._depth || 0;
    const indentPx = depth * 22;
    const isCollapsed = !!_canvasCollapsed[w.ref];
    const hasKids = w._hasChildren;

    return `
        <div class="wp-row" data-wp-search="${searchHay}" data-wp-ref="${escapeHtml(w.ref)}"
             style="display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid #1e293b;
                    transition:background 0.15s;position:relative"
             onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background=''">
            ${depth > 0 ? `<div style="width:${indentPx}px;flex-shrink:0"></div>` : ''}
            ${depth > 0 ? `<div style="color:#475569;font-size:11px;margin-right:-4px">└</div>` : ''}
            <button onclick="_canvasToggleWpNode('${escapeHtml(w.ref)}')"
                    style="background:none;border:none;color:${hasKids ? CANVAS_ACCENT : 'transparent'};
                           cursor:${hasKids ? 'pointer' : 'default'};font-size:10px;width:16px;padding:0;flex-shrink:0"
                    ${!hasKids ? 'disabled' : ''}>
                ${hasKids ? (isCollapsed ? '▸' : '▾') : '·'}
            </button>
            <div onclick="_canvasEditWp(${w.id})"
                 style="font-family:'Courier New',monospace;color:${CANVAS_ACCENT};font-size:11px;
                        font-weight:700;min-width:${60 - depth*8}px;cursor:pointer">
                ${escapeHtml(w.ref)}
            </div>
            <div onclick="_canvasEditWp(${w.id})" style="flex:1;min-width:0;cursor:pointer">
                <div style="font-size:13px;color:${CANVAS_LIGHT};font-weight:${depth === 0 ? '600' : '500'};
                            overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    ${escapeHtml(w.title || '')}
                </div>
                ${w.cycle && depth === 0 ? `<div style="font-size:10px;color:#64748b">${escapeHtml(w.cycle)}</div>` : ''}
            </div>
            ${w.time_hours ? `<div style="font-size:11px;color:#a78bfa">${(w.time_hours).toFixed(1)}h</div>` : ''}
            <span style="font-size:10px;color:white;background:${statusColor};padding:3px 10px;border-radius:10px;font-weight:600;flex-shrink:0">
                ${statusLabel}
            </span>
            <button onclick="_canvasAddChildWp('${escapeHtml(w.ref)}', '${escapeHtml(w.phase || '')}', '${escapeHtml(w.cycle || '')}')"
                    title="Ajouter un sous-WP"
                    style="background:#1e1b4b;border:1px solid #4c1d95;color:#c4b5fd;
                           padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;flex-shrink:0">
                + enfant
            </button>
        </div>`;
}

function _canvasToggleWpNode(ref) {
    _canvasCollapsed[ref] = !_canvasCollapsed[ref];
    _renderCanvasPanel();
}

function _canvasExpandAllWps() {
    _canvasCollapsed = {};
    _renderCanvasPanel();
}

function _canvasCollapseAllWps() {
    const wps = _canvasState.snapshot.workpapers;
    wps.forEach(w => {
        const parts = (w.ref || '').split('.');
        if (parts.length === 1) _canvasCollapsed[w.ref] = true;
    });
    _renderCanvasPanel();
}

async function _canvasAddChildWp(parentRef, phase, cycle) {
    const existing = _canvasState.snapshot.workpapers
        .filter(w => (w.ref || '').startsWith(parentRef + '.'))
        .map(w => {
            const tail = w.ref.substring(parentRef.length + 1).split('.')[0];
            return parseInt(tail, 10) || 0;
        });
    const nextNum = existing.length === 0 ? 1 : Math.max(...existing) + 1;
    const suggestedRef = `${parentRef}.${nextNum}`;
    const ref = prompt(`Référence du sous-WP (parent : ${parentRef}) :`, suggestedRef);
    if (!ref) return;
    const title = prompt('Titre du sous-WP :');
    if (!title) return;
    const r = await api('canvas_create_workpaper', _canvasState.activeEid, {
        ref: ref.trim(),
        parent_ref: parentRef,
        title: title.trim(),
        phase: phase || '',
        cycle: cycle || '',
        status: 'open',
    });
    if (r && r.ok) _canvasOpen(_canvasState.activeEid);
}

function _filterWps(q) {
    const query = (q || '').trim().toLowerCase();
    document.querySelectorAll('.wp-row').forEach(el => {
        el.style.display = (query === '' || (el.dataset.wpSearch || '').includes(query)) ? '' : 'none';
    });
}

async function _canvasAddWp() {
    const ref = prompt('Référence du WP (ex: E.9, F.3.1) :');
    if (!ref) return;
    const title = prompt('Titre du WP :');
    if (!title) return;
    const r = await api('canvas_create_workpaper', _canvasState.activeEid, {
        ref: ref.trim(), title: title.trim(), status: 'open'
    });
    if (r && r.ok) _canvasOpen(_canvasState.activeEid);
}

async function _canvasEditWp(wid) {
    _canvasState.editWpId = wid;
    _canvasState.view = 'wp_edit';
    const host = document.getElementById('auditContent');
    if (host) renderCanvas(host);
}

// ── Workpaper editor (full page) ──

async function _renderWpEditor(container) {
    const wp = await api('canvas_get_workpaper', _canvasState.editWpId);
    if (!wp) { _canvasOpen(_canvasState.activeEid); return; }
    const notes = wp.notes || [];
    const attachments = wp.attachments || [];

    container.innerHTML = `
        <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px">
            <button onclick="_canvasWpBack()"
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:6px 12px;border-radius:5px;cursor:pointer;font-size:12px">← Retour</button>
            <div style="font-family:'Courier New',monospace;color:${CANVAS_ACCENT};font-size:14px;font-weight:800">
                ${escapeHtml(wp.ref)}
            </div>
            <div style="font-size:14px;font-weight:800;color:${CANVAS_LIGHT};flex:1">
                ${escapeHtml(wp.title || '')}
            </div>
            <button onclick="_canvasDeleteWp(${wp.id})"
                    style="background:#3f1612;border:1px solid #7f1d1d;color:#fca5a5;
                           padding:6px 12px;border-radius:5px;cursor:pointer;font-size:11px">
                🗑️
            </button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 320px;gap:14px">
            <!-- Main editor -->
            <div class="card" style="padding:16px;border-left:3px solid ${CANVAS_ACCENT}">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
                    ${_formField('wp_cycle', 'Cycle', 'select', wp.cycle || '', false,
                        ['', 'ventes_ar', 'achats_ap', 'paie', 'stocks', 'immo', 'treso', 'fp', 'impots', 'general'])}
                    ${_formField('wp_phase', 'Phase', 'select', wp.phase || '', false,
                        ['', 'planning', 'risk_assessment', 'walkthrough', 'toc', 'substantive', 'wrap_up', 'reporting'])}
                    ${_formField('wp_status', 'Statut', 'select', wp.status || 'open', false,
                        ['open', 'in_progress', 'prepared', 'reviewed', 'signed'])}
                </div>
                <script>
                    setTimeout(() => {
                        const c = document.getElementById('wp_cycle'); if (c) c.value = '${escapeHtml(wp.cycle || '')}';
                        const p = document.getElementById('wp_phase'); if (p) p.value = '${escapeHtml(wp.phase || '')}';
                        const s = document.getElementById('wp_status'); if (s) s.value = '${escapeHtml(wp.status || 'open')}';
                    }, 50);
                </script>

                ${_wpTextarea('wp_objective', 'Objectif', wp.objective, 3)}
                ${_wpTextarea('wp_procedure', 'Procédures effectuées', wp.procedure, 8)}
                ${_wpTextarea('wp_conclusion', 'Conclusion', wp.conclusion, 3)}

                <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
                    <button onclick="_canvasSaveWp(${wp.id})"
                            style="background:${CANVAS_ACCENT};border:none;color:white;
                                   padding:8px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700">
                        💾 Enregistrer
                    </button>
                    <button onclick="_canvasImportProcedure(${wp.id})"
                            style="background:#0e7490;border:none;color:white;
                                   padding:8px 14px;border-radius:6px;cursor:pointer;font-size:12px">
                        📚 Importer une procédure de la bibliothèque
                    </button>
                    <button onclick="_canvasAddTimeWp(${wp.id})"
                            style="background:#7c3aed;border:none;color:white;
                                   padding:8px 14px;border-radius:6px;cursor:pointer;font-size:12px">
                        ⏱️ Ajouter temps
                    </button>
                </div>
            </div>

            <!-- Side panel : status/signoff + review notes -->
            <div>
                <div class="card" style="padding:14px;margin-bottom:12px;border-left:3px solid #10b981">
                    <div style="font-size:12px;font-weight:700;color:#6ee7b7;margin-bottom:10px">
                        ✍️ Sign-off
                    </div>
                    ${_signOffRow('Préparé par', wp.preparer, wp.prepared_at)}
                    ${_signOffRow('Reviewé par', wp.reviewer, wp.reviewed_at)}
                    ${_signOffRow('Signé par', wp.signer, wp.signed_at)}
                    <div style="margin-top:10px;font-size:11px;color:#94a3b8">
                        Changer le statut (à gauche) met à jour les dates auto.
                    </div>
                </div>

                <div class="card" style="padding:14px;margin-bottom:12px;border-left:3px solid #f59e0b">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                        <div style="font-size:12px;font-weight:700;color:#fbbf24">
                            📝 Review notes (${notes.length})
                        </div>
                        <button onclick="_canvasAddNote(${wp.id})"
                                style="background:#f59e0b;border:none;color:white;
                                       padding:4px 10px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600">
                            + Ajouter
                        </button>
                    </div>
                    ${notes.length === 0 ? `<div style="color:#94a3b8;font-size:12px;text-align:center;padding:12px">Pas de note pour l'instant.</div>`
                        : notes.map(n => _renderNoteCard(n)).join('')}
                </div>

                <div class="card" style="padding:14px;border-left:3px solid #06b6d4">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                        <div style="font-size:12px;font-weight:700;color:#67e8f9">
                            📎 Attachments (${attachments.length})
                        </div>
                        <button onclick="_canvasAddAttachment(${wp.id})"
                                style="background:#0e7490;border:none;color:white;
                                       padding:4px 10px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600">
                            + Fichier
                        </button>
                    </div>
                    ${attachments.length === 0
                        ? `<div style="color:#94a3b8;font-size:12px;text-align:center;padding:12px">Aucun fichier attaché.</div>`
                        : attachments.map(a => _renderAttachmentCard(a)).join('')}
                </div>
            </div>
        </div>`;
}

function _renderAttachmentCard(a) {
    const ext = (a.filename || '').split('.').pop().toLowerCase();
    const iconMap = {pdf:'📄', xlsx:'📊', xls:'📊', docx:'📝', doc:'📝', png:'🖼️', jpg:'🖼️', jpeg:'🖼️', csv:'📋', txt:'📃'};
    const icon = iconMap[ext] || '📎';
    const size = a.size_bytes ? (a.size_bytes < 1024 ? a.size_bytes + ' B' : (a.size_bytes / 1024).toFixed(1) + ' KB') : '';
    return `
        <div style="padding:8px 10px;margin-bottom:6px;background:#0a0f1c;border-left:3px solid #06b6d4;border-radius:4px">
            <div style="display:flex;align-items:center;gap:8px">
                <div style="font-size:18px">${icon}</div>
                <div style="flex:1;min-width:0">
                    <div style="font-size:12px;color:${CANVAS_LIGHT};font-weight:500;
                                overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                        ${escapeHtml(a.filename || '')}
                    </div>
                    <div style="font-size:10px;color:#64748b">
                        ${size ? size + ' · ' : ''}${new Date(a.uploaded_at).toLocaleDateString('fr-CH')}
                    </div>
                </div>
            </div>
            ${a.description ? `<div style="font-size:11px;color:#94a3b8;margin-top:4px;padding-left:26px;font-style:italic">${escapeHtml(a.description)}</div>` : ''}
            <div style="margin-top:6px;padding-left:26px;display:flex;gap:6px">
                <button onclick="_canvasOpenAttachment('${escapeHtml(a.file_path || '')}')"
                        style="background:#1e293b;border:1px solid #334155;color:#67e8f9;padding:2px 8px;
                               border-radius:4px;cursor:pointer;font-size:10px">📂 Ouvrir</button>
                <button onclick="_canvasDeleteAttachment(${a.id})"
                        style="background:#3f1612;border:1px solid #7f1d1d;color:#fca5a5;padding:2px 8px;
                               border-radius:4px;cursor:pointer;font-size:10px">🗑️</button>
            </div>
        </div>`;
}

async function _canvasAddAttachment(wid) {
    const desc = prompt('Description (optionnel) :', '') || '';
    const r = await api('canvas_add_attachment', wid, _canvasState.activeEid, null, desc);
    if (r && r.ok) {
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;top:20px;right:20px;z-index:1001;background:#06b6d4;color:white;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:600';
        flash.textContent = `✓ ${r.filename} attaché`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 2000);
        const host = document.getElementById('auditContent');
        if (host) renderCanvas(host);
    } else if (r && !r.cancelled) {
        alert('Erreur : ' + (r && r.error || 'inconnue'));
    }
}

async function _canvasOpenAttachment(filePath) {
    if (!filePath) return;
    const r = await api('canvas_open_attachment', filePath);
    if (r && !r.ok) alert('Erreur : ' + (r.error || 'fichier introuvable'));
}

async function _canvasDeleteAttachment(aid) {
    if (!confirm('Supprimer cet attachment ? (le fichier original n\'est pas effacé)')) return;
    await api('canvas_delete_attachment', aid);
    const host = document.getElementById('auditContent');
    if (host) renderCanvas(host);
}

function _wpTextarea(id, label, val, rows) {
    return `
        <div style="margin-top:12px">
            <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">${escapeHtml(label)}</label>
            <textarea id="${id}" rows="${rows}"
                      style="width:100%;background:#0a0f1c;color:${CANVAS_LIGHT};
                             border:1px solid #334155;border-radius:5px;padding:8px 10px;
                             font-family:inherit;font-size:13px;box-sizing:border-box;resize:vertical;line-height:1.5">${escapeHtml(val || '')}</textarea>
        </div>`;
}

function _signOffRow(label, name, at) {
    return `
        <div style="padding:6px 0;border-bottom:1px solid #0f172a;font-size:11px">
            <div style="color:#94a3b8">${escapeHtml(label)}</div>
            <div style="color:${CANVAS_LIGHT};font-weight:500;margin-top:2px">
                ${name ? escapeHtml(name) : '<em style="color:#64748b">Non signé</em>'}
                ${at ? `<span style="color:#64748b;font-size:10px"> · ${new Date(at).toLocaleDateString('fr-CH')}</span>` : ''}
            </div>
        </div>`;
}

function _renderNoteCard(n) {
    const colors = { open:'#f59e0b', responded:'#3b82f6', cleared:'#10b981' };
    const color = colors[n.status] || '#64748b';
    const labels = { open:'Ouvert', responded:'Répondu', cleared:'Clos' };
    return `
        <div style="padding:8px 10px;margin-bottom:6px;background:#0a0f1c;border-left:3px solid ${color};border-radius:4px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:10px;color:${color};font-weight:700;text-transform:uppercase">${labels[n.status]}</span>
                <span style="font-size:10px;color:#64748b">${escapeHtml(n.author || '')}</span>
            </div>
            <div style="color:${CANVAS_LIGHT};font-size:12px;line-height:1.5">${escapeHtml(n.note || '')}</div>
            ${n.response ? `
                <div style="margin-top:6px;padding:6px 8px;background:#1e1b4b;border-radius:4px;font-size:11px;color:#c4b5fd">
                    <strong>Réponse :</strong> ${escapeHtml(n.response)}
                </div>` : ''}
            <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">
                ${n.status === 'open' ? `<button onclick="_canvasRespondNote(${n.id})"
                    style="background:#1e293b;border:1px solid #334155;color:#93c5fd;padding:2px 8px;
                           border-radius:4px;cursor:pointer;font-size:10px">Répondre</button>` : ''}
                ${n.status !== 'cleared' ? `<button onclick="_canvasClearNote(${n.id})"
                    style="background:#022c22;border:1px solid #10b981;color:#6ee7b7;padding:2px 8px;
                           border-radius:4px;cursor:pointer;font-size:10px">Clore</button>` : ''}
                <button onclick="_canvasDeleteNote(${n.id})"
                    style="background:#3f1612;border:1px solid #7f1d1d;color:#fca5a5;padding:2px 8px;
                           border-radius:4px;cursor:pointer;font-size:10px">🗑️</button>
            </div>
        </div>`;
}

async function _canvasSaveWp(wid) {
    const data = {
        cycle: document.getElementById('wp_cycle').value,
        phase: document.getElementById('wp_phase').value,
        status: document.getElementById('wp_status').value,
        objective: document.getElementById('wp_objective').value,
        procedure: document.getElementById('wp_procedure').value,
        conclusion: document.getElementById('wp_conclusion').value,
    };
    // Auto-fill preparer/reviewer/signer on status change
    if (data.status === 'prepared') data.preparer = prompt('Tes initiales (préparé par) :', 'JD') || 'JD';
    else if (data.status === 'reviewed') data.reviewer = prompt('Initiales reviewer :', 'SM') || 'SM';
    else if (data.status === 'signed') data.signer = prompt('Initiales partner :', 'PD') || 'PD';

    await api('canvas_update_workpaper', wid, data);
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:20px;right:20px;z-index:1001;background:#10b981;color:white;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:600';
    flash.textContent = '✓ Enregistré';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 1500);
    // Re-render
    const host = document.getElementById('auditContent');
    if (host) renderCanvas(host);
}

async function _canvasDeleteWp(wid) {
    if (!confirm('Supprimer ce workpaper ?')) return;
    await api('canvas_delete_workpaper', wid);
    _canvasOpen(_canvasState.activeEid);
}

function _canvasWpBack() {
    _canvasState.view = 'cockpit';
    _canvasState.panel = 'wps';
    _canvasState.editWpId = null;
    const host = document.getElementById('auditContent');
    if (host) renderCanvas(host);
}

// ── Import procedure from library ──

function _canvasImportProcedure(wid) {
    const lib = _canvasState.library || {};
    const procs = lib.procedures || {};
    const modal = document.createElement('div');
    modal.id = 'procModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = `
        <div style="background:#0f172a;border:1px solid ${CANVAS_ACCENT};border-radius:10px;max-width:880px;width:100%;max-height:85vh;overflow:auto;padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
                <div style="font-size:16px;font-weight:700;color:${CANVAS_LIGHT}">
                    📚 Bibliothèque — Choisis une procédure
                </div>
                <button onclick="document.getElementById('procModal').remove()"
                        style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer">✕</button>
            </div>
            ${Object.entries(procs).map(([cycle, c]) => `
                <div style="margin-bottom:14px">
                    <div style="font-size:12px;font-weight:700;color:${CANVAS_ACCENT};margin-bottom:6px">
                        ${escapeHtml(c.cycle_label || cycle)}
                    </div>
                    ${(c.items || []).map((it, i) => `
                        <div onclick="_canvasApplyProc(${wid}, '${cycle}', ${i})"
                             style="padding:10px 12px;margin-bottom:6px;background:#0a0f1c;border-left:3px solid ${CANVAS_ACCENT};
                                    border-radius:4px;cursor:pointer;transition:background 0.15s"
                             onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#0a0f1c'">
                            <div style="font-size:12px;font-weight:700;color:${CANVAS_LIGHT}">
                                ${escapeHtml(it.title)}
                            </div>
                            <div style="font-size:11px;color:#94a3b8;margin-top:4px;line-height:1.5">
                                ${escapeHtml(it.procedure.substring(0, 150))}…
                            </div>
                            ${it.assertion ? `<div style="font-size:10px;color:#a78bfa;margin-top:4px">Assertion : ${escapeHtml(it.assertion)}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>`;
    document.body.appendChild(modal);
}

async function _canvasApplyProc(wid, cycle, idx) {
    const it = _canvasState.library?.procedures?.[cycle]?.items?.[idx];
    if (!it) return;
    // Append to procedure field
    const ta = document.getElementById('wp_procedure');
    if (ta) {
        const sep = ta.value.trim() ? '\n\n' : '';
        ta.value += sep + it.procedure;
    }
    // Fill cycle & assertion if empty
    const ca = document.getElementById('wp_cycle');
    if (ca && !ca.value) ca.value = cycle;
    document.getElementById('procModal').remove();
    // Flash
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:20px;right:20px;z-index:1001;background:#0e7490;color:white;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:600';
    flash.textContent = '✓ Procédure ajoutée. Clique "Enregistrer" pour sauvegarder.';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 3000);
}

// ── Review Notes panel (global) ──

function _renderNotesPanel(host) {
    const notes = _canvasState.snapshot.review_notes || [];
    host.innerHTML = `
        <div style="margin-bottom:14px;font-size:13px;color:#94a3b8">
            ${notes.length} note(s) au total · ${notes.filter(n => n.status === 'open').length} ouvertes
        </div>
        ${notes.length === 0 ? `
            <div style="padding:32px;text-align:center;background:#0f172a;border-radius:10px;border:1px dashed #334155;color:#94a3b8;font-size:13px">
                Aucune review note. Ajoute depuis un workpaper.
            </div>
        ` : notes.map(n => {
            const colors = { open:'#f59e0b', responded:'#3b82f6', cleared:'#10b981' };
            const color = colors[n.status] || '#64748b';
            return `
                <div class="card" style="padding:12px 14px;margin-bottom:10px;border-left:3px solid ${color}">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                        <div>
                            <span style="font-family:monospace;color:${CANVAS_ACCENT};font-size:12px;font-weight:700">${escapeHtml(n.wp_ref || '')}</span>
                            <span style="color:#cbd5e1;font-size:12px;margin-left:8px">${escapeHtml(n.wp_title || '')}</span>
                        </div>
                        <span style="font-size:10px;color:${color};font-weight:700;text-transform:uppercase">${escapeHtml(n.status || '')}</span>
                    </div>
                    <div style="color:${CANVAS_LIGHT};font-size:13px;line-height:1.5">${escapeHtml(n.note || '')}</div>
                    ${n.response ? `
                        <div style="margin-top:6px;padding:6px 10px;background:#1e1b4b;border-radius:4px;font-size:12px;color:#c4b5fd">
                            <strong>Réponse :</strong> ${escapeHtml(n.response)}
                        </div>` : ''}
                </div>`;
        }).join('')}
    `;
}

async function _canvasAddNote(wid) {
    const note = prompt('Review note :');
    if (!note) return;
    const author = prompt('Auteur (initiales) :', 'SM') || 'SM';
    await api('canvas_add_note', wid, {note, author});
    const host = document.getElementById('auditContent');
    if (host) renderCanvas(host);
}

async function _canvasRespondNote(nid) {
    const resp = prompt('Ta réponse :');
    if (!resp) return;
    await api('canvas_respond_note', nid, resp);
    const host = document.getElementById('auditContent');
    if (host) renderCanvas(host);
}

async function _canvasClearNote(nid) {
    await api('canvas_clear_note', nid);
    const host = document.getElementById('auditContent');
    if (host) renderCanvas(host);
}

async function _canvasDeleteNote(nid) {
    if (!confirm('Supprimer cette note ?')) return;
    await api('canvas_delete_note', nid);
    const host = document.getElementById('auditContent');
    if (host) renderCanvas(host);
}

// ── SAD panel ──

function _renderSadPanel(host) {
    const sad = _canvasState.snapshot.sad || [];
    const eng = _canvasState.snapshot.engagement;
    const fmt = v => (v || 0).toLocaleString('fr-CH', {minimumFractionDigits:0, maximumFractionDigits:0, signDisplay: 'auto'});
    const totalPl = sad.reduce((s, x) => s + (x.amount_impact_pl || 0), 0);
    const mat = eng.materiality_pm || 0;
    const exceeds = Math.abs(totalPl) > mat;

    host.innerHTML = `
        <div style="margin-bottom:14px;display:flex;gap:10px;align-items:center">
            <button onclick="_canvasAddSad()"
                    style="background:${CANVAS_ACCENT};border:none;color:white;padding:8px 14px;
                           border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">
                + Ajouter une anomalie
            </button>
            <span style="font-size:12px;color:#94a3b8">${sad.length} item(s)</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
            <div class="card" style="padding:12px;text-align:center;border-left:3px solid ${CANVAS_ACCENT}">
                <div style="font-size:10px;color:#94a3b8">Total impact P&L</div>
                <div style="font-size:18px;font-weight:800;color:${exceeds ? '#ef4444' : '#10b981'};margin-top:2px">
                    CHF ${fmt(totalPl)}
                </div>
            </div>
            <div class="card" style="padding:12px;text-align:center;border-left:3px solid ${CANVAS_ACCENT}">
                <div style="font-size:10px;color:#94a3b8">Matérialité (PM)</div>
                <div style="font-size:18px;font-weight:800;color:${CANVAS_LIGHT};margin-top:2px">
                    CHF ${fmt(mat)}
                </div>
            </div>
            <div class="card" style="padding:12px;text-align:center;border-left:3px solid ${exceeds ? '#ef4444' : '#10b981'}">
                <div style="font-size:10px;color:#94a3b8">Verdict</div>
                <div style="font-size:14px;font-weight:800;color:${exceeds ? '#ef4444' : '#10b981'};margin-top:2px;padding:4px 0">
                    ${exceeds ? '⚠️ SAD > matérialité' : '✓ Sous matérialité'}
                </div>
            </div>
        </div>

        ${sad.length === 0 ? `
            <div style="padding:32px;text-align:center;background:#0f172a;border-radius:10px;border:1px dashed #334155;color:#94a3b8;font-size:13px">
                Aucune anomalie enregistrée. Ajoute avec le bouton ci-dessus.
            </div>
        ` : `
            <div class="card" style="overflow:hidden;border-left:3px solid ${CANVAS_ACCENT}">
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                    <thead>
                        <tr style="background:#1e1b4b;color:${CANVAS_LIGHT}">
                            <th style="text-align:left;padding:8px 12px;width:50px">#</th>
                            <th style="text-align:left;padding:8px 12px">Description</th>
                            <th style="text-align:left;padding:8px 12px">Cycle</th>
                            <th style="text-align:right;padding:8px 12px">P&L</th>
                            <th style="text-align:right;padding:8px 12px">Actifs</th>
                            <th style="text-align:right;padding:8px 12px">Passifs</th>
                            <th style="text-align:center;padding:8px 12px">Corrigé</th>
                            <th style="padding:8px 12px"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sad.map((s, i) => `
                            <tr style="border-top:1px solid #1e293b">
                                <td style="padding:6px 12px;color:${CANVAS_ACCENT};font-weight:700">${i + 1}</td>
                                <td style="padding:6px 12px;color:#cbd5e1">${escapeHtml(s.description)}</td>
                                <td style="padding:6px 12px;color:#94a3b8;font-size:11px">${escapeHtml(s.cycle || '')}</td>
                                <td style="padding:6px 12px;text-align:right;color:${s.amount_impact_pl ? '#cbd5e1' : '#64748b'}">${fmt(s.amount_impact_pl)}</td>
                                <td style="padding:6px 12px;text-align:right;color:${s.amount_impact_assets ? '#cbd5e1' : '#64748b'}">${fmt(s.amount_impact_assets)}</td>
                                <td style="padding:6px 12px;text-align:right;color:${s.amount_impact_liab ? '#cbd5e1' : '#64748b'}">${fmt(s.amount_impact_liab)}</td>
                                <td style="padding:6px 12px;text-align:center">
                                    <input type="checkbox" ${s.corrected ? 'checked' : ''}
                                           onchange="_canvasToggleSad(${s.id}, this.checked)" />
                                </td>
                                <td style="padding:6px 12px;text-align:right">
                                    <button onclick="_canvasDeleteSad(${s.id})"
                                        style="background:#3f1612;border:1px solid #7f1d1d;color:#fca5a5;padding:3px 8px;
                                               border-radius:4px;cursor:pointer;font-size:10px">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `}
    `;
}

async function _canvasAddSad() {
    const description = prompt('Description de l\'anomalie :');
    if (!description) return;
    const amount = parseFloat(prompt('Impact P&L (CHF, + ou -) :', '0')) || 0;
    const cycle = prompt('Cycle (ex: ventes_ar, stocks, paie...) :', '') || '';
    await api('canvas_add_sad', _canvasState.activeEid, {
        description, amount_impact_pl: amount, cycle
    });
    _canvasOpen(_canvasState.activeEid);
}

async function _canvasToggleSad(sid, corrected) {
    await api('canvas_update_sad', sid, {corrected});
}

async function _canvasDeleteSad(sid) {
    if (!confirm('Supprimer cette anomalie ?')) return;
    await api('canvas_delete_sad', sid);
    _canvasOpen(_canvasState.activeEid);
}

// ── Time panel ──

function _renderTimePanel(host) {
    const entries = _canvasState.snapshot.time_entries || [];
    const total = entries.reduce((s, t) => s + (t.hours || 0), 0);
    const wps = _canvasState.snapshot.workpapers;
    const wpMap = Object.fromEntries(wps.map(w => [w.id, w]));

    host.innerHTML = `
        <div style="margin-bottom:14px;display:flex;gap:10px;align-items:center">
            <div class="card" style="padding:8px 14px;border-left:3px solid #a78bfa">
                <span style="font-size:11px;color:#94a3b8">Total : </span>
                <span style="font-size:18px;font-weight:800;color:#a78bfa">${total.toFixed(1)}h</span>
            </div>
        </div>

        ${entries.length === 0 ? `
            <div style="padding:32px;text-align:center;background:#0f172a;border-radius:10px;border:1px dashed #334155;color:#94a3b8;font-size:13px">
                Aucun temps enregistré. Ouvre un workpaper et clique "⏱️ Ajouter temps".
            </div>
        ` : `
            <div class="card" style="overflow:hidden;border-left:3px solid #a78bfa">
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                    <thead>
                        <tr style="background:#1e1b4b;color:${CANVAS_LIGHT}">
                            <th style="text-align:left;padding:8px 12px">Date</th>
                            <th style="text-align:left;padding:8px 12px">WP</th>
                            <th style="text-align:left;padding:8px 12px">Membre</th>
                            <th style="text-align:right;padding:8px 12px">Heures</th>
                            <th style="text-align:left;padding:8px 12px">Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entries.map(t => {
                            const wp = wpMap[t.workpaper_id];
                            return `
                                <tr style="border-top:1px solid #1e293b">
                                    <td style="padding:6px 12px;color:#94a3b8">${t.entry_date || ''}</td>
                                    <td style="padding:6px 12px;font-family:monospace;color:${CANVAS_ACCENT}">${wp ? escapeHtml(wp.ref) : '—'}</td>
                                    <td style="padding:6px 12px;color:#cbd5e1">${escapeHtml(t.member || '')}</td>
                                    <td style="padding:6px 12px;text-align:right;color:#a78bfa;font-weight:700">${(t.hours || 0).toFixed(1)}h</td>
                                    <td style="padding:6px 12px;color:#94a3b8;font-size:11px">${escapeHtml(t.description || '')}</td>
                                </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `}
    `;
}

async function _canvasAddTimeWp(wid) {
    const hours = parseFloat(prompt('Heures (ex 2.5) :', '0')) || 0;
    if (hours <= 0) return;
    const member = prompt('Membre (initiales) :', 'JD') || 'JD';
    const desc = prompt('Description (optionnel) :', '') || '';
    await api('canvas_add_time', _canvasState.activeEid, wid, hours, member, desc);
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:20px;right:20px;z-index:1001;background:#a78bfa;color:white;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:600';
    flash.textContent = `✓ ${hours}h ajoutées`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 2000);
    const host = document.getElementById('auditContent');
    if (host) renderCanvas(host);
}

// ── Library panel ──

function _renderLibraryPanel(host) {
    const lib = _canvasState.library || {};
    const procs = lib.procedures || {};
    const tm = lib.tickmark_legend || {items: []};

    host.innerHTML = `
        <div style="margin-bottom:16px;padding:12px 16px;background:#1e1b4b;border-left:3px solid ${CANVAS_ACCENT};
                    border-radius:6px;font-size:12px;color:#c4b5fd;line-height:1.6">
            📚 Bibliothèque de procédures réutilisables. Pour importer dans un WP : ouvre le WP → clique "📚 Importer une procédure".
        </div>

        ${Object.entries(procs).map(([cycle, c]) => `
            <div style="margin-bottom:18px">
                <div style="font-size:14px;font-weight:700;color:${CANVAS_ACCENT};margin-bottom:10px">
                    ${escapeHtml(c.cycle_label || cycle)} (${(c.items || []).length})
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:10px">
                    ${(c.items || []).map(it => `
                        <div class="card" style="padding:12px;border-left:3px solid ${CANVAS_ACCENT}">
                            <div style="font-size:12px;font-weight:700;color:${CANVAS_LIGHT};margin-bottom:6px">
                                ${escapeHtml(it.title)}
                            </div>
                            <div style="font-size:11px;color:#cbd5e1;line-height:1.5;margin-bottom:8px">
                                ${escapeHtml(it.procedure)}
                            </div>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:10px">
                                ${it.assertion ? `<span style="color:#a78bfa;background:#1e1b4b;padding:2px 8px;border-radius:10px">${escapeHtml(it.assertion)}</span>` : ''}
                                ${it.exam_ref ? `<span style="color:#6ee7b7;background:#022c22;padding:2px 8px;border-radius:10px">📚 ${escapeHtml(it.exam_ref)}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')}

        <div style="margin-top:20px">
            <div style="font-size:14px;font-weight:700;color:${CANVAS_ACCENT};margin-bottom:10px">
                🏷️ Légende Tickmarks
            </div>
            <div class="card" style="padding:14px;border-left:3px solid ${CANVAS_ACCENT}">
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px">
                    ${(tm.items || []).map(t => `
                        <div style="display:flex;gap:10px;align-items:center;padding:6px 10px;background:#0a0f1c;border-radius:5px">
                            <div style="font-size:16px;font-weight:800;color:${CANVAS_ACCENT};width:30px;text-align:center">${escapeHtml(t.symbol)}</div>
                            <div style="color:#cbd5e1;font-size:12px">${escapeHtml(t.meaning)}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// ══════════════════════════════════════════════════
// ÉTAPE 3 — Completion memos (4 templates structurés)
// ══════════════════════════════════════════════════

const MEMO_TYPES = [
    {
        id: 'going_concern',
        title: 'Going Concern Assessment',
        icon: '🔍',
        nas: 'NAS 570',
        color: '#f59e0b',
        description: 'Évaluation de la continuité d\'exploitation sur 12 mois'
    },
    {
        id: 'subsequent',
        title: 'Subsequent Events Review',
        icon: '📅',
        nas: 'NAS 560',
        color: '#3b82f6',
        description: 'Revue des événements postérieurs à la clôture'
    },
    {
        id: 'mrl',
        title: 'Management Representation Letter',
        icon: '✍️',
        nas: 'NAS 580',
        color: '#10b981',
        description: 'Lettre d\'affirmation signée par la direction'
    },
    {
        id: 'nas260',
        title: 'Communication gouvernance (NAS 260)',
        icon: '📢',
        nas: 'NAS 260',
        color: '#8b5cf6',
        description: 'Communication écrite au CA / comité d\'audit'
    },
];

function _renderMemosPanel(host) {
    const memos = _canvasState.snapshot.memos || [];
    const memoByType = Object.fromEntries(memos.map(m => [m.memo_type, m]));

    host.innerHTML = `
        <div style="margin-bottom:14px;font-size:12px;color:#94a3b8">
            4 memos structurés obligatoires en fin de mission. Remplis progressivement pendant le wrap-up.
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px">
            ${MEMO_TYPES.map(t => {
                const m = memoByType[t.id];
                const finalized = m && m.finalized;
                const statusLabel = finalized ? '✓ Finalisé' : (m ? '✏️ Draft' : '○ À démarrer');
                const statusColor = finalized ? '#10b981' : (m ? '#f59e0b' : '#64748b');
                return `
                    <div onclick="_canvasEditMemo('${t.id}')"
                         class="card" style="padding:16px;cursor:pointer;border-left:3px solid ${t.color};
                                              transition:transform 0.15s,background 0.15s"
                         onmouseover="this.style.transform='translateY(-2px)';this.style.background='#1e1b4b'"
                         onmouseout="this.style.transform='';this.style.background=''">
                        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
                            <div style="font-size:24px">${t.icon}</div>
                            <div style="flex:1">
                                <div style="font-size:14px;font-weight:800;color:${CANVAS_LIGHT}">${escapeHtml(t.title)}</div>
                                <div style="font-size:11px;color:${t.color};margin-top:2px">📚 ${escapeHtml(t.nas)}</div>
                            </div>
                        </div>
                        <div style="font-size:12px;color:#94a3b8;line-height:1.5;margin-bottom:10px">
                            ${escapeHtml(t.description)}
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px">
                            <span style="color:${statusColor};font-weight:700">${statusLabel}</span>
                            ${m && m.updated_at ? `<span style="color:#64748b">${new Date(m.updated_at).toLocaleDateString('fr-CH')}</span>` : ''}
                        </div>
                    </div>`;
            }).join('')}
        </div>
    `;
}

let _memoEditorType = null;

async function _canvasEditMemo(memoType) {
    _memoEditorType = memoType;
    const m = await api('canvas_get_memo', _canvasState.activeEid, memoType);
    _renderMemoEditor(m ? m.content || {} : {}, m ? m.finalized : false);
}

function _renderMemoEditor(content, finalized) {
    const t = MEMO_TYPES.find(x => x.id === _memoEditorType);
    if (!t) return;

    const host = document.getElementById('canvasPanelContent');
    const forms = {
        going_concern: _memoFormGoingConcern,
        subsequent: _memoFormSubsequent,
        mrl: _memoFormMRL,
        nas260: _memoFormNAS260,
    };
    const formHtml = (forms[t.id] || (() => ''))(content);

    host.innerHTML = `
        <div style="margin-bottom:14px;display:flex;align-items:center;gap:10px">
            <button onclick="_canvasBackToMemos()"
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:6px 12px;border-radius:5px;cursor:pointer;font-size:12px">← Retour</button>
            <div style="font-size:24px">${t.icon}</div>
            <div style="flex:1">
                <div style="font-size:16px;font-weight:800;color:${CANVAS_LIGHT}">${escapeHtml(t.title)}</div>
                <div style="font-size:11px;color:${t.color}">${escapeHtml(t.nas)}</div>
            </div>
            ${finalized ? `<span style="background:#10b981;color:white;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:700">✓ FINALISÉ</span>` : ''}
        </div>

        <div class="card" style="padding:18px;border-left:3px solid ${t.color};max-width:940px">
            ${formHtml}
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid #1e293b;display:flex;gap:10px;flex-wrap:wrap">
                <button onclick="_canvasSaveMemo(false)"
                        style="background:${CANVAS_ACCENT};border:none;color:white;
                               padding:10px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700">
                    💾 Enregistrer (draft)
                </button>
                <button onclick="_canvasSaveMemo(true)"
                        style="background:#10b981;border:none;color:white;
                               padding:10px 18px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700">
                    ✓ Finaliser
                </button>
                <button onclick="_canvasCopyMemo()"
                        style="background:#1e293b;border:1px solid #334155;color:${CANVAS_LIGHT};
                               padding:10px 18px;border-radius:6px;cursor:pointer;font-size:13px">
                    📋 Copier format texte
                </button>
            </div>
        </div>`;
}

function _canvasBackToMemos() {
    _memoEditorType = null;
    _canvasState.panel = 'memos';
    _renderCanvasPanel();
}

function _collectMemoForm() {
    const t = _memoEditorType;
    const f = (id) => {
        const el = document.getElementById(id);
        if (!el) return undefined;
        if (el.type === 'checkbox') return el.checked;
        if (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return el.value;
        return el.value;
    };
    const fArr = (id) => (f(id) || '').split('\n').map(s => s.trim()).filter(Boolean);

    if (t === 'going_concern') {
        return {
            horizon_start: f('m_horizon_start'),
            horizon_end: f('m_horizon_end'),
            indicators_financial: fArr('m_ind_financial'),
            indicators_operational: fArr('m_ind_operational'),
            indicators_other: fArr('m_ind_other'),
            management_plans: f('m_mgmt_plans'),
            evidence_obtained: f('m_evidence'),
            co_725a: f('m_co725a'),
            co_725b: f('m_co725b'),
            conclusion: f('m_conclusion'),
            impact_rapport: f('m_impact'),
        };
    }
    if (t === 'subsequent') {
        return {
            period_start: f('m_period_start'),
            period_end: f('m_period_end'),
            procedures_performed: f('m_procedures'),
            type1_events: fArr('m_type1'),
            type2_events: fArr('m_type2'),
            post_rapport_procedures: f('m_post_rapport'),
            conclusion: f('m_conclusion'),
        };
    }
    if (t === 'mrl') {
        return {
            date: f('m_date'),
            signed_by_ceo: f('m_ceo'),
            signed_by_cfo: f('m_cfo'),
            aff_responsibility: f('m_aff1'),
            aff_completeness: f('m_aff2'),
            aff_framework: f('m_aff3'),
            aff_related_parties: f('m_aff4'),
            aff_subsequent: f('m_aff5'),
            aff_fraud: f('m_aff6'),
            aff_litigation: f('m_aff7'),
            aff_going_concern: f('m_aff8'),
            specific_affirmations: f('m_specific'),
            notes: f('m_notes'),
        };
    }
    if (t === 'nas260') {
        return {
            date_sent: f('m_date'),
            recipients: f('m_recipients'),
            scope: f('m_scope'),
            independence: f('m_independence'),
            significant_judgments: f('m_judgments'),
            uncorrected_misstatements: f('m_sad'),
            control_deficiencies: f('m_sci'),
            kam_proposed: f('m_kam'),
            other: f('m_other'),
        };
    }
    return {};
}

async function _canvasSaveMemo(finalize) {
    const content = _collectMemoForm();
    await api('canvas_save_memo', _canvasState.activeEid, _memoEditorType, content, finalize);
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:20px;right:20px;z-index:1001;background:#10b981;color:white;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:600';
    flash.textContent = finalize ? '✓ Memo finalisé' : '✓ Enregistré';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 1500);
    if (finalize) _canvasBackToMemos();
    _canvasOpen(_canvasState.activeEid);
}

function _canvasCopyMemo() {
    const content = _collectMemoForm();
    const t = MEMO_TYPES.find(x => x.id === _memoEditorType);
    let text = `${t.title} (${t.nas})\n\n`;
    Object.entries(content).forEach(([k, v]) => {
        if (!v || (Array.isArray(v) && !v.length)) return;
        const val = Array.isArray(v) ? '\n- ' + v.join('\n- ') : v;
        text += `${k.toUpperCase()} :\n${val}\n\n`;
    });
    navigator.clipboard?.writeText(text).then(() => {
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;top:20px;right:20px;z-index:1001;background:#3b82f6;color:white;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:600';
        flash.textContent = '✓ Copié dans le presse-papiers';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 1500);
    });
}

// Form helpers
function _mField(id, label, type, value, placeholder) {
    const v = value || '';
    if (type === 'textarea') {
        return `
            <div style="margin-bottom:12px">
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">${escapeHtml(label)}</label>
                <textarea id="${id}" rows="4" placeholder="${escapeHtml(placeholder || '')}"
                    style="width:100%;background:#0a0f1c;color:${CANVAS_LIGHT};border:1px solid #334155;
                           border-radius:5px;padding:8px 10px;font-family:inherit;font-size:13px;
                           box-sizing:border-box;resize:vertical;line-height:1.5">${escapeHtml(v)}</textarea>
            </div>`;
    }
    return `
        <div style="margin-bottom:12px">
            <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">${escapeHtml(label)}</label>
            <input type="${type}" id="${id}" value="${escapeHtml(v)}" placeholder="${escapeHtml(placeholder || '')}"
                style="width:100%;background:#0a0f1c;color:${CANVAS_LIGHT};border:1px solid #334155;
                       border-radius:5px;padding:8px 10px;font-size:13px;box-sizing:border-box" />
        </div>`;
}

function _mSection(title, color, inner) {
    return `
        <div style="margin-bottom:16px;padding:12px 14px;background:#0a0f1c;border-left:3px solid ${color};border-radius:6px">
            <div style="font-size:12px;font-weight:700;color:${color};margin-bottom:10px">${escapeHtml(title)}</div>
            ${inner}
        </div>`;
}

function _memoFormGoingConcern(c) {
    return `
        <div style="padding:10px 14px;margin-bottom:14px;background:#422006;border-left:3px solid #fbbf24;border-radius:5px;font-size:12px;color:#fde68a">
            <strong>Contexte NAS 570 :</strong> évaluation obligatoire sur min. 12 mois depuis la date des comptes.
            Suisse : attention aux CO 725a (perte capital) et CO 725b (surendettement).
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${_mField('m_horizon_start', 'Horizon — début (date bilan)', 'date', c.horizon_start)}
            ${_mField('m_horizon_end', 'Horizon — fin (min. +12 mois)', 'date', c.horizon_end)}
        </div>
        ${_mSection('🚨 Indicateurs de menace identifiés', '#ef4444', `
            ${_mField('m_ind_financial', 'Indicateurs financiers (1 par ligne)', 'textarea',
                (c.indicators_financial || []).join('\n'),
                'Pertes récurrentes\nFonds propres négatifs\nRupture de covenants...')}
            ${_mField('m_ind_operational', 'Indicateurs opérationnels (1 par ligne)', 'textarea',
                (c.indicators_operational || []).join('\n'),
                'Départ direction clé\nPerte client majeur...')}
            ${_mField('m_ind_other', 'Autres indicateurs (1 par ligne)', 'textarea',
                (c.indicators_other || []).join('\n'),
                'Litiges majeurs\nChangement réglementaire...')}
        `)}
        ${_mField('m_mgmt_plans', 'Plans de la direction', 'textarea', c.management_plans,
            'Cash flow forecast, plans d\'assainissement, engagements tiers...')}
        ${_mField('m_evidence', 'Éléments probants obtenus', 'textarea', c.evidence_obtained,
            'Lettre de subordination du CEO, facilities bancaires, budget approuvé CA...')}
        ${_mSection('🇨🇭 Tests Suisse', '#dc2626', `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <div>
                    <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">CO 725a (Perte de capital)</label>
                    <select id="m_co725a" style="width:100%;background:#0a0f1c;color:${CANVAS_LIGHT};border:1px solid #334155;padding:7px 10px;border-radius:5px;font-size:13px;box-sizing:border-box">
                        <option value="na" ${c.co_725a === 'na' ? 'selected' : ''}>Non applicable</option>
                        <option value="ok" ${c.co_725a === 'ok' ? 'selected' : ''}>OK (FP ≥ 50% capital+RL)</option>
                        <option value="triggered" ${c.co_725a === 'triggered' ? 'selected' : ''}>⚠️ Déclenché (FP &lt; 50%)</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">CO 725b (Surendettement)</label>
                    <select id="m_co725b" style="width:100%;background:#0a0f1c;color:${CANVAS_LIGHT};border:1px solid #334155;padding:7px 10px;border-radius:5px;font-size:13px;box-sizing:border-box">
                        <option value="na" ${c.co_725b === 'na' ? 'selected' : ''}>Non applicable</option>
                        <option value="ok" ${c.co_725b === 'ok' ? 'selected' : ''}>OK (actifs &gt; dettes sur les 2 bases)</option>
                        <option value="triggered" ${c.co_725b === 'triggered' ? 'selected' : ''}>🚨 Surendettement — avis juge</option>
                    </select>
                </div>
            </div>
        `)}
        <div>
            <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">Conclusion going concern</label>
            <select id="m_conclusion" style="width:100%;background:#0a0f1c;color:${CANVAS_LIGHT};border:1px solid #334155;padding:8px 10px;border-radius:5px;font-size:13px;box-sizing:border-box;margin-bottom:12px">
                <option value="ok" ${c.conclusion === 'ok' ? 'selected' : ''}>✅ OK — base going concern appropriée, pas d'incertitude significative</option>
                <option value="emphasis" ${c.conclusion === 'emphasis' ? 'selected' : ''}>🔵 Incertitude significative adéquatement divulguée → § Observation</option>
                <option value="qualified_disclosure" ${c.conclusion === 'qualified_disclosure' ? 'selected' : ''}>🟡 Divulgation inadéquate → opinion avec réserve</option>
                <option value="adverse_disclosure" ${c.conclusion === 'adverse_disclosure' ? 'selected' : ''}>🔴 Divulgation diffuse inadéquate → défavorable</option>
                <option value="adverse_basis" ${c.conclusion === 'adverse_basis' ? 'selected' : ''}>🔴 Base GC inappropriée → défavorable</option>
            </select>
        </div>
        ${_mField('m_impact', 'Impact sur le rapport', 'textarea', c.impact_rapport, 'Exemple : pas de modification / § Observation avec wording...')}
    `;
}

function _memoFormSubsequent(c) {
    return `
        <div style="padding:10px 14px;margin-bottom:14px;background:#0a192f;border-left:3px solid #3b82f6;border-radius:5px;font-size:12px;color:#93c5fd">
            <strong>Contexte NAS 560 :</strong> événements post-clôture jusqu'à la date du rapport.
            Type 1 (adjusting) = conditions existant à clôture → corriger les comptes.
            Type 2 (non-adjusting) = nouvelles conditions → annexe si significatif.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${_mField('m_period_start', 'Période — début (date clôture)', 'date', c.period_start)}
            ${_mField('m_period_end', 'Période — fin (date rapport)', 'date', c.period_end)}
        </div>
        ${_mField('m_procedures', 'Procédures effectuées', 'textarea', c.procedures_performed,
            'Entretien direction, lecture PV CA depuis clôture, lettres avocats, procédures analytiques post-clôture, examen paiements et encaissements post-clôture...')}
        ${_mSection('📌 Type 1 (adjusting events) — conditions existant à clôture', '#f59e0b', `
            ${_mField('m_type1', 'Événements Type 1 (1 par ligne)', 'textarea',
                (c.type1_events || []).join('\n'),
                'Exemple : Créance de CHF 300k devenue irrécouvrable (client en faillite 15.01.2026) → provision à ajuster')}
        `)}
        ${_mSection('📢 Type 2 (non-adjusting) — nouvelles conditions significatives', '#10b981', `
            ${_mField('m_type2', 'Événements Type 2 (1 par ligne) — divulgation annexe', 'textarea',
                (c.type2_events || []).join('\n'),
                'Exemple : Cyberattaque janvier 2026 impact estimé CHF 8M → divulgation annexe obligatoire')}
        `)}
        ${_mField('m_post_rapport', 'Procédures après date rapport (si applicable)', 'textarea', c.post_rapport_procedures,
            'Si fait connu post-rapport : réévaluer, modifier rapport si nécessaire')}
        ${_mField('m_conclusion', 'Conclusion', 'textarea', c.conclusion,
            'Aucun événement significatif identifié / N événements Type 1 ajustés / M événements Type 2 divulgués en annexe...')}
    `;
}

function _memoFormMRL(c) {
    const aff = (id, label, val) => `
        <label style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:#0a0f1c;
                      border-radius:5px;margin-bottom:6px;cursor:pointer;font-size:12px;color:#cbd5e1">
            <input type="checkbox" id="${id}" ${val ? 'checked' : ''} style="margin-top:2px;flex-shrink:0" />
            <span>${escapeHtml(label)}</span>
        </label>`;
    return `
        <div style="padding:10px 14px;margin-bottom:14px;background:#022c22;border-left:3px solid #10b981;border-radius:5px;font-size:12px;color:#6ee7b7">
            <strong>Contexte NAS 580 :</strong> lettre d'affirmation signée par la direction (CEO + CFO) datée du JOUR du rapport.
            Élément probant nécessaire mais fiabilité faible seul.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
            ${_mField('m_date', 'Date signature (= date rapport)', 'date', c.date)}
            ${_mField('m_ceo', 'CEO (nom)', 'text', c.signed_by_ceo)}
            ${_mField('m_cfo', 'CFO (nom)', 'text', c.signed_by_cfo)}
        </div>
        ${_mSection('✓ Affirmations standards — cochez ce qui est confirmé', '#10b981', `
            ${aff('m_aff1', 'La direction a la responsabilité de la préparation fidèle des états financiers selon le référentiel applicable', c.aff_responsibility)}
            ${aff('m_aff2', 'Toutes les informations pertinentes et tous les accès ont été fournis à l\'auditeur', c.aff_completeness)}
            ${aff('m_aff3', 'Les comptes annuels sont établis conformément au référentiel (CO/RPC/IFRS)', c.aff_framework)}
            ${aff('m_aff4', 'Toutes les transactions et relations avec parties liées ont été identifiées et divulguées (NAS 550)', c.aff_related_parties)}
            ${aff('m_aff5', 'Tous les événements postérieurs significatifs ont été identifiés et comptabilisés ou divulgués (NAS 560)', c.aff_subsequent)}
            ${aff('m_aff6', 'Aucune fraude impliquant la direction ou les employés ayant un impact significatif n\'est connue (NAS 240)', c.aff_fraud)}
            ${aff('m_aff7', 'Tous les litiges et actions en justice ont été divulgués', c.aff_litigation)}
            ${aff('m_aff8', 'La continuité d\'exploitation (going concern) est appropriée sur l\'horizon évalué (NAS 570)', c.aff_going_concern)}
        `)}
        ${_mField('m_specific', 'Affirmations spécifiques (1 par ligne selon risques identifiés)', 'textarea', c.specific_affirmations,
            'Ex: "Aucun compte bancaire non divulgué à l\'auditeur"')}
        ${_mField('m_notes', 'Notes (difficultés obtenues, refus éventuel, etc.)', 'textarea', c.notes)}
    `;
}

function _memoFormNAS260(c) {
    return `
        <div style="padding:10px 14px;margin-bottom:14px;background:#1e1b4b;border-left:3px solid #8b5cf6;border-radius:5px;font-size:12px;color:#c4b5fd">
            <strong>Contexte NAS 260 :</strong> communication écrite obligatoire pour cotées.
            Destinataires : CA / comité d'audit.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${_mField('m_date', 'Date envoi', 'date', c.date_sent)}
            ${_mField('m_recipients', 'Destinataires (noms)', 'text', c.recipients, 'Mme Vittori, M. Berger...')}
        </div>
        ${_mField('m_scope', '1. Étendue et responsabilités de l\'audit', 'textarea', c.scope,
            'Description de notre mandat, référentiel, NAS appliquées...')}
        ${_mField('m_independence', '2. Indépendance', 'textarea', c.independence,
            'Nous confirmons l\'indépendance de notre cabinet et équipe selon CO 728 et Directives EXPERTsuisse...')}
        ${_mField('m_judgments', '3. Jugements comptables significatifs', 'textarea', c.significant_judgments,
            'Estimations importantes : provisions, dépréciations, impôts différés...')}
        ${_mField('m_sad', '4. Anomalies identifiées (non corrigées)', 'textarea', c.uncorrected_misstatements,
            'SAD total CHF X, détail par cycle...')}
        ${_mField('m_sci', '5. Déficiences du SCI (voir aussi management letter NAS 265)', 'textarea', c.control_deficiencies,
            'Déficiences significatives identifiées pendant l\'audit...')}
        ${_mField('m_kam', '6. KAM proposés (si EIP)', 'textarea', c.kam_proposed,
            'Liste des Key Audit Matters prévus dans le rapport...')}
        ${_mField('m_other', '7. Autres points', 'textarea', c.other,
            'Difficultés rencontrées, relations avec régulateurs, recommandations stratégiques...')}
    `;
}

// ══════════════════════════════════════════════════
// ÉTAPE 4 — Rapport d'audit generator
// ══════════════════════════════════════════════════

function _renderReportPanel(host) {
    const eng = _canvasState.snapshot.engagement;
    const sad = _canvasState.snapshot.sad || [];
    const totalPl = sad.reduce((s, x) => s + (x.amount_impact_pl || 0), 0);
    const mat = eng.materiality_pm || 0;

    host.innerHTML = `
        <div style="margin-bottom:14px;padding:12px 14px;background:#1e1b4b;border-left:3px solid ${CANVAS_ACCENT};border-radius:6px;font-size:12px;color:#c4b5fd">
            Générateur de rapport d'audit : choisis la situation, le wording se met à jour automatiquement.
        </div>

        <div class="card" style="padding:18px;border-left:3px solid ${CANVAS_ACCENT};margin-bottom:14px">
            <div style="font-size:13px;font-weight:700;color:${CANVAS_LIGHT};margin-bottom:14px">
                📋 Paramètres du rapport
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                <div>
                    <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">Type d'opinion</label>
                    <select id="rep_opinion" onchange="_canvasUpdateReport()"
                        style="width:100%;background:#0a0f1c;color:${CANVAS_LIGHT};border:1px solid #334155;padding:8px 10px;border-radius:5px;font-size:13px;box-sizing:border-box">
                        <option value="sans_reserve">✅ Sans réserve (Clean)</option>
                        <option value="qualifiee_anomalie">🟡 Avec réserve — Anomalie</option>
                        <option value="qualifiee_limitation">🟡 Avec réserve — Limitation étendue</option>
                        <option value="defavorable">🔴 Défavorable (Adverse)</option>
                        <option value="disclaimer">⚫ Impossibilité d'exprimer une opinion</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">Paragraphe additionnel (NAS 706)</label>
                    <select id="rep_emphasis" onchange="_canvasUpdateReport()"
                        style="width:100%;background:#0a0f1c;color:${CANVAS_LIGHT};border:1px solid #334155;padding:8px 10px;border-radius:5px;font-size:13px;box-sizing:border-box">
                        <option value="none">Aucun</option>
                        <option value="going_concern">🔵 § Observation — Going concern</option>
                        <option value="other_matter">📌 § Autre point (Other Matter)</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">Référentiel applicable</label>
                    <select id="rep_framework" onchange="_canvasUpdateReport()"
                        style="width:100%;background:#0a0f1c;color:${CANVAS_LIGHT};border:1px solid #334155;padding:8px 10px;border-radius:5px;font-size:13px;box-sizing:border-box">
                        <option value="co" ${eng.framework === 'CO' ? 'selected' : ''}>CO (Code des obligations)</option>
                        <option value="rpc" ${eng.framework === 'Swiss GAAP RPC' ? 'selected' : ''}>Swiss GAAP RPC</option>
                        <option value="ifrs" ${eng.framework === 'IFRS' ? 'selected' : ''}>IFRS</option>
                        <option value="co_rpc" ${eng.framework === 'CO + RPC' ? 'selected' : ''}>CO + RPC</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">Régime</label>
                    <select id="rep_regime" onchange="_canvasUpdateReport()"
                        style="width:100%;background:#0a0f1c;color:${CANVAS_LIGHT};border:1px solid #334155;padding:8px 10px;border-radius:5px;font-size:13px;box-sizing:border-box">
                        <option value="ordinaire" ${(eng.regime||'').includes('ordinaire') ? 'selected' : ''}>Révision ordinaire</option>
                        <option value="restreint" ${(eng.regime||'').toLowerCase().includes('restreint') ? 'selected' : ''}>Contrôle restreint</option>
                        <option value="espi" ${(eng.regime||'').toLowerCase().includes('espi') ? 'selected' : ''}>ESPI (cotée)</option>
                    </select>
                </div>
            </div>

            <div style="margin-top:12px">
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">Fondement opinion modifiée (si applicable)</label>
                <textarea id="rep_basis" rows="3" oninput="_canvasUpdateReport()"
                    placeholder="Description précise de l'anomalie ou de la limitation..."
                    style="width:100%;background:#0a0f1c;color:${CANVAS_LIGHT};border:1px solid #334155;padding:8px 10px;border-radius:5px;font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit"></textarea>
            </div>
            <div style="margin-top:10px">
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">Note annexe (pour going concern emphasis)</label>
                <input type="text" id="rep_note_ref" placeholder="ex: 12" oninput="_canvasUpdateReport()"
                    style="width:100%;background:#0a0f1c;color:${CANVAS_LIGHT};border:1px solid #334155;padding:7px 10px;border-radius:5px;font-size:13px;box-sizing:border-box" />
            </div>

            <div style="margin-top:14px;padding:10px 12px;background:#0a0f1c;border-radius:6px;font-size:11px;color:#94a3b8">
                📊 <strong>Context actuel :</strong>
                SAD cumulé CHF ${totalPl.toLocaleString('fr-CH')} vs matérialité CHF ${mat.toLocaleString('fr-CH')}
                → ${Math.abs(totalPl) > mat ? '⚠️ SAD dépasse la matérialité' : '✓ Sous matérialité'}
            </div>
        </div>

        <div class="card" style="padding:0;border-left:3px solid ${CANVAS_ACCENT}">
            <div style="padding:12px 16px;background:#1e1b4b;border-bottom:1px solid #334155;display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:13px;font-weight:700;color:${CANVAS_LIGHT}">📄 Aperçu du rapport</div>
                <button onclick="_canvasCopyReport()"
                    style="background:${CANVAS_ACCENT};border:none;color:white;padding:6px 14px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:600">
                    📋 Copier le texte
                </button>
            </div>
            <div id="rep_preview" style="padding:20px;background:#0a0f1c;font-family:Georgia,serif;color:#cbd5e1;font-size:13px;line-height:1.8;white-space:pre-wrap;min-height:400px"></div>
        </div>
    `;
    setTimeout(_canvasUpdateReport, 50);
}

function _canvasUpdateReport() {
    const opinion = document.getElementById('rep_opinion')?.value;
    const emphasis = document.getElementById('rep_emphasis')?.value;
    const framework = document.getElementById('rep_framework')?.value;
    const regime = document.getElementById('rep_regime')?.value;
    const basis = document.getElementById('rep_basis')?.value || '[décrire précisément l\'anomalie ou la limitation]';
    const noteRef = document.getElementById('rep_note_ref')?.value || 'X';
    const eng = _canvasState.snapshot.engagement;
    const client = eng.client_name || '[Client SA]';
    const year = eng.exercise_year || '[YYYY]';
    const fw = {co:'les articles 957 et suivants du Code des obligations', rpc:'les Swiss GAAP RPC', ifrs:'les International Financial Reporting Standards (IFRS)', co_rpc:'les Swiss GAAP RPC et le Code des obligations'}[framework] || '[référentiel]';

    const opinions = {
        sans_reserve: `**OPINION**
À notre avis, les comptes annuels pour l'exercice arrêté au 31.12.${year} donnent une image fidèle du patrimoine, de la situation financière et des résultats en conformité avec ${fw} et sont conformes à la loi suisse et aux statuts.`,
        qualifiee_anomalie: `**FONDEMENT DE L'OPINION AVEC RÉSERVE**
${basis}

**OPINION AVEC RÉSERVE**
À notre avis, SOUS RÉSERVE des effets des points décrits dans la section "Fondement de l'opinion avec réserve", les comptes annuels pour l'exercice arrêté au 31.12.${year} donnent une image fidèle du patrimoine, de la situation financière et des résultats en conformité avec ${fw}.`,
        qualifiee_limitation: `**FONDEMENT DE L'OPINION AVEC RÉSERVE**
Nous n'avons pas été en mesure d'obtenir des éléments probants suffisants et appropriés concernant ${basis}. Par conséquent, nous n'avons pas pu déterminer si des ajustements auraient été nécessaires.

**OPINION AVEC RÉSERVE**
À notre avis, SOUS RÉSERVE des ajustements possibles qui auraient pu être nécessaires si nous avions pu obtenir des éléments probants suffisants, les comptes annuels pour l'exercice arrêté au 31.12.${year} donnent une image fidèle en conformité avec ${fw}.`,
        defavorable: `**FONDEMENT DE L'OPINION DÉFAVORABLE**
${basis}

**OPINION DÉFAVORABLE**
À notre avis, en raison de l'importance des points décrits dans la section "Fondement de l'opinion défavorable", les comptes annuels pour l'exercice arrêté au 31.12.${year} NE DONNENT PAS une image fidèle du patrimoine, de la situation financière et des résultats et NE SONT PAS conformes à ${fw}.`,
        disclaimer: `**FONDEMENT DU REFUS D'OPINION**
${basis}

**REFUS D'EXPRIMER UNE OPINION**
Compte tenu de l'importance des points décrits dans la section "Fondement du refus d'opinion", nous N'AVONS PAS PU obtenir d'éléments probants suffisants et appropriés. Par conséquent, nous N'EXPRIMONS PAS d'opinion sur les comptes annuels pour l'exercice arrêté au 31.12.${year}.`
    };

    const emphasisTexts = {
        none: '',
        going_concern: `\n\n**PARAGRAPHE D'OBSERVATION — CONTINUITÉ D'EXPLOITATION**
Sans modifier notre opinion, nous attirons l'attention sur la note ${noteRef} de l'annexe qui décrit l'existence d'une incertitude significative liée à des événements ou conditions susceptibles de jeter un doute important sur la capacité de la société à poursuivre son exploitation.`,
        other_matter: `\n\n**AUTRE POINT**
${basis}`
    };

    const header = `Rapport de l'organe de révision
À l'Assemblée générale de ${client}

En notre qualité d'organe de révision, nous avons effectué l'audit des comptes annuels de ${client} (bilan, compte de résultat, annexe${regime === 'ordinaire' ? ', tableau des flux de trésorerie' : ''}) pour l'exercice arrêté au 31.12.${year}.

`;
    const footer = `\n\n**RESPONSABILITÉS DE LA DIRECTION ET DE LA GOUVERNANCE**
La direction est responsable de l'établissement des comptes annuels conformément à ${fw} et aux dispositions légales, et du système de contrôle interne qu'elle estime nécessaire à l'établissement de comptes annuels exempts d'anomalies significatives.

**RESPONSABILITÉS DE L'ORGANE DE RÉVISION**
Notre responsabilité consiste à exprimer une opinion sur ces comptes annuels sur la base de notre audit. Nous avons effectué notre audit conformément à la loi suisse et aux Normes d'audit suisses (NAS).

_______________________
[Engagement Partner]                          Lieu, le [date]
Expert-réviseur agréé`;

    const text = header + (opinions[opinion] || '') + (emphasisTexts[emphasis] || '') + footer;
    const preview = document.getElementById('rep_preview');
    if (preview) {
        // Convert **bold** to styled spans
        preview.innerHTML = text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\*\*(.+?)\*\*/g, '<strong style="color:' + CANVAS_ACCENT + ';font-family:system-ui,sans-serif">$1</strong>');
    }
}

function _canvasCopyReport() {
    const text = document.getElementById('rep_preview').innerText;
    navigator.clipboard?.writeText(text).then(() => {
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;top:20px;right:20px;z-index:1001;background:#10b981;color:white;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:600';
        flash.textContent = '✓ Rapport copié';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 1500);
    });
}

// ══════════════════════════════════════════════════
// ÉTAPE 5 — PBC Tracker
// ══════════════════════════════════════════════════

function _renderPbcPanel(host) {
    const pbc = _canvasState.snapshot.pbc || [];
    const byStatus = {requested: 0, in_progress: 0, received: 0, overdue: 0};
    const today = new Date().toISOString().split('T')[0];
    pbc.forEach(p => {
        byStatus[p.status] = (byStatus[p.status] || 0) + 1;
        if (p.status !== 'received' && p.deadline && p.deadline < today) byStatus.overdue++;
    });

    host.innerHTML = `
        <div style="margin-bottom:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <button onclick="_canvasAddPbc()"
                    style="background:${CANVAS_ACCENT};border:none;color:white;padding:8px 14px;
                           border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">
                + Nouvel item PBC
            </button>
            <button onclick="_canvasAddPbcBulk()"
                    style="background:#1e293b;border:1px solid #334155;color:${CANVAS_LIGHT};padding:7px 12px;
                           border-radius:5px;cursor:pointer;font-size:11px">
                📥 Import bulk (template)
            </button>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
            ${_kpi('📨', pbc.length, 'Total', CANVAS_ACCENT)}
            ${_kpi('✓', byStatus.received || 0, 'Reçus', '#10b981')}
            ${_kpi('⏳', byStatus.in_progress || 0, 'En cours', '#3b82f6')}
            ${_kpi('⚠️', byStatus.overdue || 0, 'En retard', '#ef4444')}
        </div>

        ${pbc.length === 0 ? `
            <div style="padding:32px;text-align:center;background:#0f172a;border-radius:10px;border:1px dashed #334155;color:#94a3b8;font-size:13px">
                Aucun item PBC. Utilise le bouton "Import bulk" pour charger les 13 items standards.
            </div>
        ` : `
            <div class="card" style="overflow:hidden;border-left:3px solid ${CANVAS_ACCENT}">
                <table style="width:100%;border-collapse:collapse;font-size:12px">
                    <thead>
                        <tr style="background:#1e1b4b;color:${CANVAS_LIGHT}">
                            <th style="text-align:left;padding:8px 12px">Cat.</th>
                            <th style="text-align:left;padding:8px 12px">Item</th>
                            <th style="text-align:left;padding:8px 12px">Resp.</th>
                            <th style="text-align:left;padding:8px 12px">Deadline</th>
                            <th style="text-align:center;padding:8px 12px">Statut</th>
                            <th style="padding:8px 12px"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pbc.map(p => {
                            const overdue = p.status !== 'received' && p.deadline && p.deadline < today;
                            const statusColor = p.status === 'received' ? '#10b981'
                                : overdue ? '#ef4444'
                                : p.status === 'in_progress' ? '#3b82f6' : '#64748b';
                            const statusLabel = p.status === 'received' ? '✓ Reçu'
                                : overdue ? '⚠️ En retard'
                                : p.status === 'in_progress' ? '⏳ En cours' : '○ Demandé';
                            return `
                                <tr style="border-top:1px solid #1e293b">
                                    <td style="padding:6px 12px;color:${CANVAS_ACCENT};font-size:11px;font-weight:600">${escapeHtml(p.category || '')}</td>
                                    <td style="padding:6px 12px;color:#cbd5e1">${escapeHtml(p.item)}</td>
                                    <td style="padding:6px 12px;color:#94a3b8;font-size:11px">${escapeHtml(p.responsible || '—')}</td>
                                    <td style="padding:6px 12px;color:${overdue ? '#ef4444' : '#94a3b8'};font-size:11px">${escapeHtml(p.deadline || '—')}</td>
                                    <td style="padding:6px 12px;text-align:center">
                                        <select onchange="_canvasUpdatePbcStatus(${p.id}, this.value)"
                                                style="background:${statusColor}22;border:1px solid ${statusColor};color:${statusColor};
                                                       padding:2px 6px;border-radius:10px;font-size:10px;font-weight:700;cursor:pointer">
                                            <option value="requested" ${p.status === 'requested' ? 'selected' : ''}>Demandé</option>
                                            <option value="in_progress" ${p.status === 'in_progress' ? 'selected' : ''}>En cours</option>
                                            <option value="received" ${p.status === 'received' ? 'selected' : ''}>Reçu</option>
                                        </select>
                                    </td>
                                    <td style="padding:6px 12px;text-align:right">
                                        <button onclick="_canvasDeletePbc(${p.id})"
                                            style="background:#3f1612;border:1px solid #7f1d1d;color:#fca5a5;padding:3px 8px;
                                                   border-radius:4px;cursor:pointer;font-size:10px">🗑️</button>
                                    </td>
                                </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `}
    `;
}

async function _canvasAddPbc() {
    const item = prompt('Document demandé :');
    if (!item) return;
    const category = prompt('Catégorie (Global / Ventes / Achats / Stocks / ...) :', 'Global') || '';
    const responsible = prompt('Responsable client :', 'CFO') || '';
    const deadline = prompt('Deadline (YYYY-MM-DD) :', '') || null;
    await api('canvas_add_pbc', _canvasState.activeEid, {item, category, responsible, deadline});
    _canvasOpen(_canvasState.activeEid);
}

async function _canvasAddPbcBulk() {
    if (!confirm('Ajouter les 13 items PBC standards d\'un audit (balance, rapports, contrats, etc.) ?')) return;
    const items = [
        {category: 'Global', item: 'Balance générale + détail comptes auxiliaires', responsible: 'CFO', priority: 'high'},
        {category: 'Global', item: 'Rapport de gestion + PV CA et AG depuis N-1', responsible: 'Direction', priority: 'high'},
        {category: 'Global', item: 'Organigramme + liste signataires bancaires', responsible: 'RH', priority: 'normal'},
        {category: 'Ventes/AR', item: 'Balance âgée clients + 10 plus gros soldes', responsible: 'Compta clients', priority: 'high'},
        {category: 'Ventes/AR', item: 'Échantillon 25 contrats clients significatifs', responsible: 'Commercial', priority: 'normal'},
        {category: 'Achats/AP', item: 'Balance fournisseurs + relevés top 20', responsible: 'Compta fourn.', priority: 'high'},
        {category: 'Stocks', item: 'Extraction stock physique par entrepôt', responsible: 'Logistique', priority: 'high'},
        {category: 'Stocks', item: 'Analyse slow-moving par référence', responsible: 'Contrôle gestion', priority: 'normal'},
        {category: 'Immo', item: 'Fixed asset register détaillé', responsible: 'Compta immo', priority: 'normal'},
        {category: 'Trésorerie', item: 'Liste des comptes bancaires + signataires', responsible: 'CFO', priority: 'high'},
        {category: 'Paie', item: 'Détail salaires par employé + contrats RH', responsible: 'RH', priority: 'high'},
        {category: 'Impôts', item: 'Calcul fiscal + réconciliation ETR', responsible: 'CFO / Tax', priority: 'normal'},
        {category: 'Conso', item: 'Package de consolidation + éliminations', responsible: 'Contrôle gestion', priority: 'normal'},
    ];
    for (const it of items) {
        await api('canvas_add_pbc', _canvasState.activeEid, it);
    }
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;top:20px;right:20px;z-index:1001;background:#10b981;color:white;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:600';
    flash.textContent = `✓ ${items.length} items PBC ajoutés`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 2500);
    _canvasOpen(_canvasState.activeEid);
}

async function _canvasUpdatePbcStatus(pid, status) {
    await api('canvas_update_pbc', pid, {status});
    _canvasOpen(_canvasState.activeEid);
}

async function _canvasDeletePbc(pid) {
    if (!confirm('Supprimer cet item PBC ?')) return;
    await api('canvas_delete_pbc', pid);
    _canvasOpen(_canvasState.activeEid);
}

// ── Export PDF ──

async function _canvasExportPdf() {
    const r = await api('canvas_export_pdf', _canvasState.activeEid);
    if (r && r.ok) {
        const flash = document.createElement('div');
        flash.style.cssText = 'position:fixed;top:20px;right:20px;z-index:1001;background:#10b981;color:white;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:600';
        flash.textContent = '✓ PDF généré et ouvert';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 3000);
    } else if (r && !r.cancelled) {
        alert('Erreur export : ' + (r && r.error || 'inconnue'));
    }
}
