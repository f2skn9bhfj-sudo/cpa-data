/* ════════════════════════════════════════════════════════════════
   Module SOCIAL — droit du travail, assurances sociales & paie (CH).
   Cours (3 chapitres) + calculateur de fiche de salaire interactif + quiz.
   Données : window.__SOCIAL__ (build_social.py). Thème clair, isolé en iframe.
   ════════════════════════════════════════════════════════════════ */

const SEC_COLOR = { contrat: "#4f46e5", assurances: "#0d9488", remuneration: "#d97706" };
const money = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "–";
  const neg = n < 0; n = Math.abs(n);
  let [a, b] = n.toFixed(2).split(".");
  a = a.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return (neg ? "-" : "") + a + "." + b;
};

/* ── markdown léger ── */
function MdInline({ text }) {
  const s = String(text || "");
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} className="bg-slate-100 rounded px-1 text-[0.9em] font-mono">{p.slice(1, -1)}</code>;
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}
function MdBlock({ text }) {
  const blocks = String(text || "").trim().split(/\n\s*\n/);
  return blocks.map((bl, i) => {
    const lines = bl.split("\n").map((l) => l.trim()).filter(Boolean);
    const bullets = lines.filter((l) => /^[-•·]\s+/.test(l));
    if (bullets.length && bullets.length === lines.length) {
      return <ul key={i} className="list-disc pl-5 space-y-1 my-2.5">{lines.map((l, j) => <li key={j} className="text-[13.5px] text-slate-700 leading-relaxed"><MdInline text={l.replace(/^[-•·]\s+/, "")} /></li>)}</ul>;
    }
    return <p key={i} className="text-[13.5px] text-slate-700 leading-relaxed my-2.5 first:mt-0"><MdInline text={bl.replace(/\n/g, " ")} /></p>;
  });
}

