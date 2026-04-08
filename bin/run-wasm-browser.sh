#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
BROWSER_DIR="$REPO_ROOT/tools/browser"

if [[ ! -d "$BROWSER_DIR" ]]; then
  echo "Error: browser runner directory not found at $BROWSER_DIR" >&2
  exit 1
fi

cd "$BROWSER_DIR"
echo "Serving $BROWSER_DIR at http://127.0.0.1:8080/run-wasm.html"
python3 -m http.server 8080
