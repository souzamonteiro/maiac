#!/bin/bash

node ../../tools/webc.js ../../compiler/examples/vfs_persist_demo.c -o out/vfs_persist_demo --run

# Make dist (browser + node)
node ../../tools/webc.js ../../compiler/examples/vfs_persist_demo.c --dist --out-dir dist-vfs-persist-demo --name vfs-persist-demo
bash dist-vfs-persist-demo/node-runner.sh
