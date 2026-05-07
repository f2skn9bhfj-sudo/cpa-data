/* ═══════════════════════════════════════════════
   Swiss CPA Revision — Flashcards & Quiz Module
   ═══════════════════════════════════════════════ */

// ── Module state ──
let fcState = {
    mode: 'libre',          // libre | quiz | erreurs | smart | recall | exam
    cards: [],
    current: 0,
    flipped: false,
    filters: {
        category: null, subcategory: null, difficulty: null, search: '',
        // Filtres avancés (panneau repliable)
        module: null,           // 'M1'..'M16'
        mastery: null,          // 'Not started' | 'Again' | 'Learning' | 'Good' | 'Mastered'
        neverSeen: false,       // review_count = 0
        dueOnly: false,         // next_review <= today
        notSeenDays: null,      // entier ou null
        maxAccuracy: null,      // 0..1 (ex: 0.7 = cartes avec < 70% de réussite)
    },
    advancedOpen: false,
    // Smart mode
    smartStrategy: 'balanced', // overdue | weak | new | balanced | interleaving
    smartLimit: 20,
    smartBreakdown: null,       // dernier résultat pour le bandeau de sélection
    categories: [],
    // Quiz-specific
    quizTotal: 20,
    quizCorrect: 0,
    quizWrong: 0,
    quizFailed: [],
    quizStartTime: null,
    quizPhase: 'setup',     // setup | running | summary
};

const MODULE_CODES = ['M1','M2','M3','M4','M5','M6','M7','M8',
                      'M9','M10','M11','M12','M13','M14','M15','M16'];

const SMART_STRATEGIES = {
    overdue:      { icon: '🔴', label: 'En retard',     desc: 'Cartes dues + erreurs récentes' },
    weak:         { icon: '🎯', label: 'Points faibles', desc: 'Mastery faible ou accuracy < 70%' },
    new:          { icon: '🆕', label: 'Découverte',     desc: 'Jamais vues — intro graduelle' },
    balanced:     { icon: '⚖️', label: 'Équilibré',     desc: '40% retard · 30% faibles · 10% neuf · 20% mix' },
    interleaving: { icon: '🧠', label: 'Interleaving',   desc: 'Mix inter-catégories (anti-bloc)' },
};

const DIFF_LABELS = {
    facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile', piège: 'Piège'
};
const DIFF_BADGES = {
    facile: 'badge-easy', moyen: 'badge-medium',
    difficile: 'badge-hard', piège: 'badge-hard'
};
const MODE_LABELS = {
    libre:   { icon: '🃏', label: 'Libre',        desc: 'Tu choisis, SM-2 se met à jour à chaque note' },
    smart:   { icon: '🧠', label: 'Smart',        desc: 'L\'app choisit selon ta stratégie' },
    quiz:    { icon: '🎯', label: 'Quiz',         desc: 'Test chronométré avec score' },
    erreurs: { icon: '❌', label: 'Erreurs',      desc: 'Uniquement les cartes que tu as ratées' },
    recall:  { icon: '✍️', label: 'Rappel libre', desc: 'Écrire sa réponse + auto-check' },
    exam:    { icon: '📝', label: 'Examen blanc', desc: 'Timer 3h + cas + corrigé' },
};

// ── Helpers ──

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// ── Quiz state persistence (Bug 9) ──

const QUIZ_LS_KEY = 'swisscpa_fc_quiz';

function saveQuizState() {
    if (fcState.mode !== 'quiz' || fcState.quizPhase !== 'running') return;
    try {
        localStorage.setItem(QUIZ_LS_KEY, JSON.stringify({
            savedAt: Date.now(),
            mode: fcState.mode,
            quizPhase: fcState.quizPhase,
            quizTotal: fcState.quizTotal,
            quizCorrect: fcState.quizCorrect,
            quizWrong: fcState.quizWrong,
            quizFailed: fcState.quizFailed,
            quizStartTime: fcState.quizStartTime,
            current: fcState.current,
            cards: fcState.cards,
            filters: fcState.filters,
        }));
    } catch (_) { /* quota full — silent */ }
}

function clearQuizState() {
    try { localStorage.removeItem(QUIZ_LS_KEY); } catch (_) {}
}

function readSavedQuiz() {
    try {
        const raw = localStorage.getItem(QUIZ_LS_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw);
        // Expire after 24h to avoid stale resume offers.
        if (!s || !s.savedAt || (Date.now() - s.savedAt) > 24 * 3600 * 1000) {
            clearQuizState();
            return null;
        }
        if (!Array.isArray(s.cards) || s.cards.length === 0) return null;
        return s;
    } catch (_) { return null; }
}

function offerResumeIfAny(container) {
    const saved = readSavedQuiz();
    if (!saved) return false;
    const remaining = Math.max(0, saved.cards.length - (saved.current || 0));
    const pctDone = Math.round(((saved.current || 0) / saved.cards.length) * 100);
    const banner = document.createElement('div');
    banner.style.cssText = 'background:#1e3a5f;border:1px solid #3b82f6;border-radius:10px;'
        + 'padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;'
        + 'font-size:13px;color:#93c5fd';
    banner.innerHTML = `
        <span>↩ Quiz en cours (${pctDone}% fait, ${remaining} cartes restantes).</span>
        <button class="btn btn-primary" style="padding:6px 12px;font-size:12px"
            id="fcQuizResumeBtn">Reprendre</button>
        <button class="btn btn-outline" style="padding:6px 12px;font-size:12px"
            id="fcQuizDiscardBtn">Abandonner</button>
    `;
    container.insertBefore(banner, container.firstChild);
    document.getElementById('fcQuizResumeBtn').onclick = () => resumeQuiz(saved);
    document.getElementById('fcQuizDiscardBtn').onclick = () => {
        clearQuizState();
        banner.remove();
    };
    return true;
}

