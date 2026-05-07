/* ═══════════════════════════════════════════════
   Mode Rappel Libre (Free Recall)
   Écrire sa réponse → auto-check par mots-clés
   ═══════════════════════════════════════════════ */

let recallState = {
    cards: [],
    current: 0,
    results: [],   // {cardId, userAnswer, keywordsFound, keywordsTotal, score}
    userAnswer: '',
    revealed: false,
};

/**
 * Launch free recall mode with optional category filter.
 */
async function startFreeRecall(category = null) {
    const filters = category ? { category } : {};
    const allCards = await api('get_flashcards', category || null);
    if (!allCards || allCards.length < 5) {
        alert('Pas assez de cartes pour lancer le rappel libre (min 5).');
        return;
    }

    // Shuffle and take up to 15 cards
    const shuffled = [...allCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    recallState = {
        cards: shuffled.slice(0, 15),
        current: 0,
        results: [],
        userAnswer: '',
        revealed: false,
    };
    renderFreeRecall();
}

/**
 * Extract keywords from an answer (simple tokenizer).
 */
function extractKeywords(text) {
    if (!text) return [];
    // Strip markdown markers, emojis, punctuation
    const cleaned = text
        .replace(/\*\*/g, '')
        .replace(/[⚠️🔸🔹📌]/g, '')
        .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, '')
        .toLowerCase();
    // Words 4+ chars, excluding stop words
    const stopwords = new Set([
        'dans', 'pour', 'avec', 'sans', 'leur', 'leurs', 'cette', 'cette', 'être', 'avoir',
        'elle', 'elles', 'mais', 'donc', 'alors', 'ainsi', 'sont', 'sera', 'était', 'était',
        'cette', 'entre', 'plus', 'moins', 'très', 'aussi', 'bien', 'ceux', 'celle', 'celles',
        'tout', 'tous', 'toute', 'toutes', 'autre', 'autres', 'même', 'peut', 'doivent',
        'selon', 'après', 'avant', 'sous', 'pendant', 'depuis', 'vers',
    ]);
    const words = cleaned.match(/[a-zàâäéèêëïîôöùûüç0-9]{4,}/gi) || [];
    const unique = [...new Set(words.map(w => w.toLowerCase()))];
    return unique.filter(w => !stopwords.has(w));
}

/**
 * Score the user's answer against the reference answer.
 * Returns { score: 0-100, found: [], missed: [], keywords: [] }
 */
function scoreFreeRecall(userAnswer, reference) {
    const refKeywords = extractKeywords(reference);
    const userKeywords = new Set(extractKeywords(userAnswer));

    // Consider top-N most specific keywords (limit to 15 for scoring)
    const keyKeywords = refKeywords.slice(0, 15);
    if (keyKeywords.length === 0) {
        return { score: 0, found: [], missed: [], keywords: [] };
    }

    const found = keyKeywords.filter(k => userKeywords.has(k));
    const missed = keyKeywords.filter(k => !userKeywords.has(k));
    const score = Math.round((found.length / keyKeywords.length) * 100);

    return { score, found, missed, keywords: keyKeywords };
}

function renderFreeRecall() {
    const main = document.getElementById('mainContent') || document.getElementById('main');
    if (!main) return;
    const s = recallState;

    if (s.current >= s.cards.length) {
        // Summary
        const totalScore = s.results.reduce((sum, r) => sum + r.score, 0);
        const avg = s.results.length > 0 ? Math.round(totalScore / s.results.length) : 0;
        main.innerHTML = `
            <div style="max-width:700px;margin:40px auto;padding:40px 20px;text-align:center">
                <div style="font-size:56px;margin-bottom:16px">${avg >= 70 ? '🎉' : avg >= 50 ? '👍' : '📚'}</div>
                <div style="font-size:24px;font-weight:800;color:var(--text-primary);margin-bottom:8px">Rappel libre terminé</div>
                <div style="font-size:16px;color:var(--text-secondary);margin-bottom:24px">
                    Score moyen : <strong style="color:${avg >= 70 ? '#10b981' : avg >= 50 ? '#f59e0b' : '#ef4444'}">${avg}%</strong>
                    • ${s.results.length} cartes parcourues
                </div>
                <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
                    <button onclick="startFreeRecall()" style="background:#064e3b;color:#6ee7b7;border:1px solid #10b981;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">
                        🔄 Rejouer
                    </button>
                    <button onclick="navigate('flashcards')" style="background:transparent;color:var(--text-secondary);border:1px solid var(--border);padding:10px 18px;border-radius:8px;cursor:pointer;font-size:13px">
                        ← Retour flashcards
                    </button>
                </div>
            </div>
        `;
        return;
    }

    const card = s.cards[s.current];
    const progress = ((s.current + 1) / s.cards.length) * 100;
    const catColor = (typeof getColor === 'function') ? getColor(card.category) : { bg: '#334155', accent: '#93c5fd' };

    main.innerHTML = `
        <div style="max-width:800px;margin:0 auto;padding:8px 0 40px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                <button onclick="navigate('flashcards')" style="background:transparent;color:var(--text-secondary);border:1px solid var(--border);padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px">← Quitter</button>
                <div style="flex:1">
                    <div style="font-size:14px;font-weight:700;color:var(--text-primary)">✍️ Rappel libre</div>
                    <div style="font-size:12px;color:var(--text-muted)">${s.current + 1} / ${s.cards.length} • Écris ta réponse, l'app vérifie les mots-clés</div>
                </div>
            </div>

            <div class="progress-bar" style="margin-bottom:16px">
                <div class="progress-fill" style="width:${progress}%"></div>
            </div>

            <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;gap:8px">
                    <div>
                        <span style="background:${catColor.bg};color:${catColor.accent};padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700">${escapeHtml(card.category)}</span>
                        <span style="font-size:11px;color:var(--text-muted);margin-left:8px">${escapeHtml(card.subcategory || '')}</span>
                    </div>
                </div>
                <div style="font-size:16px;color:var(--text-bright);line-height:1.5;font-weight:500;margin-top:12px">
                    ${formatInline(card.question)}
                </div>
            </div>

            <div style="background:var(--bg-tertiary);border:1px solid var(--border);border-radius:12px;padding:16px">
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">✍️ Écris ta réponse (un max de mots-clés) :</div>
                <textarea id="recallTextarea" rows="6"
                    placeholder="Ex: obligation actuelle, sortie probable, estimation fiable..."
                    style="width:100%;padding:12px;background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-size:14px;font-family:inherit;resize:vertical;outline:none"
                    ${s.revealed ? 'readonly' : ''}>${escapeHtml(s.userAnswer)}</textarea>

                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap">
                    ${!s.revealed ? `
                        <button onclick="recallReveal()" style="background:#10b981;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">
                            ✓ Vérifier ma réponse
                        </button>
                    ` : `
                        <button onclick="recallNext()" style="background:#3b82f6;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">
                            Suivant →
                        </button>
                    `}
                </div>
            </div>

            <div id="recallFeedback" style="margin-top:16px"></div>
        </div>
    `;

    // Focus textarea for quick typing
    if (!s.revealed) {
        const ta = document.getElementById('recallTextarea');
        if (ta) setTimeout(() => ta.focus(), 100);
    }
}

