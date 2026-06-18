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
    const hd = t.match(/^(#{1,4})\s+(.+)$/);
    if (hd) { const lvl = Math.min(hd[1].length + 2, 6); h += "<h" + lvl + ">" + mdInlineHtml(hd[2]) + "</h" + lvl + ">"; i++; continue; }
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
    + 'h1{font-size:22px;border-bottom:3px solid #7c3aed;padding-bottom:6px}h2{font-size:15px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;padding:6px 10px;margin:18px 0 6px}'
    + 'table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12.5px}th,td{border:1px solid #cbd5e1;padding:5px 8px;text-align:left;vertical-align:top}th{background:#f1f5f9}'
    + 'ul{margin:6px 0 6px 18px}p{margin:6px 0}strong{color:#0f172a}code{background:#f1f5f9;padding:1px 4px;border-radius:3px}blockquote{border:1px solid #ddd6fe;border-radius:6px;background:#faf5ff;margin:8px 0;padding:6px 12px;color:#475569}'
    + '.callout{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;margin:8px 0}@media print{body{margin:0}}'
    + '</style></head><body>' + inner + '</body></html>');
  w.document.close();
  setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 500);
}
/* Accès au bridge pywebview (depuis l'iframe → window, parent, top) */
function pywebApi() {
  const tryGet = (w) => { try { return (w && w.pywebview && w.pywebview.api) || null; } catch (e) { return null; } };
  return tryGet(window) || tryGet(window.parent) || tryGet(window.top) || null;
}
/* Ouvre un module natif (Canvas / Mission / Seuils) via la fenêtre parente */
function openAuditNative(module) {
  try {
    const parent = (window.parent && window.parent !== window) ? window.parent : window;
    parent.postMessage({ type: "openAuditNative", module: module }, "*");
  } catch (e) {}
}
function auditToast(msg, kind) {
  let el = document.getElementById("audit-toast");
  if (!el) { el = document.createElement("div"); el.id = "audit-toast"; document.body.appendChild(el); }
  const bg = kind === "err" ? "#dc2626" : kind === "info" ? "#475569" : "#7c3aed";
  el.textContent = msg;
  el.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;padding:10px 18px;border-radius:10px;font:600 13px/1.3 system-ui,sans-serif;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:80vw;text-align:center;opacity:1;transition:opacity .4s;background:" + bg;
  clearTimeout(auditToast._t);
  auditToast._t = setTimeout(() => { el.style.opacity = "0"; }, kind === "info" ? 8000 : 3200);
}
/* Téléchargement PDF : desktop → Python (vrai PDF dans Téléchargements) ; navigateur → impression */
function downloadAuditPdf(std, course, isFiche) {
  const num = std && std.num != null ? String(std.num) : null;
  const api = pywebApi();
  const method = isFiche ? "export_fiche_pdf" : "export_cours_pdf";
  const fallback = () => openPrint(std.code + (isFiche ? " — Fiche de révision" : ""), isFiche ? ficheInnerHtml(std, course) : courseInnerHtml(std, course));
  if (api && num && typeof api[method] === "function") {
    auditToast("⏳ Génération du PDF…", "info");
    try {
      Promise.resolve(api[method](num)).then((res) => {
        if (res && res.ok) auditToast("✓ PDF enregistré : " + (res.filename || "dossier Téléchargements"), "ok");
        else if (res && res.cancelled) auditToast("Export annulé.", "info");
        else auditToast("⚠️ " + ((res && res.error) || "Échec de l'export PDF") + " — impression navigateur…", "err"), fallback();
      }).catch(() => fallback());
    } catch (e) { fallback(); }
  } else {
    fallback();
  }
}

/* ── Méga-fiche de révision : HTML imprimable (toutes les normes ISA) ── */
function revisionInnerHtml(data) {
  const annuaire = (data && data.annuaire) || {};
  const cours = (data && data.annuaire_cours) || {};
  const series = annuaire.series || [];
  let total = 0;
  series.forEach((sr) => (sr.standards || []).forEach((st) => { if ((cours[st.num] || {}).fiche_revision) total++; }));
  let h = "<h1>Méga-fiche de révision — Normes ISA</h1>";
  h += '<p style="color:#475569"><em>' + total + " normes ISA · synthèse, repères clés, pièges d'examen et mnémotechniques. Document de révision complet.</em></p>";
  series.forEach((sr) => {
    const norms = (sr.standards || []).filter((st) => ((cours[st.num] || {}).fiche_revision || []).length);
    if (!norms.length) return;
    const col = sr.color || "#7c3aed";
    h += '<h1 style="color:' + col + ";border-bottom-color:" + col + '">' + escHtml(sr.label || sr.range || "") + "</h1>";
    norms.forEach((st) => {
      const c = cours[st.num] || {};
      h += "<h2>" + escHtml(st.code || "") + " — " + escHtml(st.title_fr || "") + "</h2>";
      (c.fiche_revision || []).forEach((b) => {
        if (b.title) h += '<h3 style="color:#7c3aed;margin:12px 0 4px;font-size:13.5px">' + escHtml(b.title) + "</h3>";
        if (b.body) h += mdToHtml(b.body);
      });
    });
  });
  return h;
}
/* Retire les renvois de paragraphes (§13, §A45, §8-9…) — fiche express only.
   Miroir léger du _strip_para_refs Python (utilisé par le repli impression). */
function stripParaRefs(text) {
  if (!text || text.indexOf("§") < 0) return text;
  var REF = "§\\s*A?\\d+\\s*[a-z]?(?:\\s*[\\-\\u2013]\\s*A?\\d+\\s*[a-z]?)?(?:\\s*\\([a-z]\\))?";
  var RUN = REF + "(?:\\s*[,/]\\s*" + REF + ")*(?:\\s+et\\s+s(?:\\.|uiv(?:\\.|ants)?)?)?";
  text = text.replace(new RegExp("\\s*\\(\\s*" + RUN + "\\s*\\)", "g"), "");
  text = text.replace(new RegExp("\\s*[\\u2014\\-:,]\\s*" + RUN, "g"), "");
  text = text.replace(new RegExp("(\\()\\s*" + RUN + "\\s*[/,+]\\s*", "g"), "$1");
  text = text.replace(new RegExp("\\s*" + RUN, "g"), "");
  text = text.replace(/\(\s*\)/g, "").replace(/\(\s*[/,;]\s*/g, "(").replace(/\s*[;,/]\s*\)/g, ")")
             .replace(/\s+([,.)])/g, "$1").replace(/\(\s+/g, "(").replace(/(\w)\(/g, "$1 (")
             .replace(/\s*\+\s*/g, " + ").replace(/\(\s*\+\s*/g, "(").replace(/[ \t]{2,}/g, " ")
             .replace(/\s+—\s*([).,])/g, "$1").replace(/[—\-]\s*$/, "");
  return text.trim();
}
/* Fiche EXPRESS : l'essentiel (tldr) + mnémo par norme — HTML imprimable condensé. */
function revisionExpressInnerHtml(data) {
  const annuaire = (data && data.annuaire) || {};
  const cours = (data && data.annuaire_cours) || {};
  const series = annuaire.series || [];
  let total = 0;
  series.forEach((sr) => (sr.standards || []).forEach((st) => { if ((cours[st.num] || {}).tldr) total++; }));
  let h = "<h1>Normes ISA — l'essentiel en bref</h1>";
  h += '<p style="color:#475569"><em>' + total + " normes · le paragraphe-clé + la mnémotechnique de chacune. Fiche express de révision.</em></p>";
  series.forEach((sr) => {
    const norms = (sr.standards || []).filter((st) => (cours[st.num] || {}).tldr);
    if (!norms.length) return;
    const col = sr.color || "#7c3aed";
    h += '<h1 style="color:' + col + ";border-bottom-color:" + col + '">' + escHtml(sr.label || sr.range || "") + "</h1>";
    norms.forEach((st) => {
      const c = cours[st.num] || {};
      h += '<h3 style="color:' + col + ';margin:12px 0 2px;font-size:14px">' + escHtml(st.code || "") + " · " + escHtml(st.title_fr || "") + "</h3>";
      h += mdToHtml(stripParaRefs(c.tldr || ""));
      const mn = c.mnemo || {};
      if (mn.code && (mn.items || []).length) {
        const bits = mn.items.map((it) => "<strong>" + escHtml(it.l || "") + "</strong> " + escHtml(stripParaRefs(it.t || ""))).join(" · ");
        h += '<div style="font-size:12px;color:#475569;background:#f8fafc;border-left:3px solid ' + col + ';padding:4px 8px;margin:3px 0 4px">🧠 <strong>' + escHtml(mn.code) + "</strong> — " + bits + "</div>";
      }
    });
  });
  return h;
}
/* Télécharge la fiche de révision : desktop → vrai PDF (bridge) ; sinon impression.
   kind = "express" (≈20 p., défaut) | "complete" (≈200 p.). */
function downloadRevisionPdf(data, kind) {
  const api = pywebApi();
  const express = kind !== "complete";
  const method = express ? "export_revision_express_pdf" : "export_revision_pdf";
  const fallback = () => express
    ? openPrint("Fiche express — Normes ISA", revisionExpressInnerHtml(data))
    : openPrint("Méga-fiche de révision — Normes ISA", revisionInnerHtml(data));
  if (api && typeof api[method] === "function") {
    auditToast(express ? "⏳ Génération de la fiche express…" : "⏳ Génération du PDF complet (47 normes)…", "info");
    try {
      Promise.resolve(api[method]()).then((res) => {
        if (res && res.ok) auditToast("✓ Fiche enregistrée : " + (res.filename || "dossier Téléchargements"), "ok");
        else auditToast("⚠️ " + ((res && res.error) || "Échec de l'export") + " — impression navigateur…", "err"), fallback();
      }).catch(() => fallback());
    } catch (e) { fallback(); }
  } else {
    fallback();
  }
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
        {r.w && <div className="text-sm text-slate-700 italic leading-relaxed rounded-lg p-3" style={{ background: r.c + "12", border: "1px solid " + r.c + "33" }}>{r.w}</div>}
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
      {open && <div className="px-3.5 pb-3.5 text-sm">{w.context && <div className="text-xs text-slate-500 mb-2">{w.context}</div>}<div className="bg-violet-50/60 border border-violet-100 rounded-lg p-3 text-slate-700 italic whitespace-pre-line leading-relaxed">{txt}</div><CopyBtn text={txt} /></div>}
    </div>
  );
}
const FIND_COLOR = { "Significant deficiency": "#ef4444", "Audit difference": "#f59e0b", "Material weakness": "#dc2626", "Observation": "#3b82f6" };
function FindingCard({ f }) {
  const [open, setOpen] = useState(false);
  const col = FIND_COLOR[f.severity] || "#7c3aed";
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
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
/* Templates Excel EY (desktop : générés par le backend openpyxl) */
function ExcelTemplates() {
  const [tpls, setTpls] = useState(null);
  const [busy, setBusy] = useState({});
  useEffect(() => {
    let dead = false;
    const api = pywebApi();
    if (!api || typeof api.list_audit_templates !== "function") { setTpls([]); return; }
    Promise.resolve(api.list_audit_templates()).then((r) => { if (!dead) setTpls(Array.isArray(r) ? r : []); }).catch(() => { if (!dead) setTpls([]); });
    return () => { dead = true; };
  }, []);
  if (!tpls || !tpls.length) return null;
  const dl = (id) => {
    const api = pywebApi();
    if (!api) return;
    setBusy({ ...busy, [id]: "⏳ Génération…" });
    Promise.resolve(api.download_audit_template(id)).then((r) => {
      setBusy((b) => ({ ...b, [id]: r && r.ok ? "✅ Ouvert" : r && r.cancelled ? null : "❌ Erreur" }));
      setTimeout(() => setBusy((b) => ({ ...b, [id]: null })), 2200);
    }).catch(() => { setBusy((b) => ({ ...b, [id]: "❌ Erreur" })); setTimeout(() => setBusy((b) => ({ ...b, [id]: null })), 2500); });
  };
  return (
    <ACollapse title={`📥 Bibliothèque Excel — templates EY (${tpls.length})`} accent="emerald">
      <div className="grid sm:grid-cols-2 gap-2">
        {tpls.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="font-semibold text-sm text-slate-800">{t.icon || "📥"} {t.name}</div>
            <div className="text-xs text-slate-500 leading-snug mb-2">{t.description}</div>
            <button onClick={() => dl(t.id)} disabled={!!busy[t.id]} className="w-full text-xs font-semibold py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-70">{busy[t.id] || "📥 Télécharger .xlsx"}</button>
          </div>
        ))}
      </div>
    </ACollapse>
  );
}
/* Teinte propre à chaque module : badge du héros + pastille d'icône sur l'accueil.
   Code couleur stable → repère spatial (où je suis, où je clique). */
