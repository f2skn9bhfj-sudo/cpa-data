/* ═══════════════════════════════════════════════
   Normes IFRS & Swiss GAAP RPC
   Clean norm-by-norm revision tracking
   ═══════════════════════════════════════════════ */

let normsData = [];
let normsEnrich = {};
let normsFilter = { category: null, search: '' };
let selectedNormId = null;

async function renderNorms(container) {
    // Load norms + enrichment + progress in parallel
    const [data, enrichData, progress] = await Promise.all([
        api('get_norms_data'),
        api('get_norms_enrichment'),
        api('get_norms')
    ]);

    normsData = (data && data.norms) ? data.norms : [];
    normsEnrich = (enrichData && enrichData.enrichments) ? enrichData.enrichments : {};

    // Merge progress
    const progressMap = {};
    (progress || []).forEach(p => { progressMap[p.norm_code] = p; });
    normsData.forEach(n => {
        const p = progressMap[n.code] || {};
        n.confidence = p.confidence_level || 0;
        n.last_revised = p.last_revised || null;
        n.revision_count = p.revision_count || 0;
        // Merge enrichment
        const e = normsEnrich[n.id] || {};
        if (e.summary) n.summary = e.summary;
        if (e.exam_tips) n.exam_tips = e.exam_tips;
        if (e.key_differences) n.key_differences = e.key_differences;
        if (e.mnemonics) n.mnemonics = e.mnemonics;
        if (e.related_topics) n.related_topics = e.related_topics;
    });

    // Sort: RPC by number, IFRS by number
    normsData.sort((a, b) => {
        if (a.category !== b.category) return a.category < b.category ? 1 : -1; // IFRS first
        const numA = parseInt((a.code.match(/\d+/) || ['0'])[0]);
        const numB = parseInt((b.code.match(/\d+/) || ['0'])[0]);
        return numA - numB;
    });

    const rpcCount = normsData.filter(n => n.category === 'Swiss GAAP RPC').length;
    const ifrsCount = normsData.filter(n => n.category === 'IFRS / IAS').length;
    const coCount = normsData.filter(n => n.category === 'CO').length;

    container.innerHTML = `
    <div class="n-page fade-in">
        <!-- Header -->
        <div class="n-topbar">
            <div class="n-title-area">
                <h1 class="page-title" style="font-size:24px;margin-bottom:2px">Normes comptables</h1>
                <span class="n-subtitle">${ifrsCount} IFRS/IAS · ${rpcCount} Swiss GAAP RPC · ${coCount} CO · ${normsData.reduce((s,n) => s + (n.flashcard_ids||[]).length, 0)} flashcards</span>
            </div>
            <div class="n-filters">
                <button class="n-pill ${!normsFilter.category ? 'active' : ''}" onclick="nFilter(null)">Toutes</button>
                <button class="n-pill n-pill-ifrs ${normsFilter.category === 'IFRS / IAS' ? 'active' : ''}" onclick="nFilter('IFRS / IAS')">IFRS / IAS</button>
                <button class="n-pill n-pill-rpc ${normsFilter.category === 'Swiss GAAP RPC' ? 'active' : ''}" onclick="nFilter('Swiss GAAP RPC')">Swiss GAAP RPC</button>
                <button class="n-pill n-pill-co ${normsFilter.category === 'CO' ? 'active' : ''}" onclick="nFilter('CO')">Code des Obligations</button>
                <input type="text" class="n-search" placeholder="Rechercher..." oninput="nSearch(this.value)" value="${normsFilter.search}" />
            </div>
        </div>

        <!-- Layout -->
        <div class="n-layout">
            <div class="n-sidebar" id="nSidebar"></div>
            <div class="n-main" id="nMain">
                <div class="n-empty">
                    <div style="font-size:40px;opacity:0.25;margin-bottom:10px">📖</div>
                    <div>Sélectionnez une norme dans la liste</div>
                </div>
            </div>
        </div>
    </div>`;

    renderSidebar();
    // Auto-select first norm
    if (normsData.length > 0 && !selectedNormId) {
        selectNorm(normsData[0].id);
    }
}

// ── Filters ──

function nFilter(cat) {
    normsFilter.category = cat;
    renderSidebar();
    // Update pills
    document.querySelectorAll('.n-pill').forEach(p => p.classList.remove('active'));
    event.target.classList.add('active');
}

