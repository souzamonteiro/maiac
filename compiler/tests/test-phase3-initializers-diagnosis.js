/**
 * Fase 3 - Diagnostics: Initializers & Aggregates
 *
 * Tests for aggregate and designated initializer support:
 * - Nested aggregate initializers
 * - Struct designated initializers
 * - Array designated initializers
 * - Nested designated paths (e.g. .inner.value, .arr[1])
 */

'use strict';

const { compileSource } = require('../c-compiler.js');

const phase3Cases = [
  {
    id: 'nested-struct-init',
    name: 'Nested struct aggregate initializer',
    code: `
      struct Inner { int b; };
      struct Outer { int a; struct Inner inner; };

      int test_entry() {
        struct Outer s = {1, {2}};
        return s.a + s.inner.b;
      }
    `,
    expectedReturn: 3
  },
  {
    id: 'nested-array-init',
    name: 'Nested array aggregate initializer',
    code: `
      int test_entry() {
        int m[2][2] = {{1, 2}, {3, 4}};
        return m[1][0] + m[1][1];
      }
    `,
    expectedReturn: 7
  },
  {
    id: 'designated-struct-out-of-order',
    name: 'Struct designated initializer (out of order)',
    code: `
      struct P { int x; int y; int z; };

      int test_entry() {
        struct P p = {.z = 9, .x = 2};
        return p.x + p.y + p.z;
      }
    `,
    expectedReturn: 11
  },
  {
    id: 'designated-array-sparse',
    name: 'Array designated initializer (sparse)',
    code: `
      int test_entry() {
        int a[6] = {[4] = 10, [1] = 3};
        return a[0] + a[1] + a[4] + a[5];
      }
    `,
    expectedReturn: 13
  },
  {
    id: 'designated-mixed-sequential',
    name: 'Mixed designated + positional initializers',
    code: `
      struct T { int a; int b; int c; };

      int test_entry() {
        struct T t = {.b = 4, 7};
        return t.a + t.b + t.c;
      }
    `,
    expectedReturn: 11
  },
  {
    id: 'designated-nested-path',
    name: 'Nested designated path (.inner.value)',
    code: `
      struct Inner { int value; };
      struct Outer { int tag; struct Inner inner; };

      int test_entry() {
        struct Outer o = {.inner.value = 8, .tag = 2};
        return o.tag + o.inner.value;
      }
    `,
    expectedReturn: 10
  },
  {
    id: 'designated-struct-array-field',
    name: 'Designated path with array field (.arr[1])',
    code: `
      struct Data { int arr[3]; int k; };

      int test_entry() {
        struct Data d = {.arr[1] = 5, .k = 4};
        int *base = (int *)&d;
        return base[0] + base[1] + base[2] + d.k;
      }
    `,
    expectedReturn: 9
  },
  {
    id: 'multilevel-nested-struct-init',
    name: 'Three-level nested struct aggregate initializer',
    code: `
      struct A { int x; int y; };
      struct B { struct A a; int z; };
      struct C { struct B b; int w; };

      int test_entry() {
        struct C c = {{{3, 4}, 5}, 6};
        return c.b.a.x + c.b.a.y + c.b.z + c.w;
      }
    `,
    expectedReturn: 18
  },
  {
    id: 'designated-array-enum-index',
    name: 'Array designated initializer with enum-based index',
    code: `
      enum Idx { IDX_A = 1, IDX_B = 3 };

      int test_entry() {
        int arr[5] = {[IDX_A] = 10, [IDX_B] = 30};
        return arr[0] + arr[1] + arr[2] + arr[3] + arr[4];
      }
    `,
    expectedReturn: 40
  },
  {
    id: 'designated-array-index-out-of-bounds',
    name: 'Designated initializer rejects out-of-bounds array index',
    code: `
      int test_entry() {
        int a[3] = {[5] = 1};
        return 0;
      }
    `,
    expectedError: 'out of bounds'
  },
  {
    id: 'designated-unknown-field',
    name: 'Designated initializer rejects unknown struct field',
    code: `
      struct S { int x; };

      int test_entry() {
        struct S s = {.z = 1};
        return 0;
      }
    `,
    expectedError: 'Unknown field'
  },
  {
    id: 'designated-unknown-nested-field',
    name: 'Designated initializer rejects unknown nested field path',
    code: `
      struct Inner { int v; };
      struct Outer { struct Inner in; };

      int test_entry() {
        struct Outer o = {.in.missing = 1};
        return 0;
      }
    `,
    expectedError: 'Unknown field'
  },
  {
    id: 'zero-fill-remaining',
    name: 'Remaining elements are zero-filled after sparse designated init',
    code: `
      int test_entry() {
        int a[5] = {[2] = 3};
        return a[0] + a[1] + a[2] + a[3] + a[4];
      }
    `,
    expectedReturn: 3
  },
  {
    id: 'init-constant-expr',
    name: 'Array initializer with constant expressions',
    code: `
      int test_entry() {
        int a[3] = {1 + 2, 3 + 4, 10 - 7};
        return a[0] + a[1] + a[2];
      }
    `,
    expectedReturn: 13
  },
  {
    id: 'struct-array-of-structs',
    name: 'Struct containing array-of-structs aggregate init',
    code: `
      struct P { int x; };
      struct S { struct P pts[2]; };

      int test_entry() {
        struct S s = {{{1}, {2}}};
        return s.pts[0].x + s.pts[1].x;
      }
    `,
    expectedReturn: 3
  },
  {
    id: 'array-2d-designated',
    name: '2D array with designated initializer ([row][col] = val)',
    code: `
      int test_entry() {
        int m[3][2] = {[1][0] = 3, [1][1] = 4};
        return m[1][0] + m[1][1];
      }
    `,
    expectedReturn: 7
  },
  {
    id: 'union-basic-init',
    name: 'Union basic field assignment and read',
    code: `
      union U { int i; char c; };

      int test_entry() {
        union U u;
        u.i = 3;
        return u.i;
      }
    `,
    expectedReturn: 3
  },
  {
    id: 'array-init-too-many-elements',
    name: 'Array initializer rejects excess elements',
    code: `
      int test_entry() {
        int a[2] = {5, 9, 99};
        return a[0];
      }
    `,
    expectedError: 'Too many initializer'
  }
];

