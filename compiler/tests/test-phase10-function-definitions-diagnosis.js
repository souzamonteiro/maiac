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
    name: 'ansi function definition with two typed parameters',
    fn: () => {
      const source = [
        'int add(int a, int b) { return a + b; }',
        'int test_entry(void) { return add(2, 3); }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 5);
    }
  },
  {
    name: 'void parameter list function can be called with no args',
    fn: () => {
      const source = [
        'int one(void) { return 1; }',
        'int test_entry(void) { return one(); }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 1);
    }
  },
  {
    name: 'forward declaration then definition resolves correctly',
    fn: () => {
      const source = [
        'int add(int a, int b);',
        'int add(int a, int b) { return a + b; }',
        'int test_entry(void) { return add(3, 4); }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 7);
    }
  },
  {
    name: 'recursive function definition executes',
    fn: () => {
      const source = [
        'int fact(int n) {',
        '  if (n <= 1) return 1;',
        '  return n * fact(n - 1);',
        '}',
        'int test_entry(void) { return fact(5); }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 120);
    }
  },
  {
    name: 'function returning pointer from parameter works',
    fn: () => {
      const source = [
        'int *id(int *p) { return p; }',
        'int test_entry(void) {',
        '  int x = 9;',
        '  int *q = id(&x);',
        '  return *q;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 9);
    }
  },
  {
    name: 'array-style parameter declarator decays to pointer in calls',
    fn: () => {
      const source = [
        'int second(int a[]) { return a[1]; }',
        'int test_entry(void) {',
        '  int v[3] = {4, 8, 9};',
        '  return second(v);',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 8);
    }
  },
  {
    name: 'function returning function-pointer without typedef works',
    fn: () => {
      const source = [
        'int add(int a, int b) { return a + b; }',
        'int (*getop(void))(int, int) { return add; }',
        'int test_entry(void) { return getop()(2, 6); }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 8);
    }
  },
  {
    name: 'local declaration cannot redeclare parameter name (negative)',
    fn: () => {
      const source = [
        'int f(int a) {',
        '  int a = 2;',
        '  return a;',
        '}',
        'int test_entry(void) { return f(1); }'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /Duplicate local symbol 'a'/);
    }
  },
  {
    name: 'nested function definition is rejected by parser (negative)',
    fn: () => {
      const source = [
        'int test_entry(void) {',
        '  int inner(void) { return 1; }',
        '  return inner();',
        '}'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /Parse failed|Expected at least one translationUnitItem/);
    }
  },
  {
    name: 'known limitation: K&R declaration list in function definition is not lowered',
    fn: () => {
      const source = [
        'int add(a, b)',
        'int a;',
        'int b;',
        '{',
        '  return a + b;',
        '}',
        'int test_entry(void) { return add(2, 4); }'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /Unknown symbol 'a'/);
    }
  },
  {
    name: 'duplicate parameter names in function definition are rejected',
    fn: () => {
      const source = [
        'int pick(int a, int a) { return a; }',
        'int test_entry(void) { return pick(1, 2); }'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /Duplicate parameter name/);
    }
  },
  {
    name: 'mismatched prototype/definition arity is diagnosed',
    fn: () => {
      const source = [
        'int add(int a);',
        'int add(int a, int b) { return a + b; }',
        'int test_entry(void) { return add(1); }'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /Conflicting parameter count/);
    }
  }
];

let failed = 0;
console.log('Running MaiaC Phase 10 function definitions diagnostics...\n');

for (const testCase of cases) {
  const ok = runCase(testCase.name, testCase.fn);
  if (!ok) {
    failed += 1;
  }
}

console.log(`\nSummary: ${cases.length - failed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
