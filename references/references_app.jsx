/* ============================================================
   Références — app React (même template que Conso / Audit / Podcasts).
   Données inlinées par build_references.py dans window.__REFS__
   (= data/references.json complet : 12 collections).

   Restaure les 4 sections qui n'étaient plus routées (Leçons, Mémos,
   Consolidation, Restructuration) en plus des 5 existantes, et
   persiste la progression des checklists Terrain (localStorage).

   Cross-références : les codes de normes (RPC 16, IAS 36, art. 727 CO…)
   restent cliquables → popover avec saut interne (Mémos / Leçons) ou
   postMessage au parent (Flashcards liées).
   ============================================================ */

const R_DATA = (typeof window !== "undefined" && window.__REFS__) || {};
const R_LS = "swisscpa_refs_v1";

function rLoad() { try { return JSON.parse(localStorage.getItem(R_LS) || "{}") || {}; } catch (e) { return {}; } }
function rSave(st) { try { localStorage.setItem(R_LS, JSON.stringify(st)); } catch (e) {} }

/* ── Couleurs par catégorie (port fidèle de app.js getColor) ── */
const R_COLORS = {
  "Swiss GAAP RPC": { accent: "#3182ce" }, "IFRS / IAS": { accent: "#38a169" },
  "Audit / ISA": { accent: "#805ad5" }, "Fiscalité": { accent: "#dd6b20" },
  "CO": { accent: "#b45309" }, "Consolidation": { accent: "#3b82f6" },
  "Restructuration": { accent: "#10b981" }, "Droit": { accent: "#9333ea" },
  "TVA": { accent: "#ca8a04" }, "IT": { accent: "#06b6d4" },
};
const rColor = (cat) => (R_COLORS[cat] || { accent: "#64748b" }).accent;
/* Les catégories de données embarquent souvent un emoji ("📏 Seuils CO — Révision") :
   on hash la chaîne vers une couleur stable si pas de correspondance exacte. */
