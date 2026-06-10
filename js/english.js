/* ═══════════════════════════════════════════════
   Onglet ANGLAIS — intègre l'app React anglais
   (static/english/index.html, assemblée par build_english.py
   sur le même template que Conso) via une <iframe>.

   Les 9 sous-sections (Day-1, vocab, phrases, FS, constructeur,
   dictée, conversations, vidéos, écriture) vivent DANS l'app.
   La progression réutilise les clés localStorage historiques
   (swisscpa_eng_*) — même origine, donc rien n'est perdu.
   Le bridge pywebview (record_english_attempt, check_english_text)
   est accessible depuis l'iframe via window.parent.pywebview.api.

   navigate('english', sub) est transmis via le hash (#vocab…).
   ═══════════════════════════════════════════════ */

function _englishFit() {
    const frame = document.getElementById('englishFrame');
    if (!frame || !document.body.contains(frame)) {
        window.removeEventListener('resize', _englishFit);
        return;
    }
    const top = frame.getBoundingClientRect().top;
    let padBottom = 0;
    if (frame.parentElement) {
        padBottom = parseFloat(getComputedStyle(frame.parentElement).paddingBottom) || 0;
    }
    const h = Math.max(420, Math.floor(window.innerHeight - top - padBottom - 2));
    frame.style.height = h + 'px';
}

// URL de l'iframe avec cache-busting : reprend le ?v=<build> de english.js
// (posé par build_mobile) ; en bureau, bust par horodatage.
function _englishSrc(subTab) {
    let v = '';
    try {
        const s = document.querySelector('script[src*="js/english.js"]');
        const m = s && (s.getAttribute('src') || '').match(/[?&]v=([^&]+)/);
        if (m) v = m[1];
    } catch (_) {}
    const hash = subTab ? '#' + subTab : '';
    return 'english/index.html?v=' + (v || Date.now()) + hash;
}

function renderEnglish(container, subTab) {
    if (!container) return;
    const existing = document.getElementById('englishFrame');
    if (existing && container.contains(existing) && subTab) {
        try { existing.contentWindow.location.hash = subTab; return; } catch (_) {}
    }
    container.innerHTML = `
        <iframe id="englishFrame"
                src="${_englishSrc(subTab)}"
                title="Anglais — préparation EY (vocabulaire, phrases, écriture, dictée…)"
                style="display:block;width:100%;height:70vh;border:0;border-radius:10px;background:#f8fafc;box-shadow:0 1px 3px rgba(15,23,42,0.06)"
                referrerpolicy="no-referrer"></iframe>`;

    _englishFit();
    requestAnimationFrame(_englishFit);
    setTimeout(_englishFit, 80);
    setTimeout(_englishFit, 300);
    window.removeEventListener('resize', _englishFit);
    window.addEventListener('resize', _englishFit);
}

window.renderEnglish = renderEnglish;
