/* ═══════════════════════════════════════════════
   Swiss CPA Revision — SPA Router & Navigation
   ═══════════════════════════════════════════════ */

// Global state
let currentTab = 'dashboard';
let currentSubTab = null;
let apiReady = false;

// Category color map
const COLORS = {
    "Swiss GAAP RPC": { bg: "#1a365d", light: "#ebf4ff", accent: "#3182ce", border: "#bee3f8" },
    "IFRS / IAS":     { bg: "#22543d", light: "#f0fff4", accent: "#38a169", border: "#c6f6d5" },
    "Audit / ISA":    { bg: "#553c9a", light: "#faf5ff", accent: "#805ad5", border: "#e9d8fd" },
    "Fiscalité":      { bg: "#9c4221", light: "#fffaf0", accent: "#dd6b20", border: "#feebc8" },
    "CO":             { bg: "#78350f", light: "#fef3c7", accent: "#b45309", border: "#fef3c7" },
    "Consolidation":  { bg: "#1e3a5f", light: "#dbeafe", accent: "#3b82f6", border: "#dbeafe" },
    "Restructuration":{ bg: "#065f46", light: "#d1fae5", accent: "#10b981", border: "#d1fae5" },
    "Droit":          { bg: "#4a1d6e", light: "#f3e8ff", accent: "#9333ea", border: "#e9d5ff" },
    "TVA":            { bg: "#713f12", light: "#fef9c3", accent: "#ca8a04", border: "#fef08a" },
    "IT":             { bg: "#164e63", light: "#cffafe", accent: "#06b6d4", border: "#a5f3fc" },
};

// Module color map
const MODULE_COLORS = {
    'M1': '#3b82f6', 'M2': '#8b5cf6', 'M3': '#3182ce', 'M4': '#38a169',
    'M5': '#805ad5', 'M6': '#9333ea', 'M7': '#dd6b20', 'M8': '#ca8a04',
    'M9': '#06b6d4', 'M10': '#ec4899', 'M11': '#3b82f6', 'M12': '#6366f1',
    'M13': '#84cc16', 'M14': '#f97316', 'M15': '#ef4444', 'M16': '#14b8a6',
};

function getColor(cat) {
    return COLORS[cat] || { bg: "#1e293b", light: "#f1f5f9", accent: "#64748b", border: "#94a3b8" };
}

function getModuleColor(code) {
    return MODULE_COLORS[code] || '#64748b';
}

// Wait for pywebview API
function waitForApi() {
    return new Promise((resolve) => {
        if (window.pywebview && window.pywebview.api) {
            apiReady = true;
            resolve();
            return;
        }
        const interval = setInterval(() => {
            if (window.pywebview && window.pywebview.api) {
                clearInterval(interval);
                apiReady = true;
                resolve();
            }
        }, 100);
        setTimeout(() => {
            clearInterval(interval);
            console.warn('pywebview API not found — running in demo mode');
            resolve();
        }, 5000);
    });
}

// API wrapper
async function api(method, ...args) {
    if (window.pywebview && window.pywebview.api) {
        try {
            return await window.pywebview.api[method](...args);
        } catch (e) {
            console.error(`API error (${method}):`, e);
            return null;
        }
    }
    console.warn(`API not available: ${method}`);
    return null;
}

// ── Navigation ──

// Tab labels kept at module scope so both navigate() and the a11y
// announcement helper can reuse them.
const TAB_LABELS = {
    dashboard: 'Accueil', modules: 'Modules', trainer: '🎯 Entraînement',
    fcdb: '🃏 BDD Flashcards', qcm: '❓ QCM', compare: 'Comparaisons', progress: 'Stats',
    fs: 'États Financiers', references: 'Références',
    audit: '🔍 Audit',
    english: '🇬🇧 Anglais',
    podcasts: '🎧 Podcasts',
    flashcards: 'Flashcards' // legacy redirect
};

function announce(msg) {
    const live = document.getElementById('srStatus');
    if (live) live.textContent = msg;
}

