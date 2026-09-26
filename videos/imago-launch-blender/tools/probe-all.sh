#!/bin/bash
# Re-probe every scene of videos/imago-launch (and the master timeline) into ../probe/.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; src="$here/../../imago-launch"
cd "$here"; [ -d node_modules ] || npm i --silent
mkdir -p ../probe
for f in "$src"/compositions/frames/*.html "$src/index.html"; do
  node probe.mjs "$f" "../probe/$(basename "$f" .html).json" 2>&1 | grep -v "404" | tail -1
done
