#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { compileSource } = require('../compiler/c-compiler.js');
let WatAssembler = null;

try {
  WatAssembler = require('../maiawasm/assembler/wat-assembler.js');
} catch (_error) {
  WatAssembler = null;
}

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const LIB_DIR = path.join(ROOT, 'lib');

const C_LIBS = [
  { name: 'stdlib', file: 'stdlib-lite.c', required: true },
  { name: 'string', file: 'string.c', required: true }
];

const WAT_LIBS = [
  { name: 'setjmp', file: 'setjmp.wat', required: true }
];

function stripWatComments(source) {
  return String(source)
    .replace(/^\s*;;.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildCLib(entry) {
  const sourcePath = path.join(SRC_DIR, entry.file);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const result = compileSource(source, {
    sourcePath,
    validate: true,
    printWat: false,
    resolveSystemIncludes: true
  });

  if (!result.wasm) {
    throw result.validationError || new Error(`Failed to build ${entry.name} from C`);
  }

  const outPath = path.join(LIB_DIR, `${entry.name}.wasm`);
  fs.writeFileSync(outPath, Buffer.from(result.wasm));
  return outPath;
}

function buildWatLib(entry) {
  if (!WatAssembler) {
    throw new Error('MaiaWASM assembler unavailable. Ensure maiawasm submodule is available.');
  }

  const sourcePath = path.join(SRC_DIR, entry.file);
  const wat = fs.readFileSync(sourcePath, 'utf8');
  const assembler = new WatAssembler();
  const wasm = assembler.assemble(stripWatComments(wat));

  if (typeof WebAssembly !== 'undefined' && typeof WebAssembly.Module === 'function') {
    new WebAssembly.Module(wasm);
  }

  const outPath = path.join(LIB_DIR, `${entry.name}.wasm`);
  fs.writeFileSync(outPath, Buffer.from(wasm));
  return outPath;
}

function main() {
  if (!fs.existsSync(LIB_DIR)) {
    fs.mkdirSync(LIB_DIR, { recursive: true });
  }

  const outputs = [];
  const skipped = [];

  for (const lib of C_LIBS) {
    try {
      outputs.push(buildCLib(lib));
    } catch (error) {
      if (lib.required === false) {
        skipped.push({ name: lib.name, reason: error.message });
      } else {
        throw error;
      }
    }
  }

  for (const lib of WAT_LIBS) {
    try {
      outputs.push(buildWatLib(lib));
    } catch (error) {
      if (lib.required === false) {
        skipped.push({ name: lib.name, reason: error.message });
      } else {
        throw error;
      }
    }
  }

  for (const p of outputs) {
    console.log(`[build-libs] wasm -> ${p}`);
  }

  for (const entry of skipped) {
    console.log(`[build-libs] skipped optional lib '${entry.name}': ${entry.reason}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`[build-libs] ${error.message}`);
  process.exit(1);
}
