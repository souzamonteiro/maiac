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
    name: 'explicit and implicit enumerator numbering works',
    fn: () => {
      const source = [
        'enum E { A = 3, B, C = 10, D };',
        'int test_entry(void) { return A + B + C + D; }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 28);
    }
  },
  {
    name: 'character constant can define enumerator value',
    fn: () => {
      const source = [
        'enum E { CH = \'A\' };',
        'int test_entry(void) { return CH; }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 65);
    }
  },
  {
    name: 'forward enum tag declaration then definition works',
    fn: () => {
      const source = [
        'enum E;',
        'enum E { A = 4 };',
        'int test_entry(void) { enum E v = A; return v; }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 4);
    }
  },
  {
    name: 'typedef alias over enum tag works',
    fn: () => {
      const source = [
        'enum E { A = 6 };',
        'typedef enum E E;',
        'int test_entry(void) { E v = A; return v; }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 6);
    }
  },
  {
    name: 'enum values work in switch statement dispatch',
    fn: () => {
      const source = [
        'enum K { K0 = 0, K1 = 1 };',
        'int test_entry(void) {',
        '  enum K k = K1;',
        '  switch (k) {',
        '    case K0: return 4;',
        '    case K1: return 9;',
        '    default: return 0;',
        '  }',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 9);
    }
  },
  {
    name: 'enum type in function parameter/argument path works',
    fn: () => {
      const source = [
        'enum K { V = 12 };',
        'int f(enum K k) { return k; }',
        'int test_entry(void) { return f(V); }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 12);
    }
  },
  {
    name: 'unknown enumerator symbol is rejected (negative)',
    fn: () => {
      const source = [
        'enum E { A = 1 };',
        'int test_entry(void) { return B; }'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /Unknown symbol 'B'/);
    }
  },
  {
    name: 'trailing comma in enumerator list is rejected (negative)',
    fn: () => {
      const source = [
        'enum E { A = 1, B = 2, };',
        'int test_entry(void) { return B; }'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /Parse failed|Expected at least one translationUnitItem/);
    }
  },
  {
    name: 'negative enumerator values are evaluated correctly',
    fn: () => {
      const source = [
        'enum E { NEG = -2, POS = 5 };',
        'int test_entry(void) { return NEG + POS; }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 3);
    }
  },
  {
    name: 'enumerator references in enum initializers are resolved',
    fn: () => {
      const source = [
        'enum E { X = 2, Y = X + 4, Z = Y + 1 };',
        'int test_entry(void) { return Z; }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 7);
    }
  },
  {
    name: 'enum tag redeclaration with new body is rejected',
    fn: () => {
      const source = [
        'enum E { A = 1 };',
        'enum E { B = 2 };',
        'int test_entry(void) { return B; }'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /Redefinition of enum/);
    }
  },
  {
    name: 'duplicate enumerator names are rejected',
    fn: () => {
      const source = [
        'enum E { A = 1, A = 2 };',
        'int test_entry(void) { return A; }'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /Duplicate enumerator name/);
    }
  },
  {
    name: 'known behavior: out-of-range enum constant wraps to signed 32-bit',
    fn: () => {
      const source = [
        'enum E { BIG = 2147483648 };',
        'int test_entry(void) { return BIG; }'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), -2147483648);
    }
  },
  {
    name: 'incomplete enum type in local variable declaration is rejected',
    fn: () => {
      const source = [
        'enum E;',
        'int test_entry(void) { enum E v; return 0; }'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /incomplete enum type/);
    }
  }
];

let failed = 0;
console.log('Running MaiaC Phase 14 enum declaration diagnostics...\n');

for (const testCase of cases) {
  const ok = runCase(testCase.name, testCase.fn);
  if (!ok) {
    failed += 1;
  }
}

console.log(`\nSummary: ${cases.length - failed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
