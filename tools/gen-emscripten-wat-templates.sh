#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

SRC_DIR="$ROOT_DIR/maiawasm/assembler/examples/c89-mini-suite"
OUT_DIR="$ROOT_DIR/compiler/templates/wat-from-emscripten"

if ! command -v emcc >/dev/null 2>&1; then
  echo "Error: emcc is required but was not found in PATH" >&2
  exit 1
fi

WAT_TOOL=""
if command -v wasm2wat >/dev/null 2>&1; then
  WAT_TOOL="wasm2wat"
elif command -v wasm-dis >/dev/null 2>&1; then
  WAT_TOOL="wasm-dis"
else
  echo "Error: neither wasm2wat (wabt) nor wasm-dis (binaryen) found in PATH" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

for cfile in "$SRC_DIR"/*.c; do
  base="$(basename "$cfile" .c)"
  wasm_file="$OUT_DIR/$base.wasm"
  wat_file="$OUT_DIR/$base.wat"

  echo "Compiling $base.c -> $base.wasm"
  emcc "$cfile" \
    -O0 \
    -g0 \
    -s STANDALONE_WASM=1 \
    -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
    -Wno-everything \
    -o "$wasm_file"

  echo "Converting $base.wasm -> $base.wat"
  if [ "$WAT_TOOL" = "wasm2wat" ]; then
    wasm2wat "$wasm_file" -o "$wat_file"
  else
    wasm-dis "$wasm_file" -o "$wat_file"
  fi

done

echo "Done. WAT templates generated in: $OUT_DIR"
