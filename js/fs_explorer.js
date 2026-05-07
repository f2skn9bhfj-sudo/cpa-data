/* ═══════════════════════════════════════════════
   Financial Statements Explorer
   Interactive IFRS financial statements browser
   ═══════════════════════════════════════════════ */

let fsData = null;
let fsSelectedStatement = null;
let fsSelectedItem = null;
let fsSelectedNote = null;
let fsShowNotes = false;

// ── Main render ──

async function renderFsExplorer(container) {
    fsSelectedStatement = null;
    fsSelectedItem = null;
    fsSelectedNote = null;
    fsShowNotes = false;

    const data = await api('get_financial_statements');
    fsData = data;

    if (!fsData || !fsData.statements || fsData.statements.length === 0) {
        container.innerHTML = `
        <div class="fs-loading fade-in">
            <div style="font-size:40px;opacity:0.3;margin-bottom:12px">📊</div>
            <div style="color:var(--text-secondary);font-size:15px">Chargement des états financiers...</div>
        </div>
        ${getFsStyles()}`;
        return;
    }

    // Default to first statement
    fsSelectedStatement = fsData.statements[0].id;

    container.innerHTML = `
    <div class="fs-page fade-in">
        <div class="fs-layout">
            <div class="fs-left" id="fsLeft"></div>
            <div class="fs-right" id="fsRight">
                <div class="fs-empty-state">
                    <div style="font-size:48px;opacity:0.2;margin-bottom:12px">📊</div>
                    <div style="color:var(--text-secondary)">Sélectionnez un poste dans les états financiers</div>
                    <div style="color:var(--text-muted);font-size:12px;margin-top:6px">Cliquez sur une ligne pour voir le détail IFRS</div>
                </div>
            </div>
        </div>
    </div>
    ${getFsStyles()}`;

    renderFsLeft();
}

// ── Left panel ──

function renderFsLeft() {
    const el = document.getElementById('fsLeft');
    if (!el) return;

    const statements = fsData.statements || [];

    el.innerHTML = `
        <div class="fs-tabs">
            ${statements.map(s => `
                <button class="fs-tab-btn ${fsSelectedStatement === s.id ? 'active' : ''}"
                        onclick="fsSelectStatement('${escapeAttr(s.id)}')"
                        title="${escapeAttr(s.title)}">
                    <span class="fs-tab-icon">${s.icon || '📄'}</span>
                    <span class="fs-tab-label">${escapeHtml(s.title)}</span>
                </button>
            `).join('')}
            <div class="fs-tab-divider"></div>
            <button class="fs-tab-btn fs-tab-notes ${fsShowNotes ? 'active' : ''}"
                    onclick="fsToggleNotes()">
                <span class="fs-tab-icon">📝</span>
                <span class="fs-tab-label">Notes annexes</span>
            </button>
        </div>
        <div class="fs-tree-container" id="fsTreeContainer">
            ${fsShowNotes ? renderFsNotesList() : renderFsTree()}
        </div>
    `;
}

function renderFsTree() {
    const stmt = (fsData.statements || []).find(s => s.id === fsSelectedStatement);
    if (!stmt) return '<div class="fs-tree-empty">Aucun état sélectionné</div>';

    const sections = stmt.sections || [];
    if (sections.length === 0) return '<div class="fs-tree-empty">Aucune section</div>';

    return `
        <div class="fs-stmt-header">
            <span class="fs-stmt-icon">${stmt.icon || '📄'}</span>
            <span class="fs-stmt-title">${escapeHtml(stmt.title)}</span>
        </div>
        <div class="fs-tree-header-row">
            <span class="fs-tree-header-label"></span>
            <span class="fs-tree-header-year">2025</span>
            <span class="fs-tree-header-year">2024</span>
        </div>
        ${sections.map(sec => renderFsSection(sec)).join('')}
    `;
}

function renderFsSection(section) {
    const items = section.items || [];
    return `
        <div class="fs-section">
            <div class="fs-section-header">${escapeHtml(section.title)}</div>
            ${items.map(item => renderFsLineItem(item, section)).join('')}
        </div>
    `;
}

