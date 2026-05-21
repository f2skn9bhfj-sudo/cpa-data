/* ═══════════════════════════════════════════════
   Mindmap overlay — pilot RPC 1
   Markmap.js (CDN) rendered fullscreen over the app.
   ─────────────────────────────────────────────────
   Public API:
     modOpenMindmap(normCodeOrId)   open the overlay
     modCloseMindmap()              close it
     mmFit()                        recenter the SVG
   ═══════════════════════════════════════════════ */

let _mmInstance = null;
let _mmLoadPromise = null;
let _mmStylesInjected = false;

// ── Entry ────────────────────────────────────────────────

async function modOpenMindmap(itemIdOrCode) {
    if (!Array.isArray(modData) || modData.length === 0) {
        alert('Modules non chargés. Ouvre d\'abord l\'onglet Modules.');
        return;
    }

    // Auto-detect kind: search norms first, then lessons_ifp
    let item = null, kind = null, module = null;
    for (const m of modData) {
        for (const n of (m.norms || [])) {
            if (n.id === itemIdOrCode || n.code === itemIdOrCode) {
                item = n; kind = 'norm'; module = m; break;
            }
        }
        if (!item) {
            for (const l of (m.lessons_ifp || [])) {
                if (l.id === itemIdOrCode || l.code === itemIdOrCode) {
                    item = l; kind = 'lesson_ifp'; module = m; break;
                }
            }
        }
        if (item) break;
    }
    if (!item) {
        alert('Élément introuvable : ' + itemIdOrCode);
        return;
    }

    _mmInjectStyles();

    const headerLabel = kind === 'lesson_ifp'
        ? `${module.code} — ${item.title || item.code}`
        : (item.title || item.code);

    const overlay = document.createElement('div');
    overlay.className = 'mm-overlay';
    overlay.id = 'mmOverlay';
    overlay.innerHTML = `
        <div class="mm-topbar">
            <div class="mm-title">
                <span class="mm-icon" aria-hidden="true">🧠</span>
                <span class="mm-title-text">${_mmEsc(headerLabel)}</span>
            </div>
            <div class="mm-actions">
                <button class="mm-btn" onclick="mmFit()" title="Recentrer (touche R)">⊕ Recentrer</button>
                <button class="mm-btn mm-btn-close" onclick="modCloseMindmap()" title="Fermer (Échap)" aria-label="Fermer">✕</button>
            </div>
        </div>
        <div class="mm-canvas" id="mmCanvas">
            <div class="mm-loading" id="mmLoading">
                <div class="mm-spinner" aria-hidden="true"></div>
                <div>Chargement de la mindmap…</div>
            </div>
            <svg id="mmSvg" class="mm-svg" style="display:none"></svg>
        </div>
        <div class="mm-help">
            Molette = zoom · Glisser = déplacer · Clic sur un nœud = replier/déplier · Échap = fermer
        </div>
    `;
    document.body.appendChild(overlay);
    document.addEventListener('keydown', _mmKey);

    try {
        await _mmEnsureLoaded();
        const ns = window.markmap;
        if (!ns || !ns.Markmap || !ns.Transformer) {
            throw new Error('Markmap n\'est pas disponible (window.markmap manquant). Connexion internet ?');
        }
        const markdown = _mmBuildMarkdown(item, kind);
        const transformer = new ns.Transformer();
        const { root } = transformer.transform(markdown);

        const loading = document.getElementById('mmLoading');
        const svg = document.getElementById('mmSvg');
        if (loading) loading.remove();
        if (svg) svg.style.display = 'block';

        _mmInstance = ns.Markmap.create('#mmSvg', {
            duration: 350,
            maxWidth: 320,
            paddingX: 20,
            spacingHorizontal: 90,
            spacingVertical: 14,
            color: (node) => _mmColorForDepth(node.state ? node.state.depth : 0),
        }, root);
        setTimeout(() => { try { _mmInstance && _mmInstance.fit(); } catch (e) {} }, 200);
    } catch (err) {
        console.error('Mindmap error:', err);
        const canvas = document.getElementById('mmCanvas');
        if (canvas) canvas.innerHTML = `
            <div class="mm-error">
                <div style="font-size:36px;margin-bottom:8px">⚠️</div>
                <div style="font-weight:600;margin-bottom:6px">Impossible de charger la mindmap</div>
                <div style="font-size:13px;opacity:.8">${_mmEsc(String(err && err.message || err))}</div>
                <div style="font-size:12px;opacity:.55;margin-top:14px">Vérifie ta connexion internet (Markmap se charge depuis CDN au premier ouvrage).</div>
            </div>`;
    }
}

