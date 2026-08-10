#!/usr/bin/env bash
# Builds the Chrome Web Store upload zip from extension/.
# Excludes the local gitignored giphy-key.js (never ship a key) and OS junk.
# Output: dist/touch-grass-extension-v<manifest version>.zip
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(python3 -c "import json; print(json.load(open('$root/extension/manifest.json'))['version'])")"
out="$root/dist/touch-grass-extension-v$version.zip"

mkdir -p "$root/dist"
rm -f "$out"
(cd "$root/extension" && zip -r "$out" . -x "giphy-key.js" -x "*.DS_Store")

echo ""
echo "Store zip: $out"
unzip -l "$out"
