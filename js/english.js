/* ═══════════════════════════════════════════════════════════
   Swiss CPA Revision — English module (vocab + phrases + writing)
   ═══════════════════════════════════════════════════════════

   Three sub-sections behind the 🇬🇧 Anglais tab :
     • vocab   — flashcards FR↔EN with Anki ratings (Again/Hard/Good/Easy)
     • phrases — filterable list with expand-to-see-EN, optional flashcard mode
     • writing — textarea + LanguageTool grammar/spelling check (via api.py)

   No QCMs (user explicitly declined). Progress is persisted in localStorage
   and (best-effort) sent to the backend via record_english_attempt.
*/

// ── Module state ─────────────────────────────────────────────

const engState = {
    section: 'vocab',
    data: null,                  // {vocab: [...], phrases: [...], version, level_target}
    cards: [],                   // currently active card pool (vocab or phrases-as-cards)
    currentIdx: 0,
    isFlipped: false,
    cardMode: 'vocab',           // 'vocab' | 'phrases-as-cards' — drives card rendering
    filters: {
        domain: null,            // 'audit' | 'business' | 'daily' | null
        level:  null,            // 'A2' | 'B1' | null
        neverSeen: false,
        overdue: false,
    },
    phrasesFilters: {
        category: null,
        search: '',
    },
    expandedPhrase: null,        // id of currently expanded phrase
    progress: {},                // {card_id: {review_count, mastery, correct, wrong, last_reviewed, next_review}}
    writing: {
        text: '',
        result: null,            // {matches: [...]} or {error: '...'}
        loading: false,
    },
};

// ── Constants ────────────────────────────────────────────────

const ENG_LS_SUBTAB   = 'swisscpa_eng_subtab';
const ENG_LS_PROGRESS = 'swisscpa_eng_progress';
const ENG_LS_FILTERS  = 'swisscpa_eng_filters';

const DOMAIN_LABELS = {
    audit:    { icon: '📊', label: 'Audit / Finance', color: '#3b82f6' },
    business: { icon: '💼', label: 'Business',        color: '#8b5cf6' },
    daily:    { icon: '🌍', label: 'Vie courante',    color: '#10b981' },
};

const PHRASE_CATEGORIES = {
    email_opening: { icon: '✉️', label: 'Ouverture email' },
    email_closing: { icon: '📩', label: 'Clôture email'  },
    meeting:       { icon: '🗓️', label: 'Réunion'        },
    idiom:         { icon: '💬', label: 'Idiomes'         },
    transition:    { icon: '🔗', label: 'Transitions'     },
    politeness:    { icon: '🙏', label: 'Politesse'       },
};

const LEVEL_LABELS = {
    A2: { label: 'A2', color: '#10b981' },
    B1: { label: 'B1', color: '#f59e0b' },
};

const MASTERY_COLORS = {
    not_started: { bg: '#1e293b', fg: '#94a3b8', label: 'Non vu' },
    again:       { bg: '#7f1d1d', fg: '#fecaca', label: 'Again' },
    learning:    { bg: '#78350f', fg: '#fde68a', label: 'Learning' },
    good:        { bg: '#14532d', fg: '#bbf7d0', label: 'Good' },
    mastered:    { bg: '#1e3a8a', fg: '#bfdbfe', label: 'Mastered' },
};

// Inject minimal CSS once (red wavy underline + popover for writing corrections).
(function engInjectCss() {
    if (document.getElementById('eng-style')) return;
    const s = document.createElement('style');
    s.id = 'eng-style';
    s.textContent = `
        .eng-correction-mark {
            text-decoration: underline wavy #ef4444;
            text-underline-offset: 3px;
            cursor: pointer;
            background: rgba(239, 68, 68, 0.08);
            border-radius: 2px;
            padding: 0 1px;
        }
        .eng-correction-mark:hover { background: rgba(239, 68, 68, 0.18); }
        .eng-popover {
            position: absolute; z-index: 1000;
            background: var(--bg-secondary); border: 1px solid var(--border);
            border-radius: 8px; padding: 10px 12px; max-width: 320px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            font-size: 13px; color: var(--text-bright);
        }
        .eng-popover-msg { margin-bottom: 8px; color: var(--text-secondary); font-size: 12px; }
        .eng-popover-sugg {
            display: inline-block; padding: 3px 10px; margin: 2px 4px 2px 0;
            background: #1e3a5f; color: #93c5fd; border: 1px solid #3b82f6;
            border-radius: 999px; font-size: 12px; cursor: pointer;
            transition: all 0.15s;
        }
        .eng-popover-sugg:hover { background: #3b82f6; color: white; }
        .eng-card-front, .eng-card-back {
            min-height: 280px; display: flex; flex-direction: column;
            justify-content: center; align-items: center; padding: 32px 24px;
            text-align: center;
        }
        .eng-card-fr { font-size: 28px; font-weight: 700; color: var(--text-bright);
            line-height: 1.3; margin-bottom: 12px; }
        .eng-card-en { font-size: 24px; font-weight: 600; color: #93c5fd;
            line-height: 1.3; margin-bottom: 10px; }
        .eng-card-ipa { font-size: 14px; color: var(--text-muted);
            font-family: 'Courier New', monospace; margin-bottom: 12px; }
        .eng-card-notes { font-size: 13px; color: var(--text-secondary);
            font-style: italic; margin: 8px 0; max-width: 440px; }
        .eng-card-examples { font-size: 13px; color: var(--text-secondary);
            margin-top: 10px; max-width: 480px; text-align: left; }
        .eng-card-examples-fr { color: #cbd5e1; }
        .eng-card-examples-en { color: #93c5fd; font-style: italic; margin-bottom: 6px; }
        .eng-phrase-row {
            background: var(--bg-secondary); border: 1px solid var(--border);
            border-radius: 10px; padding: 12px 16px; margin-bottom: 8px;
            cursor: pointer; transition: all 0.15s;
        }
        .eng-phrase-row:hover { border-color: #3b82f6; }
        .eng-phrase-row.expanded { border-color: #3b82f6;
            background: linear-gradient(180deg, var(--bg-secondary) 0%, rgba(59,130,246,0.04) 100%); }
        .eng-phrase-fr { font-weight: 600; color: var(--text-bright); font-size: 15px; }
        .eng-phrase-en { color: #93c5fd; font-size: 14px; margin-top: 8px; font-style: italic; }
        .eng-phrase-ctx { color: var(--text-muted); font-size: 12px; margin-top: 6px; }
    `;
    document.head.appendChild(s);
})();

