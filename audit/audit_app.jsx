/* ============================================================
   Audit — app React (même thème que Conso). Charge data/audit.json
   (fetch) et le rend avec le moteur de leçon partagé + composants
   spécifiques (annuaire des 47 normes ISA, QCM interactifs, schémas).
   ============================================================ */

const A_TONE = { key: "key", warn: "warn", info: "info", tip: "tip", example: "tip", legal: "info" };
const ahx = (c) => (typeof c === "string" && c[0] === "#") ? c : "#7c3aed";
const META_KEYS = ["_label", "_icon", "_description", "id", "icon", "color", "num", "code"];

/* Schéma audit (pyramid / flow / matrix) → composant graphique / tableau */
function SchemaView({ schema }) {
  if (!schema || typeof schema !== "object") return null;
  const t = schema.type;
  if (t === "pyramid") return <DPyramid title={schema.title} levels={schema.levels || []} />;
  if (t === "flow") return <DFlow title={schema.title} steps={(schema.levels || schema.steps || []).map((l) => ({ label: l.t || l.label || "", sub: l.d || l.sub || "" }))} />;
  if (t === "matrix") {
    const xs = schema.xlabels || [], ys = schema.ylabels || [], cells = schema.cells || [];
    const cell = (c) => (c && typeof c === "object") ? (c.t || c.v || "") : (c || "");
    return <LTable title={schema.title} headers={["", ...xs]} rows={ys.map((y, i) => [y, ...xs.map((_, j) => cell((cells[i] || [])[j]))])} />;
  }
  return null;
}

/* Callouts audit → LCallout */
function AuditCallouts({ callouts = [] }) {
  return callouts.map((co, i) => <LCallout key={i} tone={A_TONE[co.type] || "info"} title={co.label} text={co.text} />);
}

/* QCM interactif (mcq / questions audit) */
function isMcq(arr) { return Array.isArray(arr) && arr.length > 0 && arr[0] && Array.isArray(arr[0].options) && (arr[0].answer != null); }
function AuditMcq({ items = [], title = "QCM" }) {
  const qs = items.map((m) => ({ q: m.question || m.q, options: m.options, answer: typeof m.answer === "number" ? m.answer : 0, explain: m.explanation || m.explain }));
  return <LQuiz title={title} questions={qs} />;
}

/* Q/R simple (quiz {q,a}) avec révélation */
function QAList({ items = [], title }) {
  return <div className="my-2">{title && <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>}{items.map((qa, i) => <LExample key={i} title={`Q${i + 1}. ${qa.q || ""}`} statement="" solution={qa.a} />)}</div>;
}

