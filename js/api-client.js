/**
 * api-client.js — Adaptateur HTTP pour le mode WEB.
 *
 * En mode DESKTOP (pywebview) : ce module détecte la présence de
 *   `window.pywebview` et ne fait RIEN. L'app continue d'utiliser le
 *   bridge JS natif pywebview — aucun changement de comportement.
 *
 * En mode WEB (navigateur ouvert sur le backend FastAPI) : ce module
 *   crée `window.pywebview.api` avec les mêmes méthodes que l'API
 *   desktop, mais qui font des fetch() vers `/api/*`. Tous les 25
 *   fichiers JS existants continuent d'appeler `pywebview.api.foo()`
 *   sans modification.
 *
 * Doit être chargé EN PREMIER dans index.html (avant crossref.js, etc.)
 *
 * ----------------------------------------------------------------------
 * Endpoints backend mappés (46 au total) :
 *   flashcards (10), norms (12), sessions (2), dashboard (2),
 *   trainer (3), audit (5), reference (8), search (1), files (3)
 *
 * Endpoints NON migrés (stubs avec warning) :
 *   qcm_*, canvas_*, mission_*, export_*_pdf, list_audit_templates,
 *   download_audit_template. Retournent [] / {} / false pour ne pas
 *   crasher l'UI (features dégradées en web mode).
 * ----------------------------------------------------------------------
 */

