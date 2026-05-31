/* ═══════════════════════════════════════════════
   Module Audit — Swiss CPA + Pratique EY
   Vague 1 : squelette UI (6 onglets) + état
   Le contenu est rempli en Vagues 2-4.
   ═══════════════════════════════════════════════ */

const AUDIT_TABS = [
    { id: 'cours',        label: 'Cours MSA',     icon: '📚', desc: 'Base de cours — contrôle ordinaire (MSA) + restreint (NCR)' },
    { id: 'cas',          label: 'Cas pratiques', icon: '📝', desc: 'Études de cas examen EXPERTsuisse — énoncé + solution pas-à-pas' },
    { id: 'arbres',       label: 'Arbres décision', icon: '🌳', desc: 'Logigrammes interactifs : opinion, going concern, leasing, révision, consolidation' },
    { id: 'procedures',   label: 'Procédures',    icon: '✅', desc: 'Matrice assertions × procédures par cycle (terrain)' },
    { id: 'independance', label: 'Indépendance',  icon: '⚖️', desc: 'Éthique IESBA, 5 menaces, rotation, honoraires, NOCLAR' },
    { id: 'modeles',      label: 'Modèles',       icon: '📄', desc: 'Templates : lettres, rapports (UQAD), paragraphes, avis au juge' },
    { id: 'examens',      label: 'Examens blancs', icon: '⏱️', desc: 'Mocks chronométrés avec score + correction' },
    { id: 'timeline',     label: 'Timeline',      icon: '🗓️', desc: 'Frise de mission : acceptation → reporting + délais clés' },
    { id: 'fraude',       label: 'Fraude & NOCLAR', icon: '🚨', desc: 'Triangle de la fraude, JE testing, red flags, signalement NOCLAR' },
    { id: 'goingconcern', label: 'Going concern', icon: '📉', desc: 'ISA 570 + surendettement CO 725 + matrice 4 scénarios' },
    { id: 'actualites',   label: 'Actualités',    icon: '🆕', desc: 'Réformes : ISA révisées, ISQM, droit SA 2023, Pillar 2, CSRD' },
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
        case 'cas':         _renderAuditCas(host);        break;
        case 'arbres':      _renderAuditArbres(host);     break;
        case 'procedures':  _renderAuditProcedures(host); break;
        case 'independance': _renderAuditBlocs(host, 'independance'); break;
        case 'modeles':     _renderAuditModeles(host);    break;
        case 'examens':     _renderAuditExamens(host);    break;
        case 'timeline':    _renderAuditTimeline(host);   break;
        case 'fraude':      _renderAuditBlocs(host, 'fraude'); break;
        case 'goingconcern': _renderAuditBlocs(host, 'goingconcern'); break;
        case 'actualites':  _renderAuditBlocs(host, 'actualites'); break;
        case 'quiz':        _renderAuditQuiz(host);       break;
        default:            _renderAuditNas(host);
    }
}

// ─────────────────────────────────────────────────────────────────
// TIMELINE DE MISSION — Frise verticale des phases d'audit
// ─────────────────────────────────────────────────────────────────
function _renderAuditTimeline(host) {
    const tl = _auditData.timeline || {};
    const phases = tl.phases || [];

    host.innerHTML = `
        <div class="ref-section-title">${tl._icon || '🗓️'} ${escapeHtml(tl._label || 'Timeline')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:24px">
            ${escapeHtml(tl._description || '')}
        </p>
        <div style="position:relative;padding-left:8px">
            ${phases.map((p, idx) => _renderTimelinePhase(idx, p, idx === phases.length - 1)).join('')}
        </div>
    `;
}

function _renderTimelinePhase(idx, p, isLast) {
    const color = p.color || AUDIT_ACCENT;
    const id = `tl-${idx}`;
    return `
        <div style="position:relative;padding-left:42px;padding-bottom:${isLast ? '0' : '24px'}">
            ${!isLast ? `<div style="position:absolute;left:15px;top:34px;bottom:0;width:2px;background:linear-gradient(${color}, #1e293b)"></div>` : ''}
            <div style="position:absolute;left:0;top:2px;width:32px;height:32px;border-radius:50%;background:${color};
                        display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 0 4px #0a0f1c">
                ${p.icon || '•'}
            </div>
            <div class="card" style="border-left:3px solid ${color}">
                <div onclick="_toggleBloc('${id}')"
                     style="padding:12px 16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;
                            transition:background 0.15s" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background=''">
                    <div style="flex:1;min-width:0">
                        <div style="font-size:14px;font-weight:800;color:${AUDIT_LIGHT}">${escapeHtml(p.nom)}</div>
                        <div style="font-size:11px;color:${color};font-weight:600;margin-top:2px">${escapeHtml(p.periode || '')}</div>
                    </div>
                    <span id="${id}-arrow" style="color:${color};font-size:14px">▸</span>
                </div>
                <div id="${id}" style="display:none;padding:0 16px 16px 16px">
                    <div style="font-size:13px;color:#cbd5e1;line-height:1.6;margin-bottom:12px;font-style:italic">${_auditCrossRef(p.objectif || '')}</div>
                    ${_tlSection('🔧 Activités', p.activites, color, '#cbd5e1')}
                    ${_tlSection('📦 Livrables', p.livrables, '#16a34a', '#bbf7d0')}
                    ${(p.normes || []).length ? `<div style="margin-bottom:10px"><span style="font-size:11px;font-weight:700;color:${color}">📐 Normes : </span>${p.normes.map(n => `<span style="font-size:11px;background:#1e293b;color:#94a3b8;padding:2px 8px;border-radius:5px;margin-right:4px">${escapeHtml(n)}</span>`).join('')}</div>` : ''}
                    ${(p.delais || []).length ? `<div style="padding:9px 12px;background:#1e1b0a;border-left:3px solid #fbbf24;border-radius:5px">
                        <span style="font-size:11px;font-weight:700;color:#fbbf24">⏱️ Délais : </span>
                        <span style="font-size:12px;color:#fde68a">${p.delais.map(d => escapeHtml(d)).join(' · ')}</span></div>` : ''}
                </div>
            </div>
        </div>`;
}

function _tlSection(title, items, color, textColor) {
    if (!items || !items.length) return '';
    return `
        <div style="margin-bottom:10px">
            <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:5px">${title}</div>
            <ul style="margin:0;padding-left:18px;color:${textColor};font-size:12px;line-height:1.7">
                ${items.map(i => `<li>${_auditCrossRef(i)}</li>`).join('')}
            </ul>
        </div>`;
}

// ─────────────────────────────────────────────────────────────────
// EXAMENS BLANCS — Mock chronométré avec score + correction
// ─────────────────────────────────────────────────────────────────
let _examState = null;   // {examId, answers:{}, remaining, timerId, submitted}

function _renderAuditExamens(host) {
    // Nettoyer un timer éventuel si on revient à la liste
    if (_examState && _examState.timerId) { clearInterval(_examState.timerId); _examState.timerId = null; }
    _examState = null;

    const ex = _auditData.examens_blancs || {};
    const exams = ex.exams || [];

    host.innerHTML = `
        <div class="ref-section-title">${ex._icon || '⏱️'} ${escapeHtml(ex._label || 'Examens blancs')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:18px">
            ${escapeHtml(ex._description || '')}
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
            ${exams.map(e => `
                <div style="padding:18px;border-radius:10px;background:#0d1424;border:1px solid #1e293b;border-left:4px solid ${AUDIT_ACCENT}">
                    <div style="font-size:28px;margin-bottom:8px">⏱️</div>
                    <div style="font-size:15px;font-weight:800;color:${AUDIT_LIGHT};line-height:1.4;margin-bottom:8px">${escapeHtml(e.titre)}</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;font-size:11px">
                        <span style="background:#1e1b4b;color:#a78bfa;padding:2px 9px;border-radius:10px">📝 ${e.questions.length} QCM</span>
                        <span style="background:#1e1b4b;color:#a78bfa;padding:2px 9px;border-radius:10px">⏱️ ${e.duree_min} min</span>
                    </div>
                    <button onclick="_startExam('${e.id}')"
                            style="width:100%;padding:11px;border-radius:7px;cursor:pointer;background:${AUDIT_ACCENT};
                                   border:none;color:#fff;font-size:13px;font-weight:700">🚀 Démarrer l'examen</button>
                </div>
            `).join('')}
        </div>
    `;
}

function _startExam(examId) {
    const exams = (_auditData.examens_blancs || {}).exams || [];
    const exam = exams.find(e => e.id === examId);
    if (!exam) return;
    _examState = { examId, answers: {}, remaining: exam.duree_min * 60, timerId: null, submitted: false };
    _examState.timerId = setInterval(_examTick, 1000);
    _renderExamRunner(exam);
}

function _examTick() {
    if (!_examState || _examState.submitted) return;
    _examState.remaining--;
    const el = document.getElementById('examTimer');
    if (el) {
        const m = Math.floor(_examState.remaining / 60);
        const s = _examState.remaining % 60;
        el.textContent = `${m}:${String(s).padStart(2, '0')}`;
        if (_examState.remaining <= 60) el.style.color = '#dc2626';
    }
    if (_examState.remaining <= 0) { _submitExam(true); }
}

