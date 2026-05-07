/* ═══════════════════════════════════════════════
   References — Courses (Leçons IFRS / RPC)
   ═══════════════════════════════════════════════ */

async function renderCourses(container) {
    container.innerHTML = '<div class="text-center" style="padding:60px"><div class="page-title">Chargement des leçons...</div></div>';

    const ifrsData = await api('get_references', 'courses_ifrs');
    const rpcData = await api('get_references', 'courses_rpc');

    const ifrs = ifrsData || [];
    const rpc = rpcData || [];

    let activeTab = 'ifrs';

    function render() {
        const courses = activeTab === 'ifrs' ? ifrs : rpc;
        const catLabel = activeTab === 'ifrs' ? 'IFRS / IAS' : 'Swiss GAAP RPC';
        const col = getColor(catLabel);

        container.innerHTML = `
            <div class="ref-section">
                <div class="ref-section-title">Leçons de révision</div>
                <div style="display:flex;gap:8px;margin-bottom:20px;">
                    <button class="btn ${activeTab === 'ifrs' ? 'btn-primary' : ''}"
                            id="coursesTabIfrs"
                            style="${activeTab !== 'ifrs' ? 'background:#1e293b;color:#94a3b8;border:1px solid #334155' : ''}"
                            onclick="window._coursesSetTab('ifrs')">
                        IFRS / IAS
                    </button>
                    <button class="btn ${activeTab === 'rpc' ? 'btn-primary' : ''}"
                            id="coursesTabRpc"
                            style="${activeTab !== 'rpc' ? 'background:#1e293b;color:#94a3b8;border:1px solid #334155' : ''}"
                            onclick="window._coursesSetTab('rpc')">
                        Swiss GAAP RPC
                    </button>
                </div>
                <div id="coursesList">
                    ${courses.length === 0
                        ? '<p style="color:#94a3b8">Aucune leçon disponible.</p>'
                        : courses.map((course, ci) => `
                            <div class="card" style="margin-bottom:16px;border-left:3px solid ${col.accent}">
                                <div style="padding:16px">
                                    <div style="font-size:16px;font-weight:600;color:#f1f5f9">${escapeHtml(course.title)}</div>
                                    ${course.subtitle ? `<div style="font-size:13px;color:#94a3b8;margin-top:4px">${escapeHtml(course.subtitle)}</div>` : ''}
                                </div>
                                <div style="border-top:1px solid #1e293b">
                                    ${(course.sections || []).map((sec, si) => `
                                        <div class="ref-item" id="course-${ci}-${si}">
                                            <div class="ref-item-title" onclick="toggleRefItem('course-${ci}-${si}')">
                                                <span>${escapeHtml(sec.t)}</span>
                                                <span style="font-size:12px;color:#64748b;transition:transform 0.2s">▼</span>
                                            </div>
                                            <div class="ref-item-content">
                                                ${formatAnswer(sec.c)}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }

    window._coursesSetTab = function(tab) {
        activeTab = tab;
        render();
    };

    render();
}

function toggleRefItem(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('expanded');
}
