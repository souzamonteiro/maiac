/**
 * Fase 2 - Diagnostics: Complex Declarators
 * 
 * Tests for advanced C89 declarators that should be supported:
 * - Arrays of pointers: int *arr[10]
 * - Pointers to functions: int (*fn)(int, int)
 * - Abstract declarators in prototypes
 * - Multiple levels of indirection
 * - Function pointer arrays
 */

'use strict';

const { compileSource } = require('../c-compiler.js');

const phase2Cases = [
  {
    id: 'array-of-ptrs-basic',
    name: 'Array of pointers: basic',
    code: `
      int test_entry() {
        int x = 10, y = 20;
        int *arr[2];
        arr[0] = &x;
        arr[1] = &y;
        return *arr[0] + *arr[1];
      }
    `,
    expectedReturn: 30
  },
  {
    id: 'array-of-ptrs-iterate',
    name: 'Array of pointers: iteration',
    code: `
      int test_entry() {
        int vals[3] = {1, 2, 3};
        int *ptrs[3];
        int sum = 0;
        int i;
        ptrs[0] = &vals[0];
        ptrs[1] = &vals[1];
        ptrs[2] = &vals[2];
        for (i = 0; i < 3; i++) {
          sum += *ptrs[i];
        }
        return sum;
      }
    `,
    expectedReturn: 6
  },
  {
    id: 'funcptr-basic',
    name: 'Function pointer: basic',
    code: `
      int add(int a, int b) { return a + b; }
      int mul(int a, int b) { return a * b; }
      
      int test_entry() {
        int (*fn)(int, int);
        int r1, r2;
        fn = add;
        r1 = fn(3, 4);
        fn = mul;
        r2 = fn(3, 4);
        return r1 + r2;
      }
    `,
    expectedReturn: 19  // 7 + 12
  },
  {
    id: 'funcptr-array-basic',
    name: 'Array of function pointers: basic',
    code: `
      int add(int a, int b) { return a + b; }
      int sub(int a, int b) { return a - b; }
      
      int test_entry() {
        int (*ops[2])(int, int);
        int r1, r2;
        ops[0] = add;
        ops[1] = sub;
        r1 = (ops[0])(5, 3);
        r2 = (ops[1])(5, 3);
        return r1 + r2;
      }
    `,
    expectedReturn: 10  // 8 + 2
  },
  {
    id: 'ptr-to-ptr-chain',
    name: 'Pointer-to-pointer: chain access',
    code: `
      int test_entry() {
        int x = 42;
        int *p = &x;
        int **pp = &p;
        return **pp;
      }
    `,
    expectedReturn: 42
  },
  {
    id: 'multidim-array',
    name: 'Multi-dimensional arrays: 2D',
    code: `
      int test_entry() {
        int m[2][3];
        int sum = 0;
        int i, j;
        m[0][0] = 1; m[0][1] = 2; m[0][2] = 3;
        m[1][0] = 4; m[1][1] = 5; m[1][2] = 6;
        for (i = 0; i < 2; i++) {
          for (j = 0; j < 3; j++) {
            sum += m[i][j];
          }
        }
        return sum;
      }
    `,
    expectedReturn: 21  // 1+2+3+4+5+6
  },
  {
    id: 'abstract-declarator-param',
    name: 'Abstract declarator in prototype',
    code: `
      int process(int *);
      
      int process(int *p) {
        return *p * 2;
      }
      
      int test_entry() {
        int x = 10;
        return process(&x);
      }
    `,
    expectedReturn: 20
  },
  {
    id: 'nested-struct-with-ptr-array',
    name: 'Struct with field accessed via pointer array element',
    code: `
      struct Node {
        int value;
      };
      
      int test_entry() {
        struct Node nodes[3];
        struct Node *ptrs[3];
        int i;
        nodes[0].value = 10;
        nodes[1].value = 20;
        nodes[2].value = 30;
        ptrs[0] = &nodes[0];
        ptrs[1] = &nodes[1];
        ptrs[2] = &nodes[2];
        return ptrs[0]->value + ptrs[1]->value + ptrs[2]->value;
      }
    `,
    expectedReturn: 60
  },
  {
    id: 'ptr-arithmetic-with-arrays',
    name: 'Pointer arithmetic with arrays',
    code: `
      int test_entry() {
        int arr[4] = {10, 20, 30, 40};
        int *p = arr;
        return *(p + 2) - *(p + 0);
      }
    `,
    expectedReturn: 20  // 30 - 10
  },
  {
    id: 'funcptr-from-variable',
    name: 'Function pointer from function address',
    code: `
      int mul(int a, int b) { return a * b; }
      
      int test_entry() {
        int (*fn)(int, int) = mul;
        return fn(7, 8);
      }
    `,
    expectedReturn: 56
  }
];

/**
 * Run diagnostics for Phase 2 features
 */
function runPhase2Diagnostics() {
  console.log('MaiaC Phase 2 - Complex Declarators Diagnostics\n');
  console.log('Testing advanced C89 declarator forms...\n');

  let passCount = 0;
  let failCount = 0;
  let results = [];

  for (const testCase of phase2Cases) {
    try {
      const result = compileSource(testCase.code, { validate: true, printWat: false });
      
      if (!result.wasm) {
        throw new Error('WASM compilation failed');
      }

      // Try to execute if we have WASM
      const wasmBytes = Buffer.from(result.wasm);
      const wasmModule = new WebAssembly.Module(wasmBytes);
      const instance = new WebAssembly.Instance(wasmModule, {
        env: { printf: () => 0 }
      });
      
      const returnValue = instance.exports.test_entry ? instance.exports.test_entry() : null;
      
      const success = returnValue === testCase.expectedReturn;
      const status = success ? 'PASS' : 'FAIL';
      
      results.push({
        ...testCase,
        status,
        returnValue,
        error: null
      });
      
      if (success) passCount++;
      else failCount++;
    } catch (error) {
      results.push({
        ...testCase,
        status: 'ERROR',
        returnValue: null,
        error: error.message
      });
      failCount++;
    }
  }

  // Report results
  console.log(`Results: ${passCount}/${phase2Cases.length} PASS, ${failCount} FAIL/ERROR\n`);
  
  for (const result of results) {
    const statusSymbol = result.status === 'PASS' ? '✓' : result.status === 'ERROR' ? '✗' : '⚠';
    console.log(`[${statusSymbol} ${result.status}] ${result.name}`);
    console.log(`  ID: ${result.id}`);
    
    if (result.status === 'PASS') {
      console.log(`  Returned: ${result.returnValue} (expected ${result.expectedReturn})`);
    } else if (result.status === 'FAIL') {
      console.log(`  Expected: ${result.expectedReturn}, got: ${result.returnValue}`);
    } else if (result.error) {
      console.log(`  Error: ${result.error.split('\n')[0]}`);
    }
    console.log();
  }

  return { passCount, failCount, results };
}

// Run diagnostics
const report = runPhase2Diagnostics();
console.log(`\nPhase 2 Status: ${report.passCount}/${phase2Cases.length} tested features working`);
process.exit(report.failCount > 0 ? 1 : 0);
