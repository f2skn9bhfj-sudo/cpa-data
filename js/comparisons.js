/* ═══════════════════════════════════════════════
   Comparaisons IFRS vs Swiss GAAP RPC vs CO
   Side-by-side comparison tables for revision
   ═══════════════════════════════════════════════ */

let compData = [];
let compFilter = { category: null, search: '' };
let selectedThemeId = null;

// Category definitions for filter pills
const COMP_CATEGORIES = [
    { id: 'Actifs', label: 'Actifs', icon: '📦' },
    { id: 'Passifs', label: 'Passifs', icon: '⚖️' },
    { id: 'Résultat', label: 'Résultat', icon: '💰' },
    { id: 'Capitaux propres', label: 'Capitaux propres', icon: '🏛️' },
    { id: 'Consolidation', label: 'Consolidation', icon: '🌐' },
    { id: 'Présentation', label: 'Présentation', icon: '📑' },
    { id: 'Révision', label: 'Révision', icon: '🔍' },
];

async function renderComparisons(container) {
    const data = await api('get_comparisons');
    compData = (data && data.themes) ? data.themes : [];

    selectedThemeId = null;
    compFilter = { category: null, search: '' };

    renderCompPage(container);
}

function renderCompPage(container) {
    if (selectedThemeId) {
        renderCompDetail(container);
        return;
    }

    const filtered = getFilteredThemes();
    const categoryCounts = {};
    compData.forEach(t => {
        categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    });

    container.innerHTML = `
    <div class="comp-page fade-in">
        <!-- Header -->
        <div style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
            <div>
                <h1 class="page-title" style="font-size:24px;margin-bottom:4px">Comparaisons IFRS vs RPC vs CO</h1>
                <span style="font-size:13px;color:var(--text-secondary)">${compData.length} thèmes comparatifs couvrant les principaux sujets d'examen</span>
            </div>
            <button onclick="startCompQuiz()" style="background:#7c2d12;color:#fde68a;border:1px solid #c2410c;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">
                🧠 Mode Quiz — devine le référentiel
            </button>
        </div>

        <!-- Category pills -->
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
            <button class="comp-pill ${!compFilter.category ? 'active' : ''}" onclick="compFilterCat(null)">
                Tous (${compData.length})
            </button>
            ${COMP_CATEGORIES.map(c => {
                const count = categoryCounts[c.id] || 0;
                if (count === 0) return '';
                return `<button class="comp-pill ${compFilter.category === c.id ? 'active' : ''}" onclick="compFilterCat('${c.id}')">
                    ${c.icon} ${c.label} (${count})
                </button>`;
            }).join('')}
        </div>

        <!-- Search -->
        <div style="margin-bottom:24px">
            <input type="text" class="comp-search" placeholder="Rechercher un thème (ex: stocks, leasing, goodwill...)"
                   value="${escapeHtml(compFilter.search)}"
                   oninput="compFilterSearch(this.value)"
                   style="width:100%;max-width:500px;padding:10px 14px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);font-size:14px;outline:none">
        </div>

        <!-- Theme grid -->
        <div class="comp-grid">
            ${filtered.length === 0
                ? '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">Aucun thème trouvé.</div>'
                : filtered.map(t => renderCompCard(t)).join('')
            }
        </div>
    </div>

    <style>
        .comp-page { max-width: 1200px; margin: 0 auto; }
        .comp-pill {
            padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border);
            background: var(--bg-secondary); color: var(--text-secondary); cursor: pointer;
            font-size: 13px; transition: all 0.2s;
        }
        .comp-pill:hover { border-color: var(--accent-blue); color: var(--text-primary); }
        .comp-pill.active { background: var(--accent-blue); color: #fff; border-color: var(--accent-blue); }
        .comp-grid {
            display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 16px;
        }
        .comp-card {
            background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px;
            padding: 20px; cursor: pointer; transition: all 0.2s;
        }
        .comp-card:hover { border-color: var(--accent-blue); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .comp-card-icon { font-size: 28px; margin-bottom: 8px; }
        .comp-card-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
        .comp-card-cat { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .comp-card-norms { display: flex; flex-wrap: wrap; gap: 6px; }
        .comp-norm-tag {
            font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500;
        }
        .comp-norm-ifrs { background: rgba(56,161,105,0.15); color: #68d391; }
        .comp-norm-rpc { background: rgba(49,130,206,0.15); color: #63b3ed; }
        .comp-norm-co { background: rgba(180,83,9,0.15); color: #f6ad55; }
    </style>`;
}

