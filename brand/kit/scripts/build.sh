#!/bin/bash
# Usage: ./build.sh logo|flyer|banner — builds that piece in Adobe Illustrator.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; kit="$(dirname "$here")"
out="$(mktemp -t imago).jsx"
{ sed "s|__KIT__|$kit|" "$here/lib.jsx"; cat "$here/$1.jsx"; } > "$out"
osascript - "$out" <<'OSA'
on run argv
  set f to (POSIX file (item 1 of argv)) as alias
  with timeout of 900 seconds
    tell application "/Applications/Adobe Illustrator 2026/Adobe Illustrator.app" to do javascript f
  end timeout
end run
OSA