function renderFsLineItem(item, section) {
    const isSelected = fsSelectedItem && fsSelectedItem.id === item.id;
    const isSubtotal = (item.is_subtotal === true) ||
                       (item.label && (item.label.startsWith('Total') || item.label.startsWith('TOTAL')));
    const amt25 = item.amount_2025 || '–';
    const amt24 = item.amount_2024 || '–';
    const isNegative25 = amt25.includes('(') || (typeof amt25 === 'string' && amt25.startsWith('-'));
    const isNegative24 = amt24.includes('(') || (typeof amt24 === 'string' && amt24.startsWith('-'));

    return `
        <div class="fs-line-item ${isSelected ? 'fs-line-selected' : ''} ${isSubtotal ? 'fs-line-subtotal' : ''}"
             onclick="fsSelectItem('${escapeAttr(section.id)}', '${escapeAttr(item.id)}')"
             title="${escapeAttr(item.label)}">
            <span class="fs-line-label">${escapeHtml(item.label)}</span>
            <span class="fs-line-amount ${isNegative25 ? 'fs-amount-negative' : ''}">${escapeHtml(amt25)}</span>
            <span class="fs-line-amount ${isNegative24 ? 'fs-amount-negative' : ''}">${escapeHtml(amt24)}</span>
        </div>
    `;
}

// ── Notes list ──

