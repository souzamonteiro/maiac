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
    name: 'token pasting (##) builds identifiers',
    fn: () => {
      const source = [
        '#define CAT(a, b) a ## b',
        'int xy = 7;',
        'int test_entry(void) { return CAT(x, y); }'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      assert.ok(pre.includes('return xy;') || pre.includes('return (xy);'));
      assert.strictEqual(runEntryFromSource(source), 7);
    }
  },
  {
    name: 'stringification (#) emits string literal text',
    fn: () => {
      const source = [
        '#define STR(x) #x',
        'const char *s = STR(alpha + beta);',
        'int test_entry(void) { return 1; }'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      assert.ok(pre.includes('"alpha + beta"'));
    }
  },
  {
    name: 'recursive macro chain stabilizes by iterative expansion',
    fn: () => {
      const source = [
        '#define A B',
        '#define B C',
        '#define C 13',
        'int test_entry(void) { return A; }'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      assert.ok(/return\s*\(+\s*13\s*\)+\s*;/.test(pre));
      assert.strictEqual(runEntryFromSource(source), 13);
    }
  },
  {
    name: 'nested conditional expression with defined() and arithmetic',
    fn: () => {
      const source = [
        '#define X 2',
        '#define Y 5',
        '#if defined(X) && ((X + Y) == 7)',
        'int test_entry(void) { return 9; }',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 9);
    }
  },
  {
    name: 'native arrow operator passes through preprocessing unchanged',
    fn: () => {
      const source = [
        'struct Node { int value; };',
        'int test_entry(void) {',
        '  struct Node n;',
        '  struct Node *p = &n;',
        '  n.value = 12;',
        '  return p->value;',
        '}'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      assert.ok(pre.includes('p->value'));
      assert.ok(!pre.includes('__arrow__'));
      assert.strictEqual(runEntryFromSource(source), 12);
    }
  }
];

let failed = 0;
console.log('Running MaiaC Phase 5 preprocessor edge-case tests...\n');

for (const testCase of cases) {
  const ok = runCase(testCase.name, testCase.fn);
  if (!ok) {
    failed += 1;
  }
}

console.log(`\nSummary: ${cases.length - failed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
