'use strict';

const fs = require('fs');
const path = require('path');

const { compileSource } = require('../c-compiler.js');
const { createPrintfHost } = require('../../tools/runtime/printf-host.js');

const sourcePath = path.join(__dirname, '..', 'examples', 'test.c');

(async () => {
  if (!fs.existsSync(sourcePath)) {
    console.error('Missing large example source:', sourcePath);
    process.exit(1);
  }

  const source = fs.readFileSync(sourcePath, 'utf8');

  console.log('Running MaiaC large-example E2E...');
  console.log('  Source:', sourcePath);

  const started = Date.now();
  const result = compileSource(source, {
    sourcePath,
    validate: true,
    printWat: false
  });

  if (!result.wasm) {
    throw result.validationError || new Error('WASM binary was not produced');
  }

  const wasmBytes = Buffer.from(result.wasm);
  if (!WebAssembly.validate(new Uint8Array(wasmBytes))) {
    throw new Error('Generated large-example WASM is invalid');
  }

  let memoryRef = null;
  const { instance } = await WebAssembly.instantiate(wasmBytes, {
    env: {
      printf: createPrintfHost({
        getMemory: () => memoryRef,
        write: () => {}
      })
    }
  });
  memoryRef = instance.exports.memory || null;
  const entry = (instance.exports && (instance.exports.main || instance.exports.test_entry)) || null;

  if (typeof entry !== 'function') {
    throw new Error('Missing runtime entrypoint export (expected main or test_entry)');
  }

  const runtimeResult = entry();
  const elapsedMs = Date.now() - started;

  if (!Number.isInteger(runtimeResult)) {
    throw new Error(`Runtime returned non-integer value: ${runtimeResult}`);
  }

  console.log(`  Runtime entry returned: ${runtimeResult}`);
  console.log(`  Compile+validate+run time: ${elapsedMs}ms`);
  console.log('Large-example E2E: PASS');
})();