function mmFit() {
    try { _mmInstance && _mmInstance.fit(); } catch (e) {}
}

function modCloseMindmap() {
    const overlay = document.getElementById('mmOverlay');
    if (overlay) overlay.remove();
    document.removeEventListener('keydown', _mmKey);
    _mmInstance = null;
}

function _mmKey(e) {
    if (e.key === 'Escape') {
        modCloseMindmap();
    } else if (e.key === 'r' || e.key === 'R') {
        if (!/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) {
            mmFit();
        }
    }
}

// ── Script loader (lazy, cached) ─────────────────────────

function _mmEnsureLoaded() {
    if (window.markmap && window.markmap.Markmap && window.markmap.Transformer) return Promise.resolve();
    if (_mmLoadPromise) return _mmLoadPromise;
    _mmLoadPromise = (async () => {
        await _mmLoadScript('https://cdn.jsdelivr.net/npm/d3@7');
        await _mmLoadScript('https://cdn.jsdelivr.net/npm/markmap-view');
        await _mmLoadScript('https://cdn.jsdelivr.net/npm/markmap-lib/dist/browser/index.js');
    })().catch(err => { _mmLoadPromise = null; throw err; });
    return _mmLoadPromise;
}

function _mmLoadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[data-mm-src="${src}"]`);
        if (existing) {
            if (existing.dataset.loaded === 'true') return resolve();
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Script load failed: ' + src)));
            return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.dataset.mmSrc = src;
        s.onload = () => { s.dataset.loaded = 'true'; resolve(); };
        s.onerror = () => reject(new Error('Script load failed: ' + src));
        document.head.appendChild(s);
    });
}

// ── Markdown builders (dispatch by kind) ─────────────────
// Priority order:
//   1. Hand-crafted mindmap stored in the item itself (`mindmap_md` field)
//   2. Kind-specific generic builder for items without hand-craft

function _mmBuildMarkdown(item, kind) {
    if (item && typeof item.mindmap_md === 'string' && item.mindmap_md.trim().length > 0) {
        return item.mindmap_md;
    }
    if (kind === 'lesson_ifp') return _mmBuildLessonIfp(item);
    return _mmBuildGenericNorm(item);
}

function _mmBuildGenericNorm(n) {
    const lines = [];
    const code = n.code || 'Norme';
    const title = (n.title || code).replace(new RegExp('^' + _mmEscRe(code) + '\\s*[—-]\\s*', 'i'), '');
    lines.push(`# ${code}`);
    if (title && title !== code) lines.push(`## ${title}`);

    if (n.summary) {
        const first = String(n.summary).split('.').slice(0, 2).join('.').trim() + '.';
        lines.push('### Résumé');
        lines.push(`- ${_mmCompact(first, 140)}`);
    }
    if (n.sections && n.sections.length > 0) {
        lines.push(`### Plan (${n.sections.length} sections)`);
        for (const s of n.sections) {
            if (s && s.title) lines.push(`- ${_mmCompact(s.title, 80)}`);
        }
    }
    if (n.key_rules && n.key_rules.length > 0) {
        lines.push('### Règles essentielles');
        for (const r of n.key_rules) lines.push(`- ${_mmCompact(r, 100)}`);
    }
    if (n.mnemonics) {
        const ms = Array.isArray(n.mnemonics) ? n.mnemonics : String(n.mnemonics).split('\n');
        lines.push('### Mnémoniques');
        for (const line of ms) {
            const t = String(line).trim();
            if (t) lines.push(`- ${_mmCompact(t, 100)}`);
        }
    }
    if (n.exam_tips && n.exam_tips.length > 0) {
        lines.push('### Pièges examen');
        for (const t of n.exam_tips) lines.push(`- ${_mmCompact(t, 100)}`);
    }
    if (n.key_differences && typeof n.key_differences === 'object' && !Array.isArray(n.key_differences)) {
        lines.push('### Vs autres référentiels');
        if (n.key_differences.ifrs) { lines.push('#### IFRS'); lines.push(`- ${_mmCompact(n.key_differences.ifrs, 120)}`); }
        if (n.key_differences.rpc)  { lines.push('#### RPC');  lines.push(`- ${_mmCompact(n.key_differences.rpc,  120)}`); }
        if (n.key_differences.co)   { lines.push('#### CO');   lines.push(`- ${_mmCompact(n.key_differences.co,   120)}`); }
    }
    if (n.cross_refs && n.cross_refs.length > 0) {
        lines.push('### Normes liées');
        for (const ref of n.cross_refs) lines.push(`- ${ref}`);
    }
    return lines.join('\n');
}

