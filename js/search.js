/* ═══════════════════════════════════════════════
   Barre de recherche du haut → page Recherche complète
   ───────────────────────────────────────────────
   Un seul moteur dans l'app : celui de la page Recherche (js/search_tab.js),
   qui indexe toutes les données. La barre du haut propose de lancer la
   recherche (clic ou Entrée) et ouvre cette page avec la requête.
   ═══════════════════════════════════════════════ */

function openFullSearch(query) {
    const q = String(query || '').trim();
    hideSearchResults();
    const input = document.getElementById('globalSearch');
    if (input) { input.value = ''; input.blur(); }
    if (typeof _stQuery !== 'undefined') _stQuery = q;   // repris par renderRechercheTab
    navigate('recherche');
}

function handleSearch(query) {
    const container = document.getElementById('searchResults');
    if (!container) return;
    const q = String(query || '').trim();
    if (q.length < 2) { hideSearchResults(); return; }
    container.innerHTML = '';
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.setAttribute('role', 'option');
    item.tabIndex = 0;
    const icon = document.createElement('span');
    icon.className = 'search-result-icon';
    icon.textContent = '🔎';
    const wrap = document.createElement('div');
    wrap.className = 'search-result-text';
    const title = document.createElement('div');
    title.className = 'search-result-title';
    title.textContent = 'Rechercher « ' + q + ' » partout';
    const sub = document.createElement('div');
    sub.className = 'search-result-sub';
    sub.textContent = 'Normes, cours, flashcards, audit, seuils, anglais… — Entrée';
    wrap.appendChild(title); wrap.appendChild(sub);
    item.appendChild(icon); item.appendChild(wrap);
    item.addEventListener('click', () => openFullSearch(q));
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFullSearch(q); } });
    container.appendChild(item);
    container.classList.add('visible');
}

function showSearchResults() {
    const input = document.getElementById('globalSearch');
    if (input && input.value.trim().length >= 2) handleSearch(input.value);
}

function hideSearchResults() {
    const c = document.getElementById('searchResults');
    if (c) c.classList.remove('visible');
}
