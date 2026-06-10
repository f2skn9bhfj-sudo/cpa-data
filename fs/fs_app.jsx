/* ============================================================
   États financiers — explorateur IFRS interactif (thème clair).
   Port du fs_explorer.js natif : parité champ par champ.
   Données inlinées : window.__FS__ = { statements, notes }.
   ============================================================ */

/* Navigation croisée vers un onglet de l'app parente (même origine) */
function fsNavParent(tab) {
  try {
    const p = window.parent;
    if (p && p !== window && typeof p.navigate === "function") { p.navigate(tab); return true; }
  } catch (e) {}
  return false;
}
function fsRefLabel(r) {
  const m = String(r).match(/^([a-z]+)\s*(\d+[a-z]?)$/i);
  return m ? (m[1].toUpperCase() + " " + m[2].toUpperCase()) : String(r).toUpperCase();
}
function fsIsNeg(a) { const s = String(a == null ? "" : a); return s.includes("(") || s.trim().startsWith("-"); }
function fsIsSubtotal(item) { return item.is_subtotal === true || /^total/i.test(item.label || ""); }

/* ── Briques locales ── */
function FsCard({ label, tint = "white", children }) {
  const tints = {
    white: "bg-white border-slate-200",
    teal: "bg-teal-50/60 border-teal-100",
    amber: "bg-amber-50/60 border-amber-100",
    violet: "bg-violet-50/60 border-violet-100",
  };
  return (
    <div className={`rounded-xl border p-4 mb-3 ${tints[tint] || tints.white}`}>
      {label && <div className="text-xs font-bold text-slate-700 mb-2">{label}</div>}
      {children}
    </div>
  );
}
function FsCollapse({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-white mb-3 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-slate-50">
        <span className="text-xs font-bold text-slate-700 flex-1">{title}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-0.5">{children}</div>}
    </div>
  );
}

/* ── Arbre : un état financier (sections → lignes) ── */
function FsTree({ stmt, selectedId, onSelect }) {
  if (!stmt) return <div className="text-sm text-slate-400 p-6 text-center">Aucun état sélectionné.</div>;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 to-transparent">
        <div className="font-bold text-sm text-slate-800">{stmt.icon || "📄"} {stmt.title}</div>
        <div className="text-[10px] text-slate-400 mt-0.5">Groupe Helvetia Industries SA · en milliers de CHF</div>
      </div>
      <div className="grid grid-cols-[1fr,5.2rem,5.2rem] gap-2 px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50/60">
        <span></span><span className="text-right">2025</span><span className="text-right">2024</span>
      </div>
      {(stmt.sections || []).map((sec, si) => (
        <div key={sec.id || si}>
          <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-teal-600 uppercase tracking-widest">{sec.title}</div>
          {(sec.items || []).map((item) => {
            const sel = selectedId === item.id;
            const sub = fsIsSubtotal(item);
            return (
              <button key={item.id} onClick={() => onSelect(sec, item)}
                className={`w-full grid grid-cols-[1fr,5.2rem,5.2rem] gap-2 px-4 py-2 text-left items-baseline transition-colors
                  ${sel ? "bg-teal-50" : "hover:bg-slate-50"} ${sub ? "border-t border-slate-200 bg-slate-50/50" : ""}`}>
                <span className={`text-[13px] leading-snug ${sub ? "font-bold text-slate-800" : sel ? "font-semibold text-teal-800" : "text-slate-700"}`}>{item.label}</span>
                <span className={`text-[12.5px] text-right tabular-nums ${fsIsNeg(item.amount_2025) ? "text-rose-600" : sub ? "font-bold text-slate-800" : "text-slate-600"}`}>{item.amount_2025 || "–"}</span>
                <span className={`text-[12.5px] text-right tabular-nums ${fsIsNeg(item.amount_2024) ? "text-rose-500" : sub ? "font-semibold text-slate-500" : "text-slate-400"}`}>{item.amount_2024 || "–"}</span>
              </button>
            );
          })}
        </div>
      ))}
      <div className="h-2"></div>
    </div>
  );
}

