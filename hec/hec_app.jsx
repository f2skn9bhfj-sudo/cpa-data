/* ============================================================
   HEC — Cours certifiants : app React (même template que Conso /
   Audit / Anglais / Références). Visualiseur de cours HEC :
   grille de cours → cours avec onglets (Sommaire + fiches),
   fiches JSON rendues en DA soignée (header, mnémo, sections +
   callouts colorés, auto-test, sources), liens du sommaire vers
   les fiches/ancres, export PDF.
   Données inlinées par build_hec.py dans window.__HEC__ :
     { manifest, files: { "<rel_path>": "<contenu brut>" } }
   ============================================================ */

const HEC = (typeof window !== "undefined" && window.__HEC__) || { manifest: {}, files: {} };
const HEC_FILES = HEC.files || {};
const HEC_MAN = HEC.manifest || {};
const HEC_ACCENT = "#8B1A2E";   // bordeaux HEC

/* ── helpers ── */
function hEsc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function hInline(s) {
  let h = hEsc(s);
  h = h.replace(/`([^`]+)`/g, "<code>$1</code>");
  h = h.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  h = h.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  return h;
}
/* moteur markdown : titres, tableaux pipe, blocs de code, listes, citations, hr, liens.
   onLink(url) déclenché pour les liens (sommaire → fiche#ancre). */
function hMarkdown(md, onLinkAttr) {
  const lines = String(md || "").split("\n");
  let html = "", i = 0;
  const linkify = (s) => s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    (m, txt, url) => '<a href="#" ' + (onLinkAttr || "data-hec-link") + '="' + hEsc(url) + '">' + hInline(txt) + "</a>");
  const inl = (s) => linkify(hInline(s));
  while (i < lines.length) {
    const ln = lines[i], t = ln.trim();
    // bloc de code ```
    if (/^```/.test(t)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
      i++;
      html += '<pre class="hec-pre"><code>' + hEsc(buf.join("\n")) + "</code></pre>";
      continue;
    }
    // tableau pipe
    if (/^\s*\|.*\|\s*$/.test(ln)) {
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i]); i++; }
      const parse = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = parse(rows[0]);
      const body = rows.slice(1).filter((r) => !/^\s*\|[\s:|-]+\|\s*$/.test(r)).map(parse);
      html += '<div class="hec-table-wrap"><table class="hec-table"><thead><tr>'
        + head.map((c) => "<th>" + inl(c) + "</th>").join("") + "</tr></thead><tbody>"
        + body.map((r) => "<tr>" + r.map((c) => "<td>" + inl(c).replace(/<br>/g, "<br>") + "</td>").join("") + "</tr>").join("")
        + "</tbody></table></div>";
      continue;
    }
    const hd = t.match(/^(#{1,4})\s+(.+)$/);
    if (hd) { const lvl = Math.min(hd[1].length + 1, 5); html += "<h" + lvl + ' class="hec-h' + hd[1].length + '">' + inl(hd[2]) + "</h" + lvl + ">"; i++; continue; }
    if (/^>\s?/.test(t)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) { buf.push(lines[i].trim().replace(/^>\s?/, "")); i++; }
      const q = buf.join("\n");
      let cls = "hec-quote"; if (/⚠️|🔴/.test(q)) cls += " warn"; else if (/📅/.test(q)) cls += " evol";
      html += '<blockquote class="' + cls + '">' + inl(q).replace(/\n/g, "<br>") + "</blockquote>";
      continue;
    }
    if (/^\s*[-*]\s+/.test(ln)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const ind = lines[i].match(/^\s*/)[0].length;
        items.push('<li class="' + (ind >= 2 ? "hec-sub" : "") + '">' + inl(lines[i].replace(/^\s*[-*]\s+/, "")) + "</li>");
        i++;
      }
      html += '<ul class="hec-ul">' + items.join("") + "</ul>";
      continue;
    }
    if (/^---+\s*$/.test(t)) { html += '<hr class="hec-hr">'; i++; continue; }
    if (t === "") { i++; continue; }
    html += '<p class="hec-p">' + inl(ln) + "</p>";
    i++;
  }
  return html;
}

/* ── callouts (7 types, ordre & DA identiques aux fiches Audit) ── */
const HEC_CALLOUTS = [
  ["key_point", "🎯", "Point clé", "key"],
  ["info", "💡", "Pour info", "info"],
  ["tip", "🧠", "Astuce mémo", "tip"],
  ["example", "🟢", "Exemple concret", "example"],
  ["comparison", "📊", "Comparaison", "comp"],
  ["legal_quote", "⚖️", "Cadre / définition", "legal"],
  ["warning", "⚠️", "Attention", "warn"],
];
function Callout({ variant, icon, label, html }) {
  return (
    <aside className={"hec-callout hec-callout--" + variant}>
      <div className="hec-callout-head"><span>{icon}</span><span className="hec-callout-label">{label}</span></div>
      <div className="hec-callout-body fiche-html" dangerouslySetInnerHTML={{ __html: html }} />
    </aside>
  );
}

/* ── rendu d'une fiche JSON ── */
function FicheView({ fiche, onLinkAttr }) {
  const f = fiche || {};
  const md = (s) => hMarkdown(s || "", onLinkAttr);
  return (
    <div>
      {/* en-tête */}
      <div className="rounded-2xl border p-5 mb-4" style={{ borderColor: HEC_ACCENT + "55", background: HEC_ACCENT + "0e" }}>
        <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: HEC_ACCENT }}>{f.category || "HEC"}</div>
        <h2 className="text-xl font-bold text-slate-800 leading-tight">{f.title || f.code || "Fiche"}</h2>
        <div className="text-[12px] text-slate-500 mt-2 leading-relaxed space-y-0.5">
          {f.ref_msa && <div>📖 {f.ref_msa}</div>}
          {f.bases_legales && <div dangerouslySetInnerHTML={{ __html: "⚖️ " + hInline(f.bases_legales) }} />}
          {(f.normes || f.niveau) && <div>{f.normes ? "📐 " + f.normes : ""}{f.normes && f.niveau ? " · " : ""}{f.niveau ? "🎓 " + f.niveau : ""}</div>}
        </div>
      </div>

      {f.summary && <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3 fiche-html text-[14px] text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: md(f.summary) }} />}
      {f.mnemonics && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 mb-3 fiche-html text-[13.5px] text-amber-900 leading-relaxed">
          <span className="font-bold">💡 Mnémo — </span>
          <span dangerouslySetInnerHTML={{ __html: hInline(f.mnemonics) }} />
        </div>
      )}

      {(f.sections || []).map((sec, si) => (
        <div key={si} id={sec.anchor ? "hec-" + sec.anchor : undefined} className="bg-white rounded-xl border border-slate-200 p-4 mb-3 scroll-mt-20">
          {sec.title && <h3 className="text-[16px] font-bold text-slate-800 mb-2" style={{ color: HEC_ACCENT }}>{sec.title}</h3>}
          {sec.content && <div className="fiche-html text-[13.5px] text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: md(sec.content) }} />}
          {HEC_CALLOUTS.map(([key, icon, label, variant]) => sec[key]
            ? <Callout key={key} variant={variant} icon={icon} label={label} html={md(sec[key])} /> : null)}
        </div>
      ))}

      {Array.isArray(f.auto_test) && f.auto_test.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
          <h3 className="text-[15px] font-bold text-slate-800 mb-2">🧪 Auto-test ({f.auto_test.length})</h3>
          <ol className="list-decimal pl-5 space-y-1.5 text-[13.5px] text-slate-700">
            {f.auto_test.map((qa, i) => <li key={i} dangerouslySetInnerHTML={{ __html: hInline(qa.q) }} />)}
          </ol>
          <details className="mt-3 group">
            <summary className="cursor-pointer text-[13px] font-semibold text-slate-600 hover:text-slate-900 select-none">Voir les réponses</summary>
            <div className="mt-2 space-y-2">
              {f.auto_test.map((qa, i) => (
                <div key={i} className="text-[13px] text-slate-700 bg-slate-50 rounded-lg px-3 py-2 fiche-html">
                  <strong>{i + 1}.</strong> <span dangerouslySetInnerHTML={{ __html: hInline(qa.a) }} />
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {Array.isArray(f.sources) && f.sources.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3">
          <h3 className="text-[15px] font-bold text-slate-800 mb-2">🔗 Sources</h3>
          <ul className="list-disc pl-5 space-y-1 text-[13px] text-slate-600">
            {f.sources.map((s, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: hEsc(s).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" class="text-rose-700 underline">$1</a>') }} />
            ))}
          </ul>
        </div>
      )}

      {f.statut && <div className="text-[12px] text-slate-400 italic px-1">{f.statut}{f.maj ? " · maj " + f.maj : ""}</div>}
    </div>
  );
}

/* ── bridge pywebview (export PDF desktop) ── */
function hPywebApi() {
  const g = (w) => { try { return (w && w.pywebview && w.pywebview.api) || null; } catch (e) { return null; } };
  return g(window) || g(window.parent) || g(window.top) || null;
}
function hToast(msg) {
  let el = document.getElementById("hec-toast");
  if (!el) { el = document.createElement("div"); el.id = "hec-toast"; document.body.appendChild(el); }
  el.textContent = msg;
  el.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;background:#5A1020;color:#fff;padding:10px 18px;border-radius:10px;font:600 13px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.25);opacity:1;transition:opacity .4s";
  clearTimeout(hToast._t); hToast._t = setTimeout(() => { el.style.opacity = "0"; }, 3000);
}
function ficheInnerHtml(f) {
  let h = '<h1 style="color:#8B1A2E;border-bottom:3px solid #8B1A2E;padding-bottom:6px">' + hEsc(f.title || f.code || "Fiche") + "</h1>";
  if (f.category) h += '<p style="color:#8B1A2E;font-weight:600;font-size:12px">' + hEsc(f.category) + "</p>";
  if (f.summary) h += hMarkdown(f.summary);
  if (f.mnemonics) h += '<p><strong>💡 Mnémo —</strong> ' + hInline(f.mnemonics) + "</p>";
  (f.sections || []).forEach((s) => {
    if (s.title) h += "<h2>" + hEsc(s.title) + "</h2>";
    if (s.content) h += hMarkdown(s.content);
    HEC_CALLOUTS.forEach(([key, icon, label]) => { if (s[key]) h += '<div class="callout"><strong>' + label + " :</strong> " + hMarkdown(s[key]) + "</div>"; });
  });
  if (Array.isArray(f.auto_test) && f.auto_test.length) {
    h += "<h2>🧪 Auto-test</h2>";
    f.auto_test.forEach((qa, i) => { h += "<p><strong>" + (i + 1) + ". " + hInline(qa.q) + "</strong><br>" + hInline(qa.a) + "</p>"; });
  }
  return h;
}
function printFiche(f) {
  const w = window.open("", "_blank");
  if (!w) { try { alert("Autorise les pop-ups pour imprimer/enregistrer en PDF."); } catch (e) {} return; }
  w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + hEsc(f.title || "Fiche HEC") + "</title><style>"
    + "body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:820px;margin:24px auto;padding:0 20px;color:#1e293b;line-height:1.55}"
    + "h1{font-size:22px}h2{font-size:15px;background:#fdf2f4;border:1px solid #f3c6cf;border-radius:6px;padding:6px 10px;margin:18px 0 6px;color:#8B1A2E}"
    + "table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12.5px}th,td{border:1px solid #cbd5e1;padding:5px 8px;text-align:left;vertical-align:top}th{background:#f1f5f9}"
    + "pre{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;overflow-x:auto;font-size:12px}"
    + ".callout{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;margin:8px 0}code{background:#f1f5f9;padding:1px 4px;border-radius:3px}"
    + "@media print{body{margin:0}}</style></head><body>" + ficheInnerHtml(f) + "</body></html>");
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 500);
}
function downloadFichePdf(path, fiche, btnSet) {
  const api = hPywebApi();
  const fallback = () => printFiche(fiche);
  if (api && path && typeof api.export_hec_fiche_pdf === "function") {
    btnSet("⏳ PDF…");
    try {
      Promise.resolve(api.export_hec_fiche_pdf(path)).then((res) => {
        if (res && res.ok) { btnSet("✅ PDF"); hToast("PDF enregistré : " + (res.filename || "Téléchargements")); setTimeout(() => btnSet("📄 PDF"), 1800); }
        else if (res && res.cancelled) btnSet("📄 PDF");
        else { btnSet("📄 PDF"); fallback(); }
      }).catch(() => { btnSet("📄 PDF"); fallback(); });
    } catch (e) { btnSet("📄 PDF"); fallback(); }
  } else { fallback(); }
}

/* ── résolution chemin relatif (sommaire → fiche) ── */
function resolveRel(base, rel) {
  let anchor = "";
  const hi = rel.indexOf("#");
  if (hi >= 0) { anchor = rel.slice(hi + 1); rel = rel.slice(0, hi); }
  if (!rel) return { path: base, anchor };
  const baseDir = base.includes("/") ? base.slice(0, base.lastIndexOf("/")) : "";
  const parts = baseDir ? baseDir.split("/") : [];
  rel.split("/").forEach((seg) => { if (seg === "..") parts.pop(); else if (seg !== "." && seg !== "") parts.push(seg); });
  return { path: parts.join("/"), anchor };
}
function getFile(path) {
  if (!path) return null;
  if (path in HEC_FILES) return HEC_FILES[path];
  // tolérance : essaie sans/ avec préfixe
  const k = Object.keys(HEC_FILES).find((x) => x === path || x.endsWith("/" + path));
  return k ? HEC_FILES[k] : null;
}

/* ── Vue d'un cours : onglets Sommaire + fiches ── */
function CourseView({ cours, onBack }) {
  const accent = cours.couleur || HEC_ACCENT;
  const sommairePath = cours.sommaire || (cours.id + "/_sommaire.md");
  const fiches = cours.fiches || [];
  // onglet actif : 'sommaire' ou index de fiche
  const [active, setActive] = useState("sommaire");
  const pendingAnchorRef = useRef(null);
  const [pdfLabel, setPdfLabel] = useState("📄 PDF");

  const activeFiche = typeof active === "number" ? fiches[active] : null;
  const activePath = active === "sommaire" ? sommairePath : (activeFiche ? activeFiche.fichier : null);

  // Au changement d'onglet : si une ancre est en attente, on y saute (avec
  // quelques essais le temps que la fiche se monte) ; sinon on remonte en haut.
  function scrollToAnchor(anchor, tries) {
    const el = document.getElementById("hec-" + anchor);
    if (el) { try { el.scrollIntoView({ block: "start" }); } catch (e) {} }
    else if ((tries || 0) < 6) setTimeout(() => scrollToAnchor(anchor, (tries || 0) + 1), 80);
  }
  useEffect(() => {
    const anchor = pendingAnchorRef.current;
    pendingAnchorRef.current = null;
    if (anchor) { const t = setTimeout(() => scrollToAnchor(anchor, 0), 40); return () => clearTimeout(t); }
    try { window.scrollTo(0, 0); } catch (e) {}
  }, [active]);

  // suit un lien du sommaire/fiche → fiche cible (+ ancre)
  const follow = (url) => {
    const { path, anchor } = resolveRel(activePath || sommairePath, url);
    const idx = fiches.findIndex((fi) => fi.fichier === path || fi.fichier.endsWith("/" + path) || (fi.fichier.split("/").pop() === path.split("/").pop()));
    if (idx >= 0) {
      pendingAnchorRef.current = anchor || null;
      if (idx === active) { if (anchor) scrollToAnchor(anchor, 0); }   // fiche déjà ouverte
      else setActive(idx);
    } else if (anchor) {
      scrollToAnchor(anchor, 0);
    }
  };
  const onMainClick = (e) => {
    const a = e.target.closest && e.target.closest("a[data-hec-link]");
    if (!a) return;
    e.preventDefault();
    follow(a.getAttribute("data-hec-link"));
  };

  // contenu actif
  let body = null;
  const raw = getFile(activePath);
  if (raw == null) {
    body = <div className="text-rose-600 text-sm p-6">Fichier introuvable : <code>{activePath}</code></div>;
  } else if (/\.json$/.test(activePath || "")) {
    let f = null; try { f = JSON.parse(raw); } catch (e) {}
    body = f ? <FicheView fiche={f} onLinkAttr="data-hec-link" /> : <div className="fiche-html" dangerouslySetInnerHTML={{ __html: hMarkdown(raw) }} />;
  } else {
    body = <div className="bg-white rounded-xl border border-slate-200 p-5 fiche-html" dangerouslySetInnerHTML={{ __html: hMarkdown(raw) }} />;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-rose-700"><ArrowLeft size={15} /> Tous les cours HEC</button>
        <span className="text-xs text-slate-400">·</span>
        <span className="text-sm font-semibold text-slate-700">{cours.titre || cours.code}</span>
      </div>

      {/* onglets fiches */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 sticky top-0 bg-slate-100/95 backdrop-blur z-10 -mx-1 px-1">
        <button onClick={() => setActive("sommaire")}
          className={"flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap border transition-colors " +
            (active === "sommaire" ? "text-white" : "bg-white text-slate-600 border-slate-200 hover:border-rose-300")}
          style={active === "sommaire" ? { background: accent, borderColor: accent } : {}}>🗺️ Sommaire</button>
        {fiches.map((fi, i) => (
          <button key={fi.id || i} onClick={() => setActive(i)}
            className={"px-3 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap border transition-colors " +
              (active === i ? "text-white" : "bg-white text-slate-600 border-slate-200 hover:border-rose-300")}
            style={active === i ? { background: accent, borderColor: accent } : {}}>
            {fi.titre ? fi.titre.split("—")[0].trim() : ("Fiche " + (i + 1))}
          </button>
        ))}
        {activeFiche && (
          <button onClick={() => downloadFichePdf(activePath, JSON.parse(raw || "{}"), setPdfLabel)}
            className="ml-auto px-3 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap border border-rose-200 text-rose-700 hover:bg-rose-50">{pdfLabel}</button>
        )}
      </div>

      <main onClick={onMainClick}>{body}</main>
    </div>
  );
}

/* ── App : grille de cours ↔ cours ── */
function HecApp() {
  const cours = HEC_MAN.cours || [];
  const [openId, setOpenId] = useState(cours.length === 1 ? cours[0].id : null);
  const open = cours.find((c) => c.id === openId);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="text-white" style={{ background: "linear-gradient(90deg,#1e293b," + HEC_ACCENT + ")" }}>
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-3 flex-wrap">
          <GraduationCap size={26} className="text-rose-200" />
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-lg font-bold">{HEC_MAN.titre || "HEC — Cours certifiants"}</h1>
            <p className="text-xs text-rose-100/90">{HEC_MAN.description || "Fiches de synthèse des cours HEC."}</p>
          </div>
          <span className="bg-white/10 rounded-lg px-3 py-1.5 text-xs font-medium">{cours.length} cours · {cours.reduce((a, c) => a + (c.fiches || []).length, 0)} fiches</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {open ? (
          <CourseView cours={open} onBack={cours.length === 1 ? null : (() => setOpenId(null))} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {cours.map((c) => {
              const accent = c.couleur || HEC_ACCENT;
              const n = (c.fiches || []).length;
              return (
                <button key={c.id} onClick={() => setOpenId(c.id)}
                  className="text-left rounded-2xl border bg-white p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                  style={{ borderColor: accent + "44" }}>
                  <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>{c.ecole || "HEC"} · {c.code || ""}</div>
                  <div className="text-[17px] font-bold text-slate-800 leading-snug mb-2">{c.titre || c.code}</div>
                  <div className="text-[13px] text-slate-500 leading-relaxed mb-3">{c.description || ""}</div>
                  <div className="text-[12px] font-semibold" style={{ color: accent }}>📚 {n} fiche{n > 1 ? "s" : ""} →</div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
        Cours certifiants suivis en parallèle de la préparation Swiss CPA — même mise en forme que les fiches Audit.
      </footer>
    </div>
  );
}
