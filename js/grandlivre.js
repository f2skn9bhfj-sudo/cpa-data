/* ═══════════════════════════════════════════════
   Onglet Grand Livre — intègre « Le Grand Livre —
   Comptabilité suisse · Swiss CPA & Audit EY »
   (static/grandlivre/index.html, page HTML autonome en vanilla JS)
   via une <iframe>, sur le même pattern que Manuel EY / Social / HEC.
   ═══════════════════════════════════════════════ */

function _glivreFit() {
    const frame = document.getElementById('glivreFrame');
    if (!frame || !document.body.contains(frame)) {
        window.removeEventListener('resize', _glivreFit);
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

function _glivreSrc() {
    let v = '';
    try {
        const s = document.querySelector('script[src*="js/grandlivre.js"]');
        const m = s && (s.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
        if (m) v = m[1];
    } catch (_) {}
    return 'grandlivre/index.html?v=' + (v || Date.now());
}

function _renderGrandLivre(container) {
    if (!container) return;
    container.innerHTML = `
        <iframe id="glivreFrame"
                src="${_glivreSrc()}"
                title="Le Grand Livre — Comptabilité suisse, Swiss CPA & Audit EY"
                style="display:block;width:100%;height:70vh;border:0;border-radius:10px;background:#faf9f6;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                referrerpolicy="no-referrer"></iframe>`;

    _glivreFit();
    requestAnimationFrame(_glivreFit);
    setTimeout(_glivreFit, 80);
    setTimeout(_glivreFit, 300);
    window.removeEventListener('resize', _glivreFit);
    window.addEventListener('resize', _glivreFit);
}

window._renderGrandLivre = _renderGrandLivre;
