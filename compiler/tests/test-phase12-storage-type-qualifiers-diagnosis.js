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
    name: 'const-qualified local variable is readable',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  const int x = 5;',
        '  return x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 5);
    }
  },
  {
    name: 'volatile local variable read/write path works',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  volatile int x = 4;',
        '  x = 7;',
        '  return x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 7);
    }
  },
  {
    name: 'const volatile combination parses and runs',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  const volatile int x = 6;',
        '  return x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 6);
    }
  },
  {
    name: 'register storage class on local variable is accepted',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  register int x = 8;',
        '  return x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 8);
    }
  },
  {
    name: 'auto storage class on local variable is accepted',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  auto int x = 12;',
        '  return x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 12);
    }
  },
  {
    name: 'static local state is preserved across repeated calls',
    fn: () => {
      const source = [
        'int bump(void) {',
        '  static int c = 0;',
        '  c = c + 1;',
        '  return c;',
        '}',
        'int test_entry(void) {',
        '  return bump() + bump();',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 3);
    }
  },
  {
    name: 'static global variable declaration works',
    fn: () => {
      const source = [
        'static int g = 11;',
        'int test_entry(void) { return g; }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 11);
    }
  },
  {
    name: 'typedef alias with qualifier works in declarations',
    fn: () => {
      const source = [
        'typedef volatile int vint;',
        'int test_entry(void) {',
        '  vint x = 14;',
        '  return x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 14);
    }
  },
  {
    name: 'const local assignment is now rejected',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  const int x = 5;',
        '  x = 9;',
        '  return x;',
        '}'
      ].join('\n');

      // Resolved in Phase 16: assignment to const local now throws CompilationError.
      assert.throws(
        () => compileSource(source, { validate: false, printWat: false }),
        (err) => /read-only/.test(String(err.message))
      );
    }
  },
  {
    name: 'known limitation: write through pointer-to-const is not rejected',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  int v = 7;',
        '  const int *p = &v;',
        '  *p = 3;',
        '  return v;',
        '}'
      ].join('\n');

      // Current behavior: pointee constness is not enforced.
      assert.strictEqual(runEntryFromSource(source), 3);
    }
  },
  {
    name: 'known limitation: duplicate const qualifier is accepted',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  const const int x = 2;',
        '  return x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 2);
    }
  },
  {
    name: 'extern declaration plus same-unit definition resolves correctly',
    fn: () => {
      const source = [
        'extern int g;',
        'int g = 13;',
        'int test_entry(void) { return g; }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 13);
    }
  },
  {
    name: 'extern declaration without definition uses zero fallback',
    fn: () => {
      const source = [
        'extern int g;',
        'int test_entry(void) { return g; }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 0);
    }
  }
];

let failed = 0;
console.log('Running MaiaC Phase 12 storage/type qualifier diagnostics...\n');

for (const testCase of cases) {
  const ok = runCase(testCase.name, testCase.fn);
  if (!ok) {
    failed += 1;
  }
}

console.log(`\nSummary: ${cases.length - failed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
