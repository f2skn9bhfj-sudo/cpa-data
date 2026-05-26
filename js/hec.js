/* ═══════════════════════════════════════════════════════════════
   HEC › Cours certifiants — visionneuse base de cours HEC
   - Manifest : liste des cours (manifest.json à la racine hec/)
   - Sommaire : Markdown cliquable (_sommaire.md par cours)
   - Fiche    : JSON structuré → rendu DA identique aux fiches Audit
                (header coloré, sections en cartes, callouts couleur)
   Dépend de api(), formatAnswer(), escapeHtml() (globaux app).
   Calqué sur audit_cours.js — couleur bordeaux HEC.
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const ACCENT = '#8B1A2E';   // bordeaux HEC
    const ACCENT_BG = '#5A1020';

    let _hecState = { manifest: null, currentCours: null, currentFiche: null };

    function _esc(s) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(s == null ? '' : String(s));
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function _fmt(s) {
        let h = (typeof window.formatAnswer === 'function')
            ? window.formatAnswer(s || '')
            : _esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        h = h.replace(/\*([^*\n<>]+)\*/g, '<em>$1</em>');
        return h;
    }

    // ── Mini-Markdown (pour _sommaire.md des cours) ──
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
        h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, txt, url) => `<a href="#" data-hec-link="${_esc(url)}">${txt}</a>`);
        return h;
    }

    // ── Callouts identiques fiches Audit ──
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

    // ── Rendu d'une fiche JSON (DA identique Modules/Audit) ──
    function _renderFicheJSON(f) {
        let h = '<div class="mod-detail fade-in">';

        h += `<div class="mod-header-card" style="border-color:${ACCENT}44;background:linear-gradient(135deg, ${ACCENT_BG}55, ${ACCENT_BG}22)">
            <div class="mod-hc-top">
                <div class="mod-hc-left">
                    <div class="mod-hc-cat" style="color:#fca5a5">${_esc(f.category || 'HEC')}</div>
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
            const idAttr = sec.anchor ? ` id="hec-${_esc(sec.anchor)}"` : '';
            h += `<div class="mod-section"${idAttr}>`;
            if (sec.title) h += `<h3 class="mod-section-title">${_esc(sec.title)}</h3>`;
            if (sec.content) h += `<div class="mod-section-text">${_fmt(sec.content)}</div>`;
            CALLOUTS.forEach(([variant, icon, label, key]) => {
                if (sec[key]) h += _callout(variant, icon, label, sec[key]);
            });
            h += '</div>';
        });

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

        if (Array.isArray(f.sources) && f.sources.length) {
            h += `<div class="mod-section"><h3 class="mod-section-title">🔗 Sources</h3><ul class="ac-ul">`;
            f.sources.forEach(s => {
                const linked = _esc(s).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
                h += `<li>${linked}</li>`;
            });
            h += `</ul></div>`;
        }

        if (f.statut) {
            h += `<div class="ac-statut">${_esc(f.statut)}${f.maj ? ` · maj ${_esc(f.maj)}` : ''}</div>`;
        }

        h += '</div>';
        return h;
    }

    // ── Résolution chemins relatifs ──
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

    // ── UI principale ──
    async function _renderHEC(host) {
        if (!host) return;
        host.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8">Chargement des cours HEC…</div>';
        if (!_hecState.manifest) {
            try { _hecState.manifest = await api('get_hec_manifest'); } catch (e) { _hecState.manifest = {}; }
        }
        const man = _hecState.manifest || {};
        const cours = Array.isArray(man.cours) ? man.cours : [];
        if (cours.length === 0) {
            host.innerHTML = `<div style="padding:40px;text-align:center">
                <div style="font-size:42px;margin-bottom:10px">🎓</div>
                <div style="color:#fca5a5;font-size:15px;margin-bottom:6px">Base de cours HEC indisponible</div>
                <div style="color:#94a3b8;font-size:13px"><code>hec/manifest.json</code> introuvable.</div></div>`;
            return;
        }

        // Si un cours est déjà sélectionné, on affiche son sommaire / fiche
        // Sinon : liste des cours
        if (!_hecState.currentCours) {
            // Carte par cours
            let html = `<div style="padding:8px 18px;margin-bottom:14px">
                <div style="color:#94a3b8;font-size:12px;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">${_esc(man.titre || 'HEC')}</div>
                <div style="color:#cbd5e1;font-size:14px">${_esc(man.description || '')}</div>
            </div>`;
            html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px;padding:0 18px 20px">';
            cours.forEach(c => {
                const accent = c.couleur || ACCENT;
                const nbFiches = (c.fiches || []).length;
                html += `<div class="mod-card-hec" onclick="hecOpenCours('${_esc(c.id)}')" style="cursor:pointer;border:1px solid ${accent}55;background:linear-gradient(135deg,${accent}22,${accent}08);border-radius:12px;padding:18px;transition:transform .15s,box-shadow .15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px ${accent}33'" onmouseout="this.style.transform='';this.style.boxShadow=''">
                    <div style="color:${accent};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">${_esc(c.ecole || 'HEC')} · ${_esc(c.code || '')}</div>
                    <div style="color:#fff;font-size:17px;font-weight:700;margin-bottom:8px;line-height:1.3">${_esc(c.titre || c.code)}</div>
                    <div style="color:#cbd5e1;font-size:13px;line-height:1.5;margin-bottom:10px">${_esc(c.description || '')}</div>
                    <div style="color:${accent};font-size:12px;font-weight:600">📚 ${nbFiches} fiche${nbFiches > 1 ? 's' : ''}</div>
                </div>`;
            });
            html += '</div>';
            host.innerHTML = html;
            return;
        }

        // Cours ouvert : layout avec viewer
        host.innerHTML = `
            <div class="ac-toggle" style="border-color:${ACCENT}44">
                <button class="ac-tg active" onclick="hecBackToCoursList()" style="background:${ACCENT_BG}44">← Tous les cours HEC</button>
                <span style="padding:8px 14px;color:#cbd5e1;font-size:13px;align-self:center">${_esc(_hecState.currentCours.titre || _hecState.currentCours.code)}</span>
            </div>
            <div id="hecViewer" class="ac-viewer"></div>`;

        const path = _hecState.currentCours.sommaire || `${_hecState.currentCours.id}/_sommaire.md`;
        await _openFiche(path, null);
    }

    async function _openFiche(path, anchor) {
        const viewer = document.getElementById('hecViewer');
        if (!viewer) return;
        viewer.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">Chargement…</div>';

        let raw;
        try { raw = await api('get_hec_fiche', path); } catch (e) { raw = null; }
        if (raw == null) {
            viewer.innerHTML = `<div style="padding:30px;color:#fca5a5">Impossible de charger <code>${_esc(path)}</code>.</div>`;
            return;
        }
        _hecState.currentFiche = path;
        const isSommaire = /_sommaire\.md$/.test(path);

        const hecMod = viewer.closest('.audit-module') || viewer.parentElement;
        if (hecMod) hecMod.classList.toggle('ac-reading', !isSommaire);

        let body;
        if (/\.json$/.test(path)) {
            try { body = `<div class="ac-md">${_renderFicheJSON(JSON.parse(raw))}</div>`; }
            catch (e) { body = `<div class="ac-md">${_renderMarkdown(raw)}</div>`; }
        } else {
            body = `<div class="ac-md">${_renderMarkdown(raw)}</div>`;
        }

        const isJson = /\.json$/.test(path);
        const pdfBtn = isJson ? `<button class="ac-back" onclick="hecExportFichePdf(this)" title="Exporter cette fiche en PDF">📄 PDF</button>` : '';
        const backBar = isSommaire ? '' : `
            <div class="ac-backbar">
                <button class="ac-back" onclick="hecBackToSommaire()">← Sommaire</button>
                <span class="ac-crumb">${_esc(path.split('/').pop())}</span>
                ${pdfBtn}
            </div>`;
        viewer.innerHTML = backBar + body;

        viewer.querySelectorAll('a[data-hec-link]').forEach(a => {
            a.addEventListener('click', (ev) => {
                ev.preventDefault();
                const { path: rp, anchor: an } = _resolvePath(_hecState.currentFiche, a.getAttribute('data-hec-link'));
                if (/\.(md|json)$/.test(rp)) _openFiche(rp, an || null);
                else if (an) {
                    const el = document.getElementById('hec-' + an);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });

        if (anchor) {
            setTimeout(() => {
                const el = document.getElementById('hec-' + anchor);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                else viewer.scrollTop = 0;
            }, 80);
        } else {
            viewer.scrollTop = 0;
        }
    }

    window._renderHEC = _renderHEC;

    window.hecOpenCours = function (coursId) {
        const man = _hecState.manifest || {};
        const cours = (man.cours || []).find(c => c.id === coursId);
        if (!cours) return;
        _hecState.currentCours = cours;
        const host = document.getElementById('mainContent');
        if (host) _renderHEC(host);
    };

    window.hecBackToCoursList = function () {
        _hecState.currentCours = null;
        _hecState.currentFiche = null;
        const host = document.getElementById('mainContent');
        if (host) _renderHEC(host);
    };

    window.hecBackToSommaire = function () {
        if (!_hecState.currentCours) return;
        const path = _hecState.currentCours.sommaire || `${_hecState.currentCours.id}/_sommaire.md`;
        _openFiche(path, null);
    };

    window.hecExportFichePdf = async function (btn) {
        const path = _hecState.currentFiche;
        if (!path || !/\.json$/.test(path)) return;
        const original = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Export…'; }
        try {
            const res = await api('export_hec_fiche_pdf', path);
            if (res && res.ok) {
                if (btn) btn.textContent = '✅ PDF';
                setTimeout(() => { if (btn) { btn.textContent = original; btn.disabled = false; } }, 1800);
            } else if (res && res.cancelled) {
                if (btn) { btn.textContent = original; btn.disabled = false; }
            } else {
                const msg = (res && res.error) ? res.error : 'Échec inconnu';
                if (btn) { btn.textContent = '❌ Échec'; setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2200); }
                console.warn('export_hec_fiche_pdf:', msg);
            }
        } catch (e) {
            if (btn) { btn.textContent = '❌ Erreur'; setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 2200); }
            console.error('export_hec_fiche_pdf:', e);
        }
    };
})();
