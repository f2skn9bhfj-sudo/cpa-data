/* ═══════════════════════════════════════════════
   Accueil — HUB de navigation (zéro statistique).
   Une porte d'entrée : question du jour + grandes
   cartes vers chaque espace de l'app.
   ═══════════════════════════════════════════════ */

const HUB_SECTIONS = [
    {
        title: '🎓 Étudier',
        cards: [
            { tab: 'modules', ic: '📚', t: 'Modules', d: 'Les 16 modules du diplôme : cours, normes CO / RPC / IFRS, leçons et fiches.' },
            { tab: 'audit', ic: '🔍', t: 'Audit', d: "NAS/ISA, catalogue des tests, journée d'auditeur, Nestlé, journal client…" },
            { tab: 'conso', ic: '📊', t: 'Conso', d: 'Consolidation, IFRS et Swiss GAAP pas à pas, avec fil rouge chiffré.' },
            { tab: 'social', ic: '🤝', t: 'Social', d: 'Droit du travail, assurances sociales et paie suisse (calculateur inclus).' },
            { tab: 'hec', ic: '🎓', t: 'HEC', d: 'Structure financière, M&A et ingénierie du capital.' },
            { tab: 'english', ic: '🇬🇧', t: 'Anglais', d: 'Vocabulaire, meetings, TOEIC — prêt pour EY.' },
            { tab: 'eymanual', ic: '📕', t: 'Manuel EY', d: "Le field manual Staff 1 : réflexes terrain pour tes débuts chez EY." },
        ],
    },
    {
        title: "🎯 S'entraîner",
        cards: [
            { tab: 'trainer', ic: '🎯', t: 'Entraînement', d: 'Sessions de révision espacée sur tes normes et cartes.' },
            { tab: 'qcm', ic: '❓', t: 'QCM', d: 'Questionnaires corrigés, par module et par norme.' },
            { tab: 'fcdb', ic: '🃏', t: 'Flashcards', d: 'Cartes recto-verso : mode libre, ciblé ou reprise des erreurs.' },
            { tab: 'oral', ic: '🎤', t: 'Oral', d: "Préparation à l'examen oral, thème par thème." },
        ],
    },
    {
        title: '🧰 Outils & références',
        cards: [
            { tab: 'recherche', ic: '🔎', t: 'Recherche', d: "Trouve n'importe quoi dans toute l'app — avec l'IA en option." },
            { tab: 'references', ic: '📖', t: 'Références', d: 'Mémos, seuils, cas chiffrés, arbres de décision, terrain.' },
            { tab: 'compare', ic: '⚖️', t: 'Comparaisons', d: 'CO vs Swiss GAAP RPC vs IFRS, thème par thème.' },
            { tab: 'fs', ic: '📑', t: 'États financiers', d: 'Explorateur des états et de leurs postes.' },
            { tab: 'podcasts', ic: '🎧', t: 'Podcasts', d: 'Les cours en audio, à écouter en déplacement.' },
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
        <div class="hub-qod" id="dashCardOfDay"></div>
        ${HUB_SECTIONS.map(sec => `
        <div class="hub-sec">
            <div class="hub-sec-h">${sec.title}</div>
            <div class="hub-grid">
                ${sec.cards.map(c => `
                <div class="hub-card" role="button" tabindex="0" onclick="navigate('${c.tab}')"
                     onkeydown="if(event.key==='Enter')navigate('${c.tab}')">
                    <div class="hub-ic">${c.ic}</div>
                    <div><div class="hub-t">${c.t}</div><div class="hub-d">${c.d}</div></div>
                </div>`).join('')}
            </div>
        </div>`).join('')}
    </div>`;
    renderDashCardOfDay();
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