(function () {
    'use strict';

    // ========================================================
    // Détection de mode
    // ========================================================
    //
    // pywebview 6.x injecte `window.pywebview` AVANT l'exécution des scripts
    // du HTML. Si on ne le voit pas, on est en mode navigateur.
    if (typeof window.pywebview !== 'undefined') {
        console.log('[api-client] Mode DESKTOP détecté — pywebview.api utilisé nativement');
        return;
    }

    console.log('[api-client] Mode WEB activé — fetch vers /api/*');

    // ========================================================
    // Helpers HTTP
    // ========================================================

    const BASE = ''; // même origine (pas de CORS)

    // ========================================================
    // Filets de sécurité
    // ========================================================
    const REQUEST_TIMEOUT_MS = 30000;   // abort après 30s → évite les hangs
    const PAYLOAD_WARN_BYTES = 1_000_000; // warn > 1 MB
    const PAYLOAD_MAX_BYTES = 20_000_000; // refuse > 20 MB (protection anti-OOM)

    function _buildQS(params) {
        if (!params) return '';
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
            if (v === null || v === undefined || v === '') continue;
            qs.append(k, v);
        }
        const s = qs.toString();
        return s ? '?' + s : '';
    }

    /**
     * Fetch avec timeout via AbortController + log de taille de réponse.
     * Empêche les requêtes de hang indéfiniment et trace les gros payloads
     * (pour diagnostiquer les freezes du navigateur).
     */
    async function _fetch(url, init) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort('timeout'), REQUEST_TIMEOUT_MS);
        const t0 = performance.now();
        try {
            const r = await fetch(url, { ...init, signal: ctrl.signal, credentials: 'same-origin' });
            if (!r.ok) {
                const txt = await r.text().catch(() => '');
                throw new Error(`${init?.method || 'GET'} ${url} → HTTP ${r.status}: ${txt.slice(0, 200)}`);
            }

            // Lecture en texte pour pouvoir logger la taille puis JSON.parse
            const ct = r.headers.get('content-type') || '';
            if (!ct.includes('json')) return null; // FileResponse etc.

            const txt = await r.text();
            const bytes = txt.length;
            const dt = Math.round(performance.now() - t0);

            if (bytes > PAYLOAD_MAX_BYTES) {
                console.error(`[api-client] ${url} → ${(bytes / 1e6).toFixed(1)} MB refusé (> ${PAYLOAD_MAX_BYTES / 1e6} MB). Anti-OOM.`);
                throw new Error(`Payload trop gros : ${(bytes / 1e6).toFixed(1)} MB`);
            }
            if (bytes > PAYLOAD_WARN_BYTES) {
                console.warn(`[api-client] ⚠️ ${url} → ${(bytes / 1e6).toFixed(2)} MB en ${dt}ms (gros payload, potentiel freeze)`);
            } else if (dt > 1000) {
                console.log(`[api-client] ${url} → ${bytes} b en ${dt}ms`);
            }

            return JSON.parse(txt);
        } catch (e) {
            if (e.name === 'AbortError') {
                throw new Error(`Timeout (${REQUEST_TIMEOUT_MS}ms): ${url}`);
            }
            throw e;
        } finally {
            clearTimeout(timer);
        }
    }

    async function _get(path, params) {
        return _fetch(BASE + path + _buildQS(params));
    }

    async function _post(path, body) {
        return _fetch(BASE + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {}),
        });
    }

    async function _patch(path, body, qs) {
        return _fetch(BASE + path + _buildQS(qs), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {}),
        });
    }

    // Stub pour les méthodes non-migrées : retourne une valeur safe et warn une fois
    const _warned = new Set();
    function _stub(name, fallback) {
        return async function (...args) {
            if (!_warned.has(name)) {
                console.warn(`[api-client] ${name}() n'est pas encore disponible en web mode. Args:`, args);
                _warned.add(name);
            }
            return fallback;
        };
    }

    // ========================================================
    // Mapping pywebview.api.* → HTTP
    // ========================================================

    const api = {

        // -------- Flashcards (10) --------

        get_flashcards: (category, subcategory, difficulty, due_only, mastery, search,
                        wrong_only, module_code, not_seen_days, never_seen,
                        min_accuracy, max_accuracy, limit) =>
            _get('/api/flashcards', {
                category, subcategory, difficulty, due_only, mastery, search,
                wrong_only, module_code, not_seen_days, never_seen,
                min_accuracy, max_accuracy, limit,
            }),

        get_flashcard_categories: async () => {
            // Backend retourne {category, count, subcategories[]}
            // Legacy JS attend     {name,     count, subs[]}
            const data = await _get('/api/flashcards/categories');
            return data.map(c => ({
                name: c.category,
                count: c.count,
                subs: c.subcategories,
            }));
        },

        get_smart_deck: (strategy, category, subcategory, module_code, difficulty, limit) =>
            _get('/api/flashcards/smart-deck', {
                strategy: strategy || 'balanced',
                category, subcategory, module_code, difficulty,
                limit: limit || 20,
            }),

        update_flashcard: async (card_id, correct, rating) => {
            // Legacy retournait None ; le nouveau endpoint retourne
            // {flashcard, interval_days} — on accepte les deux côtés
            await _post(`/api/flashcards/${card_id}/review`, { correct, rating });
            return true;
        },

        save_quiz: (category, total, correct, failed_ids, duration) =>
            _post('/api/flashcards/quiz-results', {
                category,
                total,
                correct,
                failed_ids: failed_ids || [],
                duration_seconds: duration,
            }).then(r => r && r.score_percent !== undefined ? r.score_percent : null),

        get_quiz_history: (limit) =>
            _get('/api/flashcards/quiz-history', { limit: limit || 20 }),

        get_due_flashcards: (limit) =>
            _get('/api/flashcards/due', { limit: limit || 30 }),

        get_flashcards_for_sprint: (category, studied_only, limit) =>
            _get('/api/flashcards/sprint', {
                category,
                studied_only: studied_only !== undefined ? studied_only : true,
                limit: limit || 25,
            }),

        get_sm2_stats: () => _get('/api/flashcards/stats/sm2'),
        get_review_stats: () => _get('/api/flashcards/stats/review'),

        // -------- Norms (12) --------

        get_norms_data: () => _get('/api/norms/data'),
        get_norm_html: (norm_id) =>
            _get(`/api/norms/data/${encodeURIComponent(norm_id)}/html`)
                .then(r => r.html),
        get_norms_enrichment: () => _get('/api/norms/enrichment'),
        get_unified_modules: () => _get('/api/norms/unified-modules'),
        get_all_lessons: () => _get('/api/norms/lessons'),
        get_lessons_stats: () => _get('/api/norms/lessons/stats'),
        get_lessons_for_norm: (norm_code) =>
            _get(`/api/norms/${encodeURIComponent(norm_code)}/lessons`),
        get_norms: () => _get('/api/norms'),
        get_norm_detail: (norm_code) =>
            _get(`/api/norms/${encodeURIComponent(norm_code)}`),
        get_norm_study_sheet: (norm_code) =>
            _get(`/api/norms/${encodeURIComponent(norm_code)}/study-sheet`),
        update_norm: (norm_code, category, confidence) =>
            _post(`/api/norms/${encodeURIComponent(norm_code)}/revision`, {
                category, confidence,
            }),
        set_norm: (norm_code, category, confidence, revision_count, last_revised) =>
            _patch(
                `/api/norms/${encodeURIComponent(norm_code)}`,
                { confidence, revision_count, last_revised },
                { category }
            ),

        // -------- Sessions (2) --------

        save_session: (session_name, duration, module_code, activities,
                      flashcards_reviewed, score, energy, notes, to_review) =>
            _post('/api/sessions', {
                session_name,
                duration,
                module_code,
                activities: activities || [],
                flashcards_reviewed: flashcards_reviewed || 0,
                score,
                energy,
                notes,
                to_review,
            }),

        get_recent_sessions: (limit) =>
            _get('/api/sessions/recent', { limit: limit || 10 }),

        // -------- Dashboard (2) --------

        get_dashboard_stats: () => _get('/api/dashboard/stats'),
        get_module_stats: () => _get('/api/dashboard/modules'),
        // `get_modules` legacy renvoyait juste les modules DB — on alias sur notion-modules
        // qui fait le fallback DB si le JSON Notion manque.
        get_modules: () => _get('/api/reference/notion-modules'),

        // -------- Trainer (3) --------

        get_trainer_courses: () => _get('/api/trainer/courses'),
        get_trainer_progress: () => _get('/api/trainer/progress'),
        save_lesson_progress: async (norm_code, lesson_id, completed, score) => {
            await _post('/api/trainer/lesson-progress', {
                norm_code,
                lesson_id,
                completed: completed !== false, // default true
            });
            return true;
        },

        // -------- Audit (5) --------

        get_audit_data: () => _get('/api/audit/data'),
        get_audit_seuils: () => _get('/api/audit/seuils'),
        get_audit_section: (section) =>
            _get(`/api/audit/sections/${encodeURIComponent(section)}`),
        save_audit_progress: async (section, item_id, status, notes) => {
            await _post('/api/audit/progress', { section, item_id, status, notes });
            return true;
        },
        get_audit_progress: (section) =>
            _get('/api/audit/progress', { section }),

        // -------- Reference (8) --------

        get_glossary: () => _get('/api/reference/glossary'),
        get_library: () => _get('/api/reference/library'),
        get_fiscalite: () => _get('/api/reference/fiscalite'),
        get_comparisons: () => _get('/api/reference/comparisons'),
        get_financial_statements: () => _get('/api/reference/financial-statements'),
        get_references: (section) =>
            _get('/api/reference/references', { section }),
        get_knowledge_graph: () => _get('/api/reference/knowledge-graph'),
        get_notion_modules: () => _get('/api/reference/notion-modules'),
        get_notion_lessons: () => _get('/api/norms/lessons'),

        // -------- Search (1) --------

        search_all: (query) =>
            _get('/api/search', { q: query, limit: 50 }),

        // -------- Files (3) --------

        get_file_tree: () => _get('/api/files/tree'),

        read_file: async (file_path) => {
            // Legacy retournait du HTML brut ; notre endpoint retourne {filename, ext, html}
            const data = await _get('/api/files/content', { path: file_path });
            return data.html;
        },

        open_file_external: async (file_path) => {
            // En mode desktop → os.startfile. En web → ouvre le download endpoint
            // dans un nouvel onglet (le navigateur affiche PDF nativement, et les
            // DOCX/XLSX se téléchargent proprement).
            try {
                window.open(
                    `/api/files/download?path=${encodeURIComponent(file_path)}`,
                    '_blank',
                    'noopener,noreferrer'
                );
                return true;
            } catch (e) {
                console.error('[api-client] open_file_external failed:', e);
                return false;
            }
        },

        // -------- Session recommendation (cognitive window) --------
        // Legacy logic purement time-based — on la reproduit côté JS pour éviter
        // un aller-retour HTTP inutile.
        get_session_recommendation: async () => {
            const hour = new Date().getHours();
            if (hour >= 8 && hour <= 12) {
                return {
                    window: 'optimal', icon: '🧠',
                    label: 'Fenêtre optimale',
                    message: 'Idéal pour les normes complexes et les cas chiffrés',
                    color: '#10b981', suggested_mode: 'cours',
                };
            } else if (hour >= 13 && hour <= 16) {
                return {
                    window: 'medium', icon: '⚡',
                    label: 'Bonne fenêtre',
                    message: 'Quiz et flashcards — évite les nouvelles normes',
                    color: '#f59e0b', suggested_mode: 'sprint',
                };
            } else {
                return {
                    window: 'degraded', icon: '🌙',
                    label: 'Fenêtre réduite',
                    message: 'Préférer flashcards simples et révision passive',
                    color: '#6366f1', suggested_mode: 'review',
                };
            }
        },

        // ========================================================
        // Stubs pour features NON migrées (dégradation gracieuse)
        // ========================================================

        // QCM tracking (12)
        get_qcm_catalog: _stub('get_qcm_catalog', { questions: [], modules: {} }),
        get_qcm_tracking_data: _stub('get_qcm_tracking_data', {}),
        qcm_toggle_bookmark: _stub('qcm_toggle_bookmark', false),
        qcm_set_note: _stub('qcm_set_note', false),
        qcm_get_selection: _stub('qcm_get_selection', []),
        qcm_create_session: _stub('qcm_create_session', { session_id: null }),
        qcm_complete_session: _stub('qcm_complete_session', false),
        qcm_get_sessions_history: _stub('qcm_get_sessions_history', []),
        qcm_get_topic_mastery: _stub('qcm_get_topic_mastery', {}),
        qcm_get_predicted_exam_score: _stub('qcm_get_predicted_exam_score', { score: 0 }),

        // Audit templates Excel (2)
        list_audit_templates: _stub('list_audit_templates', []),
        download_audit_template: _stub('download_audit_template', false),

        // Mission Lab (13)
        list_mission_scenarios: _stub('list_mission_scenarios', []),
        get_mission_scenario: _stub('get_mission_scenario', null),
        list_missions: _stub('list_missions', []),
        start_mission: _stub('start_mission', null),
        get_mission_full: _stub('get_mission_full', null),
        mission_mark_email_read: _stub('mission_mark_email_read', false),
        mission_save_decision: _stub('mission_save_decision', false),
        mission_update_workpaper: _stub('mission_update_workpaper', false),
        mission_mark_finding: _stub('mission_mark_finding', false),
        mission_set_state: _stub('mission_set_state', false),
        mission_advance_phase: _stub('mission_advance_phase', false),
        mission_trigger_random_event: _stub('mission_trigger_random_event', null),
        mission_finish: _stub('mission_finish', false),
        mission_delete: _stub('mission_delete', false),

        // Canvas Perso (27+)
        canvas_library: _stub('canvas_library', { engagements: [] }),
        canvas_create_engagement: _stub('canvas_create_engagement', null),
        canvas_list_engagements: _stub('canvas_list_engagements', []),
        canvas_get_engagement: _stub('canvas_get_engagement', null),
        canvas_update_engagement: _stub('canvas_update_engagement', false),
        canvas_delete_engagement: _stub('canvas_delete_engagement', false),
        canvas_complete_engagement: _stub('canvas_complete_engagement', false),
        canvas_import_tb: _stub('canvas_import_tb', false),
        canvas_create_workpaper: _stub('canvas_create_workpaper', null),
        canvas_update_workpaper: _stub('canvas_update_workpaper', false),
        canvas_get_workpaper: _stub('canvas_get_workpaper', null),
        canvas_delete_workpaper: _stub('canvas_delete_workpaper', false),
        canvas_add_note: _stub('canvas_add_note', null),
        canvas_respond_note: _stub('canvas_respond_note', false),
        canvas_clear_note: _stub('canvas_clear_note', false),
        canvas_delete_note: _stub('canvas_delete_note', false),
        canvas_add_time: _stub('canvas_add_time', null),
        canvas_add_sad: _stub('canvas_add_sad', null),
        canvas_update_sad: _stub('canvas_update_sad', false),
        canvas_delete_sad: _stub('canvas_delete_sad', false),
        canvas_add_attachment: _stub('canvas_add_attachment', null),
        canvas_delete_attachment: _stub('canvas_delete_attachment', false),
        canvas_open_attachment: _stub('canvas_open_attachment', false),
        canvas_save_memo: _stub('canvas_save_memo', false),
        canvas_get_memo: _stub('canvas_get_memo', null),
        canvas_delete_memo: _stub('canvas_delete_memo', false),
        canvas_add_pbc: _stub('canvas_add_pbc', null),
        canvas_update_pbc: _stub('canvas_update_pbc', false),
        canvas_delete_pbc: _stub('canvas_delete_pbc', false),
        canvas_export_pdf: _stub('canvas_export_pdf', false),
        export_mission_pdf: _stub('export_mission_pdf', false),
        export_norm_pdf: _stub('export_norm_pdf', false),
        export_lesson_pdf: _stub('export_lesson_pdf', false),
    };

    // ========================================================
    // Injection globale : reproduit l'interface pywebview.api
    // ========================================================

    window.pywebview = { api };
    console.log('[api-client] window.pywebview.api installé avec',
                Object.keys(api).length, 'méthodes');
})();
