/* ============================================================
   Oral — app React (même thème que Conso). Lit window.__ORAL__
   (= data/oral.json) et le rend avec le moteur de leçon partagé
   (lesson_engine.jsx) + composants spécifiques (flashcards,
   comportements, scénarios, simulateur).
   ============================================================ */

const ORAL_TONE = { key: "key", warn: "warn", tip: "tip", info: "info", example: "tip", legal: "info" };
const hx = (c) => (typeof c === "string" && c[0] === "#") ? c : "#6366f1";

/* Rendu générique pour les sous-objets de forme variable (déroulement,
   présentation, repères, angle oral…). */
function AnyContent({ data }) {
  if (data == null) return null;
  if (typeof data === "string") return <MdBlock text={data} className="text-sm text-slate-700" />;
  if (Array.isArray(data)) {
    if (data.every((x) => typeof x === "string"))
      return <ul className="list-disc ml-5 space-y-1 my-2 text-sm text-slate-700">{data.map((x, i) => <li key={i}><MdInline text={x} /></li>)}</ul>;
    return <div className="space-y-2 my-2">{data.map((x, i) => <div key={i} className="rounded-xl border border-slate-200 bg-white p-3.5">{(x && x.nom) || (x && x.titre) || (x && x.role) ? <div className="text-sm font-semibold text-slate-800 mb-1">{x.nom || x.titre || x.role}</div> : null}<AnyContent data={objWithout(x, ["nom", "titre", "role"])} /></div>)}</div>;
  }
  return <div className="space-y-2.5">{Object.entries(data).map(([k, v]) => (
    <div key={k}><div className="text-[11px] font-bold text-indigo-500 uppercase tracking-wide mb-1">{k.replace(/_/g, " ")}</div><AnyContent data={v} /></div>
  ))}</div>;
}
function objWithout(o, keys) { if (!o || typeof o !== "object" || Array.isArray(o)) return o; const r = {}; Object.keys(o).forEach((k) => { if (keys.indexOf(k) < 0) r[k] = o[k]; }); return r; }

/* Flashcards : carte qui se retourne au clic + précédent/suivant/hasard */
function FlashDeck({ cards = [] }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  if (!cards.length) return null;
  const c = cards[i];
  const go = (d) => { setI((x) => (x + d + cards.length) % cards.length); setFlip(false); };
  return (
    <div className="my-2">
      <div onClick={() => setFlip(!flip)}
        className={`cursor-pointer select-none rounded-2xl border p-6 min-h-[150px] flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all ${flip ? "border-emerald-200 bg-emerald-50/40" : "border-indigo-200 bg-white"}`}>
        <div className={`text-[11px] uppercase tracking-wide font-bold mb-2 ${flip ? "text-emerald-500" : "text-indigo-400"}`}>{flip ? "Réponse" : "Question"} · {i + 1}/{cards.length}</div>
        <div className="text-sm text-slate-800 leading-relaxed"><MdInline text={flip ? c.a : c.q} /></div>
        <div className="text-[11px] text-slate-400 mt-3">↻ cliquer pour {flip ? "la question" : "la réponse"}</div>
      </div>
      <div className="flex items-center justify-between mt-2 text-sm">
        <button onClick={() => go(-1)} className="flex items-center gap-1 text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> Précédent</button>
        <button onClick={() => { setI(Math.floor(Math.random() * cards.length)); setFlip(false); }} className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600"><Shuffle size={13} /> Au hasard</button>
        <button onClick={() => go(1)} className="flex items-center gap-1 text-slate-500 hover:text-indigo-600">Suivant <ArrowRight size={15} /></button>
      </div>
    </div>
  );
}