function resumeQuiz(saved) {
    fcState.mode = 'quiz';
    fcState.quizPhase = 'running';
    fcState.quizTotal = saved.quizTotal;
    fcState.quizCorrect = saved.quizCorrect || 0;
    fcState.quizWrong = saved.quizWrong || 0;
    fcState.quizFailed = saved.quizFailed || [];
    fcState.quizStartTime = saved.quizStartTime || Date.now();
    fcState.cards = saved.cards || [];
    fcState.current = saved.current || 0;
    fcState.filters = saved.filters || fcState.filters;
    fcState.flipped = false;
    renderModeBar();
    renderFilterBar();
    renderCard();
}

// Save progress when the user leaves the page / closes the tab.
window.addEventListener('beforeunload', saveQuizState);

// ── Main render ──

async function renderFlashcards(container) {
    // Reset state for fresh render
    fcState.cards = [];
    fcState.current = 0;
    fcState.flipped = false;
    fcState.quizPhase = 'setup';
    fcState.quizCorrect = 0;
    fcState.quizWrong = 0;
    fcState.quizFailed = [];

    // Load categories
    const cats = await api('get_flashcard_categories');
    fcState.categories = cats || [];

    container.innerHTML = `
        <div class="page-title">Flashcards</div>
        <div class="page-subtitle">Révision active</div>

        <!-- Mode selector -->
        <div id="fcModeBar" style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap"></div>

        <!-- Filter bar -->
        <div id="fcFilterBar" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px"></div>

        <!-- Main area -->
        <div id="fcMain"></div>
    `;

    // Bug 9 — propose to resume an unfinished quiz before overwriting state.
    if (offerResumeIfAny(container)) return;

    renderModeBar();
    renderFilterBar();
    await loadCards();
}

// ── Mode bar ──

function renderModeBar() {
    const bar = document.getElementById('fcModeBar');
    bar.innerHTML = Object.entries(MODE_LABELS).map(([key, m]) => `
        <button class="btn ${fcState.mode === key ? 'btn-primary' : 'btn-outline'}"
                onclick="fcSetMode('${key}')" style="font-size:13px">
            ${m.icon} ${m.label}
        </button>
    `).join('');
}

async function fcSetMode(mode) {
    // Special modes with dedicated flow
    if (mode === 'recall') {
        if (typeof startFreeRecall === 'function') {
            await startFreeRecall(fcState.filters.category || null);
        }
        return;
    }
    if (mode === 'exam') {
        if (typeof startExamMode === 'function') {
            startExamMode();
        }
        return;
    }

    fcState.mode = mode;
    fcState.current = 0;
    fcState.flipped = false;
    fcState.quizPhase = 'setup';
    fcState.quizCorrect = 0;
    fcState.quizWrong = 0;
    fcState.quizFailed = [];
    renderModeBar();
    renderFilterBar();
    await loadCards();
}

// ── Filter bar ──

