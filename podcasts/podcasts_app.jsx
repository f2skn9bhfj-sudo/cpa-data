/* ============================================================
   Podcasts — app React (même template que Conso / Audit).
   Données inlinées par build_podcasts.py dans window.__PODCASTS__
   (épisodes extraits de data/unified_modules.json > audio_files).
   Lecture via un <audio> unique partagé ; progression, vitesse et
   épisodes « écoutés » persistés en localStorage.
   ============================================================ */

const P_DATA = (typeof window !== "undefined" && window.__PODCASTS__) || { groups: [] };
const P_PREFIX = "../"; // la page vit dans static/podcasts/, les m4a dans static/audio/
const P_RATES = [1, 1.25, 1.5, 1.75, 2];
const P_LS = "swisscpa_podcasts_v1";

function pLoad() { try { return JSON.parse(localStorage.getItem(P_LS) || "{}") || {}; } catch (e) { return {}; } }
function pSave(st) { try { localStorage.setItem(P_LS, JSON.stringify(st)); } catch (e) {} }

function fmtT(s) {
  if (s == null || !isFinite(s)) return "–:––";
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return h ? h + ":" + mm + ":" + ss : m + ":" + ss;
}
function fmtH(total) {
  if (!total || !isFinite(total)) return null;
  const h = Math.floor(total / 3600), m = Math.round((total % 3600) / 60);
  return h ? h + " h " + String(m).padStart(2, "0") : m + " min";
}
const pNorm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const kindLabel = (k) => k === "lecture" ? "🎙️ Cours audio" : k === "podcast" ? "🎧 Podcast" : "🎵 Audio";

