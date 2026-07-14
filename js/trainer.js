/* ═══════════════════════════════════════════════
   Swiss CPA Revision — Trainer Module (Entraînement)
   Accent: #10b981 (emerald green)
   ═══════════════════════════════════════════════ */

// ── Global trainer state ──
let trainerState = {
    mode: 'home',          // home | sprint | cours | flashcards
    // Sprint
    sprintCards: [],
    sprintIndex: 0,
    sprintFlipped: false,
    sprintCorrect: 0,
    sprintWrong: 0,
    sprintFailed: [],
    sprintStartTime: null,
    sprintTimerInterval: null,
    // Cours navigation
    coursData: null,
    coursProgress: [],
    coursSelectedModule: null,
    coursSelectedNorm: null,
    coursSelectedLesson: null,
    coursLessonAnswers: {},  // {questionIndex: selectedOption}
    // Flashcards mode
    fcCards: [],
    fcIndex: 0,
    fcFlipped: false,
    fcFilters: { search: '', category: '', difficulty: '', mastery: '', dueOnly: false },
    fcStats: null,
    // Home
    stats: null,
    recommendation: null,
};

// ── Streak logic ──
function getStreak() {
    const today = new Date().toISOString().slice(0, 10);
    let s = JSON.parse(localStorage.getItem('swisscpa_streak') || '{"streak":0,"lastActive":null,"graceUsed":false}');
    if (s.lastActive === today) return s;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (s.lastActive === yesterday) {
        s.streak++;
        s.graceUsed = false;
    } else if (s.lastActive && !s.graceUsed && (new Date(today) - new Date(s.lastActive)) / 86400000 <= 2) {
        s.streak++;
        s.graceUsed = true;
    } else {
        s.streak = Math.max(1, s.streak > 0 ? Math.floor(s.streak * 0.3) : 1);
        s.graceUsed = false;
    }
    s.lastActive = today;
    localStorage.setItem('swisscpa_streak', JSON.stringify(s));
    return s;
}

