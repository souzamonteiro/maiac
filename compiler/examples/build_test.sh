#!/bin/bash
# Build/test script for compiler/examples/test.c
# Run from the project root: bash compiler/examples/build_test.sh

set -e

ROOT_DIR=../..
cd $ROOT_DIR/compiler/examples
echo "==> webc: compile + run"
node $ROOT_DIR/tools/webc.js $ROOT_DIR/compiler/examples/test.c -o out/test --run

echo "==> run-test-node runner"
node $ROOT_DIR/tools/run-test-node.js $ROOT_DIR/compiler/examples/test.c

echo "==> create-dist: browser package"
node $ROOT_DIR/tools/create-dist.js $ROOT_DIR/compiler/examples/test.c -o dist --name test

# Note: --resolve-system-includes expands stdlib headers inline and currently
# hits a compiler limitation with nested struct initializers in test.c.
# It works for simpler sources without nested struct aggregate initializers.
# echo "==> webc: with system includes (experimental)"
# node $ROOT_DIR/tools/webc.js $ROOT_DIR/compiler/examples/test.c -o out/test --resolve-system-includes --run

echo "==> All steps OK"