function renderFilterBar() {
    const bar = document.getElementById('fcFilterBar');
    const cats = fcState.categories;
    const f = fcState.filters;

    if (fcState.mode === 'quiz' && fcState.quizPhase !== 'setup') {
        bar.innerHTML = '';
        return;
    }

    // Catégories
    const catPills = cats.map(c => {
        const color = getColor(c.name);
        const active = f.category === c.name;
        return `<button class="badge" style="cursor:pointer;padding:5px 12px;font-size:12px;
                    background:${active ? color.accent : color.bg};
                    color:${active ? '#fff' : color.accent};
                    border:1px solid ${color.accent};transition:all 0.2s"
                    onclick="fcToggleCat('${escapeHtml(c.name)}')">${c.name} (${c.count})</button>`;
    }).join('');

    // Difficultés
    const diffPills = Object.entries(DIFF_LABELS).map(([key, label]) => {
        const active = f.difficulty === key;
        return `<button class="badge ${DIFF_BADGES[key]}" style="cursor:pointer;padding:5px 12px;font-size:12px;
                    opacity:${active ? '1' : '0.5'};transition:all 0.2s"
                    onclick="fcToggleDiff('${key}')">${label}</button>`;
    }).join('');

    // Mastery — exposé en pills visibles par défaut.
    const MASTERY_PILLS = [
        { k: 'Again',     l: 'Again',     bg: '#7f1d1d', fg: '#fecaca' },
        { k: 'Learning',  l: 'Learning',  bg: '#78350f', fg: '#fde68a' },
        { k: 'Good',      l: 'Good',      bg: '#14532d', fg: '#bbf7d0' },
        { k: 'Mastered',  l: 'Mastered',  bg: '#1e3a8a', fg: '#bfdbfe' },
    ];
    const masteryPills = MASTERY_PILLS.map(m => {
        const active = f.mastery === m.k;
        return `<button class="fc-pill" style="cursor:pointer;padding:5px 12px;font-size:12px;border-radius:999px;
                    background:${active ? m.bg : 'transparent'};color:${active ? m.fg : m.bg};
                    border:1px solid ${m.bg};font-weight:600;transition:all 0.2s"
                    onclick="fcToggleMastery('${m.k}')" title="Niveau de maîtrise">${m.l}</button>`;
    }).join('');

    // Cases à cocher — Jamais vue / Due aujourd'hui (toujours visibles)
    const neverSeenChip = `<label class="fc-chip" style="display:inline-flex;align-items:center;gap:6px;
            padding:5px 10px;font-size:12px;border-radius:999px;cursor:pointer;
            background:${f.neverSeen ? 'rgba(59,130,246,.18)' : 'transparent'};
            border:1px solid ${f.neverSeen ? '#3b82f6' : 'var(--border-light)'};
            color:${f.neverSeen ? '#93c5fd' : 'var(--text-secondary)'}">
            <input type="checkbox" ${f.neverSeen ? 'checked' : ''}
                onchange="fcSetAdv('neverSeen', this.checked)"
                style="margin:0"> Jamais vue</label>`;
    const dueOnlyChip = `<label class="fc-chip" style="display:inline-flex;align-items:center;gap:6px;
            padding:5px 10px;font-size:12px;border-radius:999px;cursor:pointer;
            background:${f.dueOnly ? 'rgba(245,158,11,.18)' : 'transparent'};
            border:1px solid ${f.dueOnly ? '#f59e0b' : 'var(--border-light)'};
            color:${f.dueOnly ? '#fbbf24' : 'var(--text-secondary)'}">
            <input type="checkbox" ${f.dueOnly ? 'checked' : ''}
                onchange="fcSetAdv('dueOnly', this.checked)"
                style="margin:0"> Due aujourd'hui</label>`;

    // Sous-catégorie
    let subSelect = '';
    if (f.category) {
        const cat = cats.find(c => c.name === f.category);
        if (cat && cat.subs && cat.subs.length > 0) {
            const opts = cat.subs.map(s => {
                const sel = f.subcategory === s ? 'selected' : '';
                return `<option value="${escapeHtml(s)}" ${sel}>${escapeHtml(s)}</option>`;
            }).join('');
            subSelect = `<select onchange="fcSetSub(this.value)" style="background:var(--bg-tertiary);
                color:var(--text-bright);border:1px solid var(--border-light);border-radius:8px;
                padding:5px 10px;font-size:12px">
                <option value="">Toutes sous-cat.</option>${opts}</select>`;
        }
    }

    // Compteur de filtres actifs
    const advActive = [f.module, f.mastery, f.neverSeen, f.dueOnly,
                       f.notSeenDays, f.maxAccuracy].filter(x =>
        x !== null && x !== undefined && x !== false && x !== '').length;
    const advBadge = advActive > 0
        ? `<span style="background:#3b82f6;color:white;border-radius:10px;padding:1px 7px;margin-left:4px;font-size:10px">${advActive}</span>`
        : '';

    bar.innerHTML = `
        <div style="display:flex;gap:6px;flex-wrap:wrap">${catPills}</div>
        <div class="fc-pillgroup" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <span class="fc-pillgroup-lbl" style="font-size:11px;color:var(--text-muted);margin-right:4px">Difficulté :</span>
            ${diffPills}
        </div>
        <div class="fc-pillgroup" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <span class="fc-pillgroup-lbl" style="font-size:11px;color:var(--text-muted);margin-right:4px">Mastery :</span>
            ${masteryPills}
        </div>
        <div class="fc-pillgroup" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            ${neverSeenChip}
            ${dueOnlyChip}
        </div>
        ${subSelect}
        <input id="fcSearch" type="text" placeholder="Rechercher..."
            value="${escapeHtml(f.search)}"
            oninput="fcSetSearch(this.value)"
            style="background:var(--bg-tertiary);color:var(--text-bright);
            border:1px solid var(--border-light);border-radius:8px;padding:5px 12px;
            font-size:12px;width:180px">
        <button class="btn btn-outline" onclick="fcToggleAdvanced()"
            style="font-size:12px;padding:5px 10px">
            ⚙ Filtres avancés${advBadge}${fcState.advancedOpen ? ' ▲' : ' ▼'}
        </button>
        ${advActive > 0 ? `<button class="btn btn-outline" onclick="fcResetAdvanced()"
            style="font-size:12px;padding:5px 10px;color:#fca5a5">↺ Réinit.</button>` : ''}
        <div id="fcAdvPanel" style="display:${fcState.advancedOpen ? 'block' : 'none'};width:100%"></div>
        <div id="fcSmartBar" style="display:${fcState.mode === 'smart' ? 'block' : 'none'};width:100%"></div>
    `;

    if (fcState.advancedOpen) renderAdvancedPanel();
    if (fcState.mode === 'smart') renderSmartBar();
}

