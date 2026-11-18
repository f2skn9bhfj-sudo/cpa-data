/* ═══════════════════════════════════════════════
   Accueil — HUB de navigation.
   Une porte d'entrée : plan du jour (3 actions, objectif,
   série 🔥), question du jour + grandes cartes vers
   chaque espace de l'app.
   ═══════════════════════════════════════════════ */

// Mêmes rubriques, même ordre et mêmes noms que la barre de navigation
// (NAV_GROUPS / TAB_META dans js/app.js). Le titre et l'icône d'une carte
// viennent de TAB_META ; seule la description est propre à l'accueil.
// Manuel EY et Grand Livre masqués (voir HIDDEN_TABS dans js/app.js).
const HUB_SECTIONS = [
    {
        title: '📚 Cours',
        cards: [
            { tab: 'modules', d: 'Les 16 modules du diplôme : cours, normes CO / RPC / IFRS, leçons et fiches.' },
            { tab: 'audit', d: "NAS/ISA, Manuel suisse d'audit, cycles, fraude, Nestlé, seuils…" },
            // Masqué (HIDDEN_TABS) : { tab: 'grandlivre', d: 'La comptabilité suisse de A à Z : écritures, TVA, bouclement, cas.' },
            { tab: 'conso', d: 'Consolidation IFRS et Swiss GAAP pas à pas, avec fil rouge chiffré.' },
            { tab: 'fusion', d: "Fusions, apports partiels d'actif et scissions : parité, prime, mali, écritures." },
            { tab: 'social', d: 'Droit du travail, assurances sociales et paie suisse (calculateur inclus).' },
            { tab: 'hec', d: 'Structure financière, M&A et ingénierie du capital.' },
            { tab: 'english', d: 'Vocabulaire, meetings, TOEIC — prêt pour EY.' },
            { tab: 'podcasts', d: 'Les cours en audio, à écouter en déplacement.' },
        ],
    },
    {
        title: "🎯 S'entraîner",
        cards: [
            { tab: 'trainer', d: 'Sprints de flashcards en répétition espacée (SM-2) et cours guidés.' },
            { tab: 'qcm', d: '3 762 questions corrigées sur les 16 modules, examen blanc noté sur 6.' },
            { tab: 'fcdb', d: 'Toutes les cartes, filtrables ; révise une sélection en un clic.' },
            { tab: 'oral', d: "Préparation à l'examen oral, thème par thème, avec simulateur." },
            { tab: 'progress', d: 'Ta progression par module : normes revues, QCM, cartes.' },
        ],
    },
    {
        title: '🧰 Ressources',
        cards: [
            { tab: 'references', d: 'Mémos, seuils, cas chiffrés, arbres de décision, restructurations.' },
            { tab: 'compare', d: 'CO vs Swiss GAAP RPC vs IFRS, thème par thème.' },
            { tab: 'fs', d: 'Explorateur des états financiers et de leurs postes.' },
            { tab: 'recherche', d: "Trouve n'importe quoi dans toute l'app — avec l'IA en option." },
        ],
    },
];

