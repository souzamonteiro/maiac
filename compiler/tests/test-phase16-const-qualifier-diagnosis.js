/**
 * Fase 16 - Diagnostics: const qualifier enforcement
 *
 * Focus:
 * - Assignment to const local variable is rejected
 * - Increment/decrement of const local variable is rejected
 * - const parameter treated as read-only
 * - const global variable is rejected for write
 * - Reading a const variable works correctly
 * - pointer-to-const pointee mutability is diagnosed as read-only on writes
 */

'use strict';

const assert = require('assert');
const { compileSource } = require('../c-compiler.js');

function runEntryFromSource(source) {
  const result = compileSource(source, { validate: true, printWat: false });
  assert.ok(result.wasm, 'expected wasm output');
  const wasmBytes = Buffer.from(result.wasm);
  const wasmModule = new WebAssembly.Module(wasmBytes);
  const instance = new WebAssembly.Instance(wasmModule, { env: { printf: () => 0 } });
  const fn = instance.exports.test_entry || instance.exports.main;
  return fn();
}

function expectCompilationError(source, messageSubstring) {
  let threw = null;
  try {
    compileSource(source, { validate: false, printWat: false });
  } catch (err) {
    threw = err;
  }
  assert.ok(threw, `Expected CompilationError matching '${messageSubstring}' but no error was thrown`);
  assert.ok(
    String(threw.message).includes(messageSubstring),
    `Expected error message to include '${messageSubstring}' but got: ${threw.message}`
  );
}

const cases = [
  {
    name: 'reading a const local variable works',
    fn: () => {
      const source = `
        int test_entry(void) {
          const int x = 42;
          return x;
        }
      `;
      assert.strictEqual(runEntryFromSource(source), 42);
    }
  },
  {
    name: 'assignment to const local is rejected',
    fn: () => {
      const source = `
        int test_entry(void) {
          const int x = 1;
          x = 2;
          return x;
        }
      `;
      expectCompilationError(source, 'read-only');
    }
  },
  {
    name: 'prefix increment of const local is rejected',
    fn: () => {
      const source = `
        int test_entry(void) {
          const int x = 1;
          ++x;
          return x;
        }
      `;
      expectCompilationError(source, 'read-only');
    }
  },
  {
    name: 'postfix increment of const local is rejected',
    fn: () => {
      const source = `
        int test_entry(void) {
          const int x = 1;
          x++;
          return x;
        }
      `;
      expectCompilationError(source, 'read-only');
    }
  },
  {
    name: 'compound assignment to const local is rejected',
    fn: () => {
      const source = `
        int test_entry(void) {
          const int x = 5;
          x += 3;
          return x;
        }
      `;
      expectCompilationError(source, 'read-only');
    }
  },
  {
    name: 'reading a const global variable works',
    fn: () => {
      const source = `
        const int MAX = 100;
        int test_entry(void) {
          return MAX;
        }
      `;
      assert.strictEqual(runEntryFromSource(source), 100);
    }
  },
  {
    name: 'assignment to const global is rejected',
    fn: () => {
      const source = `
        const int LIMIT = 10;
        int test_entry(void) {
          LIMIT = 20;
          return LIMIT;
        }
      `;
      expectCompilationError(source, 'read-only');
    }
  },
  {
    name: 'non-const local with same name pattern is not rejected',
    fn: () => {
      const source = `
        int test_entry(void) {
          int x = 1;
          x = 2;
          return x;
        }
      `;
      assert.strictEqual(runEntryFromSource(source), 2);
    }
  },
  {
    name: 'const expression used in arithmetic is correct',
    fn: () => {
      const source = `
        int test_entry(void) {
          const int base = 10;
          int result = base * 3 + 5;
          return result;
        }
      `;
      assert.strictEqual(runEntryFromSource(source), 35);
    }
  },
  {
    name: 'assignment to const parameter is rejected',
    fn: () => {
      const source = `
        int apply(const int v) {
          v = 99;
          return v;
        }
        int test_entry(void) {
          return apply(1);
        }
      `;
      expectCompilationError(source, 'read-only');
    }
  }
];

console.log('Running MaiaC Phase 16 const qualifier diagnostics...\n');

let passed = 0;
let failed = 0;

for (const { name, fn } of cases) {
  try {
    fn();
    console.log(`PASS ${name}`);
    passed += 1;
  } catch (err) {
    console.log(`FAIL ${name}`);
    console.log(`  ${err.message}`);
    failed += 1;
  }
}

console.log(`\nSummary: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exitCode = 1;
}
