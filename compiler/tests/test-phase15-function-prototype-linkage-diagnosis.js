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

function expectCompileError(source, messagePattern) {
  assert.throws(
    () => compileSource(source, { validate: true, printWat: false }),
    (error) => messagePattern.test(String(error && error.message ? error.message : error))
  );
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
    name: 'self-recursive function with forward prototype works',
    fn: () => {
      const source = [
        'int fact(int);',
        'int fact(int n) {',
        '  if (n <= 1) return 1;',
        '  return n * fact(n - 1);',
        '}',
        'int test_entry(void) { return fact(6); }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 720);
    }
  },
  {
    name: 'variadic function definition parses and executes baseline behavior',
    fn: () => {
      const source = [
        'int sum(int n, ...) { return n; }',
        'int test_entry(void) { return sum(7, 1, 2); }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 7);
    }
  },
  {
    name: 'return type mismatch across prototype and definition is diagnosed',
    fn: () => {
      const source = [
        'int f(int a);',
        'long f(int a) { return a + 1; }',
        'int test_entry(void) { return f(3); }'
      ].join('\n');

      expectCompileError(source, /Conflicting return type/);
    }
  },
  {
    name: 'parameter type mismatch across prototype and definition is diagnosed',
    fn: () => {
      const source = [
        'int f(int a);',
        'int f(long a) { return (int)a; }',
        'int test_entry(void) { return f(5); }'
      ].join('\n');

      expectCompileError(source, /Conflicting parameter type/);
    }
  },
  {
    name: 'call with too many arguments is rejected',
    fn: () => {
      const source = [
        'int add(int a, int b) { return a + b; }',
        'int test_entry(void) { return add(1, 2, 3); }'
      ].join('\n');

      expectCompileError(source, /expects 2 arguments but got 3/);
    }
  },
  {
    name: 'call with too few arguments is rejected',
    fn: () => {
      const source = [
        'int add(int a, int b) { return a + b; }',
        'int test_entry(void) { return add(1); }'
      ].join('\n');

      expectCompileError(source, /expects 2 arguments but got 1/);
    }
  },
  {
    name: 'void-parameter function called with arguments is rejected',
    fn: () => {
      const source = [
        'int f(void) { return 9; }',
        'int test_entry(void) { return f(1); }'
      ].join('\n');

      expectCompileError(source, /does not take arguments/);
    }
  },
  {
    name: 'void prototype then typed definition mismatch is diagnosed',
    fn: () => {
      const source = [
        'int f(void);',
        'int f(int x) { return x; }',
        'int test_entry(void) { return f(4); }'
      ].join('\n');

      expectCompileError(source, /Conflicting parameter list/);
    }
  },
  {
    name: 'extern prototype followed by static definition is rejected',
    fn: () => {
      const source = [
        'int f(int);',
        'static int f(int x) { return x + 2; }',
        'int test_entry(void) { return f(3); }'
      ].join('\n');

      expectCompileError(source, /Conflicting linkage/);
    }
  },
  {
    name: 'static prototype followed by non-static definition is rejected',
    fn: () => {
      const source = [
        'static int f(int);',
        'int f(int x) { return x + 3; }',
        'int test_entry(void) { return f(3); }'
      ].join('\n');

      expectCompileError(source, /Conflicting linkage/);
    }
  },
  {
    name: 'K&R-style definition keeps baseline behavior',
    fn: () => {
      const source = [
        'int add(a, b) { return 1; }',
        'int test_entry(void) { return add(2, 3); }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 1);
    }
  },
  {
    name: 'function returning struct by value supports member access result',
    fn: () => {
      const source = [
        'struct P { int x; };',
        'struct P mk(int v) {',
        '  struct P p;',
        '  p.x = v;',
        '  return p;',
        '}',
        'int test_entry(void) { return mk(7).x; }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 7);
    }
  },
  {
    name: 'function pointer call returning struct supports member access',
    fn: () => {
      const source = [
        'struct P { int x; };',
        'struct P mk(int v) {',
        '  struct P p;',
        '  p.x = v;',
        '  return p;',
        '}',
        'int test_entry(void) {',
        '  struct P (*fp)(int);',
        '  fp = mk;',
        '  return fp(9).x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 9);
    }
  },
  {
    name: 'array slot function pointer returning struct supports member access',
    fn: () => {
      const source = [
        'struct P { int x; };',
        'struct P mk(int v) {',
        '  struct P p;',
        '  p.x = v;',
        '  return p;',
        '}',
        'int test_entry(void) {',
        '  struct P (*ops[1])(int);',
        '  ops[0] = mk;',
        '  return ops[0](11).x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 11);
    }
  },
  {
    name: 'struct field function pointer returning struct supports member access',
    fn: () => {
      const source = [
        'struct P { int x; };',
        'struct H { struct P (*op)(int); };',
        'struct P mk(int v) {',
        '  struct P p;',
        '  p.x = v;',
        '  return p;',
        '}',
        'int test_entry(void) {',
        '  struct H h;',
        '  h.op = mk;',
        '  return h.op(13).x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 13);
    }
  }
];

let failed = 0;
console.log('Running MaiaC Phase 15 function prototype/linkage diagnostics...\n');

for (const testCase of cases) {
  const ok = runCase(testCase.name, testCase.fn);
  if (!ok) {
    failed += 1;
  }
}

console.log(`\nSummary: ${cases.length - failed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