function renderAdvancedPanel() {
    const panel = document.getElementById('fcAdvPanel');
    if (!panel) return;
    const f = fcState.filters;

    const moduleOpts = MODULE_CODES.map(m =>
        `<option value="${m}" ${f.module === m ? 'selected' : ''}>${m}</option>`
    ).join('');

    const masteryOpts = ['Not started','Again','Learning','Good','Mastered'].map(m =>
        `<option value="${m}" ${f.mastery === m ? 'selected' : ''}>${m}</option>`
    ).join('');

    panel.innerHTML = `
        <div style="background:var(--bg-secondary);border:1px solid var(--border);
                    border-radius:10px;padding:14px;margin-top:10px;
                    display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
            <div>
                <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">
                    Module</label>
                <select onchange="fcSetAdv('module', this.value || null)"
                    style="width:100%;background:var(--bg-tertiary);color:var(--text-bright);
                    border:1px solid var(--border-light);border-radius:6px;padding:5px 8px;font-size:12px">
                    <option value="">Tous</option>${moduleOpts}
                </select>
            </div>
            <div>
                <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">
                    Mastery</label>
                <select onchange="fcSetAdv('mastery', this.value || null)"
                    style="width:100%;background:var(--bg-tertiary);color:var(--text-bright);
                    border:1px solid var(--border-light);border-radius:6px;padding:5px 8px;font-size:12px">
                    <option value="">Tous niveaux</option>${masteryOpts}
                </select>
            </div>
            <div>
                <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">
                    Pas vu depuis</label>
                <select onchange="fcSetAdv('notSeenDays', this.value ? parseInt(this.value) : null)"
                    style="width:100%;background:var(--bg-tertiary);color:var(--text-bright);
                    border:1px solid var(--border-light);border-radius:6px;padding:5px 8px;font-size:12px">
                    <option value="">Peu importe</option>
                    <option value="3"  ${f.notSeenDays === 3  ? 'selected' : ''}>3 jours</option>
                    <option value="7"  ${f.notSeenDays === 7  ? 'selected' : ''}>7 jours</option>
                    <option value="14" ${f.notSeenDays === 14 ? 'selected' : ''}>14 jours</option>
                    <option value="30" ${f.notSeenDays === 30 ? 'selected' : ''}>30 jours</option>
                </select>
            </div>
            <div>
                <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:4px">
                    Taux de réussite max</label>
                <select onchange="fcSetAdv('maxAccuracy', this.value ? parseFloat(this.value) : null)"
                    style="width:100%;background:var(--bg-tertiary);color:var(--text-bright);
                    border:1px solid var(--border-light);border-radius:6px;padding:5px 8px;font-size:12px">
                    <option value="">Peu importe</option>
                    <option value="0.5" ${f.maxAccuracy === 0.5 ? 'selected' : ''}>&lt; 50%</option>
                    <option value="0.7" ${f.maxAccuracy === 0.7 ? 'selected' : ''}>&lt; 70%</option>
                    <option value="0.9" ${f.maxAccuracy === 0.9 ? 'selected' : ''}>&lt; 90%</option>
                </select>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;justify-content:flex-end">
                <label style="font-size:12px;color:var(--text-bright);display:flex;align-items:center;gap:6px">
                    <input type="checkbox" ${f.neverSeen ? 'checked' : ''}
                        onchange="fcSetAdv('neverSeen', this.checked)"> Jamais vue
                </label>
                <label style="font-size:12px;color:var(--text-bright);display:flex;align-items:center;gap:6px">
                    <input type="checkbox" ${f.dueOnly ? 'checked' : ''}
                        onchange="fcSetAdv('dueOnly', this.checked)"> Due aujourd'hui
                </label>
            </div>
        </div>`;
}

function renderSmartBar() {
    const bar = document.getElementById('fcSmartBar');
    if (!bar) return;
    const pills = Object.entries(SMART_STRATEGIES).map(([key, s]) => {
        const active = fcState.smartStrategy === key;
        return `<button class="btn ${active ? 'btn-primary' : 'btn-outline'}"
            title="${escapeHtml(s.desc)}"
            onclick="fcSetStrategy('${key}')"
            style="font-size:12px;padding:6px 12px">
            ${s.icon} ${s.label}
        </button>`;
    }).join('');
    bar.innerHTML = `
        <div style="background:var(--bg-secondary);border:1px solid var(--border);
                    border-radius:10px;padding:12px;margin-top:10px">
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">
                Stratégie — l'app construit le deck en combinant ta stratégie et tes filtres
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${pills}</div>
            <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--text-secondary)">
                <span>Taille :</span>
                ${[10,20,30,50].map(n => `
                    <button class="btn ${fcState.smartLimit === n ? 'btn-primary' : 'btn-outline'}"
                        onclick="fcSetSmartLimit(${n})" style="padding:3px 10px;font-size:12px">${n}</button>
                `).join('')}
            </div>
        </div>`;
}

function fcToggleAdvanced() {
    fcState.advancedOpen = !fcState.advancedOpen;
    renderFilterBar();
}

function fcSetAdv(key, value) {
    fcState.filters[key] = value;
    fcState.current = 0; fcState.flipped = false;
    renderFilterBar();
    loadCards();
}

function fcResetAdvanced() {
    Object.assign(fcState.filters, {
        module: null, mastery: null, neverSeen: false,
        dueOnly: false, notSeenDays: null, maxAccuracy: null,
    });
    fcState.current = 0; fcState.flipped = false;
    renderFilterBar();
    loadCards();
}

function fcSetStrategy(strat) {
    fcState.smartStrategy = strat;
    fcState.current = 0; fcState.flipped = false;
    renderFilterBar();
    loadCards();
}

function fcSetSmartLimit(n) {
    fcState.smartLimit = n;
    fcState.current = 0; fcState.flipped = false;
    renderFilterBar();
    loadCards();
}

function fcToggleCat(name) {
    fcState.filters.category = fcState.filters.category === name ? null : name;
    fcState.filters.subcategory = null;
    fcState.current = 0;
    fcState.flipped = false;
    renderFilterBar();
    loadCards();
}

