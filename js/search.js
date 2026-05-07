/* ═══════════════════════════════════════════════
   Global Search
   ═══════════════════════════════════════════════ */

let searchTimeout = null;

function handleSearch(query) {
    clearTimeout(searchTimeout);
    if (!query || query.length < 2) {
        hideSearchResults();
        return;
    }
    searchTimeout = setTimeout(() => doSearch(query), 300);
}

// Per-render store keyed by index — avoids embedding JSON into HTML attributes
// where user-controlled strings could break out of the onclick context.
let _lastSearchResults = [];

async function doSearch(query) {
    const results = await api('search_all', query);
    const container = document.getElementById('searchResults');
    container.setAttribute('role', 'listbox');

    // Clear existing nodes
    while (container.firstChild) container.removeChild(container.firstChild);

    if (!results || results.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding:16px;color:#94a3b8;font-size:13px';
        empty.textContent = 'Aucun résultat pour "' + query + '"';
        container.appendChild(empty);
        container.classList.add('visible');
        _lastSearchResults = [];
        return;
    }

    _lastSearchResults = results;

    results.forEach((r, i) => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.setAttribute('role', 'option');
        item.tabIndex = 0;
        item.dataset.idx = String(i);

        const icon = document.createElement('span');
        icon.className = 'search-result-icon';
        icon.textContent = r.icon || '';
        item.appendChild(icon);

        const textWrap = document.createElement('div');
        textWrap.className = 'search-result-text';

        const title = document.createElement('div');
        title.className = 'search-result-title';
        title.textContent = r.title || '';
        textWrap.appendChild(title);

        const sub = document.createElement('div');
        sub.className = 'search-result-sub';
        sub.textContent = r.subtitle || '';
        textWrap.appendChild(sub);

        item.appendChild(textWrap);
        container.appendChild(item);
    });

    container.classList.add('visible');
}

// Event delegation — one listener for all search results
document.addEventListener('click', (e) => {
    const item = e.target.closest && e.target.closest('#searchResults .search-result-item');
    if (!item) return;
    const idx = parseInt(item.dataset.idx, 10);
    const result = _lastSearchResults[idx];
    if (result) openSearchResult(result);
});
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest && e.target.closest('#searchResults .search-result-item');
    if (!item) return;
    e.preventDefault();
    const idx = parseInt(item.dataset.idx, 10);
    const result = _lastSearchResults[idx];
    if (result) openSearchResult(result);
});

function showSearchResults() {
    const input = document.getElementById('globalSearch');
    if (input.value.length >= 2) {
        document.getElementById('searchResults').classList.add('visible');
    }
}

function hideSearchResults() {
    document.getElementById('searchResults').classList.remove('visible');
}

function openSearchResult(result) {
    hideSearchResults();
    document.getElementById('globalSearch').value = '';

    switch (result.type) {
        case 'norm':
            navigate('modules');
            setTimeout(() => modJumpToNorm(result.norm_code), 500);
            break;
        case 'flashcard':
            navigate('flashcards');
            break;
        case 'reference':
            const sectionMap = {
                'memo_co': 'memos', 'memo_rpc': 'memos', 'memo_ifrs': 'memos',
                'courses_ifrs': 'courses', 'courses_rpc': 'courses',
                'anglais': 'glossary', 'seuils': 'seuils',
                'consolidation': 'conso', 'cas_chiffres': 'cas',
                'arbres_decision': 'arbres', 'restructuration': 'restruct',
                'terrain': 'terrain'
            };
            navigate('references', sectionMap[result.section] || 'courses');
            break;
        case 'glossary':
            navigate('references', 'glossary');
            break;
        case 'file':
            navigate('files');
            break;
        case 'audit_nas':
        case 'audit_cadre':
        case 'audit_comparatif':
        case 'audit_cycle':
        case 'audit_finding':
        case 'audit_wording':
            navigate('audit', result.sub_tab || 'nas');
            break;
    }
}
