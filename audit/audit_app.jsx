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
      h += mdToHtml(c.tldr || "");
      const mn = c.mnemo || {};
      if (mn.code && (mn.items || []).length) {
        const bits = mn.items.map((it) => "<strong>" + escHtml(it.l || "") + "</strong> " + escHtml(it.t || "")).join(" · ");
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
function AuditHome({ data, book, onSection, onBook, onSeuils, onRevision }) {
  const keys = AUDIT_ORDER.filter((k) => data[k]);
  Object.keys(data).forEach((k) => { if (k[0] !== "_" && k !== "annuaire_cours" && AUDIT_ORDER.indexOf(k) < 0) keys.push(k); });
  const hasBook = book && (book.controle_ordinaire || book.controle_restreint);
  const bookChapters = hasBook ? ["controle_ordinaire", "controle_restreint"].reduce((a, vk) => a + (((book[vk] || {}).parties || []).reduce((b, p) => b + (p.fiches || []).filter(f => f.fiche).length, 0)), 0) : 0;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white p-5 shadow">
        <h2 className="text-xl font-bold">Module Audit — NAS / ISA</h2>
        <p className="text-sm text-violet-100 mt-1">Les 47 normes ISA en cours complets, le cadre légal suisse, les cycles, les QCM et tous les outils du réviseur.</p>
      </div>
      <button onClick={onRevision} className="w-full text-left rounded-2xl border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-4">
        <span className="text-4xl">📋</span>
        <span className="flex-1"><span className="block font-bold text-base text-violet-800">Révision — la méga-fiche des 47 normes ISA</span><span className="block text-sm text-slate-600 mt-0.5">Toutes les normes condensées en une seule fiche : l'essentiel, repères, synthèse, pièges d'examen, mnémo. Navigable et téléchargeable en PDF.</span><span className="block text-xs text-violet-500 mt-1 font-medium">47 normes · 1 document · révision express</span></span>
        <ArrowRight size={20} className="text-violet-400 shrink-0" />
      </button>
      {hasBook && (
        <button onClick={onBook} className="w-full text-left rounded-2xl border-2 border-violet-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-4">
          <span className="text-4xl">📚</span>
          <span className="flex-1"><span className="block font-bold text-base text-violet-800">Base de cours — Manuel suisse d'audit</span><span className="block text-sm text-slate-600 mt-0.5">Le cours complet chapitre par chapitre : MSA (contrôle ordinaire) + NCR (contrôle restreint).</span><span className="block text-xs text-violet-500 mt-1 font-medium">{bookChapters} chapitres · format livre</span></span>
          <ArrowRight size={20} className="text-violet-400 shrink-0" />
        </button>
      )}
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
        {view.k === "home" && <AuditHome data={data} book={book} onBook={() => go({ k: "book" })} onSeuils={() => go({ k: "seuils" })} onRevision={() => go({ k: "revision" })} onSection={(k) => go(k === "annuaire" ? { k: "annuaire" } : k === "nas" ? { k: "nas" } : { k: "section", key: k })} />}
        {view.k === "revision" && <AuditRevision data={data} onBack={() => go({ k: "home" })} />}
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