function navigate(tab, subTab) {
    currentTab = tab;
    currentSubTab = subTab || null;

    // Update tab bar + ARIA state
    document.querySelectorAll('.tab-bar .tab').forEach(t => {
        const isActive = t.dataset.tab === tab;
        t.classList.toggle('active', isActive);
        if (isActive) t.setAttribute('aria-current', 'page');
        else t.removeAttribute('aria-current');
    });

    // Show/hide sub-tabs
    const subBar = document.getElementById('subTabBar');
    if (tab === 'references') {
        subBar.classList.remove('hidden');
        renderRefSubTabs(subTab);
    } else {
        subBar.classList.add('hidden');
    }

    // Render content
    const main = document.getElementById('mainContent');
    main.setAttribute('aria-busy', 'true');
    main.innerHTML = '<div class="text-center" style="padding:60px"><div class="page-title">Chargement...</div></div>';
    // Full-width pages remove the 1400px cap
    const fullWidthTabs = ['modules', 'fs'];
    const widthClass = fullWidthTabs.includes(tab) ? ' full-width' : '';
    main.className = 'main-content fade-in' + widthClass;
    void main.offsetWidth;

    // Move keyboard focus into the main region so screen readers land there.
    try { main.focus({ preventScroll: false }); } catch (_) { main.focus(); }

    // Announce the page change to assistive tech.
    announce('Page : ' + (TAB_LABELS[tab] || tab));

    localStorage.setItem('swisscpa_last_ctx', JSON.stringify({
        tab, sub: subTab || null, label: TAB_LABELS[tab] || tab
    }));

    switch (tab) {
        case 'dashboard': renderDashboard(main); break;
        case 'modules': renderModules(main); break;
        case 'compare': renderComparisons(main); break;
        case 'fs': renderFsExplorer(main); break;
        case 'fcdb': renderFcdb(main); break;
        case 'flashcards': renderFlashcards(main); break; // legacy
        case 'references': renderReferences(main, subTab); break;
        case 'progress': renderProgress(main); break;
        case 'qcm': renderQcm(main); break;
        case 'trainer': renderTrainer(main); break;
        case 'audit': renderAudit(main, subTab); break;
        case 'english':
            if (typeof renderEnglish === 'function') renderEnglish(main, subTab);
            else main.innerHTML = '<p style="padding:40px;color:#94a3b8">Module Anglais en cours de chargement...</p>';
            break;
        case 'podcasts':
            if (typeof renderPodcasts === 'function') renderPodcasts(main);
            else main.innerHTML = '<p style="padding:40px;color:#94a3b8">Module Podcasts en cours de chargement...</p>';
            break;
        default: main.innerHTML = '<p>Page inconnue.</p>';
    }

    // Most renderers are synchronous or settle within the next frame.
    // Clearing aria-busy after a micro-tick is enough for AT to resync.
    setTimeout(() => main.setAttribute('aria-busy', 'false'), 120);

    // Met à jour la barre de zoom globale en bas-droite : visible uniquement
    // sur les onglets qui ont une cible de zoom (modules / qcm / fcdb).
    if (typeof updateAppZoomBar === 'function') updateAppZoomBar();

    hideSearchResults();
}

// ── Barre de zoom globale ────────────────────────────────────────────
// Zoome le contenu principal de l'app, peu importe l'onglet.
// On garde un sélecteur unique pour que le niveau soit cohérent partout.
const APP_ZOOM_SELECTOR = '#mainContent';

function updateAppZoomBar() {
    const bar = document.getElementById('appZoomBar');
    if (!bar) return;
    bar.style.display = 'flex';
    // Re-applique le zoom mémorisé sur le contenu courant.
    if (typeof window.appZoomApply === 'function') {
        setTimeout(() => window.appZoomApply(APP_ZOOM_SELECTOR), 80);
    }
}

function appZoomTabStep(dir) {
    if (typeof window.appZoomStep !== 'function') return;
    window.appZoomStep(dir, APP_ZOOM_SELECTOR);
}

