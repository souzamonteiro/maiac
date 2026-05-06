'use strict';

const assert = require('assert');
const path = require('path');

const { preprocessCSource } = require('../c-preprocessor.js');
const { compileSource } = require('../c-compiler.js');

const fixturesDir = path.join(__dirname, 'fixtures', 'preprocessor');
const sourcePath = path.join(fixturesDir, 'entry.c');

function runEntryFromSource(source) {
  const result = compileSource(source, { sourcePath, validate: true, printWat: false });
  assert.ok(result.wasm, 'expected wasm output');
  const wasmBytes = Buffer.from(result.wasm);
  const wasmModule = new WebAssembly.Module(wasmBytes);
  const instance = new WebAssembly.Instance(wasmModule, { env: { printf: () => 0 } });
  const entry = instance.exports && instance.exports.test_entry;
  assert.strictEqual(typeof entry, 'function', 'missing test_entry export');
  return entry();
}

function runCase(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
    return true;
  } catch (error) {
    console.log(`FAIL ${name}`);
    console.log(`  ${String(error && error.message ? error.message : error)}`);
    return false;
  }
}

const cases = [
  {
    name: 'recursive include values participate in #if arithmetic',
    fn: () => {
      const source = [
        '#include "recursive_a.h"',
        '#if (A_VAL + B_VAL) == 33',
        'int test_entry(void) { return 1; }',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 1);
    }
  },
  {
    name: '#if/#elif chain with defined(undefined_symbol) fallback',
    fn: () => {
      const source = [
        '#if defined(NOT_SET)',
        'int test_entry(void) { return 1; }',
        '#elif !defined(NOT_SET)',
        'int test_entry(void) { return 9; }',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 9);
    }
  },
  {
    name: 'function-like macro with line continuation (\\) expands',
    fn: () => {
      const source = [
        '#define ADD3(a,b,c) ((a) + \\',
        ' (b) + \\',
        ' (c))',
        'int test_entry(void) { return ADD3(1,2,3); }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 6);
    }
  },
  {
    name: 'known limitation: #if arithmetic does not fully expand nested macro expression',
    fn: () => {
      const source = [
        '#define A 3',
        '#define B (A + 4)',
        '#if B == 7',
        'int test_entry(void) { return 42; }',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif'
      ].join('\n');

      // Current behavior: condition falls through to #else branch.
      assert.strictEqual(runEntryFromSource(source), 0);
    }
  },
  {
    name: 'known limitation: function-like macro in #if expression is not evaluated',
    fn: () => {
      const source = [
        '#define IS_ODD(x) ((x) & 1)',
        '#if IS_ODD(3)',
        'int test_entry(void) { return 1; }',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif'
      ].join('\n');

      // Current behavior: branch resolves to #else.
      assert.strictEqual(runEntryFromSource(source), 0);
    }
  },
  {
    name: 'known limitation: composed token pasting macro expansion fails parsing',
    fn: () => {
      const source = [
        '#define CAT(a,b) a ## b',
        '#define MK(name) CAT(name,_v)',
        'int foo_v = 17;',
        'int test_entry(void) { return MK(foo); }'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /Parse failed|Unexpected token at end/);
    }
  },
  {
    name: 'known limitation: nested stringification + global initializer rejected',
    fn: () => {
      const source = [
        '#define STR(x) #x',
        '#define WRAP(y) STR(y)',
        '#define VALUE token',
        'const char *s = WRAP(VALUE);',
        'int test_entry(void) { return 1; }'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /Only literal global initializers are supported/);
    }
  },
  {
    name: '#undef followed by macro use reports unknown symbol',
    fn: () => {
      const source = [
        '#define X 5',
        '#undef X',
        'int test_entry(void) { return X; }'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /Unknown symbol 'X'/);
    }
  },
  {
    name: 'known behavior: missing include is tolerated',
    fn: () => {
      const source = [
        '#include "missing_header_xyz.h"',
        'int test_entry(void) { return 1; }'
      ].join('\n');

      preprocessCSource(source, { sourcePath });
      assert.strictEqual(runEntryFromSource(source), 1);
    }
  }
];

let failed = 0;
console.log('Running MaiaC Phase 9 preprocessor advanced diagnostics...\n');

for (const testCase of cases) {
  const ok = runCase(testCase.name, testCase.fn);
  if (!ok) {
    failed += 1;
  }
}

console.log(`\nSummary: ${cases.length - failed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
