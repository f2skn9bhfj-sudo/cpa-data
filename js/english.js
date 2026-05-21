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
        domain: null,            // 'audit' | 'ifrs' | 'business' | 'daily' | null
        level:  null,            // 'A2' | 'B1' | 'B2' | null
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
    audio: {
        voice: 'en-GB',          // 'en-GB' | 'en-US'
        autoplay: false,         // speak EN automatically when card is flipped to back
        rate: 0.95,              // slightly slowed for non-native ears
    },
    constructor: {
        view: 'list',            // 'list' | 'exercise'
        category: null,
        currentPatternId: null,
        currentExampleIdx: 0,
        userAnswer: '',
        checked: false,          // has the user submitted yet?
        score: { total: 0, correct: 0 },
    },
    videos: {
        theme: null,             // filter by VIDEO_THEMES key
        watched: {},             // { id: true } — persisted to localStorage
    },
    conversations: {
        view: 'list',            // 'list' | 'play'
        currentConvId: null,
        turnIdx: 0,
        choiceIdx: null,         // user's choice for the current turn
        history: [],             // [{turnIdx, choiceIdx, correct}, ...]
    },
    essentials: {
        done: {},                // { id: true } — persisted to localStorage
        collapsed: {},           // { group: true } — UI fold state
    },
    dictation: {
        source: 'phrases',       // 'vocab' | 'phrases' | 'essentials' | 'mixed'
        currentItem: null,       // {id, en, fr, kind} or null
        userInput: '',
        checked: false,
        result: null,            // 'exact' | 'close' | 'wrong'
        score: { correct: 0, close: 0, total: 0 },
        seenIds: {},             // avoid repeating in same session
    },
};

// ── Constants ────────────────────────────────────────────────

const ENG_LS_SUBTAB   = 'swisscpa_eng_subtab';
const ENG_LS_PROGRESS = 'swisscpa_eng_progress';
const ENG_LS_FILTERS  = 'swisscpa_eng_filters';
const ENG_LS_AUDIO    = 'swisscpa_eng_audio';

const DOMAIN_LABELS = {
    audit:    { icon: '📊', label: 'Audit / ISA',      color: '#3b82f6' },
    ifrs:     { icon: '📘', label: 'IFRS',             color: '#0ea5e9' },
    business: { icon: '💼', label: 'Big 4 / Business', color: '#8b5cf6' },
    daily:    { icon: '🌍', label: 'Vie courante',     color: '#10b981' },
};

const PHRASE_CATEGORIES = {
    email_opening:  { icon: '✉️', label: 'Ouverture email'  },
    email_closing:  { icon: '📩', label: 'Clôture email'    },
    meeting:        { icon: '🗓️', label: 'Réunion'          },
    idiom:          { icon: '💬', label: 'Idiomes'           },
    transition:     { icon: '🔗', label: 'Transitions'       },
    politeness:     { icon: '🙏', label: 'Politesse'         },
    client_request: { icon: '📋', label: 'Demande client'    },
    escalation:     { icon: '🚨', label: 'Escalade'          },
    pushback:       { icon: '🛡️', label: 'Push-back poli'    },
    clarification:  { icon: '❓', label: 'Clarification'     },
    audit_specific: { icon: '🔍', label: 'Audit terrain'     },
    status_update:  { icon: '📊', label: 'Point avancement'  },
};

const PATTERN_CATEGORIES = {
    audit_findings:         { icon: '🔍', label: 'Constatations audit' },
    audit_questions:        { icon: '❓', label: 'Questions client'    },
    email_pro:              { icon: '✉️', label: 'Email pro'           },
    meeting:                { icon: '🗓️', label: 'Réunion'             },
    ifrs_explanations:      { icon: '📘', label: 'Explications IFRS'   },
    client_communication:   { icon: '💬', label: 'Communication client'},
    decline:                { icon: '🛑', label: 'Décliner'            },
    negotiate:              { icon: '⚖️', label: 'Négocier'            },
    defend_position:        { icon: '🛡️', label: 'Défendre position'   },
    request_delay:          { icon: '⏳', label: 'Demander délai'      },
    express_caution:        { icon: '⚠️', label: 'Exprimer prudence'   },
    acknowledge_constraint: { icon: '🤝', label: 'Reconnaître contraintes' },
};

const VIDEO_THEMES = {
    channels:         { icon: '📺', label: 'Chaînes officielles' },
    ifrs_standards:   { icon: '📘', label: 'Normes IFRS'         },
    audit:            { icon: '🔍', label: 'Audit / ISA'         },
    business_english: { icon: '💼', label: 'Business English'    },
};

const ENG_LS_VIDEOS = 'swisscpa_eng_videos_watched';
const ENG_LS_ESSENTIALS = 'swisscpa_eng_essentials_done';

const ESSENTIAL_GROUPS = {
    survival:   { icon: '🆘', label: 'Survie semaine 1', color: '#ef4444' },
    meetings:   { icon: '🗓️', label: 'Réunions', color: '#3b82f6' },
    email:      { icon: '✉️', label: 'Email pro', color: '#8b5cf6' },
    fieldwork:  { icon: '🔍', label: 'Audit terrain', color: '#10b981' },
    self:       { icon: '🧭', label: 'Self-management', color: '#f59e0b' },
};

const LEVEL_LABELS = {
    A2: { label: 'A2', color: '#10b981' },
    B1: { label: 'B1', color: '#f59e0b' },
    B2: { label: 'B2', color: '#ef4444' },
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

// ── Audio (TTS via Web Speech API) ───────────────────────────

function engLoadAudio() {
    try {
        const raw = localStorage.getItem(ENG_LS_AUDIO);
        if (!raw) return;
        const a = JSON.parse(raw);
        if (a && typeof a === 'object') {
            engState.audio = Object.assign(engState.audio, a);
        }
    } catch (_) {}
}

function engSaveAudio() {
    try { localStorage.setItem(ENG_LS_AUDIO, JSON.stringify(engState.audio)); }
    catch (_) {}
}

// Cache available English voices once the synthesis is ready.
let _engVoicesCache = null;
function engGetEnglishVoices() {
    if (!('speechSynthesis' in window)) return [];
    if (_engVoicesCache) return _engVoicesCache;
    const voices = window.speechSynthesis.getVoices() || [];
    _engVoicesCache = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
    return _engVoicesCache;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    // Some browsers populate voices asynchronously.
    window.speechSynthesis.onvoiceschanged = () => { _engVoicesCache = null; };
}

function engPickVoice(lang) {
    const wanted = (lang || engState.audio.voice || 'en-GB').toLowerCase();
    const voices = engGetEnglishVoices();
    // Exact match first
    let v = voices.find(v => v.lang && v.lang.toLowerCase() === wanted);
    if (v) return v;
    // Same major language (en-*)
    v = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(wanted.split('-')[0]));
    if (v) return v;
    return voices[0] || null;
}

function engSpeak(text) {
    if (!('speechSynthesis' in window)) {
        // Soft fallback — show a toast or just log; the UI will show no error.
        console.warn('[english] SpeechSynthesis not available in this browser.');
        return;
    }
    if (!text || typeof text !== 'string') return;
    try {
        window.speechSynthesis.cancel();           // stop any current speech
        const u = new SpeechSynthesisUtterance(text);
        const v = engPickVoice(engState.audio.voice);
        if (v) u.voice = v;
        u.lang = engState.audio.voice || 'en-GB';
        u.rate = engState.audio.rate || 0.95;
        u.pitch = 1.0;
        window.speechSynthesis.speak(u);
    } catch (e) {
        console.warn('[english] speak failed:', e);
    }
}

function engSpeakCard(id) {
    const c = (engState.data && engState.data.vocab || []).find(v => v.id === id)
           || (engState.data && engState.data.phrases || []).find(p => p.id === id);
    if (c) engSpeak(c.en);
}

function engSpeakPhrase(id) {
    const p = (engState.data && engState.data.phrases || []).find(p => p.id === id);
    if (p) engSpeak(p.en);
}

// Tiny HTML helper for speaker buttons.
function engSpeakerBtnHtml(id, opts) {
    opts = opts || {};
    const title = opts.title || 'Écouter (TTS)';
    const size = opts.size || 'md'; // sm | md
    const padding = size === 'sm' ? '4px 8px' : '6px 10px';
    const fontSize = size === 'sm' ? '13px' : '15px';
    return `<button class="eng-speak-btn" title="${engEscapeAttr(title)}"
        onclick="event.stopPropagation();engSpeakCard('${engEscapeAttr(id)}')"
        style="background:transparent;border:1px solid var(--border-light);
        border-radius:8px;padding:${padding};font-size:${fontSize};cursor:pointer;
        color:#93c5fd;line-height:1">🔊</button>`;
}

function engToggleAudioAutoplay() {
    engState.audio.autoplay = !engState.audio.autoplay;
    engSaveAudio();
    // Re-render the audio bar to reflect toggle state
    const bar = document.getElementById('engAudioBar');
    if (bar) engRenderAudioBar();
}

function engSetAudioVoice(v) {
    engState.audio.voice = v;
    engSaveAudio();
    const bar = document.getElementById('engAudioBar');
    if (bar) engRenderAudioBar();
}

