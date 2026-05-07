/* ═══════════════════════════════════════════════
   M7 — Fiscalité des entreprises
   Lesson-by-lesson revision module
   ═══════════════════════════════════════════════ */

let fiscData = null;
let fiscSelectedTome = null;
let fiscExpandedTopics = new Set();
let fiscExpandedLessons = new Set();

async function renderFiscalite(container) {
    fiscData = await api('get_fiscalite');
    fiscSelectedTome = null;
    fiscExpandedTopics = new Set();
    fiscExpandedLessons = new Set();

    if (!fiscData) {
        container.innerHTML = `<div class="fisc-page fade-in">
            <div class="page-title">M7 — Fiscalité</div>
            <p style="color:#94a3b8">Données non disponibles.</p>
        </div>`;
        return;
    }

    const tomes = fiscData.tomes || [];
    const totalLessons = tomes.reduce((s, t) => s + t.lessons.length, 0);
    const totalPages = tomes.reduce((s, t) => s + (t.pages || 0), 0);

    container.innerHTML = `
    <style>${fiscGetStyles()}</style>
    <div class="fisc-page fade-in">

        <!-- Header -->
        <div class="fisc-header">
            <h1 class="page-title" style="font-size:26px;margin-bottom:2px">M7 — Fiscalité</h1>
            <span class="fisc-subtitle">${tomes.length} tomes · ${totalLessons} leçons · ${totalPages} pages · IFP 2024</span>
        </div>

        <!-- Tome selector -->
        <div class="fisc-tome-row" id="fiscTomeRow"></div>

        <!-- Lessons list -->
        <div id="fiscLessons"></div>
    </div>`;

    fiscRenderTomeCards(tomes);
}

// ── Tome cards ──

function fiscRenderTomeCards(tomes) {
    const row = document.getElementById('fiscTomeRow');
    row.innerHTML = tomes.map(tome => {
        const lessons = tome.lessons || [];
        const done = lessons.filter(l => l.status === 'done').length;
        const inProg = lessons.filter(l => l.status === 'in_progress').length;
        const pct = lessons.length > 0 ? Math.round(done / lessons.length * 100) : 0;
        const isActive = fiscSelectedTome === tome.id;

        return `
        <div class="fisc-tome-card ${isActive ? 'fisc-tome-active' : ''}" onclick="fiscSelectTome('${tome.id}')">
            <div class="fisc-tome-title">${escapeHtml(tome.title)}</div>
            <div class="fisc-tome-meta">
                ${lessons.length} leçons · ${tome.pages || '?'} pages
            </div>
            <div class="fisc-tome-stats">
                <span class="fisc-stat-done">${done} terminées</span>
                <span class="fisc-stat-prog">${inProg} en cours</span>
            </div>
            <div class="progress-bar" style="margin-top:8px">
                <div class="progress-fill" style="width:${pct}%;background:${pct === 100 ? '#10b981' : '#dd6b20'}"></div>
            </div>
            <div style="font-size:11px;color:#64748b;margin-top:4px">${pct}% complété</div>
        </div>`;
    }).join('');
}

function fiscSelectTome(tomeId) {
    if (fiscSelectedTome === tomeId) {
        fiscSelectedTome = null;
        fiscRenderTomeCards(fiscData.tomes);
        document.getElementById('fiscLessons').innerHTML = '';
        return;
    }
    fiscSelectedTome = tomeId;
    fiscRenderTomeCards(fiscData.tomes);
    const tome = fiscData.tomes.find(t => t.id === tomeId);
    if (tome) fiscRenderLessons(tome);
}

// ── Lessons list ──

function fiscRenderLessons(tome) {
    const el = document.getElementById('fiscLessons');
    const lessons = tome.lessons || [];

    el.innerHTML = `
        <div class="fisc-section-head">
            <span class="section-title">${escapeHtml(tome.title)}</span>
            <span class="fisc-lesson-count">${lessons.length} leçons</span>
        </div>
        ${lessons.map(l => fiscRenderLessonCard(l)).join('')}
    `;
}

