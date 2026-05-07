/* ═══════════════════════════════════════════════
   Audit Mission Lab — Immersive End-to-End Simulator
   Tu incarnes un junior EY sur une mission complète.
   ═══════════════════════════════════════════════ */

const MISSION_ACCENT = '#805ad5';
const MISSION_BG = '#553c9a';
const MISSION_LIGHT = '#e9d8fd';

// ── State ──
let _missionState = {
    view: 'picker',      // 'picker' | 'dashboard' | 'phase' | 'debrief'
    activeMissionId: null,
    snapshot: null,      // full snapshot from api
    currentPanel: 'inbox', // 'inbox' | 'workpapers' | 'documents' | 'tb' | 'findings' | 'tasks'
    openEmailId: null,
    openDocId: null,
    openTaskId: null,
    openWpRef: null,
};

// ── Entry point ──

async function renderMission(container) {
    container.innerHTML = '<div class="text-center" style="padding:60px"><div class="page-title">Chargement Mission Lab...</div></div>';

    if (_missionState.view === 'picker') {
        return _renderMissionPicker(container);
    }
    if (_missionState.view === 'dashboard') {
        const snap = await api('get_mission_full', _missionState.activeMissionId);
        if (!snap) {
            _missionState.view = 'picker';
            return _renderMissionPicker(container);
        }
        _missionState.snapshot = snap;
        return _renderMissionDashboard(container);
    }
    if (_missionState.view === 'debrief') {
        return _renderMissionDebrief(container);
    }
}

// ── View 1 : Picker ──

