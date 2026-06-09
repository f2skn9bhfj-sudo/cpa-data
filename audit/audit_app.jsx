/* ============================================================
   Audit — app React (même thème que Conso). Charge data/audit.json
   (fetch) et le rend avec le moteur de leçon partagé + composants
   spécifiques (annuaire des 47 normes ISA, QCM interactifs, schémas).
   ============================================================ */

const A_TONE = { key: "key", warn: "warn", info: "info", tip: "tip", example: "tip", legal: "info" };
const ahx = (c) => (typeof c === "string" && c[0] === "#") ? c : "#7c3aed";
const META_KEYS = ["_label", "_icon", "_description", "id", "icon", "color", "num", "code"];

/* ── Sérialisation HTML + impression PDF (window.print → « Enregistrer en PDF ») ── */
function escHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function mdInlineHtml(s) { return escHtml(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*\n]+)\*/g, "<em>$1</em>").replace(/`([^`]+)`/g, "<code>$1</code>"); }
function mdToHtml(md) {
  if (!md) return "";
  const lines = String(md).split("\n"); let h = ""; let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (/^\s*\|.*\|\s*$/.test(ln)) {
      const rows = []; while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i]); i++; }
      const parse = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = parse(rows[0]); const body = rows.slice(1).filter((r) => !/^\s*\|[\s:|-]+\|\s*$/.test(r)).map(parse);
      h += "<table><thead><tr>" + head.map((c) => "<th>" + mdInlineHtml(c) + "</th>").join("") + "</tr></thead><tbody>" + body.map((r) => "<tr>" + r.map((c) => "<td>" + mdInlineHtml(c) + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
      continue;
    }
    const t = ln.trim();
    if (/^[-•]\s+/.test(t)) { const items = []; while (i < lines.length && /^[-•]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-•]\s+/, "")); i++; } h += "<ul>" + items.map((x) => "<li>" + mdInlineHtml(x) + "</li>").join("") + "</ul>"; continue; }
    if (/^>\s?/.test(t)) { h += "<blockquote>" + mdInlineHtml(t.replace(/^>\s?/, "")) + "</blockquote>"; i++; continue; }
    if (t) h += "<p>" + mdInlineHtml(t) + "</p>";
    i++;
  }
  return h;
}
function schemaToHtml(s) {
  if (!s || typeof s !== "object") return "";
  if (s.type === "matrix") {
    const xs = s.xlabels || [], ys = s.ylabels || [], cells = s.cells || [];
    const cell = (c) => (c && typeof c === "object") ? (c.t || c.v || "") : (c || "");
    return (s.title ? "<p><strong>" + mdInlineHtml(s.title) + "</strong></p>" : "") + "<table><thead><tr><th></th>" + xs.map((x) => "<th>" + mdInlineHtml(x) + "</th>").join("") + "</tr></thead><tbody>" + ys.map((y, i) => "<tr><td><strong>" + mdInlineHtml(y) + "</strong></td>" + xs.map((_, j) => "<td>" + mdInlineHtml(cell((cells[i] || [])[j])) + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
  }
  const levels = s.levels || s.steps || [];
  return (s.title ? "<p><strong>" + mdInlineHtml(s.title) + "</strong></p>" : "") + "<ul>" + levels.map((l) => "<li><strong>" + mdInlineHtml(l.t || l.label || "") + "</strong>" + ((l.d || l.sub) ? " — " + mdInlineHtml(l.d || l.sub) : "") + "</li>").join("") + "</ul>";
}
function calloutsHtml(cos) { return (cos || []).map((c) => '<div class="callout"><strong>' + escHtml(c.label || "") + "</strong> " + mdInlineHtml(c.text || "") + "</div>").join(""); }
function courseInnerHtml(std, c) {
  let h = "<h1>" + escHtml(std.code) + " — " + escHtml(std.title_fr) + "</h1>";
  if (c.tldr) h += '<div class="callout">' + mdToHtml(c.tldr) + "</div>";
  if (c.stats && c.stats.length) h += "<table><tbody>" + c.stats.map((s) => "<tr><td><strong>" + mdInlineHtml(s.value) + "</strong></td><td>" + mdInlineHtml(s.label) + (s.sub ? " — " + mdInlineHtml(s.sub) : "") + "</td></tr>").join("") + "</tbody></table>";
  if (c.intro) h += mdToHtml(c.intro);
  (c.sections || []).forEach((s) => { h += "<h2>" + escHtml(s.titre) + "</h2>"; if (s.body) h += mdToHtml(s.body); h += calloutsHtml(s.callouts); if (s.schema) h += schemaToHtml(s.schema); });
  if (c.schema) h += "<h2>Schéma de synthèse</h2>" + schemaToHtml(c.schema);
  if (c.mnemo && c.mnemo.items) { h += "<h2>Mnémo — " + escHtml(c.mnemo.code || "") + "</h2><ul>" + c.mnemo.items.map((it) => "<li><strong>" + escHtml(it.l) + "</strong> — " + mdInlineHtml(it.t) + "</li>").join("") + "</ul>"; if (c.mnemo.phrase) h += "<p><em>" + mdInlineHtml(c.mnemo.phrase) + "</em></p>"; }
  if (c.synthese && c.synthese.length) h += "<h2>Synthèse</h2><ul>" + c.synthese.map((x) => "<li>" + mdInlineHtml(x) + "</li>").join("") + "</ul>";
  if (c.pieges && c.pieges.length) h += "<h2>Pièges d'examen</h2><ul>" + c.pieges.map((x) => "<li>" + mdInlineHtml(x) + "</li>").join("") + "</ul>";
  if (c.quiz && c.quiz.length) h += "<h2>Quiz</h2>" + c.quiz.map((q, i) => "<p><strong>" + (i + 1) + ". " + mdInlineHtml(q.q) + "</strong><br>" + mdInlineHtml(q.a) + "</p>").join("");
  return h;
}
function ficheInnerHtml(std, c) {
  let h = "<h1>" + escHtml(std.code) + " — Fiche de révision</h1>";
  (c.fiche_revision || []).forEach((b) => { h += "<h2>" + escHtml(b.title || "") + "</h2>" + mdToHtml(b.body || ""); });
  return h;
}
function openPrint(title, inner) {
  const w = window.open("", "_blank");
  if (!w) { try { alert("Autorise les pop-ups pour enregistrer en PDF."); } catch (e) {} return; }
  w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + escHtml(title) + '</title><style>'
    + 'body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:820px;margin:24px auto;padding:0 20px;color:#1e293b;line-height:1.55}'
    + 'h1{font-size:22px;border-bottom:3px solid #7c3aed;padding-bottom:6px}h2{font-size:15px;background:#f5f3ff;border-left:4px solid #7c3aed;padding:6px 10px;margin:18px 0 6px}'
    + 'table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12.5px}th,td{border:1px solid #cbd5e1;padding:5px 8px;text-align:left;vertical-align:top}th{background:#f1f5f9}'
    + 'ul{margin:6px 0 6px 18px}p{margin:6px 0}strong{color:#0f172a}code{background:#f1f5f9;padding:1px 4px;border-radius:3px}blockquote{border-left:3px solid #c4b5fd;margin:8px 0;padding:4px 12px;color:#475569}'
    + '.callout{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;margin:8px 0}@media print{body{margin:0}}'
    + '</style></head><body>' + inner + '</body></html>');
  w.document.close();
  setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 500);
}

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

/* ═══ Outils interactifs (calculateurs, copie, glossaire) ═══ */
function fmtCHF(v) { try { return Math.round(v || 0).toLocaleString("fr-CH"); } catch (e) { return String(Math.round(v || 0)); } }
function CopyBtn({ text, label = "📋 Copier" }) {
  const [done, setDone] = useState(false);
  return <button onClick={() => { try { if (navigator.clipboard) navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch (e) {} }}
    className="mt-2 text-[11px] px-2.5 py-1 rounded-md border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100">{done ? "✓ Copié" : label}</button>;
}
const AINP = "w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-sm focus:border-violet-500 outline-none";
const ALBL = "text-[11px] text-slate-500 block mb-0.5";

function MatCalc() {
  const REC = { rai: 5, ca: 1, actif: 2, fp: 3 };
  const [base, setBase] = useState(5000000), [type, setType] = useState("rai"), [pct, setPct] = useState(5), [pmPct, setPmPct] = useState(65), [sudPct, setSudPct] = useState(5);
  const PM = (+base || 0) * ((+pct || 0) / 100), TE = PM * ((+pmPct || 0) / 100), SUD = PM * ((+sudPct || 0) / 100);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 mb-3">
      <div className="font-bold text-sm text-violet-700 mb-1">🧮 Matérialité (PM, TE, SUD)</div>
      <p className="text-[11px] text-slate-500 mb-3">Choisis une base + un % puis ajuste la Performance Materiality (% de PM) et le seuil SUD (% de PM). Benchmarks : RAI 5 %, CA 0.5–2 %, Total actif 1–5 %, Fonds propres 1–5 %.</p>
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div><label className={ALBL}>Base (CHF)</label><input type="number" className={AINP} value={base} onChange={e => setBase(e.target.value)} /></div>
        <div><label className={ALBL}>Type de base</label><select className={AINP} value={type} onChange={e => { setType(e.target.value); setPct(REC[e.target.value]); }}><option value="rai">Résultat avant impôt (RAI)</option><option value="ca">Chiffre d'affaires</option><option value="actif">Total de l'actif</option><option value="fp">Fonds propres</option></select></div>
        <div><label className={ALBL}>% Matérialité (PM)</label><input type="number" step="0.5" className={AINP} value={pct} onChange={e => setPct(e.target.value)} /></div>
        <div><label className={ALBL}>% Performance (de PM)</label><input type="number" step="5" className={AINP} value={pmPct} onChange={e => setPmPct(e.target.value)} /></div>
        <div><label className={ALBL}>% SUD (trivial, de PM)</label><input type="number" className={AINP} value={sudPct} onChange={e => setSudPct(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center rounded-lg bg-slate-50 border border-slate-200 p-3">
        <div><div className="text-[10px] uppercase text-slate-400 tracking-wide">Materiality (PM)</div><div className="text-lg font-extrabold text-emerald-600">CHF {fmtCHF(PM)}</div></div>
        <div><div className="text-[10px] uppercase text-slate-400 tracking-wide">Performance (TE)</div><div className="text-lg font-extrabold text-blue-600">CHF {fmtCHF(TE)}</div></div>
        <div><div className="text-[10px] uppercase text-slate-400 tracking-wide">SUD (trivial)</div><div className="text-lg font-extrabold text-amber-600">CHF {fmtCHF(SUD)}</div></div>
      </div>
    </div>
  );
}

function opinionVerdict(situation, mat, amount, pervasive) {
  const sig = (+amount || 0) > (+mat || 0);
  if (situation === "none") return { v: "✅ Opinion SANS RÉSERVE (Clean / Unqualified)", c: "#10b981", nas: "NAS 700", w: "« À notre avis, les comptes annuels donnent une image fidèle … en conformité avec [référentiel]. »", t: "Vérifier si KAM (EIP) ou § Observation (going concern) sont nécessaires." };
  if (situation === "gc_incertitude") return { v: "🔵 Sans réserve + § OBSERVATION going concern", c: "#3b82f6", nas: "NAS 706 / NAS 570", w: "« Sans modifier notre opinion, nous attirons l'attention sur la note [X] qui décrit l'existence d'une incertitude significative … »", t: "L'incertitude est adéquatement divulguée → pas de modification d'opinion." };
  if (situation === "gc_inapproprie") return { v: "🔴 Opinion DÉFAVORABLE (base going concern inappropriée)", c: "#ef4444", nas: "NAS 570 §21", w: "« Parce que les comptes ont été établis selon le principe de continuité alors que celui-ci n'est pas approprié, les comptes ne donnent pas une image fidèle. »", t: "En Suisse : si surendettement (CO 725b) et CA inactif → AVIS AU JUGE obligatoire (CO 728c/729c)." };
  if (situation === "anomalie") {
    if (!sig) return { v: "✅ Sans réserve (anomalie SOUS matérialité)", c: "#10b981", nas: "NAS 450", w: "« À notre avis, les comptes annuels donnent une image fidèle … »", t: "⚠️ Vérifier le CUMUL des SAD (anomalies non corrigées) vs matérialité globale. Ne jamais conclure sur une seule anomalie." };
    if (pervasive) return { v: "🔴 Opinion DÉFAVORABLE (significative ET diffuse)", c: "#ef4444", nas: "NAS 705 §8", w: "« En raison de l'importance des points décrits, les comptes annuels NE DONNENT PAS une image fidèle … »", t: "Très rare — requiert justification forte. Communication renforcée à la gouvernance." };
    return { v: "🟡 Opinion AVEC RÉSERVE — Anomalie (Qualified)", c: "#f59e0b", nas: "NAS 705 §7", w: "« À notre avis, SOUS RÉSERVE des effets de [point décrit dans \"Fondement\"], les comptes annuels donnent une image fidèle … »", t: "Section \"Fondement de l'opinion avec réserve\" OBLIGATOIRE avant l'opinion." };
  }
  if (situation === "limitation") {
    if (!sig) return { v: "✅ Sans réserve (limitation non significative)", c: "#10b981", nas: "NAS 705", w: "« À notre avis, les comptes annuels donnent une image fidèle … »", t: "Impact de la limitation < matérialité → pas de modification. Documenter l'évaluation." };
    if (pervasive) return { v: "⚫ IMPOSSIBILITÉ d'exprimer une opinion (Disclaimer)", c: "#dc2626", nas: "NAS 705 §10", w: "« Compte tenu de l'importance des points décrits, nous N'AVONS PAS PU obtenir d'éléments probants suffisants. Par conséquent, nous N'EXPRIMONS PAS d'opinion. »", t: "Cas extrême. Si limitation imposée par la direction → escalade gouvernance + envisager démission." };
    return { v: "🟡 Opinion AVEC RÉSERVE — Limitation (Qualified)", c: "#f59e0b", nas: "NAS 705 §7", w: "« À notre avis, SOUS RÉSERVE des ajustements qui auraient pu être nécessaires si nous avions pu obtenir [éléments probants], les comptes annuels donnent une image fidèle … »", t: "Décrire précisément la limitation et son impact potentiel." };
  }
  return { v: "—", c: "#64748b", nas: "", w: "", t: "" };
}
function OpinionCalc() {
  const [mat, setMat] = useState(800000), [situation, setSituation] = useState("none"), [amount, setAmount] = useState(500000), [pervasive, setPervasive] = useState(false);
  const needs = situation === "anomalie" || situation === "limitation";
  const r = opinionVerdict(situation, mat, amount, pervasive);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 mb-3">
      <div className="font-bold text-sm text-violet-700 mb-1">⚖️ Type d'opinion (NAS 705)</div>
      <p className="text-[11px] text-slate-500 mb-3">Entre l'anomalie identifiée ou la limitation d'étendue. Le verdict + le wording sont suggérés automatiquement.</p>
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div><label className={ALBL}>Matérialité globale (CHF)</label><input type="number" className={AINP} value={mat} onChange={e => setMat(e.target.value)} /></div>
        <div><label className={ALBL}>Situation rencontrée</label><select className={AINP} value={situation} onChange={e => setSituation(e.target.value)}><option value="none">Aucun problème (comptes conformes)</option><option value="anomalie">Anomalie non corrigée</option><option value="limitation">Limitation d'étendue</option><option value="gc_inapproprie">Going concern inapproprié</option><option value="gc_incertitude">Going concern — incertitude divulguée</option></select></div>
        {needs && <div><label className={ALBL}>Montant anomalie / impact (CHF)</label><input type="number" className={AINP} value={amount} onChange={e => setAmount(e.target.value)} /></div>}
        {needs && <div><label className={ALBL}>Caractère DIFFUS (pervasive) ?</label><div className="flex gap-2"><button onClick={() => setPervasive(false)} className={`flex-1 py-1.5 rounded-md border text-xs ${!pervasive ? "bg-violet-600 text-white border-violet-600" : "border-slate-300 text-slate-600"}`}>Non (isolé)</button><button onClick={() => setPervasive(true)} className={`flex-1 py-1.5 rounded-md border text-xs ${pervasive ? "bg-violet-600 text-white border-violet-600" : "border-slate-300 text-slate-600"}`}>Oui (fondamental)</button></div></div>}
      </div>
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5">
        <div className="font-extrabold text-sm mb-1" style={{ color: r.c }}>{r.v}</div>
        {r.nas && <div className="text-[11px] text-violet-600 mb-2">📚 {r.nas}</div>}
        {r.w && <div className="text-sm text-slate-600 italic leading-relaxed border-l-2 pl-3" style={{ borderColor: r.c }}>{r.w}</div>}
        {r.t && <div className="mt-2 text-xs text-amber-700 leading-relaxed">💡 {r.t}</div>}
        {(r.w || r.t) && <CopyBtn text={r.v + "\n\n" + r.w + "\n\nTip : " + r.t} label="📋 Copier verdict + wording" />}
      </div>
    </div>
  );
}

function SamplingCalc() {
  const [type, setType] = useState("mus"), [pop, setPop] = useState(10000000), [te, setTe] = useState(200000), [conf, setConf] = useState("moderate"), [freq, setFreq] = useState("daily");
  const factors = { high: 3.0, moderate: 2.3, low: 1.6 };
  const ATTR = { high: { annual: 1, quarterly: 2, monthly: 6, weekly: 25, daily: 45, multiple_daily: 60 }, moderate: { annual: 1, quarterly: 2, monthly: 5, weekly: 15, daily: 25, multiple_daily: 45 }, low: { annual: 1, quarterly: 2, monthly: 3, weekly: 10, daily: 18, multiple_daily: 30 } };
  const factor = factors[conf] || 2.3;
  const nMus = Math.ceil((+pop || 0) / (+te || 1) * factor);
  const interval = Math.floor((+te || 1) / factor);
  const nAttr = (ATTR[conf] || {})[freq] || 25;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 mb-3">
      <div className="font-bold text-sm text-violet-700 mb-1">🎲 Sampling — taille d'échantillon</div>
      <p className="text-[11px] text-slate-500 mb-3"><strong>MUS</strong> (Monetary Unit Sampling) pour les tests substantifs · <strong>Attribute sampling</strong> pour les tests de contrôles.</p>
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div><label className={ALBL}>Type de test</label><select className={AINP} value={type} onChange={e => setType(e.target.value)}><option value="mus">MUS — Test substantif</option><option value="attr">Attribute — Test des contrôles</option></select></div>
        <div><label className={ALBL}>Niveau de confiance</label><select className={AINP} value={conf} onChange={e => setConf(e.target.value)}><option value="high">Haute (95 % / facteur 3.0)</option><option value="moderate">Modérée (90 % / facteur 2.3)</option><option value="low">Faible (80 % / facteur 1.6)</option></select></div>
        {type === "mus" && <div><label className={ALBL}>Population (CHF)</label><input type="number" className={AINP} value={pop} onChange={e => setPop(e.target.value)} /></div>}
        {type === "mus" && <div><label className={ALBL}>Performance Materiality (CHF)</label><input type="number" className={AINP} value={te} onChange={e => setTe(e.target.value)} /></div>}
        {type === "attr" && <div><label className={ALBL}>Fréquence du contrôle</label><select className={AINP} value={freq} onChange={e => setFreq(e.target.value)}><option value="annual">Annuel</option><option value="quarterly">Trimestriel</option><option value="monthly">Mensuel</option><option value="weekly">Hebdomadaire</option><option value="daily">Quotidien</option><option value="multiple_daily">Plusieurs fois/jour</option></select></div>}
      </div>
      {type === "mus" ? (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div><div className="text-[10px] uppercase text-slate-400">Sample size (MUS)</div><div className="text-xl font-extrabold text-violet-600">{nMus} items</div></div>
            <div><div className="text-[10px] uppercase text-slate-400">Sampling interval</div><div className="text-base font-bold text-slate-600 mt-1">CHF {fmtCHF(interval)}</div></div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 leading-relaxed">n = (Population / Performance Materiality) × facteur ({factor}). Sélectionner 1 unité monétaire tous les {fmtCHF(interval)} CHF cumulés.</div>
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
          <div className="text-[10px] uppercase text-slate-400">Sample size (Attribute)</div>
          <div className="text-xl font-extrabold text-emerald-600">{nAttr} items</div>
          <div className="text-[11px] text-slate-500 mt-2 leading-relaxed">Basé sur la matrice EY GAM. Si exception détectée → investiguer + élargir l'échantillon.</div>
        </div>
      )}
    </div>
  );
}

function GoingConcernChecklist() {
  const GROUPS = [
    { cat: "Financiers", items: ["Pertes opérationnelles récurrentes", "Fonds propres négatifs ou en réduction (CO 725a/b)", "Trésorerie négative ou en forte dégradation", "Rupture ou risque de rupture de covenants bancaires", "Incapacité à refinancer les dettes arrivant à échéance", "Retards de paiement aux fournisseurs / créanciers"] },
    { cat: "Opérationnels", items: ["Départ de la direction clé sans remplacement", "Perte d'un client / fournisseur / marché majeur", "Conflits sociaux ou pénurie de matières premières", "Procédures réglementaires défavorables"] },
    { cat: "Autres", items: ["Litiges majeurs susceptibles de jugement défavorable", "Changement réglementaire impactant le business model", "Catastrophe naturelle ou crise sanitaire majeure", "Surendettement au sens du CO 725b → obligation avis au juge"] },
  ];
  const [checked, setChecked] = useState({});
  const total = GROUPS.reduce((a, g) => a + g.items.length, 0);
  const n = Object.values(checked).filter(Boolean).length;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 mb-3">
      <div className="font-bold text-sm text-violet-700 mb-1">🔍 Going concern — checklist (NAS 570)</div>
      <p className="text-[11px] text-slate-500 mb-2">Évaluer la capacité à poursuivre l'exploitation sur min. 12 mois. <strong>Suisse :</strong> surendettement (CO 725b) → avis au juge si CA inactif (CO 728c/729c).</p>
      {GROUPS.map((g, gi) => (
        <div key={gi} className="mb-2">
          <div className="text-xs font-bold text-violet-600 mb-1">{g.cat}</div>
          {g.items.map((it, ii) => { const k = gi + "_" + ii; return <label key={ii} className="flex items-start gap-2 text-xs text-slate-600 py-0.5 cursor-pointer"><input type="checkbox" checked={!!checked[k]} onChange={e => setChecked({ ...checked, [k]: e.target.checked })} className="mt-0.5" /><span>{it}</span></label>; })}
        </div>
      ))}
      <div className="text-xs font-semibold mt-1" style={{ color: n >= 4 ? "#ef4444" : n >= 1 ? "#f59e0b" : "#10b981" }}>{n} / {total} indicateurs — {n >= 4 ? "⚠️ Doutes sérieux : documenter + envisager § going concern" : n >= 1 ? "Vigilance : évaluer le plan de la direction" : "Pas d'indicateur — RAS"}</div>
    </div>
  );
}

function WordingCard({ w }) {
  const [open, setOpen] = useState(false);
  const txt = w.wording_fr || w.wording || w.text || "";
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-800">{w.label || w.title}</span><ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} /></button>
      {open && <div className="px-3.5 pb-3.5 text-sm">{w.context && <div className="text-xs text-slate-500 mb-2">{w.context}</div>}<div className="bg-slate-50 border-l-2 border-violet-300 rounded p-3 text-slate-700 italic whitespace-pre-line leading-relaxed">{txt}</div><CopyBtn text={txt} /></div>}
    </div>
  );
}
const FIND_COLOR = { "Significant deficiency": "#ef4444", "Audit difference": "#f59e0b", "Material weakness": "#dc2626", "Observation": "#3b82f6" };
function FindingCard({ f }) {
  const [open, setOpen] = useState(false);
  const col = FIND_COLOR[f.severity] || "#7c3aed";
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" style={{ borderLeft: "3px solid " + col }}>
      <button onClick={() => setOpen(!open)} className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-2">
        <span><span className="block text-sm font-semibold text-slate-800">{f.title}</span><span className="text-[11px]"><span className="text-white px-2 py-0.5 rounded-full" style={{ background: col }}>{f.severity}</span> <span className="text-slate-400 ml-1">{f.category}</span></span></span>
        <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-3.5 pb-3.5 text-sm"><div className="text-xs font-bold text-slate-700 mt-1 mb-1">📋 Constatation</div><div className="text-slate-600 italic leading-relaxed">« {f.wording} »</div><div className="text-xs font-bold text-emerald-700 mt-2 mb-1">💡 Recommandation</div><div className="text-slate-600 leading-relaxed">{f.recommendation}</div><CopyBtn text={f.wording + "\n\nRecommandation : " + f.recommendation} label="📋 Copier finding + reco" /></div>}
    </div>
  );
}
function LetterCard({ t }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-800">✉️ {t.title}</span><ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} /></button>
      {open && <div className="px-3.5 pb-3.5"><div className="bg-slate-50 rounded p-3 text-sm text-slate-700 whitespace-pre-line leading-relaxed font-serif">{t.wording}</div><CopyBtn text={t.wording} label="📋 Copier le template" /></div>}
    </div>
  );
}
function Glossary({ terms }) {
  const [q, setQ] = useState("");
  const f = q.trim().toLowerCase();
  const rows = f ? terms.filter(t => ((t.fr || "") + " " + (t.en || "") + " " + (t.de || "")).toLowerCase().includes(f)) : terms;
  return (
    <div>
      <div className="relative mb-2"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un terme (FR / EN / DE)…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-violet-500 outline-none" /></div>
      <div className="text-[11px] text-slate-400 mb-1">{rows.length} terme(s)</div>
      <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-sm"><thead><tr className="bg-violet-50 text-violet-700"><th className="text-left px-3 py-2 font-semibold">🇫🇷 Français</th><th className="text-left px-3 py-2 font-semibold">🇬🇧 English</th><th className="text-left px-3 py-2 font-semibold">🇩🇪 Deutsch</th></tr></thead><tbody>{rows.map((g, i) => <tr key={i} className="border-t border-slate-100"><td className="px-3 py-1.5 text-slate-700 font-medium">{g.fr}</td><td className="px-3 py-1.5 text-violet-600">{g.en}</td><td className="px-3 py-1.5 text-slate-500">{g.de}</td></tr>)}</tbody></table></div>
    </div>
  );
}
function ABack({ onBack, label = "Accueil Audit" }) { return <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> {label}</button>; }
function SectionHero({ section, fallbackIcon }) {
  return <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 mb-4"><div className="flex items-center gap-2"><span className="text-2xl">{section._icon || fallbackIcon || "📋"}</span><h2 className="text-xl font-bold text-slate-800">{section._label}</h2></div>{section._description && <p className="text-sm text-slate-600 mt-1"><MdInline text={section._description} /></p>}</div>;
}
function AuditOutils({ section, onBack }) {
  const tools = section.ey_tools || [];
  const wl = section.wording_library || {};
  const rapports = wl.rapports || {};
  const findings = wl.findings || [];
  const letters = [...(wl.management_letter || []), ...(wl.communications || [])];
  const gloss = (section.glossaire_audit && section.glossaire_audit.terms) || [];
  return (
    <div>
      <ABack onBack={onBack} />
      <SectionHero section={section} fallbackIcon="🧮" />
      <ACollapse title="🧮 Calculateurs interactifs" accent="violet" defaultOpen={true}><MatCalc /><OpinionCalc /><SamplingCalc /><GoingConcernChecklist /></ACollapse>
      {Object.keys(rapports).length > 0 && <ACollapse title="📝 Wording — Rapports d'audit"><div className="space-y-2">{Object.entries(rapports).map(([k, w]) => <WordingCard key={k} w={w} />)}</div></ACollapse>}
      {findings.length > 0 && <ACollapse title={`📋 Findings library (${findings.length})`}><div className="space-y-2">{findings.map((f, i) => <FindingCard key={i} f={f} />)}</div></ACollapse>}
      {letters.length > 0 && <ACollapse title="✉️ Templates lettres"><div className="space-y-2">{letters.map((t, i) => <LetterCard key={i} t={t} />)}</div></ACollapse>}
      {tools.length > 0 && <ACollapse title={`🔧 Outils EY (${tools.length})`}><div className="grid sm:grid-cols-2 gap-2">{tools.map((t, i) => <div key={i} className="rounded-xl border border-slate-200 bg-white p-3"><div className="font-semibold text-sm text-slate-800">🔧 {t.name}</div><div className="text-xs text-slate-500 mb-1">{t.purpose}</div>{(t.key_features || []).length > 0 && <ul className="list-disc ml-4 text-xs text-slate-600 space-y-0.5">{t.key_features.map((ff, j) => <li key={j}>{ff}</li>)}</ul>}</div>)}</div></ACollapse>}
      {gloss.length > 0 && <ACollapse title={`🌐 Glossaire trilingue (${gloss.length})`}><Glossary terms={gloss} /></ACollapse>}
    </div>
  );
}

/* ═══ Arbres de décision interactifs ═══ */
const VHEX = { success: "#10b981", danger: "#ef4444", warning: "#f59e0b", info: "#3b82f6" };
function treeEntry(t) { return t.start || t.root; }
function treeIsLeaf(n) { return !n ? true : (n.type === "result" || n.result != null || !n.options); }
function ATree({ tree, onBack }) {
  const entry = treeEntry(tree);
  const [cur, setCur] = useState(entry);
  const [path, setPath] = useState([]);
  const nodes = tree.nodes || {};
  const node = nodes[cur];
  if (!node) return <div className="text-sm text-slate-400">Arbre vide.</div>;
  const isLeaf = treeIsLeaf(node);
  const color = node.color || VHEX[node.variant] || "#7c3aed";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2"><span className="text-lg">{tree.icon || "🌳"}</span><span className="font-bold text-sm text-slate-800">{tree.titre || tree.title}</span></div>
      {tree.intro && cur === entry && <p className="text-xs text-slate-500 mb-3"><MdInline text={tree.intro} /></p>}
      {path.length > 0 && <div className="text-[11px] text-slate-400 mb-3 leading-relaxed">{path.map((s, i) => <span key={i}><span className="text-violet-600">{s.label}</span>{i < path.length - 1 ? " → " : ""}</span>)}</div>}
      {isLeaf ? (
        <div className="rounded-lg p-4" style={{ background: color + "10", borderLeft: "3px solid " + color }}>
          <div className="text-base font-bold mb-2" style={{ color }}>{node.result || node.text}</div>
          {(node.detail || node.wording) && <div className="text-sm text-slate-600 italic whitespace-pre-line leading-relaxed">{node.detail || node.wording}</div>}
          {node.tip && <div className="mt-2 text-xs text-violet-700 bg-violet-50 rounded p-2 leading-relaxed">💡 {node.tip}</div>}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-800 mb-1">❓ {node.text || node.q}</div>
          {(node.options || []).map((opt, i) => <button key={i} onClick={() => { setPath([...path, { from: cur, label: opt.label }]); setCur(opt.next); }} className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:border-violet-400 hover:bg-violet-50 text-sm text-slate-700 transition-colors">▶ {opt.label}</button>)}
        </div>
      )}
      <div className="flex gap-2 mt-3">
        {path.length > 0 && <button onClick={() => { const p = [...path]; const last = p.pop(); setPath(p); setCur(last.from); }} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">← Étape précédente</button>}
        {isLeaf && <button onClick={() => { setCur(entry); setPath([]); }} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white font-semibold">🔁 Recommencer</button>}
      </div>
    </div>
  );
}
function AuditArbres({ section, onBack }) {
  const trees = section.trees || [];
  const [sel, setSel] = useState(null);
  if (sel != null && trees[sel]) return <div><ABack onBack={() => setSel(null)} label="Tous les arbres" /><ATree tree={trees[sel]} /></div>;
  return (
    <div>
      <ABack onBack={onBack} />
      <SectionHero section={section} fallbackIcon="🌳" />
      <div className="grid sm:grid-cols-2 gap-2">{trees.map((t, i) => <button key={i} onClick={() => setSel(i)} className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"><div className="font-semibold text-sm text-slate-800">{t.icon || "🌳"} {t.titre || t.title}</div>{t.intro && <div className="text-xs text-slate-500 mt-1"><MdInline text={t.intro} /></div>}</button>)}</div>
    </div>
  );
}

/* ═══ QCM / examens / simulateur interactifs (scoring) ═══ */
function normAuditQ(q, kind) {
  if (kind === "exam") return { q: q.q, ref: q.ref, expl: q.explication, options: (q.options || []).map((o, i) => ({ text: o, ok: i === q.correct })) };
  return { q: q.q, ref: q.ref, options: (q.options || []).map(o => ({ text: o.t || o.label || "", ok: !!o.ok, expl: o.x })) };
}
function AScoredQuiz({ questions, kind, title, icon, intro, onBack }) {
  const qs = (questions || []).map(q => normAuditQ(q, kind));
  const [i, setI] = useState(0);
  const [ans, setAns] = useState({});
  const [done, setDone] = useState(false);
  if (!qs.length) return <div><ABack onBack={onBack} label="Menu" /><div className="text-sm text-slate-400">Aucune question.</div></div>;
  const total = qs.length;
  if (done) {
    const correct = Object.keys(ans).filter(k => qs[k] && qs[k].options[ans[k]] && qs[k].options[ans[k]].ok).length;
    const pct = Math.round(100 * correct / total);
    let mood = "🏆 Excellent !", col = "#10b981";
    if (pct < 60) { mood = "⚠️ À retravailler"; col = "#ef4444"; } else if (pct < 80) { mood = "👍 Solide"; col = "#f59e0b"; }
    return <div><ABack onBack={onBack} label="Menu" /><div className="rounded-2xl border bg-white p-8 text-center" style={{ borderLeft: "3px solid " + col }}><div className="text-5xl mb-2">{mood.split(" ")[0]}</div><div className="text-lg font-bold text-slate-800 mb-3">{title} — terminé</div><div className="text-4xl font-extrabold mb-1" style={{ color: col }}>{correct} / {total}</div><div className="text-sm text-slate-500">Score {pct}% — {mood}</div><div className="flex gap-2 justify-center mt-6"><button onClick={() => { setAns({}); setI(0); setDone(false); }} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold">🔁 Recommencer</button><button onClick={onBack} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm">📋 Menu</button></div></div></div>;
  }
  const q = qs[i];
  const chosen = ans[i];
  const answered = chosen != null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3"><button onClick={onBack} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">← Menu</button><div className="flex-1 font-bold text-sm text-slate-800">{icon} {title}</div><div className="text-xs text-amber-600 font-medium">Q {i + 1} / {total}</div></div>
      {i === 0 && intro && <div className="mb-3"><LCallout tone="warn" title="Contexte" text={intro} /></div>}
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-3">
        <div className="text-sm font-semibold text-slate-800 mb-3">{q.q}</div>
        <div className="space-y-2">{q.options.map((o, j) => {
          let cls = "border-slate-200 bg-slate-50 hover:border-violet-300";
          if (answered) { if (o.ok) cls = "border-emerald-400 bg-emerald-50"; else if (j === chosen) cls = "border-rose-400 bg-rose-50"; else cls = "border-slate-200 bg-white opacity-70"; }
          return <button key={j} disabled={answered} onClick={() => setAns({ ...ans, [i]: j })} className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-sm text-slate-700 transition-colors ${cls}`}>{answered && o.ok ? "✓ " : answered && j === chosen ? "✗ " : ""}{o.text}</button>;
        })}</div>
        {answered && <div className="mt-3 text-sm rounded-lg bg-slate-50 border border-slate-200 p-3 text-slate-600 leading-relaxed"><span className="font-semibold text-slate-700">{q.options[chosen].ok ? "✅ Correct. " : "❌ Incorrect. "}</span>{q.options[chosen].expl || q.expl || ""}{q.ref && <span className="block mt-1 text-[11px] text-violet-600">📚 {q.ref}</span>}</div>}
      </div>
      <div className="flex justify-between">
        <button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className={`px-4 py-2 rounded-lg border text-sm ${i === 0 ? "opacity-40 border-slate-200 text-slate-400" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>← Précédente</button>
        {answered && <button onClick={() => { if (i + 1 === total) setDone(true); else setI(i + 1); }} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold">{i + 1 === total ? "Voir le bilan 🏆" : "Suivante →"}</button>}
      </div>
    </div>
  );
}
function AuditQuizHub({ section, onBack }) {
  const decks = section.decks || [];
  const dtrees = Object.entries(section.decision_trees || {}).map(([k, v]) => ({ ...v, _key: k }));
  const scenarios = (section.simulator && section.simulator.scenarios) || [];
  const [sel, setSel] = useState(null);
  if (sel) {
    if (sel.kind === "deck") return <AScoredQuiz questions={sel.data.questions} kind="deck" title={sel.data.title} icon={sel.data.icon || "🃏"} onBack={() => setSel(null)} />;
    if (sel.kind === "tree") return <div><ABack onBack={() => setSel(null)} label="Menu Quiz" /><ATree tree={sel.data} /></div>;
    if (sel.kind === "sim") return <AScoredQuiz questions={sel.data.steps} kind="sim" title={sel.data.title} icon="🎬" intro={sel.data.intro} onBack={() => setSel(null)} />;
  }
  const Card = ({ onClick, title, sub }) => <button onClick={onClick} className="text-left rounded-xl border border-slate-200 bg-white p-3 hover:shadow-md hover:-translate-y-0.5 transition-all"><div className="font-semibold text-sm text-slate-800">{title}</div>{sub && <div className="text-xs text-slate-400">{sub}</div>}</button>;
  return (
    <div>
      <ABack onBack={onBack} />
      <SectionHero section={section} fallbackIcon="🎯" />
      {decks.length > 0 && <div className="mb-4"><div className="text-sm font-bold text-slate-700 mb-2">🃏 QCM thématiques</div><div className="grid sm:grid-cols-2 gap-2">{decks.map((d, i) => <Card key={i} onClick={() => setSel({ kind: "deck", data: d })} title={`${d.icon || "🃏"} ${d.title}`} sub={`${(d.questions || []).length} questions`} />)}</div></div>}
      {dtrees.length > 0 && <div className="mb-4"><div className="text-sm font-bold text-slate-700 mb-2">🌳 Arbres de décision</div><div className="grid sm:grid-cols-2 gap-2">{dtrees.map((t, i) => <Card key={i} onClick={() => setSel({ kind: "tree", data: t })} title={`${t.icon || "🌳"} ${t.title || t.titre}`} />)}</div></div>}
      {scenarios.length > 0 && <div className="mb-4"><div className="text-sm font-bold text-slate-700 mb-2">🎬 Simulateur de mission</div><div className="grid sm:grid-cols-2 gap-2">{scenarios.map((s, i) => <Card key={i} onClick={() => setSel({ kind: "sim", data: s })} title={`🎬 ${s.title}`} sub={`${(s.steps || []).length} étapes`} />)}</div></div>}
    </div>
  );
}
function AuditExams({ section, onBack }) {
  const exams = section.exams || [];
  const [sel, setSel] = useState(null);
  if (sel != null && exams[sel]) return <AScoredQuiz questions={exams[sel].questions} kind="exam" title={exams[sel].titre} icon="📝" onBack={() => setSel(null)} />;
  return (
    <div>
      <ABack onBack={onBack} />
      <SectionHero section={section} fallbackIcon="📝" />
      <div className="grid sm:grid-cols-2 gap-2">{exams.map((e, i) => <button key={i} onClick={() => setSel(i)} className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"><div className="font-semibold text-sm text-slate-800">📝 {e.titre}</div><div className="text-xs text-slate-400">{(e.questions || []).length} questions · {e.duree_min} min</div></button>)}</div>
    </div>
  );
}
function AuditSection({ skey, section, onBack }) {
  if (skey === "outils") return <AuditOutils section={section} onBack={onBack} />;
  if (skey === "arbres") return <AuditArbres section={section} onBack={onBack} />;
  if (skey === "quiz") return <AuditQuizHub section={section} onBack={onBack} />;
  if (skey === "examens_blancs") return <AuditExams section={section} onBack={onBack} />;
  return <AuditGeneric section={section} onBack={onBack} />;
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
  if (o.table && Array.isArray(o.table.headers) && Array.isArray(o.table.rows)) parts.push(<LTable key="tbl" headers={o.table.headers} rows={o.table.rows} />);
  if (typeof o.warning === "string" && o.warning) parts.push(<LCallout key="warn" tone="warn" title="À retenir" text={o.warning} />);
  Object.entries(o).forEach(([k, v]) => {
    if (META_KEYS.indexOf(k) >= 0 || ["body", "detail", "intro", "text", "callouts", "schema", "title", "label", "table", "warning"].indexOf(k) >= 0) return;
    if (v == null || (Array.isArray(v) && !v.length)) return;
    if (v && typeof v === "object" && !Array.isArray(v) && Array.isArray(v.headers) && Array.isArray(v.rows)) {
      parts.push(<div key={k} className="mt-2.5"><div className="text-[11px] font-bold text-violet-500 uppercase tracking-wide mb-1">{k.replace(/_/g, " ")}</div><LTable headers={v.headers} rows={v.rows} /></div>);
      return;
    }
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
function AuditFiche({ course }) {
  const blocks = course.fiche_revision || [];
  if (!blocks.length) return <div className="text-sm text-slate-400 p-6 text-center">Pas de fiche de révision pour cette norme.</div>;
  return <div>{blocks.map((b, i) => (
    <ACollapse key={i} title={b.title} accent="violet" defaultOpen={i < 3}>
      <div className="fiche-html text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(b.body || "") }} />
    </ACollapse>
  ))}</div>;
}

function AuditCourse({ std, course, onBack }) {
  const color = std.color || "#7c3aed";
  const [mode, setMode] = useState("cours");
  const hasFiche = !!(course.fiche_revision && course.fiche_revision.length);
  const tabCls = (on) => `px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${on ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"}`;
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mr-1"><ArrowLeft size={15} /> Retour</button>
        <button onClick={() => setMode("cours")} className={tabCls(mode === "cours")}>📖 Cours complet</button>
        {hasFiche && <button onClick={() => setMode("fiche")} className={tabCls(mode === "fiche")}>📋 Fiche de révision</button>}
        <button onClick={() => openPrint(std.code + (mode === "fiche" ? " — Fiche" : ""), mode === "fiche" ? ficheInnerHtml(std, course) : courseInnerHtml(std, course))}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700">📥 Télécharger en PDF</button>
      </div>
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
      {mode === "fiche" ? <AuditFiche course={course} /> : <div>
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
      </div>}
    </div>
  );
}