async function renderDashboard(container) {
    container.innerHTML = `
    <style>
    .hub { max-width: 1080px; margin: 0 auto; padding: 8px 4px 48px; }
    .hub-hero { text-align: center; padding: 26px 10px 8px; }
    .hub-title { font-size: 30px; font-weight: 800; letter-spacing: -0.02em; color: #e2e8f0; margin: 0 0 6px; }
    .hub-sub { font-size: 14px; color: #94a3b8; margin: 0 0 20px; }
    .hub-search { display: flex; align-items: center; gap: 10px; max-width: 640px; margin: 0 auto 8px; cursor: pointer;
        background: #1e293b; border: 2px solid #334155; border-radius: 16px; padding: 14px 20px; color: #64748b;
        font-size: 15px; text-align: left; transition: border-color .15s, box-shadow .15s; }
    .hub-search:hover { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99,102,241,.12); }
    .hub-qod { max-width: 780px; margin: 22px auto 6px; }
    .hub-sec { margin-top: 30px; }
    .hub-sec-h { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #64748b;
        margin: 0 0 12px; display: flex; align-items: center; gap: 10px; }
    .hub-sec-h::after { content: ''; flex: 1; height: 1px; background: #334155; }
    .hub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
    .hub-card { display: flex; gap: 14px; align-items: flex-start; background: #1e293b; border: 1px solid #334155;
        border-radius: 16px; padding: 16px; cursor: pointer; transition: border-color .15s, transform .12s, background .15s; }
    .hub-card:hover { border-color: #6366f1; transform: translateY(-2px); }
    .hub-ic { flex: 0 0 auto; width: 44px; height: 44px; border-radius: 13px; display: flex; align-items: center;
        justify-content: center; font-size: 22px; background: rgba(99,102,241,.12); border: 1px solid rgba(99,102,241,.25); }
    .hub-t { font-size: 15.5px; font-weight: 700; color: #e2e8f0; margin-bottom: 3px; display: flex; align-items: center; gap: 6px; }
    .hub-t::after { content: '→'; font-size: 13px; color: #64748b; opacity: 0; transition: opacity .15s, transform .15s; }
    .hub-card:hover .hub-t::after { opacity: 1; transform: translateX(2px); }
    .hub-d { font-size: 12.5px; color: #94a3b8; line-height: 1.5; }
    .hub-qod-card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 18px 22px; }
    .hub-qod-k { font-size: 11px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
    .hub-qod-q { font-size: 15px; color: #e2e8f0; line-height: 1.55; font-weight: 500; }
    .hub-qod-meta { font-size: 12px; color: #94a3b8; margin-bottom: 10px; }
    .hub-qod-btn { background: #10b981; color: #fff; border: none; padding: 8px 15px; border-radius: 9px; cursor: pointer; font-size: 12.5px; font-weight: 700; }
    .hub-qod-btn:hover { background: #059669; }
    .hub-qod-a { display: none; margin-top: 14px; padding-top: 14px; border-top: 1px solid #334155; font-size: 13.5px; color: #cbd5e1; line-height: 1.65; white-space: pre-wrap; }
    body.light-mode .hub-title { color: #0f172a; }
    body.light-mode .hub-search { background: #fff; border-color: #e2e8f0; color: #94a3b8; }
    body.light-mode .hub-sec-h::after { background: #e2e8f0; }
    body.light-mode .hub-card { background: #fff; border-color: #e2e8f0; }
    body.light-mode .hub-card:hover { background: #fafbff; }
    body.light-mode .hub-ic { background: #eef2ff; border-color: #e0e7ff; }
    body.light-mode .hub-t { color: #0f172a; }
    body.light-mode .hub-d { color: #64748b; }
    body.light-mode .hub-qod-card { background: #fff; border-color: #e2e8f0; }
    body.light-mode .hub-qod-q { color: #1e293b; }
    body.light-mode .hub-qod-a { color: #334155; border-color: #e2e8f0; }
    .hub-plan { max-width: 780px; margin: 22px auto 0; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 16px 18px 14px; }
    .hub-plan-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
    .hub-plan-k { font-size: 11px; font-weight: 800; color: #818cf8; text-transform: uppercase; letter-spacing: .08em; }
    .hub-plan-goal { font-size: 15px; font-weight: 700; color: #e2e8f0; margin-top: 3px; }
    .hub-plan-streak { flex: 0 0 auto; text-align: center; background: rgba(245,158,11,.12); border: 1px solid rgba(245,158,11,.35);
        color: #fbbf24; border-radius: 12px; padding: 6px 12px; font-size: 13px; font-weight: 700; line-height: 1.2; }
    .hub-plan-streak b { font-size: 18px; }
    .hub-plan-streak small { display: block; font-size: 10.5px; font-weight: 600; color: #d6a14a; }
    .hub-plan-bar { height: 8px; background: #0f172a; border-radius: 99px; overflow: hidden; margin: 10px 0 8px; }
    .hub-plan-bar > div { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #6366f1, #10b981); transition: width .4s; }
    .hub-plan-week { display: flex; gap: 6px; align-items: center; font-size: 10.5px; color: #64748b; margin-bottom: 12px; }
    .hub-plan-day { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .hub-plan-dot { width: 12px; height: 12px; border-radius: 50%; background: #334155; }
    .hub-plan-dot.on { background: #6366f1; }
    .hub-plan-dot.goal { background: #10b981; }
    .hub-plan-day.today .hub-plan-dot { box-shadow: 0 0 0 2px #0f172a, 0 0 0 3.5px #94a3b8; }
    .hub-plan-items { display: grid; gap: 8px; }
    .hub-plan-it { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; cursor: pointer; font: inherit;
        background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 11px 13px; color: inherit; transition: border-color .15s, transform .12s; }
    .hub-plan-it:hover { border-color: #6366f1; transform: translateX(2px); }
    .hub-plan-ic { flex: 0 0 auto; font-size: 22px; width: 30px; text-align: center; }
    .hub-plan-txt { flex: 1; min-width: 0; }
    .hub-plan-t { font-size: 14px; font-weight: 700; color: #e2e8f0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .hub-plan-s { font-size: 12px; color: #94a3b8; margin-top: 1px; }
    .hub-plan-done { flex: 0 0 auto; font-size: 11.5px; font-weight: 700; color: #10b981; background: rgba(16,185,129,.12);
        border-radius: 99px; padding: 3px 8px; white-space: nowrap; }
    .hub-plan-go { flex: 0 0 auto; color: #64748b; font-size: 16px; }
    .hub-plan-foot { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 10px; font-size: 11.5px; color: #64748b; }
    .hub-plan-g { background: none; border: 1px solid #334155; color: #94a3b8; border-radius: 99px; padding: 2px 9px; font-size: 11.5px; cursor: pointer; }
    .hub-plan-g.on { background: #6366f1; border-color: #6366f1; color: #fff; }
    body.light-mode .hub-plan { background: #fff; border-color: #e2e8f0; }
    body.light-mode .hub-plan-k { color: #4f46e5; }
    body.light-mode .hub-plan-goal, body.light-mode .hub-plan-t { color: #0f172a; }
    body.light-mode .hub-plan-s { color: #64748b; }
    body.light-mode .hub-plan-bar { background: #e2e8f0; }
    body.light-mode .hub-plan-dot { background: #e2e8f0; }
    body.light-mode .hub-plan-dot.on { background: #818cf8; }
    body.light-mode .hub-plan-dot.goal { background: #10b981; }
    body.light-mode .hub-plan-day.today .hub-plan-dot { box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px #64748b; }
    body.light-mode .hub-plan-it { background: #f8fafc; border-color: #e2e8f0; }
    body.light-mode .hub-plan-it:hover { border-color: #6366f1; background: #fafbff; }
    body.light-mode .hub-plan-streak { background: #fffbeb; border-color: #fcd34d; color: #b45309; }
    body.light-mode .hub-plan-streak small { color: #b45309; }
    body.light-mode .hub-plan-g { border-color: #cbd5e1; color: #475569; }
    body.light-mode .hub-plan-g.on { color: #fff; border-color: #6366f1; }
    @media (max-width: 768px) {
        .hub-hero { padding: 12px 4px 0; }
        .hub-title { font-size: 22px; }
        .hub-sub { font-size: 12.5px; margin-bottom: 12px; }
        .hub-search { padding: 11px 14px; font-size: 14px; border-radius: 13px; }
        .hub-plan-done-l { display: none; }
        .hub-plan { margin-top: 16px; padding: 14px 13px 12px; }
        .hub-plan-goal { font-size: 14px; }
        .hub-plan-it { padding: 10px 11px; gap: 10px; }
        .hub-plan-t { white-space: normal; }
    }
    </style>
    <div class="hub fade-in">
        <div class="hub-hero">
            <h1 class="hub-title">Swiss CPA — Hub de révision</h1>
            <p class="hub-sub">Diplôme fédéral d'expert-comptable · Règlement 2026</p>
            <div class="hub-search" role="button" tabindex="0" onclick="navigate('recherche')"
                 onkeydown="if(event.key==='Enter')navigate('recherche')">
                <span>🔎</span><span>Rechercher un cours, une norme, un seuil, un mot…</span>
            </div>
        </div>
        <div id="dashPlan"></div>
        <div class="hub-qod" id="dashCardOfDay"></div>
        ${HUB_SECTIONS.map(sec => `
        <div class="hub-sec">
            <div class="hub-sec-h">${sec.title}</div>
            <div class="hub-grid">
                ${sec.cards.map(c => `
                <div class="hub-card" role="button" tabindex="0" onclick="navigate('${c.tab}')"
                     onkeydown="if(event.key==='Enter')navigate('${c.tab}')">
                    <div class="hub-ic">${c.ic || (TAB_META[c.tab] || {}).ic || ''}</div>
                    <div><div class="hub-t">${c.t || (TAB_META[c.tab] || {}).label || c.tab}</div><div class="hub-d">${c.d}</div></div>
                </div>`).join('')}
            </div>
        </div>`).join('')}
    </div>`;
    renderDashPlan();
    renderDashCardOfDay();
}

