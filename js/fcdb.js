/* ════════════════════════════════════════════════════════════
   BDD FLASHCARDS — vue globale filtrable sur toute la base
   ──────────────────────────────────────────────────────────── */

let _fcdbAll = [];
let _fcdbFilters = { cat: '', sub: '', module: '', diff: '', search: '', mastery: '' };
let _fcdbPage = 0;
const FCDB_PAGE_SIZE = 50;

async function renderFcdb(main) {
    main.innerHTML = `
    <div class="page-header">
        <h1 class="page-title">🃏 Base de données — Flashcards</h1>
        <p class="page-subtitle">Vue globale, recherche & filtres avancés sur toute la base</p>
    </div>
    <div id="fcdbStats" style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:18px"></div>
    <div class="card" style="padding:16px;margin-bottom:14px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
            <div>
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">Recherche texte</label>
                <input id="fcdbSearch" type="text" placeholder="Question ou réponse..." style="width:100%;padding:8px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0">
            </div>
            <div>
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">Catégorie</label>
                <select id="fcdbCat" style="width:100%;padding:8px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0">
                    <option value="">Toutes</option>
                </select>
            </div>
            <div>
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">Sous-catégorie</label>
                <select id="fcdbSub" style="width:100%;padding:8px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0">
                    <option value="">Toutes</option>
                </select>
            </div>
            <div>
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">Module</label>
                <select id="fcdbModule" style="width:100%;padding:8px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0">
                    <option value="">Tous</option>
                </select>
            </div>
            <div>
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">Difficulté</label>
                <select id="fcdbDiff" style="width:100%;padding:8px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0">
                    <option value="">Toutes</option>
                    <option value="facile">Facile</option>
                    <option value="moyen">Moyen</option>
                    <option value="difficile">Difficile</option>
                    <option value="piège">Piège</option>
                </select>
            </div>
            <div>
                <label style="font-size:11px;color:#94a3b8;display:block;margin-bottom:4px">Maîtrise</label>
                <select id="fcdbMastery" style="width:100%;padding:8px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#e2e8f0">
                    <option value="">Toutes</option>
                    <option value="0">Jamais étudiée</option>
                    <option value="learning">En cours</option>
                    <option value="review">Revue</option>
                    <option value="mastered">Maîtrisée</option>
                </select>
            </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="fcdbApply()">🔍 Filtrer</button>
            <button class="btn btn-outline" onclick="fcdbReset()">↺ Réinitialiser</button>
            <button class="btn btn-outline" onclick="fcdbReviewSelection()">▶ Réviser cette sélection</button>
            <button class="btn btn-outline" onclick="fcdbExportCsv()">📥 Export CSV</button>
        </div>
    </div>
    <div id="fcdbCount" style="margin-bottom:8px;font-size:13px;color:#94a3b8"></div>
    <div id="fcdbList"></div>
    <div id="fcdbPagination" style="margin-top:14px;text-align:center"></div>
    `;

    // Bind events
    document.getElementById('fcdbSearch').addEventListener('input', _fcdbDebounce(fcdbApply, 300));
    ['fcdbCat','fcdbSub','fcdbModule','fcdbDiff','fcdbMastery'].forEach(id =>
        document.getElementById(id).addEventListener('change', fcdbApply));

    // Load all cards once
    try {
        _fcdbAll = await api('get_flashcards');
        if (!Array.isArray(_fcdbAll)) _fcdbAll = [];
        _fcdbBuildFilters();
        _fcdbRenderStats();

        // Apply pre-filter (e.g. arriving from Stats → "voir les flashcards M2")
        if (window._fcdbPrefilter) {
            const pf = window._fcdbPrefilter;
            window._fcdbPrefilter = null;
            ['cat', 'module', 'mastery', 'sub', 'diff'].forEach(k => {
                if (pf[k] !== undefined) {
                    const el = document.getElementById('fcdb' + k.charAt(0).toUpperCase() + k.slice(1));
                    if (el) el.value = pf[k];
                }
            });
        }

        fcdbApply();
    } catch (e) {
        document.getElementById('fcdbList').innerHTML =
            `<div style="color:#ef4444;padding:16px">Erreur de chargement : ${escapeHtml(String(e))}</div>`;
    }
}

