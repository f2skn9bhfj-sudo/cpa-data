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

let _auditContainer = null;

function renderAudit(container) {
    if (!container) return;
    _auditContainer = container;
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

/* ── Pont vers les modules natifs Audit (Canvas / Mission / Seuils) ──
   L'app React (iframe) poste un message ; on remplace l'iframe par le
   module natif rendu dans la page parente (accès backend api()). ── */
const _AUDIT_NATIVE = {
    canvas:  { fn: 'renderCanvas',      label: 'Canvas Perso' },
    mission: { fn: 'renderMission',     label: 'Mission Lab' },
    seuils:  { fn: 'renderAuditSeuils', label: 'Seuils & Exercices' },
};
function _auditOpenNative(module) {
    const c = _auditContainer;
    const spec = _AUDIT_NATIVE[module];
    if (!c || !spec) return;
    window.removeEventListener('resize', _auditFit);
    c.innerHTML = `
        <div style="margin-bottom:14px">
            <button id="auditNativeBack"
                    style="display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #e2e8f0;
                           color:#475569;padding:8px 14px;border-radius:9px;cursor:pointer;font-size:13px;font-weight:600">
                ← Retour à l'Audit
            </button>
        </div>
        <div id="auditNativeHost" class="audit-module"></div>`;
    const back = document.getElementById('auditNativeBack');
    if (back) back.addEventListener('click', () => renderAudit(c));
    const host = document.getElementById('auditNativeHost');
    const fn = window[spec.fn];
    if (typeof fn === 'function') {
        try { Promise.resolve(fn(host)).catch((e) => { host.innerHTML = `<div style="padding:30px;color:#dc2626;font-size:13px">Erreur ${spec.label} : ${e && e.message || e}</div>`; }); }
        catch (e) { host.innerHTML = `<div style="padding:30px;color:#dc2626;font-size:13px">Erreur ${spec.label} : ${e && e.message || e}</div>`; }
    } else {
        host.innerHTML = `<div style="padding:30px;color:#64748b;font-size:13px">Module « ${spec.label} » indisponible (script non chargé).</div>`;
    }
}
if (!window._auditNativeBridge) {
    window._auditNativeBridge = true;
    window.addEventListener('message', function (e) {
        const d = e && e.data;
        if (d && d.type === 'openAuditNative' && d.module) _auditOpenNative(d.module);
    });
}
