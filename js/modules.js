/* ═══════════════════════════════════════════════
   Unified Modules Page
   Replaces Normes + Fiscalite with 3-level nav:
   L1 = module pills  L2 = sidebar  L3 = reading pane
   ═══════════════════════════════════════════════ */

let modData = [];
let modSelectedId = null;      // selected module id
let modSelectedItem = null;    // {type:'norm'|'lesson_ifp'|'notion', id:...}
let modExpandedTopics = new Set();
let modLsMatches = [];
let modLsCurrent = -1;
// Pending deep-link from another tab (ex. QCM "Voir la leçon"). Consommé en fin
// de renderModules pour éviter la race condition DOM-pas-encore-prêt.
let _modPendingDeepLink = null;

// ── Entry point ──

async function renderModules(container) {
    modSelectedItem = null;
    modExpandedTopics = new Set();

    const [resp, coursesRaw] = await Promise.all([
        api('get_unified_modules'),
        api('get_trainer_courses'),
    ]);
    modData = (resp && resp.modules) ? resp.modules : [];

    // Cache norm_code -> norm_title for the sidebar labels
    window._coursNormMap = window._coursNormMap || {};
    const coursList = (coursesRaw && coursesRaw.courses) ? coursesRaw.courses : [];
    coursList.forEach(c => {
        if (c.norm_code) window._coursNormMap[c.norm_code] = c.norm_title || '';
    });

    if (modData.length === 0) {
        container.innerHTML = `
        ${modGetStyles()}
        <div class="mod-page fade-in">
            <div style="text-align:center;padding:60px 20px;color:#64748b">
                <div style="font-size:40px;opacity:.25;margin-bottom:10px">📚</div>
                <div>Aucun module disponible.</div>
            </div>
        </div>`;
        return;
    }

    if (!modSelectedId) modSelectedId = modData[0].id;

    container.innerHTML = `
    ${modGetStyles()}
    <div class="mod-page fade-in">
        <div class="mod-pills-wrap">
            <button class="mod-pills-arrow mod-pills-arrow-l" id="modPillsArrowL" onclick="modPillsScroll(-1)" title="Défiler à gauche">‹</button>
            <div class="mod-pills-bar" id="modPillsBar" onscroll="modUpdatePillsArrows()"></div>
            <button class="mod-pills-arrow mod-pills-arrow-r" id="modPillsArrowR" onclick="modPillsScroll(1)" title="Défiler à droite">›</button>
        </div>
        <div class="mod-layout">
            <div class="mod-sidebar" id="modSidebar"></div>
            <div class="mod-reading-wrap">
                <div class="mod-local-search" id="modLocalSearch" style="display:none">
                    <div class="mod-ls-field">
                        <span class="mod-ls-icon">⌕</span>
                        <input class="mod-ls-input" id="modLsInput" type="text"
                            placeholder="Rechercher dans cette norme… (Ctrl+F)"
                            oninput="modLocalSearch(this.value)"
                            onkeydown="modLsKeydown(event)">
                    </div>
                    <span class="mod-ls-count" id="modLsCount"></span>
                    <div class="mod-ls-nav-group">
                        <button class="mod-ls-nav-btn" onclick="modLsNav(-1)" title="Précédent (Shift+Entrée)">↑</button>
                        <button class="mod-ls-nav-btn" onclick="modLsNav(1)" title="Suivant (Entrée)">↓</button>
                    </div>
                    <button class="mod-ls-close" onclick="modLsHide()" title="Fermer (Échap)">✕</button>
                </div>
                <div class="mod-reading" id="modReading">
                    <div class="mod-empty-state">
                        <div style="font-size:44px;opacity:.2;margin-bottom:10px">📖</div>
                        <div>Selectionnez un element dans la barre laterale</div>
                    </div>
                </div>
                <div class="mod-zoom" id="modZoom" role="group" aria-label="Zoom de la lecture">
                    <button class="mod-zoom-btn" onclick="modZoomStep(-1)" aria-label="Réduire" title="Réduire (Ctrl+−)">−</button>
                    <button class="mod-zoom-level" id="modZoomLevel" onclick="modZoomReset()" aria-label="Réinitialiser le zoom" title="Réinitialiser (Ctrl+0)">100%</button>
                    <button class="mod-zoom-btn" onclick="modZoomStep(1)" aria-label="Agrandir" title="Agrandir (Ctrl+=)">+</button>
                </div>
            </div>
        </div>
    </div>`;

    modRenderPills();
    modRenderSidebar();
    modZoomApply();

    // Apply pending deep-link (set by modOpenLessonAt before navigate).
    // Doit venir APRÈS la mise en place du DOM pour que #modReading existe.
    if (_modPendingDeepLink) {
        _applyPendingDeepLink();
    }
}

// ═══════════════════════════════════════
// Level 1 — Module pills
// ═══════════════════════════════════════

