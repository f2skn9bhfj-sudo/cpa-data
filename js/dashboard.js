/* ═══════════════════════════════════════════════
   Dashboard — Hub de Révision Swiss CPA
   Inspired by Notion tracker layout
   ═══════════════════════════════════════════════ */

async function renderDashboard(container) {
    const [stats, sessions, modules, lessonsStats, norms] = await Promise.all([
        api('get_dashboard_stats'),
        api('get_recent_sessions', 5),
        api('get_modules'),
        api('get_lessons_stats'),
        api('get_norms_data')
    ]);

    const s = stats || { total_flashcards: 0, total_modules: 0, total_quizzes: 0, avg_score: 0, categories: [] };
    const sess = sessions || [];
    const mods = modules || [];
    const ls = lessonsStats || { total: 0, done: 0, in_progress: 0, by_module: {} };
    const normsList = (norms && norms.norms) ? norms.norms : [];
    // Normalise les clés de stats (API desktop ≠ build web statique) → évite les "undefined"
    s.total_flashcards = s.total_flashcards ?? s.flashcards_total ?? 0;
    s.total_quizzes = s.total_quizzes ?? s.qcms_total ?? 0;
    s.avg_score = s.avg_score ?? s.avg_quiz_score ?? 0;

    const totalLessons = ls.total;
    const doneLessons = ls.done;
    const lessonPct = totalLessons > 0 ? Math.round(doneLessons / totalLessons * 100) : 0;

    let html = `<div class="dash fade-in">

    <!-- ═══ Header ═══ -->
    <div class="dash-hero">
        <h1 class="page-title" style="font-size:28px">Swiss CPA — Hub de Révision</h1>
        <p class="dash-hero-sub">Règlement 2026 · Toutes les années · Diplôme fédéral d'expert-comptable</p>
    </div>

    <!-- ═══ Stats Overview ═══ -->
    <div class="dash-stats-row">
        <div class="dash-stat">
            <div class="dash-stat-num">${mods.length}</div>
            <div class="dash-stat-label">Modules</div>
            <div class="dash-stat-detail">M1 → M16</div>
        </div>
        <div class="dash-stat">
            <div class="dash-stat-num">${totalLessons}</div>
            <div class="dash-stat-label">Leçons</div>
            <div class="dash-stat-detail">${doneLessons} terminées · ${lessonPct}%</div>
        </div>
        <div class="dash-stat">
            <div class="dash-stat-num">${s.total_flashcards}</div>
            <div class="dash-stat-label">Flashcards</div>
            <div class="dash-stat-detail">4 catégories</div>
        </div>
        <div class="dash-stat">
            <div class="dash-stat-num">${normsList.length}</div>
            <div class="dash-stat-label">Normes</div>
            <div class="dash-stat-detail">IFRS + RPC</div>
        </div>
        <div class="dash-stat">
            <div class="dash-stat-num">${Math.round(s.avg_score || 0)}%</div>
            <div class="dash-stat-label">Score moyen</div>
            <div class="dash-stat-detail">${s.total_quizzes} quiz</div>
        </div>
    </div>

    <!-- ═══ Carte / Question du jour (AM4) ═══ -->
    <div class="dash-section" id="dashCardOfDay" style="margin-bottom:24px">
        <!-- Rendu async après fetch -->
    </div>

    <!-- ═══ Démarrage rapide ═══ -->
    <div class="dash-section">
        <div class="dash-section-title">🎯 Démarrage rapide</div>
        <div class="dash-quick-grid">
            <div class="dash-quick-card" onclick="navigate('modules')">
                <div class="dash-qc-icon" style="background:#1a365d">📘</div>
                <div class="dash-qc-text">
                    <div class="dash-qc-title">Normes IFRS & RPC</div>
                    <div class="dash-qc-desc">Fiches complètes, cross-refs, suivi norme par norme</div>
                </div>
            </div>
            <div class="dash-quick-card" onclick="navigate('flashcards')">
                <div class="dash-qc-icon" style="background:#553c9a">🃏</div>
                <div class="dash-qc-text">
                    <div class="dash-qc-title">Flashcards & Quiz</div>
                    <div class="dash-qc-desc">${s.total_flashcards} questions · Mode libre, quiz, ciblé, erreurs</div>
                </div>
            </div>
            <div class="dash-quick-card" onclick="navigate('references','cas')">
                <div class="dash-qc-icon" style="background:#78350f">🧮</div>
                <div class="dash-qc-text">
                    <div class="dash-qc-title">Cas chiffrés interactifs</div>
                    <div class="dash-qc-desc">15 exercices avec correction automatique</div>
                </div>
            </div>
            <div class="dash-quick-card" onclick="navigate('progress')">
                <div class="dash-qc-icon" style="background:#065f46">📊</div>
                <div class="dash-qc-text">
                    <div class="dash-qc-title">Statistiques & Suivi</div>
                    <div class="dash-qc-desc">Quiz history, sessions, progression par module</div>
                </div>
            </div>
        </div>
    </div>

    <!-- ═══ Flashcards par catégorie ═══ -->
    <div class="dash-section">
        <div class="dash-section-title">🃏 Flashcards par catégorie</div>
        <div class="dash-cat-grid">`;

    const catMap = {
        'Swiss GAAP RPC': { icon: '📘', gradient: 'linear-gradient(135deg, #1a365dee, #2b6cb0aa)' },
        'IFRS / IAS':     { icon: '📗', gradient: 'linear-gradient(135deg, #22543dee, #38a169aa)' },
        'Audit / ISA':    { icon: '📕', gradient: 'linear-gradient(135deg, #553c9aee, #805ad5aa)' },
        'Fiscalité':      { icon: '📙', gradient: 'linear-gradient(135deg, #9c4221ee, #dd6b20aa)' },
    };
    const defaultCats = [
        { category: 'Swiss GAAP RPC', total: 117, reviewed: 0, avg_pct: 0 },
        { category: 'IFRS / IAS', total: 104, reviewed: 0, avg_pct: 0 },
        { category: 'Audit / ISA', total: 52, reviewed: 0, avg_pct: 0 },
        { category: 'Fiscalité', total: 43, reviewed: 0, avg_pct: 0 },
    ];
    const cats = (s.categories && s.categories.length) ? s.categories : defaultCats;

    for (const cat of cats) {
        const cm = catMap[cat.category] || { icon: '📄', gradient: 'linear-gradient(135deg, #334155, #475569)' };
        const pct = Math.round(cat.avg_pct || 0);
        html += `
            <div class="stat-card" style="background:${cm.gradient};cursor:pointer" onclick="navigate('flashcards')">
                <div class="stat-label">${cm.icon} ${cat.category}</div>
                <div class="stat-value">${cat.total}</div>
                <div class="stat-sub">${cat.reviewed || 0} révisées · ${pct}%</div>
                <div class="stat-bar">
                    <div class="stat-bar-fill" style="width:${pct}%;background:#fff8"></div>
                </div>
            </div>`;
    }

    html += `</div></div>

    <!-- ═══ Références ═══ -->
    <div class="dash-section">
        <div class="dash-section-title">📚 Références & Outils</div>
        <div class="dash-ref-grid">
            <div class="dash-ref-card" onclick="navigate('references','courses')">
                <span class="dash-ref-icon">📚</span>
                <span>Cours IFRS & RPC</span>
            </div>
            <div class="dash-ref-card" onclick="navigate('references','glossary')">
                <span class="dash-ref-icon">🇬🇧</span>
                <span>Vocabulaire Anglais</span>
            </div>
            <div class="dash-ref-card" onclick="navigate('references','seuils')">
                <span class="dash-ref-icon">📐</span>
                <span>Seuils & Chiffres</span>
            </div>
            <div class="dash-ref-card" onclick="navigate('references','arbres')">
                <span class="dash-ref-icon">🌳</span>
                <span>Arbres de décision</span>
            </div>
            <div class="dash-ref-card" onclick="navigate('references','terrain')">
                <span class="dash-ref-icon">🏢</span>
                <span>Terrain EY</span>
            </div>
            <div class="dash-ref-card" onclick="navigate('references','cas')">
                <span class="dash-ref-icon">🧮</span>
                <span>Cas chiffrés</span>
            </div>
        </div>
    </div>

    <!-- ═══ Structure EXPERTsuisse ═══ -->
    <div class="dash-section">
        <div class="dash-section-title">📏 Structure officielle — Règlement 2026</div>`;

    // Year groups
    const yearGroups = [
        { year: 'Année 1', phase: 'Phase d\'introduction', codes: ['M1','M2','M3','M4','M5'], color: '#3b82f6', lessons: 212 },
        { year: 'Année 2', phase: 'Phase principale I', codes: ['M6','M7','M8','M9','M10','M11','M12'], color: '#22c55e', lessons: 214 },
        { year: 'Année 3', phase: 'Phase d\'application', codes: ['M13'], color: '#eab308', lessons: 0, note: 'Année de pratique professionnelle (1 200 heures)' },
        { year: 'Année 4', phase: 'Phase principale II', codes: ['M14','M15','M16'], color: '#f97316', lessons: 84 },
    ];

    for (const yg of yearGroups) {
        const yearMods = mods.filter(m => yg.codes.includes(m.code));

        html += `
        <div class="dash-year-block">
            <div class="dash-year-header" style="border-left:4px solid ${yg.color}">
                <span style="color:${yg.color};font-weight:800">${yg.year}</span>
                <span style="color:#94a3b8;font-size:13px"> · ${yg.phase}</span>
                ${yg.lessons > 0 ? `<span style="color:#64748b;font-size:12px;margin-left:auto">${yg.lessons} leçons</span>` : ''}
            </div>`;

        if (yg.note) {
            html += `<div style="padding:8px 16px;color:#94a3b8;font-size:13px;font-style:italic">${yg.note}</div>`;
        }

        if (yearMods.length > 0) {
            html += `<div class="dash-modules-grid">`;
            for (const m of yearMods) {
                const mc = getModuleColor(m.code);
                const pct = Math.round(m.progress_percent || 0);
                const modLessons = ls.by_module[`${m.code} - ${m.name}`] || ls.by_module[m.code] || { total: m.total_lessons || 0, done: 0 };
                const statusIcon = m.status === 'Done' ? '✅' : m.status === 'In progress' ? '🔄' : '⬜';

                html += `
                <div class="dash-mod-card" onclick="navigate('modules')" style="border-left:3px solid ${mc}">
                    <div class="dash-mod-top">
                        <span class="dash-mod-code" style="color:${mc}">${m.code}</span>
                        <span>${statusIcon}</span>
                    </div>
                    <div class="dash-mod-name">${escapeHtml(m.name)}</div>
                    <div class="dash-mod-info">
                        ${m.hours_async || 0}h async + ${m.hours_sync || 0}h sync · ${modLessons.total} leçons
                    </div>
                    <div class="progress-bar" style="margin-top:6px">
                        <div class="progress-fill" style="width:${pct}%;background:${mc}"></div>
                    </div>
                </div>`;
            }
            html += `</div>`;
        }
        html += `</div>`;
    }

    // Exigences
    html += `
        <div class="dash-exigences">
            <span>⏱️ <strong>1 200 h/an</strong> min. sur 4 ans</span>
            <span>📋 <strong>4 800 h</strong> totales</span>
            <span>📖 <strong>40 h/an</strong> formation continue</span>
        </div>
    </div>

    <!-- ═══ Sessions récentes ═══ -->
    <div class="dash-section">
        <div class="dash-section-title">📅 Sessions récentes
            <button class="btn btn-outline" style="float:right;padding:4px 12px;font-size:12px" onclick="navigate('progress')">Voir tout →</button>
        </div>`;

    if (sess.length === 0) {
        html += `<div class="card" style="padding:20px;text-align:center;color:#94a3b8">
            Aucune session. Lancez un quiz ou marquez une norme comme révisée !
        </div>`;
    } else {
        for (const r of sess) {
            const scorePct = Math.round(r.score_percent || 0);
            const scoreColor = scorePct >= 70 ? '#22c55e' : scorePct >= 50 ? '#eab308' : '#ef4444';
            html += `
            <div class="dash-session-row" onclick="navigate('progress')">
                <div>
                    <div class="dash-session-name">${escapeHtml(r.session_name || 'Session')}</div>
                    <div class="dash-session-meta">${r.date || ''} · ${r.duration_minutes || 0} min</div>
                </div>
                ${scorePct > 0 ? `<div class="dash-session-score" style="color:${scoreColor}">${scorePct}%</div>` : ''}
            </div>`;
        }
    }

    html += `</div>

    <!-- ═══ Footer tips ═══ -->
    <div class="dash-section">
        <div class="dash-section-title">💡 Comment utiliser ce Hub</div>
        <div class="dash-tips-grid">
            <div class="dash-tip">
                <div class="dash-tip-title">🌅 Quotidien (15-30 min)</div>
                <div class="dash-tip-text">Ouvre les <span class="cross-ref" onclick="navigate('flashcards')">Flashcards</span>, filtre par module, change le statut au fur et à mesure</div>
            </div>
            <div class="dash-tip">
                <div class="dash-tip-title">📆 Hebdomadaire</div>
                <div class="dash-tip-text">Ouvre les <span class="cross-ref" onclick="navigate('modules')">Normes</span>, focus sur les 🔴 non révisées, lance un quiz ciblé</div>
            </div>
            <div class="dash-tip">
                <div class="dash-tip-title">📊 Régularité</div>
                <div class="dash-tip-text">Consulte les <span class="cross-ref" onclick="navigate('progress')">Stats</span> pour voir ta progression et tes points faibles</div>
            </div>
        </div>
    </div>

    </div>`; // close dash

    container.innerHTML = html;

    // Lazy load "Carte du jour" (AM4)
    renderDashCardOfDay();
}

