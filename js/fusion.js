/* ═══════════════════════════════════════════════
   Onglet Fusion — intègre l'app « Fusions & opérations assimilées »
   (static/fusion/index.html, assemblée par build_fusion.py : React + Tailwind
   + Babel VENDORÉS, aucune dépendance CDN) via une <iframe>, sur le même
   pattern que Conso / Manuel EY / Social.
   ═══════════════════════════════════════════════ */

function _fusionFit() {
    const frame = document.getElementById('fusionFrame');
    if (!frame || !document.body.contains(frame)) {
        window.removeEventListener('resize', _fusionFit);
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

function _fusionSrc() {
    let v = '';
    try {
        const s = document.querySelector('script[src*="js/fusion.js"]');
        const m = s && (s.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
        if (m) v = m[1];
    } catch (_) {}
    return 'fusion/index.html?v=' + (v || Date.now());
}

function _renderFusion(container) {
    if (!container) return;
    container.innerHTML = `
        <iframe id="fusionFrame"
                src="${_fusionSrc()}"
                title="Fusions, apports partiels d'actif et scissions"
                style="display:block;width:100%;height:70vh;border:0;border-radius:10px;background:#f1f5f9;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                referrerpolicy="no-referrer"></iframe>`;

    _fusionFit();
    requestAnimationFrame(_fusionFit);
    setTimeout(_fusionFit, 80);
    setTimeout(_fusionFit, 300);
    window.removeEventListener('resize', _fusionFit);
    window.addEventListener('resize', _fusionFit);
}

window._renderFusion = _renderFusion;