function renderCompCard(theme) {
    return `
    <div class="comp-card" onclick="compSelectTheme('${theme.id}')">
        <div class="comp-card-icon">${theme.icon}</div>
        <div class="comp-card-cat">${escapeHtml(theme.category)}</div>
        <div class="comp-card-title">${escapeHtml(theme.title)}</div>
        <div class="comp-card-norms">
            <span class="comp-norm-tag comp-norm-ifrs">${escapeHtml(theme.norms.ifrs)}</span>
            <span class="comp-norm-tag comp-norm-rpc">${escapeHtml(theme.norms.rpc)}</span>
            <span class="comp-norm-tag comp-norm-co">${escapeHtml(theme.norms.co)}</span>
        </div>
        <div style="margin-top:10px;font-size:12px;color:var(--text-muted)">${theme.rows.length} aspects comparés</div>
    </div>`;
}

function renderCompDetail(container) {
    const theme = compData.find(t => t.id === selectedThemeId);
    if (!theme) {
        selectedThemeId = null;
        renderCompPage(container);
        return;
    }

    container.innerHTML = `
    <div class="comp-detail fade-in">
        <!-- Back button -->
        <button class="comp-back-btn" onclick="compBack()">
            ← Retour aux thèmes
        </button>

        <!-- Header -->
        <div style="margin-bottom:24px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                <span style="font-size:32px">${theme.icon}</span>
                <div>
                    <h1 style="font-size:22px;font-weight:700;color:var(--text-primary);margin:0">${escapeHtml(theme.title)}</h1>
                    <span style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(theme.category)}</span>
                </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
                <span class="comp-norm-tag comp-norm-ifrs" style="font-size:13px;padding:4px 12px">${escapeHtml(theme.norms.ifrs)}</span>
                <span class="comp-norm-tag comp-norm-rpc" style="font-size:13px;padding:4px 12px">${escapeHtml(theme.norms.rpc)}</span>
                <span class="comp-norm-tag comp-norm-co" style="font-size:13px;padding:4px 12px">${escapeHtml(theme.norms.co)}</span>
            </div>
        </div>

        <!-- Comparison table -->
        <div class="comp-table-wrap">
            <table class="comp-table">
                <thead>
                    <tr>
                        <th class="comp-th-aspect">Aspect</th>
                        <th class="comp-th-ifrs">IFRS</th>
                        <th class="comp-th-rpc">RPC</th>
                        <th class="comp-th-co">CO</th>
                    </tr>
                </thead>
                <tbody>
                    ${theme.rows.map(row => renderCompRow(row)).join('')}
                </tbody>
            </table>
        </div>

        <!-- Key takeaway -->
        ${theme.key_takeaway ? `
        <div class="comp-takeaway">
            <div style="font-weight:600;margin-bottom:6px;color:#68d391">💡 Synthèse</div>
            <div style="color:var(--text-bright);line-height:1.6">${formatAnswer(escapeHtml(theme.key_takeaway))}</div>
        </div>` : ''}

        <!-- Exam tip -->
        ${theme.exam_tip ? `
        <div class="comp-exam-tip">
            <div style="font-weight:600;margin-bottom:6px;color:#f6ad55">🎯 Astuce d'examen</div>
            <div style="color:var(--text-bright);line-height:1.6">${formatAnswer(escapeHtml(theme.exam_tip))}</div>
        </div>` : ''}

        <!-- Cross-ref norms -->
        <div class="comp-crossref">
            <div style="font-weight:600;margin-bottom:8px;color:var(--text-secondary)">📚 Normes liées</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
                <button class="comp-xref-btn comp-xref-ifrs" onclick="navigate('norms')" title="Voir les normes IFRS">${escapeHtml(theme.norms.ifrs)}</button>
                <button class="comp-xref-btn comp-xref-rpc" onclick="navigate('norms')" title="Voir les normes RPC">${escapeHtml(theme.norms.rpc)}</button>
                <button class="comp-xref-btn comp-xref-co" onclick="navigate('norms')" title="Voir les normes CO">${escapeHtml(theme.norms.co)}</button>
            </div>
        </div>

        <!-- Back button bottom -->
        <button class="comp-back-btn" onclick="compBack()" style="margin-top:24px">
            ← Retour aux thèmes
        </button>
    </div>

    <style>
        .comp-detail { max-width: 1200px; margin: 0 auto; }
        .comp-back-btn {
            background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 8px;
            color: var(--text-secondary); padding: 8px 16px; cursor: pointer; font-size: 13px;
            margin-bottom: 16px; transition: all 0.2s;
        }
        .comp-back-btn:hover { color: var(--text-primary); border-color: var(--accent-blue); }
        .comp-table-wrap {
            overflow-x: auto; border-radius: 12px; border: 1px solid var(--border);
            margin-bottom: 20px;
        }
        .comp-table {
            width: 100%; border-collapse: collapse; table-layout: fixed;
            min-width: 800px;
        }
        .comp-table th, .comp-table td {
            padding: 12px 14px; text-align: left; vertical-align: top;
            border-bottom: 1px solid var(--border);
            word-wrap: break-word; overflow-wrap: break-word;
            white-space: pre-wrap;
        }
        .comp-table th { font-size: 13px; font-weight: 600; letter-spacing: 0.3px; }
        .comp-table td { font-size: 13px; line-height: 1.55; color: var(--text-bright); }
        .comp-th-aspect { width: 15%; background: var(--bg-tertiary); color: var(--text-secondary); }
        .comp-th-ifrs { width: 28.33%; background: rgba(56,161,105,0.2); color: #68d391; }
        .comp-th-rpc { width: 28.33%; background: rgba(49,130,206,0.2); color: #63b3ed; }
        .comp-th-co { width: 28.33%; background: rgba(180,83,9,0.2); color: #f6ad55; }
        .comp-table tbody tr:hover { background: rgba(255,255,255,0.03); }
        .comp-table tbody tr.comp-row-piege { background: rgba(245,158,11,0.06); }
        .comp-table tbody tr.comp-row-piege:hover { background: rgba(245,158,11,0.1); }
        .comp-td-aspect {
            font-weight: 600; color: var(--text-secondary); font-size: 12px;
            background: rgba(51,65,85,0.3);
        }
        .comp-piege-cell {
            margin-top: 8px; padding: 6px 10px; border-radius: 6px;
            background: rgba(245,158,11,0.1); border-left: 3px solid #f59e0b;
            font-size: 12px; color: #fbbf24; line-height: 1.5;
        }
        .comp-takeaway {
            padding: 16px 20px; border-radius: 10px; margin-bottom: 16px;
            background: rgba(56,161,105,0.08); border: 1px solid rgba(56,161,105,0.2);
        }
        .comp-exam-tip {
            padding: 16px 20px; border-radius: 10px; margin-bottom: 16px;
            background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2);
        }
        .comp-crossref {
            padding: 16px 20px; border-radius: 10px; margin-bottom: 16px;
            background: var(--bg-secondary); border: 1px solid var(--border);
        }
        .comp-xref-btn {
            padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border);
            cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s;
            background: var(--bg-tertiary); color: var(--text-secondary);
        }
        .comp-xref-btn:hover { transform: translateY(-1px); }
        .comp-xref-ifrs:hover { border-color: #38a169; color: #68d391; }
        .comp-xref-rpc:hover { border-color: #3182ce; color: #63b3ed; }
        .comp-xref-co:hover { border-color: #b45309; color: #f6ad55; }

        @media (max-width: 900px) {
            .comp-table { min-width: 600px; }
            .comp-th-aspect { width: 18%; }
            .comp-th-ifrs, .comp-th-rpc, .comp-th-co { width: 27.33%; }
        }
    </style>`;

    // Scroll to top
    container.scrollTop = 0;
}