function engSetAudioRate(rate) {
    engState.audio.rate = parseFloat(rate);
    engSaveAudio();
    const bar = document.getElementById('engAudioBar');
    if (bar) engRenderAudioBar();
}

function engRenderAudioBar() {
    const bar = document.getElementById('engAudioBar');
    if (!bar) return;
    const a = engState.audio;
    const supported = 'speechSynthesis' in window;

    if (!supported) {
        bar.innerHTML = `<div style="font-size:11px;color:var(--text-muted);font-style:italic">
            🔇 Synthèse vocale non disponible dans ce navigateur.
        </div>`;
        return;
    }

    const voiceBtn = (val, label) => {
        const active = a.voice === val;
        return `<button onclick="engSetAudioVoice('${val}')"
            style="font-size:11px;padding:4px 9px;border-radius:999px;cursor:pointer;
            background:${active ? '#1e3a5f' : 'transparent'};
            color:${active ? '#93c5fd' : 'var(--text-secondary)'};
            border:1px solid ${active ? '#3b82f6' : 'var(--border-light)'}">
            ${engEscape(label)}</button>`;
    };

    const rateBtn = (val, label) => {
        const active = Math.abs(a.rate - val) < 0.01;
        return `<button onclick="engSetAudioRate(${val})"
            style="font-size:11px;padding:4px 9px;border-radius:999px;cursor:pointer;
            background:${active ? '#14532d' : 'transparent'};
            color:${active ? '#86efac' : 'var(--text-secondary)'};
            border:1px solid ${active ? '#10b981' : 'var(--border-light)'}">
            ${engEscape(label)}</button>`;
    };

    bar.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:11px;
            color:var(--text-muted);padding:8px 12px;background:var(--bg-tertiary);
            border:1px solid var(--border-light);border-radius:10px;margin-bottom:14px">
            <span>🔊 Audio :</span>
            <div style="display:flex;gap:5px">${voiceBtn('en-GB', '🇬🇧 UK')}${voiceBtn('en-US', '🇺🇸 US')}</div>
            <span style="margin-left:6px">Vitesse :</span>
            <div style="display:flex;gap:5px">
                ${rateBtn(0.75, '0.75×')}${rateBtn(0.95, '1×')}${rateBtn(1.15, '1.15×')}
            </div>
            <label style="display:inline-flex;align-items:center;gap:5px;margin-left:auto;cursor:pointer">
                <input type="checkbox" ${a.autoplay ? 'checked' : ''}
                    onchange="engToggleAudioAutoplay()" style="margin:0">
                <span>Auto-play au retournement</span>
            </label>
        </div>
    `;
}

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
    engLoadAudio();

    const sub = subTab || engGetSubTab('vocab');
    engState.section = sub;
    engSetSubTab(sub);

    container.innerHTML = `
        <div class="page-title">🇬🇧 Anglais</div>
        <div class="page-subtitle" id="engSubtitle">Niveau visé A2 → B2</div>

        <div id="engAudioBar"></div>
        <div id="engSubTabs" style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap"></div>

        <div id="engContent"></div>
    `;

    engRenderAudioBar();
    engRenderSubTabs();

    // Lazy-load data (cached on engState.data after first call).
    if (!engState.data) {
        const data = await api('get_english_data');
        engState.data = data || { vocab: [], phrases: [] };
    }

    // Once data is loaded, enrich the subtitle with counts.
    const subtitleEl = document.getElementById('engSubtitle');
    if (subtitleEl) {
        const nv  = (engState.data.vocab || []).length;
        const np  = (engState.data.phrases || []).length;
        const npa = (engState.data.patterns || []).length;
        const nvi = (engState.data.videos || []).length;
        const nc  = (engState.data.conversations || []).length;
        const ne  = (engState.data.essentials || []).length;
        subtitleEl.textContent = `A2→B2 · ${ne} essentiels · ${nv} mots · ${np} phrases · ${npa} patterns · ${nc} conversations · ${nvi} vidéos`;
    }

    if (sub === 'essentials')         engRenderEssentials();
    else if (sub === 'vocab')         engRenderVocab();
    else if (sub === 'phrases')       engRenderPhrases();
    else if (sub === 'constructor')   engRenderConstructor();
    else if (sub === 'dictation')     engRenderDictation();
    else if (sub === 'conversations') engRenderConversations();
    else if (sub === 'videos')        engRenderVideos();
    else if (sub === 'writing')       engRenderWriting();
    else                            engRenderVocab();
}

function engRenderSubTabs() {
    const bar = document.getElementById('engSubTabs');
    if (!bar) return;
    const tabs = [
        { id: 'essentials',    icon: '🎯', label: 'Day-1 EY'              },
        { id: 'vocab',         icon: '📚', label: 'Vocabulaire'          },
        { id: 'phrases',       icon: '💬', label: 'Phrases & expressions'},
        { id: 'constructor',   icon: '🏗️', label: 'Constructeur'         },
        { id: 'dictation',     icon: '🎧', label: 'Dictée'                },
        { id: 'conversations', icon: '🎙️', label: 'Conversations'        },
        { id: 'videos',        icon: '🎬', label: 'Vidéos YouTube'       },
        { id: 'writing',       icon: '✍️', label: 'Écriture'             },
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
    if (sub === 'essentials')         engRenderEssentials();
    else if (sub === 'vocab')         engRenderVocab();
    else if (sub === 'phrases')       engRenderPhrases();
    else if (sub === 'constructor')   engRenderConstructor();
    else if (sub === 'dictation')     engRenderDictation();
    else if (sub === 'conversations') engRenderConversations();
    else if (sub === 'videos')        engRenderVideos();
    else if (sub === 'writing')       engRenderWriting();
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
                        ${engSpeakerBtnHtml(card.id, {title: 'Écouter en anglais'})}
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;justify-content:center">
                        <div class="eng-card-en">${engEscape(card.en)}</div>
                    </div>
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

    // Auto-play EN when flipping to the back, if enabled.
    if (engState.isFlipped && engState.audio && engState.audio.autoplay) {
        const card = engState.cards[engState.currentIdx];
        if (card) {
            // Slight delay so the flip animation isn't masked by speech start latency.
            setTimeout(() => engSpeak(card.en), 250);
        }
    }
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
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-top:8px">
                        <div class="eng-phrase-en" style="flex:1;margin-top:0">${engEscape(p.en)}</div>
                        ${engSpeakerBtnHtml(p.id, {title: 'Écouter en anglais', size: 'sm'})}
                    </div>
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

    const templates = (engState.data && engState.data.email_templates) || [];
    const templatesBar = templates.length ? `
        <div style="background:var(--bg-tertiary);border:1px solid var(--border-light);
            border-radius:10px;padding:10px 12px;margin-bottom:14px">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;
                letter-spacing:1px;margin-bottom:8px">📥 Insérer un template</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
                ${templates.map(t => `
                    <button onclick="engInsertTemplate('${engEscapeAttr(t.id)}')"
                        title="${engEscapeAttr(t.scenario_fr)}"
                        style="font-size:11px;padding:5px 11px;border-radius:999px;cursor:pointer;
                        background:transparent;color:#93c5fd;border:1px solid #3b82f6">
                        ${engEscape(t.label_fr)}</button>
                `).join('')}
            </div>
        </div>
    ` : '';

    root.innerHTML = `
        <div style="max-width:760px;margin:0 auto">
            <div style="font-size:18px;font-weight:600;color:var(--text-bright);margin-bottom:6px">
                Atelier d'écriture
            </div>
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px">
                Écris en anglais ou pars d'un template, puis clique sur <strong>Corriger</strong>
                pour analyser ton texte. Tu verras les erreurs (LanguageTool), le registre détecté
                et un niveau CEFR estimé.
            </div>

            ${templatesBar}

            <textarea id="engWriteArea" rows="10"
                placeholder="Écris ton texte en anglais ici, ou insère un template ci-dessus..."
                oninput="engUpdateWordCount()"
                style="width:100%;background:var(--bg-tertiary);color:var(--text-bright);
                border:1px solid var(--border-light);border-radius:8px;padding:12px 14px;
                font-size:14px;line-height:1.6;resize:vertical;font-family:inherit"
            >${engEscape(engState.writing.text)}</textarea>

            <div id="engWritingMeta" style="margin-top:8px"></div>

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
    engRenderWritingMeta();
    if (engState.writing.result) engRenderWritingResult();
}

function engInsertTemplate(templateId) {
    const t = (engState.data && engState.data.email_templates || []).find(x => x.id === templateId);
    if (!t) return;
    const ta = document.getElementById('engWriteArea');
    if (!ta) return;
    const body = `Subject: ${t.subject}\n\n${t.body}`;
    // Insert at cursor, or replace if empty
    if (!ta.value.trim()) {
        ta.value = body;
    } else {
        const conf = confirm("Le textarea n'est pas vide — veux-tu remplacer son contenu par le template ?");
        if (!conf) return;
        ta.value = body;
    }
    engState.writing.text = ta.value;
    engUpdateWordCount();
    engRenderWritingMeta();
    ta.focus();
}

