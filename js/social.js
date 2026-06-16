/* ═══════════════════════════════════════════════
   Onglet Social — intègre l'app React Social
   (static/social/index.html, assemblée par build_social.py sur le même
   template que Conso/HEC) via une <iframe>. Isolation totale : l'app
   garde son propre Tailwind / React, indépendant du thème de l'app.

   Couvre : contrat de travail, assurances sociales, rémunération & paie,
   avec un calculateur de fiche de salaire interactif.
   ═══════════════════════════════════════════════ */

function _socialFit() {
    const frame = document.getElementById('socialFrame');
    if (!frame || !document.body.contains(frame)) {
        window.removeEventListener('resize', _socialFit);
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

function _socialSrc() {
    let v = '';
    try {
        const s = document.querySelector('script[src*="js/social.js"]');
        const m = s && (s.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
        if (m) v = m[1];
    } catch (_) {}
    return 'social/index.html?v=' + (v || Date.now());
}

function _renderSocial(container) {
    if (!container) return;
    container.innerHTML = `
        <iframe id="socialFrame"
                src="${_socialSrc()}"
                title="Social — droit du travail, assurances sociales & paie"
                style="display:block;width:100%;height:70vh;border:0;border-radius:10px;background:#f8fafc;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                referrerpolicy="no-referrer"></iframe>`;

    _socialFit();
    requestAnimationFrame(_socialFit);
    setTimeout(_socialFit, 80);
    setTimeout(_socialFit, 300);
    window.removeEventListener('resize', _socialFit);
    window.addEventListener('resize', _socialFit);
}

window._renderSocial = _renderSocial;