function fcToggleDiff(diff) {
    fcState.filters.difficulty = fcState.filters.difficulty === diff ? null : diff;
    fcState.current = 0;
    fcState.flipped = false;
    renderFilterBar();
    loadCards();
}

// Pill mastery (Again / Learning / Good / Mastered) — toggle behavior
// même style que les pills catégorie / difficulté.
function fcToggleMastery(level) {
    fcState.filters.mastery = fcState.filters.mastery === level ? null : level;
    fcState.current = 0;
    fcState.flipped = false;
    renderFilterBar();
    loadCards();
}

function fcSetSub(val) {
    fcState.filters.subcategory = val || null;
    fcState.current = 0;
    fcState.flipped = false;
    loadCards();
}

function fcSetSearch(val) {
    fcState.filters.search = val;
    fcState.current = 0;
    fcState.flipped = false;
    loadCards();
}

// ── Load cards from backend ──

async function loadCards() {
    const main = document.getElementById('fcMain');
    if (!main) return;

    const f = fcState.filters;

    if (fcState.mode === 'quiz' && fcState.quizPhase === 'setup') {
        renderQuizSetup(main);
        return;
    }

    main.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Chargement...</div>';

    fcState.smartBreakdown = null;
    let cards;

    if (fcState.mode === 'smart') {
        // L'app choisit selon stratégie + filtres
        const r = await api('get_smart_deck',
            fcState.smartStrategy,
            f.category || null,
            f.subcategory || null,
            f.module || null,
            f.difficulty || null,
            fcState.smartLimit);
        cards = (r && r.cards) || [];
        fcState.smartBreakdown = r && r.breakdown ? r.breakdown : null;
    } else {
        // Signature complète : category, subcategory, difficulty, due_only, mastery,
        //                      search, wrong_only, module_code, not_seen_days,
        //                      never_seen, min_accuracy, max_accuracy, limit
        const wrongOnly = fcState.mode === 'erreurs';
        cards = await api('get_flashcards',
            f.category || '',
            f.subcategory || '',
            f.difficulty || '',
            f.dueOnly || false,
            f.mastery || null,
            f.search || '',
            wrongOnly,
            f.module || null,
            f.notSeenDays,
            f.neverSeen || false,
            null,              // min_accuracy
            f.maxAccuracy,
            null               // pas de limit sauf en smart
        );
        cards = cards || [];
    }

    // Smart renvoie déjà un deck trié/mélangé par stratégie — ne pas le re-mélanger.
    if (fcState.mode === 'quiz' || fcState.mode === 'libre' || fcState.mode === 'erreurs') {
        cards = shuffle(cards);
    }

    if (fcState.mode === 'quiz' && fcState.quizPhase === 'running') {
        cards = cards.slice(0, fcState.quizTotal);
    }

    fcState.cards = cards;
    fcState.current = 0;
    fcState.flipped = false;

    if (cards.length === 0) {
        main.innerHTML = `
            <div style="text-align:center;padding:60px">
                <div style="font-size:48px;margin-bottom:16px">📭</div>
                <div style="font-size:16px;color:var(--text-secondary)">Aucune carte trouvée</div>
                <div style="font-size:13px;color:var(--text-muted);margin-top:8px">
                    Essayez de modifier vos filtres ou changez de mode.
                </div>
            </div>`;
        return;
    }

    renderCard();
}

// ── Quiz setup screen ──

function renderQuizSetup(main) {
    const cats = fcState.categories;
    const catOptions = cats.map(c =>
        `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)} (${c.count})</option>`
    ).join('');

    main.innerHTML = `
        <div class="card" style="max-width:500px;margin:40px auto;text-align:center;padding:32px">
            <div style="font-size:48px;margin-bottom:16px">🎯</div>
            <div style="font-size:22px;font-weight:700;color:var(--text-bright);margin-bottom:8px">
                Démarrer un Quiz
            </div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:24px">
                Testez vos connaissances avec un quiz chronométré
            </div>

            <div style="margin-bottom:16px;text-align:left">
                <label style="font-size:12px;color:var(--text-secondary);font-weight:600;
                    display:block;margin-bottom:6px">Catégorie (optionnel)</label>
                <select id="quizCatSelect" style="width:100%;background:var(--bg-tertiary);
                    color:var(--text-bright);border:1px solid var(--border-light);border-radius:8px;
                    padding:8px 12px;font-size:13px">
                    <option value="">Toutes les catégories</option>
                    ${catOptions}
                </select>
            </div>

            <div style="margin-bottom:24px;text-align:left">
                <label style="font-size:12px;color:var(--text-secondary);font-weight:600;
                    display:block;margin-bottom:6px">Nombre de questions</label>
                <div style="display:flex;gap:8px">
                    ${[10, 20, 50].map(n => `
                        <button class="btn ${fcState.quizTotal === n ? 'btn-primary' : 'btn-outline'}"
                            onclick="fcState.quizTotal=${n};renderQuizSetup(document.getElementById('fcMain'))"
                            style="flex:1">${n}</button>
                    `).join('')}
                    <button class="btn ${fcState.quizTotal === 9999 ? 'btn-primary' : 'btn-outline'}"
                        onclick="fcState.quizTotal=9999;renderQuizSetup(document.getElementById('fcMain'))"
                        style="flex:1">Tout</button>
                </div>
            </div>

            <button class="btn btn-primary" style="width:100%;padding:12px;font-size:15px"
                onclick="fcStartQuiz()">
                Commencer le Quiz
            </button>
        </div>
    `;
}

