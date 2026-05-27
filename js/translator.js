/* ═══════════════════════════════════════════════════════════════
   Translator — module de traduction live FR↔EN pour les fiches
   ─────────────────────────────────────────────────────────────────
   API publique :
     Translator.translate(text, from='fr', to='en')   → async string
     Translator.translateNormDetail(rootEl, toLang)   → traduit toutes
                                                         les sections d'une fiche
     Translator.attachInteractive(rootEl)             → click/sélection
                                                         pour traduction popup
     Translator.toggleNormLang(normId, normEl)        → switch FR↔EN

   Source de traduction : MyMemory API (gratuit, sans clé API).
   Fallback : Google Translate API publique (no-key).
   Cache : localStorage 'tr_cache_v1' pour éviter re-appels.

   Dépendances : aucune (vanilla JS).
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const CACHE_KEY = 'tr_cache_v1';
    const LANG_KEY = 'tr_norm_lang_v1';     // { normId: 'en' | 'fr' }
    const ORIG_KEY = 'tr_norm_orig_v1';     // sauvegarde HTML FR pour switch

    // ── Cache persistant localStorage ──────────────────────────────
    function _loadCache() {
        try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
        catch (_) { return {}; }
    }
    function _saveCache(c) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); }
        catch (_) { /* quota — ignore */ }
    }
    let _cache = _loadCache();

    function _cacheKey(text, from, to) {
        return from + '|' + to + '|' + text;
    }

    // ── Service de traduction (MyMemory en 1er, Google fallback) ───
    async function _fetchMyMemory(text, from, to) {
        const url = 'https://api.mymemory.translated.net/get'
            + '?q=' + encodeURIComponent(text)
            + '&langpair=' + encodeURIComponent(from + '|' + to);
        const r = await fetch(url);
        if (!r.ok) throw new Error('MyMemory HTTP ' + r.status);
        const data = await r.json();
        const t = data && data.responseData && data.responseData.translatedText;
        if (!t) throw new Error('MyMemory empty');
        // MyMemory renvoie parfois un message d'erreur en texte
        if (/^MYMEMORY WARNING:/.test(t)) throw new Error(t);
        return t;
    }

    async function _fetchGoogle(text, from, to) {
        // Endpoint public non officiel — pas de clé requise
        const url = 'https://translate.googleapis.com/translate_a/single'
            + '?client=gtx&sl=' + from + '&tl=' + to + '&dt=t&q=' + encodeURIComponent(text);
        const r = await fetch(url);
        if (!r.ok) throw new Error('Google HTTP ' + r.status);
        const data = await r.json();
        if (!Array.isArray(data) || !data[0]) throw new Error('Google empty');
        // data[0] = [["traduction1", ...], ["traduction2", ...], ...]
        return data[0].map(seg => seg[0]).join('');
    }

    // ── API publique : translate(text, from, to) ──────────────────
    async function translate(text, from, to) {
        from = from || 'fr';
        to = to || 'en';
        if (!text || !text.trim() || from === to) return text;

        const key = _cacheKey(text, from, to);
        if (_cache[key]) return _cache[key];

        let translated;
        try {
            translated = await _fetchMyMemory(text, from, to);
        } catch (e1) {
            console.warn('[translator] MyMemory échoue, fallback Google:', e1.message);
            try {
                translated = await _fetchGoogle(text, from, to);
            } catch (e2) {
                console.error('[translator] Google échoue aussi:', e2.message);
                throw e2;
            }
        }

        _cache[key] = translated;
        _saveCache(_cache);
        return translated;
    }

    // ── Traduction d'un élément DOM en préservant le HTML ──────────
    // On extrait les TEXT NODES (pas les balises), traduit chacun, remet
    // le texte traduit à sa place. Conserve la mise en forme.
    function _collectTextNodes(root) {
        const nodes = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                // Skip vides
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                // Skip dans <code>, <pre> (code technique)
                const parent = node.parentElement;
                if (parent && (parent.tagName === 'CODE' || parent.tagName === 'PRE')) {
                    return NodeFilter.FILTER_REJECT;
                }
                // Skip dans les popups traduction
                if (parent && parent.closest && parent.closest('.tr-popup')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        let n;
        while ((n = walker.nextNode())) nodes.push(n);
        return nodes;
    }

    async function _translateElement(rootEl, from, to, onProgress) {
        const nodes = _collectTextNodes(rootEl);
        const total = nodes.length;
        let done = 0;

        // Groupe les nodes en lots pour minimiser les appels API.
        // On découpe le texte avec un séparateur unique ; MyMemory accepte
        // jusqu'à ~500 chars de manière fiable. On regroupe par chunk.
        const SEP = '\n@@@@@\n';
        const CHUNK_MAX_CHARS = 450;

        const chunks = [];   // [{ nodes: [...], text: '...' }]
        let curNodes = [], curText = '';
        for (const node of nodes) {
            const txt = node.nodeValue;
            const sep = curText ? SEP : '';
            if ((curText.length + sep.length + txt.length) > CHUNK_MAX_CHARS && curNodes.length > 0) {
                chunks.push({ nodes: curNodes, text: curText });
                curNodes = []; curText = '';
            }
            curNodes.push(node);
            curText += (curText ? SEP : '') + txt;
        }
        if (curNodes.length > 0) chunks.push({ nodes: curNodes, text: curText });

        for (const chunk of chunks) {
            try {
                const translated = await translate(chunk.text, from, to);
                const parts = translated.split(SEP);
                // Si le découpage tient (même nombre), réinjecte segment par segment.
                if (parts.length === chunk.nodes.length) {
                    chunk.nodes.forEach((node, i) => { node.nodeValue = parts[i]; });
                } else {
                    // Sinon, traduit nœud par nœud (fallback plus lent mais sûr)
                    for (const node of chunk.nodes) {
                        try {
                            node.nodeValue = await translate(node.nodeValue, from, to);
                        } catch (_) { /* keep original */ }
                    }
                }
            } catch (e) {
                console.warn('[translator] chunk error:', e.message);
            }
            done += chunk.nodes.length;
            if (typeof onProgress === 'function') onProgress(done, total);
        }
    }

    // ── Popup flottante pour mot/phrase ────────────────────────────
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
        // Cache au clic ailleurs
        document.addEventListener('click', (ev) => {
            if (_popupEl && !_popupEl.contains(ev.target) && !ev.target.closest('.tr-word-trigger')) {
                _hidePopup();
            }
        });
        return p;
    }

    function _showPopup(originalText, x, y, loading) {
        const p = _ensurePopup();
        p.querySelector('.tr-popup-from').textContent = originalText.length > 60
            ? originalText.slice(0, 60) + '…'
            : originalText;
        const body = p.querySelector('.tr-popup-body');
        if (loading) {
            body.innerHTML = '<div class="tr-loading"><span class="tr-spinner"></span> Traduction…</div>';
        }
        p.classList.remove('hidden');
        // Position
        const rect = p.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        let left = x + 10;
        let top = y + 14;
        if (left + rect.width > vw - 16) left = vw - rect.width - 16;
        if (top + rect.height > vh - 16) top = y - rect.height - 14;
        if (top < 16) top = 16;
        if (left < 16) left = 16;
        p.style.left = left + 'px';
        p.style.top = top + 'px';
    }

    function _hidePopup() {
        if (_popupEl) _popupEl.classList.add('hidden');
    }

    function _setPopupContent(html) {
        if (!_popupEl) return;
        const body = _popupEl.querySelector('.tr-popup-body');
        if (body) body.innerHTML = html;
    }

    // Détermine la langue source en fonction de l'état actuel de la norme
    function _detectSourceLang(rootEl) {
        // Cherche le bouton toggle pour savoir dans quelle langue on est
        const toggle = rootEl && rootEl.querySelector
            ? rootEl.querySelector('.tr-toggle-btn')
            : null;
        if (toggle && toggle.dataset.lang === 'en') return 'en';
        return 'fr';
    }

    // ── Click/Selection handler ────────────────────────────────────
    async function _handleWordClick(ev, rootEl) {
        // On évite les boutons, liens, inputs
        const tag = ev.target.tagName;
        if (['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'AUDIO', 'VIDEO'].includes(tag)) return;
        if (ev.target.closest('.tr-popup')) return;
        if (ev.target.closest('.mod-audio')) return;
        if (ev.target.closest('button, a, input, textarea, select')) return;

        // Récupère le texte sélectionné s'il y en a un
        const sel = window.getSelection();
        const selText = sel ? sel.toString().trim() : '';

        let word = '';
        if (selText) {
            word = selText;
        } else {
            // Extrait le mot sous le curseur
            // Approche : prendre le textNode au point cliqué, trouver le mot
            const nodeAndOffset = _caretFromPoint(ev.clientX, ev.clientY);
            if (!nodeAndOffset) return;
            const { node, offset } = nodeAndOffset;
            const text = node.nodeValue || '';
            if (!text) return;
            // Trouve les limites du mot (lettres/chiffres/'-/')
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
            _setPopupContent(`<div class="tr-translated">${escapeHtml(t)}</div>
                <div class="tr-meta">${from.toUpperCase()} → ${to.toUpperCase()}</div>`);
        } catch (e) {
            _setPopupContent(`<div class="tr-error">Échec de la traduction. Connexion internet OK ?</div>`);
        }
    }

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

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function attachInteractive(rootEl) {
        if (!rootEl || rootEl._trAttached) return;
        rootEl.addEventListener('click', (ev) => _handleWordClick(ev, rootEl));
        // Sélection → bouton flottant pour traduire la sélection
        rootEl.addEventListener('mouseup', (ev) => {
            const sel = window.getSelection();
            const text = sel ? sel.toString().trim() : '';
            if (text && text.length > 1 && text.split(/\s+/).length > 1) {
                // Phrase sélectionnée → bouton "Traduire"
                _showSelectionBubble(text, ev.clientX, ev.clientY, rootEl);
            }
        });
        rootEl._trAttached = true;
    }

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
                _setPopupContent(`<div class="tr-translated">${escapeHtml(t)}</div>
                    <div class="tr-meta">${from.toUpperCase()} → ${to.toUpperCase()}</div>`);
            } catch (e) {
                _setPopupContent(`<div class="tr-error">Échec de la traduction.</div>`);
            }
        };
        b.style.left = (x + 8) + 'px';
        b.style.top = (y + 14) + 'px';
        b.classList.remove('hidden');
    }

    // ── Toggle EN/FR sur une fiche de norme ────────────────────────
    function _getLangPref() {
        try { return JSON.parse(localStorage.getItem(LANG_KEY) || '{}'); }
        catch (_) { return {}; }
    }
    function _setLangPref(o) {
        try { localStorage.setItem(LANG_KEY, JSON.stringify(o)); } catch (_) { }
    }
    function _getOrig() {
        try { return JSON.parse(localStorage.getItem(ORIG_KEY) || '{}'); }
        catch (_) { return {}; }
    }
    function _setOrig(o) {
        try { localStorage.setItem(ORIG_KEY, JSON.stringify(o)); } catch (_) { }
    }

    async function toggleNormLang(normId, normEl, btn) {
        if (!normEl) return;
        const langs = _getLangPref();
        const current = langs[normId] || 'fr';
        const next = (current === 'fr') ? 'en' : 'fr';

        if (btn) {
            btn.disabled = true;
            btn.dataset.originalLabel = btn.dataset.originalLabel || btn.textContent;
            btn.textContent = '⏳ Traduction…';
        }

        try {
            if (next === 'en') {
                // Sauvegarde le HTML FR si pas déjà fait (sessionStorage suffit)
                const sectionsToTranslate = normEl.querySelectorAll(
                    '.mod-section-text, .mod-section-title, .mod-hc-title, .rule, .memo-q, .memo-a, .tip, .callout-body'
                );
                let total = sectionsToTranslate.length, done = 0;
                for (const sec of sectionsToTranslate) {
                    // Sauvegarde HTML original
                    if (!sec.dataset.origHtml) sec.dataset.origHtml = sec.innerHTML;
                    await _translateElement(sec, 'fr', 'en', () => { });
                    done++;
                    if (btn) btn.textContent = `⏳ ${done}/${total}`;
                }
                if (btn) {
                    btn.textContent = '🇫🇷 FR';
                    btn.dataset.lang = 'en';
                    btn.title = 'Revenir au français';
                }
            } else {
                // Restaure HTML original
                const sections = normEl.querySelectorAll('[data-orig-html]');
                sections.forEach(sec => {
                    sec.innerHTML = sec.dataset.origHtml;
                });
                if (btn) {
                    btn.textContent = '🇬🇧 EN';
                    btn.dataset.lang = 'fr';
                    btn.title = 'Traduire en anglais';
                }
            }
            langs[normId] = next;
            _setLangPref(langs);
        } catch (e) {
            console.error('[translator] toggleNormLang:', e);
            if (btn) btn.textContent = '❌ Échec';
            setTimeout(() => {
                if (btn) {
                    btn.textContent = (next === 'en') ? '🇬🇧 EN' : '🇫🇷 FR';
                    btn.disabled = false;
                }
            }, 2000);
            return;
        }
        if (btn) btn.disabled = false;
    }

    // ── Init style sheet ───────────────────────────────────────────
    function _injectStyles() {
        if (document.getElementById('tr-styles')) return;
        const css = `
.tr-popup {
    position: fixed;
    z-index: 99999;
    background: linear-gradient(135deg, #0f172a, #1e293b);
    color: #e2e8f0;
    border: 1px solid #475569;
    border-radius: 10px;
    padding: 10px 14px;
    box-shadow: 0 12px 36px rgba(0,0,0,0.45);
    font-size: 13px;
    line-height: 1.5;
    max-width: 340px;
    min-width: 180px;
}
.tr-popup.hidden { display: none; }
.tr-popup-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #33415555;
    padding-bottom: 6px;
    margin-bottom: 8px;
}
.tr-popup-from {
    color: #94a3b8;
    font-size: 11px;
    font-style: italic;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
}
.tr-popup-close {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 18px;
    padding: 0 4px;
    line-height: 1;
}
.tr-popup-close:hover { color: #f87171; }
.tr-translated {
    color: #fff;
    font-weight: 600;
    font-size: 14px;
}
.tr-meta {
    color: #64748b;
    font-size: 10px;
    margin-top: 6px;
    text-transform: uppercase;
    letter-spacing: 1px;
}
.tr-loading {
    color: #94a3b8;
    font-style: italic;
    display: flex;
    align-items: center;
    gap: 8px;
}
.tr-spinner {
    width: 12px; height: 12px;
    border: 2px solid #475569;
    border-top-color: #38bdf8;
    border-radius: 50%;
    animation: tr-spin 0.7s linear infinite;
    display: inline-block;
}
@keyframes tr-spin { to { transform: rotate(360deg); } }
.tr-error { color: #fca5a5; }
.tr-sel-bubble {
    position: fixed;
    z-index: 99998;
}
.tr-sel-bubble.hidden { display: none; }
.tr-sel-btn {
    background: linear-gradient(135deg, #1e3a5f, #1e40af);
    color: #93c5fd;
    border: 1px solid #3b82f6;
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0,0,0,0.35);
}
.tr-sel-btn:hover { background: linear-gradient(135deg, #1e40af, #2563eb); }

.tr-toggle-btn {
    user-select: none;
}
`;
        const s = document.createElement('style');
        s.id = 'tr-styles';
        s.textContent = css;
        document.head.appendChild(s);
    }

    _injectStyles();

    // ── Exposition publique ────────────────────────────────────────
    window.Translator = {
        translate,
        toggleNormLang,
        attachInteractive,
        _hidePopup,
        _cache,
        clearCache() { _cache = {}; localStorage.removeItem(CACHE_KEY); }
    };

})();