function appZoomTabReset() {
    if (typeof window.appZoomReset !== 'function') return;
    window.appZoomReset(APP_ZOOM_SELECTOR);
}

function renderRefSubTabs(active) {
    const tabs = [
        { id: 'glossary', label: 'Vocabulaire' },
        { id: 'seuils', label: 'Seuils' },
        { id: 'cas', label: 'Cas Chiffrés' },
        { id: 'arbres', label: 'Arbres' },
        { id: 'terrain', label: 'Terrain EY' },
    ];
    const bar = document.getElementById('subTabBar');
    bar.innerHTML = '<span style="font-size:13px;color:#94a3b8;padding:6px 0">📚 Références ›</span>' +
        tabs.map(t =>
            `<button class="sub-tab ${(active || 'courses') === t.id ? 'active' : ''}" onclick="navigate('references','${t.id}')">${t.label}</button>`
        ).join('');
}

// ── Init ──

document.addEventListener('DOMContentLoaded', async () => {
    await waitForApi();
    navigate('dashboard');

    // "Reprends ici" banner — restore last context
    setTimeout(() => {
        const lastCtx = JSON.parse(localStorage.getItem('swisscpa_last_ctx') || 'null');
        if (lastCtx && lastCtx.tab && lastCtx.tab !== 'dashboard') {
            const banner = document.createElement('div');
            banner.id = 'reprendsBanner';
            banner.style.cssText = 'position:fixed;top:52px;right:16px;background:#1e3a5f;border:1px solid #3b82f6;border-radius:10px;padding:10px 16px;font-size:13px;color:#93c5fd;z-index:200;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;align-items:center;gap:10px';
            banner.innerHTML = `<span>↩ Reprendre : <strong>${lastCtx.label}</strong></span><button onclick="document.getElementById('reprendsBanner')?.remove()" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:16px;line-height:1;padding:0">×</button>`;
            banner.onclick = (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    navigate(lastCtx.tab, lastCtx.sub);
                    banner.remove();
                }
            };
            document.body.appendChild(banner);
            setTimeout(() => banner?.remove(), 8000);
        }
    }, 600);

    // Mind dump floating button
    const dumpBtn = document.createElement('button');
    dumpBtn.id = 'mindDumpBtn';
    dumpBtn.style.cssText = 'position:fixed;bottom:20px;left:20px;z-index:300;background:#1e3a5f;border:1px solid #3b82f6;border-radius:50%;width:44px;height:44px;font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center';
    dumpBtn.textContent = '💭';
    dumpBtn.title = 'Décharge mentale (Ctrl+D)';
    dumpBtn.onclick = toggleMindDump;
    document.body.appendChild(dumpBtn);

    // Pomodoro floating button (AM1)
    const pomoBtn = document.createElement('button');
    pomoBtn.id = 'pomoBtn';
    pomoBtn.style.cssText = 'position:fixed;bottom:20px;left:74px;z-index:300;background:#3f1212;border:1px solid #dc2626;border-radius:50%;width:44px;height:44px;font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center';
    pomoBtn.textContent = '🍅';
    pomoBtn.title = 'Pomodoro (Ctrl+T) — 20 min focus / 5 min pause';
    pomoBtn.onclick = togglePomodoro;
    document.body.appendChild(pomoBtn);
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
        hideSearchResults();
    }
});

// ── Theme toggle ──

function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('swisscpa_theme', isLight ? 'light' : 'dark');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = isLight ? '🌙' : '☀️';
}

// Restore saved theme
(function() {
    const saved = localStorage.getItem('swisscpa_theme');
    if (saved === 'light') {
        document.body.classList.add('light-mode');
        setTimeout(() => {
            const btn = document.getElementById('themeToggle');
            if (btn) btn.textContent = '🌙';
        }, 50);
    }
})();

// ── Trainer launch ──

async function fcLaunchDue() {
    navigate('trainer');
    setTimeout(() => {
        if (typeof startTrainerSprint === 'function') startTrainerSprint();
    }, 400);
}

// ── Mind Dump ──

