/* ═══════════════════════════════════════════════════════════
   Swiss CPA Revision — Onglet Stats (vue centrée sur les modules)
   ═══════════════════════════════════════════════════════════

   Objectif : présenter la progression par module fonctionnel.
   Chaque carte est CLIQUABLE et liée au reste de l'app :
     • clic sur la carte           → ouvre l'onglet Modules
     • clic sur le nombre de flashcards → BDD Flashcards filtrée
     • clic sur « À réviser »      → Entraînement du module
     • clic sur une norme à réviser → modal détaillé (existant)
*/

async function renderProgress(container) {
    const [moduleStats, sessions, history, dashboard, norms, unifiedResp] = await Promise.all([
        api('get_module_stats'),
        api('get_recent_sessions', 60),
        api('get_quiz_history', 10),
        api('get_dashboard_stats'),
        api('get_norms'),
        api('get_unified_modules'),
    ]);

    const modStats = Array.isArray(moduleStats) ? moduleStats : [];
    const sessList = sessions || [];
    const hist = history || [];
    const dash = dashboard || {};

    // ─ Build title map + norm titles cache (used by norm detail modal) ─
    const unifiedModules = (unifiedResp && unifiedResp.modules) ? unifiedResp.modules : [];
    window._progressUnifiedModules = unifiedModules;
    window._coursNormMap = {};
    try {
        const tc = await api('get_trainer_courses');
        const coursList = (tc && tc.courses) ? tc.courses : [];
        coursList.forEach(c => {
            if (c.norm_code) window._coursNormMap[c.norm_code] = c.norm_title || '';
        });
    } catch (e) { /* best effort */ }

    // ─ Compute overall aggregate (weighted over all modules) ─
    const totals = _aggregateAll(modStats);

    container.innerHTML = `
        ${_progressStyles()}
        <div class="page-title">Progression</div>
        <div class="page-subtitle">Vue synthétique par module — clique une carte pour l'ouvrir</div>

        <!-- Hero : progression globale ultra-simple -->
        <div class="pg-hero">
            <div class="pg-hero-left">
                <div class="pg-hero-label">Progression globale</div>
                <div class="pg-hero-pct">${totals.progress_pct}<span class="pg-hero-pct-unit">%</span></div>
                <div class="pg-hero-bar"><div class="pg-hero-bar-fill" style="width:${totals.progress_pct}%"></div></div>
                <div class="pg-hero-sub">
                    <span class="pg-hero-sub-item"><b>${totals.modules_done}</b>/${totals.modules_total} modules démarrés</span>
                    <span class="pg-hero-sub-dot">•</span>
                    <span class="pg-hero-sub-item"><b>${totals.fc_known}</b>/${totals.fc_total} flashcards acquises</span>
                    <span class="pg-hero-sub-dot">•</span>
                    <span class="pg-hero-sub-item"><b>${totals.lessons_done}</b>/${totals.lessons_total} sous-leçons</span>
                </div>
            </div>
            <div class="pg-hero-right">
                <button class="pg-hero-btn pg-hero-btn-primary" onclick="navigate('trainer')">🎯 Entraînement</button>
                <button class="pg-hero-btn" onclick="navigate('qcm')">❓ QCM</button>
                <button class="pg-hero-btn" onclick="navigate('fcdb')">🃏 BDD Flashcards</button>
                <button class="pg-hero-btn" onclick="navigate('modules')">📘 Modules</button>
                ${totals.fc_due > 0 ? `<div class="pg-hero-due" onclick="_progressGoTrainerDue()">
                    ⚠ <b>${totals.fc_due}</b> cartes à réviser
                </div>` : ''}
            </div>
        </div>

        <!-- Grille : une carte par module -->
        <div class="pg-section-title">Modules</div>
        <div class="pg-mod-grid" id="pgModGrid"></div>

        <!-- Heatmap + quiz récents (compact) -->
        <div class="pg-twocol">
            <div class="pg-card">
                <div class="pg-card-title">📅 Activité (30 jours)</div>
                <div id="pgHeatmap" class="pg-heatmap"></div>
                <div class="pg-heatmap-legend">
                    <span>Moins</span>
                    <div class="pg-hm-cell"></div>
                    <div class="pg-hm-cell level-1"></div>
                    <div class="pg-hm-cell level-2"></div>
                    <div class="pg-hm-cell level-3"></div>
                    <div class="pg-hm-cell level-4"></div>
                    <span>Plus</span>
                </div>
            </div>
            <div class="pg-card">
                <div class="pg-card-title">📝 Derniers quiz</div>
                <div id="pgQuizHistory"></div>
            </div>
        </div>

        <!-- Normes suivies (tracked avec étoiles ou révisions) -->
        <div class="pg-section-title">Normes suivies <span class="pg-section-subtitle">(clique pour voir le détail)</span></div>
        <div class="pg-card" id="pgNormProgress" style="padding:0;max-height:400px;overflow-y:auto"></div>
    `;

    _renderModuleGrid(modStats);
    _renderHeatmap(sessList);
    _renderQuizHistoryCompact(hist);
    _renderTrackedNorms(norms || []);
}


