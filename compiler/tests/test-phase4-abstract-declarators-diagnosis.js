/**
 * Fase 4 - Diagnostics: Abstract Declarators Completeness
 *
 * Focus:
 * - Typedef'd function pointer declarators
 * - Arrays of function pointers via typedef
 * - Abstract declarators in prototypes and params
 * - Nested function-pointer declarator combinations in practical subset
 */

'use strict';

const { compileSource } = require('../c-compiler.js');

const phase4Cases = [
  {
    id: 'typedef-funcptr-basic',
    name: 'Typedef function pointer: basic call',
    code: `
      typedef int (*binop_t)(int, int);

      int add(int a, int b) { return a + b; }

      int test_entry() {
        binop_t fn = add;
        return fn(5, 6);
      }
    `,
    expectedReturn: 11
  },
  {
    id: 'typedef-funcptr-array',
    name: 'Typedef array of function pointers',
    code: `
      typedef int (*binop_t)(int, int);

      int add(int a, int b) { return a + b; }
      int sub(int a, int b) { return a - b; }

      int test_entry() {
        binop_t ops[2];
        int r1, r2;
        ops[0] = add;
        ops[1] = sub;
        r1 = (ops[0])(9, 4);
        r2 = (ops[1])(9, 4);
        return r1 + r2;
      }
    `,
    expectedReturn: 18
  },
  {
    id: 'abstract-declarator-callback-prototype',
    name: 'Abstract declarator in prototype',
    code: `
      int apply(int (*)(int, int), int, int);

      int add(int x, int y) { return x + y; }

      int apply(int (*fn)(int, int), int a, int b) {
        return fn(a, b);
      }

      int test_entry() {
        return apply(add, 7, 8);
      }
    `,
    expectedReturn: 15
  },
  {
    id: 'array-of-funcptr-mixed-signatures-compatible',
    name: 'Array of func ptrs called through indexed vars',
    code: `
      int inc(int x, int y) { return x + y + 1; }
      int dec(int x, int y) { return x - y - 1; }

      int test_entry() {
        int (*ops[2])(int, int);
        int a, b;
        ops[0] = inc;
        ops[1] = dec;
        a = (ops[0])(10, 2);
        b = (ops[1])(10, 2);
        return a + b;
      }
    `,
    expectedReturn: 20
  },
  {
    id: 'typedef-pointer-alias',
    name: 'Typedef pointer alias indirection',
    code: `
      typedef int * intptr_t;

      int test_entry() {
        int value = 42;
        intptr_t p = &value;
        return *p;
      }
    `,
    expectedReturn: 42
  },
  {
    id: 'funcptr-param-array-bridge',
    name: 'Function pointer passed from array slot',
    code: `
      int mul(int a, int b) { return a * b; }

      int apply2(int (*fn)(int, int), int a, int b) {
        return fn(a, b);
      }

      int test_entry() {
        int (*ops[1])(int, int);
        ops[0] = mul;
        return apply2(ops[0], 6, 7);
      }
    `,
    expectedReturn: 42
  },
  {
    id: 'pointer-to-array-indexing-limitation',
    name: 'Pointer-to-array indexing via parenthesized dereference',
    code: `
      int test_entry() {
        int a[3] = {10, 20, 30};
        int (*p)[3] = &a;
        return (*p)[2];
      }
    `,
    expectedReturn: 30
  },
  {
    id: 'array-of-pointer-to-array-limitation',
    name: 'Array of pointer-to-array indexed dereference',
    code: `
      int test_entry() {
        int a[2] = {1, 2};
        int b[2] = {3, 4};
        int (*arr[2])[2];
        arr[0] = &a;
        arr[1] = &b;
        return (*arr[0])[1] + (*arr[1])[0];
      }
    `,
    expectedReturn: 5
  },
  {
    id: 'pointer-to-array-write-path',
    name: 'Pointer-to-array write through indexed lvalue',
    code: `
      int test_entry() {
        int a[3] = {1, 2, 3};
        int (*p)[3] = &a;
        (*p)[1] = 40;
        return a[1];
      }
    `,
    expectedReturn: 40
  },
  {
    id: 'typedef-struct-ptr-param',
    name: 'Typedef struct pointer as function parameter',
    code: `
      typedef struct { int x; int y; } Point;

      int sum_coords(Point *p) {
        return p->x + p->y;
      }

      int test_entry() {
        Point pt;
        pt.x = 6;
        pt.y = 7;
        return sum_coords(&pt);
      }
    `,
    expectedReturn: 13
  },
  {
    id: 'funcptr-in-struct',
    name: 'Function pointer stored in struct field',
    code: `
      typedef int (*op_t)(int, int);

      typedef struct { op_t fn; int a; int b; } Op;

      int mul(int a, int b) { return a * b; }

      int test_entry() {
        Op o;
        o.fn = mul;
        o.a = 6;
        o.b = 7;
        return o.fn(o.a, o.b);
      }
    `,
    expectedReturn: 42
  },
  {
    id: 'ptr-to-arr-in-struct',
    name: 'Pointer-to-array member in struct',
    code: `
      int test_entry() {
        int a[3];
        a[0] = 1;
        a[1] = 2;
        a[2] = 2;
        int (*p)[3] = &a;
        return (*p)[0] + (*p)[1] + (*p)[2];
      }
    `,
    expectedReturn: 5
  },
  {
    id: 'triple-pointer-chain',
    name: 'Triple-pointer chain: int ***p3 = &p2',
    code: `
      int test_entry() {
        int x = 7;
        int *p1 = &x;
        int **p2 = &p1;
        int ***p3 = &p2;
        return ***p3;
      }
    `,
    expectedReturn: 7
  },
  {
    id: 'ptr-to-array-param',
    name: 'Pointer-to-array as function parameter (pass by ref)',
    code: `
      int sumArr(int (*p)[3]) { return (*p)[0]+(*p)[1]+(*p)[2]; }
      int test_entry() { int a[3]={4,5,6}; return sumArr(&a); }
    `,
    expectedReturn: 15
  },
  {
    id: 'ptr-ptr-read-write',
    name: 'Double pointer: int **pp dereferenced',
    code: `
      int test_entry() { int x=42; int *p=&x; int **pp=&p; return **pp; }
    `,
    expectedReturn: 42
  },
  {
    id: 'arr-of-fnptrs-no-typedef',
    name: 'Array of function pointers without typedef',
    code: `
      int mul(int a, int b) { return a*b; }
      int add(int a, int b) { return a+b; }
      int test_entry() {
        int (*ops[2])(int,int);
        ops[0]=add; ops[1]=mul;
        return ops[1](3,4);
      }
    `,
    expectedReturn: 12
  },
  {
    id: 'fnptr-param-no-typedef',
    name: 'Function pointer as parameter without typedef',
    code: `
      int apply(int (*f)(int,int), int a, int b) { return f(a,b); }
      int add(int a, int b) { return a+b; }
      int test_entry() { return apply(add,3,4); }
    `,
    expectedReturn: 7
  },
  {
    id: 'typedef-fnptr-as-arg',
    name: 'Typedef function pointer passed as argument',
    code: `
      typedef int (*BinOp)(int,int);
      int mul(int a, int b) { return a*b; }
      int apply(BinOp f, int a, int b) { return f(a,b); }
      int test_entry() { return apply(mul,3,4); }
    `,
    expectedReturn: 12
  },
  {
    id: 'typedef-struct-ptr-chain',
    name: 'Typedef struct with pointer field access',
    code: `
      typedef struct S { int x; int y; } S;
      int test_entry() { S s; S *p=&s; p->x=2; p->y=4; return p->x+p->y; }
    `,
    expectedReturn: 6
  },
  {
    id: 'arr-of-struct-ptrs',
    name: 'Array of pointers to struct',
    code: `
      struct P { int val; };
      int test_entry() {
        struct P a={5}, b={10};
        struct P *ptrs[2]={&a,&b};
        return ptrs[0]->val+ptrs[1]->val;
      }
    `,
    expectedReturn: 15
  },
  {
    id: 'struct-field-ptr-to-array',
    name: 'Struct field that is a pointer-to-array',
    code: `
      struct S { int (*buf)[3]; };
      int test_entry() {
        int a[3]={2,3,4};
        struct S s;
        s.buf=&a;
        return (*s.buf)[0]+(*s.buf)[1]+(*s.buf)[2];
      }
    `,
    expectedReturn: 9
  },
  {
    id: 'typedef-chain',
    name: 'Typedef chain: typedef of typedef',
    code: `
      typedef int MyInt;
      typedef MyInt Count;
      int test_entry() { Count c=7; return c; }
    `,
    expectedReturn: 7
  },
  {
    id: 'address-of-global-limitation',
    name: 'Address-of global variable is unsupported (negative)',
    code: `
      int g=99;
      int *getGlobal() { return &g; }
      int test_entry() { return *getGlobal(); }
    `,
    expectedError: 'Address-of is currently supported only for frame-backed locals'
  }
];

function runPhase4Diagnostics() {
  console.log('MaiaC Phase 4 - Abstract Declarators Diagnostics\n');
  console.log('Testing typedef and complex declarator forms in practical subset...\n');

  let passCount = 0;
  let failCount = 0;
  const results = [];

  for (const testCase of phase4Cases) {
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

  console.log(`Results: ${passCount}/${phase4Cases.length} PASS, ${failCount} FAIL/ERROR\n`);

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
    console.log(`\nPhase 4 Status: ${passCount}/${phase4Cases.length} tested features working`);
    process.exit(0);
  } else {
    console.log(`\nPhase 4 Status: ${passCount}/${phase4Cases.length} passing, ${failCount} still failing`);
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase4Diagnostics();
}

module.exports = { runPhase4Diagnostics, phase4Cases };