// Quick heuristics for register + CEFR estimate, computed locally.
function engAnalyseText(text) {
    const t = String(text || '');
    if (!t.trim()) {
        return null;
    }

    const words = t.trim().split(/\s+/);
    const wordCount = words.length;
    const sentences = t.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = Math.max(1, sentences.length);
    const avgWordsPerSentence = wordCount / sentenceCount;

    const lower = t.toLowerCase();

    // Informal markers
    const informalMarkers = [
        /\bgonna\b/, /\bwanna\b/, /\bgotta\b/, /\bhey\b/, /\byeah\b/,
        /\bkinda\b/, /\bsorta\b/, /\bdunno\b/, /\bya\b(?!\w)/,
    ];
    const contractions = (lower.match(/\b\w+'(t|s|re|ve|ll|d|m)\b/g) || []).length;
    const informalCount = informalMarkers.filter(rx => rx.test(lower)).length;

    // Formal markers
    const formalMarkers = [
        /\bdear\s+(mr|mrs|ms|sir|madam)\b/, /\byours\s+(sincerely|faithfully)\b/,
        /\bplease\s+find\s+attached\b/, /\bkind\s+regards\b/, /\bbest\s+regards\b/,
        /\bi\s+would\s+be\s+grateful\b/, /\bi\s+would\s+appreciate\b/,
        /\bfurther\s+to\b/, /\bin\s+accordance\s+with\b/,
    ];
    const formalCount = formalMarkers.filter(rx => rx.test(lower)).length;

    let register;
    if (formalCount >= 2 && contractions === 0 && informalCount === 0) {
        register = { label: 'Formel', color: '#3b82f6', note: 'Ton soutenu — idéal pour un client ou un partner.' };
    } else if (informalCount >= 1 || contractions >= 2) {
        register = { label: 'Informel', color: '#f59e0b',
            note: 'Ton détendu — OK pour un collègue ou un email interne décontracté. Évite avec un client formel.' };
    } else if (formalCount >= 1) {
        register = { label: 'Mi-formel', color: '#10b981',
            note: 'Registre professionnel standard — sûr dans la plupart des contextes Big 4.' };
    } else {
        register = { label: 'Neutre', color: '#94a3b8',
            note: 'Difficile à juger — vérifie tes salutations et formules de clôture.' };
    }

    // Very rough CEFR heuristic, only for English text.
    // Signals:
    //   - average sentence length
    //   - vocab "complexity" approximated by unique long words (>= 7 letters)
    //   - presence of complex structures (relative clauses, modals)
    const longWords = words.filter(w => /^[a-z'-]+$/i.test(w) && w.length >= 7).length;
    const longRatio = longWords / wordCount;
    const modalCount = (lower.match(/\b(would|could|should|might|shall|may)\b/g) || []).length;
    const relativeCount = (lower.match(/\b(which|whose|whereby|though|whereas|nevertheless|however)\b/g) || []).length;

    let cefr;
    if (wordCount < 20) {
        cefr = '?';
    } else if (avgWordsPerSentence < 9 && longRatio < 0.10 && modalCount === 0) {
        cefr = 'A2';
    } else if (avgWordsPerSentence < 13 && longRatio < 0.16 && (modalCount + relativeCount) < 3) {
        cefr = 'B1';
    } else if (avgWordsPerSentence < 18 && longRatio < 0.22) {
        cefr = 'B2';
    } else {
        cefr = 'C1';
    }

    return {
        wordCount, sentenceCount, avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
        register, cefr,
        signals: { informalCount, contractions, formalCount, longRatio: Math.round(longRatio * 100) },
    };
}

function engRenderWritingMeta() {
    const root = document.getElementById('engWritingMeta');
    if (!root) return;
    const a = engAnalyseText(engState.writing.text);
    if (!a) { root.innerHTML = ''; return; }

    const cefrColor = { A2: '#10b981', B1: '#f59e0b', B2: '#ef4444', C1: '#8b5cf6', '?': '#64748b' }[a.cefr];

    root.innerHTML = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:11px;
            padding:8px 10px;background:var(--bg-tertiary);border:1px solid var(--border-light);
            border-radius:8px">
            <span class="badge" style="background:transparent;color:${a.register.color};
                border:1px solid ${a.register.color};font-size:11px">
                Registre : ${engEscape(a.register.label)}</span>
            <span class="badge" style="background:transparent;color:${cefrColor};
                border:1px solid ${cefrColor};font-size:11px">
                Estimation CEFR : ${a.cefr}</span>
            <span style="color:var(--text-muted)">
                ${a.sentenceCount} phrase${a.sentenceCount > 1 ? 's' : ''} ·
                ${a.avgWordsPerSentence} mots/phrase
            </span>
            <span style="color:var(--text-muted);margin-left:auto;font-style:italic">
                ${engEscape(a.register.note)}
            </span>
        </div>
    `;
}

function engUpdateWordCount() {
    const ta = document.getElementById('engWriteArea');
    const counter = document.getElementById('engWordCount');
    if (!ta || !counter) return;
    engState.writing.text = ta.value;
    const words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
    const chars = ta.value.length;
    counter.textContent = `${words} mot${words > 1 ? 's' : ''} · ${chars} caractère${chars > 1 ? 's' : ''}`;
    engRenderWritingMeta();
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
// CONSTRUCTOR SUB-SECTION (sentence patterns with fill-in exercise)
// ════════════════════════════════════════════════════════════

function engRenderConstructor() {
    const root = document.getElementById('engContent');
    if (!root) return;
    const patterns = (engState.data && engState.data.patterns) || [];

    if (!patterns.length) {
        root.innerHTML = `
            <div class="card" style="max-width:520px;margin:40px auto;text-align:center;padding:32px">
                <div style="font-size:42px;margin-bottom:10px">🏗️</div>
                <div style="font-size:16px;font-weight:600;color:var(--text-bright);margin-bottom:8px">
                    Aucun pattern disponible
                </div>
                <div style="font-size:13px;color:var(--text-secondary)">
                    Le contenu sera bientôt disponible.
                </div>
            </div>`;
        return;
    }

    if (engState.constructor.view === 'exercise' && engState.constructor.currentPatternId) {
        engRenderConstructorExercise();
        return;
    }

    // LIST VIEW
    const counts = {};
    patterns.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });

    const f = engState.constructor;
    const catChips = Object.keys(counts).map(k => {
        const meta = PATTERN_CATEGORIES[k] || { icon: '•', label: k };
        const active = f.category === k;
        return `<button class="badge" style="cursor:pointer;padding:6px 12px;font-size:12px;
                background:${active ? '#3b82f6' : 'transparent'};
                color:${active ? '#fff' : '#3b82f6'};
                border:1px solid #3b82f6"
                onclick="engToggleConstructorCat('${k}')">
                ${meta.icon} ${engEscape(meta.label)} (${counts[k]})</button>`;
    }).join('');

    let filtered = patterns.slice();
    if (f.category) filtered = filtered.filter(p => p.category === f.category);

    const score = engState.constructor.score;
    const scoreHtml = score.total > 0
        ? `<span style="font-size:12px;color:var(--text-secondary);margin-left:auto">
            Score session : <strong style="color:#86efac">${score.correct}</strong> /
            <strong>${score.total}</strong></span>`
        : '';

    const list = filtered.map(p => {
        const meta = PATTERN_CATEGORIES[p.category] || { icon: '•', label: p.category };
        const lvl = LEVEL_LABELS[p.level] || { label: p.level || '', color: '#64748b' };
        return `
            <div class="card" style="padding:16px;margin-bottom:10px;cursor:pointer;
                transition:border-color 0.15s"
                onmouseover="this.style.borderColor='#3b82f6'"
                onmouseout="this.style.borderColor=''"
                onclick="engStartPatternExercise('${engEscapeAttr(p.id)}')">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                    <div style="flex:1">
                        <div style="font-size:14px;color:var(--text-bright);font-weight:600;margin-bottom:6px">
                            ${engEscape(p.fr_template)}
                        </div>
                        <div style="font-size:13px;color:#93c5fd;font-style:italic;margin-bottom:6px">
                            ${engEscape(p.en_template)}
                        </div>
                        ${p.context ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">
                            📖 ${engEscape(p.context)}</div>` : ''}
                    </div>
                    <div style="display:flex;gap:6px;flex-direction:column;align-items:flex-end">
                        <span class="badge" style="background:#1e3a5f;color:#93c5fd;
                            border:1px solid #3b82f6;font-size:11px">${meta.icon}</span>
                        <span class="badge" style="background:transparent;color:${lvl.color};
                            border:1px solid ${lvl.color};font-size:11px">${lvl.label}</span>
                    </div>
                </div>
                <div style="margin-top:10px;font-size:11px;color:var(--text-muted);
                    display:flex;align-items:center;gap:6px">
                    <span>▶</span> S'entraîner sur ce pattern (${(p.examples || []).length} ex.)
                </div>
            </div>
        `;
    }).join('');

    root.innerHTML = `
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
            ${catChips}
            ${f.category ? `<button class="btn btn-outline" onclick="engResetConstructorCat()"
                style="font-size:12px;padding:5px 10px;color:#fca5a5">↺ Tous</button>` : ''}
            ${scoreHtml}
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
            Clique sur un pattern pour t'entraîner à le traduire en contexte.
        </div>
        <div>${list}</div>
    `;
}

function engToggleConstructorCat(c) {
    engState.constructor.category = engState.constructor.category === c ? null : c;
    engRenderConstructor();
}

function engResetConstructorCat() {
    engState.constructor.category = null;
    engRenderConstructor();
}

function engStartPatternExercise(patternId) {
    engState.constructor.view = 'exercise';
    engState.constructor.currentPatternId = patternId;
    engState.constructor.currentExampleIdx = 0;
    engState.constructor.userAnswer = '';
    engState.constructor.checked = false;
    engRenderConstructor();
}

function engExitPatternExercise() {
    engState.constructor.view = 'list';
    engState.constructor.currentPatternId = null;
    engState.constructor.checked = false;
    engRenderConstructor();
}

function engRenderConstructorExercise() {
    const root = document.getElementById('engContent');
    if (!root) return;
    const patterns = (engState.data && engState.data.patterns) || [];
    const c = engState.constructor;
    const pat = patterns.find(p => p.id === c.currentPatternId);
    if (!pat) { engExitPatternExercise(); return; }

    const meta = PATTERN_CATEGORIES[pat.category] || { icon: '•', label: pat.category };
    const examples = pat.examples || [];
    const example = examples[c.currentExampleIdx];

    const checked = c.checked;
    const userAnswer = c.userAnswer || '';

    // Render the expected answer with the example value substituted
    const expectedEn = example ? pat.en_template.replace(/\{[^}]+\}/g, example.en) : pat.en_template;
    const promptFr = example ? pat.fr_template.replace(/\{[^}]+\}/g, example.fr) : pat.fr_template;

    // Soft comparison: lowercased, punctuation-trimmed, whitespace-normalised.
    function normalise(s) {
        return String(s || '')
            .toLowerCase()
            .replace(/[.,;:!?'"„""''«»()]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    const isCorrect = checked && normalise(userAnswer) === normalise(expectedEn);

    root.innerHTML = `
        <div style="max-width:760px;margin:0 auto">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:10px">
                <button class="btn btn-outline" onclick="engExitPatternExercise()"
                    style="font-size:12px;padding:6px 12px">← Retour aux patterns</button>
                <div style="font-size:12px;color:var(--text-secondary)">
                    ${meta.icon} ${engEscape(meta.label)} ·
                    Exemple ${c.currentExampleIdx + 1} / ${examples.length}
                </div>
            </div>

            <div class="card" style="padding:18px 20px;margin-bottom:14px">
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;
                    letter-spacing:1px;margin-bottom:8px">Pattern</div>
                <div style="font-size:15px;color:var(--text-bright);margin-bottom:6px">
                    ${engEscape(pat.fr_template)}
                </div>
                <div style="font-size:14px;color:#93c5fd;font-style:italic">
                    ${engEscape(pat.en_template)}
                </div>
                ${pat.context ? `<div style="font-size:12px;color:var(--text-muted);margin-top:10px">
                    📖 ${engEscape(pat.context)}</div>` : ''}
            </div>

            <div class="card" style="padding:18px 20px">
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;
                    letter-spacing:1px;margin-bottom:8px">À traduire</div>
                <div style="font-size:16px;color:var(--text-bright);margin-bottom:14px;line-height:1.5">
                    ${engEscape(promptFr)}
                </div>

                <textarea id="engPatternAnswer" rows="3"
                    placeholder="Tape ta traduction anglaise..."
                    ${checked ? 'disabled' : ''}
                    oninput="engState.constructor.userAnswer = this.value"
                    style="width:100%;background:var(--bg-tertiary);color:var(--text-bright);
                    border:1px solid ${isCorrect ? '#10b981' : (checked ? '#ef4444' : 'var(--border-light)')};
                    border-radius:8px;padding:10px 12px;font-size:14px;line-height:1.5;
                    resize:vertical;font-family:inherit;margin-bottom:10px">${engEscape(userAnswer)}</textarea>

                ${!checked ? `
                    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
                        <button class="btn btn-outline" onclick="engPatternRevealHint()"
                            style="font-size:12px;padding:6px 12px">💡 Indice</button>
                        <button class="btn btn-primary" onclick="engPatternCheck()"
                            style="font-size:13px;padding:8px 16px">✓ Vérifier</button>
                    </div>
                ` : `
                    <div style="background:${isCorrect ? '#14532d22' : '#7f1d1d22'};
                        border:1px solid ${isCorrect ? '#14532d' : '#7f1d1d'};
                        border-radius:8px;padding:12px 14px;margin-bottom:10px">
                        <div style="font-weight:600;color:${isCorrect ? '#86efac' : '#fca5a5'};margin-bottom:6px">
                            ${isCorrect ? '✓ Excellent !' : '✗ Pas tout à fait — voici la réponse attendue :'}
                        </div>
                        <div style="color:${isCorrect ? '#86efac' : '#fecaca'};font-size:14px;
                            font-style:italic;line-height:1.5">
                            ${engEscape(expectedEn)}
                            ${engSpeakerBtnHtml(pat.id, {size: 'sm', title: 'Écouter la réponse'}).replace(/engSpeakCard\([^)]+\)/, `engSpeak(${JSON.stringify(expectedEn)})`)}
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap">
                        <button class="btn btn-outline" onclick="engPatternReset()"
                            style="font-size:12px;padding:6px 12px">↻ Réessayer ce pattern</button>
                        <div style="display:flex;gap:8px">
                            ${c.currentExampleIdx < examples.length - 1 ? `
                                <button class="btn btn-primary" onclick="engPatternNextExample()"
                                    style="font-size:13px;padding:8px 16px">Exemple suivant →</button>
                            ` : `
                                <button class="btn btn-primary" onclick="engExitPatternExercise()"
                                    style="font-size:13px;padding:8px 16px">Terminer ce pattern</button>
                            `}
                        </div>
                    </div>
                `}
            </div>
        </div>
    `;

    // Auto-focus the textarea for fast typing
    const ta = document.getElementById('engPatternAnswer');
    if (ta && !checked) ta.focus();
}

function engPatternCheck() {
    const ta = document.getElementById('engPatternAnswer');
    if (ta) engState.constructor.userAnswer = ta.value;
    if (!engState.constructor.userAnswer.trim()) return;

    engState.constructor.checked = true;

    // Compute correctness for scoring
    const patterns = (engState.data && engState.data.patterns) || [];
    const pat = patterns.find(p => p.id === engState.constructor.currentPatternId);
    if (pat) {
        const example = (pat.examples || [])[engState.constructor.currentExampleIdx];
        const expected = example ? pat.en_template.replace(/\{[^}]+\}/g, example.en) : pat.en_template;
        const normalise = s => String(s || '').toLowerCase().replace(/[.,;:!?'"„""''«»()]/g, ' ').replace(/\s+/g, ' ').trim();
        const correct = normalise(engState.constructor.userAnswer) === normalise(expected);
        engState.constructor.score.total++;
        if (correct) engState.constructor.score.correct++;
    }
    engRenderConstructor();
}

function engPatternReset() {
    engState.constructor.userAnswer = '';
    engState.constructor.checked = false;
    engRenderConstructor();
}

function engPatternNextExample() {
    engState.constructor.currentExampleIdx++;
    engState.constructor.userAnswer = '';
    engState.constructor.checked = false;
    engRenderConstructor();
}

// ════════════════════════════════════════════════════════════
// DICTATION SUB-SECTION (listening practice: hear EN, type what you hear)
// ════════════════════════════════════════════════════════════

function engDictationPool() {
    const src = engState.dictation.source;
    const data = engState.data || {};
    let pool = [];
    if (src === 'vocab' || src === 'mixed') {
        pool = pool.concat((data.vocab || []).map(v => ({id: v.id, en: v.en, fr: v.fr, kind: 'vocab'})));
    }
    if (src === 'phrases' || src === 'mixed') {
        pool = pool.concat((data.phrases || []).map(p => ({id: p.id, en: p.en, fr: p.fr, kind: 'phrase'})));
    }
    if (src === 'essentials' || src === 'mixed') {
        pool = pool.concat((data.essentials || []).map(e => ({id: e.id, en: e.en, fr: e.fr, kind: 'essential'})));
    }
    // Filter out items already seen in this session (loop back when exhausted)
    const seen = engState.dictation.seenIds;
    const unseen = pool.filter(x => !seen[x.id]);
    return unseen.length ? unseen : pool;
}

function engDictationNext() {
    const pool = engDictationPool();
    if (!pool.length) return null;
    const idx = Math.floor(Math.random() * pool.length);
    const item = pool[idx];
    engState.dictation.currentItem = item;
    engState.dictation.userInput = '';
    engState.dictation.checked = false;
    engState.dictation.result = null;
    engState.dictation.seenIds[item.id] = true;
    // Auto-play after a small delay
    setTimeout(() => engSpeak(item.en), 350);
    engRenderDictation();
    return item;
}

function engDictationReplay() {
    const it = engState.dictation.currentItem;
    if (it) engSpeak(it.en);
}

function engDictationSetSource(src) {
    engState.dictation.source = src;
    engState.dictation.currentItem = null;
    engState.dictation.userInput = '';
    engState.dictation.checked = false;
    engState.dictation.result = null;
    engState.dictation.seenIds = {};
    engState.dictation.score = { correct: 0, close: 0, total: 0 };
    engRenderDictation();
}

function engDictationCheck() {
    const ta = document.getElementById('engDictationInput');
    if (ta) engState.dictation.userInput = ta.value;
    const it = engState.dictation.currentItem;
    if (!it) return;
    if (!engState.dictation.userInput.trim()) return;

    function normalise(s) {
        return String(s || '').toLowerCase()
            .replace(/[.,;:!?'"„""''«»()]/g, ' ')
            .replace(/\s+/g, ' ').trim();
    }
    const user = normalise(engState.dictation.userInput);
    const expected = normalise(it.en);
    let result;
    if (user === expected) {
        result = 'exact';
        engState.dictation.score.correct++;
    } else {
        // Close match heuristic: 80%+ word overlap
        const expWords = new Set(expected.split(' '));
        const userWords = user.split(' ');
        const matched = userWords.filter(w => expWords.has(w)).length;
        const overlap = matched / Math.max(expWords.size, 1);
        if (overlap >= 0.75 && Math.abs(userWords.length - expWords.size) <= 2) {
            result = 'close';
            engState.dictation.score.close++;
        } else {
            result = 'wrong';
        }
    }
    engState.dictation.score.total++;
    engState.dictation.result = result;
    engState.dictation.checked = true;
    engRenderDictation();
}

function engDictationSkip() {
    engDictationNext();
}

function engRenderDictation() {
    const root = document.getElementById('engContent');
    if (!root) return;

    const d = engState.dictation;
    const sources = [
        { id: 'phrases',    label: '💬 Phrases',     count: (engState.data?.phrases || []).length },
        { id: 'vocab',      label: '📚 Vocab',       count: (engState.data?.vocab || []).length },
        { id: 'essentials', label: '🎯 Day-1',       count: (engState.data?.essentials || []).length },
        { id: 'mixed',      label: '🔀 Tout mélangé', count: (engState.data?.vocab || []).length
            + (engState.data?.phrases || []).length
            + (engState.data?.essentials || []).length },
    ];

    const sourceBar = sources.map(s => {
        const active = d.source === s.id;
        return `<button onclick="engDictationSetSource('${s.id}')"
            style="font-size:12px;padding:6px 12px;border-radius:999px;cursor:pointer;
            background:${active ? '#3b82f6' : 'transparent'};
            color:${active ? '#fff' : '#93c5fd'};
            border:1px solid #3b82f6">
            ${s.label} (${s.count})</button>`;
    }).join('');

    const scorePct = d.score.total
        ? Math.round(((d.score.correct + d.score.close * 0.5) / d.score.total) * 100)
        : 0;
    const scoreBar = d.score.total > 0 ? `
        <div style="font-size:11px;color:var(--text-secondary);margin-left:auto;
            display:flex;align-items:center;gap:8px">
            <span><strong style="color:#86efac">${d.score.correct}</strong> exacts</span>
            <span><strong style="color:#fbbf24">${d.score.close}</strong> approchés</span>
            <span><strong>${d.score.total}</strong> total</span>
            <span style="color:#93c5fd">·</span>
            <span><strong>${scorePct}%</strong></span>
        </div>
    ` : '';

    const it = d.currentItem;

    let main;
    if (!it) {
        main = `
            <div class="card" style="padding:24px;text-align:center;margin-top:16px">
                <div style="font-size:48px;margin-bottom:10px">🎧</div>
                <div style="font-size:18px;color:var(--text-bright);font-weight:600;margin-bottom:8px">
                    Mode dictée
                </div>
                <div style="font-size:13px;color:var(--text-secondary);margin-bottom:18px;line-height:1.5">
                    L'app va te lire un mot ou une phrase en anglais.<br>
                    Tape ce que tu entends — autant de fois que nécessaire pour bien capter.
                </div>
                <button class="btn btn-primary" onclick="engDictationNext()"
                    style="font-size:14px;padding:10px 22px">▶️ Démarrer</button>
            </div>
        `;
    } else if (!d.checked) {
        main = `
            <div class="card" style="padding:20px;margin-top:16px">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
                    <button class="btn btn-outline" onclick="engDictationReplay()"
                        style="font-size:13px;padding:8px 14px">🔊 Rejouer</button>
                    <span style="font-size:11px;color:var(--text-muted)">
                        Tu peux rejouer autant de fois que tu veux.
                    </span>
                </div>
                <textarea id="engDictationInput" rows="3"
                    placeholder="Tape ce que tu entends en anglais..."
                    oninput="engState.dictation.userInput = this.value"
                    autofocus
                    style="width:100%;background:var(--bg-tertiary);color:var(--text-bright);
                    border:1px solid var(--border-light);border-radius:8px;padding:10px 12px;
                    font-size:14px;line-height:1.5;resize:vertical;font-family:inherit;
                    margin-bottom:10px">${engEscape(d.userInput)}</textarea>
                <div style="display:flex;gap:8px;justify-content:flex-end">
                    <button class="btn btn-outline" onclick="engDictationSkip()"
                        style="font-size:12px;padding:6px 12px">Passer →</button>
                    <button class="btn btn-primary" onclick="engDictationCheck()"
                        style="font-size:13px;padding:8px 16px">✓ Vérifier</button>
                </div>
            </div>
        `;
    } else {
        const r = d.result;
        const verdict = {
            exact: { color: '#86efac', bg: '#14532d', icon: '✓', label: 'Parfait !' },
            close: { color: '#fbbf24', bg: '#78350f', icon: '~', label: 'Presque' },
            wrong: { color: '#fca5a5', bg: '#7f1d1d', icon: '✗', label: 'Pas tout à fait' },
        }[r] || { color: '#fca5a5', bg: '#7f1d1d', icon: '✗', label: 'Pas tout à fait' };

        main = `
            <div class="card" style="padding:20px;margin-top:16px">
                <div style="background:${verdict.bg}22;border:1px solid ${verdict.bg};
                    border-radius:10px;padding:14px 16px;margin-bottom:12px">
                    <div style="font-size:14px;color:${verdict.color};font-weight:600;margin-bottom:8px">
                        ${verdict.icon} ${engEscape(verdict.label)}
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;
                        letter-spacing:1px;margin-bottom:4px">Ta réponse</div>
                    <div style="font-size:13px;color:var(--text-bright);margin-bottom:12px;
                        font-style:italic">${engEscape(d.userInput)}</div>
                    <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;
                        letter-spacing:1px;margin-bottom:4px">Attendu</div>
                    <div style="display:flex;align-items:center;gap:10px">
                        <div style="font-size:14px;color:#93c5fd;font-weight:600;flex:1">
                            ${engEscape(it.en)}
                        </div>
                        <button onclick="engDictationReplay()"
                            title="Réécouter"
                            style="background:transparent;border:1px solid var(--border-light);
                            border-radius:6px;padding:4px 10px;cursor:pointer;color:#93c5fd;
                            font-size:13px">🔊</button>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:10px">
                        Traduction : ${engEscape(it.fr)}
                    </div>
                </div>
                <div style="text-align:center">
                    <button class="btn btn-primary" onclick="engDictationNext()"
                        style="font-size:13px;padding:8px 22px">Suivant →</button>
                </div>
            </div>
        `;
    }

    root.innerHTML = `
        <div style="background:var(--bg-tertiary);border:1px solid var(--border-light);
            border-radius:10px;padding:12px 14px;margin-bottom:14px">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;
                letter-spacing:1px;margin-bottom:8px">Source</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
                ${sourceBar}
                ${scoreBar}
            </div>
        </div>
        ${main}
    `;

    // Auto-focus the textarea if active
    setTimeout(() => {
        const ta = document.getElementById('engDictationInput');
        if (ta && !d.checked) ta.focus();
    }, 50);
}

// ════════════════════════════════════════════════════════════
// ESSENTIALS SUB-SECTION (Day-1 EY hand-picked checklist)
// ════════════════════════════════════════════════════════════

function engLoadEssentialsDone() {
    try {
        const raw = localStorage.getItem(ENG_LS_ESSENTIALS);
        engState.essentials.done = raw ? (JSON.parse(raw) || {}) : {};
    } catch (_) { engState.essentials.done = {}; }
}

function engSaveEssentialsDone() {
    try { localStorage.setItem(ENG_LS_ESSENTIALS, JSON.stringify(engState.essentials.done)); }
    catch (_) {}
}

function engToggleEssentialDone(id) {
    if (engState.essentials.done[id]) delete engState.essentials.done[id];
    else engState.essentials.done[id] = new Date().toISOString();
    engSaveEssentialsDone();
    engRenderEssentials();
}

function engToggleEssentialGroup(group) {
    engState.essentials.collapsed[group] = !engState.essentials.collapsed[group];
    engRenderEssentials();
}

function engSpeakEssential(id) {
    const e = (engState.data.essentials || []).find(x => x.id === id);
    if (e) engSpeak(e.en);
}

function engRenderEssentials() {
    const root = document.getElementById('engContent');
    if (!root) return;
    engLoadEssentialsDone();
    const all = (engState.data && engState.data.essentials) || [];

    if (!all.length) {
        root.innerHTML = `
            <div class="card" style="max-width:520px;margin:40px auto;text-align:center;padding:32px">
                <div style="font-size:42px;margin-bottom:10px">🎯</div>
                <div style="font-size:16px;font-weight:600;color:var(--text-bright)">
                    Aucun essential disponible
                </div>
            </div>`;
        return;
    }

    const doneCount = Object.keys(engState.essentials.done).length;
    const total = all.length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;

    // Group items
    const byGroup = {};
    for (const item of all) {
        (byGroup[item.group] = byGroup[item.group] || []).push(item);
    }

    const sections = Object.keys(ESSENTIAL_GROUPS).map(g => {
        const items = byGroup[g] || [];
        if (!items.length) return '';
        const meta = ESSENTIAL_GROUPS[g];
        const collapsed = !!engState.essentials.collapsed[g];
        const groupDone = items.filter(i => engState.essentials.done[i.id]).length;

        const itemsHtml = collapsed ? '' : items.map(item => {
            const isDone = !!engState.essentials.done[item.id];
            const kindBadge = item.kind === 'vocab' ? '📚 Mot' : '💬 Phrase';
            return `
                <div class="card" style="padding:14px 16px;margin-bottom:8px;
                    ${isDone ? 'border-color:#14532d;background:linear-gradient(180deg,var(--bg-secondary) 0%,rgba(20,83,45,0.05) 100%);' : ''}">
                    <div style="display:flex;gap:12px;align-items:flex-start">
                        <label style="cursor:pointer;display:flex;align-items:center;padding-top:2px">
                            <input type="checkbox" ${isDone ? 'checked' : ''}
                                onchange="engToggleEssentialDone('${engEscapeAttr(item.id)}')"
                                style="width:18px;height:18px;cursor:pointer">
                        </label>
                        <div style="flex:1">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
                                <span style="font-size:10px;color:var(--text-muted);text-transform:uppercase;
                                    letter-spacing:1px">${kindBadge}</span>
                                ${isDone ? `<span class="badge" style="background:#14532d;color:#86efac;
                                    border:1px solid #14532d;font-size:10px;padding:2px 8px">✓ Acquis</span>` : ''}
                            </div>
                            <div style="font-size:15px;color:var(--text-bright);font-weight:600;margin-bottom:4px">
                                ${engEscape(item.fr)}
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                                <div style="font-size:14px;color:#93c5fd;font-style:italic;flex:1">
                                    ${engEscape(item.en)}
                                </div>
                                <button onclick="event.stopPropagation();engSpeakEssential('${engEscapeAttr(item.id)}')"
                                    title="Écouter"
                                    style="background:transparent;border:1px solid var(--border-light);
                                    border-radius:6px;padding:4px 8px;cursor:pointer;color:#93c5fd;
                                    font-size:13px;line-height:1">🔊</button>
                            </div>
                            <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;
                                background:var(--bg-tertiary);padding:8px 10px;border-radius:6px;
                                border-left:3px solid ${meta.color}">
                                💡 ${engEscape(item.why_fr)}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div style="margin-bottom:18px">
                <div onclick="engToggleEssentialGroup('${g}')"
                    style="display:flex;align-items:center;gap:10px;cursor:pointer;
                    padding:10px 12px;background:var(--bg-tertiary);
                    border:1px solid var(--border-light);border-radius:10px;
                    margin-bottom:10px;border-left:4px solid ${meta.color}">
                    <span style="font-size:18px">${meta.icon}</span>
                    <div style="flex:1">
                        <div style="font-size:14px;color:var(--text-bright);font-weight:600">
                            ${engEscape(meta.label)}
                        </div>
                        <div style="font-size:11px;color:var(--text-muted)">
                            ${groupDone} / ${items.length} acquis
                        </div>
                    </div>
                    <span style="font-size:14px;color:var(--text-muted)">${collapsed ? '▶' : '▼'}</span>
                </div>
                ${itemsHtml}
            </div>
        `;
    }).join('');

    root.innerHTML = `
        <div style="background:var(--bg-tertiary);border:1px solid var(--border-light);
            border-radius:10px;padding:14px 16px;margin-bottom:16px">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
                <span style="font-size:16px;font-weight:600;color:var(--text-bright)">
                    🎯 Day-1 EY — 50 essentiels pour ta première semaine
                </span>
                <span style="font-size:13px;color:var(--text-secondary);margin-left:auto">
                    <strong style="color:#86efac">${doneCount}</strong> / ${total} acquis · ${pct}%
                </span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:10px;line-height:1.5">
                Coche les éléments quand tu te sens à l'aise. L'objectif : tout maîtriser avant octobre 2026.
                Tu n'as pas besoin de tout faire d'un coup — vise ~5 par jour.
            </div>
        </div>
        ${sections}
    `;
}

// ════════════════════════════════════════════════════════════
// CONVERSATIONS SUB-SECTION (simulated audit dialogues with choices)
// ════════════════════════════════════════════════════════════

const SPEAKER_STYLES = {
    client:    { color: '#3b82f6', bg: '#1e3a5f', icon: '👤' },
    manager:   { color: '#8b5cf6', bg: '#3b1e5f', icon: '🧑‍💼' },
    partner:   { color: '#ef4444', bg: '#5f1e1e', icon: '🎩' },
    colleague: { color: '#10b981', bg: '#1e5f3b', icon: '👥' },
    you:       { color: '#f59e0b', bg: '#5f3b1e', icon: '🗣️' },
};

function engRenderConversations() {
    const root = document.getElementById('engContent');
    if (!root) return;
    const convs = (engState.data && engState.data.conversations) || [];

    if (!convs.length) {
        root.innerHTML = `
            <div class="card" style="max-width:520px;margin:40px auto;text-align:center;padding:32px">
                <div style="font-size:42px;margin-bottom:10px">🎙️</div>
                <div style="font-size:16px;font-weight:600;color:var(--text-bright);margin-bottom:8px">
                    Aucune conversation disponible
                </div>
            </div>`;
        return;
    }

    if (engState.conversations.view === 'play' && engState.conversations.currentConvId) {
        engRenderConversationPlay();
        return;
    }

    // LIST view
    const list = convs.map(c => {
        const lvl = LEVEL_LABELS[c.level] || { label: c.level || '', color: '#64748b' };
        const choices = (c.turns || []).filter(t => t.type === 'choice').length;
        return `
            <div class="card" style="padding:16px;margin-bottom:10px;cursor:pointer;
                transition:border-color 0.15s"
                onmouseover="this.style.borderColor='#3b82f6'"
                onmouseout="this.style.borderColor=''"
                onclick="engStartConversation('${engEscapeAttr(c.id)}')">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                    <div style="flex:1">
                        <div style="font-size:15px;color:var(--text-bright);font-weight:600;margin-bottom:6px">
                            ${engEscape(c.title)}
                        </div>
                        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:8px">
                            ${engEscape(c.context)}
                        </div>
                        <div style="font-size:11px;color:var(--text-muted)">
                            ⏱️ ~${c.duration_min || '?'} min · 🗣️ ${choices} choix à faire
                        </div>
                    </div>
                    <span class="badge" style="background:transparent;color:${lvl.color};
                        border:1px solid ${lvl.color};font-size:11px">${lvl.label}</span>
                </div>
                <div style="margin-top:10px;font-size:11px;color:var(--text-muted)">
                    ▶ Démarrer la conversation
                </div>
            </div>
        `;
    }).join('');

    root.innerHTML = `
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;line-height:1.5">
            Dialogues simulés en contexte audit. Lis chaque réplique anglaise (avec audio si tu veux),
            puis choisis la meilleure réponse aux moments clés. Tu auras un feedback immédiat à chaque choix.
        </div>
        <div>${list}</div>
    `;
}

function engStartConversation(convId) {
    engState.conversations.view = 'play';
    engState.conversations.currentConvId = convId;
    engState.conversations.turnIdx = 0;
    engState.conversations.choiceIdx = null;
    engState.conversations.history = [];
    engRenderConversations();
}

function engExitConversation() {
    engState.conversations.view = 'list';
    engState.conversations.currentConvId = null;
    engRenderConversations();
}

function engConvChoose(choiceIdx) {
    const conv = (engState.data.conversations || []).find(
        c => c.id === engState.conversations.currentConvId
    );
    if (!conv) return;
    const turn = conv.turns[engState.conversations.turnIdx];
    if (!turn || turn.type !== 'choice') return;
    engState.conversations.choiceIdx = choiceIdx;
    const opt = turn.options[choiceIdx];
    engState.conversations.history.push({
        turnIdx: engState.conversations.turnIdx,
        choiceIdx,
        correct: !!opt.correct,
    });
    // If the choice is correct AND audio autoplay enabled, speak the EN answer.
    if (opt && engState.audio && engState.audio.autoplay) {
        setTimeout(() => engSpeak(opt.en), 200);
    }
    engRenderConversations();
}

function engConvAdvance() {
    engState.conversations.turnIdx++;
    engState.conversations.choiceIdx = null;
    engRenderConversations();
}

function engConvSpeakLine(text) {
    engSpeak(text);
}

function engRenderConversationPlay() {
    const root = document.getElementById('engContent');
    if (!root) return;
    const convs = (engState.data && engState.data.conversations) || [];
    const conv = convs.find(c => c.id === engState.conversations.currentConvId);
    if (!conv) { engExitConversation(); return; }

    const cs = engState.conversations;
    const total = conv.turns.length;
    const turnIdx = cs.turnIdx;
    const isEnd = turnIdx >= total;

    // (Past turns are rendered inline within the final template via slice.)
    let currentTurnHtml = '';
    if (!isEnd) {
        const turn = conv.turns[turnIdx];
        if (turn.type === 'choice') {
            // Active choice — show prompt + options
            if (cs.choiceIdx == null) {
                currentTurnHtml = engRenderActiveChoiceHtml(turn);
            } else {
                // Choice made — show feedback and "next" button
                currentTurnHtml = engRenderChoiceFeedbackHtml(turn, cs.choiceIdx);
            }
        } else {
            // NPC line — show it and "continue" button
            currentTurnHtml = engRenderConvTurnHtml(turn, turnIdx, cs) + `
                <div style="text-align:center;margin:12px 0">
                    <button class="btn btn-primary" onclick="engConvAdvance()"
                        style="font-size:13px;padding:8px 18px">Continuer →</button>
                </div>
            `;
            // Skip the past-turns render of this turn since we just rendered it
            // (We rendered it via slice 0..turnIdx). Let's drop it from past.
        }
    }

    // Final summary
    let summaryHtml = '';
    if (isEnd) {
        const choicesMade = cs.history.length;
        const correctCount = cs.history.filter(h => h.correct).length;
        const pct = choicesMade > 0 ? Math.round((correctCount / choicesMade) * 100) : 0;
        const verdict = pct >= 80 ? '🎉 Excellent !' : pct >= 60 ? '👍 Bien' : '💪 À retravailler';
        summaryHtml = `
            <div class="card" style="padding:20px;text-align:center;margin-top:14px">
                <div style="font-size:32px;margin-bottom:8px">${verdict.split(' ')[0]}</div>
                <div style="font-size:18px;font-weight:700;color:var(--text-bright);margin-bottom:6px">
                    ${engEscape(verdict.substring(verdict.indexOf(' ') + 1))}
                </div>
                <div style="font-size:14px;color:var(--text-secondary);margin-bottom:14px">
                    Tu as choisi la meilleure réponse <strong style="color:#86efac">${correctCount}</strong>
                    fois sur <strong>${choicesMade}</strong> (${pct}%).
                </div>
                <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
                    <button class="btn btn-primary" onclick="engStartConversation('${engEscapeAttr(conv.id)}')"
                        style="font-size:13px;padding:8px 18px">↻ Recommencer</button>
                    <button class="btn btn-outline" onclick="engExitConversation()"
                        style="font-size:13px;padding:8px 18px">Liste des conversations</button>
                </div>
            </div>
        `;
    }

    // Header (always)
    const lvl = LEVEL_LABELS[conv.level] || { label: conv.level || '', color: '#64748b' };
    const progress = total > 0 ? Math.round((turnIdx / total) * 100) : 0;

    root.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <button class="btn btn-outline" onclick="engExitConversation()"
                style="font-size:12px;padding:6px 12px">← Retour</button>
            <div style="flex:1">
                <div style="font-size:14px;color:var(--text-bright);font-weight:600">
                    ${engEscape(conv.title)}
                </div>
                <div style="font-size:11px;color:var(--text-muted)">
                    ${engEscape(conv.context)}
                </div>
            </div>
            <span class="badge" style="background:transparent;color:${lvl.color};
                border:1px solid ${lvl.color};font-size:11px">${lvl.label}</span>
        </div>
        <div class="progress-bar" style="margin-bottom:14px">
            <div class="progress-fill" style="width:${progress}%"></div>
        </div>
        ${(() => {
            // For the past turns: render only those that have been "consumed" (not the current one)
            const pastHtml = conv.turns.slice(0, turnIdx).map((t, i) => engRenderConvTurnHtml(t, i, cs)).join('');
            return pastHtml;
        })()}
        ${currentTurnHtml}
        ${summaryHtml}
    `;
}

function engRenderConvTurnHtml(turn, idx, cs) {
    if (turn.type === 'choice') {
        // For a past choice, show only the chosen option text + feedback summary
        const past = (cs.history || []).find(h => h.turnIdx === idx);
        if (!past) return '';
        const opt = turn.options[past.choiceIdx];
        const style = SPEAKER_STYLES.you;
        return `
            <div style="margin:8px 0 8px 30px;text-align:right">
                <div style="display:inline-block;background:${past.correct ? '#14532d' : '#7f1d1d'};
                    color:${past.correct ? '#86efac' : '#fecaca'};
                    border:1px solid ${past.correct ? '#14532d' : '#7f1d1d'};
                    border-radius:14px;padding:10px 14px;max-width:80%;text-align:left">
                    <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;
                        margin-bottom:4px;opacity:0.8">
                        ${style.icon} Toi · ${past.correct ? '✓' : '✗'}
                    </div>
                    <div style="font-size:13px;line-height:1.5">${engEscape(opt.en)}</div>
                </div>
            </div>
        `;
    }
    const style = SPEAKER_STYLES[turn.speaker] || SPEAKER_STYLES.client;
    return `
        <div style="margin:8px 30px 8px 0">
            <div style="display:inline-block;background:${style.bg};
                color:${style.color};border:1px solid ${style.color};
                border-radius:14px;padding:10px 14px;max-width:80%">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;
                    margin-bottom:4px;opacity:0.85;display:flex;align-items:center;
                    justify-content:space-between;gap:10px">
                    <span>${style.icon} ${engEscape(turn.name || turn.speaker)}</span>
                    <button onclick="event.stopPropagation();engConvSpeakLine(${JSON.stringify(turn.en).replace(/"/g, '&quot;')})"
                        title="Écouter"
                        style="background:transparent;border:0;cursor:pointer;color:inherit;
                        font-size:13px;padding:0;line-height:1">🔊</button>
                </div>
                <div style="font-size:13px;line-height:1.5;color:var(--text-bright)">
                    ${engEscape(turn.en)}
                </div>
                ${turn.fr ? `<div style="font-size:11px;line-height:1.5;color:var(--text-muted);
                    margin-top:6px;font-style:italic">${engEscape(turn.fr)}</div>` : ''}
            </div>
        </div>
    `;
}

function engRenderActiveChoiceHtml(turn) {
    const opts = turn.options.map((o, i) => `
        <button onclick="engConvChoose(${i})" class="card"
            style="text-align:left;padding:12px 14px;margin-bottom:8px;
            cursor:pointer;width:100%;background:var(--bg-tertiary);
            border:1px solid var(--border-light);transition:all 0.15s"
            onmouseover="this.style.borderColor='#3b82f6'"
            onmouseout="this.style.borderColor=''">
            <div style="font-size:13px;color:var(--text-bright);line-height:1.5">
                ${String.fromCharCode(65 + i)}. ${engEscape(o.en)}
            </div>
        </button>
    `).join('');

    return `
        <div class="card" style="padding:16px 18px;border-color:#f59e0b;margin:14px 0">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;
                color:#f59e0b;margin-bottom:6px">🗣️ À toi de répondre</div>
            <div style="font-size:14px;color:var(--text-bright);margin-bottom:14px">
                ${engEscape(turn.prompt_fr)}
            </div>
            <div>${opts}</div>
        </div>
    `;
}

function engRenderChoiceFeedbackHtml(turn, choiceIdx) {
    const opt = turn.options[choiceIdx];
    const correct = !!opt.correct;
    return `
        <div style="margin:8px 0 8px 30px;text-align:right">
            <div style="display:inline-block;background:${correct ? '#14532d' : '#7f1d1d'};
                color:${correct ? '#86efac' : '#fecaca'};
                border:1px solid ${correct ? '#14532d' : '#7f1d1d'};
                border-radius:14px;padding:10px 14px;max-width:80%;text-align:left">
                <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;
                    margin-bottom:4px;opacity:0.8">
                    🗣️ Toi · ${correct ? '✓' : '✗'}
                </div>
                <div style="font-size:13px;line-height:1.5">${engEscape(opt.en)}</div>
            </div>
        </div>
        <div style="margin:0 30px 12px 30px;background:var(--bg-tertiary);
            border:1px solid var(--border-light);border-radius:10px;padding:12px 14px">
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;
                color:var(--text-muted);margin-bottom:6px">
                💡 Feedback
            </div>
            <div style="font-size:13px;color:var(--text-bright);line-height:1.5">
                ${engEscape(opt.feedback_fr)}
            </div>
        </div>
        <div style="text-align:center;margin:14px 0">
            <button class="btn btn-primary" onclick="engConvAdvance()"
                style="font-size:13px;padding:8px 18px">Continuer →</button>
        </div>
    `;
}

// ════════════════════════════════════════════════════════════
// VIDEOS SUB-SECTION (curated YouTube resources)
// ════════════════════════════════════════════════════════════

function engLoadVideosWatched() {
    try {
        const raw = localStorage.getItem(ENG_LS_VIDEOS);
        engState.videos.watched = raw ? (JSON.parse(raw) || {}) : {};
    } catch (_) { engState.videos.watched = {}; }
}

function engSaveVideosWatched() {
    try { localStorage.setItem(ENG_LS_VIDEOS, JSON.stringify(engState.videos.watched)); }
    catch (_) {}
}

function engToggleVideoWatched(id) {
    if (engState.videos.watched[id]) {
        delete engState.videos.watched[id];
    } else {
        engState.videos.watched[id] = new Date().toISOString();
    }
    engSaveVideosWatched();
    engRenderVideos();
}

function engOpenVideo(id, url) {
    // Mark as watched and open in a new tab
    engState.videos.watched[id] = new Date().toISOString();
    engSaveVideosWatched();
    try {
        window.open(url, '_blank', 'noopener,noreferrer');
    } catch (_) {}
    engRenderVideos();
}

function engToggleVideoTheme(t) {
    engState.videos.theme = engState.videos.theme === t ? null : t;
    engRenderVideos();
}

function engRenderVideos() {
    const root = document.getElementById('engContent');
    if (!root) return;
    engLoadVideosWatched();

    const videos = (engState.data && engState.data.videos) || [];

    if (!videos.length) {
        root.innerHTML = `
            <div class="card" style="max-width:520px;margin:40px auto;text-align:center;padding:32px">
                <div style="font-size:42px;margin-bottom:10px">🎬</div>
                <div style="font-size:16px;font-weight:600;color:var(--text-bright);margin-bottom:8px">
                    Aucune ressource vidéo disponible
                </div>
            </div>`;
        return;
    }

    const counts = {};
    videos.forEach(v => { counts[v.theme] = (counts[v.theme] || 0) + 1; });

    const watchedCount = Object.keys(engState.videos.watched).length;
    const totalCount = videos.length;
    const progressPct = totalCount > 0 ? Math.round((watchedCount / totalCount) * 100) : 0;

    const themeChips = Object.keys(counts).map(k => {
        const meta = VIDEO_THEMES[k] || { icon: '•', label: k };
        const active = engState.videos.theme === k;
        return `<button class="badge" style="cursor:pointer;padding:6px 12px;font-size:12px;
                background:${active ? '#3b82f6' : 'transparent'};
                color:${active ? '#fff' : '#3b82f6'};
                border:1px solid #3b82f6"
                onclick="engToggleVideoTheme('${k}')">
                ${meta.icon} ${engEscape(meta.label)} (${counts[k]})</button>`;
    }).join('');

    let filtered = videos.slice();
    if (engState.videos.theme) {
        filtered = filtered.filter(v => v.theme === engState.videos.theme);
    }

    const list = filtered.map(v => {
        const meta = VIDEO_THEMES[v.theme] || { icon: '•', label: v.theme };
        const lvl = LEVEL_LABELS[v.level] || { label: v.level || '', color: '#64748b' };
        const isWatched = !!engState.videos.watched[v.id];
        let kindIcon, kindLabel;
        if (v.kind === 'channel')      { kindIcon = '📺'; kindLabel = 'Chaîne'; }
        else if (v.kind === 'video')   { kindIcon = '🎥'; kindLabel = 'Vidéo'; }
        else                           { kindIcon = '🔎'; kindLabel = 'Recherche'; }

        return `
            <div class="card" style="padding:16px;margin-bottom:10px;
                ${isWatched ? 'border-color:#14532d;background:linear-gradient(180deg,var(--bg-secondary) 0%,rgba(20,83,45,0.08) 100%);' : ''}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
                    <div style="flex:1">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
                            <span style="font-size:11px;color:var(--text-muted)">${kindIcon} ${kindLabel}</span>
                            <span class="badge" style="background:#1e3a5f;color:#93c5fd;
                                border:1px solid #3b82f6;font-size:10px;padding:2px 8px">
                                ${meta.icon} ${engEscape(meta.label)}</span>
                            <span class="badge" style="background:transparent;color:${lvl.color};
                                border:1px solid ${lvl.color};font-size:10px;padding:2px 8px">
                                ${lvl.label}</span>
                            ${isWatched ? `<span class="badge" style="background:#14532d;color:#86efac;
                                border:1px solid #14532d;font-size:10px;padding:2px 8px">✓ Vu</span>` : ''}
                        </div>
                        <div style="font-size:15px;color:var(--text-bright);font-weight:600;margin-bottom:6px">
                            ${engEscape(v.title)}
                        </div>
                        <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:10px">
                            ${engEscape(v.description)}
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap">
                            <button class="btn btn-primary" onclick="engOpenVideo('${engEscapeAttr(v.id)}','${engEscapeAttr(v.url)}')"
                                style="font-size:12px;padding:6px 14px">
                                ${v.kind === 'channel' ? '📺 Ouvrir la chaîne'
                                  : v.kind === 'video' ? '▶️ Regarder la vidéo'
                                  : '🔎 Lancer la recherche YouTube'}
                            </button>
                            <button class="btn btn-outline" onclick="engToggleVideoWatched('${engEscapeAttr(v.id)}')"
                                style="font-size:11px;padding:6px 10px">
                                ${isWatched ? '↺ Marquer comme à voir' : '✓ Marquer vu'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    root.innerHTML = `
        <div style="background:var(--bg-tertiary);border:1px solid var(--border-light);
            border-radius:10px;padding:12px 14px;margin-bottom:14px;display:flex;
            align-items:center;gap:12px;flex-wrap:wrap">
            <span style="font-size:12px;color:var(--text-secondary)">
                Progression : <strong style="color:#86efac">${watchedCount}</strong> /
                <strong>${totalCount}</strong> ressources vues
            </span>
            <div class="progress-bar" style="flex:1;min-width:120px">
                <div class="progress-fill" style="width:${progressPct}%"></div>
            </div>
            <span style="font-size:12px;color:var(--text-muted)">${progressPct}%</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
            ${themeChips}
            ${engState.videos.theme ? `<button class="btn btn-outline" onclick="engToggleVideoTheme('${engState.videos.theme}')"
                style="font-size:12px;padding:5px 10px;color:#fca5a5">↺ Tous</button>` : ''}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;line-height:1.5">
            Cliquer sur une vidéo l'ouvre dans un nouvel onglet et la marque automatiquement comme vue.
            Sélection May 2026 — chaînes éducatives reconnues (ACCA, Adam Deller, IFRS Foundation, etc.).
        </div>
        <div>${list}</div>
    `;
}

function engPatternRevealHint() {
    // Hint = show the first 3 words of the expected EN
    const patterns = (engState.data && engState.data.patterns) || [];
    const pat = patterns.find(p => p.id === engState.constructor.currentPatternId);
    if (!pat) return;
    const example = (pat.examples || [])[engState.constructor.currentExampleIdx];
    const expected = example ? pat.en_template.replace(/\{[^}]+\}/g, example.en) : pat.en_template;
    const words = expected.split(/\s+/);
    const hint = words.slice(0, Math.max(3, Math.ceil(words.length / 4))).join(' ');
    alert('💡 Début attendu :\n\n' + hint + '...');
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
window.engSpeak = engSpeak;
window.engSpeakCard = engSpeakCard;
window.engSpeakPhrase = engSpeakPhrase;
window.engToggleAudioAutoplay = engToggleAudioAutoplay;
window.engSetAudioVoice = engSetAudioVoice;
window.engSetAudioRate = engSetAudioRate;
window.engToggleConstructorCat = engToggleConstructorCat;
window.engResetConstructorCat = engResetConstructorCat;
window.engStartPatternExercise = engStartPatternExercise;
window.engExitPatternExercise = engExitPatternExercise;
window.engPatternCheck = engPatternCheck;
window.engPatternReset = engPatternReset;
window.engPatternNextExample = engPatternNextExample;
window.engPatternRevealHint = engPatternRevealHint;
window.engToggleVideoTheme = engToggleVideoTheme;
window.engToggleVideoWatched = engToggleVideoWatched;
window.engOpenVideo = engOpenVideo;
window.engStartConversation = engStartConversation;
window.engExitConversation = engExitConversation;
window.engConvChoose = engConvChoose;
window.engConvAdvance = engConvAdvance;
window.engConvSpeakLine = engConvSpeakLine;
window.engInsertTemplate = engInsertTemplate;
window.engToggleEssentialDone = engToggleEssentialDone;
window.engToggleEssentialGroup = engToggleEssentialGroup;
window.engSpeakEssential = engSpeakEssential;
window.engDictationNext = engDictationNext;
window.engDictationReplay = engDictationReplay;
window.engDictationSetSource = engDictationSetSource;
window.engDictationCheck = engDictationCheck;
window.engDictationSkip = engDictationSkip;
