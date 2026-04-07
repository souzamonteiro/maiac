#!/bin/sh

set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
EXAMPLES_DIR="$ROOT_DIR/compiler/examples"
LEGACY_EXAMPLES_DIR="$ROOT_DIR/maiawasm/assembler/examples"
OUT_DIR="$ROOT_DIR/compiler/templates/wat-from-emscripten"

if [ ! -d "$EXAMPLES_DIR" ]; then
  EXAMPLES_DIR="$LEGACY_EXAMPLES_DIR"
fi

if [ -x "$HOME/emsdk/upstream/emscripten/emcc" ]; then
  PATH="$HOME/emsdk/upstream/emscripten:$HOME/emsdk/upstream/bin:$PATH"
  export PATH
fi

if ! command -v emcc >/dev/null 2>&1; then
  if [ -f "$HOME/emsdk/emsdk_env.sh" ]; then
    # shellcheck disable=SC1090
    . "$HOME/emsdk/emsdk_env.sh" >/dev/null 2>&1
  fi
fi

if ! command -v emcc >/dev/null 2>&1; then
  echo "Error: emcc is required but was not found in PATH or in ~/emsdk" >&2
  exit 1
fi

DISASSEMBLER_JS="$ROOT_DIR/maiawasm/assembler/wasm-disassembler.js"
WAT_TOOL=""
if [ -f "$DISASSEMBLER_JS" ] && command -v node >/dev/null 2>&1; then
  WAT_TOOL="maiawasm-js"
elif command -v wasm2wat >/dev/null 2>&1; then
  WAT_TOOL="wasm2wat"
elif command -v wasm-dis >/dev/null 2>&1; then
  WAT_TOOL="wasm-dis"
else
  echo "Error: no WAT converter was found. Install node or wasm2wat/wasm-dis." >&2
  exit 1
fi

echo "Using WAT converter: $WAT_TOOL"
mkdir -p "$OUT_DIR"

found_any=0
for cfile in "$EXAMPLES_DIR"/*.c "$EXAMPLES_DIR"/c89-mini-suite/*.c; do
  [ -f "$cfile" ] || continue
  found_any=1

  base="$(basename "$cfile" .c)"
  wasm_file="$OUT_DIR/$base.wasm"
  wat_file="$OUT_DIR/$base.wat"

  echo "Compiling $cfile -> $wasm_file"
  emcc "$cfile" \
    -O0 \
    -g0 \
    -s STANDALONE_WASM=1 \
    -s ERROR_ON_UNDEFINED_SYMBOLS=0 \
    -Wno-everything \
    -o "$wasm_file"

  echo "Converting $wasm_file -> $wat_file"
  if [ "$WAT_TOOL" = "maiawasm-js" ]; then
    node "$DISASSEMBLER_JS" "$wasm_file" > "$wat_file"
  elif [ "$WAT_TOOL" = "wasm2wat" ]; then
    wasm2wat "$wasm_file" -o "$wat_file"
  else
    wasm-dis "$wasm_file" -o "$wat_file"
  fi
done

if [ "$found_any" -eq 0 ]; then
  echo "Error: no C example files were found in $EXAMPLES_DIR" >&2
  exit 1
fi

echo "Done. WAT templates generated in: $OUT_DIR"
