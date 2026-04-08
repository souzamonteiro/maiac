#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { compileSource } = require('../../compiler/c-compiler.js');

const repoRoot = path.resolve(__dirname, '..', '..');
const sourcePath = path.join(repoRoot, 'compiler', 'examples', 'test.c');
const wasmOutPath = path.join(repoRoot, 'compiler', 'examples', 'test.wasm');
const watOutPath = path.join(repoRoot, 'compiler', 'examples', 'test.wat');

function main() {
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

  fs.writeFileSync(wasmOutPath, Buffer.from(result.wasm));
  fs.writeFileSync(watOutPath, result.wat, 'utf8');

  console.log(`WASM written to: ${wasmOutPath}`);
  console.log(`WAT written to:  ${watOutPath}`);
}

main();
