/* ═══════════════════════════════════════════════
   Onglet Manuel EY — intègre le « EY Staff 1 — Field Manual »
   (static/eymanual/index.html, app React autonome fournie telle quelle)
   via une <iframe>, sur le même pattern que Social/HEC.
   ═══════════════════════════════════════════════ */

function _eymanFit() {
    const frame = document.getElementById('eymanFrame');
    if (!frame || !document.body.contains(frame)) {
        window.removeEventListener('resize', _eymanFit);
        return;
    }
    const top = frame.getBoundingClientRect().top;
    let padBottom = 0;
    if (frame.parentElement) {
        padBottom = parseFloat(getComputedStyle(frame.parentElement).paddingBottom) || 0;
    }
    const h = Math.max(420, Math.floor(window.innerHeight - top - padBottom - 2));
    frame.style.height = h + 'px';
}

function _eymanSrc() {
    let v = '';
    try {
        const s = document.querySelector('script[src*="js/eymanual.js"]');
        const m = s && (s.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
        if (m) v = m[1];
    } catch (_) {}
    return 'eymanual/index.html?v=' + (v || Date.now());
}

function _renderEyManual(container) {
    if (!container) return;
    container.innerHTML = `
        <iframe id="eymanFrame"
                src="${_eymanSrc()}"
                title="Manuel EY Staff 1 — Field Manual"
                style="display:block;width:100%;height:70vh;border:0;border-radius:10px;background:#fffde7;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                referrerpolicy="no-referrer"></iframe>`;

    _eymanFit();
    requestAnimationFrame(_eymanFit);
    setTimeout(_eymanFit, 80);
    setTimeout(_eymanFit, 300);
    window.removeEventListener('resize', _eymanFit);
    window.addEventListener('resize', _eymanFit);
}

window._renderEyManual = _renderEyManual;
