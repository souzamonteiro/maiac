/**
 * Fase 8 - Diagnostics: Unary and Postfix Expressions
 *
 * Focus:
 * - Unary operators (+, -, !, ~, *, &, ++, --)
 * - Postfix operators (++, --, call, index, ., ->)
 * - sizeof(type) and sizeof(expr)
 * - Practical negative diagnostics for unsupported/invalid forms
 */

'use strict';

const { compileSource } = require('../c-compiler.js');

const phase8Cases = [
  {
    id: 'unary-plus',
    name: 'Unary plus returns same value',
    code: `
      int test_entry() { int x = 7; return +x; }
    `,
    expectedReturn: 7
  },
  {
    id: 'unary-minus',
    name: 'Unary minus negates value',
    code: `
      int test_entry() { int x = 7; return -x; }
    `,
    expectedReturn: -7
  },
  {
    id: 'logical-not-true',
    name: 'Logical not over zero yields true',
    code: `
      int test_entry() { int x = 0; return !x; }
    `,
    expectedReturn: 1
  },
  {
    id: 'logical-not-false',
    name: 'Logical not over non-zero yields false',
    code: `
      int test_entry() { int x = 3; return !x; }
    `,
    expectedReturn: 0
  },
  {
    id: 'bitwise-not',
    name: 'Bitwise not over integer',
    code: `
      int test_entry() { int x = 5; return ~x; }
    `,
    expectedReturn: -6
  },
  {
    id: 'prefix-increment',
    name: 'Prefix increment returns incremented value',
    code: `
      int test_entry() { int x = 2; return ++x; }
    `,
    expectedReturn: 3
  },
  {
    id: 'postfix-increment-old',
    name: 'Postfix increment returns old value',
    code: `
      int test_entry() { int x = 2; return x++; }
    `,
    expectedReturn: 2
  },
  {
    id: 'postfix-increment-updates-var',
    name: 'Postfix increment updates variable after expression',
    code: `
      int test_entry() { int x = 2; x++; return x; }
    `,
    expectedReturn: 3
  },
  {
    id: 'prefix-decrement',
    name: 'Prefix decrement returns decremented value',
    code: `
      int test_entry() { int x = 5; return --x; }
    `,
    expectedReturn: 4
  },
  {
    id: 'postfix-decrement-old',
    name: 'Postfix decrement returns old value',
    code: `
      int test_entry() { int x = 5; return x--; }
    `,
    expectedReturn: 5
  },
  {
    id: 'address-of-local-and-deref',
    name: 'Address-of local followed by dereference',
    code: `
      int test_entry() { int x = 9; int *p = &x; return *p; }
    `,
    expectedReturn: 9
  },
  {
    id: 'double-dereference',
    name: 'Double pointer dereference',
    code: `
      int test_entry() { int x = 12; int *p = &x; int **pp = &p; return **pp; }
    `,
    expectedReturn: 12
  },
  {
    id: 'array-index-basic',
    name: 'Array indexing returns element',
    code: `
      int test_entry() { int a[3] = {10, 20, 30}; return a[1]; }
    `,
    expectedReturn: 20
  },
  {
    id: 'pointer-index',
    name: 'Pointer indexing form p[i]',
    code: `
      int test_entry() { int a[3] = {10, 20, 30}; int *p = a; return p[2]; }
    `,
    expectedReturn: 30
  },
  {
    id: 'postfix-call-through-array-slot',
    name: 'Postfix call through function pointer array slot',
    code: `
      int add(int a, int b) { return a + b; }
      int test_entry() {
        int (*ops[1])(int, int);
        ops[0] = add;
        return ops[0](2, 4);
      }
    `,
    expectedReturn: 6
  },
  {
    id: 'postfix-dot-field',
    name: 'Postfix dot field access',
    code: `
      struct S { int x; };
      int test_entry() { struct S s; s.x = 8; return s.x; }
    `,
    expectedReturn: 8
  },
  {
    id: 'postfix-arrow-field',
    name: 'Postfix arrow field access',
    code: `
      struct S { int x; };
      int test_entry() { struct S s; struct S *p = &s; p->x = 11; return p->x; }
    `,
    expectedReturn: 11
  },
  {
    id: 'sizeof-expression',
    name: 'sizeof over expression',
    code: `
      int test_entry() { int x = 3; return sizeof(x); }
    `,
    expectedReturn: 4
  },
  {
    id: 'sizeof-type',
    name: 'sizeof over type name',
    code: `
      int test_entry() { return sizeof(int); }
    `,
    expectedReturn: 4
  },
  {
    id: 'address-of-global-supported',
    name: 'Address-of global variable works',
    code: `
      int g = 7;
      int test_entry() { int *p = &g; return *p; }
    `,
    expectedReturn: 7
  },
  {
    id: 'address-of-global-write-through-pointer',
    name: 'Write-through pointer updates global variable',
    code: `
      int g = 7;
      int test_entry() { int *p = &g; *p = 19; return g; }
    `,
    expectedReturn: 19
  },
  {
    id: 'prefix-increment-literal-invalid',
    name: 'Prefix increment on literal is rejected (negative)',
    code: `
      int test_entry() { return ++5; }
    `,
    expectedError: 'Unsupported assignment target'
  },
  {
    id: 'postfix-increment-literal-invalid',
    name: 'Postfix increment on literal is rejected (negative)',
    code: `
      int test_entry() { return 5++; }
    `,
    expectedError: 'Unsupported assignment target'
  }
];

function runPhase8Diagnostics() {
  console.log('MaiaC Phase 8 - Unary/Postfix Diagnostics\n');
  console.log('Testing unary and postfix expression forms in practical subset...\n');

  let passCount = 0;
  let failCount = 0;
  const results = [];

  for (const testCase of phase8Cases) {
    try {
      const result = compileSource(testCase.code, { validate: true, printWat: false });
      if (!result.wasm) {
        throw new Error('WASM compilation failed');
      }

      const wasmBytes = Buffer.from(result.wasm);
      const wasmModule = new WebAssembly.Module(wasmBytes);
      const instance = new WebAssembly.Instance(wasmModule, {
        env: { printf: () => 0 }
      });

      const returnValue = instance.exports.test_entry ? instance.exports.test_entry() : null;
      const success = testCase.expectedError
        ? false
        : (returnValue === testCase.expectedReturn);

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
      const errorMessage = error.message || String(error);
      const success = testCase.expectedError && errorMessage.includes(testCase.expectedError);
      results.push({
        ...testCase,
        status: success ? 'PASS' : 'ERROR',
        returnValue: null,
        error: errorMessage
      });
      if (success) {
        passCount += 1;
      } else {
        failCount += 1;
      }
    }
  }

  console.log(`Results: ${passCount}/${phase8Cases.length} PASS, ${failCount} FAIL/ERROR\n`);

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
    console.log(`\nPhase 8 Status: ${passCount}/${phase8Cases.length} tested features working`);
    process.exit(0);
  } else {
    console.log(`\nPhase 8 Status: ${passCount}/${phase8Cases.length} passing, ${failCount} still failing`);
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase8Diagnostics();
}

module.exports = { runPhase8Diagnostics, phase8Cases };
