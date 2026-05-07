/* ═══════════════════════════════════════════════
   References Tab — Main Router
   ═══════════════════════════════════════════════ */

function renderReferences(container, subTab) {
    const tab = subTab || 'courses';

    switch (tab) {
        case 'glossary':  renderGlossary(container);  break;
        case 'seuils':    renderSeuils(container);    break;
        case 'cas':       renderCas(container);       break;
        case 'arbres':    renderArbres(container);    break;
        case 'terrain':   renderTerrain(container);   break;
        default:          renderGlossary(container);  break;
    }
}
