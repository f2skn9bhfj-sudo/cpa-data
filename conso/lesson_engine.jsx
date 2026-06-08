/* ===================== Lesson engine (IFRS / Swiss GAAP) =====================
   Moteur data-driven rendu dans le style du wizard (Tailwind, light).
   Le contenu (window.__CONSO_LESSONS__) est une donnée pure → robuste.
   Interactif : quiz cliquables + score, exemples à corrigé masqué,
   sections repliables. ========================================================= */

function MdInline({ text }) {
  if (text == null) return null;
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (/^\*\*[\s\S]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-slate-800">{p.slice(2, -2)}</strong>;
    if (/^`[\s\S]+`$/.test(p)) return <code key={i} className="px-1 py-0.5 rounded bg-slate-100 text-indigo-700 text-[0.85em]">{p.slice(1, -1)}</code>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

function MdBlock({ text, className = "" }) {
  if (!text) return null;
  const lines = String(text).split("\n");
  const out = []; let list = null;
  const flush = (k) => { if (list) { out.push(<ul key={"u" + k} className="list-disc ml-5 space-y-1 my-2">{list.map((li, j) => <li key={j}><MdInline text={li} /></li>)}</ul>); list = null; } };
  lines.forEach((ln, i) => {
    const t = ln.trim();
    if (/^[-•]\s+/.test(t)) { (list = list || []).push(t.replace(/^[-•]\s+/, "")); }
    else { flush(i); if (t) out.push(<p key={"p" + i} className="my-2 leading-relaxed"><MdInline text={t} /></p>); }
  });
  flush("end");
  return <div className={className}>{out}</div>;
}

const L_ACCENT = {
  indigo:  { bar: "bg-indigo-600",  text: "text-indigo-700",  soft: "bg-indigo-50",  ring: "border-indigo-200" },
  cyan:    { bar: "bg-cyan-600",    text: "text-cyan-700",    soft: "bg-cyan-50",    ring: "border-cyan-200" },
  emerald: { bar: "bg-emerald-600", text: "text-emerald-700", soft: "bg-emerald-50", ring: "border-emerald-200" },
  amber:   { bar: "bg-amber-500",   text: "text-amber-700",   soft: "bg-amber-50",   ring: "border-amber-200" },
  violet:  { bar: "bg-violet-600",  text: "text-violet-700",  soft: "bg-violet-50",  ring: "border-violet-200" },
  rose:    { bar: "bg-rose-600",    text: "text-rose-700",    soft: "bg-rose-50",    ring: "border-rose-200" },
  blue:    { bar: "bg-blue-600",    text: "text-blue-700",    soft: "bg-blue-50",    ring: "border-blue-200" },
  teal:    { bar: "bg-teal-600",    text: "text-teal-700",    soft: "bg-teal-50",    ring: "border-teal-200" },
  slate:   { bar: "bg-slate-700",   text: "text-slate-700",   soft: "bg-slate-50",   ring: "border-slate-200" },
};
const lacc = (c) => L_ACCENT[c] || L_ACCENT.indigo;

function LCallout({ tone = "info", title, text }) {
  const map = {
    info: ["bg-slate-50 border-slate-200", <Info size={17} className="shrink-0 mt-0.5 text-slate-400" />, "text-slate-700"],
    tip:  ["bg-indigo-50 border-indigo-200", <ArrowRight size={17} className="shrink-0 mt-0.5 text-indigo-500" />, "text-indigo-800"],
    warn: ["bg-amber-50 border-amber-200", <AlertTriangle size={17} className="shrink-0 mt-0.5 text-amber-500" />, "text-amber-800"],
    key:  ["bg-emerald-50 border-emerald-200", <CheckCircle2 size={17} className="shrink-0 mt-0.5 text-emerald-500" />, "text-emerald-800"],
  };
  const m = map[tone] || map.info;
  return (
    <div className={`flex items-start gap-2.5 border rounded-xl p-3.5 my-3 text-sm ${m[0]}`}>
      {m[1]}
      <div className="min-w-0">
        {title && <div className={`font-semibold mb-0.5 ${m[2]}`}>{title}</div>}
        <div className="text-slate-600"><MdBlock text={text} /></div>
      </div>
    </div>
  );
}

function LTable({ title, headers = [], rows = [] }) {
  return (
    <div className="my-3">
      {title && <div className="text-sm font-semibold text-slate-700 mb-1.5">{title}</div>}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          {headers.length > 0 && <thead><tr className="bg-slate-50 text-slate-500 text-xs">
            {headers.map((h, i) => <th key={i} className="text-left px-3 py-2 font-medium"><MdInline text={h} /></th>)}
          </tr></thead>}
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100 align-top">
                {r.map((c, j) => <td key={j} className={`px-3 py-2 ${j === 0 ? "font-medium text-slate-700" : "text-slate-600"}`}><MdInline text={c} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LCompare({ title = "IFRS vs Swiss GAAP RPC vs CO", rows = [] }) {
  return (
    <div className="my-3">
      <div className="text-sm font-semibold text-slate-700 mb-1.5">{title}</div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-xs">
            <th className="text-left px-3 py-2 font-medium text-slate-500">Critère</th>
            <th className="text-left px-3 py-2 font-semibold text-indigo-700">IFRS</th>
            <th className="text-left px-3 py-2 font-semibold text-emerald-700">Swiss GAAP RPC</th>
            <th className="text-left px-3 py-2 font-semibold text-amber-700">CO</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2 font-medium text-slate-700"><MdInline text={r.crit} /></td>
                <td className="px-3 py-2 text-slate-600"><MdInline text={r.ifrs} /></td>
                <td className="px-3 py-2 text-slate-600"><MdInline text={r.rpc} /></td>
                <td className="px-3 py-2 text-slate-600"><MdInline text={r.co} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LSteps({ title, steps = [], accent = "indigo" }) {
  const a = lacc(accent);
  return (
    <div className="my-3">
      {title && <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>}
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={`shrink-0 w-6 h-6 rounded-full ${a.bar} text-white text-xs font-bold flex items-center justify-center mt-0.5`}>{i + 1}</span>
            <div className="text-sm">
              {s.t && <span className="font-semibold text-slate-800"><MdInline text={s.t} /></span>}
              {s.d && <span className="text-slate-600"> — <MdInline text={s.d} /></span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LKeypoints({ title = "À retenir", items = [], accent = "emerald" }) {
  const a = lacc(accent);
  return (
    <div className={`my-3 rounded-xl border ${a.ring} ${a.soft} p-4`}>
      <div className={`text-sm font-semibold mb-2 ${a.text}`}>{title}</div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 size={15} className={`shrink-0 mt-0.5 ${a.text}`} />
            <span><MdInline text={it} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LJournal({ title, note, lines = [] }) {
  const norm = lines.map((l) => ({ compte: l.compte, debit: l.debit || 0, credit: l.credit || 0 }));
  return <div className="my-3"><Journal n={"✍"} title={title || "Écriture comptable"} note={note} lines={norm} /></div>;
}

function LExample({ title = "Exemple chiffré", statement, solution }) {
  const [show, setShow] = useState(false);
  return (
    <div className="my-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 flex items-center gap-2 border-b border-slate-100">
        <Calculator size={15} className="text-indigo-500" />{title}
      </div>
      <div className="p-4">
        <div className="text-sm text-slate-700"><MdBlock text={statement} /></div>
        {solution && (
          <div className="mt-3">
            <button onClick={() => setShow(!show)} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              <ChevronDown size={14} className={`transition-transform ${show ? "rotate-180" : ""}`} />{show ? "Masquer le corrigé" : "Voir le corrigé"}
            </button>
            {show && <div className="mt-2 pt-3 border-t border-dashed border-slate-200 text-sm text-slate-700"><MdBlock text={solution} /></div>}
          </div>
        )}
      </div>
    </div>
  );
}

function LQuiz({ title = "Quiz express", questions = [] }) {
  const [ans, setAns] = useState({});
  const answered = Object.keys(ans).length;
  const score = questions.reduce((s, q, i) => s + (ans[i] === q.answer ? 1 : 0), 0);
  return (
    <div className="my-3 rounded-xl border border-slate-200 bg-white">
      <div className="bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 flex items-center justify-between border-b border-slate-100">
        <span className="flex items-center gap-2"><GraduationCap size={15} className="text-indigo-500" />{title}</span>
        {answered > 0 && <span className="text-xs font-medium text-slate-500">Score {score}/{questions.length}</span>}
      </div>
      <div className="p-4 space-y-4">
        {questions.map((q, qi) => {
          const chosen = ans[qi]; const done = chosen != null;
          return (
            <div key={qi}>
              <div className="text-sm font-medium text-slate-800 mb-2">{qi + 1}. <MdInline text={q.q} /></div>
              <div className="grid gap-1.5">
                {q.options.map((opt, oi) => {
                  let cls = "border-slate-200 hover:border-indigo-300 text-slate-700";
                  if (done) {
                    if (oi === q.answer) cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
                    else if (oi === chosen) cls = "border-rose-300 bg-rose-50 text-rose-700";
                    else cls = "border-slate-200 text-slate-400";
                  }
                  return (
                    <button key={oi} disabled={done} onClick={() => setAns((p) => ({ ...p, [qi]: oi }))}
                      className={`text-left text-sm border rounded-lg px-3 py-2 transition-colors flex items-center gap-2 ${cls}`}>
                      <span className="shrink-0 w-5 h-5 rounded-full border border-slate-300 text-xs flex items-center justify-center font-medium">{"ABCD"[oi]}</span>
                      <span className="flex-1"><MdInline text={opt} /></span>
                      {done && oi === q.answer && <CheckCircle2 size={15} className="text-emerald-500" />}
                    </button>
                  );
                })}
              </div>
              {done && q.explain && <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2"><MdInline text={q.explain} /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LMnemo({ code, items = [], phrase }) {
  return (
    <div className="my-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
      <div className="text-sm font-bold text-violet-700 mb-2">🧠 Mnémotechnique — {code}</div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-slate-700"><span className="font-bold text-violet-700">{it.l}</span> — <MdInline text={it.t} /></li>
        ))}
      </ul>
      {phrase && <div className="mt-2 text-xs italic text-violet-600">« {phrase} »</div>}
    </div>
  );
}

function LessonBlock({ b }) {
  if (!b || !b.type) return null;
  switch (b.type) {
    case "intro": return <div className="text-[15px] text-slate-700 my-2"><MdBlock text={b.text} /></div>;
    case "heading": return <h3 className="text-base font-bold text-slate-800 mt-5 mb-1"><MdInline text={b.text} /></h3>;
    case "keypoints": return <LKeypoints title={b.title} items={b.items} accent={b.accent} />;
    case "callout": return <LCallout tone={b.tone} title={b.title} text={b.text} />;
    case "table": return <LTable title={b.title} headers={b.headers} rows={b.rows} />;
    case "compare": return <LCompare title={b.title} rows={b.rows} />;
    case "steps": return <LSteps title={b.title} steps={b.steps} accent={b.accent} />;
    case "journal": return <LJournal title={b.title} note={b.note} lines={b.lines} />;
    case "example": return <LExample title={b.title} statement={b.statement} solution={b.solution} />;
    case "quiz": return <LQuiz title={b.title} questions={b.questions} />;
    case "mnemo": return <LMnemo code={b.code} items={b.items} phrase={b.phrase} />;
    default: return null;
  }
}

function LessonSection({ sec, accent = "indigo", defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const a = lacc(accent);
  if (!sec.title) return <div className="mb-2">{(sec.blocks || []).map((b, i) => <LessonBlock key={i} b={b} />)}</div>;
  return (
    <div className="mb-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-slate-50">
        <span className={`w-1.5 h-5 rounded ${a.bar}`}></span>
        <span className="font-semibold text-slate-800 flex-1">{sec.title}</span>
        <ChevronDown size={17} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-1">{(sec.blocks || []).map((b, i) => <LessonBlock key={i} b={b} />)}</div>}
    </div>
  );
}

function LessonView({ lesson, accent = "indigo", onBack }) {
  const a = lacc(lesson.color || accent);
  const secs = lesson.sections || [{ title: null, blocks: lesson.blocks || [] }];
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Retour à la liste</button>
      <div className={`rounded-2xl border ${a.ring} ${a.soft} p-5 mb-4`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{lesson.icon}</span>
          <span className={`text-lg font-bold ${a.text}`}>{lesson.code}</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">{lesson.title}</h2>
        {lesson.tagline && <p className="text-sm text-slate-600 mt-1"><MdInline text={lesson.tagline} /></p>}
      </div>
      {secs.map((s, si) => <LessonSection key={si} sec={s} accent={lesson.color || accent} defaultOpen={si === 0} />)}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mt-4"><ArrowLeft size={15} /> Retour à la liste</button>
    </div>
  );
}

function LessonHub({ pack = {}, domain = "", accent = "indigo" }) {
  const [open, setOpen] = useState(null);
  const lessons = pack.lessons || [];
  if (!lessons.length) return <div className="text-sm text-slate-500 p-8 text-center">Contenu {domain} en préparation…</div>;
  if (open != null) {
    const lesson = lessons.find((l) => l.code === open);
    if (lesson) return <LessonView lesson={lesson} accent={accent} onBack={() => setOpen(null)} />;
  }
  return (
    <div>
      {pack.overview && (
        <div className={`rounded-2xl border ${lacc(accent).ring} ${lacc(accent).soft} p-5 mb-5`}>
          {pack.overview.title && <h2 className="text-lg font-bold text-slate-800 mb-1">{pack.overview.title}</h2>}
          {pack.overview.intro && <div className="text-sm text-slate-600"><MdBlock text={pack.overview.intro} /></div>}
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {lessons.map((l) => {
          const a = lacc(l.color || accent);
          return (
            <button key={l.code} onClick={() => setOpen(l.code)}
              className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{l.icon}</span>
                <span className={`font-bold text-sm ${a.text}`}>{l.code}</span>
              </div>
              <div className="font-semibold text-sm text-slate-800 leading-snug">{l.title}</div>
              {l.tagline && <div className="text-xs text-slate-500 leading-relaxed"><MdInline text={l.tagline} /></div>}
              <span className={`mt-auto text-xs font-semibold ${a.text} flex items-center gap-1 pt-1`}>Ouvrir le cours <ArrowRight size={13} /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