function PodcastsApp() {
  const groups = P_DATA.groups || [];
  const all = useMemo(() => {
    const out = [];
    groups.forEach((g) => (g.items || []).forEach((it, i) => out.push({ ...it, _gid: g.id, _gname: g.name, _gcolor: g.color, _num: i + 1 })));
    return out;
  }, []);
  const byId = useMemo(() => { const m = {}; all.forEach((e) => { m[e.id] = e; }); return m; }, [all]);

  /* ── état persistant : positions, écoutés, durées, vitesse, dernier épisode ── */
  const [st, setSt] = useState(() => ({ pos: {}, done: {}, dur: {}, rate: 1, autoNext: true, last: null, ...pLoad() }));
  const stRef = useRef(st);
  useEffect(() => { stRef.current = st; }, [st]);
  const upd = (fn) => setSt((p) => { const n = fn({ ...p, pos: { ...p.pos }, done: { ...p.done }, dur: { ...p.dur } }); pSave(n); return n; });

  /* ── état de lecture ── */
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(null);   // épisode en cours (objet)
  const [paused, setPaused] = useState(true);
  const [cur, setCur] = useState(0);              // position courante (s)
  const audRef = useRef(null);
  const currentRef = useRef(null);
  useEffect(() => { currentRef.current = current; }, [current]);
  const lastSavedRef = useRef(0);

  const audio = () => {
    if (!audRef.current) {
      const a = new Audio();
      a.preload = "metadata";
      a.addEventListener("timeupdate", () => {
        const c = currentRef.current;
        if (!c) return;
        setCur(a.currentTime);
        if (Math.abs(a.currentTime - lastSavedRef.current) >= 3) {
          lastSavedRef.current = a.currentTime;
          upd((n) => { n.pos[c.id] = a.currentTime; n.last = c.id; return n; });
        }
      });
      a.addEventListener("loadedmetadata", () => {
        const c = currentRef.current;
        if (c && isFinite(a.duration) && a.duration > 0) upd((n) => { n.dur[c.id] = a.duration; return n; });
      });
      a.addEventListener("pause", () => { if (!a.ended) setPaused(true); });
      a.addEventListener("play", () => setPaused(false));
      a.addEventListener("ended", () => {
        const c = currentRef.current;
        if (!c) return;
        setPaused(true);
        upd((n) => { n.done[c.id] = true; delete n.pos[c.id]; return n; });
        if (stRef.current.autoNext) {
          const idx = all.findIndex((e) => e.id === c.id);
          const next = all.slice(idx + 1).find((e) => !stRef.current.done[e.id]);
          if (next) { play(next, true); return; }
        }
        setCurrent(null);
      });
      audRef.current = a;
    }
    return audRef.current;
  };

  function play(ep, fresh) {
    const a = audio();
    const c = currentRef.current;
    if (c && c.id === ep.id && !fresh) {            // même épisode → play/pause
      if (a.paused) a.play().catch(() => {}); else a.pause();
      return;
    }
    if (c && !a.paused) a.pause();
    a.src = P_PREFIX + ep.path;
    const s = stRef.current;
    const resume = !fresh && !s.done[ep.id] ? (s.pos[ep.id] || 0) : 0;
    const seekTo = () => { try { if (resume > 1 && resume < (a.duration || Infinity) - 3) a.currentTime = resume; } catch (e) {} };
    a.addEventListener("loadedmetadata", seekTo, { once: true });
    a.playbackRate = s.rate || 1;
    lastSavedRef.current = resume;
    setCur(resume);
    setCurrent(ep);
    upd((n) => { n.last = ep.id; return n; });
    a.play().catch(() => {});
  }
  function closePlayer() {
    const a = audio(), c = currentRef.current;
    if (c && a.currentTime > 1 && !a.ended) upd((n) => { n.pos[c.id] = a.currentTime; return n; });
    a.pause();
    setCurrent(null);
  }
  function seek(v) { const a = audio(); try { a.currentTime = v; } catch (e) {} setCur(v); }
  function skip(d) { const a = audio(); seek(Math.max(0, Math.min((a.duration || Infinity), a.currentTime + d))); }
  function cycleRate() {
    const r = stRef.current.rate || 1;
    const next = P_RATES[(P_RATES.indexOf(r) + 1) % P_RATES.length];
    audio().playbackRate = next;
    upd((n) => { n.rate = next; return n; });
  }
  function toggleDone(ep) {
    upd((n) => { if (n.done[ep.id]) delete n.done[ep.id]; else { n.done[ep.id] = true; delete n.pos[ep.id]; } return n; });
  }

  /* ── espace = play/pause (hors champs de saisie) ── */
  useEffect(() => {
    const h = (e) => {
      if (e.code !== "Space" || !currentRef.current) return;
      const t = (e.target && e.target.tagName) || "";
      if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
      e.preventDefault();
      const a = audio();
      if (a.paused) a.play().catch(() => {}); else a.pause();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ── lecteur persistant : informer la fenêtre parente de l'état (pour le
       mini-lecteur global) + recevoir ses commandes (pause/reprise, fermer) ── */
  useEffect(() => {
    try {
      const parent = (window.parent && window.parent !== window) ? window.parent : null;
      if (!parent) return;
      parent.postMessage({
        type: "podcastState",
        hasCurrent: !!current,
        playing: !!current && !paused,
        title: current ? current.title : "",
        gid: current ? current._gid : "",
        gcolor: current ? current._gcolor : "",
      }, "*");
    } catch (e) {}
  }, [current, paused]);
  useEffect(() => {
    const onMsg = (e) => {
      const d = e && e.data;
      if (!d || d.type !== "podcastCmd") return;
      const c = currentRef.current;
      if (d.cmd === "toggle" && c) play(c);
      else if (d.cmd === "close") closePlayer();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  /* ── préchargement des durées manquantes (séquentiel, metadata seulement) ── */
  useEffect(() => {
    const missing = all.filter((e) => !stRef.current.dur[e.id]);
    if (!missing.length) return;
    let alive = true, i = 0;
    const found = {};
    const flush = () => { if (Object.keys(found).length) upd((n) => { Object.assign(n.dur, found); return n; }); };
    const step = () => {
      if (!alive) return;
      if (i >= missing.length) { flush(); return; }
      const ep = missing[i++];
      const a = new Audio();
      a.preload = "metadata";
      a.onloadedmetadata = () => { if (isFinite(a.duration) && a.duration > 0) found[ep.id] = a.duration; a.removeAttribute("src"); step(); };
      a.onerror = () => step();
      a.src = P_PREFIX + ep.path;
    };
    step();
    return () => { alive = false; flush(); };
  }, []);

  /* ── dérivés ── */
  const doneCount = all.filter((e) => st.done[e.id]).length;
  const durKnown = all.filter((e) => st.dur[e.id]);
  const totalDur = durKnown.length === all.length ? durKnown.reduce((s, e) => s + st.dur[e.id], 0) : null;
  const q = pNorm(query.trim());
  const match = (e) => !q || pNorm(e.title + " " + e.code + " " + e.ref + " " + e._gname).includes(q);
  const visGroups = groups
    .filter((g) => tab === "all" || tab === g.id)
    .map((g) => ({ ...g, items: (g.items || []).filter(match) }))
    .filter((g) => g.items.length > 0);
  const lastEp = st.last && byId[st.last];
  const showResume = lastEp && !st.done[lastEp.id] && (st.pos[lastEp.id] || 0) > 10 && (!current || current.id !== lastEp.id);

  const sections = [{ id: "all", label: "Tous les épisodes", icon: <ListMusic size={16} />, n: all.length }]
    .concat(groups.map((g) => ({ id: g.id, label: g.id + " · " + g.name, icon: <Disc3 size={16} style={{ color: g.color }} />, n: (g.items || []).length })));

  /* ════════ rendu ════════ */
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-3 flex-wrap">
          <Headphones size={26} className="text-indigo-300" />
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-lg font-bold">Podcasts — révision audio</h1>
            <p className="text-xs text-indigo-200">Épisodes NotebookLM · normes IFRS/IAS & audit · lecture suivie, vitesse réglable</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-white/10 rounded-lg px-3 py-1.5 font-medium">{all.length} épisodes</span>
            {totalDur && <span className="bg-white/10 rounded-lg px-3 py-1.5 font-medium flex items-center gap-1.5"><Clock size={13} /> {fmtH(totalDur)}</span>}
            <span className="bg-white/10 rounded-lg px-3 py-1.5 font-medium flex items-center gap-2">
              <CheckCircle2 size={13} className={doneCount ? "text-emerald-400" : "text-slate-400"} />
              {doneCount}/{all.length} écoutés
              <span className="w-16 h-1.5 rounded-full bg-white/20 overflow-hidden inline-block">
                <span className="block h-full bg-emerald-400" style={{ width: (all.length ? Math.round(100 * doneCount / all.length) : 0) + "%" }} />
              </span>
            </span>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-2 flex gap-1 overflow-x-auto">
          {sections.map((s) => (
            <button key={s.id} onClick={() => setTab(s.id)}
              className={"flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors " + (tab === s.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
              {s.icon}{s.label}
              <span className={"text-[10px] rounded-full px-1.5 py-0.5 " + (tab === s.id ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400")}>{s.n}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className={"max-w-5xl mx-auto px-4 py-6 " + (current ? "pb-32" : "")}>
        {/* barre de recherche */}
        <div className="flex items-center gap-2 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un épisode, une norme…"
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-indigo-500 outline-none" />
          </div>
          {query && <button onClick={() => setQuery("")} className="text-xs text-slate-500 hover:text-indigo-600">Effacer</button>}
          <span className="text-xs text-slate-400 ml-auto">{visGroups.reduce((s, g) => s + g.items.length, 0)} résultat(s)</span>
        </div>

        {/* reprendre l'écoute */}
        {showResume && (
          <button onClick={() => play(lastEp)}
            className="w-full text-left mb-5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors p-4 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0"><Play size={16} /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-semibold text-indigo-600 uppercase tracking-wide">Reprendre l'écoute</span>
              <span className="block text-sm font-medium text-slate-800 truncate">{lastEp.title}</span>
            </span>
            <span className="text-xs text-indigo-600 font-semibold shrink-0">à {fmtT(st.pos[lastEp.id])}{st.dur[lastEp.id] ? " / " + fmtT(st.dur[lastEp.id]) : ""}</span>
          </button>
        )}

        {/* groupes par module */}
        {visGroups.map((g) => {
          const gAll = (groups.find((x) => x.id === g.id) || {}).items || [];
          const gDone = gAll.filter((e) => st.done[e.id]).length;
          return (
            <section key={g.id} className="mb-8">
              <h2 className="flex items-center gap-2.5 mb-3 pl-3 border-l-4 rounded-sm" style={{ borderLeftColor: g.color }}>
                <span className="text-[11px] font-bold text-white rounded-md px-2 py-0.5" style={{ background: g.color }}>{g.id}</span>
                <span className="font-bold text-[15px]">{g.name}</span>
                <span className="text-xs text-slate-400 font-medium">{gDone}/{gAll.length} écoutés</span>
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {g.items.map((ep) => {
                  const isCur = current && current.id === ep.id;
                  const playing = isCur && !paused;
                  const dur = st.dur[ep.id];
                  const pos = isCur ? cur : (st.pos[ep.id] || 0);
                  const done = !!st.done[ep.id];
                  const pct = done ? 100 : (dur && pos ? Math.min(100, Math.round(100 * pos / dur)) : 0);
                  return (
                    <div key={ep.id} onClick={() => play(ep)}
                      className={"bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md " + (isCur ? "border-indigo-400 ring-1 ring-indigo-200" : "border-slate-200 hover:border-indigo-300")}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-white rounded px-1.5 py-0.5" style={{ background: ep._gcolor }}>{ep._gid}</span>
                        <span className="text-[11px] text-slate-400">{kindLabel(ep.kind)}</span>
                        <span className="ml-auto text-[11px] text-slate-400 flex items-center gap-1.5">
                          {done && <CheckCircle2 size={14} className="text-emerald-500" />}
                          {dur ? fmtT(dur) : "…"}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-800 leading-snug">{ep.title}</div>
                      {ep.ref && <div className="text-xs text-slate-500 mt-0.5 truncate">{ep.code ? ep.code + " — " : ""}{ep.ref}</div>}
                      {pct > 0 && (
                        <div className="mt-2.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                          <div className={"h-full rounded-full " + (done ? "bg-emerald-400" : "bg-indigo-500")} style={{ width: pct + "%" }} />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2.5">
                        <span className={"inline-flex items-center gap-1.5 text-xs font-semibold " + (playing ? "text-indigo-600" : "text-slate-600")}>
                          {playing ? <Pause size={13} /> : <Play size={13} />}
                          {playing ? "En lecture" : isCur ? "En pause" : (!done && pos > 10) ? "Reprendre à " + fmtT(pos) : "Écouter"}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); toggleDone(ep); }}
                          className={"ml-auto text-[11px] px-2 py-0.5 rounded-md border transition-colors " + (done ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300")}>
                          {done ? "✓ Écouté" : "Marquer écouté"}
                        </button>
                        {(done || pos > 10) && (
                          <button onClick={(e) => { e.stopPropagation(); play(ep, true); }}
                            title="Réécouter depuis le début"
                            className="text-[11px] px-2 py-0.5 rounded-md border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                            <RotateCcw size={11} className="inline -mt-0.5" /> Début
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {visGroups.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Headphones size={40} className="mx-auto mb-3 opacity-40" />
            <div className="text-sm font-medium mb-1">Aucun épisode trouvé</div>
            <div className="text-xs">Essaie un autre terme — la recherche couvre titres, codes et normes.</div>
          </div>
        )}
      </main>

      {/* ── lecteur fixe en bas ── */}
      {current && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur text-white border-t border-slate-700 shadow-2xl">
          <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
            <button onClick={() => play(current)}
              className="w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center shrink-0 transition-colors">
              {paused ? <Play size={20} className="ml-0.5 sm:hidden" /> : <Pause size={20} className="sm:hidden" />}
              {paused ? <Play size={17} className="ml-0.5 hidden sm:block" /> : <Pause size={17} className="hidden sm:block" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold rounded px-1.5 py-0.5 shrink-0 hidden sm:inline" style={{ background: current._gcolor }}>{current._gid}</span>
                <span className="text-sm font-medium truncate">{current.title}</span>
                <span className="ml-auto text-[11px] text-slate-400 tabular-nums shrink-0">{fmtT(cur)} / {fmtT(st.dur[current.id])}</span>
              </div>
              <input type="range" min="0" max={st.dur[current.id] || 0} step="1" value={Math.min(cur, st.dur[current.id] || 0)}
                onChange={(e) => seek(+e.target.value)}
                className="w-full h-2 sm:h-1 mt-1.5 accent-indigo-500 cursor-pointer" />
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button onClick={() => skip(-15)} title="Reculer de 15 s" className="p-2.5 sm:p-2 rounded-lg hover:bg-white/10 active:bg-white/20 text-slate-300"><RotateCcw size={18} /></button>
              <button onClick={() => skip(30)} title="Avancer de 30 s" className="p-2.5 sm:p-2 rounded-lg hover:bg-white/10 active:bg-white/20 text-slate-300"><RotateCw size={18} /></button>
              <button onClick={cycleRate} title="Vitesse de lecture"
                className="text-xs font-bold border border-slate-600 rounded-md px-2 py-1.5 sm:py-1 hover:border-indigo-400 hover:text-indigo-300 transition-colors tabular-nums">{(st.rate || 1) + "×"}</button>
              <button onClick={() => upd((n) => { n.autoNext = !n.autoNext; return n; })}
                title={st.autoNext ? "Enchaînement automatique activé" : "Enchaînement automatique désactivé"}
                className={"hidden sm:block p-2 rounded-lg hover:bg-white/10 transition-colors " + (st.autoNext ? "text-indigo-400" : "text-slate-500")}><Repeat size={16} /></button>
              <button onClick={closePlayer} title="Fermer le lecteur" className="p-2.5 sm:p-2 rounded-lg hover:bg-white/10 active:bg-white/20 text-slate-400"><X size={18} /></button>
            </div>
          </div>
        </div>
      )}

      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
        Audios générés avec NotebookLM (48 kbps mono) — progression sauvegardée localement · espace = lecture/pause.
      </footer>
    </div>
  );
}
