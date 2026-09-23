#!/usr/bin/env bash
# Assemble the exact set of files Catalyst Slate should serve.
# Not a build step — just a copy, so tests, screenshots and notes stay local.
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist/.catalyst

cp index.html styles.css og.png favicon.svg dist/
cp -R js dist/js
cp -R assets dist/assets

cat > dist/.catalyst/slate-config.toml <<'TOML'
framework = "static"
deployment_name = "default"
TOML

echo "dist/ ready:"
find dist -type f | sort | sed 's/^/  /'
