/* ═══════════════════════════════════════════════
   AI Explain — sélectionne un texte, demande à l'IA (Groq)
   - bouton flottant qui apparaît près de la sélection
   - popup en mode CHAT : conversation continue (questions de suivi)
   - ESC ou clic dehors pour fermer
   ═══════════════════════════════════════════════ */

(function () {
    'use strict';

    const MIN_SELECTION = 3;
    const MAX_SELECTION = 4000;
    const MAX_FOLLOWUP = 1000;

    let _btn = null;
    let _popup = null;
    let _lastSelection = '';
    let _isLoading = false;
    let _history = [];   // {role:'user'|'assistant', content:string}

    // ── Styles ────────────────────────────────────────────────────────────

    function _ensureStyles() {
        if (document.getElementById('aiExplainStyles')) return;
        const style = document.createElement('style');
        style.id = 'aiExplainStyles';
        style.textContent = `
.ai-ex-btn {
    position: fixed;
    z-index: 99998;
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    color: white;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 18px;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(76, 70, 229, 0.4);
    transition: transform .12s, box-shadow .12s;
    user-select: none;
    white-space: nowrap;
}
.ai-ex-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(76, 70, 229, 0.55); }
.ai-ex-btn:active { transform: translateY(0); }

.ai-ex-popup {
    position: fixed;
    z-index: 99999;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(680px, 92vw);
    max-height: 85vh;
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #334155;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.ai-ex-popup-header {
    padding: 14px 18px;
    border-bottom: 1px solid #1e293b;
    background: linear-gradient(135deg, rgba(124,58,237,0.18), rgba(79,70,229,0.10));
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
}
.ai-ex-popup-title { font-weight: 700; font-size: 14px; color: #c4b5fd; }
.ai-ex-popup-close {
    background: transparent;
    color: #94a3b8;
    border: none;
    cursor: pointer;
    font-size: 22px;
    line-height: 1;
    padding: 0 4px;
}
.ai-ex-popup-close:hover { color: #f1f5f9; }
.ai-ex-popup-quote {
    margin: 12px 18px 4px;
    padding: 10px 14px;
    background: rgba(255,255,255,0.04);
    border-left: 3px solid #7c3aed;
    border-radius: 4px;
    font-size: 12px;
    color: #94a3b8;
    line-height: 1.6;
    max-height: 90px;
    overflow: auto;
    font-style: italic;
    flex-shrink: 0;
}
.ai-ex-popup-chat {
    padding: 12px 18px;
    overflow-y: auto;
    flex: 1;
    font-size: 14px;
    line-height: 1.7;
    display: flex;
    flex-direction: column;
    gap: 14px;
}
.ai-ex-msg {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.ai-ex-msg-role {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.ai-ex-msg-role-user { color: #93c5fd; }
.ai-ex-msg-role-assistant { color: #c4b5fd; }
.ai-ex-msg-body p { margin: 0 0 8px 0; }
.ai-ex-msg-body p:last-child { margin-bottom: 0; }
.ai-ex-msg-body strong { color: #f1f5f9; }
.ai-ex-msg-body em { color: #c4b5fd; }
.ai-ex-msg-body ul, .ai-ex-msg-body ol { margin: 6px 0 8px 22px; }
.ai-ex-msg-body li { margin: 3px 0; }
.ai-ex-msg-body code { background: #1e293b; padding: 1px 6px; border-radius: 3px; font-size: 12.5px; }
.ai-ex-msg-user .ai-ex-msg-body {
    background: rgba(59, 130, 246, 0.10);
    border-left: 3px solid #3b82f6;
    padding: 8px 12px;
    border-radius: 4px;
}
.ai-ex-loading-row {
    display: flex; align-items: center; gap: 10px;
    color: #94a3b8;
    font-size: 13px;
    font-style: italic;
}
.ai-ex-loading-row::before {
    content: '';
    width: 14px; height: 14px;
    border: 2px solid #334155;
    border-top-color: #7c3aed;
    border-radius: 50%;
    animation: aiExSpin 0.8s linear infinite;
}
@keyframes aiExSpin { to { transform: rotate(360deg); } }
.ai-ex-error { color: #f87171; padding: 8px 12px; background: rgba(248, 113, 113, 0.08); border-radius: 4px; border-left: 3px solid #ef4444; }

.ai-ex-popup-footer {
    padding: 10px 14px 12px;
    border-top: 1px solid #1e293b;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.ai-ex-popup-input-row {
    display: flex;
    gap: 8px;
    align-items: flex-end;
}
.ai-ex-popup-input {
    flex: 1;
    background: #1e293b;
    color: #e2e8f0;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 13px;
    resize: none;
    line-height: 1.5;
    min-height: 36px;
    max-height: 120px;
    outline: none;
    transition: border-color .15s;
    font-family: inherit;
}
.ai-ex-popup-input:focus { border-color: #7c3aed; }
.ai-ex-popup-input:disabled { opacity: 0.5; cursor: not-allowed; }
.ai-ex-popup-send {
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 0 16px;
    height: 36px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    flex-shrink: 0;
}
.ai-ex-popup-send:disabled { opacity: 0.5; cursor: not-allowed; }
.ai-ex-popup-send:not(:disabled):hover { box-shadow: 0 0 0 2px rgba(124,58,237,0.3); }
.ai-ex-popup-hint {
    font-size: 11px;
    color: #64748b;
    text-align: right;
}

/* Light mode */
body.light-mode .ai-ex-popup {
    background: #ffffff;
    color: #1e293b;
    border-color: #e2e8f0;
}
body.light-mode .ai-ex-popup-header {
    border-bottom-color: #e2e8f0;
    background: linear-gradient(135deg, rgba(124,58,237,0.10), rgba(79,70,229,0.06));
}
body.light-mode .ai-ex-popup-title { color: #6d28d9; }
body.light-mode .ai-ex-popup-close { color: #64748b; }
body.light-mode .ai-ex-popup-close:hover { color: #0f172a; }
body.light-mode .ai-ex-popup-quote { background: rgba(0,0,0,0.04); color: #64748b; }
body.light-mode .ai-ex-msg-role-user { color: #2563eb; }
body.light-mode .ai-ex-msg-role-assistant { color: #6d28d9; }
body.light-mode .ai-ex-msg-body strong { color: #0f172a; }
body.light-mode .ai-ex-msg-body em { color: #6d28d9; }
body.light-mode .ai-ex-msg-body code { background: #f1f5f9; }
body.light-mode .ai-ex-msg-user .ai-ex-msg-body { background: rgba(59,130,246,0.08); }
body.light-mode .ai-ex-popup-footer { border-top-color: #e2e8f0; }
body.light-mode .ai-ex-popup-input { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
body.light-mode .ai-ex-popup-input:focus { border-color: #7c3aed; }
        `;
        document.head.appendChild(style);
    }

    // ── Selection detection ──────────────────────────────────────────────

    function _getCurrentSelection() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        const text = sel.toString().trim();
        if (text.length < MIN_SELECTION || text.length > MAX_SELECTION) return null;
        const range = sel.getRangeAt(0);
        const startNode = range.startContainer;
        const el = startNode.nodeType === 3 ? startNode.parentElement : startNode;
        if (el && (el.closest('input') || el.closest('textarea'))) return null;
        if (el && el.closest('.ai-ex-popup')) return null;
        const rect = range.getBoundingClientRect();
        return { text, rect };
    }

    function _hideButton() {
        if (_btn) _btn.style.display = 'none';
    }

    function _showButton(rect, text) {
        _ensureStyles();
        if (!_btn) {
            _btn = document.createElement('button');
            _btn.className = 'ai-ex-btn';
            _btn.innerHTML = '🤖 Demander à IA';
            _btn.addEventListener('mousedown', (e) => e.preventDefault());
            _btn.addEventListener('click', () => {
                if (_isLoading) return;
                _startConversation(_lastSelection);
            });
            document.body.appendChild(_btn);
        }
        _lastSelection = text;
        const top = rect.top - 38;
        const left = Math.min(rect.left + rect.width / 2 - 70, window.innerWidth - 160);
        _btn.style.top = (top > 12 ? top : rect.bottom + 8) + 'px';
        _btn.style.left = Math.max(8, left) + 'px';
        _btn.style.display = 'inline-flex';
    }

    // ── Popup ─────────────────────────────────────────────────────────────

    function _ensurePopup() {
        if (_popup) return _popup;
        _ensureStyles();
        _popup = document.createElement('div');
        _popup.className = 'ai-ex-popup';
        _popup.innerHTML = `
            <div class="ai-ex-popup-header">
                <div class="ai-ex-popup-title">🤖 IA — conversation</div>
                <button class="ai-ex-popup-close" aria-label="Fermer">×</button>
            </div>
            <div class="ai-ex-popup-quote" id="aiExPopupQuote"></div>
            <div class="ai-ex-popup-chat" id="aiExPopupChat"></div>
            <div class="ai-ex-popup-footer">
                <div class="ai-ex-popup-input-row">
                    <textarea class="ai-ex-popup-input" id="aiExPopupInput" rows="1"
                        placeholder="Pose une question de suivi… (Entrée pour envoyer, Maj+Entrée pour ligne)"></textarea>
                    <button class="ai-ex-popup-send" id="aiExPopupSend">Envoyer</button>
                </div>
                <div class="ai-ex-popup-hint">ESC pour fermer · L'historique est conservé pendant la conversation</div>
            </div>
        `;
        _popup.querySelector('.ai-ex-popup-close').addEventListener('click', _closePopup);
        const input = _popup.querySelector('#aiExPopupInput');
        const sendBtn = _popup.querySelector('#aiExPopupSend');
        input.addEventListener('input', () => {
            // Auto-resize
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                _sendFollowup();
            }
        });
        sendBtn.addEventListener('click', _sendFollowup);
        document.body.appendChild(_popup);
        return _popup;
    }

    function _closePopup() {
        if (_popup) _popup.style.display = 'none';
        _isLoading = false;
        _history = [];
    }

    // Mini markdown renderer : **bold**, *italic*, `code`, listes -, paragraphes.
    function _renderMarkdown(md) {
        if (!md) return '';
        let s = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
        const lines = s.split('\n');
        let out = [];
        let inList = false;
        for (const line of lines) {
            const m = line.match(/^\s*[-•]\s+(.+)$/);
            if (m) {
                if (!inList) { out.push('<ul>'); inList = true; }
                out.push('<li>' + m[1] + '</li>');
            } else {
                if (inList) { out.push('</ul>'); inList = false; }
                if (line.trim() === '') {
                    out.push('');
                } else {
                    out.push('<p>' + line + '</p>');
                }
            }
        }
        if (inList) out.push('</ul>');
        return out.join('\n');
    }

    function _escapeHtmlSafe(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ── Render chat history ──────────────────────────────────────────────

    function _renderChat() {
        const chat = _popup.querySelector('#aiExPopupChat');
        chat.innerHTML = '';
        _history.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'ai-ex-msg ' + (msg.role === 'user' ? 'ai-ex-msg-user' : 'ai-ex-msg-assistant');
            const roleLabel = msg.role === 'user' ? 'Toi' : 'IA';
            div.innerHTML = `
                <div class="ai-ex-msg-role ai-ex-msg-role-${msg.role}">${roleLabel}</div>
                <div class="ai-ex-msg-body">${_renderMarkdown(msg.content)}</div>
            `;
            chat.appendChild(div);
        });
    }

    function _appendLoadingRow() {
        const chat = _popup.querySelector('#aiExPopupChat');
        const div = document.createElement('div');
        div.className = 'ai-ex-loading-row';
        div.id = 'aiExLoadingRow';
        div.textContent = "L'IA réfléchit…";
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
    }

    function _removeLoadingRow() {
        const r = _popup && _popup.querySelector('#aiExLoadingRow');
        if (r) r.remove();
    }

    function _appendError(msg) {
        const chat = _popup.querySelector('#aiExPopupChat');
        const div = document.createElement('div');
        div.className = 'ai-ex-error';
        div.textContent = '⚠️ ' + msg;
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
    }

    function _setLoading(yes) {
        _isLoading = yes;
        const input = _popup.querySelector('#aiExPopupInput');
        const sendBtn = _popup.querySelector('#aiExPopupSend');
        input.disabled = yes;
        sendBtn.disabled = yes;
        if (!yes) input.focus();
    }

    function _scrollChatToBottom() {
        const chat = _popup.querySelector('#aiExPopupChat');
        if (chat) chat.scrollTop = chat.scrollHeight;
    }

    // ── Conversation flow ────────────────────────────────────────────────

    function _currentContext() {
        try {
            if (typeof currentTab === 'string') {
                const map = {
                    modules: 'page Modules (leçon ou norme du diplôme suisse d\'expert-comptable)',
                    qcm: 'onglet QCM (question d\'examen)',
                    fcdb: 'BDD Flashcards',
                    trainer: 'Entraînement flashcards',
                    fs: 'États financiers',
                    references: 'Références',
                    audit: 'Module Audit',
                    english: 'Module Anglais',
                };
                return map[currentTab] || null;
            }
        } catch (_) { /* noop */ }
        return null;
    }

    async function _startConversation(selectedText) {
        _hideButton();
        _ensurePopup();
        _popup.style.display = 'flex';
        _history = [];

        // Show selected text quote
        const quote = _popup.querySelector('#aiExPopupQuote');
        const truncated = selectedText.length > 280 ? selectedText.slice(0, 280) + '…' : selectedText;
        quote.textContent = '« ' + truncated + ' »';

        // First user message (registered for follow-up history but not displayed in chat —
        // the quote already shows what was selected).
        const firstUserPrompt = `Texte sélectionné :\n\`\`\`\n${selectedText}\n\`\`\`\n\nExplique-moi ça.`;
        _history.push({ role: 'user', content: firstUserPrompt });

        _renderChat();
        _appendLoadingRow();
        _setLoading(true);

        try {
            const res = await api('explain_text', selectedText, _currentContext());
            _removeLoadingRow();
            _setLoading(false);
            if (!res || res.error) {
                _appendError(res && res.error ? res.error : 'Erreur inconnue');
                return;
            }
            _history.push({ role: 'assistant', content: res.explanation || '' });
            _renderChat();
            _scrollChatToBottom();
            const input = _popup.querySelector('#aiExPopupInput');
            input.focus();
        } catch (e) {
            _removeLoadingRow();
            _setLoading(false);
            _appendError(String(e));
        }
    }

    async function _sendFollowup() {
        if (_isLoading) return;
        const input = _popup.querySelector('#aiExPopupInput');
        const text = (input.value || '').trim();
        if (!text) return;
        if (text.length > MAX_FOLLOWUP) {
            _appendError(`Question trop longue (max ${MAX_FOLLOWUP} caractères).`);
            return;
        }
        input.value = '';
        input.style.height = 'auto';

        _history.push({ role: 'user', content: text });
        _renderChat();
        _scrollChatToBottom();
        _appendLoadingRow();
        _setLoading(true);

        try {
            const res = await api('chat_explain', _history);
            _removeLoadingRow();
            _setLoading(false);
            if (!res || res.error) {
                _appendError(res && res.error ? res.error : 'Erreur inconnue');
                return;
            }
            _history.push({ role: 'assistant', content: res.reply || '' });
            _renderChat();
            _scrollChatToBottom();
            input.focus();
        } catch (e) {
            _removeLoadingRow();
            _setLoading(false);
            _appendError(String(e));
        }
    }

    // ── Listeners globaux ────────────────────────────────────────────────

    function _onSelectionChange() {
        const sel = _getCurrentSelection();
        if (!sel) {
            _hideButton();
            return;
        }
        _showButton(sel.rect, sel.text);
    }

    document.addEventListener('mouseup', () => {
        setTimeout(_onSelectionChange, 30);
    });
    document.addEventListener('keyup', (e) => {
        if (e.shiftKey || e.key === 'Shift' || e.key === 'a' || e.key === 'A') {
            setTimeout(_onSelectionChange, 30);
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (_btn && _btn.contains(e.target)) return;
        if (_popup && _popup.contains(e.target)) return;
        const sel = window.getSelection();
        if (!sel || sel.toString().trim().length === 0) {
            _hideButton();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (_popup && _popup.style.display === 'flex') {
                _closePopup();
            } else if (_btn && _btn.style.display !== 'none') {
                _hideButton();
            }
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (!_popup || _popup.style.display !== 'flex') return;
        if (_popup.contains(e.target)) return;
        if (_isLoading) return;
        _closePopup();
    });

    _ensureStyles();
})();