/* ── NAS / ISA : catégories → normes (résumé, points clés, spécificités CH) ── */
function nasCourseKey(code) {
  if (!code) return null;
  const up = String(code).toUpperCase();
  let m;
  if (/ISQM/.test(up)) { m = up.match(/ISQM\s*(\d)/); return m ? "ISQM" + m[1] : null; }
  if (/\bLCE\b/.test(up)) return "LCE";
  m = up.match(/(\d{3,4})/);
  return m ? m[1] : null;
}
function findStd(annuaire, num) {
  for (const s of ((annuaire && annuaire.series) || [])) {
    for (const st of (s.standards || [])) { if (st.num === num) return { ...st, color: s.color }; }
  }
  return null;
}
function NasNorm({ norm, cours, annuaire, onOpenCourse }) {
  const [open, setOpen] = useState(false);
  const key = nasCourseKey(norm.code);
  const std = key ? findStd(annuaire, key) : null;
  const hasCourse = !!(std && cours[key]);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-1.5">
      <button onClick={() => setOpen(!open)} className="w-full text-left px-3.5 py-3 hover:bg-slate-50 flex items-start gap-2.5">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800">{norm.code} <span className="font-normal text-violet-600">— {norm.title}</span></span>
          <span className="flex flex-wrap gap-2 mt-1 text-[11px]">
            {norm.co_ref && norm.co_ref !== "—" && <span className="text-slate-500">⚖️ {norm.co_ref}</span>}
            {norm.revised_on && <span className="text-slate-400">🕰️ Rév. {norm.revised_on}</span>}
            {norm.swiss_specifics && <span className="text-rose-600 font-medium">🇨🇭 Swiss</span>}
          </span>
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 mt-0.5 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 text-sm space-y-2.5">
          {hasCourse && <button onClick={() => onOpenCourse(std)} className="w-full mt-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-2.5 text-sm font-bold hover:opacity-95">📖 Voir le cours complet § par §</button>}
          {norm.summary && <div className="text-slate-600 italic border-l-2 border-slate-200 pl-3"><MdBlock text={norm.summary} /></div>}
          {norm.key_points && norm.key_points.length > 0 && <LKeypoints title="🔑 Points clés" items={norm.key_points} accent="violet" />}
          {norm.swiss_specifics && <LCallout tone="warn" title="🇨🇭 Spécificités suisses" text={norm.swiss_specifics} />}
          {norm.exam_traps && norm.exam_traps.length > 0 && <LKeypoints title="⚠️ Pièges d'examen" items={norm.exam_traps} accent="amber" />}
          {norm.detail && <MdBlock text={norm.detail} className="text-slate-600" />}
        </div>
      )}
    </div>
  );
}
function AuditNas({ nas, cours, annuaire, onOpenCourse, onBack }) {
  const [openCat, setOpenCat] = useState(0);
  const cats = (nas && nas.categories) || [];
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>
      <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 mb-4">
        <div className="flex items-center gap-2"><span className="text-2xl">{nas._icon || "📐"}</span><h2 className="text-xl font-bold text-slate-800">{nas._label || "NAS / ISA"}</h2></div>
        {nas._description && <p className="text-sm text-slate-600 mt-1"><MdInline text={nas._description} /></p>}
      </div>
      {cats.map((c, ci) => (
        <div key={c.id || ci} className="mb-3">
          <button onClick={() => setOpenCat(openCat === ci ? -1 : ci)} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-left">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color || "#7c3aed" }}></span>
            <span className="font-bold text-sm text-slate-800 flex-1">{c.label}</span>
            <span className="text-[11px] text-slate-400">{(c.norms || []).length}</span>
            <ChevronDown size={16} className={`text-slate-400 transition-transform ${openCat === ci ? "rotate-180" : ""}`} />
          </button>
          {openCat === ci && <div className="mt-2 pl-1">{(c.norms || []).map((n, ni) => <NasNorm key={ni} norm={n} cours={cours} annuaire={annuaire} onOpenCourse={onOpenCourse} />)}</div>}
        </div>
      ))}
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
  const [data, setData] = useState(() => (typeof window !== "undefined" && window.__AUDIT__) || null);
  const [loadErr, setLoadErr] = useState(null);
  const [view, setView] = useState({ k: "home" });
  useEffect(() => {
    if (data) return;
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
        {view.k === "home" && <AuditHome data={data} onSection={(k) => go(k === "annuaire" ? { k: "annuaire" } : k === "nas" ? { k: "nas" } : { k: "section", key: k })} />}
        {view.k === "annuaire" && (
          <div>
            <button onClick={() => go({ k: "home" })} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>
            <AuditAnnuaire annuaire={data.annuaire} cours={cours} onOpen={(st) => go({ k: "course", std: st, from: "annuaire" })} />
          </div>
        )}
        {view.k === "nas" && <AuditNas nas={data.nas || {}} cours={cours} annuaire={data.annuaire} onOpenCourse={(st) => go({ k: "course", std: st, from: "nas" })} onBack={() => go({ k: "home" })} />}
        {view.k === "course" && <AuditCourse std={view.std} course={cours[view.std.num] || {}} onBack={() => go({ k: view.from || "annuaire" })} />}
        {view.k === "section" && <AuditSection skey={view.key} section={data[view.key] || {}} onBack={() => go({ k: "home" })} />}
      </main>
      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-400">Outil pédagogique — NAS suisses alignées sur les ISA.</footer>
    </div>
  );
}