function toggleMindDump() {
    let panel = document.getElementById('mindDumpPanel');
    if (panel) { panel.remove(); return; }
    panel = document.createElement('div');
    panel.id = 'mindDumpPanel';
    panel.style.cssText = 'position:fixed;bottom:74px;left:20px;z-index:300;background:#0f172a;border:1px solid #1e3a5f;border-radius:12px;padding:14px;width:290px;box-shadow:0 4px 20px rgba(0,0,0,0.7)';
    panel.innerHTML = `
        <div style="font-size:12px;color:#64748b;margin-bottom:8px">💭 Décharge mentale — vide ton cerveau, reviens après</div>
        <textarea id="mindDumpText" placeholder="Écris ce qui t'occupe l'esprit..."
            style="width:100%;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:8px;font-size:12px;resize:none;height:90px;font-family:inherit;box-sizing:border-box" autofocus></textarea>
        <button onclick="saveMindDump()" style="width:100%;margin-top:8px;background:#1e3a5f;border:1px solid #3b82f6;color:#93c5fd;border-radius:6px;padding:7px;font-size:12px;cursor:pointer">
            ✓ Noté — retour à la révision
        </button>`;
    document.body.appendChild(panel);
    setTimeout(() => document.getElementById('mindDumpText')?.focus(), 50);
}

function saveMindDump() {
    const text = document.getElementById('mindDumpText')?.value || '';
    if (text.trim()) {
        const dumps = JSON.parse(localStorage.getItem('swisscpa_mindDumps') || '[]');
        dumps.push({ time: new Date().toISOString(), text: text.trim() });
        localStorage.setItem('swisscpa_mindDumps', JSON.stringify(dumps.slice(-50)));
    }
    document.getElementById('mindDumpPanel')?.remove();
}

// ── Global keyboard shortcuts ──

document.addEventListener('keydown', (e) => {
    // Ctrl+Q = Trainer sprint
    if (e.ctrlKey && e.key === 'q') { e.preventDefault(); navigate('trainer'); return; }
    // Ctrl+K = Focus search
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const s = document.getElementById('globalSearch');
        if (s) { s.focus(); s.select(); }
        return;
    }
    // Ctrl+D = Mind dump
    if (e.ctrlKey && e.key === 'd') { e.preventDefault(); toggleMindDump(); return; }
    // Ctrl+T = Toggle Pomodoro timer
    if (e.ctrlKey && e.key === 't') { e.preventDefault(); togglePomodoro(); return; }
    // Escape = close panels
    if (e.key === 'Escape') {
        document.getElementById('mindDumpPanel')?.remove();
        document.getElementById('reprendsBanner')?.remove();
        if (typeof closeCrossRefPopover === 'function') closeCrossRefPopover();
    }
});

// ══════════════════════════════════════════════════
// Pomodoro timer (AM1) — 20 min focus / 5 min break
// ══════════════════════════════════════════════════
const POMO_FOCUS_MIN = 20;
const POMO_BREAK_MIN = 5;
let _pomoState = {
    running: false,
    phase: 'focus',    // 'focus' | 'break'
    remaining: POMO_FOCUS_MIN * 60 * 1000,
    cycles: 0,
    interval: null,
    startedAt: null,
};

function togglePomodoro() {
    if (document.getElementById('pomoWidget')) {
        stopPomodoro();
        document.getElementById('pomoWidget')?.remove();
    } else {
        openPomodoro();
    }
}