function modRenderPills() {
    const el = document.getElementById('modPillsBar');
    if (!el) return;

    const pills = modData.map(m => {
        const color = m.color || getModuleColor(m.code);
        const active = m.id === modSelectedId;
        const abbr = modAbbrev(m.name);
        return `<button class="mod-pill ${active ? 'mod-pill-active' : ''}"
                    style="${active ? `background:${color};color:#fff` : ''}"
                    onclick="modSelectModule('${escapeAttr(m.id)}')"
                    title="${escapeAttr(m.name)}">
                <span class="mod-pill-code">${escapeHtml(m.code)}</span>
                <span class="mod-pill-name">${escapeHtml(abbr)}</span>
            </button>`;
    }).join('');

    el.innerHTML = pills;
    requestAnimationFrame(modUpdatePillsArrows);
}

function modToggleTheme() {
    document.body.classList.toggle('light-mode');
    // Save preference
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('swisscpa_theme', isLight ? 'light' : 'dark');
    // Re-render pills to update toggle button label
    modRenderPills();
}

// Restore theme on load
(function() {
    const saved = localStorage.getItem('swisscpa_theme');
    if (saved === 'light') document.body.classList.add('light-mode');
})();

function modAbbrev(name) {
    if (!name) return '';
    // Strip module code prefix like "Normes suisses (CO+RPC)" -> "Normes suisses"
    let s = name.replace(/\s*\(.*\)\s*$/, '');
    if (s.length > 18) s = s.substring(0, 16) + '...';
    return s;
}

function modSelectModule(id) {
    modSelectedId = id;
    modSelectedItem = null;
    modExpandedTopics = new Set();
    modRenderPills();
    modRenderSidebar();
    modRenderEmpty();
}

// ═══════════════════════════════════════
// Level 2 — Sidebar
// ═══════════════════════════════════════

function modRenderSidebar() {
    const el = document.getElementById('modSidebar');
    if (!el) return;

    const m = modData.find(x => x.id === modSelectedId);
    if (!m) { el.innerHTML = ''; return; }

    const color = m.color || getModuleColor(m.code);
    const norms = m.norms || [];
    const refFrameworks = m.referenced_frameworks || [];
    const lessonsIfp = m.lessons_ifp || [];
    const lessonsNotion = m.lessons_notion || [];
    const fcCount = m.flashcard_count || 0;

    let html = `
    <div class="mod-sb-header" style="border-bottom-color:${color}44">
        <div class="mod-sb-code" style="color:${color}">${escapeHtml(m.code)}</div>
        <div class="mod-sb-name">${escapeHtml(m.name)}</div>
        ${m.year || m.phase ? `<div class="mod-sb-meta">${escapeHtml([m.year, m.phase].filter(Boolean).join(' — '))}</div>` : ''}
        ${m.hours_async || m.hours_sync ? `<div class="mod-sb-hours">${m.hours_async ? m.hours_async + 'h async' : ''} ${m.hours_sync ? '· ' + m.hours_sync + 'h sync' : ''}</div>` : ''}
    </div>`;

    // Norms section
    if (norms.length > 0) {
        html += `<div class="mod-sb-section">
            <div class="mod-sb-section-title">📘 Normes <span class="mod-sb-count">${norms.length}</span>
                ${(() => {
                    const done = norms.filter(x => (x.revision_count || 0) > 0).length;
                    if (!done) return '';
                    const pct = Math.round(done / norms.length * 100);
                    const c = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#3b82f6';
                    return `<span class="mod-sb-prog-wrap" title="${done}/${norms.length} révisées (${pct}%)"><span class="mod-sb-prog-bar" style="width:${pct}%;background:${c}"></span></span>`;
                })()}
            </div>`;
        norms.forEach(n => {
            const isSel = modSelectedItem && modSelectedItem.type === 'norm' && modSelectedItem.id === n.id;
            const dot = n.confidence >= 4 ? '#22c55e' : n.confidence >= 1 ? '#eab308' : '#ef4444';
            const stars = modMiniStars(n.confidence);
            // Resolve norm title from trainer_courses cache if available
            const normTitle = (window._coursNormMap && window._coursNormMap[n.code]) ? window._coursNormMap[n.code] : (n.title || '');
            const titleHtml = normTitle
                ? `<span class="mod-sb-item-label" style="color:var(--text-secondary);font-size:11px;margin-left:4px" title="${escapeAttr(normTitle)}">${escapeHtml(modTruncate(normTitle, 28))}</span>`
                : '';
            html += `
            <div class="mod-sb-item ${isSel ? 'mod-sb-item-sel' : ''}" onclick="modSelectNorm('${escapeAttr(n.id)}')" title="${escapeAttr(n.code + (normTitle ? ' — ' + normTitle : ''))}">
                <span class="mod-sb-dot" style="background:${dot}"></span>
                <span class="mod-sb-item-code">${escapeHtml(n.code)}</span>
                ${titleHtml}
                <span class="mod-sb-item-stars">${stars}</span>
            </div>`;
        });
        html += `</div>`;
    }

    // Referenced frameworks section — broad labels pointing to their owner module.
    // Used so M1 can list LSR/IFRS/LIFD/etc. without duplicating them in M1.norms.
    if (refFrameworks.length > 0) {
        html += `<div class="mod-sb-section">
            <div class="mod-sb-section-title">📌 Référentiels mentionnés <span class="mod-sb-count">${refFrameworks.length}</span></div>`;
        refFrameworks.forEach(r => {
            const owner = r.owner_module || '';
            const label = r.label || '';
            const tip = (label ? label + (owner ? ' — voir dans ' + owner : '') : owner ? 'Voir dans ' + owner : r.code);
            const ownerBadge = owner ? `<span class="mod-sb-ref-owner" title="Module détaillant ce référentiel">${escapeHtml(owner)}</span>` : '';
            html += `
            <div class="mod-sb-item mod-sb-item-ref" onclick="modJumpToFramework('${escapeAttr(r.code)}','${escapeAttr(owner)}')" title="${escapeAttr(tip)}">
                <span class="mod-sb-item-code">${escapeHtml(r.code)}</span>
                ${label ? `<span class="mod-sb-item-label" style="color:var(--text-secondary);font-size:11px;margin-left:4px">${escapeHtml(modTruncate(label, 26))}</span>` : ''}
                ${ownerBadge}
            </div>`;
        });
        html += `</div>`;
    }

    // Lessons IFP section
    if (lessonsIfp.length > 0) {
        html += `<div class="mod-sb-section">
            <div class="mod-sb-section-title">📖 Leçons <span class="mod-sb-count">${lessonsIfp.length}</span></div>`;
        lessonsIfp.forEach(l => {
            const isSel = modSelectedItem && modSelectedItem.type === 'lesson_ifp' && modSelectedItem.id === l.id;
            html += `
            <div class="mod-sb-item ${isSel ? 'mod-sb-item-sel' : ''}" onclick="modSelectLessonIfp('${escapeAttr(l.id)}')">
                <span class="mod-sb-item-num">L${l.number}</span>
                <span class="mod-sb-item-label">${escapeHtml(modTruncate(modStripLessonNumPrefix(l.title, l.number), 30))}</span>
            </div>`;
        });
        html += `</div>`;
    }

    // Notion lessons
    if (lessonsNotion.length > 0) {
        html += `<div class="mod-sb-section">
            <div class="mod-sb-section-title mod-sb-section-clickable" onclick="modSelectNotionLessons()">
                📝 Lecons Notion <span class="mod-sb-count">${lessonsNotion.length}</span>
            </div>
        </div>`;
    }

    // Flashcards
    if (fcCount > 0) {
        html += `<div class="mod-sb-section">
            <div class="mod-sb-section-title mod-sb-section-clickable" onclick="modSelectFlashcards()">
                🃏 Flashcards <span class="mod-sb-count">${fcCount}</span>
            </div>
        </div>`;
    }

    el.innerHTML = html;
}

function modMiniStars(level) {
    let s = '';
    for (let i = 1; i <= 5; i++) {
        s += `<span style="color:${i <= level ? '#fbbf24' : '#334155'};font-size:9px">★</span>`;
    }
    return s;
}

function modTruncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len - 1) + '...' : str;
}

// ═══════════════════════════════════════
// Level 3 — Reading pane routing
// ═══════════════════════════════════════

function modRenderEmpty() {
    const el = document.getElementById('modReading');
    if (!el) return;
    el.innerHTML = `<div class="mod-empty-state">
        <div style="font-size:44px;opacity:.2;margin-bottom:10px">📖</div>
        <div>Selectionnez un element dans la barre laterale</div>
    </div>`;
    el.scrollTop = 0;
    modLsHide();
}

function modSelectNorm(normId) {
    const m = modData.find(x => x.id === modSelectedId);
    if (!m) return;
    const n = (m.norms || []).find(x => x.id === normId);
    if (!n) return;
    modSelectedItem = { type: 'norm', id: normId };
    modRenderSidebar();
    modRenderNormDetail(n, m);
    modLsShow();
    _modScrollToReadingOnMobile();
}

/**
 * Navigate directly to a specific norm by its code (e.g. "IAS 16", "RPC 30").
 * Used from other tabs (Entraînement → "Voir la norme complète").
 */
async function navigateToNormByCode(normCode) {
    // Ensure we're on the modules tab and data is loaded
    await navigate('modules');

    // Wait a tick for data to load
    let attempts = 0;
    while ((!modData || modData.length === 0) && attempts < 20) {
        await new Promise(r => setTimeout(r, 50));
        attempts++;
    }
    if (!modData || modData.length === 0) return;

    // Find the module containing this norm (match by code, id or case-insensitive)
    const targetCode = (normCode || '').trim().toLowerCase();
    for (const m of modData) {
        const n = (m.norms || []).find(x => {
            const c = (x.code || '').trim().toLowerCase();
            const nid = (x.id || '').trim().toLowerCase();
            return c === targetCode || nid === targetCode;
        });
        if (n) {
            modSelectedId = m.id;
            modSelectedItem = { type: 'norm', id: n.id };
            // Re-render UI
            const main = document.getElementById('mainContent');
            if (main) renderModules(main).then(() => {
                // After re-render, trigger selection
                setTimeout(() => {
                    const m2 = modData.find(x => x.id === modSelectedId);
                    if (m2) {
                        const n2 = (m2.norms || []).find(x => x.id === modSelectedItem.id);
                        if (n2) modRenderNormDetail(n2, m2);
                    }
                }, 100);
            });
            return;
        }
    }
    console.warn('Norme introuvable dans les modules :', normCode);
}

function modSelectLessonIfp(lessonId) {
    const m = modData.find(x => x.id === modSelectedId);
    if (!m) return;
    const l = (m.lessons_ifp || []).find(x => x.id === lessonId);
    if (!l) return;
    modSelectedItem = { type: 'lesson_ifp', id: lessonId };
    modRenderSidebar();
    modLsHide();
    modRenderLessonIfpDetail(l, m);
    _modScrollToReadingOnMobile();
}

// Mobile-only : auto-scroll vers le reading pane après sélection d'un item
// dans la sidebar. Sur desktop (≥ 769 px) ne fait rien.
// Multi-attempts car le contenu (QCM liés, flashcards liées, leçons Notion)
// charge en async et pousse le reading pane après le premier scroll.
function _modScrollToReadingOnMobile() {
    if (window.innerWidth >= 769) return;
    const doScroll = () => {
        const reading = document.getElementById('modReading');
        if (reading) reading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    requestAnimationFrame(() => {
        doScroll();
        setTimeout(doScroll, 200);
        setTimeout(doScroll, 600);
    });
}

/**
 * Deep-link entry — bascule sur l'onglet "modules", ouvre le module owner,
 * sélectionne la leçon, puis scrolle jusqu'à la section ciblée.
 *
 * Robuste face à la race condition : on stocke le deep-link dans
 * `_modPendingDeepLink` puis on déclenche navigate('modules'). renderModules
 * consomme le flag tout à la fin une fois le DOM monté et modData chargé.
 *
 * @param {string} moduleId   id du module owner OU code (ex. "M2")
 * @param {string} lessonId   id de la leçon (ex. "m2_L9")
 * @param {string} sectionId  id HTML de la section à scroller (ex. "m2_L9_s4")
 */
function modOpenLessonAt(moduleId, lessonId, sectionId) {
    _modPendingDeepLink = { moduleId, lessonId, sectionId: sectionId || null };
    // Si on est déjà sur l'onglet modules ET que modData est prêt, applique
    // immédiatement (pas besoin de re-render complet).
    if (currentTab === 'modules'
        && Array.isArray(modData) && modData.length > 0
        && document.getElementById('modReading')) {
        _applyPendingDeepLink();
        return;
    }
    if (typeof navigate === 'function') navigate('modules');
    // Sinon, renderModules consommera _modPendingDeepLink à la fin.
}

// Applique le deep-link courant (suppose modData chargé + DOM prêt).
function _applyPendingDeepLink() {
    if (!_modPendingDeepLink) return;
    const { moduleId, lessonId, sectionId } = _modPendingDeepLink;
    _modPendingDeepLink = null;

    if (!Array.isArray(modData) || modData.length === 0) return;

    const owner = modData.find(x => x.id === moduleId || x.code === moduleId);
    if (!owner) {
        console.warn('modOpenLessonAt : module introuvable', moduleId);
        return;
    }
    modSelectedId = owner.id;
    modExpandedTopics = new Set();

    // Tente d'abord les leçons IFP, puis fallback sur les normes (M3/M4).
    const lesson = (owner.lessons_ifp || []).find(x => x.id === lessonId);
    if (lesson) {
        modSelectedItem = { type: 'lesson_ifp', id: lessonId };
        modRenderPills();
        modRenderSidebar();
        modRenderLessonIfpDetail(lesson, owner);
    } else {
        const norm = (owner.norms || []).find(x =>
            x && (x.id === lessonId || x.code === lessonId));
        if (!norm) {
            console.warn('modOpenLessonAt : leçon/norme introuvable', lessonId);
            modSelectedItem = null;
            modRenderPills();
            modRenderSidebar();
            return;
        }
        modSelectedItem = { type: 'norm', id: norm.id };
        modRenderPills();
        modRenderSidebar();
        modRenderNormDetail(norm, owner);
    }

    // Scroll après render (laisse le DOM se settler).
    // Mobile : scroll robuste vers reading pane (plusieurs tentatives car
    // le contenu lazy-load décale la position après coup).
    _modScrollToReadingOnMobile();
    requestAnimationFrame(() => {
        setTimeout(() => {
            // Desktop ou ancre précise : scroll vers la section
            if (!sectionId) return;
            const target = document.getElementById(sectionId);
            if (target && target.scrollIntoView) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 80);
    });
}
// Expose globalement : appelé depuis qcm.js (deep-link "Voir la leçon").
if (typeof window !== 'undefined') window.modOpenLessonAt = modOpenLessonAt;

function modSelectNotionLessons() {
    modSelectedItem = { type: 'notion' };
    modRenderSidebar();
    modLsHide();
    modRenderNotionLessons();
}

function modSelectFlashcards() {
    modSelectedItem = { type: 'flashcards' };
    modRenderSidebar();
    modLsHide();
    modRenderFlashcardsPane();
}

// ═══════════════════════════════════════
// Norm detail (full reading pane)
// ═══════════════════════════════════════

function modRenderNormDetail(n, m) {
    const el = document.getElementById('modReading');
    if (!el) return;

    const color = m.color || getModuleColor(m.code);
    const cat = n.category || '';
    const catColors = getColor(cat);
    const accent = catColors.accent || color;
    const accentBg = catColors.bg || color + '33';
    const fcCount = (n.flashcard_ids || []).length;

    let html = `<div class="mod-detail fade-in">

    <!-- Header card -->
    <div class="mod-header-card" style="border-color:${accent}44;background:linear-gradient(135deg, ${accentBg}66, ${accentBg}22)">
        <div class="mod-hc-top">
            <div class="mod-hc-left">
                <div class="mod-hc-cat" style="color:${accent}">${escapeHtml(cat)}</div>
                <h2 class="mod-hc-title">${escapeHtml(n.title || n.code)}</h2>
            </div>
            <div class="mod-hc-actions">
                <div class="mod-hc-stars" id="modStars_${escapeAttr(n.id)}">${modClickableStars(n.id, n.confidence)}</div>
                <button class="btn btn-primary" style="padding:8px 16px;font-size:13px" onclick="modMarkRevised('${escapeAttr(n.id)}')">
                    ✅ Revise
                </button>
                <button class="btn btn-outline" style="padding:6px 12px;font-size:12px" onclick="modExportNormPdf('${escapeAttr(n.id)}', this)" title="Exporter cette norme en PDF">
                    📄 PDF
                </button>
                <button class="btn btn-outline" style="padding:6px 12px;font-size:12px;color:#8b5cf6;border-color:#8b5cf644" onclick="modOpenMindmap('${escapeAttr(n.code || n.id)}')" title="Voir la mindmap de cette norme">
                    🧠 Mindmap
                </button>
                ${n.revision_count > 0 ? `<button class="btn btn-outline" style="padding:6px 12px;font-size:12px;color:#ef4444;border-color:#ef444444" onclick="modUndoRevised('${escapeAttr(n.id)}')" title="Annuler la derniere revision">
                    ↩ Annuler
                </button>` : ''}
            </div>
        </div>
        ${n.last_revised ? `<div class="mod-hc-meta">Derniere revision : ${modTimeAgo(n.last_revised)} · Revise ${n.revision_count}x</div>` : '<div class="mod-hc-meta">Jamais revise</div>'}
    </div>`;

    // ── Audio files (podcasts, NotebookLM-style) ──
    if (Array.isArray(n.audio_files) && n.audio_files.length > 0) {
        for (const af of n.audio_files) {
            if (!af || !af.path) continue;
            const mime = af.mime || 'audio/mpeg';
            const title = af.title || 'Audio';
            const kindLabel = af.kind === 'podcast' ? 'Podcast' : af.kind === 'lecture' ? 'Cours audio' : 'Audio';
            html += `<div class="mod-audio">
                <div class="mod-audio-head">
                    <span class="mod-audio-icon" aria-hidden="true">🎧</span>
                    <div class="mod-audio-meta">
                        <div class="mod-audio-kind">${escapeHtml(kindLabel)}</div>
                        <div class="mod-audio-title">${escapeHtml(title)}</div>
                    </div>
                </div>
                <audio class="mod-audio-player" controls preload="metadata">
                    <source src="${escapeAttr(af.path)}" type="${escapeAttr(mime)}">
                    Ton navigateur ne supporte pas la lecture audio.
                </audio>
            </div>`;
        }
    }

    // ── Summary — always visible at top ──
    if (n.summary) {
        html += `<div class="mod-section">
            <div class="mod-section-text">${formatAnswer(n.summary)}</div>
        </div>`;
    }

    // ── Mnemonics — quick memory aid ──
    if (n.mnemonics) {
        const mnemText = Array.isArray(n.mnemonics) ? n.mnemonics.join('\n') : n.mnemonics;
        html += `<div class="mod-mnemonic-box">
            💡 ${formatAnswer(mnemText)}
        </div>`;
    }

    // ── Sections from docx — ALL displayed directly, NO accordion ──
    // Garde toute section qui a un titre OU du contenu substantiel : les
    // titres-parents (ex: "2. Définition et concepts") n'ont pas de contenu
    // propre — leurs enfants 2.1, 2.2 le portent — mais on doit les afficher
    // comme séparateurs hiérarchiques, sinon la leçon paraît tronquée.
    if (n.sections && n.sections.length > 0) {
        // Callouts pour les normes : même structure que les leçons IFP
        // (cf. modRenderLessonIfpDetail). Champs optionnels par section :
        // info, legal_quote, example, comparison, key_point, tip, warning.
        const renderCallout = (variant, icon, label, content) => content
            ? `<aside class="callout callout--${variant}" role="note">
                <span class="callout-icon" aria-hidden="true">${icon}</span>
                <div class="callout-label">${escapeHtml(label)}</div>
                <div class="callout-body">${formatAnswer(content)}</div>
               </aside>`
            : '';

        const meaningful = n.sections.filter(s =>
            (s.title && s.title.trim())
            || (s.content && s.content.trim().length > 20)
            || s.info || s.legal_quote || s.example || s.comparison
            || s.key_point || s.tip || s.warning
        );
        meaningful.forEach((sec, i) => {
            const secId = sec.section_id || `${n.id}_s${i + 1}`;
            const hasTitle = sec.title && sec.title.trim();
            const hasContent = sec.content && sec.content.trim().length > 0;
            html += `<div class="mod-section">`;
            if (hasTitle) {
                html += `<h3 class="mod-section-title" id="${escapeAttr(secId)}">${escapeHtml(sec.title)}</h3>`;
            }
            if (hasContent) {
                html += `<div class="mod-section-text">${formatAnswer(sec.content)}</div>`;
            }
            html += renderCallout('info',    '💡', 'Pour info',       sec.info);
            html += renderCallout('legal',   '⚖️', 'Texte légal',     sec.legal_quote);
            html += renderCallout('example', '🟢', 'Exemple concret', sec.example);
            html += renderCallout('comp',    '📊', 'Comparaison',     sec.comparison);
            html += renderCallout('key',     '🎯', 'Point clé',       sec.key_point);
            html += renderCallout('tip',     '🧠', 'Astuce mémo',     sec.tip);
            html += renderCallout('warn',    '⚠️', 'Attention',       sec.warning);
            html += `</div>`;
        });
    }

    // ── Key rules — displayed as clean list ──
    if (n.key_rules && n.key_rules.length > 0) {
        html += `<div class="mod-section">
            <h3 class="mod-section-title">Regles essentielles</h3>
            ${n.key_rules.map(r => `<div class="mod-rule">${formatAnswer(r)}</div>`).join('')}
        </div>`;
    }

    // ── Memo items — displayed directly ──
    if (n.memo_items && n.memo_items.length > 0) {
        html += `<div class="mod-section">
            <h3 class="mod-section-title">Memo de revision</h3>`;
        n.memo_items.forEach(item => {
            html += `
            <div class="mod-memo-item">
                <div class="mod-memo-q">${escapeHtml(item.t || '')}</div>
                <div class="mod-memo-a">${formatAnswer(item.c || '')}</div>
            </div>`;
        });
        html += `</div>`;
    }

    // ── Exam tips — highlighted box ──
    if (n.exam_tips && n.exam_tips.length > 0) {
        html += `<div class="mod-tips-box">
            <div class="mod-tips-title">Points cles examen</div>
            ${n.exam_tips.map(t => `<div class="mod-tip">${formatAnswer(t)}</div>`).join('')}
        </div>`;
    }

    // ── Differences IFRS / RPC / CO ──
    if (n.key_differences) {
        const kd = n.key_differences;
        html += `<div class="mod-section">
            <h3 class="mod-section-title">Differences entre referentiels</h3>
            <div class="mod-diff-grid">`;
        if (Array.isArray(kd)) {
            kd.forEach(item => {
                html += `<div class="mod-diff-item"><div class="mod-diff-text">${formatAnswer(item)}</div></div>`;
            });
        } else {
            if (kd.ifrs) html += `<div class="mod-diff-item mod-diff-ifrs"><div class="mod-diff-tag">IFRS</div><div class="mod-diff-text">${formatAnswer(kd.ifrs)}</div></div>`;
            if (kd.rpc)  html += `<div class="mod-diff-item mod-diff-rpc"><div class="mod-diff-tag">RPC</div><div class="mod-diff-text">${formatAnswer(kd.rpc)}</div></div>`;
            if (kd.co)   html += `<div class="mod-diff-item mod-diff-co"><div class="mod-diff-tag">CO</div><div class="mod-diff-text">${formatAnswer(kd.co)}</div></div>`;
        }
        html += `</div></div>`;
    }

    // ── Flashcards — directly visible ──
    if (fcCount > 0) {
        html += `<div class="mod-section">
            <h3 class="mod-section-title">🃏 Flashcards (${fcCount})</h3>
            <div id="modNormFcList"><div style="color:#64748b;font-size:13px">Cliquez pour charger...</div></div>
            <button class="btn btn-outline" style="margin-top:6px" onclick="modLoadNormFc('${escapeAttr(n.id)}')">Afficher les flashcards</button>
        </div>`;
    }

    // ── Notion lessons ──
    html += `<div class="mod-section">
        <h3 class="mod-section-title">📚 Lecons liees</h3>
        <div id="modNormLessons"><div style="color:#64748b;font-size:13px">Chargement...</div></div>
    </div>`;
    setTimeout(() => modLoadNormLessons(n.code), 50);

    // ── Cross-references ──
    if (n.cross_refs && n.cross_refs.length > 0) {
        html += `<div class="mod-section">
            <h3 class="mod-section-title">🔗 Normes liees</h3>
            <div class="mod-related-grid">
                ${n.cross_refs.map(ref => `<span class="mod-related-chip" onclick="modJumpToNorm('${escapeAttr(ref)}')">${escapeHtml(ref)}</span>`).join('')}
            </div>
        </div>`;
    }

    // ── Word document (lazy) ──
    if (n.has_html) {
        html += `<div class="mod-section">
            <h3 class="mod-section-title">📄 Fiche originale Word</h3>
            <button class="btn btn-outline" onclick="modLoadNormHtml('${escapeAttr(n.id)}')">Charger la fiche</button>
            <div class="mod-docx-wrapper hidden" id="modDocxWrapper">
                <div style="padding:16px;color:#64748b">Chargement...</div>
            </div>
        </div>`;
    }

    // ── QCMs liés à cette norme (lazy via api.get_qcm_for_lesson(n.id)) ──
    html += `<div class="mod-section" id="modNormQcmCard">
        <h3 class="mod-section-title">🃏 QCM liés à cette norme</h3>
        <div id="modNormQcmList"><div style="color:#64748b;padding:8px;font-size:13px">Chargement...</div></div>
    </div>`;

    html += `</div>`; // close mod-detail
    el.innerHTML = html;
    el.scrollTop = 0;

    // Lazy-load QCMs (réutilise modLoadLessonQcms — `n` a un `id` et un `code`)
    if (typeof modLoadLessonQcms === 'function') {
        // Adapter : on passe n comme "lesson" (l.id est consulté), wrapper la
        // recherche du conteneur sur #modNormQcmList. Solution simple :
        // appeler une variante dédiée.
        modLoadNormQcms(n, m);
    }
}

// Charge les QCMs liés à une norme (équivalent de modLoadLessonQcms).
async function modLoadNormQcms(norm, module) {
    const container = document.getElementById('modNormQcmList');
    if (!container) return;
    try {
        const items = await api('get_qcm_for_lesson', norm.id);
        const list = items || [];
        if (list.length === 0) {
            container.innerHTML = '<div style="color:#64748b;padding:8px;font-size:13px">Aucun QCM lié pour le moment.</div>';
            return;
        }
        let html = `<div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span style="font-size:13px;color:#94a3b8">${list.length} QCM</span>
            <button class="btn btn-primary" style="padding:4px 12px;font-size:12px" onclick="modLaunchLessonQcm('${escapeAttr(norm.id)}')">▶ Lancer cette série dans l'onglet QCM</button>
        </div>`;
        list.forEach((q, i) => {
            const aId = 'mnqa_' + escapeAttr(norm.id) + '_' + i;
            const opts = Array.isArray(q.options) && q.options.length
                ? `<div style="margin-top:6px;font-size:12px;color:#94a3b8">${q.options.map(o => escapeHtml(String(o))).join(' · ')}</div>`
                : '';
            const explanation = q.explanation
                ? `<div style="margin-top:8px;color:#cbd5e1;font-size:12px;line-height:1.6;white-space:pre-wrap">${formatAnswer(q.explanation)}</div>`
                : '';
            const ansLabel = (q.type === 'vrai_faux')
                ? (q.answer ? '✓ Vrai' : '✗ Faux')
                : (typeof q.answer === 'number' ? `Réponse : ${String.fromCharCode(65 + q.answer)}` : '');
            html += `
            <div style="border:1px solid #334155;border-radius:6px;padding:10px;margin-bottom:8px;background:#1e293b">
                <div style="font-weight:600;font-size:13px;color:#e2e8f0">Q${i+1}. ${formatAnswer(q.question || '')}</div>
                ${opts}
                <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                    <button class="btn btn-outline" style="padding:3px 10px;font-size:12px" onclick="(function(el){var d=document.getElementById('${aId}');d.style.display=(d.style.display==='none')?'block':'none';el.textContent=(d.style.display==='none')?'Voir réponse':'Masquer réponse';})(this)">Voir réponse</button>
                </div>
                <div id="${aId}" style="display:none;margin-top:8px;padding-top:8px;border-top:1px solid #334155;font-size:13px;color:#cbd5e1;line-height:1.6">
                    <div style="color:#fbbf24;font-weight:600">${escapeHtml(ansLabel)}</div>
                    ${explanation}
                </div>
            </div>`;
        });
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<div style="color:#ef4444;padding:8px;font-size:13px">Erreur de chargement : ${escapeHtml(String(e))}</div>`;
    }
}

// ── Confidence stars ──

function modClickableStars(normId, level) {
    let s = '';
    for (let i = 1; i <= 5; i++) {
        s += `<span class="mod-star ${i <= level ? 'filled' : ''}" onclick="event.stopPropagation();modSetConfidence('${escapeAttr(normId)}',${i === level ? 0 : i})">★</span>`;
    }
    if (level > 0) {
        s += `<span class="mod-star-reset" onclick="event.stopPropagation();modSetConfidence('${escapeAttr(normId)}',0)" title="Remettre a 0">✕</span>`;
    }
    return `<span class="mod-stars-row">${s}</span>`;
}

async function modSetConfidence(normId, level) {
    const m = modData.find(x => x.id === modSelectedId);
    if (!m) return;
    const n = (m.norms || []).find(x => x.id === normId);
    if (!n) return;
    n.confidence = level;
    await api('update_norm', n.code, n.category, level);
    // Re-render preserving scroll
    const readEl = document.getElementById('modReading');
    const sideEl = document.getElementById('modSidebar');
    const readScroll = readEl ? readEl.scrollTop : 0;
    const sideScroll = sideEl ? sideEl.scrollTop : 0;
    modRenderSidebar();
    modRenderNormDetail(n, m);
    if (readEl) readEl.scrollTop = readScroll;
    if (sideEl) sideEl.scrollTop = sideScroll;
    modLsReapply();
}

async function modMarkRevised(normId) {
    const m = modData.find(x => x.id === modSelectedId);
    if (!m) return;
    const n = (m.norms || []).find(x => x.id === normId);
    if (!n) return;
    n.revision_count = (n.revision_count || 0) + 1;
    n.last_revised = new Date().toISOString();
    await api('update_norm', n.code, n.category, n.confidence);
    const readEl = document.getElementById('modReading');
    const sideEl = document.getElementById('modSidebar');
    const readScroll = readEl ? readEl.scrollTop : 0;
    const sideScroll = sideEl ? sideEl.scrollTop : 0;
    modRenderSidebar();
    modRenderNormDetail(n, m);
    if (readEl) readEl.scrollTop = readScroll;
    if (sideEl) sideEl.scrollTop = sideScroll;
}

async function modUndoRevised(normId) {
    const m = modData.find(x => x.id === modSelectedId);
    if (!m) return;
    const n = (m.norms || []).find(x => x.id === normId);
    if (!n) return;
    if (n.revision_count > 0) n.revision_count -= 1;
    if (n.revision_count === 0) n.last_revised = null;
    await api('update_norm', n.code, n.category, n.confidence);
    const readEl = document.getElementById('modReading');
    const sideEl = document.getElementById('modSidebar');
    const readScroll = readEl ? readEl.scrollTop : 0;
    const sideScroll = sideEl ? sideEl.scrollTop : 0;
    modRenderSidebar();
    modRenderNormDetail(n, m);
    if (readEl) readEl.scrollTop = readScroll;
    if (sideEl) sideEl.scrollTop = sideScroll;
    modLsReapply();
}

// ── PDF export ──

async function modExportNormPdf(normId, btn) {
    if (!btn) btn = event && event.currentTarget;
    const original = btn ? btn.innerHTML : null;
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Export...'; }
    try {
        const res = await api('export_norm_pdf', normId);
        modShowExportFeedback(btn, res, original, '📄 PDF');
    } catch (e) {
        modShowExportFeedback(btn, { ok: false, error: String(e) }, original, '📄 PDF');
    }
}

async function modExportLessonPdf(moduleId, lessonId, btn) {
    if (!btn) btn = event && event.currentTarget;
    const original = btn ? btn.innerHTML : null;
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Export...'; }
    try {
        const res = await api('export_lesson_pdf', moduleId, lessonId);
        modShowExportFeedback(btn, res, original, '📄 PDF');
    } catch (e) {
        modShowExportFeedback(btn, { ok: false, error: String(e) }, original, '📄 PDF');
    }
}

function modShowExportFeedback(btn, res, originalLabel, defaultLabel) {
    if (!btn) {
        if (res && res.error) alert('Export PDF échoué : ' + res.error);
        return;
    }
    btn.disabled = false;
    if (res && res.ok) {
        btn.innerHTML = '✅ Exporté';
        setTimeout(() => { btn.innerHTML = originalLabel || defaultLabel; }, 1800);
    } else if (res && res.cancelled) {
        btn.innerHTML = originalLabel || defaultLabel;
    } else {
        btn.innerHTML = '❌ Erreur';
        if (res && res.error) console.error('export PDF:', res.error);
        setTimeout(() => { btn.innerHTML = originalLabel || defaultLabel; }, 2200);
        if (res && res.error) alert('Export PDF échoué : ' + res.error);
    }
}

// ── Lazy loaders for norm detail ──

async function modLoadNormHtml(normId) {
    const el = document.getElementById('modDocxWrapper');
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

async function modLoadNormFc(normId) {
    const m = modData.find(x => x.id === modSelectedId);
    if (!m) return;
    const n = (m.norms || []).find(x => x.id === normId);
    if (!n) return;
    const cat = n.category || '';
    const allCards = await api('get_flashcards', cat);
    if (!allCards) return;

    const ids = new Set(n.flashcard_ids || []);
    const cards = allCards.filter(c => ids.has(c.id));
    const el = document.getElementById('modNormFcList');
    if (!el) return;

    if (cards.length === 0) {
        el.innerHTML = '<div style="color:#64748b;padding:8px;font-size:13px">Aucune flashcard trouvee.</div>';
        return;
    }

    el.innerHTML = cards.map(c => {
        const badge = c.difficulty === 'piege' ? 'badge-hard' : c.difficulty === 'moyen' ? 'badge-medium' : 'badge-easy';
        const label = c.difficulty === 'piege' ? 'Piege' : c.difficulty === 'moyen' ? 'Moyen' : 'Facile';
        return `
        <div class="mod-fc" onclick="this.classList.toggle('show')">
            <div class="mod-fc-q">
                <span class="badge ${badge}" style="font-size:10px;margin-right:6px">${label}</span>
                ${formatAnswer(c.question)}
            </div>
            <div class="mod-fc-a">${formatAnswer(c.answer)}</div>
        </div>`;
    }).join('');
}

async function modLoadNormLessons(normCode) {
    const el = document.getElementById('modNormLessons');
    if (!el) return;

    const lessons = await api('get_lessons_for_norm', normCode);
    if (!lessons || lessons.length === 0) {
        el.innerHTML = '<div style="color:#64748b;font-size:13px;padding:4px">Aucune lecon Notion liee a cette norme</div>';
        return;
    }

    const bySection = {};
    lessons.forEach(l => {
        const sec = l.section || 'Sans section';
        if (!bySection[sec]) bySection[sec] = [];
        bySection[sec].push(l);
    });

    let html = `<div style="font-size:12px;color:#64748b;margin-bottom:8px">${lessons.length} lecon(s) liee(s) a ${escapeHtml(normCode)}</div>`;
    for (const [section, items] of Object.entries(bySection)) {
        html += `<div class="mod-lesson-section">
            <div class="mod-lesson-sec-title">${escapeHtml(section)}</div>`;
        items.forEach(l => {
            const statusIcon = l.status === 'Done' ? '✅' : l.status === 'In progress' ? '🔄' : '⬜';
            const prioClass = (l.priority || '').includes('Haute') ? 'mod-lesson-prio-haute' :
                              (l.priority || '').includes('Moyenne') ? 'mod-lesson-prio-moyenne' : 'mod-lesson-prio-faible';
            html += `
            <div class="mod-lesson-row">
                <span class="mod-lesson-status">${statusIcon}</span>
                <span class="mod-lesson-text">${addCrossRefs(l.concept || '')}</span>
                <span class="mod-lesson-prio ${prioClass}">${escapeHtml((l.priority || '').replace(/[🔴🟡🟢]\s*/g, ''))}</span>
            </div>`;
        });
        html += `</div>`;
    }
    el.innerHTML = html;
}

// ── Cross-ref jump ──

function modJumpToNorm(refCode) {
    // Find norm across all modules
    const clean = refCode.toLowerCase().replace(/\s/g, '');
    for (const m of modData) {
        for (const n of (m.norms || [])) {
            if (n.code.toLowerCase().replace(/\s/g, '') === clean) {
                modSelectedId = m.id;
                modSelectedItem = { type: 'norm', id: n.id };
                modRenderPills();
                modRenderSidebar();
                modRenderNormDetail(n, m);
                return;
            }
        }
    }
    // Fallback: show cross-ref popover if function exists
    if (typeof showCrossRefPopover === 'function') {
        showCrossRefPopover(event, clean, refCode);
    }
}

/**
 * Jump from a "referenced framework" chip in module X to where this label is
 * actually detailed (its owner_module). Tries to auto-select the matching norm
 * in the owner; falls back to a soft landing if the norm doesn't exist there yet.
 */
function modJumpToFramework(code, ownerModule) {
    if (!ownerModule) return;
    const target = modData.find(x => x.id === ownerModule || x.code === ownerModule);
    if (!target) {
        console.warn('Module owner introuvable :', ownerModule);
        return;
    }
    modSelectedId = target.id;
    modSelectedItem = null;
    modExpandedTopics = new Set();
    modRenderPills();
    modRenderSidebar();

    const clean = (code || '').toLowerCase().replace(/\s/g, '');
    const n = (target.norms || []).find(x => (x.code || '').toLowerCase().replace(/\s/g, '') === clean);
    if (n) {
        modSelectedItem = { type: 'norm', id: n.id };
        modRenderSidebar();
        modRenderNormDetail(n, target);
        // Center the active pill if scroll bar
        const bar = document.getElementById('modPillsBar');
        const active = bar && bar.querySelector('.mod-pill-active');
        if (active && active.scrollIntoView) {
            active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    } else {
        modRenderEmpty();
    }
}

// ═══════════════════════════════════════
// IFP Lesson detail
// ═══════════════════════════════════════

function modRenderLessonIfpDetail(l, m) {
    const el = document.getElementById('modReading');
    if (!el) return;

    const color = m.color || getModuleColor(m.code);
    const relMap = {
        'Haute':  { cls: 'mod-rel-high', label: 'Haute' },
        'Moyenne':{ cls: 'mod-rel-med',  label: 'Moyenne' },
        'Basse':  { cls: 'mod-rel-low',  label: 'Basse' }
    };
    const rel = relMap[l.exam_relevance] || relMap['Moyenne'];

    let html = `<div class="mod-detail fade-in">

    <!-- Header -->
    <div class="mod-header-card" style="border-color:${color}44;background:linear-gradient(135deg, ${color}22, ${color}0a)">
        <div class="mod-hc-top">
            <div class="mod-hc-left">
                <div class="mod-hc-cat" style="color:${color}">${escapeHtml(m.code)} — Leçon</div>
                <h2 class="mod-hc-title">
                    <span class="mod-lesson-num-badge" style="background:${color}22;color:${color}">L${l.number}</span>
                    ${escapeHtml(modStripLessonNumPrefix(l.title, l.number))}
                </h2>
            </div>
            <div class="mod-hc-actions">
                <span class="mod-relevance ${rel.cls}">Pertinence : ${rel.label}</span>
                <button class="btn btn-outline" style="padding:6px 12px;font-size:12px" onclick="modExportLessonPdf('${escapeAttr(m.id)}', '${escapeAttr(l.id)}', this)" title="Exporter cette leçon en PDF">
                    📄 PDF
                </button>
                <button class="btn btn-outline" style="padding:6px 12px;font-size:12px;color:#8b5cf6;border-color:#8b5cf644" onclick="modOpenMindmap('${escapeAttr(l.id)}')" title="Voir la mindmap de cette leçon">
                    🧠 Mindmap
                </button>
            </div>
        </div>
    </div>`;

    // ── Audio files (podcasts NotebookLM-style) ──
    if (Array.isArray(l.audio_files) && l.audio_files.length > 0) {
        for (const af of l.audio_files) {
            if (!af || !af.path) continue;
            const mime = af.mime || 'audio/mpeg';
            const title = af.title || 'Audio';
            const kindLabel = af.kind === 'podcast' ? 'Podcast' : af.kind === 'lecture' ? 'Cours audio' : 'Audio';
            html += `<div class="mod-audio">
                <div class="mod-audio-head">
                    <span class="mod-audio-icon" aria-hidden="true">🎧</span>
                    <div class="mod-audio-meta">
                        <div class="mod-audio-kind">${escapeHtml(kindLabel)}</div>
                        <div class="mod-audio-title">${escapeHtml(title)}</div>
                    </div>
                </div>
                <audio class="mod-audio-player" controls preload="metadata">
                    <source src="${escapeAttr(af.path)}" type="${escapeAttr(mime)}">
                    Ton navigateur ne supporte pas la lecture audio.
                </audio>
            </div>`;
        }
    }

    // Content sections (main course content)
    if (l.content && l.content.length > 0) {
        l.content.forEach((sec, i) => {
            if (typeof sec === 'string') {
                html += `<div class="mod-card"><div class="mod-card-text">${formatAnswer(sec)}</div></div>`;
            } else {
                const secId = sec.section_id || `${l.id}_s${i + 1}`;

                // Callouts via classes CSS tokenisées (cf. style.css → .callout--*).
                // Plus aucun inline style ni side-stripe ; thème dark/light géré par les tokens.
                const callout = (variant, icon, label, content) => content
                    ? `<aside class="callout callout--${variant}" role="note">
                        <span class="callout-icon" aria-hidden="true">${icon}</span>
                        <div class="callout-label">${escapeHtml(label)}</div>
                        <div class="callout-body">${formatAnswer(content)}</div>
                       </aside>`
                    : '';

                const infoHtml       = callout('info',    '💡', 'Pour info',         sec.info);
                const legalHtml      = callout('legal',   '⚖️', 'Texte légal',       sec.legal_quote);
                const exampleHtml    = callout('example', '🟢', 'Exemple concret',   sec.example);
                const comparisonHtml = callout('comp',    '📊', 'Comparaison',       sec.comparison);
                const keyPointHtml   = callout('key',     '🎯', 'Point clé',         sec.key_point);
                const tipHtml        = callout('tip',     '🧠', 'Astuce mémo',       sec.tip);
                const warningHtml    = callout('warn',    '⚠️', 'Attention',         sec.warning);

                html += `
                <div class="mod-card">
                    <h3 class="mod-card-label" id="${escapeAttr(secId)}">${escapeHtml(sec.title || '')}</h3>
                    <div class="mod-card-text">${formatAnswer(sec.body || '')}</div>
                    ${infoHtml}
                    ${legalHtml}
                    ${exampleHtml}
                    ${comparisonHtml}
                    ${keyPointHtml}
                    ${tipHtml}
                    ${warningHtml}
                </div>`;
            }
        });
    } else {
        // No content yet — show topics as table of contents
        if (l.topics && l.topics.length > 0) {
            html += `<div class="mod-card">
                <div class="mod-card-label">Sommaire (${l.topics.length} themes)</div>
                <div class="mod-topics-list">`;
            l.topics.forEach((topic, ti) => {
                const topicKey = `${l.id}_t${ti}`;
                const isOpen = modExpandedTopics.has(topicKey);
                const hasSubs = topic.subtopics && topic.subtopics.length > 0;
                const arrow = hasSubs ? (isOpen ? '&#9660;' : '&#9654;') : '';
                const subsHtml = (hasSubs && isOpen)
                    ? `<div class="mod-subtopics">${topic.subtopics.map(s => `<div class="mod-sub">${escapeHtml(s)}</div>`).join('')}</div>`
                    : '';
                html += `
                <div class="mod-topic ${hasSubs ? 'mod-topic-clickable' : ''}" onclick="${hasSubs ? `modToggleTopic('${topicKey}', '${escapeAttr(l.id)}')` : ''}">
                    ${arrow ? `<span class="mod-topic-arrow">${arrow}</span>` : ''}
                    <span class="mod-topic-label">${escapeHtml(topic.t)}</span>
                    ${hasSubs ? `<span class="mod-topic-count">${topic.subtopics.length}</span>` : ''}
                </div>
                ${subsHtml}`;
            });
            html += `</div></div>`;
        }
        html += `<div class="mod-card" style="text-align:center;padding:20px">
            <div style="color:#64748b;font-size:13px">📝 Contenu detaille a venir — cette lecon sera remplie prochainement</div>
        </div>`;
    }

    // Cross-refs
    if (l.cross_refs && l.cross_refs.length > 0) {
        html += `<div class="mod-card">
            <div class="mod-card-label">🔗 References croisees</div>
            <div class="mod-related-grid">
                ${l.cross_refs.map(ref =>
                    `<span class="mod-related-chip" onclick="modJumpToNorm('${escapeAttr(ref)}')">${escapeHtml(ref)}</span>`
                ).join('')}
            </div>
        </div>`;
    }

    // Flashcards linked to this lesson (filtered by sub containing the lesson code, e.g. "M1L1")
    const lessonCodeShort = (l.code || '').replace(/[^A-Za-z0-9]/g, ''); // "M1-L1" -> "M1L1"
    if (lessonCodeShort) {
        html += `<div class="mod-card" id="modLessonFcCard">
            <div class="mod-card-label">🃏 Flashcards de cette leçon</div>
            <div id="modLessonFcList"><div style="color:#64748b;padding:8px;font-size:13px">Chargement...</div></div>
        </div>`;
    }

    // QCMs liés à cette leçon (lazy-load via api('get_qcm_for_lesson', l.id))
    html += `<div class="mod-card" id="modLessonQcmCard">
        <div class="mod-card-label">🃏 QCM liés à cette leçon</div>
        <div id="modLessonQcmList"><div style="color:#64748b;padding:8px;font-size:13px">Chargement...</div></div>
    </div>`;

    html += `</div>`;
    el.innerHTML = html;
    el.scrollTop = 0;

    // Async-load flashcards for this lesson
    if (lessonCodeShort) {
        modLoadLessonFlashcards(lessonCodeShort, l, m);
    }
    // Async-load QCMs for this lesson
    modLoadLessonQcms(l, m);
}

// Load QCMs matching this lesson via the api `get_qcm_for_lesson`
async function modLoadLessonQcms(lesson, module) {
    const container = document.getElementById('modLessonQcmList');
    if (!container) return;
    try {
        const items = await api('get_qcm_for_lesson', lesson.id);
        const list = items || [];
        if (list.length === 0) {
            container.innerHTML = '<div class="u-text-muted u-mini-text">Aucun QCM lié pour le moment.</div>';
            return;
        }
        let html = `<div class="u-row-spread">
            <span class="u-text-muted u-mini-text">${list.length} QCM</span>
            <button class="btn btn-primary btn-sm" onclick="modLaunchLessonQcm('${escapeAttr(lesson.id)}')">▶ Lancer cette série dans l'onglet QCM</button>
        </div>`;
        list.forEach((q, i) => {
            const aId = 'mlqa_' + escapeAttr(lesson.id) + '_' + i;
            const opts = Array.isArray(q.options) && q.options.length
                ? `<div class="u-text-muted u-mini-text u-mt-6">${q.options.map(o => escapeHtml(String(o))).join(' · ')}</div>`
                : '';
            const explanation = q.explanation
                ? `<div class="u-text-secondary u-mini-text u-mt-8 u-prewrap">${formatAnswer(q.explanation)}</div>`
                : '';
            const ansLabel = (q.type === 'vrai_faux')
                ? (q.answer ? '✓ Vrai' : '✗ Faux')
                : (typeof q.answer === 'number' ? `Réponse : ${String.fromCharCode(65 + q.answer)}` : '');
            html += `
            <div class="u-list-item">
                <div class="u-text-strong u-mini-text">Q${i+1}. ${formatAnswer(q.question || '')}</div>
                ${opts}
                <div class="u-row u-mt-8">
                    <button class="btn btn-outline btn-xs" onclick="(function(el){var d=document.getElementById('${aId}');d.style.display=(d.style.display==='none')?'block':'none';el.textContent=(d.style.display==='none')?'Voir réponse':'Masquer réponse';})(this)">Voir réponse</button>
                    <button class="btn btn-primary btn-xs" onclick="modLaunchLessonQcm('${escapeAttr(lesson.id)}')">▶ Lancer cette série dans l'onglet QCM</button>
                </div>
                <div id="${aId}" class="u-collapsible">
                    <div class="u-answer-label">${escapeHtml(ansLabel)}</div>
                    ${explanation}
                </div>
            </div>`;
        });
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<div class="u-text-error u-mini-text">Erreur de chargement : ${escapeHtml(String(e))}</div>`;
    }
}

// Launch the QCM tab pre-filtered on this lesson
function modLaunchLessonQcm(lessonId) {
    try { sessionStorage.setItem('qcmLessonFilter', JSON.stringify({ lessonId })); } catch(e){}
    if (typeof navigate === 'function') navigate('qcm');
}

// Load flashcards matching this lesson (by subcategory containing the lesson code)
async function modLoadLessonFlashcards(lessonCodeShort, lesson, module) {
    const container = document.getElementById('modLessonFcList');
    if (!container) return;
    try {
        const cat = (module.code === 'M1') ? 'Expert suisse'
                  : (module.code === 'M2') ? 'Audit'
                  : null;
        const allCards = cat ? await api('get_flashcards', cat) : await api('get_flashcards');
        const matching = (allCards || []).filter(c => {
            const sub = (c.subcategory || c.sub || '').replace(/[^A-Za-z0-9]/g, '');
            return sub.indexOf(lessonCodeShort) !== -1;
        });
        if (matching.length === 0) {
            container.innerHTML = '<div class="u-text-muted u-mini-text">Aucune flashcard liée trouvée.</div>';
            return;
        }
        let html = `<div class="u-row-spread">
            <span class="u-text-muted u-mini-text">${matching.length} flashcards</span>
            <button class="btn btn-primary btn-sm" onclick="modLaunchLessonFlashcards('${escapeAttr(lessonCodeShort)}','${escapeAttr(module.code)}')">▶ Réviser</button>
        </div>`;
        matching.slice(0, 30).forEach((c, i) => {
            const cardId = 'mflc_' + lessonCodeShort + '_' + i;
            html += `
            <div class="u-list-item u-clickable" onclick="document.getElementById('${cardId}').style.display=document.getElementById('${cardId}').style.display==='none'?'block':'none'">
                <div class="u-text-strong u-mini-text">Q${i+1}. ${formatAnswer(c.question || c.q || '')}</div>
                <div id="${cardId}" class="u-collapsible u-prewrap">${formatAnswer(c.answer || c.a || '')}</div>
            </div>`;
        });
        if (matching.length > 30) {
            html += `<div class="u-text-muted u-mini-text u-text-center u-mt-6">… et ${matching.length - 30} autres (cliquer "Réviser" pour tout voir)</div>`;
        }
        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<div style="color:#ef4444;padding:8px;font-size:13px">Erreur de chargement : ${escapeHtml(String(e))}</div>`;
    }
}

// Launch the trainer with cards filtered by lesson code
function modLaunchLessonFlashcards(lessonCodeShort, moduleCode) {
    // Store filter in session and switch to trainer
    try { sessionStorage.setItem('trainerLessonFilter', JSON.stringify({ lessonCode: lessonCodeShort, moduleCode })); } catch(e){}
    if (typeof switchTab === 'function') switchTab('trainer');
    else if (window.location && window.location.hash !== undefined) window.location.hash = '#trainer';
}

function modToggleTopic(topicKey, lessonId) {
    if (modExpandedTopics.has(topicKey)) {
        modExpandedTopics.delete(topicKey);
    } else {
        modExpandedTopics.add(topicKey);
    }
    const m = modData.find(x => x.id === modSelectedId);
    if (!m) return;
    const l = (m.lessons_ifp || []).find(x => x.id === lessonId);
    if (l) modRenderLessonIfpDetail(l, m);
}

// ═══════════════════════════════════════
// Notion lessons pane
// ═══════════════════════════════════════

function modRenderNotionLessons() {
    const el = document.getElementById('modReading');
    if (!el) return;
    const m = modData.find(x => x.id === modSelectedId);
    if (!m) return;

    const lessons = m.lessons_notion || [];
    const color = m.color || getModuleColor(m.code);

    // Group by section
    const bySection = {};
    lessons.forEach(l => {
        const sec = l.section || 'Sans section';
        if (!bySection[sec]) bySection[sec] = [];
        bySection[sec].push(l);
    });

    let html = `<div class="mod-detail fade-in">
    <div class="mod-header-card" style="border-color:${color}44;background:linear-gradient(135deg, ${color}22, ${color}0a)">
        <div class="mod-hc-top">
            <div class="mod-hc-left">
                <div class="mod-hc-cat" style="color:${color}">${escapeHtml(m.code)}</div>
                <h2 class="mod-hc-title">📝 Lecons Notion</h2>
            </div>
            <div class="mod-hc-actions">
                <span style="font-size:13px;color:#94a3b8">${lessons.length} lecon(s)</span>
            </div>
        </div>
    </div>`;

    for (const [section, items] of Object.entries(bySection)) {
        html += `<div class="mod-card">
            <div class="mod-card-label">${escapeHtml(section)}</div>`;
        items.forEach(l => {
            const statusIcon = l.status === 'Done' ? '✅' : l.status === 'In progress' ? '🔄' : '⬜';
            const prioClass = (l.priority || '').includes('Haute') ? 'mod-lesson-prio-haute' :
                              (l.priority || '').includes('Moyenne') ? 'mod-lesson-prio-moyenne' : 'mod-lesson-prio-faible';
            const typeTag = l.type ? `<span class="mod-notion-type">${escapeHtml(l.type)}</span>` : '';
            html += `
            <div class="mod-lesson-row">
                <span class="mod-lesson-status">${statusIcon}</span>
                <span class="mod-lesson-text">${addCrossRefs(l.concept || '')}</span>
                ${typeTag}
                <span class="mod-lesson-prio ${prioClass}">${escapeHtml((l.priority || '').replace(/[🔴🟡🟢]\s*/g, ''))}</span>
            </div>`;
        });
        html += `</div>`;
    }

    html += `</div>`;
    el.innerHTML = html;
    el.scrollTop = 0;
}

// ═══════════════════════════════════════
// Flashcards pane
// ═══════════════════════════════════════

async function modRenderFlashcardsPane() {
    const el = document.getElementById('modReading');
    if (!el) return;
    const m = modData.find(x => x.id === modSelectedId);
    if (!m) return;

    const color = m.color || getModuleColor(m.code);
    el.innerHTML = `<div class="mod-detail fade-in">
        <div class="mod-header-card" style="border-color:${color}44;background:linear-gradient(135deg, ${color}22, ${color}0a)">
            <div class="mod-hc-top">
                <div class="mod-hc-left">
                    <div class="mod-hc-cat" style="color:${color}">${escapeHtml(m.code)}</div>
                    <h2 class="mod-hc-title">🃏 Flashcards</h2>
                </div>
                <div class="mod-hc-actions">
                    <span style="font-size:13px;color:#94a3b8">${m.flashcard_count || 0} flashcards</span>
                </div>
            </div>
        </div>
        <div class="mod-card">
            <div id="modAllFcList"><div style="color:#64748b;padding:20px;text-align:center">Chargement des flashcards...</div></div>
        </div>
    </div>`;
    el.scrollTop = 0;

    // Collect all flashcard IDs from norms in this module
    const allIds = new Set();
    (m.norms || []).forEach(n => {
        (n.flashcard_ids || []).forEach(id => allIds.add(id));
    });

    // Determine category for API call
    const firstNorm = (m.norms || [])[0];
    const cat = firstNorm ? firstNorm.category : '';
    const allCards = await api('get_flashcards', cat);
    const fcEl = document.getElementById('modAllFcList');
    if (!fcEl) return;

    if (!allCards || allCards.length === 0) {
        fcEl.innerHTML = '<div style="color:#64748b;padding:20px;text-align:center">Aucune flashcard disponible.</div>';
        return;
    }

    const cards = allIds.size > 0 ? allCards.filter(c => allIds.has(c.id)) : allCards;
    if (cards.length === 0) {
        fcEl.innerHTML = '<div style="color:#64748b;padding:20px;text-align:center">Aucune flashcard trouvee pour ce module.</div>';
        return;
    }

    fcEl.innerHTML = cards.map(c => {
        const badge = c.difficulty === 'piege' ? 'badge-hard' : c.difficulty === 'moyen' ? 'badge-medium' : 'badge-easy';
        const label = c.difficulty === 'piege' ? 'Piege' : c.difficulty === 'moyen' ? 'Moyen' : 'Facile';
        return `
        <div class="mod-fc" onclick="this.classList.toggle('show')">
            <div class="mod-fc-q">
                <span class="badge ${badge}" style="font-size:10px;margin-right:6px">${label}</span>
                ${formatAnswer(c.question)}
            </div>
            <div class="mod-fc-a">${formatAnswer(c.answer)}</div>
        </div>`;
    }).join('');
}

// ── Utility ──

// Strip a leading "L{n} — " (or "L{n} -", "L{n}:") from the lesson title
// when we already display the number as a separate badge, to avoid the
// "L1 — L1 — …" duplicate rendering.
function modStripLessonNumPrefix(title, number) {
    if (!title || number == null) return title || '';
    const n = String(number).trim();
    // matches "L1 — ", "L1 - ", "L1 : ", "L1. ", with optional spaces, case-insensitive
    const re = new RegExp('^\\s*L\\s*' + n + '\\s*[—\\-:\\.]\\s*', 'i');
    return title.replace(re, '').trim();
}

function modTimeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    if (days < 7) return `il y a ${days}j`;
    if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`;
    return `il y a ${Math.floor(days / 30)} mois`;
}

// ═══════════════════════════════════════
// Pills bar — arrow navigation
// ═══════════════════════════════════════

function modPillsScroll(dir) {
    const bar = document.getElementById('modPillsBar');
    if (!bar) return;
    bar.scrollBy({ left: dir * 220, behavior: 'smooth' });
    setTimeout(modUpdatePillsArrows, 250);
}

function modUpdatePillsArrows() {
    const bar = document.getElementById('modPillsBar');
    const l = document.getElementById('modPillsArrowL');
    const r = document.getElementById('modPillsArrowR');
    if (!bar || !l || !r) return;
    const canLeft = bar.scrollLeft > 4;
    const canRight = bar.scrollLeft < bar.scrollWidth - bar.clientWidth - 4;
    l.style.opacity = canLeft ? '1' : '0';
    l.style.pointerEvents = canLeft ? 'auto' : 'none';
    r.style.opacity = canRight ? '1' : '0';
    r.style.pointerEvents = canRight ? 'auto' : 'none';
}

// ═══════════════════════════════════════
// Local search (within current norm)
// ═══════════════════════════════════════

function modLsShow() {
    const bar = document.getElementById('modLocalSearch');
    if (bar) bar.style.display = 'flex';
    modLsMatches = [];
    modLsCurrent = -1;
    const inp = document.getElementById('modLsInput');
    if (inp) { inp.value = ''; inp.focus(); }
    const cnt = document.getElementById('modLsCount');
    if (cnt) cnt.textContent = '';
}

function modLsHide() {
    const bar = document.getElementById('modLocalSearch');
    if (bar) bar.style.display = 'none';
    modLsClearHighlights();
    modLsMatches = [];
    modLsCurrent = -1;
}

function modLsClearHighlights() {
    const el = document.getElementById('modReading');
    if (!el) return;
    el.querySelectorAll('mark.mod-hl').forEach(m => {
        const parent = m.parentNode;
        if (parent) {
            parent.replaceChild(document.createTextNode(m.textContent), m);
            parent.normalize();
        }
    });
}

function modLocalSearch(query) {
    modLsClearHighlights();
    modLsMatches = [];
    modLsCurrent = -1;
    const cnt = document.getElementById('modLsCount');
    if (!query || query.length < 2) {
        if (cnt) cnt.textContent = '';
        return;
    }
    const el = document.getElementById('modReading');
    if (!el) return;
    const lower = query.toLowerCase();
    const qLen = lower.length;

    // Collect all matching text nodes first (before any DOM mutation)
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const hits = [];
    let node;
    while ((node = walker.nextNode())) {
        if (node.nodeValue.toLowerCase().includes(lower)) {
            hits.push({ node, text: node.nodeValue });
        }
    }

    // Replace each hit node with a fragment containing mark elements
    hits.forEach(({ node, text }) => {
        const frag = document.createDocumentFragment();
        let cur = 0;
        let pos = text.toLowerCase().indexOf(lower, cur);
        while (pos >= 0) {
            if (pos > cur) frag.appendChild(document.createTextNode(text.slice(cur, pos)));
            const mark = document.createElement('mark');
            mark.className = 'mod-hl';
            mark.textContent = text.slice(pos, pos + qLen);
            frag.appendChild(mark);
            modLsMatches.push(mark);
            cur = pos + qLen;
            pos = text.toLowerCase().indexOf(lower, cur);
        }
        if (cur < text.length) frag.appendChild(document.createTextNode(text.slice(cur)));
        if (node.parentNode) node.parentNode.replaceChild(frag, node);
    });

    if (cnt) cnt.textContent = modLsMatches.length ? `${modLsMatches.length} résultat(s)` : 'Aucun résultat';
    if (modLsMatches.length > 0) modLsScrollTo(0);
}

function modLsScrollTo(idx) {
    if (idx < 0 || idx >= modLsMatches.length) return;
    if (modLsCurrent >= 0 && modLsMatches[modLsCurrent]) {
        modLsMatches[modLsCurrent].classList.remove('mod-hl-cur');
    }
    modLsCurrent = idx;
    const mark = modLsMatches[idx];
    mark.classList.add('mod-hl-cur');
    mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const cnt = document.getElementById('modLsCount');
    if (cnt) cnt.textContent = `${idx + 1} / ${modLsMatches.length}`;
}

function modLsNav(dir) {
    if (modLsMatches.length === 0) return;
    modLsScrollTo((modLsCurrent + dir + modLsMatches.length) % modLsMatches.length);
}

function modLsKeydown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        modLsNav(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
        modLsHide();
    }
}

// Ctrl+F opens local search when viewing a norm
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        const bar = document.getElementById('modLocalSearch');
        if (!bar) return; // not on modules page
        e.preventDefault();
        if (bar.style.display === 'none') {
            // Only show if a norm is currently selected
            if (modSelectedItem && modSelectedItem.type === 'norm') {
                modLsShow();
            }
        } else {
            const inp = document.getElementById('modLsInput');
            if (inp) inp.focus();
        }
    }
}, { capture: true });

function modLsReapply() {
    const inp = document.getElementById('modLsInput');
    if (inp && inp.value.length >= 2) {
        modLsMatches = [];
        modLsCurrent = -1;
        modLocalSearch(inp.value);
    }
}

// ═══════════════════════════════════════
// Reading zoom (persisted)
// ═══════════════════════════════════════

const MOD_ZOOM_STEPS = [0.75, 0.85, 0.95, 1.0, 1.1, 1.25, 1.4, 1.6, 1.8];
const MOD_ZOOM_KEY = 'swisscpa_mod_zoom';
// Clé localStorage par sélecteur cible — chaque famille de cartes a son zoom.
const APP_ZOOM_KEY_PREFIX = 'swisscpa_zoom_';

// ── Helpers globaux (utilisables hors onglet Modules) ────────────────────
// `selector` : CSS selector de la zone à zoomer. Défaut : ".mod-reading".
//   - ".mod-reading"  → zoom de la lecture (Modules) — clé legacy MOD_ZOOM_KEY
//   - ".qcm-card"     → zoom des cartes QCM
//   - ".fc-card"      → zoom des cartes flashcards
function appZoomKey(selector) {
    if (!selector || selector === '.mod-reading') return MOD_ZOOM_KEY;
    return APP_ZOOM_KEY_PREFIX + selector.replace(/[^A-Za-z0-9]/g, '_');
}

function appZoomGet(selector) {
    const v = parseFloat(localStorage.getItem(appZoomKey(selector)));
    if (!v || isNaN(v)) return 1.0;
    return Math.min(Math.max(v, MOD_ZOOM_STEPS[0]), MOD_ZOOM_STEPS[MOD_ZOOM_STEPS.length - 1]);
}

function appZoomApply(selector) {
    const sel = selector || '.mod-reading';
    const z = appZoomGet(sel);
    document.querySelectorAll(sel).forEach(el => { el.style.zoom = z; });
    // Met à jour le label du zoom global (s'il est visible).
    const label = document.getElementById('appZoomLevel');
    if (label) label.textContent = Math.round(z * 100) + '%';
    // Met aussi à jour l'ancien label de l'onglet Modules pour rétro-compat.
    const oldLabel = document.getElementById('modZoomLevel');
    if (oldLabel && sel === '.mod-reading') oldLabel.textContent = Math.round(z * 100) + '%';
    // Active/désactive les boutons aux bornes (zoom legacy + global).
    const z0 = MOD_ZOOM_STEPS[0], zN = MOD_ZOOM_STEPS[MOD_ZOOM_STEPS.length - 1];
    document.querySelectorAll('#modZoom .mod-zoom-btn').forEach((btn, i) => {
        if (sel !== '.mod-reading') return;
        if (i === 0) btn.disabled = z <= z0 + 1e-6;
        if (i === 1) btn.disabled = z >= zN - 1e-6;
    });
    const minus = document.getElementById('appZoomMinus');
    const plus  = document.getElementById('appZoomPlus');
    if (minus) minus.disabled = z <= z0 + 1e-6;
    if (plus)  plus.disabled  = z >= zN - 1e-6;
    return z;
}

function appZoomStep(dir, selector) {
    const sel = selector || '.mod-reading';
    const cur = appZoomGet(sel);
    let idx = 0, best = Infinity;
    MOD_ZOOM_STEPS.forEach((s, i) => {
        const d = Math.abs(s - cur);
        if (d < best) { best = d; idx = i; }
    });
    const next = Math.min(Math.max(idx + dir, 0), MOD_ZOOM_STEPS.length - 1);
    localStorage.setItem(appZoomKey(sel), String(MOD_ZOOM_STEPS[next]));
    appZoomApply(sel);
}

function appZoomReset(selector) {
    const sel = selector || '.mod-reading';
    localStorage.setItem(appZoomKey(sel), '1');
    appZoomApply(sel);
}

// Expose pour tous les modules (qcm.js, flashcards.js, etc.)
if (typeof window !== 'undefined') {
    window.appZoomGet   = appZoomGet;
    window.appZoomApply = appZoomApply;
    window.appZoomStep  = appZoomStep;
    window.appZoomReset = appZoomReset;
}

// ── Aliases legacy (rétro-compat — onglet Modules + onclicks inline) ────
function modZoomGet()   { return appZoomGet('.mod-reading'); }
function modZoomApply() { return appZoomApply('.mod-reading'); }
function modZoomStep(dir) { return appZoomStep(dir, '.mod-reading'); }
function modZoomReset() { return appZoomReset('.mod-reading'); }

// Ctrl/Cmd +, -, 0 — zoom shortcuts (only when Modules page is active)
document.addEventListener('keydown', function(e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (!document.getElementById('modZoom')) return; // not on modules page
    // Ignore if focus is inside an editable field (other than reading pane)
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        const insideReading = document.getElementById('modReading')?.contains(t);
        if (!insideReading) return;
    }
    if (e.key === '+' || e.key === '=') {
        e.preventDefault(); modZoomStep(1);
    } else if (e.key === '-' || e.key === '_') {
        e.preventDefault(); modZoomStep(-1);
    } else if (e.key === '0') {
        e.preventDefault(); modZoomReset();
    }
}, { capture: true });

// Ctrl+wheel zoom over the reading pane
document.addEventListener('wheel', function(e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const reading = document.getElementById('modReading');
    if (!reading || !reading.contains(e.target)) return;
    e.preventDefault();
    modZoomStep(e.deltaY < 0 ? 1 : -1);
}, { passive: false, capture: true });

// ═══════════════════════════════════════
// Styles
// ═══════════════════════════════════════

function modGetStyles() {
    return `<style>
/* ── Page layout ── */
.mod-page {
    display: flex; flex-direction: column;
    height: calc(100vh - 80px);
    overflow: hidden;
}

/* ── Level 1: Module pills wrap + bar ── */
.mod-pills-wrap {
    display: flex; align-items: center; flex-shrink: 0; position: relative;
    background: linear-gradient(180deg, #0d1528 0%, #090e1c 100%);
    border-bottom: 1px solid rgba(255,255,255,.055);
    box-shadow: 0 2px 8px rgba(0,0,0,.35);
}
.mod-pills-bar {
    display: flex; gap: 3px; padding: 8px 6px;
    overflow-x: auto; overflow-y: hidden;
    flex: 1; align-items: center;
    scrollbar-width: none;
}
.mod-pills-bar::-webkit-scrollbar { display: none; }

/* Arrow navigation buttons */
.mod-pills-arrow {
    flex-shrink: 0; width: 28px; height: 100%;
    border: none; background: transparent; cursor: pointer;
    color: #475569; font-size: 22px; font-weight: 300; line-height: 1;
    transition: color .15s, opacity .2s; padding: 0 2px;
    display: flex; align-items: center; justify-content: center;
}
.mod-pills-arrow:hover { color: #94a3b8; }
.mod-pills-arrow-l { padding-left: 6px; }
.mod-pills-arrow-r { padding-right: 6px; }

.mod-pill {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 13px; border-radius: 7px;
    border: 1px solid transparent;
    font-size: 12px; font-weight: 600;
    cursor: pointer; white-space: nowrap; flex-shrink: 0;
    background: rgba(255,255,255,.04); color: #566580;
    transition: background .15s, color .15s, border-color .15s;
}
.mod-pill:hover {
    background: rgba(255,255,255,.08); color: #94a3b8;
    border-color: rgba(255,255,255,.09);
}
.mod-pill-active {
    color: #fff !important;
    border-color: transparent !important;
    box-shadow: 0 2px 10px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.12);
}
.mod-pill-code { font-weight: 800; font-size: 11px; letter-spacing: .02em; }
.mod-pill-name { font-weight: 500; font-size: 11px; opacity: .85; }

/* Light/dark toggle */
.mod-theme-toggle {
    margin-left: auto; flex-shrink: 0;
    padding: 6px 12px; border-radius: 20px;
    border: 1px solid #334155; background: #1e293b;
    color: #94a3b8; font-size: 13px; cursor: pointer;
    transition: all .15s;
}
.mod-theme-toggle:hover { background: #334155; color: #e2e8f0; }

/* ── Light mode — Modules page ── */
body.light-mode .mod-pills-wrap {
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    border-color: rgba(0,0,0,.07);
    box-shadow: 0 2px 6px rgba(0,0,0,.06);
}
body.light-mode .mod-pills-arrow { color: #cbd5e1; }
body.light-mode .mod-pills-arrow:hover { color: #64748b; }
body.light-mode .mod-pill { background: #f1f5f9; color: #64748b; border-color: transparent; }
body.light-mode .mod-pill:hover { background: #e2e8f0; color: #1e293b; border-color: #d1d9e0; }
body.light-mode .mod-pill-active { color: #fff !important; box-shadow: 0 2px 8px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.15); }

body.light-mode .mod-sidebar {
    background: #f9fafb;
    border-color: rgba(0,0,0,0.06);
}
body.light-mode .mod-sb-header { border-color: #e2e8f0; }
body.light-mode .mod-sb-code { color: #0f172a; }
body.light-mode .mod-sb-name { color: #334155; }
body.light-mode .mod-sb-meta, body.light-mode .mod-sb-hours { color: #94a3b8; }
body.light-mode .mod-sb-section-title { color: #64748b; }
body.light-mode .mod-sb-count { background: #e2e8f0; color: #64748b; }
body.light-mode .mod-sb-item { color: #475569; border-left-color: transparent; }
body.light-mode .mod-sb-item:hover { background: rgba(0,0,0,0.03); color: #1e293b; }
body.light-mode .mod-sb-item-sel {
    background: #eff6ff; border-left-color: #2563eb; color: #1e293b;
}
body.light-mode .mod-sb-dot { opacity: 0.8; }

body.light-mode .mod-reading {
    background: #fff;
    border-color: rgba(0,0,0,0.06);
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

body.light-mode .mod-rd-header {
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border-color: #e2e8f0;
}
body.light-mode .mod-rd-title { color: #0f172a; }

body.light-mode .mod-card {
    background: #f8fafc;
    border: 1px solid rgba(0,0,0,0.06);
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}
body.light-mode .mod-card-label { color: #334155; }
body.light-mode .mod-card-body, body.light-mode .mod-card-text { color: #475569; }
body.light-mode .mod-tip { background: #fffbeb; color: #92400e; border-left-color: #f59e0b; }
body.light-mode .mod-card-mnemonic { background: #f0fdf4; border-left-color: #22c55e; }
body.light-mode .mod-rule {
    background: #f8fafc;
    border-left-color: #3b82f6;
    color: #334155;
}

body.light-mode .mod-acc-header { color: #1e293b; }
body.light-mode .mod-acc-header:hover { background: #f1f5f9; }
body.light-mode .mod-acc-body { color: #475569; border-color: #f1f5f9; }
body.light-mode .mod-acc-item { border-color: #e2e8f0; }

body.light-mode .mod-diff-item { border-color: #e2e8f0; background: #fafbfc; }
body.light-mode .mod-diff-text { color: #475569; }

body.light-mode .mod-fc {
    background: #fff;
    border-color: rgba(0,0,0,0.06);
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}
body.light-mode .mod-fc:hover { box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
body.light-mode .mod-fc-q { color: #0f172a; }
body.light-mode .mod-fc-a { color: #475569; border-color: #f1f5f9; }

body.light-mode .mod-related-chip {
    background: #f8fafc; border-color: #e2e8f0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}
body.light-mode .mod-related-chip:hover { background: #eff6ff; border-color: #93c5fd; }

body.light-mode .mod-empty-state { color: #94a3b8; }

/* ── Level 2 + 3 layout ── */
.mod-layout {
    display: flex; flex: 1; overflow: hidden;
}

/* ── Reading wrap: holds local search bar + reading pane ── */
.mod-reading-wrap {
    flex: 1; min-width: 0; display: flex; flex-direction: column; overflow: hidden;
    position: relative;
}

/* ── Floating zoom controls (bottom-right of reading pane) ── */
.mod-zoom {
    position: absolute; bottom: 16px; right: 20px;
    display: inline-flex; align-items: center;
    background: rgba(15, 23, 42, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    padding: 3px;
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35), 0 1px 0 rgba(255,255,255,.04) inset;
    z-index: 20;
    opacity: 0.55;
    transition: opacity .2s ease, transform .2s ease, box-shadow .2s ease;
    user-select: none;
}
.mod-zoom:hover {
    opacity: 1;
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(255,255,255,.05) inset;
}
.mod-zoom-btn, .mod-zoom-level {
    appearance: none; background: transparent; border: none; cursor: pointer;
    color: #cbd5e1; font-family: inherit; line-height: 1;
    transition: background .15s ease, color .15s ease, transform .1s ease;
}
.mod-zoom-btn {
    width: 30px; height: 30px; border-radius: 50%;
    font-size: 18px; font-weight: 600;
    display: flex; align-items: center; justify-content: center;
}
.mod-zoom-btn:hover { background: rgba(255,255,255,.10); color: #f1f5f9; }
.mod-zoom-btn:active { transform: scale(.92); }
.mod-zoom-btn:focus-visible {
    outline: 2px solid rgba(59,130,246,.55); outline-offset: 1px;
}
.mod-zoom-level {
    min-width: 52px; height: 30px; padding: 0 10px;
    border-radius: 999px;
    font-size: 12px; font-weight: 600; letter-spacing: .2px;
    font-variant-numeric: tabular-nums; color: #94a3b8;
}
.mod-zoom-level:hover { background: rgba(255,255,255,.08); color: #e2e8f0; }
.mod-zoom-level:focus-visible {
    outline: 2px solid rgba(59,130,246,.55); outline-offset: 1px;
}
.mod-zoom-btn[disabled] {
    opacity: .35; cursor: not-allowed;
}
.mod-zoom-btn[disabled]:hover { background: transparent; color: #cbd5e1; }

/* Light mode — zoom controls */
body.light-mode .mod-zoom {
    background: rgba(255, 255, 255, 0.82);
    border-color: rgba(15, 23, 42, 0.08);
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.12), 0 1px 0 rgba(255,255,255,.6) inset;
}
body.light-mode .mod-zoom-btn, body.light-mode .mod-zoom-level { color: #475569; }
body.light-mode .mod-zoom-btn:hover { background: rgba(15, 23, 42, 0.06); color: #0f172a; }
body.light-mode .mod-zoom-level { color: #64748b; }
body.light-mode .mod-zoom-level:hover { background: rgba(15, 23, 42, 0.05); color: #0f172a; }

/* ── Local search bar ── */
.mod-local-search {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 14px; flex-shrink: 0;
    background: linear-gradient(180deg, #0d1528 0%, #090e1c 100%);
    border-bottom: 1px solid rgba(255,255,255,.055);
    box-shadow: 0 2px 6px rgba(0,0,0,.25);
}
.mod-ls-field {
    flex: 1; min-width: 0; position: relative; display: flex; align-items: center;
}
.mod-ls-icon {
    position: absolute; left: 11px;
    font-size: 16px; color: #475569; pointer-events: none;
    line-height: 1;
}
.mod-ls-input {
    width: 100%;
    background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
    border-radius: 20px;
    padding: 6px 14px 6px 32px; font-size: 13px; color: #cbd5e1; outline: none;
    transition: border-color .15s, background .15s, box-shadow .15s;
}
.mod-ls-input::placeholder { color: #3d4f68; }
.mod-ls-input:focus {
    border-color: rgba(59,130,246,.5);
    background: rgba(255,255,255,.09);
    box-shadow: 0 0 0 3px rgba(59,130,246,.12);
}
.mod-ls-count {
    font-size: 11px; color: #4a6080; white-space: nowrap;
    background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.07);
    padding: 3px 9px; border-radius: 10px;
    min-width: 70px; text-align: center; flex-shrink: 0;
    font-variant-numeric: tabular-nums;
}
.mod-ls-nav-group {
    display: flex; flex-shrink: 0;
    border: 1px solid rgba(255,255,255,.1); border-radius: 6px; overflow: hidden;
}
.mod-ls-nav-btn {
    background: rgba(255,255,255,.05); border: none;
    border-right: 1px solid rgba(255,255,255,.08);
    color: #64748b; padding: 5px 10px; cursor: pointer; font-size: 13px;
    transition: background .12s, color .12s; line-height: 1;
}
.mod-ls-nav-btn:last-child { border-right: none; }
.mod-ls-nav-btn:hover { background: rgba(255,255,255,.12); color: #e2e8f0; }
.mod-ls-close {
    flex-shrink: 0; background: transparent;
    border: 1px solid rgba(255,255,255,.08); border-radius: 50%;
    width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
    color: #475569; cursor: pointer; font-size: 12px;
    transition: background .15s, border-color .15s, color .15s;
}
.mod-ls-close:hover {
    background: rgba(239,68,68,.15); border-color: rgba(239,68,68,.35); color: #f87171;
}

/* ── Search highlights ── */
mark.mod-hl {
    background: rgba(251,191,36,.28); color: inherit;
    border-radius: 2px; padding: 1px 0;
}
mark.mod-hl-cur {
    background: #f59e0b; color: #0f172a;
    border-radius: 2px; padding: 1px 0;
    box-shadow: 0 0 0 2px rgba(245,158,11,.35);
}

/* Light mode — local search */
body.light-mode .mod-local-search {
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    border-color: rgba(0,0,0,.07);
    box-shadow: 0 2px 4px rgba(0,0,0,.04);
}
body.light-mode .mod-ls-icon { color: #94a3b8; }
body.light-mode .mod-ls-input {
    background: #f1f5f9; border-color: #e2e8f0; color: #1e293b;
}
body.light-mode .mod-ls-input::placeholder { color: #94a3b8; }
body.light-mode .mod-ls-input:focus { border-color: #3b82f6; background: #fff; }
body.light-mode .mod-ls-count { background: #f1f5f9; border-color: #e2e8f0; color: #64748b; }
body.light-mode .mod-ls-nav-group { border-color: #e2e8f0; }
body.light-mode .mod-ls-nav-btn { background: #f8fafc; border-color: #e2e8f0; color: #64748b; }
body.light-mode .mod-ls-nav-btn:hover { background: #e2e8f0; color: #1e293b; }
body.light-mode .mod-ls-close { border-color: #e2e8f0; color: #94a3b8; }
body.light-mode .mod-ls-close:hover { background: #fee2e2; border-color: #fca5a5; color: #ef4444; }
body.light-mode mark.mod-hl { background: #fef08a; color: inherit; }
body.light-mode mark.mod-hl-cur { background: #f59e0b; color: #fff; box-shadow: 0 0 0 2px rgba(245,158,11,.3); }

/* ── Level 2: Sidebar ── */
.mod-sidebar {
    width: 260px; min-width: 260px; max-width: 260px;
    background: var(--bg-tertiary, #0c1322);
    border-right: 1px solid var(--border, #1e293b);
    overflow-y: auto; overflow-x: hidden;
    scrollbar-width: thin;
}
@media (min-width: 1600px) {
    .mod-sidebar { width: 300px; min-width: 300px; max-width: 300px; }
}
@media (min-width: 2000px) {
    .mod-sidebar { width: 340px; min-width: 340px; max-width: 340px; }
}
.mod-sidebar::-webkit-scrollbar { width: 4px; }
.mod-sidebar::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }

.mod-sb-header {
    padding: 14px 14px 10px;
    border-bottom: 2px solid #334155;
    margin-bottom: 4px;
}
.mod-sb-code { font-size: 18px; font-weight: 800; }
.mod-sb-name { font-size: 13px; font-weight: 500; color: #e2e8f0; margin-top: 2px; line-height: 1.3; }
.mod-sb-meta { font-size: 11px; color: #64748b; margin-top: 4px; }
.mod-sb-hours { font-size: 11px; color: #475569; margin-top: 2px; }

.mod-sb-section { padding: 4px 0; }
.mod-sb-section-title {
    font-size: 11px; font-weight: 700; color: #94a3b8;
    padding: 8px 14px 4px; text-transform: uppercase; letter-spacing: .4px;
    display: flex; align-items: center; gap: 6px;
}
.mod-sb-section-clickable { cursor: pointer; }
.mod-sb-section-clickable:hover { color: #cbd5e1; }
.mod-sb-count {
    font-size: 10px; background: #334155; color: #94a3b8;
    padding: 1px 6px; border-radius: 8px; font-weight: 500;
}
.mod-sb-prog-wrap {
    flex: 1; height: 3px; background: rgba(255,255,255,.06);
    border-radius: 2px; overflow: hidden; margin-left: 6px;
    align-self: center; min-width: 30px;
}
.mod-sb-prog-bar {
    display: block; height: 100%; border-radius: 2px;
    transition: width .4s ease;
}
body.light-mode .mod-sb-prog-wrap { background: #e2e8f0; }

.mod-sb-item {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 14px; cursor: pointer; font-size: 13px;
    color: #cbd5e1; transition: all .12s; border-left: 3px solid transparent;
}
.mod-sb-item:hover { background: rgba(255,255,255,.04); }
.mod-sb-item-sel {
    background: rgba(255,255,255,.07); border-left-color: var(--accent-blue, #3b82f6);
    color: #f1f5f9;
}
.mod-sb-dot {
    width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
.mod-sb-item-code { font-weight: 600; white-space: nowrap; }
.mod-sb-item-stars { margin-left: auto; flex-shrink: 0; }
.mod-sb-item-num {
    font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 3px;
    background: rgba(221,107,32,.12); color: #dd6b20; white-space: nowrap;
}
.mod-sb-item-label {
    font-size: 12px; color: #94a3b8; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
}
.mod-sb-item-ref {
    font-size: 12.5px;
    color: #cbd5e1;
    font-style: italic;
}
.mod-sb-item-ref:hover {
    background: rgba(99,102,241,.08);
}
.mod-sb-ref-owner {
    margin-left: auto;
    font-size: 10px; font-weight: 700;
    padding: 1px 6px; border-radius: 4px;
    background: rgba(99,102,241,.15); color: #a5b4fc;
    flex-shrink: 0;
}
body.light-mode .mod-sb-item-ref { color: #475569; }
body.light-mode .mod-sb-item-ref:hover { background: rgba(99,102,241,.06); }
body.light-mode .mod-sb-ref-owner {
    background: rgba(99,102,241,.10); color: #4338ca;
}

/* ── Level 3: Reading pane ── */
.mod-reading {
    flex: 1; min-width: 0;
    overflow-y: auto; overflow-x: hidden;
    padding: 20px 28px 40px;
    background: var(--bg-primary, #0f172a);
    scrollbar-width: thin;
}
.mod-reading::-webkit-scrollbar { width: 6px; }
.mod-reading::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }

.mod-empty-state {
    display: flex; flex-direction: column; align-items: center;
    justify-content: center; height: 100%;
    color: #475569; font-size: 15px;
}

/* Reading pane uses full available width */
.mod-detail { width: 100%; max-width: 100%; margin: 0; }

/* On very wide screens, center content with generous width */
@media (min-width: 1600px) {
    .mod-reading { padding: 24px 48px 60px; }
}
@media (min-width: 2000px) {
    .mod-reading { padding: 30px 80px 80px; }
}

/* ── Header card ── */
.mod-header-card {
    border: 1px solid; border-radius: 10px; padding: 14px 18px;
    margin-bottom: 12px;
}
.mod-hc-top {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 16px; flex-wrap: wrap;
}
.mod-hc-left { flex: 1; min-width: 0; }
.mod-hc-cat { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
.mod-hc-title {
    font-size: 20px; font-weight: 700; color: #f1f5f9;
    margin: 0; line-height: 1.3;
    word-wrap: break-word; overflow-wrap: break-word;
}
.mod-hc-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
.mod-hc-meta { font-size: 12px; color: #64748b; margin-top: 8px; }

.mod-lesson-num-badge {
    display: inline-block; padding: 2px 10px; border-radius: 5px;
    font-size: 14px; font-weight: 700; margin-right: 6px;
}

/* ── Stars ── */
.mod-stars-row { display: inline-flex; align-items: center; gap: 2px; }
.mod-star {
    font-size: 18px; cursor: pointer; color: #334155; transition: color .12s;
    -webkit-user-select: none; user-select: none;
}
.mod-star.filled { color: #fbbf24; }
.mod-star:hover { color: #f59e0b; }
.mod-star-reset {
    font-size: 13px; color: #64748b; cursor: pointer; margin-left: 4px;
    transition: color .12s;
}
.mod-star-reset:hover { color: #ef4444; }

/* ── Cards ── */
.mod-card {
    background: var(--bg-secondary, #1e293b); border: 1px solid var(--border, #334155);
    border-radius: 8px; padding: 14px 18px; margin-bottom: 10px;
    word-wrap: break-word; overflow-wrap: break-word;
}
.mod-card-label {
    font-size: 13px; font-weight: 700; color: #94a3b8; margin-bottom: 8px;
    text-transform: uppercase; letter-spacing: .3px;
}
.mod-card-text {
    font-size: 14px; color: #cbd5e1; line-height: 1.65; white-space: pre-wrap;
    word-wrap: break-word; overflow-wrap: break-word;
    white-space: pre-wrap;
}
.mod-card-tips { border-left: 3px solid #f59e0b; }
.mod-tip {
    font-size: 13px; color: #e2e8f0; padding: 4px 0; line-height: 1.5;
    word-wrap: break-word; overflow-wrap: break-word;
    white-space: pre-wrap;
}
.mod-card-mnemonic { border-left: 3px solid #a78bfa; background: rgba(167,139,250,.06); }

/* ── Differences grid ── */
.mod-diff-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
.mod-diff-item {
    padding: 10px 14px; border-radius: 6px; border: 1px solid #334155;
    word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap;
}
.mod-diff-ifrs { border-color: rgba(56,161,105,.3); background: rgba(56,161,105,.06); }
.mod-diff-rpc  { border-color: rgba(49,130,206,.3); background: rgba(49,130,206,.06); }
.mod-diff-co   { border-color: rgba(180,83,9,.3);   background: rgba(180,83,9,.06); }
.mod-diff-tag {
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
    margin-bottom: 6px;
}
.mod-diff-ifrs .mod-diff-tag { color: #38a169; }
.mod-diff-rpc  .mod-diff-tag { color: #3182ce; }
.mod-diff-co   .mod-diff-tag { color: #b45309; }
.mod-diff-text { font-size: 13px; color: #cbd5e1; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }

/* ── Rules ── */
.mod-rule {
    font-size: 13px; color: #cbd5e1; padding: 6px 0;
    border-bottom: 1px solid #1e293b; line-height: 1.5;
    word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap;
}
.mod-rule:last-child { border-bottom: none; }

/* ── Accordion ── */
/* ── Sections (no accordion, all visible) ── */
.mod-section { margin-bottom: 20px; }
.mod-section-title {
    font-size: 17px; font-weight: 700; color: #e2e8f0;
    margin: 0 0 10px 0; padding-bottom: 8px;
    border-bottom: 1px solid #334155;
}
.mod-section-text {
    font-size: 14.5px; color: #cbd5e1; line-height: 1.75;
    white-space: pre-wrap; word-wrap: break-word;
}

/* Bigger text on wider screens */
@media (min-width: 1600px) {
    .mod-section { margin-bottom: 24px; }
    .mod-section-title { font-size: 19px; margin-bottom: 12px; padding-bottom: 10px; }
    .mod-section-text { font-size: 15.5px; line-height: 1.8; }
    .mod-card-text { font-size: 15.5px; line-height: 1.8; }
    .mod-hc-title { font-size: 24px; }
    .mod-rule { font-size: 14.5px; line-height: 1.7; padding: 10px 14px; }
    .mod-tip { font-size: 14.5px; line-height: 1.7; }
    .mod-mnemonic-box { font-size: 15px; padding: 12px 16px; }
    .mod-tips-box { padding: 14px 18px; }
    .mod-tips-title { font-size: 14px; }
    .mod-diff-text { font-size: 14.5px; line-height: 1.7; }
    .mod-fc-q { font-size: 15px; }
    .mod-fc-a { font-size: 14px; line-height: 1.75; }
}
@media (min-width: 2000px) {
    .mod-section-title { font-size: 20px; }
    .mod-section-text, .mod-card-text { font-size: 16px; line-height: 1.85; }
    .mod-hc-title { font-size: 26px; }
}

.mod-mnemonic-box {
    background: #14532d22; border-left: 3px solid #22c55e;
    padding: 10px 14px; border-radius: 6px; margin-bottom: 14px;
    font-size: 14px; color: #86efac; line-height: 1.5;
}

.mod-tips-box {
    background: #78350f22; border-left: 3px solid #f59e0b;
    padding: 12px 14px; border-radius: 6px; margin-bottom: 14px;
}
.mod-tips-title { font-size: 13px; font-weight: 700; color: #fbbf24; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .3px; }

.mod-memo-item { margin-bottom: 10px; }
.mod-memo-q { font-size: 14px; font-weight: 600; color: #e2e8f0; margin-bottom: 4px; }
.mod-memo-a { font-size: 13px; color: #94a3b8; line-height: 1.6; white-space: pre-wrap; }

/* Light mode sections */
body.light-mode .mod-section-title { color: #0f172a; border-color: #e2e8f0; }
body.light-mode .mod-section-text { color: #334155; }
body.light-mode .mod-mnemonic-box { background: #f0fdf4; color: #166534; border-left-color: #22c55e; }
body.light-mode .mod-tips-box { background: #fffbeb; border-left-color: #f59e0b; }
body.light-mode .mod-tips-title { color: #92400e; }
body.light-mode .mod-memo-q { color: #0f172a; }
body.light-mode .mod-memo-a { color: #475569; }

.mod-accordion { border-top: 1px solid #334155; }
.mod-acc-item { border-bottom: 1px solid #334155; }
.mod-acc-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 4px; cursor: pointer; font-size: 14px; font-weight: 500;
    color: #e2e8f0; transition: color .12s;
    white-space: normal;
}
.mod-acc-header:hover { color: #f8fafc; }
.mod-acc-chevron { font-size: 12px; color: #64748b; transition: transform .2s; }
.mod-acc-body {
    display: none; padding: 0 4px 14px; font-size: 13px;
    color: #94a3b8; line-height: 1.6;
    word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap;
}
.mod-acc-item.open .mod-acc-body { display: block; }
.mod-acc-item.open .mod-acc-chevron { transform: rotate(180deg); }

/* ── Flashcards ── */
.mod-fc {
    background: #0f172a; border: 1px solid #334155; border-radius: 6px;
    padding: 10px 14px; margin-bottom: 6px; cursor: pointer;
    transition: border-color .15s;
}
.mod-fc:hover { border-color: #475569; }
.mod-fc-q { font-size: 13px; color: #e2e8f0; line-height: 1.4; word-wrap: break-word; white-space: pre-wrap; }
.mod-fc-a {
    display: none; margin-top: 8px; padding-top: 8px;
    border-top: 1px solid #334155; font-size: 13px;
    color: #94a3b8; line-height: 1.5;
    word-wrap: break-word; overflow-wrap: break-word; white-space: pre-wrap;
}
.mod-fc.show .mod-fc-a { display: block; }

/* ── Notion lesson rows ── */
.mod-lesson-section { margin-bottom: 12px; }
.mod-lesson-sec-title {
    font-size: 12px; font-weight: 600; color: #64748b;
    padding: 4px 0; border-bottom: 1px solid #1e293b; margin-bottom: 4px;
}
.mod-lesson-row {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 4px; font-size: 13px;
    border-radius: 4px; transition: background 0.1s;
}
.mod-lesson-row:hover { background: rgba(255,255,255,0.04); }
.mod-lesson-status { width: 20px; text-align: center; flex-shrink: 0; font-size: 14px; }
.mod-lesson-text { flex: 1; color: #e2e8f0; min-width: 0; word-wrap: break-word; white-space: pre-wrap; line-height: 1.4; }
.mod-lesson-prio {
    font-size: 10px; font-weight: 600; flex-shrink: 0;
    padding: 2px 8px; border-radius: 6px;
}
.mod-lesson-prio-haute { background: #7f1d1d44; color: #fca5a5; }
.mod-lesson-prio-moyenne { background: #78350f44; color: #fcd34d; }
.mod-lesson-prio-faible { background: #14532d44; color: #86efac; }
.mod-notion-type {
    font-size: 10px; padding: 1px 6px; border-radius: 3px;
    background: #334155; color: #94a3b8; flex-shrink: 0;
}

/* Light mode — Notion lessons */
body.light-mode .mod-lesson-sec-title { color: #475569; border-color: #e2e8f0; }
body.light-mode .mod-lesson-row:hover { background: #f1f5f9; }
body.light-mode .mod-lesson-text { color: #1e293b; }
body.light-mode .mod-lesson-prio-haute { background: #fee2e2; color: #991b1b; }
body.light-mode .mod-lesson-prio-moyenne { background: #fef9c3; color: #854d0e; }
body.light-mode .mod-lesson-prio-faible { background: #dcfce7; color: #166534; }
body.light-mode .mod-notion-type { background: #e2e8f0; color: #475569; }

/* ── Related chips ── */
.mod-related-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.mod-related-chip {
    font-size: 12px; padding: 4px 10px; border-radius: 5px;
    background: rgba(59,130,246,.08); border: 1px solid rgba(59,130,246,.25);
    color: #60a5fa; cursor: pointer; transition: all .15s; white-space: nowrap;
}
.mod-related-chip:hover { background: rgba(59,130,246,.15); border-color: #3b82f6; }

/* ── IFP Lesson topics ── */
.mod-topics-list { padding: 0; }
.mod-topic {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 8px; font-size: 13px; color: #cbd5e1;
    border-radius: 4px; margin-bottom: 1px;
}
.mod-topic-clickable { cursor: pointer; }
.mod-topic-clickable:hover { background: rgba(255,255,255,0.04); color: #f1f5f9; }
.mod-topic-arrow { font-size: 10px; color: #64748b; width: 12px; text-align: center; flex-shrink: 0; }
.mod-topic-label { flex: 1; word-wrap: break-word; }
.mod-topic-count { font-size: 10px; color: #475569; background: #334155; padding: 1px 6px; border-radius: 8px; }
.mod-subtopics { padding-left: 22px; margin-bottom: 2px; }
.mod-sub {
    font-size: 12px; color: #94a3b8; padding: 3px 0 3px 10px;
    border-left: 2px solid #334155; line-height: 1.35;
}

/* ── Relevance badges ── */
.mod-relevance {
    font-size: 12px; padding: 3px 10px; border-radius: 5px; font-weight: 600;
    white-space: nowrap;
}
.mod-rel-high { background: rgba(239,68,68,.12); color: #ef4444; }
.mod-rel-med  { background: rgba(245,158,11,.12); color: #f59e0b; }
.mod-rel-low  { background: rgba(100,116,139,.12); color: #94a3b8; }

/* ── Doc wrapper ── */
.mod-docx-wrapper.hidden { display: none; }
.mod-docx-toggle { margin-bottom: 8px; }

/* ── Content placeholder ── */
.mod-content-placeholder {
    padding: 16px; text-align: center; font-size: 13px;
    color: #64748b; font-style: italic;
    background: #0f172a; border-radius: 6px; border: 1px dashed #334155;
}

/* ── Priority classes (re-use global) ── */
.priority-high { color: #ef4444 !important; }
.priority-med  { color: #f59e0b !important; }
.priority-low  { color: #64748b !important; }

/* ── Animations ── */
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
.mod-detail.fade-in { animation: fadeIn .2s ease-out; }
</style>`;
}