// ── Persistence helpers ──────────────────────────────────────

function engLoadProgress() {
    try {
        const raw = localStorage.getItem(ENG_LS_PROGRESS);
        engState.progress = raw ? (JSON.parse(raw) || {}) : {};
    } catch (_) { engState.progress = {}; }
}

function engSaveProgress() {
    try { localStorage.setItem(ENG_LS_PROGRESS, JSON.stringify(engState.progress)); }
    catch (_) { /* quota — ignore */ }
}

function engLoadFilters() {
    try {
        const raw = localStorage.getItem(ENG_LS_FILTERS);
        if (!raw) return;
        const f = JSON.parse(raw);
        if (f && typeof f === 'object') {
            engState.filters = Object.assign(engState.filters, f.vocab || {});
            engState.phrasesFilters = Object.assign(engState.phrasesFilters,
                f.phrases || {});
        }
    } catch (_) {}
}

function engSaveFilters() {
    try {
        localStorage.setItem(ENG_LS_FILTERS, JSON.stringify({
            vocab: engState.filters,
            phrases: engState.phrasesFilters,
        }));
    } catch (_) {}
}

function engGetSubTab(fallback) {
    try { return localStorage.getItem(ENG_LS_SUBTAB) || fallback; }
    catch (_) { return fallback; }
}

function engSetSubTab(sub) {
    try { localStorage.setItem(ENG_LS_SUBTAB, sub); } catch (_) {}
}

// ── Mastery / progress logic (simple, not SM-2) ──────────────

function engUpdateProgress(cardId, rating) {
    // rating: 0 Again | 1 Hard | 2 Good | 3 Easy
    const p = engState.progress[cardId] || {
        review_count: 0, correct: 0, wrong: 0,
        mastery: 'not_started', last_reviewed: null, next_review: null,
    };
    p.review_count++;
    if (rating === 0) p.wrong++; else p.correct++;

    if (rating === 0) p.mastery = 'again';
    else if (rating === 1) p.mastery = 'learning';
    else if (rating === 2) p.mastery = (p.mastery === 'learning' || p.mastery === 'again') ? 'good' : 'good';
    else if (rating === 3) p.mastery = 'mastered';

    // Tiny "next_review" hint for the "overdue" filter — not a real SM-2 schedule.
    const now = Date.now();
    p.last_reviewed = new Date(now).toISOString();
    const offsetDays = [0, 1, 3, 7][rating] || 1;
    p.next_review = new Date(now + offsetDays * 24 * 3600 * 1000).toISOString();

    engState.progress[cardId] = p;
    engSaveProgress();
}

function engIsOverdue(cardId) {
    const p = engState.progress[cardId];
    if (!p || !p.next_review) return false;
    return new Date(p.next_review).getTime() <= Date.now();
}

function engNeverSeen(cardId) {
    const p = engState.progress[cardId];
    return !p || !p.review_count;
}

// ── Helpers ──────────────────────────────────────────────────

function engEscape(s) {
    return typeof escapeHtml === 'function' ? escapeHtml(s) : String(s == null ? '' : s);
}

