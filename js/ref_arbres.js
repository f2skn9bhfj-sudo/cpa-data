/* ═══════════════════════════════════════════════
   References — Arbres de Décision (Decision Trees)
   ═══════════════════════════════════════════════ */

async function renderArbres(container) {
    container.innerHTML = '<div class="text-center" style="padding:60px"><div class="page-title">Chargement des arbres de décision...</div></div>';

    const data = await api('get_references', 'arbres_decision');
    const trees = data || [];

    // Track current step per tree: null = not started, number = step index, 'result-...' = final
    const treeState = {};
    trees.forEach((t, i) => { treeState[i] = null; });

    function render() {
        container.innerHTML = `
            <div class="ref-section">
                <div class="ref-section-title">Arbres de décision</div>
                ${trees.length === 0
                    ? '<p style="color:#94a3b8">Aucun arbre disponible.</p>'
                    : trees.map((tree, ti) => {
                        const color = tree.color || '#3b82f6';
                        const state = treeState[ti];
                        const steps = tree.steps || [];

                        let bodyHtml = '';
                        if (state === null) {
                            bodyHtml = `
                                <div style="text-align:center;padding:20px">
                                    <button class="btn btn-primary" onclick="window._arbreStart(${ti})">
                                        Commencer
                                    </button>
                                </div>
                            `;
                        } else if (typeof state === 'string' && state.startsWith('result:')) {
                            const resultText = state.substring(7);
                            bodyHtml = `
                                <div class="arbre-result" style="padding:16px;text-align:center">
                                    <div style="font-size:14px;color:#fbbf24;font-weight:600;margin-bottom:8px">Résultat</div>
                                    <div style="color:#e2e8f0;font-size:15px;line-height:1.6;padding:12px;
                                                background:#0f172a;border-radius:8px;border:1px solid ${color}40">
                                        ${formatAnswer(resultText)}
                                    </div>
                                    <button class="btn" style="margin-top:16px;background:#1e293b;color:#94a3b8;border:1px solid #334155"
                                            onclick="window._arbreReset(${ti})">
                                        Recommencer
                                    </button>
                                </div>
                            `;
                        } else {
                            const stepIdx = state;
                            const step = steps[stepIdx];
                            if (step) {
                                bodyHtml = `
                                    <div class="arbre-step" style="padding:16px;text-align:center">
                                        <div style="font-size:12px;color:#64748b;margin-bottom:8px">
                                            Étape ${stepIdx + 1} / ${steps.length}
                                        </div>
                                        <div class="arbre-question" style="color:#e2e8f0;font-size:15px;line-height:1.6;
                                                    margin-bottom:20px;padding:12px;background:#0f172a;border-radius:8px">
                                            ${formatAnswer(step.q)}
                                        </div>
                                        <div class="arbre-buttons" style="display:flex;gap:12px;justify-content:center">
                                            <button class="arbre-btn arbre-btn-oui btn"
                                                    style="background:#065f46;color:#6ee7b7;border:1px solid #10b981;min-width:100px"
                                                    onclick="window._arbreAnswer(${ti},'oui')">
                                                Oui
                                            </button>
                                            <button class="arbre-btn arbre-btn-non btn"
                                                    style="background:#7f1d1d;color:#fca5a5;border:1px solid #ef4444;min-width:100px"
                                                    onclick="window._arbreAnswer(${ti},'non')">
                                                Non
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }
                        }

                        return `
                            <div class="card" style="margin-bottom:16px;border-left:3px solid ${color}">
                                <div style="padding:14px 16px;font-size:15px;font-weight:600;color:#f1f5f9;border-bottom:1px solid #1e293b">
                                    ${escapeHtml(tree.title)}
                                </div>
                                ${bodyHtml}
                            </div>
                        `;
                    }).join('')
                }
            </div>
        `;
    }

    window._arbreStart = function(ti) {
        treeState[ti] = 0;
        render();
    };

    window._arbreAnswer = function(ti, choice) {
        const steps = trees[ti].steps || [];
        const step = steps[treeState[ti]];
        if (!step) return;

        const next = choice === 'oui' ? step.oui : step.non;

        if (typeof next === 'number' && steps[next]) {
            treeState[ti] = next;
        } else {
            // next is a result string or step index out of range
            treeState[ti] = 'result:' + (typeof next === 'string' ? next : 'Fin du parcours.');
        }
        render();
    };

    window._arbreReset = function(ti) {
        treeState[ti] = null;
        render();
    };

    render();
}