async function _renderMissionPicker(container) {
    const scenarios = await api('list_mission_scenarios') || [];
    const missions = await api('list_missions') || [];
    const active = missions.filter(m => m.status === 'in_progress');
    const completed = missions.filter(m => m.status === 'completed');

    container.innerHTML = `
        <div style="margin-bottom:18px;padding:18px 22px;border-radius:12px;
                    background:linear-gradient(135deg, ${MISSION_BG}, #4c1d95);
                    border:1px solid ${MISSION_ACCENT}">
            <div style="display:flex;align-items:center;gap:14px">
                <div style="font-size:36px">🎬</div>
                <div style="flex:1">
                    <div style="font-size:20px;font-weight:800;color:${MISSION_LIGHT}">
                        Audit Mission Lab
                    </div>
                    <div style="font-size:13px;color:#c4b5fd;margin-top:2px">
                        Vis une mission complète chez EY du briefing à la signature du rapport
                    </div>
                </div>
            </div>
        </div>

        ${active.length ? `
            <div style="font-size:14px;font-weight:700;color:${MISSION_LIGHT};margin:8px 0 10px 0">
                ▶️ Missions en cours (${active.length})
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-bottom:24px">
                ${active.map(m => _renderMissionCard(m, scenarios, true)).join('')}
            </div>
        ` : ''}

        <div style="font-size:14px;font-weight:700;color:${MISSION_LIGHT};margin:8px 0 10px 0">
            🎬 Scénarios disponibles
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">
            ${scenarios.map(s => `
                <div onclick="_startNewMission('${s.id}')"
                     class="card" style="padding:18px;cursor:pointer;border-left:3px solid ${MISSION_ACCENT};
                                          transition:transform 0.15s,background 0.15s"
                     onmouseover="this.style.transform='translateY(-2px)';this.style.background='#1e1b4b'"
                     onmouseout="this.style.transform='';this.style.background=''">
                    <div style="display:flex;gap:12px;align-items:flex-start">
                        <div style="font-size:32px">${s.icon || '🎬'}</div>
                        <div style="flex:1">
                            <div style="font-size:15px;font-weight:700;color:${MISSION_LIGHT}">
                                ${escapeHtml(s.title || '')}
                            </div>
                            <div style="font-size:12px;color:#c4b5fd;margin-top:4px;line-height:1.5">
                                ${escapeHtml(s.tagline || '')}
                            </div>
                            <div style="display:flex;gap:10px;margin-top:10px;font-size:11px;color:#94a3b8">
                                <span>🎓 ${escapeHtml(s.difficulty || '')}</span>
                                <span>⏱️ ${escapeHtml(s.duration_estimate || '')}</span>
                            </div>
                            <div style="margin-top:8px;font-size:11px;color:#a78bfa">
                                ▶ Cliquer pour démarrer
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        ${completed.length ? `
            <div style="font-size:14px;font-weight:700;color:${MISSION_LIGHT};margin:24px 0 10px 0">
                🏆 Missions terminées (${completed.length})
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">
                ${completed.map(m => _renderMissionCard(m, scenarios, false)).join('')}
            </div>
        ` : ''}
    `;
}

function _renderMissionCard(m, scenarios, active) {
    const s = scenarios.find(sc => sc.id === m.scenario_id) || {};
    const color = active ? '#10b981' : '#64748b';
    const started = new Date(m.started_at).toLocaleDateString('fr-CH');
    return `
        <div class="card" style="padding:14px;border-left:3px solid ${color}">
            <div style="font-size:13px;font-weight:700;color:${MISSION_LIGHT};margin-bottom:4px">
                ${s.icon || '🎬'} ${escapeHtml(m.client_name || '')}
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:10px">
                ${active ? 'En cours · Phase : ' + escapeHtml(m.current_phase || '') : `Terminée · ${started}`}
                ${m.score != null ? ` · Score ${m.score}` : ''}
            </div>
            <div style="display:flex;gap:6px">
                <button onclick="_resumeMission(${m.id})"
                        style="flex:1;background:#1e293b;border:1px solid #334155;color:${MISSION_LIGHT};
                               padding:6px 10px;border-radius:5px;cursor:pointer;font-size:12px">
                    ${active ? '▶ Reprendre' : '👁️ Voir debrief'}
                </button>
                <button onclick="_deleteMission(${m.id})"
                        style="background:#3f1612;border:1px solid #7f1d1d;color:#fca5a5;
                               padding:6px 10px;border-radius:5px;cursor:pointer;font-size:12px"
                        title="Supprimer">🗑️</button>
            </div>
        </div>`;
}

async function _startNewMission(scenarioId) {
    const res = await api('start_mission', scenarioId);
    if (res && res.ok) {
        _missionState.activeMissionId = res.mission_id;
        _missionState.view = 'dashboard';
        _missionState.currentPanel = 'inbox';
        const host = document.getElementById('auditContent');
        if (host) renderMission(host);
    } else {
        alert('Erreur : ' + ((res && res.error) || 'inconnue'));
    }
}

async function _resumeMission(mid) {
    const m = await api('get_mission_full', mid);
    if (!m) return;
    _missionState.activeMissionId = mid;
    _missionState.snapshot = m;
    if (m.mission.status === 'completed') {
        _missionState.view = 'debrief';
        _missionState.debriefData = null; // will load fresh
    } else {
        _missionState.view = 'dashboard';
        _missionState.currentPanel = 'inbox';
    }
    const host = document.getElementById('auditContent');
    if (host) renderMission(host);
}

async function _deleteMission(mid) {
    if (!confirm('Supprimer définitivement cette mission ?')) return;
    await api('mission_delete', mid);
    const host = document.getElementById('auditContent');
    if (host) renderMission(host);
}

async function _backToMissionPicker() {
    _missionState.view = 'picker';
    _missionState.activeMissionId = null;
    _missionState.snapshot = null;
    const host = document.getElementById('auditContent');
    if (host) renderMission(host);
}

// ── View 2 : Dashboard (inbox + panels) ──

function _renderMissionDashboard(container) {
    const snap = _missionState.snapshot;
    const scenario = snap.scenario || {};
    const mission = snap.mission;
    const phase = (scenario.phases || []).find(p => p.id === mission.current_phase) || {};
    const phaseIdx = (scenario.phases || []).findIndex(p => p.id === mission.current_phase);
    const totalPhases = (scenario.phases || []).length;
    const unread = (snap.inbox || []).filter(e => !e.read).length;

    container.innerHTML = `
        <!-- Header -->
        <div style="margin-bottom:14px;padding:14px 18px;border-radius:10px;
                    background:linear-gradient(135deg, ${MISSION_BG}, #4c1d95);
                    border:1px solid ${MISSION_ACCENT}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:16px">
                <div style="flex:1">
                    <div style="font-size:11px;color:#c4b5fd;text-transform:uppercase;letter-spacing:0.5px">
                        🎬 Mission en cours
                    </div>
                    <div style="font-size:17px;font-weight:800;color:${MISSION_LIGHT};margin-top:2px">
                        ${escapeHtml(mission.client_name)}
                    </div>
                    <div style="font-size:12px;color:#c4b5fd;margin-top:2px">
                        ${escapeHtml(scenario.title || '')} · ${(scenario.team || {}).senior || ''}
                    </div>
                </div>
                <div style="text-align:right">
                    <div style="font-size:11px;color:#c4b5fd">Phase ${phaseIdx + 1}/${totalPhases}</div>
                    <div style="font-size:14px;font-weight:700;color:${MISSION_LIGHT};margin-top:2px">
                        ${phase.icon || ''} ${escapeHtml(phase.title || '')}
                    </div>
                </div>
                <button onclick="_backToMissionPicker()"
                        style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                               padding:6px 12px;border-radius:5px;cursor:pointer;font-size:12px">
                    ← Menu missions
                </button>
            </div>
            <!-- Phase progress -->
            <div style="height:6px;background:#1e1b4b;border-radius:3px;overflow:hidden;margin-top:12px">
                <div style="height:100%;width:${Math.round(100*(phaseIdx+1)/totalPhases)}%;
                            background:linear-gradient(90deg, #a78bfa, #c4b5fd);transition:width 0.3s"></div>
            </div>
        </div>

        <!-- Panel tabs -->
        <div style="display:flex;gap:6px;margin-bottom:14px;padding:6px;background:#0f172a;
                    border:1px solid #1e293b;border-radius:10px;flex-wrap:wrap">
            ${_panelTab('inbox', '📧 Inbox', unread)}
            ${_panelTab('tasks', '✅ Tâches', _countOpenTasks())}
            ${_panelTab('workpapers', '📂 Workpapers')}
            ${_panelTab('documents', '📄 Documents')}
            ${_panelTab('tb', '📊 Balance')}
            ${_panelTab('findings', '🚨 Findings')}
            ${_panelTab('glossary', '📖 Glossaire')}
        </div>

        <!-- Panel content -->
        <div id="missionPanelContent"></div>

        <!-- Phase actions -->
        <div style="margin-top:16px;padding:12px 16px;background:#0f172a;border:1px solid #334155;
                    border-radius:8px;display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:12px;color:#94a3b8">
                ${escapeHtml(phase.objective || '')}
            </div>
            <div style="display:flex;gap:8px">
                ${phaseIdx < totalPhases - 1 ? `
                    <button onclick="_advancePhase()"
                            style="background:${MISSION_ACCENT};border:none;color:white;
                                   padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
                        Phase suivante →
                    </button>
                ` : `
                    <button onclick="_finishMission()"
                            style="background:#10b981;border:none;color:white;
                                   padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700">
                        🏆 Finaliser la mission
                    </button>
                `}
            </div>
        </div>
    `;

    _renderPanel();
}

function _panelTab(id, label, badge) {
    const isActive = _missionState.currentPanel === id;
    return `
        <button onclick="_switchPanel('${id}')"
                style="flex:1 1 120px;padding:8px 12px;border-radius:7px;cursor:pointer;
                       font-size:12px;font-weight:600;border:1px solid ${isActive ? MISSION_ACCENT : 'transparent'};
                       background:${isActive ? '#3c1d6e' : 'transparent'};
                       color:${isActive ? MISSION_LIGHT : '#94a3b8'};position:relative">
            ${label}
            ${badge ? `<span style="position:absolute;top:-3px;right:-3px;background:#ef4444;color:white;
                                     font-size:10px;padding:1px 6px;border-radius:10px;font-weight:700">${badge}</span>` : ''}
        </button>`;
}

function _switchPanel(panel) {
    _missionState.currentPanel = panel;
    _missionState.openEmailId = null;
    _missionState.openDocId = null;
    _missionState.openTaskId = null;
    _renderPanel();
    // Re-render dashboard to refresh active tab color
    const host = document.getElementById('auditContent');
    if (host && _missionState.view === 'dashboard') _renderMissionDashboard(host);
}

function _countOpenTasks() {
    const snap = _missionState.snapshot;
    if (!snap) return 0;
    const scenario = snap.scenario || {};
    const phase = (scenario.phases || []).find(p => p.id === snap.mission.current_phase);
    if (!phase) return 0;
    const decided = new Set((snap.decisions || []).map(d => d.decision_key));
    const tasks = phase.tasks || [];
    return tasks.filter(t => !decided.has(t.id)).length;
}

function _renderPanel() {
    const host = document.getElementById('missionPanelContent');
    if (!host) return;
    const panel = _missionState.currentPanel;
    if (panel === 'inbox')      return _renderInboxPanel(host);
    if (panel === 'tasks')      return _renderTasksPanel(host);
    if (panel === 'workpapers') return _renderWorkpapersPanel(host);
    if (panel === 'documents')  return _renderDocumentsPanel(host);
    if (panel === 'tb')         return _renderTBPanel(host);
    if (panel === 'findings')   return _renderFindingsPanel(host);
    if (panel === 'glossary')   return _renderGlossaryPanel(host);
}

function _renderGlossaryPanel(host) {
    const glossary = (_missionState.snapshot.scenario || {}).glossary || {};
    const entries = Object.entries(glossary);
    host.innerHTML = `
        <div style="margin-bottom:12px;padding:12px 14px;background:#1e1b4b;border-left:3px solid ${MISSION_ACCENT};
                    border-radius:6px;font-size:12px;color:#c4b5fd;line-height:1.6">
            📖 Glossaire de tous les termes techniques utilisés dans cette mission.
            Chaque terme : abréviation → signification complète + traduction FR + définition pédagogique.
        </div>
        <input type="text" id="glossSearch" placeholder="Rechercher un terme…"
               oninput="_filterMissionGlossary(this.value)"
               style="width:100%;background:#0f172a;border:1px solid #334155;color:#e2e8f0;
                      padding:8px 12px;border-radius:6px;font-size:13px;margin-bottom:12px;box-sizing:border-box" />
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${entries.map(([abbr, g]) => `
                <div class="gloss-entry"
                     data-gloss-search="${(abbr + ' ' + g.term + ' ' + g.fr + ' ' + g.def).toLowerCase()}"
                     style="padding:12px 14px;background:#0a0f1c;border-left:3px solid ${MISSION_ACCENT};
                            border-radius:5px">
                    <div style="font-size:14px;font-weight:800;color:${MISSION_LIGHT};margin-bottom:2px">
                        ${escapeHtml(abbr)}
                    </div>
                    <div style="font-size:11px;color:#a78bfa;font-weight:600;margin-bottom:4px">
                        ${escapeHtml(g.term)} ${g.fr && g.fr !== g.term ? '· ' + escapeHtml(g.fr) : ''}
                    </div>
                    <div style="font-size:12px;color:#cbd5e1;line-height:1.6">
                        ${escapeHtml(g.def)}
                    </div>
                </div>`).join('')}
        </div>`;
}

function _filterMissionGlossary(q) {
    const query = (q || '').trim().toLowerCase();
    document.querySelectorAll('.gloss-entry').forEach(el => {
        const txt = el.dataset.glossSearch || '';
        el.style.display = (query === '' || txt.includes(query)) ? '' : 'none';
    });
}

// ── Panel : Inbox ──

function _renderInboxPanel(host) {
    const inbox = _missionState.snapshot.inbox || [];
    const sorted = [...inbox].sort((a, b) => new Date(b.delivered_at) - new Date(a.delivered_at));
    const openId = _missionState.openEmailId;
    const openEmail = sorted.find(e => e.id === openId);

    host.innerHTML = `
        <div style="display:grid;grid-template-columns:340px 1fr;gap:12px;min-height:400px">
            <!-- List -->
            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;
                        max-height:560px;overflow-y:auto">
                ${sorted.length === 0
                    ? '<div style="padding:20px;color:#94a3b8;text-align:center;font-size:13px">Aucun message</div>'
                    : sorted.map(e => _renderInboxRow(e)).join('')}
            </div>
            <!-- Detail -->
            <div style="background:#0a0f1c;border:1px solid #1e293b;border-radius:8px;padding:18px;min-height:400px">
                ${openEmail ? _renderEmailDetail(openEmail) : `
                    <div style="color:#64748b;text-align:center;padding:60px 20px;font-size:13px">
                        📧 Sélectionne un email pour le lire
                    </div>`}
            </div>
        </div>`;
}

function _renderInboxRow(e) {
    const icon = _emailCategoryIcon(e.category);
    return `
        <div onclick="_openEmail(${e.id})"
             style="padding:10px 12px;border-bottom:1px solid #1e293b;cursor:pointer;
                    background:${_missionState.openEmailId === e.id ? '#1e1b4b' : 'transparent'};
                    transition:background 0.15s"
             onmouseover="if(${_missionState.openEmailId === e.id} === false) this.style.background='#1e293b'"
             onmouseout="this.style.background='${_missionState.openEmailId === e.id ? '#1e1b4b' : 'transparent'}'">
            <div style="display:flex;gap:8px;align-items:flex-start">
                ${e.read ? '' : '<div style="width:8px;height:8px;border-radius:50%;background:#3b82f6;margin-top:6px;flex-shrink:0"></div>'}
                <div style="flex:1;min-width:0;${e.read ? 'padding-left:16px' : ''}">
                    <div style="font-size:11px;color:${MISSION_ACCENT};text-transform:uppercase;font-weight:600">
                        ${icon} ${escapeHtml(e.category || 'general')}
                    </div>
                    <div style="font-size:13px;font-weight:${e.read ? '500' : '700'};color:${MISSION_LIGHT};margin:2px 0;
                                overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                        ${escapeHtml(e.sender || '')}
                    </div>
                    <div style="font-size:12px;color:${e.read ? '#94a3b8' : '#cbd5e1'};
                                overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                        ${escapeHtml(e.subject || '')}
                    </div>
                </div>
            </div>
        </div>`;
}

function _renderEmailDetail(e) {
    return `
        <div style="border-bottom:1px solid #1e293b;padding-bottom:14px;margin-bottom:14px">
            <div style="font-size:11px;color:${MISSION_ACCENT};text-transform:uppercase">
                ${_emailCategoryIcon(e.category)} ${escapeHtml(e.category || 'general')}
            </div>
            <div style="font-size:16px;font-weight:800;color:${MISSION_LIGHT};margin:6px 0">
                ${escapeHtml(e.subject || '')}
            </div>
            <div style="font-size:12px;color:#94a3b8">
                <strong style="color:#cbd5e1">De :</strong> ${escapeHtml(e.sender || '')}
                · ${new Date(e.delivered_at).toLocaleString('fr-CH')}
            </div>
        </div>
        <div style="color:#cbd5e1;font-size:13px;line-height:1.7;white-space:pre-wrap;font-family:Georgia,serif">
            ${escapeHtml(e.body || '')}
        </div>`;
}

function _emailCategoryIcon(cat) {
    const map = {briefing:'📋', review:'👁️', client:'💼', admin:'🗂️', event:'⚡', general:'📧'};
    return map[cat] || '📧';
}

async function _openEmail(id) {
    _missionState.openEmailId = id;
    const email = (_missionState.snapshot.inbox || []).find(e => e.id === id);
    if (email && !email.read) {
        email.read = 1;
        api('mission_mark_email_read', id);
    }
    _renderPanel();
}

// ── Panel : Tasks ──

function _renderTasksPanel(host) {
    const snap = _missionState.snapshot;
    const scenario = snap.scenario || {};
    const phase = (scenario.phases || []).find(p => p.id === snap.mission.current_phase) || {};
    const tasks = phase.tasks || [];
    const decisions = snap.decisions || [];
    const decidedMap = Object.fromEntries(decisions.map(d => [d.decision_key, d]));

    host.innerHTML = `
        <div style="margin-bottom:12px;padding:12px 16px;background:#1e1b4b;border-left:3px solid ${MISSION_ACCENT};
                    border-radius:6px">
            <div style="font-size:12px;color:#c4b5fd;font-weight:600;margin-bottom:4px">
                ${phase.icon || ''} Phase en cours : ${escapeHtml(phase.title || '')}
            </div>
            <div style="font-size:12px;color:#94a3b8">🎯 ${escapeHtml(phase.objective || '')}</div>
        </div>

        ${tasks.length === 0 ? `
            <div style="padding:40px;text-align:center;color:#94a3b8;font-size:13px">
                Aucune tâche pour cette phase.
            </div>
        ` : tasks.map(t => _renderTaskCard(t, decidedMap[t.id])).join('')}
    `;
}

function _renderTaskCard(task, decision) {
    const done = !!decision;
    const correct = done && decision.score > 0 && _isTaskCorrectChoice(task, decision.choice);
    const color = !done ? MISSION_ACCENT : (correct ? '#10b981' : '#f59e0b');

    if (task.type === 'decision' || task.type === 'finding_check' || task.type === 'final_opinion') {
        return `
            <div class="card" style="padding:18px;margin-bottom:14px;border-left:3px solid ${color}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
                    <div style="font-size:14px;font-weight:700;color:${MISSION_LIGHT}">
                        ${done ? '✅' : '📌'} ${escapeHtml(task.title || '')}
                    </div>
                    ${done ? `<span style="font-size:11px;color:${color};font-weight:700">+${decision.score} pts</span>` : ''}
                </div>
                <div style="font-size:13px;color:#cbd5e1;line-height:1.6;margin-bottom:14px">
                    ${escapeHtml(task.question || '')}
                </div>
                ${task.options.map((opt, i) => _renderTaskOption(task, opt, i, decision)).join('')}
                ${done ? _renderTaskExplanation(task, decision) : ''}
            </div>`;
    }

    if (task.type === 'calculator') {
        return `
            <div class="card" style="padding:18px;margin-bottom:14px;border-left:3px solid ${color}">
                <div style="font-size:14px;font-weight:700;color:${MISSION_LIGHT};margin-bottom:6px">
                    ${done ? '✅' : '🧮'} ${escapeHtml(task.title || '')}
                </div>
                <div style="font-size:13px;color:#cbd5e1;line-height:1.6;margin-bottom:14px">
                    ${escapeHtml(task.question || '')}
                </div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">
                    ${['pm','pe','sud'].map(k => `
                        <div>
                            <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">
                                ${k === 'pm' ? 'Matérialité (PM)' : k === 'pe' ? 'Performance' : 'SUD'}
                            </label>
                            <input type="number" id="taskCalc_${task.id}_${k}"
                                   ${done ? `value="${decision ? JSON.parse(decision.choice)[k] : ''}" disabled` : ''}
                                   placeholder="CHF"
                                   style="width:100%;background:#0f172a;border:1px solid #334155;color:${MISSION_LIGHT};
                                          padding:6px 10px;border-radius:5px;font-size:13px;box-sizing:border-box" />
                        </div>
                    `).join('')}
                </div>
                ${!done ? `
                    <button onclick="_submitCalcTask('${task.id}')"
                            style="background:${MISSION_ACCENT};border:none;color:white;
                                   padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
                        Valider
                    </button>
                ` : _renderTaskExplanation(task, decision)}
            </div>`;
    }

    return '';
}

function _renderTaskOption(task, opt, i, decision) {
    const chosen = decision && JSON.parse(decision.choice || '{}').idx === i;
    const done = !!decision;
    let bg = '#0f172a', border = '#334155', color = '#cbd5e1';
    if (done) {
        if (chosen) {
            bg = opt.ok ? '#022c22' : '#3f1612';
            border = opt.ok ? '#10b981' : '#ef4444';
            color = opt.ok ? '#6ee7b7' : '#fca5a5';
        } else if (opt.ok) {
            border = '#10b981';
            color = '#6ee7b7';
        }
    }
    return `
        <div ${!done ? `onclick="_submitDecision('${task.id}', ${i})"` : ''}
             style="padding:10px 14px;margin-bottom:6px;border-radius:6px;
                    border:1px solid ${border};background:${bg};color:${color};
                    cursor:${done ? 'default' : 'pointer'};transition:all 0.15s;
                    font-size:13px;line-height:1.5;display:flex;gap:10px;align-items:flex-start"
             ${!done ? 'onmouseover="this.style.background=\'#1e293b\'" onmouseout="this.style.background=\'#0f172a\'"' : ''}>
            <div style="flex-shrink:0;width:22px;height:22px;border-radius:50%;border:1px solid ${border};
                        display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700">
                ${done ? (chosen ? (opt.ok ? '✓' : '✗') : (opt.ok ? '✓' : '')) : String.fromCharCode(65 + i)}
            </div>
            <div>${escapeHtml(opt.label)}</div>
        </div>`;
}

function _renderTaskExplanation(task, decision) {
    let chosenIdx = -1;
    try { chosenIdx = JSON.parse(decision.choice || '{}').idx; } catch(_) {}
    const opt = task.options?.[chosenIdx];
    if (!opt) return '';
    const ok = opt.ok;
    return `
        <div style="margin-top:12px;padding:10px 14px;border-radius:6px;
                    background:${ok ? '#022c22' : '#3f1612'};
                    border-left:3px solid ${ok ? '#10b981' : '#ef4444'}">
            <div style="font-size:12px;font-weight:700;color:${ok ? '#6ee7b7' : '#fca5a5'};margin-bottom:4px">
                ${ok ? '✅ Correct' : '❌ Incorrect'}
            </div>
            <div style="color:#cbd5e1;font-size:12px;line-height:1.6">
                ${escapeHtml(opt.x || '')}
            </div>
        </div>`;
}

function _isTaskCorrectChoice(task, choiceJson) {
    try {
        const choice = JSON.parse(choiceJson || '{}');
        return !!(task.options?.[choice.idx]?.ok);
    } catch (_) { return false; }
}

async function _submitDecision(taskId, optIdx) {
    const snap = _missionState.snapshot;
    const scenario = snap.scenario;
    const phase = scenario.phases.find(p => p.id === snap.mission.current_phase);
    const task = phase.tasks.find(t => t.id === taskId);
    if (!task) return;
    const opt = task.options[optIdx];
    const score = opt.score || 0;
    await api('mission_save_decision', _missionState.activeMissionId, taskId,
              JSON.stringify({idx: optIdx, label: opt.label, value: opt.value}), score);

    // Trigger finding detection
    if (opt.triggers_finding) {
        await api('mission_mark_finding', _missionState.activeMissionId, opt.triggers_finding);
    }

    // Final opinion special handling
    if (task.type === 'final_opinion') {
        const result = await api('mission_finish', _missionState.activeMissionId, opt.value);
        _missionState.debriefData = result;
        _missionState.view = 'debrief';
        const host = document.getElementById('auditContent');
        if (host) renderMission(host);
        return;
    }

    await _refreshSnapshot();
}

async function _submitCalcTask(taskId) {
    const pm = parseFloat(document.getElementById(`taskCalc_${taskId}_pm`)?.value) || 0;
    const pe = parseFloat(document.getElementById(`taskCalc_${taskId}_pe`)?.value) || 0;
    const sud = parseFloat(document.getElementById(`taskCalc_${taskId}_sud`)?.value) || 0;

    const snap = _missionState.snapshot;
    const scenario = snap.scenario;
    const phase = scenario.phases.find(p => p.id === snap.mission.current_phase);
    const task = phase.tasks.find(t => t.id === taskId);
    if (!task) return;

    const expected = task.expected || {};
    const tol = task.tolerance || 0.1;
    const within = (v, e) => e === 0 ? v === 0 : Math.abs((v - e) / e) <= tol;
    const correct = within(pm, expected.pm) && within(pe, expected.pe) && within(sud, expected.sud);
    const score = correct ? (task.score || 10) : Math.floor((task.score || 10) / 3);

    await api('mission_save_decision', _missionState.activeMissionId, taskId,
              JSON.stringify({pm, pe, sud, correct}), score);
    await _refreshSnapshot();
}

// ── Panel : Workpapers ──

function _renderWorkpapersPanel(host) {
    const wps = _missionState.snapshot.workpapers || [];
    const scenario = _missionState.snapshot.scenario || {};
    const curPhase = _missionState.snapshot.mission.current_phase;
    // Group by phase
    const byPhase = {};
    wps.forEach(w => {
        byPhase[w.phase] = byPhase[w.phase] || [];
        byPhase[w.phase].push(w);
    });

    const phases = scenario.phases || [];
    host.innerHTML = `
        <div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:14px">
            ${phases.map(p => {
                const list = byPhase[p.id] || [];
                if (list.length === 0) return '';
                return `
                    <div style="margin-bottom:14px">
                        <div style="font-size:12px;font-weight:700;color:${p.id === curPhase ? MISSION_ACCENT : '#94a3b8'};
                                    margin-bottom:6px">
                            ${p.icon || ''} ${escapeHtml(p.title || '')} (${list.length})
                        </div>
                        ${list.map(w => _renderWpRow(w, p.id === curPhase)).join('')}
                    </div>`;
            }).join('')}
        </div>`;
}

function _renderWpRow(w, isActive) {
    const statusColor = w.status === 'complete' ? '#10b981' : w.status === 'review' ? '#f59e0b' : '#64748b';
    const statusLabel = {open:'À faire', in_progress:'En cours', review:'À reviewer', complete:'Complet', reviewed:'Reviewé'}[w.status] || w.status;
    return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:4px;
                    background:#0a0f1c;border-radius:5px;border-left:2px solid ${statusColor}">
            <div style="font-family:'Courier New',monospace;color:${MISSION_ACCENT};font-size:11px;width:40px">
                ${escapeHtml(w.ref)}
            </div>
            <div style="flex:1;font-size:12px;color:#cbd5e1">${escapeHtml(w.title)}</div>
            ${isActive ? `
                <select onchange="_updateWpStatus('${w.ref}', this.value)"
                        style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                               padding:3px 6px;border-radius:4px;font-size:11px">
                    <option value="open" ${w.status==='open'?'selected':''}>À faire</option>
                    <option value="in_progress" ${w.status==='in_progress'?'selected':''}>En cours</option>
                    <option value="review" ${w.status==='review'?'selected':''}>À reviewer</option>
                    <option value="complete" ${w.status==='complete'?'selected':''}>Complet</option>
                </select>
            ` : `
                <span style="font-size:10px;color:${statusColor};padding:2px 6px;border-radius:8px;
                             background:rgba(${statusColor === '#10b981' ? '16,185,129' : statusColor === '#f59e0b' ? '245,158,11' : '100,116,139'},0.2)">
                    ${statusLabel}
                </span>
            `}
        </div>`;
}

async function _updateWpStatus(ref, status) {
    await api('mission_update_workpaper', _missionState.activeMissionId, ref, status, null);
    await _refreshSnapshot();
}

// ── Panel : Documents ──

function _renderDocumentsPanel(host) {
    const docs = (_missionState.snapshot.scenario?.documents) || [];
    const scenario = _missionState.snapshot.scenario || {};
    const curPhase = _missionState.snapshot.mission.current_phase;
    const curPhaseIdx = (scenario.phases || []).findIndex(p => p.id === curPhase);

    // Only show docs up to current phase
    const available = docs.filter(d => {
        const dIdx = (scenario.phases || []).findIndex(p => p.id === d.phase);
        return dIdx <= curPhaseIdx;
    });
    const openDoc = available.find(d => d.id === _missionState.openDocId);

    host.innerHTML = `
        <div style="display:grid;grid-template-columns:340px 1fr;gap:12px;min-height:400px">
            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;overflow-y:auto;max-height:560px">
                ${available.length === 0 ? '<div style="padding:20px;color:#94a3b8;text-align:center;font-size:13px">Aucun document disponible</div>'
                    : available.map(d => `
                        <div onclick="_openDoc('${d.id}')"
                             style="padding:10px 12px;border-bottom:1px solid #1e293b;cursor:pointer;
                                    background:${_missionState.openDocId === d.id ? '#1e1b4b' : 'transparent'};
                                    transition:background 0.15s">
                            <div style="font-size:11px;color:${MISSION_ACCENT};text-transform:uppercase">
                                ${_docIcon(d.type)} ${escapeHtml(d.type || '')}
                            </div>
                            <div style="font-size:13px;color:${MISSION_LIGHT};font-weight:500;margin-top:2px">
                                ${escapeHtml(d.title)}
                            </div>
                        </div>`).join('')}
            </div>
            <div style="background:#0a0f1c;border:1px solid #1e293b;border-radius:8px;padding:18px;min-height:400px">
                ${openDoc ? `
                    <div style="border-bottom:1px solid #1e293b;padding-bottom:12px;margin-bottom:14px">
                        <div style="font-size:11px;color:${MISSION_ACCENT};text-transform:uppercase">
                            ${_docIcon(openDoc.type)} ${escapeHtml(openDoc.type || '')}
                        </div>
                        <div style="font-size:16px;font-weight:800;color:${MISSION_LIGHT};margin-top:4px">
                            ${escapeHtml(openDoc.title)}
                        </div>
                    </div>
                    <div style="color:#cbd5e1;font-size:13px;line-height:1.7;white-space:pre-wrap">
                        ${escapeHtml(openDoc.excerpt || '')}
                    </div>
                ` : `
                    <div style="color:#64748b;text-align:center;padding:60px 20px;font-size:13px">
                        📄 Sélectionne un document pour l'ouvrir
                    </div>
                `}
            </div>
        </div>`;
}

function _docIcon(type) {
    return {pdf:'📄', docx:'📝', xlsx:'📊'}[type] || '📎';
}

function _openDoc(id) {
    _missionState.openDocId = id;
    _renderPanel();
}

// ── Panel : Trial Balance ──

function _renderTBPanel(host) {
    const tb = _missionState.snapshot.scenario?.trial_balance || [];
    const fmt = v => (v || 0).toLocaleString('fr-CH', {minimumFractionDigits:0, maximumFractionDigits:0});

    const totalActif = tb.filter(r => r.n > 0 && r.compte.startsWith('1')).reduce((s, r) => s + r.n, 0);
    const totalPassif = Math.abs(tb.filter(r => r.n < 0 && r.compte.startsWith('2')).reduce((s, r) => s + r.n, 0));
    const totalCA = Math.abs(tb.filter(r => r.compte.startsWith('3')).reduce((s, r) => s + r.n, 0));

    host.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
            <div class="card" style="padding:14px;text-align:center;border-left:3px solid #3b82f6">
                <div style="font-size:10px;color:#94a3b8;text-transform:uppercase">Total Actif</div>
                <div style="font-size:18px;font-weight:800;color:#60a5fa;margin-top:2px">CHF ${fmt(totalActif)}</div>
            </div>
            <div class="card" style="padding:14px;text-align:center;border-left:3px solid #ef4444">
                <div style="font-size:10px;color:#94a3b8;text-transform:uppercase">Total Passif</div>
                <div style="font-size:18px;font-weight:800;color:#f87171;margin-top:2px">CHF ${fmt(totalPassif)}</div>
            </div>
            <div class="card" style="padding:14px;text-align:center;border-left:3px solid #10b981">
                <div style="font-size:10px;color:#94a3b8;text-transform:uppercase">Chiffre d'affaires</div>
                <div style="font-size:18px;font-weight:800;color:#6ee7b7;margin-top:2px">CHF ${fmt(totalCA)}</div>
            </div>
        </div>

        <div class="card" style="border-left:3px solid ${MISSION_ACCENT};overflow:hidden">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                    <tr style="background:#1e1b4b;color:${MISSION_LIGHT}">
                        <th style="text-align:left;padding:8px 12px;width:80px">Compte</th>
                        <th style="text-align:left;padding:8px 12px">Libellé</th>
                        <th style="text-align:right;padding:8px 12px">N (CHF)</th>
                        <th style="text-align:right;padding:8px 12px">N-1 (CHF)</th>
                        <th style="text-align:right;padding:8px 12px">Var.</th>
                        <th style="text-align:center;padding:8px 12px">Cycle</th>
                    </tr>
                </thead>
                <tbody>
                    ${tb.map(r => {
                        const varPct = r.n1 ? ((r.n - r.n1) / Math.abs(r.n1)) * 100 : 0;
                        const varColor = Math.abs(varPct) > 20 ? '#fbbf24' : '#94a3b8';
                        return `
                            <tr style="border-top:1px solid #1e293b">
                                <td style="padding:6px 12px;color:${MISSION_ACCENT};font-family:monospace">${r.compte}</td>
                                <td style="padding:6px 12px;color:#cbd5e1">${escapeHtml(r.libelle)}</td>
                                <td style="padding:6px 12px;text-align:right;color:#cbd5e1;font-variant-numeric:tabular-nums">${fmt(r.n)}</td>
                                <td style="padding:6px 12px;text-align:right;color:#94a3b8;font-variant-numeric:tabular-nums">${fmt(r.n1)}</td>
                                <td style="padding:6px 12px;text-align:right;color:${varColor};font-variant-numeric:tabular-nums">
                                    ${varPct > 0 ? '+' : ''}${varPct.toFixed(1)}%
                                </td>
                                <td style="padding:6px 12px;text-align:center;color:#64748b;font-size:11px">${escapeHtml(r.cycle || '')}</td>
                            </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}

// ── Panel : Findings ──

function _renderFindingsPanel(host) {
    const scenario = _missionState.snapshot.scenario || {};
    const findings = scenario.findings || [];
    const detected = new Set((_missionState.snapshot.findings || []).filter(f => f.detected).map(f => f.finding_key));

    const fmt = v => (v || 0).toLocaleString('fr-CH', {minimumFractionDigits:0, maximumFractionDigits:0});
    const detectedSum = findings.filter(f => detected.has(f.key)).reduce((s, f) => s + (f.amount || 0), 0);
    const totalSum = findings.reduce((s, f) => s + (f.amount || 0), 0);

    const mat = scenario.materialite?.pm || 0;

    host.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
            <div class="card" style="padding:14px;text-align:center;border-left:3px solid #10b981">
                <div style="font-size:10px;color:#94a3b8;text-transform:uppercase">Détectés</div>
                <div style="font-size:18px;font-weight:800;color:#6ee7b7;margin-top:2px">
                    ${detected.size} / ${findings.length}
                </div>
            </div>
            <div class="card" style="padding:14px;text-align:center;border-left:3px solid #f59e0b">
                <div style="font-size:10px;color:#94a3b8;text-transform:uppercase">Impact détecté (CHF)</div>
                <div style="font-size:18px;font-weight:800;color:#fbbf24;margin-top:2px">${fmt(detectedSum)}</div>
            </div>
            <div class="card" style="padding:14px;text-align:center;border-left:3px solid ${MISSION_ACCENT}">
                <div style="font-size:10px;color:#94a3b8;text-transform:uppercase">Matérialité</div>
                <div style="font-size:18px;font-weight:800;color:${MISSION_LIGHT};margin-top:2px">${fmt(mat)}</div>
            </div>
        </div>

        <div style="font-size:12px;color:#94a3b8;margin-bottom:12px">
            ⚠️ Les findings non détectés restent invisibles jusqu'à la fin de mission.
            Les findings détectés apparaissent avec leur impact.
        </div>

        ${findings.filter(f => detected.has(f.key)).map(f => `
            <div class="card" style="padding:14px;margin-bottom:10px;border-left:3px solid #10b981">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div style="flex:1">
                        <div style="font-size:13px;font-weight:700;color:${MISSION_LIGHT}">
                            ✅ ${escapeHtml(f.title)}
                        </div>
                        <div style="font-size:11px;color:#94a3b8;margin-top:2px">
                            Cycle : ${escapeHtml(f.cycle)} · Assertion : ${escapeHtml(f.assertion)}
                        </div>
                        <div style="font-size:11px;color:#a78bfa;margin-top:2px">
                            📚 ${escapeHtml(f.exam_ref || '')}
                        </div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-size:11px;color:#94a3b8">Impact</div>
                        <div style="font-size:16px;font-weight:800;color:#fbbf24">CHF ${fmt(f.amount)}</div>
                    </div>
                </div>
            </div>
        `).join('') || '<div style="color:#94a3b8;padding:20px;text-align:center;font-size:13px">Aucun finding détecté pour l\'instant</div>'}
    `;
}

// ── Phase advancement ──

async function _advancePhase() {
    const snap = _missionState.snapshot;
    const scenario = snap.scenario;
    const curIdx = scenario.phases.findIndex(p => p.id === snap.mission.current_phase);
    if (curIdx < 0 || curIdx >= scenario.phases.length - 1) return;
    const nextPhase = scenario.phases[curIdx + 1];

    // Check completion
    const curPhase = scenario.phases[curIdx];
    const decided = new Set((snap.decisions || []).map(d => d.decision_key));
    const open = (curPhase.tasks || []).filter(t => !decided.has(t.id));
    if (open.length > 0) {
        if (!confirm(`${open.length} tâche(s) non complétée(s) pour cette phase. Passer quand même ?`)) return;
    }

    await api('mission_advance_phase', _missionState.activeMissionId, nextPhase.id);
    // Trigger random event (server decides probability)
    await api('mission_trigger_random_event', _missionState.activeMissionId, nextPhase.id);
    _missionState.currentPanel = 'inbox';
    await _refreshSnapshot();
}

async function _finishMission() {
    // Final opinion is done via a 'final_opinion' task. If user hasn't clicked it yet,
    // take them to the tasks panel.
    const snap = _missionState.snapshot;
    const scenario = snap.scenario;
    const phase = scenario.phases.find(p => p.id === snap.mission.current_phase);
    const finalTask = (phase?.tasks || []).find(t => t.type === 'final_opinion');
    if (finalTask) {
        _missionState.currentPanel = 'tasks';
        _renderMissionDashboard(document.getElementById('auditContent'));
        return;
    }
    // Fallback: direct debrief without opinion
    const result = await api('mission_finish', _missionState.activeMissionId, 'qualifiee');
    _missionState.debriefData = result;
    _missionState.view = 'debrief';
    const host = document.getElementById('auditContent');
    if (host) renderMission(host);
}

async function _refreshSnapshot() {
    const snap = await api('get_mission_full', _missionState.activeMissionId);
    if (snap) {
        _missionState.snapshot = snap;
        _renderMissionDashboard(document.getElementById('auditContent'));
    }
}

// ── View 3 : Debriefing ──

async function _renderMissionDebrief(container) {
    let debrief = _missionState.debriefData;
    const mid = _missionState.activeMissionId;
    const snap = await api('get_mission_full', mid);
    if (!snap) { _backToMissionPicker(); return; }
    const scenario = snap.scenario || {};
    const mission = snap.mission;

    // If we haven't freshly finished, rebuild debrief from data
    if (!debrief) {
        debrief = {
            score: mission.score || 0,
            max_score: 300,
            pct: Math.round((mission.score || 0) / 3),
            correct_opinion: scenario.correct_opinion,
            chosen_opinion: mission.final_opinion,
            detected_findings: (scenario.findings || []).filter(f =>
                (snap.findings || []).some(df => df.finding_key === f.key && df.detected)),
            missed_findings: (scenario.findings || []).filter(f =>
                !(snap.findings || []).some(df => df.finding_key === f.key && df.detected)),
            debrief: scenario.debrief || {},
            breakdown: {}
        };
    }

    const pct = debrief.pct || 0;
    let mood, color;
    if (pct >= 80) { mood = '🏆 Excellent junior EY'; color = '#10b981'; }
    else if (pct >= 60) { mood = '💪 Solide performance'; color = '#f59e0b'; }
    else if (pct >= 40) { mood = '📚 À retravailler'; color = '#fb923c'; }
    else { mood = '⚠️ Mission risquée'; color = '#ef4444'; }

    const opinionMatch = debrief.chosen_opinion === debrief.correct_opinion;
    const opinionLabels = {
        sans_reserve:'Sans réserve',
        qualifiee:'Avec réserve (qualified)',
        defavorable:'Défavorable (adverse)',
        disclaimer:'Impossibilité d\'exprimer une opinion'
    };

    container.innerHTML = `
        <div style="margin-bottom:14px">
            <button onclick="_backToMissionPicker()"
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:6px 12px;border-radius:5px;cursor:pointer;font-size:12px">
                ← Menu missions
            </button>
        </div>

        <div class="card" style="padding:32px;text-align:center;border-left:4px solid ${color};margin-bottom:18px">
            <div style="font-size:48px;margin-bottom:6px">${mood.split(' ')[0]}</div>
            <div style="font-size:18px;font-weight:700;color:${MISSION_LIGHT};margin-bottom:14px">
                ${escapeHtml(mission.client_name)} — mission terminée
            </div>
            <div style="font-size:40px;font-weight:800;color:${color}">${debrief.score}/${debrief.max_score}</div>
            <div style="font-size:14px;color:#94a3b8;margin-top:4px">${pct}% — ${mood}</div>
        </div>

        <!-- Score breakdown -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">
            ${Object.entries(debrief.breakdown || {}).map(([k, v]) => `
                <div class="card" style="padding:12px;text-align:center">
                    <div style="font-size:11px;color:#94a3b8;text-transform:uppercase">${escapeHtml(k)}</div>
                    <div style="font-size:18px;font-weight:700;color:${MISSION_LIGHT};margin-top:2px">${v}</div>
                </div>
            `).join('')}
        </div>

        <!-- Opinion verdict -->
        <div class="card" style="padding:18px;border-left:3px solid ${opinionMatch ? '#10b981' : '#ef4444'};margin-bottom:18px">
            <div style="font-size:13px;font-weight:700;color:${MISSION_LIGHT};margin-bottom:8px">
                ${opinionMatch ? '✅' : '❌'} Opinion choisie vs opinion correcte
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
                <div>
                    <div style="font-size:11px;color:#94a3b8">Ton choix</div>
                    <div style="font-size:14px;font-weight:700;color:${opinionMatch ? '#6ee7b7' : '#fca5a5'};margin-top:2px">
                        ${escapeHtml(opinionLabels[debrief.chosen_opinion] || debrief.chosen_opinion || '—')}
                    </div>
                </div>
                <div>
                    <div style="font-size:11px;color:#94a3b8">Réponse attendue</div>
                    <div style="font-size:14px;font-weight:700;color:#6ee7b7;margin-top:2px">
                        ${escapeHtml(opinionLabels[debrief.correct_opinion] || debrief.correct_opinion || '—')}
                    </div>
                </div>
            </div>
        </div>

        <!-- Findings breakdown -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">
            <div class="card" style="padding:14px;border-left:3px solid #10b981">
                <div style="font-size:13px;font-weight:700;color:#6ee7b7;margin-bottom:8px">
                    ✅ Findings détectés (${(debrief.detected_findings || []).length})
                </div>
                ${(debrief.detected_findings || []).map(f => `
                    <div style="padding:6px 0;border-top:1px solid #1e293b;font-size:12px;color:#cbd5e1">
                        ${escapeHtml(f.title)}
                        <span style="float:right;color:#6ee7b7">CHF ${(f.amount || 0).toLocaleString('fr-CH')}</span>
                    </div>`).join('') || '<div style="color:#94a3b8;font-size:12px">Aucun</div>'}
            </div>
            <div class="card" style="padding:14px;border-left:3px solid #ef4444">
                <div style="font-size:13px;font-weight:700;color:#fca5a5;margin-bottom:8px">
                    ❌ Findings manqués (${(debrief.missed_findings || []).length})
                </div>
                ${(debrief.missed_findings || []).map(f => `
                    <div style="padding:6px 0;border-top:1px solid #1e293b;font-size:12px;color:#cbd5e1">
                        ${escapeHtml(f.title)}
                        <div style="font-size:11px;color:#94a3b8;margin-top:2px">
                            💡 ${escapeHtml(f.hint || '')}
                        </div>
                    </div>`).join('') || '<div style="color:#94a3b8;font-size:12px">Aucun</div>'}
            </div>
        </div>

        <!-- Debrief -->
        ${debrief.debrief?.key_lessons ? `
            <div class="card" style="padding:18px;border-left:3px solid ${MISSION_ACCENT};margin-bottom:18px">
                <div style="font-size:13px;font-weight:700;color:${MISSION_LIGHT};margin-bottom:10px">
                    🎓 Leçons clés à retenir
                </div>
                <ul style="margin:0;padding-left:20px;color:#cbd5e1;font-size:13px;line-height:1.7">
                    ${debrief.debrief.key_lessons.map(l => `<li>${escapeHtml(l)}</li>`).join('')}
                </ul>
            </div>` : ''}

        ${debrief.debrief?.what_sophie_would_say ? `
            <div class="card" style="padding:18px;border-left:3px solid #3b82f6;background:rgba(59,130,246,0.08)">
                <div style="font-size:13px;font-weight:700;color:#60a5fa;margin-bottom:8px">
                    💬 Le mot de Sophie Ruiz (Senior)
                </div>
                <div style="color:#cbd5e1;font-size:13px;line-height:1.7;font-style:italic">
                    « ${escapeHtml(debrief.debrief.what_sophie_would_say)} »
                </div>
            </div>` : ''}

        <div style="display:flex;gap:10px;justify-content:center;margin-top:20px">
            <button onclick="_backToMissionPicker()"
                    style="background:${MISSION_ACCENT};border:none;color:white;
                           padding:10px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
                📋 Menu missions
            </button>
            <button onclick="_exportMissionPdf()"
                    style="background:#10b981;border:none;color:white;
                           padding:10px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">
                📥 Exporter dossier PDF
            </button>
        </div>
    `;
}

async function _exportMissionPdf() {
    const res = await api('export_mission_pdf', _missionState.activeMissionId);
    if (res && res.ok) {
        alert('PDF généré : ' + res.path);
    } else if (res && !res.cancelled) {
        alert('Erreur : ' + (res.error || 'inconnue'));
    }
}