function engEscapeAttr(s) {
    return typeof escapeAttr === 'function' ? escapeAttr(s) : String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Main entry point ─────────────────────────────────────────

async function renderEnglish(container, subTab) {
    engLoadProgress();
    engLoadFilters();

    const sub = subTab || engGetSubTab('vocab');
    engState.section = sub;
    engSetSubTab(sub);

    container.innerHTML = `
        <div class="page-title">🇬🇧 Anglais</div>
        <div class="page-subtitle">Niveau visé A2 → B1</div>

        <div id="engSubTabs" style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap"></div>

        <div id="engContent"></div>
    `;

    engRenderSubTabs();

    // Lazy-load data (cached on engState.data after first call).
    if (!engState.data) {
        const data = await api('get_english_data');
        engState.data = data || { vocab: [], phrases: [] };
    }

    if (sub === 'vocab')        engRenderVocab();
    else if (sub === 'phrases') engRenderPhrases();
    else if (sub === 'writing') engRenderWriting();
    else                        engRenderVocab();
}

function engRenderSubTabs() {
    const bar = document.getElementById('engSubTabs');
    if (!bar) return;
    const tabs = [
        { id: 'vocab',   icon: '📚', label: 'Vocabulaire' },
        { id: 'phrases', icon: '💬', label: 'Phrases & expressions' },
        { id: 'writing', icon: '✍️', label: 'Écriture' },
    ];
    bar.innerHTML = tabs.map(t => {
        const active = engState.section === t.id;
        return `<button class="btn ${active ? 'btn-primary' : 'btn-outline'}"
            onclick="engSwitchSection('${t.id}')" style="font-size:13px">
            ${t.icon} ${t.label}
        </button>`;
    }).join('');
}

function engSwitchSection(sub) {
    engState.section = sub;
    engSetSubTab(sub);
    engState.currentIdx = 0;
    engState.isFlipped = false;
    engRenderSubTabs();
    if (sub === 'vocab')        engRenderVocab();
    else if (sub === 'phrases') engRenderPhrases();
    else if (sub === 'writing') engRenderWriting();
}

// ════════════════════════════════════════════════════════════
// VOCAB SUB-SECTION
// ════════════════════════════════════════════════════════════

function engRenderVocab() {
    const root = document.getElementById('engContent');
    if (!root) return;
    engState.cardMode = 'vocab';

    root.innerHTML = `
        <div id="engVocabFilters" style="display:flex;gap:8px;align-items:center;
            flex-wrap:wrap;margin-bottom:16px"></div>
        <div id="engVocabMain"></div>
    `;

    engRenderVocabFilters();
    engRebuildCardPool();
    engRenderCard();
}

function engRenderVocabFilters() {
    const bar = document.getElementById('engVocabFilters');
    if (!bar) return;
    const f = engState.filters;

    // Domain pills
    const domainPills = Object.entries(DOMAIN_LABELS).map(([k, d]) => {
        const active = f.domain === k;
        return `<button class="badge" style="cursor:pointer;padding:6px 14px;font-size:12px;
                background:${active ? d.color : 'transparent'};
                color:${active ? '#fff' : d.color};
                border:1px solid ${d.color};transition:all 0.15s"
                onclick="engToggleDomain('${k}')">${d.icon} ${d.label}</button>`;
    }).join('');

    // Level pills
    const levelPills = Object.entries(LEVEL_LABELS).map(([k, l]) => {
        const active = f.level === k;
        return `<button class="badge" style="cursor:pointer;padding:6px 14px;font-size:12px;
                background:${active ? l.color : 'transparent'};
                color:${active ? '#fff' : l.color};
                border:1px solid ${l.color};transition:all 0.15s"
                onclick="engToggleLevel('${k}')">${l.label}</button>`;
    }).join('');

    // Boolean chips
    const neverChip = `<label style="display:inline-flex;align-items:center;gap:6px;
            padding:6px 12px;font-size:12px;border-radius:999px;cursor:pointer;
            background:${f.neverSeen ? 'rgba(59,130,246,.18)' : 'transparent'};
            border:1px solid ${f.neverSeen ? '#3b82f6' : 'var(--border-light)'};
            color:${f.neverSeen ? '#93c5fd' : 'var(--text-secondary)'}">
            <input type="checkbox" ${f.neverSeen ? 'checked' : ''}
                onchange="engSetFilter('neverSeen', this.checked)"
                style="margin:0"> 🆕 Jamais vu</label>`;

    const overdueChip = `<label style="display:inline-flex;align-items:center;gap:6px;
            padding:6px 12px;font-size:12px;border-radius:999px;cursor:pointer;
            background:${f.overdue ? 'rgba(245,158,11,.18)' : 'transparent'};
            border:1px solid ${f.overdue ? '#f59e0b' : 'var(--border-light)'};
            color:${f.overdue ? '#fbbf24' : 'var(--text-secondary)'}">
            <input type="checkbox" ${f.overdue ? 'checked' : ''}
                onchange="engSetFilter('overdue', this.checked)"
                style="margin:0"> 🔴 En retard</label>`;

    bar.innerHTML = `
        <div style="display:flex;gap:6px;flex-wrap:wrap">${domainPills}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <span style="font-size:11px;color:var(--text-muted);margin-right:4px">Niveau :</span>
            ${levelPills}
        </div>
        ${neverChip}
        ${overdueChip}
        ${(f.domain || f.level || f.neverSeen || f.overdue) ? `
            <button class="btn btn-outline" onclick="engResetFilters()"
                style="font-size:12px;padding:5px 10px;color:#fca5a5">↺ Réinit.</button>` : ''}
    `;
}

function engToggleDomain(d) {
    engState.filters.domain = engState.filters.domain === d ? null : d;
    engState.currentIdx = 0; engState.isFlipped = false;
    engSaveFilters();
    engRenderVocabFilters();
    engRebuildCardPool();
    engRenderCard();
}

function engToggleLevel(l) {
    engState.filters.level = engState.filters.level === l ? null : l;
    engState.currentIdx = 0; engState.isFlipped = false;
    engSaveFilters();
    engRenderVocabFilters();
    engRebuildCardPool();
    engRenderCard();
}

function engSetFilter(key, value) {
    engState.filters[key] = value;
    engState.currentIdx = 0; engState.isFlipped = false;
    engSaveFilters();
    engRenderVocabFilters();
    engRebuildCardPool();
    engRenderCard();
}

function engResetFilters() {
    engState.filters = { domain: null, level: null, neverSeen: false, overdue: false };
    engState.currentIdx = 0; engState.isFlipped = false;
    engSaveFilters();
    engRenderVocabFilters();
    engRebuildCardPool();
    engRenderCard();
}

function engRebuildCardPool() {
    const f = engState.filters;
    const source = (engState.data && engState.data.vocab) || [];
    let pool = source.slice();

    if (f.domain)    pool = pool.filter(c => c.domain === f.domain);
    if (f.level)     pool = pool.filter(c => c.level === f.level);
    if (f.neverSeen) pool = pool.filter(c => engNeverSeen(c.id));
    if (f.overdue)   pool = pool.filter(c => engIsOverdue(c.id));

    // Light shuffle so consecutive sessions don't always present in JSON order.
    pool = engShuffle(pool);

    engState.cards = pool;
    engState.cardMode = 'vocab';
}

function engShuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function engRenderCard() {
    const main = document.getElementById('engVocabMain');
    if (!main) return;

    const cards = engState.cards;
    if (!cards.length) {
        main.innerHTML = `
            <div class="card" style="max-width:520px;margin:40px auto;text-align:center;padding:32px">
                <div style="font-size:42px;margin-bottom:10px">📭</div>
                <div style="font-size:18px;font-weight:600;color:var(--text-bright);margin-bottom:8px">
                    Aucune carte dans cette sélection
                </div>
                <div style="font-size:13px;color:var(--text-secondary);margin-bottom:18px">
                    Ajuste les filtres ou clique sur Réinitialiser.
                </div>
                <button class="btn btn-outline" onclick="engResetFilters()">↺ Réinit. filtres</button>
            </div>`;
        return;
    }

    if (engState.currentIdx >= cards.length) {
        engRenderCardEnd(main);
        return;
    }

    const card = cards[engState.currentIdx];
    const isPhrase = engState.cardMode === 'phrases-as-cards';
    const total = cards.length;
    const progress = ((engState.currentIdx + 1) / total) * 100;

    const domain = isPhrase ? null : DOMAIN_LABELS[card.domain];
    const level = LEVEL_LABELS[card.level];
    const mastery = engState.progress[card.id];
    const masteryK = (mastery && mastery.mastery) || 'not_started';
    const m = MASTERY_COLORS[masteryK] || MASTERY_COLORS.not_started;

    const domainBadge = isPhrase
        ? `<span class="badge" style="background:#1e3a5f;color:#93c5fd;border:1px solid #3b82f6">
            ${PHRASE_CATEGORIES[card.category]?.icon || '💬'} ${engEscape(PHRASE_CATEGORIES[card.category]?.label || card.category)}</span>`
        : (domain ? `<span class="badge" style="background:${domain.color};color:#fff">
            ${domain.icon} ${engEscape(domain.label)}</span>` : '');

    const levelBadge = level
        ? `<span class="badge" style="background:transparent;color:${level.color};
            border:1px solid ${level.color}">${level.label}</span>` : '';

    const masteryBadge = `<span class="badge" style="background:${m.bg};color:${m.fg};font-size:11px">
        ${m.label}</span>`;

    // FRONT (FR) and BACK (EN) — single-card layout, click to flip.
    const examplesHtml = (card.examples && card.examples.length > 0) ? `
        <div class="eng-card-examples">
            ${card.examples.map(ex => `
                <div style="margin-bottom:8px">
                    <div class="eng-card-examples-fr">${engEscape(ex.fr)}</div>
                    <div class="eng-card-examples-en">${engEscape(ex.en)}</div>
                </div>
            `).join('')}
        </div>` : '';

    const notesHtml = card.notes
        ? `<div class="eng-card-notes">💡 ${engEscape(card.notes)}</div>` : '';

    const ipaHtml = card.ipa
        ? `<div class="eng-card-ipa">/${engEscape(card.ipa)}/</div>` : '';

    const contextHtml = card.context
        ? `<div class="eng-card-notes">${engEscape(card.context)}</div>` : '';

    main.innerHTML = `
        <!-- Progress -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;
            max-width:720px;margin-left:auto;margin-right:auto">
            <span style="font-size:13px;color:var(--text-secondary);font-weight:600;white-space:nowrap">
                ${engState.currentIdx + 1} / ${total}
            </span>
            <div class="progress-bar" style="flex:1">
                <div class="progress-fill" style="width:${progress}%"></div>
            </div>
            ${masteryBadge}
        </div>

        <!-- Card -->
        <div class="flashcard-container" onclick="engFlip()" style="cursor:pointer">
            <div class="flashcard ${engState.isFlipped ? 'flipped' : ''}" id="engCard">
                <!-- Front (FR) -->
                <div class="flashcard-face flashcard-front eng-card-front">
                    <div style="display:flex;justify-content:space-between;width:100%;
                        align-items:center;margin-bottom:14px">
                        <div style="display:flex;gap:6px;flex-wrap:wrap">${domainBadge} ${levelBadge}</div>
                    </div>
                    <div class="eng-card-fr">${engEscape(card.fr)}</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:14px">
                        Cliquer ou Espace pour retourner
                    </div>
                </div>
                <!-- Back (EN) -->
                <div class="flashcard-face flashcard-back eng-card-back">
                    <div style="display:flex;justify-content:space-between;width:100%;
                        align-items:center;margin-bottom:14px">
                        <div style="display:flex;gap:6px;flex-wrap:wrap">${domainBadge} ${levelBadge}</div>
                    </div>
                    <div class="eng-card-en">${engEscape(card.en)}</div>
                    ${ipaHtml}
                    ${notesHtml}
                    ${contextHtml}
                    ${examplesHtml}
                </div>
            </div>
        </div>

        <!-- Rating buttons (visible after flip) -->
        <div id="engRateBtns" style="max-width:720px;margin:16px auto 0;
            display:${engState.isFlipped ? 'flex' : 'none'};justify-content:center;
            gap:8px;flex-wrap:wrap">
            <button class="btn" title="Raccourci : 1"
                style="background:#7f1d1d;color:#fca5a5;padding:10px 18px;font-size:13px;min-width:110px"
                onclick="event.stopPropagation();engRate(0)">
                ✗ Again<br><span style="font-size:10px;opacity:0.8">oublié</span>
            </button>
            <button class="btn" title="Raccourci : 2"
                style="background:#78350f;color:#fdba74;padding:10px 18px;font-size:13px;min-width:110px"
                onclick="event.stopPropagation();engRate(1)">
                ~ Hard<br><span style="font-size:10px;opacity:0.8">difficile</span>
            </button>
            <button class="btn" title="Raccourci : 3"
                style="background:#14532d;color:#86efac;padding:10px 18px;font-size:13px;min-width:110px"
                onclick="event.stopPropagation();engRate(2)">
                ✓ Good<br><span style="font-size:10px;opacity:0.8">normal</span>
            </button>
            <button class="btn" title="Raccourci : 4"
                style="background:#1e3a8a;color:#93c5fd;padding:10px 18px;font-size:13px;min-width:110px"
                onclick="event.stopPropagation();engRate(3)">
                ⚡ Easy<br><span style="font-size:10px;opacity:0.8">trivial</span>
            </button>
        </div>

        <!-- Navigation -->
        <div style="display:flex;justify-content:center;gap:8px;margin-top:12px;
            max-width:720px;margin-left:auto;margin-right:auto">
            <button class="btn btn-outline" onclick="engPrev()"
                ${engState.currentIdx === 0 ? 'disabled style="opacity:0.4;pointer-events:none"' : ''}>
                ← Précédent
            </button>
            <button class="btn btn-outline" onclick="engSkip()">Passer →</button>
        </div>
    `;
}

function engFlip() {
    engState.isFlipped = !engState.isFlipped;
    const cardEl = document.getElementById('engCard');
    if (cardEl) cardEl.classList.toggle('flipped', engState.isFlipped);
    const btns = document.getElementById('engRateBtns');
    if (btns) btns.style.display = engState.isFlipped ? 'flex' : 'none';
}

async function engRate(rating) {
    const card = engState.cards[engState.currentIdx];
    if (!card) return;
    rating = Math.max(0, Math.min(3, parseInt(rating, 10) || 0));

    engUpdateProgress(card.id, rating);

    // Best-effort backend sync — non-blocking. The backend may no-op if the table
    // doesn't exist yet, which is fine; we already persisted to localStorage.
    try { api('record_english_attempt', card.id, rating); } catch (_) {}

    // Tiny visual cue.
    const cardEl = document.querySelector('.flashcard');
    if (cardEl) {
        cardEl.classList.remove('fc-correct', 'fc-wrong');
        void cardEl.offsetWidth;
        cardEl.classList.add(rating > 0 ? 'fc-correct' : 'fc-wrong');
        setTimeout(() => cardEl.classList.remove('fc-correct', 'fc-wrong'), 350);
    }

    setTimeout(() => {
        engState.currentIdx++;
        engState.isFlipped = false;
        engRenderCard();
    }, 180);
}

function engPrev() {
    if (engState.currentIdx > 0) {
        engState.currentIdx--;
        engState.isFlipped = false;
        engRenderCard();
    }
}

function engSkip() {
    engState.currentIdx++;
    engState.isFlipped = false;
    engRenderCard();
}

function engRenderCardEnd(main) {
    const total = engState.cards.length;
    main.innerHTML = `
        <div class="card" style="max-width:520px;margin:40px auto;text-align:center;padding:32px">
            <div style="font-size:48px;margin-bottom:12px">🎉</div>
            <div style="font-size:22px;font-weight:700;color:var(--text-bright);margin-bottom:8px">
                Toutes les cartes vues !
            </div>
            <div style="font-size:14px;color:var(--text-secondary);margin-bottom:24px">
                ${total} cartes parcourues dans cette sélection.
            </div>
            <div style="display:flex;gap:8px;justify-content:center">
                <button class="btn btn-primary" onclick="engRestartPool()">Recommencer</button>
                <button class="btn btn-outline" onclick="engResetFilters()">Changer de sélection</button>
            </div>
        </div>
    `;
}

function engRestartPool() {
    engState.currentIdx = 0;
    engState.isFlipped = false;
    engRebuildCardPool();
    engRenderCard();
}

// ════════════════════════════════════════════════════════════
// PHRASES SUB-SECTION
// ════════════════════════════════════════════════════════════

function engRenderPhrases() {
    const root = document.getElementById('engContent');
    if (!root) return;
    const phrases = (engState.data && engState.data.phrases) || [];

    // Build the list of category counts (only categories that actually have phrases).
    const counts = {};
    phrases.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });

    const f = engState.phrasesFilters;

    const catChips = Object.keys(counts).map(k => {
        const meta = PHRASE_CATEGORIES[k] || { icon: '•', label: k };
        const active = f.category === k;
        return `<button class="badge" style="cursor:pointer;padding:6px 12px;font-size:12px;
                background:${active ? '#3b82f6' : 'transparent'};
                color:${active ? '#fff' : '#3b82f6'};
                border:1px solid #3b82f6"
                onclick="engTogglePhraseCat('${k}')">
                ${meta.icon} ${engEscape(meta.label)} (${counts[k]})</button>`;
    }).join('');

    root.innerHTML = `
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
            <button class="btn btn-outline" onclick="engPhrasesAsFlashcards()"
                style="font-size:12px;padding:6px 12px">🃏 Réviser comme flashcards</button>
            <input id="engPhraseSearch" type="text" placeholder="Rechercher..."
                value="${engEscapeAttr(f.search)}"
                oninput="engSetPhraseSearch(this.value)"
                style="background:var(--bg-tertiary);color:var(--text-bright);
                border:1px solid var(--border-light);border-radius:8px;padding:6px 12px;
                font-size:12px;width:220px;margin-left:auto">
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">${catChips}
            ${(f.category || f.search) ? `
                <button class="btn btn-outline" onclick="engResetPhraseFilters()"
                    style="font-size:12px;padding:5px 10px;color:#fca5a5">↺ Réinit.</button>` : ''}
        </div>
        <div id="engPhraseList"></div>
    `;

    engRenderPhraseList();
}

