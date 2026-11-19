// ══════════════════════════════════════════════════════════════
// 📕 Carnet d'erreurs — page « S'entraîner → Carnet d'erreurs »
// Chaque question ratée (onglet QCM, examen blanc, questions flash des cours) y entre ;
// elle en sort, « maîtrisée », après 2 bonnes réponses d'affilée (api.error_book_*).
// ══════════════════════════════════════════════════════════════
const errbook = { data: null, filter: null, modNames: {} };

// Enregistre une réponse dans le carnet et affiche un petit message si utile.
async function errbookRecord(q, correct, userText, source) {
    try {
        const r = await api('error_book_record', q, correct, userText, source);
        errbookNotify(r);
        return r;
    } catch (e) { return null; }
}

function errbookNotify(r) {
    if (!r) return;
    let msg = '';
    if (r.status === 'added') msg = "📕 Ajoutée à ton carnet d'erreurs";
    else if (r.status === 'progress') msg = `📕 ${r.streak} / ${r.goal} — encore ${r.goal - r.streak} bonne réponse pour la sortir du carnet`;
    else if (r.status === 'mastered') msg = '🎉 Maîtrisée : sortie du carnet d\'erreurs !';
    if (!msg) return;
    _ebInjectStyles();
    let t = document.getElementById('ebToast');
    if (!t) { t = document.createElement('div'); t.id = 'ebToast'; t.className = 'eb-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.toggle('eb-toast-win', r.status === 'mastered');
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
}

// Lance une série de révision du carnet dans l'onglet QCM.
function errbookStart(ids, n) {
    const d = errbook.data;
    if (!d) return;
    let list = d.active;
    if (ids) list = list.filter(e => ids.includes(e.id));
    else if (errbook.filter) list = list.filter(e => (e.snap && e.snap.module) === errbook.filter);
    if (!list.length) return;
    const snaps = {};
    list.forEach(e => { snaps[e.id] = e.snap; });
    // Priorité aux questions les plus souvent ratées, puis au hasard
    const sorted = list.slice().sort((a, b) => (b.wrong || 0) - (a.wrong || 0) || Math.random() - 0.5);
    const pick = sorted.slice(0, n || 20).map(e => e.id);
    qcmFocusStart({ ids: pick, snaps, n: pick.length, special: 'errbook' });
}

async function errbookRemove(id) {
    await api('error_book_remove', id);
    await _ebReload();
}
async function errbookClearMastered() {
    if (!confirm('Effacer définitivement la liste des questions maîtrisées ?')) return;
    await api('error_book_clear_mastered');
    await _ebReload();
}
function errbookFilter(mod) { errbook.filter = mod || null; _ebRender(); }

async function _ebReload() {
    errbook.data = await api('get_error_book');
    _ebRender();
}

async function renderErrbook(container) {
    _ebInjectStyles();
    errbook.container = container;
    container.innerHTML = `<div class="eb"><div class="eb-loading">Chargement du carnet…</div></div>`;
    try {
        const mods = await api('get_modules');
        (mods || []).forEach(m => { errbook.modNames[m.code] = m.name; });
        errbook.modNames.AUDIT = errbook.modNames.AUDIT || 'Audit (ISA)';
    } catch (e) { /* noms de modules facultatifs */ }
    await _ebReload();
}

function _ebModLabel(code) {
    if (!code) return 'Divers';
    const n = errbook.modNames[code];
    return n ? `${code} · ${n}` : code;
}

function _ebAnswerText(snap) {
    if (!snap) return '';
    if (snap.type === 'vrai_faux') {
        const a = snap.answer;
        return (a === true || a === 'true' || a === 'Vrai' || a === 1) ? 'Vrai' : 'Faux';
    }
    const i = typeof snap.answer === 'number' ? snap.answer : parseInt(snap.answer, 10);
    const o = (snap.options || [])[i];
    return o == null ? '' : String(o).replace(/^\s*[A-D][.)]\s+/, '');
}

function _ebAgo(iso) {
    if (!iso) return '';
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d <= 0 ? "aujourd'hui" : d === 1 ? 'hier' : `il y a ${d} j`;
}

