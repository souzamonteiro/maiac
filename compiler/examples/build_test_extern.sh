#!/bin/bash

# Runner direto (Node)
node ../../tools/run-test-node.js ../../compiler/examples/test-extern.c

# Via webc
node ../../tools/webc.js ../../compiler/examples/test-extern.c -o out/test-extern --run

# Make dist (browser + node)
node ../../tools/webc.js ../../compiler/examples/test-extern.c --dist --out-dir dist-test-extern --name test-extern
bash dist-test-extern/node-runner.sh
