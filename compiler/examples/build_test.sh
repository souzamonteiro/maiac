#!/bin/bash
# Build/test script for compiler/examples/test.c
# Run from the project root: bash compiler/examples/build_test.sh

set -e

ROOT_DIR=../..
cd $ROOT_DIR/compiler/examples

rm -rf $ROOT_DIR/compiler/examples/dist
rm -rf $ROOT_DIR/compiler/examples/out

echo "==> webc: compile + run"
node $ROOT_DIR/tools/webc.js $ROOT_DIR/compiler/examples/test.c --no-system-includes -o out/test --run

echo "==> run-test-node runner"
node $ROOT_DIR/tools/run-test-node.js $ROOT_DIR/compiler/examples/test.c

echo "==> webc: create dist (browser + node)"
# Keep this broad legacy test on parser-stable mode. System include expansion
# is now default in webc and can expose unsupported aggregate-init edge cases
# in this file (tracked separately in diagnostic suites).
node $ROOT_DIR/tools/webc.js $ROOT_DIR/compiler/examples/test.c --no-system-includes --dist --out-dir dist --name test

echo "==> dist node runner"
bash dist/node-runner.sh

# Note: --resolve-system-includes expands stdlib headers inline and currently
# hits a compiler limitation with nested struct initializers in test.c.
# It works for simpler sources without nested struct aggregate initializers.
# echo "==> webc: with system includes (experimental)"
# node $ROOT_DIR/tools/webc.js $ROOT_DIR/compiler/examples/test.c -o out/test --resolve-system-includes --run

echo "==> All steps OK"