function fiscRenderLessonCard(lesson) {
    const statusMap = {
        not_started: { label: 'Non commencé', cls: 'fisc-badge-gray' },
        in_progress: { label: 'En cours', cls: 'fisc-badge-orange' },
        done:        { label: 'Terminé', cls: 'fisc-badge-green' }
    };
    const st = statusMap[lesson.status] || statusMap.not_started;
    const relMap = {
        'Haute':  { cls: 'fisc-rel-high', icon: '!!', label: 'Haute' },
        'Moyenne':{ cls: 'fisc-rel-med',  icon: '!',  label: 'Moyenne' },
        'Basse':  { cls: 'fisc-rel-low',  icon: '-',  label: 'Basse' }
    };
    const rel = relMap[lesson.exam_relevance] || relMap['Moyenne'];
    const isExpanded = fiscExpandedLessons.has(lesson.id);

    const crossRefsHtml = (lesson.cross_refs || []).length > 0
        ? `<div class="fisc-crossrefs">
            ${lesson.cross_refs.map(ref =>
                `<span class="fisc-chip" onclick="event.stopPropagation(); showCrossRefPopover(event, '${escapeHtml(ref.toLowerCase().replace(/\\s+/g,''))}', '${escapeHtml(ref)}')">${escapeHtml(ref)}</span>`
            ).join('')}
           </div>`
        : '';

    const topicsHtml = (lesson.topics || []).map((topic, ti) => {
        const topicKey = `${lesson.id}_t${ti}`;
        const isOpen = fiscExpandedTopics.has(topicKey);
        const hasSubs = topic.subtopics && topic.subtopics.length > 0;
        const arrow = hasSubs ? (isOpen ? '&#9660;' : '&#9654;') : '<span style="width:12px;display:inline-block"></span>';
        const subsHtml = (hasSubs && isOpen)
            ? `<div class="fisc-subtopics">${topic.subtopics.map(s => `<div class="fisc-sub">${escapeHtml(s)}</div>`).join('')}</div>`
            : '';

        return `
        <div class="fisc-topic ${hasSubs ? 'fisc-topic-clickable' : ''}" onclick="${hasSubs ? `event.stopPropagation(); fiscToggleTopic('${topicKey}', '${lesson.id}')` : ''}">
            <span class="fisc-topic-arrow">${arrow}</span>
            <span class="fisc-topic-label">${escapeHtml(topic.t)}</span>
        </div>
        ${subsHtml}`;
    }).join('');

    return `
    <div class="fisc-lesson card" id="fisc_${lesson.id}">
        <div class="fisc-lesson-header" onclick="fiscToggleLesson('${lesson.id}')">
            <div class="fisc-lesson-left">
                <span class="fisc-lesson-num">L${lesson.number}</span>
                <span class="fisc-lesson-title">${escapeHtml(lesson.title)}</span>
            </div>
            <div class="fisc-lesson-right">
                <span class="fisc-relevance ${rel.cls}" title="Pertinence examen: ${rel.label}">
                    ${rel.icon} ${rel.label}
                </span>
                <span class="fisc-badge ${st.cls}">${st.label}</span>
                <span class="fisc-expand-icon">${isExpanded ? '&#9660;' : '&#9654;'}</span>
            </div>
        </div>
        ${crossRefsHtml}
        ${isExpanded ? `
        <div class="fisc-lesson-body">
            <div class="fisc-topics-section">
                <div class="fisc-topics-title">Thèmes</div>
                ${topicsHtml}
            </div>
            ${fiscRenderLessonContent(lesson)}
            ${fiscRenderLessonFlashcards(lesson)}
        </div>` : ''}
    </div>`;
}

// Render rich lesson content (sections with title/body/example/warning)
function fiscRenderLessonContent(lesson) {
    const content = lesson.content || [];
    if (content.length === 0) {
        return '<div class="fisc-content-placeholder">Contenu à venir — Leçon par leçon</div>';
    }
    return '<div class="fisc-content-rich" style="margin-top:16px">' +
        content.map(section => {
            const title = section.title || '';
            const body = (section.body || '').trim();
            const example = section.example || '';
            const warning = section.warning || '';
            return `
                <div class="fisc-section" style="margin-bottom:18px;padding:14px 16px;background:#0f172a;border:1px solid #334155;border-radius:8px">
                    ${title ? `<h4 style="font-size:14px;font-weight:700;color:#60a5fa;margin:0 0 8px 0;border-bottom:1px solid #1e293b;padding-bottom:6px">${escapeHtml(title)}</h4>` : ''}
                    ${body ? `<div style="font-size:13px;color:#cbd5e1;line-height:1.6">${fiscFormatBody(body)}</div>` : ''}
                    ${example ? `<div style="margin-top:8px;padding:10px 12px;background:#1e3a5f;border-left:3px solid #3b82f6;border-radius:4px;font-size:12px;color:#cbd5e1">💡 <strong style="color:#93c5fd">Exemple :</strong><br>${fiscFormatBody(example)}</div>` : ''}
                    ${warning ? `<div style="margin-top:8px;padding:10px 12px;background:#78350f;border-left:3px solid #f59e0b;border-radius:4px;font-size:12px;color:#fde68a">⚠️ <strong>Attention :</strong> ${fiscFormatBody(warning)}</div>` : ''}
                </div>
            `;
        }).join('') +
        '</div>';
}

