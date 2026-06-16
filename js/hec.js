/* ═══════════════════════════════════════════════
   Onglet HEC — intègre l'app React HEC
   (static/hec/index.html, assemblée par build_hec.py sur le même
   template que Conso) via une <iframe>. Isolation totale : l'app
   garde son propre Tailwind / React, indépendant du thème de l'app.

   La hauteur de l'iframe est calculée dynamiquement pour remplir
   l'espace disponible.
   ═══════════════════════════════════════════════ */

function _hecFit() {
    const frame = document.getElementById('hecFrame');
    if (!frame || !document.body.contains(frame)) {
        window.removeEventListener('resize', _hecFit);
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

// URL de l'iframe avec cache-busting : reprend le ?v=<build> de hec.js
// (posé par build_mobile) ; en bureau, bust par horodatage.
function _hecSrc() {
    let v = '';
    try {
        const s = document.querySelector('script[src*="js/hec.js"]');
        const m = s && (s.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
        if (m) v = m[1];
    } catch (_) {}
    return 'hec/index.html?v=' + (v || Date.now());
}

function _renderHEC(container) {
    if (!container) return;
    container.innerHTML = `
        <iframe id="hecFrame"
                src="${_hecSrc()}"
                title="HEC — Cours certifiants"
                style="display:block;width:100%;height:70vh;border:0;border-radius:10px;background:#f8fafc;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                referrerpolicy="no-referrer"></iframe>`;

    _hecFit();
    requestAnimationFrame(_hecFit);
    setTimeout(_hecFit, 80);
    setTimeout(_hecFit, 300);
    window.removeEventListener('resize', _hecFit);
    window.addEventListener('resize', _hecFit);
}

window._renderHEC = _renderHEC;