function nSearch(val) {
    normsFilter.search = val.toLowerCase();
    renderSidebar();
}

function getFiltered() {
    return normsData.filter(n => {
        if (normsFilter.category && n.category !== normsFilter.category) return false;
        if (normsFilter.search) {
            const t = (n.code + ' ' + (n.title || '') + ' ' + (n.summary || '')).toLowerCase();
            if (!t.includes(normsFilter.search)) return false;
        }
        return true;
    });
}

// ── Sidebar ──

function renderSidebar() {
    const el = document.getElementById('nSidebar');
    if (!el) return;
    const filtered = getFiltered();

    // Group by category
    const groups = {};
    filtered.forEach(n => {
        const cat = n.category || 'Autre';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(n);
    });

    let html = '';
    for (const [cat, norms] of Object.entries(groups)) {
        const isIFRS = cat.includes('IFRS');
        const isCO = cat === 'CO';
        const accent = isCO ? '#b45309' : isIFRS ? '#38a169' : '#3182ce';

        html += `<div class="n-group">
            <div class="n-group-label" style="color:${accent}">${cat}</div>`;

        for (const n of norms) {
            const sel = selectedNormId === n.id;
            const stars = renderMiniStars(n.confidence);
            const dot = n.confidence >= 4 ? '#22c55e' : n.confidence >= 1 ? '#eab308' : '#ef4444';
            const fcCount = (n.flashcard_ids || []).length;

            html += `
            <div class="n-item ${sel ? 'selected' : ''}" data-norm-id="${n.id}" onclick="selectNorm('${n.id}')">
                <div class="n-item-row1">
                    <span class="n-dot" style="background:${dot}"></span>
                    <span class="n-code">${escapeHtml(n.code)}</span>
                    <span class="n-stars">${stars}</span>
                </div>
                <div class="n-item-name">${escapeHtml(stripPrefix(n.title || n.code))}</div>
                <div class="n-item-tags">
                    ${fcCount > 0 ? `<span class="n-tag">🃏 ${fcCount}</span>` : ''}
                    ${n.has_html ? '<span class="n-tag">📄</span>' : ''}
                    ${n.revision_count > 0 ? `<span class="n-tag">×${n.revision_count}</span>` : ''}
                </div>
            </div>`;
        }
        html += `</div>`;
    }

    el.innerHTML = html || '<div style="padding:20px;color:#64748b;text-align:center">Aucun résultat</div>';
}

function stripPrefix(title) {
    // Remove "IAS 16 — " or "RPC 2 — " prefix from title for cleaner display
    return (title || '').replace(/^(?:IAS|IFRS|RPC)\s*\d+\s*[—–-]\s*/i, '');
}

function renderMiniStars(level) {
    let s = '';
    for (let i = 1; i <= 5; i++) {
        s += `<span style="color:${i <= level ? '#fbbf24' : '#334155'};font-size:10px">★</span>`;
    }
    return s;
}

// ── Main Detail ──

function selectNorm(id) {
    selectedNormId = id;
    const n = normsData.find(x => x.id === id);
    if (!n) return;

    // Update sidebar highlight using data attribute
    document.querySelectorAll('.n-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.normId === id);
    });

    // Scroll main panel to top for new norm
    const mainEl = document.getElementById('nMain');
    if (mainEl) mainEl.scrollTop = 0;

    renderDetail(n);
}

