/* ═══════════════════════════════════════════════════════════
   Swiss CPA Revision — Module QCM (version avancée)
   ═══════════════════════════════════════════════════════════

   FEATURES :
   • Filtres : module, difficulté, type, norme
   • Presets : Flash / Standard / Session / Examen blanc
   • Sélections spéciales : Favoris ⭐ · Points faibles · Due SR · Mes erreurs
   • Mode Examen blanc (100 Q · 3h · timer · pas de feedback)
   • Mode Standard / Correction / Deep-dive
   • Bookmarks + Notes par question
   • Confidence rating (Sûr / Devine)
   • Spaced Repetition (SM-2 simplifié)
   • Stats par question (accuracy, times answered, avg time)
   • Radar de maîtrise par module
   • Score d'examen prédit
   • Historique des sessions
   • Raccourcis clavier (1-4, Enter, B, N, S, F)
   • Shuffle des options (anti-mémorisation)
   • Skip & return (report à la fin de session)
   • Link-to-source (ouvre la norme associée)
   • Pause intelligente / Resume session
*/

const qcm = {
    // Catalogue
    catalog: [],          // questions brutes
    summary: [],          // résumé par module

    // Tracking persistent (chargé au démarrage)
    tracking: {
        stats: {},        // qid -> {attempts, correct, accuracy, avg_time_ms, last_at, streak}
        bookmarks: {},    // qid -> {starred, note}
        due_ids: [],
        counts: {},
    },

    // UI state
    _view: 'setup',       // setup | quiz | result | history
    _container: null,

    // Filtres (setup)
    filters: {
        modules: new Set(),
        diffs: new Set(),
        types: new Set(),
        norms: new Set(),
    },
    preset: 'standard',
    count: 20,
    mode: 'training',     // training | exam_review | exam_blind
    order: 'random',      // random | module
    shuffleOptions: true,
    specialSelection: null,  // null | 'starred' | 'weak' | 'due' | 'recent_wrong'

    // Session en cours
    session: null,        // {id, questions, answers, start, currentIdx, skipped, timer}
};


// ══════════════════════════════════════════════════════════════
// PERSISTENCE LOCALE (filtres, session en cours, ...)
// ══════════════════════════════════════════════════════════════

const QCM_STATE_LS_KEY = 'swisscpa_qcm_state';
const QCM_STATE_TTL_MS = 24 * 3600 * 1000; // 24 h

function _qcmSaveState() {
    try {
        const s = qcm.session;
        const payload = {
            savedAt: Date.now(),
            view: qcm._view || null,
            preset: qcm.preset, count: qcm.count,
            mode: qcm.mode, order: qcm.order,
            shuffleOptions: qcm.shuffleOptions,
            specialSelection: qcm.specialSelection || null,
            filters: {
                modules: [...qcm.filters.modules],
                diffs:   [...qcm.filters.diffs],
                types:   [...qcm.filters.types],
                norms:   [...qcm.filters.norms],
            },
            session: s ? {
                id: s.id || null,
                questionIds: (s.questions || []).map(q => q.id),
                answers: s.answers || [],
                currentIdx: s.currentIdx || 0,
                start: s.start, mode: s.mode,
                speedMode: !!s.speedMode, isExam: !!s.isExam,
                timerSeconds: s.timerSeconds || null,
                skipped: s.skipped ? [...s.skipped] : [],
                elapsedMs: Date.now() - (s.start || Date.now()),
            } : null,
        };
        localStorage.setItem(QCM_STATE_LS_KEY, JSON.stringify(payload));
    } catch (e) { /* localStorage plein ou désactivé */ }
}

function _qcmLoadState() {
    try {
        const raw = localStorage.getItem(QCM_STATE_LS_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || !data.savedAt) return null;
        if (Date.now() - data.savedAt > QCM_STATE_TTL_MS) {
            localStorage.removeItem(QCM_STATE_LS_KEY);
            return null;
        }
        return data;
    } catch (_) { return null; }
}

function _qcmClearState() {
    try { localStorage.removeItem(QCM_STATE_LS_KEY); } catch (_) {}
}

// Reprend une session QCM persistée (bannière "↩ Reprendre la session QCM ?").
function _qcmResumeFromSaved() {
    const saved = _qcmLoadState();
    if (!saved) { _qcmRenderSetup(); return; }

    // Restaure les filtres (toujours utile, même hors session active).
    if (saved.filters) {
        qcm.filters.modules = new Set(saved.filters.modules || []);
        qcm.filters.diffs   = new Set(saved.filters.diffs   || []);
        qcm.filters.types   = new Set(saved.filters.types   || []);
        qcm.filters.norms   = new Set(saved.filters.norms   || []);
    }
    if (saved.preset) qcm.preset = saved.preset;
    if (saved.count) qcm.count = saved.count;
    if (saved.mode)  qcm.mode  = saved.mode;
    if (saved.order) qcm.order = saved.order;
    if (typeof saved.shuffleOptions === 'boolean') qcm.shuffleOptions = saved.shuffleOptions;
    qcm.specialSelection = saved.specialSelection || null;

    // Si une session était en cours et reconstructible depuis le catalogue, la rétablir.
    if (saved.session && Array.isArray(saved.session.questionIds) && saved.session.questionIds.length) {
        const map = {};
        for (const q of qcm.catalog) map[q.id] = q;
        const qs = saved.session.questionIds.map(id => map[id]).filter(Boolean);
        if (qs.length === saved.session.questionIds.length) {
            qcm.session = {
                id: saved.session.id || null,
                questions: qs,
                answers: saved.session.answers && saved.session.answers.length === qs.length
                    ? saved.session.answers
                    : new Array(qs.length).fill(null),
                currentIdx: Math.min(saved.session.currentIdx || 0, qs.length - 1),
                start: Date.now() - (saved.session.elapsedMs || 0),
                questionStart: Date.now(),
                mode: saved.session.mode || 'training',
                speedMode: !!saved.session.speedMode,
                isExam: !!saved.session.isExam,
                timerSeconds: saved.session.timerSeconds || null,
                skipped: new Set(saved.session.skipped || []),
            };
            _qcmRenderQuestion();
            return;
        }
    }
    // Sinon : juste retomber sur le setup avec filtres restaurés.
    _qcmRenderSetup();
}


// ══════════════════════════════════════════════════════════════
// ENTRY POINT
// ══════════════════════════════════════════════════════════════

async function renderQcm(container) {
    qcm._container = container;
    qcm._view = 'setup';

    _qcmInjectStyles();

    if (!qcm.catalog.length) {
        container.innerHTML = `<div style="padding:40px;text-align:center;color:#64748b">Chargement des questions…</div>`;
        try {
            const data = await api('get_qcm_catalog');
            qcm.catalog = (data && data.questions) || [];
            qcm.summary = (data && data.summary) || [];
        } catch (e) {
            container.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444">Erreur catalogue : ${escapeHtml(String(e))}</div>`;
            return;
        }
    }

    // Load tracking snapshot
    try {
        const t = await api('get_qcm_tracking_data');
        qcm.tracking = t || { stats: {}, bookmarks: {}, due_ids: [], counts: {} };
    } catch (e) {
        console.warn('qcm tracking load failed:', e);
    }

    _qcmBindKeys();

    // Bannière "↩ Reprendre la session QCM ?" si état présent et < 24 h.
    const saved = _qcmLoadState();
    if (saved) {
        const hasLiveSession = saved.session && Array.isArray(saved.session.questionIds) && saved.session.questionIds.length;
        const ageMin = Math.round((Date.now() - saved.savedAt) / 60000);
        const subtitle = hasLiveSession
            ? `Session en cours : ${saved.session.questionIds.length} questions · ${saved.session.currentIdx + 1}<sup>e</sup> en cours`
            : `Filtres et réglages restaurés (il y a ${ageMin} min)`;
        container.innerHTML = `
            <div class="qcm-resume-banner" style="margin:18px 0;padding:14px 18px;background:linear-gradient(135deg,#1e3a5f22,#3b82f622);border:1px solid #3b82f6;border-radius:10px;display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap">
                <div>
                    <div style="font-size:14px;color:#93c5fd;font-weight:600">↩ Reprendre la session QCM ?</div>
                    <div style="font-size:12px;color:#cbd5e1;margin-top:4px">${subtitle}</div>
                </div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-primary" onclick="_qcmResumeFromSaved()">Reprendre</button>
                    <button class="btn btn-outline" onclick="_qcmDiscardSavedState()">Ignorer</button>
                </div>
            </div>
            <div id="qcmSetupAnchor"></div>`;
        // On rend également le setup complet en dessous pour ne pas cacher la page.
        _qcmRenderSetup();
        return;
    }

    _qcmRenderSetup();
}

function _qcmDiscardSavedState() {
    _qcmClearState();
    _qcmRenderSetup();
}


// ══════════════════════════════════════════════════════════════
// SETUP VIEW (page d'accueil du module QCM)
// ══════════════════════════════════════════════════════════════

