/* ═══════════════════════════════════════════════
   References — Terrain EY (Interactive Checklists)
   ═══════════════════════════════════════════════ */

async function renderTerrain(container) {
    container.innerHTML = '<div class="text-center" style="padding:60px"><div class="page-title">Chargement du terrain...</div></div>';

    const data = await api('get_references', 'terrain');
    const sections = data || [];

    // Track checked items: { 'si-ii': true/false }
    const checked = {};

    function render() {
        let totalItems = 0;
        let checkedCount = 0;
        sections.forEach((s, si) => {
            (s.items || []).forEach((_, ii) => {
                totalItems++;
                if (checked[`${si}-${ii}`]) checkedCount++;
            });
        });

        const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

        container.innerHTML = `
            <div class="ref-section">
                <div class="ref-section-title">Terrain EY — Checklists</div>
                <div style="margin-bottom:20px;padding:14px;background:#0f172a;border-radius:8px;border:1px solid #334155">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                        <span style="color:#94a3b8;font-size:13px">Progression</span>
                        <span style="color:#fbbf24;font-size:13px;font-weight:600">${checkedCount} / ${totalItems} (${pct}%)</span>
                    </div>
                    <div style="width:100%;height:6px;background:#1e293b;border-radius:3px;overflow:hidden">
                        <div style="width:${pct}%;height:100%;background:#fbbf24;border-radius:3px;transition:width 0.3s"></div>
                    </div>
                </div>
                ${sections.length === 0
                    ? '<p style="color:#94a3b8">Aucune checklist disponible.</p>'
                    : sections.map((section, si) => {
                        const col = getColor(section.cat || 'Audit / ISA');
                        return `
                            <div class="card" style="margin-bottom:16px;border-left:3px solid ${col.accent}">
                                <div style="padding:12px 16px;font-size:14px;font-weight:600;color:${col.accent};border-bottom:1px solid #1e293b">
                                    ${escapeHtml(section.cat)}
                                </div>
                                <div style="padding:8px 0">
                                    ${(section.items || []).map((item, ii) => {
                                        const key = `${si}-${ii}`;
                                        const isDone = !!checked[key];
                                        return `
                                            <div class="checklist-item" style="display:flex;align-items:flex-start;gap:12px;padding:10px 16px;
                                                        border-bottom:1px solid #0f172a;cursor:pointer;
                                                        ${isDone ? 'opacity:0.6' : ''}"
                                                 onclick="window._terrainToggle('${key}')">
                                                <div style="flex-shrink:0;width:20px;height:20px;border-radius:4px;margin-top:2px;
                                                            border:2px solid ${isDone ? '#10b981' : '#475569'};
                                                            background:${isDone ? '#065f46' : 'transparent'};
                                                            display:flex;align-items:center;justify-content:center;
                                                            transition:all 0.2s">
                                                    ${isDone ? '<span style="color:#6ee7b7;font-size:13px">&#10003;</span>' : ''}
                                                </div>
                                                <div style="flex:1">
                                                    <div style="color:#e2e8f0;font-size:14px;font-weight:500;
                                                                ${isDone ? 'text-decoration:line-through;color:#64748b' : ''}">
                                                        ${escapeHtml(item.t)}
                                                    </div>
                                                    ${item.c ? `
                                                        <div style="color:#94a3b8;font-size:13px;margin-top:4px;line-height:1.5;
                                                                    ${isDone ? 'color:#475569' : ''}">
                                                            ${formatAnswer(item.c)}
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
        `;
    }

    window._terrainToggle = function(key) {
        checked[key] = !checked[key];
        render();
    };

    render();
}