// Simple markdown-like formatting for the body text
function fiscFormatBody(text) {
    if (!text) return '';
    let html = escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#f1f5f9">$1</strong>')
        .replace(/\n\n/g, '</p><p style="margin:8px 0">')
        .replace(/\n- /g, '<br>• ')
        .replace(/\n/g, '<br>');
    return '<p style="margin:0">' + html + '</p>';
}

// Render the flashcards linked to this lesson (by subcategory tags)
function fiscRenderLessonFlashcards(lesson) {
    const tags = lesson.flashcard_tags || [];
    if (tags.length === 0) return '';
    const tagList = JSON.stringify(tags);
    return `
        <div class="fisc-flashcards-section" style="margin-top:16px;padding:14px 16px;background:#064e3b33;border:1px solid #10b981;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
            <div>
                <div style="font-size:13px;font-weight:700;color:#6ee7b7;margin-bottom:4px">🃏 Flashcards liées à cette leçon</div>
                <div style="font-size:11px;color:#94a3b8">${tags.length} sous-catégorie${tags.length > 1 ? 's' : ''}</div>
            </div>
            <button onclick='fiscLaunchFlashcards(${tagList})'
                style="background:#10b981;color:white;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">
                ▶ Démarrer la session
            </button>
        </div>`;
}

// Launch a Trainer flashcard session filtered on these tags (matched on subcategory)
async function fiscLaunchFlashcards(tags) {
    if (!tags || tags.length === 0) return;
    // Store tags for the flashcards page to pick up
    window._fiscFlashcardTags = tags;
    navigate('flashcards');
    // After navigation, apply filter via subcategory match
    setTimeout(() => {
        if (typeof fcState !== 'undefined' && fcState) {
            fcState.mode = 'libre';
            fcState.filters = fcState.filters || {};
            fcState.filters.category = 'Fiscalité';
            // Use the first tag as search term (matches question/answer content)
            fcState.filters.search = tags[0];
            if (typeof loadCards === 'function') loadCards();
            if (typeof renderFilterBar === 'function') renderFilterBar();
            if (typeof renderModeBar === 'function') renderModeBar();
        }
    }, 250);
}

// ── Toggle helpers ──

function fiscToggleLesson(lessonId) {
    if (fiscExpandedLessons.has(lessonId)) {
        fiscExpandedLessons.delete(lessonId);
    } else {
        fiscExpandedLessons.add(lessonId);
    }
    // Re-render the tome
    const tome = fiscData.tomes.find(t => t.id === fiscSelectedTome);
    if (tome) fiscRenderLessons(tome);
}

function fiscToggleTopic(topicKey, lessonId) {
    if (fiscExpandedTopics.has(topicKey)) {
        fiscExpandedTopics.delete(topicKey);
    } else {
        fiscExpandedTopics.add(topicKey);
    }
    const tome = fiscData.tomes.find(t => t.id === fiscSelectedTome);
    if (tome) fiscRenderLessons(tome);
}

// ── Styles ──