function renderDetail(n) {
    const el = document.getElementById('nMain');
    if (!el) return;

    const isIFRS = n.category.includes('IFRS');
    const isCO = n.category === 'CO';
    const accent = isCO ? '#b45309' : isIFRS ? '#38a169' : '#3182ce';
    const accentBg = isCO ? '#78350f' : isIFRS ? '#22543d' : '#1a365d';
    const fcCount = (n.flashcard_ids || []).length;

    let html = `<div class="n-detail fade-in">

    <!-- Header card -->
    <div class="n-header-card" style="border-color:${accent}44;background:linear-gradient(135deg, ${accentBg}66, ${accentBg}22)">
        <div class="n-hc-top">
            <div>
                <div class="n-hc-cat" style="color:${accent}">${n.category}</div>
                <h2 class="n-hc-title">${escapeHtml(n.title || n.code)}</h2>
            </div>
            <div class="n-hc-actions">
                <div class="n-hc-stars">${renderClickableStars(n.id, n.confidence)}</div>
                <button class="btn btn-primary" style="padding:8px 16px;font-size:13px" onclick="markRevised('${n.id}')">
                    ✅ Révisé
                </button>
                ${n.revision_count > 0 ? `<button class="btn btn-outline" style="padding:6px 12px;font-size:12px;color:#ef4444;border-color:#ef444444" onclick="undoRevised('${n.id}')" title="Annuler la dernière révision">
                    ↩ Annuler
                </button>` : ''}
            </div>
        </div>
        ${n.last_revised ? `<div class="n-hc-meta">Dernière révision : ${timeAgo(n.last_revised)} · Révisé ${n.revision_count}× </div>` : '<div class="n-hc-meta">Jamais révisé</div>'}
    </div>`;

    // Summary (from enrichment)
    if (n.summary) {
        html += `<div class="n-card">
            <div class="n-card-label">Résumé</div>
            <div class="n-card-text">${formatAnswer(n.summary)}</div>
        </div>`;
    }

    // Exam tips
    if (n.exam_tips && n.exam_tips.length > 0) {
        html += `<div class="n-card n-card-tips">
            <div class="n-card-label">Points clés examen</div>
            ${n.exam_tips.map(t => `<div class="n-tip">${formatAnswer(t)}</div>`).join('')}
        </div>`;
    }

    // Key differences
    if (n.key_differences) {
        const kd = n.key_differences;
        html += `<div class="n-card">
            <div class="n-card-label">Différences entre référentiels</div>
            <div class="n-diff-grid">
                ${kd.ifrs ? `<div class="n-diff-item n-diff-ifrs"><div class="n-diff-tag">IFRS</div><div class="n-diff-text">${formatAnswer(kd.ifrs)}</div></div>` : ''}
                ${kd.rpc ? `<div class="n-diff-item n-diff-rpc"><div class="n-diff-tag">RPC</div><div class="n-diff-text">${formatAnswer(kd.rpc)}</div></div>` : ''}
                ${kd.co ? `<div class="n-diff-item n-diff-co"><div class="n-diff-tag">CO</div><div class="n-diff-text">${formatAnswer(kd.co)}</div></div>` : ''}
            </div>
        </div>`;
    }

    // Mnemonics
    if (n.mnemonics) {
        html += `<div class="n-card n-card-mnemonic">
            <div class="n-card-label">💡 Astuce mémo</div>
            <div class="n-card-text">${formatAnswer(n.mnemonics)}</div>
        </div>`;
    }

    // Key rules from docx
    if (n.key_rules && n.key_rules.length > 0) {
        html += `<div class="n-card">
            <div class="n-card-label">Règles principales</div>
            ${n.key_rules.slice(0, 10).map(r => `<div class="n-rule">${formatAnswer(r)}</div>`).join('')}
        </div>`;
    }

    // Sections from docx (accordion)
    if (n.sections && n.sections.length > 0) {
        const meaningful = n.sections.filter(s => s.title && s.content && s.content.length > 20);
        if (meaningful.length > 0) {
            html += `<div class="n-card">
                <div class="n-card-label">Contenu détaillé (${meaningful.length} sections)</div>
                <div class="n-accordion">`;
            meaningful.forEach((sec, i) => {
                html += `
                <div class="n-acc-item ${i === 0 ? 'open' : ''}">
                    <div class="n-acc-header" onclick="this.parentElement.classList.toggle('open')">
                        <span>${escapeHtml(sec.title)}</span>
                        <span class="n-acc-chevron">▾</span>
                    </div>
                    <div class="n-acc-body">${formatAnswer(sec.content)}</div>
                </div>`;
            });
            html += `</div></div>`;
        }
    }

    // Memo items
    if (n.memo_items && n.memo_items.length > 0) {
        html += `<div class="n-card">
            <div class="n-card-label">Mémo de révision</div>
            <div class="n-accordion">`;
        n.memo_items.forEach(item => {
            html += `
            <div class="n-acc-item">
                <div class="n-acc-header" onclick="this.parentElement.classList.toggle('open')">
                    <span>${escapeHtml(item.t || '')}</span>
                    <span class="n-acc-chevron">▾</span>
                </div>
                <div class="n-acc-body">${formatAnswer(item.c || '')}</div>
            </div>`;
        });
        html += `</div></div>`;
    }

    // Flashcards
    if (fcCount > 0) {
        html += `<div class="n-card">
            <div class="n-card-label">🃏 Flashcards (${fcCount})</div>
            <div id="nFcList"><div style="color:#64748b;padding:8px">Cliquez pour charger les flashcards...</div></div>
            <button class="btn btn-outline" style="margin-top:8px;width:100%" onclick="loadNormFc('${n.id}')">Afficher les ${fcCount} flashcards</button>
        </div>`;
    }

    // Notion lessons linked to this norm
    html += `<div class="n-card">
        <div class="n-card-label">📚 Leçons Notion liées</div>
        <div id="nLessonsList"><div style="color:#64748b;padding:8px;font-size:13px">Chargement...</div></div>
    </div>`;
    // Load lessons async after render
    setTimeout(() => loadNormLessons(n.code), 50);

    // Cross-references
    if (n.cross_refs && n.cross_refs.length > 0) {
        const related = normsData.filter(r => n.cross_refs.some(ref =>
            r.code.toLowerCase().replace(/\s/g, '') === ref.toLowerCase().replace(/\s/g, '')
        ));
        if (related.length > 0) {
            html += `<div class="n-card">
                <div class="n-card-label">🔗 Normes liées</div>
                <div class="n-related-grid">`;
            related.forEach(r => {
                const rc = r.category.includes('IFRS') ? '#38a169' : '#3182ce';
                html += `
                <div class="n-related-chip" onclick="selectNorm('${r.id}')" style="border-color:${rc}44">
                    <span style="color:${rc};font-weight:700">${escapeHtml(r.code)}</span>
                    <span class="n-related-name">${escapeHtml(stripPrefix(r.title || ''))}</span>
                </div>`;
            });
            html += `</div></div>`;
        }
    }

    // Original docx in light mode (loaded on demand)
    if (n.has_html) {
        html += `<div class="n-card">
            <div class="n-card-label">📄 Fiche originale Word</div>
            <div class="n-docx-toggle">
                <button class="btn btn-outline" style="width:100%" onclick="loadNormHtml('${n.id}')">Charger la fiche Word</button>
            </div>
            <div class="n-docx-wrapper hidden" id="nDocxWrapper">
                <div style="padding:16px;color:#64748b">Chargement...</div>
            </div>
        </div>`;
    }

    html += `</div>`; // close n-detail
    el.innerHTML = html;
    el.scrollTop = 0;
}