function _ebCard(e, goal) {
    const s = e.snap || {};
    const id = escapeAttr(e.id);
    const dots = Array.from({ length: goal }, (_, i) => `<span class="eb-dot${i < (e.streak || 0) ? ' on' : ''}"></span>`).join('');
    const user = e.user != null && e.user !== '' ? String(e.user).replace(/^\s*[A-D][.)]\s+/, '') : '';
    return `<article class="eb-card">
        <div class="eb-card-top">
            <span class="eb-mod">${escapeHtml(s.module || '—')}</span>
            ${s.norm_code && s.norm_code !== s.module ? `<span class="eb-norm">${escapeHtml(s.norm_code)}</span>` : ''}
            <span class="eb-meta">raté ${e.wrong || 1}× · ${escapeHtml(_ebAgo(e.last_wrong))}${e.source === 'cours' ? ' · dans un cours' : ''}</span>
            <span class="eb-dots" title="${e.streak || 0} bonne(s) réponse(s) d'affilée sur ${goal}">${dots}</span>
        </div>
        <div class="eb-q">${escapeHtml(s.question || '')}</div>
        ${user ? `<div class="eb-line eb-bad"><span>❌ Ta réponse</span><b>${escapeHtml(user)}</b></div>` : ''}
        <div class="eb-line eb-good"><span>✅ Bonne réponse</span><b>${escapeHtml(_ebAnswerText(s))}</b></div>
        ${s.explanation ? `<details class="eb-why"><summary>💡 Pourquoi ?</summary><div>${formatAnswer(s.explanation)}</div></details>` : ''}
        <div class="eb-actions">
            <button class="eb-btn" onclick="errbookStart(['${id}'], 1)">✏️ Refaire cette question</button>
            <button class="eb-btn eb-btn-ghost" onclick="errbookRemove('${id}')" title="Retirer du carnet">🗑 Retirer</button>
        </div>
    </article>`;
}

function _ebRender() {
    const el = errbook.container;
    const d = errbook.data;
    if (!el || !d) return;
    const goal = d.goal || 2;
    const active = d.active || [], mastered = d.mastered || [];
    const byMod = {};
    active.forEach(e => { const m = (e.snap && e.snap.module) || ''; byMod[m] = (byMod[m] || 0) + 1; });
    if (errbook.filter && !byMod[errbook.filter]) errbook.filter = null;
    const list = errbook.filter ? active.filter(e => ((e.snap && e.snap.module) || '') === errbook.filter) : active;
    const nAll = active.length, nList = list.length;

    let h = `<div class="eb">
    <section class="eb-hero">
        <div class="eb-hero-main">
            <h1 class="eb-title">📕 Carnet d'erreurs</h1>
            <p class="eb-sub">Chaque question ratée arrive ici automatiquement (QCM, examen blanc, questions flash des cours). Réponds juste <b>${goal} fois d'affilée</b> pour la faire sortir du carnet.</p>
            <div class="eb-stats">
                <span class="eb-stat"><b>${nAll}</b> à maîtriser</span>
                <span class="eb-stat eb-stat-win"><b>${mastered.length}</b> maîtrisée${mastered.length > 1 ? 's' : ''}</span>
            </div>
        </div>
        <div class="eb-hero-cta">
            <button class="eb-cta" onclick="errbookStart(null, 20)" ${nList ? '' : 'disabled'}>▶ Réviser ${errbook.filter ? 'ce module' : 'mon carnet'}<small>${Math.min(20, nList)} question${Math.min(20, nList) > 1 ? 's' : ''}, les plus ratées d'abord</small></button>
            <button class="eb-cta eb-cta-alt" onclick="errbookStart(null, 10)" ${nList ? '' : 'disabled'}>⚡ Série express<small>10 questions</small></button>
        </div>
    </section>`;

    if (!nAll) {
        h += `<div class="eb-empty">
            <div class="eb-empty-ic">${mastered.length ? '🏆' : '🌱'}</div>
            <div class="eb-empty-t">${mastered.length ? 'Carnet vide : tout est maîtrisé, bravo !' : 'Ton carnet est vide pour l\'instant.'}</div>
            <div class="eb-empty-d">Fais quelques QCM : chaque erreur viendra s'ajouter ici pour que tu la retravailles.</div>
            <button class="eb-btn" onclick="navigate('qcm')">❓ Aller aux QCM</button>
        </div>`;
    } else {
        const mods = Object.keys(byMod).sort((a, b) => byMod[b] - byMod[a]);
        h += `<div class="eb-filters">
            <button class="eb-chip${errbook.filter ? '' : ' on'}" onclick="errbookFilter(null)">Tout <span>${nAll}</span></button>
            ${mods.map(m => `<button class="eb-chip${errbook.filter === m ? ' on' : ''}" onclick="errbookFilter('${escapeAttr(m)}')" title="${escapeAttr(_ebModLabel(m))}">${escapeHtml(m || 'Divers')} <span>${byMod[m]}</span></button>`).join('')}
        </div>
        <div class="eb-list">${list.map(e => _ebCard(e, goal)).join('')}</div>`;
    }

    if (mastered.length) {
        h += `<details class="eb-mastered">
            <summary>🏆 Questions maîtrisées (${mastered.length})</summary>
            <div class="eb-mastered-list">${mastered.slice(0, 200).map(e => `<div class="eb-m-item"><span class="eb-mod">${escapeHtml((e.snap && e.snap.module) || '—')}</span><span>${escapeHtml(((e.snap && e.snap.question) || '').slice(0, 140))}</span><span class="eb-meta">${escapeHtml(_ebAgo(e.mastered))}</span></div>`).join('')}</div>
            <button class="eb-btn eb-btn-ghost" onclick="errbookClearMastered()">🧹 Vider la liste</button>
        </details>`;
    }
    h += `</div>`;
    el.innerHTML = h;
}