function renderCompRow(row) {
    const hasPiege = !!row.piege;
    return `
    <tr class="${hasPiege ? 'comp-row-piege' : ''}">
        <td class="comp-td-aspect">${escapeHtml(row.aspect)}</td>
        <td>${formatAnswer(escapeHtml(row.ifrs))}${hasPiege ? `<div class="comp-piege-cell">${formatAnswer(escapeHtml(row.piege))}</div>` : ''}</td>
        <td>${formatAnswer(escapeHtml(row.rpc))}</td>
        <td>${formatAnswer(escapeHtml(row.co))}</td>
    </tr>`;
}

// ── Filtering ──

function getFilteredThemes() {
    return compData.filter(t => {
        if (compFilter.category && t.category !== compFilter.category) return false;
        if (compFilter.search) {
            const q = compFilter.search.toLowerCase();
            const searchable = (t.title + ' ' + t.id + ' ' + t.norms.ifrs + ' ' + t.norms.rpc + ' ' + t.norms.co + ' ' + t.category).toLowerCase();
            if (!searchable.includes(q)) return false;
        }
        return true;
    });
}

function compFilterCat(cat) {
    compFilter.category = cat;
    const main = document.getElementById('mainContent');
    renderCompPage(main);
}

function compFilterSearch(val) {
    compFilter.search = val;
    // Debounced re-render
    clearTimeout(window._compSearchTimer);
    window._compSearchTimer = setTimeout(() => {
        const main = document.getElementById('mainContent');
        // Preserve the search input focus
        const gridEl = main.querySelector('.comp-grid');
        if (gridEl) {
            const filtered = getFilteredThemes();
            gridEl.innerHTML = filtered.length === 0
                ? '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">Aucun thème trouvé.</div>'
                : filtered.map(t => renderCompCard(t)).join('');
        }
    }, 200);
}