async function loadNormHtml(normId) {
    const el = document.getElementById('nDocxWrapper');
    if (!el) return;
    el.classList.remove('hidden');
    el.innerHTML = '<div style="padding:16px;color:#64748b">Chargement de la fiche...</div>';
    const html = await api('get_norm_html', normId);
    if (html) {
        el.innerHTML = `<div class="docx-light-wrapper" style="border-radius:8px;max-height:700px;overflow-y:auto">${html}</div>`;
    } else {
        el.innerHTML = '<div style="padding:16px;color:#ef4444">Impossible de charger la fiche.</div>';
    }
}

async function loadNormFc(normId) {
    const n = normsData.find(x => x.id === normId);
    if (!n) return;
    const allCards = await api('get_flashcards');
    if (!allCards) return;

    const ids = new Set(n.flashcard_ids || []);
    const cards = allCards.filter(c => ids.has(c.id));
    const el = document.getElementById('nFcList');
    if (!el) return;

    el.innerHTML = cards.map(c => {
        const badge = c.difficulty === 'piège' ? 'badge-hard' : c.difficulty === 'moyen' ? 'badge-medium' : 'badge-easy';
        const label = c.difficulty === 'piège' ? 'Piège' : c.difficulty === 'moyen' ? 'Moyen' : 'Facile';
        return `
        <div class="n-fc" onclick="this.classList.toggle('show')">
            <div class="n-fc-q">
                <span class="badge ${badge}" style="font-size:10px;margin-right:6px">${label}</span>
                ${formatInline(c.question)}
            </div>
            <div class="n-fc-a">${formatAnswer(c.answer)}</div>
        </div>`;
    }).join('');
}

// ── Confidence & tracking ──

