#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
BROWSER_PAGE="/tools/browser/run-wasm.html"

if [[ ! -f "$REPO_ROOT/tools/browser/run-wasm.html" ]]; then
  echo "Error: browser runner page not found at $REPO_ROOT/tools/browser/run-wasm.html" >&2
  exit 1
fi

cd "$REPO_ROOT"
echo "Serving $REPO_ROOT at http://127.0.0.1:8080$BROWSER_PAGE"
python3 -m http.server 8080
