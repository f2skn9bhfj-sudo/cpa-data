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

/* ===================== Schémas / graphiques ===================== */
const DHEX = {
  slate: "#94a3b8", gray: "#9ca3af", indigo: "#6366f1", violet: "#8b5cf6", blue: "#3b82f6",
  cyan: "#06b6d4", teal: "#14b8a6", emerald: "#10b981", green: "#22c55e", amber: "#f59e0b",
  orange: "#f97316", rose: "#f43f5e", red: "#ef4444",
};
const dhex = (c) => DHEX[c] || DHEX.indigo;

function DCaption({ text }) {
  if (!text) return null;
  return <div className="text-xs text-slate-400 mt-2 text-center italic"><MdInline text={text} /></div>;
}

/* Spectre 0→100 % avec bandes colorées + légende — LE visuel contrôle/influence */
function DSpectrum({ title, bands = [], caption }) {
  const ticks = Array.from(new Set([0, 100, ...bands.flatMap((b) => [b.from, b.to])])).sort((a, b) => a - b);
  return (
    <div className="my-4">
      {title && <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>}
      <div className="flex h-10 rounded-xl overflow-hidden shadow-inner">
        {bands.map((b, i) => (
          <div key={i} style={{ width: `${b.to - b.from}%`, background: dhex(b.color) }}
            className="h-full flex items-center justify-center text-[10px] font-bold text-white text-center px-1 leading-tight">
            {b.short || ""}
          </div>
        ))}
      </div>
      <div className="relative h-4 mt-1">
        {ticks.map((p) => (
          <span key={p} style={{ left: `${p}%` }} className="absolute -translate-x-1/2 text-[10px] font-medium text-slate-400">{p}%</span>
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-2 mt-2">
        {bands.map((b, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className="w-3 h-3 rounded mt-0.5 shrink-0" style={{ background: dhex(b.color) }}></span>
            <span className="text-slate-600 leading-snug"><MdInline text={b.label} /></span>
          </div>
        ))}
      </div>
      <DCaption text={caption} />
    </div>
  );
}

/* Cascade (goodwill bridge) : + / − / = avec barres proportionnelles */
function DWaterfall({ title, items = [], caption }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value || 0)));
  const col = { add: "#6366f1", sub: "#f43f5e", total: "#10b981" };
  const sign = { add: "+", sub: "−", total: "=" };
  return (
    <div className="my-4">
      {title && <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>}
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-36 sm:w-44 text-xs text-slate-600 text-right shrink-0 leading-snug"><MdInline text={it.label} /></div>
            <div className="flex-1 h-7 bg-slate-50 rounded-md overflow-hidden">
              <div style={{ width: `${(Math.abs(it.value) / max) * 100}%`, background: col[it.kind] || col.add }}
                className={`h-full ${it.kind === "total" ? "rounded-md" : ""}`}></div>
            </div>
            <div className={`w-20 text-sm font-bold text-right shrink-0 tabular-nums ${it.kind === "total" ? "text-emerald-700" : it.kind === "sub" ? "text-rose-600" : "text-indigo-700"}`}>
              {sign[it.kind] || ""}{fmt(Math.abs(it.value))}
            </div>
          </div>
        ))}
      </div>
      <DCaption text={caption} />
    </div>
  );
}

/* Structure de groupe (mère → filiale %, + minoritaires) en SVG */
function DGroup({ parent = {}, pct = 100, child = {}, nci, method, caption }) {
  const minor = nci != null ? nci : (100 - pct);
  const pcol = dhex(parent.color || "indigo");
  const ccol = dhex(child.color || "slate");
  return (
    <div className="my-4">
      <svg viewBox="0 0 440 220" className="w-full max-w-md mx-auto">
        <rect x="160" y="8" width="120" height="48" rx="10" fill={pcol} />
        <text x="220" y="30" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">{parent.label || "Société mère"}</text>
        <text x="220" y="46" textAnchor="middle" fill="#e0e7ff" fontSize="10">{parent.sub || "Consolidante"}</text>
        <line x1="220" y1="56" x2="220" y2="150" stroke="#cbd5e1" strokeWidth="2" />
        <rect x="186" y="92" width="68" height="22" rx="6" fill="#fff" stroke={pcol} />
        <text x="220" y="107" textAnchor="middle" fill={pcol} fontSize="12" fontWeight="800">{pct} %</text>
        <rect x="160" y="150" width="120" height="56" rx="10" fill={ccol} />
        <text x="220" y="173" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">{child.label || "Filiale"}</text>
        <text x="220" y="190" textAnchor="middle" fill="#e2e8f0" fontSize="9.5">{method || child.sub || ""}</text>
        {minor > 0 && (<>
          <rect x="312" y="150" width="118" height="56" rx="10" fill="#fffbeb" stroke="#fcd34d" strokeDasharray="4" />
          <text x="371" y="173" textAnchor="middle" fill="#92400e" fontSize="11" fontWeight="700">Minoritaires</text>
          <text x="371" y="190" textAnchor="middle" fill="#b45309" fontSize="12" fontWeight="800">{minor} %</text>
          <line x1="312" y1="178" x2="280" y2="178" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4" />
        </>)}
      </svg>
      <DCaption text={caption} />
    </div>
  );
}