async function recallReveal() {
    const ta = document.getElementById('recallTextarea');
    if (!ta) return;
    recallState.userAnswer = ta.value;
    recallState.revealed = true;

    const card = recallState.cards[recallState.current];
    const result = scoreFreeRecall(recallState.userAnswer, card.answer);

    recallState.results.push({
        cardId: card.id,
        userAnswer: recallState.userAnswer,
        keywordsFound: result.found.length,
        keywordsTotal: result.keywords.length,
        score: result.score,
    });

    // Update SM-2 rating based on score (mapping: 0-30 Again, 31-55 Hard, 56-79 Good, 80+ Easy)
    let rating;
    if (result.score < 30) rating = 0;
    else if (result.score < 55) rating = 1;
    else if (result.score < 80) rating = 2;
    else rating = 3;
    try { await api('update_flashcard', card.id, null, rating); } catch (e) { /* non-blocking */ }

    // Show feedback
    const fb = document.getElementById('recallFeedback');
    if (fb) {
        const scoreColor = result.score >= 70 ? '#10b981' : result.score >= 40 ? '#f59e0b' : '#ef4444';
        const foundHtml = result.found.map(k => `<span style="background:#064e3b;color:#6ee7b7;padding:2px 8px;border-radius:10px;font-size:11px;margin:2px 2px;display:inline-block">${escapeHtml(k)}</span>`).join(' ');
        const missedHtml = result.missed.map(k => `<span style="background:#3f1212;color:#fca5a5;padding:2px 8px;border-radius:10px;font-size:11px;margin:2px 2px;display:inline-block">${escapeHtml(k)}</span>`).join(' ');

        fb.innerHTML = `
            <div style="background:var(--bg-secondary);border:1px solid ${scoreColor};border-radius:12px;padding:16px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
                    <div style="font-size:16px;font-weight:700;color:${scoreColor}">
                        Score : ${result.score}% (${result.found.length}/${result.keywords.length} mots-clés)
                    </div>
                    <div style="font-size:11px;color:var(--text-muted)">
                        SM-2 mis à jour (${rating === 0 ? 'Again' : rating === 1 ? 'Hard' : rating === 2 ? 'Good' : 'Easy'})
                    </div>
                </div>

                ${foundHtml ? `<div style="margin-bottom:10px"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">✓ Trouvés :</div>${foundHtml}</div>` : ''}
                ${missedHtml ? `<div style="margin-bottom:10px"><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">✗ Manqués :</div>${missedHtml}</div>` : ''}

                <details style="margin-top:10px">
                    <summary style="cursor:pointer;font-size:12px;color:var(--text-muted)">Voir la réponse complète</summary>
                    <div style="margin-top:8px;padding:10px;background:var(--bg-tertiary);border-radius:6px;font-size:13px;color:var(--text-secondary);line-height:1.5">${formatAnswer(card.answer)}</div>
                </details>
            </div>
        `;
    }

    // Re-render to update button
    renderFreeRecall();
    // Restore the answer + feedback after re-render
    const ta2 = document.getElementById('recallTextarea');
    if (ta2) ta2.value = recallState.userAnswer;
    // Re-inject feedback
    const fb2 = document.getElementById('recallFeedback');
    if (fb2 && fb && fb.innerHTML) fb2.innerHTML = fb.innerHTML;
}

function recallNext() {
    recallState.current++;
    recallState.userAnswer = '';
    recallState.revealed = false;
    renderFreeRecall();
}