// ══════════════════════════════════════════════════════════════
// HERO AGGREGATE
// ══════════════════════════════════════════════════════════════

function _aggregateAll(mods) {
    let fc_total = 0, fc_known = 0, fc_due = 0;
    let lessons_total = 0, lessons_done = 0;
    let norms_total = 0, norms_revised = 0;
    let modules_total = mods.length, modules_done = 0;
    let weighted = 0, weight_sum = 0;

    mods.forEach(m => {
        fc_total += m.fc_total;
        fc_known += m.fc_mastered + m.fc_good;
        fc_due += m.fc_due;
        lessons_total += m.sub_lessons_total;
        lessons_done += m.sub_lessons_completed;
        norms_total += m.norms_total;
        norms_revised += m.norms_revised;
        if (m.progress_percent > 0) modules_done++;
        // Weight by size (activity potential)
        const w = Math.max(1, m.fc_total + m.sub_lessons_total + m.norms_total);
        weighted += m.progress_percent * w;
        weight_sum += w;
    });

    const progress_pct = weight_sum > 0 ? Math.round(weighted / weight_sum) : 0;

    return {
        progress_pct, modules_total, modules_done,
        fc_total, fc_known, fc_due,
        lessons_total, lessons_done,
        norms_total, norms_revised,
    };
}


// ══════════════════════════════════════════════════════════════
// MODULE GRID — la carte principale de cette page
// ══════════════════════════════════════════════════════════════

function _renderModuleGrid(modStats) {
    const el = document.getElementById('pgModGrid');
    if (!el) return;

    if (!modStats.length) {
        el.innerHTML = '<div class="pg-empty">Aucun module dans la base.</div>';
        return;
    }

    el.innerHTML = modStats.map(m => _moduleCard(m)).join('');

    // Click handlers
    el.querySelectorAll('[data-action]').forEach(b => {
        b.addEventListener('click', e => {
            e.stopPropagation();
            const a = b.dataset.action;
            const code = b.dataset.mod;
            if (a === 'open-module') _progressGoModule(code);
            else if (a === 'open-fcdb') _progressGoFcdb(code, b.dataset.mastery || null);
            else if (a === 'open-trainer') _progressGoTrainer(code);
            else if (a === 'open-qcm') _progressGoQcm(code);
        });
    });
}