function renderFsNotesList() {
    const notes = fsData.notes || [];
    if (notes.length === 0) return '<div class="fs-tree-empty">Aucune note disponible</div>';

    return `
        <div class="fs-stmt-header">
            <span class="fs-stmt-icon">📝</span>
            <span class="fs-stmt-title">Notes aux états financiers</span>
        </div>
        <div class="fs-notes-list">
            ${notes.map(note => `
                <div class="fs-note-item ${fsSelectedNote && fsSelectedNote.id === note.id ? 'fs-note-selected' : ''}"
                     onclick="fsSelectNote('${escapeAttr(note.id)}')">
                    <span class="fs-note-number">Note ${note.number}</span>
                    <span class="fs-note-title">${escapeHtml(note.title)}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// ── Right panel: item detail ──

function renderFsDetail() {
    const el = document.getElementById('fsRight');
    if (!el) return;

    if (fsShowNotes && fsSelectedNote) {
        renderFsNoteDetail(el);
        return;
    }

    if (!fsSelectedItem) {
        el.innerHTML = `
            <div class="fs-empty-state">
                <div style="font-size:48px;opacity:0.2;margin-bottom:12px">📊</div>
                <div style="color:var(--text-secondary)">Sélectionnez un poste dans les états financiers</div>
                <div style="color:var(--text-muted);font-size:12px;margin-top:6px">Cliquez sur une ligne pour voir le détail IFRS</div>
            </div>`;
        return;
    }

    const item = fsSelectedItem;
    const norms = item.norms || [];
    const keyPoints = item.key_points || [];
    const examTips = item.exam_tips || [];
    const comparison = item.comparison || {};
    const crossRefs = item.cross_refs || [];

    el.innerHTML = `
    <div class="fs-detail fade-in">
        <!-- Header -->
        <div class="fs-detail-header">
            <div class="fs-detail-title-row">
                <h2 class="fs-detail-title">${escapeHtml(item.label)}</h2>
                ${item.note_ref ? `<span class="fs-detail-note-ref" onclick="fsJumpToNote('${escapeAttr(item.note_ref)}')" title="Voir la note">${escapeHtml(item.note_ref)}</span>` : ''}
            </div>
            <div class="fs-detail-amounts">
                <div class="fs-detail-amount-box">
                    <span class="fs-detail-amount-label">2025</span>
                    <span class="fs-detail-amount-value">${escapeHtml(item.amount_2025 || '–')}</span>
                </div>
                <div class="fs-detail-amount-box">
                    <span class="fs-detail-amount-label">2024</span>
                    <span class="fs-detail-amount-value">${escapeHtml(item.amount_2024 || '–')}</span>
                </div>
            </div>
            <div class="fs-detail-norms">
                ${norms.map(n => `<span class="fs-norm-chip">${escapeHtml(n)}</span>`).join('')}
            </div>
        </div>

        <!-- Definition -->
        ${item.definition ? `
        <div class="fs-card fs-card-definition">
            <div class="fs-card-label">📖 Définition</div>
            <div class="fs-card-body">${formatAnswer(escapeHtml(item.definition))}</div>
        </div>` : ''}

        <!-- Accounting method -->
        ${item.accounting_method ? `
        <div class="fs-card fs-card-method">
            <div class="fs-card-label">📐 Méthode comptable IFRS</div>
            <div class="fs-card-body">${formatAnswer(escapeHtml(item.accounting_method))}</div>
        </div>` : ''}

        <!-- Key points -->
        ${keyPoints.length > 0 ? `
        <div class="fs-card fs-card-keypoints">
            <div class="fs-card-label">🔑 Points clés</div>
            <ul class="fs-key-list">
                ${keyPoints.map(p => {
                    const isWarning = p.startsWith('⚠️');
                    const isTip = p.startsWith('💡');
                    const cls = isWarning ? 'fs-kp-warning' : isTip ? 'fs-kp-tip' : '';
                    return `<li class="${cls}">${formatAnswer(escapeHtml(p))}</li>`;
                }).join('')}
            </ul>
        </div>` : ''}

        <!-- Comparison -->
        ${(comparison.ifrs || comparison.rpc || comparison.co) ? `
        <div class="fs-card fs-card-comparison">
            <div class="fs-card-label">⚖️ Comparaison IFRS / RPC / CO</div>
            <div class="fs-comp-grid">
                <div class="fs-comp-col fs-comp-ifrs">
                    <div class="fs-comp-header">IFRS</div>
                    <div class="fs-comp-body">${comparison.ifrs ? formatAnswer(escapeHtml(comparison.ifrs)) : '<span class="fs-comp-na">–</span>'}</div>
                </div>
                <div class="fs-comp-col fs-comp-rpc">
                    <div class="fs-comp-header">RPC</div>
                    <div class="fs-comp-body">${comparison.rpc ? formatAnswer(escapeHtml(comparison.rpc)) : '<span class="fs-comp-na">–</span>'}</div>
                </div>
                <div class="fs-comp-col fs-comp-co">
                    <div class="fs-comp-header">CO</div>
                    <div class="fs-comp-body">${comparison.co ? formatAnswer(escapeHtml(comparison.co)) : '<span class="fs-comp-na">–</span>'}</div>
                </div>
            </div>
        </div>` : ''}

        <!-- Exam tips -->
        ${examTips.length > 0 ? `
        <div class="fs-card fs-card-exam">
            <div class="fs-card-label">🎯 Astuces d'examen</div>
            <div class="fs-exam-tips">
                ${examTips.map(tip => {
                    const isWarning = tip.startsWith('⚠️');
                    return `<div class="fs-exam-tip ${isWarning ? 'fs-exam-warning' : ''}">${formatAnswer(escapeHtml(tip))}</div>`;
                }).join('')}
            </div>
        </div>` : ''}

        <!-- Note summary -->
        ${item.note_content ? `
        <div class="fs-card fs-card-note">
            <div class="fs-note-toggle" onclick="fsToggleNoteContent(this)">
                <span class="fs-card-label" style="margin-bottom:0">📋 Résumé de la note</span>
                <span class="fs-note-chevron">▸</span>
            </div>
            <div class="fs-note-body" style="display:none">
                <div class="fs-note-content">${formatAnswer(escapeHtml(item.note_content))}</div>
            </div>
        </div>` : ''}

        <!-- Cross-references -->
        ${crossRefs.length > 0 ? `
        <div class="fs-card fs-card-crossrefs">
            <div class="fs-card-label">📚 Références croisées</div>
            <div class="fs-crossref-chips">
                ${crossRefs.map(ref => `
                    <button class="fs-crossref-chip" onclick="navigate('norms')" title="Voir dans l'onglet Normes">
                        ${escapeHtml(ref)}
                    </button>
                `).join('')}
            </div>
        </div>` : ''}
    </div>`;
}

// ── Right panel: note detail ──

function renderFsNoteDetail(el) {
    const note = fsSelectedNote;
    if (!note) return;

    const subsections = note.subsections || [];

    el.innerHTML = `
    <div class="fs-detail fade-in">
        <div class="fs-detail-header">
            <h2 class="fs-detail-title">Note ${note.number} — ${escapeHtml(note.title)}</h2>
        </div>

        ${subsections.length > 0 ? subsections.map(sub => `
            <div class="fs-card">
                ${sub.title ? `<div class="fs-card-label">${escapeHtml(sub.title)}</div>` : ''}
                <div class="fs-card-body">${formatAnswer(escapeHtml(sub.content || ''))}</div>
            </div>
        `).join('') : note.content ? `
            <div class="fs-card">
                <div class="fs-card-body">${formatAnswer(escapeHtml(note.content))}</div>
            </div>
        ` : `
            <div class="fs-card">
                <div class="fs-card-body" style="color:var(--text-muted)">Contenu de la note non disponible.</div>
            </div>
        `}
    </div>`;
}

// ── Event handlers ──

function fsSelectStatement(stmtId) {
    fsSelectedStatement = stmtId;
    fsShowNotes = false;
    fsSelectedNote = null;
    renderFsLeft();
}

function fsSelectItem(sectionId, itemId) {
    if (!fsData) return;
    const stmt = (fsData.statements || []).find(s => s.id === fsSelectedStatement);
    if (!stmt) return;

    for (const sec of (stmt.sections || [])) {
        if (sec.id === sectionId) {
            const item = (sec.items || []).find(i => i.id === itemId);
            if (item) {
                fsSelectedItem = item;
                fsSelectedNote = null;
                fsShowNotes = false;
                renderFsLeft();
                renderFsDetail();
                return;
            }
        }
    }

    // Fallback: search all sections
    for (const sec of (stmt.sections || [])) {
        const item = (sec.items || []).find(i => i.id === itemId);
        if (item) {
            fsSelectedItem = item;
            fsSelectedNote = null;
            fsShowNotes = false;
            renderFsLeft();
            renderFsDetail();
            return;
        }
    }
}

function fsToggleNotes() {
    fsShowNotes = !fsShowNotes;
    if (fsShowNotes) {
        fsSelectedItem = null;
    } else {
        fsSelectedNote = null;
    }
    renderFsLeft();
    renderFsDetail();
}

function fsSelectNote(noteId) {
    const note = (fsData.notes || []).find(n => n.id === noteId);
    if (note) {
        fsSelectedNote = note;
        fsSelectedItem = null;
        renderFsLeft();
        renderFsDetail();
    }
}

function fsJumpToNote(noteRef) {
    // noteRef looks like "Note 10" — extract the number
    const match = noteRef.match(/(\d+)/);
    if (!match) return;
    const num = parseInt(match[1]);
    const note = (fsData.notes || []).find(n => n.number === num);
    if (note) {
        fsShowNotes = true;
        fsSelectedNote = note;
        fsSelectedItem = null;
        renderFsLeft();
        renderFsDetail();
    }
}

function fsToggleNoteContent(toggle) {
    const body = toggle.nextElementSibling;
    const chevron = toggle.querySelector('.fs-note-chevron');
    if (body.style.display === 'none') {
        body.style.display = 'block';
        chevron.textContent = '▾';
    } else {
        body.style.display = 'none';
        chevron.textContent = '▸';
    }
}

// ── Styles ──

function getFsStyles() {
    return `<style>
/* ── Layout ── */
.fs-loading {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 80px 20px; text-align: center;
}
.fs-page { height: calc(100vh - 60px); overflow: hidden; }
.fs-layout {
    display: flex; height: 100%; gap: 0;
}
.fs-left {
    width: 380px; min-width: 380px; max-width: 380px;
    background: var(--bg-secondary); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; overflow: hidden;
}
.fs-right {
    flex: 1; overflow-y: auto; padding: 24px 32px;
    background: var(--bg-primary);
}
.fs-empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; text-align: center; padding: 40px;
}

/* ── Statement tabs ── */
.fs-tabs {
    display: flex; flex-direction: column; gap: 2px;
    padding: 12px 10px; border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}
.fs-tab-btn {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border: none; border-radius: 8px;
    background: transparent; color: var(--text-secondary);
    cursor: pointer; font-size: 13px; text-align: left;
    transition: all 0.15s; width: 100%;
    word-wrap: break-word; overflow-wrap: break-word;
}
.fs-tab-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.fs-tab-btn.active {
    background: rgba(96, 165, 250, 0.12); color: var(--accent-blue);
    font-weight: 600;
}
.fs-tab-icon { font-size: 18px; flex-shrink: 0; }
.fs-tab-label { line-height: 1.3; }
.fs-tab-divider {
    height: 1px; background: var(--border); margin: 6px 0;
}
.fs-tab-notes.active { background: rgba(96, 165, 250, 0.12); color: var(--accent-blue); font-weight: 600; }

/* ── Tree container ── */
.fs-tree-container {
    flex: 1; overflow-y: auto; padding: 0;
}
.fs-tree-empty {
    padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;
}

/* ── Statement header in tree ── */
.fs-stmt-header {
    display: flex; align-items: center; gap: 8px;
    padding: 14px 16px 8px; font-size: 14px; font-weight: 700;
    color: var(--text-primary); position: sticky; top: 0;
    background: var(--bg-secondary); z-index: 2;
    word-wrap: break-word; overflow-wrap: break-word;
}
.fs-stmt-icon { font-size: 20px; flex-shrink: 0; }
.fs-stmt-title { line-height: 1.3; }

/* ── Year header row ── */
.fs-tree-header-row {
    display: flex; align-items: center;
    padding: 4px 16px 6px; font-size: 11px;
    color: var(--text-muted); font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
    position: sticky; top: 44px; background: var(--bg-secondary); z-index: 1;
}
.fs-tree-header-label { flex: 1; }
.fs-tree-header-year {
    width: 70px; text-align: right; flex-shrink: 0;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
}

/* ── Section ── */
.fs-section { margin-bottom: 4px; }
.fs-section-header {
    padding: 10px 16px 4px;
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.6px; color: var(--accent-blue);
    border-left: 3px solid var(--accent-blue);
    margin: 8px 8px 2px 8px; padding-left: 12px;
    word-wrap: break-word; overflow-wrap: break-word;
}

/* ── Line items ── */
.fs-line-item {
    display: flex; align-items: baseline;
    padding: 6px 16px 6px 28px; cursor: pointer;
    transition: background 0.1s; font-size: 13px;
    border-left: 3px solid transparent; margin: 0 8px;
    word-wrap: break-word; overflow-wrap: break-word;
}
.fs-line-item:hover { background: rgba(96, 165, 250, 0.06); }
.fs-line-selected {
    background: rgba(96, 165, 250, 0.1);
    border-left-color: var(--accent-blue);
}
.fs-line-subtotal {
    font-weight: 700; border-top: 1px solid var(--border);
    padding-top: 8px; margin-top: 2px;
}
.fs-line-label {
    flex: 1; color: var(--text-bright); line-height: 1.4;
    min-width: 0; word-wrap: break-word; overflow-wrap: break-word;
}
.fs-line-amount {
    width: 70px; text-align: right; flex-shrink: 0;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 12px; color: var(--text-secondary);
    padding-left: 8px;
}
.fs-amount-negative { color: #f87171; }
.fs-line-subtotal .fs-line-label { color: var(--text-primary); }
.fs-line-subtotal .fs-line-amount { color: var(--text-primary); font-weight: 700; }

/* ── Notes list ── */
.fs-notes-list { padding: 4px 0; }
.fs-note-item {
    display: flex; align-items: baseline; gap: 10px;
    padding: 8px 16px; cursor: pointer; transition: background 0.1s;
    border-left: 3px solid transparent; margin: 0 8px;
    word-wrap: break-word; overflow-wrap: break-word;
}
.fs-note-item:hover { background: rgba(96, 165, 250, 0.06); }
.fs-note-selected {
    background: rgba(96, 165, 250, 0.1);
    border-left-color: var(--accent-blue);
}
.fs-note-number {
    font-size: 11px; font-weight: 700; color: var(--accent-blue);
    white-space: nowrap; flex-shrink: 0;
}
.fs-note-title {
    font-size: 13px; color: var(--text-bright); line-height: 1.4;
    word-wrap: break-word; overflow-wrap: break-word;
}

/* ── Detail panel ── */
.fs-detail { max-width: 860px; }
.fs-detail-header {
    margin-bottom: 24px; padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
}
.fs-detail-title-row {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 12px; flex-wrap: wrap;
}
.fs-detail-title {
    font-size: 22px; font-weight: 700; color: var(--text-primary);
    margin: 0; line-height: 1.3;
    word-wrap: break-word; overflow-wrap: break-word;
}
.fs-detail-note-ref {
    font-size: 12px; padding: 4px 12px; border-radius: 20px;
    background: rgba(96, 165, 250, 0.12); color: var(--accent-blue);
    cursor: pointer; white-space: nowrap; font-weight: 600;
    transition: background 0.15s; flex-shrink: 0;
}
.fs-detail-note-ref:hover { background: rgba(96, 165, 250, 0.2); }
.fs-detail-amounts {
    display: flex; gap: 12px; margin-top: 14px;
}
.fs-detail-amount-box {
    background: var(--bg-secondary); border: 1px solid var(--border);
    border-radius: 10px; padding: 12px 20px; text-align: center;
    min-width: 120px;
}
.fs-detail-amount-label {
    display: block; font-size: 11px; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;
}
.fs-detail-amount-value {
    display: block; font-size: 20px; font-weight: 700;
    color: var(--text-primary);
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
}
.fs-detail-norms {
    display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px;
}
.fs-norm-chip {
    font-size: 11px; padding: 3px 10px; border-radius: 12px;
    background: rgba(56, 161, 105, 0.15); color: #68d391;
    font-weight: 600;
}

/* ── Cards ── */
.fs-card {
    background: var(--bg-secondary); border: 1px solid var(--border);
    border-radius: 12px; padding: 18px 20px; margin-bottom: 16px;
    word-wrap: break-word; overflow-wrap: break-word;
}
.fs-card-label {
    font-size: 13px; font-weight: 700; color: var(--text-secondary);
    margin-bottom: 10px; letter-spacing: 0.2px;
}
.fs-card-body {
    font-size: 14px; line-height: 1.65; color: var(--text-bright);
    word-wrap: break-word; overflow-wrap: break-word;
}
.fs-card-definition { border-left: 3px solid var(--accent-blue); }
.fs-card-method { border-left: 3px solid #38a169; }
.fs-card-keypoints { border-left: 3px solid #ecc94b; }
.fs-card-exam { border-left: 3px solid #f6ad55; }
.fs-card-note { border-left: 3px solid #a78bfa; }
.fs-card-crossrefs { border-left: 3px solid #94a3b8; }

/* ── Key points list ── */
.fs-key-list {
    list-style: none; padding: 0; margin: 0;
}
.fs-key-list li {
    padding: 8px 12px; margin-bottom: 6px;
    border-radius: 8px; font-size: 13px; line-height: 1.55;
    color: var(--text-bright); background: var(--bg-tertiary);
    word-wrap: break-word; overflow-wrap: break-word;
}
.fs-kp-warning { border-left: 3px solid #f87171; background: rgba(248, 113, 113, 0.08); }
.fs-kp-tip { border-left: 3px solid #68d391; background: rgba(104, 211, 145, 0.08); }

/* ── Comparison grid ── */
.fs-comp-grid {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;
}
.fs-comp-col {
    border-radius: 10px; overflow: hidden;
    border: 1px solid var(--border);
}
.fs-comp-header {
    padding: 8px 14px; font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px;
    text-align: center; color: #fff;
}
.fs-comp-ifrs .fs-comp-header { background: #38a169; }
.fs-comp-rpc .fs-comp-header { background: #3182ce; }
.fs-comp-co .fs-comp-header { background: #b45309; }
.fs-comp-body {
    padding: 12px 14px; font-size: 13px; line-height: 1.55;
    color: var(--text-bright); background: var(--bg-tertiary);
    min-height: 60px; word-wrap: break-word; overflow-wrap: break-word;
}
.fs-comp-na { color: var(--text-muted); font-style: italic; }

/* ── Exam tips ── */
.fs-exam-tips { display: flex; flex-direction: column; gap: 8px; }
.fs-exam-tip {
    padding: 10px 14px; border-radius: 8px;
    background: var(--bg-tertiary); font-size: 13px;
    line-height: 1.55; color: var(--text-bright);
    word-wrap: break-word; overflow-wrap: break-word;
}
.fs-exam-warning {
    border-left: 3px solid #f6ad55;
    background: rgba(246, 173, 85, 0.08);
}

/* ── Note expandable ── */
.fs-note-toggle {
    display: flex; align-items: center; justify-content: space-between;
    cursor: pointer; user-select: none;
}
.fs-note-toggle:hover .fs-card-label { color: var(--text-primary); }
.fs-note-chevron {
    font-size: 14px; color: var(--text-muted); transition: transform 0.15s;
}
.fs-note-body { padding-top: 12px; }
.fs-note-content {
    font-size: 13px; line-height: 1.6; color: var(--text-bright);
    word-wrap: break-word; overflow-wrap: break-word;
}

/* ── Cross-ref chips ── */
.fs-crossref-chips {
    display: flex; flex-wrap: wrap; gap: 8px;
}
.fs-crossref-chip {
    padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border);
    background: var(--bg-tertiary); color: var(--text-secondary);
    cursor: pointer; font-size: 12px; font-weight: 600;
    transition: all 0.15s;
}
.fs-crossref-chip:hover {
    border-color: var(--accent-blue); color: var(--accent-blue);
    background: rgba(96, 165, 250, 0.1);
}

/* ── Responsive ── */
@media (max-width: 900px) {
    .fs-layout { flex-direction: column; }
    .fs-left { width: 100%; min-width: 100%; max-width: 100%; max-height: 45vh; }
    .fs-right { padding: 16px; }
    .fs-comp-grid { grid-template-columns: 1fr; }
    .fs-detail-amounts { flex-wrap: wrap; }
}

/* ── Animations ── */
.fs-detail.fade-in {
    animation: fsFadeIn 0.2s ease-out;
}
@keyframes fsFadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>`;
}
