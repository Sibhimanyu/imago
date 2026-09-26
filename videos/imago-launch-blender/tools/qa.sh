#!/bin/bash
# qa.sh <blend> <out_dir> <master t> [<master t> ...]  (seconds on the 30s timeline)
# Renders the master scene at those times and pairs each with the reference frame.
set -euo pipefail
blend="$1"; out="$2"; shift 2
here="$(cd "$(dirname "$0")" && pwd)"; ref="${REF:-$here/../../imago-launch/renders/video.mp4}"
mkdir -p "$out"; frames=()
for t in "$@"; do frames+=("$(python3 -c "print(int(round($t*30)))")"); done
blender -b "$blend" -P "$here/qa_render.py" -- "$out" "${frames[@]}" >/dev/null 2>&1
pairs=(); i=0
for t in "$@"; do
  f=${frames[$i]}; T=$(python3 -c "print(($f+0.0)/30)")
  ffmpeg -v error -y -ss "$T" -i "$ref" -frames:v 1 -vf scale=960:-1 "$out/ref_$f.png"
  ffmpeg -v error -y -i "$out/ref_$f.png" -i "$(printf "%s/bl_%04d.png" "$out" "$f")" -filter_complex "[0][1]hstack" "$out/pair_$f.png"
  pairs+=("$out/pair_$f.png"); i=$((i+1))
done
n=${#pairs[@]}; args=(); for p in "${pairs[@]}"; do args+=(-i "$p"); done
if [ "$n" -gt 1 ]; then ffmpeg -v error -y "${args[@]}" -filter_complex "vstack=inputs=$n" "$out/sheet.png"; else cp "${pairs[0]}" "$out/sheet.png"; fi
echo "$out/sheet.png"
