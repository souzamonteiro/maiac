/**
 * Diagnóstico dos 14 pontos de erro em c-compiler.js
 * 
 * Este teste tenta compilar pequenos fragmentos de código que deveriam
 * resultar em cada um dos 14 erros "Unsupported" do compilador.
 * Usamos setInterval para descobrir quais erros são realmente atingidos.
 */

'use strict';

const { compileSource } = require('../c-compiler.js');

const diagnosticCases = [
  {
    id: 'error-1-assignment-ops',
    name: 'Assignment operators (+=, -=, etc)',
    code: `int test() { int x = 5; x += 3; return x; }`,
    expectedError: 'Unsupported assignment operator'
  },
  {
    id: 'error-2-nested-init',
    name: 'Nested aggregate initializers',
    code: `int test() { struct S { int a; struct { int b; } inner; } s = {1, {2}}; return s.a; }`,
    expectedError: 'Nested aggregate initializers'
  },
  {
    id: 'error-3-ptr-to-ptr-arithmetic',
    name: 'Pointer-to-pointer arithmetic',
    code: `int test() { int x = 5, y = 10; int *p1 = &x, *p2 = &y; int diff = p2 - p1; return diff; }`,
    expectedError: 'Pointer-to-pointer arithmetic'
  },
  {
    id: 'error-4-indirect-call',
    name: 'Indirect function calls',
    code: `int add(int a, int b) { return a + b; } int test() { int (*fp)(int, int) = add; return (*fp)(3, 4); }`,
    expectedError: 'Only named function calls'
  },
  {
    id: 'error-5-prefix-increment',
    name: 'Prefix increment/decrement',
    code: `int test() { int x = 5; return ++x; }`,
    expectedError: 'Unsupported unary operator'
  },
  {
    id: 'error-6-sizeof',
    name: 'Sizeof operator',
    code: `int test() { int x = sizeof(int); return x; }`,
    expectedError: 'Unsupported unary operator'
  },
  {
    id: 'error-7-compound-assign-array',
    name: 'Compound assignment to array element',
    code: `int test() { int a[3] = {1, 2, 3}; a[0] += 5; return a[0]; }`,
    expectedError: 'Unsupported assignment target'
  },
  {
    id: 'error-8-bitwise-and',
    name: 'Bitwise AND operator',
    code: `int test() { int x = 12; int y = 10; return x & y; }`,
    expectedError: 'Unsupported operator'
  },
  {
    id: 'error-9-bitwise-or',
    name: 'Bitwise OR operator',
    code: `int test() { int x = 12; int y = 10; return x | y; }`,
    expectedError: 'Unsupported operator'
  },
  {
    id: 'error-10-bitwise-xor',
    name: 'Bitwise XOR operator',
    code: `int test() { int x = 12; int y = 10; return x ^ y; }`,
    expectedError: 'Unsupported operator'
  },
  {
    id: 'error-11-goto-unrestricted',
    name: 'Goto with backward label',
    code: `int test() { int i = 0; start: i++; if (i < 5) goto start; return i; }`,
    expectedError: 'Unsupported goto target'
  },
  {
    id: 'error-12-struct-copy-init',
    name: 'Struct copy initialization',
    code: `int test() { struct S { int x; int y; } s1 = {1, 2}; struct S s2 = s1; return s2.x; }`,
    expectedError: 'not supported yet'
  },
  {
    id: 'error-13-ternary',
    name: 'Ternary operator',
    code: `int test() { int x = 5; int y = x > 3 ? 10 : 20; return y; }`,
    expectedError: 'Unsupported expression node'
  },
  {
    id: 'error-14-bitwise-not',
    name: 'Bitwise NOT operator',
    code: `int test() { int x = 5; return ~x; }`,
    expectedError: 'Unsupported operator'
  }
];

function runDiagnostics() {
  console.log('MaiaC Compiler Error Points Diagnosis\n');
  console.log('Testing which of the 14 error points are actually hit...\n');

  let hitCount = 0;
  let passCount = 0;
  let results = [];

  for (const testCase of diagnosticCases) {
    try {
      const result = compileSource(testCase.code, { validate: false, printWat: false });
      results.push({
        ...testCase,
        status: 'PASS (no error)',
        error: null
      });
      passCount++;
    } catch (error) {
      const errorMsg = error.message || String(error);
      const isExpected = testCase.expectedError && errorMsg.includes(testCase.expectedError);
      results.push({
        ...testCase,
        status: isExpected ? 'HIT (expected error)' : 'HIT (different error)',
        error: errorMsg
      });
      hitCount++;
    }
  }

  console.log(`Results: ${hitCount} errors hit, ${passCount} passed\n`);
  
  for (const result of results) {
    console.log(`[${result.status}] ${result.name}`);
    console.log(`  ID: ${result.id}`);
    if (result.error) {
      console.log(`  Error: ${result.error.split('\n')[0]}`);
    }
    console.log();
  }

  return { hitCount, passCount, results };
}

// Run diagnostics
const report = runDiagnostics();
process.exit(report.hitCount > 0 ? 1 : 0);