// ── Helpers ──
function trainerEscapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function trainerFormatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec.toString().padStart(2, '0')}s` : `${sec}s`;
}

function trainerCategoryColor(cat) {
    if (!cat) return { accent: '#64748b', bg: '#1e293b' };
    if (cat.includes('Swiss GAAP') || cat.includes('RPC')) return { accent: '#3182ce', bg: '#1a365d' };
    if (cat.includes('IFRS') || cat.includes('IAS')) return { accent: '#38a169', bg: '#22543d' };
    if (cat.includes('Audit') || cat.includes('ISA')) return { accent: '#805ad5', bg: '#553c9a' };
    if (cat.includes('Fiscal') || cat.includes('TVA')) return { accent: '#dd6b20', bg: '#9c4221' };
    return { accent: '#64748b', bg: '#1e293b' };
}

function trainerMasteryLabel(mastery) {
    const m = {
        'Mastered':    { label: 'Maîtrisé',     color: '#10b981' },
        'Good':        { label: 'Bien',          color: '#3b82f6' },
        'Learning':    { label: 'Apprentissage', color: '#f59e0b' },
        'Again':       { label: 'À revoir',      color: '#ef4444' },
        'Not started': { label: 'Non commencé',  color: '#64748b' },
    };
    return m[mastery] || { label: 'Non commencé', color: '#64748b' };
}

function trainerFadeIn(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    });
}

// LocalStorage fallback for progress
function getLocalProgress() {
    try {
        return JSON.parse(localStorage.getItem('swisscpa_trainer_progress') || '[]');
    } catch (e) { return []; }
}
function setLocalProgress(arr) {
    localStorage.setItem('swisscpa_trainer_progress', JSON.stringify(arr));
}
function saveLocalLessonProgress(norm_code, lesson_id, completed) {
    const arr = getLocalProgress();
    const existing = arr.find(p => p.norm_code === norm_code && p.lesson_id === lesson_id);
    if (existing) {
        existing.completed = completed;
        existing.completed_at = new Date().toISOString();
    } else {
        arr.push({ norm_code, lesson_id, completed, completed_at: new Date().toISOString() });
    }
    setLocalProgress(arr);
}
function isLessonDoneLocal(norm_code, lesson_id) {
    const arr = getLocalProgress();
    const rec = arr.find(p => p.norm_code === norm_code && p.lesson_id === lesson_id);
    return rec ? rec.completed : false;
}

// ── Confetti animation ──
function launchConfetti(container) {
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#a78bfa', '#6ee7b7'];
    for (let i = 0; i < 60; i++) {
        const piece = document.createElement('div');
        piece.style.cssText = `
            position: fixed;
            top: -10px;
            left: ${Math.random() * 100}vw;
            width: ${6 + Math.random() * 8}px;
            height: ${6 + Math.random() * 8}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            pointer-events: none;
            z-index: 9999;
            animation: trainerConfettiFall ${1.5 + Math.random() * 2}s ease-in forwards;
            animation-delay: ${Math.random() * 0.8}s;
        `;
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 4000);
    }
    // Inject keyframes once
    if (!document.getElementById('trainerConfettiStyle')) {
        const style = document.createElement('style');
        style.id = 'trainerConfettiStyle';
        style.textContent = `
            @keyframes trainerConfettiFall {
                0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

// ══════════════════════════════════════════
// 1. ENTRY POINT
// ══════════════════════════════════════════

async function renderTrainer(main) {
    // Reset container reference to current DOM (avoid stale refs from previous navigations)
    trainerState._container = main;

    // If re-entering from another tab and we were in an active sub-mode,
    // reset to home unless state is fully coherent
    if (!main || !main.isConnected) {
        trainerState.mode = 'home';
    }
    // If sub-mode but data is missing (user left and came back), go home
    if (trainerState.mode === 'cours' && !trainerState.coursData) trainerState.mode = 'home';
    if (trainerState.mode === 'sprint' && (!trainerState.sprintCards || trainerState.sprintCards.length === 0)) trainerState.mode = 'home';
    if (trainerState.mode === 'flashcards' && !trainerState.fcCards) trainerState.mode = 'home';

    // Inject trainer-specific styles once
    if (!document.getElementById('trainerStyles')) {
        const style = document.createElement('style');
        style.id = 'trainerStyles';
        style.textContent = `
            .trainer-mode-card {
                background: #1e293b;
                border-radius: 12px;
                padding: 20px;
                cursor: pointer;
                transition: transform 0.18s, box-shadow 0.18s;
                border: 1px solid #334155;
            }
            .trainer-mode-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            }
            .trainer-btn {
                border: none;
                border-radius: 8px;
                padding: 10px 22px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: opacity 0.15s, transform 0.1s;
            }
            .trainer-btn:hover { opacity: 0.88; transform: scale(0.98); }
            .trainer-btn-green  { background: #10b981; color: #fff; }
            .trainer-btn-red    { background: #ef4444; color: #fff; }
            .trainer-btn-outline { background: transparent; border: 1px solid #334155; color: #cbd5e1; }
            .trainer-btn-blue   { background: #3b82f6; color: #fff; }
            .trainer-tag {
                display: inline-block;
                padding: 3px 10px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .trainer-progress-bar {
                height: 6px;
                background: #1e293b;
                border-radius: 3px;
                overflow: hidden;
            }
            .trainer-progress-fill {
                height: 100%;
                background: #10b981;
                border-radius: 3px;
                transition: width 0.4s ease;
            }
            .trainer-timer-bar {
                height: 5px;
                background: #1e293b;
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 16px;
            }
            .trainer-timer-fill {
                height: 100%;
                border-radius: 3px;
                transition: width 1s linear, background 0.5s;
            }
            .trainer-card-flip {
                perspective: 1200px;
                width: 100%;
                max-width: 680px;
                margin: 0 auto;
                min-height: 320px;
            }
            .trainer-card-inner {
                position: relative;
                width: 100%;
                min-height: 320px;
                transform-style: preserve-3d;
                transition: transform 0.55s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .trainer-card-inner.flipped { transform: rotateY(180deg); }
            .trainer-card-face {
                position: absolute;
                width: 100%;
                min-height: 320px;
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 14px;
                padding: 28px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            }
            .trainer-card-back {
                transform: rotateY(180deg);
                border-color: #10b981;
            }
            .trainer-lesson-option {
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 8px;
                padding: 12px 16px;
                cursor: pointer;
                transition: background 0.15s, border-color 0.15s;
                font-size: 14px;
                color: #cbd5e1;
                margin-bottom: 8px;
                text-align: left;
                width: 100%;
            }
            .trainer-lesson-option:hover:not(:disabled) { border-color: #10b981; background: #064e3b22; }
            .trainer-lesson-option.correct { border-color: #10b981 !important; background: #064e3b !important; color: #6ee7b7 !important; }
            .trainer-lesson-option.wrong   { border-color: #ef4444 !important; background: #450a0a !important; color: #fca5a5 !important; }
            .trainer-flash-correct { border-color: #10b981 !important; box-shadow: 0 0 0 2px #10b981 !important; }
            .trainer-flash-wrong   { border-color: #ef4444 !important; box-shadow: 0 0 0 2px #ef4444 !important; }
            .trainer-section-title {
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                color: #64748b;
                margin-bottom: 12px;
                margin-top: 24px;
            }
        `;
        document.head.appendChild(style);
    }

    switch (trainerState.mode) {
        case 'sprint':      renderTrainerSprintActive(main); break;
        case 'cours':
            // Re-entering from another tab: drop deep selection (norm/lesson)
            // and land back on the module picker rather than a stale lesson.
            trainerState.coursSelectedModule = null;
            trainerState.coursSelectedNorm   = null;
            trainerState.coursSelectedLesson = null;
            renderCoursModulePicker(main);
            break;
        case 'flashcards':  renderTrainerFlashcards(main); break;
        default:            await renderTrainerHome(main); break;
    }
}

// ══════════════════════════════════════════
// 2. HOME SCREEN
// ══════════════════════════════════════════

async function renderTrainerHome(main) {
    trainerState.mode = 'home';
    main.innerHTML = `<div style="text-align:center;padding:60px;color:#64748b">Chargement...</div>`;

    let statsRaw, recRaw, modulesRaw, normProgressRaw;
    try {
        // Load data in parallel
        [statsRaw, recRaw, modulesRaw, normProgressRaw] = await Promise.all([
            api('get_review_stats'),
            api('get_session_recommendation'),
            api('get_unified_modules'),
            api('get_norms'),
        ]);
    } catch (err) {
        console.error('renderTrainerHome load error:', err);
        main.innerHTML = `
            <div style="max-width:500px;margin:60px auto;text-align:center;padding:20px">
                <div style="font-size:48px;margin-bottom:16px">⚠️</div>
                <div style="font-size:16px;color:#f1f5f9;margin-bottom:12px">Erreur de chargement</div>
                <div style="font-size:13px;color:#64748b;margin-bottom:20px">${err.message || 'Impossible de charger les données'}</div>
                <button onclick="navigate('trainer')" style="background:#3b82f6;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px">Réessayer</button>
            </div>`;
        return;
    }
    const normProgressMap = {};
    (normProgressRaw || []).forEach(n => { normProgressMap[n.norm_code] = n; });

    const stats = statsRaw || { due: 0, total: 0, mastered: 0, learning: 0, good: 0, pct_mastered: 0, pct_due: 0 };
    const rec   = recRaw   || { window: 'medium', icon: '📚', label: 'Révision', message: 'Bonne chance pour ta session !', color: '#3b82f6', suggested_mode: 'sprint' };
    trainerState.stats = stats;
    trainerState.recommendation = rec;

    const streak = getStreak();
    const modules = (modulesRaw && modulesRaw.modules) ? modulesRaw.modules : [];

    // Recommendation banner color
    const recBg = rec.window === 'optimal'  ? '#064e3b' :
                  rec.window === 'degraded' ? '#450a0a' : '#1e3a5f';
    const recBorder = rec.window === 'optimal'  ? '#10b981' :
                      rec.window === 'degraded' ? '#ef4444' : '#3b82f6';

    // Compact global progress summary (detailed view is in Stats tab to avoid duplication)
    const studiedCount = (normProgressMap ? Object.values(normProgressMap) : []).filter(
        np => np && ((np.confidence_level || 0) > 0 || (np.revision_count || 0) > 0)
    ).length;
    const totalNorms = modules.reduce((s, m) => s + ((m.norms || []).length), 0);
    const studiedPct = totalNorms > 0 ? Math.round((studiedCount / totalNorms) * 100) : 0;

    const moduleProgressHtml = totalNorms > 0 ? `
        <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:220px">
                <div style="font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:4px">
                    📊 ${studiedCount}/${totalNorms} normes étudiées (${studiedPct}%)
                </div>
                <div class="trainer-progress-bar" style="height:5px">
                    <div class="trainer-progress-fill" style="width:${studiedPct}%"></div>
                </div>
            </div>
        </div>
    ` : '';

    main.innerHTML = `
        <div style="max-width:860px;margin:0 auto;padding:8px 0 40px">

            <!-- Header -->
            <div style="margin-bottom:24px">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
                    <span style="font-size:28px;font-weight:800;color:#f1f5f9">🎯 Entraînement</span>
                </div>
                <div style="height:3px;width:60px;background:#10b981;border-radius:2px;margin-bottom:8px"></div>
                <div style="font-size:14px;color:#64748b">Révision active • Méthode SM-2 • Cours intégrés</div>
            </div>

            <!-- Cognitive window banner -->
            <div style="background:${recBg};border:1px solid ${recBorder};border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
                <span style="font-size:28px">${trainerEscapeHtml(rec.icon || '📚')}</span>
                <div>
                    <div style="font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:2px">${trainerEscapeHtml(rec.label || 'Session')}</div>
                    <div style="font-size:13px;color:#94a3b8">${trainerEscapeHtml(rec.message || '')}</div>
                </div>
            </div>

            <!-- Stats row -->
            <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
                <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px 20px;flex:1;min-width:120px;text-align:center">
                    <div style="font-size:22px;font-weight:800;color:#f59e0b">🔥 ${streak.streak}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:3px">Jours consécutifs</div>
                </div>
                <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px 20px;flex:1;min-width:120px;text-align:center">
                    <div style="font-size:22px;font-weight:800;color:#ef4444">${stats.due || 0}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:3px">Cartes dues</div>
                </div>
                <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px 20px;flex:1;min-width:120px;text-align:center">
                    <div style="font-size:22px;font-weight:800;color:#10b981">${stats.pct_mastered || 0}%</div>
                    <div style="font-size:11px;color:#64748b;margin-top:3px">Maîtrisées</div>
                </div>
                <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px 20px;flex:1;min-width:120px;text-align:center">
                    <div style="font-size:22px;font-weight:800;color:#3b82f6">${stats.total || 0}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:3px">Cartes totales</div>
                </div>
            </div>

            <!-- Mode cards -->
            <div class="trainer-section-title">Choisir un mode</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;margin-bottom:28px">

                <!-- Sprint -->
                <div class="trainer-mode-card" style="border-color:#10b981;" onclick="startTrainerSprint()">
                    <div style="font-size:28px;margin-bottom:10px">⚡</div>
                    <div style="font-size:16px;font-weight:700;color:#f1f5f9;margin-bottom:4px">SPRINT</div>
                    <div style="font-size:13px;color:#64748b;margin-bottom:12px">${stats.due || 0} cartes dues • ~15 min</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                        <span class="trainer-tag" style="background:#064e3b;color:#6ee7b7">SM-2</span>
                        <span class="trainer-tag" style="background:#064e3b;color:#6ee7b7">Dues uniquement</span>
                    </div>
                </div>

                <!-- Cours -->
                <div class="trainer-mode-card" style="border-color:#3b82f6;" onclick="showTrainerCours()">
                    <div style="font-size:28px;margin-bottom:10px">📖</div>
                    <div style="font-size:16px;font-weight:700;color:#f1f5f9;margin-bottom:4px">COURS</div>
                    <div style="font-size:13px;color:#64748b;margin-bottom:12px">Par norme • ~20 min</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                        <span class="trainer-tag" style="background:#1e3a5f;color:#93c5fd">Leçons</span>
                        <span class="trainer-tag" style="background:#1e3a5f;color:#93c5fd">Quiz intégrés</span>
                    </div>
                </div>

                <!-- Flashcards (mode interne du trainer — filtres avancés, SM-2 pondéré par étoiles) -->
                <div class="trainer-mode-card" style="border-color:#8b5cf6;" onclick="showTrainerFlashcards()">
                    <div style="font-size:28px;margin-bottom:10px">🃏</div>
                    <div style="font-size:16px;font-weight:700;color:#f1f5f9;margin-bottom:4px">FLASHCARDS</div>
                    <div style="font-size:13px;color:#64748b;margin-bottom:12px">Filtres avancés • SM-2 pondéré par étoiles</div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                        <span class="trainer-tag" style="background:#2e1065;color:#c4b5fd">Filtres avancés</span>
                        <span class="trainer-tag" style="background:#2e1065;color:#c4b5fd">Normes étudiées</span>
                    </div>
                    <div style="margin-top:10px;font-size:11px;color:#64748b;font-style:italic">
                        💡 Modes Libre/Quiz/Rappel libre/Examen blanc : <a onclick="event.stopPropagation();navigate('flashcards')" style="color:#c4b5fd;cursor:pointer;text-decoration:underline">onglet Flashcards principal →</a>
                    </div>
                </div>
            </div>

            <!-- Module progress -->
            ${moduleProgressHtml}

            <!-- Back link -->
            <div style="margin-top:24px;text-align:center">
                <button onclick="navigate('modules')" style="background:none;border:none;color:#3b82f6;cursor:pointer;font-size:13px;text-decoration:underline;">
                    ↩ Retour à la consultation →
                </button>
            </div>

        </div>
    `;

    trainerFadeIn(main.firstElementChild);
}

// ══════════════════════════════════════════
// 3. SPRINT MODE
// ══════════════════════════════════════════

async function startTrainerSprint() {
    trainerState.mode = 'sprint';
    const main = trainerState._container || document.getElementById('mainContent');
    if (!main) return;

    main.innerHTML = `<div style="text-align:center;padding:60px;color:#64748b">Chargement...</div>`;

    // Load review stats + norm progress for smart sprint
    const [statsRaw, normProgressRaw] = await Promise.all([
        api('get_review_stats'),
        api('get_norms'),
    ]);

    const stats = statsRaw || { due: 0 };
    const normProgress = normProgressRaw || [];
    const studiedNorms = normProgress.filter(n => (n.revision_count || 0) > 0 || (n.confidence_level || 0) > 0);

    // Count due cards per mode
    const dueStudied = stats.due || 0;

    main.innerHTML = `
        <div style="max-width:600px;margin:40px auto;padding:0 16px 40px">

            <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px">
                <button class="trainer-btn trainer-btn-outline" style="padding:7px 14px;font-size:12px;"
                    onclick="trainerGoHome()">← Retour</button>
                <div>
                    <div style="font-size:22px;font-weight:800;color:#f1f5f9">⚡ Sprint</div>
                    <div style="font-size:12px;color:#64748b">Choisis ton mode d'entraînement</div>
                </div>
            </div>

            <!-- Option 1: Cartes dues — normes étudiées -->
            <div class="trainer-mode-card" style="border-color:#10b981;margin-bottom:14px"
                onclick="launchSprintStudied()">
                <div style="display:flex;align-items:flex-start;gap:14px">
                    <span style="font-size:32px">🎯</span>
                    <div>
                        <div style="font-size:16px;font-weight:700;color:#f1f5f9;margin-bottom:4px">
                            Répétition espacée (SM-2)
                        </div>
                        <div style="font-size:13px;color:#64748b;margin-bottom:10px">
                            Uniquement les normes déjà étudiées · Pondéré par tes étoiles
                        </div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap">
                            <span class="trainer-tag" style="background:#064e3b;color:#6ee7b7">SM-2</span>
                            <span class="trainer-tag" style="background:#064e3b;color:#6ee7b7">⭐ Pondéré</span>
                            <span class="trainer-tag" style="background:#064e3b;color:#6ee7b7">${dueStudied} cartes dues</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Option 2: Par catégorie -->
            <div class="trainer-mode-card" style="border-color:#3b82f6;margin-bottom:14px">
                <div style="display:flex;align-items:flex-start;gap:14px">
                    <span style="font-size:32px">📂</span>
                    <div style="flex:1">
                        <div style="font-size:16px;font-weight:700;color:#f1f5f9;margin-bottom:8px">
                            Par catégorie
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap">
                            <button class="trainer-btn" style="background:#1a365d;color:#93c5fd;border:1px solid #3182ce;padding:7px 12px;font-size:12px"
                                onclick="launchSprintCategory('Swiss GAAP RPC')">Swiss GAAP RPC</button>
                            <button class="trainer-btn" style="background:#22543d;color:#9ae6b4;border:1px solid #38a169;padding:7px 12px;font-size:12px"
                                onclick="launchSprintCategory('IFRS / IAS')">IFRS / IAS</button>
                            <button class="trainer-btn" style="background:#553c9a;color:#d6bcfa;border:1px solid #805ad5;padding:7px 12px;font-size:12px"
                                onclick="launchSprintCategory('Audit / ISA')">Audit / ISA</button>
                            <button class="trainer-btn" style="background:#9c4221;color:#fbd38d;border:1px solid #dd6b20;padding:7px 12px;font-size:12px"
                                onclick="launchSprintCategory('Fiscalité')">Fiscalité</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Option 3: Aléatoire toutes cartes -->
            <div class="trainer-mode-card" style="border-color:#475569;margin-bottom:14px"
                onclick="launchSprintRandom()">
                <div style="display:flex;align-items:flex-start;gap:14px">
                    <span style="font-size:32px">🎲</span>
                    <div>
                        <div style="font-size:16px;font-weight:700;color:#f1f5f9;margin-bottom:4px">
                            Quiz aléatoire
                        </div>
                        <div style="font-size:13px;color:#64748b">
                            Toutes les cartes mélangées · Sans SM-2 · Pour découvrir de nouvelles normes
                        </div>
                    </div>
                </div>
            </div>

        </div>
    `;
    trainerFadeIn(main.firstElementChild);
}

async function launchSprintStudied() {
    const main = trainerState._container || document.getElementById('mainContent');
    if (!main) return;
    main.innerHTML = `<div style="text-align:center;padding:60px;color:#64748b">Chargement des cartes...</div>`;

    const cards = await api('get_flashcards_for_sprint', null, true, 25);
    if (!cards || cards.length === 0) {
        main.innerHTML = `
            <div style="max-width:500px;margin:60px auto;text-align:center;padding:0 16px">
                <div style="font-size:56px;margin-bottom:16px">✅</div>
                <div style="font-size:22px;font-weight:700;color:#f1f5f9;margin-bottom:8px">
                    Toutes tes cartes sont à jour !
                </div>
                <div style="font-size:14px;color:#64748b;margin-bottom:8px">
                    Aucune carte due parmi les normes étudiées.
                </div>
                <div style="font-size:13px;color:#475569;margin-bottom:24px">
                    💡 Ajoute des étoiles sur les normes dans <strong style="color:#94a3b8">Stats → Progression des normes</strong> pour qu'elles apparaissent ici.
                </div>
                <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
                    <button class="trainer-btn trainer-btn-green" onclick="launchSprintRandom()">🎲 Quiz aléatoire</button>
                    <button class="trainer-btn trainer-btn-outline" onclick="startTrainerSprint()">← Retour</button>
                </div>
            </div>
        `;
        return;
    }

    trainerState.sprintCards = cards;
    trainerState.sprintIndex = 0;
    trainerState.sprintFlipped = false;
    trainerState.sprintCorrect = 0;
    trainerState.sprintWrong = 0;
    trainerState.sprintFailed = [];
    trainerState.sprintStartTime = Date.now();
    renderTrainerSprintActive(main);
}

async function launchSprintCategory(category) {
    const main = trainerState._container || document.getElementById('mainContent');
    if (!main) return;
    main.innerHTML = `<div style="text-align:center;padding:60px;color:#64748b">Chargement...</div>`;

    // Get due cards for this category (all, not just studied)
    const cards = await api('get_flashcards_for_sprint', category, false, 25);
    const fallback = (!cards || cards.length === 0)
        ? await api('get_flashcards', category, null, null, false, null, null)
        : null;

    const allCards = cards && cards.length > 0 ? cards : trainerShuffleArray(fallback || []).slice(0, 25);

    if (!allCards || allCards.length === 0) {
        main.innerHTML = `<div style="text-align:center;padding:60px;color:#64748b">Aucune carte pour cette catégorie.</div>`;
        setTimeout(() => startTrainerSprint(), 2000);
        return;
    }

    trainerState.sprintCards = allCards;
    trainerState.sprintIndex = 0;
    trainerState.sprintFlipped = false;
    trainerState.sprintCorrect = 0;
    trainerState.sprintWrong = 0;
    trainerState.sprintFailed = [];
    trainerState.sprintStartTime = Date.now();
    renderTrainerSprintActive(main);
}

async function launchSprintRandom() {
    const main = trainerState._container || document.getElementById('mainContent');
    if (!main) return;
    main.innerHTML = `<div style="text-align:center;padding:60px;color:#64748b">Chargement...</div>`;
    const cards = await api('get_flashcards', null, null, null, false, null, null);
    const shuffled = trainerShuffleArray(cards || []).slice(0, 20);
    trainerState.sprintCards = shuffled;
    trainerState.sprintIndex = 0;
    trainerState.sprintFlipped = false;
    trainerState.sprintCorrect = 0;
    trainerState.sprintWrong = 0;
    trainerState.sprintFailed = [];
    trainerState.sprintStartTime = Date.now();
    if (shuffled.length === 0) {
        main.innerHTML = `<div style="text-align:center;padding:60px;color:#64748b">Aucune carte disponible.</div>`;
        return;
    }
    renderTrainerSprintActive(main);
}

// Expose globally so app.js fcLaunchDue can call it
window.startTrainerSprint = startTrainerSprint;

function renderTrainerSprintActive(main) {
    if (!main) return;
    const cards = trainerState.sprintCards;
    const idx   = trainerState.sprintIndex;

    if (idx >= cards.length) {
        if (trainerState.sprintTimerInterval) {
            clearInterval(trainerState.sprintTimerInterval);
            trainerState.sprintTimerInterval = null;
        }
        renderSprintSummary(main);
        return;
    }

    const card     = cards[idx];
    const catColor = trainerCategoryColor(card.category);
    const total    = cards.length;
    const progress = ((idx) / total) * 100;
    const elapsed  = Date.now() - (trainerState.sprintStartTime || Date.now());
    const totalDuration = 20 * 60 * 1000; // 20 min

    main.innerHTML = `
        <div style="max-width:720px;margin:0 auto;padding:8px 0 40px">

            <!-- Header row -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:12px">
                <button class="trainer-btn trainer-btn-outline" style="padding:7px 14px;font-size:12px;"
                    onclick="confirmExitSprint()">
                    ← Quitter
                </button>
                <span style="font-size:13px;color:#94a3b8;font-weight:600">${idx + 1} / ${total}</span>
                <span id="sprintTimerLabel" style="font-size:12px;color:#64748b;font-weight:600">⏱ --:--</span>
            </div>

            <!-- Timer bar -->
            <div class="trainer-timer-bar">
                <div class="trainer-timer-fill" id="sprintTimerBar"
                    style="width:100%;background:#10b981"></div>
            </div>

            <!-- Progress bar -->
            <div class="trainer-progress-bar" style="margin-bottom:20px">
                <div class="trainer-progress-fill" style="width:${progress}%"></div>
            </div>

            <!-- Category badge -->
            <div style="margin-bottom:12px">
                <span class="trainer-tag" style="background:${catColor.bg};color:${catColor.accent}">
                    ${trainerEscapeHtml(card.category || 'Général')}
                </span>
                ${card.subcategory ? `<span class="trainer-tag" style="margin-left:6px;background:#1e293b;color:#64748b">${trainerEscapeHtml(card.subcategory)}</span>` : ''}
            </div>

            <!-- Flip card -->
            <div class="trainer-card-flip" onclick="trainerSprintFlip()" style="cursor:pointer">
                <div class="trainer-card-inner ${trainerState.sprintFlipped ? 'flipped' : ''}" id="sprintCardInner">
                    <!-- Front -->
                    <div class="trainer-card-face">
                        <div style="flex:1;display:flex;align-items:center;justify-content:center">
                            <div style="font-size:18px;font-weight:600;color:#f1f5f9;text-align:center;line-height:1.5">
                                ${trainerEscapeHtml(card.question)}
                            </div>
                        </div>
                        <div style="text-align:center;font-size:12px;color:#475569;margin-top:16px">
                            Cliquer pour voir la réponse
                        </div>
                    </div>
                    <!-- Back -->
                    <div class="trainer-card-face trainer-card-back">
                        <div style="flex:1;overflow-y:auto;font-size:14px;line-height:1.7;color:#cbd5e1">
                            ${typeof formatAnswer === 'function' ? formatAnswer(card.answer) : trainerEscapeHtml(card.answer)}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Anki-style 4-level rating (raccourcis 1-4) -->
            <div id="sprintAnswerBtns" style="display:${trainerState.sprintFlipped ? 'flex' : 'none'};
                justify-content:center;gap:10px;margin-top:20px;flex-wrap:wrap">
                <button class="trainer-btn trainer-btn-red" style="min-width:130px;padding:10px 14px" title="Touche 1 — Oublié"
                    onclick="trainerSprintAnswer(0)">
                    ✗ Again<br><span style="font-size:11px;opacity:0.85">oublié (1)</span>
                </button>
                <button class="trainer-btn" style="min-width:130px;padding:10px 14px;background:#78350f;color:#fdba74;border-color:#92400e" title="Touche 2 — Difficile"
                    onclick="trainerSprintAnswer(1)">
                    ~ Hard<br><span style="font-size:11px;opacity:0.85">difficile (2)</span>
                </button>
                <button class="trainer-btn trainer-btn-green" style="min-width:130px;padding:10px 14px" title="Touche 3 — Normal"
                    onclick="trainerSprintAnswer(2)">
                    ✓ Good<br><span style="font-size:11px;opacity:0.85">normal (3)</span>
                </button>
                <button class="trainer-btn" style="min-width:130px;padding:10px 14px;background:#1e3a8a;color:#93c5fd;border-color:#1e40af" title="Touche 4 — Trivial"
                    onclick="trainerSprintAnswer(3)">
                    ⚡ Easy<br><span style="font-size:11px;opacity:0.85">trivial (4)</span>
                </button>
            </div>

            <!-- Score counters -->
            <div style="display:flex;justify-content:center;gap:24px;margin-top:16px">
                <span style="font-size:13px;color:#6ee7b7;font-weight:600">✓ ${trainerState.sprintCorrect}</span>
                <span style="font-size:13px;color:#fca5a5;font-weight:600">✗ ${trainerState.sprintWrong}</span>
            </div>

        </div>
    `;

    trainerFadeIn(main.firstElementChild);
    startSprintTimer(totalDuration, elapsed);
}

function startSprintTimer(totalMs, elapsedMs) {
    if (trainerState.sprintTimerInterval) {
        clearInterval(trainerState.sprintTimerInterval);
    }
    function tick() {
        const elapsed = Date.now() - trainerState.sprintStartTime;
        const remaining = Math.max(0, totalMs - elapsed);
        const pct = (remaining / totalMs) * 100;

        const bar = document.getElementById('sprintTimerBar');
        const lbl = document.getElementById('sprintTimerLabel');
        if (!bar || !lbl) {
            clearInterval(trainerState.sprintTimerInterval);
            return;
        }

        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        lbl.textContent = `⏱ ${mins}:${secs.toString().padStart(2, '0')}`;

        let color = '#10b981';
        if (remaining < 2 * 60 * 1000) color = '#ef4444';
        else if (remaining < 5 * 60 * 1000) color = '#f59e0b';

        bar.style.width  = pct + '%';
        bar.style.background = color;

        if (remaining <= 0) {
            clearInterval(trainerState.sprintTimerInterval);
            trainerState.sprintTimerInterval = null;
            const main = trainerState._container || document.getElementById('mainContent');
            if (main) renderSprintSummary(main);
        }
    }
    tick();
    trainerState.sprintTimerInterval = setInterval(tick, 1000);
}

function trainerSprintFlip() {
    trainerState.sprintFlipped = !trainerState.sprintFlipped;
    const inner = document.getElementById('sprintCardInner');
    if (inner) inner.classList.toggle('flipped', trainerState.sprintFlipped);
    const btns = document.getElementById('sprintAnswerBtns');
    if (btns) btns.style.display = trainerState.sprintFlipped ? 'flex' : 'none';
}

/**
 * Sprint answer — Anki-style rating 0-3 or legacy bool.
 */
async function trainerSprintAnswer(ratingOrBool) {
    const card = trainerState.sprintCards[trainerState.sprintIndex];
    if (!card) return;

    // Normalize to rating
    let rating;
    if (typeof ratingOrBool === 'boolean') {
        rating = ratingOrBool ? 2 : 0;
    } else {
        rating = Math.max(0, Math.min(3, parseInt(ratingOrBool, 10) || 0));
    }
    const correct = rating > 0;

    // Flash card border
    const inner = document.getElementById('sprintCardInner');
    if (inner) {
        const flashClass = correct ? 'trainer-flash-correct' : 'trainer-flash-wrong';
        const faces = inner.querySelectorAll('.trainer-card-face');
        faces.forEach(f => f.classList.add(flashClass));
        setTimeout(() => faces.forEach(f => f.classList.remove(flashClass)), 600);
    }

    // Update backend with Anki-style rating
    await api('update_flashcard', card.id, null, rating);

    if (correct) {
        trainerState.sprintCorrect++;
    } else {
        trainerState.sprintWrong++;
        trainerState.sprintFailed.push(card);
    }

    trainerState.sprintIndex++;
    trainerState.sprintFlipped = false;

    const main = trainerState._container || document.getElementById('mainContent');
    if (!main) return;

    if (trainerState.sprintIndex >= trainerState.sprintCards.length) {
        if (trainerState.sprintTimerInterval) {
            clearInterval(trainerState.sprintTimerInterval);
            trainerState.sprintTimerInterval = null;
        }
        renderSprintSummary(main);
    } else {
        renderTrainerSprintActive(main);
    }
}

function confirmExitSprint() {
    if (trainerState.sprintCorrect + trainerState.sprintWrong === 0) {
        exitSprint();
        return;
    }
    if (confirm('Quitter le sprint ? Ton score ne sera pas enregistré.')) {
        exitSprint();
    }
}

function exitSprint() {
    if (trainerState.sprintTimerInterval) {
        clearInterval(trainerState.sprintTimerInterval);
        trainerState.sprintTimerInterval = null;
    }
    trainerState.mode = 'home';
    const main = trainerState._container || document.getElementById('mainContent');
    if (main) renderTrainerHome(main);
}

async function renderSprintSummary(main) {
    const duration  = Date.now() - (trainerState.sprintStartTime || Date.now());
    const total     = trainerState.sprintCorrect + trainerState.sprintWrong;
    const pct       = total > 0 ? Math.round((trainerState.sprintCorrect / total) * 100) : 0;
    const failedIds = trainerState.sprintFailed.map(c => c.id);

    // Save quiz to backend
    await api('save_quiz', 'Sprint', total, trainerState.sprintCorrect, failedIds, Math.floor(duration / 1000));

    let scoreColor = '#fca5a5';
    if (pct >= 80) scoreColor = '#6ee7b7';
    else if (pct >= 50) scoreColor = '#fcd34d';

    const failedHtml = trainerState.sprintFailed.length > 0 ? `
        <div style="text-align:left;margin-top:20px;border-top:1px solid #334155;padding-top:16px">
            <div style="font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:10px">
                Cartes à retravailler (${trainerState.sprintFailed.length})
            </div>
            ${trainerState.sprintFailed.map(c => {
                const cc = trainerCategoryColor(c.category);
                return `
                    <div style="background:#1e293b;border-radius:8px;padding:10px 14px;margin-bottom:8px;
                        border-left:3px solid ${cc.accent}">
                        <div style="font-size:11px;color:${cc.accent};font-weight:700;text-transform:uppercase;margin-bottom:3px">
                            ${trainerEscapeHtml(c.category || '')}
                        </div>
                        <div style="font-size:13px;color:#e2e8f0">${trainerEscapeHtml(c.question)}</div>
                    </div>`;
            }).join('')}
        </div>
    ` : '';

    main.innerHTML = `
        <div style="max-width:560px;margin:40px auto;text-align:center;padding:0 16px 40px">
            <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px">
                <div style="font-size:13px;text-transform:uppercase;letter-spacing:2px;color:#64748b;margin-bottom:8px">
                    Résultat du Sprint
                </div>
                <div style="font-size:72px;font-weight:800;color:${scoreColor};line-height:1">
                    ${pct}%
                </div>
                <div style="font-size:13px;color:#64748b;margin-top:4px;margin-bottom:20px">
                    ${trainerState.sprintCorrect} correct${trainerState.sprintCorrect !== 1 ? 's' : ''} sur ${total}
                </div>

                <div style="display:flex;justify-content:center;gap:28px;margin-bottom:16px">
                    <div>
                        <div style="font-size:28px;font-weight:800;color:#6ee7b7">${trainerState.sprintCorrect}</div>
                        <div style="font-size:11px;color:#64748b">Corrects</div>
                    </div>
                    <div>
                        <div style="font-size:28px;font-weight:800;color:#fca5a5">${trainerState.sprintWrong}</div>
                        <div style="font-size:11px;color:#64748b">Erreurs</div>
                    </div>
                    <div>
                        <div style="font-size:28px;font-weight:800;color:#3b82f6">${trainerFormatTime(duration)}</div>
                        <div style="font-size:11px;color:#64748b">Durée</div>
                    </div>
                </div>

                <div class="trainer-progress-bar" style="margin-bottom:20px">
                    <div class="trainer-progress-fill" style="width:${pct}%;background:${scoreColor}"></div>
                </div>

                ${failedHtml}

                <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap">
                    <button class="trainer-btn trainer-btn-green" onclick="startTrainerSprint()">
                        ⚡ Nouveau Sprint
                    </button>
                    <button class="trainer-btn trainer-btn-outline" onclick="trainerGoHome()">
                        ← Retour
                    </button>
                </div>
            </div>
        </div>
    `;

    trainerFadeIn(main.firstElementChild);
    if (pct >= 80) {
        setTimeout(() => launchConfetti(main), 200);
    }
}

// ══════════════════════════════════════════
// 4. COURS MODE
// ══════════════════════════════════════════

async function showTrainerCours() {
    trainerState.mode = 'cours';
    trainerState.coursSelectedModule = null;
    trainerState.coursSelectedNorm   = null;
    trainerState.coursSelectedLesson = null;

    const main = trainerState._container || document.getElementById('mainContent');
    if (!main) return;

    main.innerHTML = `<div style="text-align:center;padding:60px;color:#64748b">Chargement des cours...</div>`;

    const [coursRaw, progressRaw] = await Promise.all([
        api('get_trainer_courses'),
        api('get_trainer_progress'),
    ]);

    const coursData = (coursRaw && coursRaw.courses) ? coursRaw.courses : [];
    trainerState.coursData     = coursData;
    trainerState.coursProgress = progressRaw || [];

    renderCoursModulePicker(main);
}

function renderCoursModulePicker(main) {
    const courses = trainerState.coursData || [];

    if (courses.length === 0) {
        main.innerHTML = `
            <div style="max-width:600px;margin:60px auto;text-align:center;padding:0 16px">
                <div style="font-size:48px;margin-bottom:16px">📚</div>
                <div style="font-size:20px;font-weight:700;color:#f1f5f9;margin-bottom:8px">
                    Cours en cours de préparation
                </div>
                <div style="font-size:14px;color:#64748b;margin-bottom:24px">
                    Les leçons seront disponibles prochainement.
                </div>
                <button class="trainer-btn trainer-btn-outline" onclick="trainerGoHome()">← Retour</button>
            </div>
        `;
        return;
    }

    // Vue unifiée : groupement par MODULE IFP (M1-M16)
    const searchQuery = (trainerState._coursSearch || '').toLowerCase().trim();

    // Mapping des noms de modules IFP
    const MODULE_NAMES = {
        'M1': "Principes fondamentaux",
        'M2': "Introduction à l'audit",
        'M3': "Normes suisses (CO + RPC)",
        'M4': "IFRS / IAS",
        'M5': "Planification audit",
        'M6': "Droit",
        'M7': "Fiscalité entreprises",
        'M8': "TVA / LTVA",
        'M9': "IT et analyse de données",
        'M10': "Conclusion et rapport d'audit",
        'M11': "États financiers consolidés",
        'M12': "Contrôle restreint (SER)",
        'M13': "Pratique professionnelle",
        'M14': "Missions d'assurance",
        'M15': "Professional Judgement",
        'M16': "Audit Insights",
    };

    // Group courses by module_code (M1-M16) — fallback sur module thématique
    const moduleMap = {};
    courses.forEach(c => {
        // Filter by search
        if (searchQuery) {
            const hay = (c.norm_code + ' ' + (c.norm_title || '') + ' ' + (c.module || '') + ' ' + (c.category || '') + ' ' + (c.module_code || '')).toLowerCase();
            if (!hay.includes(searchQuery)) return;
        }
        const modKey = c.module_code || 'autre';
        if (!moduleMap[modKey]) moduleMap[modKey] = [];
        moduleMap[modKey].push(c);
    });

    // Trier les modules par ordre numérique (M1, M2, ..., M16, puis autre)
    const sortedKeys = Object.keys(moduleMap).sort((a, b) => {
        const na = parseInt((a || '').replace(/\D/g, ''), 10);
        const nb = parseInt((b || '').replace(/\D/g, ''), 10);
        if (isNaN(na) && isNaN(nb)) return a.localeCompare(b);
        if (isNaN(na)) return 1;
        if (isNaN(nb)) return -1;
        return na - nb;
    });
    const modules = sortedKeys.map(k => {
        const label = k === 'autre' ? 'Autres' : `${k} — ${MODULE_NAMES[k] || k}`;
        return [label, moduleMap[k]];
    });
    const totalNorms = courses.length;
    const filteredNorms = modules.reduce((s, [, ns]) => s + ns.length, 0);

    // Global stats
    const totalLessons = courses.reduce((s, c) => s + (c.lessons || []).length, 0);
    const doneLessons = courses.reduce((s, c) => s + (c.lessons || []).filter(l => isLessonDone(c.norm_code, l.id)).length, 0);
    const globalPct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;

    const sectionsHtml = modules.map(([modName, norms]) => {
        // Extract the module code (M1-M16) from the label "M3 — Normes suisses..."
        const modCodeMatch = modName.match(/^(M\d+)/);
        const modCode = modCodeMatch ? modCodeMatch[1] : modName;
        const modColor = (typeof getModuleColor === 'function') ? getModuleColor(modCode) : '#3b82f6';
        const modLessons = norms.reduce((s, n) => s + (n.lessons || []).length, 0);
        const modDone = norms.reduce((s, n) => s + (n.lessons || []).filter(l => isLessonDone(n.norm_code, l.id)).length, 0);
        const modPct = modLessons > 0 ? Math.round((modDone / modLessons) * 100) : 0;

        // Sort norms by code for readability
        norms.sort((a, b) => (a.norm_code || '').localeCompare(b.norm_code || '', 'fr', { numeric: true }));

        const normsHtml = norms.map(c => {
            const lessons = c.lessons || [];
            const total = lessons.length;
            const done = lessons.filter(l => isLessonDone(c.norm_code, l.id)).length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const catColor = trainerCategoryColor(c.category);
            const duration = lessons.reduce((s, l) => s + (l.duration_min || 0), 0);
            const isFullyDone = total > 0 && done === total;

            return `
                <div class="trainer-mode-card" style="border-color:${isFullyDone ? '#10b981' : catColor.accent + '33'};padding:12px 14px;"
                    onclick="trainerSelectNorm(${JSON.stringify(c.norm_code).replace(/"/g, '&quot;')})">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
                        <span class="trainer-tag" style="background:${catColor.bg};color:${catColor.accent};font-size:11px">
                            ${trainerEscapeHtml(c.norm_code)}
                        </span>
                        <span style="font-size:11px;color:${isFullyDone ? '#10b981' : '#64748b'};font-weight:600">
                            ${isFullyDone ? '✓ ' : ''}${done}/${total}
                        </span>
                    </div>
                    <div style="font-size:13px;font-weight:600;color:#f1f5f9;margin-bottom:6px;line-height:1.3">
                        ${trainerEscapeHtml(c.norm_title || c.norm_code)}
                    </div>
                    <div style="font-size:11px;color:#64748b;margin-bottom:8px">
                        ${total} leçon${total !== 1 ? 's' : ''} • ${duration} min
                    </div>
                    <div class="trainer-progress-bar" style="height:4px">
                        <div class="trainer-progress-fill" style="width:${pct}%;background:${isFullyDone ? '#10b981' : catColor.accent}"></div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <section style="margin-bottom:28px">
                <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:10px;border-left:3px solid ${modColor};padding-left:10px">
                    <h3 style="font-size:14px;font-weight:700;color:#f1f5f9;margin:0">${trainerEscapeHtml(modName)}</h3>
                    <span style="font-size:11px;color:#64748b">${norms.length} norme${norms.length !== 1 ? 's' : ''} • ${modDone}/${modLessons} leçons • ${modPct}%</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">
                    ${normsHtml}
                </div>
            </section>
        `;
    }).join('');

    main.innerHTML = `
        <div style="max-width:1000px;margin:0 auto;padding:8px 0 40px">
            <!-- Header -->
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">
                <button class="trainer-btn trainer-btn-outline" style="padding:7px 14px;font-size:12px;"
                    onclick="trainerGoHome()">← Retour</button>
                <div style="flex:1;min-width:200px">
                    <div style="font-size:20px;font-weight:800;color:#f1f5f9">📖 Cours — ${totalNorms} normes</div>
                    <div style="font-size:12px;color:#64748b">${doneLessons}/${totalLessons} leçons terminées — ${globalPct}% global</div>
                </div>
                <div class="trainer-progress-bar" style="flex:1;min-width:180px;max-width:260px;height:6px">
                    <div class="trainer-progress-fill" style="width:${globalPct}%"></div>
                </div>
            </div>

            <!-- Search -->
            <div style="margin-bottom:20px;position:relative">
                <input type="text" id="coursSearchInput" placeholder="🔎 Rechercher une norme (ex: IAS 16, impôts, leasing…)"
                    value="${trainerEscapeHtml(trainerState._coursSearch || '')}"
                    oninput="trainerCoursSearch(this.value)"
                    style="width:100%;padding:10px 14px;background:#0f172a;border:1px solid #334155;border-radius:8px;
                        color:#f1f5f9;font-size:13px;outline:none">
                ${searchQuery ? `<span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:11px;color:#64748b">${filteredNorms} résultat${filteredNorms !== 1 ? 's' : ''}</span>` : ''}
            </div>

            ${modules.length === 0 ? `
                <div style="text-align:center;padding:40px;color:#64748b">
                    Aucune norme ne correspond à "${trainerEscapeHtml(searchQuery)}"
                </div>
            ` : sectionsHtml}
        </div>
    `;
    trainerFadeIn(main.firstElementChild);
}

let _coursSearchTimer = null;
function trainerCoursSearch(value) {
    trainerState._coursSearch = value;
    // Debounce to avoid re-render on every keystroke
    if (_coursSearchTimer) clearTimeout(_coursSearchTimer);
    _coursSearchTimer = setTimeout(() => {
        const main = trainerState._container || document.getElementById('mainContent');
        if (main) {
            const input = document.getElementById('coursSearchInput');
            const hadFocus = input === document.activeElement;
            const caretPos = input ? input.selectionStart : null;
            renderCoursModulePicker(main);
            if (hadFocus) {
                const newInput = document.getElementById('coursSearchInput');
                if (newInput) {
                    newInput.focus();
                    if (caretPos !== null) newInput.setSelectionRange(caretPos, caretPos);
                }
            }
        }
    }, 120);
}

function trainerSelectCoursModule(modName) {
    trainerState.coursSelectedModule = modName;
    const main = trainerState._container || document.getElementById('mainContent');
    if (!main) return;
    renderCoursNormPicker(main);
}

function renderCoursNormPicker(main) {
    const modName = trainerState.coursSelectedModule;
    const courses = (trainerState.coursData || []).filter(c => (c.module || 'Général') === modName);

    let normsHtml = courses.map(c => {
        const lessons    = c.lessons || [];
        const total      = lessons.length;
        const done       = lessons.filter(l => isLessonDone(c.norm_code, l.id)).length;
        const pct        = total > 0 ? Math.round((done / total) * 100) : 0;
        const catColor   = trainerCategoryColor(c.category);

        return `
            <div class="trainer-mode-card" style="border-color:${catColor.accent}33;"
                onclick="trainerSelectNorm(${JSON.stringify(c.norm_code).replace(/"/g, '&quot;')})">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
                    <span class="trainer-tag" style="background:${catColor.bg};color:${catColor.accent}">
                        ${trainerEscapeHtml(c.norm_code)}
                    </span>
                    <span style="font-size:11px;color:#64748b">${done}/${total} leçons</span>
                </div>
                <div style="font-size:15px;font-weight:700;color:#f1f5f9;margin:6px 0 4px">
                    ${trainerEscapeHtml(c.norm_title || c.norm_code)}
                </div>
                <div style="font-size:12px;color:#64748b;margin-bottom:10px">
                    ${total} leçon${total !== 1 ? 's' : ''} • ${lessons.reduce((s, l) => s + (l.duration_min || 0), 0)} min
                </div>
                <div class="trainer-progress-bar">
                    <div class="trainer-progress-fill" style="width:${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');

    main.innerHTML = `
        <div style="max-width:860px;margin:0 auto;padding:8px 0 40px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
                <button class="trainer-btn trainer-btn-outline" style="padding:7px 14px;font-size:12px;"
                    onclick="renderCoursModulePicker(trainerState._container || document.getElementById('mainContent'))">
                    ← Retour
                </button>
                <div>
                    <div style="font-size:20px;font-weight:800;color:#f1f5f9">📖 ${trainerEscapeHtml(modName)}</div>
                    <div style="font-size:12px;color:#64748b">Choisir une norme</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px">
                ${normsHtml || '<div style="color:#64748b">Aucune norme disponible.</div>'}
            </div>
        </div>
    `;
    trainerFadeIn(main.firstElementChild);
}