/* Rendu générique pour les sous-sections de forme variable */
function AnyAudit({ data, depth = 0 }) {
  if (data == null) return null;
  if (typeof data === "string") return <MdBlock text={data} className="text-sm text-slate-700" />;
  if (typeof data === "number" || typeof data === "boolean") return <span className="text-sm text-slate-700">{String(data)}</span>;
  if (Array.isArray(data)) {
    if (!data.length) return null;
    if (isMcq(data)) return <AuditMcq items={data} />;
    if (data.every((x) => typeof x === "string")) return <ul className="list-disc ml-5 space-y-1 my-2 text-sm text-slate-700">{data.map((x, i) => <li key={i}><MdInline text={x} /></li>)}</ul>;
    return <div className="space-y-2.5 my-2">{data.map((x, i) => {
      const head = x && (x.title || x.label || x.nom || x.q || x.question || x.ref || x.role || x.titre);
      return <div key={i} className="rounded-xl border border-slate-200 bg-white p-3.5">{head ? <div className="text-sm font-semibold text-slate-800 mb-1.5">{<MdInline text={head} />}</div> : null}<AnyAudit data={omitKeys(x, ["title", "label", "nom", "q", "question", "ref", "role", "titre"])} depth={depth + 1} /></div>;
    })}</div>;
  }
  // objet : clés connues d'abord (callouts, schema, body…), puis le reste
  const o = data;
  const parts = [];
  if (o.body) parts.push(<MdBlock key="body" text={o.body} className="text-sm text-slate-700 my-1" />);
  if (o.detail) parts.push(<MdBlock key="detail" text={o.detail} className="text-sm text-slate-700 my-1" />);
  if (o.intro) parts.push(<MdBlock key="intro" text={o.intro} className="text-sm text-slate-700 my-1" />);
  if (o.text && !o.body) parts.push(<MdBlock key="text" text={o.text} className="text-sm text-slate-700 my-1" />);
  if (Array.isArray(o.callouts)) parts.push(<AuditCallouts key="co" callouts={o.callouts} />);
  if (o.schema) parts.push(<SchemaView key="sc" schema={o.schema} />);
  Object.entries(o).forEach(([k, v]) => {
    if (META_KEYS.indexOf(k) >= 0 || ["body", "detail", "intro", "text", "callouts", "schema", "title", "label"].indexOf(k) >= 0) return;
    if (v == null || (Array.isArray(v) && !v.length)) return;
    parts.push(
      <div key={k} className="mt-2.5">
        <div className="text-[11px] font-bold text-violet-500 uppercase tracking-wide mb-1">{k.replace(/_/g, " ")}</div>
        <AnyAudit data={v} depth={depth + 1} />
      </div>
    );
  });
  return <div className="space-y-1">{parts}</div>;
}
function omitKeys(o, keys) { if (!o || typeof o !== "object" || Array.isArray(o)) return o; const r = {}; Object.keys(o).forEach((k) => { if (keys.indexOf(k) < 0) r[k] = o[k]; }); return r; }

