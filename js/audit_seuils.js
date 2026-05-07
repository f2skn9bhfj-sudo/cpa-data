/* ═══════════════════════════════════════════════
   Audit — Seuils & Exercices
   Aide-mémoire + exercices interactifs pas-à-pas.
   ═══════════════════════════════════════════════ */

const SEUILS_ACCENT = '#805ad5';
const SEUILS_LIGHT = '#e9d8fd';

let _seuilsState = {
    data: null,
    selectedCat: null,
    view: 'memo',     // 'memo' | 'exo'
    currentExIdx: 0,
    chosenIdx: null,
    showSteps: false,
};

async function renderAuditSeuils(container) {
    container.innerHTML = '<div class="text-center" style="padding:60px"><div class="page-title">Chargement des seuils…</div></div>';

    if (!_seuilsState.data) {
        _seuilsState.data = await api('get_audit_seuils');
    }
    if (!_seuilsState.data || !_seuilsState.data.categories) {
        container.innerHTML = `<div style="padding:40px;text-align:center;color:#fca5a5">
            ⚠️ Données seuils indisponibles.
        </div>`;
        return;
    }

    const cats = _seuilsState.data.categories;
    if (!_seuilsState.selectedCat) _seuilsState.selectedCat = cats[0].id;
    const cat = cats.find(c => c.id === _seuilsState.selectedCat);

    container.innerHTML = `
        <div style="margin-bottom:14px;padding:14px 18px;border-radius:10px;
                    background:linear-gradient(135deg, #553c9a, #4c1d95);
                    border:1px solid ${SEUILS_ACCENT}">
            <div style="display:flex;align-items:center;gap:12px">
                <div style="font-size:28px">🎯</div>
                <div>
                    <div style="font-size:18px;font-weight:800;color:${SEUILS_LIGHT}">
                        Seuils & Exercices
                    </div>
                    <div style="font-size:12px;color:#c4b5fd;margin-top:2px">
                        Comprends les seuils-clés de l'audit suisse — mémo + exos pas-à-pas
                    </div>
                </div>
            </div>
        </div>

        <!-- Category chips -->
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
            ${cats.map(c => {
                const active = c.id === _seuilsState.selectedCat;
                return `
                    <button onclick="_selectSeuilCat('${c.id}')"
                            style="padding:8px 14px;border-radius:7px;cursor:pointer;
                                   font-size:12px;font-weight:600;transition:all 0.15s;
                                   border:1px solid ${active ? c.color : '#334155'};
                                   background:${active ? '#3c1d6e' : '#0f172a'};
                                   color:${active ? SEUILS_LIGHT : '#cbd5e1'}">
                        ${c.icon || '📐'} ${escapeHtml(c.label)}
                    </button>`;
            }).join('')}
        </div>

        <!-- Mode switch (memo / exo) -->
        <div style="display:flex;gap:6px;margin-bottom:16px;padding:4px;background:#0f172a;
                    border:1px solid #1e293b;border-radius:8px;max-width:380px">
            <button onclick="_switchSeuilView('memo')"
                    style="flex:1;padding:7px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;
                           border:none;background:${_seuilsState.view === 'memo' ? cat.color : 'transparent'};
                           color:${_seuilsState.view === 'memo' ? 'white' : '#94a3b8'}">
                📖 Aide-mémoire
            </button>
            <button onclick="_switchSeuilView('exo')"
                    style="flex:1;padding:7px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;
                           border:none;background:${_seuilsState.view === 'exo' ? cat.color : 'transparent'};
                           color:${_seuilsState.view === 'exo' ? 'white' : '#94a3b8'}">
                ✏️ Exercices (${(cat.exercises || []).length})
            </button>
        </div>

        <div id="seuilsContent"></div>
    `;

    _renderSeuilPanel();
}

function _selectSeuilCat(id) {
    _seuilsState.selectedCat = id;
    _seuilsState.currentExIdx = 0;
    _seuilsState.chosenIdx = null;
    _seuilsState.showSteps = false;
    const host = document.getElementById('auditContent');
    if (host) renderAuditSeuils(host);
}