// Builder for lessons IFP — exploits the callout-rich section structure
// (key_point, example, warning, tip, legal_quote, comparison, info).
// Strategy: do NOT dump bodies. Build branches that aggregate the high-
// value callouts across sections, keeping the mindmap scannable.
function _mmBuildLessonIfp(l) {
    const lines = [];
    const code = l.code || 'Leçon';
    const cleanTitle = String(l.title || code)
        .replace(/^L\d+\s*[—-]\s*/, '')
        .replace(/^\d+\.\s*/, '');
    lines.push(`# ${code}`);
    lines.push(`## ${_mmCompact(cleanTitle, 90)}`);

    // Pertinence examen (compact metadata branch)
    if (l.exam_relevance) {
        lines.push('### Pertinence examen');
        lines.push(`- ${l.exam_relevance}`);
    }

    // Topics — high-level overview
    if (Array.isArray(l.topics) && l.topics.length > 0) {
        lines.push('### Sujets couverts');
        for (const t of l.topics) {
            // topics can be {t, subtopics} or plain strings
            const label = (t && typeof t === 'object') ? t.t : String(t);
            if (label) lines.push(`- ${_mmCompact(label, 90)}`);
        }
    }

    // Plan — section titles (no body, just structure)
    const sections = Array.isArray(l.content) ? l.content.filter(s => s && typeof s === 'object' && s.title) : [];
    if (sections.length > 0) {
        lines.push(`### Plan (${sections.length} sections)`);
        for (const s of sections) {
            const t = String(s.title).replace(/^\d+(\.\d+)*\.\s*/, '');
            lines.push(`- ${_mmCompact(t, 80)}`);
        }
    }

    // Aggregate callouts across sections — one branch per callout type.
    // Each leaf is prefixed with the section number to keep context.
    const calloutBranches = [
        { field: 'key_point',   heading: '🎯 Points clés',       icon: '' },
        { field: 'example',     heading: '🟢 Exemples concrets', icon: '' },
        { field: 'warning',     heading: '⚠️ Pièges & attention', icon: '' },
        { field: 'tip',         heading: '🧠 Astuces mémo',      icon: '' },
        { field: 'legal_quote', heading: '⚖️ Textes légaux',     icon: '' },
        { field: 'comparison',  heading: '📊 Comparaisons',      icon: '' },
        { field: 'info',        heading: '💡 Pour info',         icon: '' },
    ];
    for (const cb of calloutBranches) {
        const items = [];
        sections.forEach((s, i) => {
            if (s[cb.field]) {
                const secLabel = `s${i + 1}`;
                items.push(`- **${secLabel}** ${_mmCompact(s[cb.field], 130)}`);
            }
        });
        if (items.length > 0) {
            lines.push(`### ${cb.heading} (${items.length})`);
            for (const it of items) lines.push(it);
        }
    }

    // Cross-refs
    if (Array.isArray(l.cross_refs) && l.cross_refs.length > 0) {
        lines.push('### 🔗 Leçons & normes liées');
        for (const ref of l.cross_refs) lines.push(`- ${ref}`);
    }

    // Flashcard tags — useful for revision routing
    if (Array.isArray(l.flashcard_tags) && l.flashcard_tags.length > 0) {
        lines.push('### 🃏 Tags flashcards');
        for (const tag of l.flashcard_tags) lines.push(`- ${tag}`);
    }

    // QCM count (just a metadata leaf — actual QCMs accessed via the dedicated panel)
    if (Array.isArray(l.questions) && l.questions.length > 0) {
        lines.push('### 📝 QCMs disponibles');
        lines.push(`- ${l.questions.length} questions sur cette leçon`);
    }

    return lines.join('\n');
}