/* Section repliable générique */
function ACollapse({ title, accent = "violet", defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const a = lacc(accent);
  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-slate-50">
        <span className={`w-1.5 h-5 rounded ${a.bar}`}></span><span className="font-semibold text-slate-800 flex-1">{title}</span>
        <ChevronDown size={17} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

/* ── Cours ISA complet ── */
function AuditCourse({ std, course, onBack }) {
  const color = std.color || "#7c3aed";
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Retour à l'annuaire</button>
      <div className="rounded-2xl border p-5 mb-4" style={{ borderColor: color + "55", background: color + "12" }}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-white text-sm font-bold px-3 py-1 rounded-lg" style={{ background: color }}>{std.code}</span>
          {course.niveau && <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded">{course.niveau}</span>}
          {course.duree && <span className="text-[11px] text-slate-400">⏱️ {course.duree}</span>}
        </div>
        <h2 className="text-xl font-bold text-slate-800">{std.title_fr}</h2>
        {std.title_en && <p className="text-xs text-slate-400 italic mt-0.5">{std.title_en}</p>}
        {course.tldr && <div className="mt-2"><LCallout tone="tip" title="En 30 secondes" text={course.tldr} /></div>}
      </div>
      {course.stats && course.stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {course.stats.map((s, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="text-base font-bold text-indigo-700"><MdInline text={s.value} /></div>
              <div className="text-xs font-semibold text-slate-700"><MdInline text={s.label} /></div>
              {s.sub && <div className="text-[11px] text-slate-400 leading-snug"><MdInline text={s.sub} /></div>}
            </div>
          ))}
        </div>
      )}
      {course.intro && <div className="text-sm text-slate-700 mb-3"><MdBlock text={course.intro} /></div>}
      {(course.sections || []).map((s, i) => (
        <ACollapse key={i} title={s.titre} accent="violet" defaultOpen={i === 0}>
          {s.body && <MdBlock text={s.body} className="text-sm text-slate-700" />}
          <AuditCallouts callouts={s.callouts || []} />
          {s.schema && <SchemaView schema={s.schema} />}
          {s.compare && <LTable title={s.compare.title} headers={s.compare.headers} rows={s.compare.rows} />}
        </ACollapse>
      ))}
      {course.schema && <ACollapse title={"🧭 " + (course.schema.title || "Schéma de synthèse")}><SchemaView schema={course.schema} /></ACollapse>}
      {course.mnemo && course.mnemo.items && <LMnemo code={course.mnemo.code} items={course.mnemo.items} phrase={course.mnemo.phrase} />}
      {course.synthese && course.synthese.length > 0 && <LKeypoints title="✅ Synthèse" items={course.synthese} accent="emerald" />}
      {course.pieges && course.pieges.length > 0 && <LKeypoints title="⚠️ Pièges d'examen" items={course.pieges} accent="amber" />}
      {course.quiz && course.quiz.length > 0 && <ACollapse title={`🧪 Quiz (${course.quiz.length})`}><QAList items={course.quiz} /></ACollapse>}
      {course.mcq && course.mcq.length > 0 && <ACollapse title={`❓ QCM (${course.mcq.length})`} defaultOpen={false}><AuditMcq items={course.mcq} title="" /></ACollapse>}
    </div>
  );
}

/* ── Annuaire : 7 séries → standards → cours, + recherche ── */
function AuditAnnuaire({ annuaire, cours, onOpen }) {
  const [q, setQ] = useState("");
  const series = (annuaire && annuaire.series) || [];
  const allStd = series.flatMap((s) => (s.standards || []).map((st) => ({ ...st, color: s.color })));
  const query = q.trim().toLowerCase();
  let results = [];
  if (query.length >= 2) {
    results = allStd.filter((st) => {
      const c = cours[st.num] || {};
      const hay = (st.code + " " + st.title_fr + " " + (st.title_en || "") + " " + (c.tldr || "") + " " + (c.intro || "")).toLowerCase();
      return hay.includes(query);
    });
  }
  return (
    <div>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une norme ISA (fraude, échantillonnage, opinion, NCI…)" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" />
      </div>
      {query.length >= 2 ? (
        <div className="space-y-1.5">
          <div className="text-xs text-slate-400 mb-1">{results.length} résultat(s)</div>
          {results.map((st) => <StdRow key={st.num} st={st} onOpen={onOpen} hasCourse={!!cours[st.num]} />)}
        </div>
      ) : (
        series.map((s) => (
          <div key={s.id} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color || "#7c3aed" }}></span>
              <h3 className="text-sm font-bold text-slate-800">{s.label} <span className="text-slate-400 font-normal">({s.range})</span></h3>
            </div>
            {s.intro && <p className="text-xs text-slate-500 mb-2 leading-relaxed"><MdInline text={s.intro} /></p>}
            <div className="grid sm:grid-cols-2 gap-1.5">
              {(s.standards || []).map((st) => <StdRow key={st.num} st={{ ...st, color: s.color }} onOpen={onOpen} hasCourse={!!cours[st.num]} />)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
function StdRow({ st, onOpen, hasCourse }) {
  return (
    <button onClick={() => hasCourse && onOpen(st)} disabled={!hasCourse}
      className={`text-left rounded-xl border p-3 transition-all flex items-start gap-2.5 ${hasCourse ? "bg-white border-slate-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : "bg-slate-50 border-slate-100 opacity-60"}`}>
      <span className="text-white text-[11px] font-bold px-2 py-0.5 rounded shrink-0 mt-0.5" style={{ background: st.color || "#7c3aed" }}>{st.code}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800 leading-snug">{st.title_fr}</span>
        {st.status && <span className="text-[10px] text-slate-400">{st.status}</span>}
      </span>
    </button>
  );
}

/* ── Une sous-section générique (cadre légal, cycles, terrain, outils…) ── */
function AuditGeneric({ section, onBack }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>
      <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 mb-4">
        <div className="flex items-center gap-2"><span className="text-2xl">{section._icon || "📋"}</span><h2 className="text-xl font-bold text-slate-800">{section._label}</h2></div>
        {section._description && <p className="text-sm text-slate-600 mt-1"><MdInline text={section._description} /></p>}
      </div>
      <AnyAudit data={omitKeys(section, ["_label", "_icon", "_description"])} />
    </div>
  );
}

/* ── Accueil Audit (hub) ── */
const AUDIT_ORDER = ["annuaire", "nas", "cadre_legal", "cycles", "procedures_assertions", "quiz", "cas_pratiques", "examens_blancs", "arbres", "comparatifs", "lexique", "outils", "modeles", "terrain", "independance", "fraude", "goingconcern", "timeline", "actualites"];
function AuditHome({ data, onSection }) {
  const keys = AUDIT_ORDER.filter((k) => data[k]);
  Object.keys(data).forEach((k) => { if (k[0] !== "_" && k !== "annuaire_cours" && AUDIT_ORDER.indexOf(k) < 0) keys.push(k); });
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white p-5 shadow">
        <h2 className="text-xl font-bold">Module Audit — NAS / ISA</h2>
        <p className="text-sm text-violet-100 mt-1">Les 47 normes ISA en cours complets, le cadre légal suisse, les cycles, les QCM et tous les outils du réviseur.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {keys.map((k) => { const s = data[k]; return (
          <button key={k} onClick={() => onSection(k)} className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-1.5">
            <div className="flex items-center gap-2"><span className="text-xl">{s._icon || "📋"}</span><span className="font-bold text-sm text-violet-700">{s._label || k}</span></div>
            {s._description && <div className="text-xs text-slate-500 leading-snug"><MdInline text={s._description} /></div>}
            {k === "annuaire" && <div className="text-xs text-slate-400 mt-auto pt-1">47 normes · cours complets</div>}
          </button>
        ); })}
      </div>
    </div>
  );
}

function AuditApp() {
  const [data, setData] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [view, setView] = useState({ k: "home" });
  useEffect(() => {
    let dead = false;
    (async () => {
      for (const p of ["../data/audit.json", "data/audit.json", "/data/audit.json"]) {
        try { const r = await fetch(p); if (r.ok) { const j = await r.json(); if (!dead) setData(j); return; } } catch (e) {}
      }
      if (!dead) setLoadErr("Impossible de charger les données du module Audit.");
    })();
    return () => { dead = true; };
  }, []);
  const go = (v) => { setView(v); try { window.scrollTo(0, 0); } catch (e) {} };
  if (loadErr) return <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8 text-center text-rose-600 text-sm">{loadErr}</div>;
  if (!data) return <div className="min-h-screen bg-slate-100 flex items-center justify-center p-8 text-center text-slate-400 text-sm">Chargement du module Audit…</div>;
  const cours = data.annuaire_cours || {};
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-gradient-to-r from-slate-900 to-violet-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Search size={22} className="text-violet-300" />
          <div><h1 className="text-lg font-bold">Audit — NAS / ISA</h1><p className="text-xs text-violet-200">47 normes ISA · cadre suisse · cycles · QCM · outils</p></div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {view.k === "home" && <AuditHome data={data} onSection={(k) => go(k === "annuaire" ? { k: "annuaire" } : { k: "section", key: k })} />}
        {view.k === "annuaire" && (
          <div>
            <button onClick={() => go({ k: "home" })} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>
            <AuditAnnuaire annuaire={data.annuaire} cours={cours} onOpen={(st) => go({ k: "course", std: st })} />
          </div>
        )}
        {view.k === "course" && <AuditCourse std={view.std} course={cours[view.std.num] || {}} onBack={() => go({ k: "annuaire" })} />}
        {view.k === "section" && <AuditGeneric section={data[view.key] || {}} onBack={() => go({ k: "home" })} />}
      </main>
      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-400">Outil pédagogique — NAS suisses alignées sur les ISA.</footer>
    </div>
  );
}
