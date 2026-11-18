/**
 * api-client-static.js — Adaptateur 100% statique pour version MOBILE.
 *
 * Mode WEB STATIC (GitHub Pages, pas de backend Python ni FastAPI) :
 *   - Lit les data/*.json directement via fetch
 *   - Stocke la progression en localStorage (séparé du desktop)
 *   - Stubs propres pour les features Python-only (AI, PDF, Excel)
 *
 * Détection du mode : pas de window.pywebview ET pas de backend.
 *
 * Doit être chargé EN PREMIER dans index.html (avant les autres JS).
 *
 * Source de vérité : api.py côté desktop. Ce fichier ne re-implémente
 * QUE les méthodes utilisées par les JS frontend (filtres, lectures).
 * Il ne reproduit pas la logique de cache mtime-aware Python (pas
 * nécessaire en static, le navigateur cache HTTP).
 */

(function () {
    'use strict';

    // Si pywebview est présent (desktop) → on ne fait rien.
    if (typeof window.pywebview !== 'undefined') {
        console.log('[api-static] Mode DESKTOP — pywebview natif utilisé');
        return;
    }

    console.log('[api-static] Mode MOBILE/WEB statique activé');

    // ========================================================
    // Cache des fichiers data
    // ========================================================

    // Cache de PROMESSES : deux appels simultanés au même fichier = un seul téléchargement.
    const _dataCache = {};

    function _loadJson(filename) {
        if (!_dataCache[filename]) _dataCache[filename] = (async () => {
            try {
                const r = await fetch('data/' + filename, { cache: 'no-cache' });
                if (!r.ok) {
                    console.warn('[api-static] HTTP', r.status, 'on', filename);
                    return null;
                }
                return await r.json();
            } catch (e) {
                console.error('[api-static] fetch failed:', filename, e);
                return null;
            }
        })();
        return _dataCache[filename];
    }

    // ========================================================
    // Helpers localStorage (progression utilisateur)
    // ========================================================

    let _qcmCatalogP = null;

    const LS_PREFIX = 'swisscpa_static_';

    function _lsGet(key, fallback) {
        try {
            const v = localStorage.getItem(LS_PREFIX + key);
            if (v == null) return fallback;
            return JSON.parse(v);
        } catch (_) { return fallback; }
    }

    function _lsSet(key, value) {
        try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); }
        catch (e) { console.warn('[api-static] localStorage write failed:', e); }
    }

    // Module d'une flashcard : « M2L7 » dans la sous-catégorie, sinon d'après la catégorie.
    function _fcModuleOf(c) {
        const cat = c.cat || c.category || '', sub = c.sub || c.subcategory || '';
        const m = sub.match(/\bM(\d{1,2})L\d/);
        if (m) return 'M' + m[1];
        if (cat === 'Expert suisse') return 'M1';
        if (cat === 'Fiscalité') return /TVA/.test(sub) ? 'M8' : 'M7';
        if (cat === 'Swiss GAAP RPC') return /^RPC 30\b/.test(sub) ? 'M11' : 'M3';
        if (cat === 'IFRS / IAS') return /^(IFRS (3|10|11|12)|IAS 28)\b/.test(sub) ? 'M11' : 'M4';
        if (cat === 'Audit / ISA') return /\bISA (5[6-9]\d|7\d\d)\b/.test(sub) ? 'M10' : 'M5';
        return '';
    }

    function _flashcardsProgress() { return _lsGet('fc_progress', {}); }
    function _saveFlashcardsProgress(p) { _lsSet('fc_progress', p); }

    function _qcmTracking() {
        const t = _lsGet('qcm_tracking', null) || {};
        t.stats = t.stats || {}; t.bookmarks = t.bookmarks || {}; t.sessions = t.sessions || []; t.notes = t.notes || {};
        delete t.due_ids;  // calculé à la lecture, jamais stocké
        return t;
    }
    function _saveQcmTracking(t) { const c = Object.assign({}, t); delete c.due_ids; _lsSet('qcm_tracking', c); }
    // « Point faible » : au moins 2 essais et moins de 60 % de réussite (même règle que qcm.js).
    function _qcmIsWeak(s) { return !!s && s.attempts >= 2 && s.accuracy < 60; }
    // Questions à revoir : date de révision atteinte ; ancien suivi sans date → dernière réponse fausse.
    function _qcmDueIds(t) {
        const now = Date.now();
        return Object.keys(t.stats || {}).filter(id => {
            const s = t.stats[id];
            if (!s) return false;
            if (s.next_review) return new Date(s.next_review).getTime() <= now;
            return s.last_was_correct === false;
        });
    }

    // ── Journal d'activité quotidien (Plan du jour, série 🔥) ──
    // localStorage swisscpa_daily = { "AAAA-MM-JJ": { fc, q, l } } — 120 derniers jours.
    // fc = flashcards notées, q = QCM répondus, l = étapes / questions de leçon.
    const DAILY_KEY = 'swisscpa_daily';
    function _dayKey(d) {
        d = d || new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function _dailyAll() {
        try { return JSON.parse(localStorage.getItem(DAILY_KEY) || '{}') || {}; } catch (_) { return {}; }
    }
    function _logDaily(kind, n) {
        try {
            const all = _dailyAll();
            const k = _dayKey();
            const day = all[k] = all[k] || {};
            day[kind] = (day[kind] || 0) + (n || 1);
            const keys = Object.keys(all).sort();
            while (keys.length > 120) delete all[keys.shift()];
            localStorage.setItem(DAILY_KEY, JSON.stringify(all));
            window.dispatchEvent(new CustomEvent('swisscpa-activity', { detail: { kind } }));
        } catch (_) { /* stockage plein ou bloqué : on ignore */ }
    }
    function _dailyTotal(d) { return d ? (d.fc || 0) + (d.q || 0) + (d.l || 0) + (d.seed || 0) : 0; }
    // Série 🔥 : jours consécutifs avec au moins une activité, jusqu'à aujourd'hui
    // (ou hier si rien n'a encore été fait aujourd'hui : la série n'est pas perdue avant minuit).
    function _dailyStreak() {
        const all = _dailyAll();
        const d = new Date(); d.setHours(12, 0, 0, 0);
        if (!_dailyTotal(all[_dayKey(d)])) d.setDate(d.getDate() - 1);
        let n = 0;
        while (_dailyTotal(all[_dayKey(d)]) > 0 && n < 400) { n++; d.setDate(d.getDate() - 1); }
        return n;
    }
    const GOAL_KEY = 'swisscpa_daily_goal';
    function _dailyGoal() { const g = parseInt(localStorage.getItem(GOAL_KEY) || '', 10); return g > 0 ? g : 30; }
    function _setDailyGoal(g) { try { localStorage.setItem(GOAL_KEY, String(g)); } catch (_) {} }
    // Migration unique : l'ancienne série (visites de la Révision active, swisscpa_streak)
    // est reportée dans le journal pour ne pas repartir de zéro.
    (function _dailySeed() {
        try {
            if (localStorage.getItem(DAILY_KEY)) return;
            const old = JSON.parse(localStorage.getItem('swisscpa_streak') || 'null');
            const all = {};
            if (old && old.streak > 0 && old.lastActive) {
                const d = new Date(old.lastActive + 'T12:00:00');
                if ((Date.now() - d.getTime()) / 86400000 <= 2) {
                    for (let i = 0; i < Math.min(old.streak, 120); i++) { all[_dayKey(d)] = { seed: 1 }; d.setDate(d.getDate() - 1); }
                }
            }
            localStorage.setItem(DAILY_KEY, JSON.stringify(all));
        } catch (_) { /* stockage indisponible */ }
    })();
    window.swisscpaDaily = { log: _logDaily, all: _dailyAll, dayKey: _dayKey, total: _dailyTotal,
                             streak: _dailyStreak, goal: _dailyGoal, setGoal: _setDailyGoal };

    function _normProgress() { return _lsGet('norm_progress', {}); }
    function _saveNormProgress(p) { _lsSet('norm_progress', p); }

    function _englishProgress() { return _lsGet('english_progress', {}); }
    function _saveEnglishProgress(p) { _lsSet('english_progress', p); }

    function _quizHistory() { return _lsGet('quiz_history', []); }
    function _saveQuizHistory(h) { _lsSet('quiz_history', h); }

    function _sessionsHistory() { return _lsGet('sessions', []); }
    function _saveSessionsHistory(h) { _lsSet('sessions', h); }

    // ========================================================
    // SM-2 spaced repetition (basique, côté client)
    // ========================================================

    function _sm2Update(card, rating) {
        // rating: 0=Again, 1=Hard, 2=Good, 3=Easy
        const now = new Date();
        let ease = card.ease_factor || 2.5;
        let reviews = (card.review_count || 0) + 1;
        let interval = card.interval || 1;
        let mastery = card.mastery || 'not_started';

        if (rating === 0) {
            ease = Math.max(1.3, ease - 0.2);
            interval = 1;
            mastery = 'again';
        } else if (rating === 1) {
            ease = Math.max(1.3, ease - 0.15);
            interval = Math.max(1, Math.round(interval * 1.2));
            mastery = 'learning';
        } else if (rating === 2) {
            interval = Math.round(interval * ease);
            mastery = mastery === 'learning' ? 'good' : 'good';
        } else if (rating === 3) {
            ease = Math.min(3.0, ease + 0.15);
            interval = Math.round(interval * ease * 1.3);
            mastery = 'mastered';
        }

        const next = new Date(now.getTime() + interval * 24 * 3600 * 1000);
        return {
            ease_factor: ease,
            review_count: reviews,
            correct_count: (card.correct_count || 0) + (rating > 0 ? 1 : 0),
            wrong_count: (card.wrong_count || 0) + (rating === 0 ? 1 : 0),
            last_reviewed: now.toISOString(),
            next_review: next.toISOString(),
            interval,
            mastery,
        };
    }

    // ========================================================
    // Implémentation des méthodes pywebview.api
    // ========================================================

    const api = {

        // ── Flashcards ───────────────────────────────────────

        async get_flashcards(category, subcategory, difficulty, due_only,
                             mastery, search, wrong_only, module_code,
                             not_seen_days, never_seen, min_accuracy,
                             max_accuracy, limit) {
            const all = await _loadJson('flashcards.json') || [];
            const progress = _flashcardsProgress();
            const now = new Date();
            const items = all.map(c => {
                const p = progress[c.id] || {};
                return Object.assign({}, c, {
                    review_count: p.review_count || 0,
                    correct_count: p.correct_count || 0,
                    wrong_count: p.wrong_count || 0,
                    mastery: p.mastery || 'not_started',
                    last_reviewed: p.last_reviewed,
                    next_review: p.next_review,
                    ease_factor: p.ease_factor || 2.5,
                    // Schema desktop expose `category`, `subcategory`. JSON utilise `cat`, `sub`.
                    category: c.category || c.cat || '',
                    subcategory: c.subcategory || c.sub || '',
                    difficulty: c.difficulty || c.d || 'moyen',
                    question: c.question || c.q || '',
                    answer: c.answer || c.a || '',
                    module_code: c.module_code || _fcModuleOf(c),
                });
            });

            let filtered = items;
            if (category) filtered = filtered.filter(c => c.category === category);
            if (subcategory) filtered = filtered.filter(c => c.subcategory === subcategory);
            if (difficulty) filtered = filtered.filter(c => c.difficulty === difficulty);
            if (mastery) filtered = filtered.filter(c => c.mastery === mastery);
            if (module_code) filtered = filtered.filter(c => c.module_code === module_code);
            if (wrong_only) filtered = filtered.filter(c => (c.wrong_count || 0) > 0);
            if (never_seen) filtered = filtered.filter(c => (c.review_count || 0) === 0);
            if (due_only) {
                filtered = filtered.filter(c => !c.next_review || new Date(c.next_review) <= now);
            }
            if (search) {
                const q = search.toLowerCase();
                filtered = filtered.filter(c =>
                    (c.question || '').toLowerCase().includes(q) ||
                    (c.answer || '').toLowerCase().includes(q));
            }
            if (typeof min_accuracy === 'number') {
                filtered = filtered.filter(c => {
                    const total = (c.correct_count || 0) + (c.wrong_count || 0);
                    if (!total) return min_accuracy === 0;
                    return (c.correct_count / total * 100) >= min_accuracy;
                });
            }
            if (typeof max_accuracy === 'number') {
                filtered = filtered.filter(c => {
                    const total = (c.correct_count || 0) + (c.wrong_count || 0);
                    if (!total) return true;
                    return (c.correct_count / total * 100) <= max_accuracy;
                });
            }
            if (typeof not_seen_days === 'number') {
                const cutoff = new Date(now.getTime() - not_seen_days * 24 * 3600 * 1000);
                filtered = filtered.filter(c => !c.last_reviewed || new Date(c.last_reviewed) <= cutoff);
            }
            if (limit) filtered = filtered.slice(0, limit);
            return filtered;
        },

        async get_smart_deck(strategy, category, subcategory, module_code, difficulty, limit) {
            limit = limit || 20;
            const all = await api.get_flashcards(category, subcategory, difficulty);
            const now = new Date();

            let pool = all;
            const overdue = all.filter(c => c.next_review && new Date(c.next_review) <= now);
            const wrong = all.filter(c => (c.wrong_count || 0) > 0);
            const learning = all.filter(c => c.mastery === 'again' || c.mastery === 'learning');
            const fresh = all.filter(c => (c.review_count || 0) === 0);

            if (strategy === 'overdue') pool = [...overdue, ...wrong];
            else if (strategy === 'weak') pool = learning;
            else if (strategy === 'discovery') pool = fresh;
            else if (strategy === 'interleaving') {
                // shuffle balanced across categories
                const byCat = {};
                all.forEach(c => { (byCat[c.category] = byCat[c.category] || []).push(c); });
                pool = [];
                let i = 0;
                while (pool.length < limit && Object.keys(byCat).length) {
                    for (const k of Object.keys(byCat)) {
                        if (byCat[k].length) pool.push(byCat[k].shift());
                        if (pool.length >= limit) break;
                    }
                }
            }
            else { // balanced (default)
                const ovd = overdue.slice(0, Math.floor(limit * 0.4));
                const wk = learning.slice(0, Math.floor(limit * 0.3));
                const wr = wrong.slice(0, Math.floor(limit * 0.1));
                const fr = fresh.slice(0, Math.floor(limit * 0.1));
                const seen = new Set([...ovd, ...wk, ...wr, ...fr].map(c => c.id));
                const mix = all.filter(c => !seen.has(c.id)).slice(0, limit - seen.size);
                pool = [...ovd, ...wk, ...wr, ...fr, ...mix];
            }

            // dedupe by id
            const out = [];
            const seen = new Set();
            for (const c of pool) {
                if (!seen.has(c.id)) { seen.add(c.id); out.push(c); }
                if (out.length >= limit) break;
            }
            return {
                cards: out,
                breakdown: {
                    total: out.length,
                    overdue: out.filter(c => c.next_review && new Date(c.next_review) <= now).length,
                    wrong: out.filter(c => (c.wrong_count || 0) > 0).length,
                    weak: out.filter(c => c.mastery === 'again' || c.mastery === 'learning').length,
                    fresh: out.filter(c => (c.review_count || 0) === 0).length,
                    mastered: out.filter(c => c.mastery === 'mastered').length,
                },
                strategy: strategy || 'balanced',
            };
        },

        async update_flashcard(card_id, correct, rating) {
            const progress = _flashcardsProgress();
            const card = progress[card_id] || {};
            // Si rating fourni (Anki-like 0-3), on l'utilise. Sinon convert correct→rating.
            const r = (typeof rating === 'number') ? rating : (correct ? 2 : 0);
            progress[card_id] = _sm2Update(card, r);
            _saveFlashcardsProgress(progress);
            _logDaily('fc');
            return true;
        },

        async update_flashcard_result(card_id, rating) {
            return api.update_flashcard(card_id, null, rating);
        },

        async get_due_flashcards(limit) {
            return api.get_flashcards(null, null, null, true, null, null, null,
                                     null, null, false, null, null, limit || 30);
        },

        async get_flashcards_for_sprint(category, studied_only, limit) {
            const all = await api.get_flashcards(category);
            const filtered = studied_only ? all.filter(c => (c.review_count || 0) > 0) : all;
            // shuffle
            for (let i = filtered.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
            }
            return filtered.slice(0, limit || 25);
        },

        async get_flashcard_categories() {
            const all = await _loadJson('flashcards.json') || [];
            const cats = {};
            for (const c of all) {
                const cat = c.category || c.cat || '';
                if (!cat) continue;
                if (!cats[cat]) cats[cat] = { name: cat, count: 0, subs: new Set() };
                cats[cat].count++;
                const sub = c.subcategory || c.sub;
                if (sub) cats[cat].subs.add(sub);
            }
            return Object.values(cats).map(c => ({
                name: c.name, count: c.count, subs: Array.from(c.subs).sort(),
            }));
        },

        async get_sm2_stats() {
            const all = await api.get_flashcards();
            const out = {};
            for (const c of all) {
                const cat = c.category || 'Sans cat';
                if (!out[cat]) {
                    out[cat] = { mastered: 0, good: 0, learning: 0, again: 0, not_started: 0, total: 0 };
                }
                out[cat].total++;
                out[cat][c.mastery || 'not_started']++;
            }
            return out;
        },

        async get_review_stats() {
            const all = await api.get_flashcards();
            const now = new Date();
            return {
                total: all.length,
                never_seen: all.filter(c => (c.review_count || 0) === 0).length,
                overdue: all.filter(c => c.next_review && new Date(c.next_review) <= now).length,
                due: all.filter(c => c.next_review && new Date(c.next_review) <= now).length,
                mastered: all.filter(c => c.mastery === 'mastered').length,
                good: all.filter(c => c.mastery === 'good').length,
                learning: all.filter(c => c.mastery === 'learning').length,
                again: all.filter(c => c.mastery === 'again').length,
            };
        },

        // ── Quiz history & sessions ──────────────────────────

        async save_quiz(category, total, correct, failed_ids, duration) {
            const h = _quizHistory();
            h.unshift({
                id: Date.now(),
                date: new Date().toISOString(),
                category, total, correct, failed_ids, duration,
            });
            _saveQuizHistory(h.slice(0, 200));
            return true;
        },

        async get_quiz_history(limit) {
            return _quizHistory().slice(0, limit || 20);
        },

        async save_revision_session(...args) {
            const h = _sessionsHistory();
            h.unshift({ id: Date.now(), date: new Date().toISOString(), args });
            _saveSessionsHistory(h.slice(0, 200));
            return true;
        },

        async get_recent_sessions(limit) {
            return _sessionsHistory().slice(0, limit || 10);
        },

        // ── Modules / unified ────────────────────────────────

        async get_unified_modules() {
            const data = await _loadJson('unified_modules.json');
            return data || { modules: [] };
        },

        async get_trainer_courses() {
            const data = await _loadJson('trainer_courses.json');
            return data || { courses: [] };
        },

        // ── Base de cours Audit (MSA / NCR) ──
        async get_audit_manifest() {
            try {
                const r = await fetch('audit/manifest.json', { cache: 'no-cache' });
                if (!r.ok) return {};
                return await r.json();
            } catch (e) {
                console.warn('[api-static] get_audit_manifest:', e);
                return {};
            }
        },

        async get_audit_fiche(relPath) {
            if (!relPath || typeof relPath !== 'string') return null;
            const safe = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
            if (safe.includes('..')) return null;
            try {
                const r = await fetch('audit/' + safe, { cache: 'no-cache' });
                if (!r.ok) {
                    return '# Fiche à rédiger\n\n> 🔴 **Stub** — cette fiche '
                        + "n'a pas encore été générée.\n\n`" + safe + '`\n';
                }
                return await r.text();
            } catch (e) {
                console.warn('[api-static] get_audit_fiche:', e);
                return null;
            }
        },

        // ── Base de cours HEC ──
        async get_hec_manifest() {
            try {
                const r = await fetch('hec/manifest.json', { cache: 'no-cache' });
                if (!r.ok) return {};
                return await r.json();
            } catch (e) {
                console.warn('[api-static] get_hec_manifest:', e);
                return {};
            }
        },

        async get_hec_fiche(relPath) {
            if (!relPath || typeof relPath !== 'string') return null;
            const safe = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
            if (safe.includes('..')) return null;
            try {
                const r = await fetch('hec/' + safe, { cache: 'no-cache' });
                if (!r.ok) return null;
                return await r.text();
            } catch (e) {
                console.warn('[api-static] get_hec_fiche:', e);
                return null;
            }
        },

        async get_modules() {
            const u = await api.get_unified_modules();
            return (u.modules || []).map(m => ({ id: m.id, code: m.code, name: m.name }));
        },

        // ── Norms ────────────────────────────────────────────

        async get_norms_ifrs_rpc() {
            const data = await _loadJson('norms_ifrs_rpc.json');
            if (!data) return { norms: [] };
            // Strip html_content (pareil que api.py)
            for (const n of data.norms || []) {
                if (n.html_content) { n.has_html = true; delete n.html_content; }
            }
            return data;
        },

        async get_norm_html(norm_id) {
            const data = await _loadJson('norms_ifrs_rpc.json');
            if (!data) return '';
            const n = (data.norms || []).find(x => x.id === norm_id);
            return n && n.html_content ? n.html_content : '';
        },

        async update_norm(norm_code, category, confidence) {
            const p = _normProgress();
            const k = norm_code;
            p[k] = Object.assign({}, p[k], {
                confidence: confidence,
                category: category,
                last_revised: new Date().toISOString(),
                revision_count: ((p[k] && p[k].revision_count) || 0) + 1,
            });
            _saveNormProgress(p);
            return true;
        },

        async update_norm_progress(norm_code, category, confidence) {
            return api.update_norm(norm_code, category, confidence);
        },

        async get_norm_progress(norm_code) {
            const p = _normProgress();
            return norm_code ? (p[norm_code] || null) : p;
        },

        // ── Lessons (Notion) ─────────────────────────────────

        async get_lessons_for_norm(norm_code) {
            const lessons = await _loadJson('notion_lessons.json') || [];
            const code = (norm_code || '').trim();
            const codeNoSpace = code.replace(/\s/g, '');
            const numMatch = code.match(/\d+/);
            const num = numMatch ? numMatch[0] : '';
            const prefix = code.indexOf(' ') > 0 ? code.split(' ')[0].toUpperCase() : code.replace(/\d+$/, '').toUpperCase();
            const re = new RegExp(`(?<!\\d)${prefix}\\s*${num}(?!\\d)`, 'i');

            const seen = new Set();
            const out = [];
            for (const l of lessons) {
                const text = ((l.concept || '') + ' ' + (l.section || '')).toLowerCase();
                let matched = false;
                if (text.includes(code.toLowerCase()) || text.includes(codeNoSpace.toLowerCase())) matched = true;
                else if (re.test(text)) matched = true;
                else if ((l.section || '').toLowerCase().includes(code.toLowerCase())) matched = true;
                if (matched) {
                    const id = (l.concept || '').slice(0, 80);
                    if (!seen.has(id)) { seen.add(id); out.push(l); }
                }
            }
            return out;
        },

        async get_all_lessons() {
            const data = await _loadJson('notion_lessons.json');
            return data || [];
        },

        async get_lessons_stats() {
            const lessons = await api.get_all_lessons();
            const total = lessons.length;
            const done = lessons.filter(l => l.status === 'Done').length;
            const inProgress = lessons.filter(l => l.status === 'In progress').length;
            const byModule = {};
            for (const l of lessons) {
                const m = l.module || 'Sans module';
                if (!byModule[m]) byModule[m] = { total: 0, done: 0 };
                byModule[m].total++;
                if (l.status === 'Done') byModule[m].done++;
            }
            return { total, done, in_progress: inProgress, by_module: byModule };
        },

        async save_lesson_progress() { _logDaily('l'); return true; },
        // Liste [{norm_code, lesson_id, completed}] comme l'API desktop ; en web la
        // progression des leçons vit dans localStorage (swisscpa_trainer_progress).
        async get_trainer_progress() { return []; },

        // ── QCM ──────────────────────────────────────────────

        // Banque de QCM : data/qcm_catalog.json, PRÉ-CALCULÉ par tools/build_qcm_catalog.js
        // (lancé par sync_subapps.py) avec _build_qcm_catalog ci-dessous → la page QCM
        // charge ~1 Mo au lieu de trainer_courses + unified_modules + audit.json (12 Mo).
        // Repli : reconstruction à partir des sources si le fichier manque.
        async get_qcm_catalog() {
            if (!_qcmCatalogP) _qcmCatalogP = (async () => {
                const pre = await _loadJson('qcm_catalog.json');
                if (pre && Array.isArray(pre.questions) && pre.questions.length) return pre;
                return api._build_qcm_catalog();
            })();
            return _qcmCatalogP;
        },

        async _build_qcm_catalog() {
            const [tc, unified] = await Promise.all([api.get_trainer_courses(), api.get_unified_modules()]);
            const items = [];
            const summary = {};
            const seenIds = new Set();
            // Même énoncé présent à la fois dans un cours (trainer) et une leçon
            // (modules) → une seule fois dans la banque de QCM.
            const seenText = new Set();
            const textKey = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .toLowerCase().replace(/^\s*[a-d][.)]\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
            const isDupText = (t) => { const k = textKey(t); if (k.length > 25 && seenText.has(k)) return true; seenText.add(k); return false; };

            const inferDiff = (qtype, qtext, expl, explicit) => {
                if (['easy', 'medium', 'hard'].includes(explicit)) return explicit;
                if (qtype === 'vrai_faux') return 'easy';
                if ((expl || '').length >= 400 || /\d/.test(qtext || '')) return 'hard';
                return 'medium';
            };
            const addSummary = (mod, qtype, diff, mod_name) => {
                const s = summary[mod] = summary[mod] || {
                    module: mod, module_name: mod_name || '',
                    total: 0, mcq: 0, vrai_faux: 0, easy: 0, medium: 0, hard: 0,
                };
                s.total++; s[qtype] = (s[qtype] || 0) + 1; s[diff] = (s[diff] || 0) + 1;
            };

            // 1) trainer_courses
            for (const course of tc.courses || []) {
                const mod = course.module_code || '';
                if (!mod) continue;
                const norm_code = course.norm_code || '';
                const norm_title = course.norm_title || '';
                const course_name = course.module || '';
                for (const lesson of course.lessons || []) {
                    const lid = lesson.id || '';
                    const ltitle = lesson.title || '';
                    let idx = 0;
                    for (const q of lesson.questions || []) {
                        if (!['mcq', 'vrai_faux'].includes(q.type)) { idx++; continue; }
                        const qid = q.id || `${mod}_${norm_code}_${lid}_${idx}`;
                        if (seenIds.has(qid) || isDupText(q.question)) { idx++; continue; }
                        seenIds.add(qid);
                        const diff = inferDiff(q.type, q.question, q.explanation, q.difficulty);
                        items.push({
                            id: qid, module: mod, module_name: course_name,
                            norm_code, norm_title, lesson_id: lid, lesson_title: ltitle,
                            section_id: q.section_id || null,
                            type: q.type, question: q.question || '',
                            options: q.options || null, answer: q.answer,
                            explanation: q.explanation || '', difficulty: diff,
                        });
                        addSummary(mod, q.type, diff, course_name);
                        idx++;
                    }
                }
            }

            // 2) unified_modules → lessons_ifp + norms
            for (const m of unified.modules || []) {
                const mod = m.code || '';
                if (!mod) continue;
                const mod_name = m.name || '';
                for (const lesson of m.lessons_ifp || []) {
                    const lid = lesson.id || '';
                    const lcode = lesson.code || lid;
                    const ltitle = lesson.title || '';
                    let idx = 0;
                    for (const q of lesson.questions || []) {
                        if (!['mcq', 'vrai_faux'].includes(q.type)) { idx++; continue; }
                        const qid = q.id || `${mod}_${lid}_q${idx}`;
                        if (seenIds.has(qid) || isDupText(q.question)) { idx++; continue; }
                        seenIds.add(qid);
                        const diff = inferDiff(q.type, q.question, q.explanation, q.difficulty);
                        items.push({
                            id: qid, module: mod, module_name: mod_name,
                            norm_code: lcode, norm_title: ltitle,
                            lesson_id: lid, lesson_title: ltitle,
                            section_id: q.section_id || null,
                            type: q.type, question: q.question || '',
                            options: q.options || null, answer: q.answer,
                            explanation: q.explanation || '', difficulty: diff,
                        });
                        addSummary(mod, q.type, diff, mod_name);
                        idx++;
                    }
                }
                for (const n of m.norms || []) {
                    if (typeof n !== 'object' || !n) continue;
                    const nid = n.id || '';
                    const ncode = n.code || nid;
                    const ntitle = n.title || ncode;
                    let idx = 0;
                    for (const q of n.questions || []) {
                        if (!['mcq', 'vrai_faux'].includes(q.type)) { idx++; continue; }
                        const qid = q.id || `${mod}_${nid}_q${idx}`;
                        if (seenIds.has(qid) || isDupText(q.question)) { idx++; continue; }
                        seenIds.add(qid);
                        const diff = inferDiff(q.type, q.question, q.explanation, q.difficulty);
                        items.push({
                            id: qid, module: mod, module_name: mod_name,
                            norm_code: ncode, norm_title: ntitle,
                            lesson_id: nid, lesson_title: ntitle,
                            section_id: q.section_id || null,
                            type: q.type, question: q.question || '',
                            options: q.options || null, answer: q.answer,
                            explanation: q.explanation || '', difficulty: diff,
                        });
                        addSummary(mod, q.type, diff, mod_name);
                        idx++;
                    }
                }
            }

            // 4) Audit ISA : audit.json → annuaire_cours[num].mcq (module virtuel "AUDIT")
            try {
                const audit = await api.get_audit_data();
                const ac = (audit && audit.annuaire_cours) || {};
                const stdByNum = {};
                const series = (audit && audit.annuaire && audit.annuaire.series) || [];
                for (const sr of series) {
                    for (const std of (sr.standards || [])) {
                        if (std && std.num != null) stdByNum[String(std.num)] = std;
                    }
                }
                for (const num of Object.keys(ac)) {
                    const mcqs = (ac[num] && ac[num].mcq) || [];
                    if (!mcqs.length) continue;
                    const std = stdByNum[String(num)] || {};
                    const code = std.code || ('ISA ' + num);
                    const title = std.title_fr || '';
                    let idx = 0;
                    for (const q of mcqs) {
                        const qid = q.id || `AUDIT_${num}_q${idx}`;
                        if (seenIds.has(qid) || isDupText(q.question)) { idx++; continue; }
                        seenIds.add(qid);
                        const diff = ['easy', 'medium', 'hard'].includes(q.difficulty)
                            ? q.difficulty : inferDiff('mcq', q.question, q.explanation, q.difficulty);
                        items.push({
                            id: qid, module: 'AUDIT', module_name: 'Normes ISA (Annuaire)',
                            norm_code: code, norm_title: title,
                            lesson_id: 'isa_' + num, lesson_title: code + ' — ' + title,
                            section_id: null,
                            type: 'mcq', question: q.question || '',
                            options: q.options || null, answer: q.answer,
                            explanation: q.explanation || '', difficulty: diff,
                        });
                        addSummary('AUDIT', 'mcq', diff, 'Normes ISA (Annuaire)');
                        idx++;
                    }
                }
            } catch (e) { /* audit.json absent → on ignore */ }

            items.sort((a, b) => {
                if (a.module !== b.module) return a.module.localeCompare(b.module);
                if ((a.norm_code || '') !== (b.norm_code || '')) return (a.norm_code || '').localeCompare(b.norm_code || '');
                if ((a.lesson_id || '') !== (b.lesson_id || '')) return a.lesson_id.localeCompare(b.lesson_id);
                return (a.section_id || '').localeCompare(b.section_id || '');
            });
            const summary_list = Object.values(summary).sort((a, b) => a.module.localeCompare(b.module));
            return { questions: items, summary: summary_list };
        },

        async get_qcm_for_lesson(lesson_id) {
            if (!lesson_id) return [];
            const cat = await api.get_qcm_catalog();
            return (cat.questions || []).filter(q => q.lesson_id === lesson_id);
        },

        async qcm_record_attempt(question_id, was_correct, user_answer, confidence,
                                 time_ms, session_id, module, norm_code) {
            const t = _qcmTracking();
            const stats = t.stats[question_id] || { attempts: 0, correct: 0, accuracy: 0 };
            stats.attempts++;
            if (was_correct) stats.correct++;
            stats.accuracy = Math.round(stats.correct / stats.attempts * 100);
            stats.last_attempt = new Date().toISOString();
            stats.last_was_correct = was_correct;
            // Répétition espacée : ratée → à revoir demain ; réussie → 4, 10, 30 puis 90 jours.
            stats.streak = was_correct ? (stats.streak || 0) + 1 : 0;
            const days = was_correct ? [4, 10, 30, 90][Math.min(stats.streak, 4) - 1] : 1;
            stats.next_review = new Date(Date.now() + days * 86400000).toISOString();
            t.stats[question_id] = stats;
            _saveQcmTracking(t);
            _logDaily('q');
            return true;
        },

        async get_qcm_tracking_data() {
            const t = _qcmTracking();
            t.due_ids = _qcmDueIds(t);
            return t;
        },

        async qcm_toggle_bookmark(question_id) {
            const t = _qcmTracking();
            t.bookmarks[question_id] = t.bookmarks[question_id] || {};
            t.bookmarks[question_id].starred = !t.bookmarks[question_id].starred;
            _saveQcmTracking(t);
            return t.bookmarks[question_id].starred;
        },

        async qcm_set_note(question_id, note) {
            const t = _qcmTracking();
            t.bookmarks[question_id] = t.bookmarks[question_id] || {};
            t.bookmarks[question_id].note = note;
            _saveQcmTracking(t);
            return true;
        },

        // Renvoie des IDENTIFIANTS de questions (qcm.js filtre son catalogue avec).
        async qcm_get_selection(kind, limit) {
            const t = _qcmTracking();
            const cat = await api.get_qcm_catalog();
            const all = cat.questions || [];
            const lim = limit || 50;
            const st = (q) => t.stats[q.id];
            let pick;
            if (kind === 'bookmarks' || kind === 'starred') {
                pick = all.filter(q => t.bookmarks[q.id] && t.bookmarks[q.id].starred);
            } else if (kind === 'wrong' || kind === 'recent_wrong') {
                pick = all.filter(q => st(q) && st(q).last_was_correct === false)
                    .sort((a, b) => String(st(b).last_attempt || '').localeCompare(String(st(a).last_attempt || '')));
            } else if (kind === 'weak') {
                pick = all.filter(q => _qcmIsWeak(st(q)))
                    .sort((a, b) => st(a).accuracy - st(b).accuracy || st(b).attempts - st(a).attempts);
            } else if (kind === 'due') {
                const due = new Set(_qcmDueIds(t));
                pick = all.filter(q => due.has(q.id))
                    .sort((a, b) => String(st(a).next_review || '').localeCompare(String(st(b).next_review || '')));
            } else {
                pick = all;
            }
            return pick.slice(0, lim).map(q => q.id);
        },

        async qcm_create_session(...args) {
            const t = _qcmTracking();
            const sid = Date.now();
            t.sessions = t.sessions || [];
            t.sessions.unshift({ id: sid, started: new Date().toISOString(), args });
            _saveQcmTracking(t);
            return sid;
        },

        async qcm_complete_session(session_id, ...args) {
            const t = _qcmTracking();
            const s = (t.sessions || []).find(x => x.id === session_id);
            if (s) {
                s.completed = new Date().toISOString();
                s.args2 = args;
                _saveQcmTracking(t);
            }
            return true;
        },

        async qcm_get_sessions_history() { return _qcmTracking().sessions || []; },
        async qcm_get_predicted_exam_score() { return null; },
        async qcm_get_topic_mastery() { return {}; },

        // ── Audit / fiscalité / FS / comparaisons ────────────

        async get_audit_data() { return await _loadJson('audit.json') || {}; },
        async get_oral_data() { return await _loadJson('oral.json') || {}; },
        async get_audit_seuils() { return await _loadJson('audit_seuils.json') || { categories: [] }; },
        async get_audit_section(section) {
            const d = await api.get_audit_data();
            return d[section] || {};
        },
        async save_audit_progress() { return true; },
        async get_audit_progress() { return {}; },

        async get_comparisons() { return await _loadJson('comparisons.json') || { themes: [] }; },
        async get_financial_statements() { return await _loadJson('financial_statements.json') || { statements: [], notes: [] }; },

        async get_notion_lessons() { return await _loadJson('notion_lessons.json') || []; },

        // ── Reference / search ───────────────────────────────

        async get_glossary() { return await _loadJson('references.json') || []; },
        async get_library() { return []; },
        async get_dashboard_stats() {
            const stats = await api.get_review_stats();
            const cat = await api.get_qcm_catalog();
            return {
                flashcards_total: stats.total,
                flashcards_mastered: stats.mastered,
                flashcards_due: stats.due,
                qcms_total: (cat.questions || []).length,
            };
        },
        async get_session_recommendation() {
            const h = new Date().getHours();
            if (h >= 8 && h <= 12) {
                return { window: 'optimal', icon: '🧠', label: 'Fenêtre optimale',
                    message: 'Idéal pour les normes complexes', color: '#10b981',
                    suggested_mode: 'cours' };
            }
            if (h >= 13 && h <= 16) {
                return { window: 'medium', icon: '⚡', label: 'Bonne fenêtre',
                    message: 'Quiz et flashcards', color: '#f59e0b',
                    suggested_mode: 'sprint' };
            }
            return { window: 'degraded', icon: '🌙', label: 'Fenêtre réduite',
                message: 'Sprint de 10 cartes', color: '#94a3b8',
                suggested_mode: 'sprint' };
        },

        // ── English module ───────────────────────────────────

        async get_english_data() {
            return await _loadJson('english_module.json') || {
                version: 1, vocab: [], phrases: [],
            };
        },

        async get_english_stats() {
            const d = await api.get_english_data();
            const progress = _englishProgress();
            const byDomain = {};
            const byLevel = {};
            for (const v of d.vocab || []) {
                byDomain[v.domain] = (byDomain[v.domain] || 0) + 1;
                byLevel[v.level] = (byLevel[v.level] || 0) + 1;
            }
            const masteryCount = { again: 0, learning: 0, good: 0, mastered: 0 };
            for (const k of Object.keys(progress)) {
                const m = progress[k].mastery || 'not_started';
                if (masteryCount[m] !== undefined) masteryCount[m]++;
            }
            return {
                total_vocab: (d.vocab || []).length,
                total_phrases: (d.phrases || []).length,
                by_domain: byDomain, by_level: byLevel, progress: masteryCount,
            };
        },

        async record_english_attempt(card_id, rating) {
            const p = _englishProgress();
            const card = p[card_id] || { review_count: 0, correct_count: 0, wrong_count: 0 };
            card.review_count++;
            const r = parseInt(rating, 10);
            if (r === 0) { card.wrong_count++; card.mastery = 'again'; }
            else if (r === 1) { card.correct_count++; card.mastery = 'learning'; }
            else if (r === 2) { card.correct_count++; card.mastery = 'good'; }
            else { card.correct_count++; card.mastery = 'mastered'; }
            card.last_reviewed = new Date().toISOString();
            p[card_id] = card;
            _saveEnglishProgress(p);
            return { ok: true, fallback: 'localStorage' };
        },

        // ── Méthodes additionnelles (manquaient au premier shim) ──

        // Alias : get_norms_data == get_norms_ifrs_rpc
        async get_norms_data() {
            return await api.get_norms_ifrs_rpc();
        },

        // get_norms = progression SM-2 par norme (base desktop). Pas de DB en
        // web → tableau vide (les onglets dégradent proprement, plus d'erreur console).
        async get_norms() { return []; },

        async get_norm_detail(norm_code) {
            const data = await _loadJson('norms_ifrs_rpc.json');
            if (!data) return null;
            const code = (norm_code || '').toLowerCase().replace(/\s/g, '');
            return (data.norms || []).find(n =>
                (n.code || '').toLowerCase().replace(/\s/g, '') === code ||
                (n.id || '').toLowerCase() === code
            ) || null;
        },

        // Progression par module (page Progression) : flashcards (module déduit de la
        // catégorie), leçons du cours (Révision active), normes et QCM du module.
        async get_module_stats() {
            const [u, fcs, tc, cat] = await Promise.all([
                api.get_unified_modules(), api.get_flashcards(), api.get_trainer_courses(), api.get_qcm_catalog(),
            ]);
            const now = new Date();
            const later = (a, b) => (!a ? b : (!b ? a : (new Date(b) > new Date(a) ? b : a)));
            let tp = [];
            try { tp = JSON.parse(localStorage.getItem('swisscpa_trainer_progress') || '[]') || []; } catch (_) {}
            const doneAt = {};
            tp.forEach(p => { if (p && p.completed) doneAt[p.norm_code + '|' + p.lesson_id] = p.completed_at || null; });
            const qstats = (_qcmTracking().stats) || {};
            const S = {};
            const get = code => S[code] || (S[code] = {
                fc_total: 0, fc_mastered: 0, fc_good: 0, fc_learning: 0, fc_again: 0, fc_not_started: 0, fc_due: 0,
                sub_lessons_total: 0, sub_lessons_completed: 0, revised_norms: new Set(),
                qcm_total: 0, qcm_correct: 0, qcm_wrong: 0, last_activity: null,
            });
            for (const c of fcs) {
                if (!c.module_code) continue;
                const s = get(c.module_code);
                s.fc_total++;
                const k = { mastered: 'fc_mastered', good: 'fc_good', learning: 'fc_learning', again: 'fc_again' }[c.mastery] || 'fc_not_started';
                s[k]++;
                if (c.next_review && new Date(c.next_review) <= now) s.fc_due++;
                s.last_activity = later(s.last_activity, c.last_reviewed);
            }
            for (const course of (tc && tc.courses) || []) {
                const s = get(course.module_code || course.module || '');
                for (const l of course.lessons || []) {
                    s.sub_lessons_total++;
                    const key = course.norm_code + '|' + l.id;
                    if (key in doneAt) {
                        s.sub_lessons_completed++; s.revised_norms.add(course.norm_code);
                        s.last_activity = later(s.last_activity, doneAt[key]);
                    }
                }
            }
            for (const q of (cat && cat.questions) || []) {
                const s = get(q.module || '');
                s.qcm_total++;
                const st = qstats[q.id];
                if (st && st.attempts) {
                    if (st.correct > 0) s.qcm_correct++; else s.qcm_wrong++;
                    s.last_activity = later(s.last_activity, st.last_attempt);
                }
            }
            const pct = (a, b) => (b ? a / b : null);
            return (u.modules || []).map(m => {
                const s = get(m.code);
                const norms = (m.norms || []).filter(n => typeof n === 'object');
                const parts = [pct(s.fc_mastered + s.fc_good, s.fc_total), pct(s.sub_lessons_completed, s.sub_lessons_total),
                               pct(s.qcm_correct, s.qcm_total)].filter(x => x !== null);
                return {
                    id: m.id, code: m.code, name: m.name || '', year: m.year || '',
                    hours_async: m.hours_async || 0, hours_sync: m.hours_sync || 0,
                    fc_total: s.fc_total, fc_mastered: s.fc_mastered, fc_good: s.fc_good, fc_learning: s.fc_learning,
                    fc_again: s.fc_again, fc_not_started: s.fc_not_started, fc_due: s.fc_due,
                    sub_lessons_total: s.sub_lessons_total, sub_lessons_completed: s.sub_lessons_completed,
                    norms_total: norms.length,
                    norms_filled: norms.filter(n => (n.sections || []).length || n.html_content || (n.questions || []).length).length,
                    norms_revised: norms.filter(n => s.revised_norms.has(n.code)).length,
                    qcm_total: s.qcm_total, qcm_correct: s.qcm_correct, qcm_wrong: s.qcm_wrong,
                    last_activity: s.last_activity,
                    progress_percent: parts.length ? Math.round(parts.reduce((x, y) => x + y, 0) / parts.length * 1000) / 10 : 0,
                };
            });
        },

        async get_references(section) {
            const refs = await _loadJson('references.json');
            if (!refs) return section ? [] : {};
            if (!section) return refs;
            // refs peut être un dict {section: [...]} ou un array
            if (Array.isArray(refs)) return refs;
            return refs[section] || [];
        },

        async search_all(query) {
            const q = (query || '').trim().toLowerCase();
            if (!q || q.length < 2) return [];
            const results = [];
            const u = await api.get_unified_modules();

            // Cherche dans les leçons et normes des modules
            for (const m of u.modules || []) {
                for (const l of m.lessons_ifp || []) {
                    const haystack = (
                        (l.title || '') + ' ' +
                        (l.content || []).map(s => (s.title || '') + ' ' + (s.body || '')).join(' ')
                    ).toLowerCase();
                    if (haystack.includes(q)) {
                        results.push({
                            type: 'lesson', module: m.code,
                            id: l.id, title: l.title || l.id,
                        });
                    }
                }
                for (const n of m.norms || []) {
                    if (typeof n !== 'object') continue;
                    const haystack = (
                        (n.code || '') + ' ' + (n.title || '') + ' ' +
                        (n.summary || '') + ' ' +
                        (n.sections || []).map(s => (s.title || '') + ' ' + (s.content || '')).join(' ')
                    ).toLowerCase();
                    if (haystack.includes(q)) {
                        results.push({
                            type: 'norm', module: m.code,
                            id: n.id, code: n.code, title: n.title || n.code,
                        });
                    }
                }
            }

            // Cherche dans les flashcards
            const cards = await _loadJson('flashcards.json') || [];
            for (const c of cards) {
                const haystack = ((c.question || c.q || '') + ' ' + (c.answer || c.a || '')).toLowerCase();
                if (haystack.includes(q)) {
                    results.push({
                        type: 'flashcard', id: c.id,
                        title: (c.question || c.q || '').slice(0, 100),
                        category: c.category || c.cat,
                    });
                }
            }

            return results.slice(0, 50);
        },

        // (Mission Lab et Canvas Perso retirés : non fonctionnels en version web.)

        // ── Stubs (features Python-only, désactivées en mobile) ──

        async check_english_text() {
            return { error: "Le correcteur IA n'est dispo que sur la version desktop." };
        },
        async chat_explain() {
            return { error: "L'assistant IA n'est dispo que sur la version desktop." };
        },
        async explain_text() {
            return { error: "L'assistant IA n'est dispo que sur la version desktop." };
        },

        async export_norm_pdf() { return { ok: false, error: 'PDF export desktop only' }; },
        async export_lesson_pdf() { return { ok: false, error: 'PDF export desktop only' }; },
        async export_audit_fiche_pdf() { return { ok: false, error: 'PDF export desktop only' }; },
        async export_hec_fiche_pdf() { return { ok: false, error: 'PDF export desktop only' }; },
        async list_audit_templates() { return []; },
        async download_audit_template() { return { ok: false, error: 'Excel export desktop only' }; },

        async read_file() { return ''; },
        async open_file_external() { return false; },
        async get_file_tree() { return []; },
    };

    // Installe pywebview.api avec ce shim
    window.pywebview = { api };
    console.log('[api-static] Prêt — ' + Object.keys(api).length + ' méthodes disponibles');
})();