function _mmCompact(s, maxLen) {
    let str = String(s)
        .replace(/^[⚠️💡🎯📌🔗📊🃏📚]+\s*/u, '')
        .replace(/PIÈGE\s*N°?\s*\d+\s*:\s*/i, '')
        .replace(/\*\*/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (str.length > maxLen) {
        str = str.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
    }
    return str;
}

function _mmColorForDepth(d) {
    const palette = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#06b6d4', '#eab308'];
    return palette[(d || 0) % palette.length];
}

function _mmEsc(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

function _mmEscRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── Styles (injected once on first open) ─────────────────

function _mmInjectStyles() {
    if (_mmStylesInjected) return;
    _mmStylesInjected = true;
    const style = document.createElement('style');
    style.id = 'mm-styles';
    style.textContent = `
.mm-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(8, 12, 22, 0.96);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    display: flex; flex-direction: column;
    animation: mm-fade-in .18s ease;
}
@keyframes mm-fade-in { from { opacity: 0; } to { opacity: 1; } }
.mm-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 22px; flex-shrink: 0;
    background: linear-gradient(180deg, rgba(15,23,42,.85), rgba(15,23,42,.6));
    border-bottom: 1px solid rgba(255,255,255,.08);
    color: #e2e8f0;
}
.mm-title { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; min-width: 0; }
.mm-title-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mm-icon { font-size: 19px; flex-shrink: 0; }
.mm-actions { display: flex; gap: 8px; flex-shrink: 0; margin-left: 16px; }
.mm-btn {
    padding: 7px 14px; border-radius: 8px;
    background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
    color: #cbd5e1; cursor: pointer; font-size: 13px; font-weight: 500;
    transition: background .15s, color .15s, border-color .15s;
}
.mm-btn:hover { background: rgba(255,255,255,.12); color: #fff; border-color: rgba(255,255,255,.18); }
.mm-btn-close { color: #fca5a5; font-weight: 700; padding: 7px 12px; }
.mm-btn-close:hover { background: rgba(239,68,68,.22); color: #fff; border-color: rgba(239,68,68,.35); }
.mm-canvas {
    flex: 1; position: relative; overflow: hidden;
    background: radial-gradient(ellipse at center, #0f172a 0%, #050810 100%);
}
.mm-svg { width: 100%; height: 100%; display: block; }
.mm-svg .markmap-node > circle { stroke-width: 1.5px; }
.mm-svg .markmap-foreign { color: #e2e8f0; font-size: 14px; line-height: 1.45; }
.mm-svg .markmap-foreign strong { color: #fff; font-weight: 700; }
.mm-svg .markmap-foreign code {
    background: rgba(255,255,255,.08); padding: 1px 5px; border-radius: 4px;
    font-size: 12.5px; color: #f9fafb;
}
.mm-svg .markmap-link { stroke-opacity: .55; }
.mm-loading {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 14px;
    color: #94a3b8; font-size: 14px;
}
.mm-spinner {
    width: 32px; height: 32px; border-radius: 50%;
    border: 3px solid rgba(148,163,184,.18);
    border-top-color: #8b5cf6;
    animation: mm-spin .9s linear infinite;
}
@keyframes mm-spin { to { transform: rotate(360deg); } }
.mm-error {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 40px;
    text-align: center; color: #fca5a5;
}
.mm-help {
    position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%);
    color: #64748b; font-size: 12px; padding: 6px 14px;
    background: rgba(15,23,42,.7); border-radius: 20px;
    border: 1px solid rgba(255,255,255,.05); pointer-events: none;
    white-space: nowrap;
}

/* Light-mode adjustments */
body.light-mode .mm-overlay { background: rgba(248,250,252,.97); }
body.light-mode .mm-topbar {
    background: linear-gradient(180deg, rgba(255,255,255,.95), rgba(248,250,252,.85));
    border-color: #e2e8f0; color: #0f172a;
}
body.light-mode .mm-btn { background: #fff; color: #475569; border-color: #cbd5e1; }
body.light-mode .mm-btn:hover { background: #f1f5f9; color: #0f172a; border-color: #94a3b8; }
body.light-mode .mm-btn-close { color: #b91c1c; border-color: #fecaca; }
body.light-mode .mm-btn-close:hover { background: #fef2f2; color: #7f1d1d; border-color: #fca5a5; }
body.light-mode .mm-canvas { background: radial-gradient(ellipse at center, #ffffff 0%, #f1f5f9 100%); }
body.light-mode .mm-svg .markmap-foreign { color: #0f172a; }
body.light-mode .mm-svg .markmap-foreign strong { color: #000; }
body.light-mode .mm-svg .markmap-foreign code { background: #f1f5f9; color: #0f172a; }
body.light-mode .mm-svg .markmap-link { stroke-opacity: .5; }
body.light-mode .mm-help { background: rgba(255,255,255,.95); border-color: #e2e8f0; color: #64748b; }
body.light-mode .mm-loading { color: #475569; }
body.light-mode .mm-error { color: #b91c1c; }
`;
    document.head.appendChild(style);
}
