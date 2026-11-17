#!/usr/bin/env node
/*
 * smoke_test.js — charge le site en local dans Chromium et parcourt les onglets.
 * Usage (racine du dépôt) : node tools/smoke_test.js
 * Lance un serveur HTTP local, ouvre chaque onglet, relève les erreurs JS et
 * les fichiers locaux manquants (404). Les échecs vers les CDN (tailwind,
 * unpkg, esm.sh) sont signalés à part : ils dépendent du réseau, pas du code.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jsx': 'text/plain', '.css': 'text/css',
  '.json': 'application/json', '.md': 'text/markdown', '.m4a': 'audio/mp4', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(ROOT, p.endsWith('/') ? p + 'index.html' : p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  let errs = [], local404 = [], cdn = new Set();
  const isLocal = u => u.startsWith(base);
  page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|ERR_CONNECTION|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  page.on('requestfailed', r => { if (!isLocal(r.url())) cdn.add(new URL(r.url()).host); });
  page.on('response', r => { if (r.status() >= 400 && isLocal(r.url())) local404.push(r.status() + ' ' + r.url().slice(base.length)); });

  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const tabs = await page.$$eval('#navScroll .tab', bs => bs.map(b => b.dataset.tab));
  let bad = 0;
  for (const t of tabs) {
    errs = []; local404 = [];
    await page.evaluate(t => navigate(t), t);
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => {
      const m = document.getElementById('mainContent');
      const f = m.querySelector('iframe');
      return { text: (m.innerText || '').trim().length, iframe: f ? f.getAttribute('src') : null };
    });
    let sub = '';
    if (info.iframe) {
      const frame = page.frames().find(fr => fr.url().includes(info.iframe.split('?')[0]));
      if (frame) {
        await page.waitForTimeout(1500);
        const n = await frame.evaluate(() => (document.body.innerText || '').trim().length).catch(() => 0);
        sub = ` iframe=${info.iframe.split('?')[0]} texte=${n}c`;
      }
    }
    const ok = !errs.length && !local404.length;
    if (!ok) bad++;
    console.log(`${ok ? 'OK ' : 'ERR'} ${t.padEnd(11)} texte=${info.text}c${sub}`);
    errs.forEach(e => console.log('     erreur JS :', e));
    [...new Set(local404)].forEach(u => console.log('     fichier local :', u));
  }
  if (cdn.size) console.log(`\n(CDN injoignables depuis cette machine : ${[...cdn].join(', ')} — les onglets qui en dépendent restent vides ici)`);
  await browser.close();
  server.close();
  process.exit(bad ? 1 : 0);
})();
