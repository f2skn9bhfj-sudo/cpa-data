/* ═══════════════════════════════════════════════
   Onglet RÉFÉRENCES — intègre l'app React références
   (static/references/index.html, assemblée par build_references.py
   sur le même template que Conso) via une <iframe>.

   Les sous-onglets vivent DANS l'app (plus de subTabBar côté parent).
   Les liens profonds navigate('references','cas') sont transmis via
   le hash de l'iframe (#cas) — gérés par hashchange dans l'app.

   Le pont postMessage gère « Flashcards liées » depuis les
   cross-références de normes (saut vers l'onglet flashcards parent).
   ═══════════════════════════════════════════════ */

function _refsFit() {
    const frame = document.getElementById('referencesFrame');
    if (!frame || !document.body.contains(frame)) {
        window.removeEventListener('resize', _refsFit);
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

// URL de l'iframe avec cache-busting : reprend le ?v=<build> de references.js
// (posé par build_mobile) ; en bureau, bust par horodatage.
function _refsSrc(subTab) {
    let v = '';
    try {
        const s = document.querySelector('script[src*="js/references.js"]');
        const m = s && (s.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
        if (m) v = m[1];
    } catch (_) {}
    const hash = subTab ? '#' + subTab : '';
    return 'references/index.html?v=' + (v || Date.now()) + hash;
}

function renderReferences(container, subTab) {
    if (!container) return;
    const existing = document.getElementById('referencesFrame');
    // Navigation interne (changement de sous-onglet) : si l'iframe est déjà
    // affichée, change seulement le hash — pas de rechargement complet.
    if (existing && container.contains(existing) && subTab) {
        try { existing.contentWindow.location.hash = subTab; return; } catch (_) {}
    }
    container.innerHTML = `
        <iframe id="referencesFrame"
                src="${_refsSrc(subTab)}"
                title="Références — leçons, mémos, vocabulaire, seuils, cas, arbres, terrain"
                style="display:block;width:100%;height:70vh;border:0;border-radius:10px;background:#f8fafc;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                referrerpolicy="no-referrer"></iframe>`;

    _refsFit();
    requestAnimationFrame(_refsFit);
    setTimeout(_refsFit, 80);
    setTimeout(_refsFit, 300);
    window.removeEventListener('resize', _refsFit);
    window.addEventListener('resize', _refsFit);
}

// ── Pont cross-références → onglet Flashcards du parent ──────────────
window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.type !== 'refsCrossRef') return;
    if (d.target === 'flashcards') {
        navigate('flashcards');
        // Pré-remplit la recherche une fois l'onglet rendu (même logique que
        // l'ancien crossref.js navigateToFlashcards).
        setTimeout(() => {
            const searchInput = document.getElementById('fcSearch');
            if (searchInput) {
                searchInput.value = d.q || '';
                searchInput.dispatchEvent(new Event('input'));
            }
        }, 300);
    }
});
