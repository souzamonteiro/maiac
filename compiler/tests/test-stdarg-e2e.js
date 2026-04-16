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

async function compileAndRun(source) {
  const compileResult = compileSource(source, {
    sourcePath: __filename,
    validate: true,
    printWat: false,
    resolveSystemIncludes: true
  });

  if (!compileResult.wasm) {
    throw compileResult.validationError || new Error('WASM output missing');
  }

  let memoryRef = null;
  const writes = [];
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

  if (!instance.exports || typeof instance.exports.main !== 'function') {
    throw new Error('Missing main() export');
  }

  return {
    rc: instance.exports.main(),
    writes
  };
}

async function main() {
  const vaArgIntSource = [
    '#include <stdarg.h>',
    '',
    'int sum_ints(int first, ...) {',
    '  va_list ap;',
    '  int a;',
    '  int b;',
    '  va_start(ap, first);',
    '  a = va_arg(ap, int);',
    '  b = va_arg(ap, int);',
    '  va_end(ap);',
    '  return (a + b) == 5 ? 0 : 13;',
    '}',
    '',
    'int main(void) {',
    '  return sum_ints(1, 2, 3);',
    '}'
  ].join('\n');

  const vsprintfSource = [
    '#include <stdio.h>',
    '#include <stdarg.h>',
    '',
    'int format_line(char *out, const char *fmt, ...) {',
    '  va_list ap;',
    '  int n;',
    '  va_start(ap, fmt);',
    '  n = vsprintf(out, fmt, ap);',
    '  va_end(ap);',
    '  return n;',
    '}',
    '',
    'int main(void) {',
    '  char buf[64];',
    '  int n = format_line(buf, "%d %.1f %s", 7, 2.5, "ok");',
    '  if (n <= 0) return 21;',
    '  if (buf[0] != 55) return 22;',
    '  if (buf[2] != 50) return 23;',
    '  if (buf[6] != 111) return 24;',
    '  if (buf[7] != 107) return 25;',
    '  return 0;',
    '}'
  ].join('\n');

  const results = [];

  {
    const runtime = await compileAndRun(vaArgIntSource);
    results.push(runTest('va_arg with integer arguments works end-to-end', () => {
      assert.strictEqual(runtime.rc, 0);
    }));
  }

  {
    const runtime = await compileAndRun(vsprintfSource);
    results.push(runTest('vsprintf consumes va_list built by user variadic function', () => {
      assert.strictEqual(runtime.rc, 0);
    }));
  }

  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(`\nSummary: ${results.length - failed.length} passed, ${failed.length} failed`);
    process.exit(1);
  }

  console.log(`\nSummary: ${results.length} passed, 0 failed`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
