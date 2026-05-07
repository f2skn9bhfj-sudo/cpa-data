/* ═══════════════════════════════════════════════
   Mode Examen Blanc (Exam Mode)
   Timer 3h + cas pratiques + corrigé type
   ═══════════════════════════════════════════════ */

let examState = {
    phase: 'intro',       // intro | running | review
    duration: 3 * 60 * 60 * 1000,  // 3h default
    startedAt: null,
    pausedMs: 0,
    pausedAt: null,
    questions: [],        // Array of selected flashcards (usually difficile + piège)
    answers: {},          // { cardId: {text, revealed} }
    current: 0,
    interval: null,
};

const EXAM_DURATIONS = [
    { label: '1h (entraînement court)', ms: 60 * 60 * 1000 },
    { label: '2h (session intense)', ms: 2 * 60 * 60 * 1000 },
    { label: '3h (format examen)', ms: 3 * 60 * 60 * 1000 },
    { label: '4h (examen complet)', ms: 4 * 60 * 60 * 1000 },
];

const EXAM_SIZES = [
    { label: '5 cas', n: 5 },
    { label: '10 cas', n: 10 },
    { label: '15 cas', n: 15 },
    { label: '20 cas', n: 20 },
];

async function startExamMode() {
    examState.phase = 'intro';
    renderExamMode();
}

function renderExamMode() {
    const main = document.getElementById('mainContent') || document.getElementById('main');
    if (!main) return;
    if (examState.phase === 'intro') { renderExamIntro(main); return; }
    if (examState.phase === 'running') { renderExamRunning(main); return; }
    if (examState.phase === 'review') { renderExamReview(main); return; }
}

