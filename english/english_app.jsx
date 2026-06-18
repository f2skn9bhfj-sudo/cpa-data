/* ============================================================
   Anglais — app React (même template que Conso / Audit / Podcasts).
   Port complet de l'ancien static/js/english.js (9 sous-sections +
   barre audio TTS) — parité champ par champ et fonctionnalité par
   fonctionnalité, données inlinées par build_english.py dans
   window.__ENGLISH__.

   Persistance : MÊMES clés localStorage que l'ancien onglet
   (swisscpa_eng_*) → la progression existante est conservée.
   Bridge pywebview (depuis l'iframe) : record_english_attempt,
   check_english_text — fallback gracieux hors desktop.
   ============================================================ */

const E_DATA = (typeof window !== "undefined" && window.__ENGLISH__) || { vocab: [], phrases: [] };

/* ── Clés localStorage (identiques à l'ancien english.js) ── */
const LS_SUBTAB = "swisscpa_eng_subtab";
const LS_PROGRESS = "swisscpa_eng_progress";
const LS_FILTERS = "swisscpa_eng_filters";
const LS_AUDIO = "swisscpa_eng_audio";
const LS_VIDEOS = "swisscpa_eng_videos_watched";
const LS_ESSENTIALS = "swisscpa_eng_essentials_done";
const LS_DELETED = "swisscpa_eng_deleted_cards";

function lsGet(key, dflt) { try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) || dflt) : dflt; } catch (e) { return dflt; } }
function lsSet(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {} }

/* ── Constantes (port fidèle) ── */
const DOMAIN_LABELS = {
  audit: { icon: "📊", label: "Audit / ISA", color: "#3b82f6" },
  ifrs: { icon: "📘", label: "IFRS", color: "#0ea5e9" },
  business: { icon: "💼", label: "Big 4 / Business", color: "#8b5cf6" },
  daily: { icon: "🌍", label: "Vie courante", color: "#10b981" },
};
const PHRASE_CATEGORIES = {
  email_opening: { icon: "✉️", label: "Ouverture email" }, email_closing: { icon: "📩", label: "Clôture email" },
  meeting: { icon: "🗓️", label: "Réunion" }, idiom: { icon: "💬", label: "Idiomes" },
  transition: { icon: "🔗", label: "Transitions" }, politeness: { icon: "🙏", label: "Politesse" },
  client_request: { icon: "📋", label: "Demande client" }, escalation: { icon: "🚨", label: "Escalade" },
  pushback: { icon: "🛡️", label: "Push-back poli" }, clarification: { icon: "❓", label: "Clarification" },
  audit_specific: { icon: "🔍", label: "Audit terrain" }, status_update: { icon: "📊", label: "Point avancement" },
};
const PATTERN_CATEGORIES = {
  audit_findings: { icon: "🔍", label: "Constatations audit" }, audit_questions: { icon: "❓", label: "Questions client" },
  email_pro: { icon: "✉️", label: "Email pro" }, meeting: { icon: "🗓️", label: "Réunion" },
  ifrs_explanations: { icon: "📘", label: "Explications IFRS" }, client_communication: { icon: "💬", label: "Communication client" },
  decline: { icon: "🛑", label: "Décliner" }, negotiate: { icon: "⚖️", label: "Négocier" },
  defend_position: { icon: "🛡️", label: "Défendre position" }, request_delay: { icon: "⏳", label: "Demander délai" },
  express_caution: { icon: "⚠️", label: "Exprimer prudence" }, acknowledge_constraint: { icon: "🤝", label: "Reconnaître contraintes" },
};
const VIDEO_THEMES = {
  channels: { icon: "📺", label: "Chaînes officielles" }, ifrs_standards: { icon: "📘", label: "Normes IFRS" },
  audit: { icon: "🔍", label: "Audit / ISA" }, business_english: { icon: "💼", label: "Business English" },
};
const ESSENTIAL_GROUPS = {
  survival: { icon: "🆘", label: "Survie semaine 1", color: "#ef4444" },
  meetings: { icon: "🗓️", label: "Réunions", color: "#3b82f6" },
  email: { icon: "✉️", label: "Email pro", color: "#8b5cf6" },
  fieldwork: { icon: "🔍", label: "Audit terrain", color: "#10b981" },
  self: { icon: "🧭", label: "Self-management", color: "#f59e0b" },
};
const LEVEL_LABELS = {
  A2: { label: "A2", color: "#10b981" }, B1: { label: "B1", color: "#f59e0b" }, B2: { label: "B2", color: "#ef4444" },
};
const MASTERY = {
  not_started: { cls: "bg-slate-100 text-slate-500", label: "Non vu" },
  again: { cls: "bg-red-100 text-red-700", label: "Again" },
  learning: { cls: "bg-amber-100 text-amber-700", label: "Learning" },
  good: { cls: "bg-emerald-100 text-emerald-700", label: "Good" },
  mastered: { cls: "bg-indigo-100 text-indigo-700", label: "Mastered" },
};
const SPEAKER_STYLES = {
  client: { color: "#1d4ed8", bg: "#dbeafe", icon: "👤" },
  manager: { color: "#7c3aed", bg: "#ede9fe", icon: "🧑‍💼" },
  partner: { color: "#b91c1c", bg: "#fee2e2", icon: "🎩" },
  colleague: { color: "#047857", bg: "#d1fae5", icon: "👥" },
  you: { color: "#b45309", bg: "#fef3c7", icon: "🗣️" },
};

/* ── Bridge pywebview (iframe → parent), comme l'app Audit ── */
function pywebApi() {
  const tryGet = (w) => { try { return (w && w.pywebview && w.pywebview.api) || null; } catch (e) { return null; } };
  return tryGet(window) || tryGet(window.parent) || tryGet(window.top) || null;
}
function bridgeCall(method) {
  const args = Array.prototype.slice.call(arguments, 1);
  const api = pywebApi();
  if (api && typeof api[method] === "function") {
    try { return Promise.resolve(api[method].apply(api, args)); } catch (e) { return Promise.reject(e); }
  }
  return Promise.reject(new Error("no-bridge"));
}

/* ── TTS (Web Speech API) ──────────────────────────────────────────
   Les voix « Desktop » historiques de Windows sont robotiques. WebView2/Edge
   expose aussi les voix NEURONALES « Online (Natural) » (Aria, Libby, Sonia,
   Ryan…) — bien plus réalistes. On les classe par qualité et on prend la
   meilleure par défaut, tout en laissant l'utilisateur choisir une voix précise. */
let _voicesCache = null;
function englishVoices() {
  if (!("speechSynthesis" in window)) return [];
  if (_voicesCache) return _voicesCache;
  const voices = window.speechSynthesis.getVoices() || [];
  _voicesCache = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
  return _voicesCache;
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => { _voicesCache = null; };
}
/* marqueurs de voix « haut de gamme » dans les noms exposés par l'OS/navigateur */
const GOOD_VOICE = /natural|neural|online|multilingual|google|aria|jenny|libby|sonia|ryan|guy|emma|ava|andrew|brian|michelle|natasha|clara|maisie|thomas|abbi|hollie|oliver|olivia|wavenet|premium|enhanced|siri|eloquence/i;
const BAD_VOICE = /desktop|david|zira|mark|hazel|eva\b|server/i;   // anciennes voix SAPI robotiques
function rankVoice(v, region) {
  const lang = (v.lang || "").toLowerCase();
  let s = 0;
  if (region && lang === region.toLowerCase()) s += 4;            // bonne région exacte
  else if (lang.slice(0, 2) === (region || "en").slice(0, 2)) s += 2;
  if (GOOD_VOICE.test(v.name || "")) s += 6;                       // voix neuronale
  if (!v.localService) s += 3;                                     // online ≈ neuronale
  if (BAD_VOICE.test(v.name || "")) s -= 5;                        // vieille voix Desktop
  return s;
}
function bestVoice(region) {
  const vs = englishVoices();
  if (!vs.length) return null;
  return vs.map((v) => [rankVoice(v, region), v]).sort((a, b) => b[0] - a[0])[0][1];
}
function pickVoice(cfg) {
  cfg = cfg || {};
  const vs = englishVoices();
  if (cfg.voiceName) { const m = vs.find((v) => v.name === cfg.voiceName); if (m) return m; }
  return bestVoice(cfg.voice || "en-GB");
}
/* ── Voix neuronales edge-tts (Microsoft, gratuit) via le pont Python ── */
const EDGE_VOICES = [
  { id: "en-GB-SoniaNeural", label: "🇬🇧 Sonia · UK (F)" },
  { id: "en-GB-RyanNeural", label: "🇬🇧 Ryan · UK (M)" },
  { id: "en-GB-LibbyNeural", label: "🇬🇧 Libby · UK (F)" },
  { id: "en-GB-ThomasNeural", label: "🇬🇧 Thomas · UK (M)" },
  { id: "en-US-AriaNeural", label: "🇺🇸 Aria · US (F)" },
  { id: "en-US-JennyNeural", label: "🇺🇸 Jenny · US (F)" },
  { id: "en-US-GuyNeural", label: "🇺🇸 Guy · US (M)" },
  { id: "en-US-AndrewMultilingualNeural", label: "🇺🇸 Andrew · US (M)" },
  { id: "en-US-EmmaMultilingualNeural", label: "🇺🇸 Emma · US (F)" },
];
function ttsBridge() {
  const api = pywebApi();
  return (api && typeof api.tts_speak === "function") ? api : null;
}
const _edgeCache = {};       // "voice|rate|text" -> data URI
let _edgeAudio = null;       // élément <audio> partagé
let _edgeBusy = false;
async function edgeSpeak(text) {
  const api = ttsBridge();
  if (!api) throw new Error("no-bridge");
  const voice = _audioCfg.edgeVoice || "en-GB-SoniaNeural";
  const rate = _audioCfg.rate || 1.0;
  const key = voice + "|" + rate + "|" + text;
  try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch (e) {}
  if (_edgeAudio) { try { _edgeAudio.pause(); } catch (e) {} }
  let src = _edgeCache[key];
  if (!src) {
    _edgeBusy = true;
    let res;
    try { res = await Promise.resolve(api.tts_speak(text, voice, rate)); }
    finally { _edgeBusy = false; }
    if (!res || !res.ok || !res.audio) throw new Error((res && res.error) || "tts-failed");
    src = "data:" + (res.mime || "audio/mpeg") + ";base64," + res.audio;
    _edgeCache[key] = src;
  }
  if (!_edgeAudio) _edgeAudio = new Audio();
  _edgeAudio.src = src;
  _edgeAudio.playbackRate = 1.0;   // la vitesse est déjà appliquée à la synthèse
  await _edgeAudio.play();
}

let _audioCfg = { voice: "en-GB", voiceName: "", rate: 0.95, engine: "edge", edgeVoice: "en-GB-SoniaNeural" };
function webSpeak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(_audioCfg);
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = _audioCfg.voice || "en-GB"; }
    u.rate = _audioCfg.rate || 0.95;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}