/* Colonnes IFRS / RPC / CO (ou n colonnes) — comparatif visuel */
function DColumns({ cols = [], caption }) {
  return (
    <div className="my-4">
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(cols.length, 3)}, minmax(0,1fr))` }}>
        {cols.map((c, i) => {
          const a = lacc(c.color);
          return (
            <div key={i} className={`rounded-xl border ${a.ring} overflow-hidden`}>
              <div className={`${a.bar} text-white text-sm font-bold px-3 py-2 text-center`}>{c.title}</div>
              <ul className={`${a.soft} p-3 space-y-1.5`}>
                {(c.items || []).map((it, j) => (
                  <li key={j} className="text-xs text-slate-700 flex gap-1.5 leading-snug"><span className={`${a.text} font-bold`}>›</span><span><MdInline text={it} /></span></li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <DCaption text={caption} />
    </div>
  );
}

/* Flux d'étapes : boîtes + flèches */
function DFlow({ title, steps = [], accent = "indigo", caption }) {
  const a = lacc(accent);
  return (
    <div className="my-4">
      {title && <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>}
      <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div className={`shrink-0 rounded-xl border ${a.ring} ${a.soft} p-3 w-40`}>
              <div className={`text-xs font-bold ${a.text} mb-0.5`}>{i + 1}. <MdInline text={s.label} /></div>
              {s.sub && <div className="text-[11px] text-slate-500 leading-snug"><MdInline text={s.sub} /></div>}
            </div>
            {i < steps.length - 1 && <div className="flex items-center text-slate-300 shrink-0"><ArrowRight size={18} /></div>}
          </React.Fragment>
        ))}
      </div>
      <DCaption text={caption} />
    </div>
  );
}

/* Pyramide (niveaux décroissants) */
function DPyramid({ title, levels = [], accent = "indigo", caption }) {
  const base = dhex(accent);
  return (
    <div className="my-4">
      {title && <div className="text-sm font-semibold text-slate-700 mb-2 text-center">{title}</div>}
      <div className="flex flex-col items-center gap-1">
        {levels.map((l, i) => {
          const w = 100 - i * (55 / Math.max(levels.length - 1, 1));
          return (
            <div key={i} style={{ width: `${w}%`, background: base, opacity: 1 - i * 0.13 }}
              className="rounded-lg text-white text-center px-3 py-2 shadow-sm">
              <div className="text-xs font-bold"><MdInline text={l.t} /></div>
              {l.d && <div className="text-[10px] opacity-90 leading-snug"><MdInline text={l.d} /></div>}
            </div>
          );
        })}
      </div>
      <DCaption text={caption} />
    </div>
  );
}

/* Répartition (barre %) — ex. groupe vs minoritaires */
function DSplit({ title, parts = [], caption }) {
  const tot = parts.reduce((s, p) => s + (p.value || 0), 0) || 1;
  return (
    <div className="my-4">
      {title && <div className="text-sm font-semibold text-slate-700 mb-2">{title}</div>}
      <div className="flex h-10 rounded-lg overflow-hidden">
        {parts.map((p, i) => (
          <div key={i} style={{ width: `${(p.value / tot) * 100}%`, background: dhex(p.color) }}
            className="flex items-center justify-center text-white text-xs font-bold">{p.value}%</div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2 text-xs">
        {parts.map((p, i) => (
          <span key={i} className="flex items-center gap-1.5 text-slate-600"><span className="w-3 h-3 rounded" style={{ background: dhex(p.color) }}></span><MdInline text={p.label} /></span>
        ))}
      </div>
      <DCaption text={caption} />
    </div>
  );
}

function LDiagram({ b }) {
  switch (b.kind) {
    case "spectrum": return <DSpectrum title={b.title} bands={b.bands} caption={b.caption} />;
    case "waterfall": return <DWaterfall title={b.title} items={b.items} caption={b.caption} />;
    case "group": return <DGroup parent={b.parent} pct={b.pct} child={b.child} nci={b.nci} method={b.method} caption={b.caption} />;
    case "columns": return <DColumns cols={b.cols} caption={b.caption} />;
    case "flow": return <DFlow title={b.title} steps={b.steps} accent={b.accent} caption={b.caption} />;
    case "pyramid": return <DPyramid title={b.title} levels={b.levels} accent={b.accent} caption={b.caption} />;
    case "split": return <DSplit title={b.title} parts={b.parts} caption={b.caption} />;
    default: return null;
  }
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
    case "diagram": return <LDiagram b={b} />;
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
