/* ===================== Fusions & opérations assimilées =====================
   App satellite « Fusion » (DSCG UE4 · règlement ANC 2017-01) sur le modèle de
   l'app Consolidation : contenu = donnée pure (window.__FUSION__), rendu par le
   lesson_engine partagé (blocs intro/callout/table/steps/journal/example/quiz…).

   Ce fichier fournit :
     1. le PRÉLUDE dont le lesson_engine a besoin (icônes, Journal) ;
     2. le calculateur de fusion (parité, titres à créer, prime, boni/mali) ;
     3. la coque de l'app (accueil, chapitres, méthode, cas DSCG, mémo comptes).
   ========================================================================== */

const { useState, useMemo } = React;

/* ---------- Icônes (SVG inline : aucune dépendance externe) ---------- */
const _ico = (d, extra) => ({ size = 16, className = "", strokeWidth = 2 }) =>
  React.createElement("svg", {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
    className,
  }, extra ? [React.createElement("path", { key: "p", d }), extra] : React.createElement("path", { d }));

const ChevronDown = _ico("m6 9 6 6 6-6");
const ArrowLeft = _ico("m12 19-7-7 7-7M19 12H5");
const ArrowRight = _ico("M5 12h14M12 5l7 7-7 7");
const Info = _ico("M12 16v-4M12 8h.01", React.createElement("circle", { key: "c", cx: 12, cy: 12, r: 10 }));
const AlertTriangle = _ico("M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01");
const CheckCircle2 = _ico("m9 12 2 2 4-4", React.createElement("circle", { key: "c", cx: 12, cy: 12, r: 10 }));
const Calculator = _ico("M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h4", React.createElement("rect", { key: "r", x: 4, y: 2, width: 16, height: 20, rx: 2 }));
const GraduationCap = _ico("M22 10 12 5 2 10l10 5 10-5zM6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5");
const Search = _ico("m21 21-4.3-4.3", React.createElement("circle", { key: "c", cx: 11, cy: 11, r: 8 }));

/* ---------- Journal comptable (utilisé par le bloc "journal") ---------- */
const _fmt = (n) => (n === 0 || n == null || n === "") ? "" :
  (typeof n === "number" ? n.toLocaleString("fr-CH", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : String(n));

function Journal({ n, title, note, lines = [] }) {
  const tot = lines.reduce((a, l) => ({
    d: a.d + (typeof l.debit === "number" ? l.debit : 0),
    c: a.c + (typeof l.credit === "number" ? l.credit : 0),
  }), { d: 0, c: 0 });
  const equilibre = Math.abs(tot.d - tot.c) < 0.01;
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <span className="text-teal-600 text-sm">{n || "✍"}</span>
        <span className="text-sm font-semibold text-slate-700">{title}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-slate-400">
            <th className="text-left px-4 py-1.5 font-semibold">Compte</th>
            <th className="text-left px-2 py-1.5 font-semibold">Libellé</th>
            <th className="text-right px-3 py-1.5 font-semibold">Débit</th>
            <th className="text-right px-4 py-1.5 font-semibold">Crédit</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="px-4 py-1.5 font-mono text-[12px] text-teal-700 whitespace-nowrap align-top">{l.compte}</td>
              <td className="px-2 py-1.5 text-slate-600 align-top">{l.libelle || l.label || ""}</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-slate-700 align-top">{_fmt(l.debit)}</td>
              <td className="px-4 py-1.5 text-right tabular-nums text-slate-700 align-top">{_fmt(l.credit)}</td>
            </tr>
          ))}
          {lines.length > 1 && (
            <tr className="border-t-2 border-slate-200 bg-slate-50/60 font-semibold">
              <td className="px-4 py-1.5 text-[11px] uppercase tracking-wide text-slate-400" colSpan={2}>Total</td>
              <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">{_fmt(tot.d)}</td>
              <td className="px-4 py-1.5 text-right tabular-nums text-slate-700">{_fmt(tot.c)}</td>
            </tr>
          )}
        </tbody>
      </table>
      {(note || !equilibre) && (
        <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-500">
          {!equilibre && <span className="text-rose-600 font-semibold">Écriture déséquilibrée — </span>}
          {note}
        </div>
      )}
    </div>
  );
}

/* Surcharge du bloc "journal" du moteur partagé : sa version d'origine ne
   conserve que compte/débit/crédit et PERD le libellé. En fusion, le libellé
   (« Prime de fusion », « Société absorbée, compte d'apport ») fait partie de
   la réponse attendue à l'examen : on le garde. */
