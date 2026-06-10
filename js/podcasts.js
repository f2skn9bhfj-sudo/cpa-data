/* ═══════════════════════════════════════════════
   Onglet PODCASTS — intègre l'app React podcasts
   (static/podcasts/index.html, assemblée par build_podcasts.py
   sur le même template que Conso) via une <iframe>.
   Isolation TOTALE : l'app garde son propre Tailwind / React,
   indépendant du thème de l'app principale.

   La hauteur de l'iframe est calculée DYNAMIQUEMENT pour
   remplir l'espace disponible quelle que soit la taille
   d'écran / la hauteur (variable) de la barre d'onglets.
   ═══════════════════════════════════════════════ */

function _podcastsFit() {
    const frame = document.getElementById('podcastsFrame');
    if (!frame || !document.body.contains(frame)) {
        window.removeEventListener('resize', _podcastsFit);
        return;
    }
    const top = frame.getBoundingClientRect().top;
    // Remplit jusqu'en bas du viewport, en laissant le padding-bas du
    // conteneur (#mainContent) pour ne pas ajouter de scroll de page.
    let padBottom = 0;
    if (frame.parentElement) {
        padBottom = parseFloat(getComputedStyle(frame.parentElement).paddingBottom) || 0;
    }
    const h = Math.max(420, Math.floor(window.innerHeight - top - padBottom - 2));
    frame.style.height = h + 'px';
}

// URL de l'iframe avec cache-busting : reprend le ?v=<build> de podcasts.js
// (posé par build_mobile) → un refresh normal récupère la nouvelle version.
// En mode bureau (pas de ?v), on bust par horodatage (fichier local, peu coûteux).
function _podcastsSrc() {
    let v = '';
    try {
        const s = document.querySelector('script[src*="js/podcasts.js"]');
        const m = s && (s.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
        if (m) v = m[1];
    } catch (_) {}
    return 'podcasts/index.html?v=' + (v || Date.now());
}

function renderPodcasts(container) {
    if (!container) return;
    container.innerHTML = `
        <iframe id="podcastsFrame"
                src="${_podcastsSrc()}"
                title="Podcasts — révision audio (IFRS/IAS · Audit)"
                style="display:block;width:100%;height:70vh;border:0;border-radius:10px;background:#f8fafc;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                referrerpolicy="no-referrer"></iframe>`;

    // Ajuste maintenant, puis après stabilisation de la mise en page,
    // puis à chaque redimensionnement de la fenêtre.
    _podcastsFit();
    requestAnimationFrame(_podcastsFit);
    setTimeout(_podcastsFit, 80);
    setTimeout(_podcastsFit, 300);
    window.removeEventListener('resize', _podcastsFit);
    window.addEventListener('resize', _podcastsFit);
}
