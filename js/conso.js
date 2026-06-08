/* ═══════════════════════════════════════════════
   Onglet CONSO — intègre l'artefact React conso-wizard
   dans une page autonome (static/conso/index.html) via une
   <iframe>. Isolation TOTALE : l'artefact garde son propre
   Tailwind / React / couleurs, indépendant du thème de l'app.
   ═══════════════════════════════════════════════ */

function renderConso(container) {
    if (!container) return;
    container.innerHTML = `
        <div class="conso-frame-wrap" style="margin:-4px 0 0 0">
            <iframe id="consoFrame"
                    src="conso/index.html"
                    title="Consolidation — Outil pédagogique (IFRS / Swiss GAAP RPC)"
                    style="display:block;width:100%;height:calc(100vh - 118px);min-height:560px;border:0;border-radius:10px;background:#f8fafc;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                    referrerpolicy="no-referrer"></iframe>
        </div>`;
}