function fiscGetStyles() {
    return `
    .fisc-page { max-width: 960px; margin: 0 auto; padding: 0 8px; }
    .fisc-header { margin-bottom: 20px; }
    .fisc-subtitle { font-size: 13px; color: #94a3b8; }

    /* Tome cards */
    .fisc-tome-row { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .fisc-tome-card {
        flex: 1; min-width: 260px;
        background: #1e293b; border: 1px solid #334155; border-radius: 10px;
        padding: 16px; cursor: pointer; transition: all .2s;
    }
    .fisc-tome-card:hover { border-color: #dd6b20; background: #1a2332; }
    .fisc-tome-active { border-color: #dd6b20; box-shadow: 0 0 0 2px rgba(221,107,32,.25); }
    .fisc-tome-title { font-size: 15px; font-weight: 600; color: #f1f5f9; margin-bottom: 4px; }
    .fisc-tome-meta { font-size: 12px; color: #64748b; margin-bottom: 8px; }
    .fisc-tome-stats { display: flex; gap: 10px; font-size: 12px; }
    .fisc-stat-done { color: #10b981; }
    .fisc-stat-prog { color: #f59e0b; }

    /* Progress bar (reuse global) */
    .progress-bar { height: 4px; background: #334155; border-radius: 2px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 2px; transition: width .3s; }

    /* Section head */
    .fisc-section-head {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #334155;
    }
    .fisc-lesson-count { font-size: 12px; color: #64748b; }

    /* Lesson card */
    .fisc-lesson {
        background: #1e293b; border: 1px solid #334155; border-radius: 8px;
        margin-bottom: 8px; overflow: hidden; transition: border-color .2s;
    }
    .fisc-lesson:hover { border-color: #475569; }
    .fisc-lesson-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 16px; cursor: pointer; gap: 12px;
    }
    .fisc-lesson-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
    .fisc-lesson-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .fisc-lesson-num {
        font-size: 13px; font-weight: 700; color: #dd6b20;
        background: rgba(221,107,32,.12); padding: 2px 8px; border-radius: 4px;
        white-space: nowrap;
    }
    .fisc-lesson-title { font-size: 14px; font-weight: 500; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fisc-expand-icon { font-size: 11px; color: #64748b; width: 16px; text-align: center; }

    /* Badges */
    .fisc-badge {
        font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500;
        white-space: nowrap;
    }
    .fisc-badge-gray { background: #334155; color: #94a3b8; }
    .fisc-badge-orange { background: rgba(245,158,11,.15); color: #f59e0b; }
    .fisc-badge-green { background: rgba(16,185,129,.15); color: #10b981; }

    /* Relevance */
    .fisc-relevance {
        font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600;
        white-space: nowrap;
    }
    .fisc-rel-high { background: rgba(239,68,68,.12); color: #ef4444; }
    .fisc-rel-med  { background: rgba(245,158,11,.12); color: #f59e0b; }
    .fisc-rel-low  { background: rgba(100,116,139,.12); color: #94a3b8; }

    /* Cross-refs */
    .fisc-crossrefs { display: flex; gap: 6px; flex-wrap: wrap; padding: 0 16px 8px; }
    .fisc-chip {
        font-size: 11px; padding: 2px 8px; border-radius: 4px;
        background: rgba(221,107,32,.10); color: #dd6b20; border: 1px solid rgba(221,107,32,.25);
        cursor: pointer; transition: all .15s; white-space: nowrap;
    }
    .fisc-chip:hover { background: rgba(221,107,32,.20); border-color: #dd6b20; }

    /* Lesson body */
    .fisc-lesson-body { padding: 0 16px 16px; border-top: 1px solid #334155; }
    .fisc-topics-section { margin-top: 12px; }
    .fisc-topics-title { font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; }
    .fisc-topic {
        display: flex; align-items: center; gap: 6px; padding: 4px 0;
        font-size: 13px; color: #cbd5e1;
    }
    .fisc-topic-clickable { cursor: pointer; }
    .fisc-topic-clickable:hover { color: #f1f5f9; }
    .fisc-topic-arrow { font-size: 10px; color: #64748b; width: 14px; text-align: center; flex-shrink: 0; }
    .fisc-topic-label { flex: 1; }
    .fisc-subtopics { padding-left: 22px; margin-bottom: 4px; }
    .fisc-sub {
        font-size: 12px; color: #94a3b8; padding: 2px 0 2px 10px;
        border-left: 2px solid #334155;
    }

    /* Content placeholder */
    .fisc-content-placeholder {
        margin-top: 12px; padding: 16px; text-align: center;
        font-size: 13px; color: #64748b; font-style: italic;
        background: #0f172a; border-radius: 6px; border: 1px dashed #334155;
    }
    `;
}
