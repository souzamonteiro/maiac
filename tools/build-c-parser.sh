#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

GRAMMAR_FILE="$ROOT_DIR/grammar/C.ebnf"
TREX_SCRIPT="$ROOT_DIR/maiacc/bin/tREx.sh"
OUT_XML="$ROOT_DIR/compiler/_c-grammar.xml"
OUT_PARSER="$ROOT_DIR/compiler/C-parser.js"

if [ ! -f "$GRAMMAR_FILE" ]; then
  echo "Error: grammar file not found: $GRAMMAR_FILE" >&2
  exit 1
fi

if [ ! -f "$TREX_SCRIPT" ]; then
  echo "Error: tREx script not found: $TREX_SCRIPT" >&2
  exit 1
fi

echo "Generating C parser from: $GRAMMAR_FILE"
bash "$TREX_SCRIPT" --ebnf --to-xml "$OUT_XML" "$GRAMMAR_FILE" "$OUT_PARSER"

echo "Parser generated at: $OUT_PARSER"
echo "Grammar XML generated at: $OUT_XML"