function engRenderPhraseList() {
    const list = document.getElementById('engPhraseList');
    if (!list) return;
    const phrases = (engState.data && engState.data.phrases) || [];
    const f = engState.phrasesFilters;
    const q = (f.search || '').trim().toLowerCase();

    let filtered = phrases;
    if (f.category) filtered = filtered.filter(p => p.category === f.category);
    if (q) {
        filtered = filtered.filter(p =>
            (p.fr && p.fr.toLowerCase().includes(q)) ||
            (p.en && p.en.toLowerCase().includes(q)) ||
            (p.context && p.context.toLowerCase().includes(q))
        );
    }

    if (!filtered.length) {
        list.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);
            font-size:14px">Aucune phrase ne correspond à ces filtres.</div>`;
        return;
    }

    list.innerHTML = filtered.map(p => {
        const meta = PHRASE_CATEGORIES[p.category] || { icon: '•', label: p.category };
        const lvl = LEVEL_LABELS[p.level] || { label: p.level || '', color: '#64748b' };
        const expanded = engState.expandedPhrase === p.id;
        return `
            <div class="eng-phrase-row ${expanded ? 'expanded' : ''}"
                onclick="engTogglePhrase('${engEscapeAttr(p.id)}')">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
                    <div class="eng-phrase-fr">${engEscape(p.fr)}</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0">
                        <span class="badge" style="background:#1e3a5f;color:#93c5fd;
                            border:1px solid #3b82f6;font-size:11px">${meta.icon} ${engEscape(meta.label)}</span>
                        <span class="badge" style="background:transparent;color:${lvl.color};
                            border:1px solid ${lvl.color};font-size:11px">${lvl.label}</span>
                    </div>
                </div>
                ${expanded ? `
                    <div class="eng-phrase-en">${engEscape(p.en)}</div>
                    ${p.context ? `<div class="eng-phrase-ctx">📖 ${engEscape(p.context)}</div>` : ''}
                ` : ''}
            </div>
        `;
    }).join('');
}

