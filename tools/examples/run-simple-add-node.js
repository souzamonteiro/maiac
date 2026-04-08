#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const wasmPath = path.join(repoRoot, 'compiler', 'examples', 'simple_add.wasm');

async function main() {
  if (!fs.existsSync(wasmPath)) {
    throw new Error(
      `WASM file not found: ${wasmPath}\nRun: node tools/examples/build-simple-add-wasm.js`
    );
  }

  const wasmBytes = fs.readFileSync(wasmPath);
  const { instance } = await WebAssembly.instantiate(wasmBytes, {});

  if (typeof instance.exports.add_one !== 'function') {
    throw new Error('Exported function add_one was not found');
  }

  const input = 41;
  const output = instance.exports.add_one(input);
  console.log(`add_one(${input}) = ${output}`);
}

main().catch((error) => {
  console.error(`[simple-add-node] ${error.message}`);
  process.exitCode = 1;
});
