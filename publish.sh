#!/usr/bin/env bash
# Assemble the exact set of files Catalyst Slate serves on imago.onslate.in:
# the app, copied as it is, plus the API gallery, press kit and waitlist that
# gallery/build.mjs writes. Tests, screenshots and notes stay local.
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist/.catalyst

cp index.html styles.css og.png favicon.svg dist/
cp -R js dist/js
cp -R assets dist/assets

# The gallery's pages sit beside the app's files and never replace one.
node gallery/build.mjs
clash=$(cd gallery/dist && find . -type f -exec test -e ../../dist/{} \; -print)
if [ -n "$clash" ]; then
  echo "gallery/dist would overwrite app files:" >&2; echo "$clash" >&2; exit 1
fi
cp -R gallery/dist/. dist/

cat > dist/.catalyst/slate-config.toml <<'TOML'
framework = "static"
deployment_name = "default"
TOML

echo "dist/ ready:"
find dist -type f | sort | sed 's/^/  /'
