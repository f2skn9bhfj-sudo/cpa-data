#!/usr/bin/env bash
# build_vendor.sh — (re)construit vendor/ : copies locales et FIGÉES des
# bibliothèques chargées par les sous-apps React (audit, conso, english, fs,
# hec, oral, podcasts, references, social). Plus aucune dépendance aux CDN
# (esm.sh, unpkg, cdn.tailwindcss.com) : le site marche hors ligne et ne peut
# plus casser à cause d'une nouvelle version publiée en amont.
#
# Usage (racine du dépôt) : bash tools/build_vendor.sh
# Pour changer une version : modifier les variables ci-dessous puis relancer,
# vérifier avec `node tools/smoke_test.js`, puis bumper ?v= dans index.html.
set -euo pipefail

REACT=18.3.1
LUCIDE=1.74.0
BABEL=7.29.14
ESBUILD=0.28.2

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/vendor"
WORK="$(mktemp -d)"
trap 'rm -rf -- "$WORK"' EXIT

cd "$WORK"
npm init -y >/dev/null
npm install --no-audit --no-fund --silent \
  "react@$REACT" "react-dom@$REACT" "lucide-react@$LUCIDE" \
  "@babel/standalone@$BABEL" "esbuild@$ESBUILD"

mkdir -p entries
# React est publié en CommonJS : esbuild ne peut pas deviner ses exports, on
# les énumère donc explicitement (sinon `import { useState } from "react"` échoue).
node -e '
const fs = require("fs");
const mods = { "react": "react", "react/jsx-runtime": "react-jsx-runtime",
               "react-dom": "react-dom", "react-dom/client": "react-dom-client" };
for (const [spec, file] of Object.entries(mods)) {
  const keys = Object.keys(require(spec)).filter(k => /^[A-Za-z_$][\w$]*$/.test(k) && k !== "default");
  const src = `import * as M from "${spec}";\nconst D = M.default || M;\nexport default D;\n` +
    keys.map(k => `export const ${k} = D.${k};`).join("\n") + "\n";
  fs.writeFileSync(`entries/${file}.js`, src);
}'
# Seules les icônes importées par les sous-apps (en-têtes de tools/sync_subapps.py) :
# ~16 Ko au lieu de 950 Ko pour la bibliothèque complète. Nouvelle icône dans un
# en-tête → relancer ce script (sync_subapps.py le signale).
ICONS="$(python3 "$ROOT/tools/sync_subapps.py" --icons)"
printf 'export { %s } from "lucide-react";\n' "$ICONS" > entries/lucide-react.js

mkdir -p "$OUT"
# Nettoie uniquement les fichiers générés précédemment (modules + chunks).
find "$OUT" -maxdepth 1 -type f \( -name 'chunk-*.js' -o -name 'react*.js' -o -name 'lucide-react.js' \) -delete

# Un seul build avec découpage → une seule instance de React partagée.
./node_modules/.bin/esbuild entries/react.js entries/react-jsx-runtime.js \
  entries/react-dom.js entries/react-dom-client.js entries/lucide-react.js \
  --bundle --splitting --format=esm --minify --log-level=warning \
  --define:process.env.NODE_ENV='"production"' \
  --chunk-names='chunk-[hash]' --outdir="$OUT"

# Babel ne sert plus qu'à la compilation côté outil (tools/compile_jsx.js) : les pages ne le chargent pas.
cp node_modules/@babel/standalone/babel.min.js "$OUT/babel.min.js"
# Tailwind « Play CDN » 3.4.16 (pas publié sur npm) : copie de fusion/vendor.
cp "$ROOT/fusion/vendor/tailwind.js" "$OUT/tailwind.js"

cat > "$OUT/VERSIONS.txt" <<EOF
react / react-dom : $REACT
lucide-react      : $LUCIDE (icônes : $ICONS)
@babel/standalone : $BABEL
tailwind (play)   : 3.4.16
construit par tools/build_vendor.sh (esbuild $ESBUILD)
EOF
echo "vendor/ prêt :"; ls -la "$OUT"