function _qcmRenderSetup() {
    const el = qcm._container;
    if (!el) return;
    qcm._view = 'setup';

    const total = qcm.catalog.length;
    const filteredCount = _qcmFilteredQuestions().length;
    const modules = qcm.summary;
    const t = qcm.tracking;
    const countsTot = t.counts || {};

    // Selection stats
    const starredCount = Object.values(t.bookmarks).filter(b => b.starred).length;
    const dueCount = (t.due_ids || []).length;
    const weakCount = _qcmWeakCount();
    const totalQuestionsSeen = countsTot.total_questions_seen || 0;

    el.innerHTML = `
        <div class="page-title">❓ Module QCM</div>
        <div class="page-subtitle">Questions à choix multiples + vrai/faux — mode examen, points faibles, révision espacée</div>

        <!-- Hero stats (ta progression QCM globale) -->
        <div class="qcm-hero">
            <div class="qcm-hero-stat">
                <div class="qcm-hero-val" style="color:#3b82f6">${total}</div>
                <div class="qcm-hero-lbl">Questions disponibles</div>
            </div>
            <div class="qcm-hero-stat">
                <div class="qcm-hero-val" style="color:#22c55e">${totalQuestionsSeen}</div>
                <div class="qcm-hero-lbl">Déjà vues</div>
            </div>
            <div class="qcm-hero-stat">
                <div class="qcm-hero-val" style="color:#eab308">${countsTot.correct_rate || 0}<span style="font-size:14px;color:var(--text-muted)">%</span></div>
                <div class="qcm-hero-lbl">Taux de réussite</div>
            </div>
            <div class="qcm-hero-stat ${dueCount ? 'qcm-hero-active' : ''}">
                <div class="qcm-hero-val" style="color:${dueCount ? '#f59e0b' : 'var(--text-muted)'}">${dueCount}</div>
                <div class="qcm-hero-lbl">À réviser (SR)</div>
            </div>
            <div class="qcm-hero-stat ${starredCount ? 'qcm-hero-active' : ''}">
                <div class="qcm-hero-val" style="color:${starredCount ? '#fbbf24' : 'var(--text-muted)'}">${starredCount}</div>
                <div class="qcm-hero-lbl">Favoris ⭐</div>
            </div>
            <div class="qcm-hero-stat">
                <div class="qcm-hero-val" style="color:#ef4444">${weakCount}</div>
                <div class="qcm-hero-lbl">Points faibles</div>
            </div>
        </div>

        <!-- Sélections spéciales (sessions intelligentes) -->
        <div class="qcm-section-title">🎯 Sessions intelligentes</div>
        <div class="qcm-special-row">
            <button class="qcm-special qcm-special-due ${dueCount === 0 ? 'qcm-disabled' : ''}" onclick="_qcmStartSpecial('due')" ${dueCount === 0 ? 'disabled' : ''}>
                <div class="qcm-special-title">🔁 Révision espacée (SR)</div>
                <div class="qcm-special-desc"><b>${dueCount}</b> questions dues — ancrage mémoire long terme</div>
            </button>
            <button class="qcm-special qcm-special-weak ${weakCount === 0 ? 'qcm-disabled' : ''}" onclick="_qcmStartSpecial('weak')" ${weakCount === 0 ? 'disabled' : ''}>
                <div class="qcm-special-title">🎯 Points faibles</div>
                <div class="qcm-special-desc">Tes <b>${weakCount}</b> questions les plus ratées</div>
            </button>
            <button class="qcm-special qcm-special-star ${starredCount === 0 ? 'qcm-disabled' : ''}" onclick="_qcmStartSpecial('starred')" ${starredCount === 0 ? 'disabled' : ''}>
                <div class="qcm-special-title">⭐ Mes favoris</div>
                <div class="qcm-special-desc"><b>${starredCount}</b> questions marquées</div>
            </button>
            <button class="qcm-special qcm-special-wrong" onclick="_qcmStartSpecial('recent_wrong')">
                <div class="qcm-special-title">✗ Mes erreurs récentes</div>
                <div class="qcm-special-desc">50 dernières questions ratées</div>
            </button>
            <button class="qcm-special qcm-special-exam" onclick="_qcmStartExamBlanc()">
                <div class="qcm-special-title">📝 Examen blanc</div>
                <div class="qcm-special-desc">100 Q · 3h · pas de feedback · simulation réelle</div>
            </button>
            <button class="qcm-special qcm-special-hist" onclick="_qcmShowHistory()">
                <div class="qcm-special-title">🕐 Historique</div>
                <div class="qcm-special-desc">Voir tes sessions passées</div>
            </button>
        </div>

        <!-- Presets rapides -->
        <div class="qcm-section-title">⚡ Démarrage rapide</div>
        <div class="qcm-presets">
            <button class="qcm-preset ${qcm.preset === 'flash' ? 'qcm-preset-active' : ''}" onclick="_qcmApplyPreset('flash')">
                <div class="qcm-preset-icon">⚡</div>
                <div class="qcm-preset-title">Flash</div>
                <div class="qcm-preset-desc">10 questions aléatoires</div>
            </button>
            <button class="qcm-preset ${qcm.preset === 'standard' ? 'qcm-preset-active' : ''}" onclick="_qcmApplyPreset('standard')">
                <div class="qcm-preset-icon">📚</div>
                <div class="qcm-preset-title">Standard</div>
                <div class="qcm-preset-desc">20 questions</div>
            </button>
            <button class="qcm-preset ${qcm.preset === 'session' ? 'qcm-preset-active' : ''}" onclick="_qcmApplyPreset('session')">
                <div class="qcm-preset-icon">🎯</div>
                <div class="qcm-preset-title">Session</div>
                <div class="qcm-preset-desc">50 questions</div>
            </button>
            <button class="qcm-preset ${qcm.preset === 'speed' ? 'qcm-preset-active' : ''}" onclick="_qcmApplyPreset('speed')">
                <div class="qcm-preset-icon">⏱</div>
                <div class="qcm-preset-title">Vitesse</div>
                <div class="qcm-preset-desc">30 Q · 30s max/Q</div>
            </button>
        </div>

        <!-- Filtres -->
        <div class="qcm-section-title">Filtres</div>
        <div class="qcm-filters">
            <div class="qcm-filter-group">
                <div class="qcm-filter-lbl">Modules</div>
                <div class="qcm-chips" id="qcmModules"></div>
            </div>
            <div class="qcm-filter-group">
                <div class="qcm-filter-lbl">Difficulté</div>
                <div class="qcm-chips" id="qcmDiffs"></div>
            </div>
            <div class="qcm-filter-group">
                <div class="qcm-filter-lbl">Type</div>
                <div class="qcm-chips" id="qcmTypes"></div>
            </div>
            <div class="qcm-filter-group">
                <div class="qcm-filter-lbl">Normes</div>
                <div class="qcm-chips qcm-chips-scroll" id="qcmNorms"></div>
            </div>
        </div>

        <!-- Configuration -->
        <div class="qcm-section-title">Configuration</div>
        <div class="qcm-config">
            <div class="qcm-config-group">
                <div class="qcm-filter-lbl">Nombre de questions</div>
                <div class="qcm-chips" id="qcmCounts"></div>
            </div>
            <div class="qcm-config-group">
                <div class="qcm-filter-lbl">Mode</div>
                <div class="qcm-chips" id="qcmModes"></div>
            </div>
            <div class="qcm-config-group">
                <div class="qcm-filter-lbl">Ordre</div>
                <div class="qcm-chips" id="qcmOrders"></div>
            </div>
            <div class="qcm-config-group">
                <div class="qcm-filter-lbl">Options</div>
                <div class="qcm-chips" id="qcmToggles"></div>
            </div>
        </div>

        <!-- Action -->
        <div class="qcm-action-row">
            <div class="qcm-filter-count">
                <span id="qcmFilterCount" style="font-size:18px;font-weight:800;color:#3b82f6">${filteredCount}</span>
                <span style="color:var(--text-muted);font-size:12px">questions filtrées · </span>
                <span id="qcmSessionCount" style="color:var(--text-bright);font-weight:700">${Math.min(qcm.count, filteredCount)}</span>
                <span style="color:var(--text-muted);font-size:12px">sélectionnées pour la session</span>
            </div>
            <button class="qcm-btn-start" onclick="_qcmStartQuiz()">▶ Démarrer</button>
        </div>

        <!-- Couverture par module -->
        <div class="qcm-section-title">Couverture par module</div>
        <div class="qcm-coverage" id="qcmCoverage"></div>
    `;

    _qcmRenderChips();
    _qcmRenderCoverage();
}


// ══════════════════════════════════════════════════════════════
// CHIPS (filtres + config)
// ══════════════════════════════════════════════════════════════

