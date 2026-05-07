/* ═══════════════════════════════════════════════
   References — Glossary (Vocabulaire FR/EN)
   ═══════════════════════════════════════════════ */

async function renderGlossary(container) {
    container.innerHTML = '<div class="text-center" style="padding:60px"><div class="page-title">Chargement du vocabulaire...</div></div>';

    const data = await api('get_references', 'anglais');
    const entries = data || [];

    let searchTerm = '';

    function render() {
        const lower = searchTerm.toLowerCase();

        container.innerHTML = `
            <div class="ref-section">
                <div class="ref-section-title">Vocabulaire comptable FR / EN</div>
                <div style="margin-bottom:20px">
                    <input type="text" id="glossarySearch"
                           placeholder="Rechercher un terme..."
                           value="${escapeHtml(searchTerm)}"
                           oninput="window._glossarySearch(this.value)"
                           style="width:100%;max-width:400px;padding:10px 14px;background:#1e293b;border:1px solid #334155;
                                  border-radius:8px;color:#f1f5f9;font-size:14px;outline:none;">
                </div>
                <div class="glossary-table">
                    <table style="width:100%;border-collapse:collapse">
                        <thead>
                            <tr>
                                <th style="text-align:left;padding:10px 12px;color:#94a3b8;font-size:13px;border-bottom:1px solid #334155">Français</th>
                                <th style="text-align:left;padding:10px 12px;color:#94a3b8;font-size:13px;border-bottom:1px solid #334155">English</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${entries.map(entry => {
                                const col = getColor(entry.cat);
                                const filtered = (entry.terms || []).filter(pair =>
                                    !lower || pair[0].toLowerCase().includes(lower) || pair[1].toLowerCase().includes(lower)
                                );
                                if (filtered.length === 0) return '';
                                return `
                                    <tr>
                                        <td colspan="2" style="padding:10px 12px;background:${col.bg};color:${col.accent};
                                            font-weight:600;font-size:13px;border-bottom:1px solid #334155">
                                            ${escapeHtml(entry.cat)}
                                        </td>
                                    </tr>
                                    ${filtered.map(pair => `
                                        <tr>
                                            <td style="padding:8px 12px;color:#e2e8f0;font-size:14px;border-bottom:1px solid #1e293b">
                                                ${escapeHtml(pair[0])}
                                            </td>
                                            <td style="padding:8px 12px;color:#cbd5e1;font-size:14px;border-bottom:1px solid #1e293b">
                                                ${escapeHtml(pair[1])}
                                            </td>
                                        </tr>
                                    `).join('')}
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        const input = document.getElementById('glossarySearch');
        if (input) input.focus();
    }

    window._glossarySearch = function(val) {
        searchTerm = val;
        render();
    };

    render();
}