/* Bloc repliable générique (titre + contenu libre) */
function Collapse({ title, accent = "indigo", defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const a = lacc(accent);
  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-slate-50">
        <span className={`w-1.5 h-5 rounded ${a.bar}`}></span>
        <span className="font-semibold text-slate-800 flex-1">{title}</span>
        <ChevronDown size={17} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

/* Carte « discussion d'experts » avec réponse-modèle révélable */
function ScenarioCard({ s }) {
  const [show, setShow] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 mb-2.5">
      <div className="text-[11px] uppercase tracking-wide font-bold text-violet-500 mb-1">🎭 {s.role}</div>
      {s.contexte && <div className="text-sm text-slate-600 mb-2"><MdBlock text={s.contexte} /></div>}
      {s.question && <div className="text-sm font-semibold text-slate-800 mb-2 bg-slate-50 rounded-lg px-3 py-2"><MdInline text={s.question} /></div>}
      {s.reponse_modele && (
        <div>
          <button onClick={() => setShow(!show)} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"><ChevronDown size={14} className={`transition-transform ${show ? "rotate-180" : ""}`} />{show ? "Masquer la réponse-modèle" : "Voir la réponse-modèle"}</button>
          {show && <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-sm text-slate-700"><MdBlock text={s.reponse_modele} /></div>}
        </div>
      )}
      {show && s.points_cles?.length > 0 && <LKeypoints title="Points clés à mentionner" items={s.points_cles} accent="emerald" />}
      {show && s.pieges?.length > 0 && <LKeypoints title="À éviter" items={s.pieges} accent="amber" />}
    </div>
  );
}

/* Cas chiffré type examen */
function CasCard({ c }) {
  return <LExample title={`${c.niveau || ""} ${c.titre || "Cas"}`.trim()} statement={c.enonce} solution={c.resolution} />;
}

/* ── Vue : cours ── */
function OralCourse({ course, color, onBack }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Retour au thème</button>
      <div className="rounded-2xl border p-5 mb-4" style={{ borderColor: color + "55", background: color + "12" }}>
        <h2 className="text-xl font-bold text-slate-800">{course.title}</h2>
        {course.tagline && <p className="text-sm text-slate-600 mt-1"><MdInline text={course.tagline} /></p>}
      </div>
      {course.objectifs?.length > 0 && <LKeypoints title="🎯 Objectifs" items={course.objectifs} accent="indigo" />}
      {(course.sections || []).map((s, i) => (
        <LessonSection key={i} accent="indigo" defaultOpen={i === 0} sec={{
          title: s.titre, blocks: [
            ...(s.body ? [{ type: "intro", text: s.body }] : []),
            ...((s.callouts || []).map((co) => ({ type: "callout", tone: ORAL_TONE[co.type] || "info", title: co.label, text: co.text }))),
            ...(s.compare ? [{ type: "table", title: s.compare.title, headers: s.compare.headers, rows: s.compare.rows }] : []),
          ]
        }} />
      ))}
      {course.bases?.length > 0 && <Collapse title="⚖️ Bases normatives"><LTable headers={["Référence", "Détail"]} rows={course.bases.map((b) => [b.ref, b.detail])} /></Collapse>}
      {course.exemples?.length > 0 && <Collapse title={`🔢 Exemples chiffrés (${course.exemples.length})`}>{course.exemples.map((e, i) => <LExample key={i} title={e.titre} statement={e.enonce} solution={e.resolution} />)}</Collapse>}
      {course.pieges?.length > 0 && <Collapse title="⚠️ Pièges"><LKeypoints title="À éviter" items={course.pieges} accent="amber" /></Collapse>}
      {course.flashcards?.length > 0 && <Collapse title={`🃏 Flashcards (${course.flashcards.length})`} defaultOpen={false}><FlashDeck cards={course.flashcards} /></Collapse>}
      {course.liens?.length > 0 && <Collapse title="🔗 Liens interdisciplinaires"><ul className="space-y-1.5">{course.liens.map((l, i) => <li key={i} className="text-sm text-slate-700"><span className="font-semibold text-indigo-600">{l.theme}</span> — <MdInline text={l.lien} /></li>)}</ul></Collapse>}
    </div>
  );
}

/* ── Vue : thème (aperçu + cours + scénarios + cas) ── */
function OralTheme({ theme, onCourse, onBack }) {
  const color = hx(theme.color);
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Tous les thèmes</button>
      <div className="rounded-2xl border p-5 mb-4" style={{ borderColor: color + "55", background: color + "12" }}>
        <div className="flex items-center gap-2 mb-1"><span className="text-2xl">{theme.icon}</span><span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>Thème {theme.num}</span></div>
        <h2 className="text-xl font-bold text-slate-800">{theme.title}</h2>
        {theme.tagline && <p className="text-sm text-slate-600 mt-1"><MdInline text={theme.tagline} /></p>}
      </div>
      {theme.apercu && <Collapse title="👁️ Aperçu du thème" defaultOpen={true}><MdBlock text={theme.apercu} className="text-sm text-slate-700" /></Collapse>}
      {theme.angle_oral && <Collapse title="🎤 Angle oral — comment aborder ce thème"><AnyContent data={theme.angle_oral} /></Collapse>}
      <div className="text-sm font-bold text-slate-700 mt-5 mb-2">📚 Cours ({(theme.courses || []).length})</div>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {(theme.courses || []).map((c) => (
          <button key={c.id} onClick={() => onCourse(c)} className="text-left bg-white border border-slate-200 rounded-xl p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="font-semibold text-sm text-slate-800 leading-snug">{c.title}</div>
            {c.tagline && <div className="text-xs text-slate-500 mt-0.5 leading-snug"><MdInline text={c.tagline} /></div>}
            <div className="text-xs text-slate-400 mt-1.5">{(c.flashcards || []).length} flashcards · {(c.exemples || []).length} exemples</div>
          </button>
        ))}
      </div>
      {theme.scenarios?.length > 0 && <><div className="text-sm font-bold text-slate-700 mt-5 mb-2">🎭 Discussions d'experts ({theme.scenarios.length})</div>{theme.scenarios.map((s, i) => <ScenarioCard key={i} s={s} />)}</>}
      {theme.cas_examen?.length > 0 && <><div className="text-sm font-bold text-slate-700 mt-5 mb-2">🧮 Cas chiffrés ({theme.cas_examen.length})</div>{theme.cas_examen.map((c, i) => <CasCard key={i} c={c} />)}</>}
    </div>
  );
}

/* ── Vue : examen (déroulement, présentation, comportements, transversal, repères) ── */
function OralExamen({ examen, onBack }) {
  const comps = examen.comportements || [];
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Accueil</button>
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 mb-4">
        <h2 className="text-xl font-bold text-slate-800">🎤 Réussir l'examen oral</h2>
        <p className="text-sm text-slate-600 mt-1">Déroulement, présentation du comportement, et les 19 comportements possibles.</p>
      </div>
      {examen.deroulement && <Collapse title="🗺️ Déroulement de l'oral" defaultOpen={true}><AnyContent data={examen.deroulement} /></Collapse>}
      {examen.presentation && <Collapse title="🗣️ La présentation du comportement"><AnyContent data={examen.presentation} /></Collapse>}
      {comps.length > 0 && (
        <Collapse title={`🧠 Les ${comps.length} comportements`} defaultOpen={true}>
          <div className="grid sm:grid-cols-2 gap-2">
            {comps.map((c, i) => <ComportementCard key={i} c={c} />)}
          </div>
        </Collapse>
      )}
      {examen.scenarios_transversaux && <Collapse title="🔀 Scénarios transversaux"><AnyContent data={examen.scenarios_transversaux} /></Collapse>}
      {examen.reperes && <Collapse title="📌 Repères & conseils"><AnyContent data={examen.reperes} /></Collapse>}
    </div>
  );
}
function ComportementCard({ c }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full text-left px-3.5 py-3 hover:bg-slate-50 flex items-center gap-2">
        <span className="font-semibold text-sm text-slate-800 flex-1">{c.nom}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 text-sm space-y-2">
          {c.definition && <div className="text-slate-600"><MdInline text={c.definition} /></div>}
          {c.contexte && <div><div className="text-[11px] font-bold text-indigo-500 uppercase mb-0.5">Dans le métier</div><div className="text-slate-600"><MdBlock text={c.contexte} /></div></div>}
          {c.situation_modele && <LCallout tone="tip" title="Situation-type à présenter" text={c.situation_modele} />}
          {c.conseils?.length > 0 && <LKeypoints title="Conseils" items={c.conseils} accent="emerald" />}
          {c.pieges?.length > 0 && <LKeypoints title="Pièges" items={c.pieges} accent="amber" />}
          {c.phrases?.length > 0 && <div><div className="text-[11px] font-bold text-violet-500 uppercase mb-1">Formulations prêtes</div><ul className="space-y-1">{c.phrases.map((p, i) => <li key={i} className="text-slate-700 italic text-xs">« <MdInline text={p} /> »</li>)}</ul></div>}
        </div>
      )}
    </div>
  );
}