function _examPick(qi, oi) {
    if (!_examState || _examState.submitted) return;
    _examState.answers[qi] = oi;
    // Mettre à jour visuellement les boutons de cette question
    const exams = (_auditData.examens_blancs || {}).exams || [];
    const exam = exams.find(e => e.id === _examState.examId);
    document.querySelectorAll(`[data-exq="${qi}"]`).forEach(btn => {
        const isSel = parseInt(btn.dataset.exo) === oi;
        btn.style.background = isSel ? AUDIT_ACCENT : '#1e293b';
        btn.style.borderColor = isSel ? AUDIT_ACCENT : '#334155';
        btn.style.color = isSel ? '#fff' : '#e2e8f0';
    });
    // Compteur de réponses
    const cnt = document.getElementById('examAnsweredCount');
    if (cnt && exam) cnt.textContent = `${Object.keys(_examState.answers).length}/${exam.questions.length} répondues`;
}

function _renderExamRunner(exam) {
    const host = document.getElementById('auditContent');
    if (!host) return;
    const m = Math.floor(_examState.remaining / 60);
    const s = _examState.remaining % 60;

    host.innerHTML = `
        <div style="position:sticky;top:0;z-index:10;background:#0a0f1c;padding:12px 14px;border-radius:10px;
                    border:1px solid ${AUDIT_ACCENT};margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div style="font-size:14px;font-weight:800;color:${AUDIT_LIGHT}">${escapeHtml(exam.titre)}</div>
            <div style="display:flex;gap:14px;align-items:center">
                <span id="examAnsweredCount" style="font-size:12px;color:#94a3b8">0/${exam.questions.length} répondues</span>
                <span style="font-size:18px;font-weight:800;color:#4ade80;font-variant-numeric:tabular-nums">⏱️ <span id="examTimer">${m}:${String(s).padStart(2,'0')}</span></span>
            </div>
        </div>
        <div>
            ${exam.questions.map((q, qi) => `
                <div style="margin-bottom:16px;padding:14px 16px;background:#0d1424;border-radius:8px;border:1px solid #1e293b">
                    <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:12px;line-height:1.5">
                        <span style="color:${AUDIT_ACCENT}">Q${qi+1}.</span> ${escapeHtml(q.q)}
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px">
                        ${q.options.map((o, oi) => `
                            <button data-exq="${qi}" data-exo="${oi}" onclick="_examPick(${qi}, ${oi})"
                                    style="text-align:left;padding:10px 14px;border-radius:7px;cursor:pointer;
                                           background:#1e293b;border:1px solid #334155;color:#e2e8f0;font-size:13px;
                                           transition:all 0.12s">
                                ${String.fromCharCode(65+oi)}. ${escapeHtml(o)}
                            </button>`).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
        <div style="display:flex;gap:10px;margin-top:8px">
            <button onclick="_submitExam(false)"
                    style="flex:1;padding:13px;border-radius:8px;cursor:pointer;background:linear-gradient(135deg,#16a34a,#15803d);
                           border:none;color:#fff;font-size:14px;font-weight:800">✓ Terminer & voir le score</button>
            <button onclick="_renderAuditExamens(document.getElementById('auditContent'))"
                    style="padding:13px 18px;border-radius:8px;cursor:pointer;background:#1e293b;border:1px solid #334155;
                           color:#94a3b8;font-size:13px;font-weight:600">Abandonner</button>
        </div>
    `;
}

function _submitExam(timedOut) {
    if (!_examState) return;
    _examState.submitted = true;
    if (_examState.timerId) { clearInterval(_examState.timerId); _examState.timerId = null; }

    const exams = (_auditData.examens_blancs || {}).exams || [];
    const exam = exams.find(e => e.id === _examState.examId);
    if (!exam) return;

    let score = 0;
    exam.questions.forEach((q, qi) => { if (_examState.answers[qi] === q.correct) score++; });
    const total = exam.questions.length;
    const pct = Math.round(score / total * 100);
    const scoreColor = pct >= 80 ? '#16a34a' : (pct >= 60 ? '#f59e0b' : '#dc2626');
    const verdict = pct >= 80 ? '🎉 Excellent !' : (pct >= 60 ? '👍 Correct, continue' : '📚 À retravailler');

    const host = document.getElementById('auditContent');
    if (!host) return;

    host.innerHTML = `
        ${timedOut ? `<div style="margin-bottom:14px;padding:10px 14px;background:#3f1612;border-left:3px solid #dc2626;border-radius:6px;color:#fca5a5;font-size:13px">⏱️ Temps écoulé — examen soumis automatiquement.</div>` : ''}
        <div style="text-align:center;padding:24px;border-radius:12px;background:#0d1424;border:2px solid ${scoreColor};margin-bottom:20px">
            <div style="font-size:42px;font-weight:900;color:${scoreColor}">${score}/${total}</div>
            <div style="font-size:18px;font-weight:700;color:${scoreColor};margin:4px 0">${pct}% — ${verdict}</div>
        </div>
        <div style="font-size:13px;font-weight:700;color:${AUDIT_ACCENT};margin-bottom:12px">📋 CORRECTION DÉTAILLÉE</div>
        ${exam.questions.map((q, qi) => {
            const userAns = _examState.answers[qi];
            const isCorrect = userAns === q.correct;
            const answered = userAns !== undefined;
            return `
                <div style="margin-bottom:14px;padding:14px 16px;background:#0d1424;border-radius:8px;
                            border-left:3px solid ${isCorrect ? '#16a34a' : '#dc2626'}">
                    <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:10px;line-height:1.5">
                        ${isCorrect ? '✅' : '❌'} <span style="color:${AUDIT_ACCENT}">Q${qi+1}.</span> ${escapeHtml(q.q)}
                    </div>
                    ${q.options.map((o, oi) => {
                        let bg = '#0a0f1c', bd = '#1e293b', cl = '#94a3b8', tag = '';
                        if (oi === q.correct) { bg = '#0a1a0f'; bd = '#16a34a'; cl = '#bbf7d0'; tag = ' ✓ Bonne réponse'; }
                        else if (oi === userAns) { bg = '#3f1612'; bd = '#dc2626'; cl = '#fca5a5'; tag = ' ✗ Ta réponse'; }
                        return `<div style="padding:7px 12px;margin-bottom:5px;background:${bg};border:1px solid ${bd};border-radius:5px;font-size:12px;color:${cl}">
                                    ${String.fromCharCode(65+oi)}. ${escapeHtml(o)}<span style="font-weight:700">${tag}</span></div>`;
                    }).join('')}
                    ${!answered ? `<div style="font-size:11px;color:#f59e0b;margin:6px 0">⚠️ Non répondue</div>` : ''}
                    <div style="margin-top:8px;padding:9px 12px;background:#0a0f1c;border-left:3px solid #3b82f6;border-radius:5px;font-size:12px;color:#cbd5e1;line-height:1.6">
                        💡 ${_auditCrossRef(q.explication)}
                    </div>
                </div>`;
        }).join('')}
        <div style="display:flex;gap:10px;margin-top:8px">
            <button onclick="_startExam('${exam.id}')"
                    style="flex:1;padding:12px;border-radius:8px;cursor:pointer;background:${AUDIT_ACCENT};border:none;color:#fff;font-size:13px;font-weight:700">🔄 Refaire cet examen</button>
            <button onclick="_renderAuditExamens(document.getElementById('auditContent'))"
                    style="padding:12px 18px;border-radius:8px;cursor:pointer;background:#1e293b;border:1px solid #334155;color:#94a3b8;font-size:13px;font-weight:600">← Tous les examens</button>
        </div>
    `;
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─────────────────────────────────────────────────────────────────
// MODÈLES & WORDING — Templates avec copie presse-papier
// ─────────────────────────────────────────────────────────────────
let _modActiveCat = null;
// Stockage des contenus pour la copie (évite les soucis d'échappement inline)
const _modContents = {};

function _renderAuditModeles(host) {
    const m = _auditData.modeles || {};
    const cats = m.categories || [];
    if (!_modActiveCat && cats.length) _modActiveCat = cats[0].id;

    // Indexer tous les contenus
    cats.forEach(c => (c.templates || []).forEach(t => { _modContents[t.id] = t.contenu; }));

    host.innerHTML = `
        <div class="ref-section-title">${m._icon || '📄'} ${escapeHtml(m._label || 'Modèles')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:14px">
            ${escapeHtml(m._description || '')}
        </p>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px">
            ${cats.map(c => `
                <button onclick="_setModCat('${c.id}')"
                        style="padding:8px 13px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;
                               background:${_modActiveCat === c.id ? (c.color || AUDIT_ACCENT) : '#1e293b'};
                               color:${_modActiveCat === c.id ? '#fff' : '#94a3b8'};
                               border:1px solid ${_modActiveCat === c.id ? (c.color || AUDIT_ACCENT) : '#334155'}">
                    ${escapeHtml(c.label)}
                </button>`).join('')}
        </div>
        <div id="modContent">${_renderModCat(cats.find(c => c.id === _modActiveCat))}</div>
    `;
}

function _renderModCat(cat) {
    if (!cat) return '';
    const color = cat.color || AUDIT_ACCENT;
    return (cat.templates || []).map((t, idx) => {
        const id = `mod-${cat.id}-${idx}`;
        return `
            <div class="card" style="margin-bottom:14px;border-left:3px solid ${color}">
                <div style="padding:13px 18px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                    <div onclick="_toggleMod('${id}')" style="flex:1;cursor:pointer">
                        <div style="font-size:14px;font-weight:800;color:${AUDIT_LIGHT}">${escapeHtml(t.titre)}</div>
                        ${t.contexte ? `<div style="font-size:12px;color:#94a3b8;margin-top:4px;line-height:1.5">${escapeHtml(t.contexte)}</div>` : ''}
                    </div>
                    <button onclick="_copyMod('${t.id}', this)"
                            style="flex-shrink:0;padding:7px 12px;border-radius:6px;cursor:pointer;background:${color};
                                   border:none;color:#fff;font-size:12px;font-weight:700;white-space:nowrap">📋 Copier</button>
                </div>
                <div id="${id}" style="display:none;padding:0 18px 18px 18px">
                    <pre style="margin:0;padding:14px 16px;background:#0a0f1c;border-radius:8px;border:1px solid #1e293b;
                                color:#cbd5e1;font-size:12px;line-height:1.7;white-space:pre-wrap;font-family:'Segoe UI',system-ui,sans-serif;
                                max-height:none;overflow:visible">${escapeHtml(t.contenu)}</pre>
                </div>
            </div>`;
    }).join('');
}

function _setModCat(catId) {
    _modActiveCat = catId;
    const host = document.getElementById('auditContent');
    if (host) _renderAuditModeles(host);
}

function _toggleMod(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function _copyMod(tplId, btn) {
    const txt = _modContents[tplId] || '';
    const done = () => {
        const old = btn.textContent;
        btn.textContent = '✓ Copié !';
        setTimeout(() => { btn.textContent = old; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done).catch(() => _copyFallback(txt, done));
    } else {
        _copyFallback(txt, done);
    }
}

function _copyFallback(txt, done) {
    try {
        const ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
    } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────
// RENDERER GÉNÉRIQUE "BLOCS" — réutilisé par Indépendance, Fraude, Going concern, Actualités
// Chaque bloc : {id, titre, icon, color, intro, table?, liste?, warning?, example?}
// ─────────────────────────────────────────────────────────────────
function _renderAuditBlocs(host, dataKey) {
    const d = _auditData[dataKey] || {};
    const blocs = d.blocs || [];

    host.innerHTML = `
        <div class="ref-section-title">${d._icon || '📄'} ${escapeHtml(d._label || '')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:18px">
            ${escapeHtml(d._description || '')}
        </p>
        <div>${blocs.map((b, idx) => _renderBloc(idx, b)).join('')}</div>
    `;
}

function _renderBloc(idx, b) {
    const color = b.color || AUDIT_ACCENT;
    const id = `bloc-${idx}`;
    let inner = '';
    if (b.intro) inner += `<div style="font-size:13px;color:#cbd5e1;line-height:1.7;margin-bottom:12px">${_auditCrossRef(b.intro)}</div>`;
    if (b.table) inner += _renderBlocTable(b.table, color);
    if (b.liste && b.liste.length) {
        inner += `<ul style="margin:10px 0 0 0;padding-left:20px;color:#cbd5e1;font-size:13px;line-height:1.8">
            ${b.liste.map(li => `<li>${_auditCrossRef(li)}</li>`).join('')}</ul>`;
    }
    if (b.example) {
        inner += `<div style="margin-top:12px;padding:11px 14px;background:#0a1a0f;border-left:3px solid #16a34a;border-radius:5px">
            <div style="font-size:11px;font-weight:700;color:#4ade80;margin-bottom:5px">📌 EXEMPLE</div>
            <div style="font-size:12px;color:#bbf7d0;line-height:1.6;white-space:pre-wrap">${_auditCrossRef(b.example)}</div></div>`;
    }
    if (b.warning) {
        inner += `<div style="margin-top:12px;padding:11px 14px;background:#1e1b0a;border-left:3px solid #fbbf24;border-radius:5px">
            <div style="font-size:11px;font-weight:700;color:#fbbf24;margin-bottom:5px">⚠️ À RETENIR</div>
            <div style="font-size:12px;color:#fde68a;line-height:1.6">${_auditCrossRef(b.warning)}</div></div>`;
    }
    return `
        <div class="card" style="margin-bottom:14px;border-left:3px solid ${color}">
            <div onclick="_toggleBloc('${id}')"
                 style="padding:13px 18px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;
                        transition:background 0.15s" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background=''">
                <span style="font-size:15px;font-weight:800;color:${color}">${b.icon || ''} ${escapeHtml(b.titre)}</span>
                <span id="${id}-arrow" style="color:${color};font-size:14px">▾</span>
            </div>
            <div id="${id}" style="display:block;padding:0 18px 18px 18px">${inner}</div>
        </div>`;
}

function _renderBlocTable(t, color) {
    return `
        <div style="overflow-x:auto;margin:8px 0">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                    <tr>${(t.headers || []).map(h => `<th style="text-align:left;padding:8px 10px;background:${color}22;color:${color};font-weight:700;border-bottom:2px solid ${color};white-space:nowrap">${escapeHtml(h)}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${(t.rows || []).map((row, ri) => `
                        <tr style="background:${ri % 2 ? '#0d1424' : '#0a0f1c'}">
                            ${row.map((cell, ci) => `<td style="padding:8px 10px;color:${ci === 0 ? '#e2e8f0' : '#cbd5e1'};font-weight:${ci === 0 ? '600' : '400'};line-height:1.5;border-bottom:1px solid #1e293b;vertical-align:top">${_auditCrossRef(cell)}</td>`).join('')}
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
}

function _toggleBloc(id) {
    const el = document.getElementById(id);
    const arrow = document.getElementById(id + '-arrow');
    if (!el) return;
    const show = el.style.display === 'none';
    el.style.display = show ? 'block' : 'none';
    if (arrow) arrow.textContent = show ? '▾' : '▸';
}

// ─────────────────────────────────────────────────────────────────
// PROCÉDURES PAR ASSERTION — Matrice assertions × procédures par cycle
// ─────────────────────────────────────────────────────────────────
let _procActiveCycle = null;

function _renderAuditProcedures(host) {
    const pr = _auditData.procedures_assertions || {};
    const cycles = pr.cycles || [];
    const assertions = pr.assertions_ref || [];
    if (!_procActiveCycle && cycles.length) _procActiveCycle = cycles[0].id;

    host.innerHTML = `
        <div class="ref-section-title">${pr._icon || '✅'} ${escapeHtml(pr._label || 'Procédures par assertion')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:14px">
            ${escapeHtml(pr._description || '')}
        </p>
        <details style="margin-bottom:16px;background:#0a0f1c;border-radius:8px;border:1px solid #1e293b">
            <summary style="padding:10px 14px;cursor:pointer;font-size:13px;font-weight:700;color:${AUDIT_ACCENT}">
                📖 Rappel des assertions (ISA 315)
            </summary>
            <div style="padding:0 14px 14px 14px;display:flex;flex-direction:column;gap:8px">
                ${assertions.map(a => `
                    <div style="display:flex;gap:10px;align-items:flex-start">
                        <span style="background:${a.color};color:#fff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:4px;flex-shrink:0;min-width:28px;text-align:center">${escapeHtml(a.code)}</span>
                        <div><span style="font-size:13px;font-weight:700;color:#e2e8f0">${escapeHtml(a.nom)}</span>
                        <span style="font-size:12px;color:#94a3b8"> — ${escapeHtml(a.def)}</span></div>
                    </div>`).join('')}
            </div>
        </details>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px">
            ${cycles.map(c => `
                <button onclick="_setProcCycle('${c.id}')"
                        style="padding:8px 13px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;
                               background:${_procActiveCycle === c.id ? (c.color || AUDIT_ACCENT) : '#1e293b'};
                               color:${_procActiveCycle === c.id ? '#fff' : '#94a3b8'};
                               border:1px solid ${_procActiveCycle === c.id ? (c.color || AUDIT_ACCENT) : '#334155'}">
                    ${c.icon || ''} ${escapeHtml(c.nom)}
                </button>`).join('')}
        </div>
        <div id="procCycleContent">${_renderProcCycle(cycles.find(c => c.id === _procActiveCycle), assertions)}</div>
    `;
}

function _renderProcCycle(cycle, assertions) {
    if (!cycle) return '';
    const color = cycle.color || AUDIT_ACCENT;
    const aMap = {};
    (assertions || []).forEach(a => aMap[a.code] = a);
    return `
        <div style="margin-bottom:14px;padding:12px 16px;background:#0d1424;border-radius:8px;border-left:4px solid ${color}">
            <div style="font-size:16px;font-weight:800;color:${color};margin-bottom:8px">${cycle.icon || ''} ${escapeHtml(cycle.nom)}</div>
            <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px">⚠️ RISQUES PRINCIPAUX</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${(cycle.risques || []).map(r => `<span style="font-size:11px;background:#3f1612;color:#fca5a5;padding:3px 9px;border-radius:10px">${escapeHtml(r)}</span>`).join('')}
            </div>
        </div>
        ${(cycle.lignes || []).map(l => {
            const a = aMap[l.assertion] || {code: l.assertion, nom: l.assertion, color: AUDIT_ACCENT};
            return `
                <div style="margin-bottom:10px;border:1px solid #1e293b;border-radius:8px;overflow:hidden">
                    <div style="padding:11px 14px;background:#141d33;display:flex;gap:10px;align-items:center">
                        <span style="background:${a.color};color:#fff;font-size:11px;font-weight:800;padding:3px 9px;border-radius:5px;flex-shrink:0;min-width:30px;text-align:center">${escapeHtml(a.code)}</span>
                        <span style="font-size:13px;font-weight:700;color:#e2e8f0">${escapeHtml(a.nom)}</span>
                    </div>
                    <div style="padding:12px 14px;background:#0d1424">
                        <div style="font-size:12px;color:#fca5a5;margin-bottom:8px"><strong>Risque :</strong> ${_auditCrossRef(l.risque)}</div>
                        <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:5px">🔧 PROCÉDURES</div>
                        <ul style="margin:0;padding-left:20px;color:#cbd5e1;font-size:13px;line-height:1.7">
                            ${(l.procedures || []).map(p => `<li>${_auditCrossRef(p)}</li>`).join('')}
                        </ul>
                    </div>
                </div>`;
        }).join('')}
    `;
}

function _setProcCycle(cycleId) {
    _procActiveCycle = cycleId;
    const host = document.getElementById('auditContent');
    if (host) _renderAuditProcedures(host);
}

// ─────────────────────────────────────────────────────────────────
// ARBRES DE DÉCISION — Logigrammes interactifs
// ─────────────────────────────────────────────────────────────────
let _arbreActive = null;   // tree id en cours
let _arbreNode = null;     // node id courant
let _arbrePath = [];       // historique [{nodeId, question, answer}]

function _renderAuditArbres(host) {
    const ar = _auditData.arbres || {};
    const trees = ar.trees || [];

    if (_arbreActive) {
        const tree = trees.find(t => t.id === _arbreActive);
        if (tree) { _renderArbreRunner(host, tree); return; }
    }

    host.innerHTML = `
        <div class="ref-section-title">${ar._icon || '🌳'} ${escapeHtml(ar._label || 'Arbres de décision')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:18px">
            ${escapeHtml(ar._description || '')}
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
            ${trees.map(t => `
                <div onclick="_startArbre('${t.id}')"
                     style="cursor:pointer;padding:18px;border-radius:10px;background:#0d1424;
                            border:1px solid #1e293b;border-left:4px solid ${t.color || AUDIT_ACCENT};
                            transition:all 0.15s"
                     onmouseover="this.style.background='#141d33';this.style.transform='translateY(-2px)'"
                     onmouseout="this.style.background='#0d1424';this.style.transform=''">
                    <div style="font-size:30px;margin-bottom:8px">${t.icon || '🌳'}</div>
                    <div style="font-size:14px;font-weight:700;color:${AUDIT_LIGHT};line-height:1.4;margin-bottom:6px">${escapeHtml(t.titre)}</div>
                    <div style="font-size:12px;color:#94a3b8;line-height:1.5">${escapeHtml(t.intro || '')}</div>
                    <div style="margin-top:10px;font-size:12px;font-weight:700;color:${t.color || AUDIT_ACCENT}">Démarrer →</div>
                </div>
            `).join('')}
        </div>
    `;
}

function _startArbre(treeId) {
    const trees = (_auditData.arbres || {}).trees || [];
    const tree = trees.find(t => t.id === treeId);
    if (!tree) return;
    _arbreActive = treeId;
    _arbreNode = tree.start;
    _arbrePath = [];
    const host = document.getElementById('auditContent');
    if (host) _renderArbreRunner(host, tree);
}

function _arbreAnswer(nextId, answerLabel) {
    const trees = (_auditData.arbres || {}).trees || [];
    const tree = trees.find(t => t.id === _arbreActive);
    if (!tree) return;
    const cur = tree.nodes[_arbreNode];
    _arbrePath.push({ question: cur.text, answer: answerLabel });
    _arbreNode = nextId;
    const host = document.getElementById('auditContent');
    if (host) _renderArbreRunner(host, tree);
}

function _arbreReset() {
    const trees = (_auditData.arbres || {}).trees || [];
    const tree = trees.find(t => t.id === _arbreActive);
    if (!tree) return;
    _arbreNode = tree.start;
    _arbrePath = [];
    const host = document.getElementById('auditContent');
    if (host) _renderArbreRunner(host, tree);
}

function _arbreBack() {
    _arbreActive = null;
    _arbreNode = null;
    _arbrePath = [];
    const host = document.getElementById('auditContent');
    if (host) _renderAuditArbres(host);
}

function _renderArbreRunner(host, tree) {
    const color = tree.color || AUDIT_ACCENT;
    const node = tree.nodes[_arbreNode];

    const breadcrumb = _arbrePath.length ? `
        <div style="margin-bottom:16px;padding:12px 14px;background:#0a0f1c;border-radius:8px;border:1px solid #1e293b">
            <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:8px">📍 TON PARCOURS</div>
            ${_arbrePath.map((p, i) => `
                <div style="font-size:12px;color:#94a3b8;line-height:1.6;margin-bottom:4px">
                    <span style="color:${color}">${i+1}.</span> ${escapeHtml(p.question.length > 90 ? p.question.slice(0,90)+'…' : p.question)}
                    <span style="color:#4ade80;font-weight:600"> → ${escapeHtml(p.answer)}</span>
                </div>
            `).join('')}
        </div>` : '';

    let body;
    if (node.type === 'question') {
        body = `
            <div style="padding:20px;border-radius:10px;background:#0d1424;border:1px solid #1e293b;border-left:4px solid ${color}">
                <div style="font-size:11px;font-weight:700;color:${color};margin-bottom:10px">❓ QUESTION ${_arbrePath.length + 1}</div>
                <div style="font-size:15px;font-weight:600;color:${AUDIT_LIGHT};line-height:1.6;margin-bottom:18px">${escapeHtml(node.text)}</div>
                <div style="display:flex;flex-direction:column;gap:10px">
                    ${node.options.map(o => `
                        <button onclick="_arbreAnswer('${o.next}', ${JSON.stringify(o.label).replace(/"/g,'&quot;')})"
                                style="text-align:left;padding:13px 16px;border-radius:8px;cursor:pointer;
                                       background:#1e293b;border:1px solid #334155;color:#e2e8f0;font-size:13px;font-weight:600;
                                       transition:all 0.15s"
                                onmouseover="this.style.background='${color}';this.style.borderColor='${color}';this.style.color='#fff'"
                                onmouseout="this.style.background='#1e293b';this.style.borderColor='#334155';this.style.color='#e2e8f0'">
                            ${escapeHtml(o.label)}
                        </button>
                    `).join('')}
                </div>
            </div>`;
    } else {
        const variant = node.variant || 'success';
        const vcolor = variant === 'danger' ? '#dc2626' : (variant === 'warning' ? '#f59e0b' : '#16a34a');
        const vbg = variant === 'danger' ? '#3f1612' : (variant === 'warning' ? '#1e1b0a' : '#0a1a0f');
        const vicon = variant === 'danger' ? '🔴' : (variant === 'warning' ? '🟠' : '🟢');
        body = `
            <div style="padding:22px;border-radius:10px;background:${vbg};border:2px solid ${vcolor}">
                <div style="font-size:11px;font-weight:700;color:${vcolor};margin-bottom:8px">${vicon} RÉSULTAT</div>
                <div style="font-size:18px;font-weight:800;color:${vcolor};line-height:1.3;margin-bottom:14px">${escapeHtml(node.text)}</div>
                <div style="font-size:13px;color:#e2e8f0;line-height:1.7;white-space:pre-wrap">${_auditCrossRef(node.detail || '')}</div>
                <button onclick="_arbreReset()"
                        style="margin-top:18px;padding:10px 18px;border-radius:7px;cursor:pointer;
                               background:${color};border:none;color:#fff;font-size:13px;font-weight:700">
                    🔄 Recommencer cet arbre
                </button>
            </div>`;
    }

    host.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
            <button onclick="_arbreBack()"
                    style="padding:7px 14px;border-radius:7px;cursor:pointer;background:#1e293b;border:1px solid #334155;
                           color:#94a3b8;font-size:12px;font-weight:600">← Tous les arbres</button>
            <div style="font-size:16px;font-weight:800;color:${color}">${tree.icon || '🌳'} ${escapeHtml(tree.titre)}</div>
        </div>
        ${breadcrumb}
        ${body}
    `;
}

// ─────────────────────────────────────────────────────────────────
// CAS PRATIQUES — Études de cas examen avec solutions dépliables
// ─────────────────────────────────────────────────────────────────
function _renderAuditCas(host) {
    const cp = _auditData.cas_pratiques || {};
    const cas = cp.cas || [];

    host.innerHTML = `
        <div class="ref-section-title">${cp._icon || '📝'} ${escapeHtml(cp._label || 'Cas pratiques')}</div>
        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin-bottom:18px">
            ${escapeHtml(cp._description || '')}
        </p>
        <div id="casList">
            ${cas.map((c, idx) => _renderCasCard(idx, c)).join('')}
        </div>
    `;
}

function _renderCasCard(idx, c) {
    const id = `cas-${idx}`;
    const niveauColor = c.niveau === 'Avancé' ? '#dc2626' : (c.niveau === 'Intermédiaire' ? '#f59e0b' : '#16a34a');
    return `
        <div class="card" style="margin-bottom:16px;border-left:3px solid ${AUDIT_ACCENT}">
            <div onclick="_toggleCas('${id}')"
                 style="padding:14px 18px;cursor:pointer;transition:background 0.15s"
                 onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background=''">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                    <div style="flex:1;min-width:0">
                        <div style="font-size:15px;font-weight:800;color:${AUDIT_LIGHT}">📝 ${escapeHtml(c.titre)}</div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;font-size:11px">
                            <span style="background:${niveauColor};color:#fff;padding:2px 9px;border-radius:10px;font-weight:700">${escapeHtml(c.niveau)}</span>
                            <span style="background:#1e1b4b;color:#a78bfa;padding:2px 9px;border-radius:10px">⏱️ ${escapeHtml(c.duree)}</span>
                            ${(c.themes || []).map(t => `<span style="background:#1e293b;color:#94a3b8;padding:2px 9px;border-radius:10px">${escapeHtml(t)}</span>`).join('')}
                        </div>
                    </div>
                    <span id="${id}-arrow" style="color:${AUDIT_ACCENT};font-size:14px">▸</span>
                </div>
            </div>
            <div id="${id}" style="display:none;padding:0 18px 18px 18px">
                <div style="margin:6px 0 16px 0;padding:14px 16px;background:#0a0f1c;border-radius:8px;border-left:3px solid #3b82f6">
                    <div style="font-size:12px;font-weight:700;color:#60a5fa;margin-bottom:8px">📋 CONTEXTE</div>
                    <div style="font-size:13px;color:#cbd5e1;line-height:1.7;white-space:pre-wrap">${_auditCrossRef(c.contexte)}</div>
                </div>
                <div style="font-size:12px;font-weight:700;color:${AUDIT_ACCENT};margin-bottom:10px">❓ QUESTIONS & SOLUTIONS</div>
                ${(c.questions || []).map((q, qi) => _renderCasQuestion(id, qi, q)).join('')}
                ${(c.points_cles || []).length ? `
                    <div style="margin-top:16px;padding:14px 16px;background:#0a1a0f;border-radius:8px;border-left:3px solid #16a34a">
                        <div style="font-size:12px;font-weight:700;color:#4ade80;margin-bottom:8px">🎯 POINTS CLÉS À RETENIR</div>
                        <ul style="margin:0;padding-left:20px;color:#bbf7d0;font-size:13px;line-height:1.7">
                            ${c.points_cles.map(p => `<li>${_auditCrossRef(p)}</li>`).join('')}
                        </ul>
                    </div>` : ''}
            </div>
        </div>`;
}

function _renderCasQuestion(casId, qi, q) {
    const solId = `${casId}-sol-${qi}`;
    return `
        <div style="margin-bottom:12px;border:1px solid #1e293b;border-radius:7px;overflow:hidden">
            <div style="padding:11px 14px;background:#141d33;font-size:13px;font-weight:700;color:#e2e8f0;line-height:1.5">
                ${_auditCrossRef(q.q)}
            </div>
            <div style="padding:8px 14px;background:#0d1424">
                <button onclick="_toggleCasSol('${solId}')"
                        style="background:linear-gradient(135deg, ${AUDIT_ACCENT}, #4c1d95);border:none;color:#fff;
                               padding:7px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700">
                    💡 Voir la solution
                </button>
                <div id="${solId}" style="display:none;margin-top:10px;padding:12px 14px;background:#0a0f1c;
                            border-radius:6px;border-left:3px solid #16a34a;font-size:13px;color:#cbd5e1;
                            line-height:1.7;white-space:pre-wrap">${_auditCrossRef(q.solution)}</div>
            </div>
        </div>`;
}

function _toggleCas(id) {
    const el = document.getElementById(id);
    const arrow = document.getElementById(id + '-arrow');
    if (!el) return;
    const show = el.style.display === 'none';
    el.style.display = show ? 'block' : 'none';
    if (arrow) arrow.textContent = show ? '▾' : '▸';
}

function _toggleCasSol(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
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
                ${_annuaireCoursExists(std.num) ? `
                    <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
                        <button onclick="event.stopPropagation();_openAnnuaireCours('${std.num}')"
                                style="padding:11px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:800;
                                       background:linear-gradient(135deg, ${color}, #4c1d95);border:none;color:#fff;
                                       box-shadow:0 2px 8px rgba(0,0,0,0.3)">
                            📖 Voir le cours complet
                        </button>
                        <button onclick="event.stopPropagation();_downloadCoursPdf('${std.num}')"
                                style="padding:11px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;
                                       background:#1e293b;border:1px solid ${color};color:${color}">
                            📥 Ouvrir en PDF (nouvel onglet)
                        </button>
                    </div>` : ''}
            </div>
        </div>`;
}

// ── Cours de l'Annuaire : existence, ouverture, PDF ──
function _annuaireCoursExists(num) {
    const courses = _auditData.annuaire_cours || {};
    return !!courses[num];
}

function _findAnnuaireStd(num) {
    const series = (_auditData.annuaire || {}).series || [];
    for (const sr of series) {
        for (const std of (sr.standards || [])) {
            if (std.num === num) return { std, serie: sr };
        }
    }
    return { std: null, serie: null };
}

let _coursScrollFn = null;
function _attachCoursProgress() {
    if (_coursScrollFn) window.removeEventListener('scroll', _coursScrollFn, true);
    _coursScrollFn = function () {
        const bar = document.getElementById('coursProgressBar');
        if (!bar) { window.removeEventListener('scroll', _coursScrollFn, true); _coursScrollFn = null; return; }
        const h = document.documentElement;
        const max = (h.scrollHeight - h.clientHeight) || 1;
        const pct = Math.min(100, Math.max(0, (h.scrollTop / max) * 100));
        bar.style.width = pct + '%';
    };
    window.addEventListener('scroll', _coursScrollFn, true);
}

function _openAnnuaireCours(num) {
    const cours = (_auditData.annuaire_cours || {})[num];
    const { std, serie } = _findAnnuaireStd(num);
    if (!cours || !std) return;
    const color = (serie && serie.color) || AUDIT_ACCENT;
    const host = document.getElementById('auditContent');
    if (!host) return;

    // Estimation du temps de lecture
    let chars = (cours.intro || '').length;
    (cours.sections || []).forEach(s => { chars += (s.body || '').length; (s.callouts || []).forEach(c => chars += (c.text || '').length); });
    const duree = cours.duree || (Math.max(4, Math.round(chars / 900)) + ' min');
    const niveau = cours.niveau || (serie ? '' : '');

    host.innerHTML = `
        <div style="position:sticky;top:0;z-index:20;background:#0a0f1c;margin:-4px -4px 14px -4px;padding:8px 4px 0 4px">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
                <button onclick="_renderAuditAnnuaire(document.getElementById('auditContent'))"
                        style="padding:7px 13px;border-radius:7px;cursor:pointer;background:#1e293b;border:1px solid #334155;color:#94a3b8;font-size:12px;font-weight:600">← Annuaire</button>
                <button onclick="_downloadCoursPdf('${num}')"
                        style="padding:7px 13px;border-radius:7px;cursor:pointer;background:${color};border:none;color:#fff;font-size:12px;font-weight:700">📥 PDF (nouvel onglet)</button>
                <span style="margin-left:auto;font-size:11px;color:#64748b">⏱️ ${escapeHtml(duree)} de lecture</span>
            </div>
            <div style="height:4px;background:#1e293b;border-radius:3px;overflow:hidden">
                <div id="coursProgressBar" style="height:100%;width:0%;background:linear-gradient(90deg, ${color}, #c084fc);transition:width 0.1s"></div>
            </div>
        </div>

        <div style="padding:22px 22px;border-radius:14px;background:linear-gradient(135deg, ${color}33, ${color}0a 60%, transparent);border:1px solid ${color}55;margin-bottom:18px;position:relative;overflow:hidden">
            <div style="position:absolute;right:-10px;top:-18px;font-size:90px;opacity:0.08;font-weight:900;color:${color}">${escapeHtml((std.num||'').replace('ISQM','Q'))}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;position:relative">
                <span style="background:${color};color:#fff;font-size:14px;font-weight:800;padding:5px 13px;border-radius:7px;box-shadow:0 2px 8px ${color}66">${escapeHtml(std.code)}</span>
                <span style="font-size:11px;color:#a78bfa;background:#1e1b4b;padding:4px 10px;border-radius:10px">📚 Cours complet</span>
                ${std.status ? `<span style="font-size:11px;color:#7dd3fc;background:#0c2230;padding:4px 10px;border-radius:10px">${escapeHtml(std.status)}</span>` : ''}
                ${niveau ? `<span style="font-size:11px;color:#fca5a5;background:#2a1414;padding:4px 10px;border-radius:10px">${escapeHtml(niveau)}</span>` : ''}
            </div>
            <div style="font-size:21px;font-weight:900;color:#fff;line-height:1.25;position:relative">${escapeHtml(std.title_fr)}</div>
            <div style="font-size:12px;color:#7dd3fc;font-style:italic;margin-top:5px;position:relative">🇬🇧 ${escapeHtml(std.title_en || '')}</div>
        </div>

        ${cours.tldr ? `
            <div style="margin-bottom:18px;padding:14px 16px;background:linear-gradient(135deg,#0c1f17,#0a0f1c);border-radius:10px;border:1px solid #16a34a55">
                <div style="font-size:11px;font-weight:800;color:#4ade80;margin-bottom:6px;letter-spacing:0.05em">⚡ EN 30 SECONDES</div>
                <div style="font-size:13.5px;color:#d1fae5;line-height:1.65">${_auditCrossRef(cours.tldr)}</div>
            </div>` : ''}

        ${_renderCoursStats(cours.stats, color)}

        <div style="font-size:14px;color:#cbd5e1;line-height:1.75;margin-bottom:22px;padding:15px 17px;background:#0a0f1c;border-radius:10px;border-left:4px solid #3b82f6">
            ${_auditCrossRef(cours.intro || '')}
        </div>

        ${(cours.sections || []).map((s, i) => _renderCoursSection(s, color, i + 1)).join('')}

        ${cours.mnemo ? `<div style="margin:18px 0">${_renderCoursMnemo(cours.mnemo, color)}</div>` : ''}
        ${cours.schema ? `<div style="margin:18px 0">${_renderCoursSchema(cours.schema, color)}</div>` : ''}

        ${_renderCoursQuiz(cours.quiz, num, color)}

        ${(cours.synthese || []).length ? `
            <div style="margin-top:18px;padding:16px 18px;background:#0a1a0f;border-radius:12px;border:1px solid #16a34a44;border-left:4px solid #16a34a">
                <div style="font-size:13px;font-weight:800;color:#4ade80;margin-bottom:10px">🎯 SYNTHÈSE — points clés</div>
                <ul style="margin:0;padding-left:20px;color:#bbf7d0;font-size:13px;line-height:1.9">
                    ${cours.synthese.map(p => `<li>${_auditCrossRef(p)}</li>`).join('')}
                </ul>
            </div>` : ''}

        ${(cours.pieges || []).length ? `
            <div style="margin-top:14px;padding:16px 18px;background:#1e1b0a;border-radius:12px;border:1px solid #fbbf2444;border-left:4px solid #fbbf24">
                <div style="font-size:13px;font-weight:800;color:#fbbf24;margin-bottom:10px">⚠️ PIÈGES EXAMEN</div>
                <ul style="margin:0;padding-left:20px;color:#fde68a;font-size:13px;line-height:1.9">
                    ${cours.pieges.map(p => `<li>${_auditCrossRef(p)}</li>`).join('')}
                </ul>
            </div>` : ''}

        <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
            <button onclick="_downloadCoursPdf('${num}')"
                    style="padding:13px 22px;border-radius:9px;cursor:pointer;background:linear-gradient(135deg, ${color}, #4c1d95);border:none;color:#fff;font-size:14px;font-weight:800;box-shadow:0 3px 12px ${color}55">
                📥 Ouvrir ce cours en PDF (nouvel onglet)
            </button>
            <button onclick="_renderAuditAnnuaire(document.getElementById('auditContent'))"
                    style="padding:13px 18px;border-radius:9px;cursor:pointer;background:#1e293b;border:1px solid #334155;color:#94a3b8;font-size:13px;font-weight:600">
                ← Retour à l'annuaire
            </button>
        </div>
    `;
    host.scrollIntoView({ behavior: 'smooth', block: 'start' });
    _attachCoursProgress();
}

const _COURS_CALLOUT = {
    info:    {bg:'#0a0f1c', bd:'#3b82f6', col:'#60a5fa', icon:'ℹ️',  lbl:'INFO'},
    key:     {bg:'#1e1b0a', bd:'#d97706', col:'#fbbf24', icon:'🔑', lbl:'À RETENIR'},
    warn:    {bg:'#3f1612', bd:'#dc2626', col:'#fca5a5', icon:'⚠️', lbl:'ATTENTION'},
    example: {bg:'#0a1a0f', bd:'#16a34a', col:'#4ade80', icon:'📌', lbl:'EXEMPLE'},
    tip:     {bg:'#06141a', bd:'#0891b2', col:'#22d3ee', icon:'💡', lbl:'ASTUCE'},
    legal:   {bg:'#0f1419', bd:'#64748b', col:'#cbd5e1', icon:'⚖️', lbl:'CADRE LÉGAL'},
    comp:    {bg:'#140a1f', bd:'#9333ea', col:'#c084fc', icon:'🔀', lbl:'COMPARAISON'}
};

// Chiffres clés — cartes de stats
function _renderCoursStats(stats, color) {
    if (!stats || !stats.length) return '';
    return `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:20px">
            ${stats.map(s => `
                <div style="padding:14px 12px;border-radius:10px;background:#0d1424;border:1px solid #1e293b;text-align:center;position:relative;overflow:hidden">
                    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${color}"></div>
                    <div style="font-size:22px;font-weight:900;color:${color};line-height:1.1">${escapeHtml(s.value)}</div>
                    <div style="font-size:11.5px;font-weight:700;color:#e2e8f0;margin-top:4px">${escapeHtml(s.label)}</div>
                    ${s.sub ? `<div style="font-size:10px;color:#64748b;margin-top:2px;line-height:1.3">${escapeHtml(s.sub)}</div>` : ''}
                </div>`).join('')}
        </div>`;
}

// Mnémo décomposée lettre par lettre
function _renderCoursMnemo(m, color) {
    if (!m) return '';
    return `
        <div style="padding:16px 18px;border-radius:12px;background:linear-gradient(135deg,#1a1206,#0a0f1c);border:1px solid #f59e0b55">
            <div style="font-size:11px;font-weight:800;color:#fbbf24;margin-bottom:10px;letter-spacing:0.05em">🧠 MOYEN MNÉMOTECHNIQUE${m.code ? ` — « ${escapeHtml(m.code)} »` : ''}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
                ${(m.items || []).map(it => `
                    <div style="display:flex;align-items:center;gap:8px;background:#1e1b0a;border:1px solid #f59e0b33;border-radius:8px;padding:7px 11px">
                        <span style="font-size:18px;font-weight:900;color:#fbbf24;min-width:18px;text-align:center">${escapeHtml(it.l)}</span>
                        <span style="font-size:12.5px;color:#fde68a">${escapeHtml(it.t)}</span>
                    </div>`).join('')}
            </div>
            ${m.phrase ? `<div style="margin-top:10px;font-size:12px;color:#fcd34d;font-style:italic">💬 ${escapeHtml(m.phrase)}</div>` : ''}
        </div>`;
}

// Schémas visuels : flow / pyramid / matrix
function _renderCoursSchema(sch, color) {
    if (!sch) return '';
    const title = sch.title ? `<div style="font-size:11px;font-weight:800;color:${color};margin-bottom:12px;letter-spacing:0.04em">📊 ${escapeHtml(sch.title)}</div>` : '';
    let body = '';
    if (sch.type === 'flow') {
        body = `<div style="display:flex;flex-direction:column;gap:0">
            ${(sch.steps || []).map((st, i, arr) => `
                <div style="display:flex;gap:12px;align-items:flex-start">
                    <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
                        <div style="width:30px;height:30px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px">${i + 1}</div>
                        ${i < arr.length - 1 ? `<div style="width:2px;height:28px;background:${color}66"></div>` : ''}
                    </div>
                    <div style="padding-bottom:${i < arr.length - 1 ? '14px' : '0'};flex:1">
                        <div style="font-size:13px;font-weight:700;color:#e2e8f0">${escapeHtml(st.t)}</div>
                        ${st.d ? `<div style="font-size:12px;color:#94a3b8;line-height:1.5;margin-top:2px">${_auditCrossRef(st.d)}</div>` : ''}
                    </div>
                </div>`).join('')}
        </div>`;
    } else if (sch.type === 'pyramid') {
        const lv = sch.levels || [];
        body = `<div style="display:flex;flex-direction:column;gap:6px;align-items:center">
            ${lv.map((l, i) => {
                const w = 55 + (i / Math.max(1, lv.length - 1)) * 45;
                return `<div style="width:${w}%;min-width:160px;padding:10px 14px;border-radius:8px;background:linear-gradient(135deg,${color},${color}99);text-align:center">
                    <div style="font-size:13px;font-weight:800;color:#fff">${escapeHtml(l.t)}</div>
                    ${l.d ? `<div style="font-size:11px;color:#f1f5f9;margin-top:2px">${escapeHtml(l.d)}</div>` : ''}
                </div>`;
            }).join('')}
        </div>`;
    } else if (sch.type === 'matrix') {
        const cells = sch.cells || [];
        body = `<div style="overflow-x:auto"><table style="width:100%;border-collapse:separate;border-spacing:6px">
            <tr><td></td>${(sch.xlabels || []).map(x => `<td style="text-align:center;font-size:11px;font-weight:800;color:${color};padding:4px">${escapeHtml(x)}</td>`).join('')}</tr>
            ${cells.map((row, ri) => `<tr>
                <td style="font-size:11px;font-weight:800;color:${color};padding:4px;white-space:nowrap;vertical-align:middle">${escapeHtml((sch.ylabels || [])[ri] || '')}</td>
                ${row.map(c => {
                    const vc = c.v === 'danger' ? '#dc2626' : (c.v === 'warn' ? '#f59e0b' : (c.v === 'ok' ? '#16a34a' : '#475569'));
                    return `<td style="background:${vc}22;border:1px solid ${vc};border-radius:8px;padding:10px;text-align:center;font-size:12px;font-weight:700;color:${vc === '#475569' ? '#cbd5e1' : vc}">${escapeHtml(c.t)}</td>`;
                }).join('')}
            </tr>`).join('')}
        </table></div>`;
    }
    return `<div style="padding:16px 18px;border-radius:12px;background:#0d1424;border:1px solid #1e293b">${title}${body}</div>`;
}

// Tableau comparatif stylé
function _renderCoursCompare(cmp, color) {
    if (!cmp) return '';
    return `
        <div style="margin:12px 0;padding:14px 16px;border-radius:10px;background:#0d1424;border:1px solid #1e293b">
            ${cmp.title ? `<div style="font-size:11px;font-weight:800;color:${color};margin-bottom:10px">🔀 ${escapeHtml(cmp.title)}</div>` : ''}
            <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead><tr>${(cmp.headers || []).map((h, i) => `<th style="text-align:left;padding:8px 10px;background:${color}22;color:${color};font-weight:800;border-bottom:2px solid ${color};white-space:nowrap">${escapeHtml(h)}</th>`).join('')}</tr></thead>
                <tbody>${(cmp.rows || []).map((r, ri) => `<tr style="background:${ri % 2 ? '#0d1424' : '#0a0f1c'}">${r.map((c, ci) => `<td style="padding:8px 10px;color:${ci === 0 ? '#e2e8f0' : '#cbd5e1'};font-weight:${ci === 0 ? '700' : '400'};line-height:1.5;border-bottom:1px solid #1e293b;vertical-align:top">${_auditCrossRef(c)}</td>`).join('')}</tr>`).join('')}</tbody>
            </table></div>
        </div>`;
}

// Auto-test — cartes question/réponse à retourner
function _renderCoursQuiz(quiz, num, color) {
    if (!quiz || !quiz.length) return '';
    return `
        <div style="margin-top:18px;padding:16px 18px;border-radius:12px;background:linear-gradient(135deg,#160b1f,#0a0f1c);border:1px solid #9333ea55">
            <div style="font-size:13px;font-weight:800;color:#c084fc;margin-bottom:12px">🎮 TESTE-TOI — clique pour révéler la réponse</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px">
                ${quiz.map((q, i) => {
                    const qid = `quiz-${num}-${i}`;
                    return `<div onclick="_flipQuiz('${qid}')" style="cursor:pointer;padding:13px 14px;border-radius:10px;background:#1a1226;border:1px solid #9333ea44;min-height:60px;transition:all 0.15s"
                                 onmouseover="this.style.borderColor='#c084fc'" onmouseout="this.style.borderColor='#9333ea44'">
                        <div style="font-size:12.5px;font-weight:700;color:#e9d5ff;line-height:1.5">❓ ${escapeHtml(q.q)}</div>
                        <div id="${qid}" style="display:none;margin-top:9px;padding-top:9px;border-top:1px dashed #9333ea66;font-size:12.5px;color:#4ade80;line-height:1.55">✅ ${_auditCrossRef(q.a)}</div>
                        <div id="${qid}-hint" style="margin-top:8px;font-size:10.5px;color:#7c3aed;font-style:italic">👆 cliquer pour la réponse</div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
}

function _flipQuiz(qid) {
    const a = document.getElementById(qid);
    const hint = document.getElementById(qid + '-hint');
    if (!a) return;
    const show = a.style.display === 'none';
    a.style.display = show ? 'block' : 'none';
    if (hint) hint.style.display = show ? 'none' : 'block';
}

function _renderCoursSection(s, color, idx) {
    const callouts = (s.callouts || []).map(c => {
        const cfg = _COURS_CALLOUT[c.type] || _COURS_CALLOUT.info;
        return `
            <div style="margin:10px 0;padding:11px 14px;background:${cfg.bg};border-left:3px solid ${cfg.bd};border-radius:6px">
                <div style="font-size:11px;font-weight:800;color:${cfg.col};margin-bottom:4px;letter-spacing:0.04em">${cfg.icon} ${escapeHtml(c.label || cfg.lbl)}</div>
                <div style="font-size:12.5px;color:#e2e8f0;line-height:1.6;white-space:pre-wrap">${_auditCrossRef(c.text || '')}</div>
            </div>`;
    }).join('');
    const num = idx ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:7px;background:${color};color:#fff;font-size:13px;font-weight:800;margin-right:9px;flex-shrink:0">${idx}</span>` : '';
    return `
        <div style="margin-bottom:20px">
            <div style="display:flex;align-items:center;font-size:15.5px;font-weight:800;color:#fff;margin-bottom:10px;padding-bottom:7px;border-bottom:2px solid ${color}44">
                ${num}<span>${escapeHtml(s.titre || '')}</span>
            </div>
            <div style="font-size:13px;color:#cbd5e1;line-height:1.8;white-space:pre-wrap">${_auditCrossRef(s.body || '')}</div>
            ${s.schema ? `<div style="margin:12px 0">${_renderCoursSchema(s.schema, color)}</div>` : ''}
            ${s.compare ? _renderCoursCompare(s.compare, color) : ''}
            ${s.mnemo ? `<div style="margin:12px 0">${_renderCoursMnemo(s.mnemo, color)}</div>` : ''}
            ${callouts}
        </div>`;
}

// ── Export PDF d'un cours via window.print() (réutilise le mécanisme existant) ──
// Construit un document HTML autonome (thème clair, prêt pour lecture + impression/PDF)
function _coursStandaloneHtml(std, serie, cours) {
    const esc = (typeof escapeHtml === 'function') ? escapeHtml : (x => String(x == null ? '' : x));
    const md = (t) => esc(t || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    const accent = (serie && serie.color) || '#7c3aed';
    const today = new Date().toLocaleDateString('fr-CH', { year:'numeric', month:'long', day:'numeric' });

    const CALL = {
        info:{bg:'#eff6ff',bd:'#2563eb',col:'#1d4ed8',ic:'ℹ️',lb:'INFO'},
        key:{bg:'#fffbeb',bd:'#d97706',col:'#b45309',ic:'🔑',lb:'À RETENIR'},
        warn:{bg:'#fef2f2',bd:'#dc2626',col:'#b91c1c',ic:'⚠️',lb:'ATTENTION'},
        example:{bg:'#f0fdf4',bd:'#16a34a',col:'#15803d',ic:'📌',lb:'EXEMPLE'},
        tip:{bg:'#ecfeff',bd:'#0891b2',col:'#0e7490',ic:'💡',lb:'ASTUCE'},
        legal:{bg:'#f1f5f9',bd:'#475569',col:'#1e293b',ic:'⚖️',lb:'CADRE LÉGAL'},
        comp:{bg:'#faf5ff',bd:'#9333ea',col:'#7e22ce',ic:'🔀',lb:'COMPARAISON'}
    };
    const callout = (c) => {
        const cf = CALL[c.type] || CALL.info;
        return `<div class="callout" style="background:${cf.bg};border-left:4px solid ${cf.bd}">
            <div class="callout-lbl" style="color:${cf.col}">${cf.ic} ${esc(c.label || cf.lb)}</div>
            <div>${md(c.text)}</div></div>`;
    };
    const compare = (cmp) => {
        if (!cmp) return '';
        return `${cmp.title ? `<div class="blk-t">🔀 ${esc(cmp.title)}</div>` : ''}<table><thead><tr>${(cmp.headers||[]).map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${(cmp.rows||[]).map(r=>`<tr>${r.map(c=>`<td>${md(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    };
    const schema = (sch) => {
        if (!sch) return '';
        let inner = '';
        if (sch.type === 'flow') inner = `<ol class="flow">${(sch.steps||[]).map(s=>`<li><strong>${esc(s.t)}</strong>${s.d?'<br><span class="muted">'+md(s.d)+'</span>':''}</li>`).join('')}</ol>`;
        else if (sch.type === 'pyramid') inner = `<ul class="pyr">${(sch.levels||[]).map(l=>`<li><strong>${esc(l.t)}</strong>${l.d?' — <span class="muted">'+esc(l.d)+'</span>':''}</li>`).join('')}</ul>`;
        else if (sch.type === 'matrix') {
            inner = `<table class="mtx"><tr><td></td>${(sch.xlabels||[]).map(x=>`<th>${esc(x)}</th>`).join('')}</tr>${(sch.cells||[]).map((row,ri)=>`<tr><th>${esc((sch.ylabels||[])[ri]||'')}</th>${row.map(c=>{const vc=c.v==='danger'?'#dc2626':(c.v==='warn'?'#d97706':(c.v==='ok'?'#16a34a':'#64748b'));return `<td style="background:${vc}18;border:1px solid ${vc};color:${vc};font-weight:700;text-align:center">${esc(c.t)}</td>`;}).join('')}</tr>`).join('')}</table>`;
        }
        return `<div class="schema"><div class="blk-t" style="color:${accent}">📊 ${esc(sch.title||'Schéma')}</div>${inner}</div>`;
    };
    const mnemo = (m) => {
        if (!m) return '';
        return `<div class="mnemo"><div class="blk-t" style="color:#b45309">🧠 MNÉMOTECHNIQUE${m.code?' — « '+esc(m.code)+' »':''}</div><div class="mnemo-items">${(m.items||[]).map(it=>`<span class="mnemo-chip"><b>${esc(it.l)}</b> ${esc(it.t)}</span>`).join('')}</div>${m.phrase?`<div class="muted" style="margin-top:8px;font-style:italic">💬 ${esc(m.phrase)}</div>`:''}</div>`;
    };

    let body = '';
    if (cours.tldr) body += `<div class="tldr"><div class="blk-t" style="color:#15803d">⚡ EN 30 SECONDES</div>${md(cours.tldr)}</div>`;
    if ((cours.stats||[]).length) body += `<div class="stats">${cours.stats.map(s=>`<div class="stat"><div class="stat-v" style="color:${accent}">${esc(s.value)}</div><div class="stat-l">${esc(s.label)}</div>${s.sub?`<div class="muted stat-s">${esc(s.sub)}</div>`:''}</div>`).join('')}</div>`;
    body += `<div class="intro">${md(cours.intro)}</div>`;
    (cours.sections||[]).forEach((s,i)=>{
        body += `<div class="sec"><div class="sec-t"><span class="sec-n" style="background:${accent}">${i+1}</span>${esc(s.titre)}</div><div class="sec-b">${md(s.body)}</div>${schema(s.schema)}${compare(s.compare)}${mnemo(s.mnemo)}${(s.callouts||[]).map(callout).join('')}</div>`;
    });
    if (cours.mnemo) body += mnemo(cours.mnemo);
    if (cours.schema) body += schema(cours.schema);
    if ((cours.quiz||[]).length) body += `<div class="quiz"><div class="blk-t" style="color:#7e22ce">🎮 TESTE-TOI</div>${cours.quiz.map(q=>`<div class="qa"><div class="q">❓ ${esc(q.q)}</div><div class="a">✅ ${md(q.a)}</div></div>`).join('')}</div>`;
    if ((cours.synthese||[]).length) body += `<div class="box box-syn"><div class="blk-t" style="color:#15803d">🎯 SYNTHÈSE — points clés</div><ul>${cours.synthese.map(p=>`<li>${md(p)}</li>`).join('')}</ul></div>`;
    if ((cours.pieges||[]).length) body += `<div class="box box-pie"><div class="blk-t" style="color:#b45309">⚠️ PIÈGES EXAMEN</div><ul>${cours.pieges.map(p=>`<li>${md(p)}</li>`).join('')}</ul></div>`;

    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(std.code)} — ${esc(std.title_fr)}</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;color:#1e293b;background:#f1f5f9;line-height:1.65}
.bar{position:sticky;top:0;z-index:10;background:#0f172a;color:#fff;padding:10px 18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.bar .ttl{font-size:13px;font-weight:700;opacity:.85}
.bar button{margin-left:auto;background:${accent};color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:14px;font-weight:800;cursor:pointer}
.wrap{max-width:820px;margin:0 auto;padding:26px 22px 60px}
.hero{background:linear-gradient(135deg,${accent},${accent}cc);color:#fff;border-radius:14px;padding:26px;margin-bottom:22px}
.hero .code{display:inline-block;background:rgba(255,255,255,.22);padding:5px 13px;border-radius:7px;font-weight:800;font-size:14px;margin-bottom:10px}
.hero h1{margin:0;font-size:25px;line-height:1.2}
.hero .en{margin-top:6px;font-size:13px;font-style:italic;opacity:.9}
.hero .src{margin-top:10px;font-size:11px;opacity:.8}
.tldr{background:#ecfdf5;border:1px solid #6ee7b7;border-radius:10px;padding:14px 16px;margin-bottom:18px;font-size:14px}
.blk-t{font-size:12px;font-weight:800;letter-spacing:.04em;margin-bottom:8px;text-transform:uppercase}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px}
.stat{background:#fff;border:1px solid #e2e8f0;border-top:3px solid ${accent};border-radius:10px;padding:13px;text-align:center}
.stat-v{font-size:21px;font-weight:900;line-height:1.1}
.stat-l{font-size:12px;font-weight:700;margin-top:4px}
.stat-s{font-size:10.5px;margin-top:2px}
.muted{color:#64748b}
.intro{background:#fff;border-left:4px solid #2563eb;border-radius:8px;padding:15px 17px;margin-bottom:22px;font-size:14.5px}
.sec{background:#fff;border:1px solid #e8edf3;border-radius:12px;padding:18px 20px;margin-bottom:16px}
.sec-t{display:flex;align-items:center;font-size:17px;font-weight:800;color:#0f172a;margin-bottom:11px;padding-bottom:8px;border-bottom:2px solid ${accent}33}
.sec-n{color:#fff;width:26px;height:26px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;font-size:14px;margin-right:10px;flex-shrink:0}
.sec-b{font-size:14px}
.callout{border-radius:8px;padding:11px 14px;margin:11px 0}
.callout-lbl{font-size:11.5px;font-weight:800;margin-bottom:4px;text-transform:uppercase}
.schema,.mnemo{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin:12px 0}
.flow{margin:0;padding-left:20px} .flow li{margin-bottom:9px}
.pyr{margin:0;padding-left:20px} .pyr li{margin-bottom:6px}
.mnemo{background:#fffbeb;border-color:#fcd34d}
.mnemo-items{display:flex;flex-wrap:wrap;gap:7px}
.mnemo-chip{background:#fff;border:1px solid #fcd34d;border-radius:8px;padding:6px 11px;font-size:13px}
.mnemo-chip b{color:#b45309;font-size:16px;margin-right:5px}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}
th{background:${accent}18;color:${accent};text-align:left;padding:8px 10px;border-bottom:2px solid ${accent};font-weight:800}
td{padding:8px 10px;border-bottom:1px solid #e8edf3;vertical-align:top}
.mtx th{background:transparent;border:none;color:${accent};text-align:center}
.quiz{background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:16px 18px;margin:18px 0}
.qa{background:#fff;border:1px solid #e9d5ff;border-radius:9px;padding:12px 14px;margin-bottom:9px}
.qa .q{font-weight:700;color:#6b21a8}
.qa .a{margin-top:7px;padding-top:7px;border-top:1px dashed #d8b4fe;color:#15803d}
.box{border-radius:12px;padding:16px 18px;margin-top:16px}
.box ul{margin:0;padding-left:20px} .box li{margin-bottom:6px}
.box-syn{background:#f0fdf4;border:1px solid #86efac}
.box-pie{background:#fffbeb;border:1px solid #fcd34d}
.foot{margin-top:30px;text-align:center;font-size:11px;color:#94a3b8}
@media print{
  .bar{display:none}
  body{background:#fff}
  .wrap{max-width:none;padding:0}
  .sec,.box,.quiz,.schema,.mnemo,.callout,.stat,.intro,.tldr{break-inside:avoid}
  @page{size:A4;margin:16mm 14mm}
}
</style></head><body>
<div class="bar"><span class="ttl">Swiss CPA · ${esc(std.code)}</span>
<button onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button></div>
<div class="wrap">
<div class="hero"><span class="code">${esc(std.code)} · Cours complet</span>
<h1>${esc(std.title_fr)}</h1><div class="en">🇬🇧 ${esc(std.title_en||'')}</div>
<div class="src">Source : MSA Contrôle ordinaire (EXPERTsuisse) · à jour · ${esc(today)}</div></div>
${body}
<div class="foot">Swiss CPA — Annuaire ISA · ${esc(std.code)} · Généré le ${esc(today)}</div>
</div></body></html>`;
}

// Ouvre le cours dans un NOUVEL ONGLET (page autonome, prête pour lecture + impression/PDF)
function _downloadCoursPdf(num) {
    const cours = (_auditData.annuaire_cours || {})[num];
    const { std, serie } = _findAnnuaireStd(num);
    if (!cours || !std) return;

    // Ouvrir l'onglet IMMÉDIATEMENT (sur le clic) pour éviter le blocage des pop-ups
    const w = window.open('', '_blank');
    const html = _coursStandaloneHtml(std, serie, cours);
    if (w && w.document) {
        w.document.open();
        w.document.write(html);
        w.document.close();
        try { w.focus(); } catch (_) {}
    } else {
        // Pop-up bloquée : proposer un téléchargement de la page HTML, ou fallback impression
        try {
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.target = '_blank';
            a.rel = 'noopener';
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 4000);
        } catch (_) {
            alert("Autorise les pop-ups pour ouvrir le cours dans un nouvel onglet.");
        }
    }
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