function engTogglePhrase(id) {
    engState.expandedPhrase = engState.expandedPhrase === id ? null : id;
    engRenderPhraseList();
}

function engTogglePhraseCat(c) {
    engState.phrasesFilters.category = engState.phrasesFilters.category === c ? null : c;
    engSaveFilters();
    engRenderPhrases();
}

function engSetPhraseSearch(v) {
    engState.phrasesFilters.search = v || '';
    engSaveFilters();
    engRenderPhraseList();
}

function engResetPhraseFilters() {
    engState.phrasesFilters = { category: null, search: '' };
    engSaveFilters();
    engRenderPhrases();
}

// "Réviser comme flashcards" : reuse the vocab card UI but feed it phrases.
function engPhrasesAsFlashcards() {
    const phrases = (engState.data && engState.data.phrases) || [];
    let pool = phrases.slice();
    const f = engState.phrasesFilters;
    if (f.category) pool = pool.filter(p => p.category === f.category);

    if (!pool.length) {
        alert('Aucune phrase à réviser dans cette sélection.');
        return;
    }

    // Switch to the vocab tab UI but feed the phrases pool.
    engState.section = 'vocab';
    engSetSubTab('vocab');
    engRenderSubTabs();

    const root = document.getElementById('engContent');
    if (!root) return;
    root.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <button class="btn btn-outline" onclick="engSwitchSection('phrases')"
                style="font-size:12px;padding:5px 12px">← Retour aux phrases</button>
            <span style="font-size:13px;color:var(--text-secondary)">
                Mode flashcards (${pool.length} phrases${f.category
                    ? ' · ' + (PHRASE_CATEGORIES[f.category]?.label || f.category) : ''})
            </span>
        </div>
        <div id="engVocabMain"></div>
    `;

    engState.cards = engShuffle(pool);
    engState.cardMode = 'phrases-as-cards';
    engState.currentIdx = 0;
    engState.isFlipped = false;
    engRenderCard();
}

// ════════════════════════════════════════════════════════════
// WRITING SUB-SECTION (LanguageTool)
// ════════════════════════════════════════════════════════════

function engRenderWriting() {
    const root = document.getElementById('engContent');
    if (!root) return;

    root.innerHTML = `
        <div style="max-width:760px;margin:0 auto">
            <div style="font-size:18px;font-weight:600;color:var(--text-bright);margin-bottom:6px">
                Corrigeur de texte anglais
            </div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">
                Écris ton texte en anglais et clique sur Corriger.
                Souligné rouge = erreur — clic pour voir les suggestions.
            </div>

            <textarea id="engWriteArea" rows="8"
                placeholder="Écris ton texte en anglais ici..."
                oninput="engUpdateWordCount()"
                style="width:100%;background:var(--bg-tertiary);color:var(--text-bright);
                border:1px solid var(--border-light);border-radius:8px;padding:12px 14px;
                font-size:14px;line-height:1.6;resize:vertical;font-family:inherit"
            >${engEscape(engState.writing.text)}</textarea>

            <div style="display:flex;justify-content:space-between;align-items:center;
                margin-top:8px;gap:10px;flex-wrap:wrap">
                <div id="engWordCount" style="font-size:12px;color:var(--text-muted)">0 mots</div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-outline" onclick="engClearWriting()"
                        style="font-size:13px;padding:8px 14px">Effacer</button>
                    <button class="btn btn-primary" id="engCheckBtn"
                        onclick="engCheckText()" style="font-size:13px;padding:8px 16px">
                        ✓ Corriger
                    </button>
                </div>
            </div>

            <div id="engWritingResult" style="margin-top:20px"></div>
        </div>
    `;

    engUpdateWordCount();
    if (engState.writing.result) engRenderWritingResult();
}

function engUpdateWordCount() {
    const ta = document.getElementById('engWriteArea');
    const counter = document.getElementById('engWordCount');
    if (!ta || !counter) return;
    engState.writing.text = ta.value;
    const words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
    const chars = ta.value.length;
    counter.textContent = `${words} mot${words > 1 ? 's' : ''} · ${chars} caractère${chars > 1 ? 's' : ''}`;
}

function engClearWriting() {
    engState.writing.text = '';
    engState.writing.result = null;
    const ta = document.getElementById('engWriteArea');
    if (ta) ta.value = '';
    engRenderWriting();
}

async function engCheckText() {
    const ta = document.getElementById('engWriteArea');
    if (!ta) return;
    const text = (ta.value || '').trim();
    if (!text) {
        alert('Écris d\'abord un texte à corriger.');
        return;
    }

    engState.writing.text = ta.value;
    engState.writing.loading = true;

    const btn = document.getElementById('engCheckBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Correction en cours...';
    }

    const result = await api('check_english_text', text);
    engState.writing.loading = false;
    engState.writing.result = result || { error: 'no_response' };

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '✓ Corriger';
    }

    engRenderWritingResult();
}

function engRenderWritingResult() {
    const root = document.getElementById('engWritingResult');
    if (!root) return;
    const r = engState.writing.result;
    if (!r) { root.innerHTML = ''; return; }

    if (r.error) {
        root.innerHTML = `
            <div style="background:#7f1d1d22;border:1px solid #7f1d1d;border-radius:10px;
                padding:14px 16px;color:#fca5a5;font-size:13px">
                ⚠️ Service de correction temporairement indisponible.
                Réessaye dans un instant.
                <div style="margin-top:8px">
                    <button class="btn btn-outline" onclick="engCheckText()"
                        style="font-size:12px;padding:5px 12px">↻ Réessayer</button>
                </div>
            </div>`;
        return;
    }

    const matches = (r.matches || []).filter(m =>
        typeof m.offset === 'number' && typeof m.length === 'number' && m.length > 0);

    if (!matches.length) {
        root.innerHTML = `
            <div style="background:#14532d22;border:1px solid #14532d;border-radius:10px;
                padding:14px 16px;color:#86efac;font-size:13px">
                ✓ Aucune erreur détectée. Beau travail !
            </div>`;
        return;
    }

    // Build annotated HTML : sort matches by offset, then walk through the text.
    const text = engState.writing.text || '';
    const sorted = matches.slice().sort((a, b) => a.offset - b.offset);
    let html = '';
    let cursor = 0;
    sorted.forEach((m, i) => {
        if (m.offset < cursor) return;          // overlapping match — skip
        if (m.offset > cursor) html += engEscape(text.substring(cursor, m.offset));
        const slice = text.substring(m.offset, m.offset + m.length);
        const sugg = (m.replacements || []).slice(0, 6).map(r =>
            typeof r === 'string' ? r : (r && r.value) || '').filter(Boolean);
        html += `<span class="eng-correction-mark" data-idx="${i}"
            data-offset="${m.offset}" data-length="${m.length}"
            data-message="${engEscapeAttr(m.message || '')}"
            data-suggestions="${engEscapeAttr(JSON.stringify(sugg))}"
            onclick="engShowCorrection(event, ${i})">${engEscape(slice)}</span>`;
        cursor = m.offset + m.length;
    });
    if (cursor < text.length) html += engEscape(text.substring(cursor));

    root.innerHTML = `
        <div style="background:var(--bg-secondary);border:1px solid var(--border);
            border-radius:10px;padding:14px 16px;margin-bottom:12px;font-size:13px;
            color:var(--text-secondary)">
            ${matches.length} erreur${matches.length > 1 ? 's' : ''} trouvée${matches.length > 1 ? 's' : ''}
            — clique sur un mot souligné pour voir les suggestions.
        </div>
        <div id="engCorrectedText" style="background:var(--bg-tertiary);
            border:1px solid var(--border-light);border-radius:8px;padding:14px 16px;
            font-size:14px;line-height:1.8;color:var(--text-bright);white-space:pre-wrap">${html}</div>
    `;
}

function engShowCorrection(event, idx) {
    event.stopPropagation();
    engClosePopover();

    const r = engState.writing.result;
    if (!r || !r.matches) return;
    const m = r.matches[idx];
    if (!m) return;

    const sugg = (m.replacements || []).slice(0, 6).map(s =>
        typeof s === 'string' ? s : (s && s.value) || '').filter(Boolean);

    const pop = document.createElement('div');
    pop.className = 'eng-popover';
    pop.id = 'engPopover';
    pop.dataset.matchIdx = String(idx);

    const suggHtml = sugg.length
        ? sugg.map((s, i) =>
            `<span class="eng-popover-sugg" onclick="engApplySuggestion(${idx}, ${i})">${engEscape(s)}</span>`
          ).join('')
        : `<span style="color:var(--text-muted);font-size:12px">Pas de suggestion</span>`;

    pop.innerHTML = `
        <div class="eng-popover-msg">${engEscape(m.message || 'Erreur détectée')}</div>
        <div>${suggHtml}</div>
    `;

    document.body.appendChild(pop);

    // Position the popover near the clicked span.
    const rect = event.target.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 6;
    let left = rect.left + window.scrollX;
    // Keep it on screen
    const maxLeft = window.scrollX + window.innerWidth - 340;
    if (left > maxLeft) left = maxLeft;
    if (left < 8) left = 8;
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';

    // Stash suggestions on popover for the apply step.
    pop._suggestions = sugg;
}

function engApplySuggestion(matchIdx, suggIdx) {
    const r = engState.writing.result;
    if (!r || !r.matches) return;
    const m = r.matches[matchIdx];
    if (!m) return;
    const pop = document.getElementById('engPopover');
    const sugg = pop && pop._suggestions ? pop._suggestions[suggIdx] : null;
    if (sugg == null) return;

    const text = engState.writing.text || '';
    const before = text.substring(0, m.offset);
    const after = text.substring(m.offset + m.length);
    const newText = before + sugg + after;

    engState.writing.text = newText;
    const ta = document.getElementById('engWriteArea');
    if (ta) ta.value = newText;

    // Stale result : drop it; the user must re-run a check after applying fixes.
    engState.writing.result = null;
    engClosePopover();
    engRenderWriting();
}

function engClosePopover() {
    const pop = document.getElementById('engPopover');
    if (pop) pop.remove();
}

// ════════════════════════════════════════════════════════════
// GLOBAL KEY HANDLER (only when english tab is active)
// ════════════════════════════════════════════════════════════

function engIsActive() {
    return typeof currentTab !== 'undefined' && currentTab === 'english';
}

document.addEventListener('keydown', (e) => {
    if (!engIsActive()) return;

    // Esc closes any popover regardless of section.
    if (e.key === 'Escape') {
        engClosePopover();
        return;
    }

    // Don't steal keystrokes from text inputs.
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

    // Vocab-only shortcuts.
    if (engState.section !== 'vocab') return;

    const card = document.getElementById('engCard');
    if (!card) return;

    if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        engFlip();
        return;
    }
    if (e.key === 'ArrowLeft') { e.preventDefault(); engPrev(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); engSkip(); return; }

    if (engState.isFlipped) {
        if (e.key === '1') { e.preventDefault(); engRate(0); }
        else if (e.key === '2') { e.preventDefault(); engRate(1); }
        else if (e.key === '3') { e.preventDefault(); engRate(2); }
        else if (e.key === '4') { e.preventDefault(); engRate(3); }
    }
});

// Click outside the popover closes it (catch on body to also handle clicks on
// the underlined text — engShowCorrection already stops propagation there).
document.addEventListener('click', (e) => {
    if (!engIsActive()) return;
    const pop = document.getElementById('engPopover');
    if (!pop) return;
    if (pop.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.eng-correction-mark')) return;
    engClosePopover();
});

// Expose entry point + handlers used by inline onclick.
window.renderEnglish = renderEnglish;
window.engSwitchSection = engSwitchSection;
window.engToggleDomain = engToggleDomain;
window.engToggleLevel = engToggleLevel;
window.engSetFilter = engSetFilter;
window.engResetFilters = engResetFilters;
window.engFlip = engFlip;
window.engRate = engRate;
window.engPrev = engPrev;
window.engSkip = engSkip;
window.engRestartPool = engRestartPool;
window.engTogglePhrase = engTogglePhrase;
window.engTogglePhraseCat = engTogglePhraseCat;
window.engSetPhraseSearch = engSetPhraseSearch;
window.engResetPhraseFilters = engResetPhraseFilters;
window.engPhrasesAsFlashcards = engPhrasesAsFlashcards;
window.engUpdateWordCount = engUpdateWordCount;
window.engClearWriting = engClearWriting;
window.engCheckText = engCheckText;
window.engShowCorrection = engShowCorrection;
window.engApplySuggestion = engApplySuggestion;
