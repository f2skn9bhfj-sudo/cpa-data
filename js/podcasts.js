/* ═══════════════════════════════════════════════════════════════
   Podcasts — onglet dédié agrégeant tous les audio_files des normes.
   Source unique : unified_modules.json (modules > norms > audio_files).
   Lecteur <audio> natif HTML5, groupé par module.
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // Couleurs par module (cohérent onglet Modules)
    const MODULE_COLORS = {
        M1: '#10b981', // vert
        M2: '#3b82f6', // bleu (Introduction à l'audit)
        M3: '#f59e0b', // ambre (Normes suisses)
        M4: '#8b5cf6', // violet (IFRS/IAS)
        M5: '#ec4899', M6: '#06b6d4', M7: '#14b8a6', M8: '#a855f7'
    };

    // Etat local pour filtres
    let _pState = { modules: null, query: '', moduleFilter: 'all' };

    function _esc(s) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(s == null ? '' : String(s));
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function _escAttr(s) {
        return String(s == null ? '' : s).replace(/"/g, '&quot;').replace(/&/g, '&amp;');
    }

    function _collectPodcasts(data) {
        // Renvoie liste plate dédupliquée par path :
        // [{module_id, module_name, module_color, norm/lesson info, audio}]
        // Un même podcast peut être rattaché à une norme ET à une leçon — on
        // garde uniquement la première occurrence (priorité aux normes pour
        // l'affichage du code de la norme dans la carte podcast).
        const seen = new Set();
        const out = [];
        const modules = (data && data.modules) || [];
        for (const m of modules) {
            const modId = m.id || '';
            const modName = m.name || modId;
            const modColor = m.color || MODULE_COLORS[modId] || '#64748b';

            // Normes d'abord (priorité d'affichage)
            for (const n of (m.norms || [])) {
                if (!Array.isArray(n.audio_files) || n.audio_files.length === 0) continue;
                for (const a of n.audio_files) {
                    if (!a || !a.path || seen.has(a.path)) continue;
                    seen.add(a.path);
                    out.push({
                        module_id: modId, module_name: modName, module_color: modColor,
                        norm_id: n.id || '', norm_code: n.code || '', norm_title: n.title || '',
                        path: a.path, title: a.title || 'Audio',
                        kind: a.kind || 'podcast', mime: a.mime || 'audio/mp4'
                    });
                }
            }

            // Puis leçons IFP (pour les podcasts présents uniquement sur les leçons)
            for (const l of (m.lessons_ifp || [])) {
                if (!Array.isArray(l.audio_files) || l.audio_files.length === 0) continue;
                for (const a of l.audio_files) {
                    if (!a || !a.path || seen.has(a.path)) continue;
                    seen.add(a.path);
                    out.push({
                        module_id: modId, module_name: modName, module_color: modColor,
                        norm_id: l.id || '', norm_code: l.code || ('L' + (l.number || '')),
                        norm_title: l.title || '',
                        path: a.path, title: a.title || 'Audio',
                        kind: a.kind || 'podcast', mime: a.mime || 'audio/mp4'
                    });
                }
            }
        }
        return out;
    }

    function _kindLabel(k) {
        if (k === 'podcast') return '🎧 Podcast';
        if (k === 'lecture') return '🎙️ Cours audio';
        return '🎵 Audio';
    }

    function _renderItem(p) {
        const subtitle = p.norm_code ? `${_esc(p.norm_code)} — ${_esc(p.norm_title || p.norm_code)}` : _esc(p.norm_title || '');
        return `<div class="pc-item" data-module="${_escAttr(p.module_id)}" data-search="${_escAttr((p.title + ' ' + p.norm_code + ' ' + p.norm_title).toLowerCase())}">
            <div class="pc-item-head">
                <div class="pc-item-meta">
                    <span class="pc-badge" style="background:${p.module_color};color:#fff">${_esc(p.module_id)}</span>
                    <span class="pc-kind">${_kindLabel(p.kind)}</span>
                </div>
                <div class="pc-item-title">${_esc(p.title)}</div>
                ${subtitle ? `<div class="pc-item-sub">${subtitle}</div>` : ''}
            </div>
            <audio class="pc-audio" controls preload="metadata">
                <source src="${_escAttr(p.path)}" type="${_escAttr(p.mime)}">
                Ton navigateur ne supporte pas la lecture audio.
            </audio>
        </div>`;
    }

    function _applyFilters() {
        const q = _pState.query.trim().toLowerCase();
        const mod = _pState.moduleFilter;
        document.querySelectorAll('#pcList .pc-item').forEach(el => {
            const matchMod = (mod === 'all') || (el.getAttribute('data-module') === mod);
            const matchQ = !q || el.getAttribute('data-search').includes(q);
            el.style.display = (matchMod && matchQ) ? '' : 'none';
        });
        const visible = document.querySelectorAll('#pcList .pc-item:not([style*="display: none"])').length;
        const counter = document.getElementById('pcCounter');
        if (counter) counter.textContent = visible + ' résultat' + (visible > 1 ? 's' : '');
    }

    async function renderPodcasts(host) {
        if (!host) return;
        host.innerHTML = '<div class="page-title">🎧 Podcasts</div><div style="padding:20px;text-align:center;color:#94a3b8">Chargement des podcasts…</div>';
        if (!_pState.modules) {
            try { _pState.modules = await api('get_unified_modules'); } catch (e) { _pState.modules = null; }
        }
        const data = _pState.modules;
        if (!data) {
            host.innerHTML = '<div class="page-title">🎧 Podcasts</div><div style="padding:20px;color:#fca5a5">Impossible de charger les modules.</div>';
            return;
        }

        const items = _collectPodcasts(data);
        // Groupe par module (ordre alphabétique des module_id)
        const byMod = {};
        for (const it of items) {
            const k = it.module_id;
            if (!byMod[k]) byMod[k] = { module_name: it.module_name, module_color: it.module_color, items: [] };
            byMod[k].items.push(it);
        }
        const modKeys = Object.keys(byMod).sort();
        // Construit les options filtres
        const filterOpts = ['<option value="all">Tous les modules</option>']
            .concat(modKeys.map(k => `<option value="${_escAttr(k)}">${_esc(k)} — ${_esc(byMod[k].module_name)} (${byMod[k].items.length})</option>`));

        let totalCount = items.length;
        let html = `
            <div class="page-title" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
                <span>🎧 Podcasts</span>
                <span style="font-size:13px;font-weight:400;color:#94a3b8">${totalCount} audio${totalCount > 1 ? 's' : ''} disponibles · 48 kbps mono</span>
            </div>
            <div class="pc-toolbar">
                <input type="text" id="pcSearch" placeholder="🔎 Rechercher dans les titres…" class="pc-search" autocomplete="off">
                <select id="pcFilter" class="pc-filter">${filterOpts.join('')}</select>
                <span id="pcCounter" class="pc-counter">${totalCount} résultat${totalCount > 1 ? 's' : ''}</span>
            </div>
            <div id="pcList" class="pc-list">`;

        for (const mk of modKeys) {
            const grp = byMod[mk];
            html += `<section class="pc-group" data-module-group="${_escAttr(mk)}">
                <h2 class="pc-group-title" style="border-left-color:${grp.module_color}">
                    <span class="pc-badge" style="background:${grp.module_color};color:#fff;margin-right:8px">${_esc(mk)}</span>
                    ${_esc(grp.module_name)}
                    <span class="pc-group-count">${grp.items.length} podcast${grp.items.length > 1 ? 's' : ''}</span>
                </h2>
                <div class="pc-grid">`;
            for (const it of grp.items) html += _renderItem(it);
            html += `</div></section>`;
        }
        html += `</div>`;

        if (items.length === 0) {
            html = `<div class="page-title">🎧 Podcasts</div>
                <div style="padding:40px;text-align:center;color:#94a3b8">
                    <div style="font-size:48px;margin-bottom:14px">🎧</div>
                    <div style="font-size:15px;margin-bottom:8px">Aucun podcast disponible</div>
                    <div style="font-size:12px">Les podcasts sont liés aux normes via <code>audio_files</code>.</div>
                </div>`;
        }

        host.innerHTML = html;

        // Liens filtres
        const search = document.getElementById('pcSearch');
        const filt = document.getElementById('pcFilter');
        if (search) search.addEventListener('input', (e) => { _pState.query = e.target.value || ''; _applyFilters(); });
        if (filt) filt.addEventListener('change', (e) => { _pState.moduleFilter = e.target.value; _applyFilters(); });
    }

    window.renderPodcasts = renderPodcasts;
})();