function _moduleCard(m) {
    const color = (typeof getModuleColor === 'function' ? getModuleColor(m.code) : '#64748b');
    const pct = Math.round(m.progress_percent);
    const pctColor = pct >= 80 ? '#10b981' : pct >= 40 ? '#eab308' : pct > 0 ? '#f59e0b' : '#475569';

    // Flashcards mini-bar
    const fcKnown = m.fc_mastered + m.fc_good;
    const fcLearning = m.fc_learning + m.fc_again;
    const fcPct = m.fc_total ? Math.round(fcKnown / m.fc_total * 100) : 0;

    // Lessons bar
    const lessonsPct = m.sub_lessons_total
        ? Math.round(m.sub_lessons_completed / m.sub_lessons_total * 100) : 0;

    // Norms bar
    const normsPct = m.norms_total
        ? Math.round(m.norms_revised / m.norms_total * 100) : 0;
    const normsFilledPct = m.norms_total
        ? Math.round(m.norms_filled / m.norms_total * 100) : 0;

    // Last activity label
    const lastLabel = _lastActivityLabel(m.last_activity);
    const dueBadge = m.fc_due > 0
        ? `<span class="pg-mc-due" title="Cartes à réviser">⚠ ${m.fc_due}</span>`
        : '';

    // Status pill
    const statusLabel = pct >= 100 ? 'Terminé' : pct >= 40 ? 'En cours' : pct > 0 ? 'Démarré' : 'À faire';

    return `
    <div class="pg-mc" style="border-top-color:${color}">
        <div class="pg-mc-head" data-action="open-module" data-mod="${escapeAttr(m.code)}" title="Ouvrir ce module">
            <div class="pg-mc-code-wrap">
                <span class="pg-mc-code" style="background:${color}22;color:${color}">${escapeHtml(m.code)}</span>
                <span class="pg-mc-status" style="color:${pctColor}">${statusLabel}</span>
                ${dueBadge}
            </div>
            <div class="pg-mc-name">${escapeHtml(m.name || '')}</div>
            <div class="pg-mc-meta">
                <span>${escapeHtml(m.year || '')}</span>
                <span class="pg-mc-meta-dot">•</span>
                <span>${m.hours_async || 0}h async</span>
                ${m.hours_sync ? `<span class="pg-mc-meta-dot">•</span><span>${m.hours_sync}h sync</span>` : ''}
            </div>
        </div>

        <div class="pg-mc-pct-wrap">
            <div class="pg-mc-pct" style="color:${pctColor}">${pct}%</div>
            <div class="pg-mc-bar"><div class="pg-mc-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,${pctColor},${pctColor}88)"></div></div>
        </div>

        <!-- 3 sous-métriques cliquables -->
        <div class="pg-mc-metrics">

            <!-- Flashcards -->
            <button class="pg-mc-metric" data-action="open-fcdb" data-mod="${escapeAttr(m.code)}" title="Voir dans la BDD Flashcards">
                <div class="pg-mc-metric-head">
                    <span class="pg-mc-metric-icon">🃏</span>
                    <span class="pg-mc-metric-label">Flashcards</span>
                    <span class="pg-mc-metric-value">${fcKnown}/${m.fc_total}</span>
                </div>
                <div class="pg-mc-metric-bar">
                    ${m.fc_total ? `
                        <div class="pg-mc-seg" style="flex:${m.fc_mastered};background:#10b981" title="Maîtrisées: ${m.fc_mastered}"></div>
                        <div class="pg-mc-seg" style="flex:${m.fc_good};background:#3b82f6" title="Bien: ${m.fc_good}"></div>
                        <div class="pg-mc-seg" style="flex:${m.fc_learning};background:#f59e0b" title="En cours: ${m.fc_learning}"></div>
                        <div class="pg-mc-seg" style="flex:${m.fc_again};background:#ef4444" title="À revoir: ${m.fc_again}"></div>
                        <div class="pg-mc-seg" style="flex:${m.fc_not_started};background:#334155" title="Non vues: ${m.fc_not_started}"></div>
                    ` : '<div class="pg-mc-empty-bar">—</div>'}
                </div>
            </button>

            <!-- Leçons -->
            <button class="pg-mc-metric" data-action="open-module" data-mod="${escapeAttr(m.code)}" title="Ouvrir les leçons">
                <div class="pg-mc-metric-head">
                    <span class="pg-mc-metric-icon">📖</span>
                    <span class="pg-mc-metric-label">Leçons</span>
                    <span class="pg-mc-metric-value">${m.sub_lessons_completed}/${m.sub_lessons_total}</span>
                </div>
                <div class="pg-mc-metric-bar">
                    ${m.sub_lessons_total ? `
                        <div class="pg-mc-seg" style="flex:${m.sub_lessons_completed};background:#10b981"></div>
                        <div class="pg-mc-seg" style="flex:${m.sub_lessons_total - m.sub_lessons_completed};background:#334155"></div>
                    ` : '<div class="pg-mc-empty-bar">aucune leçon</div>'}
                </div>
            </button>

            <!-- Normes -->
            <button class="pg-mc-metric" data-action="open-module" data-mod="${escapeAttr(m.code)}" title="Ouvrir les normes du module">
                <div class="pg-mc-metric-head">
                    <span class="pg-mc-metric-icon">📚</span>
                    <span class="pg-mc-metric-label">Normes</span>
                    <span class="pg-mc-metric-value">${m.norms_filled}/${m.norms_total}</span>
                </div>
                <div class="pg-mc-metric-bar">
                    ${m.norms_total ? `
                        <div class="pg-mc-seg" style="flex:${m.norms_revised};background:#10b981" title="Révisées: ${m.norms_revised}"></div>
                        <div class="pg-mc-seg" style="flex:${m.norms_filled - m.norms_revised};background:#3b82f6" title="Remplies non révisées: ${m.norms_filled - m.norms_revised}"></div>
                        <div class="pg-mc-seg" style="flex:${m.norms_total - m.norms_filled};background:#334155" title="À remplir: ${m.norms_total - m.norms_filled}"></div>
                    ` : '<div class="pg-mc-empty-bar">aucune norme</div>'}
                </div>
            </button>

        </div>

        <!-- Pied : activité récente + actions rapides -->
        <div class="pg-mc-foot">
            <span class="pg-mc-foot-last" title="${m.last_activity || ''}">${lastLabel}</span>
            <div class="pg-mc-foot-actions">
                <button class="pg-mc-cta pg-mc-cta-qcm" data-action="open-qcm" data-mod="${escapeAttr(m.code)}" title="QCM de ce module">
                    ❓ QCM
                </button>
                ${m.fc_due > 0 ? `<button class="pg-mc-cta" data-action="open-trainer" data-mod="${escapeAttr(m.code)}" title="Réviser maintenant">
                    ▶ Réviser
                </button>` : ''}
            </div>
        </div>
    </div>`;
}


