#!/usr/bin/env node
/*
 * compile_jsx.js — compile le JSX des sous-apps en JavaScript (appelé par sync_subapps.py).
 *
 * Avant, chaque sous-app chargeait Babel (3 Mo) et compilait son code dans le
 * navigateur à chaque ouverture : ~4 s perdues sur téléphone pour l'onglet Audit.
 * Le code est désormais compilé une fois, ici, avec la même copie de Babel
 * (vendor/babel.min.js) et le même preset « react » (runtime classique).
 *
 * Entrée (stdin)  : {"<app>": {"code": "<jsx>", "mode": "module" | "script"}, …}
 * Sortie (stdout) : {"<app>": "<js>", …}
 */
const path = require('path');
const Babel = require(path.join(__dirname, '..', 'vendor', 'babel.min.js'));

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  const jobs = JSON.parse(input);
  const out = {};
  for (const [app, { code, mode }] of Object.entries(jobs)) {
    try {
      out[app] = Babel.transform(code, {
        presets: ['react'],
        sourceType: mode === 'module' ? 'module' : 'script',
        filename: app + '.jsx',
        comments: false,
        compact: false,
        babelrc: false,
        configFile: false,
      }).code;
    } catch (e) {
      process.stderr.write(`${app}: ${e.message}\n`);
      process.exit(1);
    }
  }
  process.stdout.write(JSON.stringify(out));
});