function openPomodoro() {
    const w = document.createElement('div');
    w.id = 'pomoWidget';
    w.style.cssText = `
        position:fixed;bottom:20px;right:20px;z-index:9999;
        background:#1e293b;border:1px solid #334155;border-radius:12px;
        padding:14px 18px;box-shadow:0 10px 30px rgba(0,0,0,0.5);
        min-width:220px;font-family:system-ui,sans-serif`;
    w.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:12px;font-weight:700;color:#f1f5f9">🍅 Pomodoro</span>
            <button onclick="document.getElementById('pomoWidget').remove(); stopPomodoro();"
                style="background:none;border:none;color:#64748b;cursor:pointer;font-size:14px">✕</button>
        </div>
        <div id="pomoPhase" style="font-size:11px;color:#94a3b8;margin-bottom:4px">Focus</div>
        <div id="pomoTime" style="font-size:32px;font-weight:800;color:#10b981;text-align:center;margin-bottom:10px;font-variant-numeric:tabular-nums">20:00</div>
        <div style="display:flex;gap:8px;justify-content:center">
            <button id="pomoStartBtn" onclick="pomoStart()"
                style="background:#10b981;color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">Démarrer</button>
            <button onclick="pomoReset()"
                style="background:transparent;color:#94a3b8;border:1px solid #475569;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px">Reset</button>
        </div>
        <div id="pomoCycles" style="font-size:10px;color:#64748b;text-align:center;margin-top:6px">Cycle 0</div>
    `;
    document.body.appendChild(w);
    updatePomoDisplay();
}

function updatePomoDisplay() {
    const t = document.getElementById('pomoTime');
    const p = document.getElementById('pomoPhase');
    const c = document.getElementById('pomoCycles');
    const b = document.getElementById('pomoStartBtn');
    if (!t) return;
    const mins = Math.floor(_pomoState.remaining / 60000);
    const secs = Math.floor((_pomoState.remaining % 60000) / 1000);
    t.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    t.style.color = _pomoState.phase === 'focus' ? '#10b981' : '#3b82f6';
    if (p) p.textContent = _pomoState.phase === 'focus' ? '🎯 Focus' : '☕ Pause';
    if (c) c.textContent = `Cycle ${_pomoState.cycles}`;
    if (b) b.textContent = _pomoState.running ? 'Pause' : 'Démarrer';
}

function pomoStart() {
    if (_pomoState.running) {
        // Pause
        clearInterval(_pomoState.interval);
        _pomoState.interval = null;
        _pomoState.running = false;
        updatePomoDisplay();
        return;
    }
    _pomoState.running = true;
    _pomoState.startedAt = Date.now();
    const initialRemaining = _pomoState.remaining;
    _pomoState.interval = setInterval(() => {
        _pomoState.remaining = initialRemaining - (Date.now() - _pomoState.startedAt);
        if (_pomoState.remaining <= 0) {
            // Phase transition
            clearInterval(_pomoState.interval);
            _pomoState.interval = null;
            _pomoState.running = false;
            const wasFocus = _pomoState.phase === 'focus';
            if (wasFocus) {
                _pomoState.cycles++;
                _pomoState.phase = 'break';
                _pomoState.remaining = POMO_BREAK_MIN * 60 * 1000;
                pomoNotify('🎉 Focus terminé ! Pause 5 min.');
            } else {
                _pomoState.phase = 'focus';
                _pomoState.remaining = POMO_FOCUS_MIN * 60 * 1000;
                pomoNotify('💪 Pause terminée ! Focus 20 min.');
            }
        }
        updatePomoDisplay();
    }, 250);
    updatePomoDisplay();
}

function pomoReset() {
    stopPomodoro();
    _pomoState.phase = 'focus';
    _pomoState.remaining = POMO_FOCUS_MIN * 60 * 1000;
    _pomoState.cycles = 0;
    updatePomoDisplay();
}

function stopPomodoro() {
    if (_pomoState.interval) {
        clearInterval(_pomoState.interval);
        _pomoState.interval = null;
    }
    _pomoState.running = false;
}

function pomoNotify(msg) {
    // Simple visual + optional Notification API
    const flash = document.createElement('div');
    flash.style.cssText = `
        position:fixed;top:20px;right:20px;z-index:10000;
        background:#10b981;color:white;padding:12px 18px;border-radius:8px;
        box-shadow:0 6px 18px rgba(0,0,0,0.3);font-weight:600;font-size:14px;
        animation:slideInRight 0.3s ease`;
    flash.textContent = msg;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 4000);
    // Try native notification
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Swiss CPA', { body: msg });
    }
}