function renderExamIntro(main) {
    main.innerHTML = `
        <div style="max-width:720px;margin:0 auto;padding:20px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
                <button onclick="navigate('flashcards')" style="background:transparent;color:var(--text-secondary);border:1px solid var(--border);padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px">← Quitter</button>
                <div>
                    <div style="font-size:22px;font-weight:800;color:var(--text-primary)">📝 Mode Examen Blanc</div>
                    <div style="font-size:13px;color:var(--text-muted)">Simulation d'examen avec timer et corrigé type</div>
                </div>
            </div>

            <div style="background:#78350f;border:1px solid #c2410c;border-radius:12px;padding:18px;margin-bottom:24px">
                <div style="font-size:13px;color:#fdba74;line-height:1.5">
                    <strong>⚠️ Avant de commencer :</strong><br>
                    • L'app sélectionne des cas <strong>difficiles</strong> et <strong>pièges</strong> représentatifs<br>
                    • Écris tes réponses dans les zones de texte, le timer tourne<br>
                    • À la fin : le corrigé type s'affiche + mots-clés trouvés<br>
                    • SM-2 met à jour chaque carte selon ton score
                </div>
            </div>

            <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px">
                <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:10px">⏱ Durée de l'examen</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px" id="examDurationPicker">
                    ${EXAM_DURATIONS.map((d, i) => `
                        <button onclick="examSelectDuration(${d.ms})"
                            data-ms="${d.ms}"
                            class="exam-duration-btn ${examState.duration === d.ms ? 'selected' : ''}"
                            style="background:${examState.duration === d.ms ? '#064e3b' : 'var(--bg-tertiary)'};color:${examState.duration === d.ms ? '#6ee7b7' : 'var(--text-secondary)'};border:1px solid ${examState.duration === d.ms ? '#10b981' : 'var(--border)'};padding:10px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;text-align:center">
                            ${d.label}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px">
                <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:10px">📋 Nombre de cas</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px" id="examSizePicker">
                    ${EXAM_SIZES.map(s => `
                        <button onclick="examSelectSize(${s.n})"
                            data-n="${s.n}"
                            class="exam-size-btn ${(examState.selectedSize || 10) === s.n ? 'selected' : ''}"
                            style="background:${(examState.selectedSize || 10) === s.n ? '#1e3a5f' : 'var(--bg-tertiary)'};color:${(examState.selectedSize || 10) === s.n ? '#93c5fd' : 'var(--text-secondary)'};border:1px solid ${(examState.selectedSize || 10) === s.n ? '#3b82f6' : 'var(--border)'};padding:10px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;text-align:center">
                            ${s.label}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:24px">
                <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:10px">🎯 Sélection des cas</div>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-secondary)">
                    <input type="radio" name="examSelection" value="mixed" checked> Mix difficile + piège (recommandé)
                </label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:6px;font-size:13px;color:var(--text-secondary)">
                    <input type="radio" name="examSelection" value="piege"> Uniquement pièges (challenge)
                </label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:6px;font-size:13px;color:var(--text-secondary)">
                    <input type="radio" name="examSelection" value="random"> Aléatoire toutes catégories
                </label>
            </div>

            <div style="text-align:center">
                <button onclick="examLaunch()" style="background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;padding:14px 36px;border-radius:10px;cursor:pointer;font-size:15px;font-weight:700;box-shadow:0 4px 12px rgba(16,185,129,0.3)">
                    🚀 Démarrer l'examen
                </button>
            </div>
        </div>
    `;
}

function examSelectDuration(ms) {
    examState.duration = ms;
    renderExamMode();
}

function examSelectSize(n) {
    examState.selectedSize = n;
    renderExamMode();
}

async function examLaunch() {
    const size = examState.selectedSize || 10;
    const selectionRadio = document.querySelector('input[name="examSelection"]:checked');
    const selection = selectionRadio ? selectionRadio.value : 'mixed';

    // Fetch cards
    let cards = await api('get_flashcards');
    if (!cards || cards.length === 0) {
        alert('Aucune carte disponible.');
        return;
    }

    // Filter per selection
    if (selection === 'piege') {
        cards = cards.filter(c => c.difficulty === 'piège');
    } else if (selection === 'mixed') {
        cards = cards.filter(c => c.difficulty === 'difficile' || c.difficulty === 'piège');
    }
    // random: keep all

    if (cards.length < size) {
        alert(`Pas assez de cartes correspondantes (${cards.length} / ${size} demandées).`);
        return;
    }

    // Shuffle and pick
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    const selected = cards.slice(0, size);

    examState.questions = selected;
    examState.answers = {};
    selected.forEach(c => { examState.answers[c.id] = { text: '', revealed: false }; });
    examState.current = 0;
    examState.startedAt = Date.now();
    examState.pausedMs = 0;
    examState.pausedAt = null;
    examState.phase = 'running';

    // Start timer
    if (examState.interval) clearInterval(examState.interval);
    examState.interval = setInterval(examTick, 1000);

    renderExamMode();
}

function examTick() {
    if (examState.phase !== 'running') return;
    const elapsed = Date.now() - examState.startedAt - examState.pausedMs;
    const remaining = Math.max(0, examState.duration - elapsed);

    const timerEl = document.getElementById('examTimer');
    const progEl = document.getElementById('examTimerBar');
    if (timerEl) {
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        timerEl.textContent = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        const pct = Math.max(0, (remaining / examState.duration) * 100);
        timerEl.style.color = remaining < 5 * 60 * 1000 ? '#ef4444' : remaining < 15 * 60 * 1000 ? '#f59e0b' : '#10b981';
        if (progEl) {
            progEl.style.width = pct + '%';
            progEl.style.background = remaining < 5 * 60 * 1000 ? '#ef4444' : remaining < 15 * 60 * 1000 ? '#f59e0b' : '#10b981';
        }
    }
    if (remaining <= 0) {
        clearInterval(examState.interval);
        examState.interval = null;
        examFinish();
    }
}

function renderExamRunning(main) {
    const q = examState.questions[examState.current];
    if (!q) return;
    const total = examState.questions.length;
    const answered = Object.values(examState.answers).filter(a => a.text.trim().length > 10).length;
    const catColor = (typeof getColor === 'function') ? getColor(q.category) : { bg: '#334155', accent: '#93c5fd' };

    main.innerHTML = `
        <div style="max-width:860px;margin:0 auto;padding:8px 20px 40px">
            <!-- Sticky header with timer -->
            <div style="position:sticky;top:0;z-index:5;background:var(--bg-primary);padding:12px 0;border-bottom:1px solid var(--border);margin-bottom:20px">
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
                    <div>
                        <div style="font-size:13px;font-weight:700;color:var(--text-primary)">📝 Examen en cours</div>
                        <div style="font-size:11px;color:var(--text-muted)">${answered}/${total} cas répondus</div>
                    </div>
                    <div id="examTimer" style="font-size:28px;font-weight:800;color:#10b981;font-variant-numeric:tabular-nums;min-width:120px;text-align:center">
                        --:--:--
                    </div>
                    <div style="flex:1;min-width:120px;height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden">
                        <div id="examTimerBar" style="height:100%;background:#10b981;width:100%;transition:width 0.5s"></div>
                    </div>
                    <button onclick="examPause()" style="background:#78350f;color:#fdba74;border:1px solid #c2410c;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px">${examState.pausedAt ? '▶ Reprendre' : '⏸ Pause'}</button>
                    <button onclick="if(confirm('Terminer l\\'examen maintenant ?')) examFinish()" style="background:#7f1d1d;color:#fca5a5;border:1px solid #ef4444;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px">Terminer</button>
                </div>
            </div>

            <!-- Question navigator -->
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:20px">
                ${examState.questions.map((_, i) => {
                    const isAnswered = (examState.answers[examState.questions[i].id].text || '').trim().length > 10;
                    const isCurrent = i === examState.current;
                    return `<button onclick="examGoTo(${i})"
                        style="width:32px;height:32px;border-radius:6px;border:1px solid ${isCurrent ? '#10b981' : isAnswered ? '#3b82f6' : 'var(--border)'};background:${isCurrent ? '#064e3b' : isAnswered ? '#1e3a5f' : 'var(--bg-tertiary)'};color:${isCurrent ? '#6ee7b7' : isAnswered ? '#93c5fd' : 'var(--text-muted)'};cursor:pointer;font-size:12px;font-weight:600">${i + 1}</button>`;
                }).join('')}
            </div>

            <!-- Question -->
            <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:8px">
                    <div>
                        <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Cas ${examState.current + 1} / ${total}</span>
                        <span style="background:${catColor.bg};color:${catColor.accent};padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;margin-left:8px">${escapeHtml(q.category)}</span>
                        <span style="font-size:11px;color:var(--text-muted);margin-left:8px">${escapeHtml(q.subcategory || '')}</span>
                    </div>
                    <span style="background:${q.difficulty === 'piège' ? '#78350f' : '#7f1d1d'};color:${q.difficulty === 'piège' ? '#fdba74' : '#fca5a5'};padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600">
                        ${q.difficulty === 'piège' ? '⚠️ Piège' : q.difficulty === 'difficile' ? '🔥 Difficile' : escapeHtml(q.difficulty || '')}
                    </span>
                </div>
                <div style="font-size:15px;color:var(--text-bright);line-height:1.6;font-weight:500">
                    ${formatInline(q.question)}
                </div>
            </div>

            <!-- Answer zone -->
            <textarea id="examAnswerBox" rows="10"
                placeholder="Rédige ta réponse (min 10 caractères pour valider)..."
                oninput="examSaveAnswer()"
                style="width:100%;padding:14px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-size:14px;font-family:inherit;resize:vertical;outline:none;line-height:1.5">${escapeHtml(examState.answers[q.id].text || '')}</textarea>

            <!-- Navigation -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;gap:10px">
                <button onclick="examPrev()" ${examState.current === 0 ? 'disabled' : ''}
                    style="background:transparent;color:var(--text-secondary);border:1px solid var(--border);padding:10px 18px;border-radius:8px;cursor:${examState.current === 0 ? 'default' : 'pointer'};font-size:13px;opacity:${examState.current === 0 ? '0.4' : '1'}">
                    ← Précédent
                </button>
                <div style="font-size:12px;color:var(--text-muted)">
                    ${examState.current + 1} / ${total}
                </div>
                <button onclick="examNext()" ${examState.current >= total - 1 ? 'disabled' : ''}
                    style="background:#3b82f6;color:white;border:none;padding:10px 18px;border-radius:8px;cursor:${examState.current >= total - 1 ? 'default' : 'pointer'};font-size:13px;opacity:${examState.current >= total - 1 ? '0.4' : '1'}">
                    Suivant →
                </button>
            </div>
        </div>
    `;

    // Focus textarea
    const ta = document.getElementById('examAnswerBox');
    if (ta) setTimeout(() => ta.focus(), 100);
}

function examSaveAnswer() {
    const q = examState.questions[examState.current];
    const ta = document.getElementById('examAnswerBox');
    if (q && ta) {
        examState.answers[q.id].text = ta.value;
    }
}

function examGoTo(i) {
    examSaveAnswer();
    if (i < 0 || i >= examState.questions.length) return;
    examState.current = i;
    renderExamMode();
}

function examPrev() { examGoTo(examState.current - 1); }
function examNext() { examGoTo(examState.current + 1); }

function examPause() {
    if (examState.pausedAt) {
        // Resume
        examState.pausedMs += (Date.now() - examState.pausedAt);
        examState.pausedAt = null;
    } else {
        examState.pausedAt = Date.now();
    }
    renderExamMode();
}

async function examFinish() {
    examSaveAnswer();
    if (examState.interval) {
        clearInterval(examState.interval);
        examState.interval = null;
    }
    examState.phase = 'review';

    // Score each answer via same keyword method as free recall
    for (const q of examState.questions) {
        const userAns = examState.answers[q.id].text || '';
        let score = 0;
        let found = [];
        let missed = [];
        if (typeof scoreFreeRecall === 'function') {
            const r = scoreFreeRecall(userAns, q.answer);
            score = r.score;
            found = r.found;
            missed = r.missed;
        }
        examState.answers[q.id].score = score;
        examState.answers[q.id].found = found;
        examState.answers[q.id].missed = missed;

        // SM-2 update
        let rating;
        if (score < 30) rating = 0;
        else if (score < 55) rating = 1;
        else if (score < 80) rating = 2;
        else rating = 3;
        try { await api('update_flashcard', q.id, null, rating); } catch (e) { /* non-blocking */ }
    }

    renderExamMode();
}

function renderExamReview(main) {
    const total = examState.questions.length;
    const scores = examState.questions.map(q => examState.answers[q.id].score || 0);
    const avg = total > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0;
    const passed = scores.filter(s => s >= 60).length;
    const elapsed = Date.now() - examState.startedAt - examState.pausedMs;
    const elapsedMin = Math.round(elapsed / 60000);

    const scoreColor = avg >= 70 ? '#10b981' : avg >= 50 ? '#f59e0b' : '#ef4444';

    main.innerHTML = `
        <div style="max-width:860px;margin:0 auto;padding:20px">
            <!-- Summary -->
            <div style="background:linear-gradient(135deg,#1e293b,#0f172a);border:2px solid ${scoreColor};border-radius:14px;padding:28px;margin-bottom:24px;text-align:center">
                <div style="font-size:60px;margin-bottom:12px">${avg >= 70 ? '🎉' : avg >= 50 ? '👍' : '📚'}</div>
                <div style="font-size:24px;font-weight:800;color:var(--text-bright);margin-bottom:6px">Examen terminé</div>
                <div style="font-size:48px;font-weight:900;color:${scoreColor};margin:12px 0">${avg}%</div>
                <div style="display:flex;justify-content:center;gap:24px;font-size:13px;color:var(--text-secondary);flex-wrap:wrap">
                    <div>✅ ${passed}/${total} cas réussis (≥60%)</div>
                    <div>⏱ ${elapsedMin} min écoulées</div>
                </div>
                <div style="margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
                    <button onclick="startExamMode()" style="background:#064e3b;color:#6ee7b7;border:1px solid #10b981;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">🔄 Rejouer</button>
                    <button onclick="navigate('flashcards')" style="background:transparent;color:var(--text-secondary);border:1px solid var(--border);padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px">← Retour</button>
                </div>
            </div>

            <!-- Detailed corrections -->
            <div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:12px">📋 Corrigé type — par cas</div>
            ${examState.questions.map((q, i) => {
                const a = examState.answers[q.id];
                const c = a.score >= 70 ? '#10b981' : a.score >= 40 ? '#f59e0b' : '#ef4444';
                const foundHtml = (a.found || []).map(k => `<span style="background:#064e3b;color:#6ee7b7;padding:2px 6px;border-radius:8px;font-size:10px;margin:1px 2px;display:inline-block">${escapeHtml(k)}</span>`).join('');
                const missedHtml = (a.missed || []).map(k => `<span style="background:#3f1212;color:#fca5a5;padding:2px 6px;border-radius:8px;font-size:10px;margin:1px 2px;display:inline-block">${escapeHtml(k)}</span>`).join('');
                return `
                    <details style="background:var(--bg-secondary);border:1px solid var(--border);border-left:4px solid ${c};border-radius:8px;padding:12px 16px;margin-bottom:10px">
                        <summary style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-size:13px">
                            <span><strong>Cas ${i + 1}.</strong> ${escapeHtml(q.subcategory || q.category)}</span>
                            <span style="color:${c};font-weight:700">${a.score}%</span>
                        </summary>
                        <div style="margin-top:12px;font-size:13px">
                            <div style="color:var(--text-secondary);margin-bottom:8px"><strong>Question :</strong> ${formatInline(q.question)}</div>
                            <div style="background:var(--bg-tertiary);padding:10px;border-radius:6px;margin-bottom:8px;white-space:pre-wrap;color:var(--text-secondary);font-size:12px">
                                <strong>Ta réponse :</strong><br>${escapeHtml(a.text || '(vide)')}
                            </div>
                            ${foundHtml ? `<div style="margin-bottom:6px"><span style="font-size:11px;color:var(--text-muted)">✓ Trouvés :</span> ${foundHtml}</div>` : ''}
                            ${missedHtml ? `<div style="margin-bottom:8px"><span style="font-size:11px;color:var(--text-muted)">✗ Manqués :</span> ${missedHtml}</div>` : ''}
                            <div style="background:#1e3a5f;padding:10px;border-radius:6px;font-size:12px;color:#cbd5e1;line-height:1.5">
                                <strong>Corrigé :</strong><br>${formatAnswer(q.answer)}
                            </div>
                        </div>
                    </details>
                `;
            }).join('')}
        </div>
    `;
}