/* ── Plan du jour : 3 actions concrètes, objectif quotidien, série 🔥 ──
   Journal d'activité : window.swisscpaDaily (api-client-static.js) — alimenté par
   les flashcards notées, les QCM répondus et les étapes / questions des leçons. */
async function renderDashPlan() {
    const el = document.getElementById('dashPlan');
    if (!el || !window.swisscpaDaily) return;
    const D = window.swisscpaDaily;
    let fcStats = {}, qt = {};
    try { [fcStats, qt] = await Promise.all([api('get_review_stats'), api('get_qcm_tracking_data')]); } catch (e) { /* données partielles */ }
    fcStats = fcStats || {}; qt = qt || {};
    if (!document.getElementById('dashPlan')) return;   // page quittée entre-temps

    const all = D.all();
    const today = all[D.dayKey()] || {};
    const goal = D.goal();
    const done = (today.fc || 0) + (today.q || 0) + (today.l || 0);
    const pct = Math.min(100, Math.round(done / goal * 100));
    const streak = D.streak();

    // 7 derniers jours
    const week = [];
    const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - 6);
    for (let i = 0; i < 7; i++) {
        const t = D.total(all[D.dayKey(d)]);
        week.push({ l: 'DLMMJVS'[d.getDay()], on: t > 0, goal: t >= goal, today: i === 6 });
        d.setDate(d.getDate() + 1);
    }

    // 1) Flashcards
    const due = fcStats.due || 0, fresh = fcStats.never_seen || 0;
    const fcItem = due > 0
        ? { ic: '🃏', t: `${Math.min(due, 20)} carte${Math.min(due, 20) > 1 ? 's' : ''} à revoir`, s: `${due} en retard · répétition espacée`, n: today.fc }
        : { ic: '🃏', t: '10 nouvelles cartes', s: fresh ? 'Aucune carte en retard 👌 — découvre-en de nouvelles' : 'Toutes les cartes sont vues : révision libre', n: today.fc };
    fcItem.go = 'dashPlanCards()';

    // 2) Leçon à continuer (mode ludique des Modules)
    let last = null, read = {};
    try { last = JSON.parse(localStorage.getItem('swisscpa_mod_last') || 'null'); } catch (e) {}
    try { read = JSON.parse(localStorage.getItem('swisscpa_mod_read') || '{}') || {}; } catch (e) {}
    let lsItem;
    if (last && last.lid) {
        const r = read[last.lid] || {};
        const k = (r.s || []).length;
        if (!r.done) {
            lsItem = { t: `Continuer : ${last.title}`, s: `${last.mcode} · ${k}/${last.n} étapes${last.min ? ` · ~${last.min} min` : ''}`,
                go: `modOpenLessonAt(${JSON.stringify(last.mid)}, ${JSON.stringify(last.lid)})` };
        } else if (last.next) {
            lsItem = { t: `Leçon suivante : ${last.next.title}`, s: `${last.mcode} · « ${last.title} » terminée ✓`,
                go: `modOpenLessonAt(${JSON.stringify(last.mid)}, ${JSON.stringify(last.next.lid)})` };
        }
    }
    if (!lsItem) lsItem = { t: 'Commencer une leçon', s: '16 modules en mode ludique : étapes, questions flash, trophée', go: "navigate('modules')" };
    lsItem.ic = '📖'; lsItem.n = today.l;

    // 3) QCM
    const stats = qt.stats || {};
    const dueQ = (qt.due_ids || []).length;
    const weak = Object.values(stats).filter(x => x && x.attempts >= 2 && x.accuracy < 60).length;
    const qItem = dueQ > 0 ? { t: '10 QCM à revoir', s: `${dueQ} question${dueQ > 1 ? 's' : ''} arrivée${dueQ > 1 ? 's' : ''} à échéance` }
        : weak > 0 ? { t: '10 QCM — points faibles', s: `${weak} question${weak > 1 ? 's' : ''} sous 60 % de réussite` }
        : { t: "10 QCM pour t'échauffer", s: 'Tirés au hasard dans les 16 modules' };
    Object.assign(qItem, { ic: '🎯', n: today.q, go: 'qcmPlanStart(10)' });

    const esc = (x) => escapeHtml(String(x == null ? '' : x));
    // escapeHtml n'échappe pas les guillemets : attribut onclick échappé à part.
    const attr = (x) => String(x).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const item = (it) => `
        <button class="hub-plan-it" onclick="${attr(it.go)}">
            <span class="hub-plan-ic">${it.ic}</span>
            <span class="hub-plan-txt"><div class="hub-plan-t">${esc(it.t)}</div><div class="hub-plan-s">${esc(it.s)}</div></span>
            ${it.n ? `<span class="hub-plan-done" title="${it.n} aujourd'hui">✓ ${it.n}<span class="hub-plan-done-l"> aujourd'hui</span></span>` : ''}
            <span class="hub-plan-go">›</span>
        </button>`;

    el.innerHTML = `
    <div class="hub-plan">
        <div class="hub-plan-head">
            <div>
                <div class="hub-plan-k">🗓️ Plan du jour</div>
                <div class="hub-plan-goal">${done >= goal ? '🎉 Objectif atteint' : 'Objectif'} : ${done} / ${goal} actions</div>
            </div>
            <div class="hub-plan-streak" title="Jours d'affilée avec au moins une carte, un QCM ou une étape de leçon">
                🔥 <b>${streak}</b><small>${streak > 1 ? 'jours de suite' : (streak === 1 ? 'jour' : 'lance ta série')}</small>
            </div>
        </div>
        <div class="hub-plan-bar"><div style="width:${pct}%"></div></div>
        <div class="hub-plan-week" title="7 derniers jours : violet = actif, vert = objectif atteint">
            ${week.map(w => `<div class="hub-plan-day${w.today ? ' today' : ''}"><span class="hub-plan-dot${w.goal ? ' goal' : (w.on ? ' on' : '')}"></span>${w.l}</div>`).join('')}
        </div>
        <div class="hub-plan-items">${[fcItem, lsItem, qItem].map(item).join('')}</div>
        <div class="hub-plan-foot">Objectif quotidien :
            ${[15, 30, 50].map(g => `<button class="hub-plan-g${g === goal ? ' on' : ''}" onclick="dashPlanGoal(${g})">${g}</button>`).join('')}
            <span>· carte notée, QCM répondu ou étape de leçon = 1 action</span>
        </div>
    </div>`;
}

function dashPlanGoal(g) {
    if (window.swisscpaDaily) swisscpaDaily.setGoal(g);
    renderDashPlan();
}

// Sprint de flashcards : cartes en retard (les plus anciennes d'abord), sinon 10 nouvelles.
async function dashPlanCards() {
    let ids = [];
    try {
        const cards = await api('get_flashcards') || [];
        const now = Date.now();
        const due = cards.filter(c => c.next_review && new Date(c.next_review).getTime() <= now)
            .sort((a, b) => new Date(a.next_review) - new Date(b.next_review));
        ids = due.slice(0, 20).map(c => c.id);
        if (!ids.length) {
            const fresh = cards.filter(c => !(c.review_count > 0));
            const pool = fresh.length ? fresh : cards;
            for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
            ids = pool.slice(0, 10).map(c => c.id);
        }
    } catch (e) { console.error('dashPlanCards:', e); }
    try {
        sessionStorage.setItem('fcdbReviewIds', JSON.stringify(ids));
        sessionStorage.setItem('fcdbReviewLabel', 'Plan du jour');
    } catch (e) {}
    navigate('trainer');
}

/* ── Question du jour (pédagogique — pas une statistique) ── */
async function renderDashCardOfDay() {
    const container = document.getElementById('dashCardOfDay');
    if (!container) return;

    try {
        const allCards = await api('get_flashcards');
        if (!allCards || allCards.length === 0) return;

        // Graine déterministe : jour de l'année
        const now = new Date();
        const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

        const challengingCards = allCards.filter(c => c.difficulty === 'difficile' || c.difficulty === 'piège');
        const pool = challengingCards.length > 10 ? challengingCards : allCards;
        const card = pool[dayOfYear % pool.length];
        if (!card) return;

        const catColor = (typeof getColor === 'function') ? getColor(card.category) : { bg: '#334155', accent: '#93c5fd' };
        const diffBadge = card.difficulty === 'piège' ? '⚠️ Piège' :
                          card.difficulty === 'difficile' ? '🔥 Difficile' :
                          card.difficulty === 'moyen' ? 'Moyen' : 'Facile';

        container.innerHTML = `
            <div class="hub-qod-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
                    <div>
                        <div class="hub-qod-k">💡 Question du jour</div>
                        <div class="hub-qod-meta">
                            <span style="background:${catColor.bg};color:${catColor.accent};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${escapeHtml(card.category)}</span>
                            <span style="margin-left:8px">• ${escapeHtml(card.subcategory || '')}</span>
                            <span style="margin-left:8px">• ${diffBadge}</span>
                        </div>
                    </div>
                    <button onclick="dashCardReveal(${card.id})" id="dashCardRevealBtn" class="hub-qod-btn">Révéler la réponse →</button>
                </div>
                <div class="hub-qod-q">${formatInline(card.question)}</div>
                <div id="dashCardAnswer" class="hub-qod-a">${formatAnswer(card.answer)}</div>
            </div>
        `;
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