function _lastActivityLabel(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const now = new Date();
    const ms = now - d;
    const days = Math.floor(ms / 86400000);
    if (days <= 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days <= 7) return `Il y a ${days}j`;
    if (days <= 30) return `Il y a ${Math.floor(days / 7)} sem.`;
    return d.toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' });
}


// ══════════════════════════════════════════════════════════════
// NAVIGATION HELPERS — liens vers autres onglets
// ══════════════════════════════════════════════════════════════

function _progressGoModule(modCode) {
    // Set the module selector (global) then navigate
    const unified = window._progressUnifiedModules || [];
    const m = unified.find(x => x.code === modCode);
    if (m && m.id) {
        try { modSelectedId = m.id; } catch (_) { /* global not yet loaded */ }
    }
    navigate('modules');
}

function _progressGoFcdb(modCode, mastery) {
    window._fcdbPrefilter = { module: modCode };
    if (mastery) window._fcdbPrefilter.mastery = mastery;
    navigate('fcdb');
}

function _progressGoTrainer(modCode) {
    // The trainer page will pick up window._trainerPreselectModule on next render
    window._trainerPreselectModule = modCode;
    navigate('trainer');
}

function _progressGoTrainerDue() {
    window._trainerOpenDue = true;
    navigate('trainer');
}

function _progressGoQcm(modCode) {
    if (modCode) window._qcmPrefilter = { module: modCode };
    navigate('qcm');
}


// ══════════════════════════════════════════════════════════════
// HEATMAP — 30 derniers jours
// ══════════════════════════════════════════════════════════════

function _renderHeatmap(sessions) {
    const el = document.getElementById('pgHeatmap');
    if (!el) return;

    const dayMap = {};
    (sessions || []).forEach(s => {
        const d = (s.date || '').slice(0, 10);
        if (d) dayMap[d] = (dayMap[d] || 0) + 1;
    });

    const today = new Date();
    const cells = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const count = dayMap[key] || 0;
        const level = count === 0 ? '' : count === 1 ? 'level-1'
            : count === 2 ? 'level-2' : count === 3 ? 'level-3' : 'level-4';
        const lbl = d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' });
        cells.push(`<div class="pg-hm-cell ${level}" title="${lbl}: ${count} session(s)"></div>`);
    }
    el.innerHTML = cells.join('');
}


// ══════════════════════════════════════════════════════════════
// QUIZ HISTORY compact
// ══════════════════════════════════════════════════════════════

function _renderQuizHistoryCompact(history) {
    const el = document.getElementById('pgQuizHistory');
    if (!el) return;

    if (!history.length) {
        el.innerHTML = '<div class="pg-empty-inline">Aucun quiz enregistré. <a href="#" onclick="navigate(\'trainer\');return false">Lancer un quiz →</a></div>';
        return;
    }

    el.innerHTML = history.slice(0, 8).map(h => {
        const score = h.score_percent || 0;
        const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
        const date = (h.session_date || '').slice(0, 10);
        return `<div class="pg-quiz-row">
            <span class="pg-quiz-date">${escapeHtml(date)}</span>
            <span class="pg-quiz-cat">${escapeHtml(h.category || '')}</span>
            <span class="pg-quiz-score" style="color:${color}">${score}%</span>
            <span class="pg-quiz-detail">${h.correct_answers || 0}/${h.total_questions || 0}</span>
        </div>`;
    }).join('');
}


// ══════════════════════════════════════════════════════════════
// NORMES SUIVIES
// ══════════════════════════════════════════════════════════════

