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

/* L'iframe vit dans #podcastHost (hôte persistant, jamais détruit) : on la
   crée une seule fois, puis on se contente d'afficher / masquer l'hôte.
   Ainsi l'audio continue de jouer quand on navigue vers un autre onglet. */
function renderPodcasts(_container) {
    const host = document.getElementById('podcastHost');
    if (!host) return;
    if (!document.getElementById('podcastsFrame')) {
        host.innerHTML = `
            <iframe id="podcastsFrame"
                    src="${_podcastsSrc()}"
                    title="Podcasts — révision audio (IFRS/IAS · Audit)"
                    style="display:block;width:100%;height:70vh;border:0;border-radius:10px;background:#f8fafc;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                    referrerpolicy="no-referrer"></iframe>`;
    }
    // Affiche l'hôte podcasts, masque le contenu principal.
    host.style.display = '';
    const main = document.getElementById('mainContent');
    if (main) main.style.display = 'none';

    // Ajuste maintenant, puis après stabilisation de la mise en page,
    // puis à chaque redimensionnement de la fenêtre.
    _podcastsFit();
    requestAnimationFrame(_podcastsFit);
    setTimeout(_podcastsFit, 80);
    setTimeout(_podcastsFit, 300);
    window.removeEventListener('resize', _podcastsFit);
    window.addEventListener('resize', _podcastsFit);
}

/* Mini-lecteur global : reçoit l'état depuis l'iframe et l'affiche sur les
   autres onglets ; renvoie les commandes (pause/reprise, fermer). */
let _pcState = { hasCurrent: false, playing: false, title: '', gid: '', gcolor: '#6366f1' };
function _pcSendCmd(cmd) {
    try {
        const f = document.getElementById('podcastsFrame');
        if (f && f.contentWindow) f.contentWindow.postMessage({ type: 'podcastCmd', cmd: cmd }, '*');
    } catch (_) {}
}
function _pcRenderMini() {
    let bar = document.getElementById('pcMiniBar');
    const show = _pcState.hasCurrent && currentTab !== 'podcasts';
    if (!show) { if (bar) bar.remove(); return; }
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'pcMiniBar';
        document.body.appendChild(bar);
    }
    bar.className = 'pc-mini';
    bar.innerHTML = `
        <button class="pc-mini-pp" title="Lecture / pause" aria-label="Lecture / pause">${_pcState.playing ? '⏸' : '▶'}</button>
        <button class="pc-mini-open" title="Ouvrir les podcasts">
            <span class="pc-mini-dot" style="background:${_pcState.gcolor}"></span>
            <span class="pc-mini-text"><span class="pc-mini-eq">${_pcState.playing ? '🎧' : '🎵'}</span> ${(_pcState.title || 'Podcast').replace(/</g, '&lt;')}</span>
        </button>
        <button class="pc-mini-x" title="Fermer le lecteur" aria-label="Fermer">✕</button>`;
    bar.querySelector('.pc-mini-pp').onclick = (e) => { e.stopPropagation(); _pcSendCmd('toggle'); };
    bar.querySelector('.pc-mini-open').onclick = () => navigate('podcasts');
    bar.querySelector('.pc-mini-x').onclick = (e) => { e.stopPropagation(); _pcSendCmd('close'); };
}
window.addEventListener('message', function (e) {
    const d = e && e.data;
    if (!d || d.type !== 'podcastState') return;
    _pcState = {
        hasCurrent: !!d.hasCurrent, playing: !!d.playing,
        title: d.title || '', gid: d.gid || '', gcolor: d.gcolor || '#6366f1',
    };
    _pcRenderMini();
});