/**
 * Pick a deterministic "card of the day" — same seed per day.
 * Prefers 'difficile' and 'piège' cards for spaced exposure.
 */
async function renderDashCardOfDay() {
    const container = document.getElementById('dashCardOfDay');
    if (!container) return;

    try {
        const allCards = await api('get_flashcards');
        if (!allCards || allCards.length === 0) return;

        // Deterministic seed based on day of year
        const now = new Date();
        const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

        // Prefer challenging cards
        const challengingCards = allCards.filter(c => c.difficulty === 'difficile' || c.difficulty === 'piège');
        const pool = challengingCards.length > 10 ? challengingCards : allCards;

        const card = pool[dayOfYear % pool.length];
        if (!card) return;

        const catColor = (typeof getColor === 'function') ? getColor(card.category) : { bg: '#334155', accent: '#93c5fd' };
        const diffBadge = card.difficulty === 'piège' ? '⚠️ Piège' :
                          card.difficulty === 'difficile' ? '🔥 Difficile' :
                          card.difficulty === 'moyen' ? 'Moyen' : 'Facile';

        container.innerHTML = `
            <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:1px solid #475569;border-radius:14px;padding:20px 24px;position:relative">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:8px">
                    <div>
                        <div style="font-size:11px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">
                            💡 Question du jour
                        </div>
                        <div style="font-size:12px;color:#94a3b8">
                            <span style="background:${catColor.bg};color:${catColor.accent};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${escapeHtml(card.category)}</span>
                            <span style="margin-left:8px">• ${escapeHtml(card.subcategory || '')}</span>
                            <span style="margin-left:8px">• ${diffBadge}</span>
                        </div>
                    </div>
                    <button onclick="dashCardReveal(${card.id})" id="dashCardRevealBtn"
                        style="background:#10b981;color:white;border:none;padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">
                        Révéler la réponse →
                    </button>
                </div>
                <div style="font-size:15px;color:#f1f5f9;line-height:1.5;font-weight:500">
                    ${formatInline(card.question)}
                </div>
                <div id="dashCardAnswer" style="display:none;margin-top:16px;padding-top:16px;border-top:1px solid #334155">
                    <div style="font-size:13px;color:#cbd5e1;line-height:1.6;white-space:pre-wrap">${formatAnswer(card.answer)}</div>
                </div>
            </div>
        `;
        // Store the answer for reveal
        window._dashCardOfDay = card;
    } catch (e) {
        console.error('dash card of day:', e);
    }
}

function dashCardReveal(cardId) {
    const ans = document.getElementById('dashCardAnswer');
    const btn = document.getElementById('dashCardRevealBtn');
    if (ans) ans.style.display = 'block';
    if (btn) btn.style.display = 'none';
}
