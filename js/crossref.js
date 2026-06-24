/* ═══════════════════════════════════════════════
   Cross-Reference System
   ═══════════════════════════════════════════════ */

// Pattern to detect norm references in text
const NORM_PATTERNS = [
    /\b(RPC\s*\d+(?:\/\d+)?)\b/gi,
    /\b(IAS\s*\d+)\b/gi,
    /\b(IFRS\s*\d+)\b/gi,
    /\b(ISA\s*\d+)\b/gi,
    /\b(art\.?\s*\d+(?:\s*(?:al\.?\s*\d+)?)?(?:\s*CO)?)\b/gi,
    /\b(art\.?\s*\d+\s*LIFD)\b/gi,
    /\b(art\.?\s*\d+\s*LTVA)\b/gi,
    /\b(art\.?\s*\d+\s*LFus)\b/gi,
];

// Parse text and wrap norm references with cross-ref spans.
// XSS-safe: escape first, then build span with an HTML-escaped data-label
// (no user data is ever injected into an onclick= string).
function addCrossRefs(text) {
    if (!text) return '';
    let html = escapeHtml(text);

    for (const pattern of NORM_PATTERNS) {
        html = html.replace(pattern, (match) => {
            const normId = normalizeNormId(match);
            // Both normId and match are HTML-escaped before being placed in attributes.
            return '<span class="cross-ref" tabindex="0" role="button"'
                 + ' data-norm="' + escapeHtml(normId) + '"'
                 + ' data-label="' + escapeHtml(match) + '">'
                 + match
                 + '</span>';
        });
    }

    return html;
}

function normalizeNormId(ref) {
    return ref.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/art\.?/g, 'art')
        .replace(/al\.?/g, 'al');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}

// Event delegation: one global listener handles every .cross-ref click,
// including spans inserted by future innerHTML updates.
document.addEventListener('click', (e) => {
    const span = e.target.closest && e.target.closest('.cross-ref');
    if (!span) return;
    const normId = span.dataset.norm || '';
    const label = span.dataset.label || span.textContent || '';
    showCrossRefPopover(e, normId, label);
});
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const span = e.target.closest && e.target.closest('.cross-ref');
    if (!span) return;
    e.preventDefault();
    const normId = span.dataset.norm || '';
    const label = span.dataset.label || span.textContent || '';
    showCrossRefPopover(e, normId, label);
});

// Format answer text with cross-refs, bold, colors, and line breaks
function _formatLine(line) {
    let html = addCrossRefs(line);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (html.includes('⚠️')) html = `<span style="color:#f59e0b">${html}</span>`;
    if (html.includes('💡')) html = `<span style="color:#22c55e">${html}</span>`;
    if (/^[①②③④⑤⑥⑦⑧⑨⑩🅰🅱🅲]/.test(html.trim())) html = `<span style="color:#60a5fa">${html}</span>`;
    return html;
}

// Short single-line variant: HTML-escape + cross-refs + **bold**, no <br>/tables/code.
// Use for flashcard questions and compact list items where a full formatAnswer() would
// be overkill. XSS-safe because addCrossRefs() escapes HTML first.
function formatInline(text) {
    if (!text) return '';
    return addCrossRefs(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function _renderPipeTable(lines) {
    // lines = array of raw strings that look like | col | col |
    const rows = lines.filter(l => !l.match(/^\s*\|[-: |]+\|\s*$/)); // strip separator lines
    if (rows.length === 0) return '';
    const isHeader = (i) => i === 0;
    let html = '<div class="cr-table-wrap"><table class="cr-table">';
    rows.forEach((row, ri) => {
        const cells = row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|');
        const tag = isHeader(ri) ? 'th' : 'td';
        html += '<tr>' + cells.map(c => `<${tag}>${_formatLine(c.trim())}</${tag}>`).join('') + '</tr>';
    });
    html += '</table></div>';
    return html;
}

// Markers for list detection (line-start only → conservative, never touches prose).
// Unicode bullets allow no space; dash/star bullets REQUIRE a trailing space so
// "**bold**" (star not followed by space) is never mistaken for a bullet.
const _RX_UBULLET = /^\s*[•‣◦▪·]\s*(.+)$/;
const _RX_DBULLET = /^\s*[-–]\s+(.+)$/;
const _RX_STAR    = /^\s*\*\s+(.+)$/;
const _RX_NUM     = /^\s*(\d{1,2})[.)]\s+(.+)$/;
const _isBullet = (l) => _RX_UBULLET.test(l) || _RX_DBULLET.test(l) || _RX_STAR.test(l);
const _bulletText = (l) => (l.match(_RX_UBULLET) || l.match(_RX_DBULLET) || l.match(_RX_STAR))[1];

function _formatLines(text) {
    const lines = text.split('\n');
    let result = '';
    let i = 0;
    const endsBlock = () => /(?:<\/ul>|<\/ol>|<\/table>|<\/div>|<br>)$/.test(result);
    while (i < lines.length) {
        const line = lines[i];
        // Detect pipe-table block: 2+ consecutive lines starting with |
        if (line.trim().startsWith('|')) {
            let tableLines = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                tableLines.push(lines[i]);
                i++;
            }
            result += _renderPipeTable(tableLines);
            continue;
        }
        // Bullet list (• ‣ ◦ ▪ · or "- "/"– "/"* ") → real <ul>
        if (_isBullet(line)) {
            let items = [];
            while (i < lines.length && _isBullet(lines[i])) {
                items.push(`<li>${_formatLine(_bulletText(lines[i]).trim())}</li>`);
                i++;
            }
            result += `<ul class="cr-list">${items.join('')}</ul>`;
            continue;
        }
        // Numbered list ("1." / "1)" …) → real <ol>
        if (_RX_NUM.test(line)) {
            let items = [];
            while (i < lines.length && _RX_NUM.test(lines[i])) {
                items.push(`<li>${_formatLine(lines[i].match(_RX_NUM)[2].trim())}</li>`);
                i++;
            }
            result += `<ol class="cr-olist">${items.join('')}</ol>`;
            continue;
        }
        // Skip blank lines that would only add empty space after text/blocks
        if (line.trim() === '' && endsBlock()) { i++; continue; }
        result += _formatLine(line) + '<br>';
        i++;
    }
    return result.replace(/<br>$/, '');
}