/* ── Simulateur : tire un item au hasard, chrono, réponse révélable ── */
function OralSim({ themes, examen, onBack }) {
  const flash = [], scen = [];
  (themes || []).forEach((t) => (t.courses || []).forEach((c) => (c.flashcards || []).forEach((f) => flash.push({ ...f, src: t.title }))));
  (themes || []).forEach((t) => (t.scenarios || []).forEach((s) => scen.push({ ...s, src: t.title })));
  const comps = (examen && examen.comportements) || [];
  const pools = { flash, scen, comp: comps };
  const [mode, setMode] = useState("flash");
  const [item, setItem] = useState(null);
  const [reveal, setReveal] = useState(false);
  const [sec, setSec] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => { if (!running) return; const id = setInterval(() => setSec((s) => s + 1), 1000); return () => clearInterval(id); }, [running]);
  const draw = (m) => { const p = pools[m] || []; if (!p.length) return; setItem(p[Math.floor(Math.random() * p.length)]); setReveal(false); setSec(0); setRunning(true); };
  const mm = String(Math.floor(sec / 60)).padStart(2, "0"), ss = String(sec % 60).padStart(2, "0");
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Accueil</button>
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 mb-4">
        <h2 className="text-xl font-bold text-slate-800">⏱️ Simulateur d'oral</h2>
        <p className="text-sm text-slate-600 mt-1">Tire une question au hasard, réponds à voix haute, puis révèle le modèle. Le chrono t'aide à tenir le rythme.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {[["flash", "🃏 Flashcards"], ["scen", "🎭 Discussions"], ["comp", "🧠 Comportements"]].map(([m, l]) => (
          <button key={m} onClick={() => { setMode(m); draw(m); }} className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === m ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>{l}</button>
        ))}
      </div>
      {!item && <div className="text-sm text-slate-400 p-8 text-center rounded-xl border border-dashed border-slate-200">Choisis un mode pour tirer une première question.</div>}
      {item && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-wide font-bold text-indigo-400">{item.src || "Examen"}</span>
            <span className="flex items-center gap-1.5 text-sm font-mono font-semibold text-slate-500"><Clock size={15} /> {mm}:{ss}</span>
          </div>
          <div className="text-base font-semibold text-slate-800 mb-3">
            {mode === "flash" && <MdInline text={item.q} />}
            {mode === "scen" && <span><span className="text-violet-600">{item.role} : </span><MdInline text={item.question || item.contexte} /></span>}
            {mode === "comp" && <span>Présente une situation où tu as fait preuve de : <span className="text-rose-600">{item.nom}</span></span>}
          </div>
          {!reveal ? (
            <button onClick={() => { setReveal(true); setRunning(false); }} className="rounded-lg bg-indigo-600 text-white text-sm font-medium px-4 py-2 hover:bg-indigo-700">Révéler le modèle</button>
          ) : (
            <div className="pt-3 border-t border-dashed border-slate-200 text-sm text-slate-700">
              {mode === "flash" && <MdBlock text={item.a} />}
              {mode === "scen" && <><MdBlock text={item.reponse_modele} />{item.points_cles?.length > 0 && <LKeypoints title="Points clés" items={item.points_cles} accent="emerald" />}</>}
              {mode === "comp" && <><MdBlock text={item.situation_modele || item.definition} />{item.conseils?.length > 0 && <LKeypoints title="Conseils" items={item.conseils} accent="emerald" />}</>}
            </div>
          )}
          <div className="mt-4 flex justify-end"><button onClick={() => draw(mode)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"><RotateCcw size={14} /> Question suivante</button></div>
        </div>
      )}
    </div>
  );
}

