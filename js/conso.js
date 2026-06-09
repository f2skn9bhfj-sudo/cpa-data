/* ═══════════════════════════════════════════════
   Onglet CONSO — intègre l'artefact React conso-wizard
   dans une page autonome (static/conso/index.html) via une
   <iframe>. Isolation TOTALE : l'artefact garde son propre
   Tailwind / React / couleurs, indépendant du thème de l'app.

   La hauteur de l'iframe est calculée DYNAMIQUEMENT pour
   remplir l'espace disponible quelle que soit la taille
   d'écran / la hauteur (variable) de la barre d'onglets.
   ═══════════════════════════════════════════════ */

function _consoFit() {
    const frame = document.getElementById('consoFrame');
    if (!frame || !document.body.contains(frame)) {
        window.removeEventListener('resize', _consoFit);
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

// URL de l'iframe avec cache-busting : reprend le ?v=<build> de conso.js
// (posé par build_mobile) → un refresh normal récupère la nouvelle version.
// En mode bureau (pas de ?v), on bust par horodatage (fichier local, peu coûteux).
function _consoSrc() {
    let v = '';
    try {
        const s = document.querySelector('script[src*="js/conso.js"]');
        const m = s && (s.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
        if (m) v = m[1];
    } catch (_) {}
    return 'conso/index.html?v=' + (v || Date.now());
}

function renderConso(container) {
    if (!container) return;
    container.innerHTML = `
        <iframe id="consoFrame"
                src="${_consoSrc()}"
                title="Consolidation — Outil pédagogique (IFRS / Swiss GAAP RPC)"
                style="display:block;width:100%;height:70vh;border:0;border-radius:10px;background:#f8fafc;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                referrerpolicy="no-referrer"></iframe>`;

    // Ajuste maintenant, puis après stabilisation de la mise en page,
    // puis à chaque redimensionnement de la fenêtre.
    _consoFit();
    requestAnimationFrame(_consoFit);
    setTimeout(_consoFit, 80);
    setTimeout(_consoFit, 300);
    window.removeEventListener('resize', _consoFit);
    window.addEventListener('resize', _consoFit);
}
