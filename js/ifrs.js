/* ═══════════════════════════════════════════════
   Onglet IFRS — Comptes de groupe & consolidation
   IAS 27 · IAS 28 · IFRS 3 · IFRS 10 · IFRS 11 · IFRS 12
   Données : data/ifrs.json (overview + 6 cours en blocs markdown).
   Surfaces via tokens CSS (s'adapte clair/sombre) ; accents par norme.
   ═══════════════════════════════════════════════ */

let _ifrsData = null;

async function renderIfrs(container) {
    if (!container) return;
    if (!_ifrsData) {
        try { _ifrsData = (await api('get_ifrs_data')) || {}; }
        catch (e) { _ifrsData = {}; }
    }
    if (!_ifrsData.standards || !_ifrsData.standards.length) {
        container.innerHTML = '<p style="padding:40px;color:var(--text-muted)">Données IFRS indisponibles.</p>';
        return;
    }
    _ifrsHome(container);
}

function _ifrsFind(code) {
    return (_ifrsData.standards || []).find(s => s.code === code);
}

function _ifrsMapCard(m) {
    const pts = (m.points || []).map(p =>
        `<li style="margin-bottom:3px">${escapeHtml(p)}</li>`).join('');
    return `
      <button onclick="_ifrsOpen('${escapeAttr(m.code)}')" class="ifrs-card"
              style="text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:7px;
                     background:var(--bg-secondary);border:1px solid var(--border);
                     border-top:3px solid ${m.color};border-radius:11px;padding:14px 15px;
                     transition:transform .15s,box-shadow .15s">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">${m.icon || '📘'}</span>
          <span style="font-weight:800;font-size:15px;color:${m.color}">${escapeHtml(m.code)}</span>
        </div>
        <div style="font-weight:700;font-size:13px;color:var(--text-primary);line-height:1.3">${escapeHtml(m.title)}</div>
        <ul style="margin:2px 0 0 16px;padding:0;color:var(--text-muted);font-size:11.5px;line-height:1.5">${pts}</ul>
        <span style="margin-top:auto;font-size:11px;color:${m.color};font-weight:700;padding-top:6px">Ouvrir le cours →</span>
      </button>`;
}

function _ifrsHome(container) {
    const ov = _ifrsData.overview || {};
    const cards = (ov.map || []).map(_ifrsMapCard).join('');
    const i12 = ov.ifrs12 || {};

    container.innerHTML = `
      <div class="fade-in" style="max-width:1120px;margin:0 auto">
        <div style="text-align:center;margin-bottom:6px">
          <h1 class="page-title" style="font-size:26px">🌐 Comptes de groupe & consolidation</h1>
          <div style="color:var(--text-muted);font-size:12.5px;margin-top:4px">
            La famille IFRS : IAS 27 · IAS 28 · IFRS 3 · IFRS 10 · IFRS 11 · IFRS 12
          </div>
        </div>

        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;
                    padding:15px 18px;margin:14px 0 18px;color:var(--text-secondary);
                    font-size:13.5px;line-height:1.75">${formatAnswer(ov.intro || '')}</div>

        <div style="text-align:center;margin:6px 0 14px">
          <span style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4338ca);color:#fff;
                       font-weight:800;font-size:15px;padding:10px 24px;border-radius:10px;
                       box-shadow:0 6px 18px rgba(99,102,241,.35)">Quel degré d'influence sur l'entité détenue ?</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:12px;margin-bottom:14px">
          ${cards}
        </div>

        <button onclick="_ifrsOpen('${escapeAttr(i12.code || 'IFRS 12')}')" class="ifrs-card"
                style="width:100%;text-align:left;cursor:pointer;background:var(--bg-secondary);
                       border:1px solid var(--border);border-left:3px solid ${i12.color || '#10b981'};
                       border-radius:11px;padding:14px 16px;margin-bottom:16px;transition:transform .15s,box-shadow .15s">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="font-size:19px">${i12.icon || '📋'}</span>
            <span style="font-weight:800;font-size:15px;color:${i12.color || '#10b981'}">${escapeHtml(i12.code || 'IFRS 12')}</span>
            <span style="font-weight:700;font-size:13px;color:var(--text-primary)">${escapeHtml(i12.title || '')}</span>
            <span style="margin-left:auto;font-size:11px;color:${i12.color || '#10b981'};font-weight:700">Ouvrir →</span>
          </div>
          <div style="color:var(--text-muted);font-size:12px;margin-top:6px">${formatAnswer(i12.note || '')}</div>
        </button>

        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:11px;
                    padding:13px 16px;color:var(--text-secondary);font-size:12.5px;line-height:1.65">
          ${formatAnswer(ov.swiss_note || '')}
        </div>
      </div>`;
    _ifrsScrollTop();
}

function _ifrsOpen(code) {
    const s = _ifrsFind(code);
    const container = document.getElementById('mainContent');
    if (!s || !container) return;
    const color = s.color || '#6366f1';
    const blocks = (s.blocks || []).map((b, i) => `
        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;
                    padding:15px 17px;margin-bottom:12px">
          <div style="font-size:15px;font-weight:800;color:var(--text-primary);margin-bottom:10px;
                      padding-bottom:8px;border-bottom:1px solid var(--border)">${escapeHtml(b.title || '')}</div>
          <div class="ifrs-body" style="font-size:13px;color:var(--text-secondary);line-height:1.72">${formatAnswer(b.body || '')}</div>
        </div>`).join('');

    container.innerHTML = `
      <div class="fade-in" style="max-width:1000px;margin:0 auto">
        <div style="position:sticky;top:0;z-index:20;background:var(--bg-primary);
                    margin:-4px -4px 14px -4px;padding:8px 4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <button onclick="_ifrsHome(document.getElementById('mainContent'))"
                  style="padding:7px 13px;border-radius:7px;cursor:pointer;background:var(--bg-tertiary);
                         border:1px solid var(--border);color:var(--text-secondary);font-size:12px;font-weight:600">← Famille IFRS</button>
        </div>

        <div style="padding:18px 20px;border-radius:14px;background:linear-gradient(135deg,${color}26,${color}08 60%,transparent);
                    border:1px solid ${color}55;margin-bottom:16px;position:relative;overflow:hidden">
          <div style="position:absolute;right:-6px;top:-16px;font-size:74px;opacity:.10;font-weight:900;color:${color}">${escapeHtml((s.icon||''))}</div>
          <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:6px;position:relative">
            <span style="background:${color};color:#fff;font-size:14px;font-weight:800;padding:5px 13px;border-radius:7px">${escapeHtml(s.code)}</span>
            <span style="font-size:11px;color:var(--text-muted);background:var(--bg-tertiary);padding:4px 10px;border-radius:10px">📘 Cours complet</span>
          </div>
          <div style="font-size:20px;font-weight:900;color:var(--text-primary);line-height:1.25;position:relative">${escapeHtml(s.title)}</div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-top:8px;position:relative">${formatAnswer(s.tldr || '')}</div>
        </div>

        ${blocks}

        <div style="margin-top:14px">
          <button onclick="_ifrsHome(document.getElementById('mainContent'))"
                  style="padding:11px 18px;border-radius:9px;cursor:pointer;background:var(--bg-tertiary);
                         border:1px solid var(--border);color:var(--text-secondary);font-size:13px;font-weight:600">← Retour à la famille IFRS</button>
        </div>
      </div>`;
    _ifrsScrollTop();
}

function _ifrsScrollTop() {
    const m = document.getElementById('mainContent');
    if (m) { try { m.scrollTop = 0; } catch (_) {} }
    try { window.scrollTo(0, 0); } catch (_) {}
}
