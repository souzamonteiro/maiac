#!/bin/bash
# Build/test script for compiler/examples/test.c
# Run from the project root: bash compiler/examples/build_test.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXAMPLES_DIR="$ROOT_DIR/compiler/examples"

cd "$EXAMPLES_DIR"

rm -rf "$EXAMPLES_DIR/dist"
rm -rf "$EXAMPLES_DIR/out"

echo "==> webc: compile + run"
node "$ROOT_DIR/tools/webc.js" "$EXAMPLES_DIR/test.c" -o out/test --run

echo "==> run-test-node runner"
node "$ROOT_DIR/tools/run-test-node.js" "$EXAMPLES_DIR/test.c"

echo "==> webc: create dist (browser + node)"
node "$ROOT_DIR/tools/webc.js" "$EXAMPLES_DIR/test.c" --dist --out-dir dist --name test

echo "==> dist node runner"
bash dist/node-runner.sh

# Note: --resolve-system-includes expands stdlib headers inline and currently
# hits a compiler limitation with nested struct initializers in test.c.
# It works for simpler sources without nested struct aggregate initializers.
# echo "==> webc: with system includes (experimental)"
# node $ROOT_DIR/tools/webc.js $ROOT_DIR/compiler/examples/test.c -o out/test --resolve-system-includes --run

echo "==> All steps OK"