function _renderTrackedNorms(norms) {
    const el = document.getElementById('pgNormProgress');
    if (!el) return;

    const tracked = (norms || []).filter(n =>
        (n.revision_count || 0) > 0 || (n.confidence_level || 0) > 0
    );

    if (!tracked.length) {
        el.innerHTML = '<div class="pg-empty">Aucune norme suivie — ajoute une étoile ou incrémente les révisions dans un module.</div>';
        return;
    }

    const coursMap = window._coursNormMap || {};
    el.innerHTML = tracked.map(n => {
        const status = _normStatus(n.last_revised);
        const conf = n.confidence_level || 0;
        const cat = (typeof getColor === 'function' ? getColor(n.category) : { bg: '#1e293b', accent: '#64748b' });
        const lastRev = n.last_revised
            ? new Date(n.last_revised).toLocaleDateString('fr-CH') : 'Jamais';
        const title = coursMap[n.norm_code] || '';
        const rc = n.revision_count || 0;
        const safe = escapeHtml(n.norm_code || '');
        const safeCat = escapeHtml(n.category || '');

        return `<div class="pg-norm-row" onclick="showNormDetail('${escapeAttr(n.norm_code)}')">
            <div class="pg-norm-dot" style="background:${status.color}" title="${status.label}"></div>
            <div class="pg-norm-info">
                <div class="pg-norm-code">${safe}${title ? ` <span class="pg-norm-title">— ${escapeHtml(title)}</span>` : ''}</div>
                <div class="pg-norm-meta">
                    <span style="color:${cat.accent}">${safeCat}</span>
                    <span class="pg-norm-dot-sep">•</span>
                    <span>Dernière révision : ${escapeHtml(lastRev)}</span>
                </div>
            </div>
            <div class="pg-norm-rc" title="Nombre de révisions">${rc}×</div>
            <div class="pg-norm-stars" title="Niveau de confiance">${_renderStarsStatic(conf)}</div>
        </div>`;
    }).join('');
}

function _normStatus(lastRevised) {
    if (!lastRevised) return { color: '#ef4444', label: 'Jamais revu' };
    const ms = Date.now() - new Date(lastRevised).getTime();
    const days = Math.floor(ms / 86400000);
    if (days <= 14) return { color: '#22c55e', label: 'Récent' };
    if (days <= 30) return { color: '#eab308', label: 'À revoir' };
    return { color: '#ef4444', label: 'Ancien' };
}

function _renderStarsStatic(level) {
    let s = '';
    for (let i = 1; i <= 5; i++) {
        s += `<span class="pg-star ${i <= level ? 'filled' : ''}">⭐</span>`;
    }
    return s;
}


// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

