#!/bin/bash

# Runner direto (Node)
node ../../tools/run-test-node.js ../../compiler/examples/test-extern.c

# Via webc
node ../../tools/webc.js ../../compiler/examples/test-extern.c -o out/test-extern --run