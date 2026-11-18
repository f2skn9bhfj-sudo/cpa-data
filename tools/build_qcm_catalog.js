#!/usr/bin/env node
/*
 * build_qcm_catalog.js — pré-calcule data/qcm_catalog.json (appelé par sync_subapps.py).
 *
 * La banque de QCM rassemble les questions de trainer_courses.json, unified_modules.json
 * et audit.json (annuaire_cours). Les assembler dans le navigateur obligeait la page QCM
 * à télécharger ces trois fichiers (12 Mo). On exécute ici EXACTEMENT le même code
 * (_build_qcm_catalog de js/api-client-static.js) et on écrit le résultat.
 *
 * Usage : node tools/build_qcm_catalog.js   → JSON sur stdout
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const store = {};
const sandbox = {
  console: { log() {}, warn() {}, error: (...a) => process.stderr.write(a.join(' ') + '\n') },
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
  fetch: async (url) => {
    const f = path.join(ROOT, String(url).split('?')[0]);
    if (!fs.existsSync(f)) return { ok: false, status: 404, json: async () => null };
    const txt = fs.readFileSync(f, 'utf8');
    return { ok: true, status: 200, json: async () => JSON.parse(txt), text: async () => txt };
  },
  setTimeout, clearTimeout, Promise, Date, Math, JSON,
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'api-client-static.js'), 'utf8'), sandbox,
  { filename: 'api-client-static.js' });

sandbox.window.pywebview.api._build_qcm_catalog().then((cat) => {
  if (!cat || !cat.questions || !cat.questions.length) {
    process.stderr.write('catalogue QCM vide : sources introuvables ?\n');
    process.exit(1);
  }
  process.stdout.write(JSON.stringify(cat) + '\n');
}).catch((e) => { process.stderr.write(String(e && e.stack || e) + '\n'); process.exit(1); });