function formatAnswer(text) {
    if (!text) return '';
    // Handle ``` code blocks → <pre> for monospace/ASCII tables
    if (text.includes('```')) {
        const parts = text.split('```');
        return parts.map((part, i) => {
            if (i % 2 === 1) {
                let content = part;
                const firstNL = content.indexOf('\n');
                if (firstNL !== -1) {
                    const hint = content.substring(0, firstNL).trim();
                    if (!hint || /^[a-z]*$/.test(hint)) content = content.substring(firstNL + 1);
                }
                content = content.trim()
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return `<pre style="background:#0f172a;border:1px solid #1e3a5f;border-radius:6px;padding:10px 14px;font-family:'Courier New',Consolas,monospace;font-size:11.5px;overflow-x:auto;line-height:1.55;margin:6px 0;color:#94a3b8;white-space:pre">${content}</pre>`;
            }
            return _formatLines(part);
        }).join('');
    }
    return _formatLines(text);
}

// Show popover with links to related content
let activePopover = null;

function showCrossRefPopover(event, normId, label) {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    closeCrossRefPopover();

    const target = (event && event.target) || event.currentTarget;
    const rect = target && target.getBoundingClientRect
        ? target.getBoundingClientRect()
        : { left: 20, bottom: 20 };

    const popover = document.createElement('div');
    popover.className = 'cross-ref-popover';
    popover.setAttribute('role', 'menu');

    // Title — textContent so user data cannot break out
    const title = document.createElement('div');
    title.className = 'popover-title';
    title.textContent = label;
    popover.appendChild(title);

    const actions = [
        { icon: '🃏', text: ' Flashcards liées', fn: navigateToFlashcards },
        { icon: '📘', text: ' Voir le mémo',     fn: navigateToMemo },
        { icon: '📚', text: ' Voir le cours',    fn: navigateToCourse },
        { icon: '📖', text: ' Fichiers liés',    fn: navigateToFiles },
    ];
    for (const a of actions) {
        const link = document.createElement('a');
        link.href = '#';
        link.setAttribute('role', 'menuitem');
        link.textContent = a.icon + a.text;
        link.addEventListener('click', (ev) => {
            ev.preventDefault();
            closeCrossRefPopover();
            try { a.fn(normId); } catch (_) {}
        });
        popover.appendChild(link);
    }

    popover.style.position = 'fixed';
    popover.style.left = Math.min(rect.left, window.innerWidth - 300) + 'px';
    popover.style.top = (rect.bottom + 4) + 'px';

    document.body.appendChild(popover);
    activePopover = popover;

    setTimeout(() => {
        document.addEventListener('click', closeCrossRefPopover, { once: true });
    }, 10);
}

function closeCrossRefPopover() {
    if (activePopover) {
        activePopover.remove();
        activePopover = null;
    }
}

// Navigation helpers for cross-refs
function navigateToFlashcards(normId) {
    // Try to match the norm to a subcategory
    const sub = normId.replace(/rpc(\d+)/, 'RPC $1')
                       .replace(/ias(\d+)/, 'IAS $1')
                       .replace(/ifrs(\d+)/, 'IFRS $1')
                       .replace(/isa(\d+)/, 'ISA $1');
    navigate('flashcards');
    // Set filter after render
    setTimeout(() => {
        const searchInput = document.getElementById('fcSearch');
        if (searchInput) {
            searchInput.value = sub;
            searchInput.dispatchEvent(new Event('input'));
        }
    }, 300);
}

function navigateToMemo(normId) {
    if (normId.startsWith('rpc') || normId.startsWith('art')) {
        navigate('references', 'memos');
    } else if (normId.startsWith('ias') || normId.startsWith('ifrs')) {
        navigate('references', 'memos');
    } else {
        navigate('references', 'memos');
    }
}

function navigateToCourse(normId) {
    if (normId.startsWith('rpc')) {
        navigate('references', 'courses');
    } else {
        navigate('references', 'courses');
    }
}

function navigateToFiles(normId) {
    navigate('files');
}
