#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
RUNNER_JS="$REPO_ROOT/tools/run-test-node.js"

if [[ ! -f "$RUNNER_JS" ]]; then
  echo "Error: runner not found at $RUNNER_JS" >&2
  exit 1
fi

node "$RUNNER_JS" "$@"