function _ebInjectStyles() {
    if (document.getElementById('ebStyles')) return;
    const st = document.createElement('style');
    st.id = 'ebStyles';
    st.textContent = `
    .eb { max-width: 1000px; margin: 0 auto; padding: 22px 20px 60px; }
    .eb-loading { color: var(--text-muted); padding: 40px; text-align: center; }
    .eb-hero { display: flex; flex-wrap: wrap; gap: 18px; align-items: stretch; justify-content: space-between; padding: 22px; border-radius: 18px; background: linear-gradient(135deg, rgba(239,68,68,.12), rgba(245,158,11,.08)); border: 1px solid rgba(239,68,68,.25); margin-bottom: 18px; }
    .eb-hero-main { flex: 1 1 320px; }
    .eb-title { margin: 0 0 6px; font-size: 26px; font-weight: 800; color: var(--text-bright); }
    .eb-sub { margin: 0 0 12px; font-size: 14.5px; line-height: 1.55; color: var(--text-secondary); max-width: 62ch; }
    .eb-stats { display: flex; flex-wrap: wrap; gap: 8px; }
    .eb-stat { font-size: 13px; color: var(--text-secondary); background: rgba(148,163,184,.14); border-radius: 999px; padding: 5px 12px; }
    .eb-stat b { color: #ef4444; font-size: 15px; }
    .eb-stat-win b { color: #16a34a; }
    .eb-hero-cta { display: flex; flex-direction: column; gap: 10px; flex: 0 1 250px; justify-content: center; }
    .eb-cta { text-align: left; cursor: pointer; border: 0; border-radius: 14px; padding: 12px 16px; font-size: 15px; font-weight: 800; color: #fff; background: linear-gradient(135deg, #ef4444, #f97316); box-shadow: 0 6px 18px rgba(239,68,68,.28); transition: transform .12s; }
    .eb-cta:hover:not(:disabled) { transform: translateY(-1px); }
    .eb-cta:disabled { opacity: .45; cursor: not-allowed; }
    .eb-cta small { display: block; font-size: 12px; font-weight: 600; opacity: .9; margin-top: 2px; }
    .eb-cta-alt { background: var(--bg-tertiary, #334155); color: var(--text-bright); box-shadow: none; border: 1px solid rgba(148,163,184,.3); }
    .eb-filters { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 14px; }
    .eb-chip { cursor: pointer; font-size: 13px; font-weight: 700; color: var(--text-secondary); background: var(--bg-secondary, #1e293b); border: 1px solid rgba(148,163,184,.3); border-radius: 999px; padding: 6px 12px; }
    .eb-chip span { opacity: .65; font-weight: 600; margin-left: 2px; }
    .eb-chip.on { color: #fff; background: #ef4444; border-color: #ef4444; }
    .eb-list { display: flex; flex-direction: column; gap: 12px; }
    .eb-card { background: var(--bg-secondary, #1e293b); border: 1px solid rgba(148,163,184,.25); border-left: 4px solid #ef4444; border-radius: 14px; padding: 14px 16px; }
    .eb-card-top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px; }
    .eb-mod { font-size: 11.5px; font-weight: 800; color: #ef4444; background: rgba(239,68,68,.12); border-radius: 6px; padding: 2px 7px; }
    .eb-norm { font-size: 11.5px; font-weight: 700; color: var(--text-secondary); background: rgba(148,163,184,.14); border-radius: 6px; padding: 2px 7px; }
    .eb-meta { font-size: 12px; color: var(--text-muted); }
    .eb-dots { margin-left: auto; display: inline-flex; gap: 4px; }
    .eb-dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid #22c55e; }
    .eb-dot.on { background: #22c55e; }
    .eb-q { font-size: 15px; font-weight: 600; line-height: 1.5; color: var(--text-bright); white-space: pre-line; margin-bottom: 10px; }
    .eb-line { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 14px; line-height: 1.45; padding: 7px 10px; border-radius: 9px; margin-bottom: 6px; }
    .eb-line span { flex: 0 0 auto; font-weight: 700; }
    .eb-line b { font-weight: 600; flex: 1 1 200px; }
    .eb-bad { background: rgba(239,68,68,.09); color: #fca5a5; }
    .eb-good { background: rgba(34,197,94,.09); color: #86efac; }
    .eb-why { margin: 6px 0 4px; font-size: 14px; line-height: 1.55; color: var(--text-secondary); }
    .eb-why summary { cursor: pointer; font-weight: 700; color: var(--text-bright); }
    .eb-why > div { margin-top: 6px; }
    .eb-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .eb-btn { cursor: pointer; font-size: 13px; font-weight: 700; color: #fff; background: #3b82f6; border: 0; border-radius: 9px; padding: 8px 12px; }
    .eb-btn-ghost { background: transparent; color: var(--text-secondary); border: 1px solid rgba(148,163,184,.35); }
    .eb-empty { text-align: center; padding: 40px 20px; border: 2px dashed rgba(148,163,184,.3); border-radius: 18px; }
    .eb-empty-ic { font-size: 44px; }
    .eb-empty-t { font-size: 18px; font-weight: 800; color: var(--text-bright); margin: 8px 0 4px; }
    .eb-empty-d { color: var(--text-secondary); margin-bottom: 14px; }
    .eb-mastered { margin-top: 22px; background: rgba(34,197,94,.06); border: 1px solid rgba(34,197,94,.25); border-radius: 14px; padding: 12px 16px; }
    .eb-mastered summary { cursor: pointer; font-weight: 800; color: var(--text-bright); }
    .eb-mastered-list { display: flex; flex-direction: column; gap: 6px; margin: 10px 0; max-height: 360px; overflow: auto; }
    .eb-m-item { display: flex; gap: 8px; align-items: baseline; font-size: 13px; color: var(--text-secondary); }
    .eb-m-item .eb-mod { color: #16a34a; background: rgba(34,197,94,.12); flex: 0 0 auto; }
    .eb-m-item .eb-meta { margin-left: auto; flex: 0 0 auto; }
    .eb-toast { position: fixed; left: 50%; bottom: 26px; transform: translate(-50%, 20px); opacity: 0; pointer-events: none; z-index: 9999; background: #1e293b; color: #fff; font-size: 14px; font-weight: 700; padding: 11px 18px; border-radius: 999px; box-shadow: 0 10px 30px rgba(0,0,0,.3); transition: opacity .25s, transform .25s; max-width: calc(100vw - 32px); text-align: center; }
    .eb-toast.show { opacity: 1; transform: translate(-50%, 0); }
    .eb-toast-win { background: #16a34a; }
    @media (max-width: 640px) {
        .eb { padding: 14px 12px 50px; }
        .eb-title { font-size: 22px; }
        .eb-hero { padding: 16px; }
        .eb-hero-cta { flex: 1 1 100%; }
        .eb-dots { margin-left: 0; }
        .eb-m-item .eb-meta { display: none; }
        .eb-toast { bottom: 84px; }
    }
    body.light-mode .eb-card, body.light-mode .eb-chip:not(.on) { background: #fff; }
    body.light-mode .eb-bad { color: #b91c1c; background: #fef2f2; }
    body.light-mode .eb-good { color: #15803d; background: #f0fdf4; }
    body.light-mode .eb-cta-alt { background: #fff; color: #0f172a; border-color: #e2e8f0; }
    `;
    document.head.appendChild(st);
}
