/* ═══════════════════════════════════════════════════════════════
   Onglet ORAL — app React (même thème que l'onglet Conso), servie
   dans une page autonome (static/oral/index.html) via une <iframe>.
   Isolation totale : Tailwind/React propres, indépendants du thème
   sombre de l'app. Hauteur dynamique + cache-busting (?v=<build>).
   ═══════════════════════════════════════════════════════════════ */

function _oralFit() {
    const frame = document.getElementById('oralFrame');
    if (!frame || !document.body.contains(frame)) {
        window.removeEventListener('resize', _oralFit);
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

function _oralSrc() {
    let v = '';
    try {
        const s = document.querySelector('script[src*="js/oral.js"]');
        const m = s && (s.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
        if (m) v = m[1];
    } catch (_) {}
    return 'oral/index.html?v=' + (v || Date.now());
}

function renderOral(container) {
    if (!container) return;
    container.innerHTML = `
        <iframe id="oralFrame"
                src="${_oralSrc()}"
                title="Préparation à l'examen oral"
                style="display:block;width:100%;height:70vh;border:0;border-radius:10px;background:#f8fafc;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                referrerpolicy="no-referrer"></iframe>`;
    _oralFit();
    requestAnimationFrame(_oralFit);
    setTimeout(_oralFit, 80);
    setTimeout(_oralFit, 300);
    window.removeEventListener('resize', _oralFit);
    window.addEventListener('resize', _oralFit);
}
