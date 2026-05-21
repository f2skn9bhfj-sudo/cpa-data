/* ═══════════════════════════════════════════════════════════════
   Audit › Cours MSA — visionneuse de la base de cours Audit
   - Sommaire : Markdown cliquable (_sommaire.md)
   - Fiche    : JSON structuré → rendu avec la DA de l'onglet Modules
                (header coloré, sections en cartes, callouts couleur)
   Dépend de api(), formatAnswer(), escapeHtml() (globaux app).
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const ACCENT = '#805ad5';   // violet Audit (cohérent onglet)
    const ACCENT_BG = '#3c1d6e';

    let _acState = { onglet: 'controle_ordinaire', manifest: null, currentFiche: null };

    function _esc(s) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(s == null ? '' : String(s));
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function _fmt(s) {
        let h = (typeof window.formatAnswer === 'function')
            ? window.formatAnswer(s || '')
            : _esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        // formatAnswer ne gère que **bold**. On ajoute l'italique *text* → <em>,
        // sans casser les balises HTML déjà émises (ni les ** déjà convertis).
        h = h.replace(/\*([^*\n<>]+)\*/g, '<em>$1</em>');
        return h;
    }

    // ── Mini-Markdown (uniquement pour le _sommaire.md) ──
    function _renderMarkdown(md) {
        const lines = String(md || '').split('\n');
        let html = '', i = 0, inUL = false;
        const closeUL = () => { if (inUL) { html += '</ul>'; inUL = false; } };
        while (i < lines.length) {
            const line = lines[i], t = line.trim();
            let m = line.match(/^(#{1,4})\s+(.*?)\s*$/);
            if (m) { closeUL(); const l = m[1].length; html += `<h${l} class="ac-h${l}">${_inlineMd(m[2])}</h${l}>`; i++; continue; }
            if (t.startsWith('>')) {
                closeUL(); let q = '';
                while (i < lines.length && lines[i].trim().startsWith('>')) { q += lines[i].trim().replace(/^>\s?/, '') + '\n'; i++; }
                let c = 'ac-quote'; if (/⚠️|🔴/.test(q)) c += ' ac-quote-warn'; else if (/📅/.test(q)) c += ' ac-quote-evol';
                html += `<blockquote class="${c}">${_inlineMd(q).replace(/\n/g, '<br>')}</blockquote>`; continue;
            }
            if (/^\s*[-*]\s+/.test(line)) {
                if (!inUL) { html += '<ul class="ac-ul">'; inUL = true; }
                const ind = line.match(/^\s*/)[0].length;
                html += `<li${ind >= 2 ? ' class="ac-sub"' : ''}>${_inlineMd(line.replace(/^\s*[-*]\s+/, ''))}</li>`;
                i++; continue;
            }
            if (/^---+\s*$/.test(t)) { closeUL(); html += '<hr class="ac-hr">'; i++; continue; }
            if (t === '') { closeUL(); i++; continue; }
            closeUL(); html += `<p class="ac-p">${_inlineMd(line)}</p>`; i++;
        }
        closeUL();
        return html;
    }
    function _inlineMd(s) {
        let h = _esc(s);
        h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
        h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        h = h.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
        h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, txt, url) => `<a href="#" data-ac-link="${_esc(url)}">${txt}</a>`);
        return h;
    }

    // ── Callout identique à l'onglet Modules ──
    const CALLOUTS = [
        ['info',    '💡', 'Pour info',       'info'],
        ['legal',   '⚖️', 'Texte légal',     'legal_quote'],
        ['example', '🟢', 'Exemple concret', 'example'],
        ['comp',    '📊', 'Comparaison',     'comparison'],
        ['key',     '🎯', 'Point clé',       'key_point'],
        ['tip',     '🧠', 'Astuce mémo',     'tip'],
        ['warn',    '⚠️', 'Attention',       'warning'],
    ];
    function _callout(variant, icon, label, content) {
        if (!content) return '';
        return `<aside class="callout callout--${variant}" role="note">
            <span class="callout-icon" aria-hidden="true">${icon}</span>
            <div class="callout-label">${_esc(label)}</div>
            <div class="callout-body">${_fmt(content)}</div>
        </aside>`;
    }

    // ── Rendu d'une fiche JSON avec la DA Modules ──
    function _renderFicheJSON(f) {
        let h = '<div class="mod-detail fade-in">';

        // Header card coloré (violet Audit)
        h += `<div class="mod-header-card" style="border-color:${ACCENT}44;background:linear-gradient(135deg, ${ACCENT_BG}55, ${ACCENT_BG}22)">
            <div class="mod-hc-top">
                <div class="mod-hc-left">
                    <div class="mod-hc-cat" style="color:#c4b5fd">${_esc(f.category || 'Audit')}</div>
                    <h2 class="mod-hc-title">${_esc(f.title || f.code || 'Fiche')}</h2>
                </div>
            </div>
            <div class="mod-hc-meta">
                ${f.ref_msa ? `📖 ${_esc(f.ref_msa)}<br>` : ''}
                ${f.bases_legales ? `⚖️ ${_fmt(f.bases_legales)}<br>` : ''}
                ${f.normes ? `📐 ${_esc(f.normes)} · ` : ''}${f.niveau ? `🎓 ${_esc(f.niveau)}` : ''}
            </div>
        </div>`;

        if (f.summary) {
            h += `<div class="mod-section"><div class="mod-section-text">${_fmt(f.summary)}</div></div>`;
        }
        if (f.mnemonics) {
            h += `<div class="mod-mnemonic-box">💡 ${_fmt(f.mnemonics)}</div>`;
        }

        (f.sections || []).forEach(sec => {
            const idAttr = sec.anchor ? ` id="ac-${_esc(sec.anchor)}"` : '';
            h += `<div class="mod-section"${idAttr}>`;
            if (sec.title) h += `<h3 class="mod-section-title">${_esc(sec.title)}</h3>`;
            if (sec.content) h += `<div class="mod-section-text">${_fmt(sec.content)}</div>`;
            CALLOUTS.forEach(([variant, icon, label, key]) => {
                if (sec[key]) h += _callout(variant, icon, label, sec[key]);
            });
            h += '</div>';
        });

        // Auto-test
        if (Array.isArray(f.auto_test) && f.auto_test.length) {
            h += `<div class="mod-section"><h3 class="mod-section-title">🧪 Auto-test</h3>`;
            h += '<ol class="ac-ol">';
            f.auto_test.forEach(qa => { h += `<li>${_fmt(qa.q)}</li>`; });
            h += '</ol>';
            h += `<details class="ac-answers"><summary>Voir les réponses</summary>`;
            f.auto_test.forEach((qa, idx) => {
                h += `<div class="ac-answer"><strong>${idx + 1}.</strong> ${_fmt(qa.a)}</div>`;
            });
            h += `</details></div>`;
        }

        // Sources
        if (Array.isArray(f.sources) && f.sources.length) {
            h += `<div class="mod-section"><h3 class="mod-section-title">🔗 Sources consultées</h3><ul class="ac-ul">`;
            f.sources.forEach(s => {
                const linked = _esc(s).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
                h += `<li>${linked}</li>`;
            });
            h += `</ul></div>`;
        }

        // Statut
        if (f.statut) {
            h += `<div class="ac-statut">${_esc(f.statut)}${f.maj ? ` · maj ${_esc(f.maj)}` : ''}</div>`;
        }

        h += '</div>';
        return h;
    }

    // ── Résolution chemins relatifs (liens sommaire) ──
    function _resolvePath(base, rel) {
        let anchor = '';
        const hi = rel.indexOf('#');
        if (hi >= 0) { anchor = rel.slice(hi + 1); rel = rel.slice(0, hi); }
        if (!rel) return { path: base, anchor };
        const baseDir = base.includes('/') ? base.slice(0, base.lastIndexOf('/')) : '';
        const parts = baseDir ? baseDir.split('/') : [];
        rel.split('/').forEach(seg => {
            if (seg === '..') parts.pop();
            else if (seg !== '.' && seg !== '') parts.push(seg);
        });
        return { path: parts.join('/'), anchor };
    }

    // ── UI ──
    async function _renderAuditCours(host) {
        if (!host) return;
        host.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8">Chargement de la base de cours…</div>';
        if (!_acState.manifest) {
            try { _acState.manifest = await api('get_audit_manifest'); } catch (e) { _acState.manifest = {}; }
        }
        const man = _acState.manifest || {};
        const hasCO = man.controle_ordinaire && man.controle_ordinaire.parties;
        const hasCR = man.controle_restreint && man.controle_restreint.parties;
        if (!hasCO && !hasCR) {
            host.innerHTML = `<div style="padding:40px;text-align:center">
                <div style="font-size:42px;margin-bottom:10px">📚</div>
                <div style="color:#fca5a5;font-size:15px;margin-bottom:6px">Base de cours Audit indisponible</div>
                <div style="color:#94a3b8;font-size:13px"><code>audit/manifest.json</code> introuvable.</div></div>`;
            return;
        }
        const tab = _acState.onglet;
        const tCO = (man.controle_ordinaire && man.controle_ordinaire.titre) || 'Contrôle ordinaire';
        const tCR = (man.controle_restreint && man.controle_restreint.titre) || 'Contrôle restreint';
        host.innerHTML = `
            <div class="ac-toggle">
                <button class="ac-tg ${tab === 'controle_ordinaire' ? 'active' : ''}" onclick="acSwitchOnglet('controle_ordinaire')">${_esc(tCO)}</button>
                <button class="ac-tg ${tab === 'controle_restreint' ? 'active' : ''}" onclick="acSwitchOnglet('controle_restreint')">${_esc(tCR)}</button>
            </div>
            <div id="acViewer" class="ac-viewer"></div>`;
        await _openFiche(tab + '/_sommaire.md', null, false);
    }

    async function _openFiche(path, anchor) {
        const viewer = document.getElementById('acViewer');
        if (!viewer) return;
        viewer.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">Chargement…</div>';

        let raw;
        try { raw = await api('get_audit_fiche', path); } catch (e) { raw = null; }
        if (raw == null) {
            viewer.innerHTML = `<div style="padding:30px;color:#fca5a5">Impossible de charger <code>${_esc(path)}</code>.</div>`;
            return;
        }
        _acState.currentFiche = path;
        const isSommaire = /_sommaire\.md$/.test(path);

        // Mode lecture (fiche) vs navigation (sommaire) : ajuste le chrome
        // (classe posée sur .audit-module pour pouvoir masquer aussi le bandeau
        // d'en-tête + la rangée de sous-onglets via CSS).
        const auditMod = viewer.closest('.audit-module') || viewer.parentElement;
        if (auditMod) auditMod.classList.toggle('ac-reading', !isSommaire);

        let body;
        if (/\.json$/.test(path)) {
            try { body = `<div class="ac-md">${_renderFicheJSON(JSON.parse(raw))}</div>`; }
            catch (e) { body = `<div class="ac-md">${_renderMarkdown(raw)}</div>`; }
        } else {
            body = `<div class="ac-md">${_renderMarkdown(raw)}</div>`;
        }

        const isJson = /\.json$/.test(path);
        const pdfBtn = isJson ? `<button class="ac-back" onclick="acExportFichePdf(this)" title="Exporter cette fiche en PDF">📄 PDF</button>` : '';
        const backBar = isSommaire ? '' : `
            <div class="ac-backbar">
                <button class="ac-back" onclick="acBackToSommaire()">← Sommaire</button>
                <span class="ac-crumb">${_esc(path.replace(_acState.onglet + '/', ''))}</span>
                ${pdfBtn}
            </div>`;
        viewer.innerHTML = backBar + body;

        viewer.querySelectorAll('a[data-ac-link]').forEach(a => {
            a.addEventListener('click', (ev) => {
                ev.preventDefault();
                const { path: rp, anchor: an } = _resolvePath(_acState.currentFiche, a.getAttribute('data-ac-link'));
                if (/\.(md|json)$/.test(rp)) _openFiche(rp, an || null);
                else if (an) {
                    const el = document.getElementById('ac-' + an);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        // Scroll to anchor if any
        if (anchor) {
            setTimeout(() => {
                const el = document.getElementById('ac-' + anchor);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                else viewer.scrollTop = 0;
            }, 80);
        } else {
            viewer.scrollTop = 0;
        }
    }

    window._renderAuditCours = _renderAuditCours;
    window.acSwitchOnglet = function (o) {
        _acState.onglet = o;
        const host = document.getElementById('auditContent');
        if (host) _renderAuditCours(host);
    };
    window.acBackToSommaire = function () { _openFiche(_acState.onglet + '/_sommaire.md', null); };

    window.acExportFichePdf = async function (btn) {
        const path = _acState.currentFiche;
        if (!path || !/\.json$/.test(path)) return;
        const original = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Export…'; }
        try {
            const res = await api('export_audit_fiche_pdf', path);
            if (res && res.ok) {
                if (btn) btn.textContent = '✅ PDF';
                setTimeout(() => { if (btn) { btn.textContent = original; btn.disabled = false; } }, 1800);
            } else if (res && res.cancelled) {
                if (btn) { btn.textContent = original; btn.disabled = false; }
            } else {
                const msg = (res && res.error) ? res.error : 'Échec inconnu';
                if (btn) { btn.textContent = '❌ Échec'; setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2200); }
                console.warn('export_audit_fiche_pdf:', msg);
            }
        } catch (e) {
            if (btn) { btn.textContent = '❌ Erreur'; setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2200); }
            console.error('export_audit_fiche_pdf:', e);
        }
    };
})();