function _switchSeuilView(view) {
    _seuilsState.view = view;
    _seuilsState.currentExIdx = 0;
    _seuilsState.chosenIdx = null;
    _seuilsState.showSteps = false;
    const host = document.getElementById('auditContent');
    if (host) renderAuditSeuils(host);
}

function _renderSeuilPanel() {
    const host = document.getElementById('seuilsContent');
    if (!host) return;
    const cat = _seuilsState.data.categories.find(c => c.id === _seuilsState.selectedCat);
    if (_seuilsState.view === 'memo') _renderSeuilMemo(host, cat);
    else _renderSeuilExo(host, cat);
}

// ── Aide-mémoire ──

function _renderSeuilMemo(host, cat) {
    const memo = cat.aide_memoire || {};
    host.innerHTML = `
        ${memo.concept ? `
            <div style="padding:14px 18px;margin-bottom:16px;background:${cat.color}22;
                        border-left:3px solid ${cat.color};border-radius:6px">
                <div style="font-size:13px;color:#cbd5e1;line-height:1.6">
                    ${escapeHtml(memo.concept)}
                </div>
            </div>
        ` : ''}

        <!-- Niveaux détaillés -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;margin-bottom:18px">
            ${(memo.niveaux || []).map((n, i) => `
                <div class="card" style="padding:16px;border-left:3px solid ${cat.color}">
                    <div style="font-size:13px;font-weight:800;color:${cat.color};margin-bottom:10px">
                        ${i + 1}. ${escapeHtml(n.name)}
                    </div>
                    ${n.formula ? `
                        <div style="padding:8px 12px;background:#0a0f1c;border-radius:5px;margin-bottom:8px;
                                    font-family:'Courier New',monospace;font-size:12px;color:${SEUILS_LIGHT}">
                            📐 ${escapeHtml(n.formula)}
                        </div>
                    ` : ''}
                    ${n.benchmarks ? `
                        <div style="font-size:12px;color:#94a3b8;margin-bottom:6px">
                            <strong style="color:#cbd5e1">Benchmarks :</strong> ${escapeHtml(n.benchmarks)}
                        </div>
                    ` : ''}
                    ${n.purpose ? `
                        <div style="font-size:12px;color:#94a3b8;margin-bottom:6px">
                            <strong style="color:#cbd5e1">But :</strong> ${escapeHtml(n.purpose)}
                        </div>
                    ` : ''}
                    ${n.typical_value ? `
                        <div style="font-size:11px;color:#a78bfa;margin-top:8px;padding-top:8px;border-top:1px solid #1e293b">
                            💡 Valeur typique : ${escapeHtml(n.typical_value)}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        ${memo.mental_model ? `
            <div style="padding:14px 18px;margin-bottom:16px;background:#1e1b4b;
                        border-left:3px solid #3b82f6;border-radius:6px">
                <div style="font-size:12px;font-weight:700;color:#60a5fa;margin-bottom:6px">
                    🧠 Modèle mental
                </div>
                <div style="font-size:13px;color:#cbd5e1;line-height:1.6">
                    ${escapeHtml(memo.mental_model)}
                </div>
            </div>
        ` : ''}

        ${(memo.pitfalls || []).length ? `
            <div style="padding:14px 18px;background:#3f1612;border-left:3px solid #ef4444;border-radius:6px">
                <div style="font-size:12px;font-weight:700;color:#fca5a5;margin-bottom:6px">
                    ⚠️ Pièges à éviter
                </div>
                <ul style="margin:0;padding-left:20px;color:#fecaca;font-size:13px;line-height:1.7">
                    ${memo.pitfalls.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        <div style="margin-top:18px;text-align:center">
            <button onclick="_switchSeuilView('exo')"
                    style="background:${cat.color};border:none;color:white;padding:10px 22px;
                           border-radius:7px;cursor:pointer;font-size:13px;font-weight:700">
                ✏️ Passer aux exercices →
            </button>
        </div>
    `;
}

// ── Exercices ──

function _renderSeuilExo(host, cat) {
    const exos = cat.exercises || [];
    if (exos.length === 0) {
        host.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8">Pas d\'exercices pour cette catégorie.</div>';
        return;
    }
    const idx = _seuilsState.currentExIdx;
    const ex = exos[idx];
    const chosen = _seuilsState.chosenIdx;
    const answered = chosen !== null;
    const showSteps = _seuilsState.showSteps;

    const diffColor = {easy:'#10b981', medium:'#f59e0b', hard:'#ef4444'}[ex.difficulty] || '#94a3b8';
    const diffLabel = {easy:'Facile', medium:'Moyen', hard:'Difficile'}[ex.difficulty] || ex.difficulty;

    host.innerHTML = `
        <!-- Progress bar -->
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px">
            <span style="color:#94a3b8">Exercice ${idx + 1} / ${exos.length}</span>
            <span style="color:${diffColor};font-weight:600">⚡ ${diffLabel}</span>
        </div>
        <div style="height:6px;background:#1e293b;border-radius:3px;overflow:hidden;margin-bottom:16px">
            <div style="height:100%;width:${Math.round(100*(idx+1)/exos.length)}%;
                        background:${cat.color};transition:width 0.3s"></div>
        </div>

        <!-- Scenario -->
        <div class="card" style="padding:16px 20px;margin-bottom:14px;border-left:3px solid ${cat.color}">
            <div style="font-size:12px;font-weight:700;color:${cat.color};text-transform:uppercase;margin-bottom:8px">
                📋 Scénario
            </div>
            <div style="color:#cbd5e1;font-size:14px;line-height:1.6">
                ${escapeHtml(ex.scenario)}
            </div>
        </div>

        <!-- Question -->
        <div class="card" style="padding:16px 20px;margin-bottom:14px;border-left:3px solid #3b82f6">
            <div style="font-size:15px;font-weight:700;color:${SEUILS_LIGHT};line-height:1.6;margin-bottom:14px">
                ❓ ${escapeHtml(ex.question)}
            </div>
            ${ex.options.map((opt, i) => _renderExoOption(opt, i, chosen)).join('')}
            ${ex.exam_ref ? `<div style="margin-top:10px;font-size:11px;color:#64748b">
                📚 ${escapeHtml(ex.exam_ref)}
            </div>` : ''}
        </div>

        ${answered ? _renderExoFeedback(ex, chosen, showSteps) : ''}
        ${ex.note && answered ? `
            <div style="padding:10px 14px;margin-bottom:12px;background:#422006;
                        border-left:3px solid #fbbf24;border-radius:5px;color:#fef3c7;font-size:12px">
                ⚠️ ${escapeHtml(ex.note)}
            </div>
        ` : ''}

        <!-- Nav -->
        <div style="display:flex;justify-content:space-between;margin-top:14px">
            <button onclick="_prevSeuilExo()" ${idx === 0 ? 'disabled' : ''}
                    style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;
                           padding:8px 16px;border-radius:6px;cursor:${idx === 0 ? 'not-allowed' : 'pointer'};
                           font-size:13px;opacity:${idx === 0 ? '0.4' : '1'}">
                ← Précédent
            </button>
            ${answered ? `
                <button onclick="_nextSeuilExo()" ${idx === exos.length - 1 ? 'disabled' : ''}
                        style="background:${cat.color};border:none;color:white;
                               padding:8px 18px;border-radius:6px;
                               cursor:${idx === exos.length - 1 ? 'not-allowed' : 'pointer'};
                               font-size:13px;font-weight:600;opacity:${idx === exos.length - 1 ? '0.4' : '1'}">
                    ${idx === exos.length - 1 ? 'Dernier exo terminé' : 'Suivant →'}
                </button>
            ` : '<div></div>'}
        </div>
    `;
}

function _renderExoOption(opt, i, chosen) {
    const done = chosen !== null;
    let bg = '#0f172a', border = '#334155', color = '#cbd5e1';
    if (done) {
        if (i === chosen) {
            bg = opt.ok ? '#022c22' : '#3f1612';
            border = opt.ok ? '#10b981' : '#ef4444';
            color = opt.ok ? '#6ee7b7' : '#fca5a5';
        } else if (opt.ok) {
            border = '#10b981';
            color = '#6ee7b7';
        }
    }
    return `
        <div ${!done ? `onclick="_answerSeuilExo(${i})"` : ''}
             style="padding:11px 14px;margin-bottom:8px;border-radius:6px;
                    border:1px solid ${border};background:${bg};color:${color};
                    cursor:${done ? 'default' : 'pointer'};
                    transition:background 0.15s;font-size:13px;line-height:1.5;
                    display:flex;gap:10px;align-items:flex-start"
             ${!done ? 'onmouseover="this.style.background=\'#1e293b\'" onmouseout="this.style.background=\'#0f172a\'"' : ''}>
            <div style="flex-shrink:0;width:22px;height:22px;border-radius:50%;
                        border:1px solid ${border};
                        display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">
                ${done ? (i === chosen ? (opt.ok ? '✓' : '✗') : (opt.ok ? '✓' : String.fromCharCode(65+i)))
                        : String.fromCharCode(65 + i)}
            </div>
            <div>${escapeHtml(opt.label)}</div>
        </div>`;
}

function _renderExoFeedback(ex, chosen, showSteps) {
    const opt = ex.options[chosen];
    const ok = opt.ok;
    return `
        <div class="card" style="padding:14px 18px;margin-bottom:12px;border-left:3px solid ${ok ? '#10b981' : '#ef4444'};
                                  background:${ok ? '#022c22' : '#3f1612'}">
            <div style="font-size:13px;font-weight:700;color:${ok ? '#6ee7b7' : '#fca5a5'};margin-bottom:6px">
                ${ok ? '✅ Correct !' : '❌ Incorrect'}
            </div>
            <div style="color:#cbd5e1;font-size:13px;line-height:1.6">
                ${escapeHtml(opt.x || '')}
            </div>
        </div>

        ${ex.steps && ex.steps.length ? `
            <div class="card" style="padding:14px 18px;margin-bottom:12px;border-left:3px solid #3b82f6">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                    <div style="font-size:13px;font-weight:700;color:#60a5fa">
                        📝 Solution pas à pas
                    </div>
                    <button onclick="_toggleSteps()"
                            style="background:#1e293b;border:1px solid #334155;color:#93c5fd;
                                   padding:4px 10px;border-radius:5px;cursor:pointer;font-size:11px">
                        ${showSteps ? '🔽 Masquer' : '▶️ Voir'}
                    </button>
                </div>
                ${showSteps ? `
                    <ol style="margin:6px 0 0 0;padding-left:22px;color:#cbd5e1;font-size:13px;line-height:1.8">
                        ${ex.steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
                    </ol>
                ` : `
                    <div style="color:#94a3b8;font-size:12px">
                        Clique "Voir" pour afficher le raisonnement étape par étape.
                    </div>
                `}
            </div>
        ` : ''}
    `;
}

function _answerSeuilExo(i) {
    _seuilsState.chosenIdx = i;
    _seuilsState.showSteps = true;
    _renderSeuilPanel();
}

function _toggleSteps() {
    _seuilsState.showSteps = !_seuilsState.showSteps;
    _renderSeuilPanel();
}

function _nextSeuilExo() {
    const cat = _seuilsState.data.categories.find(c => c.id === _seuilsState.selectedCat);
    if (_seuilsState.currentExIdx < (cat.exercises || []).length - 1) {
        _seuilsState.currentExIdx++;
        _seuilsState.chosenIdx = null;
        _seuilsState.showSteps = false;
        _renderSeuilPanel();
    }
}

function _prevSeuilExo() {
    if (_seuilsState.currentExIdx > 0) {
        _seuilsState.currentExIdx--;
        _seuilsState.chosenIdx = null;
        _seuilsState.showSteps = false;
        _renderSeuilPanel();
    }
}