function _qcmRenderChips() {
    // Modules
    const modEl = document.getElementById('qcmModules');
    if (modEl) {
        const mods = qcm.summary.map(s => s.module);
        modEl.innerHTML = mods.map(m => {
            const c = getModuleColor ? getModuleColor(m) : '#64748b';
            const active = qcm.filters.modules.has(m);
            const count = (qcm.summary.find(s => s.module === m) || {}).total || 0;
            return `<button class="qcm-chip ${active ? 'active' : ''}"
                data-kind="module" data-val="${escapeAttr(m)}"
                style="${active ? `background:${c};color:#fff;border-color:${c}` : `border-color:${c}44`}">
                ${escapeHtml(m)} <span class="qcm-chip-count">${count}</span>
            </button>`;
        }).join('') +
        `<button class="qcm-chip qcm-chip-clear" data-kind="module" data-val="__clear__">✕ Tous</button>`;

        modEl.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', _qcmChipClick));
    }

    // Difficultés
    const diffEl = document.getElementById('qcmDiffs');
    if (diffEl) {
        const diffs = [
            { k: 'easy', lbl: '🟢 Facile' },
            { k: 'medium', lbl: '🟡 Moyen' },
            { k: 'hard', lbl: '🔴 Difficile' },
        ];
        diffEl.innerHTML = diffs.map(d => {
            const active = qcm.filters.diffs.has(d.k);
            const c = qcm.catalog.filter(q => q.difficulty === d.k).length;
            return `<button class="qcm-chip ${active ? 'active' : ''}" data-kind="diff" data-val="${d.k}">
                ${d.lbl} <span class="qcm-chip-count">${c}</span>
            </button>`;
        }).join('');
        diffEl.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', _qcmChipClick));
    }

    // Types
    const typeEl = document.getElementById('qcmTypes');
    if (typeEl) {
        const types = [
            { k: 'mcq', lbl: 'QCM (4 réponses)' },
            { k: 'vrai_faux', lbl: 'Vrai / Faux' },
        ];
        typeEl.innerHTML = types.map(t => {
            const active = qcm.filters.types.has(t.k);
            const c = qcm.catalog.filter(q => q.type === t.k).length;
            return `<button class="qcm-chip ${active ? 'active' : ''}" data-kind="type" data-val="${t.k}">
                ${t.lbl} <span class="qcm-chip-count">${c}</span>
            </button>`;
        }).join('');
        typeEl.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', _qcmChipClick));
    }

    // Normes
    const normEl = document.getElementById('qcmNorms');
    if (normEl) {
        const normCounts = {};
        qcm.catalog.forEach(q => {
            normCounts[q.norm_code] = (normCounts[q.norm_code] || 0) + 1;
        });
        const norms = Object.keys(normCounts).sort();
        normEl.innerHTML = norms.map(n => {
            const active = qcm.filters.norms.has(n);
            return `<button class="qcm-chip ${active ? 'active' : ''}" data-kind="norm" data-val="${escapeAttr(n)}">
                ${escapeHtml(n)} <span class="qcm-chip-count">${normCounts[n]}</span>
            </button>`;
        }).join('');
        normEl.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', _qcmChipClick));
    }

    // Counts
    const cntEl = document.getElementById('qcmCounts');
    if (cntEl) {
        const options = [5, 10, 20, 30, 50, 100];
        cntEl.innerHTML = options.map(c => {
            const active = qcm.count === c;
            return `<button class="qcm-chip ${active ? 'active' : ''}" data-kind="count" data-val="${c}">${c}</button>`;
        }).join('') +
        `<button class="qcm-chip ${qcm.count > 100 ? 'active' : ''}" data-kind="count" data-val="all">Tout</button>`;
        cntEl.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', _qcmChipClick));
    }

    // Modes
    const modesEl = document.getElementById('qcmModes');
    if (modesEl) {
        const modes = [
            { k: 'training', lbl: '📖 Entraînement (feedback immédiat)' },
            { k: 'exam_review', lbl: '📝 Examen (score final)' },
        ];
        modesEl.innerHTML = modes.map(m => {
            const active = qcm.mode === m.k;
            return `<button class="qcm-chip ${active ? 'active' : ''}" data-kind="mode" data-val="${m.k}">${m.lbl}</button>`;
        }).join('');
        modesEl.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', _qcmChipClick));
    }

    // Orders
    const ordEl = document.getElementById('qcmOrders');
    if (ordEl) {
        const orders = [
            { k: 'random', lbl: '🎲 Aléatoire' },
            { k: 'module', lbl: '📚 Par module' },
        ];
        ordEl.innerHTML = orders.map(o => {
            const active = qcm.order === o.k;
            return `<button class="qcm-chip ${active ? 'active' : ''}" data-kind="order" data-val="${o.k}">${o.lbl}</button>`;
        }).join('');
        ordEl.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', _qcmChipClick));
    }

    // Toggles
    const togEl = document.getElementById('qcmToggles');
    if (togEl) {
        togEl.innerHTML = `
            <button class="qcm-chip ${qcm.shuffleOptions ? 'active' : ''}" data-kind="toggle" data-val="shuffle">
                🔀 Mélanger les options
            </button>
        `;
        togEl.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', _qcmChipClick));
    }
}


function _qcmChipClick(e) {
    const b = e.currentTarget;
    const kind = b.dataset.kind;
    const val = b.dataset.val;

    if (kind === 'module') {
        if (val === '__clear__') qcm.filters.modules.clear();
        else if (qcm.filters.modules.has(val)) qcm.filters.modules.delete(val);
        else qcm.filters.modules.add(val);
    } else if (kind === 'diff') {
        if (qcm.filters.diffs.has(val)) qcm.filters.diffs.delete(val);
        else qcm.filters.diffs.add(val);
    } else if (kind === 'type') {
        if (qcm.filters.types.has(val)) qcm.filters.types.delete(val);
        else qcm.filters.types.add(val);
    } else if (kind === 'norm') {
        if (qcm.filters.norms.has(val)) qcm.filters.norms.delete(val);
        else qcm.filters.norms.add(val);
    } else if (kind === 'count') {
        qcm.count = val === 'all' ? 99999 : parseInt(val, 10) || 20;
    } else if (kind === 'mode') {
        qcm.mode = val;
    } else if (kind === 'order') {
        qcm.order = val;
    } else if (kind === 'toggle') {
        if (val === 'shuffle') qcm.shuffleOptions = !qcm.shuffleOptions;
    }

    _qcmRenderChips();
    _qcmUpdateFilterCount();
    _qcmSaveState();
}


function _qcmUpdateFilterCount() {
    const filtered = _qcmFilteredQuestions();
    const fcEl = document.getElementById('qcmFilterCount');
    const scEl = document.getElementById('qcmSessionCount');
    if (fcEl) fcEl.textContent = filtered.length;
    if (scEl) scEl.textContent = Math.min(qcm.count, filtered.length);
}


function _qcmApplyPreset(preset) {
    qcm.preset = preset;
    qcm._speedMode = false;  // reset first, then activate only if speed
    if (preset === 'flash') { qcm.count = 10; qcm.mode = 'training'; }
    else if (preset === 'standard') { qcm.count = 20; qcm.mode = 'training'; }
    else if (preset === 'session') { qcm.count = 50; qcm.mode = 'training'; }
    else if (preset === 'speed') { qcm.count = 30; qcm.mode = 'training'; qcm._speedMode = true; }

    _qcmRenderSetup();
}


function _qcmFilteredQuestions() {
    return qcm.catalog.filter(q => {
        if (qcm.filters.modules.size && !qcm.filters.modules.has(q.module)) return false;
        if (qcm.filters.diffs.size && !qcm.filters.diffs.has(q.difficulty)) return false;
        if (qcm.filters.types.size && !qcm.filters.types.has(q.type)) return false;
        if (qcm.filters.norms.size && !qcm.filters.norms.has(q.norm_code)) return false;
        return true;
    });
}


function _qcmWeakCount() {
    const stats = qcm.tracking.stats || {};
    return Object.values(stats).filter(s => s.attempts >= 2 && s.accuracy < 50).length;
}


function _qcmRenderCoverage() {
    const el = document.getElementById('qcmCoverage');
    if (!el) return;
    el.innerHTML = qcm.summary.map(s => {
        const c = getModuleColor ? getModuleColor(s.module) : '#64748b';
        const cov = s.total ? Math.round(((qcm.tracking.counts && qcm.tracking.counts.total_questions_seen) || 0) / s.total * 100) : 0;
        return `<div class="qcm-cov-item" style="border-top:3px solid ${c}">
            <div class="qcm-cov-head">
                <span class="qcm-cov-code" style="color:${c}">${escapeHtml(s.module)}</span>
                <span class="qcm-cov-total">${s.total}</span>
            </div>
            <div class="qcm-cov-name">${escapeHtml(s.module_name || '')}</div>
            <div class="qcm-cov-breakdown">
                <span>${s.mcq} QCM · ${s.vrai_faux} V/F</span>
            </div>
            <div class="qcm-cov-diffs">
                <span style="color:#22c55e">${s.easy}</span>
                <span style="color:#eab308">${s.medium}</span>
                <span style="color:#ef4444">${s.hard}</span>
            </div>
        </div>`;
    }).join('');
}


// ══════════════════════════════════════════════════════════════
// START QUIZ
// ══════════════════════════════════════════════════════════════

async function _qcmStartQuiz() {
    const filtered = _qcmFilteredQuestions();
    if (!filtered.length) {
        alert('Aucune question ne correspond à tes filtres.');
        return;
    }
    const picked = _qcmPickQuestions(filtered, qcm.count, qcm.order);
    if (!picked.length) return;
    _qcmStartSession(picked, {
        mode: qcm.mode,
        speedMode: qcm._speedMode || false,
        shuffleOptions: qcm.shuffleOptions,
    });
    qcm._speedMode = false;  // Reset
}


async function _qcmStartSpecial(kind) {
    let ids = [];
    try {
        ids = await api('qcm_get_selection', kind, kind === 'due' ? 100 : 50);
    } catch (e) {
        alert('Erreur de chargement : ' + e);
        return;
    }
    const selected = qcm.catalog.filter(q => ids.includes(q.id));
    if (!selected.length) {
        alert('Aucune question à réviser pour cette sélection.');
        return;
    }
    _qcmStartSession(selected, {
        mode: 'training',
        specialSelection: kind,
        shuffleOptions: qcm.shuffleOptions,
    });
}


function _qcmStartExamBlanc() {
    // 100 questions pondérées : M8 x25 · M4 x25 · M3 x20 · M2 x15 · M7 x15
    const weights = { M8: 25, M4: 25, M3: 20, M2: 15, M7: 15 };
    const picked = [];
    for (const [mod, n] of Object.entries(weights)) {
        const pool = qcm.catalog.filter(q => q.module === mod);
        if (!pool.length) continue;
        const shuffled = _qcmShuffle([...pool]);
        picked.push(...shuffled.slice(0, n));
    }
    if (picked.length < 50) {
        alert('Pas assez de questions pour un examen blanc (min 50 exigées).');
        return;
    }
    const final = _qcmShuffle(picked);
    if (!confirm(`📝 Examen blanc : ${final.length} questions · 3h chrono · aucun feedback pendant l'épreuve. Démarrer ?`)) return;
    _qcmStartSession(final, {
        mode: 'exam_blind',
        shuffleOptions: true,
        timerSeconds: 180 * 60,  // 3h
        isExam: true,
    });
}


function _qcmPickQuestions(pool, count, order) {
    let selected = [];
    const capped = Math.min(count, pool.length);
    if (order === 'module') {
        const byMod = {};
        pool.forEach(q => { (byMod[q.module] = byMod[q.module] || []).push(q); });
        const mods = Object.keys(byMod).sort();
        const perMod = Math.ceil(capped / mods.length);
        mods.forEach(m => {
            selected.push(..._qcmShuffle(byMod[m]).slice(0, perMod));
        });
        selected = selected.slice(0, capped);
    } else {
        selected = _qcmShuffle([...pool]).slice(0, capped);
    }
    return selected;
}


function _qcmShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}


// ══════════════════════════════════════════════════════════════
// SESSION (quiz en cours)
// ══════════════════════════════════════════════════════════════

async function _qcmStartSession(questions, opts) {
    // Shuffle options per question if enabled
    const q2 = questions.map(q => {
        const clone = { ...q };
        if (opts.shuffleOptions && q.type === 'mcq' && Array.isArray(q.options)) {
            const indexed = q.options.map((opt, i) => ({ opt, i }));
            const shuffled = _qcmShuffle([...indexed]);
            clone.options = shuffled.map(s => s.opt);
            // New index of the correct answer:
            clone.answer = shuffled.findIndex(s => s.i === q.answer);
        }
        return clone;
    });

    // Create backend session
    let sessionId = null;
    try {
        sessionId = await api('qcm_create_session', opts.mode, {
            count: q2.length,
            filters: {
                modules: [...qcm.filters.modules],
                diffs: [...qcm.filters.diffs],
                types: [...qcm.filters.types],
                norms: [...qcm.filters.norms],
            },
            special: opts.specialSelection || null,
            exam: opts.isExam || false,
        });
    } catch (e) { console.warn('qcm_create_session failed:', e); }

    qcm.session = {
        id: sessionId,
        questions: q2,
        answers: new Array(q2.length).fill(null),  // {choice, correct, confidence, time_ms, flagged}
        currentIdx: 0,
        start: Date.now(),
        questionStart: Date.now(),
        mode: opts.mode,
        speedMode: opts.speedMode || false,
        isExam: opts.isExam || false,
        timerSeconds: opts.timerSeconds || null,
        skipped: new Set(),
    };

    _qcmRenderQuestion();
    _qcmSaveState();
}


function _qcmRenderQuestion() {
    const s = qcm.session;
    if (!s) return;
    qcm._view = 'quiz';

    const q = s.questions[s.currentIdx];
    const ans = s.answers[s.currentIdx];
    const total = s.questions.length;
    const correct = s.answers.filter(a => a && a.correct).length;
    const answered = s.answers.filter(a => a !== null).length;

    const bm = qcm.tracking.bookmarks[q.id] || {};
    const stats = qcm.tracking.stats[q.id];

    s.questionStart = Date.now();  // reset timer

    const timerHTML = s.timerSeconds ? `<div class="qcm-timer" id="qcmTimer">--:--:--</div>` : '';

    // For speed mode : 30s countdown per question
    const speedTimer = s.speedMode ? `<div class="qcm-speedbar"><div class="qcm-speedbar-fill" id="qcmSpeedBar" style="animation-duration:30s"></div></div>` : '';

    qcm._container.innerHTML = `
        <div class="qcm-quiz-head">
            <button class="qcm-abort" onclick="_qcmAbort()">← Quitter</button>
            <div class="qcm-progress">
                <span>${s.currentIdx + 1}/${total}</span>
                <div class="qcm-progressbar">
                    <div class="qcm-progressbar-fill" style="width:${(s.currentIdx + 1) / total * 100}%"></div>
                </div>
                ${s.mode !== 'exam_blind' ? `<span class="qcm-score-mini">✓ ${correct}/${answered}</span>` : ''}
            </div>
            ${timerHTML}
        </div>
        ${speedTimer}

        <div class="qcm-card ${s.mode === 'exam_blind' ? 'qcm-card-exam' : ''}">
            <div class="qcm-badges">
                <span class="qcm-badge qcm-badge-mod" style="background:${getModuleColor ? getModuleColor(q.module) + '22' : '#33415544'};color:${getModuleColor ? getModuleColor(q.module) : '#fff'}">${escapeHtml(q.module)}</span>
                <span class="qcm-badge qcm-badge-norm">${escapeHtml(q.norm_code)}</span>
                <span class="qcm-badge qcm-badge-diff qcm-diff-${q.difficulty}">${q.difficulty === 'easy' ? '🟢 facile' : q.difficulty === 'hard' ? '🔴 difficile' : '🟡 moyen'}</span>
                <span class="qcm-badge qcm-badge-type">${q.type === 'mcq' ? 'QCM' : 'V/F'}</span>
                ${stats ? `<span class="qcm-badge qcm-badge-stats" title="${stats.attempts}× vu · ${stats.accuracy}% réussite">📊 ${stats.accuracy}%</span>` : ''}
            </div>

            <div class="qcm-q-actions">
                <button class="qcm-q-action ${bm.starred ? 'active' : ''}" onclick="_qcmToggleBookmark('${escapeAttr(q.id)}')" title="Favori (B)">
                    ${bm.starred ? '⭐' : '☆'}
                </button>
                <button class="qcm-q-action ${bm.note ? 'active' : ''}" onclick="_qcmOpenNote('${escapeAttr(q.id)}')" title="Note (N)">
                    📝
                </button>
                <button class="qcm-q-action" onclick="_qcmSkip()" title="Reporter (S)">
                    🔖
                </button>
                ${q.norm_code ? `<button class="qcm-q-action" onclick="_qcmGoToNorm('${escapeAttr(q.module)}')" title="Voir la norme">📖</button>` : ''}
                ${q.lesson_id ? `<button class="qcm-q-action" onclick="_qcmGoToLesson('${escapeAttr(q.module)}','${escapeAttr(q.lesson_id)}','${escapeAttr(q.section_id || '')}')" title="Voir la leçon liée">📖 Voir la leçon</button>` : ''}
            </div>

            <div class="qcm-question">${formatAnswer(q.question)}</div>

            <div class="qcm-options" id="qcmOptions"></div>

            <div class="qcm-confidence ${ans ? 'qcm-hide' : ''}" id="qcmConfidence">
                <span class="qcm-conf-lbl">Ton niveau de confiance :</span>
                <button class="qcm-conf-btn" data-conf="sure" onclick="_qcmSetConfidence('sure')" title="Je suis sûr (C)">
                    💪 Je suis sûr
                </button>
                <button class="qcm-conf-btn" data-conf="guess" onclick="_qcmSetConfidence('guess')" title="Je devine (G)">
                    🎲 Je devine
                </button>
            </div>

            <div class="qcm-feedback ${ans ? '' : 'qcm-hide'}" id="qcmFeedback"></div>

            <div class="qcm-nav">
                <button class="qcm-nav-btn qcm-nav-prev" onclick="_qcmPrev()" ${s.currentIdx === 0 ? 'disabled' : ''}>← Précédente</button>
                <button class="qcm-nav-btn qcm-nav-next" onclick="_qcmNext()" ${!ans && s.mode !== 'exam_blind' ? 'disabled' : ''}>Suivante →</button>
                <button class="qcm-nav-btn qcm-nav-finish" onclick="_qcmFinish()">🏁 Terminer</button>
            </div>
        </div>
    `;

    _qcmRenderOptions();
    if (s.timerSeconds) _qcmStartTimer();
    if (s.speedMode && !ans) _qcmStartSpeedTimer();
}


function _qcmRenderOptions() {
    const s = qcm.session;
    const q = s.questions[s.currentIdx];
    const ans = s.answers[s.currentIdx];
    const el = document.getElementById('qcmOptions');
    if (!el) return;

    if (q.type === 'mcq') {
        el.innerHTML = (q.options || []).map((opt, i) => {
            let cls = 'qcm-opt';
            if (ans) {
                if (i === q.answer) cls += ' qcm-opt-correct';
                if (i === ans.choice && i !== q.answer) cls += ' qcm-opt-wrong';
                if (i === ans.choice) cls += ' qcm-opt-selected';
            }
            const kbd = String.fromCharCode(65 + i);
            return `<button class="${cls}" data-i="${i}" onclick="_qcmAnswer(${i})" ${ans ? 'disabled' : ''}>
                <span class="qcm-opt-kbd">${kbd}</span>
                <span class="qcm-opt-text">${formatAnswer(opt)}</span>
            </button>`;
        }).join('');
    } else {
        // vrai_faux
        el.innerHTML = [true, false].map(v => {
            let cls = 'qcm-opt qcm-opt-vf';
            if (ans) {
                if (v === q.answer) cls += ' qcm-opt-correct';
                if (v === ans.choice && v !== q.answer) cls += ' qcm-opt-wrong';
                if (v === ans.choice) cls += ' qcm-opt-selected';
            }
            return `<button class="${cls}" onclick="_qcmAnswer(${v})" ${ans ? 'disabled' : ''}>
                <span class="qcm-opt-kbd">${v ? 'V' : 'F'}</span>
                <span class="qcm-opt-text">${v ? '✓ Vrai' : '✗ Faux'}</span>
            </button>`;
        }).join('');
    }
}


async function _qcmAnswer(choice) {
    const s = qcm.session;
    if (!s) return;
    const q = s.questions[s.currentIdx];
    if (s.answers[s.currentIdx]) return;  // already answered

    const timeMs = Date.now() - s.questionStart;
    const correct = choice === q.answer;

    s.answers[s.currentIdx] = {
        choice, correct,
        confidence: s._pendingConfidence || null,
        time_ms: timeMs,
        flagged: s.skipped.has(s.currentIdx),
    };
    s._pendingConfidence = null;

    // Persist attempt to backend (for training modes; exam_blind saves at finish)
    if (s.mode !== 'exam_blind') {
        try {
            await api('qcm_record_attempt', q.id, correct, String(choice),
                s.answers[s.currentIdx].confidence, timeMs,
                s.id, q.module, q.norm_code);
        } catch (e) { console.warn('qcm_record_attempt failed:', e); }
    }

    // Update tracking for display
    const prev = qcm.tracking.stats[q.id] || { attempts: 0, correct: 0 };
    qcm.tracking.stats[q.id] = {
        ...prev,
        attempts: prev.attempts + 1,
        correct: prev.correct + (correct ? 1 : 0),
        accuracy: Math.round((prev.correct + (correct ? 1 : 0)) / (prev.attempts + 1) * 100),
    };

    if (s.mode !== 'exam_blind') {
        _qcmShowFeedback();
    } else {
        // Exam mode : auto-next after short delay
        setTimeout(() => _qcmNext(), 400);
    }
    _qcmRenderOptions();  // refresh visuals
    _qcmSaveState();
}


function _qcmSetConfidence(c) {
    const s = qcm.session;
    if (!s) return;
    s._pendingConfidence = c;
    const el = document.getElementById('qcmConfidence');
    if (el) {
        el.querySelectorAll('.qcm-conf-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.conf === c);
        });
    }
}


function _qcmShowFeedback() {
    const s = qcm.session;
    const q = s.questions[s.currentIdx];
    const ans = s.answers[s.currentIdx];
    if (!ans) return;

    // Hide confidence
    const confEl = document.getElementById('qcmConfidence');
    if (confEl) confEl.classList.add('qcm-hide');

    // Show explanation
    const fbEl = document.getElementById('qcmFeedback');
    if (fbEl) {
        fbEl.classList.remove('qcm-hide');
        const emoji = ans.correct ? '✅' : '❌';
        const title = ans.correct ? 'Bonne réponse !' : 'Mauvaise réponse';
        const confLabel = ans.confidence === 'sure' ? ' · confiance : sûr'
            : ans.confidence === 'guess' ? ' · confiance : deviné' : '';
        const signal = ans.correct && ans.confidence === 'guess' ? ' ⚠️ À consolider (tu as deviné juste)'
            : !ans.correct && ans.confidence === 'sure' ? ' 🚨 Conception erronée (tu étais sûr)' : '';
        fbEl.innerHTML = `
            <div class="qcm-fb-head ${ans.correct ? 'qcm-fb-ok' : 'qcm-fb-ko'}">
                ${emoji} ${title}<span style="font-size:12px;color:var(--text-muted);font-weight:500">${confLabel}${signal}</span>
            </div>
            ${q.explanation ? `<div class="qcm-explanation">${formatAnswer(q.explanation)}</div>` : ''}
        `;
    }

    // Enable next
    const nextBtn = document.querySelector('.qcm-nav-next');
    if (nextBtn) nextBtn.disabled = false;
}


function _qcmNext() {
    const s = qcm.session;
    if (!s) return;
    if (s.currentIdx < s.questions.length - 1) {
        s.currentIdx++;
        _qcmRenderQuestion();
        _qcmSaveState();
    } else if (s.skipped.size > 0) {
        // Go back to first skipped
        const skippedIdx = Math.min(...s.skipped);
        s.currentIdx = skippedIdx;
        s.skipped.delete(skippedIdx);
        _qcmRenderQuestion();
        _qcmSaveState();
    } else {
        _qcmFinish();
    }
}


function _qcmPrev() {
    const s = qcm.session;
    if (!s || s.currentIdx === 0) return;
    s.currentIdx--;
    _qcmRenderQuestion();
    _qcmSaveState();
}


function _qcmSkip() {
    const s = qcm.session;
    if (!s) return;
    s.skipped.add(s.currentIdx);
    _qcmNext();
}


async function _qcmFinish() {
    const s = qcm.session;
    if (!s) return;
    const unanswered = s.answers.filter(a => a === null).length;
    if (unanswered > 0 && !confirm(`${unanswered} question(s) non répondue(s). Terminer quand même ?`)) return;

    _qcmStopTimer();

    // Exam mode : batch-save all attempts now
    if (s.mode === 'exam_blind') {
        for (let i = 0; i < s.questions.length; i++) {
            const a = s.answers[i];
            if (!a) continue;
            const q = s.questions[i];
            try {
                await api('qcm_record_attempt', q.id, a.correct, String(a.choice),
                    a.confidence, a.time_ms, s.id, q.module, q.norm_code);
            } catch (e) { /* ignore */ }
        }
    }

    const total = s.questions.length;
    const correct = s.answers.filter(a => a && a.correct).length;
    const duration = Math.round((Date.now() - s.start) / 1000);

    try {
        await api('qcm_complete_session', s.id, total, correct, duration, false);
    } catch (e) { console.warn(e); }

    // Reload tracking
    try {
        const t = await api('get_qcm_tracking_data');
        if (t) qcm.tracking = t;
    } catch (e) { /* ignore */ }

    _qcmClearState();
    _qcmRenderResult();
}


async function _qcmAbort() {
    const s = qcm.session;
    if (!s) { _qcmRenderSetup(); return; }
    if (!confirm('Quitter la session ? Ta progression sera sauvegardée.')) return;
    _qcmStopTimer();
    const total = s.questions.length;
    const correct = s.answers.filter(a => a && a.correct).length;
    const duration = Math.round((Date.now() - s.start) / 1000);
    try {
        await api('qcm_complete_session', s.id, total, correct, duration, true);
    } catch (e) { /* ignore */ }
    qcm.session = null;
    try {
        const t = await api('get_qcm_tracking_data');
        if (t) qcm.tracking = t;
    } catch (e) { /* ignore */ }
    _qcmClearState();
    _qcmRenderSetup();
}


// ══════════════════════════════════════════════════════════════
// TIMER (mode examen)
// ══════════════════════════════════════════════════════════════

function _qcmStartTimer() {
    const s = qcm.session;
    if (!s || !s.timerSeconds) return;
    const endTime = s.start + s.timerSeconds * 1000;

    _qcmStopTimer();
    qcm._timerInterval = setInterval(() => {
        const remaining = Math.max(0, endTime - Date.now());
        const sec = Math.floor(remaining / 1000);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const sc = sec % 60;
        const el = document.getElementById('qcmTimer');
        if (el) {
            el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`;
            if (sec <= 300) el.style.color = '#ef4444';  // red last 5 min
            else if (sec <= 900) el.style.color = '#f59e0b';  // orange last 15 min
        }
        if (remaining === 0) {
            _qcmStopTimer();
            alert('⏰ Temps écoulé !');
            _qcmFinish();
        }
    }, 1000);
}


function _qcmStopTimer() {
    if (qcm._timerInterval) {
        clearInterval(qcm._timerInterval);
        qcm._timerInterval = null;
    }
}


function _qcmStartSpeedTimer() {
    const el = document.getElementById('qcmSpeedBar');
    if (!el) return;
    // Auto-advance after 30s if no answer
    _qcmStopSpeedTimer();
    qcm._speedTimeout = setTimeout(() => {
        const s = qcm.session;
        if (s && !s.answers[s.currentIdx]) {
            // Record as wrong with "no answer"
            s.answers[s.currentIdx] = {
                choice: null, correct: false, confidence: null,
                time_ms: 30000, flagged: false,
            };
            _qcmNext();
        }
    }, 30000);
}


function _qcmStopSpeedTimer() {
    if (qcm._speedTimeout) {
        clearTimeout(qcm._speedTimeout);
        qcm._speedTimeout = null;
    }
}


// ══════════════════════════════════════════════════════════════
// BOOKMARK + NOTES
// ══════════════════════════════════════════════════════════════

async function _qcmToggleBookmark(qid) {
    try {
        const starred = await api('qcm_toggle_bookmark', qid);
        qcm.tracking.bookmarks[qid] = {
            ...(qcm.tracking.bookmarks[qid] || {}),
            starred,
        };
        _qcmRenderQuestion();
    } catch (e) { console.warn(e); }
}


function _qcmOpenNote(qid) {
    const bm = qcm.tracking.bookmarks[qid] || {};
    const existing = bm.note || '';
    const updated = prompt('Ta note pour cette question :\n(vide pour supprimer)', existing);
    if (updated === null) return;
    api('qcm_set_note', qid, updated).then(() => {
        qcm.tracking.bookmarks[qid] = {
            ...(qcm.tracking.bookmarks[qid] || {}),
            note: updated,
        };
        _qcmRenderQuestion();
    });
}


function _qcmGoToNorm(moduleCode) {
    if (typeof navigate === 'function') {
        try { if (typeof modSelectedId !== 'undefined') modSelectedId = moduleCode; } catch (_) {}
        navigate('modules');
    }
}

// Deep-link vers la leçon parent du QCM (ancre = section_id quand fourni).
// Persiste l'état QCM courant pour permettre la reprise via la bannière.
function _qcmGoToLesson(moduleCode, lessonId, sectionId) {
    try { _qcmSaveState(); } catch (_) {}
    if (typeof window.modOpenLessonAt === 'function') {
        window.modOpenLessonAt(moduleCode, lessonId, sectionId || null);
    } else if (typeof navigate === 'function') {
        // Fallback : bascule sur l'onglet sans ancre.
        navigate('modules');
    }
}


// ══════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ══════════════════════════════════════════════════════════════

function _qcmBindKeys() {
    if (qcm._keysBound) return;
    qcm._keysBound = true;
    document.addEventListener('keydown', (e) => {
        if (qcm._view !== 'quiz') return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const s = qcm.session;
        if (!s) return;
        const q = s.questions[s.currentIdx];
        const ans = s.answers[s.currentIdx];

        // Options 1-4 for MCQ
        if (!ans && q.type === 'mcq' && /^[1-4]$/.test(e.key)) {
            const i = parseInt(e.key, 10) - 1;
            if (i < q.options.length) _qcmAnswer(i);
            e.preventDefault();
        }
        // V/F
        if (!ans && q.type === 'vrai_faux') {
            if (e.key === 'v' || e.key === 'V') { _qcmAnswer(true); e.preventDefault(); }
            if (e.key === 'f' || e.key === 'F') { _qcmAnswer(false); e.preventDefault(); }
        }
        // Enter = next
        if (e.key === 'Enter') {
            if (ans) _qcmNext();
            e.preventDefault();
        }
        // B = bookmark
        if (e.key === 'b' || e.key === 'B') {
            _qcmToggleBookmark(q.id);
            e.preventDefault();
        }
        // N = note
        if (e.key === 'n' || e.key === 'N') {
            _qcmOpenNote(q.id);
            e.preventDefault();
        }
        // S = skip
        if (e.key === 's' || e.key === 'S') {
            _qcmSkip();
            e.preventDefault();
        }
        // C = confidence sure, G = guess
        if (!ans && (e.key === 'c' || e.key === 'C')) { _qcmSetConfidence('sure'); e.preventDefault(); }
        if (!ans && (e.key === 'g' || e.key === 'G')) { _qcmSetConfidence('guess'); e.preventDefault(); }
        // Left/Right arrows
        if (e.key === 'ArrowLeft') { _qcmPrev(); e.preventDefault(); }
        if (e.key === 'ArrowRight') { _qcmNext(); e.preventDefault(); }
        // Escape = abort
        if (e.key === 'Escape') { _qcmAbort(); e.preventDefault(); }
    });
}


// ══════════════════════════════════════════════════════════════
// RESULTAT (fin de session)
// ══════════════════════════════════════════════════════════════

async function _qcmRenderResult() {
    qcm._view = 'result';
    const s = qcm.session;
    if (!s) { _qcmRenderSetup(); return; }

    const total = s.questions.length;
    const correct = s.answers.filter(a => a && a.correct).length;
    const incorrect = s.answers.filter(a => a && !a.correct).length;
    const unanswered = total - correct - incorrect;
    const pct = total ? Math.round(correct / total * 100) : 0;
    const pctColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444';
    const grade = pct >= 90 ? '🏆 Excellent' : pct >= 80 ? '⭐ Très bien' : pct >= 60 ? '👍 Correct' : pct >= 40 ? '⚠ À travailler' : '❌ Révisions nécessaires';
    const duration = Math.round((Date.now() - s.start) / 1000);
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const avgTime = total ? Math.round(duration / total) : 0;

    // Per module
    const byModule = {};
    s.questions.forEach((q, i) => {
        const a = s.answers[i];
        const m = q.module;
        if (!byModule[m]) byModule[m] = { total: 0, correct: 0, name: q.module_name };
        byModule[m].total++;
        if (a && a.correct) byModule[m].correct++;
    });

    // Confidence quadrants
    const quad = { sure_ok: 0, sure_ko: 0, guess_ok: 0, guess_ko: 0, none_ok: 0, none_ko: 0 };
    s.answers.forEach(a => {
        if (!a) return;
        const k = (a.confidence || 'none') + (a.correct ? '_ok' : '_ko');
        quad[k] = (quad[k] || 0) + 1;
    });

    // Predicted score (if exam)
    let predicted = null;
    try { predicted = await api('qcm_get_predicted_exam_score'); } catch (e) {}

    qcm._container.innerHTML = `
        <div class="qcm-result-hero">
            <div class="qcm-result-grade">${grade}</div>
            <div class="qcm-result-score" style="color:${pctColor}">${correct}<span class="qcm-result-total">/ ${total}</span></div>
            <div class="qcm-result-pct" style="color:${pctColor}">${pct}%</div>
            <div class="qcm-result-meta">
                Durée : ${mins}m ${secs}s · Moyenne : ${avgTime}s/Q
                ${s.isExam ? ' · 📝 Examen blanc' : ''}
            </div>
        </div>

        <div class="qcm-result-cards">
            <div class="qcm-result-card">
                <div class="qcm-result-card-val" style="color:#22c55e">${correct}</div>
                <div class="qcm-result-card-lbl">Correctes</div>
            </div>
            <div class="qcm-result-card">
                <div class="qcm-result-card-val" style="color:#ef4444">${incorrect}</div>
                <div class="qcm-result-card-lbl">Incorrectes</div>
            </div>
            ${unanswered ? `<div class="qcm-result-card">
                <div class="qcm-result-card-val" style="color:#64748b">${unanswered}</div>
                <div class="qcm-result-card-lbl">Non répondues</div>
            </div>` : ''}
            ${predicted && predicted.predicted !== null ? `<div class="qcm-result-card">
                <div class="qcm-result-card-val" style="color:#8b5cf6">${predicted.predicted}<span style="font-size:14px;color:#64748b">%</span></div>
                <div class="qcm-result-card-lbl">Score examen prédit (±${predicted.confidence}%)</div>
            </div>` : ''}
        </div>

        <div class="qcm-section-title">📊 Performance par module</div>
        <div class="qcm-result-modules">
            ${Object.entries(byModule).map(([m, v]) => {
                const p = Math.round(v.correct / v.total * 100);
                const c = getModuleColor ? getModuleColor(m) : '#64748b';
                return `<div class="qcm-result-mod">
                    <div class="qcm-result-mod-head">
                        <span style="color:${c};font-weight:800">${escapeHtml(m)}</span>
                        <span style="color:var(--text-bright);font-weight:700">${v.correct}/${v.total} (${p}%)</span>
                    </div>
                    <div class="qcm-result-mod-bar">
                        <div class="qcm-result-mod-fill" style="width:${p}%;background:${c}"></div>
                    </div>
                </div>`;
            }).join('')}
        </div>

        ${Object.values(quad).some(v => v > 0) ? `
        <div class="qcm-section-title">🧠 Quadrants de confiance</div>
        <div class="qcm-quad-grid">
            <div class="qcm-quad qcm-quad-ok">
                <div class="qcm-quad-val">${quad.sure_ok || 0}</div>
                <div class="qcm-quad-lbl">💪✓ Sûr + juste<br><small>Maîtrisé</small></div>
            </div>
            <div class="qcm-quad qcm-quad-warn">
                <div class="qcm-quad-val">${quad.guess_ok || 0}</div>
                <div class="qcm-quad-lbl">🎲✓ Deviné + juste<br><small>À consolider</small></div>
            </div>
            <div class="qcm-quad qcm-quad-info">
                <div class="qcm-quad-val">${quad.guess_ko || 0}</div>
                <div class="qcm-quad-lbl">🎲✗ Deviné + faux<br><small>Apprendre</small></div>
            </div>
            <div class="qcm-quad qcm-quad-alert">
                <div class="qcm-quad-val">${quad.sure_ko || 0}</div>
                <div class="qcm-quad-lbl">💪✗ Sûr + faux<br><small>🚨 Priorité absolue</small></div>
            </div>
        </div>
        ` : ''}

        <div class="qcm-section-title">Détail des questions</div>
        <div class="qcm-result-list">
            ${s.questions.map((q, i) => {
                const a = s.answers[i];
                if (!a) return `<div class="qcm-result-item qcm-result-skip">
                    <span>Q${i+1}</span> <span>Non répondue</span>
                    <span style="color:#64748b">—</span>
                </div>`;
                const icon = a.correct ? '✅' : '❌';
                return `<div class="qcm-result-item ${a.correct ? 'qcm-result-ok' : 'qcm-result-ko'}" onclick="_qcmReviewQuestion(${i})">
                    <span class="qcm-ri-icon">${icon}</span>
                    <span class="qcm-ri-num">Q${i+1}</span>
                    <span class="qcm-ri-mod" style="color:${getModuleColor ? getModuleColor(q.module) : '#64748b'}">${escapeHtml(q.module)}</span>
                    <span class="qcm-ri-text">${escapeHtml(q.question.substring(0, 100))}${q.question.length > 100 ? '…' : ''}</span>
                    <span class="qcm-ri-time">${a.time_ms ? Math.round(a.time_ms / 1000) + 's' : '—'}</span>
                </div>`;
            }).join('')}
        </div>

        <div class="qcm-result-actions">
            <button class="qcm-btn-start" onclick="_qcmRenderSetup()">↺ Nouvelle session</button>
            <button class="qcm-btn-secondary" onclick="_qcmStartSpecial('weak')">🎯 Réviser mes points faibles</button>
            <button class="qcm-btn-secondary" onclick="_qcmShowHistory()">🕐 Historique</button>
        </div>
    `;
}


function _qcmReviewQuestion(idx) {
    const s = qcm.session;
    if (!s) return;
    s.currentIdx = idx;
    qcm._view = 'quiz';
    _qcmRenderQuestion();
    // Force show answer for review
    const a = s.answers[idx];
    if (a) {
        _qcmShowFeedback();
    }
}


// ══════════════════════════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════════════════════════

async function _qcmShowHistory() {
    qcm._view = 'history';
    let history = [];
    try { history = await api('qcm_get_sessions_history', 30); } catch (e) {}
    let mastery = [];
    try { mastery = await api('qcm_get_topic_mastery'); } catch (e) {}

    qcm._container.innerHTML = `
        <button class="qcm-btn-secondary" onclick="_qcmRenderSetup()" style="margin-bottom:20px">← Retour</button>
        <div class="page-title">🕐 Historique QCM</div>

        ${mastery.length ? `
            <div class="qcm-section-title">Maîtrise par module</div>
            <div class="qcm-mastery-grid">
                ${mastery.map(m => {
                    const c = getModuleColor ? getModuleColor(m.module) : '#64748b';
                    const col = m.accuracy >= 80 ? '#22c55e' : m.accuracy >= 60 ? '#eab308' : '#ef4444';
                    return `<div class="qcm-mastery-card" style="border-top-color:${c}">
                        <div class="qcm-mastery-head">
                            <span style="color:${c};font-weight:800">${escapeHtml(m.module)}</span>
                            <span style="color:${col};font-weight:800;font-size:18px">${m.accuracy}%</span>
                        </div>
                        <div class="qcm-mastery-stats">
                            ${m.correct}/${m.attempts} bonnes réponses · ${m.questions_seen} questions vues
                        </div>
                        <div class="qcm-mastery-bar">
                            <div class="qcm-mastery-fill" style="width:${m.accuracy}%;background:${col}"></div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        ` : ''}

        <div class="qcm-section-title">Sessions passées (${history.length})</div>
        <div class="qcm-history-list">
            ${history.length ? history.map(h => {
                const d = new Date(h.started_at);
                const mins = h.duration_s ? Math.floor(h.duration_s / 60) : 0;
                const secs = h.duration_s ? h.duration_s % 60 : 0;
                const col = h.accuracy >= 80 ? '#22c55e' : h.accuracy >= 60 ? '#eab308' : '#ef4444';
                const modeIcon = h.mode === 'exam_blind' ? '📝' : h.mode === 'training' ? '📖' : '🎯';
                return `<div class="qcm-history-item ${h.aborted ? 'qcm-hist-aborted' : ''}">
                    <div class="qcm-hist-date">${d.toLocaleDateString('fr-CH')} ${d.toLocaleTimeString('fr-CH', {hour:'2-digit',minute:'2-digit'})}</div>
                    <div class="qcm-hist-mode">${modeIcon} ${h.mode}${h.aborted ? ' (interrompue)' : ''}</div>
                    <div class="qcm-hist-score" style="color:${col}">${h.correct}/${h.total} (${h.accuracy}%)</div>
                    <div class="qcm-hist-dur">${mins}m ${secs}s</div>
                </div>`;
            }).join('') : '<div class="qcm-empty">Aucune session enregistrée.</div>'}
        </div>
    `;
}


// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

function _qcmInjectStyles() {
    if (document.getElementById('qcmStyles')) return;
    const style = document.createElement('style');
    style.id = 'qcmStyles';
    style.textContent = `

    /* ── Hero ── */
    .qcm-hero {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;
        margin: 16px 0 24px;
    }
    .qcm-hero-stat {
        background: var(--bg-secondary); border: 1px solid var(--border);
        border-radius: 10px; padding: 14px; text-align: center;
        transition: border-color .15s;
    }
    .qcm-hero-stat.qcm-hero-active { border-color: #fbbf24; background: rgba(251, 191, 36, 0.08); }
    .qcm-hero-val { font-size: 28px; font-weight: 800; line-height: 1; }
    .qcm-hero-lbl { font-size: 11px; color: var(--text-muted); margin-top: 6px; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ── Section titles ── */
    .qcm-section-title {
        font-size: 13px; font-weight: 700; color: var(--text-bright);
        margin: 24px 0 12px; text-transform: uppercase; letter-spacing: 1.5px;
    }

    /* ── Special sessions ── */
    .qcm-special-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .qcm-special {
        background: var(--bg-secondary); border: 1px solid var(--border);
        border-radius: 10px; padding: 14px 16px; cursor: pointer; text-align: left;
        color: var(--text-primary); transition: all .15s;
    }
    .qcm-special:hover:not(:disabled) { border-color: #3b82f6; transform: translateY(-2px); }
    .qcm-special:disabled { opacity: .4; cursor: not-allowed; }
    .qcm-special.qcm-disabled { opacity: .4; cursor: not-allowed; }
    .qcm-special-title { font-size: 14px; font-weight: 700; color: var(--text-bright); margin-bottom: 4px; }
    .qcm-special-desc { font-size: 12px; color: var(--text-secondary); }
    .qcm-special-due { border-left: 3px solid #f59e0b; }
    .qcm-special-weak { border-left: 3px solid #ef4444; }
    .qcm-special-star { border-left: 3px solid #fbbf24; }
    .qcm-special-wrong { border-left: 3px solid #f97316; }
    .qcm-special-exam { border-left: 3px solid #8b5cf6; background: linear-gradient(90deg, rgba(139, 92, 246, 0.08), transparent); }
    .qcm-special-hist { border-left: 3px solid #64748b; }

    /* ── Presets ── */
    .qcm-presets { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 20px; }
    .qcm-preset {
        background: var(--bg-secondary); border: 1px solid var(--border);
        border-radius: 10px; padding: 16px; cursor: pointer; text-align: center;
        color: var(--text-primary); transition: all .15s;
    }
    .qcm-preset:hover { border-color: #3b82f6; }
    .qcm-preset-active { border-color: #3b82f6; background: rgba(59, 130, 246, 0.08); }
    .qcm-preset-icon { font-size: 24px; margin-bottom: 4px; }
    .qcm-preset-title { font-weight: 700; color: var(--text-bright); }
    .qcm-preset-desc { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    /* ── Filters / config ── */
    .qcm-filters, .qcm-config { display: grid; gap: 14px; margin-bottom: 16px; }
    .qcm-filter-group, .qcm-config-group {
        background: var(--bg-secondary); border: 1px solid var(--border);
        border-radius: 10px; padding: 12px 14px;
    }
    .qcm-filter-lbl { font-size: 11px; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .qcm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .qcm-chips-scroll { max-height: 120px; overflow-y: auto; }
    .qcm-chip {
        background: var(--bg-tertiary); border: 1px solid var(--border);
        color: var(--text-primary); padding: 5px 10px; border-radius: 6px;
        font-size: 12px; cursor: pointer; transition: all .1s;
    }
    .qcm-chip:hover { border-color: #3b82f6; }
    .qcm-chip.active { background: #1e3a8a; color: #dbeafe; border-color: #3b82f6; }
    .qcm-chip-count { opacity: .7; font-size: 10px; margin-left: 4px; }
    .qcm-chip-clear { background: transparent; opacity: .6; }

    /* ── Action row ── */
    .qcm-action-row {
        display: flex; justify-content: space-between; align-items: center;
        margin: 20px 0; padding: 16px; background: var(--bg-secondary);
        border: 1px solid var(--border); border-radius: 10px;
    }
    .qcm-btn-start {
        background: #1e40af; color: #dbeafe; border: 1px solid #3b82f6;
        padding: 12px 28px; border-radius: 8px; font-size: 15px;
        font-weight: 700; cursor: pointer; transition: all .15s;
    }
    .qcm-btn-start:hover { background: #2563eb; transform: translateY(-1px); }
    .qcm-btn-secondary {
        background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border);
        padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .qcm-btn-secondary:hover { border-color: #3b82f6; }

    /* ── Coverage ── */
    .qcm-coverage { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }
    .qcm-cov-item {
        background: var(--bg-secondary); border: 1px solid var(--border);
        border-radius: 8px; padding: 10px 12px;
    }
    .qcm-cov-head { display: flex; justify-content: space-between; align-items: baseline; }
    .qcm-cov-code { font-size: 14px; font-weight: 800; }
    .qcm-cov-total { font-size: 13px; font-weight: 700; color: var(--text-bright); }
    .qcm-cov-name { font-size: 11px; color: var(--text-secondary); margin: 4px 0; }
    .qcm-cov-breakdown { font-size: 10px; color: var(--text-muted); }
    .qcm-cov-diffs { font-size: 11px; display: flex; gap: 8px; margin-top: 4px; }

    /* ── Quiz ── */
    .qcm-quiz-head {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 16px; background: var(--bg-secondary);
        border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 10;
    }
    .qcm-abort {
        background: transparent; border: 1px solid var(--border); color: var(--text-muted);
        padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;
    }
    .qcm-progress { display: flex; align-items: center; gap: 12px; flex: 1; margin: 0 20px; }
    .qcm-progress > span:first-child { font-size: 14px; font-weight: 700; color: var(--text-bright); min-width: 60px; }
    .qcm-progressbar { flex: 1; height: 6px; background: #0f172a; border-radius: 3px; overflow: hidden; }
    .qcm-progressbar-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); transition: width .3s; }
    .qcm-score-mini { font-size: 13px; color: var(--text-secondary); min-width: 80px; text-align: right; }
    .qcm-timer {
        font-family: 'Courier New', monospace; font-size: 18px; font-weight: 800;
        color: var(--text-bright); padding: 4px 10px; background: var(--bg-tertiary);
        border-radius: 6px; letter-spacing: 1px;
    }
    .qcm-speedbar { height: 3px; background: #0f172a; overflow: hidden; }
    .qcm-speedbar-fill {
        height: 100%; background: linear-gradient(90deg, #22c55e, #eab308, #ef4444);
        animation: qcm-speed-shrink linear forwards;
    }
    @keyframes qcm-speed-shrink { from { width: 100%; } to { width: 0%; } }

    .qcm-card {
        max-width: 820px; margin: 20px auto; background: var(--bg-secondary);
        border: 1px solid var(--border); border-radius: 12px; padding: 24px;
    }
    .qcm-card-exam { border-color: #8b5cf6; background: linear-gradient(135deg, rgba(139, 92, 246, 0.03), var(--bg-secondary)); }

    .qcm-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
    .qcm-badge {
        font-size: 11px; padding: 3px 8px; border-radius: 10px;
        font-weight: 700; letter-spacing: 0.5px;
    }
    .qcm-badge-mod { color: var(--text-bright); }
    .qcm-badge-norm { background: var(--bg-tertiary); color: var(--text-primary); }
    .qcm-badge-diff { background: var(--bg-tertiary); }
    .qcm-diff-easy { color: #22c55e; }
    .qcm-diff-medium { color: #eab308; }
    .qcm-diff-hard { color: #ef4444; }
    .qcm-badge-type { background: var(--bg-tertiary); color: var(--text-secondary); }
    .qcm-badge-stats { background: rgba(59, 130, 246, 0.1); color: #93c5fd; }

    .qcm-q-actions {
        display: flex; gap: 6px; float: right; margin-top: -30px;
    }
    .qcm-q-action {
        width: 32px; height: 32px; background: var(--bg-tertiary); border: 1px solid var(--border);
        border-radius: 6px; cursor: pointer; font-size: 14px;
        display: flex; align-items: center; justify-content: center;
        color: var(--text-muted); transition: all .15s;
    }
    .qcm-q-action:hover { color: var(--text-bright); border-color: #3b82f6; }
    .qcm-q-action.active { color: #fbbf24; border-color: #fbbf24; }

    .qcm-question { font-size: 16px; color: var(--text-bright); line-height: 1.5; margin: 20px 0; font-weight: 500; }
    .qcm-options { display: flex; flex-direction: column; gap: 10px; margin: 20px 0; }
    .qcm-opt {
        background: var(--bg-tertiary); border: 2px solid var(--border);
        color: var(--text-primary); padding: 14px 18px; border-radius: 8px;
        cursor: pointer; text-align: left; display: flex; gap: 12px; align-items: center;
        font-size: 14px; line-height: 1.5; transition: all .15s;
    }
    .qcm-opt:hover:not(:disabled) { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); }
    .qcm-opt:disabled { cursor: default; }
    .qcm-opt-kbd {
        background: var(--bg-secondary); color: var(--text-secondary); font-weight: 800;
        padding: 4px 10px; border-radius: 4px; font-size: 13px;
        font-family: monospace; min-width: 32px; text-align: center;
    }
    .qcm-opt-correct { border-color: #22c55e; background: rgba(34, 197, 94, 0.1); }
    .qcm-opt-correct .qcm-opt-kbd { background: #22c55e; color: #fff; }
    .qcm-opt-wrong { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }
    .qcm-opt-wrong .qcm-opt-kbd { background: #ef4444; color: #fff; }
    .qcm-opt-selected { font-weight: 600; }
    .qcm-opt-vf { font-size: 16px; }

    .qcm-confidence {
        display: flex; align-items: center; gap: 8px; margin-top: 16px;
        padding: 10px 14px; background: rgba(139, 92, 246, 0.06);
        border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 8px;
    }
    .qcm-conf-lbl { font-size: 12px; color: var(--text-secondary); font-weight: 600; }
    .qcm-conf-btn {
        background: var(--bg-tertiary); border: 1px solid var(--border);
        color: var(--text-primary); padding: 6px 12px; border-radius: 6px;
        font-size: 12px; cursor: pointer;
    }
    .qcm-conf-btn:hover { border-color: #8b5cf6; }
    .qcm-conf-btn.active { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; border-color: #8b5cf6; }

    .qcm-hide { display: none !important; }

    .qcm-feedback { margin-top: 20px; padding: 16px; border-radius: 8px; }
    .qcm-fb-head { font-size: 15px; font-weight: 700; margin-bottom: 12px; }
    .qcm-fb-ok { color: #22c55e; }
    .qcm-fb-ko { color: #ef4444; }
    .qcm-explanation { font-size: 13px; line-height: 1.6; color: var(--text-primary); }

    .qcm-nav { display: flex; justify-content: space-between; gap: 10px; margin-top: 24px; }
    .qcm-nav-btn {
        background: var(--bg-tertiary); border: 1px solid var(--border);
        color: var(--text-primary); padding: 10px 18px; border-radius: 6px;
        font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .qcm-nav-btn:hover:not(:disabled) { border-color: #3b82f6; }
    .qcm-nav-btn:disabled { opacity: .4; cursor: not-allowed; }
    .qcm-nav-next { background: #1e40af; color: #dbeafe; border-color: #3b82f6; }
    .qcm-nav-finish { background: #064e3b; color: #6ee7b7; border-color: #10b981; }

    /* ── Result ── */
    .qcm-result-hero {
        text-align: center; padding: 40px 20px;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.05));
        border: 1px solid var(--border); border-radius: 14px; margin-bottom: 24px;
    }
    .qcm-result-grade { font-size: 24px; font-weight: 700; color: var(--text-bright); margin-bottom: 10px; }
    .qcm-result-score { font-size: 72px; font-weight: 900; line-height: 1; }
    .qcm-result-total { font-size: 28px; color: var(--text-muted); font-weight: 500; }
    .qcm-result-pct { font-size: 28px; font-weight: 800; margin-top: 10px; }
    .qcm-result-meta { font-size: 12px; color: var(--text-muted); margin-top: 16px; }
    .qcm-result-cards {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px; margin-bottom: 24px;
    }
    .qcm-result-card {
        background: var(--bg-secondary); border: 1px solid var(--border);
        border-radius: 10px; padding: 16px; text-align: center;
    }
    .qcm-result-card-val { font-size: 28px; font-weight: 800; line-height: 1; }
    .qcm-result-card-lbl { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
    .qcm-result-modules { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; margin-bottom: 24px; }
    .qcm-result-mod {
        background: var(--bg-secondary); border: 1px solid var(--border);
        border-radius: 8px; padding: 10px 12px;
    }
    .qcm-result-mod-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
    .qcm-result-mod-bar { height: 6px; background: #0f172a; border-radius: 3px; overflow: hidden; }
    .qcm-result-mod-fill { height: 100%; }
    .qcm-quad-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px;
    }
    .qcm-quad {
        background: var(--bg-secondary); border: 1px solid var(--border);
        border-radius: 10px; padding: 16px; text-align: center;
    }
    .qcm-quad-ok { border-left: 4px solid #22c55e; }
    .qcm-quad-warn { border-left: 4px solid #f59e0b; }
    .qcm-quad-info { border-left: 4px solid #3b82f6; }
    .qcm-quad-alert { border-left: 4px solid #ef4444; background: rgba(239, 68, 68, 0.05); }
    .qcm-quad-val { font-size: 28px; font-weight: 800; color: var(--text-bright); }
    .qcm-quad-lbl { font-size: 12px; color: var(--text-secondary); margin-top: 6px; }
    .qcm-quad-lbl small { display: block; font-size: 10px; color: var(--text-muted); margin-top: 2px; }

    .qcm-result-list { max-height: 400px; overflow-y: auto; margin-bottom: 20px; }
    .qcm-result-item {
        display: grid; grid-template-columns: 30px 40px 40px 1fr 50px;
        gap: 10px; padding: 10px; border-bottom: 1px solid var(--border);
        cursor: pointer; align-items: center; font-size: 13px;
    }
    .qcm-result-item:hover { background: rgba(59, 130, 246, 0.05); }
    .qcm-result-ok { }
    .qcm-result-ko { background: rgba(239, 68, 68, 0.03); }
    .qcm-result-skip { opacity: .6; }
    .qcm-ri-icon { font-size: 16px; }
    .qcm-ri-num { color: var(--text-muted); font-weight: 700; }
    .qcm-ri-mod { font-weight: 700; font-size: 11px; }
    .qcm-ri-text { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .qcm-ri-time { color: var(--text-muted); font-size: 11px; text-align: right; }

    .qcm-result-actions {
        display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; justify-content: center;
    }

    /* ── History ── */
    .qcm-mastery-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 24px; }
    .qcm-mastery-card { background: var(--bg-secondary); border: 1px solid var(--border); border-top: 3px solid; border-radius: 8px; padding: 10px 12px; }
    .qcm-mastery-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
    .qcm-mastery-stats { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; }
    .qcm-mastery-bar { height: 5px; background: #0f172a; border-radius: 3px; overflow: hidden; }
    .qcm-mastery-fill { height: 100%; }

    .qcm-history-list { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .qcm-history-item {
        display: grid; grid-template-columns: 140px 1fr 100px 70px;
        gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--border);
        align-items: center; font-size: 13px;
    }
    .qcm-history-item:last-child { border-bottom: none; }
    .qcm-hist-aborted { opacity: .6; }
    .qcm-hist-date { color: var(--text-muted); font-size: 11px; }
    .qcm-hist-mode { color: var(--text-secondary); }
    .qcm-hist-score { font-weight: 800; text-align: right; }
    .qcm-hist-dur { color: var(--text-muted); font-size: 11px; text-align: right; }

    .qcm-empty { padding: 30px 20px; text-align: center; color: var(--text-muted); }
    `;
    document.head.appendChild(style);
}
