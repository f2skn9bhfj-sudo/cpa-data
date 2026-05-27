/* ═══════════════════════════════════════════════════════════════
   Translator v2 — Swap FR↔EN pré-traduit + click-to-translate API
   ─────────────────────────────────────────────────────────────────
   PHILOSOPHIE :
   - Toggle EN/FR sur un cours = SWAP entre 2 versions stockées dans
     le JSON (sections vs sections_en). Aucune API. Instantané, parfait.
   - Click sur un mot ou sélection courte = API Google Translate
     (qualité supérieure à MyMemory) avec cache localStorage.

   Cette approche garantit :
   ✅ Qualité technique parfaite sur tout le cours (traduction humaine)
   ✅ Offline (aucun appel réseau pour le toggle)
   ✅ Instantané (swap d'innerHTML)
   ✅ Click-to-translate utile pour explorer les mots inconnus

   API publique :
     Translator.translate(text, from='fr', to='en')   → async string
     Translator.toggleNormLang(norm, normEl, btn)     → swap pré-traduit
     Translator.attachInteractive(rootEl)             → click + selection
     Translator.hasEnglishVersion(norm)               → boolean
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const CACHE_KEY = 'tr_cache_v2';
    const LANG_KEY = 'tr_norm_lang_v2';

    // ── Cache localStorage ──
    function _loadCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
        catch (_) { return {}; }
    }
    function _saveCache(c) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (_) {}
    }
    let _cache = _loadCache();
    function _cacheKey(text, from, to) { return from + '|' + to + '|' + text; }

    // ── Services de traduction (Google en 1er, MyMemory en fallback) ──
    async function _fetchGoogle(text, from, to) {
        const url = 'https://translate.googleapis.com/translate_a/single'
            + '?client=gtx&sl=' + from + '&tl=' + to + '&dt=t&q=' + encodeURIComponent(text);
        const r = await fetch(url);
        if (!r.ok) throw new Error('Google HTTP ' + r.status);
        const data = await r.json();
        if (!Array.isArray(data) || !data[0]) throw new Error('Google empty');
        return data[0].map(seg => seg[0]).join('');
    }

    async function _fetchMyMemory(text, from, to) {
        const url = 'https://api.mymemory.translated.net/get'
            + '?q=' + encodeURIComponent(text)
            + '&langpair=' + encodeURIComponent(from + '|' + to);
        const r = await fetch(url);
        if (!r.ok) throw new Error('MyMemory HTTP ' + r.status);
        const data = await r.json();
        const t = data && data.responseData && data.responseData.translatedText;
        if (!t || /^MYMEMORY WARNING:/.test(t)) throw new Error('MyMemory empty');
        return t;
    }

    async function translate(text, from, to) {
        from = from || 'fr'; to = to || 'en';
        if (!text || !text.trim() || from === to) return text;
        const key = _cacheKey(text, from, to);
        if (_cache[key]) return _cache[key];

        let translated;
        try {
            translated = await _fetchGoogle(text, from, to);
        } catch (e1) {
            console.warn('[translator] Google échec, fallback MyMemory:', e1.message);
            translated = await _fetchMyMemory(text, from, to);
        }
        _cache[key] = translated;
        _saveCache(_cache);
        return translated;
    }

    // ── Popup de traduction (mot/phrase) ──
    let _popupEl = null;
    function _ensurePopup() {
        if (_popupEl) return _popupEl;
        const p = document.createElement('div');
        p.className = 'tr-popup hidden';
        p.innerHTML = `
            <div class="tr-popup-head">
                <span class="tr-popup-from"></span>
                <button class="tr-popup-close" onclick="window.Translator._hidePopup()" aria-label="Fermer">×</button>
            </div>
            <div class="tr-popup-body"></div>
        `;
        document.body.appendChild(p);
        _popupEl = p;
        document.addEventListener('click', (ev) => {
            if (_popupEl && !_popupEl.contains(ev.target) && !ev.target.closest('.tr-word-trigger')) {
                _hidePopup();
            }
        });
        return p;
    }
    function _showPopup(originalText, x, y, loading) {
        const p = _ensurePopup();
        p.querySelector('.tr-popup-from').textContent = originalText.length > 80
            ? originalText.slice(0, 80) + '…' : originalText;
        const body = p.querySelector('.tr-popup-body');
        if (loading) {
            body.innerHTML = '<div class="tr-loading"><span class="tr-spinner"></span> Traduction…</div>';
        }
        p.classList.remove('hidden');
        const rect = p.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        let left = x + 10, top = y + 14;
        if (left + rect.width > vw - 16) left = vw - rect.width - 16;
        if (top + rect.height > vh - 16) top = y - rect.height - 14;
        if (top < 16) top = 16;
        if (left < 16) left = 16;
        p.style.left = left + 'px';
        p.style.top = top + 'px';
    }
    function _hidePopup() { if (_popupEl) _popupEl.classList.add('hidden'); }
    function _setPopupContent(html) {
        if (!_popupEl) return;
        const body = _popupEl.querySelector('.tr-popup-body');
        if (body) body.innerHTML = html;
    }

    // ── Click handler + sélection ──
    function _caretFromPoint(x, y) {
        if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(x, y);
            if (pos && pos.offsetNode && pos.offsetNode.nodeType === 3) {
                return { node: pos.offsetNode, offset: pos.offset };
            }
        }
        if (document.caretRangeFromPoint) {
            const r = document.caretRangeFromPoint(x, y);
            if (r && r.startContainer && r.startContainer.nodeType === 3) {
                return { node: r.startContainer, offset: r.startOffset };
            }
        }
        return null;
    }
    function _escHtml(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function _detectSourceLang(rootEl) {
        const toggle = rootEl && rootEl.querySelector
            ? rootEl.querySelector('.tr-toggle-btn[data-lang]')
            : null;
        if (toggle && toggle.dataset.lang === 'en') return 'en';
        return 'fr';
    }

    async function _handleWordClick(ev, rootEl) {
        const tag = ev.target.tagName;
        if (['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'AUDIO', 'VIDEO'].includes(tag)) return;
        if (ev.target.closest('.tr-popup, .tr-sel-bubble, .mod-audio')) return;
        if (ev.target.closest('button, a, input, textarea, select')) return;

        const sel = window.getSelection();
        const selText = sel ? sel.toString().trim() : '';
        let word = '';
        if (selText) {
            word = selText;
        } else {
            const nodeAndOffset = _caretFromPoint(ev.clientX, ev.clientY);
            if (!nodeAndOffset) return;
            const { node, offset } = nodeAndOffset;
            const text = node.nodeValue || '';
            if (!text) return;
            const wordRegex = /[A-Za-zÀ-ÿ0-9'\-]/;
            let start = offset, end = offset;
            while (start > 0 && wordRegex.test(text[start - 1])) start--;
            while (end < text.length && wordRegex.test(text[end])) end++;
            word = text.slice(start, end).trim();
        }
        if (!word || word.length < 2) return;

        const from = _detectSourceLang(rootEl);
        const to = (from === 'fr') ? 'en' : 'fr';

        _showPopup(word, ev.clientX, ev.clientY, true);
        try {
            const t = await translate(word, from, to);
            _setPopupContent(`<div class="tr-translated">${_escHtml(t)}</div>
                <div class="tr-meta">${from.toUpperCase()} → ${to.toUpperCase()} · Google</div>`);
        } catch (e) {
            _setPopupContent(`<div class="tr-error">Échec de la traduction. Connexion internet OK ?</div>`);
        }
    }

    // Sélection → bouton flottant
    let _selBubble = null;
    function _ensureSelBubble() {
        if (_selBubble) return _selBubble;
        const b = document.createElement('div');
        b.className = 'tr-sel-bubble hidden';
        b.innerHTML = `<button class="tr-sel-btn">🌐 Traduire</button>`;
        document.body.appendChild(b);
        _selBubble = b;
        document.addEventListener('mousedown', (ev) => {
            if (_selBubble && !_selBubble.contains(ev.target)) {
                _selBubble.classList.add('hidden');
            }
        });
        return b;
    }
    function _showSelectionBubble(text, x, y, rootEl) {
        const b = _ensureSelBubble();
        const btn = b.querySelector('.tr-sel-btn');
        btn.onclick = async (ev) => {
            ev.stopPropagation();
            b.classList.add('hidden');
            const from = _detectSourceLang(rootEl);
            const to = (from === 'fr') ? 'en' : 'fr';
            _showPopup(text, x, y, true);
            try {
                const t = await translate(text, from, to);
                _setPopupContent(`<div class="tr-translated">${_escHtml(t)}</div>
                    <div class="tr-meta">${from.toUpperCase()} → ${to.toUpperCase()} · Google</div>`);
            } catch (e) {
                _setPopupContent(`<div class="tr-error">Échec de la traduction.</div>`);
            }
        };
        b.style.left = (x + 8) + 'px';
        b.style.top = (y + 14) + 'px';
        b.classList.remove('hidden');
    }

    function attachInteractive(rootEl) {
        if (!rootEl || rootEl._trAttached) return;
        rootEl.addEventListener('click', (ev) => _handleWordClick(ev, rootEl));
        rootEl.addEventListener('mouseup', (ev) => {
            const sel = window.getSelection();
            const text = sel ? sel.toString().trim() : '';
            if (text && text.length > 1 && text.split(/\s+/).length > 1) {
                _showSelectionBubble(text, ev.clientX, ev.clientY, rootEl);
            }
        });
        rootEl._trAttached = true;
    }

    // ── Détection version EN pré-traduite ──
    // Une norme a une version EN si elle contient au moins un de :
    //   title_en, summary_en, sections_en, content_en
    function hasEnglishVersion(norm) {
        if (!norm) return false;
        return !!(norm.title_en || norm.summary_en
            || (Array.isArray(norm.sections_en) && norm.sections_en.length > 0)
            || (Array.isArray(norm.content_en) && norm.content_en.length > 0));
    }

    // ── Toggle EN/FR via swap des champs pré-traduits ──
    // Approche : on demande à modules.js de re-render la norme avec
    // les champs *_en au lieu des champs FR. La logique est portée par
    // un événement personnalisé : modules.js l'écoute et re-render.
    function _getLangPref() {
        try { return JSON.parse(localStorage.getItem(LANG_KEY) || '{}'); }
        catch (_) { return {}; }
    }
    function _setLangPref(o) {
        try { localStorage.setItem(LANG_KEY, JSON.stringify(o)); } catch (_) {}
    }

    function getCurrentLang(normId) {
        const langs = _getLangPref();
        return langs[normId] || 'fr';
    }

    function setCurrentLang(normId, lang) {
        const langs = _getLangPref();
        langs[normId] = lang;
        _setLangPref(langs);
    }

    /**
     * Toggle la langue d'affichage d'une norme.
     * - norm : l'objet norm complet (avec ou sans champs _en)
     * - normEl : l'élément racine de la fiche (.mod-detail)
     * - btn : le bouton (label + dataset.lang à mettre à jour)
     * - onRender : callback(lang) qui re-rend la fiche dans la langue donnée
     */
    function toggleNormLang(norm, normEl, btn, onRender) {
        if (!norm) return;

        const current = getCurrentLang(norm.id);
        const next = (current === 'fr') ? 'en' : 'fr';

        // Si on veut passer en EN mais qu'il n'y a pas de traduction → message
        if (next === 'en' && !hasEnglishVersion(norm)) {
            _showMissingTranslationMsg(btn);
            return;
        }

        setCurrentLang(norm.id, next);

        // Re-render via callback (modules.js fait le boulot)
        if (typeof onRender === 'function') {
            onRender(next);
        }

        // Met à jour le label du bouton
        if (btn) {
            if (next === 'en') {
                btn.textContent = '🇫🇷 FR';
                btn.dataset.lang = 'en';
                btn.title = 'Revenir au français';
            } else {
                btn.textContent = '🇬🇧 EN';
                btn.dataset.lang = 'fr';
                btn.title = 'Afficher en anglais';
            }
        }
    }

    function _showMissingTranslationMsg(btn) {
        if (!btn) return;
        const orig = btn.textContent;
        btn.textContent = '⏳ Traduction EN à venir';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = orig;
            btn.disabled = false;
        }, 2400);

        // Optionnel : affiche un tooltip plus visible
        const rect = btn.getBoundingClientRect();
        _showPopup('Traduction EN à venir', rect.left, rect.bottom, false);
        _setPopupContent(`<div style="color:#fbbf24">⏳ Traduction EN pas encore disponible pour cette norme.</div>
            <div class="tr-meta">Tu peux quand même utiliser le click-sur-un-mot pour traduire en direct.</div>`);
        setTimeout(_hidePopup, 3500);
    }

    /**
     * Applique la version traduite des champs sur l'objet norm.
     * Renvoie une copie avec title, summary, sections (etc.) remplacés
     * par leurs versions EN si lang === 'en' ET si les champs *_en existent.
     */
    function applyLang(norm, lang) {
        if (!norm) return norm;
        if (lang !== 'en') return norm; // FR = original
        if (!hasEnglishVersion(norm)) return norm;

        const copy = Object.assign({}, norm);
        if (norm.title_en) copy.title = norm.title_en;
        if (norm.summary_en) copy.summary = norm.summary_en;
        if (Array.isArray(norm.sections_en) && norm.sections_en.length) copy.sections = norm.sections_en;
        if (Array.isArray(norm.content_en) && norm.content_en.length) copy.content = norm.content_en;
        if (norm.mnemonics_en) copy.mnemonics = norm.mnemonics_en;
        return copy;
    }

    // ── CSS injecté ──
    function _injectStyles() {
        if (document.getElementById('tr-styles')) return;
        const css = `
.tr-popup {
    position: fixed; z-index: 99999;
    background: linear-gradient(135deg, #0f172a, #1e293b);
    color: #e2e8f0; border: 1px solid #475569; border-radius: 10px;
    padding: 10px 14px; box-shadow: 0 12px 36px rgba(0,0,0,0.45);
    font-size: 13px; line-height: 1.5; max-width: 380px; min-width: 200px;
}
.tr-popup.hidden { display: none; }
.tr-popup-head {
    display: flex; justify-content: space-between; align-items: center;
    gap: 10px; border-bottom: 1px solid #33415555;
    padding-bottom: 6px; margin-bottom: 8px;
}
.tr-popup-from {
    color: #94a3b8; font-size: 11px; font-style: italic;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
}
.tr-popup-close {
    background: none; border: none; color: #94a3b8;
    cursor: pointer; font-size: 18px; padding: 0 4px; line-height: 1;
}
.tr-popup-close:hover { color: #f87171; }
.tr-translated { color: #fff; font-weight: 600; font-size: 14px; }
.tr-meta {
    color: #64748b; font-size: 10px; margin-top: 6px;
    text-transform: uppercase; letter-spacing: 1px;
}
.tr-loading {
    color: #94a3b8; font-style: italic;
    display: flex; align-items: center; gap: 8px;
}
.tr-spinner {
    width: 12px; height: 12px;
    border: 2px solid #475569; border-top-color: #38bdf8;
    border-radius: 50%; animation: tr-spin 0.7s linear infinite;
    display: inline-block;
}
@keyframes tr-spin { to { transform: rotate(360deg); } }
.tr-error { color: #fca5a5; }
.tr-sel-bubble { position: fixed; z-index: 99998; }
.tr-sel-bubble.hidden { display: none; }
.tr-sel-btn {
    background: linear-gradient(135deg, #1e3a5f, #1e40af);
    color: #93c5fd; border: 1px solid #3b82f6;
    border-radius: 20px; padding: 6px 14px; font-size: 12px; font-weight: 600;
    cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.35);
}
.tr-sel-btn:hover { background: linear-gradient(135deg, #1e40af, #2563eb); }
.tr-toggle-btn { user-select: none; }
`;
        const s = document.createElement('style');
        s.id = 'tr-styles'; s.textContent = css;
        document.head.appendChild(s);
    }
    _injectStyles();

    // ── Export public ──
    window.Translator = {
        translate,
        toggleNormLang,
        applyLang,
        attachInteractive,
        hasEnglishVersion,
        getCurrentLang,
        setCurrentLang,
        _hidePopup,
        clearCache() { _cache = {}; localStorage.removeItem(CACHE_KEY); }
    };
})();