/* ── Accueil ── */
function OralHome({ data, onTheme, onExamen, onSim }) {
  const themes = data.themes || [];
  const intro = data.intro || {};
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-rose-500 to-violet-600 text-white p-5 shadow">
        <h2 className="text-xl font-bold">Préparer l'examen oral</h2>
        <p className="text-sm text-rose-50 mt-1">{intro.duree ? intro.duree + " · " : ""}{intro.poids ? intro.poids + " de la note · " : ""}{intro.format || "7 thèmes, discussion technique & discussion d'experts."}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-2.5">
        <button onClick={onExamen} className="text-left rounded-2xl border border-rose-200 bg-rose-50/60 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center gap-2"><span className="text-xl">🎤</span><span className="font-bold text-sm text-rose-700">Réussir l'oral</span></div>
          <div className="text-xs text-slate-600 mt-1">Déroulement, présentation, les 19 comportements.</div>
        </button>
        <button onClick={onSim} className="text-left rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
          <div className="flex items-center gap-2"><span className="text-xl">⏱️</span><span className="font-bold text-sm text-indigo-700">Simulateur</span></div>
          <div className="text-xs text-slate-600 mt-1">Tire une question au hasard, chrono, réponse-modèle.</div>
        </button>
      </div>
      <div className="text-sm font-bold text-slate-700">📚 Les thèmes</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {themes.map((t) => { const color = hx(t.color); return (
          <button key={t.id} onClick={() => onTheme(t)} className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-1.5" style={{ borderTop: "3px solid " + color }}>
            <div className="flex items-center gap-2"><span className="text-xl">{t.icon}</span><span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>Thème {t.num}</span></div>
            <div className="font-semibold text-sm text-slate-800 leading-snug">{t.title}</div>
            {t.tagline && <div className="text-xs text-slate-500 leading-snug"><MdInline text={t.tagline} /></div>}
            <div className="text-xs text-slate-400 mt-auto pt-1">{(t.courses || []).length} cours · {(t.scenarios || []).length} discussions</div>
          </button>
        ); })}
      </div>
    </div>
  );
}