function compSelectTheme(id) {
    selectedThemeId = id;
    const main = document.getElementById('mainContent');
    renderCompDetail(main);
}

function compBack() {
    selectedThemeId = null;
    const main = document.getElementById('mainContent');
    renderCompPage(main);
}

// ══════════════════════════════════════════════════
// MODE QUIZ — Devine le référentiel (IFRS vs RPC vs CO)
// ══════════════════════════════════════════════════

let compQuizState = {
    questions: [],
    current: 0,
    correct: 0,
    wrong: 0,
    answered: false,
};

function startCompQuiz() {
    const pool = [];
    compData.forEach(theme => {
        if (!theme.rows || !Array.isArray(theme.rows)) return;
        theme.rows.forEach(row => {
            ['ifrs', 'rpc', 'co'].forEach(ref => {
                const content = row[ref];
                if (content && typeof content === 'string' && content.trim().length > 30) {
                    let snippet = content.trim();
                    if (snippet.length > 220) snippet = snippet.substring(0, 220) + '...';
                    pool.push({
                        themeTitle: theme.title,
                        themeCategory: theme.category,
                        aspect: row.aspect || '',
                        snippet,
                        correctRef: ref,
                    });
                }
            });
        });
    });

    if (pool.length < 5) {
        alert('Pas assez de données pour lancer un quiz (min 5 items).');
        return;
    }

    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    compQuizState = {
        questions: pool.slice(0, Math.min(20, pool.length)),
        current: 0,
        correct: 0,
        wrong: 0,
        answered: false,
    };
    renderCompQuiz();
}

