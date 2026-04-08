#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const { compileSource } = require('../compiler/c-compiler.js');
const { createPrintfHost } = require('./runtime/printf-host.js');

function usage() {
  console.log('Usage: node tools/run-test-node.js [source.c]');
  console.log('');
  console.log('Examples:');
  console.log('  node tools/run-test-node.js');
  console.log('  node tools/run-test-node.js compiler/examples/test.c');
}

async function main() {
  const arg = process.argv[2];
  if (arg === '--help' || arg === '-h') {
    usage();
    return;
  }

  const sourcePath = path.resolve(arg || path.join(__dirname, '..', 'compiler', 'examples', 'test.c'));
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  const source = fs.readFileSync(sourcePath, 'utf8');
  const result = compileSource(source, {
    sourcePath,
    validate: true,
    printWat: false
  });

  if (!result.wasm) {
    throw result.validationError || new Error('WASM output was not generated');
  }

  let memoryRef = null;
  const imports = {
    env: {
      printf: createPrintfHost({
        getMemory: () => memoryRef,
        write: (text) => process.stdout.write(String(text))
      })
    }
  };

  const wasmBytes = Buffer.from(result.wasm);
  const { instance } = await WebAssembly.instantiate(wasmBytes, imports);

  memoryRef = instance.exports.memory || null;
  const entry = instance.exports.main || instance.exports.test_entry;
  if (typeof entry !== 'function') {
    throw new Error('Missing exported entrypoint (expected main or test_entry)');
  }

  const exitCode = entry();
  process.stdout.write(`\n[maiac] program returned: ${exitCode}\n`);
}

main().catch((error) => {
  console.error(`[maiac-runner] ${error.message}`);
  process.exitCode = 1;
});
