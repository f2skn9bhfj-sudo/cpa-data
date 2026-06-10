/* ═══════════════════════════════════════════════════════════════
   Onglet ÉTATS FINANCIERS — app React (même thème que Conso/Audit),
   servie dans une page autonome (static/fs/index.html) via <iframe>.
   Explorateur IFRS : 4 états + 23 notes, détail par poste (définition,
   méthode, comparaison RPC/CO, astuces). Données inlinées au build
   (build_fs.py). Hauteur dynamique + cache-busting (?v=<build>).
   ═══════════════════════════════════════════════════════════════ */

function _fsFit() {
    const frame = document.getElementById('fsFrame');
    if (!frame || !document.body.contains(frame)) {
        window.removeEventListener('resize', _fsFit);
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

function _fsSrc() {
    let v = '';
    try {
        const s = document.querySelector('script[src*="js/fs_explorer.js"]');
        const m = s && (s.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
        if (m) v = m[1];
    } catch (_) {}
    return 'fs/index.html?v=' + (v || Date.now());
}

function renderFsExplorer(container) {
    if (!container) return;
    container.innerHTML = `
        <iframe id="fsFrame"
                src="${_fsSrc()}"
                title="États financiers — explorateur IFRS"
                style="display:block;width:100%;height:70vh;border:0;border-radius:10px;background:#f8fafc;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                referrerpolicy="no-referrer"></iframe>`;
    _fsFit();
    requestAnimationFrame(_fsFit);
    setTimeout(_fsFit, 80);
    setTimeout(_fsFit, 300);
    window.removeEventListener('resize', _fsFit);
    window.addEventListener('resize', _fsFit);
}
