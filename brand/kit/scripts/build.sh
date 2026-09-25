#!/bin/bash
# Usage: ./build.sh logo|flyer|banner|mascot|guidelines|task1 — builds that
# piece in Adobe Illustrator. task1 builds the logo, the mascot and the
# guidelines, then merges them into imago-task1-logo.ai.
#
# Runs in the Illustrator that is open (2026 or the Beta, which share an app
# id, so they are named by path); ILLUSTRATOR=/path/to/app overrides.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"; kit="$(dirname "$here")"
if [ "${1:-}" = task1 ]; then
  for step in logo mascot guidelines task1-merge; do "$0" "$step"; done
  exit 0
fi
[ "${1:-}" = task1-merge ] && set -- task1
if [ -z "${ILLUSTRATOR:-}" ]; then
  # The running Illustrator's own path; pgrep -f on the path would read
  # "(Beta)" as a regex group.
  for pid in $(pgrep -x "Adobe Illustrator" || true); do
    exe="$(ps -o comm= -p "$pid")"
    ILLUSTRATOR="${exe%/Contents/MacOS/*}"; break
  done
fi
ILLUSTRATOR="${ILLUSTRATOR:-/Applications/Adobe Illustrator 2026/Adobe Illustrator.app}"
out="$(mktemp -t imago).jsx"
{ sed "s|__KIT__|$kit|" "$here/lib.jsx"; cat "$here/$1.jsx"; } > "$out"
# The app goes into the script text: AppleScript resolves "do javascript"
# when it compiles, so the target cannot be a run-time variable.
osascript - "$out" <<OSA
on run argv
  set f to (POSIX file (item 1 of argv)) as alias
  with timeout of 900 seconds
    tell application "$ILLUSTRATOR" to do javascript f
  end timeout
end run
OSA
