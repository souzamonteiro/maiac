'use strict';

const assert = require('assert');
const { compileSource } = require('../c-compiler.js');
const { createDefaultHostBuiltins } = require('../../src/runtime/default-host-builtins.js');
const { createPrintfHost } = require('../../src/runtime/stdio.js');

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
    return { passed: true, name };
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    return { passed: false, name, error };
  }
}

async function main() {
  const source = [
    '#include <stdio.h>',
    'int main(void) {',
    '  char buf[32];',
    '  int n;',
    '  n = sprintf(buf, "v=%d", 7);',
    '  fprintf((FILE*)2, "%s:%d", buf, n);',
    '  return n;',
    '}'
  ].join('\n');

  const writes = [];
  const compileResult = compileSource(source, {
    sourcePath: __filename,
    validate: true,
    printWat: false,
    resolveSystemIncludes: false
  });

  if (!compileResult.wasm) {
    throw compileResult.validationError || new Error('WASM output missing');
  }

  let memoryRef = null;
  const imports = {
    env: {
      printf: createPrintfHost({
        getMemory: () => memoryRef,
        write: (text) => writes.push(String(text))
      }),
      ...createDefaultHostBuiltins(() => memoryRef, {
        write: (text) => writes.push(String(text))
      })
    }
  };

  const instantiated = await WebAssembly.instantiate(Buffer.from(compileResult.wasm), imports);
  const instance = instantiated.instance || instantiated;
  memoryRef = instance.exports.memory || null;

  const tests = [
    runTest('sprintf + fprintf imports format and write text', () => {
      assert.ok(typeof instance.exports.main === 'function');
      const rc = instance.exports.main();
      assert.strictEqual(rc, 3);
      const joined = writes.join('');
      assert.ok(joined.includes('v=7:3'));
    })
  ];

  const failed = tests.filter((t) => !t.passed);
  if (failed.length > 0) {
    console.error(`\nSummary: ${tests.length - failed.length} passed, ${failed.length} failed`);
    process.exit(1);
  }

  console.log(`\nSummary: ${tests.length} passed, 0 failed`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