const MODULE_THEME = {
  annuaire:              { badge: "bg-violet-500",  chip: "bg-violet-50 text-violet-700 border-violet-100" },
  nas:                   { badge: "bg-fuchsia-500", chip: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100" },
  cadre_legal:           { badge: "bg-amber-500",   chip: "bg-amber-50 text-amber-700 border-amber-100" },
  cycles:                { badge: "bg-cyan-500",    chip: "bg-cyan-50 text-cyan-700 border-cyan-100" },
  procedures_assertions: { badge: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  quiz:                  { badge: "bg-rose-500",    chip: "bg-rose-50 text-rose-700 border-rose-100" },
  cas_pratiques:         { badge: "bg-orange-500",  chip: "bg-orange-50 text-orange-700 border-orange-100" },
  examens_blancs:        { badge: "bg-red-500",     chip: "bg-red-50 text-red-700 border-red-100" },
  arbres:                { badge: "bg-green-600",   chip: "bg-green-50 text-green-700 border-green-100" },
  comparatifs:           { badge: "bg-indigo-500",  chip: "bg-indigo-50 text-indigo-700 border-indigo-100" },
  lexique:               { badge: "bg-teal-500",    chip: "bg-teal-50 text-teal-700 border-teal-100" },
  outils:                { badge: "bg-blue-500",    chip: "bg-blue-50 text-blue-700 border-blue-100" },
  modeles:               { badge: "bg-sky-500",     chip: "bg-sky-50 text-sky-700 border-sky-100" },
  terrain:               { badge: "bg-lime-600",    chip: "bg-lime-50 text-lime-700 border-lime-100" },
  independance:          { badge: "bg-purple-500",  chip: "bg-purple-50 text-purple-700 border-purple-100" },
  fraude:                { badge: "bg-pink-600",    chip: "bg-pink-50 text-pink-700 border-pink-100" },
  goingconcern:          { badge: "bg-yellow-500",  chip: "bg-yellow-50 text-yellow-700 border-yellow-100" },
  timeline:              { badge: "bg-slate-600",   chip: "bg-slate-100 text-slate-700 border-slate-200" },
  actualites:            { badge: "bg-fuchsia-600", chip: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100" },
};
function SectionHero({ section, fallbackIcon }) {
  const th = MODULE_THEME[section.__key] || {};
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5 shadow-sm flex items-start gap-4">
      <span className={`text-2xl w-12 h-12 flex items-center justify-center rounded-2xl text-white shadow-sm shrink-0 ${th.badge || "bg-violet-500"}`}>{section._icon || fallbackIcon || "📋"}</span>
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-slate-800 leading-tight">{section._label}</h2>
        {section._description && <p className="text-sm text-slate-500 mt-1 leading-relaxed"><MdInline text={section._description} /></p>}
      </div>
    </div>
  );
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
      <ExcelTemplates />
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
        <div className="rounded-xl p-4" style={{ background: color + "10", border: "1px solid " + color + "44" }}>
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
function AScoredQuiz({ questions, kind, title, icon, intro, onBack, progressKey }) {
  const qs = (questions || []).map(q => normAuditQ(q, kind));
  const [i, setI] = useState(0);
  const [ans, setAns] = useState({});
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done || !progressKey) return;
    const api = pywebApi();
    if (!api || typeof api.save_audit_progress !== "function") return;
    const correct = Object.keys(ans).filter(k => qs[k] && qs[k].options[ans[k]] && qs[k].options[ans[k]].ok).length;
    try { Promise.resolve(api.save_audit_progress(progressKey.kind, progressKey.id, "completed", "score:" + correct + "/" + qs.length)).catch(() => {}); } catch (e) {}
  }, [done]);
  if (!qs.length) return <div><ABack onBack={onBack} label="Menu" /><div className="text-sm text-slate-400">Aucune question.</div></div>;
  const total = qs.length;
  if (done) {
    const correct = Object.keys(ans).filter(k => qs[k] && qs[k].options[ans[k]] && qs[k].options[ans[k]].ok).length;
    const pct = Math.round(100 * correct / total);
    let mood = "🏆 Excellent !", col = "#10b981";
    if (pct < 60) { mood = "⚠️ À retravailler"; col = "#ef4444"; } else if (pct < 80) { mood = "👍 Solide"; col = "#f59e0b"; }
    return <div><ABack onBack={onBack} label="Menu" /><div className="rounded-2xl border bg-white p-8 text-center shadow-sm" style={{ borderColor: col + "55" }}><div className="text-5xl mb-2">{mood.split(" ")[0]}</div><div className="text-lg font-bold text-slate-800 mb-3">{title} — terminé</div><div className="text-4xl font-extrabold mb-1" style={{ color: col }}>{correct} / {total}</div><div className="text-sm text-slate-500">Score {pct}% — {mood}</div><div className="flex gap-2 justify-center mt-6"><button onClick={() => { setAns({}); setI(0); setDone(false); }} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold">🔁 Recommencer</button><button onClick={onBack} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm">📋 Menu</button></div></div></div>;
  }
  const q = qs[i];
  const chosen = ans[i];
  const answered = chosen != null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2"><button onClick={onBack} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">← Menu</button><div className="flex-1 font-bold text-sm text-slate-800">{icon} {title}</div><div className="text-xs text-slate-500 font-semibold tabular-nums">{i + 1} / {total}</div></div>
      <div className="h-1.5 rounded-full bg-slate-200 mb-4 overflow-hidden"><div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: Math.round(100 * (i + (answered ? 1 : 0)) / total) + "%" }}></div></div>
      {i === 0 && intro && <div className="mb-3"><LCallout tone="warn" title="Contexte" text={intro} /></div>}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-3 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <span className="w-7 h-7 grid place-items-center rounded-lg bg-violet-100 text-violet-700 text-xs font-bold shrink-0">Q{i + 1}</span>
          <div className="text-base font-semibold text-slate-800 leading-snug">{q.q}</div>
        </div>
        <div className="space-y-2">{q.options.map((o, j) => {
          let cls = "border-slate-200 bg-white hover:border-violet-400 hover:bg-violet-50/40";
          let chip = "bg-slate-100 text-slate-500";
          if (answered) {
            if (o.ok) { cls = "border-emerald-400 bg-emerald-50"; chip = "bg-emerald-500 text-white"; }
            else if (j === chosen) { cls = "border-rose-400 bg-rose-50"; chip = "bg-rose-500 text-white"; }
            else { cls = "border-slate-200 bg-white opacity-60"; }
          }
          return (
            <button key={j} disabled={answered} onClick={() => setAns({ ...ans, [i]: j })} className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm text-slate-700 transition-colors flex items-start gap-2.5 ${cls}`}>
              <span className={`w-6 h-6 grid place-items-center rounded-md text-[11px] font-bold shrink-0 ${chip}`}>{answered && o.ok ? "✓" : answered && j === chosen ? "✗" : String.fromCharCode(65 + j)}</span>
              <span className="leading-snug pt-0.5">{o.text}</span>
            </button>
          );
        })}</div>
        {answered && <div className={`mt-4 text-sm rounded-xl border p-3.5 leading-relaxed ${q.options[chosen].ok ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" : "bg-rose-50/70 border-rose-200 text-rose-900"}`}><span className="font-bold">{q.options[chosen].ok ? "✅ Correct ! " : "❌ Incorrect. "}</span><span className="text-slate-700">{q.options[chosen].expl || q.expl || ""}</span>{q.ref && <span className="block mt-1.5"><span className="text-[11px] bg-white border border-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-medium">📚 {q.ref}</span></span>}</div>}
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
    if (sel.kind === "deck") return <AScoredQuiz questions={sel.data.questions} kind="deck" title={sel.data.title} icon={sel.data.icon || "🃏"} onBack={() => setSel(null)} progressKey={{ kind: "quiz", id: sel.data.id }} />;
    if (sel.kind === "tree") return <div><ABack onBack={() => setSel(null)} label="Menu Quiz" /><ATree tree={sel.data} /></div>;
    if (sel.kind === "sim") return <AScoredQuiz questions={sel.data.steps} kind="sim" title={sel.data.title} icon="🎬" intro={sel.data.intro} onBack={() => setSel(null)} progressKey={{ kind: "simulator", id: sel.data.id }} />;
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
  if (sel != null && exams[sel]) return <AScoredQuiz questions={exams[sel].questions} kind="exam" title={exams[sel].titre} icon="📝" onBack={() => setSel(null)} progressKey={{ kind: "exam", id: exams[sel].id }} />;
  return (
    <div>
      <ABack onBack={onBack} />
      <SectionHero section={section} fallbackIcon="📝" />
      <div className="grid sm:grid-cols-2 gap-2">{exams.map((e, i) => <button key={i} onClick={() => setSel(i)} className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"><div className="font-semibold text-sm text-slate-800">📝 {e.titre}</div><div className="text-xs text-slate-400">{(e.questions || []).length} questions · {e.duree_min} min</div></button>)}</div>
    </div>
  );
}
/* ═══ Cadre légal : sections → sous-sections (accordéon) ═══ */
function CadreSub({ ss }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-slate-50"><span className="text-sm font-semibold text-slate-700">{ss.title}</span><ChevronDown size={15} className={`text-violet-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} /></button>
      {open && <div className="px-4 pb-3.5 pt-0.5">{ss.content && <div className="text-sm text-slate-600 leading-relaxed mb-2"><MdBlock text={ss.content} /></div>}{(ss.key_points || []).length > 0 && <LKeypoints title="🔑 Points clés" items={ss.key_points} accent="violet" />}</div>}
    </div>
  );
}
function AuditCadre({ section, onBack }) {
  return (
    <div>
      <ABack onBack={onBack} /><SectionHero section={section} fallbackIcon="⚖️" />
      {(section.sections || []).map((s, i) => (
        <div key={i} className="mb-3 rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60"><div className="font-bold text-sm text-slate-800">📜 {s.title}</div>{s.intro && <div className="text-xs text-slate-500 mt-1 leading-relaxed"><MdInline text={s.intro} /></div>}</div>
          <div>{(s.subsections || []).map((ss, j) => <CadreSub key={j} ss={ss} />)}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══ Comparatifs IFRS / RPC / CO (table + recherche) ═══ */
function AuditComparatifs({ section, onBack }) {
  const themes = section.themes || [];
  const [q, setQ] = useState("");
  const f = q.trim().toLowerCase();
  const shown = f ? themes.filter(t => (t.title + " " + (t.nas_ref || "") + " " + (t.rows || []).map(r => r.aspect + " " + r.ifrs + " " + r.rpc + " " + r.co).join(" ")).toLowerCase().includes(f)) : themes;
  return (
    <div>
      <ABack onBack={onBack} /><SectionHero section={section} fallbackIcon="📊" />
      <div className="relative mb-4"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un thème ou mot-clé…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-violet-500 outline-none" /></div>
      {shown.map((t, i) => (
        <div key={i} className="mb-5 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-50/70 to-transparent">
            <div className="font-bold text-sm text-slate-800">📊 {t.title}</div>
            {t.nas_ref && <span className="text-[11px] text-violet-700 bg-white border border-violet-200 px-2.5 py-0.5 rounded-full font-medium shrink-0"><MdInline text={t.nas_ref} /></span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr>
                <th className="text-left px-3 py-2.5 font-bold text-slate-500 bg-slate-50 w-[18%]">Aspect</th>
                <th className="text-left px-3 py-2.5 font-bold text-emerald-700 bg-emerald-50/70 border-l border-white">🟢 IFRS / IAS</th>
                <th className="text-left px-3 py-2.5 font-bold text-blue-700 bg-blue-50/70 border-l border-white">🔵 Swiss GAAP RPC</th>
                <th className="text-left px-3 py-2.5 font-bold text-amber-700 bg-amber-50/70 border-l border-white">🟠 CO</th>
              </tr></thead>
              <tbody>{(t.rows || []).map((r, j) => (
                <tr key={j} className={`align-top ${j % 2 ? "bg-slate-50/40" : "bg-white"}`}>
                  <td className="px-3 py-2.5 font-semibold text-slate-700 border-t border-slate-100">{r.aspect}</td>
                  <td className="px-3 py-2.5 text-slate-600 border-t border-l border-slate-100 leading-relaxed"><MdInline text={r.ifrs} /></td>
                  <td className="px-3 py-2.5 text-slate-600 border-t border-l border-slate-100 leading-relaxed"><MdInline text={r.rpc} /></td>
                  <td className="px-3 py-2.5 text-slate-600 border-t border-l border-slate-100 leading-relaxed"><MdInline text={r.co} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ))}
      {shown.length === 0 && <div className="text-sm text-slate-400 text-center py-6">Aucun résultat.</div>}
    </div>
  );
}

/* ═══ Cycles d'audit (sélecteur + 5 catégories) ═══ */
function CycBlock({ icon, title, items, color }) {
  if (!items || !items.length) return null;
  return <div className="mb-3"><div className="text-xs font-bold mb-1.5" style={{ color }}>{icon} {title} <span className="text-slate-400 font-medium">({items.length})</span></div><ul className="space-y-1">{items.map((it, i) => <li key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-slate-300 shrink-0">•</span><span><MdInline text={it} /></span></li>)}</ul></div>;
}
function AuditCycles({ section, onBack }) {
  const items = section.items || [];
  const [sel, setSel] = useState(0);
  const c = items[sel] || {};
  return (
    <div>
      <ABack onBack={onBack} /><SectionHero section={section} fallbackIcon="🔄" />
      <div className="flex flex-wrap gap-2 mb-4">{items.map((it, i) => <button key={i} onClick={() => setSel(i)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${i === sel ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"}`}>{it.icon || "🔄"} {it.title}</button>)}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-lg font-extrabold text-slate-800 mb-3">{c.icon || "🔄"} {c.title}</div>
        <div className="grid sm:grid-cols-2 gap-x-6">
          <div><CycBlock icon="⚠️" title="Risques typiques (NAS 315)" items={c.risks} color="#ef4444" /><CycBlock icon="🎯" title="Assertions concernées" items={c.assertions} color="#3b82f6" /></div>
          <div><CycBlock icon="🛡️" title="Contrôles clés du SCI" items={c.controls} color="#10b981" /><CycBlock icon="🔬" title="Tests substantifs (TOD)" items={c.tests_substantive} color="#8b5cf6" /></div>
        </div>
        {(c.ey_tips || []).length > 0 && <div className="mt-2 pt-3 border-t border-slate-100"><CycBlock icon="💡" title="Tips terrain EY" items={c.ey_tips} color="#d97706" /></div>}
      </div>
    </div>
  );
}

/* ═══ Terrain EY (phases + soft skills) ═══ */
function TerrainCheck({ items }) {
  const [ck, setCk] = useState({});
  return <div className="mb-2"><div className="text-xs font-bold text-violet-600 mb-1">✅ Checklist</div>{items.map((it, i) => <label key={i} className="flex items-start gap-2 text-sm text-slate-600 py-0.5 cursor-pointer"><input type="checkbox" checked={!!ck[i]} onChange={e => setCk({ ...ck, [i]: e.target.checked })} className="mt-1 shrink-0" /><span className={ck[i] ? "line-through text-slate-400" : ""}><MdInline text={it} /></span></label>)}</div>;
}
function AuditTerrain({ section, onBack }) {
  const phases = section.phases || [];
  const soft = section.soft_skills || {};
  const softLabels = { client_communication: "💬 Communication client", time_management: "⏱️ Gestion du temps", review_notes_handling: "📝 Review notes", common_mistakes: "🚫 Erreurs fréquentes" };
  return (
    <div>
      <ABack onBack={onBack} /><SectionHero section={section} fallbackIcon="🛠️" />
      {phases.map((p, i) => (
        <ACollapse key={i} title={`${p.icon || "📌"} ${p.title}`} accent="violet" defaultOpen={i === 0}>
          {p.objective && <div className="text-sm text-slate-600 italic mb-2 bg-violet-50/50 rounded-lg px-3 py-2"><MdInline text={p.objective} /></div>}
          {(p.checklist || []).length > 0 && <TerrainCheck items={p.checklist} />}
          {(p.deliverables || []).length > 0 && <LKeypoints title="📦 Livrables (workpapers)" items={p.deliverables} accent="emerald" />}
          {(p.tools || []).length > 0 && <LKeypoints title="🔧 Outils EY" items={p.tools} accent="blue" />}
        </ACollapse>
      ))}
      {Object.keys(soft).length > 0 && <ACollapse title="🤝 Soft skills du junior" accent="amber">{Object.entries(soft).map(([k, v]) => (Array.isArray(v) && v.length) ? <div key={k} className="mb-2"><div className="text-xs font-bold text-slate-700 mb-1">{softLabels[k] || k}</div><ul className="space-y-1">{v.map((x, j) => <li key={j} className="text-sm text-slate-600 flex gap-2"><span className="text-slate-300 shrink-0">•</span><span><MdInline text={x} /></span></li>)}</ul></div> : null)}</ACollapse>}
    </div>
  );
}

/* ═══ Procédures par assertion (légende + cycle → lignes) ═══ */
function AuditProcedures({ section, onBack }) {
  const ass = section.assertions_ref || [];
  const cycles = section.cycles || [];
  const [sel, setSel] = useState(0);
  const c = cycles[sel] || {};
  return (
    <div>
      <ABack onBack={onBack} /><SectionHero section={section} fallbackIcon="✅" />
      {ass.length > 0 && <div className="rounded-xl border border-slate-200 bg-white p-3 mb-4"><div className="text-xs font-bold text-slate-700 mb-2">Assertions (ISA 315)</div><div className="flex flex-wrap gap-2">{ass.map((a, i) => <span key={i} className="text-[11px] px-2 py-1 rounded-lg" style={{ background: (a.color || "#7c3aed") + "18", color: a.color || "#7c3aed" }} title={a.def}><strong>{a.code}</strong> — {a.nom}</span>)}</div></div>}
      <div className="flex flex-wrap gap-2 mb-4">{cycles.map((cy, i) => <button key={i} onClick={() => setSel(i)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${i === sel ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"}`} style={i === sel ? { background: cy.color || "#7c3aed" } : {}}>{cy.icon || "📁"} {cy.nom}</button>)}</div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-lg font-extrabold text-slate-800 mb-2">{c.icon || "📁"} {c.nom}</div>
        {(c.risques || []).length > 0 && <div className="mb-3"><div className="text-xs font-bold text-rose-600 mb-1">⚠️ Risques typiques</div><div className="flex flex-wrap gap-1.5">{c.risques.map((r, i) => <span key={i} className="text-[11px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded">{r}</span>)}</div></div>}
        <div className="space-y-2">{(c.lignes || []).map((l, i) => <div key={i} className="rounded-xl border border-slate-200 p-3"><div className="flex items-center gap-2 mb-1"><span className="text-[11px] font-bold text-white px-2 py-0.5 rounded shrink-0" style={{ background: c.color || "#7c3aed" }}>{l.assertion}</span><span className="text-sm font-semibold text-slate-800">{l.risque}</span></div><ul className="mt-1.5 space-y-1">{(l.procedures || []).map((p, j) => <li key={j} className="text-sm text-slate-600 flex gap-2"><span className="text-emerald-500 shrink-0">▸</span><span><MdInline text={p} /></span></li>)}</ul></div>)}</div>
      </div>
    </div>
  );
}

/* ═══ Cas pratiques (liste → détail avec solutions révélables) ═══ */
function CasQ({ q }) {
  const [show, setShow] = useState(false);
  return <div className="mb-2 rounded-xl border border-slate-200 bg-white p-3"><div className="text-sm font-semibold text-slate-800 mb-1.5"><MdInline text={q.q} /></div><button onClick={() => setShow(!show)} className="text-xs px-2.5 py-1 rounded-md border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100">{show ? "Masquer la solution" : "Voir la solution"}</button>{show && <div className="mt-2 text-sm text-slate-700 leading-relaxed bg-emerald-50/60 border border-emerald-100 rounded-lg px-3 py-2"><MdBlock text={q.solution} /></div>}</div>;
}
function CasDetail({ cas, onBack }) {
  return (
    <div>
      <ABack onBack={onBack} label="Tous les cas" />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5 shadow-sm flex items-start gap-4"><span className="text-2xl w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shrink-0">📝</span><div className="min-w-0"><h2 className="text-lg font-bold text-slate-800 leading-tight">{cas.titre}</h2><div className="flex flex-wrap gap-2 mt-1 text-[11px] text-slate-500">{cas.niveau && <span className="bg-slate-100 px-2 py-0.5 rounded">{cas.niveau}</span>}{cas.duree && <span>⏱️ {cas.duree}</span>}</div>{(cas.themes || []).length > 0 && <div className="flex flex-wrap gap-1 mt-2">{cas.themes.map((t, i) => <span key={i} className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded border border-violet-100">{t}</span>)}</div>}</div></div>
      {cas.contexte && <ACollapse title="📋 Contexte" accent="blue" defaultOpen={true}><MdBlock text={cas.contexte} className="text-sm text-slate-700" /></ACollapse>}
      <ACollapse title={`❓ Questions (${(cas.questions || []).length})`} accent="violet" defaultOpen={true}>{(cas.questions || []).map((q, i) => <CasQ key={i} q={q} />)}</ACollapse>
      {(cas.points_cles || []).length > 0 && <LKeypoints title="✅ Points clés à retenir" items={cas.points_cles} accent="emerald" />}
    </div>
  );
}
function AuditCas({ section, onBack }) {
  const cas = section.cas || [];
  const [sel, setSel] = useState(null);
  if (sel != null && cas[sel]) return <CasDetail cas={cas[sel]} onBack={() => setSel(null)} />;
  return (
    <div>
      <ABack onBack={onBack} /><SectionHero section={section} fallbackIcon="📝" />
      <div className="grid sm:grid-cols-2 gap-2">{cas.map((c, i) => <button key={i} onClick={() => setSel(i)} className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"><div className="font-semibold text-sm text-slate-800">📝 {c.titre}</div><div className="flex flex-wrap gap-2 mt-1 text-[11px] text-slate-400">{c.niveau && <span className="bg-slate-100 px-2 py-0.5 rounded">{c.niveau}</span>}{c.duree && <span>⏱️ {c.duree}</span>}<span>{(c.questions || []).length} questions</span></div>{(c.themes || []).length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">{c.themes.map((t, j) => <span key={j} className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">{t}</span>)}</div>}</button>)}</div>
    </div>
  );
}

/* ═══ Lexique trilingue (catégories + recherche) ═══ */
function lexTerm(it) { return it.acronym || it.terme || it.expression || it.sigle || it.fr || it.mot || it.term || Object.values(it)[0]; }
function LexRow({ it }) {
  const term = lexTerm(it);
  const fr = it.fr && it.fr !== term ? it.fr : null;
  const ctx = it.context || it.def || it.sens || it.explication || it.definition;
  return <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-sm font-bold text-violet-700">{term}{fr && <span className="font-normal text-slate-700"> — {fr}</span>}</div><div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[12px]">{it.en && <span className="text-slate-500">🇬🇧 {it.en}</span>}{it.de && <span className="text-slate-400">🇩🇪 {it.de}</span>}</div>{ctx && <div className="text-xs text-slate-500 mt-1 leading-relaxed">{ctx}</div>}</div>;
}
function AuditLexique({ section, onBack }) {
  const cats = section.categories || [];
  const [q, setQ] = useState("");
  const f = q.trim().toLowerCase();
  return (
    <div>
      <ABack onBack={onBack} /><SectionHero section={section} fallbackIcon="📖" />
      <div className="relative mb-4"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un terme, sigle, traduction…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-violet-500 outline-none" /></div>
      {cats.map((cat, ci) => {
        const items = (cat.items || []).filter(it => !f || JSON.stringify(it).toLowerCase().includes(f));
        if (!items.length) return null;
        return <div key={ci} className="mb-4"><div className="flex items-center gap-2 mb-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color || "#7c3aed" }}></span><h3 className="text-sm font-bold text-slate-800">{cat.label}</h3><span className="text-[11px] text-slate-400">({items.length})</span></div><div className="space-y-1.5">{items.map((it, i) => <LexRow key={i} it={it} />)}</div></div>;
      })}
    </div>
  );
}

/* ═══ Modèles & wording (templates copiables) ═══ */
function ModeleCard({ t }) {
  const [open, setOpen] = useState(false);
  const body = t.contenu || t.wording || t.texte || "";
  return <div className="rounded-xl border border-slate-200 bg-white overflow-hidden"><button onClick={() => setOpen(!open)} className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-2"><span><span className="block text-sm font-semibold text-slate-800">📄 {t.titre || t.title}</span>{t.contexte && <span className="text-xs text-slate-400">{t.contexte}</span>}</span><ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} /></button>{open && <div className="px-3.5 pb-3.5"><div className="bg-slate-50 rounded p-3 text-sm text-slate-700 whitespace-pre-line leading-relaxed" style={{ fontFamily: "Georgia, serif" }}>{body}</div><CopyBtn text={body} label="📋 Copier le modèle" /></div>}</div>;
}
function AuditModeles({ section, onBack }) {
  const cats = section.categories || [];
  return (
    <div>
      <ABack onBack={onBack} /><SectionHero section={section} fallbackIcon="📄" />
      {cats.map((cat, ci) => <div key={ci} className="mb-4"><div className="flex items-center gap-2 mb-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color || "#7c3aed" }}></span><h3 className="text-sm font-bold text-slate-800">{cat.label}</h3></div><div className="space-y-2">{(cat.templates || []).map((t, i) => <ModeleCard key={i} t={t} />)}</div></div>)}
    </div>
  );
}

/* ═══ Timeline de mission (frise verticale) ═══ */
function MiniList({ icon, title, items, color }) {
  return <div className="mb-1"><div className="text-xs font-bold mb-1" style={{ color }}>{icon} {title}</div><ul className="space-y-0.5">{items.map((it, i) => <li key={i} className="text-[13px] text-slate-600 flex gap-1.5"><span className="text-slate-300 shrink-0">•</span><span><MdInline text={it} /></span></li>)}</ul></div>;
}
function AuditTimeline({ section, onBack }) {
  const phases = section.phases || [];
  return (
    <div>
      <ABack onBack={onBack} /><SectionHero section={section} fallbackIcon="🗓️" />
      <div className="relative pl-6">
        <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-violet-200"></div>
        {phases.map((p, i) => (
          <div key={i} className="relative mb-4">
            <div className="absolute -left-[18px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white" style={{ background: p.color || "#7c3aed" }}></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2"><div className="font-bold text-sm text-slate-800">{p.icon || "📌"} {p.nom}</div>{p.periode && <span className="text-[11px] text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{p.periode}</span>}</div>
              {p.objectif && <div className="text-sm text-slate-600 italic mt-1 mb-2"><MdInline text={p.objectif} /></div>}
              <div className="grid sm:grid-cols-2 gap-x-4">{(p.activites || []).length > 0 && <MiniList icon="⚙️" title="Activités" items={p.activites} color="#3b82f6" />}{(p.livrables || []).length > 0 && <MiniList icon="📦" title="Livrables" items={p.livrables} color="#10b981" />}</div>
              <div className="flex flex-wrap gap-2 mt-2 text-[11px]">{(p.normes || []).map((n, j) => <span key={j} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded"><MdInline text={n} /></span>)}{p.delais && <span className="text-amber-700 font-medium">⏰ {p.delais}</span>}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ Blocs (fraude, indépendance, going concern, actualités) ═══ */
function AuditBlocs({ section, onBack, fallbackIcon }) {
  const blocs = section.blocs || [];
  return (
    <div>
      <ABack onBack={onBack} /><SectionHero section={section} fallbackIcon={fallbackIcon || "📋"} />
      {blocs.map((b, i) => (
        <ACollapse key={i} title={`${b.icon || "▸"} ${b.titre}`} accent="violet" defaultOpen={i < 2}>
          {b.intro && <MdBlock text={b.intro} className="text-sm text-slate-700 mb-2" />}
          {b.table && Array.isArray(b.table.headers) && <LTable headers={b.table.headers} rows={b.table.rows} />}
          {(b.liste || []).length > 0 && <ul className="space-y-1 my-2">{b.liste.map((x, j) => <li key={j} className="text-sm text-slate-600 flex gap-2"><span className="text-violet-400 shrink-0">▸</span><span><MdInline text={x} /></span></li>)}</ul>}
          {b.warning && <LCallout tone="warn" title="À retenir" text={b.warning} />}
        </ACollapse>
      ))}
    </div>
  );
}

/* ═══ Base de cours — livre MSA / NCR (volume → sommaire → chapitre) ═══ */
function BookQA({ qa }) {
  const [show, setShow] = useState(false);
  return <div className="mb-2 rounded-xl border border-slate-200 bg-white p-3"><div className="text-sm font-semibold text-slate-800 mb-1.5"><MdInline text={qa.q} /></div><button onClick={() => setShow(!show)} className="text-xs px-2.5 py-1 rounded-md border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100">{show ? "Masquer la réponse" : "Voir la réponse"}</button>{show && <div className="mt-2 text-sm text-slate-700 leading-relaxed bg-emerald-50/60 border border-emerald-100 rounded-lg px-3 py-2"><MdBlock text={qa.a} /></div>}</div>;
}
/* Les 7 encadrés du MSA (mêmes libellés que l'ancien lecteur) */
const BOOK_CALLOUTS = [
  ["info", "💡 Pour info", "info"],
  ["info", "⚖️ Texte légal", "legal_quote"],
  ["key",  "🟢 Exemple concret", "example"],
  ["info", "📊 Comparaison", "comparison"],
  ["key",  "🎯 Point clé", "key_point"],
  ["tip",  "🧠 Astuce mémo", "tip"],
  ["warn", "⚠️ Attention", "warning"],
];
function SourceLine({ s }) {
  const parts = String(s).split(/(https?:\/\/[^\s)]+)/g);
  return <span>{parts.map((p, i) => /^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noopener" className="text-violet-600 underline break-all">{p}</a> : <span key={i}>{p}</span>)}</span>;
}
function bookInnerHtml(f) {
  let h = "<h1>" + (f.code ? escHtml(f.code) + " — " : "") + escHtml(f.title || "") + "</h1>";
  if (f.ref_msa) h += "<p><em>📖 " + escHtml(f.ref_msa) + "</em></p>";
  if (f.bases_legales) h += '<div class="callout"><strong>⚖️ Bases légales</strong> ' + mdInlineHtml(f.bases_legales) + "</div>";
  if (f.summary) h += mdToHtml(f.summary);
  if (f.mnemonics) h += '<div class="callout"><strong>🧠 Astuce mémo</strong> ' + mdInlineHtml(f.mnemonics) + "</div>";
  (f.sections || []).forEach((s) => {
    h += "<h2>" + escHtml(s.title || "") + "</h2>";
    if (s.content) h += mdToHtml(s.content);
    BOOK_CALLOUTS.forEach(([tone, label, key]) => { if (s[key]) h += '<div class="callout"><strong>' + escHtml(label) + "</strong> " + mdToHtml(String(s[key])) + "</div>"; });
  });
  if ((f.auto_test || []).length) { h += "<h2>🧪 Auto-test</h2>"; f.auto_test.forEach((qa, i) => { h += "<p><strong>" + (i + 1) + ". " + mdInlineHtml(qa.q) + "</strong><br>" + mdInlineHtml(qa.a) + "</p>"; }); }
  if (f.statut) h += "<p><em>" + escHtml(f.statut) + (f.maj ? " · maj " + escHtml(f.maj) : "") + "</em></p>";
  return h;
}
function downloadBookPdf(item) {
  const api = pywebApi();
  const f = item.fiche || {};
  const fallback = () => openPrint(f.title || item.titre || "Chapitre", bookInnerHtml(f));
  if (api && item.path && typeof api.export_audit_fiche_pdf === "function") {
    auditToast("⏳ Génération du PDF…", "info");
    try {
      Promise.resolve(api.export_audit_fiche_pdf(item.path)).then((res) => {
        if (res && res.ok) auditToast("✓ PDF enregistré" + (res.path ? " : " + res.path : ""), "ok");
        else if (res && res.cancelled) auditToast("Export annulé.", "info");
        else { auditToast("⚠️ " + ((res && res.error) || "Échec de l'export") + " — impression navigateur…", "err"); fallback(); }
      }).catch(fallback);
    } catch (e) { fallback(); }
  } else fallback();
}
function BookChapter({ item, partieTitle, onBack, onPrev, onNext, position, anchor }) {
  const f = item.fiche || {};
  useEffect(() => {
    if (!anchor) return;
    const t = setTimeout(() => { try { const el = document.getElementById("bk-" + anchor); if (el) el.scrollIntoView({ block: "start" }); } catch (e) {} }, 250);
    return () => clearTimeout(t);
  }, [anchor, item]);
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> Sommaire</button>
        <div className="flex items-center gap-2 flex-wrap">
          {position && <span className="text-[11px] text-slate-400 tabular-nums">{position}</span>}
          {onPrev && <button onClick={onPrev} className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">← Précédent</button>}
          {onNext && <button onClick={onNext} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white font-semibold">Suivant →</button>}
          <button onClick={() => downloadBookPdf(item)} className="text-xs px-3 py-1.5 rounded-lg bg-violet-100 text-violet-700 font-semibold hover:bg-violet-200">📥 PDF</button>
        </div>
      </div>
      <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 mb-4">
        <div className="flex flex-wrap items-center gap-1.5 mb-1 text-[11px]">
          {partieTitle && <span className="text-violet-500 font-semibold">{partieTitle}</span>}
          {f.category && <span className="text-slate-400">· {f.category}</span>}
        </div>
        <div className="flex items-start gap-2.5 flex-wrap">
          {f.code && <span className="text-white text-xs font-bold px-2.5 py-1 rounded-lg bg-violet-600 shrink-0 mt-0.5">{f.code}</span>}
          <h2 className="text-xl font-bold text-slate-800 leading-tight">{f.title || item.titre}</h2>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500">
          {f.niveau && <span className="bg-white px-2 py-0.5 rounded border border-slate-200">🎓 {f.niveau}</span>}
          {f.normes && <span>📐 <MdInline text={f.normes} /></span>}
        </div>
        {f.ref_msa && <div className="mt-2 text-[11px] text-slate-500 leading-relaxed">📖 {f.ref_msa}</div>}
        {f.summary && <div className="mt-2 text-sm text-slate-700"><MdBlock text={f.summary} /></div>}
      </div>
      {f.bases_legales && <div className="mb-3"><LCallout tone="info" title="⚖️ Bases légales" text={f.bases_legales} /></div>}
      {f.mnemonics && <div className="mb-3"><LCallout tone="tip" title="🧠 Astuce mémo" text={f.mnemonics} /></div>}
      {(f.sections || []).map((s, i) => (
        <div key={i} id={s.anchor ? "bk-" + s.anchor : undefined}>
          <ACollapse title={s.title} accent="violet" defaultOpen={true}>
            {s.content && <MdBlock text={s.content} className="text-sm text-slate-700" />}
            {BOOK_CALLOUTS.map(([tone, label, key], j) => s[key] ? <div key={j} className="mt-2"><LCallout tone={tone} title={label} text={String(s[key])} /></div> : null)}
          </ACollapse>
        </div>
      ))}
      {(f.auto_test || []).length > 0 && <ACollapse title={`🧪 Auto-test (${f.auto_test.length})`} defaultOpen={false}>{f.auto_test.map((qa, i) => <BookQA key={i} qa={qa} />)}</ACollapse>}
      {(f.sources || []).length > 0 && <ACollapse title="📚 Sources consultées" defaultOpen={false}><ul className="space-y-1">{f.sources.map((s, i) => <li key={i} className="text-xs text-slate-500 flex gap-2"><span className="shrink-0">•</span><SourceLine s={s} /></li>)}</ul></ACollapse>}
      {f.statut && <div className="mt-3 text-[11px] text-slate-400 leading-relaxed">{f.statut}{f.maj ? " · maj " + f.maj : ""}</div>}
      <div className="flex justify-between mt-4">{onPrev ? <button onClick={onPrev} className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">← Précédent</button> : <span />}{onNext && <button onClick={onNext} className="text-sm px-4 py-2 rounded-lg bg-violet-600 text-white font-semibold">Chapitre suivant →</button>}</div>
    </div>
  );
}
function AuditBook({ book, onBack }) {
  const vols = [["controle_ordinaire", "📘"], ["controle_restreint", "📗"]].filter(([k]) => book && book[k]);
  const [vol, setVol] = useState(vols.length ? vols[0][0] : null);
  const [chap, setChap] = useState(null);
  const V = (book && book[vol]) || {};
  const flat = [];
  (V.parties || []).forEach((p, pi) => (p.fiches || []).forEach((f, fi) => { if (f.fiche) flat.push({ pi, fi, f, partie: p.titre }); }));
  if (chap) {
    const partie = (V.parties || [])[chap.pi] || {};
    const item = (partie.fiches || [])[chap.fi] || {};
    const idx = flat.findIndex((x) => x.pi === chap.pi && x.fi === chap.fi);
    const go = (d) => { const n = flat[idx + d]; if (n) { setChap({ pi: n.pi, fi: n.fi }); try { window.scrollTo(0, 0); } catch (e) {} } };
    return <BookChapter item={item} partieTitle={partie.titre} anchor={chap.anchor} onBack={() => setChap(null)} onPrev={idx > 0 ? () => go(-1) : null} onNext={idx >= 0 && idx < flat.length - 1 ? () => go(1) : null} position={idx >= 0 ? `${idx + 1} / ${flat.length}` : ""} />;
  }
  return (
    <div>
      <ABack onBack={onBack} />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5 shadow-sm flex items-start gap-4"><span className="text-2xl w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm shrink-0">📚</span><div><h2 className="text-xl font-bold text-slate-800 leading-tight">Base de cours — Manuel suisse d'audit</h2><p className="text-sm text-slate-500 mt-1 leading-relaxed">Le cours complet, chapitre par chapitre : MSA (contrôle ordinaire) et NCR (contrôle restreint).</p></div></div>
      <div className="flex flex-wrap gap-2 mb-4">{vols.map(([k, ic]) => <button key={k} onClick={() => { setVol(k); setChap(null); }} className={`px-3.5 py-2 rounded-lg text-sm font-semibold border transition-colors ${vol === k ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"}`}>{ic} {book[k].titre}</button>)}</div>
      {(V.parties || []).map((p, pi) => (
        <div key={pi} className="mb-4">
          <div className="text-sm font-bold text-slate-800 mb-2">{p.titre} <span className="text-slate-400 font-normal">({(p.fiches || []).filter(x => x.fiche).length})</span></div>
          <div className="space-y-1.5">{(p.fiches || []).map((f, fi) => {
            if (f.header) return <div key={fi} className="text-[12px] font-bold text-violet-600 pt-2 pb-0.5" style={{ paddingLeft: ((f.depth || 1) - 1) * 12 }}>{f.titre}</div>;
            const avail = !!f.fiche;
            const indent = (f.depth || 0) > 1 ? (f.depth - 1) * 12 : 0;
            const ancres = ((f.fiche && f.fiche.sections) || []).filter((s) => s.anchor && s.title).map((s) => ({ id: s.anchor, titre: s.title }));
            return (
              <div key={fi} style={{ marginLeft: indent }} className={`rounded-xl border transition-all overflow-hidden ${avail ? "bg-white border-slate-200 hover:border-violet-300 hover:shadow-sm" : "bg-slate-50 border-slate-100 opacity-60"}`}>
                <button disabled={!avail} onClick={() => { if (avail) { setChap({ pi, fi }); try { window.scrollTo(0, 0); } catch (e) {} } }} className={`w-full text-left p-3 flex items-center gap-3 ${avail ? "cursor-pointer" : "cursor-default"}`}>
                  <span>📖</span><span className="flex-1 text-sm font-medium text-slate-800">{f.titre}</span>{avail ? <ArrowRight size={15} className="text-slate-300" /> : <span className="text-[10px] text-slate-400">à venir</span>}
                </button>
                {avail && ancres.length > 0 && (
                  <div className="px-3 pb-2.5 -mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-10">
                    {ancres.map((a, ai) => <button key={ai} onClick={() => setChap({ pi, fi, anchor: a.id })} className="text-[11px] text-slate-400 hover:text-violet-600 hover:underline text-left">{a.titre}</button>)}
                  </div>
                )}
              </div>
            );
          })}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══ Seuils & Exercices (port du module natif audit_seuils.js) ═══ */
const SEUIL_DIFF = { easy: ["Facile", "text-emerald-600 bg-emerald-50 border-emerald-200"], medium: ["Moyen", "text-amber-600 bg-amber-50 border-amber-200"], hard: ["Difficile", "text-rose-600 bg-rose-50 border-rose-200"] };
function SeuilsMemo({ cat, onExo }) {
  const memo = cat.aide_memoire || {};
  const col = cat.color || "#7c3aed";
  return (
    <div>
      {memo.concept && <div className="rounded-xl p-4 mb-4 text-sm text-slate-700 leading-relaxed" style={{ background: col + "12", border: "1px solid " + col + "33" }}><MdInline text={memo.concept} /></div>}
      <div className="grid sm:grid-cols-2 gap-2.5 mb-4">
        {(memo.niveaux || []).map((n, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm font-extrabold mb-2" style={{ color: col }}>{i + 1}. {n.name}</div>
            {n.formula && <div className="rounded-lg bg-slate-100 px-3 py-2 mb-2 text-[12px] text-slate-800" style={{ fontFamily: "ui-monospace, monospace" }}>📐 {n.formula}</div>}
            {n.benchmarks && <div className="text-xs text-slate-600 mb-1"><strong className="text-slate-700">Benchmarks :</strong> <MdInline text={n.benchmarks} /></div>}
            {n.purpose && <div className="text-xs text-slate-600 mb-1"><strong className="text-slate-700">But :</strong> <MdInline text={n.purpose} /></div>}
            {n.typical_value && <div className="text-[11px] text-violet-600 mt-2 pt-2 border-t border-slate-100">💡 Valeur typique : <MdInline text={n.typical_value} /></div>}
          </div>
        ))}
      </div>
      {memo.mental_model && <LCallout tone="info" title="🧠 Modèle mental" text={memo.mental_model} />}
      {(memo.pitfalls || []).length > 0 && <LKeypoints title="⚠️ Pièges à éviter" items={memo.pitfalls} accent="amber" />}
      <div className="text-center mt-4"><button onClick={onExo} className="px-5 py-2.5 rounded-lg text-white text-sm font-bold hover:opacity-95" style={{ background: col }}>✏️ Passer aux exercices →</button></div>
    </div>
  );
}
function SeuilsExo({ cat }) {
  const exos = cat.exercises || [];
  const col = cat.color || "#7c3aed";
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [showSteps, setShowSteps] = useState(false);
  if (!exos.length) return <div className="text-sm text-slate-400 text-center py-8">Pas d'exercices pour cette catégorie.</div>;
  const ex = exos[Math.min(idx, exos.length - 1)];
  const answered = chosen != null;
  const [dLabel, dCls] = SEUIL_DIFF[ex.difficulty] || [ex.difficulty || "—", "text-slate-500 bg-slate-50 border-slate-200"];
  const goTo = (i) => { setIdx(i); setChosen(null); setShowSteps(false); try { window.scrollTo(0, 0); } catch (e) {} };
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-slate-500">Exercice {idx + 1} / {exos.length}</span>
        <span className={`px-2 py-0.5 rounded-full border font-semibold ${dCls}`}>⚡ {dLabel}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-4"><div className="h-full rounded-full transition-all" style={{ width: Math.round(100 * (idx + 1) / exos.length) + "%", background: col }}></div></div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-3">
        <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: col }}>📋 Scénario</div>
        <div className="text-sm text-slate-700 leading-relaxed"><MdBlock text={ex.scenario} /></div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-3">
        <div className="text-sm font-bold text-slate-800 leading-relaxed mb-3">❓ <MdInline text={ex.question} /></div>
        <div className="space-y-2">
          {(ex.options || []).map((opt, i) => {
            let cls = "border-slate-200 bg-slate-50 hover:border-violet-300 cursor-pointer";
            let badge = "border-slate-300 text-slate-500";
            let mark = String.fromCharCode(65 + i);
            if (answered) {
              if (i === chosen && opt.ok) { cls = "border-emerald-300 bg-emerald-50"; badge = "border-emerald-400 text-emerald-600"; mark = "✓"; }
              else if (i === chosen) { cls = "border-rose-300 bg-rose-50"; badge = "border-rose-400 text-rose-600"; mark = "✗"; }
              else if (opt.ok) { cls = "border-emerald-300 bg-white"; badge = "border-emerald-400 text-emerald-600"; mark = "✓"; }
              else { cls = "border-slate-200 bg-white opacity-60"; }
            }
            return (
              <button key={i} disabled={answered} onClick={() => { setChosen(i); setShowSteps(true); }} className={`w-full text-left rounded-lg border px-3.5 py-2.5 flex items-start gap-2.5 text-sm text-slate-700 transition-colors ${cls}`}>
                <span className={`shrink-0 w-6 h-6 rounded-full border grid place-items-center text-[11px] font-bold ${badge}`}>{mark}</span>
                <span className="leading-relaxed"><MdInline text={opt.label} /></span>
              </button>
            );
          })}
        </div>
        {ex.exam_ref && <div className="mt-2.5 text-[11px] text-slate-400">📚 <MdInline text={ex.exam_ref} /></div>}
      </div>
      {answered && (
        <div className={`rounded-xl border p-4 mb-3 ${ex.options[chosen].ok ? "border-emerald-200 bg-emerald-50/70" : "border-rose-200 bg-rose-50/70"}`}>
          <div className={`text-sm font-bold mb-1 ${ex.options[chosen].ok ? "text-emerald-700" : "text-rose-700"}`}>{ex.options[chosen].ok ? "✅ Correct !" : "❌ Incorrect"}</div>
          <div className="text-sm text-slate-700 leading-relaxed"><MdBlock text={ex.options[chosen].x || ""} /></div>
        </div>
      )}
      {answered && (ex.steps || []).length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-sm font-bold text-blue-700">📝 Solution pas à pas</div>
            <button onClick={() => setShowSteps(!showSteps)} className="text-[11px] px-2.5 py-1 rounded-md border border-blue-200 text-blue-700 bg-white hover:bg-blue-50">{showSteps ? "🔽 Masquer" : "▶️ Voir"}</button>
          </div>
          {showSteps ? <ol className="list-decimal ml-5 space-y-1.5 text-sm text-slate-700 leading-relaxed">{ex.steps.map((s, i) => <li key={i}><MdInline text={s} /></li>)}</ol> : <div className="text-xs text-slate-400">Clique « Voir » pour le raisonnement étape par étape.</div>}
        </div>
      )}
      {answered && ex.note && <LCallout tone="warn" title="À noter" text={ex.note} />}
      <div className="flex justify-between mt-4">
        <button onClick={() => goTo(idx - 1)} disabled={idx === 0} className={`px-4 py-2 rounded-lg border text-sm ${idx === 0 ? "opacity-40 border-slate-200 text-slate-400" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>← Précédent</button>
        {answered && (idx < exos.length - 1 ? <button onClick={() => goTo(idx + 1)} className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ background: col }}>Suivant →</button> : <span className="px-4 py-2 text-sm text-emerald-600 font-semibold">🏁 Dernier exo terminé</span>)}
      </div>
    </div>
  );
}
function AuditSeuils({ onBack }) {
  const data = (typeof window !== "undefined" && window.__AUDIT_SEUILS__) || { categories: [] };
  const cats = data.categories || [];
  const [catId, setCatId] = useState(cats.length ? cats[0].id : null);
  const [view, setView] = useState("memo");
  const cat = cats.find((c) => c.id === catId) || cats[0] || {};
  const col = cat.color || "#7c3aed";
  return (
    <div>
      <ABack onBack={onBack} />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5 shadow-sm flex items-start gap-4">
        <span className="text-2xl w-12 h-12 flex items-center justify-center rounded-2xl bg-violet-500 text-white shadow-sm shrink-0">🎯</span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-800 leading-tight">Seuils & Exercices</h2>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">Comprends les seuils-clés de l'audit suisse : aide-mémoire + exercices pas-à-pas par thème.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {cats.map((c) => <button key={c.id} onClick={() => { setCatId(c.id); setView("memo"); }} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${c.id === catId ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"}`} style={c.id === catId ? { background: c.color || "#7c3aed" } : {}}>{c.icon || "📐"} {c.label}</button>)}
      </div>
      <div className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1 mb-4">
        <button onClick={() => setView("memo")} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === "memo" ? "text-white" : "text-slate-500 hover:text-slate-700"}`} style={view === "memo" ? { background: col } : {}}>📖 Aide-mémoire</button>
        <button onClick={() => setView("exo")} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === "exo" ? "text-white" : "text-slate-500 hover:text-slate-700"}`} style={view === "exo" ? { background: col } : {}}>✏️ Exercices ({(cat.exercises || []).length})</button>
      </div>
      {view === "memo" ? <SeuilsMemo cat={cat} onExo={() => setView("exo")} /> : <SeuilsExo key={cat.id} cat={cat} />}
    </div>
  );
}

function AuditSection({ skey, section, onBack }) {
  if (skey === "outils") return <AuditOutils section={section} onBack={onBack} />;
  if (skey === "arbres") return <AuditArbres section={section} onBack={onBack} />;
  if (skey === "quiz") return <AuditQuizHub section={section} onBack={onBack} />;
  if (skey === "examens_blancs") return <AuditExams section={section} onBack={onBack} />;
  if (skey === "cadre_legal") return <AuditCadre section={section} onBack={onBack} />;
  if (skey === "comparatifs") return <AuditComparatifs section={section} onBack={onBack} />;
  if (skey === "cycles") return <AuditCycles section={section} onBack={onBack} />;
  if (skey === "terrain") return <AuditTerrain section={section} onBack={onBack} />;
  if (skey === "procedures_assertions") return <AuditProcedures section={section} onBack={onBack} />;
  if (skey === "cas_pratiques") return <AuditCas section={section} onBack={onBack} />;
  if (skey === "lexique") return <AuditLexique section={section} onBack={onBack} />;
  if (skey === "modeles") return <AuditModeles section={section} onBack={onBack} />;
  if (skey === "timeline") return <AuditTimeline section={section} onBack={onBack} />;
  if (skey === "fraude") return <AuditBlocs section={section} onBack={onBack} fallbackIcon="🚨" />;
  if (skey === "independance") return <AuditBlocs section={section} onBack={onBack} fallbackIcon="⚖️" />;
  if (skey === "goingconcern") return <AuditBlocs section={section} onBack={onBack} fallbackIcon="📉" />;
  if (skey === "actualites") return <AuditBlocs section={section} onBack={onBack} fallbackIcon="🆕" />;
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
  return (
    <div className="space-y-3">
      <div className="text-[11px] text-slate-400 -mt-1 mb-1">Fiche condensée pour réviser vite — {blocks.length} blocs. Le bouton « 📥 Télécharger en PDF » en haut exporte cette fiche.</div>
      {blocks.map((b, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-violet-100"><span className="font-bold text-sm text-violet-800">{b.title}</span></div>
          <div className="fiche-html text-sm text-slate-700 leading-relaxed px-4 py-3" dangerouslySetInnerHTML={{ __html: mdToHtml(b.body || "") }} />
        </div>
      ))}
    </div>
  );
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
        <button onClick={() => downloadAuditPdf(std, course, mode === "fiche")}
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
          {norm.summary && <div className="text-slate-600 italic bg-slate-50 rounded-lg px-3 py-2"><MdBlock text={norm.summary} /></div>}
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
  const [q, setQ] = useState("");
  const cats = (nas && nas.categories) || [];
  const query = q.trim().toLowerCase();
  const hits = query.length >= 2 ? cats.flatMap((c) => (c.norms || []).filter((n) => {
    const hay = (n.code + " " + n.title + " " + (n.summary || "") + " " + ((n.key_points || []).join(" ")) + " " + (n.swiss_specifics || "")).toLowerCase();
    return hay.includes(query);
  }).map((n) => ({ ...n, _cat: c.label }))) : [];
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>
      <SectionHero section={nas} fallbackIcon="📐" />
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une norme (fraude, going concern, échantillonnage…)" className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-fuchsia-500 outline-none" />
      </div>
      {query.length >= 2 ? (
        <div>
          <div className="text-xs text-slate-400 mb-1.5">{hits.length} norme(s) trouvée(s)</div>
          {hits.map((n, ni) => <div key={ni}><div className="text-[10px] text-slate-400 ml-1 mb-0.5">{n._cat}</div><NasNorm norm={n} cours={cours} annuaire={annuaire} onOpenCourse={onOpenCourse} /></div>)}
          {!hits.length && <div className="text-sm text-slate-400 text-center py-6">Aucune norme ne correspond.</div>}
        </div>
      ) : cats.map((c, ci) => (
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
        <div>
          <div className="text-xs text-slate-400 mb-1.5">{results.length} résultat(s)</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {results.map((st) => <StdRow key={st.num} st={st} onOpen={onOpen} hasCourse={!!cours[st.num]} />)}
          </div>
        </div>
      ) : (
        series.map((s) => (
          <div key={s.id} className="mb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color || "#7c3aed" }}></span>
              <h3 className="text-sm font-bold text-slate-800">{s.label} <span className="text-slate-400 font-normal">({s.range})</span></h3>
              <span className="text-[11px] text-slate-400 ml-auto">{(s.standards || []).length} normes</span>
            </div>
            {s.intro && <p className="text-xs text-slate-500 mb-2 leading-relaxed"><MdInline text={s.intro} /></p>}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
      title={hasCourse ? "Ouvrir le cours complet" : "Cours à venir"}
      className={`text-left rounded-lg border p-2.5 transition-all flex items-start gap-2 ${hasCourse ? "bg-white border-slate-200 hover:shadow-md hover:border-violet-300 hover:-translate-y-0.5 cursor-pointer" : "bg-slate-50 border-slate-100 opacity-60 cursor-default"}`}>
      <span className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 leading-tight" style={{ background: st.color || "#7c3aed" }}>{st.code}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-slate-800 leading-tight">{st.title_fr}</span>
        <span className="flex items-center gap-1.5 mt-0.5">{st.status && <span className="text-[10px] text-slate-400">{st.status}</span>}{hasCourse && <span className="text-[10px] text-emerald-600 font-medium">· cours ✓</span>}</span>
      </span>
    </button>
  );
}

/* ── Une sous-section générique (cadre légal, cycles, terrain, outils…) ── */
function AuditGeneric({ section, onBack }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>
      <SectionHero section={section} fallbackIcon="📋" />
      <AnyAudit data={omitKeys(section, ["_label", "_icon", "_description"])} />
    </div>
  );
}

/* ── Accueil Audit (hub) ── */
const AUDIT_ORDER = ["annuaire", "nas", "cadre_legal", "cycles", "procedures_assertions", "quiz", "cas_pratiques", "examens_blancs", "arbres", "comparatifs", "lexique", "outils", "modeles", "terrain", "independance", "fraude", "goingconcern", "timeline", "actualites"];
function AuditHome({ data, book, onSection, onBook, onSeuils, onRevision, onPlanComptable, onFraudePostes, onReferencement, onAnnexes, onAmortissements, onNestle, onMetier, onTests }) {
  const hasNestle = typeof window !== "undefined" && window.__NESTLE__ && (window.__NESTLE__.statements || []).length;
  const hasMetier = typeof window !== "undefined" && window.__METIER__ && (window.__METIER__.sections || []).length;
  const hasTests = typeof window !== "undefined" && window.__TESTS__ && (window.__TESTS__.tests || []).length;
  const hasPlan = typeof window !== "undefined" && window.__PLAN_COMPTABLE__ && (window.__PLAN_COMPTABLE__.plans || []).length;
  const hasFraude = typeof window !== "undefined" && window.__FRAUDE_POSTES__ && (window.__FRAUDE_POSTES__.sections || []).length;
  const hasRef = typeof window !== "undefined" && window.__REFERENCEMENT__ && ((window.__REFERENCEMENT__.exemple || {}).feuilles || []).length;
  const hasAnnexes = typeof window !== "undefined" && window.__ANNEXES__ && (window.__ANNEXES__.referentiels || []).length;
  const hasAmort = typeof window !== "undefined" && window.__AMORTISSEMENTS__ && (window.__AMORTISSEMENTS__.lecons || []).length;
  const keys = AUDIT_ORDER.filter((k) => data[k]);
  Object.keys(data).forEach((k) => { if (k[0] !== "_" && k !== "annuaire_cours" && AUDIT_ORDER.indexOf(k) < 0) keys.push(k); });
  const hasBook = book && (book.controle_ordinaire || book.controle_restreint);
  const bookChapters = hasBook ? ["controle_ordinaire", "controle_restreint"].reduce((a, vk) => a + (((book[vk] || {}).parties || []).reduce((b, p) => b + (p.fiches || []).filter(f => f.fiche).length, 0)), 0) : 0;
  const nbTests = (typeof window !== "undefined" && window.__TESTS__ && (window.__TESTS__.tests || []).length) || 0;
  const flagships = [
    { show: true, onClick: onRevision, icon: "📋", chip: "bg-violet-50 text-violet-700 border-violet-100", label: "Révision — méga-fiche des 47 ISA", desc: "Toutes les normes ISA condensées : essentiel, repères, pièges, mnémo · navigable et PDF." },
    { show: hasBook, onClick: onBook, icon: "📚", chip: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100", label: "Base de cours — Manuel suisse d'audit", desc: `Le cours chapitre par chapitre · ${bookChapters} chapitres (MSA contrôle ordinaire + NCR restreint).` },
    { show: hasTests, onClick: onTests, icon: "🧪", chip: "bg-teal-50 text-teal-700 border-teal-100", label: "Catalogue des tests d'audit", desc: `${nbTests} tests (pourquoi/comment/assertion) · cas interactifs · mode entraînement · exercice journal client.` },
    { show: hasMetier, onClick: onMetier, icon: "🧑‍💼", chip: "bg-indigo-50 text-indigo-700 border-indigo-100", label: "Une journée d'auditeur", desc: "La méthode pas à pas : risque → assertion → test, matérialité, sondage, grand livre, cas Wirecard." },
    { show: hasNestle, onClick: onNestle, icon: "🏭", chip: "bg-amber-50 text-amber-700 border-amber-100", label: "Nestlé — états financiers réels commentés", desc: "Les 5 états + 18 notes des comptes consolidés 2025, commentés poste par poste (cas réel)." },
    { show: hasPlan, onClick: onPlanComptable, icon: "📊", chip: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "Plans comptables (Suisse PME / France PCG)", desc: "Plan suisse PME & plan français, classe par classe ; comptes reliés au bilan et au compte de résultat." },
  ].filter((f) => f.show);
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white p-5 shadow">
        <h2 className="text-xl font-bold">Module Audit — NAS / ISA</h2>
        <p className="text-sm text-violet-100 mt-1">Les 47 normes ISA en cours complets, le cadre légal suisse, les cycles, les QCM et tous les outils du réviseur.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-2.5">
        {[{ m: "seuils", ic: "🎯", t: "Seuils & Exercices", d: "Tous les seuils (ordinaire/restreint, matérialité) + exercices pas-à-pas." },
          { m: "canvas", ic: "🏢", t: "Canvas Perso", d: "Crée et gère tes propres engagements d'audit (desktop)." },
          { m: "mission", ic: "🎬", t: "Mission Lab", d: "Mission immersive end-to-end chez EY (desktop)." }].map((n) => (
          <button key={n.m} onClick={() => (n.m === "seuils" && onSeuils) ? onSeuils() : openAuditNative(n.m)} className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col gap-1.5">
            <div className="flex items-center gap-2"><span className="text-xl">{n.ic}</span><span className="font-bold text-sm text-violet-700">{n.t}</span></div>
            <div className="text-xs text-slate-500 leading-snug">{n.d}</div>
          </button>
        ))}
      </div>
      {flagships.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5 mt-1"><span className="text-base">📚</span><span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Cours, cas pratiques & références</span><span className="flex-1 h-px bg-slate-200"></span></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {flagships.map((f, i) => (
              <button key={i} onClick={f.onClick} className="text-left bg-white border border-slate-200 rounded-xl p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start gap-3">
                <span className={`w-9 h-9 grid place-items-center rounded-lg border text-base shrink-0 ${f.chip}`}>{f.icon}</span>
                <span className="min-w-0"><span className="block font-bold text-sm text-slate-800 leading-tight">{f.label}</span><span className="block text-xs text-slate-500 leading-snug mt-0.5">{f.desc}</span></span>
              </button>
            ))}
          </div>
        </div>
      )}
      {(() => {
        const GROUPS = [
          { id: "apprendre", label: "Apprendre", icon: "📖", keys: ["annuaire", "nas", "cadre_legal", "cycles", "procedures_assertions"] },
          { id: "entrainer", label: "S'entraîner", icon: "🎮", keys: ["quiz", "cas_pratiques", "examens_blancs", "arbres"] },
          { id: "outils", label: "Boîte à outils", icon: "🧰", keys: ["outils", "modeles", "lexique", "comparatifs"] },
          { id: "examen", label: "Examen & veille", icon: "🎯", keys: ["terrain", "independance", "fraude", "goingconcern", "timeline", "actualites"] },
        ];
        const placed = new Set(GROUPS.flatMap((g) => g.keys));
        const rest = keys.filter((k) => !placed.has(k));
        if (rest.length) GROUPS[GROUPS.length - 1].keys = [...GROUPS[GROUPS.length - 1].keys, ...rest];
        return GROUPS.map((g) => {
          const gk = g.keys.filter((k) => data[k]);
          if (!gk.length) return null;
          return (
            <div key={g.id}>
              <div className="flex items-center gap-2 mb-2.5 mt-1">
                <span className="text-base">{g.icon}</span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{g.label}</span>
                <span className="flex-1 h-px bg-slate-200"></span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {gk.map((k) => { const s = data[k]; const th = MODULE_THEME[k] || {}; return (
                  <button key={k} onClick={() => onSection(k)} className="text-left bg-white border border-slate-200 rounded-xl p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start gap-3">
                    <span className={`w-9 h-9 grid place-items-center rounded-lg border text-base shrink-0 ${th.chip || "bg-violet-50 text-violet-700 border-violet-100"}`}>{s._icon || "📋"}</span>
                    <span className="min-w-0">
                      <span className="block font-bold text-sm text-slate-800 leading-tight">{s._label || k}</span>
                      {s._description && <span className="block text-xs text-slate-500 leading-snug mt-0.5"><MdInline text={s._description} /></span>}
                      {k === "annuaire" && <span className="block text-[11px] text-violet-500 font-medium mt-1">47 normes · cours complets</span>}
                    </span>
                  </button>
                ); })}
                {g.id === "outils" && hasFraude && (
                  <button onClick={onFraudePostes} className="text-left bg-white border border-rose-200 rounded-xl p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start gap-3">
                    <span className="w-9 h-9 grid place-items-center rounded-lg border bg-rose-50 text-rose-700 border-rose-100 text-base shrink-0">🕵️</span>
                    <span className="min-w-0">
                      <span className="block font-bold text-sm text-slate-800 leading-tight">Fraude par poste</span>
                      <span className="block text-xs text-slate-500 leading-snug mt-0.5">Schémas de fraude, signaux d'alerte & procédures de détection, ligne par ligne du bilan et du compte de résultat.</span>
                      <span className="block text-[11px] text-rose-500 font-medium mt-1">{(window.__FRAUDE_POSTES__.sections || []).reduce((a, x) => a + (x.postes || []).length, 0)} postes · 76 schémas</span>
                    </span>
                  </button>
                )}
                {g.id === "outils" && hasRef && (
                  <button onClick={onReferencement} className="text-left bg-white border border-indigo-200 rounded-xl p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start gap-3">
                    <span className="w-9 h-9 grid place-items-center rounded-lg border bg-indigo-50 text-indigo-700 border-indigo-100 text-base shrink-0">🔗</span>
                    <span className="min-w-0">
                      <span className="block font-bold text-sm text-slate-800 leading-tight">Référencement croisé</span>
                      <span className="block text-xs text-slate-500 leading-snug mt-0.5">Comment un dossier d'audit relie chaque chiffre à sa preuve : index des feuilles, renvois, tickmarks, et un dossier-exemple interactif.</span>
                      <span className="block text-[11px] text-indigo-500 font-medium mt-1">dossier cliquable · cycle créances</span>
                    </span>
                  </button>
                )}
                {g.id === "outils" && hasAnnexes && (
                  <button onClick={onAnnexes} className="text-left bg-white border border-teal-200 rounded-xl p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start gap-3">
                    <span className="w-9 h-9 grid place-items-center rounded-lg border bg-teal-50 text-teal-700 border-teal-100 text-base shrink-0">📎</span>
                    <span className="min-w-0">
                      <span className="block font-bold text-sm text-slate-800 leading-tight">Annexes des états financiers</span>
                      <span className="block text-xs text-slate-500 leading-snug mt-0.5">Tout ce que doit contenir l'annexe selon le CO, les Swiss GAAP RPC et les IFRS, avec les bases légales et un comparatif des trois référentiels.</span>
                      <span className="block text-[11px] text-teal-600 font-medium mt-1">CO · Swiss GAAP RPC · IFRS · comparatif</span>
                    </span>
                  </button>
                )}
                {g.id === "outils" && hasAmort && (
                  <button onClick={onAmortissements} className="text-left bg-white border border-sky-200 rounded-xl p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-start gap-3">
                    <span className="w-9 h-9 grid place-items-center rounded-lg border bg-sky-50 text-sky-700 border-sky-100 text-base shrink-0">📉</span>
                    <span className="min-w-0">
                      <span className="block font-bold text-sm text-slate-800 leading-tight">Amortissements</span>
                      <span className="block text-xs text-slate-500 leading-snug mt-0.5">Linéaire et dégressif expliqués pas à pas, taux fiscaux AFC, écritures direct/indirect, et un calculateur qui déroule le calcul année par année.</span>
                      <span className="block text-[11px] text-sky-600 font-medium mt-1">cas interactif · surtout le dégressif</span>
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
}

/* ── Méga-fiche de révision : toutes les normes ISA, navigable + téléchargeable ── */
function RevNormCard({ st, course, open, onToggle }) {
  const color = st.color || "#7c3aed";
  const blocks = course.fiche_revision || [];
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-2.5">
      <button onClick={onToggle} className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left hover:bg-slate-50">
        <span className="text-white text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: color }}>{st.code}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-slate-800 leading-tight">{st.title_fr}</span>
          {course.duree && <span className="text-[11px] text-slate-400">⏱️ {course.duree}{course.niveau ? " · " + course.niveau : ""}</span>}
        </span>
        <ChevronDown size={17} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 pt-0.5 space-y-2.5">
          {blocks.map((b, i) => (
            <div key={i} className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-gradient-to-r from-violet-50 to-fuchsia-50 border-b border-violet-100"><span className="font-bold text-[13px] text-violet-800">{b.title}</span></div>
              <div className="fiche-html text-[13px] text-slate-700 leading-relaxed px-3 py-2.5" dangerouslySetInnerHTML={{ __html: mdToHtml(b.body || "") }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function AuditRevision({ data, onBack }) {
  const annuaire = data.annuaire || {};
  const cours = data.annuaire_cours || {};
  const series = (annuaire.series || [])
    .map((sr) => ({ ...sr, norms: (sr.standards || []).filter((st) => ((cours[st.num] || {}).fiche_revision || []).length) }))
    .filter((sr) => sr.norms.length);
  const total = series.reduce((a, s) => a + s.norms.length, 0);

  const [q, setQ] = useState("");
  const [openMap, setOpenMap] = useState({});
  const [allOpen, setAllOpen] = useState(false);
  const query = q.trim().toLowerCase();
  const matches = (st) => {
    if (!query) return true;
    const c = cours[st.num] || {};
    const hay = (st.code + " " + st.title_fr + " " + (st.title_en || "") + " " + (c.tldr || "") + " " + (c.fiche_revision || []).map((b) => b.body).join(" ")).toLowerCase();
    return hay.includes(query);
  };
  const isOpen = (code) => allOpen || !!openMap[code] || query.length >= 2;
  const toggle = (code) => setOpenMap((m) => ({ ...m, [code]: !(allOpen || m[code]) }));
  const jump = (id) => { try { const el = document.getElementById("rev-s-" + id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {} };

  const filtered = series.map((sr) => ({ ...sr, norms: sr.norms.filter(matches) })).filter((sr) => sr.norms.length);
  const shown = filtered.reduce((a, s) => a + s.norms.length, 0);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>

      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white p-5 shadow mb-4">
        <div className="flex items-start gap-3 flex-wrap">
          <span className="text-3xl">📋</span>
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-xl font-bold">Fiche de révision — {total} normes ISA</h2>
            <p className="text-sm text-violet-100 mt-1">L'essentiel de chaque norme, à l'écran pour réviser et en PDF pour emporter. La fiche express tient en ~20 pages : le paragraphe-clé + la mnémo de chaque norme.</p>
          </div>
          <div className="flex flex-col items-stretch gap-1.5 shrink-0">
            <button onClick={() => downloadRevisionPdf(data, "express")} className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-white text-violet-700 hover:bg-violet-50 shadow-sm">📥 PDF express (~20 p.)</button>
            <button onClick={() => downloadRevisionPdf(data, "complete")} className="text-[11px] text-violet-100 hover:text-white underline underline-offset-2">ou la version complète détaillée (~200 p.)</button>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 -mx-4 px-4 py-2.5 bg-slate-100/95 backdrop-blur border-b border-slate-200 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer (fraude, échantillonnage, opinion modifiée…)" className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none" />
          </div>
          <button onClick={() => { setAllOpen(!allOpen); setOpenMap({}); }} className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:border-violet-300 whitespace-nowrap">{allOpen ? "Tout replier" : "Tout déplier"}</button>
        </div>
        {!query && (
          <div className="flex gap-1.5 overflow-x-auto mt-2 pb-0.5">
            {series.map((sr) => (
              <button key={sr.id} onClick={() => jump(sr.id)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0" style={{ borderColor: (sr.color || "#7c3aed") + "55", color: sr.color || "#7c3aed", background: (sr.color || "#7c3aed") + "0f" }}>{sr.range} <span className="opacity-60">· {sr.norms.length}</span></button>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-400 mb-3">{query ? shown + " norme(s) trouvée(s)" : total + " normes · " + series.length + " séries — clique une norme pour la déplier, ou « Tout déplier »."}</div>

      {filtered.map((sr) => (
        <div key={sr.id} id={"rev-s-" + sr.id} className="mb-6 scroll-mt-28">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: sr.color || "#7c3aed" }}></span>
            <h3 className="text-sm font-bold text-slate-800">{sr.label} <span className="text-slate-400 font-normal">({sr.range})</span></h3>
            <span className="text-[11px] text-slate-400 ml-auto">{sr.norms.length} normes</span>
          </div>
          {sr.norms.map((st) => (
            <RevNormCard key={st.num} st={{ ...st, color: sr.color }} course={cours[st.num] || {}} open={isOpen(st.code)} onToggle={() => toggle(st.code)} />
          ))}
        </div>
      ))}
      {!filtered.length && <div className="text-center text-slate-400 text-sm py-10">Aucune norme ne correspond à « {q} ».</div>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PLAN COMPTABLE — plans suisses (PME) & français (PCG), interactifs :
   chaque compte est relié à sa ligne du bilan / compte de résultat.
   Données : window.__PLAN_COMPTABLE__ (build_audit.py).
   ════════════════════════════════════════════════════════════════ */
function _pcFlash(id, ring, _try) {
  const el = document.getElementById(id);
  if (!el) {                                   // l'élément vient peut-être d'être (dé)monté
    if ((_try || 0) < 6) setTimeout(() => _pcFlash(id, ring, (_try || 0) + 1), 80);
    return;
  }
  try {
    el.scrollIntoView({ block: "center" });    // instantané : plus fiable que smooth en iframe
    const cls = ring ? "pc-flash-ring" : "pc-flash";
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 1900);
  } catch (e) {}
}
/* table plate des comptes d'un plan, avec le contexte de classe/groupe */
function pcFlatAccounts(plan) {
  const out = [];
  (plan.classes || []).forEach((c) => (c.groups || []).forEach((g) =>
    (g.accounts || []).forEach((a) => out.push({
      num: String(a.num), label: a.label, note: a.note || "",
      groupCode: String(g.code), groupTitle: g.title,
      classNum: String(c.num), classTitle: c.title, color: c.color || plan.accent,
    }))));
  return out;
}
function pcAllLines(plan) {
  const st = plan.statements || {};
  const tag = (arr, sec) => (arr || []).map((l) => ({ ...l, _sec: sec }));
  return [].concat(tag(st.bilan_actif, "actif"), tag(st.bilan_passif, "passif"), tag(st.compte_resultat, "cr"));
}
/* un compte appartient à une ligne si son n° commence par un préfixe, OU si son
   code de groupe commence par le préfixe (ex. 1020 Banque → groupe 100 → ligne
   « Liquidités » de préfixe 100). On NE matche PAS l'inverse (préfixe plus
   précis que le groupe), qui rattacherait à tort un compte à une ligne voisine. */
function pcAcctMatchesPrefixes(acct, prefixes) {
  return (prefixes || []).some((p) => acct.num.startsWith(p) || acct.groupCode.startsWith(p));
}
function pcBestPrefixLen(acct, prefixes) {
  let best = -1;
  (prefixes || []).forEach((p) => {
    if (acct.num.startsWith(p) || acct.groupCode.startsWith(p)) best = Math.max(best, p.length);
  });
  return best;
}

function PcAccountRow({ a, onGo }) {
  return (
    <div id={"acct-" + a.num} onClick={() => onGo(a)}
      className="group flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-violet-50 cursor-pointer transition-colors border border-transparent hover:border-violet-100">
      <span className="font-mono text-[12px] font-bold text-white rounded px-1.5 py-0.5 shrink-0 mt-0.5" style={{ background: a.color }}>{a.num}</span>
      <span className="min-w-0 flex-1">
        <span className="text-[13.5px] text-slate-800 font-medium leading-snug">{a.label}</span>
        {a.note && <span className="block text-[12px] text-slate-500 leading-snug mt-0.5">{a.note}</span>}
      </span>
      <ArrowRight size={14} className="text-slate-300 group-hover:text-violet-500 shrink-0 mt-1 transition-colors" />
    </div>
  );
}

function AuditPlanComptable({ data, onBack }) {
  const plans = (data && data.plans) || [];
  const others = (data && data.others) || { plans: [] };
  const [planId, setPlanId] = useState(plans.length ? plans[0].id : null);
  const [mode, setMode] = useState("comptes");          // comptes | etats | legal
  const [q, setQ] = useState("");
  const [openLine, setOpenLine] = useState(null);
  const [pending, setPending] = useState(null);          // {id, ring} à surligner après rendu

  const showOthers = planId === "__others__";
  const plan = plans.find((p) => p.id === planId) || plans[0];

  const accounts = useMemo(() => (plan ? pcFlatAccounts(plan) : []), [planId]);
  const lines = useMemo(() => (plan ? pcAllLines(plan) : []), [planId]);

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => { _pcFlash(pending.id, pending.ring); setPending(null); }, 60);
    return () => clearTimeout(t);
  }, [pending, mode, planId]);

  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  /* compte -> ligne d'état (préfixe le plus spécifique ; repli : section de la classe) */
  function lineForAccount(a) {
    let best = null, bestLen = -1;
    lines.forEach((l) => {
      const len = pcBestPrefixLen(a, l.prefixes);
      if (len > bestLen) { bestLen = len; best = l; }
    });
    if (best && bestLen >= 0) return best;
    // repli : 1re ligne de niveau 1 de la section correspondant à la classe
    const sec = pcClassSection(plan.id, a.classNum);
    return lines.find((l) => l._sec === sec) || null;
  }
  function goToStatement(a) {
    const l = lineForAccount(a);
    if (!l) return;
    setMode("etats"); setOpenLine(l.id); setPending({ id: "line-" + l.id, ring: false });
  }
  function goToAccount(num) {
    setMode("comptes"); setPending({ id: "acct-" + num, ring: true });
  }
  function accountsForLine(l) {
    return accounts.filter((a) => pcAcctMatchesPrefixes(a, l.prefixes));
  }

  if (!plan && !showOthers) {
    return <div className="text-center text-slate-400 py-12">Plan comptable indisponible.</div>;
  }

  const accent = plan ? plan.accent : "#7c3aed";
  const query = norm(q.trim());
  const filtered = query.length >= 2
    ? accounts.filter((a) => norm(a.num + " " + a.label + " " + a.note).includes(query))
    : null;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>

      {/* hero */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-violet-900 text-white p-5 shadow mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Layers size={26} className="text-violet-300" />
          <div className="flex-1 min-w-[220px]">
            <h2 className="text-xl font-bold">Plans comptables</h2>
            <p className="text-sm text-violet-100 mt-0.5">Le plan suisse PME et le plan français (PCG), expliqués — et chaque compte relié à sa place dans le bilan et le compte de résultat.</p>
          </div>
        </div>
      </div>

      {/* sélecteur de plan */}
      <div className="flex gap-2 flex-wrap mb-4">
        {plans.map((p) => (
          <button key={p.id} onClick={() => { setPlanId(p.id); setMode("comptes"); setQ(""); }}
            className={"flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all " +
              (planId === p.id ? "text-white shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300")}
            style={planId === p.id ? { background: p.accent, borderColor: p.accent } : {}}>
            <span className="text-base">{p.flag}</span>{p.name}
          </button>
        ))}
        {(others.plans || []).length > 0 && (
          <button onClick={() => setPlanId("__others__")}
            className={"flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all " +
              (showOthers ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400")}>
            📚 Autres plans suisses
          </button>
        )}
      </div>

      {showOthers ? <PcOthers others={others} /> : (
        <div>
          {/* intro plan + onglets de mode */}
          <div className="rounded-xl border bg-white p-4 mb-4" style={{ borderColor: accent + "44" }}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-2xl">{plan.flag}</span>
              <div>
                <div className="font-bold text-slate-800">{plan.name}</div>
                <div className="text-xs text-slate-500">{plan.subtitle}</div>
              </div>
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed mt-1.5">{plan.intro}</p>
          </div>

          <div className="flex gap-2 flex-wrap mb-4">
            <PcTab on={mode === "comptes"} accent={accent} onClick={() => setMode("comptes")} icon={<BookOpen size={15} />}>Plan de comptes</PcTab>
            <PcTab on={mode === "etats"} accent={accent} onClick={() => setMode("etats")} icon={<Scale size={15} />}>Bilan & compte de résultat</PcTab>
            {plan.legal && <PcTab on={mode === "legal"} accent={accent} onClick={() => setMode("legal")} icon={<FileText size={15} />}>Structure légale (CO)</PcTab>}
          </div>

          {mode === "comptes" && <PcComptes plan={plan} accounts={accounts} filtered={filtered} q={q} setQ={setQ} onGo={goToStatement} lineForAccount={lineForAccount} />}
          {mode === "etats" && <PcEtats plan={plan} openLine={openLine} setOpenLine={setOpenLine} accountsForLine={accountsForLine} onAccount={goToAccount} />}
          {mode === "legal" && plan.legal && <PcLegal legal={plan.legal} accent={accent} />}
        </div>
      )}
    </div>
  );
}

function PcTab({ on, accent, onClick, icon, children }) {
  return (
    <button onClick={onClick}
      className={"flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold border transition-colors " +
        (on ? "text-white" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300")}
      style={on ? { background: accent, borderColor: accent } : {}}>{icon}{children}</button>
  );
}

/* ── Vue « Plan de comptes » : classes colorées, groupes, comptes cliquables ── */
function PcComptes({ plan, accounts, filtered, q, setQ, onGo, lineForAccount }) {
  if (filtered) {
    return (
      <div>
        <PcSearch q={q} setQ={setQ} accent={plan.accent} count={filtered.length} />
        <div className="bg-white rounded-xl border border-slate-200 p-2">
          {filtered.length === 0 && <div className="text-center text-slate-400 text-sm py-8">Aucun compte ne correspond.</div>}
          {filtered.map((a) => <PcAccountRow key={a.num + a.label} a={a} onGo={onGo} />)}
        </div>
      </div>
    );
  }
  return (
    <div>
      <PcSearch q={q} setQ={setQ} accent={plan.accent} count={accounts.length} />
      {/* navigation par classe */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 sticky top-0 bg-slate-100/95 backdrop-blur z-10 -mx-1 px-1">
        {(plan.classes || []).map((c) => (
          <button key={c.num} onClick={() => _pcFlash("class-" + c.num, false)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0"
            style={{ borderColor: c.color + "66", color: c.color, background: c.color + "10" }}>
            {c.num} · {c.title.length > 22 ? c.title.slice(0, 22) + "…" : c.title}
          </button>
        ))}
      </div>
      {(plan.classes || []).map((c) => (
        <div key={c.num} id={"class-" + c.num} className="mb-5 scroll-mt-16">
          <div className="rounded-xl p-3.5 mb-2 text-white" style={{ background: c.color }}>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-black opacity-90">{c.num}</span>
              <span className="font-bold text-[15px] leading-tight">Classe {c.num} — {c.title}</span>
            </div>
            {c.intro && <p className="text-[12.5px] text-white/90 leading-relaxed mt-1.5">{c.intro}</p>}
          </div>
          {(c.groups || []).map((g) => (
            <div key={g.code} className="bg-white rounded-xl border border-slate-200 mb-2 overflow-hidden">
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-slate-500">{g.code}</span>
                <span className="text-[13px] font-semibold text-slate-700">{g.title}</span>
              </div>
              <div className="p-1.5">
                {(g.accounts || []).map((a) => (
                  <PcAccountRow key={a.num} a={{ ...a, num: String(a.num), groupCode: String(g.code), color: c.color, classNum: String(c.num) }} onGo={onGo} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PcSearch({ q, setQ, accent, count }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="relative flex-1 max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un compte (n° ou libellé)…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-1"
          style={{ borderColor: q ? accent : undefined }} />
      </div>
      <span className="text-xs text-slate-400">{count} comptes</span>
    </div>
  );
}

/* ── Vue « Bilan & compte de résultat » : lignes cliquables ↔ comptes ── */
function PcStatementBlock({ title, icon, lines, openLine, setOpenLine, accountsForLine, onAccount, accent }) {
  if (!lines || !lines.length) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 text-white font-bold text-sm flex items-center gap-2" style={{ background: accent }}>{icon}{title}</div>
      <div className="divide-y divide-slate-100">
        {lines.map((l) => {
          const open = openLine === l.id;
          const accts = open ? accountsForLine(l) : null;
          const lvl1 = (l.niveau || 1) === 1;
          return (
            <div key={l.id} id={"line-" + l.id} className="scroll-mt-16">
              <button onClick={() => setOpenLine(open ? null : l.id)}
                className={"w-full text-left flex items-start gap-2 px-3 py-2 hover:bg-violet-50 transition-colors " + (lvl1 ? "" : "pl-7")}>
                <span className="flex-1 min-w-0">
                  <span className={lvl1 ? "text-[13.5px] font-bold text-slate-800" : "text-[13px] text-slate-700"}>{l.label}</span>
                  {l.note && <span className="block text-[11.5px] text-slate-400 leading-snug mt-0.5">{l.note}</span>}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {(l.prefixes || []).slice(0, 5).map((p, i) => (
                    <span key={i} className="font-mono text-[11.5px] font-bold rounded px-1.5 py-0.5 border tabular-nums"
                      style={{ color: accent, background: accent + "14", borderColor: accent + "3a" }}>{p}</span>
                  ))}
                  {(l.prefixes || []).length > 5 && <span className="text-[11px] font-semibold text-slate-400">+{(l.prefixes || []).length - 5}</span>}
                  <ChevronDown size={15} className={"text-slate-400 transition-transform ml-0.5 " + (open ? "rotate-180" : "")} />
                </span>
              </button>
              {open && (
                <div className="px-3 pb-2.5 pt-0.5 bg-slate-50/60">
                  {accts.length === 0 && <div className="text-[12px] text-slate-400 px-2 py-1">Aucun compte détaillé rattaché dans ce plan.</div>}
                  <div className="flex flex-wrap gap-1.5">
                    {accts.map((a) => (
                      <button key={a.num} onClick={() => onAccount(a.num)}
                        title={a.label}
                        className="flex items-center gap-1.5 text-[12px] rounded-lg border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50 pl-1 pr-2 py-1 transition-colors">
                        <span className="font-mono text-[11.5px] font-bold text-white rounded px-1.5 py-0.5 tabular-nums" style={{ background: a.color }}>{a.num}</span>
                        <span className="text-slate-700 max-w-[220px] truncate">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PcEtats({ plan, openLine, setOpenLine, accountsForLine, onAccount }) {
  const st = plan.statements || {};
  return (
    <div>
      <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 mb-4 text-[12.5px] text-violet-800 leading-relaxed flex gap-2">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>Clique sur une ligne pour voir les comptes qui l'alimentent ; clique sur un compte pour revenir à sa place dans le plan. {st.intro ? "" : ""}</span>
      </div>
      <div className="grid lg:grid-cols-2 gap-3 mb-3 items-start">
        <PcStatementBlock title="BILAN — Actif" icon={<Banknote size={15} />} lines={st.bilan_actif} accent={plan.accent}
          openLine={openLine} setOpenLine={setOpenLine} accountsForLine={accountsForLine} onAccount={onAccount} />
        <PcStatementBlock title="BILAN — Passif" icon={<Scale size={15} />} lines={st.bilan_passif} accent="#64748b"
          openLine={openLine} setOpenLine={setOpenLine} accountsForLine={accountsForLine} onAccount={onAccount} />
      </div>
      <PcStatementBlock title="COMPTE DE RÉSULTAT" icon={<FileText size={15} />} lines={st.compte_resultat} accent="#0f766e"
        openLine={openLine} setOpenLine={setOpenLine} accountsForLine={accountsForLine} onAccount={onAccount} />
    </div>
  );
}

/* ── Vue « Structure légale CO » (Suisse) ── */
function PcLegal({ legal, accent }) {
  return (
    <div>
      {legal.intro && <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3 text-[13px] text-slate-600 leading-relaxed">{legal.intro}</div>}
      {(legal.sections || []).map((s, si) => (
        <div key={si} className="bg-white rounded-xl border border-slate-200 mb-3 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="font-bold text-[14px] text-slate-800">{s.titre}</span>
            {s.article && <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">{s.article}</span>}
          </div>
          <div className="p-2">
            {(s.postes || []).map((p, pi) => (
              <div key={pi} className={"flex items-start gap-2 px-3 py-1.5 " + ((p.niveau || 1) === 1 ? "font-semibold text-slate-800 mt-1" : "pl-7 text-slate-600")}>
                <span className="flex-1 text-[13px]">{p.label}</span>
                {p.note && <span className="text-[11px] text-slate-400 shrink-0 max-w-[45%] text-right">{p.note}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Vue « Autres plans suisses » ── */
function PcOthers({ others }) {
  return (
    <div>
      {others.intro && <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3 text-[13px] text-slate-600 leading-relaxed">{others.intro}</div>}
      <div className="grid md:grid-cols-2 gap-3 items-start">
        {(others.plans || []).map((p, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="font-bold text-[14px] text-slate-800 mb-1">{p.nom}</div>
            {p.usage && <div className="text-[12px] text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5 mb-2 leading-snug"><span className="font-semibold">Usage : </span>{p.usage}</div>}
            <div className="text-[13px] text-slate-600 leading-relaxed">{p.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function pcClassSection(planId, classNum) {
  const n = String(classNum);
  if (planId === "fr_pcg") return (n === "1") ? "passif" : (n === "6" || n === "7" || n === "8") ? "cr" : "actif";
  // suisse : 1 actif, 2 passif, 3-9 compte de résultat
  return n === "1" ? "actif" : n === "2" ? "passif" : "cr";
}

/* ════════════════════════════════════════════════════════════════
   FRAUDE PAR POSTE — ce qu'il faut savoir sur la fraude potentielle
   de chaque ligne du bilan & du compte de résultat (schémas, signaux
   d'alerte, procédures de détection). Données : window.__FRAUDE_POSTES__.
   ════════════════════════════════════════════════════════════════ */
/* sens directionnel d'une assertion : ↑ surévaluer · ↓ omettre · ↕ décaler · ∅ dissimuler */
const FP_DIR = {
  up:   { arrow: "↑", bg: "#fff1f2", bd: "#fecdd3", fg: "#be123c" },
  down: { arrow: "↓", bg: "#fffbeb", bd: "#fde68a", fg: "#b45309" },
  flip: { arrow: "↕", bg: "#f5f3ff", bd: "#ddd6fe", fg: "#6d28d9" },
  hide: { arrow: "∅", bg: "#f1f5f9", bd: "#cbd5e1", fg: "#475569" },
};
function FpSensBadge({ dir, text }) {
  const d = FP_DIR[dir] || FP_DIR.up;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full border px-2 py-0.5 whitespace-nowrap"
      style={{ background: d.bg, borderColor: d.bd, color: d.fg }}>
      <span className="text-[12px] leading-none">{d.arrow}</span>{text}
    </span>
  );
}
/* libellé de section : icône + titre capitales + filet teinté (pas de bordure latérale) */
function FpSectionLabel({ icon, children, color }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-[12px] leading-none">{icon}</span>
      <span className="text-[10.5px] font-bold uppercase tracking-[0.09em]" style={{ color }}>{children}</span>
      <span className="flex-1 h-px rounded-full" style={{ background: color + "26" }} />
    </div>
  );
}
function FpListBlock({ icon, title, color, items }) {
  if (!items || !items.length) return null;
  return (
    <div className="mt-3">
      <FpSectionLabel icon={icon} color={color}>{title}</FpSectionLabel>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-[13px] text-slate-700 leading-snug flex gap-2">
            <span className="mt-[6px] h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="max-w-[68ch]"><MdInline text={it} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
/* relie un libellé d'assertion (texte libre d'un poste) à la clé de l'assertion documentée */
function _fpAssertKey(text, assertions) {
  const n = String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  let hit = null;
  (assertions || []).forEach((a) => {
    const an = String(a.nom || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (an.includes(n) || n.includes(a.key) || an.split(/[ /]/)[0] === n.split(/[ /]/)[0]) hit = a.key;
  });
  return hit;
}
/* carte d'assertion : médaillon + définition + comment la fraude l'attaque + postes exposés cliquables */
function FpAssertionCard({ a, onPoste }) {
  const c = a.color || "#6366f1";
  return (
    <div id={"fp-assert-" + a.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ease-out hover:shadow-md hover:-translate-y-0.5">
      <div className="h-1" style={{ background: c }} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="h-11 w-11 shrink-0 rounded-xl grid place-items-center text-[22px]" style={{ background: c + "14", boxShadow: "inset 0 0 0 1px " + c + "33" }}>{a.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-[15.5px] text-slate-800 leading-tight">{a.nom}</h3>
              <FpSensBadge dir={a.sens_dir} text={a.sens} />
            </div>
            <p className="text-[13.5px] text-slate-600 leading-relaxed mt-1.5 max-w-[68ch]"><MdInline text={a.def} /></p>
          </div>
        </div>
        <div className="mt-3 rounded-xl border px-3.5 py-2.5" style={{ background: c + "0d", borderColor: c + "33" }}>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.09em] mb-1" style={{ color: c }}>🎭 Comment la fraude l'attaque</div>
          <p className="text-[13px] text-slate-700 leading-snug max-w-[68ch]"><MdInline text={a.fraude} /></p>
        </div>
        {a.cas && (
          <p className="text-[12.5px] text-slate-500 leading-snug mt-2.5 max-w-[70ch]"><span className="font-semibold text-slate-600">Cas emblématiques :</span> <MdInline text={a.cas} /></p>
        )}
        {a.postes && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-slate-400">Postes exposés</span>
            {a.postes.split("·").map((p, i) => {
              const t = p.trim();
              if (!t) return null;
              return <button key={i} onClick={() => onPoste && onPoste(t)} className="text-[11.5px] font-medium rounded-full px-2.5 py-0.5 bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white transition-colors">{t}</button>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
function FpPosteCard({ p, secColor, open, onToggle, onAssertion }) {
  const nSch = (p.schemes || []).length;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 ease-out hover:shadow-md">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <span className="h-10 w-10 shrink-0 rounded-xl grid place-items-center text-[20px]" style={{ background: secColor + "14", boxShadow: "inset 0 0 0 1px " + secColor + "30" }}>{p.icon || "•"}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold text-[14.5px] text-slate-800 leading-tight">{p.poste}</span>
          <span className="flex items-center gap-2 flex-wrap mt-0.5">
            {p.comptes && <span className="text-[10px] font-mono text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{p.comptes}</span>}
            {p.sens && <span className="text-[11px] text-slate-500"><MdInline text={p.sens} /></span>}
          </span>
        </span>
        {nSch > 0 && <span className="hidden sm:inline-flex items-center gap-1 text-[10.5px] font-bold rounded-full px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 whitespace-nowrap">{nSch} schéma{nSch > 1 ? "s" : ""}</span>}
        <ChevronDown size={16} className={"text-slate-400 shrink-0 transition-transform duration-300 " + (open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100">
          {(p.assertions || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 mb-1 items-center">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-slate-400 self-center">Assertions visées</span>
              {p.assertions.map((a, i) => (
                <button key={i} onClick={() => onAssertion && onAssertion(a)} title="Voir l'assertion" className="group text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors hover:brightness-95" style={{ color: secColor, borderColor: secColor + "55", background: secColor + "10" }}>{a} <span className="opacity-50 group-hover:opacity-100">→</span></button>
              ))}
            </div>
          )}
          {nSch > 0 && (
            <div className="mt-3">
              <FpSectionLabel icon="🎭" color="#be123c">Schémas de fraude</FpSectionLabel>
              <div className="space-y-2">
                {p.schemes.map((s, i) => (
                  <div key={i} className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2.5">
                    <div className="flex gap-2.5">
                      <span className="shrink-0 h-5 min-w-[20px] px-1 grid place-items-center rounded-md bg-rose-600 text-white text-[10.5px] font-bold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-rose-800"><MdInline text={s.nom || ""} /></div>
                        {s.comment && <div className="text-[13px] text-slate-700 leading-snug mt-0.5 max-w-[68ch]"><MdInline text={s.comment} /></div>}
                        {s.indice && <div className="text-[12px] text-slate-500 leading-snug mt-1.5">🔎 <span className="font-semibold">Indice :</span> <MdInline text={s.indice} /></div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <FpListBlock icon="🚩" title="Signaux d'alerte" color="#b45309" items={p.red_flags} />
          <FpListBlock icon="✅" title="Procédures d'audit" color="#047857" items={p.procedures} />
          {p.exemple && (
            <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-slate-400 mb-0.5">💼 Cas réel</div>
              <div className="text-[12.5px] text-slate-600 leading-snug max-w-[70ch]"><MdInline text={p.exemple} /></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function AuditFraudePostes({ data, onBack }) {
  const fp = data || {};
  const sections = fp.sections || [];
  const assertions = fp.assertions || [];
  const [lens, setLens] = useState("postes");
  const [tab, setTab] = useState(sections.length ? sections[0].id : null);
  const [q, setQ] = useState("");
  const [openMap, setOpenMap] = useState({});
  const [allOpen, setAllOpen] = useState(false);
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const query = norm(q.trim());
  const matchPoste = (p) => !query || norm(JSON.stringify(p)).includes(query);
  const key = (sid, i) => sid + "-" + i;
  const isOpen = (sid, i) => allOpen || !!openMap[key(sid, i)] || query.length >= 2;

  if (!sections.length) return <div className="text-center text-slate-400 py-12">Données indisponibles.</div>;

  const totalPostes = sections.reduce((a, s) => a + (s.postes || []).length, 0);
  const totalSchemes = sections.reduce((a, s) => a + (s.postes || []).reduce((b, p) => b + (p.schemes || []).length, 0), 0);
  const filteredSections = query.length >= 2
    ? sections.map((s) => ({ ...s, postes: (s.postes || []).filter(matchPoste) })).filter((s) => s.postes.length)
    : sections.filter((s) => s.id === tab);

  // liens croisés
  const jumpToAssertion = (txt) => {
    const k = _fpAssertKey(txt, assertions);
    setLens("assertions");
    if (k) setTimeout(() => _pcFlash("fp-assert-" + k, true), 70);
  };
  const jumpToPoste = (txt) => {
    setAllOpen(false); setOpenMap({}); setQ(txt); setLens("postes");
    try { window.scrollTo({ top: 0 }); } catch (e) {}
  };

  const LEGEND = [
    { d: "up", t: "Actif & produits : on surévalue" },
    { d: "down", t: "Passif & charges : on omet" },
    { d: "flip", t: "Cut-off : on décale entre exercices" },
  ];

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-rose-700 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>

      {/* hero — dossier d'enquête */}
      <div className="relative overflow-hidden rounded-2xl text-white p-5 sm:p-6 shadow mb-4" style={{ background: "linear-gradient(135deg,#0f172a 0%,#221a2e 55%,#3b1020 100%)" }}>
        <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.18em] text-rose-300 mb-2">
          <AlertTriangle size={13} /> Dossier · fraude financière
        </div>
        <h2 className="text-2xl font-bold leading-tight">Cartographie de la fraude, poste par poste</h2>
        <p className="text-[13.5px] text-slate-300 mt-1.5 max-w-[72ch] leading-relaxed">Pour chaque ligne du bilan et du compte de résultat : par quel schéma on la falsifie, à quels signaux la repérer, par quelles procédures la débusquer. Et, en miroir, les assertions d'audit que chaque fraude vient attaquer.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {LEGEND.map((l, i) => {
            const d = FP_DIR[l.d];
            return <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11.5px] text-slate-200"><span className="font-bold" style={{ color: d.fg === "#475569" ? "#cbd5e1" : "#fda4af" }}>{d.arrow}</span>{l.t}</span>;
          })}
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-[11.5px] font-semibold">
          <span className="rounded-md bg-white/10 px-2.5 py-1 tabular-nums">{totalPostes} postes</span>
          <span className="rounded-md bg-white/10 px-2.5 py-1 tabular-nums">{totalSchemes} schémas de fraude</span>
          <span className="rounded-md bg-white/10 px-2.5 py-1 tabular-nums">{assertions.length} assertions</span>
        </div>
      </div>

      {fp.intro && <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3 text-[13.5px] text-slate-700 leading-relaxed max-w-[74ch]"><MdInline text={fp.intro} /></div>}
      {fp.triangle && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4">
          <div className="text-[12.5px] font-bold uppercase tracking-[0.06em] text-amber-800 mb-2.5">{fp.triangle.titre}</div>
          <div className="grid sm:grid-cols-3 gap-2">
            {(fp.triangle.items || []).map((it, i) => (
              <div key={i} className="bg-white rounded-lg px-3 py-2.5 border border-amber-100">
                <div className="text-[12.5px] font-bold text-amber-900">{it.l}</div>
                <div className="text-[12px] text-slate-600 leading-snug mt-0.5">{it.t}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* sélecteur de lentille */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
          {[["postes", "🗂️ Par poste"], ["assertions", "🎯 Par assertion"]].map(([k, lbl]) => (
            <button key={k} onClick={() => setLens(k)} className={"px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors " + (lens === k ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-800")}>{lbl}</button>
          ))}
        </div>
        <p className="text-[12px] text-slate-400 max-w-[42ch]">{lens === "postes" ? "Déplie un poste pour ses schémas, signaux et procédures." : "L'angle de l'auditeur : ce que chaque fraude vient violer."}</p>
      </div>

      {lens === "assertions" ? (
        <div>
          <p className="text-[13px] text-slate-500 mb-3.5 max-w-[74ch] leading-relaxed">Les sept assertions d'audit sont les affirmations implicites de la direction sur les comptes. Toute fraude revient à en violer une. Clique un poste exposé pour basculer sur sa fiche détaillée.</p>
          <div className="grid gap-3 lg:grid-cols-2 items-start">
            {assertions.map((a) => <FpAssertionCard key={a.key} a={a} onPoste={jumpToPoste} />)}
          </div>
        </div>
      ) : (
        <div>
          {/* recherche + onglets */}
          <div className="sticky top-0 z-10 -mx-4 px-4 py-2.5 bg-slate-100/95 backdrop-blur border-b border-slate-200 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (stock, cut-off, provisions, Enron…)" className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none" />
              </div>
              <button onClick={() => { setAllOpen(!allOpen); setOpenMap({}); }} className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:border-rose-300 whitespace-nowrap">{allOpen ? "Tout replier" : "Tout déplier"}</button>
            </div>
            {!query && (
              <div className="flex gap-1.5 overflow-x-auto mt-2 pb-0.5">
                {sections.map((s) => (
                  <button key={s.id} onClick={() => setTab(s.id)}
                    className={"flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap border transition-colors " + (tab === s.id ? "text-white" : "bg-white text-slate-600 border-slate-200 hover:border-rose-300")}
                    style={tab === s.id ? { background: s.color, borderColor: s.color } : {}}>
                    {s.icon} {s.titre} <span className={"text-[10px] rounded-full px-1.5 " + (tab === s.id ? "bg-white/20" : "bg-slate-100 text-slate-400")}>{(s.postes || []).length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {filteredSections.map((s) => (
            <div key={s.id} className="mb-6">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="h-8 w-8 shrink-0 rounded-lg grid place-items-center text-[17px]" style={{ background: s.color + "14", boxShadow: "inset 0 0 0 1px " + s.color + "30" }}>{s.icon}</span>
                <div className="min-w-0">
                  <div className="font-bold text-[15px] text-slate-800 leading-tight">{s.titre}</div>
                  {s.sous_titre && <div className="text-[12px] text-slate-500 leading-snug">{s.sous_titre}</div>}
                </div>
                <span className="ml-auto text-[11px] font-bold text-slate-400 tabular-nums whitespace-nowrap">{s.postes.length} postes</span>
              </div>
              <div className="space-y-2.5">
                {s.postes.map((p, i) => {
                  const realIdx = (sections.find((x) => x.id === s.id).postes).indexOf(p);
                  return <FpPosteCard key={i} p={p} secColor={s.color} open={isOpen(s.id, realIdx)} onToggle={() => setOpenMap((m) => ({ ...m, [key(s.id, realIdx)]: !(allOpen || m[key(s.id, realIdx)]) }))} onAssertion={jumpToAssertion} />;
                })}
              </div>
            </div>
          ))}
          {query.length >= 2 && !filteredSections.length && <div className="text-center text-slate-400 text-sm py-10">Aucun poste ne correspond à « {q} ».</div>}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   RÉFÉRENCEMENT CROISÉ — comment un dossier d'audit relie chaque
   chiffre à sa preuve : index des feuilles, renvois, tickmarks, et
   un dossier-exemple interactif (cycle créances). window.__REFERENCEMENT__.
   ════════════════════════════════════════════════════════════════ */
/* éclate un long texte en paragraphes courts (protège les abréviations courantes) */
function Paras({ text, className }) {
  const s = String(text || "").trim();
  if (!s) return null;
  const cls = className || "text-[13px] text-slate-600 leading-relaxed";
  if (s.length <= 230) return <p className={cls}><MdInline text={s} /></p>;
  const tmp = s.replace(/\b(art|al|lit|ch|pp?|cf|ex|no|etc|env|fig|tab|réf)\./gi, (m) => m.replace(".", "§"));
  const chunks = tmp.split(/\.\s+/);
  const paras = []; let cur = "";
  chunks.forEach((c, i) => {
    const piece = c + (i < chunks.length - 1 ? "." : "");
    if (cur && (cur.length + piece.length) > 230) { paras.push(cur); cur = piece; }
    else cur = (cur ? cur + " " : "") + piece;
  });
  if (cur) paras.push(cur);
  return <>{paras.map((p, i) => <p key={i} className={cls + " mb-2.5 last:mb-0"}><MdInline text={p.replace(/§/g, ".")} /></p>)}</>;
}
function RcTick({ sym }) {
  return <span title="marque de révision" className="inline-grid place-items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 h-4 min-w-[16px] leading-none align-middle">{sym}</span>;
}
function RcXref({ idx, onJump }) {
  return <button onClick={() => onJump(idx)} title={"Aller à la feuille " + idx} className="inline-flex items-center text-[10.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 h-4 leading-none hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors align-middle">→{idx}</button>;
}
function RcRefCell({ ligne, onJump }) {
  const tk = ligne.tickmarks || [], xr = ligne.xref || [];
  if (!tk.length && !xr.length) return null;
  return (
    <span className="inline-flex items-center gap-1 flex-wrap justify-end">
      {tk.map((t, i) => <RcTick key={"t" + i} sym={t} />)}
      {xr.map((x, i) => <RcXref key={"x" + i} idx={x} onJump={onJump} />)}
    </span>
  );
}
function RcFeuilleCard({ f, onJump }) {
  const cols = f.colonnes || [];
  const isTable = cols.length > 0;
  const isPiece = f.type === "piece";
  const last = cols.length - 1;
  const colCount = isTable ? cols.length : 3;
  const hasNotes = (f.lignes || []).some((l) => l.note);
  const [showNotes, setShowNotes] = useState(false);
  const TYPE = { etats: "États financiers", lead: "Feuille maîtresse", detail: "Détail", test: "Test", calcul: "Calcul", tb: "Balance générale", piece: "Pièce probante" };
  return (
    <div id={"ref-feuille-" + f.index} className={"bg-white rounded-xl shadow-sm overflow-hidden scroll-mt-20 border " + (isPiece ? "border-emerald-300" : "border-slate-200")}>
      <div className={"flex items-center gap-2 px-4 py-2.5 text-white " + (isPiece ? "bg-emerald-800" : "bg-slate-800")}>
        {isPiece && <span className="text-[14px] shrink-0">📎</span>}
        <span className="font-mono text-[12px] font-bold bg-white/15 rounded px-2 py-0.5 shrink-0">{f.index}</span>
        <span className="font-bold text-[13px] sm:text-[13.5px] flex-1 min-w-0 leading-tight">{f.titre}</span>
        {f.type && TYPE[f.type] && <span className="text-[10px] bg-white/10 rounded px-2 py-0.5 shrink-0 hidden sm:inline">{TYPE[f.type]}</span>}
      </div>
      {(f.prepare || f.revu || f.date || f.objectif) && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
            {f.prepare && <span>Préparé : <b className="text-slate-700">{f.prepare}</b></span>}
            {f.revu && <span>Revu : <b className="text-slate-700">{f.revu}</b></span>}
            {f.date && <span>Date : <b className="text-slate-700">{f.date}</b></span>}
          </div>
          {f.objectif && <div className="text-[11.5px] text-slate-500 leading-snug mt-1 max-w-[64ch]">🎯 {f.objectif}</div>}
        </div>
      )}
      <div className="px-4 py-3 overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          {isTable && (
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {cols.map((c, i) => <th key={i} className={"pb-1.5 border-b border-slate-200 " + (i === 0 ? "text-left" : "text-right pl-3 whitespace-nowrap")}>{i === last ? "Réf." : c}</th>)}
              </tr>
            </thead>
          )}
          <tbody>
            {(f.lignes || []).map((l, i) => {
              const vals = l.valeurs || [];
              return (
                <React.Fragment key={i}>
                  <tr className={l.total ? "border-t-2 border-slate-300" : "border-b border-slate-50"}>
                    {isTable ? cols.map((c, ci) => {
                      if (ci === 0) return <td key={ci} className={"py-1.5 pr-3 align-top leading-snug " + (l.total ? "font-bold text-slate-800" : "text-slate-700")}>{l.libelle}</td>;
                      if (ci === last) return <td key={ci} className="py-1.5 pl-3 text-right align-top whitespace-nowrap"><RcRefCell ligne={l} onJump={onJump} /></td>;
                      return <td key={ci} className={"py-1.5 pl-3 text-right align-top tabular-nums whitespace-nowrap " + (l.total ? "font-bold text-slate-800" : "text-slate-600")}>{vals[ci] || ""}</td>;
                    }) : (
                      <>
                        <td className={"py-1.5 pr-3 align-top leading-snug " + (l.total ? "font-bold text-slate-800" : "text-slate-700")}>{l.libelle}</td>
                        <td className={"py-1.5 pl-3 text-right align-top tabular-nums whitespace-nowrap " + (l.total ? "font-bold text-slate-800" : "text-slate-600")}>{l.montant || ""}</td>
                        <td className="py-1.5 pl-3 text-right align-top whitespace-nowrap"><RcRefCell ligne={l} onJump={onJump} /></td>
                      </>
                    )}
                  </tr>
                  {showNotes && l.note && (
                    <tr><td colSpan={colCount} className="pb-2 pl-3 text-[11px] text-slate-400 italic leading-snug">↳ {l.note}</td></tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {(hasNotes || (f.tickmarks_legende || []).length > 0) && (
        <div className="px-4 pb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {hasNotes && <button onClick={() => setShowNotes(!showNotes)} className="text-[10.5px] font-semibold text-indigo-600 hover:text-indigo-800">{showNotes ? "− Masquer les notes" : "+ Notes & renvois expliqués"}</button>}
          {hasNotes && (f.tickmarks_legende || []).length > 0 && <span className="text-slate-300">·</span>}
          {(f.tickmarks_legende || []).map((t, i) => <span key={i} className="text-[10.5px] text-slate-500"><span className="font-bold text-amber-700">{t.sym}</span> {t.sens}</span>)}
        </div>
      )}
      {f.commentaire && <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[12px] text-slate-600 leading-snug"><span className="font-semibold text-slate-700">Conclusion : </span><MdInline text={f.commentaire} /></div>}
    </div>
  );
}
function RcSection({ id, icon, title, sub, children }) {
  return (
    <section id={"rc-" + id} className="scroll-mt-20 mb-8">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-base">{icon}</span>
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</h3>
        <span className="flex-1 h-px bg-slate-200" />
      </div>
      {sub && <div className="max-w-[64ch] mb-3"><Paras text={sub} className="text-[12.5px] text-slate-500 leading-relaxed" /></div>}
      {children}
    </section>
  );
}
function AuditReferencement({ data, onBack }) {
  const d = data || {};
  const ex = d.exemple || {};
  const principe = d.principe || {};
  const idx = d.indexation || {};
  const vocab = d.vocab || [];
  const tickmarks = d.tickmarks || [];
  const checklist = d.checklist || [];
  const pieges = d.pieges || [];
  const feuilles = ex.feuilles || [];
  const jumpFeuille = (i) => _pcFlash("ref-feuille-" + i, true);
  const goAnchor = (a) => { try { const el = document.getElementById("rc-" + a); if (el) el.scrollIntoView({ block: "start" }); } catch (e) {} };
  const stripNum = (s) => String(s || "").replace(/^[①-⑳\d]+[\.\)\-\s]*/, "").trim();
  const NAV = [["principe", "Principe"], ["index", "Index"], ["lexique", "Lexique"], ["tickmarks", "Tickmarks"], ["exemple", "⭐ Exemple"], ["check", "Check-list"]].filter(([a]) => {
    if (a === "principe") return (principe.etapes || []).length;
    if (a === "index") return (idx.schema || []).length;
    if (a === "lexique") return vocab.length;
    if (a === "tickmarks") return tickmarks.length;
    if (a === "exemple") return feuilles.length;
    if (a === "check") return checklist.length || pieges.length;
    return true;
  });

  return (
    <div className="max-w-[900px] mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-700 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>

      <div className="relative overflow-hidden rounded-2xl text-white p-5 sm:p-6 shadow mb-4" style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 60%,#312e81 100%)" }}>
        <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.18em] text-indigo-300 mb-2"><ArrowLeftRight size={13} /> Dossier de révision · traçabilité</div>
        <h2 className="text-2xl font-bold leading-tight">Le référencement croisé</h2>
        <p className="text-[13.5px] text-slate-300 mt-1.5 max-w-[62ch] leading-relaxed">{d._description || "Chaque chiffre des états financiers doit pouvoir être suivi jusqu'à sa preuve. Voici la grammaire qui rend un dossier d'audit traçable : index des feuilles, renvois croisés et marques de révision, illustrés par un dossier-exemple cliquable."}</p>
      </div>

      {d.intro && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-5 max-w-[64ch]">
          <Paras text={d.intro} className="text-[13.5px] text-slate-700 leading-relaxed" />
        </div>
      )}

      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-slate-100/95 backdrop-blur border-b border-slate-200 mb-5 flex gap-1.5 overflow-x-auto">
        {NAV.map(([a, t]) => <button key={a} onClick={() => goAnchor(a)} className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 whitespace-nowrap">{t}</button>)}
      </div>

      {(principe.etapes || []).length > 0 && (
        <RcSection id="principe" icon="🔗" title={principe.titre || "Le principe : la chaîne de traçabilité"}>
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
            <ol className="space-y-0">
              {principe.etapes.map((e, i) => (
                <li key={i} className="relative pl-10 pb-5 last:pb-0">
                  {i < principe.etapes.length - 1 && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-indigo-200" />}
                  <span className="absolute left-0 top-0.5 h-8 w-8 grid place-items-center rounded-full bg-indigo-600 text-white text-[13px] font-bold shadow-sm">{i + 1}</span>
                  <div className="font-bold text-[14px] text-slate-800 leading-tight pt-1.5">{stripNum(e.l)}</div>
                  <div className="mt-1 max-w-[60ch]"><Paras text={e.t} className="text-[12.5px] text-slate-600 leading-relaxed" /></div>
                </li>
              ))}
            </ol>
          </div>
        </RcSection>
      )}

      {(idx.schema || []).length > 0 && (
        <RcSection id="index" icon="🗂️" title="Indexation des feuilles" sub={idx.intro}>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-[58px_1fr] sm:grid-cols-[58px_minmax(150px,1fr)_1.5fr] text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">
              <span className="px-3 py-2">Index</span><span className="px-3 py-2">Cycle</span><span className="px-3 py-2 hidden sm:block">Exemple de feuille</span>
            </div>
            {idx.schema.map((r, i) => (
              <div key={i} className="grid grid-cols-[58px_1fr] sm:grid-cols-[58px_minmax(150px,1fr)_1.5fr] text-[12.5px] border-b border-slate-50 last:border-0 items-start">
                <span className="px-3 py-2"><span className="font-mono font-bold text-[11px] text-indigo-700 bg-indigo-50 rounded px-1.5 py-0.5">{r.idx}</span></span>
                <span className="px-3 py-2 text-slate-700 font-medium leading-snug">{r.cycle}</span>
                <span className="px-3 py-2 text-slate-500 leading-snug hidden sm:block">{r.exemple || ""}</span>
              </div>
            ))}
          </div>
        </RcSection>
      )}

      {vocab.length > 0 && (
        <RcSection id="lexique" icon="📖" title="Le vocabulaire du référencement">
          <div className="grid sm:grid-cols-2 gap-2.5">
            {vocab.map((v, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-3.5">
                <div className="flex items-baseline gap-2 flex-wrap"><span className="font-bold text-[13.5px] text-slate-800">{v.terme}</span>{v.en && <span className="text-[11px] text-indigo-400 font-medium">{v.en}</span>}</div>
                <div className="text-[12.5px] text-slate-600 leading-snug mt-1"><MdInline text={v.def} /></div>
                {v.exemple && <div className="text-[11.5px] text-slate-400 italic mt-1.5 leading-snug">Ex. <MdInline text={v.exemple} /></div>}
              </div>
            ))}
          </div>
        </RcSection>
      )}

      {tickmarks.length > 0 && (
        <RcSection id="tickmarks" icon="✓" title="Les tickmarks (marques de révision)" sub="Chaque marque atteste d'un travail effectué sur le chiffre à côté duquel elle est posée. **Les symboles ne sont pas normalisés** : ils varient d'un cabinet et d'un dossier à l'autre. La règle d'or : **chaque feuille porte sa propre légende**.">
          <div className="grid sm:grid-cols-2 gap-2">
            {tickmarks.map((t, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-white rounded-lg border border-slate-200 px-3 py-2">
                <span className="inline-grid place-items-center text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded h-6 min-w-[24px] px-1 shrink-0 mt-0.5">{t.sym}</span>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap"><span className="font-bold text-[12.5px] text-slate-800">{t.nom}</span>{t.en && <span className="text-[10.5px] text-slate-400">{t.en}</span>}</div>
                  <div className="text-[12px] text-slate-600 leading-snug">{t.sens}</div>
                </div>
              </div>
            ))}
          </div>
        </RcSection>
      )}

      {feuilles.length > 0 && (
        <RcSection id="exemple" icon="⭐" title={"Le dossier-exemple · " + (ex.titre || "cycle Créances clients")}>
          {ex.contexte && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3 max-w-[64ch]">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-slate-400 mb-1.5">Contexte de la mission</div>
              <Paras text={ex.contexte} className="text-[12.5px] text-slate-600 leading-relaxed" />
            </div>
          )}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 mb-4">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-indigo-700 mb-2">🧭 Le fil rouge · suis le net 2’470’000 CHF de feuille en feuille</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {feuilles.map((f, i) => (
                <React.Fragment key={f.index}>
                  {i > 0 && <span className="text-indigo-300 text-[13px]">→</span>}
                  <button onClick={() => jumpFeuille(f.index)} title={f.titre} className={"font-mono text-[11px] font-bold rounded px-2 py-0.5 border transition-colors " + (f.type === "piece" ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white" : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-600 hover:text-white")}>{f.index}</button>
                </React.Fragment>
              ))}
            </div>
            <div className="text-[11.5px] text-indigo-600 mt-2.5 leading-snug">Clique une feuille ci-dessus, ou n'importe quel renvoi <span className="font-mono bg-white border border-indigo-200 rounded px-1">→B-1</span> dans une feuille : il saute à la feuille liée et la fait clignoter. À chaque étape, le même montant se retrouve à l'identique, c'est le bouclage.</div>
          </div>
          <div className="space-y-3">
            {feuilles.map((f, i) => <RcFeuilleCard key={i} f={f} onJump={jumpFeuille} />)}
          </div>
        </RcSection>
      )}

      {(checklist.length > 0 || pieges.length > 0) && (
        <RcSection id="check" icon="✅" title="Bien référencer · check-list & pièges">
          <div className="grid lg:grid-cols-2 gap-3 items-start">
            {checklist.length > 0 && (
              <div className="bg-white rounded-xl border border-emerald-200 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 mb-2.5">✅ Check-list du bon référencement</div>
                <ul className="space-y-2">
                  {checklist.map((c, i) => <li key={i} className="flex gap-2 text-[12.5px] text-slate-700 leading-snug"><span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /><span><MdInline text={c} /></span></li>)}
                </ul>
              </div>
            )}
            {pieges.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-200 p-4">
                <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-2.5">⚠️ Pièges classiques</div>
                <ul className="space-y-2.5">
                  {pieges.map((p, i) => <li key={i} className="text-[12.5px] text-slate-700 leading-snug"><span className="font-bold text-slate-800">{p.l}</span> : <MdInline text={p.t} /></li>)}
                </ul>
              </div>
            )}
          </div>
        </RcSection>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   ANNEXES DES ÉTATS FINANCIERS — contenu obligatoire selon CO,
   Swiss GAAP RPC et IFRS + comparatif. window.__ANNEXES__.
   ════════════════════════════════════════════════════════════════ */
const ANX_COLOR = { co: "#d97706", rpc: "#2563eb", ifrs: "#059669" };
const ANX_TABLABEL = { co: "CO", rpc: "Swiss GAAP RPC", ifrs: "IFRS" };
function AnxV({ v }) {
  const m = {
    oui: { t: "✓", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", lbl: "Exigé" },
    non: { t: "–", cls: "bg-slate-100 text-slate-400 border-slate-200", lbl: "Non exigé" },
    si: { t: "◐", cls: "bg-amber-100 text-amber-700 border-amber-200", lbl: "Si applicable / grandes entreprises" },
    partiel: { t: "≈", cls: "bg-sky-100 text-sky-700 border-sky-200", lbl: "Exigé mais allégé" },
  };
  const d = m[String(v || "").toLowerCase()] || m.non;
  return <span title={d.lbl} className={"inline-grid place-items-center h-6 w-6 rounded-full border text-[13px] font-bold " + d.cls}>{d.t}</span>;
}
function AnxNiveau({ niveau, color }) {
  if (!niveau) return null;
  const n = niveau.toLowerCase();
  let cls = "bg-slate-100 text-slate-500 border-slate-200", style = {};
  if (n.includes("oblig")) { cls = "text-white border-transparent"; style = { background: color }; }
  else if (n.includes("applicable")) cls = "bg-white text-slate-500 border-slate-300";
  else if (n.includes("grande") || n.includes("ordinaire")) cls = "bg-slate-700 text-white border-transparent";
  else if (n.includes("recommand")) cls = "bg-violet-50 text-violet-600 border-violet-200";
  return <span className={"text-[10px] font-bold rounded-full px-2 py-0.5 border whitespace-nowrap " + cls} style={style}>{niveau}</span>;
}
function AnxReferentiel({ r }) {
  const color = ANX_COLOR[r.key] || "#0f766e";
  return (
    <div>
      <div className="rounded-xl border p-4 sm:p-5 mb-4" style={{ borderColor: color + "44", background: color + "0c" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl">{r.drapeau}</span>
          <h3 className="font-bold text-[16px] text-slate-800">{r.nom}</h3>
          {r.base_legale && <span className="text-[11px] font-mono rounded px-1.5 py-0.5" style={{ background: color + "1c", color }}>{r.base_legale}</span>}
        </div>
        {r.philosophie && <div className="mt-2 max-w-[64ch]"><Paras text={r.philosophie} className="text-[13px] text-slate-600 leading-relaxed" /></div>}
        {(r.etats_requis || []).length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-400">États requis</span>
            {r.etats_requis.map((e, i) => <span key={i} className="text-[11px] rounded-full bg-white border px-2 py-0.5 text-slate-600" style={{ borderColor: color + "44" }}>{e}</span>)}
          </div>
        )}
      </div>
      {r.intro && <div className="max-w-[64ch] mb-4"><Paras text={r.intro} className="text-[13px] text-slate-600 leading-relaxed" /></div>}
      <div className="space-y-6">
        {(r.rubriques || []).map((rub, i) => (
          <div key={i}>
            <div className="flex items-center gap-2 mb-2.5">
              {rub.icon && <span className="text-[15px]">{rub.icon}</span>}
              <h4 className="font-bold text-[13.5px] text-slate-800">{rub.titre}</h4>
              <span className="flex-1 h-px" style={{ background: color + "2e" }} />
            </div>
            <div className="space-y-2">
              {(rub.items || []).map((it, j) => (
                <div key={j} className="bg-white rounded-xl border border-slate-200 p-3.5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="font-semibold text-[13px] text-slate-800 leading-snug flex-1 min-w-[180px]">{it.l}</div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {it.ref && <span className="text-[10px] font-mono rounded px-1.5 py-0.5 whitespace-nowrap" style={{ background: color + "16", color }}>{it.ref}</span>}
                      <AnxNiveau niveau={it.niveau} color={color} />
                    </div>
                  </div>
                  {it.d && <div className="mt-1 max-w-[70ch]"><Paras text={it.d} className="text-[12.5px] text-slate-600 leading-relaxed" /></div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function AnxComparatif({ comp }) {
  const head = [["co", "CO"], ["rpc", "RPC"], ["ifrs", "IFRS"]];
  return (
    <div>
      {comp.intro && <div className="max-w-[72ch] mb-3"><Paras text={comp.intro} className="text-[13px] text-slate-600 leading-relaxed" /></div>}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className="text-left font-bold text-slate-500 px-3 py-2.5 border-b border-slate-200 sticky left-0 bg-white">Information à fournir</th>
              {head.map(([k, lbl]) => <th key={k} className="px-2 py-2.5 border-b border-slate-200 text-center font-bold" style={{ color: ANX_COLOR[k] }}><span className="inline-flex items-center gap-1">{k === "ifrs" ? "🌍" : "🇨🇭"} {lbl}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {(comp.themes || []).map((t, i) => (
              <tr key={i} className="border-b border-slate-50 align-top">
                <td className="px-3 py-2 text-slate-700 font-medium leading-snug sticky left-0 bg-white">{t.theme}</td>
                {head.map(([k]) => {
                  const cell = t[k] || {};
                  return (
                    <td key={k} className="px-2 py-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <AnxV v={cell.v} />
                        {cell.note && <span className="text-[10px] text-slate-400 leading-tight max-w-[150px]">{cell.note}</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5"><AnxV v="oui" /> Exigé</span>
        <span className="inline-flex items-center gap-1.5"><AnxV v="si" /> Si applicable / grandes entreprises</span>
        <span className="inline-flex items-center gap-1.5"><AnxV v="partiel" /> Exigé mais allégé</span>
        <span className="inline-flex items-center gap-1.5"><AnxV v="non" /> Non exigé</span>
      </div>
    </div>
  );
}
function AuditAnnexes({ data, onBack }) {
  const d = data || {};
  const refs = d.referentiels || [];
  const comp = d.comparatif || {};
  const [lens, setLens] = useState("comparatif");
  const TABS = [["comparatif", "⚖️ Comparatif"]].concat(refs.map((r) => [r.key, (r.drapeau ? r.drapeau + " " : "") + (ANX_TABLABEL[r.key] || r.nom)]));
  const cur = refs.find((r) => r.key === lens);
  if (!refs.length) return (
    <div className="max-w-[920px] mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>
      <div className="text-center text-slate-400 py-12">Données indisponibles.</div>
    </div>
  );
  return (
    <div className="max-w-[920px] mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>

      <div className="relative overflow-hidden rounded-2xl text-white p-5 sm:p-6 shadow mb-4" style={{ background: "linear-gradient(135deg,#0f172a 0%,#134e4a 70%,#115e59 100%)" }}>
        <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.18em] text-teal-300 mb-2"><FileText size={13} /> Annexe · notes aux états financiers</div>
        <h2 className="text-2xl font-bold leading-tight">Que doit contenir l'annexe ?</h2>
        <p className="text-[13.5px] text-slate-300 mt-1.5 max-w-[62ch] leading-relaxed">{d._description || "Le contenu obligatoire de l'annexe des comptes, référentiel par référentiel, avec la base légale de chaque information à fournir, et un comparatif des trois cadres."}</p>
        <div className="flex flex-wrap gap-2 mt-3.5">
          {refs.map((r) => <span key={r.key} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: ANX_COLOR[r.key] + "26", color: r.key === "co" ? "#fcd34d" : r.key === "rpc" ? "#93c5fd" : "#6ee7b7" }}>{r.drapeau} {ANX_TABLABEL[r.key] || r.nom}</span>)}
        </div>
      </div>

      {d.intro && <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-5 max-w-[66ch]"><Paras text={d.intro} className="text-[13.5px] text-slate-700 leading-relaxed" /></div>}

      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-slate-100/95 backdrop-blur border-b border-slate-200 mb-5 flex gap-1.5 overflow-x-auto">
        {TABS.map(([k, lbl]) => (
          <button key={k} onClick={() => { setLens(k); try { window.scrollTo(0, 0); } catch (e) {} }}
            className={"text-[12.5px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors " + (lens === k ? "text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-teal-300")}
            style={lens === k ? { background: k === "comparatif" ? "#0f766e" : ANX_COLOR[k] } : {}}>{lbl}</button>
        ))}
      </div>

      {lens === "comparatif" ? <AnxComparatif comp={comp} /> : cur ? <AnxReferentiel r={cur} /> : null}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   AMORTISSEMENTS — linéaire & dégressif, taux AFC, écritures, et un
   calculateur interactif (tableau année par année + courbe). window.__AMORTISSEMENTS__.
   ════════════════════════════════════════════════════════════════ */
const amNf = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "–";
  const neg = n < 0; n = Math.abs(Math.round(n * 100) / 100);
  let [a, b] = n.toFixed(2).split(".");
  a = a.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return (neg ? "-" : "") + a + (b === "00" ? "" : "." + b);
};
const amPct = (t) => (Math.round(t * 100) / 100).toString().replace(".", ",") + "%";
function AmMd({ text }) {
  const blocks = String(text || "").trim().split(/\n\s*\n/);
  return blocks.map((bl, i) => {
    const lines = bl.split("\n").map((l) => l.trim()).filter(Boolean);
    const bullets = lines.filter((l) => /^[-•]\s+/.test(l));
    if (bullets.length && bullets.length === lines.length) {
      return <ul key={i} className="list-disc pl-5 space-y-1 my-2">{lines.map((l, j) => <li key={j} className="text-[13px] text-slate-700 leading-relaxed"><MdInline text={l.replace(/^[-•]\s+/, "")} /></li>)}</ul>;
    }
    return <p key={i} className="text-[13px] text-slate-700 leading-relaxed my-2 first:mt-0 max-w-[72ch]"><MdInline text={bl.replace(/\n/g, " ")} /></p>;
  });
}
function AmCallout({ type, text }) {
  const C = {
    cle: { icon: "🎯", lab: "À retenir", cls: "border-violet-200 bg-violet-50", lc: "text-violet-700" },
    exemple: { icon: "🧮", lab: "Exemple", cls: "border-sky-200 bg-sky-50", lc: "text-sky-700" },
    piege: { icon: "⚠️", lab: "Piège", cls: "border-amber-200 bg-amber-50", lc: "text-amber-700" },
    astuce: { icon: "💡", lab: "Astuce", cls: "border-emerald-200 bg-emerald-50", lc: "text-emerald-700" },
  }[type] || {};
  return (
    <div className={"rounded-xl border px-3.5 py-2.5 my-2 " + C.cls}>
      <div className={"text-[10.5px] font-bold uppercase tracking-wide mb-1 " + C.lc}>{C.icon} {C.lab}</div>
      <div className="text-[13px] text-slate-700 leading-relaxed max-w-[72ch]"><MdInline text={text} /></div>
    </div>
  );
}
function AmLesson({ l }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-3">
      <div className="h-1 bg-sky-500" />
      <div className="p-4 sm:p-5">
        <h3 className="font-bold text-[16px] text-slate-800 leading-tight">{l.titre}</h3>
        {l.ref && <div className="text-[11px] font-mono text-sky-600 mt-0.5">{l.ref}</div>}
        <div className="mt-2"><AmMd text={l.contenu} /></div>
        {l.cle && <AmCallout type="cle" text={l.cle} />}
        {l.exemple && <AmCallout type="exemple" text={l.exemple} />}
        {l.piege && <AmCallout type="piege" text={l.piege} />}
        {l.astuce && <AmCallout type="astuce" text={l.astuce} />}
      </div>
    </div>
  );
}
function AmTauxAfc({ taux }) {
  if (!taux) return null;
  const Block = ({ titre, rows, c3 }) => (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-3">
      <div className="px-4 py-2.5 bg-slate-800 text-white text-[13px] font-bold">{titre}</div>
      <div className="overflow-x-auto px-4 py-2">
        <table className="w-full border-collapse text-[12.5px]">
          <thead><tr className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <th className="text-left pb-1 border-b border-slate-200">Catégorie</th>
            <th className="text-right pb-1 border-b border-slate-200 w-32">{c3 === "ca" ? "Sur valeur comptable" : "Taux max (val. comptable)"}</th>
            <th className="text-right pb-1 border-b border-slate-200 w-40">{c3 === "ca" ? "Sur coût d'acquisition" : "Remarque"}</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0">
                <td className="py-1.5 text-slate-700">{r.l}</td>
                <td className="py-1.5 text-right tabular-nums font-semibold text-sky-700">{r.vc}</td>
                <td className="py-1.5 text-right text-slate-500">{c3 === "ca" ? r.ca : (r.note || "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
  return (
    <div>
      {taux.intro && <div className="max-w-[72ch] mb-3"><Paras text={taux.intro} className="text-[13px] text-slate-600 leading-relaxed" /></div>}
      <Block titre="Immobilisations corporelles meubles" rows={taux.meubles || []} c3="ca" />
      <Block titre="Immeubles (bâtiments)" rows={taux.immeubles || []} c3="note" />
      <Block titre="Immobilisations incorporelles" rows={taux.incorporelles || []} c3="ca" />
      {taux.note && <div className="text-[12px] text-slate-500 leading-snug max-w-[72ch]">ℹ️ {taux.note}</div>}
    </div>
  );
}
/* courbe des valeurs comptables (linéaire vs dégressif) */
function AmChart({ lin, deg, valeur, duree }) {
  const W = 540, H = 170, padL = 10, padR = 10, padT = 12, padB = 22;
  const x = (yr) => padL + (W - padL - padR) * (duree ? yr / duree : 0);
  const y = (v) => padT + (H - padT - padB) * (valeur ? 1 - v / valeur : 1);
  const ptsLin = [[0, valeur]].concat(lin.map((r) => [r.y, r.fin]));
  const ptsDeg = [[0, valeur]].concat(deg.map((r) => [r.y, r.fin]));
  const poly = (pts) => pts.map((p) => x(p[0]).toFixed(1) + "," + y(p[1]).toFixed(1)).join(" ");
  return (
    <svg viewBox={"0 0 " + W + " " + H} className="w-full" style={{ maxHeight: 190 }}>
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#e2e8f0" />
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#e2e8f0" />
      <polyline points={poly(ptsLin)} fill="none" stroke="#4f46e5" strokeWidth="2" />
      <polyline points={poly(ptsDeg)} fill="none" stroke="#e11d48" strokeWidth="2" />
      {ptsLin.map((p, i) => <circle key={"l" + i} cx={x(p[0])} cy={y(p[1])} r="2.5" fill="#4f46e5" />)}
      {ptsDeg.map((p, i) => <circle key={"d" + i} cx={x(p[0])} cy={y(p[1])} r="2.5" fill="#e11d48" />)}
      {Array.from({ length: duree + 1 }, (_, i) => <text key={i} x={x(i)} y={H - padB + 13} fontSize="9" fill="#94a3b8" textAnchor="middle">{i}</text>)}
    </svg>
  );
}
function buildLineaire(valeur, duree) {
  const annuite = valeur / duree;
  let vc = valeur; const rows = [];
  for (let yr = 1; yr <= duree; yr++) {
    let amort = yr === duree ? vc : annuite;
    const debut = vc; vc = Math.round((vc - amort) * 100) / 100;
    if (vc < 0.005) vc = 0;
    rows.push({ y: yr, debut, taux: 100 / duree, amort, fin: vc, formula: amNf(valeur) + " ÷ " + duree + " = " + amNf(amort) });
  }
  return rows;
}
function buildDegressif(valeur, duree, tauxDeg, zero) {
  let vc = valeur; const rows = [];
  for (let yr = 1; yr <= duree; yr++) {
    const rest = duree - yr + 1;
    const amortDeg = vc * tauxDeg / 100;
    const quotient = vc / rest;
    let amort = amortDeg, mode = "deg";
    if (zero && quotient >= amortDeg) { amort = quotient; mode = "quotient"; }
    if (zero && yr === duree) { amort = vc; mode = "quotient"; }
    amort = Math.round(amort * 100) / 100;
    const debut = vc; vc = Math.round((vc - amort) * 100) / 100;
    if (vc < 0.005) vc = 0;
    rows.push({ y: yr, debut, taux: tauxDeg, amort, fin: vc, mode,
      formula: mode === "quotient" ? amNf(debut) + " ÷ " + rest + " = " + amNf(amort) : amNf(debut) + " × " + amPct(tauxDeg) + " = " + amNf(amort) });
  }
  return { rows, residual: zero ? 0 : vc };
}
function AmSchedTable({ rows, color, title, subtitle }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 text-white" style={{ background: color }}>
        <div className="text-[13px] font-bold">{title}</div>
        {subtitle && <div className="text-[11px] opacity-90">{subtitle}</div>}
      </div>
      <div className="overflow-x-auto px-3 py-2">
        <table className="w-full border-collapse text-[12px]">
          <thead><tr className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <th className="text-left pb-1 border-b border-slate-200">An</th>
            <th className="text-right pb-1 border-b border-slate-200">Val. début</th>
            <th className="text-left pb-1 border-b border-slate-200 pl-3">Amortissement</th>
            <th className="text-right pb-1 border-b border-slate-200">Val. fin</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.y} className="border-b border-slate-50 last:border-0">
                <td className="py-1.5 text-slate-500 tabular-nums">{r.y}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-600">{amNf(r.debut)}</td>
                <td className="py-1.5 pl-3 text-slate-700 tabular-nums whitespace-nowrap">{r.formula}{r.mode === "quotient" ? <span className="ml-1 text-[9px] font-bold text-violet-600 align-top">quotient</span> : null}</td>
                <td className="py-1.5 text-right tabular-nums font-semibold" style={{ color }}>{amNf(r.fin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function AmField({ label, value, onChange, step, suffix, hint }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-semibold text-slate-600 mb-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="number" value={value} step={step || 1} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-[13px] tabular-nums focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none" />
        {suffix && <span className="text-[12px] text-slate-400 shrink-0">{suffix}</span>}
      </div>
      {hint && <span className="block text-[10.5px] text-slate-400 mt-0.5">{hint}</span>}
    </label>
  );
}
function AmCalc() {
  const [inp, setInp] = useState({ valeur: 100000, duree: 5, tauxDeg: 40, vue: "comparaison", zero: false });
  const set = (k) => (v) => setInp((s) => ({ ...s, [k]: v }));
  const valeur = Math.max(0, +inp.valeur || 0);
  const duree = Math.min(40, Math.max(1, Math.round(+inp.duree || 1)));
  const tauxDeg = Math.min(100, Math.max(0, +inp.tauxDeg || 0));
  const tauxLin = 100 / duree;
  const lin = useMemo(() => buildLineaire(valeur, duree), [valeur, duree]);
  const deg = useMemo(() => buildDegressif(valeur, duree, tauxDeg, inp.zero), [valeur, duree, tauxDeg, inp.zero]);
  const showLin = inp.vue !== "degressif";
  const showDeg = inp.vue !== "lineaire";

  return (
    <div>
      <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 mb-4 max-w-[74ch]">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-sky-700 mb-1">🧮 Cas interactif</div>
        <p className="text-[13px] text-slate-700 leading-relaxed">Change les paramètres et observe le calcul se dérouler année par année. En dégressif, chaque ligne montre la formule <span className="font-mono">valeur comptable × taux</span> : la base diminue, donc l'amortissement aussi.</p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4 items-start">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Paramètres</div>
          <AmField label="Valeur d'acquisition" value={inp.valeur} onChange={set("valeur")} step={1000} suffix="CHF" />
          <AmField label="Durée d'utilisation" value={inp.duree} onChange={set("duree")} suffix="ans" hint={"Taux linéaire = 100 / durée = " + amPct(tauxLin)} />
          <AmField label="Taux dégressif" value={inp.tauxDeg} onChange={set("tauxDeg")} step={1} suffix="%" hint={"≈ 2 × le taux linéaire (" + amPct(tauxLin * 2) + ")"} />
          <div>
            <span className="block text-[11.5px] font-semibold text-slate-600 mb-1">Affichage</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 w-full">
              {[["comparaison", "Comparer"], ["lineaire", "Linéaire"], ["degressif", "Dégressif"]].map(([k, lbl]) => (
                <button key={k} onClick={() => set("vue")(k)} className={"flex-1 text-[11.5px] font-semibold px-2 py-1 rounded-md transition-colors " + (inp.vue === k ? "bg-sky-600 text-white" : "text-slate-600 hover:text-sky-700")}>{lbl}</button>
              ))}
            </div>
          </div>
          {showDeg && (
            <label className="flex items-start gap-2 text-[12px] text-slate-700 cursor-pointer">
              <input type="checkbox" checked={inp.zero} onChange={(e) => set("zero")(e.target.checked)} className="mt-0.5" />
              <span>Dégressif jusqu'à 0 <span className="text-slate-400">(bascule sur la règle du quotient en fin de vie)</span></span>
            </label>
          )}
        </div>

        <div className="space-y-3">
          <div className={"grid gap-3 " + (showLin && showDeg ? "lg:grid-cols-2" : "")}>
            {showLin && <AmSchedTable rows={lin} color="#4f46e5" title="Amortissement linéaire" subtitle={"Annuité constante = " + amNf(valeur / duree) + " (taux " + amPct(tauxLin) + ")"} />}
            {showDeg && <AmSchedTable rows={deg.rows} color="#e11d48" title="Amortissement dégressif" subtitle={"Taux " + amPct(tauxDeg) + " sur la valeur comptable résiduelle"} />}
          </div>

          {showLin && showDeg && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Évolution de la valeur comptable</div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-indigo-600" /> Linéaire</span>
                  <span className="inline-flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-rose-600" /> Dégressif</span>
                </div>
              </div>
              <AmChart lin={lin} deg={deg.rows} valeur={valeur} duree={duree} />
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12.5px] text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-700">Ce qu'on observe : </span>
            le linéaire retire le même montant chaque année et atteint zéro à la fin de la durée. Le dégressif charge fortement les premières années puis s'allège
            {inp.zero
              ? ", et grâce à la règle du quotient il finit lui aussi à zéro."
              : <span>, et il <span className="font-semibold text-rose-600">ne s'annule jamais</span> : après {duree} ans, il resterait encore <span className="font-semibold tabular-nums">{amNf(deg.residual)}</span> au bilan (active l'option « jusqu'à 0 » pour voir la bascule).</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
function AuditAmortissements({ data, onBack }) {
  const d = data || {};
  const lecons = d.lecons || [];
  const [tab, setTab] = useState("cours");
  const TABS = [["cours", "📚 Cours"], ["calc", "🧮 Calculateur"], ["taux", "📊 Taux AFC"]];
  return (
    <div className="max-w-[920px] mx-auto">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-700 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>

      <div className="relative overflow-hidden rounded-2xl text-white p-5 sm:p-6 shadow mb-4" style={{ background: "linear-gradient(135deg,#0f172a 0%,#0c4a6e 65%,#0284c7 100%)" }}>
        <div className="flex items-center gap-2 text-[10.5px] font-mono uppercase tracking-[0.18em] text-sky-300 mb-2">📉 Immobilisations · dépréciation</div>
        <h2 className="text-2xl font-bold leading-tight">Amortissements : linéaire & dégressif</h2>
        <p className="text-[13.5px] text-slate-300 mt-1.5 max-w-[64ch] leading-relaxed">{d._description || "Les deux méthodes d'amortissement, expliquées pas à pas, avec un cas interactif."}</p>
      </div>

      {d.intro && <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-5 max-w-[66ch]"><AmMd text={d.intro} /></div>}

      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-slate-100/95 backdrop-blur border-b border-slate-200 mb-5 flex gap-1.5 overflow-x-auto">
        {TABS.map(([k, lbl]) => (
          <button key={k} onClick={() => { setTab(k); try { window.scrollTo(0, 0); } catch (e) {} }}
            className={"text-[12.5px] font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors " + (tab === k ? "bg-sky-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-sky-300")}>{lbl}</button>
        ))}
      </div>

      {tab === "calc" ? <AmCalc />
        : tab === "taux" ? <AmTauxAfc taux={d.taux_afc} />
        : (
          <div>
            {lecons.map((l, i) => <AmLesson key={i} l={l} />)}
            {(d.points_cles || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 mb-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2.5">🎯 Points clés</div>
                <ul className="space-y-1.5">{d.points_cles.map((p, i) => <li key={i} className="flex gap-2 text-[13px] text-slate-700 leading-snug"><span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" /><span><MdInline text={p} /></span></li>)}</ul>
              </div>
            )}
            {(d.pieges || []).length > 0 && (
              <div className="bg-white rounded-2xl border border-amber-200 p-4 sm:p-5">
                <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-2.5">⚠️ Les pièges à éviter</div>
                <ul className="space-y-2.5">{d.pieges.map((p, i) => <li key={i} className="text-[13px] text-slate-700 leading-snug"><span className="font-bold text-slate-800">{p.titre}</span> : <MdInline text={p.texte} /></li>)}</ul>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   NESTLÉ — États financiers réels commentés (cas pratique audit)
   Chaque poste : à quoi ça correspond · les opérations derrière ·
   norme IFRS (+ contraste CO/RPC) · l'œil de l'auditeur · lecture N/N-1
   ════════════════════════════════════════════════════════════════════ */
function nfmt(n) {
  if (n === null || n === undefined || isNaN(n)) return "–";
  const s = Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return n < 0 ? "(" + s + ")" : s;
}
function npct(a, b) {
  if (!b || isNaN(a) || isNaN(b)) return null;
  return ((a - b) / Math.abs(b)) * 100;
}

function NestlePosteDetail({ line, color }) {
  const a = line.audit || {};
  const Sec = ({ icon, title, tint, children }) => (
    <div className="rounded-xl border p-3.5" style={{ borderColor: tint + "33", background: tint + "0d" }}>
      <div className="flex items-center gap-2 mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: tint }}>{icon}{title}</div>
      <div className="text-[13px] text-slate-700 leading-relaxed">{children}</div>
    </div>
  );
  return (
    <div className="mt-2 mb-1 grid gap-2.5 animate-[fadein_.2s_ease]">
      <Sec icon={<Info size={13} />} title="À quoi ça correspond" tint="#4f46e5"><MdInline text={line.definition} /></Sec>
      {(line.operations || []).length > 0 && (
        <Sec icon={<ChevronRight size={13} />} title="Les opérations derrière" tint="#0891b2">
          <ul className="space-y-1.5">
            {line.operations.map((op, i) => (
              <li key={i} className="flex gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" /><span><MdInline text={op} /></span></li>
            ))}
          </ul>
        </Sec>
      )}
      {line.ecriture && (
        <div className="rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-3.5">
          <div className="flex items-center gap-2 mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400"><FileText size={13} />Écriture type</div>
          <div className="text-[12.5px] font-mono leading-relaxed text-emerald-200">{line.ecriture}</div>
        </div>
      )}
      {line.exemple && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
          <div className="flex items-center gap-2 mb-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700"><Calculator size={13} />Exemple chiffré</div>
          {Array.isArray(line.exemple)
            ? <ul className="space-y-1.5">{line.exemple.map((e, i) => <li key={i} className="text-[13px] text-slate-700 leading-relaxed flex gap-2"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /><span><MdInline text={e} /></span></li>)}</ul>
            : <div className="text-[13px] text-slate-700 leading-relaxed"><MdInline text={line.exemple} /></div>}
        </div>
      )}
      {(line.norme || line.suisse) && (
        <Sec icon={<Gavel size={13} />} title="Norme applicable" tint="#7c3aed">
          {line.norme && <div className="font-semibold text-violet-900">{line.norme}</div>}
          {line.suisse && <div className="mt-1 text-slate-600"><span className="font-semibold">🇨🇭 Suisse — </span>{line.suisse}</div>}
        </Sec>
      )}
      {(a.risque || (a.assertions || []).length || a.procedure) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
          <div className="flex items-center gap-2 mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-700"><Eye size={13} />L'œil de l'auditeur</div>
          {(a.assertions || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {a.assertions.map((as, i) => <span key={i} className="px-2 py-0.5 rounded-md bg-white border border-amber-200 text-[11px] font-semibold text-amber-800">{as}</span>)}
            </div>
          )}
          {a.risque && <div className="text-[13px] text-slate-700 leading-relaxed mb-1.5"><span className="font-bold text-rose-700">Risque · </span><MdInline text={a.risque} /></div>}
          {a.procedure && <div className="text-[13px] text-slate-700 leading-relaxed"><span className="font-bold text-emerald-700">Procédure · </span><MdInline text={a.procedure} /></div>}
        </div>
      )}
      {line.lecture && (
        <Sec icon={<TrendingUp size={13} />} title="Lecture 2025 vs 2024" tint={color}><MdInline text={line.lecture} /></Sec>
      )}
      {line.note_ref && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 flex items-start gap-2">
          <BookOpen size={14} className="text-sky-600 mt-0.5 shrink-0" />
          <div className="text-[12.5px] text-slate-600 leading-relaxed"><span className="font-bold text-sky-700">Pour creuser — </span>{line.note_ref}</div>
        </div>
      )}
    </div>
  );
}

/* Reproduction FIDÈLE d'un tableau du rapport (multi-colonnes, comme le PDF).
   Les lignes ayant un `id` correspondant à une fiche (st.lines) sont cliquables
   et déroulent l'explication pédagogique. */
function NestleTable({ tbl, lines, openId, setOpenId, color }) {
  tbl = tbl || {};
  const cols = tbl.columns || [];
  const lineById = {};
  (lines || []).forEach((l) => { if (l.id) lineById[l.id] = l; });
  const isNeg = (s) => typeof s === "string" && /^\(.*\)$/.test(s.trim());
  const alignCls = (a) => a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-200">
              {cols.map((c, i) => (
                <th key={i} className={`px-2.5 py-2 align-bottom text-[10.5px] font-bold uppercase tracking-wide text-slate-500 ${alignCls(c.align)} ${i === 0 ? "sticky left-0 bg-slate-50 z-10" : ""}`} style={c.w ? { minWidth: c.w } : {}}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(tbl.rows || []).map((r, ri) => {
              if (r.kind === "header") {
                return <tr key={ri} className="bg-slate-100/80 border-b border-slate-200"><td colSpan={cols.length} className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500" style={{ paddingLeft: (10 + (r.indent || 0) * 14) + "px" }}>{(r.cells || [])[0]}</td></tr>;
              }
              const line = r.id && lineById[r.id];
              const open = openId && r.id && openId === r.id;
              const isTot = r.kind === "total", isSub = r.kind === "subtotal";
              const clickable = !!line;
              const rowBg = isTot ? "bg-slate-900 text-white" : isSub ? "bg-violet-50/50" : "";
              return (
                <React.Fragment key={ri}>
                  <tr onClick={clickable ? () => setOpenId(open ? null : r.id) : undefined}
                    className={`border-b border-slate-100 ${rowBg} ${clickable ? "cursor-pointer hover:bg-slate-50/80" : ""} ${isTot && clickable ? "hover:bg-slate-800" : ""}`}>
                    {(r.cells || []).map((cell, ci) => {
                      const c = cols[ci] || {};
                      const num = c.align === "right";
                      const neg = num && isNeg(cell);
                      const strong = isTot || isSub;
                      return (
                        <td key={ci} className={`px-2.5 py-1.5 ${alignCls(c.align)} ${num ? "tabular-nums whitespace-nowrap" : ""} ${ci === 0 ? "sticky left-0 z-10 " + (isTot ? "bg-slate-900" : isSub ? "bg-violet-50" : "bg-white") : ""} ${strong ? "font-bold" : ci === 0 ? "font-medium text-slate-700" : "text-slate-600"} ${neg && !isTot ? "text-rose-600" : ""}`}>
                          {ci === 0 && clickable && <ChevronDown size={11} className={`inline-block mr-1 -ml-0.5 align-middle transition-transform ${open ? "rotate-180" : ""} ${isTot ? "text-slate-400" : "text-slate-300"}`} />}
                          {ci === 0 ? <span style={{ paddingLeft: ((r.indent || 0) * 14) + "px" }}>{cell}</span> : cell}
                        </td>
                      );
                    })}
                  </tr>
                  {open && line && (
                    <tr className="bg-slate-50/60"><td colSpan={cols.length} className="px-3 pb-3 pt-1 border-b border-slate-200"><NestlePosteDetail line={line} color={color} /></td></tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {(tbl.notes || []).length > 0 && (
        <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 leading-relaxed space-y-0.5">
          {tbl.notes.map((n, i) => <div key={i}><MdInline text={n} /></div>)}
        </div>
      )}
      <div className="px-3 py-1.5 border-t border-slate-100 bg-white text-[10.5px] text-slate-400 italic">Tableau reproduit du rapport · clique une ligne soulignée pour l'explication.</div>
    </div>
  );
}

function NestleApp({ onBack }) {
  const data = (typeof window !== "undefined" && window.__NESTLE__) || {};
  const meta = data.meta || {};
  const statements = data.statements || [];
  const firstReady = (statements.find((s) => s.status === "ready") || statements[0] || {}).id;
  const [stId, setStId] = useState(firstReady);
  const [openId, setOpenId] = useState(null);
  const st = statements.find((s) => s.id === stId) || statements[0] || {};
  const color = st.color || "#7c3aed";
  const cols = st.cols || ["2025", "2024"];
  const ready = st.status === "ready" && (st.lines || []).length > 0;

  return (
    <div>
      <style>{"@keyframes fadein{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}"}</style>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>

      {/* En-tête Nestlé */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-stone-800 text-white p-5 shadow mb-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-amber-300/80">Cas réel · comptes consolidés</div>
        <h2 className="text-2xl font-bold mt-1">{meta.company || "Nestlé S.A."}</h2>
        <p className="text-sm text-slate-300 mt-0.5">{meta.title}</p>
        <p className="text-[13px] text-slate-300 leading-relaxed mt-3"><MdInline text={meta.intro || ""} /></p>
        <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">📐 {meta.referentiel}</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">🔎 {meta.auditeur}</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">💱 En {meta.unit}</span>
        </div>
      </div>

      {/* Sélecteur d'états — états primaires puis Notes */}
      {(() => {
        const chip = (s) => {
          const on = s.id === stId, rdy = s.status === "ready";
          return (
            <button key={s.id} onClick={() => { setStId(s.id); setOpenId(null); try { window.scrollTo(0, 0); } catch (e) {} }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${on ? "text-white border-transparent shadow" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}
              style={on ? { background: s.color || "#7c3aed" } : {}}>
              <span>{s.icon}</span>{s.title}
              {!rdy && <span className={`ml-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${on ? "bg-white/20" : "bg-slate-100 text-slate-400"}`}>bientôt</span>}
            </button>
          );
        };
        const primaires = statements.filter((s) => (s.group || "primaire") === "primaire");
        const notes = statements.filter((s) => s.group === "note");
        return (
          <div className="mb-4 space-y-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">États primaires</div>
              <div className="flex flex-wrap gap-2">{primaires.map(chip)}</div>
            </div>
            {notes.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 mt-3">📓 Notes détaillées</div>
                <div className="flex flex-wrap gap-2">{notes.map(chip)}</div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Intro de l'état */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-3">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-lg font-bold text-slate-800">{st.icon} {st.title}</h3>
          <span className="text-xs text-slate-400">{st.subtitle}</span>
        </div>
        <p className="text-[13px] text-slate-600 leading-relaxed mt-1.5"><MdInline text={st.intro || ""} /></p>
      </div>

      {!ready ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-400 text-sm">
          🚧 Cet état sera commenté dans une prochaine phase. Le compte de résultat est disponible dès maintenant.
        </div>
      ) : ((st.tables && st.tables.length) || (st.table && (st.table.rows || []).length)) ? (
        <div className="space-y-4">
          {((st.tables && st.tables.length) ? st.tables : [st.table]).map((tbl, i) => (
            <div key={i}>
              {tbl.title && <div className="text-[13px] font-bold text-slate-700 mb-1.5 mt-1">{tbl.title}</div>}
              <NestleTable tbl={tbl} lines={st.lines} openId={openId} setOpenId={setOpenId} color={color} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {/* en-tête colonnes */}
          <div className="flex items-center gap-2 px-3.5 py-2 border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <span className="flex-1">Poste</span>
            <span className="w-20 text-right">{cols[0]}</span>
            <span className="w-20 text-right">{cols[1]}</span>
            <span className="w-5" />
          </div>
          {(st.lines || []).map((l) => {
            if (l.kind === "header") {
              return (
                <div key={l.id} className="px-3.5 py-1.5 bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-widest text-slate-500" style={{ paddingLeft: (14 + (l.indent || 0) * 16) + "px" }}>{l.label}</div>
              );
            }
            const open = openId === l.id;
            const isTot = l.kind === "total", isSub = l.kind === "subtotal";
            const muted = l.kind === "sub";
            const v = l.v || [null, null];
            const pc = npct(v[0], v[1]);
            return (
              <div key={l.id} className={`border-b border-slate-100 last:border-0 ${isSub ? "bg-violet-50/40" : isTot ? "bg-slate-900 text-white" : ""}`}>
                <button onClick={() => setOpenId(open ? null : l.id)}
                  className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-left transition-colors ${isTot ? "hover:bg-slate-800" : "hover:bg-slate-50"}`}
                  style={{ paddingLeft: (14 + (l.indent || 0) * 16) + "px" }}>
                  <span className="flex-1 min-w-0">
                    <span className={`block leading-tight ${isTot ? "font-bold text-base" : isSub ? "font-bold text-slate-800" : muted ? "text-[13px] text-slate-500 italic" : "text-[13.5px] text-slate-700 font-medium"}`}>{l.label}</span>
                    {l.note && <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${isTot ? "bg-white/15 text-slate-200" : "bg-slate-100 text-slate-400"}`}>Note {l.note}</span>}
                  </span>
                  <span className={`w-20 text-right tabular-nums ${isTot ? "font-bold text-base" : isSub ? "font-bold" : "text-[13.5px]"} ${v[0] < 0 && !isTot ? "text-rose-600" : ""}`}>{nfmt(v[0])}</span>
                  <span className={`w-20 text-right tabular-nums ${isTot ? "text-slate-300" : "text-slate-400"} text-[12.5px]`}>{nfmt(v[1])}</span>
                  <ChevronDown size={15} className={`w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""} ${isTot ? "text-slate-400" : "text-slate-300"}`} />
                </button>
                {open && (
                  <div className={`px-3.5 pb-3 ${isTot ? "bg-white text-slate-900 border-t border-slate-200" : ""}`}>
                    {isTot && <div className="h-2" />}
                    {pc !== null && (
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold mb-1" style={{ color }}>
                        {pc < 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                        Variation {cols[0]} vs {cols[1]} : {pc > 0 ? "+" : ""}{pc.toFixed(1)} %
                      </div>
                    )}
                    <NestlePosteDetail line={l} color={color} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {ready && (st.footnotes || []).length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Indicateurs complémentaires</div>
          <ul className="space-y-1 text-[12.5px] text-slate-600">
            {st.footnotes.map((f, i) => <li key={i} className="flex gap-2"><span className="text-slate-300">›</span>{f}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-4 text-center text-[11px] text-slate-400">{meta.source}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   UNE JOURNÉE D'AUDITEUR — module pédagogique (d'après une vidéo terrain)
   ════════════════════════════════════════════════════════════════════ */
const METIER_TONES = {
  info: { c: "#2563eb", bg: "#eff6ff", bd: "#bfdbfe", ic: <Info size={15} /> },
  tip: { c: "#059669", bg: "#ecfdf5", bd: "#a7f3d0", ic: <Lightbulb size={15} /> },
  warn: { c: "#d97706", bg: "#fffbeb", bd: "#fde68a", ic: <AlertTriangle size={15} /> },
  key: { c: "#7c3aed", bg: "#f5f3ff", bd: "#ddd6fe", ic: <CheckCircle2 size={15} /> },
  pitfall: { c: "#e11d48", bg: "#fff1f2", bd: "#fecdd3", ic: <AlertTriangle size={15} /> },
};
function MetierBlock({ b }) {
  if (b.t === "p") return <p className="text-[14px] text-slate-700 leading-relaxed"><MdInline text={b.text} /></p>;
  if (b.t === "callout") {
    const tn = METIER_TONES[b.tone] || METIER_TONES.info;
    return (
      <div className="rounded-xl border p-3.5" style={{ background: tn.bg, borderColor: tn.bd }}>
        <div className="flex items-center gap-2 mb-1 text-[12.5px] font-bold" style={{ color: tn.c }}>{tn.ic}{b.title}</div>
        <div className="text-[13.5px] text-slate-700 leading-relaxed"><MdInline text={b.text} /></div>
      </div>
    );
  }
  if (b.t === "keys") return (
    <ul className="space-y-1.5">{b.items.map((it, i) => (
      <li key={i} className="flex gap-2 text-[13.5px] text-slate-700 leading-relaxed"><CheckCircle2 size={15} className="text-violet-500 mt-0.5 shrink-0" /><span><MdInline text={it} /></span></li>
    ))}</ul>
  );
  if (b.t === "steps") return (
    <div>
      {b.title && <div className="text-[12px] font-bold uppercase tracking-wide text-slate-400 mb-2">{b.title}</div>}
      <ol className="space-y-2.5">{b.items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-6 h-6 grid place-items-center rounded-full bg-violet-600 text-white text-[12px] font-bold shrink-0">{i + 1}</span>
          <div><div className="font-bold text-[13.5px] text-slate-800">{it.title}</div><div className="text-[13px] text-slate-600 leading-relaxed mt-0.5"><MdInline text={it.text} /></div></div>
        </li>
      ))}</ol>
    </div>
  );
  if (b.t === "table") {
    const cols = b.columns || [];
    return (
      <div>
        {b.title && <div className="text-[12px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{b.title}</div>}
        <div className="rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead><tr className="bg-slate-50 border-b border-slate-200">{cols.map((c, i) => <th key={i} className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 ${c.align === "right" ? "text-right" : "text-left"}`}>{c.label}</th>)}</tr></thead>
            <tbody>{(b.rows || []).map((r, ri) => (
              <tr key={ri} className={`border-b border-slate-100 last:border-0 ${r.kind === "total" ? "bg-slate-900 text-white font-bold" : ""}`}>
                {r.cells.map((cell, ci) => <td key={ci} className={`px-3 py-1.5 ${cols[ci] && cols[ci].align === "right" ? "text-right tabular-nums" : "text-left"} ${ci === 0 && r.kind !== "total" ? "font-medium text-slate-700" : ""}`}>{cell}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );
  }
  if (b.t === "journal") return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 text-slate-100 p-3.5">
      {b.title && <div className="flex items-center gap-2 mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400"><FileText size={13} />{b.title}</div>}
      <div className="space-y-2">{(b.entries || []).map((e, i) => (
        <div key={i}>
          <div className="text-[12px] text-slate-400 mb-1">{e.lib}</div>
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-[13px] font-mono">
            <div><span className="text-rose-300 font-bold">Débit</span> {e.debit}</div><div className="text-right text-emerald-200 tabular-nums">{e.montant}</div>
            <div className="pl-4"><span className="text-sky-300 font-bold">Crédit</span> {e.credit}</div><div className="text-right text-slate-500 tabular-nums">{e.montant}</div>
          </div>
        </div>
      ))}</div>
      {b.note && <div className="mt-2.5 pt-2.5 border-t border-slate-700 text-[12.5px] text-slate-300 leading-relaxed font-sans"><MdInline text={b.note} /></div>}
    </div>
  );
  if (b.t === "example") return (
    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-3.5">
      <div className="flex items-center gap-2 mb-2 text-[12.5px] font-bold text-emerald-700"><Calculator size={15} />{b.title}</div>
      {(b.given || []).length > 0 && <div className="mb-2"><div className="text-[10.5px] font-bold uppercase tracking-wide text-slate-400 mb-1">Données</div><ul className="space-y-0.5">{b.given.map((g, i) => <li key={i} className="text-[13px] text-slate-700 flex gap-1.5"><span className="text-slate-300">›</span><MdInline text={g} /></li>)}</ul></div>}
      {(b.calc || []).length > 0 && <div className="mb-2 rounded-lg bg-white border border-emerald-100 p-2.5"><div className="text-[10.5px] font-bold uppercase tracking-wide text-emerald-600 mb-1">Calcul</div>{b.calc.map((c, i) => <div key={i} className="text-[13px] text-slate-700 font-mono leading-relaxed"><MdInline text={c} /></div>)}</div>}
      {b.result && <div className="text-[13.5px] text-slate-800 leading-relaxed"><span className="font-bold text-emerald-700">→ </span><MdInline text={b.result} /></div>}
    </div>
  );
  if (b.t === "matrix") {
    const cols = b.columns || [];
    const cls = (v) => v === "●" ? "text-rose-600 font-bold" : v === "◐" ? "text-amber-500 font-bold" : "text-slate-300";
    return (
      <div>
        {b.title && <div className="text-[12px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">{b.title}</div>}
        <div className="rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr className="bg-slate-50 border-b border-slate-200">{cols.map((c, i) => <th key={i} className={`px-2 py-2 align-bottom text-[10px] font-bold uppercase tracking-wide text-slate-500 ${i === 0 ? "text-left" : "text-center"}`}>{c}</th>)}</tr></thead>
            <tbody>{(b.rows || []).map((r, ri) => (
              <tr key={ri} className="border-b border-slate-100 last:border-0">
                <td className="px-2 py-1.5 font-medium text-slate-700 whitespace-nowrap">{r.label}</td>
                {r.cells.map((v, ci) => <td key={ci} className={`px-2 py-1.5 text-center text-[15px] ${cls(v)}`}>{v || "—"}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
        {b.legend && <div className="text-[11px] text-slate-400 mt-1">{b.legend}</div>}
      </div>
    );
  }
  if (b.t === "quote") return (
    <blockquote className="border-l-4 border-rose-300 bg-rose-50/50 rounded-r-lg pl-3.5 pr-3 py-2.5">
      <div className="text-[13.5px] text-slate-700 leading-relaxed italic"><MdInline text={b.text} /></div>
      {b.source && <div className="text-[11.5px] text-rose-600 font-semibold mt-1.5">— {b.source}</div>}
    </blockquote>
  );
  return null;
}

function AuditMetier({ onBack }) {
  const data = (typeof window !== "undefined" && window.__METIER__) || {};
  const meta = data.meta || {};
  const sections = data.sections || [];
  const [active, setActive] = useState((sections[0] || {}).id);
  const go = (id) => { setActive(id); try { const el = document.getElementById("metier-" + id); if (el) el.scrollIntoView({ behavior: "instant", block: "start" }); } catch (e) {} };
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-800 to-violet-900 text-white p-5 shadow mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-indigo-300/80">Métier · pratique de terrain</div>
        <h2 className="text-2xl font-bold mt-1">{meta.title}</h2>
        <p className="text-sm text-indigo-100 mt-0.5">{meta.subtitle}</p>
        <p className="text-[13px] text-slate-300 leading-relaxed mt-3"><MdInline text={meta.intro || ""} /></p>
        {meta.source && <p className="text-[11px] text-indigo-300/70 mt-2">{meta.source}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4 sticky top-0 z-10 bg-slate-100/95 backdrop-blur py-2 -mx-1 px-1 rounded-lg">
        {sections.map((s) => (
          <button key={s.id} onClick={() => go(s.id)} className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold border transition-colors flex items-center gap-1 ${active === s.id ? "bg-indigo-600 text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>
            <span>{s.icon}</span>{s.title}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={s.id} id={"metier-" + s.id} className="rounded-2xl border border-slate-200 bg-white p-5 scroll-mt-16">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-10 h-10 grid place-items-center rounded-xl bg-indigo-50 text-indigo-600 text-xl shrink-0">{s.icon}</span>
              <div>
                {s.tag && <div className="text-[10.5px] font-bold uppercase tracking-widest text-indigo-400">{s.tag}</div>}
                <h3 className="text-lg font-bold text-slate-800 leading-tight">{i + 1}. {s.title}</h3>
              </div>
            </div>
            <div className="space-y-3">{(s.blocks || []).map((b, bi) => <MetierBlock key={bi} b={b} />)}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center text-[11px] text-slate-400">Module pédagogique — la méthode d'audit au quotidien.</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   CATALOGUE DES TESTS D'AUDIT — filtrable par assertion / cycle
   ════════════════════════════════════════════════════════════════════ */
const TEST_TYPE_STYLE = {
  controle: "bg-sky-50 text-sky-700 border-sky-200",
  substantif: "bg-violet-50 text-violet-700 border-violet-200",
  analytique: "bg-emerald-50 text-emerald-700 border-emerald-200",
};
const TEST_TYPE_LABEL = { controle: "Test de contrôle", substantif: "Substantif", analytique: "Analytique" };
const SENIO = {
  junior: { label: "Junior", c: "bg-emerald-100 text-emerald-700 border-emerald-200", accent: "#10b981" },
  senior: { label: "Senior", c: "bg-amber-100 text-amber-700 border-amber-200", accent: "#f59e0b" },
  manager: { label: "Manager", c: "bg-rose-100 text-rose-700 border-rose-200", accent: "#f43f5e" },
};
const CYCLE_COLOR = {
  ventes_clients: "#0ea5e9", achats_fourn: "#f59e0b", stocks: "#ca8a04", immobilisations: "#9a3412",
  tresorerie: "#059669", paie: "#db2777", capitaux_emprunts: "#7c3aed", estimations: "#dc2626",
  transversaux: "#475569", audit_it: "#2563eb", consolidation: "#0891b2", fiscal: "#16a34a",
  suisse_revision: "#e11d48", secteur_public: "#0d9488",
};
const cyCol = (id) => CYCLE_COLOR[id] || "#0d9488";
function TestExo({ exo }) {
  const [picked, setPicked] = useState(null);
  const opts = exo.options || [];
  const reveal = picked !== null;
  return (
    <div className="mt-2 rounded-lg bg-teal-50/60 border border-teal-100 p-2.5">
      <div className="text-[12.5px] text-slate-700 leading-relaxed mb-1.5"><MdInline text={exo.contexte || ""} /></div>
      <div className="text-[12.5px] font-semibold text-slate-800 mb-2"><MdInline text={exo.question || ""} /></div>
      <div className="space-y-1">
        {opts.map((o, i) => {
          const chosen = picked === i;
          let cls = "bg-white border-slate-200 hover:border-teal-300";
          if (reveal && o.ok) cls = "bg-emerald-50 border-emerald-300";
          else if (reveal && chosen) cls = "bg-rose-50 border-rose-300";
          else if (reveal) cls = "bg-white border-slate-100 opacity-60";
          return (
            <button key={i} onClick={() => { if (!reveal) setPicked(i); }} disabled={reveal}
              className={`w-full text-left rounded-lg border px-2.5 py-1.5 text-[12.5px] transition-colors ${cls}`}>
              <div className="flex items-start gap-1.5">
                <span className="shrink-0">{reveal ? (o.ok ? "✅" : chosen ? "❌" : "▫️") : "▫️"}</span>
                <span className="min-w-0">
                  <span className={reveal && o.ok ? "font-semibold text-emerald-800" : ""}>{o.t}</span>
                  {reveal && (chosen || o.ok) && <span className="block text-[11.5px] text-slate-600 mt-0.5 leading-snug">{o.fb}</span>}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {reveal && <button onClick={() => setPicked(null)} className="mt-1.5 text-[11px] text-teal-600 font-semibold">↺ Réessayer</button>}
    </div>
  );
}
function TestDeroule({ d }) {
  return (
    <div className="mt-1 rounded-lg bg-slate-50 border border-slate-200 p-3">
      {d.titre && <div className="font-bold text-[13px] text-slate-800 mb-2">{d.titre}</div>}
      <ol className="space-y-2 mb-2">{(d.etapes || []).map((e, i) => (
        <li key={i} className="flex gap-2"><span className="w-5 h-5 grid place-items-center rounded-full bg-teal-600 text-white text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
          <div><div className="font-semibold text-[12.5px] text-slate-800">{e.titre}</div><div className="text-[12.5px] text-slate-600 leading-relaxed"><MdInline text={e.texte || ""} /></div></div></li>
      ))}</ol>
      {(d.ecritures || []).length > 0 && <div className="rounded-lg bg-slate-900 text-slate-100 p-2.5 mb-2 space-y-2">{d.ecritures.map((e, i) => (
        <div key={i}><div className="text-[11px] text-slate-400 mb-0.5">{e.lib}</div>
          <div className="grid grid-cols-[1fr_auto] gap-x-3 text-[12px] font-mono"><div><span className="text-rose-300 font-bold">DT</span> {e.debit}</div><div className="text-right text-emerald-200 tabular-nums">{e.montant}</div><div className="pl-3"><span className="text-sky-300 font-bold">CT</span> {e.credit}</div><div className="text-right text-slate-500 tabular-nums">{e.montant}</div></div></div>
      ))}</div>}
      {d.conclusion && <div className="text-[12.5px] text-slate-700 leading-relaxed"><span className="font-bold text-emerald-700">Conclusion · </span><MdInline text={d.conclusion} /></div>}
    </div>
  );
}
function TestCard({ t, mastered }) {
  const [openExo, setOpenExo] = useState(false);
  const [tab, setTab] = useState("exo");
  const crit = t.niveau === "critique";
  const sen = SENIO[t.seniorite];
  const tabCls = (k) => `text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors ${tab === k ? "bg-teal-600 text-white border-transparent" : "bg-white text-slate-600 border-slate-200"}`;
  return (
    <div className={`rounded-xl border bg-white p-3.5 transition-shadow hover:shadow-md ${mastered ? "border-emerald-300 bg-emerald-50/20" : crit ? "border-rose-200" : "border-slate-200"}`}
      style={{ borderLeftWidth: "4px", borderLeftColor: sen ? sen.accent : "#cbd5e1" }}>
      <div className="flex items-start gap-2 mb-1.5">
        {crit && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 shrink-0 mt-0.5">★ CLÉ</span>}
        <h4 className="font-bold text-[14px] text-slate-800 leading-tight flex-1">{t.nom}</h4>
        {mastered && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded px-1.5 py-0.5 shrink-0 mt-0.5" title="Maîtrisé en entraînement">✓ Maîtrisé</span>}
        {sen && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${sen.c}`}>{sen.label}</span>}
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {(t.type || []).map((ty, i) => <span key={i} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${TEST_TYPE_STYLE[ty] || "bg-slate-50 text-slate-600 border-slate-200"}`}>{TEST_TYPE_LABEL[ty] || ty}</span>)}
        {(t.assertions || []).map((a, i) => <span key={i} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">{a}</span>)}
      </div>
      <div className="space-y-1.5 text-[13px] leading-relaxed">
        <div className="text-slate-700"><span className="font-bold text-rose-600">Pourquoi · </span><MdInline text={t.pourquoi || ""} /></div>
        <div className="text-slate-700"><span className="font-bold text-indigo-600">Comment · </span><MdInline text={t.comment || ""} /></div>
        {t.exemple && <div className="text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5"><span className="font-bold text-slate-500">Ex. · </span><MdInline text={t.exemple} /></div>}
      </div>
      {(t.procedure || []).length > 0 && <div className="mt-2 flex flex-wrap gap-1">{t.procedure.map((p, i) => <span key={i} className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">{p}</span>)}</div>}
      {t.exo && (
        <div className="mt-2.5 border-t border-slate-100 pt-2">
          <button onClick={() => setOpenExo((s) => !s)} className="flex items-center gap-1 text-[12px] font-bold text-teal-700 hover:text-teal-800"><GraduationCap size={13} /> Cas interactif{(t.exo2 || t.deroule) ? " + approfondi" : ""} <ChevronDown size={13} className={`transition-transform ${openExo ? "rotate-180" : ""}`} /></button>
          {openExo && (
            <div className="mt-1.5">
              {(t.exo2 || t.deroule) && (
                <div className="flex flex-wrap gap-1 mb-1">
                  <button onClick={() => setTab("exo")} className={tabCls("exo")}>Cas 1</button>
                  {t.exo2 && <button onClick={() => setTab("exo2")} className={tabCls("exo2")}>🔥 Cas 2 · difficile</button>}
                  {t.deroule && <button onClick={() => setTab("deroule")} className={tabCls("deroule")}>📋 Déroulé chiffré</button>}
                </div>
              )}
              {tab === "exo2" && t.exo2 ? <TestExo exo={t.exo2} /> : tab === "deroule" && t.deroule ? <TestDeroule d={t.deroule} /> : <TestExo exo={t.exo} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function loadTestProg() { try { return JSON.parse(localStorage.getItem("cpa_audit_progress") || "{}"); } catch (e) { return {}; } }
function saveTestProg(p) { try { localStorage.setItem("cpa_audit_progress", JSON.stringify(p)); } catch (e) {} }
function shuffleArr(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const x = r[i]; r[i] = r[j]; r[j] = x; } return r; }

function TrainingMode({ pool, catLabel, hard, onExit, onProgress }) {
  const [order] = useState(() => shuffleArr(pool));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const total = order.length;
  const cur = order[idx];
  const exo = cur ? ((hard && cur.exo2) ? cur.exo2 : cur.exo) : null;
  const pick = (i) => {
    if (picked !== null || !exo) return;
    setPicked(i);
    const ok = !!(exo.options[i] && exo.options[i].ok);
    setAnswers((a) => [...a, { id: cur.id, ok, nom: cur.nom, cat: cur.cat }]);
    setStreak((s) => { const n = ok ? s + 1 : 0; setBest((b) => Math.max(b, n)); return n; });
    if (ok) { const p = loadTestProg(); p.mastered = p.mastered || {}; p.mastered[cur.id] = true; saveTestProg(p); if (onProgress) onProgress(); }
  };
  const next = () => { if (idx + 1 >= total) setDone(true); else { setIdx(idx + 1); setPicked(null); } };

  if (!total) return null;
  if (done) {
    const correct = answers.filter((a) => a.ok).length;
    const pct = Math.round((correct / total) * 100);
    const wrong = answers.filter((a) => !a.ok);
    const msg = pct >= 90 ? "Excellent — niveau examen ! 🎉" : pct >= 70 ? "Bien joué, quelques points à revoir 💪" : pct >= 50 ? "En progrès — refais les ratés 🔁" : "À retravailler — chaque erreur est un apprentissage 📚";
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <style>{"@keyframes pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}"}</style>
        <div className="text-center py-3">
          <div className="text-3xl mb-1 animate-[pop_.5s_ease]">{pct >= 90 ? "🏆" : pct >= 70 ? "🎉" : pct >= 50 ? "💪" : "📚"}</div>
          <div className="text-[12px] font-bold uppercase tracking-widest text-teal-500">Résultats</div>
          <div className={`text-5xl font-black mt-1 animate-[pop_.45s_ease] ${pct >= 70 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"}`}>{pct}%</div>
          <div className="text-sm text-slate-600 mt-1">{correct} / {total} bonnes réponses{best >= 3 ? ` · meilleure série 🔥 ${best}` : ""}</div>
          <div className="text-[13px] text-slate-700 mt-2 font-medium">{msg}</div>
        </div>
        {wrong.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-rose-500 mb-1.5">À revoir ({wrong.length})</div>
            <ul className="space-y-1">{wrong.map((w, i) => <li key={i} className="text-[13px] text-slate-600 flex gap-2"><span className="text-rose-400">✗</span>{w.nom}</li>)}</ul>
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <button onClick={onExit} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200">Retour au catalogue</button>
          {wrong.length > 0 && <button onClick={() => { const ids = new Set(wrong.map((w) => w.id)); onExit(pool.filter((t) => ids.has(t.id))); }} className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600">↻ Revoir les {wrong.length} ratés</button>}
          <button onClick={() => { setIdx(0); setPicked(null); setAnswers([]); setDone(false); }} className="flex-1 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm hover:bg-teal-700">Recommencer</button>
        </div>
      </div>
    );
  }
  const scoreSoFar = answers.filter((a) => a.ok).length;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-3">
        <button onClick={() => onExit()} className="text-[12px] text-slate-400 hover:text-rose-600 font-semibold shrink-0">✕ Quitter</button>
        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-teal-500 transition-all" style={{ width: ((idx) / total * 100) + "%" }} /></div>
        <span className="text-[12px] font-bold text-slate-500 shrink-0 tabular-nums">{idx + 1}/{total}</span>
        {streak >= 2 && <span className="text-[12px] font-bold text-orange-500 shrink-0 tabular-nums animate-[pop_.3s_ease]">🔥 {streak}</span>}
        <span className="text-[12px] font-bold text-emerald-600 shrink-0 tabular-nums">★ {scoreSoFar}</span>
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-teal-500 mb-1">{catLabel(cur.cat).icon} {catLabel(cur.cat).label} {hard && cur.exo2 ? "· difficile" : ""}</div>
      <h4 className="font-bold text-[15px] text-slate-800 mb-2">{cur.nom}</h4>
      {exo && <>
        <div className="text-[13.5px] text-slate-700 leading-relaxed mb-2 bg-slate-50 rounded-lg p-3"><MdInline text={exo.contexte || ""} /></div>
        <div className="text-[14px] font-semibold text-slate-800 mb-2.5"><MdInline text={exo.question || ""} /></div>
        <div className="space-y-1.5">
          {(exo.options || []).map((o, i) => {
            const chosen = picked === i, reveal = picked !== null;
            let cls = "bg-white border-slate-200 hover:border-teal-400 hover:bg-teal-50/30";
            if (reveal && o.ok) cls = "bg-emerald-50 border-emerald-300";
            else if (reveal && chosen) cls = "bg-rose-50 border-rose-300";
            else if (reveal) cls = "bg-white border-slate-100 opacity-60";
            return (
              <button key={i} onClick={() => pick(i)} disabled={reveal} className={`w-full text-left rounded-xl border px-3 py-2.5 text-[13.5px] transition-all ${cls}`}>
                <div className="flex items-start gap-2">
                  <span className="shrink-0 text-base">{reveal ? (o.ok ? "✅" : chosen ? "❌" : "▫️") : "▫️"}</span>
                  <span className="min-w-0"><span className={reveal && o.ok ? "font-semibold text-emerald-800" : reveal && chosen ? "text-rose-800" : ""}>{o.t}</span>
                    {reveal && (chosen || o.ok) && <span className="block text-[12px] text-slate-600 mt-1 leading-snug">{o.fb}</span>}</span>
                </div>
              </button>
            );
          })}
        </div>
        {picked !== null && <button onClick={next} className="mt-3 w-full px-4 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-sm hover:bg-teal-700">{idx + 1 >= total ? "Voir les résultats →" : "Question suivante →"}</button>}
      </>}
    </div>
  );
}

/* ════════ EXERCICE — RETRACER LE JOURNAL CLIENT (type export ERP) ════════ */
function JournalQCM({ exo }) {
  const [picked, setPicked] = useState(null);
  const [sol, setSol] = useState(false);
  const reveal = picked !== null;
  const opts = exo.options || [];
  const sn = SENIO[exo.niveau];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-start gap-2 mb-1.5">
        <h4 className="font-bold text-[14px] text-slate-800 leading-tight flex-1">{exo.titre}</h4>
        {sn && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${sn.c}`}>{sn.label}</span>}
      </div>
      <div className="text-[13px] text-slate-700 leading-relaxed mb-1.5 bg-slate-50 rounded-lg p-2.5"><MdInline text={exo.contexte || ""} /></div>
      <div className="text-[13.5px] font-semibold text-slate-800 mb-1"><MdInline text={exo.question || ""} /></div>
      {exo.indice && <div className="text-[12px] text-teal-700 bg-teal-50/60 rounded px-2 py-1 mb-2">💡 {exo.indice}</div>}
      <div className="space-y-1.5">
        {opts.map((o, i) => {
          const chosen = picked === i;
          let cls = "bg-white border-slate-200 hover:border-teal-400";
          if (reveal && o.ok) cls = "bg-emerald-50 border-emerald-300";
          else if (reveal && chosen) cls = "bg-rose-50 border-rose-300";
          else if (reveal) cls = "bg-white border-slate-100 opacity-60";
          return (
            <button key={i} onClick={() => { if (!reveal) setPicked(i); }} disabled={reveal} className={`w-full text-left rounded-lg border px-2.5 py-2 text-[13px] transition-colors ${cls}`}>
              <div className="flex items-start gap-1.5"><span className="shrink-0">{reveal ? (o.ok ? "✅" : chosen ? "❌" : "▫️") : "▫️"}</span>
                <span className="min-w-0"><span className={reveal && o.ok ? "font-semibold text-emerald-800" : ""}>{o.t}</span>
                  {reveal && (chosen || o.ok) && <span className="block text-[12px] text-slate-600 mt-0.5 leading-snug">{o.fb}</span>}</span></div>
            </button>
          );
        })}
      </div>
      {reveal && (
        <div className="mt-2">
          <button onClick={() => setSol((s) => !s)} className="text-[12px] font-bold text-indigo-700 hover:text-indigo-800">{sol ? "▾" : "▸"} Solution détaillée</button>
          {sol && <div className="mt-1 text-[12.5px] text-slate-700 bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5 leading-relaxed"><MdInline text={exo.solution_texte || ""} /></div>}
          <button onClick={() => { setPicked(null); setSol(false); }} className="ml-3 text-[11px] text-teal-600 font-semibold">↺ Réessayer</button>
        </div>
      )}
    </div>
  );
}
function JournalViewer({ lignes, journaux }) {
  const [q, setQ] = useState("");
  const [cpt, setCpt] = useState("");
  const [jrn, setJrn] = useState("");
  const [page, setPage] = useState(0);
  const PER = 40;
  const comptes = useMemo(() => { const m = {}; lignes.forEach((l) => { m[l.compte] = l.compte_lib; }); return Object.keys(m).map(Number).sort((a, b) => a - b).map((c) => [c, m[c]]); }, [lignes]);
  const filtered = useMemo(() => lignes.filter((l) => {
    if (cpt && String(l.compte) !== cpt) return false;
    if (jrn && l.journal !== jrn) return false;
    if (q) { const s = (l.texte + " " + l.tiers + " " + l.ref + " " + l.piece + " " + l.compte + " " + l.compte_lib).toLowerCase(); if (!s.includes(q.toLowerCase())) return false; }
    return true;
  }), [lignes, q, cpt, jrn]);
  const td = filtered.reduce((a, l) => a + (l.debit || 0), 0);
  const tc = filtered.reduce((a, l) => a + (l.credit || 0), 0);
  const nf = (n) => n ? n.toLocaleString("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ | /g, "'") : "";
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const pg = Math.min(page, pages - 1);
  const rows = filtered.slice(pg * PER, pg * PER + PER);
  const reset = () => setPage(0);
  return (
    <div>
      <div className="text-[13px] font-bold text-slate-700 mb-2 flex items-center gap-2"><FileText size={15} /> Journal comptable — {lignes.length.toLocaleString("fr-CH").replace(/ | /g, "'")} lignes</div>
      <div className="flex flex-wrap gap-2 mb-2 items-center">
        <div className="flex items-center gap-1.5 flex-1 min-w-[180px]"><Search size={14} className="text-slate-400" /><input value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder="Rechercher (texte, réf, tiers, pièce…)" className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12.5px] outline-none focus:border-teal-400" /></div>
        <select value={cpt} onChange={(e) => { setCpt(e.target.value); reset(); }} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] text-slate-600 max-w-[200px]"><option value="">Tous les comptes</option>{comptes.map(([c, lib]) => <option key={c} value={c}>{c} — {lib}</option>)}</select>
        <select value={jrn} onChange={(e) => { setJrn(e.target.value); reset(); }} className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[12px] text-slate-600"><option value="">Tous les journaux</option>{Object.keys(journaux || {}).map((k) => <option key={k} value={k}>{k} — {journaux[k]}</option>)}</select>
        {(q || cpt || jrn) && <button onClick={() => { setQ(""); setCpt(""); setJrn(""); reset(); }} className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold">Réinitialiser</button>}
      </div>
      <div className="rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead><tr className="bg-slate-100 border-b border-slate-300 text-[10.5px] uppercase tracking-wide text-slate-500">
            <th className="px-2 py-1.5 text-left">Date</th><th className="px-2 py-1.5 text-left">Pièce</th><th className="px-2 py-1.5 text-left">Jrnl</th><th className="px-2 py-1.5 text-left">Compte</th><th className="px-2 py-1.5 text-left">Libellé</th><th className="px-2 py-1.5 text-left">Tiers</th><th className="px-2 py-1.5 text-left">Réf.</th><th className="px-2 py-1.5 text-right">Débit</th><th className="px-2 py-1.5 text-right">Crédit</th>
          </tr></thead>
          <tbody>{rows.map((l) => (
            <tr key={l.id} className="border-b border-slate-100 hover:bg-amber-50/40">
              <td className="px-2 py-1 whitespace-nowrap text-slate-500 tabular-nums">{l.date}</td>
              <td className="px-2 py-1 whitespace-nowrap font-mono text-[11px] text-slate-600">{l.piece}</td>
              <td className="px-2 py-1"><span className="text-[10px] font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-500">{l.journal}</span></td>
              <td className="px-2 py-1 font-mono tabular-nums text-slate-700">{l.compte}</td>
              <td className="px-2 py-1 text-slate-700 min-w-[180px]">{l.texte}{l.tva ? <span className="ml-1 text-[10px] text-slate-400">[{l.tva}]</span> : ""}</td>
              <td className="px-2 py-1 text-slate-500 whitespace-nowrap">{l.tiers}</td>
              <td className="px-2 py-1 font-mono text-[11px] text-slate-500 whitespace-nowrap">{l.ref}</td>
              <td className="px-2 py-1 text-right tabular-nums text-slate-800">{nf(l.debit)}</td>
              <td className="px-2 py-1 text-right tabular-nums text-slate-800">{nf(l.credit)}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr className="bg-slate-900 text-white font-bold text-[11.5px]"><td className="px-2 py-1.5" colSpan={7}>Total ({filtered.length} lignes filtrées)</td><td className="px-2 py-1.5 text-right tabular-nums">{nf(td)}</td><td className="px-2 py-1.5 text-right tabular-nums">{nf(tc)}</td></tr></tfoot>
        </table>
      </div>
      <div className="flex items-center justify-between mt-2 text-[12px] text-slate-500">
        <button onClick={() => setPage(Math.max(0, pg - 1))} disabled={pg === 0} className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:border-teal-300">← Précédent</button>
        <span className="font-semibold tabular-nums">Page {pg + 1} / {pages}</span>
        <button onClick={() => setPage(Math.min(pages - 1, pg + 1))} disabled={pg >= pages - 1} className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:border-teal-300">Suivant →</button>
      </div>
    </div>
  );
}
function JournalExercice({ onExit }) {
  const data = (typeof window !== "undefined" && window.__JOURNAL__) || {};
  const meta = data.meta || {};
  const t = meta.totaux || {};
  const nf = (n) => (n || n === 0) ? Number(n).toLocaleString("fr-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ | /g, "'") : "—";
  return (
    <div>
      <button onClick={onExit} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Retour au catalogue</button>
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 text-white p-5 shadow mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-teal-300/80">Exercice · cas pratique sur pièces réelles</div>
        <h2 className="text-2xl font-bold mt-1">📒 Retracer le journal — {meta.company}</h2>
        <p className="text-sm text-slate-300 mt-0.5">{meta.activite} · exercice {meta.exercice} · {meta.referentiel}</p>
        <p className="text-[13px] text-slate-300 leading-relaxed mt-3"><MdInline text={meta.intro || ""} /></p>
        <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">{(meta.nb_lignes || 0).toLocaleString("fr-CH").replace(/ | /g, "'")} lignes · {meta.nb_pieces} pièces</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">Σ Débit = Σ Crédit = {nf(t.debit)}</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">Solde clients {nf(t.solde_clients)}</span>
        </div>
      </div>
      <div className="mb-5">
        <div className="text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-2">🎯 Cas de traçage — réponds, puis vérifie dans le journal ci-dessous</div>
        <div className="grid lg:grid-cols-2 gap-2.5">{(data.exercices || []).map((e) => <JournalQCM key={e.id} exo={e} />)}</div>
      </div>
      <JournalViewer lignes={data.lignes || []} journaux={meta.journaux} />
      <div className="mt-4 text-center text-[11px] text-slate-400">Journal fictif réaliste — entraînement au traçage d'écritures.</div>
    </div>
  );
}

function AuditTests({ onBack }) {
  const data = (typeof window !== "undefined" && window.__TESTS__) || {};
  const meta = data.meta || {};
  const techniques = data.techniques || [];
  const cats = data.cats || [];
  const tests = data.tests || [];
  const [asserts, setAsserts] = useState(() => new Set());
  const [cat, setCat] = useState(null);
  const [senio, setSenio] = useState(null);
  const [q, setQ] = useState("");
  const [training, setTraining] = useState(null); // null | { pool, hard }
  const [exercice, setExercice] = useState(false);
  const [progTick, setProgTick] = useState(0);
  const hasJournal = typeof window !== "undefined" && window.__JOURNAL__ && (window.__JOURNAL__.lignes || []).length;
  const prog = loadTestProg();
  const mastered = prog.mastered || {};
  const masteredCount = tests.filter((t) => mastered[t.id]).length;
  const toggleA = (a) => setAsserts((prev) => { const n = new Set(prev); n.has(a) ? n.delete(a) : n.add(a); return n; });
  const filtered = tests.filter((t) => {
    if (cat && t.cat !== cat) return false;
    if (senio && t.seniorite !== senio) return false;
    if (asserts.size && !(t.assertions || []).some((a) => asserts.has(a))) return false;
    if (q) { const s = ((t.nom || "") + " " + (t.pourquoi || "") + " " + (t.comment || "") + " " + (t.exemple || "")).toLowerCase(); if (!s.includes(q.toLowerCase())) return false; }
    return true;
  });
  const catLabel = (id) => (cats.find((c) => c.id === id) || {});
  const grouped = cats.map((c) => ({ c, items: filtered.filter((t) => t.cat === c.id) })).filter((g) => g.items.length);
  const hasFilter = asserts.size || cat || senio || q;
  const SENIO_FILTER = [{ k: "junior", l: "Junior" }, { k: "senior", l: "Senior" }, { k: "manager", l: "Manager" }];
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mb-3"><ArrowLeft size={15} /> Accueil Audit</button>
      <div className="rounded-2xl bg-gradient-to-br from-teal-800 via-slate-800 to-cyan-900 text-white p-5 shadow mb-4">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-teal-300/80">Référence · procédures d'audit</div>
        <h2 className="text-2xl font-bold mt-1">{meta.title}</h2>
        <p className="text-sm text-teal-100 mt-0.5">{meta.subtitle}</p>
        <p className="text-[13px] text-slate-300 leading-relaxed mt-3"><MdInline text={meta.intro || ""} /></p>
      </div>

      {exercice ? <JournalExercice onExit={() => setExercice(false)} /> : (<>
      {/* Mode entraînement + progression */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => setTraining({ pool: (hasFilter ? filtered : tests).filter((t) => t.exo), hard: false })}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold text-sm shadow hover:from-teal-700 hover:to-cyan-700 flex items-center gap-2">
          <GraduationCap size={16} /> Mode entraînement{hasFilter ? ` · ${filtered.filter((t) => t.exo).length} Q` : ""}
        </button>
        {hasJournal && <button onClick={() => setExercice(true)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-800 to-teal-800 text-white font-bold text-sm shadow hover:from-slate-900 hover:to-teal-900 flex items-center gap-2"><FileText size={16} /> Exercice — Journal client</button>}
        {tests.some((t) => t.exo2) && <button onClick={() => setTraining({ pool: (hasFilter ? filtered : tests).filter((t) => t.exo2), hard: true })} className="px-3 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-sm shadow hover:bg-rose-600 flex items-center gap-1.5">🔥 Difficile</button>}
        <div className="ml-auto flex items-center gap-2">
          <div className="text-[11px] text-slate-500 font-semibold tabular-nums">{masteredCount}/{tests.length} maîtrisés</div>
          <div className="w-24 h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: (tests.length ? masteredCount / tests.length * 100 : 0) + "%" }} /></div>
          {masteredCount > 0 && <button onClick={() => { const p = loadTestProg(); p.mastered = {}; saveTestProg(p); setProgTick((x) => x + 1); }} className="text-[10px] text-slate-400 hover:text-rose-500">réinit.</button>}
        </div>
      </div>
      {training && <div className="mb-5"><TrainingMode pool={training.pool} hard={training.hard} catLabel={catLabel} onExit={(subset) => { setProgTick((x) => x + 1); if (subset && subset.length) setTraining({ pool: subset, hard: training.hard }); else setTraining(null); }} onProgress={() => setProgTick((x) => x + 1)} /></div>}

      {!training && (<>
      {/* Techniques ISA 500 */}
      <div className="mb-5">
        <div className="text-[12px] font-bold uppercase tracking-widest text-slate-400 mb-2">Les 8 techniques de collecte de preuves (ISA 500)</div>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {techniques.map((tq) => (
            <div key={tq.id} className="rounded-xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-center gap-2 mb-1"><span className="text-lg">{tq.icon}</span><span className="font-bold text-[14px] text-slate-800">{tq.nom}</span></div>
              <div className="text-[12.5px] text-slate-600 leading-relaxed"><MdInline text={tq.definition} /></div>
              {tq.exemple && <div className="text-[12px] text-slate-500 mt-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5"><span className="font-semibold">Ex. · </span>{tq.exemple}</div>}
              {tq.fiabilite && <div className="text-[11px] text-teal-600 mt-1.5 font-medium">Fiabilité : {tq.fiabilite}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur rounded-xl p-3 mb-4 space-y-2 -mx-1 px-3">
        <div className="flex items-center gap-2">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un test…" className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-teal-400" />
          {hasFilter ? <button onClick={() => { setAsserts(new Set()); setCat(null); setSenio(null); setQ(""); }} className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold shrink-0">Réinitialiser</button> : null}
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Par niveau (qui réalise le test)</div>
          <div className="flex flex-wrap gap-1">
            {SENIO_FILTER.map((s) => (
              <button key={s.k} onClick={() => setSenio(senio === s.k ? null : s.k)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${senio === s.k ? (s.k === "junior" ? "bg-emerald-600" : s.k === "senior" ? "bg-amber-600" : "bg-rose-600") + " text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>{s.l}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Par assertion</div>
          <div className="flex flex-wrap gap-1">
            {(data.assertions || []).map((a) => (
              <button key={a} onClick={() => toggleA(a)} className={`text-[11px] font-medium px-2 py-1 rounded-lg border transition-colors ${asserts.has(a) ? "bg-amber-500 text-white border-transparent" : "bg-white text-amber-700 border-amber-200 hover:border-amber-300"}`}>{a}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Par cycle</div>
          <div className="flex flex-wrap gap-1">
            {cats.map((c) => (
              <button key={c.id} onClick={() => setCat(cat === c.id ? null : c.id)} className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 ${cat === c.id ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`} style={cat === c.id ? { background: cyCol(c.id) } : {}}><span>{c.icon}</span>{c.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-[12px] text-slate-500 mb-2 font-medium">{filtered.length} test{filtered.length > 1 ? "s" : ""} {hasFilter ? "correspondant au filtre" : "au total"}</div>

      {grouped.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-400 text-sm">Aucun test ne correspond à ce filtre.</div>
      ) : grouped.map((g) => (
        <div key={g.c.id} className="mb-5">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-8 h-8 grid place-items-center rounded-lg text-base shrink-0" style={{ background: cyCol(g.c.id) + "1a", color: cyCol(g.c.id) }}>{g.c.icon}</span>
            <span className="font-bold text-[15px] text-slate-800">{g.c.label}</span>
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: cyCol(g.c.id) + "1a", color: cyCol(g.c.id) }}>{g.items.length}</span>
            <span className="flex-1 h-0.5 rounded-full" style={{ background: cyCol(g.c.id) + "26" }} />
          </div>
          <div className="grid lg:grid-cols-2 gap-2.5">{g.items.map((t, i) => <TestCard key={i} t={t} mastered={!!mastered[t.id]} />)}</div>
        </div>
      ))}
      </>)}
      <div className="mt-4 text-center text-[11px] text-slate-400">Catalogue pédagogique — tests d'audit selon les normes ISA.</div>
      </>)}
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
  const book = (typeof window !== "undefined" && window.__AUDIT_BOOK__) || {};
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-gradient-to-r from-slate-900 to-violet-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Search size={22} className="text-violet-300" />
          <div><h1 className="text-lg font-bold">Audit — NAS / ISA</h1><p className="text-xs text-violet-200">47 normes ISA · cadre suisse · cycles · QCM · outils</p></div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {view.k === "home" && <AuditHome data={data} book={book} onBook={() => go({ k: "book" })} onSeuils={() => go({ k: "seuils" })} onRevision={() => go({ k: "revision" })} onPlanComptable={() => go({ k: "plancomptable" })} onFraudePostes={() => go({ k: "fraudepostes" })} onReferencement={() => go({ k: "referencement" })} onAnnexes={() => go({ k: "annexes" })} onAmortissements={() => go({ k: "amortissements" })} onNestle={() => go({ k: "nestle" })} onMetier={() => go({ k: "metier" })} onTests={() => go({ k: "tests" })} onSection={(k) => go(k === "annuaire" ? { k: "annuaire" } : k === "nas" ? { k: "nas" } : { k: "section", key: k })} />}
        {view.k === "nestle" && <NestleApp onBack={() => go({ k: "home" })} />}
        {view.k === "metier" && <AuditMetier onBack={() => go({ k: "home" })} />}
        {view.k === "tests" && <AuditTests onBack={() => go({ k: "home" })} />}
        {view.k === "revision" && <AuditRevision data={data} onBack={() => go({ k: "home" })} />}
        {view.k === "plancomptable" && <AuditPlanComptable data={(typeof window !== "undefined" && window.__PLAN_COMPTABLE__) || { plans: [] }} onBack={() => go({ k: "home" })} />}
        {view.k === "fraudepostes" && <AuditFraudePostes data={(typeof window !== "undefined" && window.__FRAUDE_POSTES__) || { sections: [] }} onBack={() => go({ k: "home" })} />}
        {view.k === "referencement" && <AuditReferencement data={(typeof window !== "undefined" && window.__REFERENCEMENT__) || {}} onBack={() => go({ k: "home" })} />}
        {view.k === "annexes" && <AuditAnnexes data={(typeof window !== "undefined" && window.__ANNEXES__) || {}} onBack={() => go({ k: "home" })} />}
        {view.k === "amortissements" && <AuditAmortissements data={(typeof window !== "undefined" && window.__AMORTISSEMENTS__) || {}} onBack={() => go({ k: "home" })} />}
        {view.k === "book" && <AuditBook book={book} onBack={() => go({ k: "home" })} />}
        {view.k === "seuils" && <AuditSeuils onBack={() => go({ k: "home" })} />}
        {view.k === "annuaire" && (
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <button onClick={() => go({ k: "home" })} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"><ArrowLeft size={15} /> Accueil Audit</button>
              <button onClick={() => go({ k: "revision" })} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700">📋 Méga-fiche de révision</button>
            </div>
            <AuditAnnuaire annuaire={data.annuaire} cours={cours} onOpen={(st) => go({ k: "course", std: st, from: "annuaire" })} />
          </div>
        )}
        {view.k === "nas" && <AuditNas nas={{ ...(data.nas || {}), __key: "nas" }} cours={cours} annuaire={data.annuaire} onOpenCourse={(st) => go({ k: "course", std: st, from: "nas" })} onBack={() => go({ k: "home" })} />}
        {view.k === "course" && <AuditCourse std={view.std} course={cours[view.std.num] || {}} onBack={() => go({ k: view.from || "annuaire" })} />}
        {view.k === "section" && <AuditSection skey={view.key} section={{ ...(data[view.key] || {}), __key: view.key }} onBack={() => go({ k: "home" })} />}
      </main>
      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-400">Outil pédagogique — NAS suisses alignées sur les ISA.</footer>
    </div>
  );
}
