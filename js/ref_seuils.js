/* ═══════════════════════════════════════════════
   References — Seuils (Thresholds)
   ═══════════════════════════════════════════════ */

async function renderSeuils(container) {
    container.innerHTML = '<div class="text-center" style="padding:60px"><div class="page-title">Chargement des seuils...</div></div>';

    const data = await api('get_references', 'seuils');
    const sections = data || [];

    container.innerHTML = `
        <div class="ref-section">
            <div class="ref-section-title">Seuils et valeurs clés</div>
            ${sections.length === 0
                ? '<p style="color:#94a3b8">Aucun seuil disponible.</p>'
                : sections.map(section => {
                    const col = getColor(section.cat);
                    return `
                        <div class="card" style="margin-bottom:16px;border-left:3px solid ${col.accent}">
                            <div style="padding:12px 16px;font-size:14px;font-weight:600;color:${col.accent};border-bottom:1px solid #1e293b">
                                ${escapeHtml(section.cat)}
                            </div>
                            <div style="padding:8px 0">
                                ${(section.items || []).map(item => `
                                    <div class="seuil-row" style="display:flex;align-items:baseline;justify-content:space-between;padding:8px 16px;border-bottom:1px solid #0f172a">
                                        <div>
                                            <span class="seuil-label" style="color:#e2e8f0;font-size:14px">${escapeHtml(item.label)}</span>
                                            ${item.extra ? `<div class="seuil-extra" style="font-size:12px;color:#64748b;margin-top:2px">${escapeHtml(item.extra)}</div>` : ''}
                                        </div>
                                        <span class="seuil-val" style="color:#fbbf24;font-weight:600;font-size:14px;white-space:nowrap;margin-left:16px">
                                            ${escapeHtml(item.val)}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')
            }
        </div>
    `;
}
