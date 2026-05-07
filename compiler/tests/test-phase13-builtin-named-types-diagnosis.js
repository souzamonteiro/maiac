'use strict';

const assert = require('assert');

const { compileSource } = require('../c-compiler.js');

function runEntryFromSource(source) {
  const result = compileSource(source, { validate: true, printWat: false });
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
    name: 'char builtin type stores and returns byte-sized value',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  char c = 65;',
        '  return c;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 65);
    }
  },
  {
    name: 'sizeof(short), sizeof(long), sizeof(float), sizeof(double)',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  return sizeof(short) + sizeof(long) + sizeof(float) + sizeof(double);',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 18);
    }
  },
  {
    name: 'signed integer builtin type behaves with negative value',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  signed int x = -3;',
        '  return x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), -3);
    }
  },
  {
    name: 'float and double values can be cast to int',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  float f = 3.9;',
        '  double d = 4.2;',
        '  return (int)f + (int)d;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 7);
    }
  },
  {
    name: 'void function return type participates in call flow',
    fn: () => {
      const source = [
        'void noop(void) {}',
        'int test_entry(void) {',
        '  noop();',
        '  return 1;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 1);
    }
  },
  {
    name: 'typedef alias for builtin type works',
    fn: () => {
      const source = [
        'typedef unsigned int u32;',
        'int test_entry(void) {',
        '  u32 x = 9;',
        '  return x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 9);
    }
  },
  {
    name: 'typedef chain over builtin type works',
    fn: () => {
      const source = [
        'typedef unsigned int U;',
        'typedef U UU;',
        'int test_entry(void) {',
        '  UU x = 12;',
        '  return x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 12);
    }
  },
  {
    name: 'named struct type via typedef works in declarations',
    fn: () => {
      const source = [
        'typedef struct P { int x; } P;',
        'int test_entry(void) {',
        '  P p;',
        '  p.x = 7;',
        '  return p.x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 7);
    }
  },
  {
    name: 'enum named type and typedef enum alias both work',
    fn: () => {
      const source = [
        'enum C { A = 2, B = 5 };',
        'typedef enum C C;',
        'int test_entry(void) {',
        '  enum C first = B;',
        '  C second = A;',
        '  return first + second;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 7);
    }
  },
  {
    name: 'forward struct tag definition is accepted as named type',
    fn: () => {
      const source = [
        'struct N;',
        'struct N { int x; };',
        'int test_entry(void) {',
        '  struct N n;',
        '  n.x = 6;',
        '  return n.x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 6);
    }
  },
  {
    name: 'enum default enumerator numbering works',
    fn: () => {
      const source = [
        'enum E { A, B, C };',
        'int test_entry(void) {',
        '  return A + B + C;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 3);
    }
  },
  {
    name: 'known limitation: unsigned comparison semantics are not fully C89-compliant',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  unsigned int x = -1;',
        '  return x > 0;',
        '}'
      ].join('\n');

      // Current behavior: result is 0, while strict C unsigned semantics would yield 1.
      assert.strictEqual(runEntryFromSource(source), 0);
    }
  },
  {
    name: 'known limitation: local variable declared as void is accepted',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  void x;',
        '  return 0;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 0);
    }
  },
  {
    name: 'known behavior: long long is accepted as extension',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  long long x = 1;',
        '  return (int)x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 1);
    }
  }
];

let failed = 0;
console.log('Running MaiaC Phase 13 builtin/named type diagnostics...\n');

for (const testCase of cases) {
  const ok = runCase(testCase.name, testCase.fn);
  if (!ok) {
    failed += 1;
  }
}

console.log(`\nSummary: ${cases.length - failed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