function renderCompQuiz() {
    const main = document.getElementById('mainContent');
    if (!main) return;
    const s = compQuizState;

    if (s.current >= s.questions.length) {
        const total = s.correct + s.wrong;
        const pct = total > 0 ? Math.round((s.correct / total) * 100) : 0;
        const emoji = pct >= 80 ? '🎉' : pct >= 60 ? '👍' : '📚';
        main.innerHTML =
            '<div class="comp-page fade-in" style="max-width:600px;margin:40px auto;text-align:center;padding:40px 20px">' +
            '<div style="font-size:56px;margin-bottom:16px">' + emoji + '</div>' +
            '<div style="font-size:22px;font-weight:800;color:var(--text-primary);margin-bottom:8px">Quiz terminé !</div>' +
            '<div style="font-size:16px;color:var(--text-secondary);margin-bottom:24px">Score : <strong>' + s.correct + '/' + total + '</strong> (' + pct + '%)</div>' +
            '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
            '<button onclick="startCompQuiz()" style="background:#7c2d12;color:#fde68a;border:1px solid #c2410c;padding:10px 18px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">🔄 Rejouer</button>' +
            '<button onclick="renderComparisons(document.getElementById(\'mainContent\'))" style="background:transparent;color:var(--text-secondary);border:1px solid var(--border);padding:10px 18px;border-radius:8px;cursor:pointer;font-size:13px">← Retour aux comparaisons</button>' +
            '</div></div>';
        if (pct >= 80 && typeof launchConfetti === 'function') setTimeout(launchConfetti, 200);
        return;
    }

    const q = s.questions[s.current];
    const progress = ((s.current + 1) / s.questions.length) * 100;

    main.innerHTML =
        '<div class="comp-page fade-in" style="max-width:720px;margin:0 auto;padding:8px 0 40px">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">' +
        '<button onclick="renderComparisons(document.getElementById(\'mainContent\'))" style="background:transparent;color:var(--text-secondary);border:1px solid var(--border);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px">← Quitter</button>' +
        '<div style="flex:1">' +
        '<div style="font-size:14px;font-weight:700;color:var(--text-primary)">🧠 Quiz : devine le référentiel</div>' +
        '<div style="font-size:12px;color:var(--text-muted)">' + (s.current + 1) + ' / ' + s.questions.length + ' • ' + s.correct + '✓ ' + s.wrong + '✗</div>' +
        '</div></div>' +
        '<div class="progress-bar" style="margin-bottom:20px"><div class="progress-fill" style="width:' + progress + '%"></div></div>' +
        '<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:20px">' +
        '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Thème : ' + escapeHtml(q.themeTitle) + (q.aspect ? ' • ' + escapeHtml(q.aspect) : '') + '</div>' +
        '<div style="font-size:15px;color:var(--text-primary);line-height:1.5;margin-top:12px">"' + escapeHtml(q.snippet) + '"</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-top:16px;font-style:italic">➡ À quel référentiel appartient cette règle ?</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">' +
        '<button onclick="compQuizAnswer(\'ifrs\')" class="comp-quiz-btn" data-ref="ifrs" style="background:rgba(56,161,105,0.15);color:#68d391;border:1px solid #38a169;padding:16px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600">IFRS / IAS</button>' +
        '<button onclick="compQuizAnswer(\'rpc\')" class="comp-quiz-btn" data-ref="rpc" style="background:rgba(49,130,206,0.15);color:#63b3ed;border:1px solid #3182ce;padding:16px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600">Swiss GAAP RPC</button>' +
        '<button onclick="compQuizAnswer(\'co\')" class="comp-quiz-btn" data-ref="co" style="background:rgba(180,83,9,0.15);color:#f6ad55;border:1px solid #c2410c;padding:16px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:600">Code des Obligations</button>' +
        '</div>' +
        '<div id="compQuizFeedback" style="margin-top:16px;text-align:center;font-size:13px;min-height:24px"></div>' +
        '</div>';
}

function compQuizAnswer(ref) {
    const s = compQuizState;
    if (s.answered) return;
    s.answered = true;
    const q = s.questions[s.current];
    const correct = ref === q.correctRef;
    if (correct) s.correct++;
    else s.wrong++;

    document.querySelectorAll('.comp-quiz-btn').forEach(btn => {
        const r = btn.dataset.ref;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'default';
        if (r === q.correctRef) {
            btn.style.opacity = '1';
            btn.style.boxShadow = '0 0 0 3px #10b981';
        } else if (r === ref && !correct) {
            btn.style.boxShadow = '0 0 0 3px #ef4444';
        }
    });
    const fb = document.getElementById('compQuizFeedback');
    if (fb) {
        fb.innerHTML = correct
            ? '<span style="color:#6ee7b7">✓ Bonne réponse ! <button onclick="compQuizNext()" style="margin-left:8px;background:#10b981;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px">Suivant →</button></span>'
            : '<span style="color:#fca5a5">✗ Mauvais. La bonne réponse était <strong>' + q.correctRef.toUpperCase() + '</strong>. <button onclick="compQuizNext()" style="margin-left:8px;background:#ef4444;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px">Suivant →</button></span>';
    }
}

function compQuizNext() {
    compQuizState.current++;
    compQuizState.answered = false;
    renderCompQuiz();
}