/* ── Liste des notes annexes ── */
function FsNotesList({ notes, selectedId, onSelect }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 to-transparent">
        <div className="font-bold text-sm text-slate-800">📝 Notes aux états financiers</div>
        <div className="text-[10px] text-slate-400 mt-0.5">{notes.length} notes annexes</div>
      </div>
      {notes.map((n) => (
        <button key={n.id} onClick={() => onSelect(n)}
          className={`w-full flex items-start gap-3 px-4 py-2.5 text-left border-b border-slate-50 last:border-0 transition-colors ${selectedId === n.id ? "bg-teal-50" : "hover:bg-slate-50"}`}>
          <span className="text-[10px] font-bold text-white bg-teal-600 rounded-md px-1.5 py-0.5 mt-0.5 shrink-0 tabular-nums">N{n.number}</span>
          <span className={`text-[13px] leading-snug ${selectedId === n.id ? "font-semibold text-teal-800" : "text-slate-700"}`}>{n.title}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Détail d'un poste ── */
function KeyPointLine({ text }) {
  const warn = text.startsWith("⚠️");
  const tip = text.startsWith("💡");
  const cls = warn ? "bg-amber-50 border border-amber-100 text-amber-900" : tip ? "bg-violet-50 border border-violet-100 text-violet-900" : "bg-slate-50 text-slate-700";
  return <li className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${cls}`}><MdInline text={text} /></li>;
}
function FsItemDetail({ item, onJumpNote }) {
  const comp = item.comparison || {};
  const hasComp = comp.ifrs || comp.rpc || comp.co;
  return (
    <div>
      <div className="rounded-2xl border border-teal-200 bg-white p-5 mb-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-bold text-slate-800 leading-tight">{item.label}</h2>
          {item.note_ref && <button onClick={() => onJumpNote(item.note_ref)} title="Voir la note annexe"
            className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-full hover:bg-teal-100 shrink-0">{item.note_ref} →</button>}
        </div>
        <div className="flex gap-2.5 mt-3">
          {[["2025", item.amount_2025], ["2024", item.amount_2024]].map(([y, a]) => (
            <div key={y} className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2 min-w-[7rem]">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{y}</div>
              <div className={`text-lg font-bold tabular-nums ${fsIsNeg(a) ? "text-rose-600" : "text-slate-800"}`}>{a || "–"}</div>
            </div>
          ))}
        </div>
        {(item.norms || []).length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">
          {item.norms.map((n, i) => <span key={i} className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded">{n}</span>)}
        </div>}
      </div>

      {item.definition && <FsCard label="📖 Définition" tint="teal"><div className="text-sm text-slate-700 leading-relaxed"><MdBlock text={item.definition} /></div></FsCard>}
      {item.accounting_method && <FsCard label="📐 Méthode comptable IFRS"><div className="text-sm text-slate-700 leading-relaxed"><MdBlock text={item.accounting_method} /></div></FsCard>}

      {(item.key_points || []).length > 0 && (
        <FsCard label="🔑 Points clés">
          <ul className="space-y-1.5">{item.key_points.map((p, i) => <KeyPointLine key={i} text={p} />)}</ul>
        </FsCard>
      )}

      {hasComp && (
        <FsCard label="⚖️ Comparaison IFRS / RPC / CO">
          <div className="grid sm:grid-cols-3 gap-2">
            {[["IFRS", comp.ifrs, "bg-emerald-50 text-emerald-700 border-emerald-100"],
              ["Swiss GAAP RPC", comp.rpc, "bg-blue-50 text-blue-700 border-blue-100"],
              ["CO", comp.co, "bg-amber-50 text-amber-700 border-amber-100"]].map(([h, body, cls]) => (
              <div key={h} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className={`px-3 py-1.5 text-[11px] font-bold border-b ${cls}`}>{h}</div>
                <div className="px-3 py-2.5 text-[13px] text-slate-600 leading-relaxed">{body ? <MdBlock text={body} /> : <span className="text-slate-300">–</span>}</div>
              </div>
            ))}
          </div>
        </FsCard>
      )}

      {(item.exam_tips || []).length > 0 && (
        <FsCard label="🎯 Astuces d'examen" tint="amber">
          <div className="space-y-1.5">{item.exam_tips.map((t, i) => (
            <div key={i} className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${t.startsWith("⚠️") ? "bg-white border border-amber-200 text-amber-900" : "bg-white/70 text-slate-700"}`}><MdInline text={t} /></div>
          ))}</div>
        </FsCard>
      )}

      {item.note_content && (
        <FsCollapse title={`📋 Résumé de la note ${item.note_ref ? "(" + item.note_ref + ")" : ""}`}>
          <div className="text-sm text-slate-700 leading-relaxed"><MdBlock text={item.note_content} /></div>
          {item.note_ref && <button onClick={() => onJumpNote(item.note_ref)} className="mt-2 text-xs font-semibold text-teal-700 hover:underline">Ouvrir la note complète →</button>}
        </FsCollapse>
      )}

      {(item.cross_refs || []).length > 0 && (
        <FsCard label="📚 Références croisées">
          <div className="flex flex-wrap gap-1.5">
            {item.cross_refs.map((r, i) => (
              <button key={i} onClick={() => fsNavParent("references")} title="Voir dans l'onglet Références"
                className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg hover:border-teal-300 hover:text-teal-700">{fsRefLabel(r)} ↗</button>
            ))}
          </div>
        </FsCard>
      )}
    </div>
  );
}