function _progressStyles() {
    // Inject once
    if (document.getElementById('pgStyles')) return '';
    return `<style id="pgStyles">
    /* ── Hero ── */
    .pg-hero {
        display: grid; grid-template-columns: 1fr auto; gap: 24px;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.05));
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 20px 22px;
        margin-bottom: 24px;
    }
    .pg-hero-left { display: flex; flex-direction: column; gap: 6px; }
    .pg-hero-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); }
    .pg-hero-pct { font-size: 48px; font-weight: 800; color: var(--text-bright); line-height: 1; }
    .pg-hero-pct-unit { font-size: 22px; color: var(--text-muted); font-weight: 500; margin-left: 2px; }
    .pg-hero-bar { height: 8px; background: #1e293b; border-radius: 4px; overflow: hidden; margin: 10px 0 6px; }
    .pg-hero-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6);
        transition: width .6s ease;
    }
    .pg-hero-sub { font-size: 12px; color: var(--text-secondary); display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .pg-hero-sub-item b { color: var(--text-bright); }
    .pg-hero-sub-dot { color: var(--text-muted); }
    .pg-hero-right { display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
    .pg-hero-btn {
        background: var(--bg-tertiary); border: 1px solid var(--border); color: var(--text-primary);
        padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
        transition: all .15s;
    }
    .pg-hero-btn:hover { border-color: #3b82f6; color: var(--text-bright); }
    .pg-hero-btn-primary { background: #1e3a8a; border-color: #3b82f6; color: #dbeafe; }
    .pg-hero-btn-primary:hover { background: #1e40af; }
    .pg-hero-due {
        background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444;
        padding: 7px 12px; border-radius: 8px; font-size: 12px; font-weight: 600;
        text-align: center; cursor: pointer;
    }
    .pg-hero-due:hover { background: #991b1b; }

    /* ── Section titles ── */
    .pg-section-title { font-size: 14px; font-weight: 700; color: var(--text-bright); margin: 24px 0 12px; letter-spacing: 0.5px; text-transform: uppercase; }
    .pg-section-subtitle { font-weight: 500; color: var(--text-muted); text-transform: none; letter-spacing: normal; font-size: 12px; margin-left: 6px; }

    /* ── Module grid ── */
    .pg-mod-grid {
        display: grid; gap: 14px;
        grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
        margin-bottom: 28px;
    }
    .pg-mc {
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-top: 3px solid #64748b;
        border-radius: 10px;
        padding: 14px 16px;
        display: flex; flex-direction: column; gap: 10px;
        transition: transform .15s, border-color .15s;
    }
    .pg-mc:hover { transform: translateY(-2px); border-color: #3b82f6; }
    .pg-mc-head { cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
    .pg-mc-code-wrap { display: flex; align-items: center; gap: 8px; }
    .pg-mc-code {
        font-size: 11px; font-weight: 800; padding: 2px 7px;
        border-radius: 5px; letter-spacing: 0.5px;
    }
    .pg-mc-status { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .pg-mc-due {
        background: #7f1d1d; color: #fca5a5; font-size: 10px;
        padding: 2px 6px; border-radius: 10px; font-weight: 700;
    }
    .pg-mc-name { font-size: 14px; font-weight: 700; color: var(--text-bright); line-height: 1.25; }
    .pg-mc-meta { font-size: 11px; color: var(--text-muted); display: flex; gap: 6px; align-items: center; }
    .pg-mc-meta-dot { opacity: 0.5; }

    .pg-mc-pct-wrap { display: flex; align-items: center; gap: 10px; }
    .pg-mc-pct { font-size: 22px; font-weight: 800; min-width: 60px; line-height: 1; }
    .pg-mc-bar { flex: 1; height: 6px; background: #0f172a; border-radius: 3px; overflow: hidden; }
    .pg-mc-bar-fill { height: 100%; transition: width .4s ease; }

    .pg-mc-metrics { display: flex; flex-direction: column; gap: 8px; }
    .pg-mc-metric {
        background: transparent; border: none; cursor: pointer; padding: 6px 8px;
        border-radius: 6px; text-align: left; display: flex; flex-direction: column; gap: 4px;
        color: var(--text-primary);
    }
    .pg-mc-metric:hover { background: rgba(59, 130, 246, 0.08); }
    .pg-mc-metric-head {
        display: flex; align-items: center; gap: 8px; font-size: 12px;
    }
    .pg-mc-metric-icon { font-size: 13px; }
    .pg-mc-metric-label { color: var(--text-secondary); font-weight: 600; }
    .pg-mc-metric-value { margin-left: auto; font-weight: 700; color: var(--text-bright); }
    .pg-mc-metric-bar {
        display: flex; height: 5px; border-radius: 3px; overflow: hidden; gap: 1px; background: #0f172a;
    }
    .pg-mc-seg { min-width: 0; transition: flex .3s; }
    .pg-mc-empty-bar {
        font-size: 10px; color: var(--text-muted); padding: 0 6px;
        display: flex; align-items: center; font-style: italic;
    }

    .pg-mc-foot {
        display: flex; justify-content: space-between; align-items: center;
        padding-top: 6px; border-top: 1px solid var(--border);
        font-size: 11px;
    }
    .pg-mc-foot-last { color: var(--text-muted); }
    .pg-mc-foot-actions { display: flex; gap: 6px; }
    .pg-mc-cta {
        background: #064e3b; color: #6ee7b7; border: 1px solid #10b981;
        padding: 4px 10px; border-radius: 5px; font-size: 11px; font-weight: 700; cursor: pointer;
    }
    .pg-mc-cta:hover { background: #047857; }
    .pg-mc-cta-qcm { background: #1e3a5f; color: #93c5fd; border-color: #3b82f6; }
    .pg-mc-cta-qcm:hover { background: #1e40af; }

    /* ── Two-col section (heatmap + quizz) ── */
    .pg-twocol {
        display: grid; gap: 14px;
        grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
        margin-bottom: 24px;
    }
    .pg-card {
        background: var(--bg-secondary); border: 1px solid var(--border);
        border-radius: 10px; padding: 14px 16px;
    }
    .pg-card-title { font-size: 13px; font-weight: 700; color: var(--text-bright); margin-bottom: 10px; }

    /* ── Heatmap ── */
    .pg-heatmap { display: flex; flex-wrap: wrap; gap: 3px; }
    .pg-hm-cell {
        width: 16px; height: 16px; background: #1e293b; border-radius: 3px;
        transition: transform .1s;
    }
    .pg-hm-cell:hover { transform: scale(1.2); }
    .pg-hm-cell.level-1 { background: #14532d; }
    .pg-hm-cell.level-2 { background: #166534; }
    .pg-hm-cell.level-3 { background: #16a34a; }
    .pg-hm-cell.level-4 { background: #22c55e; }
    .pg-heatmap-legend {
        display: flex; align-items: center; gap: 4px;
        margin-top: 10px; font-size: 11px; color: var(--text-muted);
    }
    .pg-heatmap-legend .pg-hm-cell { width: 12px; height: 12px; }

    /* ── Quiz history compact rows ── */
    .pg-quiz-row {
        display: grid; grid-template-columns: 60px 1fr 50px 50px;
        gap: 10px; align-items: center; padding: 5px 0;
        border-bottom: 1px solid var(--border); font-size: 12px;
    }
    .pg-quiz-row:last-child { border-bottom: none; }
    .pg-quiz-date { color: var(--text-muted); font-size: 11px; }
    .pg-quiz-cat { color: var(--text-secondary); }
    .pg-quiz-score { font-weight: 800; text-align: right; }
    .pg-quiz-detail { color: var(--text-muted); font-size: 11px; text-align: right; }
    .pg-empty-inline { color: var(--text-muted); font-size: 12px; }
    .pg-empty-inline a { color: #3b82f6; text-decoration: none; }

    /* ── Normes suivies ── */
    .pg-norm-row {
        display: flex; align-items: center; gap: 12px;
        padding: 10px 14px; border-bottom: 1px solid var(--border);
        cursor: pointer; transition: background .1s;
    }
    .pg-norm-row:hover { background: rgba(59, 130, 246, 0.06); }
    .pg-norm-row:last-child { border-bottom: none; }
    .pg-norm-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .pg-norm-info { flex: 1; min-width: 0; }
    .pg-norm-code { font-size: 13px; font-weight: 700; color: var(--text-bright); }
    .pg-norm-title { font-weight: 500; color: var(--text-secondary); font-size: 12px; }
    .pg-norm-meta { font-size: 11px; color: var(--text-muted); display: flex; gap: 6px; align-items: center; margin-top: 2px; }
    .pg-norm-dot-sep { opacity: 0.5; }
    .pg-norm-rc {
        background: var(--bg-tertiary); color: var(--text-bright); font-size: 11px;
        font-weight: 700; padding: 3px 8px; border-radius: 5px;
    }
    .pg-norm-stars { font-size: 10px; display: flex; gap: 1px; }
    .pg-norm-stars .pg-star { filter: grayscale(1) brightness(0.4); }
    .pg-norm-stars .pg-star.filled { filter: none; }

    .pg-empty {
        padding: 30px 20px; text-align: center;
        color: var(--text-muted); font-size: 13px;
    }
    </style>`;
}


