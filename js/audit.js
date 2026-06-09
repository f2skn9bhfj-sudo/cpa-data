/* ═══════════════════════════════════════════════════════════════
   Onglet AUDIT — app React (même thème que l'onglet Conso), servie
   dans une page autonome (static/audit/index.html) via une <iframe>.
   Les 47 cours ISA + le cadre suisse + cycles + QCM + outils, en
   style clair/ludique. Données chargées par fetch (data/audit.json).
   Hauteur dynamique + cache-busting (?v=<build>).
   ═══════════════════════════════════════════════════════════════ */

function _auditFit() {
    const frame = document.getElementById('auditFrame');
    if (!frame || !document.body.contains(frame)) {
        window.removeEventListener('resize', _auditFit);
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

function _auditSrc() {
    let v = '';
    try {
        const s = document.querySelector('script[src*="js/audit.js"]');
        const m = s && (s.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
        if (m) v = m[1];
    } catch (_) {}
    return 'audit/index.html?v=' + (v || Date.now());
}

function renderAudit(container) {
    if (!container) return;
    container.innerHTML = `
        <iframe id="auditFrame"
                src="${_auditSrc()}"
                title="Module Audit — NAS / ISA"
                style="display:block;width:100%;height:70vh;border:0;border-radius:10px;background:#f8fafc;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                referrerpolicy="no-referrer"></iframe>`;
    _auditFit();
    requestAnimationFrame(_auditFit);
    setTimeout(_auditFit, 80);
    setTimeout(_auditFit, 300);
    window.removeEventListener('resize', _auditFit);
    window.addEventListener('resize', _auditFit);
}