function trainerSelectNorm(normCode) {
    trainerState.coursSelectedNorm   = normCode;
    trainerState.coursSelectedLesson = null;
    const main = trainerState._container || document.getElementById('mainContent');
    if (!main) return;
    renderCoursLessonList(main);
}

function renderCoursLessonList(main) {
    const normCode = trainerState.coursSelectedNorm;
    const course   = (trainerState.coursData || []).find(c => c.norm_code === normCode);
    if (!course) { trainerGoHome(); return; }

    const lessons    = course.lessons || [];
    const totalTime  = lessons.reduce((s, l) => s + (l.duration_min || 0), 0);
    const done       = lessons.filter(l => isLessonDone(normCode, l.id)).length;
    const catColor   = trainerCategoryColor(course.category);

    let lessonsHtml = lessons.map((l, i) => {
        const isDone = isLessonDone(normCode, l.id);
        return `
            <div onclick="trainerSelectLesson(${JSON.stringify(l.id).replace(/"/g, '&quot;')})"
                style="background:#1e293b;border:1px solid ${isDone ? '#10b981' : '#334155'};border-radius:10px;
                    padding:14px 16px;cursor:pointer;display:flex;align-items:center;gap:14px;
                    transition:border-color 0.15s,background 0.15s;margin-bottom:8px;"
                onmouseover="this.style.borderColor='#10b981'"
                onmouseout="this.style.borderColor='${isDone ? '#10b981' : '#334155'}'">
                <div style="font-size:20px;flex-shrink:0">${isDone ? '✅' : '○'}</div>
                <div style="flex:1">
                    <div style="font-size:14px;font-weight:600;color:#f1f5f9;margin-bottom:2px">
                        ${i + 1}. ${trainerEscapeHtml(l.title)}
                    </div>
                    <div style="font-size:12px;color:#64748b">
                        ~${l.duration_min || 10} min
                        ${l.questions && l.questions.length > 0 ? ` • ${l.questions.length} question${l.questions.length !== 1 ? 's' : ''}` : ''}
                    </div>
                </div>
                <span style="color:#475569;font-size:14px">›</span>
            </div>
        `;
    }).join('');

    main.innerHTML = `
        <div style="max-width:720px;margin:0 auto;padding:8px 0 40px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
                <button class="trainer-btn trainer-btn-outline" style="padding:7px 14px;font-size:12px;"
                    onclick="renderCoursModulePicker(trainerState._container || document.getElementById('mainContent'))">
                    ← Toutes les normes
                </button>
                <div>
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                        <span class="trainer-tag" style="background:${catColor.bg};color:${catColor.accent}">${trainerEscapeHtml(normCode)}</span>
                        <span style="font-size:16px;font-weight:700;color:#f1f5f9">${trainerEscapeHtml(course.norm_title || normCode)}</span>
                    </div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px">
                        ${trainerEscapeHtml(course.module || '')} • ${done}/${lessons.length} leçons • ${totalTime} min estimées
                    </div>
                </div>
            </div>

            <!-- Progress -->
            <div class="trainer-progress-bar" style="margin-bottom:20px">
                <div class="trainer-progress-fill"
                    style="width:${lessons.length > 0 ? Math.round((done/lessons.length)*100) : 0}%"></div>
            </div>

            ${lessonsHtml || '<div style="color:#64748b;padding:20px">Aucune leçon disponible.</div>'}
        </div>
    `;
    trainerFadeIn(main.firstElementChild);
}