function speak(text) {
  if (!text || typeof text !== "string") return;
  if (_audioCfg.engine === "edge" && ttsBridge()) {
    edgeSpeak(text).catch(() => webSpeak(text));   // repli voix navigateur si réseau/erreur
  } else {
    webSpeak(text);
  }
}
function SpeakBtn({ text, title, sm }) {
  return (
    <button title={title || "Écouter (TTS)"} onClick={(e) => { e.stopPropagation(); speak(text); }}
      className={"shrink-0 rounded-md border border-slate-200 text-indigo-500 hover:bg-indigo-50 hover:border-indigo-300 transition-colors " + (sm ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-sm")}>🔊</button>
  );
}

const eNorm = (s) => String(s || "").toLowerCase().replace(/[.,;:!?'"„""''«»()]/g, " ").replace(/\s+/g, " ").trim();
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* ── Petits composants ── */
function Pill({ active, color, onClick, children }) {
  return (
    <button onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
      style={active ? { background: color, borderColor: color, color: "#fff" } : { borderColor: color, color: color, background: "transparent" }}>
      {children}
    </button>
  );
}
function LevelBadge({ level }) {
  const l = LEVEL_LABELS[level];
  if (!l) return level ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-300 text-slate-500">{level}</span> : null;
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ color: l.color, borderColor: l.color }}>{l.label}</span>;
}
function ProgressBar({ pct, color }) {
  return <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden flex-1"><div className="h-full rounded-full transition-all" style={{ width: pct + "%", background: color || "#4f46e5" }} /></div>;
}

/* ════════ Barre audio — sélecteur de voix (priorité aux voix neuronales) ════════ */
function voiceFlag(lang) {
  const l = (lang || "").toLowerCase();
  if (l.startsWith("en-gb")) return "🇬🇧"; if (l.startsWith("en-us")) return "🇺🇸";
  if (l.startsWith("en-au")) return "🇦🇺"; if (l.startsWith("en-ie")) return "🇮🇪";
  if (l.startsWith("en-in")) return "🇮🇳"; if (l.startsWith("en-ca")) return "🇨🇦";
  if (l.startsWith("en-za")) return "🇿🇦"; return "🌐";
}
function voiceShortName(v) {
  // « Microsoft Aria Online (Natural) - English (United States) » → « Aria (Natural) »
  let n = (v.name || "").replace(/^Microsoft\s+/i, "").replace(/\s*-\s*English.*/i, "")
    .replace(/\bOnline\b/i, "").replace(/\s{2,}/g, " ").trim();
  return n || v.name;
}
function AudioBar({ audio, setAudio }) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [, force] = useState(0);
  useEffect(() => {
    if (!supported) return;
    const h = () => { _voicesCache = null; force((x) => x + 1); };
    try { window.speechSynthesis.addEventListener("voiceschanged", h); } catch (e) {}
    const t1 = setTimeout(h, 400), t2 = setTimeout(h, 1500);   // certaines voix arrivent tard
    return () => { try { window.speechSynthesis.removeEventListener("voiceschanged", h); } catch (e) {} clearTimeout(t1); clearTimeout(t2); };
  }, []);
  if (!supported) return <div className="text-xs text-slate-400 italic mb-4">🔇 Synthèse vocale non disponible dans ce navigateur.</div>;

  const voices = englishVoices().slice().sort((a, b) => rankVoice(b, audio.voice) - rankVoice(a, audio.voice));
  const auto = bestVoice(audio.voice);
  const hasNeural = voices.some((v) => GOOD_VOICE.test(v.name) || !v.localService);
  const hasEdge = !!ttsBridge();
  const engine = hasEdge ? (audio.engine || "edge") : "system";

  const rBtn = (val, label) => (
    <button onClick={() => setAudio({ ...audio, rate: val })}
      className={"text-[11px] px-2.5 py-1 rounded-full border transition-colors " + (Math.abs((audio.rate || 0.95) - val) < 0.01 ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 text-slate-500 hover:text-slate-700")}>{label}</button>
  );
  const engBtn = (val, label) => (
    <button onClick={() => setAudio({ ...audio, engine: val })}
      className={"text-[11px] px-2.5 py-1 rounded-lg border font-semibold transition-colors " + (engine === val ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 text-slate-500 hover:text-slate-700")}>{label}</button>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 mb-4">
      <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-slate-500">
        <span className="font-medium text-slate-600">🔊 Voix</span>
        {hasEdge && (
          <span className="flex gap-1">{engBtn("edge", "✨ Neuronale")}{engBtn("system", "Système")}</span>
        )}
        {engine === "edge" ? (
          <select value={audio.edgeVoice || "en-GB-SoniaNeural"}
            onChange={(e) => setAudio({ ...audio, edgeVoice: e.target.value })}
            className="text-[12px] border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 max-w-[280px] focus:border-indigo-500 outline-none">
            {EDGE_VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        ) : (
          <select value={audio.voiceName || "__auto__"}
            onChange={(e) => setAudio({ ...audio, voiceName: e.target.value === "__auto__" ? "" : e.target.value })}
            className="text-[12px] border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 max-w-[280px] focus:border-indigo-500 outline-none">
            <option value="__auto__">⭐ Auto — meilleure voix{auto ? " (" + voiceShortName(auto) + ")" : ""}</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {voiceFlag(v.lang)} {voiceShortName(v)}{GOOD_VOICE.test(v.name) || !v.localService ? " ✨" : ""}
              </option>
            ))}
          </select>
        )}
        <span className="ml-1.5">Vitesse</span>
        <span className="flex gap-1.5">{rBtn(0.75, "0.75×")}{rBtn(0.95, "1×")}{rBtn(1.15, "1.15×")}</span>
        <button onClick={() => speak("Hello, this is a preview of the selected voice.")}
          className="text-[11px] px-2.5 py-1 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50">▶ Tester</button>
        <label className="inline-flex items-center gap-1.5 ml-auto cursor-pointer">
          <input type="checkbox" checked={!!audio.autoplay} onChange={() => setAudio({ ...audio, autoplay: !audio.autoplay })} />
          <span>Auto-play au retournement</span>
        </label>
      </div>
      {engine === "edge" && (
        <div className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5 mt-2 leading-snug">
          ✨ Voix neuronales Microsoft (edge-tts, gratuit) — qualité supérieure, nécessite une connexion internet ; sinon repli automatique sur la voix du navigateur.
        </div>
      )}
      {engine === "system" && !hasNeural && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2 leading-snug">
          💡 Seules des voix « Desktop » basiques sont installées. {hasEdge ? "Choisis plutôt « ✨ Neuronale » ci-dessus." : "Pour des voix plus naturelles : Windows → Paramètres → Heure et langue → Voix → ajoute une voix anglaise « Natural »."}
        </div>
      )}
    </div>
  );
}

/* ════════ Sélecteur de voix COMPACT — pour barres sticky (Liste express) ════════
   Pilote exactement le même état audio partagé (audio / setAudio → _audioCfg),
   pour que le choix reste cohérent et persistant entre les onglets. */
function VoiceMini({ audio, setAudio }) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [, force] = useState(0);
  useEffect(() => {
    if (!supported) return;
    const h = () => { _voicesCache = null; force((x) => x + 1); };
    try { window.speechSynthesis.addEventListener("voiceschanged", h); } catch (e) {}
    const t1 = setTimeout(h, 400), t2 = setTimeout(h, 1500);   // certaines voix arrivent tard
    return () => { try { window.speechSynthesis.removeEventListener("voiceschanged", h); } catch (e) {} clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line
  }, []);
  if (!supported) return <span className="text-[11px] text-slate-400 italic">🔇 Synthèse vocale indisponible</span>;
  const hasEdge = !!ttsBridge();
  const engine = hasEdge ? (audio.engine || "edge") : "system";
  const voices = englishVoices().slice().sort((a, b) => rankVoice(b, audio.voice) - rankVoice(a, audio.voice));
  const auto = bestVoice(audio.voice);
  const hasNeural = voices.some((v) => GOOD_VOICE.test(v.name) || !v.localService);
  const selCls = "text-[12px] border border-slate-300 rounded-lg px-2 py-1 bg-white text-slate-700 max-w-[210px] focus:border-indigo-500 outline-none";
  const rBtn = (val, label) => (
    <button key={label} onClick={() => setAudio({ ...audio, rate: val })}
      className={"text-[11px] px-2 py-1 rounded-full border transition-colors " + (Math.abs((audio.rate || 0.95) - val) < 0.01 ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 text-slate-500 hover:text-slate-700")}>{label}</button>
  );
  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500">
        <span className="font-semibold text-slate-600">🔊 Voix</span>
        {hasEdge && (
          <span className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
            {[["edge", "✨ Neuronale"], ["system", "Système"]].map(([v, l]) => (
              <button key={v} onClick={() => setAudio({ ...audio, engine: v })}
                className={"px-2 py-1 font-semibold transition-colors " + (engine === v ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:text-slate-700")}>{l}</button>
            ))}
          </span>
        )}
        {engine === "edge" ? (
          <select value={audio.edgeVoice || "en-GB-SoniaNeural"} onChange={(e) => setAudio({ ...audio, edgeVoice: e.target.value })} className={selCls}>
            {EDGE_VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        ) : (
          <select value={audio.voiceName || "__auto__"} onChange={(e) => setAudio({ ...audio, voiceName: e.target.value === "__auto__" ? "" : e.target.value })} className={selCls}>
            <option value="__auto__">⭐ Auto{auto ? " (" + voiceShortName(auto) + ")" : ""}</option>
            {voices.map((v) => <option key={v.name} value={v.name}>{voiceFlag(v.lang)} {voiceShortName(v)}{GOOD_VOICE.test(v.name) || !v.localService ? " ✨" : ""}</option>)}
          </select>
        )}
        <span className="flex gap-1">{rBtn(0.75, "0.75×")}{rBtn(0.95, "1×")}{rBtn(1.15, "1.15×")}</span>
        <button onClick={() => speak("Hello, this is the selected voice.")}
          className="text-[11px] px-2 py-1 rounded-full border border-indigo-200 text-indigo-600 hover:bg-indigo-50">▶ Tester</button>
        <label className="inline-flex items-center gap-1.5 ml-auto cursor-pointer">
          <input type="checkbox" checked={!!audio.autoplay} onChange={() => setAudio({ ...audio, autoplay: !audio.autoplay })} />
          <span>Auto-play</span>
        </label>
      </div>
      {engine === "system" && !hasNeural && (
        <div className="text-[10.5px] text-amber-700 mt-1 leading-snug">
          💡 {hasEdge ? "Choisis « ✨ Neuronale » pour des voix plus naturelles." : "Voix « Desktop » basiques uniquement. Pour des voix naturelles dans le navigateur, l'app desktop propose les voix neuronales."}
        </div>
      )}
    </div>
  );
}

/* ════════ VOCAB (+ mode « phrases en flashcards ») ════════ */
function VocabSection({ progress, onRate, filters, setFilters, deleted, onDelete, onRestoreAll, audio, phraseSession, onExitPhraseSession }) {
  const isPhraseMode = !!phraseSession;
  const [seed, setSeed] = useState(0);            // change → re-mélange
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [flash, setFlash] = useState(null);       // 'ok' | 'ko' — flash visuel au rating

  const isOverdue = (id) => { const p = progress[id]; return !!(p && p.next_review && new Date(p.next_review).getTime() <= Date.now()); };
  const neverSeen = (id) => { const p = progress[id]; return !p || !p.review_count; };

  const pool = useMemo(() => {
    if (isPhraseMode) return shuffle(phraseSession.pool.filter((c) => !deleted[c.id]));
    let p = (E_DATA.vocab || []).filter((c) => !deleted[c.id]);
    if (filters.domain) p = p.filter((c) => c.domain === filters.domain);
    if (filters.level) p = p.filter((c) => c.level === filters.level);
    if (filters.neverSeen) p = p.filter((c) => neverSeen(c.id));
    if (filters.overdue) p = p.filter((c) => isOverdue(c.id));
    return shuffle(p);
    // eslint-disable-next-line
  }, [filters, seed, isPhraseMode, phraseSession, Object.keys(deleted).length]);

  useEffect(() => { setIdx(0); setFlipped(false); }, [filters, seed, isPhraseMode]);

  const card = pool[idx];

  const flip = () => {
    setFlipped((f) => {
      const nf = !f;
      if (nf && audio.autoplay && card) setTimeout(() => speak(card.en), 250);
      return nf;
    });
  };
  const rate = (rating) => {
    if (!card || !flipped) return;
    onRate(card.id, rating);
    setFlash(rating > 0 ? "ok" : "ko");
    setTimeout(() => setFlash(null), 350);
    setTimeout(() => { setIdx((i) => i + 1); setFlipped(false); }, 180);
  };
  const prev = () => { if (idx > 0) { setIdx(idx - 1); setFlipped(false); } };
  const skip = () => { setIdx(idx + 1); setFlipped(false); };

  /* Raccourcis clavier (port : espace, ←/→, 1-4 après flip) */
  useEffect(() => {
    const h = (e) => {
      const t = document.activeElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === " " || e.code === "Space") { e.preventDefault(); flip(); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); skip(); return; }
      if (flipped) {
        if (e.key === "1") { e.preventDefault(); rate(0); }
        else if (e.key === "2") { e.preventDefault(); rate(1); }
        else if (e.key === "3") { e.preventDefault(); rate(2); }
        else if (e.key === "4") { e.preventDefault(); rate(3); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  /* Filtres (cachés en mode phrases-flashcards, comme avant) */
  const deletedCount = Object.keys(deleted).length;
  const filtersBar = isPhraseMode ? (
    <div className="flex items-center gap-2.5 mb-4">
      <button onClick={onExitPhraseSession} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">← Retour aux phrases</button>
      <span className="text-[13px] text-slate-500">Mode flashcards ({pool.length} phrases{phraseSession.label ? " · " + phraseSession.label : ""})</span>
    </div>
  ) : (
    <div className="flex gap-2 items-center flex-wrap mb-4">
      <span className="flex gap-1.5 flex-wrap">
        {Object.entries(DOMAIN_LABELS).map(([k, d]) => (
          <Pill key={k} active={filters.domain === k} color={d.color}
            onClick={() => setFilters({ ...filters, domain: filters.domain === k ? null : k })}>{d.icon} {d.label}</Pill>
        ))}
      </span>
      <span className="flex gap-1.5 items-center">
        <span className="text-[11px] text-slate-400">Niveau :</span>
        {Object.entries(LEVEL_LABELS).map(([k, l]) => (
          <Pill key={k} active={filters.level === k} color={l.color}
            onClick={() => setFilters({ ...filters, level: filters.level === k ? null : k })}>{l.label}</Pill>
        ))}
      </span>
      <label className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border cursor-pointer " + (filters.neverSeen ? "border-indigo-400 bg-indigo-50 text-indigo-600" : "border-slate-300 text-slate-500")}>
        <input type="checkbox" checked={!!filters.neverSeen} onChange={(e) => setFilters({ ...filters, neverSeen: e.target.checked })} /> 🆕 Jamais vu
      </label>
      <label className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border cursor-pointer " + (filters.overdue ? "border-amber-400 bg-amber-50 text-amber-600" : "border-slate-300 text-slate-500")}>
        <input type="checkbox" checked={!!filters.overdue} onChange={(e) => setFilters({ ...filters, overdue: e.target.checked })} /> 🔴 En retard
      </label>
      {(filters.domain || filters.level || filters.neverSeen || filters.overdue) && (
        <button onClick={() => setFilters({ domain: null, level: null, neverSeen: false, overdue: false })}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 text-red-500 hover:bg-red-50">↺ Réinit.</button>
      )}
      {deletedCount > 0 && (
        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] bg-red-50 border border-red-200 text-red-500">
          🗑️ {deletedCount} supprimée{deletedCount > 1 ? "s" : ""}
          <button onClick={onRestoreAll} className="underline">Restaurer</button>
        </span>
      )}
    </div>
  );

  /* Pool vide / fin de pool */
  if (!pool.length) {
    return (
      <div>{filtersBar}
        <div className="max-w-md mx-auto mt-10 bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="text-4xl mb-2.5">📭</div>
          <div className="text-lg font-semibold text-slate-800 mb-1.5">Aucune carte dans cette sélection</div>
          <div className="text-[13px] text-slate-500 mb-4">Ajuste les filtres ou clique sur Réinitialiser.</div>
          {!isPhraseMode && <button onClick={() => setFilters({ domain: null, level: null, neverSeen: false, overdue: false })}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50">↺ Réinit. filtres</button>}
        </div>
      </div>
    );
  }
  if (idx >= pool.length) {
    return (
      <div>{filtersBar}
        <div className="max-w-md mx-auto mt-10 bg-white rounded-xl border border-slate-200 p-8 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <div className="text-xl font-bold text-slate-800 mb-1.5">Toutes les cartes vues !</div>
          <div className="text-sm text-slate-500 mb-5">{pool.length} cartes parcourues dans cette sélection.</div>
          <div className="flex gap-2 justify-center">
            <button onClick={() => { setSeed(seed + 1); }} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">Recommencer</button>
            {!isPhraseMode && <button onClick={() => setFilters({ domain: null, level: null, neverSeen: false, overdue: false })}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50">Changer de sélection</button>}
          </div>
        </div>
      </div>
    );
  }

  const domain = isPhraseMode ? null : DOMAIN_LABELS[card.domain];
  const phraseCat = isPhraseMode ? (PHRASE_CATEGORIES[card.category] || { icon: "💬", label: card.category }) : null;
  const m = MASTERY[(progress[card.id] || {}).mastery || "not_started"] || MASTERY.not_started;
  const pct = ((idx + 1) / pool.length) * 100;

  const badges = (
    <span className="flex gap-1.5 flex-wrap items-center">
      {isPhraseMode
        ? <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200">{phraseCat.icon} {phraseCat.label}</span>
        : (domain && <span className="text-[11px] font-medium px-2 py-0.5 rounded-md text-white" style={{ background: domain.color }}>{domain.icon} {domain.label}</span>)}
      <LevelBadge level={card.level} />
    </span>
  );

  const rateBtn = (r, cls, title, sub, key) => (
    <button title={"Raccourci : " + key} onClick={(e) => { e.stopPropagation(); rate(r); }}
      className={"min-w-[105px] px-4 py-2.5 rounded-xl text-[13px] font-semibold leading-tight transition-transform hover:scale-[1.03] " + cls}>
      {title}<br /><span className="text-[10px] opacity-75 font-normal">{sub}</span>
    </button>
  );

  return (
    <div>
      {filtersBar}
      {/* progression */}
      <div className="flex items-center gap-3 mb-3.5 max-w-2xl mx-auto">
        <span className="text-[13px] text-slate-500 font-semibold whitespace-nowrap">{idx + 1} / {pool.length}</span>
        <ProgressBar pct={pct} />
        <span className={"text-[11px] font-semibold px-2 py-0.5 rounded-md " + m.cls}>{m.label}</span>
      </div>

      {/* carte (flip 3D) */}
      <div className={"eflip-wrap" + (flash === "ok" ? " eflash-ok" : flash === "ko" ? " eflash-ko" : "")} onClick={flip}>
        <div className={"eflip" + (flipped ? " flipped" : "")}>
          <div className="eface">
            <div className="w-full flex justify-between items-center mb-3.5">{badges}</div>
            <div className="text-[27px] font-bold text-slate-800 leading-snug mb-3">{card.fr}</div>
            <div className="text-xs text-slate-400 mt-3">Cliquer ou Espace pour retourner</div>
          </div>
          <div className="eface back">
            <div className="w-full flex justify-between items-center mb-3.5 gap-2">
              {badges}
              <span className="flex gap-1.5">
                <SpeakBtn text={card.en} title="Écouter en anglais" />
                <button title="Supprimer cette carte (réversible)"
                  onClick={(e) => { e.stopPropagation(); onDelete(card.id); setFlipped(false); }}
                  className="px-2 py-1 text-sm rounded-md border border-red-200 text-red-400 hover:bg-red-50">🗑️</button>
              </span>
            </div>
            <div className="text-[23px] font-semibold text-indigo-600 leading-snug mb-2">{card.en}</div>
            {card.ipa && <div className="text-sm text-slate-400 font-mono mb-2.5">/{card.ipa}/</div>}
            {card.notes && <div className="text-[13px] text-slate-500 italic my-1.5 max-w-md">💡 {card.notes}</div>}
            {card.context && <div className="text-[13px] text-slate-500 italic my-1.5 max-w-md">{card.context}</div>}
            {(card.examples || []).length > 0 && (
              <div className="text-left max-w-lg w-full mt-2.5">
                {card.examples.map((ex, i) => (
                  <div key={i} className="mb-2 px-2.5 py-2 rounded-md bg-indigo-50/50 border-l-2 border-indigo-400">
                    <div className="text-[13px] text-slate-600">{ex.fr}</div>
                    <div className="flex items-start gap-2 mt-1">
                      <div className="text-[13px] text-indigo-600 italic flex-1">{ex.en}</div>
                      <SpeakBtn text={ex.en} title="Écouter la phrase en contexte" sm />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* boutons de rating (après flip) */}
      {flipped && (
        <div className="max-w-2xl mx-auto mt-4 flex justify-center gap-2 flex-wrap">
          {rateBtn(0, "bg-red-100 text-red-700 hover:bg-red-200", "✗ Again", "oublié", "1")}
          {rateBtn(1, "bg-amber-100 text-amber-700 hover:bg-amber-200", "~ Hard", "difficile", "2")}
          {rateBtn(2, "bg-emerald-100 text-emerald-700 hover:bg-emerald-200", "✓ Good", "normal", "3")}
          {rateBtn(3, "bg-indigo-100 text-indigo-700 hover:bg-indigo-200", "⚡ Easy", "trivial", "4")}
        </div>
      )}

      {/* navigation */}
      <div className="flex justify-center gap-2 mt-3">
        <button onClick={prev} disabled={idx === 0}
          className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none">← Précédent</button>
        <button onClick={skip} className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50">Passer →</button>
      </div>
    </div>
  );
}

/* ════════ PHRASES ════════ */
function PhrasesSection({ filters, setFilters, deleted, onStartFlashcards }) {
  const phrases = E_DATA.phrases || [];
  const [expanded, setExpanded] = useState(null);
  const counts = {};
  phrases.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
  const q = (filters.search || "").trim().toLowerCase();
  let filtered = phrases.filter((p) => !deleted[p.id]);
  if (filters.category) filtered = filtered.filter((p) => p.category === filters.category);
  if (q) filtered = filtered.filter((p) =>
    (p.fr && p.fr.toLowerCase().includes(q)) || (p.en && p.en.toLowerCase().includes(q)) || (p.context && p.context.toLowerCase().includes(q)));
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex gap-2 items-center flex-wrap mb-3.5">
        <button onClick={() => onStartFlashcards(filtered, filters.category ? (PHRASE_CATEGORIES[filters.category] || {}).label || filters.category : null)}
          className="text-xs px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-medium">🃏 Réviser comme flashcards</button>
        <input value={filters.search || ""} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Rechercher..."
          className="ml-auto w-56 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:border-indigo-500 outline-none" />
      </div>
      <div className="flex gap-1.5 flex-wrap mb-3.5">
        {Object.keys(counts).map((k) => {
          const meta = PHRASE_CATEGORIES[k] || { icon: "•", label: k };
          return <Pill key={k} active={filters.category === k} color="#3b82f6"
            onClick={() => setFilters({ ...filters, category: filters.category === k ? null : k })}>{meta.icon} {meta.label} ({counts[k]})</Pill>;
        })}
        {(filters.category || q) && (
          <button onClick={() => setFilters({ category: null, search: "" })}
            className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 text-red-500 hover:bg-red-50">↺ Réinit.</button>
        )}
      </div>
      {!filtered.length && <div className="text-center py-8 text-slate-400 text-sm">Aucune phrase ne correspond à ces filtres.</div>}
      {filtered.map((p) => {
        const meta = PHRASE_CATEGORIES[p.category] || { icon: "•", label: p.category };
        const open = expanded === p.id;
        return (
          <div key={p.id} onClick={() => setExpanded(open ? null : p.id)}
            className={"bg-white rounded-xl border px-4 py-3 mb-2 cursor-pointer transition-colors " + (open ? "border-indigo-400 bg-gradient-to-b from-white to-indigo-50/40" : "border-slate-200 hover:border-indigo-300")}>
            <div className="flex justify-between items-center gap-2.5">
              <div className="font-semibold text-[15px] text-slate-800">{p.fr}</div>
              <div className="flex gap-1.5 shrink-0 items-center">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200">{meta.icon} {meta.label}</span>
                <LevelBadge level={p.level} />
              </div>
            </div>
            {open && (
              <div>
                <div className="flex justify-between items-start gap-2.5 mt-2">
                  <div className="text-sm text-indigo-600 italic flex-1">{p.en}</div>
                  <SpeakBtn text={p.en} title="Écouter en anglais" sm />
                </div>
                {p.context && <div className="text-xs text-slate-400 mt-1.5">📖 {p.context}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ════════ ÉCRITURE (correction via bridge : règles locales + Groq + LanguageTool) ════════ */
function analyseText(t) {
  t = String(t || "");
  if (!t.trim()) return null;
  const words = t.trim().split(/\s+/);
  const wordCount = words.length;
  const sentences = t.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);
  const avg = wordCount / sentenceCount;
  const lower = t.toLowerCase();
  const informalMarkers = [/\bgonna\b/, /\bwanna\b/, /\bgotta\b/, /\bhey\b/, /\byeah\b/, /\bkinda\b/, /\bsorta\b/, /\bdunno\b/, /\bya\b(?!\w)/];
  const contractions = (lower.match(/\b\w+'(t|s|re|ve|ll|d|m)\b/g) || []).length;
  const informalCount = informalMarkers.filter((rx) => rx.test(lower)).length;
  const formalMarkers = [/\bdear\s+(mr|mrs|ms|sir|madam)\b/, /\byours\s+(sincerely|faithfully)\b/, /\bplease\s+find\s+attached\b/, /\bkind\s+regards\b/, /\bbest\s+regards\b/, /\bi\s+would\s+be\s+grateful\b/, /\bi\s+would\s+appreciate\b/, /\bfurther\s+to\b/, /\bin\s+accordance\s+with\b/];
  const formalCount = formalMarkers.filter((rx) => rx.test(lower)).length;
  let register;
  if (formalCount >= 2 && contractions === 0 && informalCount === 0) register = { label: "Formel", color: "#3b82f6", note: "Ton soutenu — idéal pour un client ou un partner." };
  else if (informalCount >= 1 || contractions >= 2) register = { label: "Informel", color: "#f59e0b", note: "Ton détendu — OK pour un collègue ou un email interne décontracté. Évite avec un client formel." };
  else if (formalCount >= 1) register = { label: "Mi-formel", color: "#10b981", note: "Registre professionnel standard — sûr dans la plupart des contextes Big 4." };
  else register = { label: "Neutre", color: "#94a3b8", note: "Difficile à juger — vérifie tes salutations et formules de clôture." };
  const longWords = words.filter((w) => /^[a-z'-]+$/i.test(w) && w.length >= 7).length;
  const longRatio = longWords / wordCount;
  const modalCount = (lower.match(/\b(would|could|should|might|shall|may)\b/g) || []).length;
  const relativeCount = (lower.match(/\b(which|whose|whereby|though|whereas|nevertheless|however)\b/g) || []).length;
  let cefr;
  if (wordCount < 20) cefr = "?";
  else if (avg < 9 && longRatio < 0.10 && modalCount === 0) cefr = "A2";
  else if (avg < 13 && longRatio < 0.16 && (modalCount + relativeCount) < 3) cefr = "B1";
  else if (avg < 18 && longRatio < 0.22) cefr = "B2";
  else cefr = "C1";
  return { wordCount, sentenceCount, avg: Math.round(avg * 10) / 10, register, cefr };
}

function WritingSection({ writing, setWriting }) {
  const templates = E_DATA.email_templates || [];
  const [loading, setLoading] = useState(false);
  const [pop, setPop] = useState(null);   // {x, y, idx}
  const taRef = useRef(null);
  const text = writing.text || "";
  const result = writing.result;
  const meta = analyseText(text);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const cefrColor = meta ? ({ A2: "#10b981", B1: "#f59e0b", B2: "#ef4444", C1: "#8b5cf6", "?": "#64748b" })[meta.cefr] : null;

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") setPop(null); };
    const click = (e) => { if (!(e.target.closest && e.target.closest(".eng-mark, .eng-pop"))) setPop(null); };
    document.addEventListener("keydown", esc);
    document.addEventListener("click", click);
    return () => { document.removeEventListener("keydown", esc); document.removeEventListener("click", click); };
  }, []);

  const insertTemplate = (t) => {
    const body = "Subject: " + t.subject + "\n\n" + t.body;
    if (text.trim() && !window.confirm("Le textarea n'est pas vide — veux-tu remplacer son contenu par le template ?")) return;
    setWriting({ text: body, result: null });
    if (taRef.current) taRef.current.focus();
  };
  const check = async () => {
    const t = text.trim();
    if (!t) return;
    setLoading(true);
    setPop(null);
    let res;
    try { res = await bridgeCall("check_english_text", t); }
    catch (e) { res = { error: "no_bridge" }; }
    setLoading(false);
    setWriting({ ...writing, result: res || { error: "no_response" } });
  };
  const applySuggestion = (m, sugg) => {
    const newText = text.substring(0, m.offset) + sugg + text.substring(m.offset + m.length);
    setWriting({ text: newText, result: null });   // résultat périmé → on le jette (comme avant)
    setPop(null);
  };

  /* Texte annoté : matches triés par offset, chevauchements ignorés */
  let annotated = null;
  const matches = (result && !result.error && (result.matches || []).filter((m) => typeof m.offset === "number" && typeof m.length === "number" && m.length > 0)) || [];
  if (result && !result.error) {
    const sorted = matches.slice().sort((a, b) => a.offset - b.offset);
    const parts = [];
    let cursor = 0;
    sorted.forEach((m, i) => {
      if (m.offset < cursor) return;
      if (m.offset > cursor) parts.push(text.substring(cursor, m.offset));
      parts.push(
        <span key={i} className="eng-mark" onClick={(e) => {
          e.stopPropagation();
          const r = e.target.getBoundingClientRect();
          setPop({ x: Math.max(8, Math.min(r.left, window.innerWidth - 340)), y: r.bottom + 6, idx: i, match: m });
        }}>{text.substring(m.offset, m.offset + m.length)}</span>
      );
      cursor = m.offset + m.length;
    });
    if (cursor < text.length) parts.push(text.substring(cursor));
    annotated = parts;
  }
  const popSugg = pop ? ((pop.match.replacements || []).slice(0, 6).map((r) => (typeof r === "string" ? r : (r && r.value) || "")).filter(Boolean)) : [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-lg font-semibold text-slate-800 mb-1">Atelier d'écriture</div>
      <div className="text-[13px] text-slate-500 mb-3.5">
        Écris en anglais ou pars d'un template, puis clique sur <strong>Corriger</strong> pour analyser ton texte.
        Tu verras les erreurs détectées, le registre et un niveau CEFR estimé.
      </div>

      {templates.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 mb-3.5">
          <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">📥 Insérer un template</div>
          <div className="flex gap-1.5 flex-wrap">
            {templates.map((t) => (
              <button key={t.id} title={t.scenario_fr} onClick={() => insertTemplate(t)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-indigo-300 text-indigo-600 hover:bg-indigo-50">{t.label_fr}</button>
            ))}
          </div>
        </div>
      )}

      <textarea ref={taRef} rows={10} value={text} placeholder="Écris ton texte en anglais ici, ou insère un template ci-dessus..."
        onChange={(e) => setWriting({ text: e.target.value, result })}
        className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-sm leading-relaxed focus:border-indigo-500 outline-none resize-y" />

      {meta && (
        <div className="flex gap-2 flex-wrap items-center text-[11px] bg-white border border-slate-200 rounded-lg px-2.5 py-2 mt-2">
          <span className="px-2 py-0.5 rounded border font-medium" style={{ color: meta.register.color, borderColor: meta.register.color }}>Registre : {meta.register.label}</span>
          <span className="px-2 py-0.5 rounded border font-medium" style={{ color: cefrColor, borderColor: cefrColor }}>Estimation CEFR : {meta.cefr}</span>
          <span className="text-slate-400">{meta.sentenceCount} phrase{meta.sentenceCount > 1 ? "s" : ""} · {meta.avg} mots/phrase</span>
          <span className="text-slate-400 italic ml-auto">{meta.register.note}</span>
        </div>
      )}

      <div className="flex justify-between items-center mt-2 gap-2.5 flex-wrap">
        <span className="text-xs text-slate-400">{words} mot{words > 1 ? "s" : ""} · {text.length} caractère{text.length > 1 ? "s" : ""}</span>
        <span className="flex gap-2">
          <button onClick={() => setWriting({ text: "", result: null })} className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-600 text-[13px] hover:bg-slate-50">Effacer</button>
          <button onClick={check} disabled={loading} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500 disabled:opacity-60">
            {loading ? "⏳ Correction en cours..." : "✓ Corriger"}
          </button>
        </span>
      </div>

      {result && result.error && (
        <div className="mt-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 text-[13px] text-red-600">
          ⚠️ Service de correction indisponible {pywebApi() ? "— réessaye dans un instant." : "(nécessite la version desktop)."}
          <div className="mt-2"><button onClick={check} className="text-xs px-3 py-1 rounded-lg border border-red-300 hover:bg-red-100">↻ Réessayer</button></div>
        </div>
      )}
      {result && !result.error && matches.length === 0 && (
        <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5 text-[13px] text-emerald-700">✓ Aucune erreur détectée. Beau travail !</div>
      )}
      {result && !result.error && matches.length > 0 && (
        <div className="mt-5">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-3 text-[13px] text-slate-500">
            {matches.length} erreur{matches.length > 1 ? "s" : ""} trouvée{matches.length > 1 ? "s" : ""} — clique sur un passage souligné pour voir les suggestions.
          </div>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm leading-loose text-slate-700 whitespace-pre-wrap">{annotated}</div>
        </div>
      )}

      {pop && (
        <div className="eng-pop fixed z-50 bg-white border border-slate-300 rounded-xl shadow-xl p-3 max-w-xs" style={{ left: pop.x, top: pop.y }}>
          <div className="text-xs text-slate-500 mb-2">{pop.match.message || "Erreur détectée"}</div>
          <div className="flex gap-1.5 flex-wrap">
            {popSugg.length
              ? popSugg.map((s, i) => (
                <button key={i} onClick={() => applySuggestion(pop.match, s)}
                  className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors">{s}</button>
              ))
              : <span className="text-xs text-slate-400">Pas de suggestion</span>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════ CONSTRUCTEUR (patterns) ════════ */
function ConstructorSection({ score, setScore }) {
  const patterns = E_DATA.patterns || [];
  const [cat, setCat] = useState(null);
  const [exo, setExo] = useState(null);     // {patternId, exampleIdx, answer, checked, hint}
  if (!patterns.length) {
    return <div className="max-w-md mx-auto mt-10 bg-white rounded-xl border border-slate-200 p-8 text-center">
      <div className="text-4xl mb-2.5">🏗️</div><div className="font-semibold text-slate-800">Aucun pattern disponible</div></div>;
  }

  if (exo) {
    const pat = patterns.find((p) => p.id === exo.patternId);
    if (!pat) { setExo(null); return null; }
    const meta = PATTERN_CATEGORIES[pat.category] || { icon: "•", label: pat.category };
    const examples = pat.examples || [];
    const example = examples[exo.exampleIdx];
    const expectedEn = example ? pat.en_template.replace(/\{[^}]+\}/g, example.en) : pat.en_template;
    const promptFr = example ? pat.fr_template.replace(/\{[^}]+\}/g, example.fr) : pat.fr_template;
    const isCorrect = exo.checked && eNorm(exo.answer) === eNorm(expectedEn);
    const doCheck = () => {
      if (!exo.answer.trim()) return;
      const correct = eNorm(exo.answer) === eNorm(expectedEn);
      setScore({ total: score.total + 1, correct: score.correct + (correct ? 1 : 0) });
      setExo({ ...exo, checked: true });
    };
    const hintText = (() => {
      const w = expectedEn.split(/\s+/);
      return w.slice(0, Math.max(3, Math.ceil(w.length / 4))).join(" ") + "...";
    })();
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-3.5 gap-2.5">
          <button onClick={() => setExo(null)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">← Retour aux patterns</button>
          <span className="text-xs text-slate-500">{meta.icon} {meta.label} · Exemple {exo.exampleIdx + 1} / {examples.length}</span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-3.5">
          <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">Pattern</div>
          <div className="text-[15px] text-slate-800 mb-1.5">{pat.fr_template}</div>
          <div className="text-sm text-indigo-600 italic">{pat.en_template}</div>
          {pat.context && <div className="text-xs text-slate-400 mt-2.5">📖 {pat.context}</div>}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">À traduire</div>
          <div className="text-base text-slate-800 mb-3.5 leading-normal">{promptFr}</div>
          <textarea rows={3} value={exo.answer} disabled={exo.checked} placeholder="Tape ta traduction anglaise..."
            autoFocus
            onChange={(e) => setExo({ ...exo, answer: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !exo.checked) { e.preventDefault(); doCheck(); } }}
            className={"w-full bg-white border rounded-lg px-3 py-2.5 text-sm leading-normal resize-y outline-none mb-2.5 " +
              (isCorrect ? "border-emerald-400" : exo.checked ? "border-red-400" : "border-slate-300 focus:border-indigo-500")} />
          {exo.hint && !exo.checked && (
            <div className="mb-2.5 text-[13px] bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-700">💡 Début attendu : <em>{hintText}</em></div>
          )}
          {!exo.checked ? (
            <div className="flex gap-2 justify-end flex-wrap">
              <button onClick={() => setExo({ ...exo, hint: true })} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">💡 Indice</button>
              <button onClick={doCheck} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500">✓ Vérifier</button>
            </div>
          ) : (
            <div>
              <div className={"rounded-lg px-3.5 py-3 mb-2.5 border " + (isCorrect ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
                <div className={"font-semibold mb-1.5 text-sm " + (isCorrect ? "text-emerald-700" : "text-red-600")}>
                  {isCorrect ? "✓ Excellent !" : "✗ Pas tout à fait — voici la réponse attendue :"}
                </div>
                <div className={"text-sm italic leading-normal flex items-center gap-2 " + (isCorrect ? "text-emerald-700" : "text-red-700")}>
                  <span className="flex-1">{expectedEn}</span>
                  <SpeakBtn text={expectedEn} title="Écouter la réponse" sm />
                </div>
              </div>
              <div className="flex gap-2 justify-between flex-wrap">
                <button onClick={() => setExo({ ...exo, answer: "", checked: false, hint: false })}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">↻ Réessayer ce pattern</button>
                {exo.exampleIdx < examples.length - 1
                  ? <button onClick={() => setExo({ ...exo, exampleIdx: exo.exampleIdx + 1, answer: "", checked: false, hint: false })}
                      className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500">Exemple suivant →</button>
                  : <button onClick={() => setExo(null)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500">Terminer ce pattern</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const counts = {};
  patterns.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
  let filtered = patterns.slice();
  if (cat) filtered = filtered.filter((p) => p.category === cat);
  return (
    <div>
      <div className="flex gap-1.5 flex-wrap items-center mb-3.5">
        {Object.keys(counts).map((k) => {
          const meta = PATTERN_CATEGORIES[k] || { icon: "•", label: k };
          return <Pill key={k} active={cat === k} color="#3b82f6" onClick={() => setCat(cat === k ? null : k)}>{meta.icon} {meta.label} ({counts[k]})</Pill>;
        })}
        {cat && <button onClick={() => setCat(null)} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 text-red-500 hover:bg-red-50">↺ Tous</button>}
        {score.total > 0 && <span className="text-xs text-slate-500 ml-auto">Score session : <strong className="text-emerald-600">{score.correct}</strong> / <strong>{score.total}</strong></span>}
      </div>
      <div className="text-xs text-slate-400 mb-2.5">Clique sur un pattern pour t'entraîner à le traduire en contexte.</div>
      <div className="grid md:grid-cols-2 gap-3 items-start">
      {filtered.map((p) => {
        const meta = PATTERN_CATEGORIES[p.category] || { icon: "•", label: p.category };
        return (
          <div key={p.id} onClick={() => setExo({ patternId: p.id, exampleIdx: 0, answer: "", checked: false, hint: false })}
            className="bg-white rounded-xl border border-slate-200 hover:border-indigo-400 p-4 cursor-pointer transition-colors">
            <div className="flex justify-between items-start gap-2.5">
              <div className="flex-1">
                <div className="text-sm text-slate-800 font-semibold mb-1.5">{p.fr_template}</div>
                <div className="text-[13px] text-indigo-600 italic mb-1.5">{p.en_template}</div>
                {p.context && <div className="text-[11px] text-slate-400 mt-1">📖 {p.context}</div>}
              </div>
              <div className="flex flex-col gap-1.5 items-end shrink-0">
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200">{meta.icon}</span>
                <LevelBadge level={p.level} />
              </div>
            </div>
            <div className="mt-2.5 text-[11px] text-slate-400 flex items-center gap-1.5"><span>▶</span> S'entraîner sur ce pattern ({(p.examples || []).length} ex.)</div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

/* ════════ ÉTATS FINANCIERS ════════ */
function fsFormatValue(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v !== "number") return "";
  if (!Number.isInteger(v) && Math.abs(v) < 1000) return v.toFixed(2);
  const formatted = Math.abs(v).toLocaleString("en-US").replace(/,/g, "'");
  return v < 0 ? "(" + formatted + ")" : formatted;
}

function FsSection({ fsView, setFsView }) {
  const fs = E_DATA.financial_statements;
  const [tt, setTt] = useState(null);   // tooltip {x, y, fr, note, ref}
  if (!fs) return <div className="text-center py-10 bg-white rounded-xl border border-slate-200"><div className="text-4xl mb-2.5">📊</div><div className="text-sm text-slate-500">États financiers non disponibles.</div></div>;
  const map = { income: fs.income_statement, balance: fs.balance_sheet, conso: fs.balance_sheet_conso, cashflow: fs.cash_flow_statement, equity: fs.changes_in_equity };
  const stmt = map[fsView] || map.income;
  const isTable = stmt.type === "table";

  const ttAttrs = (fr, note, ref) => ({
    onMouseEnter: (e) => setTt({ x: e.clientX + 16, y: e.clientY + 16, fr, note, ref }),
    onMouseMove: (e) => setTt((t) => t && { ...t, x: Math.min(e.clientX + 16, window.innerWidth - 396), y: Math.min(e.clientY + 16, window.innerHeight - 120) }),
    onMouseLeave: () => setTt(null),
  });

  const tabBtn = (id, label, sub) => (
    <button onClick={() => setFsView(id)}
      className={"text-left px-3.5 py-2 rounded-lg border text-[13px] leading-tight transition-colors " +
        (fsView === id ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300 text-indigo-600 hover:border-indigo-400")}>
      <div className="font-semibold">{label}</div>
      <div className="text-[10px] opacity-80 mt-0.5">{sub}</div>
    </button>
  );

  const renderLine = (line, i) => {
    if (!line) return null;
    if (line.type === "space") return <div key={i} className="h-2" />;
    const indent = line.indent || 0;
    const isNeg = typeof line.value === "number" && line.value < 0;
    let cls = "grid grid-cols-[1fr_auto] gap-3 px-3 py-1.5 text-[13px] leading-normal cursor-help border-b border-transparent hover:bg-indigo-50 transition-colors";
    let lblCls = "text-slate-700 flex items-center gap-1.5 min-w-0";
    let valCls = "text-slate-500 tabular-nums whitespace-nowrap" + (isNeg ? " text-red-500" : "");
    if (line.type === "header") { cls += " bg-indigo-50/70 rounded-t-md mt-3 !py-2.5"; lblCls = "font-bold text-indigo-700 uppercase text-xs tracking-wide flex items-center gap-1.5"; }
    if (line.type === "subtotal") { cls += " font-semibold border-t border-slate-300 bg-slate-50"; lblCls = "text-slate-800 flex items-center gap-1.5"; valCls = "text-slate-800 tabular-nums whitespace-nowrap" + (isNeg ? " text-red-500" : ""); }
    if (line.type === "total") { cls += " font-extrabold bg-indigo-50 border-y-2 border-double border-slate-400"; lblCls = "text-slate-900 flex items-center gap-1.5 text-sm"; valCls = "text-slate-900 tabular-nums whitespace-nowrap text-sm" + (isNeg ? " text-red-500" : ""); }
    const pad = { 1: "pl-7", 2: "pl-11", 3: "pl-[60px]" }[indent] || "";
    return (
      <div key={i} className={cls + " " + pad} {...ttAttrs(line.label_fr || "", line.note_fr || "", line.ref || "")}>
        <span className={lblCls}>
          {line.label_en}
          {line.ref && <span className="text-[9px] font-semibold px-1.5 py-px rounded bg-sky-50 text-sky-600 border border-sky-200 whitespace-nowrap">{line.ref}</span>}
          {line.note_fr && <span className="text-[11px] text-amber-500 opacity-80" title="Note disponible">💡</span>}
        </span>
        <span className={valCls}>{fsFormatValue(line.value)}</span>
      </div>
    );
  };

  const fmtCell = (v, bold) => {
    if (v === null || v === undefined || v === 0) return <span className="text-slate-300 text-[11px]">—</span>;
    const formatted = Math.abs(v).toLocaleString("en-US").replace(/,/g, "'");
    const neg = v < 0;
    return <span className={(neg ? "text-red-500 " : bold ? "text-slate-900 " : "text-slate-500 ") + (bold ? "font-bold" : "")}>{neg ? "(" + formatted + ")" : formatted}</span>;
  };

  const renderTable = () => {
    const cols = stmt.columns || [];
    return (
      <div className="overflow-x-auto -mx-1">
        <table className="border-collapse w-full min-w-[1100px]">
          <thead>
            <tr>
              <th className="text-left px-2.5 py-2 text-[10px] uppercase text-slate-400 tracking-wide font-medium border-b border-slate-200 sticky left-0 bg-white z-[2] min-w-[230px]"></th>
              {cols.map((c, ci) => (
                <th key={ci} {...ttAttrs(c.label_fr || "", c.note_fr || "", "")}
                  className={"text-right px-1.5 py-2 text-[10px] uppercase tracking-wide border-b border-slate-200 whitespace-nowrap cursor-help min-w-[78px] " + (c.bold ? "font-bold text-slate-900" : "font-medium text-indigo-600")}>
                  {c.label_en}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(stmt.rows || []).map((row, ri) => {
              const type = row.type || "line";
              const strong = type === "opening" || type === "closing";
              const sub = type === "subtotal";
              const trCls = strong ? "bg-indigo-50 border-y-2 border-double border-slate-400" : sub ? "bg-slate-50 border-t border-slate-300" : "border-b border-slate-100";
              return (
                <tr key={ri} className={trCls}>
                  <th scope="row" {...ttAttrs(row.label_fr || "", row.note_fr || "", row.ref || "")}
                    className={"text-left px-2.5 py-2 text-[13px] cursor-help sticky left-0 bg-inherit z-[2] min-w-[230px] " + (strong ? "font-bold text-slate-900" : sub ? "font-semibold text-slate-800" : "text-slate-700 font-normal")}>
                    {row.label_en}
                    {row.ref && <span className="ml-1.5 text-[9px] font-semibold px-1.5 py-px rounded bg-sky-50 text-sky-600 border border-sky-200 whitespace-nowrap">{row.ref}</span>}
                    {row.note_fr && <span className="ml-1 text-[11px] text-amber-500 opacity-80" title="Note">💡</span>}
                  </th>
                  {cols.map((c, ci) => (
                    <td key={ci} className="text-right px-1.5 py-2 tabular-nums whitespace-nowrap text-xs">{fmtCell(row.values && row.values[c.key], c.bold)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-3.5">
        {tabBtn("income", "📈 Compte de résultat", "P&L + OCI")}
        {tabBtn("balance", "⚖️ Bilan statutaire", "Standalone")}
        {tabBtn("conso", "🌐 Bilan consolidé", "Groupe")}
        {tabBtn("cashflow", "💧 Flux de trésorerie", "IAS 7 indirecte")}
        {tabBtn("equity", "📋 Variations CP", "Tableau multi-colonnes")}
      </div>
      <div className={"bg-white rounded-xl border border-slate-200 p-4" + (isTable ? "" : " max-w-4xl mx-auto")}>
        <div className="border-b border-slate-200 pb-3 mb-2">
          <div className="text-[17px] font-bold text-slate-800 mb-0.5">{stmt.title_en}</div>
          <div className="text-[11px] text-slate-400 italic">{stmt.title_fr}</div>
          <div className="flex justify-between mt-2 text-[11px] text-slate-500">
            <span>{stmt.period_en} <span className="text-slate-400 italic">— {stmt.period_fr}</span></span>
            <span>({stmt.currency})</span>
          </div>
        </div>
        <div className="text-[11px] text-slate-400 mb-3.5 leading-normal">
          🖱️ Survole n'importe quelle ligne {isTable ? "ou colonne " : ""}pour voir la traduction française, la référence IFRS et la note explicative. 💡 indique une note disponible.
        </div>
        {isTable ? renderTable() : <div>{(stmt.lines || []).map(renderLine)}</div>}
      </div>
      {tt && (tt.fr || tt.note || tt.ref) && (
        <div className="fixed z-50 pointer-events-none bg-white border border-indigo-400 rounded-lg px-3 py-2.5 max-w-sm shadow-xl text-xs" style={{ left: tt.x, top: tt.y }}>
          {tt.ref && <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-200 mb-1.5">📘 {tt.ref}</span>}
          <div className="font-semibold text-indigo-700 text-[13px]">{tt.fr}</div>
          {tt.note && <div className="text-slate-500 leading-normal mt-1.5 pt-1.5 border-t border-slate-100 italic">{tt.note}</div>}
        </div>
      )}
    </div>
  );
}

/* ════════ DICTÉE ════════ */
function DictationSection({ deleted, audio }) {
  const [src, setSrc] = useState("phrases");
  const [item, setItem] = useState(null);
  const [input, setInput] = useState("");
  const [checked, setChecked] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [score, setScore] = useState({ correct: 0, close: 0, total: 0 });
  const seenRef = useRef({});

  const poolOf = (s) => {
    const d = E_DATA;
    let pool = [];
    if (s === "vocab" || s === "mixed") pool = pool.concat((d.vocab || []).map((v) => ({ id: v.id, en: v.en, fr: v.fr })));
    if (s === "phrases" || s === "mixed") pool = pool.concat((d.phrases || []).map((p) => ({ id: p.id, en: p.en, fr: p.fr })));
    if (s === "essentials" || s === "mixed") pool = pool.concat((d.essentials || []).map((e) => ({ id: e.id, en: e.en, fr: e.fr })));
    pool = pool.filter((x) => !deleted[x.id]);
    const unseen = pool.filter((x) => !seenRef.current[x.id]);
    return unseen.length ? unseen : pool;
  };
  const next = () => {
    const pool = poolOf(src);
    if (!pool.length) return;
    const it = pool[Math.floor(Math.random() * pool.length)];
    seenRef.current[it.id] = true;
    setItem(it); setInput(""); setChecked(false); setVerdict(null);
    setTimeout(() => speak(it.en), 350);
  };
  const setSource = (s) => {
    setSrc(s); setItem(null); setInput(""); setChecked(false); setVerdict(null);
    seenRef.current = {}; setScore({ correct: 0, close: 0, total: 0 });
  };
  const check = () => {
    if (!item || !input.trim()) return;
    const user = eNorm(input), expected = eNorm(item.en);
    let r;
    if (user === expected) { r = "exact"; setScore((s) => ({ ...s, correct: s.correct + 1, total: s.total + 1 })); }
    else {
      const expWords = new Set(expected.split(" "));
      const userWords = user.split(" ");
      const matched = userWords.filter((w) => expWords.has(w)).length;
      const overlap = matched / Math.max(expWords.size, 1);
      if (overlap >= 0.75 && Math.abs(userWords.length - expWords.size) <= 2) { r = "close"; setScore((s) => ({ ...s, close: s.close + 1, total: s.total + 1 })); }
      else { r = "wrong"; setScore((s) => ({ ...s, total: s.total + 1 })); }
    }
    setVerdict(r); setChecked(true);
  };

  const sources = [
    { id: "phrases", label: "💬 Phrases", count: (E_DATA.phrases || []).length },
    { id: "vocab", label: "📚 Vocab", count: (E_DATA.vocab || []).length },
    { id: "essentials", label: "🎯 Day-1", count: (E_DATA.essentials || []).length },
    { id: "mixed", label: "🔀 Tout mélangé", count: (E_DATA.vocab || []).length + (E_DATA.phrases || []).length + (E_DATA.essentials || []).length },
  ];
  const scorePct = score.total ? Math.round(((score.correct + score.close * 0.5) / score.total) * 100) : 0;
  const V = { exact: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: "✓", label: "Parfait !" },
    close: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: "~", label: "Presque" },
    wrong: { color: "text-red-600", bg: "bg-red-50 border-red-200", icon: "✗", label: "Pas tout à fait" } }[verdict] || {};

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-3 mb-3.5">
        <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-2">Source</div>
        <div className="flex gap-1.5 flex-wrap items-center">
          {sources.map((s) => (
            <Pill key={s.id} active={src === s.id} color="#3b82f6" onClick={() => setSource(s.id)}>{s.label} ({s.count})</Pill>
          ))}
          {score.total > 0 && (
            <span className="text-[11px] text-slate-500 ml-auto flex items-center gap-2">
              <span><strong className="text-emerald-600">{score.correct}</strong> exacts</span>
              <span><strong className="text-amber-600">{score.close}</strong> approchés</span>
              <span><strong>{score.total}</strong> total</span>
              <span className="text-indigo-500">·</span>
              <span><strong>{scorePct}%</strong></span>
            </span>
          )}
        </div>
      </div>

      {!item ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center mt-4">
          <div className="text-5xl mb-2.5">🎧</div>
          <div className="text-lg font-semibold text-slate-800 mb-1.5">Mode dictée</div>
          <div className="text-[13px] text-slate-500 mb-4 leading-relaxed">L'app va te lire un mot ou une phrase en anglais.<br />Tape ce que tu entends — autant de fois que nécessaire pour bien capter.</div>
          <button onClick={next} className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">▶️ Démarrer</button>
        </div>
      ) : !checked ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
          <div className="flex items-center gap-2.5 mb-3.5">
            <button onClick={() => speak(item.en)} className="px-3.5 py-2 rounded-lg border border-slate-300 text-slate-600 text-[13px] hover:bg-slate-50">🔊 Rejouer</button>
            <span className="text-[11px] text-slate-400">Tu peux rejouer autant de fois que tu veux.</span>
          </div>
          <textarea rows={3} value={input} autoFocus placeholder="Tape ce que tu entends en anglais..."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); check(); } }}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm leading-normal resize-y outline-none focus:border-indigo-500 mb-2.5" />
          <div className="flex gap-2 justify-end">
            <button onClick={next} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">Passer →</button>
            <button onClick={check} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500">✓ Vérifier</button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
          <div className={"border rounded-xl px-4 py-3.5 mb-3 " + V.bg}>
            <div className={"text-sm font-semibold mb-2 " + V.color}>{V.icon} {V.label}</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">Ta réponse</div>
            <div className="text-[13px] text-slate-700 italic mb-3">{input}</div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">Attendu</div>
            <div className="flex items-center gap-2.5">
              <div className="text-sm text-indigo-600 font-semibold flex-1">{item.en}</div>
              <SpeakBtn text={item.en} title="Réécouter" sm />
            </div>
            <div className="text-[11px] text-slate-400 mt-2.5">Traduction : {item.fr}</div>
          </div>
          <div className="text-center">
            <button onClick={next} className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500">Suivant →</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════ ESSENTIELS (Day-1 EY) ════════ */
function EssentialsSection({ done, onToggle }) {
  const all = E_DATA.essentials || [];
  const [collapsed, setCollapsed] = useState({});
  if (!all.length) return <div className="max-w-md mx-auto mt-10 bg-white rounded-xl border border-slate-200 p-8 text-center"><div className="text-4xl mb-2.5">🎯</div><div className="font-semibold text-slate-800">Aucun essential disponible</div></div>;
  const doneCount = Object.keys(done).length;
  const pct = all.length ? Math.round((doneCount / all.length) * 100) : 0;
  const byGroup = {};
  all.forEach((item) => { (byGroup[item.group] = byGroup[item.group] || []).push(item); });
  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 mb-4">
        <div className="flex items-center gap-2.5 flex-wrap mb-2">
          <span className="text-base font-semibold text-slate-800">🎯 Day-1 EY — 50 essentiels pour ta première semaine</span>
          <span className="text-[13px] text-slate-500 ml-auto"><strong className="text-emerald-600">{doneCount}</strong> / {all.length} acquis · {pct}%</span>
        </div>
        <ProgressBar pct={pct} color="#10b981" />
        <div className="text-xs text-slate-400 mt-2.5 leading-relaxed">
          Coche les éléments quand tu te sens à l'aise. L'objectif : tout maîtriser avant octobre 2026. Tu n'as pas besoin de tout faire d'un coup — vise ~5 par jour.
        </div>
      </div>
      {Object.keys(ESSENTIAL_GROUPS).map((g) => {
        const items = byGroup[g] || [];
        if (!items.length) return null;
        const meta = ESSENTIAL_GROUPS[g];
        const isCollapsed = !!collapsed[g];
        const groupDone = items.filter((i) => done[i.id]).length;
        return (
          <div key={g} className="mb-4">
            <div onClick={() => setCollapsed({ ...collapsed, [g]: !isCollapsed })}
              className="flex items-center gap-2.5 cursor-pointer px-3 py-2.5 bg-white border border-slate-200 rounded-xl mb-2.5" style={{ borderLeft: "4px solid " + meta.color }}>
              <span className="text-lg">{meta.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-800">{meta.label}</div>
                <div className="text-[11px] text-slate-400">{groupDone} / {items.length} acquis</div>
              </div>
              <span className="text-sm text-slate-400">{isCollapsed ? "▶" : "▼"}</span>
            </div>
            {!isCollapsed && <div className="lg:columns-2 gap-2.5">{items.map((item) => {
              const isDone = !!done[item.id];
              return (
                <div key={item.id} className={"bg-white rounded-xl border px-4 py-3.5 mb-2.5 break-inside-avoid " + (isDone ? "border-emerald-200 bg-gradient-to-b from-white to-emerald-50/40" : "border-slate-200")}>
                  <div className="flex gap-3 items-start">
                    <input type="checkbox" checked={isDone} onChange={() => onToggle(item.id)} className="w-[18px] h-[18px] cursor-pointer mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">{item.kind === "vocab" ? "📚 Mot" : "💬 Phrase"}</span>
                        {isDone && <span className="text-[10px] px-2 py-px rounded bg-emerald-100 text-emerald-700">✓ Acquis</span>}
                      </div>
                      <div className="text-[15px] text-slate-800 font-semibold mb-1">{item.fr}</div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-sm text-indigo-600 italic flex-1">{item.en}</div>
                        <SpeakBtn text={item.en} title="Écouter" sm />
                      </div>
                      <div className="text-xs text-slate-500 leading-relaxed bg-slate-50 px-2.5 py-2 rounded-md" style={{ borderLeft: "3px solid " + meta.color }}>
                        💡 {item.why_fr}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ════════ CONVERSATIONS ════════ */
function ConversationsSection({ audio }) {
  const convs = E_DATA.conversations || [];
  const [play, setPlay] = useState(null);   // {convId, turnIdx, choiceIdx, history}
  if (!convs.length) return <div className="max-w-md mx-auto mt-10 bg-white rounded-xl border border-slate-200 p-8 text-center"><div className="text-4xl mb-2.5">🎙️</div><div className="font-semibold text-slate-800">Aucune conversation disponible</div></div>;

  const NpcBubble = ({ turn }) => {
    const style = SPEAKER_STYLES[turn.speaker] || SPEAKER_STYLES.client;
    return (
      <div className="my-2 mr-8">
        <div className="inline-block rounded-2xl px-3.5 py-2.5 max-w-[80%] border" style={{ background: style.bg, borderColor: style.color + "55" }}>
          <div className="text-[10px] uppercase tracking-wide mb-1 flex items-center justify-between gap-2.5" style={{ color: style.color }}>
            <span>{style.icon} {turn.name || turn.speaker}</span>
            <button onClick={(e) => { e.stopPropagation(); speak(turn.en); }} title="Écouter" className="text-[13px]">🔊</button>
          </div>
          <div className="text-[13px] leading-normal text-slate-800">{turn.en}</div>
          {turn.fr && <div className="text-[11px] leading-normal text-slate-500 mt-1.5 italic">{turn.fr}</div>}
        </div>
      </div>
    );
  };
  const YouBubble = ({ opt, correct }) => (
    <div className="my-2 ml-8 text-right">
      <div className={"inline-block rounded-2xl px-3.5 py-2.5 max-w-[80%] text-left border " + (correct ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300")}>
        <div className={"text-[10px] uppercase tracking-wide mb-1 " + (correct ? "text-emerald-600" : "text-red-500")}>🗣️ Toi · {correct ? "✓" : "✗"}</div>
        <div className={"text-[13px] leading-normal " + (correct ? "text-emerald-800" : "text-red-700")}>{opt.en}</div>
      </div>
    </div>
  );

  if (play) {
    const conv = convs.find((c) => c.id === play.convId);
    if (!conv) { setPlay(null); return null; }
    const total = conv.turns.length;
    const isEnd = play.turnIdx >= total;
    const turn = !isEnd ? conv.turns[play.turnIdx] : null;
    const choose = (i) => {
      const opt = turn.options[i];
      if (audio.autoplay && opt) setTimeout(() => speak(opt.en), 200);
      setPlay({ ...play, choiceIdx: i, history: play.history.concat([{ turnIdx: play.turnIdx, choiceIdx: i, correct: !!opt.correct }]) });
    };
    const advance = () => setPlay({ ...play, turnIdx: play.turnIdx + 1, choiceIdx: null });
    const choicesMade = play.history.length;
    const correctCount = play.history.filter((h) => h.correct).length;
    const pctOk = choicesMade ? Math.round((correctCount / choicesMade) * 100) : 0;
    const verdict = pctOk >= 80 ? "🎉 Excellent !" : pctOk >= 60 ? "👍 Bien" : "💪 À retravailler";
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2.5 mb-3.5">
          <button onClick={() => setPlay(null)} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">← Retour</button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800">{conv.title}</div>
            <div className="text-[11px] text-slate-400 truncate">{conv.context}</div>
          </div>
          <LevelBadge level={conv.level} />
        </div>
        <div className="mb-3.5"><ProgressBar pct={total ? Math.round((play.turnIdx / total) * 100) : 0} /></div>

        {conv.turns.slice(0, play.turnIdx).map((t, i) => {
          if (t.type === "choice") {
            const past = play.history.find((h) => h.turnIdx === i);
            return past ? <YouBubble key={i} opt={t.options[past.choiceIdx]} correct={past.correct} /> : null;
          }
          return <NpcBubble key={i} turn={t} />;
        })}

        {!isEnd && turn.type !== "choice" && (
          <div>
            <NpcBubble turn={turn} />
            <div className="text-center my-3"><button onClick={advance} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500">Continuer →</button></div>
          </div>
        )}
        {!isEnd && turn.type === "choice" && play.choiceIdx == null && (
          <div className="bg-white rounded-xl border border-amber-300 p-4 my-3.5">
            <div className="text-[11px] uppercase tracking-wide text-amber-600 mb-1.5">🗣️ À toi de répondre</div>
            <div className="text-sm text-slate-800 mb-3.5">{turn.prompt_fr}</div>
            {turn.options.map((o, i) => (
              <button key={i} onClick={() => choose(i)}
                className="block w-full text-left px-3.5 py-3 mb-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-400 transition-colors text-[13px] text-slate-800 leading-normal">
                {String.fromCharCode(65 + i)}. {o.en}
              </button>
            ))}
          </div>
        )}
        {!isEnd && turn.type === "choice" && play.choiceIdx != null && (
          <div>
            <YouBubble opt={turn.options[play.choiceIdx]} correct={!!turn.options[play.choiceIdx].correct} />
            <div className="mx-8 mb-3 bg-white border border-slate-200 rounded-xl px-3.5 py-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1.5">💡 Feedback</div>
              <div className="text-[13px] text-slate-700 leading-normal">{turn.options[play.choiceIdx].feedback_fr}</div>
            </div>
            <div className="text-center my-3.5"><button onClick={advance} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500">Continuer →</button></div>
          </div>
        )}
        {isEnd && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 text-center mt-3.5">
            <div className="text-3xl mb-2">{verdict.split(" ")[0]}</div>
            <div className="text-lg font-bold text-slate-800 mb-1.5">{verdict.substring(verdict.indexOf(" ") + 1)}</div>
            <div className="text-sm text-slate-500 mb-3.5">Tu as choisi la meilleure réponse <strong className="text-emerald-600">{correctCount}</strong> fois sur <strong>{choicesMade}</strong> ({pctOk}%).</div>
            <div className="flex gap-2 justify-center flex-wrap">
              <button onClick={() => setPlay({ convId: conv.id, turnIdx: 0, choiceIdx: null, history: [] })} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500">↻ Recommencer</button>
              <button onClick={() => setPlay(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-[13px] hover:bg-slate-50">Liste des conversations</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs text-slate-400 mb-3 leading-relaxed">
        Dialogues simulés en contexte audit. Lis chaque réplique anglaise (avec audio si tu veux), puis choisis la meilleure réponse aux moments clés. Tu auras un feedback immédiat à chaque choix.
      </div>
      <div className="grid md:grid-cols-2 gap-3 items-start">
      {convs.map((c) => {
        const choices = (c.turns || []).filter((t) => t.type === "choice").length;
        return (
          <div key={c.id} onClick={() => setPlay({ convId: c.id, turnIdx: 0, choiceIdx: null, history: [] })}
            className="bg-white rounded-xl border border-slate-200 hover:border-indigo-400 p-4 cursor-pointer transition-colors">
            <div className="flex justify-between items-start gap-2.5">
              <div className="flex-1">
                <div className="text-[15px] text-slate-800 font-semibold mb-1.5">{c.title}</div>
                <div className="text-xs text-slate-500 leading-normal mb-2">{c.context}</div>
                <div className="text-[11px] text-slate-400">⏱️ ~{c.duration_min || "?"} min · 🗣️ {choices} choix à faire</div>
              </div>
              <LevelBadge level={c.level} />
            </div>
            <div className="mt-2.5 text-[11px] text-slate-400">▶ Démarrer la conversation</div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

/* ════════ VIDÉOS YOUTUBE ════════ */
function VideosSection({ watched, onToggle, onOpen }) {
  const videos = E_DATA.videos || [];
  const [theme, setTheme] = useState(null);
  if (!videos.length) return <div className="max-w-md mx-auto mt-10 bg-white rounded-xl border border-slate-200 p-8 text-center"><div className="text-4xl mb-2.5">🎬</div><div className="font-semibold text-slate-800">Aucune ressource vidéo disponible</div></div>;
  const counts = {};
  videos.forEach((v) => { counts[v.theme] = (counts[v.theme] || 0) + 1; });
  const watchedCount = Object.keys(watched).length;
  const pct = videos.length ? Math.round((watchedCount / videos.length) * 100) : 0;
  let filtered = videos.slice();
  if (theme) filtered = filtered.filter((v) => v.theme === theme);
  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-3 mb-3.5 flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-500">Progression : <strong className="text-emerald-600">{watchedCount}</strong> / <strong>{videos.length}</strong> ressources vues</span>
        <ProgressBar pct={pct} color="#10b981" />
        <span className="text-xs text-slate-400">{pct}%</span>
      </div>
      <div className="flex gap-1.5 flex-wrap items-center mb-3.5">
        {Object.keys(counts).map((k) => {
          const meta = VIDEO_THEMES[k] || { icon: "•", label: k };
          return <Pill key={k} active={theme === k} color="#3b82f6" onClick={() => setTheme(theme === k ? null : k)}>{meta.icon} {meta.label} ({counts[k]})</Pill>;
        })}
        {theme && <button onClick={() => setTheme(null)} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 text-red-500 hover:bg-red-50">↺ Tous</button>}
      </div>
      <div className="text-[11px] text-slate-400 mb-2.5 leading-normal">
        Cliquer sur une vidéo l'ouvre dans un nouvel onglet et la marque automatiquement comme vue. Sélection May 2026 — chaînes éducatives reconnues (ACCA, Adam Deller, IFRS Foundation, etc.).
      </div>
      <div className="grid md:grid-cols-2 gap-3 items-start">
      {filtered.map((v) => {
        const meta = VIDEO_THEMES[v.theme] || { icon: "•", label: v.theme };
        const isWatched = !!watched[v.id];
        const kindIcon = v.kind === "channel" ? "📺" : v.kind === "video" ? "🎥" : "🔎";
        const kindLabel = v.kind === "channel" ? "Chaîne" : v.kind === "video" ? "Vidéo" : "Recherche";
        return (
          <div key={v.id} className={"bg-white rounded-xl border p-4 " + (isWatched ? "border-emerald-200 bg-gradient-to-b from-white to-emerald-50/40" : "border-slate-200")}>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">{kindIcon} {kindLabel}</span>
              <span className="text-[10px] px-2 py-px rounded bg-indigo-50 text-indigo-600 border border-indigo-200">{meta.icon} {meta.label}</span>
              <LevelBadge level={v.level} />
              {isWatched && <span className="text-[10px] px-2 py-px rounded bg-emerald-100 text-emerald-700">✓ Vu</span>}
            </div>
            <div className="text-[15px] text-slate-800 font-semibold mb-1.5">{v.title}</div>
            <div className="text-xs text-slate-500 leading-normal mb-2.5">{v.description}</div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => onOpen(v.id, v.url)} className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500">
                {v.kind === "channel" ? "📺 Ouvrir la chaîne" : v.kind === "video" ? "▶️ Regarder la vidéo" : "🔎 Lancer la recherche YouTube"}
              </button>
              <button onClick={() => onToggle(v.id)} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-500 text-[11px] hover:bg-slate-50">
                {isWatched ? "↺ Marquer comme à voir" : "✓ Marquer vu"}
              </button>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

/* ═══════════ Mes notes — vocabulaire personnel (sessions de notes manuscrites) ═══════════ */
function NotesBold({ text }) {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return <span>{parts.map((p, i) => {
    if (/^\*\*[\s\S]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-slate-800">{p.slice(2, -2)}</strong>;
    if (/^\*[^*][\s\S]*\*$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
    return <span key={i}>{p}</span>;
  })}</span>;
}
function MyNoteCard({ item, test }) {
  const [revealed, setRevealed] = useState(false);
  const show = !test || revealed;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[15px] font-bold text-slate-800">{item.en}</span>
        <SpeakBtn text={item.en} title="Écouter le mot" sm />
        {show
          ? <span className="text-sm text-indigo-700 font-medium">— {item.fr}</span>
          : <button onClick={() => setRevealed(true)} className="text-xs px-2.5 py-1 rounded-md border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100">👁 Voir la traduction</button>}
      </div>
      {show && item.ex && (
        <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
          <div className="flex items-start gap-2">
            <span className="text-sm text-slate-700 italic leading-relaxed flex-1">“{item.ex}”</span>
            <SpeakBtn text={item.ex} title="Écouter la phrase" sm />
          </div>
          {item.ex_fr && <div className="text-xs text-slate-400 mt-1 leading-relaxed">{item.ex_fr}</div>}
        </div>
      )}
      {show && item.tip && <div className="mt-2 rounded-lg bg-violet-50/70 border border-violet-100 px-3 py-2 text-xs text-violet-900 leading-relaxed">💡 <NotesBold text={item.tip} /></div>}
    </div>
  );
}
/* ════════ LISTE EXPRESS — tous les mots → traduction, en un coup d'œil ════════ */
const QL_DOMS = [
  { k: "audit", label: "🔍 Audit" },
  { k: "ifrs", label: "📊 IFRS / comptabilité" },
  { k: "business", label: "💼 Business" },
  { k: "daily", label: "🗓️ Quotidien" },
  { k: "notes", label: "📝 Mes notes" },
];
function QuickListSection({ audio, setAudio }) {
  const [q, setQ] = useState("");
  const [dom, setDom] = useState("");
  const [lvl, setLvl] = useState("");
  const [hide, setHide] = useState("");   // "" | "fr" | "en"
  const [revealed, setRevealed] = useState(() => new Set());
  const all = useMemo(() => {
    const out = [];
    (E_DATA.vocab || []).forEach((v) => out.push({ en: v.en, fr: v.fr, ipa: v.ipa, level: v.level, dom: v.domain }));
    ((E_DATA.my_notes || {}).sessions || []).forEach((s) => (s.categories || []).forEach((c) => (c.items || []).forEach((it) => out.push({ en: it.en, fr: it.fr, dom: "notes" }))));
    return out;
  }, []);
  const filtered = all.filter((w) => {
    if (dom && w.dom !== dom) return false;
    if (lvl && w.level !== lvl) return false;
    if (q) { const s = ((w.en || "") + " " + (w.fr || "")).toLowerCase(); if (!s.includes(q.toLowerCase())) return false; }
    return true;
  });
  const groups = QL_DOMS.map((d) => ({ d, items: filtered.filter((w) => w.dom === d.k).sort((a, b) => (a.en || "").localeCompare(b.en || "")) })).filter((g) => g.items.length);
  const toggleRow = (key) => { if (!hide) return; setRevealed((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; }); };
  const chip = (active, on) => `text-[12px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${active ? "bg-indigo-600 text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`;
  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4 mb-4">
        <h2 className="text-lg font-bold">⚡ Liste express — vocabulaire d'un coup d'œil</h2>
        <p className="text-[13px] text-indigo-100 mt-0.5">Tous les mots et leur traduction, sans phrases : lecture rapide. {all.length} entrées. Active « cacher » pour t'auto‑tester (clique un mot pour révéler).</p>
      </div>
      <div className="sticky top-[49px] z-[5] bg-slate-100/95 backdrop-blur py-2 rounded-xl mb-3 space-y-2">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <VoiceMini audio={audio} setAudio={setAudio} />
        </div>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un mot (EN ou FR)…" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-indigo-400" />
          {(q || dom || lvl) && <button onClick={() => { setQ(""); setDom(""); setLvl(""); }} className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold shrink-0">Réinit.</button>}
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <button onClick={() => setDom("")} className={chip(!dom)}>Tous</button>
          {QL_DOMS.map((d) => <button key={d.k} onClick={() => setDom(dom === d.k ? "" : d.k)} className={chip(dom === d.k)}>{d.label}</button>)}
          <span className="w-px h-5 bg-slate-300 mx-1" />
          {["A2", "B1", "B2"].map((L) => <button key={L} onClick={() => setLvl(lvl === L ? "" : L)} className={chip(lvl === L)}>{L}</button>)}
          <span className="w-px h-5 bg-slate-300 mx-1" />
          <button onClick={() => { setHide(hide === "fr" ? "" : "fr"); setRevealed(new Set()); }} className={chip(hide === "fr")}>🙈 Cacher FR</button>
          <button onClick={() => { setHide(hide === "en" ? "" : "en"); setRevealed(new Set()); }} className={chip(hide === "en")}>🙈 Cacher EN</button>
        </div>
        <div className="text-[11px] text-slate-500 font-medium">{filtered.length} mot{filtered.length > 1 ? "s" : ""}{hide ? " · clique un mot pour révéler" : ""}</div>
      </div>
      {groups.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">Aucun mot pour ce filtre.</div>
      ) : groups.map((g) => (
        <div key={g.d.k} className="mb-5">
          <div className="flex items-center gap-2 mb-1.5"><span className="font-bold text-[14px] text-slate-700">{g.d.label}</span><span className="text-[11px] text-indigo-500 font-bold bg-indigo-50 rounded-full px-2 py-0.5">{g.items.length}</span><span className="flex-1 h-px bg-slate-200" /></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-5">
            {g.items.map((w, i) => {
              const key = g.d.k + i;
              const rv = revealed.has(key);
              const maskFr = hide === "fr" && !rv, maskEn = hide === "en" && !rv;
              return (
                <div key={key} onClick={() => toggleRow(key)} className={`flex items-baseline justify-between gap-2 border-b border-slate-100 py-1 ${hide ? "cursor-pointer" : ""}`}>
                  <span className="min-w-0 flex items-center gap-1">
                    <span className={`font-semibold text-[13.5px] text-slate-800 ${maskEn ? "blur-[5px] select-none" : ""}`}>{w.en}</span>
                    {!maskEn && <SpeakBtn text={w.en} sm />}
                  </span>
                  <span className={`text-[13px] text-slate-500 text-right shrink-0 ${maskFr ? "blur-[5px] select-none" : ""}`}>{w.fr}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-2 text-center text-[11px] text-slate-400">Liste de lecture rapide — pour le détail (exemples, tips, prononciation), va dans « Vocabulaire » ou « Mes notes ».</div>
    </div>
  );
}

/* ════════ MEETING — l'anglais des réunions (EY / audit) ════════ */
const REGISTER = {
  formal: { label: "soutenu", color: "#2563eb", bg: "#eff6ff" },
  neutral: { label: "standard", color: "#64748b", bg: "#f8fafc" },
  informal: { label: "détendu", color: "#d97706", bg: "#fffbeb" },
};
function RegChip({ register }) {
  const r = REGISTER[register] || REGISTER.neutral;
  return <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border shrink-0" style={{ color: r.color, borderColor: r.color + "55", background: r.bg }}>{r.label}</span>;
}
function MeetingDialogue({ dlg, onBack }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2.5 mb-3.5">
        <button onClick={onBack} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">← Dialogues</button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-800">{dlg.title}</div>
          <div className="text-[11px] text-slate-400 truncate">{dlg.context}</div>
        </div>
        <LevelBadge level={dlg.level} />
      </div>
      {(dlg.turns || []).map((t, i) => {
        const style = SPEAKER_STYLES[t.speaker] || SPEAKER_STYLES.client;
        const mine = t.speaker === "you";
        return (
          <div key={i} className={"my-2 " + (mine ? "ml-8 text-right" : "mr-8")}>
            <div className="inline-block rounded-2xl px-3.5 py-2.5 max-w-[85%] border text-left" style={{ background: style.bg, borderColor: style.color + "55" }}>
              <div className="text-[10px] uppercase tracking-wide mb-1 flex items-center justify-between gap-2.5" style={{ color: style.color }}>
                <span>{style.icon} {t.name || t.speaker}</span>
                <button onClick={(e) => { e.stopPropagation(); speak(t.en); }} title="Écouter" className="text-[13px]">🔊</button>
              </div>
              <div className="text-[13px] leading-normal text-slate-800">{t.en}</div>
              {t.fr && <div className="text-[11px] leading-normal text-slate-500 mt-1.5 italic">{t.fr}</div>}
            </div>
            {t.note && <div className={"text-[10.5px] text-indigo-500 mt-1 " + (mine ? "mr-1" : "ml-1")}>💡 {t.note}</div>}
          </div>
        );
      })}
      <div className="text-center mt-4"><button onClick={onBack} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-[13px] hover:bg-slate-50">← Retour aux dialogues</button></div>
    </div>
  );
}
function MeetingSection({ audio, setAudio }) {
  const M = E_DATA.meeting || {};
  const funcs = M.functions || [];
  const [view, setView] = useState("situations");   // situations | glossaire | dialogues | conseils
  const [fn, setFn] = useState("");                  // filtre fonction
  const [q, setQ] = useState("");
  const [hideFr, setHideFr] = useState(false);
  const [revealed, setRevealed] = useState(() => new Set());
  const [dlgId, setDlgId] = useState(null);

  if (!funcs.length) return <div className="text-center text-sm text-slate-400 py-12">Contenu « Meeting » indisponible.</div>;

  const ql = q.trim().toLowerCase();
  const matchP = (p) => !ql || ((p.en || "") + " " + (p.fr || "") + " " + (p.note || "")).toLowerCase().includes(ql);
  const shown = funcs
    .filter((f) => !fn || f.id === fn)
    .map((f) => ({ ...f, phrases: (f.phrases || []).filter(matchP) }))
    .filter((f) => f.phrases.length);
  const totalShown = shown.reduce((a, f) => a + f.phrases.length, 0);
  const toggleReveal = (k) => { if (!hideFr) return; setRevealed((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; }); };
  const vBtn = (id, label) => (
    <button onClick={() => setView(id)}
      className={"px-3 py-1.5 rounded-lg text-[13px] font-semibold border transition-colors " + (view === id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300")}>{label}</button>
  );
  const chip = (active) => "text-[12px] font-semibold px-2.5 py-1 rounded-lg border transition-colors " + (active ? "bg-indigo-600 text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300");

  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 mb-4">
        <h2 className="text-lg font-bold">🗓️ Meeting — l'anglais des réunions</h2>
        <p className="text-[13px] text-indigo-100 mt-0.5">{M.meta && M.meta.intro}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {vBtn("situations", "💬 Par situation")}
        {vBtn("glossaire", "📖 Glossaire")}
        {vBtn("dialogues", "🎭 Dialogues d'audit")}
        {vBtn("conseils", "💡 Conseils")}
      </div>

      {view === "situations" && (
        <div>
          <div className="sticky top-[49px] z-[5] bg-slate-100/95 backdrop-blur py-2 rounded-xl mb-3 space-y-2">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <VoiceMini audio={audio} setAudio={setAudio} />
            </div>
            <div className="flex items-center gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une expression (EN ou FR)…" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-indigo-400" />
              <button onClick={() => { setHideFr(!hideFr); setRevealed(new Set()); }} className={chip(hideFr)}>🙈 Cacher FR</button>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <button onClick={() => setFn("")} className={chip(!fn)}>Tous ({funcs.reduce((a, f) => a + (f.phrases || []).length, 0)})</button>
              {funcs.map((f) => <button key={f.id} onClick={() => setFn(fn === f.id ? "" : f.id)} className={chip(fn === f.id)} title={f.label_en}>{f.icon} {f.label_fr}</button>)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">{totalShown} expression{totalShown > 1 ? "s" : ""}{hideFr ? " · clique une carte pour révéler le FR" : ""}</div>
          </div>
          {shown.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">Aucune expression pour ce filtre.</div>
          ) : shown.map((f) => (
            <div key={f.id} className="mb-5">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-bold text-[15px] text-slate-800">{f.icon} {f.label_fr}</span>
                <span className="text-[11px] text-slate-400 italic">{f.label_en}</span>
                <span className="text-[11px] text-indigo-500 font-bold bg-indigo-50 rounded-full px-2 py-0.5">{f.phrases.length}</span>
              </div>
              {f.intro && <p className="text-[12px] text-slate-500 leading-snug mb-2">{f.intro}</p>}
              <div className="grid md:grid-cols-2 gap-2">
                {f.phrases.map((p, i) => {
                  const key = f.id + i;
                  const masked = hideFr && !revealed.has(key);
                  return (
                    <div key={key} onClick={() => toggleReveal(key)} className={"bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 " + (hideFr ? "cursor-pointer hover:border-indigo-300" : "")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-[14px] text-slate-800 leading-snug">{p.en}</div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <RegChip register={p.register} />
                          <SpeakBtn text={p.en} title="Écouter" sm />
                        </div>
                      </div>
                      <div className={"text-[12.5px] text-slate-500 mt-1 " + (masked ? "blur-[5px] select-none" : "")}>{p.fr}</div>
                      {p.note && <div className="text-[11px] text-indigo-500 mt-1 leading-snug">💡 {p.note}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "glossaire" && (
        <div>
          <p className="text-[12px] text-slate-500 mb-3">Le jargon des réunions et de l'audit — {(M.glossary || []).length} termes. ⚠️ = faux-ami à connaître.</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {(M.glossary || []).map((g, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[13.5px] text-slate-800">{g.en}</span>
                  <SpeakBtn text={g.en} title="Écouter" sm />
                </div>
                <div className="text-[12.5px] text-slate-500">{g.fr}</div>
                {g.note && <div className="text-[11px] text-indigo-500 mt-1 leading-snug">💡 {g.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "dialogues" && (
        dlgId ? (
          <MeetingDialogue dlg={(M.dialogues || []).find((d) => d.id === dlgId)} onBack={() => setDlgId(null)} />
        ) : (
          <div>
            <p className="text-[12px] text-slate-500 mb-3">Deux réunions d'audit jouées de bout en bout, chaque réplique annotée (💡 = la technique illustrée). Écoute chaque ligne avec 🔊.</p>
            <div className="grid md:grid-cols-2 gap-3">
              {(M.dialogues || []).map((d) => (
                <div key={d.id} onClick={() => setDlgId(d.id)} className="bg-white rounded-xl border border-slate-200 hover:border-indigo-400 p-4 cursor-pointer transition-colors">
                  <div className="flex justify-between items-start gap-2.5">
                    <div className="text-[15px] text-slate-800 font-semibold mb-1.5">{d.title}</div>
                    <LevelBadge level={d.level} />
                  </div>
                  <div className="text-xs text-slate-500 leading-normal mb-2">{d.context}</div>
                  <div className="text-[11px] text-slate-400">🗣️ {(d.turns || []).length} répliques · ▶ Lire le dialogue</div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {view === "conseils" && (
        <div className="grid md:grid-cols-2 gap-3">
          {(M.tips || []).map((t, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-[14px] font-bold text-slate-800 mb-1.5">{t.icon} {t.title}</div>
              <div className="text-[12.5px] text-slate-600 leading-relaxed">{t.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════ TOEIC — cours (7 parties, scoring, stratégies) + vocabulaire thématique ════════ */
function ToeicPartCard({ p }) {
  const ans = (p.example && p.example.answer) || "";
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-[12px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200">{p.icon} {p.part}</span>
        <span className="font-bold text-[15px] text-slate-800">{p.title_fr}</span>
        <span className="text-[11px] text-slate-400 italic">{p.title_en}</span>
        <span className="text-[11px] text-indigo-500 font-semibold bg-indigo-50 rounded-full px-2 py-0.5 ml-auto">{p.count}</span>
      </div>
      <p className="text-[13px] text-slate-600 leading-snug mb-2">{p.what}</p>
      {(p.tips || []).length > 0 && (
        <ul className="space-y-1 mb-1">
          {p.tips.map((t, i) => <li key={i} className="text-[12.5px] text-slate-600 flex gap-1.5 leading-snug"><span className="text-rose-400 shrink-0">▸</span><span>{t}</span></li>)}
        </ul>
      )}
      {p.example && (
        <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
          <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Exemple</div>
          <div className="text-[13px] text-slate-700 font-medium mb-1.5">{p.example.q}</div>
          <div className="space-y-1">
            {(p.example.options || []).map((o, i) => {
              const ok = ans && o.replace(/[^A-D]/, "").charAt(0) === ans || o.startsWith("(" + ans + ")");
              return <div key={i} className={"text-[13px] px-2 py-1 rounded-md " + (ok ? "bg-emerald-100 text-emerald-800 font-semibold" : "text-slate-600")}>{o}{ok ? " ✓" : ""}</div>;
            })}
          </div>
          {p.example.why && <div className="text-[12px] text-indigo-600 mt-1.5 leading-snug">💡 {p.example.why}</div>}
        </div>
      )}
    </div>
  );
}
function ToeicSection({ audio, setAudio }) {
  const T = E_DATA.toeic || {};
  const [view, setView] = useState("test");   // test | vocab
  const themes = T.themes || [];
  const [th, setTh] = useState("");
  const [q, setQ] = useState("");
  const [hideFr, setHideFr] = useState(false);
  const [revealed, setRevealed] = useState(() => new Set());

  const parts = T.parts || [];
  const listening = parts.filter((p) => p.section === "listening");
  const reading = parts.filter((p) => p.section === "reading");
  const allWords = themes.reduce((a, t) => a + (t.words || []).length, 0);

  const ql = q.trim().toLowerCase();
  const matchW = (w) => !ql || ((w.en || "") + " " + (w.fr || "") + " " + (w.note || "")).toLowerCase().includes(ql);
  const shownThemes = themes
    .filter((t) => !th || t.id === th)
    .map((t) => ({ ...t, words: (t.words || []).filter(matchW) }))
    .filter((t) => t.words.length);
  const totalShown = shownThemes.reduce((a, t) => a + t.words.length, 0);
  const toggleReveal = (k) => { if (!hideFr) return; setRevealed((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; }); };

  const vBtn = (id, label) => (
    <button onClick={() => setView(id)} className={"px-3 py-1.5 rounded-lg text-[13px] font-semibold border transition-colors " + (view === id ? "bg-rose-600 text-white border-rose-600" : "bg-white text-slate-600 border-slate-200 hover:border-rose-300")}>{label}</button>
  );
  const chip = (active) => "text-[12px] font-semibold px-2.5 py-1 rounded-lg border transition-colors " + (active ? "bg-rose-600 text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:border-rose-300");

  if (!parts.length && !themes.length) return <div className="text-center text-sm text-slate-400 py-12">Contenu TOEIC indisponible.</div>;

  return (
    <div>
      <div className="rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 text-white p-4 mb-4">
        <h2 className="text-lg font-bold">🎓 TOEIC — préparation</h2>
        <p className="text-[13px] text-rose-50 mt-0.5">{T.meta && T.meta.intro}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {vBtn("test", "📖 Le test & stratégies")}
        {vBtn("vocab", "📚 Vocabulaire (" + allWords + ")")}
      </div>

      {view === "test" && (
        <div>
          {T.overview && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <p className="text-[13px] text-slate-600 leading-relaxed mb-3">{T.overview.blurb}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {(T.overview.facts || []).map((f, i) => (
                  <div key={i} className="flex gap-2 text-[12.5px]"><span className="font-semibold text-slate-700 min-w-[78px]">{f.k}</span><span className="text-slate-500">{f.v}</span></div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2"><span className="text-[13px] font-bold text-blue-700">🎧 Listening</span><span className="text-[11px] text-slate-400">100 questions · ~45 min</span><span className="flex-1 h-px bg-slate-200" /></div>
          <div className="grid md:grid-cols-2 gap-3 mb-4">{listening.map((p, i) => <ToeicPartCard key={i} p={p} />)}</div>
          <div className="flex items-center gap-2 mb-2"><span className="text-[13px] font-bold text-emerald-700">📖 Reading</span><span className="text-[11px] text-slate-400">100 questions · 75 min</span><span className="flex-1 h-px bg-slate-200" /></div>
          <div className="grid md:grid-cols-2 gap-3 mb-4">{reading.map((p, i) => <ToeicPartCard key={i} p={p} />)}</div>

          {T.scoring && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
              <div className="text-[14px] font-bold text-slate-800 mb-1.5">🎯 Score & niveaux</div>
              <p className="text-[12.5px] text-slate-600 leading-snug mb-2.5">{T.scoring.blurb}</p>
              <div className="space-y-1.5 mb-2.5">
                {(T.scoring.bands || []).map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-[12.5px]">
                    <span className="font-bold text-rose-600 min-w-[88px]">{b.score}</span>
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded border border-slate-300 text-slate-500 min-w-[34px] text-center">{b.cefr}</span>
                    <span className="text-slate-500">{b.desc}</span>
                  </div>
                ))}
              </div>
              {(T.scoring.tips || []).map((t, i) => <div key={i} className="text-[12px] text-slate-500 flex gap-1.5 leading-snug"><span className="text-rose-400">▸</span><span>{t}</span></div>)}
            </div>
          )}

          <div className="text-[14px] font-bold text-slate-800 mb-2">🧭 Stratégies qui font gagner des points</div>
          <div className="grid md:grid-cols-2 gap-3">
            {(T.strategy || []).map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-[14px] font-bold text-slate-800 mb-1">{s.icon} {s.title}</div>
                <div className="text-[12.5px] text-slate-600 leading-relaxed">{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "vocab" && (
        <div>
          <div className="sticky top-[49px] z-[5] bg-slate-100/95 backdrop-blur py-2 rounded-xl mb-3 space-y-2">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <VoiceMini audio={audio} setAudio={setAudio} />
            </div>
            <div className="flex items-center gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un mot TOEIC (EN ou FR)…" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-rose-400" />
              <button onClick={() => { setHideFr(!hideFr); setRevealed(new Set()); }} className={chip(hideFr)}>🙈 Cacher FR</button>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <button onClick={() => setTh("")} className={chip(!th)}>Tous ({allWords})</button>
              {themes.map((t) => <button key={t.id} onClick={() => setTh(th === t.id ? "" : t.id)} className={chip(th === t.id)} title={t.label_en}>{t.icon} {t.label_fr}</button>)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">{totalShown} mot{totalShown > 1 ? "s" : ""}{hideFr ? " · clique une carte pour révéler" : ""}</div>
          </div>
          {shownThemes.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">Aucun mot pour ce filtre.</div>
          ) : shownThemes.map((t) => (
            <div key={t.id} className="mb-5">
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="font-bold text-[15px] text-slate-800">{t.icon} {t.label_fr}</span>
                <span className="text-[11px] text-slate-400 italic">{t.label_en}</span>
                <span className="text-[11px] text-rose-500 font-bold bg-rose-50 rounded-full px-2 py-0.5">{t.words.length}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-2">
                {t.words.map((w, i) => {
                  const key = t.id + i;
                  const masked = hideFr && !revealed.has(key);
                  return (
                    <div key={key} onClick={() => toggleReveal(key)} className={"bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 " + (hideFr ? "cursor-pointer hover:border-rose-300" : "")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-[14px] text-slate-800 leading-snug">{w.en}</div>
                        <SpeakBtn text={w.en} title="Écouter" sm />
                      </div>
                      <div className={"text-[12.5px] text-slate-500 mt-0.5 " + (masked ? "blur-[5px] select-none" : "")}>{w.fr}</div>
                      {w.note && <div className="text-[11px] text-rose-500 mt-1 leading-snug">💡 {w.note}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Mini-Anki sur « Mes notes » : flip 3D + file « à revoir / acquis » ── */
function NotesFlashcards({ items, audio, onExit }) {
  const [queue, setQueue] = useState(() => shuffle(items.map((_, i) => i)));
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [seen, setSeen] = useState(0);
  const [dir, setDir] = useState("fr2en");   // fr2en (prod.) | en2fr (compréhension)
  const total = items.length;
  const card = queue.length ? items[queue[0]] : null;

  const flip = () => setFlipped((f) => {
    const nf = !f;
    if (nf && audio && audio.autoplay && card) setTimeout(() => speak(card.en), 200);
    return nf;
  });
  const grade = (wasKnown) => {
    if (!card) return;
    setSeen((s) => s + 1);
    setFlipped(false);
    setQueue((q) => {
      const [head, ...rest] = q;
      if (wasKnown) { setKnown((k) => k + 1); return rest; }
      return rest.concat([head]);   // « à revoir » → repart en fin de file
    });
  };
  const restart = () => { setQueue(shuffle(items.map((_, i) => i))); setFlipped(false); setKnown(0); setSeen(0); };

  useEffect(() => {
    const h = (e) => {
      const t = document.activeElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === " " || e.code === "Space") { e.preventDefault(); flip(); }
      else if (flipped && (e.key === "1")) { e.preventDefault(); grade(false); }
      else if (flipped && (e.key === "2")) { e.preventDefault(); grade(true); }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  });

  if (!total) return <div className="text-center text-sm text-slate-400 py-12">Aucun mot à réviser.</div>;

  const dirBtn = (id, label) => (
    <button onClick={() => { setDir(id); setFlipped(false); }} className={"text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-colors " + (dir === id ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-300 text-slate-500 hover:text-slate-700")}>{label}</button>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3.5 flex-wrap">
        <button onClick={onExit} className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">← Liste</button>
        <span className="text-[13px] text-slate-500 font-semibold">🎴 Révision · {known}/{total} acquis</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400">Sens</span>
          {dirBtn("fr2en", "FR → EN")}
          {dirBtn("en2fr", "EN → FR")}
          <button onClick={restart} className="text-[11px] px-2.5 py-1 rounded-full border border-slate-300 text-slate-500 hover:text-slate-700">↻ Recommencer</button>
        </span>
      </div>
      <div className="max-w-2xl mx-auto mb-3"><ProgressBar pct={total ? (known / total) * 100 : 0} color="#10b981" /></div>

      {!card ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center max-w-md mx-auto">
          <div className="text-3xl mb-2">🎉</div>
          <div className="text-lg font-bold text-slate-800 mb-1">Tous les mots sont acquis !</div>
          <div className="text-sm text-slate-500 mb-4">{total} mot{total > 1 ? "s" : ""} révisé{total > 1 ? "s" : ""} en {seen} carte{seen > 1 ? "s" : ""}.</div>
          <div className="flex gap-2 justify-center">
            <button onClick={restart} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-500">↻ Recommencer</button>
            <button onClick={onExit} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-[13px] hover:bg-slate-50">Retour à la liste</button>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-center text-[11px] text-slate-400 mb-2">Restantes : {queue.length}</div>
          <div className="eflip-wrap" onClick={flip}>
            <div className={"eflip" + (flipped ? " flipped" : "")}>
              <div className="eface">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200 mb-3">📝 Mes notes</span>
                <div className="text-[27px] font-bold text-slate-800 leading-snug mb-2">{dir === "fr2en" ? card.fr : card.en}</div>
                {dir === "en2fr" && <SpeakBtn text={card.en} title="Écouter" sm />}
                <div className="text-xs text-slate-400 mt-3">Cliquer ou Espace pour retourner</div>
              </div>
              <div className="eface back">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-[23px] font-semibold text-indigo-600 leading-snug">{card.en}</div>
                  <SpeakBtn text={card.en} title="Écouter en anglais" />
                </div>
                <div className="text-[16px] text-slate-700 font-medium mb-1">{card.fr}</div>
                {card.ex && (
                  <div className="text-left max-w-lg w-full mt-2 px-2.5 py-2 rounded-md bg-indigo-50/50 border-l-2 border-indigo-400">
                    <div className="flex items-start gap-2">
                      <span className="text-[13px] text-indigo-600 italic flex-1">“{card.ex}”</span>
                      <SpeakBtn text={card.ex} title="Écouter la phrase" sm />
                    </div>
                    {card.ex_fr && <div className="text-[12px] text-slate-500 mt-1">{card.ex_fr}</div>}
                  </div>
                )}
                {card.tip && <div className="text-[12px] text-violet-900 bg-violet-50/70 border border-violet-100 rounded-lg px-3 py-2 mt-2 text-left max-w-lg leading-relaxed">💡 <NotesBold text={card.tip} /></div>}
              </div>
            </div>
          </div>
          {flipped && (
            <div className="max-w-2xl mx-auto mt-4 flex justify-center gap-2 flex-wrap">
              <button onClick={(e) => { e.stopPropagation(); grade(false); }} className="min-w-[140px] px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-transform hover:scale-[1.03]">🔁 À revoir<br /><span className="text-[10px] opacity-75 font-normal">touche 1</span></button>
              <button onClick={(e) => { e.stopPropagation(); grade(true); }} className="min-w-[140px] px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-transform hover:scale-[1.03]">✅ Acquis<br /><span className="text-[10px] opacity-75 font-normal">touche 2</span></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MyNotesSection({ audio }) {
  const notes = (E_DATA.my_notes && E_DATA.my_notes.sessions) || [];
  const [q, setQ] = useState("");
  const [test, setTest] = useState(false);
  const [anki, setAnki] = useState(false);
  const query = q.trim().toLowerCase();
  const total = notes.reduce((a, s) => a + (s.categories || []).reduce((b, c) => b + (c.items || []).length, 0), 0);
  const allItems = notes.flatMap((s) => (s.categories || []).flatMap((c) => c.items || []));
  const match = (it) => !query || (it.en + " " + it.fr + " " + (it.ex || "") + " " + (it.tip || "")).toLowerCase().includes(query);
  if (!notes.length) return <div className="text-center text-sm text-slate-400 py-12">Pas encore de notes — envoie ta première fournée !</div>;
  if (anki) return <NotesFlashcards items={allItems} audio={audio} onExit={() => setAnki(false)} />;
  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-4 shadow-sm flex items-start gap-4">
        <span className="text-2xl w-12 h-12 flex items-center justify-center rounded-2xl bg-indigo-500 text-white shadow-sm shrink-0">📝</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-slate-800 leading-tight">Mes notes</h2>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">Ton vocabulaire personnel ({total} entrées · {notes.length} session{notes.length > 1 ? "s" : ""}), enrichi d'exemples professionnels et d'astuces. Nouvelle fournée de notes → elle s'ajoute ici.</p>
        </div>
        <div className="shrink-0 flex flex-col gap-2">
          <button onClick={() => setAnki(true)} className="px-3.5 py-2 rounded-lg text-xs font-bold border bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500 transition-colors">🎴 Réviser (Anki)</button>
          <button onClick={() => setTest(!test)} className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors ${test ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}>{test ? "👁 Test ON" : "👁 Mode test"}</button>
        </div>
      </div>
      <div className="relative mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un mot, une traduction, un exemple…"
          className="w-full pl-4 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white" />
      </div>
      {test && <div className="text-xs text-slate-400 mb-3">Mode test : les traductions sont masquées — clique « 👁 Voir la traduction » pour vérifier ta réponse.</div>}
      {notes.map((s) => {
        const cats = (s.categories || []).map((c) => ({ ...c, items: (c.items || []).filter(match) })).filter((c) => c.items.length);
        if (!cats.length && query) return null;
        return (
          <div key={s.id} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">📒 {s.source || s.id}</span>
              {s.date && <span className="text-[11px] text-slate-300">· {s.date}</span>}
              <span className="flex-1 h-px bg-slate-200"></span>
            </div>
            {cats.map((c) => (
              <div key={c.id} className="mb-4">
                <div className="text-sm font-bold text-slate-700 mb-2">{c.icon || "📌"} {c.label} <span className="text-slate-400 font-normal">({c.items.length})</span></div>
                <div className="grid sm:grid-cols-2 gap-2">{c.items.map((it, i) => <MyNoteCard key={(test ? "t" : "l") + i + (it.en || "")} item={it} test={test} />)}</div>
              </div>
            ))}
            {!query && (s.corrections || []).length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 mt-1">
                <div className="text-xs font-bold text-amber-800 mb-1.5">✍️ Corrections de tes notes manuscrites</div>
                <ul className="space-y-1">{s.corrections.map((x, i) => <li key={i} className="text-xs text-amber-900 leading-relaxed flex gap-2"><span className="shrink-0">•</span><span><NotesBold text={x} /></span></li>)}</ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ════════ App ════════ */
function EnglishApp() {
  const VALID = ["essentials", "mynotes", "liste", "meeting", "toeic", "vocab", "phrases", "fs", "constructor", "dictation", "conversations", "videos", "writing"];
  const hashSection = (typeof location !== "undefined" && location.hash || "").replace("#", "");
  const initial = VALID.includes(hashSection) ? hashSection : (() => { try { return localStorage.getItem(LS_SUBTAB) || "vocab"; } catch (e) { return "vocab"; } })();
  const [section, setSectionRaw] = useState(VALID.includes(initial) ? initial : "vocab");
  const setSection = (s) => { setSectionRaw(s); try { localStorage.setItem(LS_SUBTAB, s); } catch (e) {} window.scrollTo(0, 0); };

  /* État persistant — MÊMES clés que l'ancien onglet */
  const [progress, setProgress] = useState(() => lsGet(LS_PROGRESS, {}));
  const [allFilters, setAllFilters] = useState(() => {
    const f = lsGet(LS_FILTERS, {});
    return {
      vocab: Object.assign({ domain: null, level: null, neverSeen: false, overdue: false }, f.vocab || {}),
      phrases: Object.assign({ category: null, search: "" }, f.phrases || {}),
    };
  });
  const [audio, setAudioRaw] = useState(() => Object.assign({ voice: "en-GB", voiceName: "", autoplay: false, rate: 0.95, engine: "edge", edgeVoice: "en-GB-SoniaNeural" }, lsGet(LS_AUDIO, {})));
  const [deleted, setDeleted] = useState(() => lsGet(LS_DELETED, {}));
  const [videosWatched, setVideosWatched] = useState(() => lsGet(LS_VIDEOS, {}));
  const [essentialsDone, setEssentialsDone] = useState(() => lsGet(LS_ESSENTIALS, {}));
  /* État de session (non persisté, comme avant) */
  const [writing, setWriting] = useState({ text: "", result: null });
  const [constructorScore, setConstructorScore] = useState({ total: 0, correct: 0 });
  const [fsView, setFsView] = useState("income");
  const [phraseSession, setPhraseSession] = useState(null);

  useEffect(() => { _audioCfg = { voice: audio.voice, voiceName: audio.voiceName, rate: audio.rate, engine: audio.engine, edgeVoice: audio.edgeVoice }; }, [audio]);
  const setAudio = (a) => { setAudioRaw(a); lsSet(LS_AUDIO, a); };
  const setVocabFilters = (v) => { const n = { ...allFilters, vocab: v }; setAllFilters(n); lsSet(LS_FILTERS, n); };
  const setPhrasesFilters = (p) => { const n = { ...allFilters, phrases: p }; setAllFilters(n); lsSet(LS_FILTERS, n); };

  /* deep-link #section (depuis navigate('english', sub) du parent) */
  useEffect(() => {
    const onHash = () => { const h = (location.hash || "").replace("#", ""); if (VALID.includes(h)) setSection(h); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /* Progression : port exact de engUpdateProgress + sync bridge best-effort */
  const onRate = (cardId, rating) => {
    rating = Math.max(0, Math.min(3, parseInt(rating, 10) || 0));
    setProgress((prev) => {
      const p = Object.assign({ review_count: 0, correct: 0, wrong: 0, mastery: "not_started", last_reviewed: null, next_review: null }, prev[cardId]);
      p.review_count++;
      if (rating === 0) p.wrong++; else p.correct++;
      if (rating === 0) p.mastery = "again";
      else if (rating === 1) p.mastery = "learning";
      else if (rating === 2) p.mastery = "good";
      else if (rating === 3) p.mastery = "mastered";
      const now = Date.now();
      p.last_reviewed = new Date(now).toISOString();
      p.next_review = new Date(now + ([0, 1, 3, 7][rating] || 1) * 24 * 3600 * 1000).toISOString();
      const next = { ...prev, [cardId]: p };
      lsSet(LS_PROGRESS, next);
      return next;
    });
    bridgeCall("record_english_attempt", cardId, rating).catch(() => {});
  };
  const onDelete = (id) => {
    const next = { ...deleted, [id]: new Date().toISOString() };
    setDeleted(next); lsSet(LS_DELETED, next);
  };
  const onRestoreAll = () => {
    const n = Object.keys(deleted).length;
    if (!n) return;
    if (!window.confirm("Restaurer les " + n + " carte(s) supprimée(s) ?")) return;
    setDeleted({}); lsSet(LS_DELETED, {});
  };
  const toggleVideo = (id) => {
    const next = { ...videosWatched };
    if (next[id]) delete next[id]; else next[id] = new Date().toISOString();
    setVideosWatched(next); lsSet(LS_VIDEOS, next);
  };
  const openVideo = (id, url) => {
    const next = { ...videosWatched, [id]: new Date().toISOString() };
    setVideosWatched(next); lsSet(LS_VIDEOS, next);
    try { window.open(url, "_blank", "noopener,noreferrer"); } catch (e) {}
  };
  const toggleEssential = (id) => {
    const next = { ...essentialsDone };
    if (next[id]) delete next[id]; else next[id] = new Date().toISOString();
    setEssentialsDone(next); lsSet(LS_ESSENTIALS, next);
  };
  const startPhraseFlashcards = (pool, label) => {
    if (!pool.length) return;
    setPhraseSession({ pool, label });
    setSection("vocab");
  };

  const D = E_DATA;
  const tabs = [
    { id: "essentials", icon: "🎯", label: "Day-1 EY" },
    { id: "mynotes", icon: "📝", label: "Mes notes" },
    { id: "liste", icon: "⚡", label: "Liste express" },
    { id: "meeting", icon: "🗓️", label: "Meeting" },
    { id: "toeic", icon: "🎓", label: "TOEIC" },
    { id: "vocab", icon: "📚", label: "Vocabulaire" },
    { id: "phrases", icon: "💬", label: "Phrases & expressions" },
    { id: "fs", icon: "📊", label: "États financiers" },
    { id: "constructor", icon: "🏗️", label: "Constructeur" },
    { id: "dictation", icon: "🎧", label: "Dictée" },
    { id: "conversations", icon: "🎙️", label: "Conversations" },
    { id: "videos", icon: "🎬", label: "Vidéos YouTube" },
    { id: "writing", icon: "✍️", label: "Écriture" },
  ];
  const subtitle = "A2→B2 · " + (D.essentials || []).length + " essentiels · " + (D.vocab || []).length + " mots · "
    + (D.phrases || []).length + " phrases · " + (D.patterns || []).length + " patterns · "
    + (D.conversations || []).length + " conversations · " + (D.videos || []).length + " vidéos";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center gap-3 flex-wrap">
          <Languages size={26} className="text-indigo-300" />
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-lg font-bold">🇬🇧 Anglais — préparation EY</h1>
            <p className="text-xs text-indigo-200">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-white/10 rounded-lg px-3 py-1.5 font-medium">🎯 {Object.keys(essentialsDone).length}/{(D.essentials || []).length} Day-1</span>
            <span className="bg-white/10 rounded-lg px-3 py-1.5 font-medium">🎬 {Object.keys(videosWatched).length}/{(D.videos || []).length} vues</span>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-2 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setPhraseSession(null); setSection(t.id); }}
              className={"flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors " +
                (section === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800")}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {section !== "liste" && section !== "meeting" && section !== "toeic" && (
          <div className="sticky top-[49px] z-[8] -mx-4 px-4 py-2 bg-slate-100/95 backdrop-blur border-b border-slate-200 mb-4">
            <VoiceMini audio={audio} setAudio={setAudio} />
          </div>
        )}
        {section === "essentials" && <EssentialsSection done={essentialsDone} onToggle={toggleEssential} />}
        {section === "mynotes" && <MyNotesSection audio={audio} />}
        {section === "liste" && <QuickListSection audio={audio} setAudio={setAudio} />}
        {section === "meeting" && <MeetingSection audio={audio} setAudio={setAudio} />}
        {section === "toeic" && <ToeicSection audio={audio} setAudio={setAudio} />}
        {section === "vocab" && (
          <VocabSection progress={progress} onRate={onRate}
            filters={allFilters.vocab} setFilters={setVocabFilters}
            deleted={deleted} onDelete={onDelete} onRestoreAll={onRestoreAll}
            audio={audio} phraseSession={phraseSession}
            onExitPhraseSession={() => { setPhraseSession(null); setSection("phrases"); }} />
        )}
        {section === "phrases" && (
          <PhrasesSection filters={allFilters.phrases} setFilters={setPhrasesFilters}
            deleted={deleted} onStartFlashcards={startPhraseFlashcards} />
        )}
        {section === "fs" && <FsSection fsView={fsView} setFsView={setFsView} />}
        {section === "constructor" && <ConstructorSection score={constructorScore} setScore={setConstructorScore} />}
        {section === "dictation" && <DictationSection deleted={deleted} audio={audio} />}
        {section === "conversations" && <ConversationsSection audio={audio} />}
        {section === "videos" && <VideosSection watched={videosWatched} onToggle={toggleVideo} onOpen={openVideo} />}
        {section === "writing" && <WritingSection writing={writing} setWriting={setWriting} />}
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-slate-400">
        Progression et préférences sauvegardées localement (mêmes données que l'ancien onglet) — correction d'écriture via le bridge desktop.
      </footer>
    </div>
  );
}
