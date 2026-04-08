#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd -P)"
COMPILER_JS="$REPO_ROOT/compiler/c-compiler.js"

if [[ ! -f "$COMPILER_JS" ]]; then
	echo "Error: compiler not found at $COMPILER_JS" >&2
	exit 1
fi

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
	echo "Usage: webc.sh [c-compiler options]"
	echo
	echo "Examples:"
	echo "  webc.sh --file ./compiler/examples/test.c --wat-out ./out/test.wat"
	echo "  webc.sh --code 'int main() { return 0; }'"
	echo
	echo "Tip: pass through any options supported by compiler/c-compiler.js"
	fi

node "$COMPILER_JS" "$@"