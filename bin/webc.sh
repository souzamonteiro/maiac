#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
WEBC_JS="$REPO_ROOT/tools/webc.js"

if [[ ! -f "$WEBC_JS" ]]; then
  echo "Error: webc driver not found at $WEBC_JS" >&2
  exit 1
fi

exec node "$WEBC_JS" "$@"