/* ── Détail d'une note annexe ── */
function FsNoteDetail({ note }) {
  const subs = note.subsections || [];
  return (
    <div>
      <div className="rounded-2xl border border-teal-200 bg-white p-5 mb-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-white bg-teal-600 rounded-lg px-2 py-1 tabular-nums shrink-0">Note {note.number}</span>
          <h2 className="text-lg font-bold text-slate-800 leading-tight">{note.title}</h2>
        </div>
      </div>
      {note.content && <FsCard><div className="text-sm text-slate-700 leading-relaxed"><MdBlock text={note.content} /></div></FsCard>}
      {subs.map((sub, i) => (
        <FsCard key={i} label={sub.title || null}>
          <div className="text-sm text-slate-700 leading-relaxed"><MdBlock text={sub.content || ""} /></div>
        </FsCard>
      ))}
      {!note.content && !subs.length && <FsCard><div className="text-sm text-slate-400">Contenu de la note non disponible.</div></FsCard>}
    </div>
  );
}

/* ── Recherche globale (postes + notes) ── */
function FsSearch({ data, onPick }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  let hits = [];
  if (query.length >= 2) {
    (data.statements || []).forEach((st) => (st.sections || []).forEach((sec) => (sec.items || []).forEach((it) => {
      const hay = (it.label + " " + (it.definition || "") + " " + (it.norms || []).join(" ")).toLowerCase();
      if (hay.includes(query)) hits.push({ kind: "item", st, sec, it });
    })));
    (data.notes || []).forEach((n) => {
      const hay = ("note " + n.number + " " + n.title + " " + (n.content || "")).toLowerCase();
      if (hay.includes(query)) hits.push({ kind: "note", n });
    });
  }
  return (
    <div className="mb-4">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un poste ou une note (goodwill, leasing, impôts différés…)"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none bg-white" />
      </div>
      {query.length >= 2 && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {hits.length === 0 && <div className="px-4 py-3 text-sm text-slate-400">Aucun résultat.</div>}
          {hits.slice(0, 12).map((h, i) => (
            <button key={i} onClick={() => { onPick(h); setQ(""); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-teal-50/60 border-b border-slate-50 last:border-0">
              <span className="shrink-0 text-sm">{h.kind === "item" ? (h.st.icon || "📄") : "📝"}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-800 truncate">{h.kind === "item" ? h.it.label : `Note ${h.n.number} — ${h.n.title}`}</span>
                <span className="block text-[11px] text-slate-400 truncate">{h.kind === "item" ? h.st.title : "Notes annexes"}</span>
              </span>
              <ArrowRight size={14} className="text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── App ── */
function FsApp() {
  const data = (typeof window !== "undefined" && window.__FS__) || { statements: [], notes: [] };
  const statements = data.statements || [];
  const notes = data.notes || [];
  const [stmtId, setStmtId] = useState(statements.length ? statements[0].id : null);
  const [showNotes, setShowNotes] = useState(false);
  const [item, setItem] = useState(null);
  const [note, setNote] = useState(null);
  const [narrow, setNarrow] = useState(() => { try { return window.matchMedia("(max-width: 1023px)").matches; } catch (e) { return false; } });
  const [pane, setPane] = useState("tree");
  useEffect(() => {
    try {
      const mq = window.matchMedia("(max-width: 1023px)");
      const fn = (e) => setNarrow(e.matches);
      mq.addEventListener ? mq.addEventListener("change", fn) : mq.addListener(fn);
      return () => { mq.removeEventListener ? mq.removeEventListener("change", fn) : mq.removeListener(fn); };
    } catch (e) {}
  }, []);
  const stmt = statements.find((s) => s.id === stmtId);

  const jumpToNote = (ref) => {
    const m = String(ref || "").match(/(\d+)/);
    if (!m) return;
    const n = notes.find((x) => x.number === parseInt(m[1], 10));
    if (n) { setShowNotes(true); setNote(n); setItem(null); setPane("detail"); try { window.scrollTo(0, 0); } catch (e) {} }
  };
  const pickSearch = (h) => {
    if (h.kind === "item") { setShowNotes(false); setStmtId(h.st.id); setItem(h.it); setNote(null); }
    else { setShowNotes(true); setNote(h.n); setItem(null); }
    setPane("detail"); try { window.scrollTo(0, 0); } catch (e) {}
  };

  const detail = showNotes && note ? <FsNoteDetail note={note} />
    : item ? <FsItemDetail item={item} onJumpNote={jumpToNote} />
    : (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-10 text-center">
        <div className="text-4xl opacity-30 mb-2">📊</div>
        <div className="text-sm text-slate-500">Sélectionne un poste dans les états financiers</div>
        <div className="text-xs text-slate-400 mt-1">Chaque ligne ouvre le détail IFRS : définition, méthode, comparaison RPC/CO, astuces d'examen.</div>
      </div>
    );

  const tree = (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {statements.map((s) => (
          <button key={s.id} onClick={() => { setStmtId(s.id); setShowNotes(false); setNote(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${!showNotes && stmtId === s.id ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"}`}
            title={s.title}>{s.icon} {s.short || s.title.replace(/^(État consolidé|Tableau consolidé) (de la|du|des)?\s*/i, "").replace(/^./, (c) => c.toUpperCase())}</button>
        ))}
        <button onClick={() => { setShowNotes(true); setItem(null); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${showNotes ? "bg-teal-600 text-white border-teal-600" : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"}`}>📝 Notes ({notes.length})</button>
      </div>
      {showNotes
        ? <FsNotesList notes={notes} selectedId={note && note.id} onSelect={(n) => { setNote(n); setItem(null); setPane("detail"); try { window.scrollTo(0, 0); } catch (e) {} }} />
        : <FsTree stmt={stmt} selectedId={item && item.id} onSelect={(sec, it) => { setItem(it); setNote(null); setPane("detail"); try { window.scrollTo(0, 0); } catch (e) {} }} />}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-gradient-to-r from-slate-900 to-teal-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Calculator size={22} className="text-teal-300" />
          <div>
            <h1 className="text-lg font-bold">États financiers — explorateur IFRS</h1>
            <p className="text-xs text-teal-200">Bilan · Résultat · OCI · Flux de trésorerie · {notes.length} notes annexes · comparaisons RPC / CO</p>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <FsSearch data={data} onPick={pickSearch} />
        {narrow ? (
          pane === "detail" && (item || (showNotes && note)) ? (
            <div>
              <button onClick={() => setPane("tree")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 mb-3"><ArrowLeft size={15} /> {showNotes ? "Toutes les notes" : "Retour à l'état"}</button>
              {detail}
            </div>
          ) : tree
        ) : (
          <div className="grid grid-cols-12 gap-5 items-start">
            <div className="col-span-5">{tree}</div>
            <div className="col-span-7">{detail}</div>
          </div>
        )}
      </main>
      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-400">Outil pédagogique — états financiers consolidés fictifs (IFRS), montants en milliers de CHF.</footer>
    </div>
  );
}
