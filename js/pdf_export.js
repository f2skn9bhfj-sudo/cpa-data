/* ═══════════════════════════════════════════════════════════════
   PDF Export — sélection multiple de cours (normes + leçons IFP)
   → window.print() avec @media print pour rendu vectoriel
   Pas de dépendance externe.
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    let pdfState = {
        items: [],            // [{key, type, moduleId, moduleCode, id, title, badge, chars}]
        selected: new Set(),  // keys
        filter: 'all',        // 'all' | moduleId
    };

    // ── Collecte les items exportables (norms + lessons_ifp avec contenu) ──
    async function collectExportables() {
        const data = await api('get_unified_modules');
        const modules = (data && data.modules) ? data.modules : [];
        const items = [];
        for (const m of modules) {
            const moduleCode = m.code || m.id;
            // Normes (M3 RPC, M4 IFRS, et quelques M1/M2 en CO)
            for (const n of (m.norms || [])) {
                if (!n) continue;
                const chars = sumSectionsChars(n.sections);
                if (chars < 500) continue; // ignore stubs/placeholders vides
                items.push({
                    key: `${m.id}:norm:${n.id}`,
                    type: 'norm',
                    moduleId: m.id,
                    moduleCode,
                    moduleName: m.name || m.code,
                    id: n.id,
                    title: n.title || n.code || n.id,
                    badge: n.code || '',
                    category: n.category || '',
                    chars
                });
            }
            // Leçons IFP (M1, M2, M6, M7, M8)
            for (const l of (m.lessons_ifp || [])) {
                if (!l) continue;
                const chars = sumLessonChars(l);
                if (chars < 500) continue;
                items.push({
                    key: `${m.id}:lesson_ifp:${l.id}`,
                    type: 'lesson_ifp',
                    moduleId: m.id,
                    moduleCode,
                    moduleName: m.name || m.code,
                    id: l.id,
                    title: l.title || l.id,
                    badge: l.lesson_num ? `L${l.lesson_num}` : '',
                    category: l.category || '',
                    chars
                });
            }
        }
        return items;
    }

    function sumSectionsChars(sections) {
        if (!Array.isArray(sections)) return 0;
        let total = 0;
        for (const s of sections) {
            if (typeof s === 'string') total += s.length;
            else if (s && typeof s === 'object') {
                if (s.content) total += s.content.length;
                if (s.body) total += s.body.length;
                for (const k of ['info','warning','example','key_point','tip','legal_quote','comparison']) {
                    if (s[k]) total += s[k].length;
                }
            }
        }
        return total;
    }

    function sumLessonChars(l) {
        if (!l) return 0;
        let total = 0;
        if (Array.isArray(l.content)) {
            for (const sec of l.content) {
                if (typeof sec === 'string') total += sec.length;
                else if (sec && typeof sec === 'object') {
                    if (sec.body) total += sec.body.length;
                    for (const k of ['info','warning','example','key_point','tip','legal_quote','comparison']) {
                        if (sec[k]) total += sec[k].length;
                    }
                }
            }
        }
        return total;
    }

    // ── Open the modal ──
    async function pdfExportOpen() {
        const modal = document.getElementById('pdfExportModal');
        if (!modal) return;
        modal.innerHTML = '<div class="pdf-modal-loading">Chargement…</div>';
        modal.classList.remove('hidden');

        try {
            pdfState.items = await collectExportables();
        } catch (e) {
            console.error('pdf_export: failed to load items', e);
            modal.innerHTML = `<div class="pdf-modal-loading">Erreur de chargement : ${escapeHtml(String(e))}</div>`;
            return;
        }
        pdfState.selected = new Set();
        pdfState.filter = 'all';
        renderModal();
    }

    function pdfExportClose() {
        const modal = document.getElementById('pdfExportModal');
        if (modal) modal.classList.add('hidden');
    }

    function renderModal() {
        const modal = document.getElementById('pdfExportModal');
        if (!modal) return;

        // Pills par module (uniquement ceux qui ont des items)
        const modules = [];
        const seen = new Set();
        for (const it of pdfState.items) {
            if (!seen.has(it.moduleId)) {
                seen.add(it.moduleId);
                modules.push({ id: it.moduleId, code: it.moduleCode, name: it.moduleName });
            }
        }

        const pillsHtml = `
            <button class="pdf-pill ${pdfState.filter === 'all' ? 'active' : ''}" onclick="pdfExportFilter('all')">Tous</button>
            ${modules.map(m => `
                <button class="pdf-pill ${pdfState.filter === m.id ? 'active' : ''}" onclick="pdfExportFilter('${escapeAttr(m.id)}')">${escapeHtml(m.code)}</button>
            `).join('')}
        `;

        // Filtré
        const visible = pdfState.filter === 'all' ? pdfState.items : pdfState.items.filter(it => it.moduleId === pdfState.filter);

        // Group par module pour affichage hiérarchique
        const byModule = new Map();
        for (const it of visible) {
            if (!byModule.has(it.moduleId)) byModule.set(it.moduleId, { code: it.moduleCode, name: it.moduleName, items: [] });
            byModule.get(it.moduleId).items.push(it);
        }

        const groupsHtml = Array.from(byModule.entries()).map(([modId, group]) => {
            const allKeys = group.items.map(it => it.key);
            const allSelected = allKeys.every(k => pdfState.selected.has(k));
            return `
                <div class="pdf-group">
                    <div class="pdf-group-head">
                        <div class="pdf-group-title">
                            <span class="pdf-group-code">${escapeHtml(group.code)}</span>
                            <span class="pdf-group-name">${escapeHtml(group.name)}</span>
                            <span class="pdf-group-count">${group.items.length} cours</span>
                        </div>
                        <button class="pdf-group-toggle" onclick="pdfExportToggleGroup('${escapeAttr(modId)}', ${!allSelected})">
                            ${allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                        </button>
                    </div>
                    <div class="pdf-cards">
                        ${group.items.map(it => {
                            const checked = pdfState.selected.has(it.key);
                            const typeLabel = it.type === 'norm' ? 'Norme' : 'Leçon';
                            const kchars = Math.round(it.chars / 1000);
                            return `
                                <label class="pdf-card ${checked ? 'checked' : ''}">
                                    <input type="checkbox" ${checked ? 'checked' : ''} onchange="pdfExportToggle('${escapeAttr(it.key)}')" />
                                    <div class="pdf-card-body">
                                        <div class="pdf-card-meta">
                                            <span class="pdf-card-type">${typeLabel}</span>
                                            ${it.badge ? `<span class="pdf-card-badge">${escapeHtml(it.badge)}</span>` : ''}
                                            ${it.category ? `<span class="pdf-card-cat">${escapeHtml(it.category)}</span>` : ''}
                                        </div>
                                        <div class="pdf-card-title">${escapeHtml(it.title)}</div>
                                        <div class="pdf-card-foot">~${kchars}k caractères</div>
                                    </div>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');

        const nbSelected = pdfState.selected.size;
        const totalChars = pdfState.items.filter(it => pdfState.selected.has(it.key)).reduce((s, it) => s + it.chars, 0);
        const estPages = Math.max(1, Math.round(totalChars / 3500)); // ~3500 chars/page imprimée

        modal.innerHTML = `
            <div class="pdf-modal-backdrop" onclick="pdfExportClose()"></div>
            <div class="pdf-modal-card">
                <div class="pdf-modal-head">
                    <h2 class="pdf-modal-title">Exporter en PDF</h2>
                    <button class="pdf-modal-close" onclick="pdfExportClose()" aria-label="Fermer">✕</button>
                </div>
                <div class="pdf-modal-pills">${pillsHtml}</div>
                <div class="pdf-modal-body">${groupsHtml || '<div class="pdf-empty">Aucun cours disponible.</div>'}</div>
                <div class="pdf-modal-foot">
                    <div class="pdf-foot-info">
                        <strong>${nbSelected}</strong> cours sélectionnés
                        ${nbSelected > 0 ? `· ~${estPages} page${estPages > 1 ? 's' : ''} estimées` : ''}
                    </div>
                    <button class="pdf-foot-btn" ${nbSelected === 0 ? 'disabled' : ''} onclick="pdfExportTrigger()">
                        Exporter
                    </button>
                </div>
            </div>
        `;
    }

    function pdfExportFilter(filter) {
        pdfState.filter = filter;
        renderModal();
    }

    function pdfExportToggle(key) {
        if (pdfState.selected.has(key)) pdfState.selected.delete(key);
        else pdfState.selected.add(key);
        renderModal();
    }

    function pdfExportToggleGroup(moduleId, selectAll) {
        for (const it of pdfState.items) {
            if (it.moduleId === moduleId) {
                if (selectAll) pdfState.selected.add(it.key);
                else pdfState.selected.delete(it.key);
            }
        }
        renderModal();
    }

    // ── Trigger : build print container, call window.print() ──
    async function pdfExportTrigger() {
        if (pdfState.selected.size === 0) return;
        const container = document.getElementById('pdfPrintContainer');
        if (!container) {
            alert('Erreur : conteneur d\'impression introuvable.');
            return;
        }

        // Récupère les items sélectionnés dans l'ordre des items (cohérent)
        const selected = pdfState.items.filter(it => pdfState.selected.has(it.key));

        // Ferme la modal
        pdfExportClose();

        // Construire le document
        container.innerHTML = await buildPrintDocument(selected);

        // Activer le mode print
        document.body.classList.add('printing-mode');

        // Donner un peu de temps au render
        await new Promise(r => setTimeout(r, 200));

        // Trigger
        window.print();

        // Cleanup après le dialogue (fonctionne dans Chrome/Edge/Firefox)
        const cleanup = () => {
            document.body.classList.remove('printing-mode');
            container.innerHTML = '';
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        // Fallback : si afterprint ne se déclenche pas (Safari sometimes), cleanup après timeout
        setTimeout(() => {
            if (document.body.classList.contains('printing-mode')) cleanup();
        }, 60000);
    }

    async function buildPrintDocument(items) {
        // Dédupliquer / ordonner par module puis par code
        const sorted = [...items].sort((a, b) => {
            if (a.moduleCode !== b.moduleCode) return a.moduleCode.localeCompare(b.moduleCode);
            return a.title.localeCompare(b.title);
        });

        const today = new Date().toLocaleDateString('fr-CH', { year: 'numeric', month: 'long', day: 'numeric' });

        // Cover
        let html = `
            <section class="pdf-cover">
                <div class="pdf-cover-top">Swiss CPA</div>
                <div class="pdf-cover-title">Fiches de révision</div>
                <div class="pdf-cover-sub">${sorted.length} cours sélectionnés</div>
                <div class="pdf-cover-date">${escapeHtml(today)}</div>
            </section>
        `;

        // TOC
        html += `
            <section class="pdf-toc">
                <h1 class="pdf-toc-title">Sommaire</h1>
                <ol class="pdf-toc-list">
                    ${sorted.map((it, i) => `
                        <li class="pdf-toc-item">
                            <span class="pdf-toc-badge">${escapeHtml(it.moduleCode)}</span>
                            ${it.badge ? `<span class="pdf-toc-norm">${escapeHtml(it.badge)}</span>` : ''}
                            <span class="pdf-toc-name">${escapeHtml(it.title)}</span>
                        </li>
                    `).join('')}
                </ol>
            </section>
        `;

        // Each cours
        for (const it of sorted) {
            html += await renderCoursForPrint(it);
        }

        return html;
    }

    async function renderCoursForPrint(it) {
        const data = await api('get_unified_modules');
        const m = (data.modules || []).find(x => x.id === it.moduleId);
        if (!m) return '';

        if (it.type === 'norm') {
            const n = (m.norms || []).find(x => x.id === it.id);
            if (!n) return '';
            return renderNormForPrint(n, m);
        }
        if (it.type === 'lesson_ifp') {
            const l = (m.lessons_ifp || []).find(x => x.id === it.id);
            if (!l) return '';
            return renderLessonForPrint(l, m);
        }
        return '';
    }

    function renderNormForPrint(n, m) {
        const cat = n.category || '';
        const sections = (n.sections || []).filter(s =>
            (s.title && s.title.trim())
            || (s.content && s.content.trim().length > 20)
            || s.info || s.legal_quote || s.example || s.comparison
            || s.key_point || s.tip || s.warning
        );

        let html = `<article class="pdf-cours pdf-norm">
            <header class="pdf-cours-head">
                <div class="pdf-cours-meta">
                    <span class="pdf-cours-mod">${escapeHtml(m.code)}</span>
                    ${cat ? `<span class="pdf-cours-cat">${escapeHtml(cat)}</span>` : ''}
                </div>
                <h1 class="pdf-cours-title">${escapeHtml(n.title || n.code)}</h1>
                ${n.summary ? `<div class="pdf-cours-summary">${formatAnswer(n.summary)}</div>` : ''}
                ${n.mnemonics ? `<div class="pdf-cours-mnemonic">💡 ${formatAnswer(Array.isArray(n.mnemonics) ? n.mnemonics.join(' · ') : n.mnemonics)}</div>` : ''}
            </header>`;

        for (const sec of sections) {
            html += `<section class="pdf-section">`;
            if (sec.title && sec.title.trim()) {
                html += `<h2 class="pdf-section-title">${escapeHtml(sec.title)}</h2>`;
            }
            if (sec.content && sec.content.trim()) {
                html += `<div class="pdf-section-body">${formatAnswer(sec.content)}</div>`;
            }
            html += renderPrintCallout('info', '💡', 'Pour info', sec.info);
            html += renderPrintCallout('legal', '⚖️', 'Texte légal', sec.legal_quote);
            html += renderPrintCallout('example', '🟢', 'Exemple concret', sec.example);
            html += renderPrintCallout('comp', '📊', 'Comparaison', sec.comparison);
            html += renderPrintCallout('key', '🎯', 'Point clé', sec.key_point);
            html += renderPrintCallout('tip', '🧠', 'Astuce mémo', sec.tip);
            html += renderPrintCallout('warn', '⚠️', 'Attention', sec.warning);
            html += `</section>`;
        }

        // key_rules + exam_tips synthèse
        if (n.key_rules && n.key_rules.length > 0) {
            html += `<section class="pdf-section">
                <h2 class="pdf-section-title">Règles essentielles</h2>
                <ul class="pdf-rules">${n.key_rules.map(r => `<li>${formatAnswer(r)}</li>`).join('')}</ul>
            </section>`;
        }
        if (n.exam_tips && n.exam_tips.length > 0) {
            html += `<section class="pdf-section">
                <h2 class="pdf-section-title">Points clés examen</h2>
                <ul class="pdf-tips">${n.exam_tips.map(t => `<li>${formatAnswer(t)}</li>`).join('')}</ul>
            </section>`;
        }

        html += `</article>`;
        return html;
    }

    function renderLessonForPrint(l, m) {
        const sections = Array.isArray(l.content) ? l.content : [];
        let html = `<article class="pdf-cours pdf-lesson">
            <header class="pdf-cours-head">
                <div class="pdf-cours-meta">
                    <span class="pdf-cours-mod">${escapeHtml(m.code)}</span>
                    ${l.lesson_num ? `<span class="pdf-cours-cat">L${l.lesson_num}</span>` : ''}
                    ${l.category ? `<span class="pdf-cours-cat">${escapeHtml(l.category)}</span>` : ''}
                </div>
                <h1 class="pdf-cours-title">${escapeHtml(l.title || l.id)}</h1>
                ${l.summary ? `<div class="pdf-cours-summary">${formatAnswer(l.summary)}</div>` : ''}
            </header>`;
        for (const sec of sections) {
            if (typeof sec === 'string') {
                html += `<section class="pdf-section"><div class="pdf-section-body">${formatAnswer(sec)}</div></section>`;
                continue;
            }
            html += `<section class="pdf-section">`;
            if (sec.title) html += `<h2 class="pdf-section-title">${escapeHtml(sec.title)}</h2>`;
            if (sec.body) html += `<div class="pdf-section-body">${formatAnswer(sec.body)}</div>`;
            html += renderPrintCallout('info', '💡', 'Pour info', sec.info);
            html += renderPrintCallout('legal', '⚖️', 'Texte légal', sec.legal_quote);
            html += renderPrintCallout('example', '🟢', 'Exemple concret', sec.example);
            html += renderPrintCallout('comp', '📊', 'Comparaison', sec.comparison);
            html += renderPrintCallout('key', '🎯', 'Point clé', sec.key_point);
            html += renderPrintCallout('tip', '🧠', 'Astuce mémo', sec.tip);
            html += renderPrintCallout('warn', '⚠️', 'Attention', sec.warning);
            html += `</section>`;
        }
        html += `</article>`;
        return html;
    }

    function renderPrintCallout(variant, icon, label, content) {
        if (!content) return '';
        return `<aside class="pdf-callout pdf-callout--${variant}">
            <div class="pdf-callout-label"><span class="pdf-callout-icon">${icon}</span> ${escapeHtml(label)}</div>
            <div class="pdf-callout-body">${formatAnswer(content)}</div>
        </aside>`;
    }

    // ── Expose globally ──
    window.pdfExportOpen = pdfExportOpen;
    window.pdfExportClose = pdfExportClose;
    window.pdfExportFilter = pdfExportFilter;
    window.pdfExportToggle = pdfExportToggle;
    window.pdfExportToggleGroup = pdfExportToggleGroup;
    window.pdfExportTrigger = pdfExportTrigger;
})();