function OralApp() {
  const O = (typeof window !== "undefined" && window.__ORAL__) || {};
  const [view, setView] = useState({ k: "home" });
  const go = (v) => { setView(v); try { window.scrollTo(0, 0); } catch (e) {} };
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-gradient-to-r from-slate-900 to-rose-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Mic size={24} className="text-rose-300" />
          <div><h1 className="text-lg font-bold">Oral — préparation à l'examen</h1><p className="text-xs text-rose-200">70 min · 50 % de la note · discussion technique & d'experts</p></div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {view.k === "home" && <OralHome data={O} onTheme={(t) => go({ k: "theme", theme: t })} onExamen={() => go({ k: "examen" })} onSim={() => go({ k: "sim" })} />}
        {view.k === "theme" && <OralTheme theme={view.theme} onCourse={(c) => go({ k: "course", course: c, color: hx(view.theme.color) })} onBack={() => go({ k: "home" })} />}
        {view.k === "course" && <OralCourse course={view.course} color={view.color} onBack={() => go({ k: "theme", theme: view._theme || findThemeOf(O, view.course) })} />}
        {view.k === "examen" && <OralExamen examen={O.examen || {}} onBack={() => go({ k: "home" })} />}
        {view.k === "sim" && <OralSim themes={O.themes || []} examen={O.examen || {}} onBack={() => go({ k: "home" })} />}
      </main>
      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-400">Outil pédagogique — prépare l'oral en t'exerçant à voix haute.</footer>
    </div>
  );
}
function findThemeOf(O, course) { return (O.themes || []).find((t) => (t.courses || []).some((c) => c.id === course.id)) || (O.themes || [])[0]; }