function renderClickableStars(normId, level) {
    let s = '';
    for (let i = 1; i <= 5; i++) {
        // Click same star again = reset to 0
        s += `<span class="n-star ${i <= level ? 'filled' : ''}" onclick="event.stopPropagation();setConfidence('${normId}',${i === level ? 0 : i})">★</span>`;
    }
    // Reset button when stars > 0
    if (level > 0) {
        s += `<span class="n-star-reset" onclick="event.stopPropagation();setConfidence('${normId}',0)" title="Remettre à 0">✕</span>`;
    }
    return `<span class="n-stars-row">${s}</span>`;
}

async function setConfidence(normId, level) {
    const n = normsData.find(x => x.id === normId);
    if (!n) return;
    n.confidence = level;
    await api('update_norm', n.code, n.category, level);
    // Save scroll positions
    const mainEl = document.getElementById('nMain');
    const sideEl = document.getElementById('nSidebar');
    const mainScroll = mainEl ? mainEl.scrollTop : 0;
    const sideScroll = sideEl ? sideEl.scrollTop : 0;
    renderSidebar();
    renderDetail(n);
    if (mainEl) mainEl.scrollTop = mainScroll;
    if (sideEl) sideEl.scrollTop = sideScroll;
}

async function markRevised(normId) {
    const n = normsData.find(x => x.id === normId);
    if (!n) return;
    n.revision_count = (n.revision_count || 0) + 1;
    n.last_revised = new Date().toISOString();
    await api('update_norm', n.code, n.category, n.confidence);
    // Save scroll positions
    const mainEl = document.getElementById('nMain');
    const sideEl = document.getElementById('nSidebar');
    const mainScroll = mainEl ? mainEl.scrollTop : 0;
    const sideScroll = sideEl ? sideEl.scrollTop : 0;
    renderSidebar();
    renderDetail(n);
    if (mainEl) mainEl.scrollTop = mainScroll;
    if (sideEl) sideEl.scrollTop = sideScroll;
}

async function undoRevised(normId) {
    const n = normsData.find(x => x.id === normId);
    if (!n) return;
    if (n.revision_count > 0) n.revision_count -= 1;
    if (n.revision_count === 0) n.last_revised = null;
    await api('update_norm', n.code, n.category, n.confidence);
    const mainEl = document.getElementById('nMain');
    const sideEl = document.getElementById('nSidebar');
    const mainScroll = mainEl ? mainEl.scrollTop : 0;
    const sideScroll = sideEl ? sideEl.scrollTop : 0;
    renderSidebar();
    renderDetail(n);
    if (mainEl) mainEl.scrollTop = mainScroll;
    if (sideEl) sideEl.scrollTop = sideScroll;
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    if (days < 7) return `il y a ${days}j`;
    if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
    return `il y a ${Math.floor(days / 30)} mois`;
}

// ── Notion Lessons ──

async function loadNormLessons(normCode) {
    const el = document.getElementById('nLessonsList');
    if (!el) return;

    const lessons = await api('get_lessons_for_norm', normCode);
    if (!lessons || lessons.length === 0) {
        el.innerHTML = '<div style="color:#64748b;font-size:13px;padding:4px">Aucune leçon Notion liée à cette norme</div>';
        return;
    }

    // Group by section
    const bySection = {};
    lessons.forEach(l => {
        const sec = l.section || 'Sans section';
        if (!bySection[sec]) bySection[sec] = [];
        bySection[sec].push(l);
    });

    let html = `<div style="font-size:12px;color:#64748b;margin-bottom:8px">${lessons.length} leçon(s) liée(s) à ${normCode}</div>`;

    for (const [section, items] of Object.entries(bySection)) {
        html += `<div class="n-lesson-section">
            <div class="n-lesson-sec-title">${escapeHtml(section)}</div>`;
        items.forEach(l => {
            const statusIcon = l.status === 'Done' ? '✅' : l.status === 'In progress' ? '🔄' : '⬜';
            const prioClass = (l.priority || '').includes('Haute') ? 'priority-high' :
                              (l.priority || '').includes('Moyenne') ? 'priority-med' : 'priority-low';
            html += `
            <div class="n-lesson-row">
                <span class="n-lesson-status">${statusIcon}</span>
                <span class="n-lesson-text">${addCrossRefs(l.concept || '')}</span>
                <span class="n-lesson-prio ${prioClass}">${escapeHtml((l.priority || '').replace(/[🔴🟡🟢]\s*/g, ''))}</span>
            </div>`;
        });
        html += `</div>`;
    }

    el.innerHTML = html;
}