async function fcStartQuiz() {
    const catSelect = document.getElementById('quizCatSelect');
    if (catSelect && catSelect.value) {
        fcState.filters.category = catSelect.value;
    }
    // Catégorie + sous-catégorie + difficulté sélectionnées avant
    // l'écran de setup sont préservées — un quiz "10 cartes difficiles
    // en IFRS" reste possible.
    fcState.filters.search = '';

    fcState.quizPhase = 'running';
    fcState.quizCorrect = 0;
    fcState.quizWrong = 0;
    fcState.quizFailed = [];
    fcState.quizStartTime = Date.now();

    renderFilterBar();
    await loadCards();
}

// ── Render current card ──

function renderCard() {
    const main = document.getElementById('fcMain');
    if (!main) return;

    const cards = fcState.cards;
    const idx = fcState.current;

    if (idx >= cards.length) {
        if (fcState.mode === 'quiz') {
            renderQuizSummary(main);
        } else {
            renderEndScreen(main);
        }
        return;
    }

    const card = cards[idx];
    const color = getColor(card.category);
    const diffBadge = DIFF_BADGES[card.difficulty] || 'badge-medium';
    const diffLabel = DIFF_LABELS[card.difficulty] || card.difficulty;
    const total = cards.length;
    const progress = ((idx + 1) / total) * 100;

    // Bandeau de sélection — explique pourquoi ces cartes-là
    let selectionBanner = '';
    if (idx === 0) {
        const b = fcState.smartBreakdown;
        if (fcState.mode === 'smart' && b) {
            const strat = SMART_STRATEGIES[fcState.smartStrategy];
            selectionBanner = `<div style="max-width:700px;margin:0 auto 10px;
                background:var(--bg-secondary);border:1px solid var(--border);
                border-radius:8px;padding:8px 12px;font-size:12px;color:var(--text-secondary)">
                ${strat.icon} <strong>${strat.label}</strong> — ${b.total} cartes :
                ${b.overdue ? `🔴 ${b.overdue} en retard · ` : ''}
                ${b.wrong ? `❌ ${b.wrong} erreurs · ` : ''}
                ${b.weak_mastery ? `🎯 ${b.weak_mastery} faibles · ` : ''}
                ${b.never_seen ? `🆕 ${b.never_seen} nouvelles · ` : ''}
                ${b.reviewed_ok ? `✓ ${b.reviewed_ok} déjà maîtrisées` : ''}
            </div>`;
        } else if (fcState.mode !== 'quiz') {
            // Libre / Erreurs — comptage simple
            selectionBanner = `<div style="max-width:700px;margin:0 auto 10px;
                background:var(--bg-secondary);border:1px solid var(--border);
                border-radius:8px;padding:8px 12px;font-size:12px;color:var(--text-muted)">
                ${MODE_LABELS[fcState.mode]?.icon || ''} <strong>${MODE_LABELS[fcState.mode]?.label || fcState.mode}</strong>
                — ${total} cartes sélectionnées${fcState.mode === 'libre'
                    ? ' · tes notes mettent à jour la répétition espacée'
                    : ''}
            </div>`;
        }
    }

    main.innerHTML = `
        ${selectionBanner}
        <!-- Progress -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;max-width:700px;margin-left:auto;margin-right:auto">
            <span style="font-size:13px;color:var(--text-secondary);font-weight:600;white-space:nowrap">
                ${idx + 1} / ${total}
            </span>
            <div class="progress-bar" style="flex:1">
                <div class="progress-fill" style="width:${progress}%"></div>
            </div>
            ${fcState.mode === 'quiz' ? `
                <span style="font-size:12px;color:#86efac;font-weight:600">✓ ${fcState.quizCorrect}</span>
                <span style="font-size:12px;color:#fca5a5;font-weight:600">✗ ${fcState.quizWrong}</span>
            ` : ''}
        </div>

        <!-- Flashcard -->
        <div class="flashcard-container" onclick="fcFlip()">
            <div class="flashcard ${fcState.flipped ? 'flipped' : ''}" id="fcCard">
                <!-- Front -->
                <div class="flashcard-face flashcard-front">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                        <span class="flashcard-cat" style="color:${color.accent}">${escapeHtml(card.category)}</span>
                        <span class="badge ${diffBadge}">${diffLabel}</span>
                    </div>
                    <div class="flashcard-sub">${escapeHtml(card.subcategory || '')}</div>
                    <div class="flashcard-question">${formatInline(card.question)}</div>
                    <div style="text-align:center;margin-top:12px;font-size:12px;color:var(--text-muted)">
                        Cliquer pour retourner
                    </div>
                </div>
                <!-- Back -->
                <div class="flashcard-face flashcard-back">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                        <span class="flashcard-cat" style="color:${color.accent}">${escapeHtml(card.category)}</span>
                        <span class="badge ${diffBadge}">${diffLabel}</span>
                    </div>
                    <div class="flashcard-sub">${escapeHtml(card.subcategory || '')}</div>
                    <div class="flashcard-answer">${formatAnswer(card.answer)}</div>
                </div>
            </div>
        </div>

        <!-- Anki-style 4-level rating buttons (visible after flip) -->
        <div id="fcButtons" class="flashcard-footer" style="max-width:700px;margin:16px auto 0;
            display:${fcState.flipped ? 'flex' : 'none'};justify-content:center;gap:8px;flex-wrap:wrap">
            <button class="btn fc-rate-btn" title="Raccourci : 1"
                style="background:#7f1d1d;color:#fca5a5;padding:10px 18px;font-size:13px;min-width:110px"
                onclick="event.stopPropagation();fcAnswer(0)">
                ✗ Again<br><span style="font-size:10px;opacity:0.8">oublié</span>
            </button>
            <button class="btn fc-rate-btn" title="Raccourci : 2"
                style="background:#78350f;color:#fdba74;padding:10px 18px;font-size:13px;min-width:110px"
                onclick="event.stopPropagation();fcAnswer(1)">
                ~ Hard<br><span style="font-size:10px;opacity:0.8">difficile</span>
            </button>
            <button class="btn fc-rate-btn" title="Raccourci : 3"
                style="background:#14532d;color:#86efac;padding:10px 18px;font-size:13px;min-width:110px"
                onclick="event.stopPropagation();fcAnswer(2)">
                ✓ Good<br><span style="font-size:10px;opacity:0.8">normal</span>
            </button>
            <button class="btn fc-rate-btn" title="Raccourci : 4"
                style="background:#1e3a8a;color:#93c5fd;padding:10px 18px;font-size:13px;min-width:110px"
                onclick="event.stopPropagation();fcAnswer(3)">
                ⚡ Easy<br><span style="font-size:10px;opacity:0.8">trivial</span>
            </button>
        </div>

        <!-- Navigation (libre/ciblee/erreurs only) -->
        ${fcState.mode !== 'quiz' ? `
        <div style="display:flex;justify-content:center;gap:8px;margin-top:12px;max-width:700px;margin-left:auto;margin-right:auto">
            <button class="btn btn-outline" onclick="fcPrev()" ${idx === 0 ? 'disabled style="opacity:0.4;pointer-events:none"' : ''}>
                ← Précédent
            </button>
            <button class="btn btn-outline" onclick="fcSkip()">
                Passer →
            </button>
        </div>` : ''}
    `;
}