function LJournal({ title, note, lines = [] }) {
  return <div className="my-3"><Journal n="✍" title={title || "Écriture comptable"} note={note} lines={lines} /></div>;
}

/* ===================== Calculateur de fusion ===================== */
const _n = (v) => { const x = parseFloat(String(v).replace(/[^\d.,-]/g, "").replace(",", ".")); return isNaN(x) ? 0 : x; };
function pgcd(a, b) { a = Math.round(Math.abs(a)); b = Math.round(Math.abs(b)); while (b) { const t = b; b = a % b; a = t; } return a || 1; }

function FusionCalc() {
  const [f, setF] = useState({
    nomA: "Absorbante", nomB: "Absorbée",
    nA: "10000", vnA: "100", vrA: "300",
    nB: "6000", vrB: "200",
    apport: "1200000",          // valeur globale d'apport retenue (comptable OU réelle)
    partA: "0",                 // titres de B déjà détenus par A
    vcTitres: "0",              // valeur comptable nette de ces titres chez A
    soulteUnit: "0",            // soulte par action B échangée
  });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const r = useMemo(() => {
    const nA = _n(f.nA), vnA = _n(f.vnA), vrA = _n(f.vrA);
    const nB = _n(f.nB), vrB = _n(f.vrB), apport = _n(f.apport);
    const partA = _n(f.partA), vcTitres = _n(f.vcTitres), soulteUnit = _n(f.soulteUnit);
    if (!vrA || !nB) return null;
    const parite = vrB / vrA;                              // actions A pour 1 action B
    const g = pgcd(Math.round(vrB), Math.round(vrA));
    const fracN = Math.round(vrB) / g, fracD = Math.round(vrA) / g;
    const titresARemunerer = Math.max(0, nB - partA);      // fusion-renonciation
    const titresCrees = titresARemunerer * parite;
    const augCapital = titresCrees * vnA;
    const quotePart = nB ? titresARemunerer / nB : 0;
    const remuneration = apport * quotePart;               // apport rémunéré par titres
    const soulte = soulteUnit * titresARemunerer;
    const prime = remuneration - augCapital - soulte;
    // boni / mali sur la participation détenue antérieurement
    const qpPart = nB ? partA / nB : 0;
    const apportPart = apport * qpPart;
    const boniMali = partA > 0 ? apportPart - vcTitres : 0;
    // contrôle post-fusion → sens de l'opération
    const pctExB = (nA + titresCrees) ? titresCrees / (nA + titresCrees) : 0;
    return { nA, vnA, vrA, nB, vrB, apport, partA, parite, fracN, fracD, titresARemunerer,
      titresCrees, augCapital, remuneration, soulte, prime, boniMali, apportPart, vcTitres, pctExB };
  }, [f]);

  const F = (x, d = 2) => x == null ? "—" : x.toLocaleString("fr-CH", { minimumFractionDigits: d, maximumFractionDigits: d });
  const inp = "w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none tabular-nums";
  const lab = "block text-[11px] font-semibold text-slate-500 mb-1";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-teal-200 bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
          <span className="font-bold text-teal-900">🧮 Calculateur de fusion</span>
          <span className="text-[11px] text-teal-600 ml-2">parité · titres à créer · prime · boni/mali · sens de l'opération</span>
        </div>
        <div className="p-5 grid md:grid-cols-2 gap-5">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Société absorbante</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3"><label className={lab}>Nom</label><input className={inp} value={f.nomA} onChange={set("nomA")} /></div>
              <div><label className={lab}>Nb titres</label><input className={inp} value={f.nA} onChange={set("nA")} /></div>
              <div><label className={lab}>Valeur nominale</label><input className={inp} value={f.vnA} onChange={set("vnA")} /></div>
              <div><label className={lab}>Valeur réelle / titre</label><input className={inp} value={f.vrA} onChange={set("vrA")} /></div>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Société absorbée</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3"><label className={lab}>Nom</label><input className={inp} value={f.nomB} onChange={set("nomB")} /></div>
              <div><label className={lab}>Nb titres</label><input className={inp} value={f.nB} onChange={set("nB")} /></div>
              <div><label className={lab}>Valeur réelle / titre</label><input className={inp} value={f.vrB} onChange={set("vrB")} /></div>
              <div><label className={lab}>Valeur d'apport globale</label><input className={inp} value={f.apport} onChange={set("apport")} /></div>
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Participation préalable & soulte (facultatif)</div>
            <div className="grid sm:grid-cols-3 gap-2">
              <div><label className={lab}>Titres de {f.nomB} détenus par {f.nomA}</label><input className={inp} value={f.partA} onChange={set("partA")} /></div>
              <div><label className={lab}>Valeur comptable nette de ces titres</label><input className={inp} value={f.vcTitres} onChange={set("vcTitres")} /></div>
              <div><label className={lab}>Soulte par action échangée</label><input className={inp} value={f.soulteUnit} onChange={set("soulteUnit")} /></div>
            </div>
          </div>
        </div>
      </div>

      {r && (
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Rapport d'échange</div>
            <div className="text-3xl font-bold text-teal-700 tabular-nums">{F(r.parite, 4)}</div>
            <div className="text-sm text-slate-500 mt-1">action{r.parite > 1 ? "s" : ""} {f.nomA} pour 1 action {f.nomB}</div>
            <div className="mt-2 inline-block rounded-lg bg-teal-50 border border-teal-200 px-3 py-1.5 text-sm font-semibold text-teal-800">
              soit {F(r.fracN, 0)} pour {F(r.fracD, 0)}
            </div>
            <div className="mt-3 text-xs text-slate-500 leading-relaxed">
              Parité = valeur réelle du titre absorbé ÷ valeur réelle du titre absorbant = {F(r.vrB, 2)} ÷ {F(r.vrA, 2)}.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Titres à créer</div>
            <div className="text-3xl font-bold text-teal-700 tabular-nums">{F(r.titresCrees, 0)}</div>
            <div className="text-sm text-slate-500 mt-1">
              {F(r.titresARemunerer, 0)} titre(s) à rémunérer × {F(r.parite, 4)}
              {r.partA > 0 && <span className="block text-amber-700 mt-1">Fusion-renonciation : {F(r.partA, 0)} titre(s) déjà détenu(s) ne sont pas rémunérés.</span>}
            </div>
            {Math.abs(r.titresCrees - Math.round(r.titresCrees)) > 0.001 && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                Nombre non entier : à l'examen, prévoir des rompus (achat/vente de titres) ou une soulte.
              </div>
            )}
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wide text-slate-400">
              Décomposition de la rémunération des apports
            </div>
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["Valeur d'apport retenue (globale)", r.apport, "Selon la règle de valorisation : valeur comptable ou valeur réelle."],
                  ["Fraction rémunérée par des titres", r.remuneration, r.partA > 0 ? `${F(r.titresARemunerer, 0)}/${F(r.nB, 0)} de l'apport` : "totalité de l'apport"],
                  ["− Augmentation de capital", -r.augCapital, `${F(r.titresCrees, 0)} titres × ${F(r.vnA, 2)} de nominal`],
                  ...(r.soulte ? [["− Soulte versée", -r.soulte, "Doit rester ≤ 10 % du nominal des titres émis pour conserver le régime fiscal de faveur."]] : []),
                  ["= Prime de fusion", r.prime, "Compte 1042."],
                ].map((row, i) => (
                  <tr key={i} className={`border-t border-slate-100 ${String(row[0]).startsWith("=") ? "bg-teal-50/60 font-bold" : ""}`}>
                    <td className="px-5 py-2 text-slate-700">{row[0]}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 whitespace-nowrap">{F(row[1])}</td>
                    <td className="px-5 py-2 text-xs text-slate-400">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {r.partA > 0 && (
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Boni / mali de fusion sur la participation préalable</div>
              <div className="text-sm text-slate-600 mb-2">
                Quote-part d'apport correspondant aux {F(r.partA, 0)} titres détenus : <b className="tabular-nums">{F(r.apportPart)}</b>
                {" − "}valeur comptable nette des titres : <b className="tabular-nums">{F(r.vcTitres)}</b>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${r.boniMali >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {r.boniMali >= 0 ? "Boni de fusion " : "Mali de fusion "}{F(Math.abs(r.boniMali))}
              </div>
              <div className="mt-2 text-xs text-slate-500 leading-relaxed">
                {r.boniMali >= 0
                  ? "Le boni est comptabilisé en produit financier (compte 758 ou 768 selon la nature) à hauteur de la quote-part de résultats accumulés non distribués, le surplus en prime de fusion (1042)."
                  : "Distinguer le mali technique (contrepartie des plus-values latentes et du fonds commercial de l'absorbée : il s'inscrit à l'actif) du vrai mali (perte : charge financière, compte 668)."}
              </div>
            </div>
          )}

          <div className="md:col-span-2 rounded-2xl border p-5 shadow-sm" style={{ borderColor: r.pctExB > 0.5 ? "#fbbf24" : "#99f6e4", background: r.pctExB > 0.5 ? "#fffbeb" : "#f0fdfa" }}>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">Sens de l'opération</div>
            <div className="text-sm text-slate-700">
              Après la fusion, les anciens actionnaires de <b>{f.nomB}</b> détiennent{" "}
              <b className="tabular-nums">{F(r.pctExB * 100, 2)} %</b> du capital de {f.nomA}
              {" "}({F(r.titresCrees, 0)} titres créés sur {F(r.nA + r.titresCrees, 0)} au total).
            </div>
            <div className={`mt-2 text-base font-bold ${r.pctExB > 0.5 ? "text-amber-800" : "text-teal-800"}`}>
              {r.pctExB > 0.5
                ? "→ Fusion à l'ENVERS : la cible prend le contrôle de l'absorbante."
                : "→ Fusion à l'ENDROIT : l'absorbante (ou ses actionnaires) conserve le contrôle."}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Ce test conditionne la valeur d'apport lorsque les sociétés sont sous contrôle distinct.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Coque de l'application ===================== */
const FUSION_VIEWS = [
  { id: "home", label: "Accueil", icon: "🏠" },
  { id: "cours", label: "Cours", icon: "📘" },
  { id: "methode", label: "Méthode", icon: "🧭" },
  { id: "calc", label: "Calculateur", icon: "🧮" },
  { id: "cas", label: "Cas DSCG", icon: "⚖️" },
  { id: "comptes", label: "Mémo comptes", icon: "📇" },
  { id: "quiz", label: "Quiz", icon: "🎯" },
];

function FusionHero() {
  return (
    <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-5 shadow mb-4">
      <h2 className="text-xl font-bold">Fusions & opérations assimilées</h2>
      <p className="text-sm text-teal-50 mt-1">
        Fusion-absorption, apport partiel d'actif, scission : évaluation des apports, parité d'échange,
        prime, boni et mali, écritures des deux côtés. Règlement ANC 2017-01, illustré par les annales du DSCG.
      </p>
    </div>
  );
}

function ChapterCard({ ch, onOpen }) {
  return (
    <button onClick={onOpen}
      className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-teal-400 hover:-translate-y-0.5 transition-all shadow-sm w-full">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-xl">{ch.icon || "📄"}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-mono font-bold text-teal-600">{ch.code}</span>
          <span className="block font-bold text-slate-800 leading-snug">{ch.title}</span>
          {ch.tagline && <span className="block text-xs text-slate-500 mt-1 leading-relaxed"><MdInline text={ch.tagline} /></span>}
          <span className="block text-[11px] text-slate-400 mt-1.5">{(ch.sections || []).length} sections</span>
        </span>
      </div>
    </button>
  );
}

function FusionCours({ pack, open, onOpen }) {
  const lessons = pack.lessons || [];
  const [q, setQ] = useState("");
  const cur = open != null ? lessons[open] : null;
  if (cur) return <LessonView lesson={cur} accent={cur.color || "teal"} onBack={() => onOpen(null)} />;
  const query = q.trim().toLowerCase();
  const shown = query.length < 2 ? lessons : lessons.filter((l) =>
    (l.title + " " + (l.tagline || "") + " " + (l.code || "") + " " +
      (l.sections || []).map((s) => s.title + " " + JSON.stringify(s.blocks || [])).join(" ")).toLowerCase().includes(query));
  return (
    <div>
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={15} /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher dans le cours (mali technique, parité, scission, contrôle commun…)"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none" />
      </div>
      {query.length >= 2 && <div className="text-xs text-slate-400 mb-2">{shown.length} chapitre(s)</div>}
      <div className="grid sm:grid-cols-2 gap-3">
        {shown.map((l) => <ChapterCard key={l.code} ch={l} onOpen={() => onOpen(lessons.indexOf(l))} />)}
      </div>
    </div>
  );
}

function FusionMethode({ methode }) {
  if (!methode || !methode.length) return null;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-slate-600 leading-relaxed">
          La même séquence résout n'importe quel énoncé de fusion. Déroule-la dans l'ordre : chaque étape
          produit le chiffre dont la suivante a besoin.
        </div>
      </div>
      {methode.map((m, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-teal-600 text-white text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
            <span className="font-bold text-slate-800">{m.titre}</span>
          </div>
          <div className="p-5">
            {(m.blocks || []).map((b, j) => <LessonBlock key={j} b={b} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function CasDSCG({ cas }) {
  const [open, setOpen] = useState(0);
  if (!cas || !cas.length) return <div className="text-sm text-slate-400 p-6 text-center">Cas en préparation.</div>;
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {cas.map((c, i) => (
          <button key={i} onClick={() => setOpen(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${open === i ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"}`}>
            {c.session} · {c.titre}
          </button>
        ))}
      </div>
      {cas[open] && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-5 py-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100">
            <div className="text-[11px] font-bold uppercase tracking-wide text-teal-600">DSCG {cas[open].session} — épreuve UE4</div>
            <div className="font-bold text-slate-800 text-lg">{cas[open].titre}</div>
            {cas[open].themes && <div className="text-xs text-slate-500 mt-1">{cas[open].themes.join(" · ")}</div>}
          </div>
          <div className="p-5">
            {(cas[open].blocks || []).map((b, j) => <LessonBlock key={j} b={b} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function MemoComptes({ comptes }) {
  const [q, setQ] = useState("");
  const list = comptes || [];
  const query = q.trim().toLowerCase();
  const shown = query ? list.filter((c) => (c.num + " " + c.nom + " " + (c.usage || "")).toLowerCase().includes(query)) : list;
  return (
    <div>
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={15} /></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un compte (mali, prime, 1042…)"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400">
            <th className="text-left px-4 py-2 font-semibold">Compte</th>
            <th className="text-left px-3 py-2 font-semibold">Intitulé</th>
            <th className="text-left px-4 py-2 font-semibold">Quand l'utiliser</th>
          </tr></thead>
          <tbody>
            {shown.map((c, i) => (
              <tr key={i} className={`border-t border-slate-100 align-top ${i % 2 ? "bg-slate-50/40" : ""}`}>
                <td className="px-4 py-2 font-mono font-bold text-teal-700 whitespace-nowrap">{c.num}</td>
                <td className="px-3 py-2 text-slate-700 font-medium">{c.nom}</td>
                <td className="px-4 py-2 text-slate-500 text-[13px]"><MdInline text={c.usage || ""} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FusionHome({ pack, onGo, onOpenLesson }) {
  const lessons = pack.lessons || [];
  return (
    <div>
      <FusionHero />
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        {[
          { id: "methode", ic: "🧭", t: "La méthode en étapes", d: "La séquence qui résout tout énoncé de fusion." },
          { id: "calc", ic: "🧮", t: "Calculateur", d: "Parité, titres à créer, prime, boni/mali, sens de l'opération." },
          { id: "cas", ic: "⚖️", t: "Cas DSCG corrigés", d: "Les annales décortiquées pas à pas." },
        ].map((c) => (
          <button key={c.id} onClick={() => onGo(c.id)}
            className="text-left rounded-2xl border border-slate-200 bg-white p-4 hover:border-teal-400 hover:-translate-y-0.5 transition-all shadow-sm">
            <div className="text-2xl mb-1">{c.ic}</div>
            <div className="font-bold text-slate-800">{c.t}</div>
            <div className="text-xs text-slate-500 mt-1 leading-relaxed">{c.d}</div>
          </button>
        ))}
      </div>
      <div className="text-sm font-bold text-slate-700 mb-2">📘 Le cours — {lessons.length} chapitres</div>
      <div className="grid sm:grid-cols-2 gap-3">
        {lessons.map((l, i) => <ChapterCard key={l.code} ch={l} onOpen={() => onOpenLesson(i)} />)}
      </div>
    </div>
  );
}

function App() {
  const pack = (typeof window !== "undefined" && window.__FUSION__) || {};
  const [view, setView] = useState("home");
  const [lesson, setLesson] = useState(null);
  const go = (v) => { setView(v); setLesson(null); window.scrollTo(0, 0); };
  const openLesson = (i) => { setView("cours"); setLesson(i); window.scrollTo(0, 0); };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[980px] mx-auto px-4 py-2 flex gap-1.5 overflow-x-auto">
          {FUSION_VIEWS.map((v) => (
            <button key={v.id} onClick={() => go(v.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${view === v.id ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"}`}>
              <span className="mr-1">{v.icon}</span>{v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-[980px] mx-auto px-4 py-5">
        {view === "home" && <FusionHome pack={pack} onGo={go} onOpenLesson={openLesson} />}
        {view === "cours" && <FusionCours pack={pack} open={lesson} onOpen={setLesson} />}
        {view === "methode" && <FusionMethode methode={pack.methode} />}
        {view === "calc" && <FusionCalc />}
        {view === "cas" && <CasDSCG cas={pack.cas} />}
        {view === "comptes" && <MemoComptes comptes={pack.comptes} />}
        {view === "quiz" && <LQuiz title="Quiz — fusions" questions={pack.quiz || []} />}
      </div>
    </div>
  );
}