function trainerSelectLesson(lessonId) {
    trainerState.coursSelectedLesson = lessonId;
    trainerState.coursLessonAnswers  = {};
    const main = trainerState._container || document.getElementById('mainContent');
    if (!main) return;
    renderCoursLessonReader(main);
}

function renderCoursLessonReader(main) {
    const normCode = trainerState.coursSelectedNorm;
    const lessonId = trainerState.coursSelectedLesson;
    const course   = (trainerState.coursData || []).find(c => c.norm_code === normCode);
    if (!course) { trainerGoHome(); return; }

    const lesson = (course.lessons || []).find(l => l.id === lessonId);
    if (!lesson) { renderCoursLessonList(main); return; }

    const catColor  = trainerCategoryColor(course.category);
    const isDone    = isLessonDone(normCode, lessonId);

    // Key points
    const keyPointsHtml = (lesson.key_points && lesson.key_points.length > 0) ? `
        <div style="background:#064e3b22;border:1px solid #10b98133;border-radius:10px;padding:16px 20px;margin-top:20px">
            <div style="font-size:12px;font-weight:700;color:#6ee7b7;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">
                💡 Points clés
            </div>
            <ul style="list-style:none;margin:0;padding:0">
                ${lesson.key_points.map(kp => `
                    <li style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;font-size:13px;color:#a7f3d0;line-height:1.5">
                        <span style="color:#10b981;flex-shrink:0;margin-top:2px">💡</span>
                        <span>${typeof formatAnswer === 'function' ? formatAnswer(kp) : trainerEscapeHtml(kp)}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    ` : '';

    // Questions
    const questionsHtml = (lesson.questions && lesson.questions.length > 0) ? `
        <div style="margin-top:28px">
            <div class="trainer-section-title">Questions</div>
            <div id="lessonQuestionsContainer">
                ${lesson.questions.map((q, qi) => renderLessonQuestion(q, qi, normCode, lessonId)).join('')}
            </div>
        </div>
    ` : '';

    main.innerHTML = `
        <div style="max-width:720px;margin:0 auto;padding:8px 0 40px">
            <!-- Header -->
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
                <button class="trainer-btn trainer-btn-outline" style="padding:7px 14px;font-size:12px;"
                    onclick="renderCoursLessonList(trainerState._container || document.getElementById('mainContent'))">
                    ← Retour
                </button>
                <div style="flex:1">
                    <div style="font-size:16px;font-weight:700;color:#f1f5f9">${trainerEscapeHtml(lesson.title)}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px">
                        <span class="trainer-tag" style="background:${catColor.bg};color:${catColor.accent};margin-right:6px">${trainerEscapeHtml(normCode)}</span>
                        ~${lesson.duration_min || 10} min
                        ${isDone ? '<span style="color:#10b981;margin-left:8px">✅ Complétée</span>' : ''}
                    </div>
                </div>
            </div>

            <!-- Content -->
            <div style="font-size:14px;line-height:1.8;color:#cbd5e1;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;">
                ${typeof formatAnswer === 'function' ? formatAnswer(lesson.content || '') : trainerEscapeHtml(lesson.content || '')}
            </div>

            ${keyPointsHtml}
            ${questionsHtml}

            <!-- Bottom actions -->
            <div style="display:flex;gap:12px;margin-top:28px;flex-wrap:wrap">
                <button class="trainer-btn trainer-btn-green" id="lessonDoneBtn"
                    onclick="completeLesson('${trainerEscapeHtml(normCode)}', '${trainerEscapeHtml(lessonId)}')"
                    ${isDone ? 'style="opacity:0.6;"' : ''}>
                    ${isDone ? '✅ Leçon déjà terminée' : '✓ Leçon terminée'}
                </button>
                <button class="trainer-btn trainer-btn-blue" onclick="navigateToNormByCode('${trainerEscapeHtml(normCode)}')">
                    📘 Voir la norme complète →
                </button>
            </div>
        </div>
    `;
    trainerFadeIn(main.firstElementChild);
}

function renderLessonQuestion(q, qi, normCode, lessonId) {
    const answered = trainerState.coursLessonAnswers.hasOwnProperty(qi);
    if (q.type === 'vrai_faux') {
        return `
            <div id="lessonQ_${qi}" style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;margin-bottom:12px">
                <div style="font-size:14px;color:#f1f5f9;margin-bottom:12px;font-weight:600">
                    ${qi + 1}. ${trainerEscapeHtml(q.question)}
                </div>
                <div style="display:flex;gap:10px">
                    <button class="trainer-lesson-option" style="flex:1;"
                        onclick="lessonAnswerVraiFaux(${qi}, true, ${JSON.stringify(q.answer).replace(/"/g, '&quot;')}, ${JSON.stringify(q.explanation || '').replace(/"/g, '&quot;')})"
                        ${answered ? 'disabled' : ''}>
                        ✓ Vrai
                    </button>
                    <button class="trainer-lesson-option" style="flex:1;"
                        onclick="lessonAnswerVraiFaux(${qi}, false, ${JSON.stringify(q.answer).replace(/"/g, '&quot;')}, ${JSON.stringify(q.explanation || '').replace(/"/g, '&quot;')})"
                        ${answered ? 'disabled' : ''}>
                        ✗ Faux
                    </button>
                </div>
                <div id="lessonQExp_${qi}" style="display:none;margin-top:10px;font-size:13px;color:#94a3b8;border-top:1px solid #334155;padding-top:10px">
                </div>
            </div>
        `;
    }
    // MCQ (default)
    const opts = q.options || [];
    return `
        <div id="lessonQ_${qi}" style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:16px;margin-bottom:12px">
            <div style="font-size:14px;color:#f1f5f9;margin-bottom:12px;font-weight:600">
                ${qi + 1}. ${trainerEscapeHtml(q.question)}
            </div>
            <div>
                ${opts.map((opt, oi) => `
                    <button class="trainer-lesson-option"
                        onclick="lessonAnswerMCQ(${qi}, ${oi}, ${JSON.stringify(q.answer).replace(/"/g, '&quot;')}, ${JSON.stringify(q.explanation || '').replace(/"/g, '&quot;')})"
                        id="lessonOpt_${qi}_${oi}"
                        ${answered ? 'disabled' : ''}>
                        ${trainerEscapeHtml(opt)}
                    </button>
                `).join('')}
            </div>
            <div id="lessonQExp_${qi}" style="display:none;margin-top:10px;font-size:13px;color:#94a3b8;border-top:1px solid #334155;padding-top:10px">
            </div>
        </div>
    `;
}

function lessonAnswerMCQ(qi, selectedOi, correctAnswer, explanation) {
    if (trainerState.coursLessonAnswers.hasOwnProperty(qi)) return;
    trainerState.coursLessonAnswers[qi] = selectedOi;

    // Determine correct option index
    const course  = (trainerState.coursData || []).find(c => c.norm_code === trainerState.coursSelectedNorm);
    const lesson  = course ? (course.lessons || []).find(l => l.id === trainerState.coursSelectedLesson) : null;
    const q       = lesson ? (lesson.questions || [])[qi] : null;
    const opts    = q ? (q.options || []) : [];

    let correctIdx = -1;
    // Try: answer is index
    if (typeof correctAnswer === 'number') {
        correctIdx = correctAnswer;
    } else if (typeof correctAnswer === 'string') {
        // Try exact match
        correctIdx = opts.findIndex(o => o === correctAnswer);
        // Try numeric string
        if (correctIdx === -1 && !isNaN(parseInt(correctAnswer, 10))) {
            correctIdx = parseInt(correctAnswer, 10);
        }
    }

    opts.forEach((_, oi) => {
        const btn = document.getElementById(`lessonOpt_${qi}_${oi}`);
        if (!btn) return;
        btn.disabled = true;
        if (oi === correctIdx) btn.classList.add('correct');
        else if (oi === selectedOi && oi !== correctIdx) btn.classList.add('wrong');
    });

    const expEl = document.getElementById(`lessonQExp_${qi}`);
    if (expEl && explanation) {
        expEl.style.display = 'block';
        expEl.innerHTML = `<strong style="color:${selectedOi === correctIdx ? '#6ee7b7' : '#fca5a5'}">${selectedOi === correctIdx ? '✓ Correct !' : '✗ Incorrect'}</strong> — ${trainerEscapeHtml(explanation)}`;
    }
}

function lessonAnswerVraiFaux(qi, selected, correctAnswer, explanation) {
    if (trainerState.coursLessonAnswers.hasOwnProperty(qi)) return;
    trainerState.coursLessonAnswers[qi] = selected;

    // Normalize correct answer
    let correctBool = false;
    if (typeof correctAnswer === 'boolean') correctBool = correctAnswer;
    else if (typeof correctAnswer === 'string') correctBool = correctAnswer.toLowerCase() === 'true' || correctAnswer.toLowerCase() === 'vrai';

    const isCorrect = selected === correctBool;
    const qBlock    = document.getElementById(`lessonQ_${qi}`);
    if (qBlock) {
        const btns = qBlock.querySelectorAll('.trainer-lesson-option');
        btns.forEach(btn => {
            btn.disabled = true;
            const btnIsTrue = btn.textContent.includes('Vrai');
            if ((btnIsTrue && correctBool) || (!btnIsTrue && !correctBool)) btn.classList.add('correct');
            else if ((btnIsTrue && selected) || (!btnIsTrue && !selected)) btn.classList.add('wrong');
        });
    }

    const expEl = document.getElementById(`lessonQExp_${qi}`);
    if (expEl) {
        expEl.style.display = 'block';
        expEl.innerHTML = `<strong style="color:${isCorrect ? '#6ee7b7' : '#fca5a5'}">${isCorrect ? '✓ Correct !' : '✗ Incorrect'}</strong>${explanation ? ' — ' + trainerEscapeHtml(explanation) : ''}`;
    }
}

async function completeLesson(normCode, lessonId) {
    // Save progress
    await api('save_lesson_progress', normCode, lessonId, true);
    saveLocalLessonProgress(normCode, lessonId, true);

    // Update server progress cache
    const arr = trainerState.coursProgress || [];
    const existing = arr.find(p => p.norm_code === normCode && p.lesson_id === lessonId);
    if (existing) { existing.completed = true; existing.completed_at = new Date().toISOString(); }
    else arr.push({ norm_code: normCode, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() });
    trainerState.coursProgress = arr;

    // Update button
    const btn = document.getElementById('lessonDoneBtn');
    if (btn) {
        btn.textContent = '✅ Leçon terminée';
        btn.style.opacity = '0.6';
    }

    // Count question score
    const course  = (trainerState.coursData || []).find(c => c.norm_code === normCode);
    const lesson  = course ? (course.lessons || []).find(l => l.id === lessonId) : null;
    const qs      = lesson ? (lesson.questions || []) : [];
    const answered = Object.keys(trainerState.coursLessonAnswers).length;

    let feedback = '✅ Progression sauvegardée !';
    if (qs.length > 0 && answered === qs.length) {
        feedback = `✅ Leçon terminée — ${answered} question${answered !== 1 ? 's' : ''} répondue${answered !== 1 ? 's' : ''}.`;
    }

    // Flash confirmation
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#064e3b;border:1px solid #10b981;border-radius:10px;padding:12px 18px;font-size:13px;color:#6ee7b7;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.5)';
    toast.textContent = feedback;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);

    // Go back to lesson list after short delay
    setTimeout(() => {
        const main = trainerState._container || document.getElementById('mainContent');
        if (main) renderCoursLessonList(main);
    }, 1200);
}

function isLessonDone(normCode, lessonId) {
    // Check server progress first
    const serverProgress = trainerState.coursProgress || [];
    const serverRec = serverProgress.find(p => p.norm_code === normCode && p.lesson_id === lessonId);
    if (serverRec) return !!serverRec.completed;
    // Fallback to localStorage
    return isLessonDoneLocal(normCode, lessonId);
}

// ══════════════════════════════════════════
// 5. FLASHCARDS MODE
// ══════════════════════════════════════════

// ── Constants partagées avec flashcards.js (dupliquées pour éviter coupling) ──
const TRAINER_SMART_STRATEGIES = {
    overdue:      { icon: '🔴', label: 'En retard',     desc: 'Cartes dues + erreurs récentes' },
    weak:         { icon: '🎯', label: 'Points faibles', desc: 'Mastery faible ou accuracy < 70%' },
    new:          { icon: '🆕', label: 'Découverte',     desc: 'Jamais vues — intro graduelle' },
    balanced:     { icon: '⚖️', label: 'Équilibré',     desc: '40% retard · 30% faibles · 10% neuf · 20% mix' },
    interleaving: { icon: '🧠', label: 'Interleaving',   desc: 'Mix inter-catégories (anti-bloc)' },
};
const TRAINER_MODULE_CODES = ['M1','M2','M3','M4','M5','M6','M7','M8',
                              'M9','M10','M11','M12','M13','M14','M15','M16'];

async function showTrainerFlashcards() {
    trainerState.mode = 'flashcards';
    trainerState.fcIndex   = 0;
    trainerState.fcFlipped = false;
    trainerState.fcFilters = {
        // Filtres standards (déjà présents)
        search: '', category: '', difficulty: '', mastery: '', dueOnly: false,
        // Filtres avancés (nouveaux)
        module: null, neverSeen: false, notSeenDays: null, maxAccuracy: null,
        // Smart
        useSmart: false,
        smartStrategy: 'balanced',
        smartLimit: 20,
    };
    trainerState.fcAdvancedOpen = false;
    trainerState.fcSmartBreakdown = null;

    const main = trainerState._container || document.getElementById('mainContent');
    if (!main) return;

    main.innerHTML = `<div style="text-align:center;padding:60px;color:#64748b">Chargement...</div>`;

    // Stats + premier chargement via le nouveau chemin (backend filters)
    trainerState.fcStats = (await api('get_review_stats')) || { due: 0, total: 0, mastered: 0 };
    await trainerFcLoadCards();

    renderTrainerFlashcards(main);
}

/**
 * Charge les cartes via le backend selon tous les filtres actifs.
 * Smart mode ? -> get_smart_deck. Sinon -> get_flashcards étendu.
 */
async function trainerFcLoadCards() {
    const f = trainerState.fcFilters;
    let cards = [];
    trainerState.fcSmartBreakdown = null;

    // Normalisation légère côté cat: le backend attend la valeur exacte
    // tandis que l'UI utilise des abréviations ("IFRS", "Audit", ...).
    const catMap = {
        'Swiss GAAP': 'Swiss GAAP RPC', 'IFRS': 'IFRS / IAS',
        'Audit': 'Audit / ISA', 'Fiscal': 'Fiscalité',
    };
    const cat = catMap[f.category] || f.category || null;

    if (f.useSmart) {
        const r = await api('get_smart_deck',
            f.smartStrategy, cat, null, f.module || null, f.difficulty || null,
            f.smartLimit);
        cards = (r && r.cards) || [];
        trainerState.fcSmartBreakdown = r && r.breakdown ? r.breakdown : null;
    } else {
        cards = await api('get_flashcards',
            cat || '',
            '',                        // subcategory
            f.difficulty || '',
            f.dueOnly || false,
            f.mastery || null,
            f.search || '',
            false,                     // wrong_only (on n'a pas d'UI dédiée ici)
            f.module || null,
            f.notSeenDays,
            f.neverSeen || false,
            null,                      // min_accuracy
            f.maxAccuracy,
            null                       // pas de limit hors smart
        );
        cards = cards || [];
    }

    trainerState.fcCards = cards;
    trainerState.fcIndex = 0;
    trainerState.fcFlipped = false;
}

function renderTrainerFlashcards(main) {
    if (!main) return;

    const f = trainerState.fcFilters;
    // Les cartes sont déjà pré-filtrées par le backend (trainerFcLoadCards).
    // Plus de filtrage côté client ici -> cohérence des stats + perf.
    const filteredCards  = trainerState.fcCards || [];
    const idx            = Math.min(trainerState.fcIndex, Math.max(0, filteredCards.length - 1));
    const card           = filteredCards[idx] || null;
    const dueCount       = filteredCards.filter(c => !c.next_review || new Date(c.next_review) <= new Date()).length;
    const masteredCount  = filteredCards.filter(c => c.mastery === 'Mastered').length;

    // Compteur de filtres avancés actifs (badge visible sur le bouton)
    const advActive = [f.module, f.mastery, f.neverSeen, f.notSeenDays, f.maxAccuracy, f.dueOnly]
        .filter(x => x !== null && x !== undefined && x !== false && x !== '').length;

    const catColor = card ? trainerCategoryColor(card.category) : { accent: '#64748b', bg: '#1e293b' };

    const masteryInfo = card ? trainerMasteryLabel(card.mastery) : null;

    main.innerHTML = `
        <div style="max-width:800px;margin:0 auto;padding:8px 0 40px">

            <!-- Header -->
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
                <button class="trainer-btn trainer-btn-outline" style="padding:7px 14px;font-size:12px;"
                    onclick="trainerGoHome()">← Retour</button>
                <div>
                    <div style="font-size:18px;font-weight:800;color:#f1f5f9">🃏 Flashcards</div>
                    <div style="font-size:12px;color:#64748b">${filteredCards.length} cartes • ${dueCount} dues • ${masteredCount} maîtrisées</div>
                </div>
                <div style="margin-left:auto;font-size:11px;color:#475569">Espace=flip · →=correct · ←=faux</div>
            </div>

            <!-- Smart mode toggle + strategy bar -->
            <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;margin-bottom:12px">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:${f.useSmart ? '10px' : '0'}">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#e2e8f0;font-weight:600">
                        <input type="checkbox" ${f.useSmart ? 'checked' : ''}
                            onchange="trainerFcToggleSmart(this.checked)"
                            style="width:16px;height:16px;cursor:pointer">
                        🧠 Mode Smart — l'app choisit selon ta stratégie + tes filtres
                    </label>
                    <span style="margin-left:auto;font-size:11px;color:#64748b">
                        ${f.useSmart ? `Stratégie : ${TRAINER_SMART_STRATEGIES[f.smartStrategy].label} · ${f.smartLimit} cartes` : ''}
                    </span>
                </div>
                ${f.useSmart ? `
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
                        ${Object.entries(TRAINER_SMART_STRATEGIES).map(([key, s]) => {
                            const active = f.smartStrategy === key;
                            return `<button
                                onclick="trainerFcSetStrategy('${key}')"
                                title="${trainerEscapeHtml(s.desc)}"
                                style="background:${active ? '#1e3a5f' : '#0f172a'};
                                    color:${active ? '#93c5fd' : '#94a3b8'};
                                    border:1px solid ${active ? '#3b82f6' : '#334155'};
                                    border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;
                                    font-weight:${active ? '700' : '500'};transition:all 0.15s">
                                ${s.icon} ${s.label}
                            </button>`;
                        }).join('')}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#94a3b8">
                        <span>Taille :</span>
                        ${[10,20,30,50].map(n => `
                            <button onclick="trainerFcSetSmartLimit(${n})"
                                style="background:${f.smartLimit === n ? '#1e3a5f' : 'transparent'};
                                    color:${f.smartLimit === n ? '#93c5fd' : '#94a3b8'};
                                    border:1px solid ${f.smartLimit === n ? '#3b82f6' : '#334155'};
                                    border-radius:6px;padding:3px 10px;font-size:12px;cursor:pointer">${n}</button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>

            <!-- Filter bar -->
            <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:14px;margin-bottom:16px">
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                    <!-- Search -->
                    <input type="text" placeholder="🔍 Rechercher..." value="${trainerEscapeHtml(f.search)}"
                        oninput="trainerFcSetFilter('search', this.value)"
                        style="background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:8px;
                            padding:7px 12px;font-size:13px;flex:1;min-width:160px;outline:none;">

                    <!-- Category -->
                    <select onchange="trainerFcSetFilter('category', this.value)"
                        style="background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:8px;
                            padding:7px 10px;font-size:12px">
                        <option value="" ${!f.category ? 'selected' : ''}>Toutes catégories</option>
                        <option value="Swiss GAAP" ${f.category === 'Swiss GAAP' ? 'selected' : ''}>Swiss GAAP RPC</option>
                        <option value="IFRS" ${f.category === 'IFRS' ? 'selected' : ''}>IFRS / IAS</option>
                        <option value="Audit" ${f.category === 'Audit' ? 'selected' : ''}>Audit / ISA</option>
                        <option value="Fiscal" ${f.category === 'Fiscal' ? 'selected' : ''}>Fiscalité</option>
                    </select>

                    <!-- Difficulty -->
                    <select onchange="trainerFcSetFilter('difficulty', this.value)"
                        style="background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:8px;
                            padding:7px 10px;font-size:12px">
                        <option value="" ${!f.difficulty ? 'selected' : ''}>Difficulté</option>
                        <option value="facile" ${f.difficulty === 'facile' ? 'selected' : ''}>Facile</option>
                        <option value="moyen" ${f.difficulty === 'moyen' ? 'selected' : ''}>Moyen</option>
                        <option value="difficile" ${f.difficulty === 'difficile' ? 'selected' : ''}>Difficile</option>
                        <option value="piège" ${f.difficulty === 'piège' ? 'selected' : ''}>Piège</option>
                    </select>

                    <!-- Advanced toggle -->
                    <button onclick="trainerFcToggleAdvanced()"
                        style="background:#0f172a;border:1px solid #334155;color:#94a3b8;
                            border-radius:8px;padding:7px 12px;font-size:12px;cursor:pointer;font-weight:600">
                        ⚙ Filtres avancés${advActive > 0
                            ? `<span style="background:#3b82f6;color:white;border-radius:10px;padding:1px 7px;margin-left:6px;font-size:10px">${advActive}</span>`
                            : ''}${trainerState.fcAdvancedOpen ? ' ▲' : ' ▼'}
                    </button>

                    ${advActive > 0 ? `<button onclick="trainerFcResetAdvanced()"
                        style="background:#0f172a;border:1px solid #7f1d1d;color:#fca5a5;
                            border-radius:8px;padding:7px 12px;font-size:12px;cursor:pointer">
                        ↺ Réinit.
                    </button>` : ''}
                </div>

                ${trainerState.fcAdvancedOpen ? `
                    <div style="margin-top:12px;padding-top:12px;border-top:1px solid #334155;
                                display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">
                        <div>
                            <label style="font-size:11px;color:#64748b;display:block;margin-bottom:4px">Module</label>
                            <select onchange="trainerFcSetFilter('module', this.value || null)"
                                style="width:100%;background:#0f172a;color:#e2e8f0;border:1px solid #334155;
                                    border-radius:6px;padding:6px 8px;font-size:12px">
                                <option value="">Tous</option>
                                ${TRAINER_MODULE_CODES.map(m =>
                                    `<option value="${m}" ${f.module === m ? 'selected' : ''}>${m}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11px;color:#64748b;display:block;margin-bottom:4px">Mastery</label>
                            <select onchange="trainerFcSetFilter('mastery', this.value || null)"
                                style="width:100%;background:#0f172a;color:#e2e8f0;border:1px solid #334155;
                                    border-radius:6px;padding:6px 8px;font-size:12px">
                                <option value="" ${!f.mastery ? 'selected' : ''}>Tous niveaux</option>
                                <option value="Not started" ${f.mastery === 'Not started' ? 'selected' : ''}>Non commencé</option>
                                <option value="Again"       ${f.mastery === 'Again'       ? 'selected' : ''}>À revoir</option>
                                <option value="Learning"    ${f.mastery === 'Learning'    ? 'selected' : ''}>Apprentissage</option>
                                <option value="Good"        ${f.mastery === 'Good'        ? 'selected' : ''}>Bien</option>
                                <option value="Mastered"    ${f.mastery === 'Mastered'    ? 'selected' : ''}>Maîtrisé</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11px;color:#64748b;display:block;margin-bottom:4px">Pas vu depuis</label>
                            <select onchange="trainerFcSetFilter('notSeenDays', this.value ? parseInt(this.value) : null)"
                                style="width:100%;background:#0f172a;color:#e2e8f0;border:1px solid #334155;
                                    border-radius:6px;padding:6px 8px;font-size:12px">
                                <option value="">Peu importe</option>
                                <option value="3"  ${f.notSeenDays === 3  ? 'selected' : ''}>3 jours</option>
                                <option value="7"  ${f.notSeenDays === 7  ? 'selected' : ''}>7 jours</option>
                                <option value="14" ${f.notSeenDays === 14 ? 'selected' : ''}>14 jours</option>
                                <option value="30" ${f.notSeenDays === 30 ? 'selected' : ''}>30 jours</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:11px;color:#64748b;display:block;margin-bottom:4px">Taux de réussite max</label>
                            <select onchange="trainerFcSetFilter('maxAccuracy', this.value ? parseFloat(this.value) : null)"
                                style="width:100%;background:#0f172a;color:#e2e8f0;border:1px solid #334155;
                                    border-radius:6px;padding:6px 8px;font-size:12px">
                                <option value="">Peu importe</option>
                                <option value="0.5" ${f.maxAccuracy === 0.5 ? 'selected' : ''}>&lt; 50%</option>
                                <option value="0.7" ${f.maxAccuracy === 0.7 ? 'selected' : ''}>&lt; 70%</option>
                                <option value="0.9" ${f.maxAccuracy === 0.9 ? 'selected' : ''}>&lt; 90%</option>
                            </select>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:6px;justify-content:center">
                            <label style="font-size:12px;color:#e2e8f0;display:flex;align-items:center;gap:6px;cursor:pointer">
                                <input type="checkbox" ${f.neverSeen ? 'checked' : ''}
                                    onchange="trainerFcSetFilter('neverSeen', this.checked)"> Jamais vue
                            </label>
                            <label style="font-size:12px;color:#e2e8f0;display:flex;align-items:center;gap:6px;cursor:pointer">
                                <input type="checkbox" ${f.dueOnly ? 'checked' : ''}
                                    onchange="trainerFcSetFilter('dueOnly', this.checked)"> Due aujourd'hui
                            </label>
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Bandeau de sélection : explique ce que contient le deck -->
            ${filteredCards.length > 0 && idx === 0 ? (() => {
                const b = trainerState.fcSmartBreakdown;
                if (f.useSmart && b) {
                    const strat = TRAINER_SMART_STRATEGIES[f.smartStrategy];
                    return `<div style="background:#1e293b;border:1px solid #334155;border-radius:8px;
                        padding:8px 12px;margin-bottom:14px;font-size:12px;color:#94a3b8">
                        ${strat.icon} <strong>${strat.label}</strong> — ${b.total} cartes :
                        ${b.overdue ? `🔴 ${b.overdue} en retard · ` : ''}
                        ${b.wrong ? `❌ ${b.wrong} erreurs · ` : ''}
                        ${b.weak_mastery ? `🎯 ${b.weak_mastery} faibles · ` : ''}
                        ${b.never_seen ? `🆕 ${b.never_seen} nouvelles · ` : ''}
                        ${b.reviewed_ok ? `✓ ${b.reviewed_ok} maîtrisées` : ''}
                    </div>`;
                }
                return `<div style="background:#1e293b;border:1px solid #334155;border-radius:8px;
                    padding:8px 12px;margin-bottom:14px;font-size:12px;color:#64748b">
                    🃏 ${filteredCards.length} cartes · tes notes alimentent la répétition espacée
                </div>`;
            })() : ''}

            ${filteredCards.length === 0 ? `
                <div style="text-align:center;padding:60px">
                    <div style="font-size:40px;margin-bottom:12px">📭</div>
                    <div style="font-size:15px;color:#64748b">Aucune carte ne correspond aux filtres</div>
                </div>
            ` : `
                <!-- Progress -->
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                    <span style="font-size:13px;color:#94a3b8;font-weight:600;white-space:nowrap">${idx + 1} / ${filteredCards.length}</span>
                    <div class="trainer-progress-bar" style="flex:1">
                        <div class="trainer-progress-fill" style="width:${filteredCards.length > 0 ? ((idx + 1) / filteredCards.length) * 100 : 0}%"></div>
                    </div>
                </div>

                <!-- Category + mastery badges -->
                <div style="margin-bottom:10px;display:flex;gap:6px;flex-wrap:wrap">
                    ${card ? `<span class="trainer-tag" style="background:${catColor.bg};color:${catColor.accent}">${trainerEscapeHtml(card.category || 'Général')}</span>` : ''}
                    ${card && card.subcategory ? `<span class="trainer-tag" style="background:#1e293b;color:#64748b">${trainerEscapeHtml(card.subcategory)}</span>` : ''}
                    ${card && masteryInfo ? `<span class="trainer-tag" style="background:#1e293b;color:${masteryInfo.color}">${masteryInfo.label}</span>` : ''}
                    ${card && card.difficulty ? `<span class="trainer-tag" style="background:#1e293b;color:#94a3b8">${trainerEscapeHtml(card.difficulty)}</span>` : ''}
                </div>

                <!-- Flip card -->
                <div class="trainer-card-flip" onclick="trainerFcFlip()" style="cursor:pointer">
                    <div class="trainer-card-inner ${trainerState.fcFlipped ? 'flipped' : ''}" id="fcTrainerCardInner">
                        <div class="trainer-card-face">
                            <div style="flex:1;display:flex;align-items:center;justify-content:center">
                                <div style="font-size:18px;font-weight:600;color:#f1f5f9;text-align:center;line-height:1.5">
                                    ${card ? trainerEscapeHtml(card.question) : ''}
                                </div>
                            </div>
                            <div style="text-align:center;font-size:12px;color:#475569;margin-top:16px">
                                Cliquer ou Espace pour retourner
                            </div>
                        </div>
                        <div class="trainer-card-face trainer-card-back">
                            <div style="flex:1;overflow-y:auto;font-size:14px;line-height:1.7;color:#cbd5e1">
                                ${card ? (typeof formatAnswer === 'function' ? formatAnswer(card.answer) : trainerEscapeHtml(card.answer)) : ''}
                            </div>
                            ${card && card.review_count > 0 ? `
                                <div style="margin-top:12px;font-size:11px;color:#475569;border-top:1px solid #334155;padding-top:8px">
                                    ${card.correct_count || 0} correct${(card.correct_count || 0) !== 1 ? 's' : ''} •
                                    ${card.wrong_count || 0} erreur${(card.wrong_count || 0) !== 1 ? 's' : ''} •
                                    ${card.review_count} révision${card.review_count !== 1 ? 's' : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Anki-style 4-level rating buttons (raccourcis 1-4) -->
                <div id="fcTrainerAnswerBtns" style="display:${trainerState.fcFlipped ? 'flex' : 'none'};
                    justify-content:center;gap:10px;margin-top:20px;flex-wrap:wrap">
                    <button class="trainer-btn trainer-btn-red" style="min-width:130px;padding:10px 14px" title="Touche 1 — Oublié"
                        onclick="trainerFcAnswer(0)">
                        ✗ Again<br><span style="font-size:11px;opacity:0.85">oublié (1)</span>
                    </button>
                    <button class="trainer-btn" style="min-width:130px;padding:10px 14px;background:#78350f;color:#fdba74;border-color:#92400e" title="Touche 2 — Difficile"
                        onclick="trainerFcAnswer(1)">
                        ~ Hard<br><span style="font-size:11px;opacity:0.85">difficile (2)</span>
                    </button>
                    <button class="trainer-btn trainer-btn-green" style="min-width:130px;padding:10px 14px" title="Touche 3 — Normal"
                        onclick="trainerFcAnswer(2)">
                        ✓ Good<br><span style="font-size:11px;opacity:0.85">normal (3)</span>
                    </button>
                    <button class="trainer-btn" style="min-width:130px;padding:10px 14px;background:#1e3a8a;color:#93c5fd;border-color:#1e40af" title="Touche 4 — Trivial"
                        onclick="trainerFcAnswer(3)">
                        ⚡ Easy<br><span style="font-size:11px;opacity:0.85">trivial (4)</span>
                    </button>
                </div>

                <!-- Navigation -->
                <div style="display:flex;justify-content:center;gap:10px;margin-top:14px">
                    <button class="trainer-btn trainer-btn-outline" style="padding:8px 16px;font-size:12px"
                        onclick="trainerFcPrev()" ${idx === 0 ? 'disabled style="opacity:0.4;pointer-events:none"' : ''}>
                        ← Préc.
                    </button>
                    <button class="trainer-btn trainer-btn-outline" style="padding:8px 16px;font-size:12px"
                        onclick="trainerFcNext()">
                        Suivant →
                    </button>
                </div>
            `}
        </div>
    `;

    trainerFadeIn(main.firstElementChild);
    trainerAttachFcKeyboard();
}

// ── Flashcard filter helpers ──

let _trainerFcSearchTimer = null;

/** Déclenche rechargement backend + re-render. Utilisé par tous les filtres. */
async function _trainerFcReload() {
    const main = trainerState._container || document.getElementById('mainContent');
    if (!main) return;
    await trainerFcLoadCards();
    renderTrainerFlashcards(main);
}

function trainerFcSetFilter(key, value) {
    if (key === 'search') {
        clearTimeout(_trainerFcSearchTimer);
        _trainerFcSearchTimer = setTimeout(() => {
            trainerState.fcFilters[key] = value;
            _trainerFcReload();
        }, 250);
        return;
    }
    trainerState.fcFilters[key] = value;
    _trainerFcReload();
}

function trainerFcToggleDue() {
    trainerState.fcFilters.dueOnly = !trainerState.fcFilters.dueOnly;
    _trainerFcReload();
}

function trainerFcToggleAdvanced() {
    trainerState.fcAdvancedOpen = !trainerState.fcAdvancedOpen;
    const main = trainerState._container || document.getElementById('mainContent');
    if (main) renderTrainerFlashcards(main);
}

function trainerFcResetAdvanced() {
    Object.assign(trainerState.fcFilters, {
        module: null, mastery: null, neverSeen: false,
        dueOnly: false, notSeenDays: null, maxAccuracy: null,
    });
    _trainerFcReload();
}

function trainerFcToggleSmart(enabled) {
    trainerState.fcFilters.useSmart = !!enabled;
    _trainerFcReload();
}

function trainerFcSetStrategy(strat) {
    trainerState.fcFilters.smartStrategy = strat;
    _trainerFcReload();
}

function trainerFcSetSmartLimit(n) {
    trainerState.fcFilters.smartLimit = n;
    _trainerFcReload();
}

function trainerFcFlip() {
    trainerState.fcFlipped = !trainerState.fcFlipped;
    const inner = document.getElementById('fcTrainerCardInner');
    if (inner) inner.classList.toggle('flipped', trainerState.fcFlipped);
    const btns = document.getElementById('fcTrainerAnswerBtns');
    if (btns) btns.style.display = trainerState.fcFlipped ? 'flex' : 'none';
}

/**
 * Answer a trainer flashcard with Anki-style rating (0-3) or legacy bool.
 * - 0 = Again, 1 = Hard, 2 = Good, 3 = Easy
 */
async function trainerFcAnswer(ratingOrBool) {
    // Le deck est déjà pré-filtré par le backend via trainerFcLoadCards.
    // Plus besoin de re-filtrer côté client.
    const cards = trainerState.fcCards || [];
    const card = cards[trainerState.fcIndex];
    if (!card) return;

    // Normalize: bool or int -> rating 0-3
    let rating;
    if (typeof ratingOrBool === 'boolean') {
        rating = ratingOrBool ? 2 : 0;
    } else {
        rating = Math.max(0, Math.min(3, parseInt(ratingOrBool, 10) || 0));
    }
    const correct = rating > 0;

    // Flash border
    const inner = document.getElementById('fcTrainerCardInner');
    if (inner) {
        const cls = correct ? 'trainer-flash-correct' : 'trainer-flash-wrong';
        inner.querySelectorAll('.trainer-card-face').forEach(f => f.classList.add(cls));
        setTimeout(() => inner.querySelectorAll('.trainer-card-face').forEach(f => f.classList.remove(cls)), 600);
    }

    // Backend: Anki-style rating
    await api('update_flashcard', card.id, null, rating);

    // Optimistic in-memory update, aligned with server SM-2 (rating-driven)
    const masterCard = trainerState.fcCards.find(c => c.id === card.id);
    if (masterCard) {
        const cur = masterCard.mastery || 'Not started';
        if (rating === 0) {          // Again
            masterCard.mastery = 'Again';
            masterCard.wrong_count = (masterCard.wrong_count || 0) + 1;
        } else if (rating === 1) {   // Hard
            masterCard.mastery = 'Learning';
            masterCard.correct_count = (masterCard.correct_count || 0) + 1;
        } else if (rating === 2) {   // Good
            const progressMap = { 'Not started': 'Learning', 'Again': 'Learning', 'Learning': 'Good', 'Good': 'Good', 'Mastered': 'Mastered' };
            masterCard.mastery = progressMap[cur] || 'Learning';
            masterCard.correct_count = (masterCard.correct_count || 0) + 1;
        } else {                     // Easy (3)
            masterCard.mastery = 'Mastered';
            masterCard.correct_count = (masterCard.correct_count || 0) + 1;
        }
        masterCard.review_count = (masterCard.review_count || 0) + 1;
    }

    trainerState.fcIndex++;
    trainerState.fcFlipped = false;
    const main = trainerState._container || document.getElementById('mainContent');
    if (main) renderTrainerFlashcards(main);
}

function trainerFcNext() {
    trainerState.fcIndex++;
    trainerState.fcFlipped = false;
    const main = trainerState._container || document.getElementById('mainContent');
    if (main) renderTrainerFlashcards(main);
}

function trainerFcPrev() {
    if (trainerState.fcIndex > 0) {
        trainerState.fcIndex--;
        trainerState.fcFlipped = false;
        const main = trainerState._container || document.getElementById('mainContent');
        if (main) renderTrainerFlashcards(main);
    }
}

// Keyboard shortcuts for flashcard mode
function trainerAttachFcKeyboard() {
    // Remove any previous listener
    if (window._trainerFcKeyHandler) {
        document.removeEventListener('keydown', window._trainerFcKeyHandler);
    }
    window._trainerFcKeyHandler = (e) => {
        if (trainerState.mode !== 'flashcards') {
            document.removeEventListener('keydown', window._trainerFcKeyHandler);
            return;
        }
        // Don't fire when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

        if (e.code === 'Space') {
            e.preventDefault();
            trainerFcFlip();
        } else if (e.code === 'ArrowRight') {
            e.preventDefault();
            if (trainerState.fcFlipped) trainerFcAnswer(2); // Good
            else trainerFcNext();
        } else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            if (trainerState.fcFlipped) trainerFcAnswer(0); // Again
            else trainerFcPrev();
        } else if (trainerState.fcFlipped && (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4')) {
            // Anki-style rating: 1=Again, 2=Hard, 3=Good, 4=Easy
            e.preventDefault();
            trainerFcAnswer(parseInt(e.key, 10) - 1);
        }
    };
    document.addEventListener('keydown', window._trainerFcKeyHandler);
}

// ══════════════════════════════════════════
// 6. SHARED UTILITIES
// ══════════════════════════════════════════

function trainerGoHome() {
    trainerState.mode = 'home';
    if (trainerState.sprintTimerInterval) {
        clearInterval(trainerState.sprintTimerInterval);
        trainerState.sprintTimerInterval = null;
    }
    if (window._trainerFcKeyHandler) {
        document.removeEventListener('keydown', window._trainerFcKeyHandler);
        window._trainerFcKeyHandler = null;
    }
    const main = trainerState._container || document.getElementById('mainContent');
    if (main) renderTrainerHome(main);
}

function trainerShuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