function runPhase3Diagnostics() {
  console.log('MaiaC Phase 3 - Initializers & Aggregates Diagnostics\n');
  console.log('Testing nested and designated initializer forms...\n');

  let passCount = 0;
  let failCount = 0;
  const results = [];

  for (const testCase of phase3Cases) {
    try {
      const result = compileSource(testCase.code, { validate: true, printWat: false });
      if (testCase.expectedError) {
        results.push({
          ...testCase,
          status: 'FAIL',
          returnValue: null,
          error: `Expected compilation error containing '${testCase.expectedError}', but code compiled successfully`
        });
        failCount += 1;
        continue;
      }

      if (!result.wasm) {
        throw new Error('WASM compilation failed');
      }

      const wasmBytes = Buffer.from(result.wasm);
      const wasmModule = new WebAssembly.Module(wasmBytes);
      const instance = new WebAssembly.Instance(wasmModule, {
        env: { printf: () => 0 }
      });

      const returnValue = instance.exports.test_entry ? instance.exports.test_entry() : null;
      const success = returnValue === testCase.expectedReturn;

      results.push({
        ...testCase,
        status: success ? 'PASS' : 'FAIL',
        returnValue,
        error: null
      });

      if (success) {
        passCount += 1;
      } else {
        failCount += 1;
      }
    } catch (error) {
      if (testCase.expectedError) {
        const message = error && error.message ? error.message : String(error);
        const success = message.includes(testCase.expectedError);
        results.push({
          ...testCase,
          status: success ? 'PASS' : 'ERROR',
          returnValue: null,
          error: message
        });
        if (success) {
          passCount += 1;
        } else {
          failCount += 1;
        }
        continue;
      }

      results.push({
        ...testCase,
        status: 'ERROR',
        returnValue: null,
        error: error.message || String(error)
      });
      failCount += 1;
    }
  }

  console.log(`Results: ${passCount}/${phase3Cases.length} PASS, ${failCount} FAIL/ERROR\n`);

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✓' : '✗';
    console.log(`[${icon} ${result.status}] ${result.name}`);
    console.log(`  ID: ${result.id}`);

    if (result.status === 'PASS') {
      if (result.expectedError) {
        console.log(`  Expected error matched: ${result.expectedError}`);
      } else {
        console.log(`  Returned: ${result.returnValue} (expected ${result.expectedReturn})`);
      }
    } else {
      if (result.expectedError) {
        console.log(`  Expected error: ${result.expectedError}`);
      } else {
        console.log(`  Expected return: ${result.expectedReturn}`);
      }
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      } else {
        console.log(`  Returned: ${result.returnValue}`);
      }
    }

    console.log('');
  }

  if (failCount === 0) {
    console.log(`\nPhase 3 Status: ${passCount}/${phase3Cases.length} tested features working`);
    process.exit(0);
  } else {
    console.log(`\nPhase 3 Status: ${passCount}/${phase3Cases.length} passing, ${failCount} still failing`);
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase3Diagnostics();
}

module.exports = { runPhase3Diagnostics, phase3Cases };