function fcFlip() {
    fcState.flipped = !fcState.flipped;
    const cardEl = document.getElementById('fcCard');
    if (cardEl) {
        cardEl.classList.toggle('flipped', fcState.flipped);
    }
    const btns = document.getElementById('fcButtons');
    if (btns) {
        btns.style.display = fcState.flipped ? 'flex' : 'none';
    }
}

/**
 * Answer the current flashcard.
 * Accepts Anki-style rating 0-3 (Again/Hard/Good/Easy) OR legacy boolean.
 */
async function fcAnswer(ratingOrBool) {
    const card = fcState.cards[fcState.current];
    if (!card) return;

    // Normalize input: bool -> rating, int -> rating
    let rating;
    if (typeof ratingOrBool === 'boolean') {
        rating = ratingOrBool ? 2 : 0;
    } else {
        rating = Math.max(0, Math.min(3, parseInt(ratingOrBool, 10) || 0));
    }
    const correct = rating > 0;

    // Update backend (Anki-style rating)
    await api('update_flashcard', card.id, null, rating);

    // Track quiz stats
    if (fcState.mode === 'quiz') {
        if (correct) {
            fcState.quizCorrect++;
        } else {
            fcState.quizWrong++;
            fcState.quizFailed.push(card);
        }
        // Bug 9 — persister après chaque réponse pour une reprise après crash.
        saveQuizState();
    }

    // QW3: Micro-animation selon rating
    const cardEl = document.querySelector('.flashcard');
    if (cardEl) {
        cardEl.classList.remove('fc-correct', 'fc-wrong');
        void cardEl.offsetWidth;
        cardEl.classList.add(correct ? 'fc-correct' : 'fc-wrong');
        setTimeout(() => cardEl.classList.remove('fc-correct', 'fc-wrong'), 400);
    }

    // Confetti si quiz terminé avec ≥80 %
    if (fcState.mode === 'quiz' && fcState.current + 1 >= fcState.cards.length) {
        const total = fcState.quizCorrect + fcState.quizWrong;
        if (total > 0 && (fcState.quizCorrect / total) >= 0.8) {
            if (typeof launchConfetti === 'function') {
                setTimeout(() => launchConfetti(), 200);
            }
        }
    }

    // Next card (petit délai pour apprécier l'animation)
    setTimeout(() => {
        fcState.current++;
        fcState.flipped = false;
        renderCard();
    }, 180);
}

// Raccourcis clavier 1-4 pour rating Anki-style (quand carte flipped).
// Le handler est global mais garde un scope strict :
//   - une .flashcard doit être présente dans #mainContent
//   - le focus ne doit pas être sur un input/textarea
//   - la carte doit être retournée (fcState.flipped === true)
document.addEventListener('keydown', (e) => {
    if (!fcState || !fcState.flipped) return;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
    const main = document.getElementById('mainContent');
    if (!main || !main.querySelector('.flashcard')) return;

    if (e.key === '1') { e.preventDefault(); fcAnswer(0); }
    else if (e.key === '2') { e.preventDefault(); fcAnswer(1); }
    else if (e.key === '3') { e.preventDefault(); fcAnswer(2); }
    else if (e.key === '4') { e.preventDefault(); fcAnswer(3); }
});

