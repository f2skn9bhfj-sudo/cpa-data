/* ═══════════════════════════════════════════════
   References — Cas Chiffrés (Interactive Exercises)
   ═══════════════════════════════════════════════ */

async function renderCas(container) {
    container.innerHTML = '<div class="text-center" style="padding:60px"><div class="page-title">Chargement des cas chiffrés...</div></div>';

    const data = await api('get_references', 'cas_chiffres');
    const exercises = data || [];

    // Track state per exercise
    const exState = {};
    exercises.forEach((ex, i) => {
        exState[i] = { checked: false, answers: {} };
    });

    function render() {
        container.innerHTML = `
            <div class="ref-section">
                <div class="ref-section-title">Cas chiffrés</div>
                ${exercises.length === 0
                    ? '<p style="color:#94a3b8">Aucun exercice disponible.</p>'
                    : exercises.map((ex, ei) => {
                        const col = getColor(ex.cat || 'Audit / ISA');
                        const state = exState[ei];
                        return `
                            <div class="card" style="margin-bottom:20px;border-left:3px solid ${col.accent}">
                                <div style="padding:16px">
                                    <div style="font-size:15px;font-weight:600;color:#f1f5f9;margin-bottom:4px">
                                        ${escapeHtml(ex.title)}
                                    </div>
                                    <div style="font-size:12px;color:${col.accent};margin-bottom:12px">
                                        ${escapeHtml(ex.cat || '')}
                                    </div>
                                    <div style="color:#cbd5e1;font-size:14px;line-height:1.6;margin-bottom:16px">
                                        ${formatAnswer(ex.enonce)}
                                    </div>
                                    <div style="display:flex;flex-direction:column;gap:12px">
                                        ${(ex.fields || []).map((field, fi) => {
                                            const userVal = state.answers[fi] || '';
                                            let resultHtml = '';
                                            if (state.checked) {
                                                const numericAnswer = parseFloat(String(field.answer).replace(/['\s]/g, ''));
                                                const numericUser = parseFloat(String(userVal).replace(/['\s]/g, ''));
                                                const tol = field.tolerance || 0;
                                                const correct = !isNaN(numericUser) && Math.abs(numericUser - numericAnswer) <= tol;
                                                resultHtml = `
                                                    <div class="cas-result ${correct ? 'cas-correct' : 'cas-incorrect'}"
                                                         style="margin-top:4px;padding:6px 10px;border-radius:6px;font-size:13px;
                                                                background:${correct ? '#064e3b' : '#7f1d1d'};
                                                                color:${correct ? '#6ee7b7' : '#fca5a5'}">
                                                        ${correct ? '&#10003; Correct' : '&#10007; Réponse attendue : ' + escapeHtml(String(field.answer))}
                                                    </div>
                                                `;
                                            }
                                            return `
                                                <div class="cas-field">
                                                    <label style="display:block;color:#94a3b8;font-size:13px;margin-bottom:4px">
                                                        ${escapeHtml(field.label)}
                                                    </label>
                                                    <input type="text"
                                                           data-ex="${ei}" data-fi="${fi}"
                                                           value="${escapeHtml(userVal)}"
                                                           ${state.checked ? 'disabled' : ''}
                                                           oninput="window._casInput(${ei},${fi},this.value)"
                                                           style="width:100%;max-width:300px;padding:8px 12px;background:#1e293b;
                                                                  border:1px solid #334155;border-radius:6px;color:#f1f5f9;font-size:14px;outline:none"
                                                           placeholder="Votre réponse">
                                                    ${resultHtml}
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                    <div style="margin-top:16px;display:flex;gap:8px">
                                        ${!state.checked
                                            ? `<button class="btn btn-primary" onclick="window._casCheck(${ei})">Vérifier</button>`
                                            : `<button class="btn" style="background:#1e293b;color:#94a3b8;border:1px solid #334155"
                                                       onclick="window._casReset(${ei})">Recommencer</button>`
                                        }
                                    </div>
                                    ${state.checked && ex.correction ? `
                                        <div class="cas-correction" style="margin-top:16px;padding:14px;background:#0f172a;
                                                    border-radius:8px;border:1px solid #334155">
                                            <div style="font-size:13px;font-weight:600;color:#fbbf24;margin-bottom:8px">Correction</div>
                                            <div style="color:#cbd5e1;font-size:14px;line-height:1.6">
                                                ${formatAnswer(ex.correction)}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
        `;
    }

    window._casInput = function(ei, fi, val) {
        exState[ei].answers[fi] = val;
    };

    window._casCheck = function(ei) {
        exState[ei].checked = true;
        render();
    };

    window._casReset = function(ei) {
        exState[ei].checked = false;
        exState[ei].answers = {};
        render();
    };

    render();
}