const R_PALETTE = ["#3182ce", "#38a169", "#805ad5", "#dd6b20", "#b45309", "#3b82f6", "#10b981", "#9333ea", "#ca8a04", "#06b6d4", "#e11d48", "#0d9488"];
function rCatColor(cat) {
  if (R_COLORS[cat]) return R_COLORS[cat].accent;
  let h = 0; const s = String(cat || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return R_PALETTE[h % R_PALETTE.length];
}

/* ── Formatage texte (port fidèle de crossref.js formatAnswer) ── */
function rEsc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
const NORM_PATTERNS = [
  /\b(RPC\s*\d+(?:\/\d+)?)\b/gi, /\b(IAS\s*\d+)\b/gi, /\b(IFRS\s*\d+)\b/gi, /\b(ISA\s*\d+)\b/gi,
  /\b(art\.?\s*\d+(?:\s*(?:al\.?\s*\d+)?)?(?:\s*CO)?)\b/gi,
  /\b(art\.?\s*\d+\s*LIFD)\b/gi, /\b(art\.?\s*\d+\s*LTVA)\b/gi, /\b(art\.?\s*\d+\s*LFus)\b/gi,
];
function normalizeNormId(ref) { return ref.toLowerCase().replace(/\s+/g, "").replace(/art\.?/g, "art").replace(/al\.?/g, "al"); }
function addCrossRefs(text) {
  if (!text) return "";
  let html = rEsc(text);
  for (const pattern of NORM_PATTERNS) {
    html = html.replace(pattern, (match) =>
      '<span class="cross-ref" data-norm="' + rEsc(normalizeNormId(match)) + '" data-label="' + rEsc(match) + '">' + match + "</span>");
  }
  return html;
}
function formatLine(line) {
  let html = addCrossRefs(line);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  if (html.includes("⚠️")) html = '<span style="color:#b45309">' + html + "</span>";
  if (html.includes("💡")) html = '<span style="color:#15803d">' + html + "</span>";
  if (/^[①②③④⑤⑥⑦⑧⑨⑩🅰🅱🅲]/.test(html.trim())) html = '<span style="color:#2563eb">' + html + "</span>";
  return html;
}
function renderPipeTable(lines) {
  const rows = lines.filter((l) => !l.match(/^\s*\|[-: |]+\|\s*$/));
  if (!rows.length) return "";
  let html = '<div style="overflow-x:auto;margin:8px 0"><table style="border-collapse:collapse;width:100%;font-size:12px">';
  rows.forEach((row, ri) => {
    const cells = row.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|");
    const tag = ri === 0 ? "th" : "td";
    const style = ri === 0
      ? "background:#eef2ff;color:#4338ca;font-weight:600;padding:6px 10px;border:1px solid #e0e7ff;text-align:left;white-space:nowrap"
      : "padding:5px 10px;border:1px solid #e2e8f0;color:#334155;vertical-align:top";
    html += "<tr>" + cells.map((c) => "<" + tag + ' style="' + style + '">' + formatLine(c.trim()) + "</" + tag + ">").join("") + "</tr>";
  });
  return html + "</table></div>";
}
function formatLines(text) {
  const lines = String(text).split("\n");
  let result = "", i = 0;
  while (i < lines.length) {
    if (lines[i].trim().startsWith("|")) {
      const tbl = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { tbl.push(lines[i]); i++; }
      result += renderPipeTable(tbl);
      continue;
    }
    if (lines[i].trim() === "" && result.endsWith("<br>")) { i++; continue; }
    result += formatLine(lines[i]) + "<br>";
    i++;
  }
  return result.replace(/<br>$/, "");
}
function formatAnswer(text) {
  if (!text) return "";
  if (String(text).includes("```")) {
    return String(text).split("```").map((part, i) => {
      if (i % 2 === 1) {
        let content = part;
        const nl = content.indexOf("\n");
        if (nl !== -1) {
          const hint = content.substring(0, nl).trim();
          if (!hint || /^[a-z]*$/.test(hint)) content = content.substring(nl + 1);
        }
        return '<pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;font-family:Consolas,monospace;font-size:11.5px;overflow-x:auto;line-height:1.55;margin:6px 0;color:#475569;white-space:pre">'
          + content.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</pre>";
      }
      return formatLines(part);
    }).join("");
  }
  return formatLines(text);
}
/* Bloc de texte formaté ; les .cross-ref sont gérés par délégation dans App. */
function Fmt({ text, className }) {
  return <div className={className || "text-[13.5px] leading-relaxed text-slate-600"} dangerouslySetInnerHTML={{ __html: formatAnswer(text) }} />;
}

const rNorm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/* ── Petits composants partagés ── */
function RChip({ active, color, onClick, children }) {
  return (
    <button onClick={onClick}
      className={"px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors " +
        (active ? "text-white" : "bg-white text-slate-600 hover:text-slate-900 border-slate-300")}
      style={active ? { background: color || "#4f46e5", borderColor: color || "#4f46e5" } : {}}>
      {children}
    </button>
  );
}
function RSearch({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1 max-w-md">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-indigo-500 outline-none" />
    </div>
  );
}
function RExpandable({ title, accent, children, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-t border-slate-100">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors">
        <span className="text-sm font-medium text-slate-700">{title}</span>
        <ChevronDown size={15} className={"text-slate-400 shrink-0 transition-transform " + (open ? "rotate-180" : "")} />
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

/* ════════ Sections ════════ */

/* 1. Leçons (courses_ifrs / courses_rpc) — restaurées */
function CoursesSection() {
  const [tab, setTab] = useState("ifrs");
  const list = (tab === "ifrs" ? R_DATA.courses_ifrs : R_DATA.courses_rpc) || [];
  const accent = tab === "ifrs" ? rColor("IFRS / IAS") : rColor("Swiss GAAP RPC");
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <RChip active={tab === "ifrs"} color={rColor("IFRS / IAS")} onClick={() => setTab("ifrs")}>IFRS / IAS ({(R_DATA.courses_ifrs || []).length})</RChip>
        <RChip active={tab === "rpc"} color={rColor("Swiss GAAP RPC")} onClick={() => setTab("rpc")}>Swiss GAAP RPC ({(R_DATA.courses_rpc || []).length})</RChip>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
        {list.map((course, ci) => (
          <div key={tab + ci} className="bg-white rounded-xl border border-slate-200 p-4" style={{ borderLeft: "3px solid " + accent }}>
            <div className="font-semibold text-[15px] text-slate-800 leading-snug">{course.title}</div>
            {course.subtitle && <div className="text-xs text-slate-500 mt-0.5">{course.subtitle}</div>}
            {(course.sections || []).map((sec, si) => (
              <div key={si} className="mt-2.5">
                {sec.t && sec.t !== "Contenu" && <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{sec.t}</div>}
                <Fmt text={sec.c} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 2. Mémos (memo_co / memo_rpc / memo_ifrs) — restaurés */
function MemosSection({ initialQuery }) {
  const [tab, setTab] = useState("ifrs");
  const [q, setQ] = useState(initialQuery || "");
  useEffect(() => { if (initialQuery) setQ(initialQuery); }, [initialQuery]);
  const SETS = {
    co: { label: "CO (droit comptable)", data: R_DATA.memo_co || [], color: rColor("CO") },
    rpc: { label: "Swiss GAAP RPC", data: R_DATA.memo_rpc || [], color: rColor("Swiss GAAP RPC") },
    ifrs: { label: "IFRS / IAS", data: R_DATA.memo_ifrs || [], color: rColor("IFRS / IAS") },
  };
  const cur = SETS[tab];
  const nq = rNorm(q.trim());
  const filtered = cur.data
    .map((m) => {
      if (!nq) return m;
      const inNorm = rNorm(m.norm).includes(nq);
      const items = (m.items || []).filter((it) => inNorm || rNorm(it.t + " " + it.c).includes(nq));
      return items.length ? { ...m, items } : null;
    })
    .filter(Boolean);
  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        {Object.entries(SETS).map(([k, s]) => (
          <RChip key={k} active={tab === k} color={s.color} onClick={() => setTab(k)}>{s.label} ({s.data.length})</RChip>
        ))}
        <div className="ml-auto"><RSearch value={q} onChange={setQ} placeholder="Filtrer les mémos (norme, mot-clé)…" /></div>
      </div>
      {filtered.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Aucun mémo ne correspond.</div>}
      <div className="lg:columns-2 gap-3">
        {filtered.map((m, mi) => (
          <div key={tab + mi + (m.norm || "")} className="bg-white rounded-xl border border-slate-200 mb-3 overflow-hidden break-inside-avoid" style={{ borderLeft: "3px solid " + cur.color }}>
            <div className="px-4 py-3 font-semibold text-[14px]" style={{ color: cur.color }}>{m.norm}</div>
            {(m.items || []).map((it, ii) => (
              <RExpandable key={ii} title={it.t} accent={cur.color} defaultOpen={!!nq}><Fmt text={it.c} /></RExpandable>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 3. Vocabulaire FR/EN (anglais) */
function GlossarySection() {
  const [q, setQ] = useState("");
  const entries = R_DATA.anglais || [];
  const nq = rNorm(q);
  const total = entries.reduce((s, e) => s + (e.terms || []).length, 0);
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <RSearch value={q} onChange={setQ} placeholder="Rechercher un terme (FR ou EN)…" />
        <span className="text-xs text-slate-400">{total} termes</span>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 w-1/2">Français</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">English</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, ei) => {
              const pairs = (entry.terms || []).filter((p) => !nq || rNorm(p[0]).includes(nq) || rNorm(p[1]).includes(nq));
              if (!pairs.length) return null;
              const col = rCatColor(entry.cat);
              return (
                <React.Fragment key={ei}>
                  <tr><td colSpan={2} className="px-4 py-2 text-[13px] font-semibold border-b border-slate-100" style={{ color: col, background: col + "10" }}>{entry.cat}</td></tr>
                  {pairs.map((p, pi) => (
                    <tr key={pi} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-sm text-slate-800 border-b border-slate-100">{p[0]}</td>
                      <td className="px-4 py-2 text-sm text-slate-500 border-b border-slate-100">{p[1]}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* 4. Seuils */
function SeuilsSection() {
  const sections = R_DATA.seuils || [];
  return (
    <div className="lg:columns-2 gap-3">
      {sections.map((section, si) => {
        const col = rCatColor(section.cat);
        return (
          <div key={si} className="bg-white rounded-xl border border-slate-200 mb-3 overflow-hidden break-inside-avoid" style={{ borderLeft: "3px solid " + col }}>
            <div className="px-4 py-3 text-sm font-semibold border-b border-slate-100" style={{ color: col }}>{section.cat}</div>
            {(section.items || []).map((item, ii) => (
              <div key={ii} className="flex items-baseline justify-between gap-4 px-4 py-2.5 border-b border-slate-50">
                <div className="min-w-0">
                  <div className="text-sm text-slate-700">{item.label}</div>
                  {item.extra && <div className="text-xs text-slate-400 mt-0.5">{item.extra}</div>}
                </div>
                <div className="text-sm font-semibold text-amber-600 whitespace-nowrap text-right shrink-0">{item.val}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* 5+8. Sections catégorie → items {t, c} (Consolidation, Restructuration) — restaurées */
function CatItemsSection({ data }) {
  return (
    <div className="lg:columns-2 gap-3">
      {(data || []).map((section, si) => {
        const col = rCatColor(section.cat);
        return (
          <div key={si} className="bg-white rounded-xl border border-slate-200 mb-3 overflow-hidden break-inside-avoid" style={{ borderLeft: "3px solid " + col }}>
            <div className="px-4 py-3 text-sm font-semibold" style={{ color: col }}>{section.cat}</div>
            {(section.items || []).map((it, ii) => (
              <RExpandable key={ii} title={it.t} accent={col}><Fmt text={it.c} /></RExpandable>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* 6. Cas chiffrés — exercices interactifs */
function CasSection() {
  const exercises = R_DATA.cas_chiffres || [];
  const [st, setSt] = useState({});   // {ei: {checked, answers:{fi:val}}}
  const get = (ei) => st[ei] || { checked: false, answers: {} };
  const upd = (ei, patch) => setSt((p) => ({ ...p, [ei]: { ...get(ei), ...patch } }));
  return (
    <div className="max-w-3xl mx-auto">
      {exercises.map((ex, ei) => {
        const col = rCatColor(ex.cat || "Audit / ISA");
        const state = get(ei);
        return (
          <div key={ei} className="bg-white rounded-xl border border-slate-200 mb-4 p-4" style={{ borderLeft: "3px solid " + col }}>
            <div className="font-semibold text-[15px] text-slate-800">{ex.title}</div>
            <div className="text-xs font-medium mb-2" style={{ color: col }}>{ex.cat || ""}</div>
            <Fmt text={ex.enonce} className="text-sm leading-relaxed text-slate-600 mb-4" />
            <div className="flex flex-col gap-3">
              {(ex.fields || []).map((field, fi) => {
                const userVal = state.answers[fi] || "";
                let verdict = null;
                if (state.checked) {
                  const expected = parseFloat(String(field.answer).replace(/['\s]/g, ""));
                  const got = parseFloat(String(userVal).replace(/['\s]/g, ""));
                  const tol = field.tolerance || 0;
                  verdict = !isNaN(got) && Math.abs(got - expected) <= tol;
                }
                return (
                  <div key={fi}>
                    <label className="block text-xs text-slate-500 mb-1">{field.label}</label>
                    <input type="text" value={userVal} disabled={state.checked} placeholder="Ta réponse"
                      onChange={(e) => upd(ei, { answers: { ...state.answers, [fi]: e.target.value } })}
                      className="w-full max-w-xs bg-white border border-slate-300 rounded-md px-3 py-2 text-sm focus:border-indigo-500 outline-none disabled:bg-slate-50 disabled:text-slate-500" />
                    {verdict !== null && (
                      <div className={"mt-1.5 inline-block text-xs px-2.5 py-1 rounded-md font-medium " + (verdict ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200")}>
                        {verdict ? "✓ Correct" : "✗ Réponse attendue : " + field.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              {!state.checked
                ? <button onClick={() => upd(ei, { checked: true })} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">Vérifier</button>
                : <button onClick={() => upd(ei, { checked: false, answers: {} })} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50"><RotateCcw size={13} className="inline -mt-0.5 mr-1" />Recommencer</button>}
            </div>
            {state.checked && ex.correction && (
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                <div className="text-xs font-semibold text-amber-600 mb-2">Correction</div>
                <Fmt text={ex.correction} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* 7. Arbres de décision */
function ArbresSection() {
  const trees = R_DATA.arbres_decision || [];
  const [st, setSt] = useState({});   // {ti: null | stepIdx | 'result:...'}
  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      {trees.map((tree, ti) => {
        const color = tree.color || "#3b82f6";
        const state = st[ti] === undefined ? null : st[ti];
        const steps = tree.steps || [];
        let body;
        if (state === null) {
          body = (
            <div className="text-center py-6">
              <button onClick={() => setSt((p) => ({ ...p, [ti]: 0 }))}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">Commencer</button>
            </div>
          );
        } else if (typeof state === "string" && state.startsWith("result:")) {
          body = (
            <div className="p-4 text-center">
              <div className="text-xs font-semibold text-amber-600 mb-2 uppercase tracking-wide">Résultat</div>
              <div className="bg-slate-50 rounded-lg p-3.5 text-left" style={{ border: "1px solid " + color + "40" }}>
                <Fmt text={state.substring(7)} className="text-sm leading-relaxed text-slate-700" />
              </div>
              <button onClick={() => setSt((p) => ({ ...p, [ti]: null }))}
                className="mt-4 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50"><RotateCcw size={13} className="inline -mt-0.5 mr-1" />Recommencer</button>
            </div>
          );
        } else {
          const step = steps[state];
          const answer = (choice) => {
            const next = choice === "oui" ? step.oui : step.non;
            setSt((p) => ({ ...p, [ti]: (typeof next === "number" && steps[next]) ? next : "result:" + (typeof next === "string" ? next : "Fin du parcours.") }));
          };
          body = step ? (
            <div className="p-4 text-center">
              <div className="text-xs text-slate-400 mb-2">Étape {state + 1} / {steps.length}</div>
              <div className="bg-slate-50 rounded-lg p-3.5 mb-4 text-left"><Fmt text={step.q} className="text-sm leading-relaxed text-slate-700" /></div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => answer("oui")} className="min-w-[100px] px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 text-sm font-semibold hover:bg-emerald-100">Oui</button>
                <button onClick={() => answer("non")} className="min-w-[100px] px-4 py-2 rounded-lg bg-red-50 text-red-700 border border-red-300 text-sm font-semibold hover:bg-red-100">Non</button>
              </div>
            </div>
          ) : null;
        }
        return (
          <div key={ti} className="bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ borderLeft: "3px solid " + color }}>
            <div className="px-4 py-3 font-semibold text-[15px] text-slate-800 border-b border-slate-100">{tree.title}</div>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/* 9. Terrain EY — checklists avec progression PERSISTÉE */
function TerrainSection({ checked, onToggle }) {
  const sections = R_DATA.terrain || [];
  let total = 0, done = 0;
  sections.forEach((s, si) => (s.items || []).forEach((_, ii) => { total++; if (checked[si + "-" + ii]) done++; }));
  const pct = total ? Math.round((100 * done) / total) : 0;
  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-500">Progression (sauvegardée)</span>
          <span className="text-sm font-semibold text-amber-600">{done} / {total} ({pct}%)</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: pct + "%" }} /></div>
      </div>
      <div className="lg:columns-2 gap-3">
      {sections.map((section, si) => {
        const col = rCatColor(section.cat || "Audit / ISA");
        return (
          <div key={si} className="bg-white rounded-xl border border-slate-200 mb-3 overflow-hidden break-inside-avoid" style={{ borderLeft: "3px solid " + col }}>
            <div className="px-4 py-3 text-sm font-semibold border-b border-slate-100" style={{ color: col }}>{section.cat}</div>
            {(section.items || []).map((item, ii) => {
              const key = si + "-" + ii;
              const isDone = !!checked[key];
              return (
                <div key={ii} onClick={() => onToggle(key)}
                  className={"flex items-start gap-3 px-4 py-2.5 border-b border-slate-50 cursor-pointer hover:bg-slate-50 " + (isDone ? "opacity-60" : "")}>
                  <span className={"w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors " + (isDone ? "bg-emerald-500 border-emerald-500" : "border-slate-300")}>
                    {isDone && <Check size={13} className="text-white" />}
                  </span>
                  <div className="min-w-0">
                    <div className={"text-sm font-medium " + (isDone ? "line-through text-slate-400" : "text-slate-700")}>{item.t}</div>
                    {item.c && <Fmt text={item.c} className={"text-[12.5px] leading-relaxed mt-1 " + (isDone ? "text-slate-300" : "text-slate-500")} />}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      </div>
    </div>
  );
}

/* ════════ App ════════ */
function ReferencesApp() {
  const persisted = useMemo(rLoad, []);
  const hashSection = (typeof location !== "undefined" && location.hash || "").replace("#", "");
  const VALID = ["courses", "memos", "glossary", "seuils", "conso", "cas", "arbres", "restruct", "terrain"];
  const [section, setSection] = useState(VALID.includes(hashSection) ? hashSection : (VALID.includes(persisted.section) ? persisted.section : "courses"));
  const [terrain, setTerrain] = useState(persisted.terrain || {});
  const [memoQuery, setMemoQuery] = useState("");
  const [pop, setPop] = useState(null);   // {x, y, normId, label}

  useEffect(() => { rSave({ section, terrain }); }, [section, terrain]);
  useEffect(() => {
    const onHash = () => {
      const h = (location.hash || "").replace("#", "");
      if (VALID.includes(h)) { setSection(h); window.scrollTo(0, 0); }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const D = R_DATA;
  const counts = {
    courses: (D.courses_ifrs || []).length + (D.courses_rpc || []).length,
    memos: (D.memo_co || []).length + (D.memo_rpc || []).length + (D.memo_ifrs || []).length,
    glossary: (D.anglais || []).reduce((s, e) => s + (e.terms || []).length, 0),
    seuils: (D.seuils || []).reduce((s, e) => s + (e.items || []).length, 0),
    conso: (D.consolidation || []).length,
    cas: (D.cas_chiffres || []).length,
    arbres: (D.arbres_decision || []).length,
    restruct: (D.restructuration || []).length,
    terrain: (D.terrain || []).reduce((s, e) => s + (e.items || []).length, 0),
  };
  const sections = [
    { id: "courses", label: "Leçons", icon: <GraduationCap size={16} />, n: counts.courses },
    { id: "memos", label: "Mémos", icon: <FileText size={16} />, n: counts.memos },
    { id: "glossary", label: "Vocabulaire", icon: <Languages size={16} />, n: counts.glossary },
    { id: "seuils", label: "Seuils", icon: <Ruler size={16} />, n: counts.seuils },
    { id: "conso", label: "Consolidation", icon: <Network size={16} />, n: counts.conso },
    { id: "cas", label: "Cas chiffrés", icon: <Calculator size={16} />, n: counts.cas },
    { id: "arbres", label: "Arbres", icon: <GitBranch size={16} />, n: counts.arbres },
    { id: "restruct", label: "Restructuration", icon: <Recycle size={16} />, n: counts.restruct },
    { id: "terrain", label: "Terrain EY", icon: <ClipboardCheck size={16} />, n: counts.terrain },
  ];

  /* Délégation des clics cross-ref (les spans viennent de dangerouslySetInnerHTML) */
  const onMainClick = (e) => {
    const span = e.target.closest && e.target.closest(".cross-ref");
    if (!span) { if (pop) setPop(null); return; }
    e.stopPropagation();
    const rect = span.getBoundingClientRect();
    setPop({
      x: Math.min(rect.left, window.innerWidth - 290),
      y: rect.bottom + window.scrollY + 6,
      normId: span.getAttribute("data-norm") || "",
      label: span.getAttribute("data-label") || span.textContent || "",
    });
  };
  const popAction = (action) => {
    if (!pop) return;
    if (action === "memo") { setMemoQuery(pop.label); setSection("memos"); window.scrollTo(0, 0); }
    else if (action === "course") { setSection("courses"); window.scrollTo(0, 0); }
    else if (action === "flashcards") {
      try { (window.parent || window).postMessage({ type: "refsCrossRef", target: "flashcards", q: pop.label }, "*"); } catch (e) {}
    }
    setPop(null);
  };

  useEffect(() => {
    const close = (e) => { if (!(e.target.closest && e.target.closest(".cross-ref, .ref-popover"))) setPop(null); };
    const esc = (e) => { if (e.key === "Escape") setPop(null); };
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", esc); };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-3 flex-wrap">
          <BookOpen size={26} className="text-indigo-300" />
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-lg font-bold">Références — bibliothèque de révision</h1>
            <p className="text-xs text-indigo-200">Leçons · mémos · vocabulaire · seuils · cas chiffrés · arbres · checklists EY</p>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="bg-white/10 rounded-lg px-3 py-1.5 font-medium">{counts.courses} leçons</span>
            <span className="bg-white/10 rounded-lg px-3 py-1.5 font-medium">{counts.memos} mémos</span>
            <span className="bg-white/10 rounded-lg px-3 py-1.5 font-medium">{counts.glossary} termes EN</span>
            <span className="bg-white/10 rounded-lg px-3 py-1.5 font-medium">{counts.cas} cas · {counts.arbres} arbres</span>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-2 flex gap-1 overflow-x-auto">
          {sections.map((s) => (
            <button key={s.id} onClick={() => { setSection(s.id); if (s.id !== "memos") setMemoQuery(""); window.scrollTo(0, 0); }}
              className={"flex items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors " +
                (section === s.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
              {s.icon}{s.label}
              <span className={"text-[10px] rounded-full px-1.5 py-0.5 " + (section === s.id ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400")}>{s.n}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6" onClick={onMainClick}>
        {section === "courses" && <CoursesSection />}
        {section === "memos" && <MemosSection initialQuery={memoQuery} />}
        {section === "glossary" && <GlossarySection />}
        {section === "seuils" && <SeuilsSection />}
        {section === "conso" && <CatItemsSection data={R_DATA.consolidation} />}
        {section === "cas" && <CasSection />}
        {section === "arbres" && <ArbresSection />}
        {section === "restruct" && <CatItemsSection data={R_DATA.restructuration} />}
        {section === "terrain" && <TerrainSection checked={terrain} onToggle={(k) => setTerrain((p) => ({ ...p, [k]: !p[k] }))} />}
      </main>

      {pop && (
        <div className="ref-popover fixed z-50 bg-white border border-slate-300 rounded-xl shadow-xl p-2 w-[270px]" style={{ left: pop.x, top: pop.y - window.scrollY }}>
          <div className="px-2 py-1.5 text-sm font-semibold text-slate-800 border-b border-slate-100 mb-1">{pop.label}</div>
          <button onClick={() => popAction("memo")} className="w-full text-left px-2 py-1.5 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md">📘 Voir le mémo</button>
          <button onClick={() => popAction("course")} className="w-full text-left px-2 py-1.5 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md">📚 Voir le cours</button>
          <button onClick={() => popAction("flashcards")} className="w-full text-left px-2 py-1.5 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-md">🃏 Flashcards liées</button>
        </div>
      )}

      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
        Codes de normes cliquables (RPC, IAS/IFRS, ISA, art. CO) — progression Terrain sauvegardée localement.
      </footer>
    </div>
  );
}