const CALLOUTS = {
  cle: { icon: "🎯", label: "À retenir", cls: "border-violet-200 bg-violet-50", lc: "text-violet-700" },
  exemple: { icon: "🧮", label: "Exemple", cls: "border-sky-200 bg-sky-50", lc: "text-sky-700" },
  piege: { icon: "⚠️", label: "Piège", cls: "border-amber-200 bg-amber-50", lc: "text-amber-700" },
  astuce: { icon: "💡", label: "Astuce", cls: "border-emerald-200 bg-emerald-50", lc: "text-emerald-700" },
};
function Callout({ type, children }) {
  const c = CALLOUTS[type] || CALLOUTS.cle;
  return (
    <div className={"rounded-xl border px-3.5 py-2.5 my-2 " + c.cls}>
      <div className={"text-[10.5px] font-bold uppercase tracking-wide mb-1 " + c.lc}>{c.icon} {c.label}</div>
      <div className="text-[13px] text-slate-700 leading-relaxed max-w-[70ch]">{children}</div>
    </div>
  );
}
function LTable({ t }) {
  if (!t || !(t.entetes || []).length) return null;
  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full border-collapse text-[12.5px]">
        {t.titre && <caption className="text-left text-[11px] font-bold text-slate-500 px-3 pt-2">{t.titre}</caption>}
        <thead>
          <tr className="bg-slate-50">{(t.entetes || []).map((h, i) => <th key={i} className={"border-b border-slate-200 px-2.5 py-1.5 text-slate-600 font-bold " + (i === 0 ? "text-left" : "text-right whitespace-nowrap")}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {(t.lignes || []).map((r, i) => <tr key={i} className="border-b border-slate-50 last:border-0">{r.map((c, j) => <td key={j} className={"px-2.5 py-1.5 align-top " + (j === 0 ? "text-left text-slate-700" : "text-right tabular-nums text-slate-600 whitespace-nowrap")}><MdInline text={c} /></td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

/* ── une leçon ── */
function LessonCard({ l, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-3">
      <div className="h-1" style={{ background: color }} />
      <div className="p-4 sm:p-5">
        <h3 className="font-bold text-[16px] text-slate-800 leading-tight">{l.titre}</h3>
        {l.ref && <div className="text-[11px] font-mono mt-0.5" style={{ color }}>{l.ref}</div>}
        <div className="mt-2 max-w-[70ch]"><MdBlock text={l.contenu} /></div>
        {l.tableau && <LTable t={l.tableau} />}
        {l.cle && <Callout type="cle"><MdInline text={l.cle} /></Callout>}
        {l.exemple && <Callout type="exemple"><MdInline text={l.exemple} /></Callout>}
        {l.piege && <Callout type="piege"><MdInline text={l.piege} /></Callout>}
        {l.astuce && <Callout type="astuce"><MdInline text={l.astuce} /></Callout>}
      </div>
    </div>
  );
}

function ChapterView({ section }) {
  const color = SEC_COLOR[section.id] || "#0891b2";
  return (
    <div>
      {section.intro && (
        <div className="rounded-xl border p-4 mb-4 max-w-[72ch]" style={{ borderColor: color + "40", background: color + "0c" }}>
          <div className="text-[13.5px] text-slate-700 leading-relaxed"><MdBlock text={section.intro} /></div>
        </div>
      )}
      {(section.lecons || []).map((l, i) => <LessonCard key={i} l={l} color={color} />)}

      {(section.points_cles || []).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2.5">🎯 Points clés du chapitre</div>
          <ul className="space-y-1.5">
            {section.points_cles.map((p, i) => <li key={i} className="flex gap-2 text-[13px] text-slate-700 leading-snug"><span className="mt-[6px] h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} /><span><MdInline text={p} /></span></li>)}
          </ul>
        </div>
      )}
      {(section.pieges || []).length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 p-4 sm:p-5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-2.5">⚠️ Les pièges à éviter</div>
          <ul className="space-y-2.5">
            {section.pieges.map((p, i) => <li key={i} className="text-[13px] text-slate-700 leading-snug"><span className="font-bold text-slate-800">{p.titre}</span> : <MdInline text={p.texte} /></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ════════ Calculateur de fiche de salaire ════════ */
function calcPaie(inp, P) {
  const brut = Math.max(0, +inp.brut || 0);     // salaire soumis (frais exclus)
  const frais = Math.max(0, +inp.frais || 0);
  const age = +inp.age || 0;
  const retraite = !!inp.retraite;
  const r = {};
  // base AVS : franchise pour les retraités
  const baseAvs = retraite ? Math.max(0, brut - (P.franchise_retraite_mensuelle || 1400)) : brut;
  r.avs = baseAvs * (P.avs.taux / 100);
  // AC : plafonnée, nulle après l'âge de référence
  const acBase = retraite ? 0 : Math.min(brut, P.ac.plafond_mensuel);
  r.ac = acBase * (P.ac.taux / 100);
  // LAA non prof (part employé), plafonnée
  const laaBase = Math.min(brut, P.laa.max_mensuel);
  r.laaNp = laaBase * ((+inp.laaNp || 0) / 100);
  // IJM (part employé)
  r.ijm = brut * ((+inp.ijm || 0) / 100);
  // LPP
  r.coord = 0; r.bonif = 0; r.lppEmp = 0;
  const annual = brut * 12;
  const maxAge = P.lpp.bonifications[P.lpp.bonifications.length - 1].max;
  if (!retraite && annual >= P.lpp.seuil_entree && age >= 25 && age <= maxAge) {
    r.coord = Math.min(Math.max(annual - P.lpp.deduction_coordination, P.lpp.coord_min), P.lpp.coord_max);
    const b = P.lpp.bonifications.find((x) => age >= x.min && age <= x.max);
    r.bonif = b ? b.taux : 0;
    const lppAnnual = r.coord * (r.bonif / 100);
    r.lppEmp = (lppAnnual / 2) / 12;             // moitié employé, mensuel
  }
  r.totalDeduc = r.avs + r.ac + r.laaNp + r.ijm + r.lppEmp;
  r.net = brut - r.totalDeduc + frais;
  // charges employeur
  r.avsEr = baseAvs * (P.avs.taux / 100);
  r.acEr = r.ac;
  r.afEr = brut * ((+inp.af || 0) / 100);
  r.laaApEr = laaBase * ((+inp.laaAp || 0) / 100);
  r.ijmEr = r.ijm;
  r.lppEr = r.lppEmp;
  r.totalEr = r.avsEr + r.acEr + r.afEr + r.laaApEr + r.ijmEr + r.lppEr;
  r.coutTotal = brut + frais + r.totalEr;
  r.brut = brut; r.frais = frais;
  return r;
}
function NumField({ label, value, onChange, step, suffix, hint }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-semibold text-slate-600 mb-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="number" value={value} step={step || 1} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] tabular-nums focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none" />
        {suffix && <span className="text-[12px] text-slate-400 shrink-0">{suffix}</span>}
      </div>
      {hint && <span className="block text-[10.5px] text-slate-400 mt-0.5">{hint}</span>}
    </label>
  );
}
function Row({ label, taux, base, montant, strong, color }) {
  return (
    <div className={"flex items-center gap-2 py-1.5 " + (strong ? "border-t-2 border-slate-300" : "border-b border-slate-50")}>
      <span className={"flex-1 text-[13px] " + (strong ? "font-bold text-slate-800" : "text-slate-700")}>{label}</span>
      {taux != null && <span className="w-16 text-right text-[11.5px] text-slate-400 tabular-nums">{taux}</span>}
      {base != null && <span className="w-24 text-right text-[12px] text-slate-400 tabular-nums hidden sm:block">{base}</span>}
      <span className={"w-28 text-right tabular-nums " + (strong ? "font-bold text-[14px]" : "text-[13px] text-slate-700")} style={strong && color ? { color } : {}}>{montant}</span>
    </div>
  );
}
function SalaryCalculator({ params }) {
  const P = params || {};
  const [inp, setInp] = useState({ brut: 6000, frais: 0, age: 40, retraite: false, af: 1.5, laaNp: (P.laa && P.laa.np_taux_defaut) || 1.4, laaAp: 0.5, ijm: 0 });
  const set = (k) => (v) => setInp((s) => ({ ...s, [k]: v }));
  const r = useMemo(() => calcPaie(inp, P), [inp, P]);
  const cyan = "#0891b2";
  if (!P.avs) return <div className="text-slate-400 text-sm py-10 text-center">Paramètres indisponibles.</div>;

  // écritures
  const ecr = [];
  ecr.push(["5200", "Salaires (brut soumis)", money(r.brut), ""]);
  if (r.frais > 0) ecr.push(["5800", "Frais forfaitaires", money(r.frais), ""]);
  ecr.push(["2270", "Retenue AVS/AI/APG + AC", "", money(r.avs + r.ac)]);
  if (r.lppEmp > 0) ecr.push(["2271", "Retenue LPP (part employé)", "", money(r.lppEmp)]);
  if (r.laaNp > 0) ecr.push(["5730", "Retenue LAA non prof.", "", money(r.laaNp)]);
  if (r.ijm > 0) ecr.push(["5740", "Retenue IJ maladie", "", money(r.ijm)]);
  ecr.push(["1020", "Net versé par la banque", "", money(r.net)]);

  return (
    <div>
      <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-4 mb-4 max-w-[74ch]">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-cyan-700 mb-1">🧮 Calculateur de fiche de salaire {P.annee}</div>
        <p className="text-[13px] text-slate-700 leading-relaxed">Saisis un salaire et observe en direct les déductions de l'employé, le salaire net, les charges de l'employeur et les écritures comptables. Les frais remboursés ne sont pas soumis aux charges sociales.</p>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-4 items-start">
        {/* entrées */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Paramètres</div>
          <NumField label="Salaire brut mensuel (soumis)" value={inp.brut} onChange={set("brut")} step={100} suffix="CHF" />
          <NumField label="Frais remboursés (non soumis)" value={inp.frais} onChange={set("frais")} step={50} suffix="CHF" hint="Ajoutés au net, hors charges sociales." />
          <NumField label="Âge" value={inp.age} onChange={set("age")} suffix="ans" hint="Détermine la bonification LPP." />
          <label className="flex items-center gap-2 text-[12.5px] text-slate-700 cursor-pointer">
            <input type="checkbox" checked={inp.retraite} onChange={(e) => set("retraite")(e.target.checked)} className="rounded" />
            Retraité (franchise AVS, sans AC ni LPP)
          </label>
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
            <NumField label="LAA non prof." value={inp.laaNp} onChange={set("laaNp")} step={0.1} suffix="%" />
            <NumField label="LAA prof. (empl.)" value={inp.laaAp} onChange={set("laaAp")} step={0.1} suffix="%" />
            <NumField label="IJM (part empl.)" value={inp.ijm} onChange={set("ijm")} step={0.1} suffix="%" />
            <NumField label="Alloc. fam. (empl.)" value={inp.af} onChange={set("af")} step={0.01} suffix="%" />
          </div>
        </div>

        {/* sorties */}
        <div className="space-y-3">
          {/* fiche employé */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-800 text-white text-[13px] font-bold flex items-center justify-between">
              <span>Décompte de salaire</span>
              <span className="text-[11px] font-normal text-slate-300">part employé</span>
            </div>
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 pb-1 border-b border-slate-200">
                <span className="flex-1">Élément</span><span className="w-16 text-right">Taux</span><span className="w-24 text-right hidden sm:block">Base</span><span className="w-28 text-right">Montant</span>
              </div>
              <Row label="Salaire brut soumis" montant={money(r.brut)} />
              <Row label="AVS / AI / APG" taux={P.avs.taux + "%"} base={money(inp.retraite ? Math.max(0, r.brut - P.franchise_retraite_mensuelle) : r.brut)} montant={"− " + money(r.avs)} />
              <Row label="Assurance chômage (AC)" taux={inp.retraite ? "—" : P.ac.taux + "%"} base={money(inp.retraite ? 0 : Math.min(r.brut, P.ac.plafond_mensuel))} montant={"− " + money(r.ac)} />
              <Row label="LAA non professionnelle" taux={(+inp.laaNp || 0) + "%"} base={money(Math.min(r.brut, P.laa.max_mensuel))} montant={"− " + money(r.laaNp)} />
              {(+inp.ijm > 0) && <Row label="IJ maladie (part empl.)" taux={(+inp.ijm) + "%"} base={money(r.brut)} montant={"− " + money(r.ijm)} />}
              <Row label={"LPP" + (r.bonif ? " (bonif. " + r.bonif + "%, ½)" : "")} taux={r.bonif ? "" : "—"} base={r.coord ? money(r.coord) + "/an" : "hors LPP"} montant={"− " + money(r.lppEmp)} />
              <Row label="Total des déductions" montant={"− " + money(r.totalDeduc)} strong color="#dc2626" />
              {r.frais > 0 && <Row label="+ Frais remboursés" montant={"+ " + money(r.frais)} />}
              <Row label="Salaire net versé" montant={money(r.net)} strong color="#059669" />
            </div>
          </div>

          {/* charges employeur */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-100 text-slate-700 text-[13px] font-bold">Charges de l'employeur</div>
            <div className="px-4 py-2">
              <Row label="AVS / AI / APG" taux={P.avs.taux + "%"} montant={money(r.avsEr)} />
              <Row label="Assurance chômage (AC)" taux={inp.retraite ? "—" : P.ac.taux + "%"} montant={money(r.acEr)} />
              <Row label="Allocations familiales" taux={(+inp.af || 0) + "%"} montant={money(r.afEr)} />
              <Row label="LAA professionnelle" taux={(+inp.laaAp || 0) + "%"} montant={money(r.laaApEr)} />
              {(+inp.ijm > 0) && <Row label="IJ maladie (part empl.)" montant={money(r.ijmEr)} />}
              <Row label="LPP (part employeur, ≥ ½)" montant={money(r.lppEr)} />
              <Row label="Total charges employeur" montant={money(r.totalEr)} strong color="#0891b2" />
              <Row label="Coût total employeur" montant={money(r.coutTotal)} strong color="#0f172a" />
            </div>
          </div>

          {/* écritures */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-100 text-slate-700 text-[13px] font-bold">Écriture du salaire (journal)</div>
            <div className="px-4 py-2 overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead><tr className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="text-left pb-1 border-b border-slate-200">Cpte</th><th className="text-left pb-1 border-b border-slate-200">Libellé</th><th className="text-right pb-1 border-b border-slate-200">Débit</th><th className="text-right pb-1 border-b border-slate-200">Crédit</th>
                </tr></thead>
                <tbody>
                  {ecr.map((e, i) => <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="py-1 pr-2 font-mono text-slate-500">{e[0]}</td>
                    <td className="py-1 pr-2 text-slate-700">{e[1]}</td>
                    <td className="py-1 text-right tabular-nums text-slate-700">{e[2]}</td>
                    <td className="py-1 text-right tabular-nums text-slate-700">{e[3]}</td>
                  </tr>)}
                </tbody>
              </table>
              <div className="text-[10.5px] text-slate-400 mt-1.5">Méthode du manuel : les retenues LAA/IJM sont créditées aux comptes de charges correspondants. Les charges patronales font l'objet d'une écriture distincte.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════ Quiz ════════ */
function QuizView({ quiz }) {
  const [ans, setAns] = useState({});
  const total = quiz.length;
  const score = quiz.reduce((a, q, i) => a + (ans[i] === q.correct ? 1 : 0), 0);
  const done = Object.keys(ans).length;
  if (!total) return <div className="text-slate-400 text-sm py-10 text-center">Quiz indisponible.</div>;
  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-slate-100/95 backdrop-blur border-b border-slate-200 mb-4 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-600">Quiz · {done}/{total} répondu{done > 1 ? "es" : "e"}</span>
        <span className="text-[13px] font-bold" style={{ color: score === done && done ? "#059669" : "#0891b2" }}>Score : {score}/{total}</span>
      </div>
      <div className="space-y-3">
        {quiz.map((q, i) => {
          const picked = ans[i];
          const answered = picked !== undefined;
          return (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex gap-2">
                <span className="text-[11px] font-bold text-slate-300">{String(i + 1).padStart(2, "0")}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[13.5px] text-slate-800 leading-snug">{q.q}</div>
                  <div className="mt-2 space-y-1.5">
                    {q.choix.map((c, j) => {
                      let cls = "border-slate-200 bg-white hover:border-cyan-300 text-slate-700";
                      if (answered && j === q.correct) cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
                      else if (answered && j === picked) cls = "border-rose-300 bg-rose-50 text-rose-800";
                      return (
                        <button key={j} disabled={answered} onClick={() => setAns((s) => ({ ...s, [i]: j }))}
                          className={"w-full text-left text-[12.5px] rounded-lg border px-3 py-1.5 transition-colors " + cls}>
                          {answered && j === q.correct ? "✓ " : answered && j === picked ? "✗ " : ""}{c}
                        </button>
                      );
                    })}
                  </div>
                  {answered && q.explication && <div className="mt-2 text-[12px] text-slate-500 leading-snug bg-slate-50 rounded-lg px-3 py-2"><span className="font-semibold text-slate-600">Explication : </span><MdInline text={q.explication} /></div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════ Shell ════════ */
function SocialApp() {
  const data = (typeof window !== "undefined" && window.__SOCIAL__) || {};
  const sections = data.sections || [];
  const params = data.parametres_2026 || data.parametres_2024 || {};
  const quiz = data.quiz || [];
  const tabs = [
    ...sections.map((s) => ({ k: s.id, label: (s.icon ? s.icon + " " : "") + s.titre })),
    { k: "calc", label: "🧮 Calculateur" },
    { k: "quiz", label: "🎯 Quiz" },
  ];
  const [view, setView] = useState(sections.length ? sections[0].id : "calc");
  const cur = sections.find((s) => s.id === view);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="text-white" style={{ background: "linear-gradient(135deg,#0f172a 0%,#0e4f56 60%,#0891b2 100%)" }}>
        <div className="max-w-[940px] mx-auto px-4 py-5">
          <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.18em] text-cyan-200 mb-1.5">🤝 Droit social · paie suisse</div>
          <h1 className="text-2xl font-bold leading-tight">Social — travail, assurances sociales & rémunération</h1>
          <p className="text-[13px] text-slate-300 mt-1.5 max-w-[70ch] leading-relaxed">Le cours complet, un calculateur de fiche de salaire interactif et des quiz. Trois chapitres : contrat de travail, assurances sociales, et calcul de la paie.</p>
          {data.source && <p className="text-[11px] text-cyan-200/80 mt-2">Source : {data.source}</p>}
        </div>
      </header>

      <div className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[940px] mx-auto px-4 py-2 flex gap-1.5 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.k} onClick={() => { setView(t.k); try { window.scrollTo(0, 0); } catch (e) {} }}
              className={"text-[12.5px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors " + (view === t.k ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-cyan-300")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-[940px] mx-auto px-4 py-6">
        {cur ? <ChapterView section={cur} />
          : view === "calc" ? <SalaryCalculator params={params} />
          : view === "quiz" ? <QuizView quiz={quiz} />
          : <div className="text-slate-400 text-sm py-10 text-center">Contenu en préparation…</div>}
        {!sections.length && cur === undefined && view !== "calc" && view !== "quiz" && (
          <div className="text-slate-400 text-sm py-10 text-center">Le cours est en cours de chargement…</div>
        )}
      </main>
      <footer className="max-w-[940px] mx-auto px-4 py-6 text-center text-xs text-slate-400">Outil pédagogique — valeurs {params.annee || "2024"}, à vérifier avec les barèmes officiels en vigueur.</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<SocialApp />);