// ══════════════════════════════════════════════════════════════
// MODAL DÉTAIL NORME (repris de l'ancienne version — compat ascendante)
// ══════════════════════════════════════════════════════════════

async function showNormDetail(normCode) {
    const detail = await api('get_norm_detail', normCode);
    if (!detail) return;

    const p = detail.progress || {};
    const s = detail.stats || {};
    const cards = detail.flashcards || [];
    const lessons = detail.lessons || [];
    const coursMap = window._coursNormMap || {};
    const title = coursMap[normCode] || '';

    const total = s.total || 1;
    const segments = [
        { label: 'Mastered', count: s.mastered, color: '#10b981' },
        { label: 'Good', count: s.good, color: '#3b82f6' },
        { label: 'Learning', count: s.learning, color: '#f59e0b' },
        { label: 'Again', count: s.again, color: '#ef4444' },
        { label: 'Pas commencé', count: s.not_started, color: '#475569' },
    ];
    const barHtml = segments.filter(seg => seg.count > 0).map(seg => {
        const pct = (seg.count / total) * 100;
        return `<div style="background:${seg.color};height:24px;flex:${seg.count};min-width:${pct < 5 ? '20px' : 'auto'};display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:700" title="${seg.label}: ${seg.count}">${seg.count}</div>`;
    }).join('');

    const recent = cards
        .filter(c => c.last_reviewed)
        .sort((a, b) => (b.last_reviewed || '').localeCompare(a.last_reviewed || ''))
        .slice(0, 5);

    const recentHtml = recent.length === 0 ? '<div style="color:var(--text-muted);font-size:12px">Aucune activité récente</div>' :
        recent.map(c => {
            const date = new Date(c.last_reviewed).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' });
            const accuracy = c.review_count ? Math.round((c.correct_count / c.review_count) * 100) : 0;
            const masteryColor = c.mastery === 'Mastered' ? '#10b981' : c.mastery === 'Good' ? '#3b82f6' : c.mastery === 'Learning' ? '#f59e0b' : '#ef4444';
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
                <span style="color:var(--text-secondary)">#${c.id}</span>
                <span style="color:${masteryColor};font-weight:600">${c.mastery || '—'}</span>
                <span style="color:var(--text-muted)">${accuracy}% (${c.review_count}×)</span>
                <span style="color:var(--text-muted)">${date}</span>
            </div>`;
        }).join('');

    const existing = document.getElementById('normDetailModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'normDetailModal';
    modal.style.cssText = `
        position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.7);
        display:flex;align-items:center;justify-content:center;padding:20px`;
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.innerHTML = `
        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:14px;
            max-width:720px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;position:relative">
            <button onclick="document.getElementById('normDetailModal').remove()"
                style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--text-muted);font-size:22px;cursor:pointer">✕</button>

            <h2 style="font-size:20px;font-weight:800;color:var(--text-bright);margin:0 0 4px">
                ${escapeHtml(normCode)}${title ? ` <span style="font-weight:500;color:var(--text-secondary);font-size:15px">— ${escapeHtml(title)}</span>` : ''}
            </h2>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:18px">
                ${p.category || ''} • Dernière révision : ${p.last_revised ? new Date(p.last_revised).toLocaleDateString('fr-CH') : 'jamais'}
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:20px">
                <div style="background:var(--bg-tertiary);padding:12px;border-radius:8px;text-align:center">
                    <div style="font-size:22px;font-weight:800;color:#fbbf24">${'⭐'.repeat(p.confidence_level || 0) || '—'}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Confiance</div>
                </div>
                <div style="background:var(--bg-tertiary);padding:12px;border-radius:8px;text-align:center">
                    <div style="font-size:22px;font-weight:800;color:#60a5fa">${p.revision_count || 0}×</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Révisions</div>
                </div>
                <div style="background:var(--bg-tertiary);padding:12px;border-radius:8px;text-align:center">
                    <div style="font-size:22px;font-weight:800;color:#10b981">${s.accuracy || 0}%</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Précision</div>
                </div>
                <div style="background:var(--bg-tertiary);padding:12px;border-radius:8px;text-align:center">
                    <div style="font-size:22px;font-weight:800;color:${s.due > 0 ? '#ef4444' : '#10b981'}">${s.due || 0}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Cartes dues</div>
                </div>
            </div>

            <div style="margin-bottom:20px">
                <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:8px">
                    📚 Flashcards (${s.total || 0})
                </div>
                ${s.total > 0 ? `
                    <div style="display:flex;gap:2px;border-radius:6px;overflow:hidden;margin-bottom:8px">
                        ${barHtml}
                    </div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:var(--text-muted)">
                        <span><span style="color:#10b981">●</span> Mastered ${s.mastered}</span>
                        <span><span style="color:#3b82f6">●</span> Good ${s.good}</span>
                        <span><span style="color:#f59e0b">●</span> Learning ${s.learning}</span>
                        <span><span style="color:#ef4444">●</span> Again ${s.again}</span>
                        <span><span style="color:#475569">●</span> Pas commencé ${s.not_started}</span>
                    </div>
                ` : '<div style="color:var(--text-muted);font-size:12px">Aucune flashcard associée.</div>'}
            </div>

            <div style="margin-bottom:20px">
                <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:8px">
                    📖 Leçons terminées : ${lessons.filter(l => l.completed).length}/${lessons.length || '—'}
                </div>
                ${lessons.length > 0 ? lessons.map(l => `
                    <div style="font-size:11px;color:var(--text-secondary);padding:3px 0">
                        ${l.completed ? '✅' : '○'} ${escapeHtml(l.lesson_id)}
                        ${l.completed_at ? ` <span style="color:var(--text-muted)">(${new Date(l.completed_at).toLocaleDateString('fr-CH')})</span>` : ''}
                    </div>
                `).join('') : '<div style="color:var(--text-muted);font-size:12px">Aucune leçon terminée. <a href="#" onclick="document.getElementById(\'normDetailModal\').remove();navigate(\'trainer\');return false" style="color:#3b82f6">Ouvrir Entraînement →</a></div>'}
            </div>

            <div style="margin-bottom:16px">
                <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:8px">
                    🕐 Dernières révisions
                </div>
                ${recentHtml}
            </div>

            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
                <button onclick="document.getElementById('normDetailModal').remove();navigate('trainer')"
                    style="background:#064e3b;color:#6ee7b7;border:1px solid #10b981;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">
                    🎯 Entraîner sur cette norme
                </button>
                <button onclick="document.getElementById('normDetailModal').remove()"
                    style="background:transparent;color:var(--text-muted);border:1px solid var(--border);padding:8px 14px;border-radius:8px;cursor:pointer;font-size:12px">
                    Fermer
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function escapeAttr(s) {
    return String(s || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
