#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const { compileSource } = require('../compiler/c-compiler.js');
const { createPrintfHost } = require('../src/runtime/stdio.js');
const { buildHostEnv } = require('./host-env-builder.js');
const { createDefaultHostBuiltins } = require('../src/runtime/default-host-builtins.js');

function usage() {
  console.log('Usage: node tools/run-test-node.js [source.c]');
  console.log('');
  console.log('Examples:');
  console.log('  node tools/run-test-node.js');
  console.log('  node tools/run-test-node.js compiler/examples/test.c');
}

function extractHeaderLibraries(source) {
  const includeRegex = /^\s*#\s*include\s*[<"]([^">]+)[">]/gm;
  const libs = [];
  const seen = new Set();
  let match;

  while ((match = includeRegex.exec(String(source || ''))) !== null) {
    const includePath = String(match[1] || '').trim();
    if (!includePath.toLowerCase().endsWith('.h')) {
      continue;
    }
    const name = path.basename(includePath, '.h');
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    libs.push(name);
  }

  return libs;
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
  const requiredLibraries = extractHeaderLibraries(source);
  const result = compileSource(source, {
    sourcePath,
    validate: true,
    printWat: false,
    resolveSystemIncludes: true
  });

  if (!result.wasm) {
    throw result.validationError || new Error('WASM output was not generated');
  }

  let memoryRef = null;

  // Build env entries for all '__object__method' host externs declared in the
  // C source.  Each entry is auto-generated from the compiler's hostImports
  // metadata: char* params are dereferenced to JS strings, and the JS call
  // target is derived from the name (e.g. __console__log → console.log).
  const hostEnv = buildHostEnv(result.hostImports, {
    getMemory: () => memoryRef
  });
  const defaultBuiltins = createDefaultHostBuiltins(() => memoryRef);

  const imports = {
    env: {
      // Legacy variadic import – always provided.
      printf: createPrintfHost({
        getMemory: () => memoryRef,
        write: (text) => process.stdout.write(String(text))
      }),
      ...defaultBuiltins,
      // Auto-generated wrappers for user-declared extern __* functions.
      ...hostEnv
    }
  };

  const baseDir = path.dirname(sourcePath);
  for (const libName of requiredLibraries) {
    const libPath = path.join(baseDir, `${libName}.wasm`);
    if (!fs.existsSync(libPath)) {
      continue;
    }

    const libBytes = fs.readFileSync(libPath);
    const libInstantiated = await WebAssembly.instantiate(libBytes, imports);
    const libInstance = libInstantiated.instance || libInstantiated;
    const exported = libInstance && libInstance.exports ? Object.entries(libInstance.exports) : [];

    for (const exportEntry of exported) {
      const exportName = exportEntry[0];
      const exportValue = exportEntry[1];
      if (typeof exportValue === 'function' && imports.env[exportName] == null) {
        imports.env[exportName] = exportValue;
      }
    }

    if (!memoryRef && libInstance.exports && libInstance.exports.memory) {
      memoryRef = libInstance.exports.memory;
    }
  }

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