function _fcdbBuildFilters() {
    const cats = new Set(), subs = new Set(), mods = new Set();
    _fcdbAll.forEach(c => {
        if (c.category) cats.add(c.category);
        if (c.subcategory) subs.add(c.subcategory);
        if (c.module_code) mods.add(c.module_code);
    });
    const fillSelect = (id, set) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">— Toutes —</option>' +
            Array.from(set).sort().map(v => `<option value="${escapeAttr(v)}">${escapeHtml(v)}</option>`).join('');
        if (cur) sel.value = cur;
    };
    fillSelect('fcdbCat', cats);
    fillSelect('fcdbSub', subs);
    fillSelect('fcdbModule', mods);
}

function _fcdbRenderStats() {
    const total = _fcdbAll.length;
    const byCat = {};
    _fcdbAll.forEach(c => {
        const k = c.category || '?';
        byCat[k] = (byCat[k] || 0) + 1;
    });
    const html = `<div class="card" style="padding:14px;flex:0 0 auto">
        <div style="font-size:11px;color:#94a3b8">TOTAL</div>
        <div style="font-size:24px;font-weight:700;color:#3b82f6">${total}</div>
        <div style="font-size:11px;color:#64748b">cartes</div>
    </div>` +
    Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v]) =>
        `<div class="card" style="padding:12px 14px;flex:0 0 auto">
            <div style="font-size:11px;color:#94a3b8">${escapeHtml(k)}</div>
            <div style="font-size:18px;font-weight:600;color:#e2e8f0">${v}</div>
        </div>`
    ).join('');
    document.getElementById('fcdbStats').innerHTML = html;
}

function fcdbApply() {
    _fcdbFilters = {
        cat: document.getElementById('fcdbCat').value,
        sub: document.getElementById('fcdbSub').value,
        module: document.getElementById('fcdbModule').value,
        diff: document.getElementById('fcdbDiff').value,
        mastery: document.getElementById('fcdbMastery').value,
        search: document.getElementById('fcdbSearch').value.toLowerCase().trim()
    };
    _fcdbPage = 0;
    _fcdbRenderList();
}