function fcSkip() {
    fcState.current++;
    fcState.flipped = false;
    renderCard();
}

function fcPrev() {
    if (fcState.current > 0) {
        fcState.current--;
        fcState.flipped = false;
        renderCard();
    }
}

// ── End screen (libre/ciblee/erreurs) ──

function renderEndScreen(main) {
    main.innerHTML = `
        <div class="card" style="max-width:500px;margin:40px auto;text-align:center;padding:32px">
            <div style="font-size:48px;margin-bottom:12px">🎉</div>
            <div style="font-size:22px;font-weight:700;color:var(--text-bright);margin-bottom:8px">
                Toutes les cartes vues !
            </div>
            <div style="font-size:14px;color:var(--text-secondary);margin-bottom:24px">
                Vous avez parcouru les ${fcState.cards.length} cartes de cette sélection.
            </div>
            <div style="display:flex;gap:8px;justify-content:center">
                <button class="btn btn-primary" onclick="fcState.current=0;fcState.flipped=false;loadCards()">
                    Recommencer
                </button>
                <button class="btn btn-outline" onclick="fcSetMode('libre')">
                    Retour
                </button>
            </div>
        </div>
    `;
}

// ── Quiz summary ──

async function renderQuizSummary(main) {
    const duration = Date.now() - fcState.quizStartTime;
    const total = fcState.quizCorrect + fcState.quizWrong;
    const pct = total > 0 ? Math.round((fcState.quizCorrect / total) * 100) : 0;
    const failedIds = fcState.quizFailed.map(c => c.id);

    // Save to backend
    const cat = fcState.filters.category || 'Toutes';
    await api('save_quiz', cat, total, fcState.quizCorrect, failedIds, Math.floor(duration / 1000));

    fcState.quizPhase = 'summary';
    clearQuizState(); // Quiz complet -> plus rien à reprendre

    // Score color
    let scoreColor = '#fca5a5';
    if (pct >= 80) scoreColor = '#86efac';
    else if (pct >= 50) scoreColor = '#fcd34d';

    const failedHtml = fcState.quizFailed.length > 0 ? `
        <div style="text-align:left;margin-top:24px;border-top:1px solid var(--border);padding-top:16px">
            <div style="font-size:14px;font-weight:700;color:var(--text-bright);margin-bottom:12px">
                Questions échouées (${fcState.quizFailed.length})
            </div>
            ${fcState.quizFailed.map(c => {
                const color = getColor(c.category);
                return `
                <div style="background:var(--bg-tertiary);border-radius:8px;padding:10px 14px;
                    margin-bottom:8px;border-left:3px solid ${color.accent}">
                    <div style="font-size:11px;color:${color.accent};font-weight:700;
                        text-transform:uppercase;margin-bottom:4px">${escapeHtml(c.category)}</div>
                    <div style="font-size:13px;color:var(--text-bright)">${formatInline(c.question)}</div>
                </div>`;
            }).join('')}
        </div>
    ` : '';

    main.innerHTML = `
        <div class="card" style="max-width:560px;margin:40px auto;text-align:center;padding:32px">
            <div style="font-size:14px;color:var(--text-muted);text-transform:uppercase;
                letter-spacing:2px;margin-bottom:8px">Résultat du Quiz</div>

            <div style="font-size:72px;font-weight:800;color:${scoreColor};line-height:1">
                ${pct}%
            </div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:4px;margin-bottom:24px">
                ${fcState.quizCorrect} correct${fcState.quizCorrect > 1 ? 's' : ''} sur ${total}
            </div>

            <div style="display:flex;justify-content:center;gap:24px;margin-bottom:16px">
                <div>
                    <div style="font-size:28px;font-weight:800;color:#86efac">${fcState.quizCorrect}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Corrects</div>
                </div>
                <div>
                    <div style="font-size:28px;font-weight:800;color:#fca5a5">${fcState.quizWrong}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Erreurs</div>
                </div>
                <div>
                    <div style="font-size:28px;font-weight:800;color:var(--accent-blue)">${formatTime(duration)}</div>
                    <div style="font-size:11px;color:var(--text-muted)">Durée</div>
                </div>
            </div>

            <div class="progress-bar" style="margin-bottom:24px">
                <div class="progress-fill" style="width:${pct}%;background:${scoreColor}"></div>
            </div>

            ${failedHtml}

            <div style="display:flex;gap:8px;justify-content:center;margin-top:24px;flex-wrap:wrap">
                ${fcState.quizFailed.length > 0 ? `
                    <button class="btn" style="background:#7f1d1d;color:#fca5a5"
                        onclick="fcRetryFailed()">
                        Réviser les erreurs
                    </button>
                ` : ''}
                <button class="btn btn-primary" onclick="fcSetMode('quiz')">
                    Nouveau Quiz
                </button>
                <button class="btn btn-outline" onclick="fcSetMode('libre')">
                    Mode Libre
                </button>
            </div>
        </div>
    `;
}

function fcRetryFailed() {
    fcState.cards = shuffle([...fcState.quizFailed]);
    fcState.current = 0;
    fcState.flipped = false;
    fcState.quizCorrect = 0;
    fcState.quizWrong = 0;
    fcState.quizFailed = [];
    fcState.quizPhase = 'running';
    fcState.quizStartTime = Date.now();
    fcState.quizTotal = fcState.cards.length;
    renderFilterBar();
    renderCard();
}