function fcdbReset() {
    ['fcdbCat','fcdbSub','fcdbModule','fcdbDiff','fcdbMastery','fcdbSearch'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    fcdbApply();
}

function _fcdbFiltered() {
    return _fcdbAll.filter(c => {
        if (_fcdbFilters.cat && c.category !== _fcdbFilters.cat) return false;
        if (_fcdbFilters.sub && c.subcategory !== _fcdbFilters.sub) return false;
        if (_fcdbFilters.module && c.module_code !== _fcdbFilters.module) return false;
        if (_fcdbFilters.diff && (c.difficulty || '').toLowerCase() !== _fcdbFilters.diff.toLowerCase()) return false;
        if (_fcdbFilters.mastery) {
            const reps = c.repetitions || 0;
            if (_fcdbFilters.mastery === '0' && reps > 0) return false;
            if (_fcdbFilters.mastery === 'learning' && (reps === 0 || reps >= 3)) return false;
            if (_fcdbFilters.mastery === 'review' && (reps < 3 || reps >= 6)) return false;
            if (_fcdbFilters.mastery === 'mastered' && reps < 6) return false;
        }
        if (_fcdbFilters.search) {
            const q = (c.question || '').toLowerCase();
            const a = (c.answer || '').toLowerCase();
            if (q.indexOf(_fcdbFilters.search) === -1 && a.indexOf(_fcdbFilters.search) === -1) return false;
        }
        return true;
    });
}

function _fcdbRenderList() {
    const filtered = _fcdbFiltered();
    document.getElementById('fcdbCount').innerHTML =
        `<strong style="color:#e2e8f0">${filtered.length}</strong> cartes / ${_fcdbAll.length}`;

    const start = _fcdbPage * FCDB_PAGE_SIZE;
    const end = Math.min(start + FCDB_PAGE_SIZE, filtered.length);
    const page = filtered.slice(start, end);

    if (page.length === 0) {
        document.getElementById('fcdbList').innerHTML =
            '<div style="text-align:center;padding:40px;color:#64748b">Aucune carte ne correspond aux filtres.</div>';
        document.getElementById('fcdbPagination').innerHTML = '';
        return;
    }

    let html = '';
    page.forEach((c, i) => {
        const idx = start + i + 1;
        const diffColor = { facile:'#22c55e', moyen:'#f59e0b', difficile:'#ef4444', piège:'#a855f7' }[(c.difficulty||'').toLowerCase()] || '#64748b';
        const reps = c.repetitions || 0;
        const masteryDot = reps >= 6 ? '#22c55e' : reps >= 3 ? '#3b82f6' : reps > 0 ? '#f59e0b' : '#475569';
        const detailId = `fcdb_d_${c.id}`;
        html += `
        <div style="border:1px solid #334155;border-radius:8px;padding:14px;margin-bottom:8px;background:#1e293b">
            <div style="display:flex;gap:10px;align-items:center;cursor:pointer" onclick="document.getElementById('${detailId}').style.display=document.getElementById('${detailId}').style.display==='none'?'block':'none'">
                <span style="background:${masteryDot};width:8px;height:8px;border-radius:50%;flex:0 0 auto"></span>
                <span style="font-size:11px;color:#64748b;min-width:50px">#${c.id}</span>
                <span style="background:${diffColor}22;color:${diffColor};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;text-transform:uppercase">${escapeHtml(c.difficulty || '?')}</span>
                <span style="font-size:11px;color:#94a3b8">${escapeHtml(c.module_code || '')} · ${escapeHtml(c.category || '')}</span>
                <span style="flex:1;font-size:13px;color:#e2e8f0">${escapeHtml((c.question || '').slice(0,140))}</span>
            </div>
            <div id="${detailId}" style="display:none;margin-top:10px;padding-top:10px;border-top:1px solid #334155">
                <div style="font-size:12px;color:#94a3b8;margin-bottom:4px">${escapeHtml(c.subcategory || '')}</div>
                <div style="font-weight:600;font-size:14px;color:#e2e8f0;margin-bottom:8px">${formatInline(c.question || '')}</div>
                <div style="font-size:13px;color:#cbd5e1;line-height:1.6;white-space:pre-wrap">${formatAnswer(c.answer || '')}</div>
                <div style="margin-top:10px;font-size:11px;color:#64748b">Répétitions : ${reps} · Facilité : ${(c.ease_factor || 2.5).toFixed(2)} · Intervalle : ${c.interval_days || 0}j</div>
            </div>
        </div>`;
    });

    document.getElementById('fcdbList').innerHTML = html;

    // Pagination
    const totalPages = Math.ceil(filtered.length / FCDB_PAGE_SIZE);
    if (totalPages > 1) {
        let p = `<div style="display:inline-flex;gap:6px;align-items:center">`;
        if (_fcdbPage > 0) p += `<button class="btn btn-outline" style="padding:4px 10px" onclick="_fcdbPage--;_fcdbRenderList()">◀ Précédent</button>`;
        p += `<span style="font-size:13px;color:#94a3b8;padding:0 12px">Page ${_fcdbPage+1} / ${totalPages}</span>`;
        if (_fcdbPage < totalPages - 1) p += `<button class="btn btn-outline" style="padding:4px 10px" onclick="_fcdbPage++;_fcdbRenderList()">Suivant ▶</button>`;
        p += `</div>`;
        document.getElementById('fcdbPagination').innerHTML = p;
    } else {
        document.getElementById('fcdbPagination').innerHTML = '';
    }
}

function fcdbReviewSelection() {
    const filtered = _fcdbFiltered();
    if (filtered.length === 0) { alert('Aucune carte à réviser.'); return; }
    try {
        sessionStorage.setItem('fcdbReviewIds', JSON.stringify(filtered.map(c => c.id)));
        sessionStorage.setItem('fcdbReviewLabel', JSON.stringify({
            cat: _fcdbFilters.cat, sub: _fcdbFilters.sub, module: _fcdbFilters.module
        }));
    } catch(e){}
    navigate('trainer');
}

function fcdbExportCsv() {
    const rows = _fcdbFiltered();
    if (rows.length === 0) { alert('Rien à exporter.'); return; }
    const esc = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const header = ['id','category','subcategory','module_code','difficulty','question','answer','repetitions','ease_factor','interval_days'];
    const csv = [header.join(',')].concat(rows.map(c => header.map(h => esc(c[h])).join(','))).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `flashcards_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
}

function _fcdbDebounce(fn, delay) {
    let t = null;
    return function() { clearTimeout(t); t = setTimeout(fn, delay); };
}
