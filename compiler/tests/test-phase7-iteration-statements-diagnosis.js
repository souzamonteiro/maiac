/**
 * Fase 7 - Diagnostics: Iteration Statements Completeness
 *
 * Focus:
 * - while loops with conditions and bodies
 * - do-while loops
 * - for loops with various init/cond/post patterns
 * - Nested loops (for in for, while in for, etc.)
 * - break and continue in loops
 * - Error cases (break/continue outside loop)
 */

'use strict';

const { compileSource } = require('../c-compiler.js');

const phase7Cases = [
  {
    id: 'while-basic-counter',
    name: 'While loop incrementing counter',
    code: `
      int test_entry() {
        int i = 0;
        while(i < 5) i++;
        return i;
      }
    `,
    expectedReturn: 5
  },
  {
    id: 'while-sum-loop',
    name: 'While loop accumulating sum',
    code: `
      int test_entry() {
        int i = 1, s = 0;
        while(i <= 4) {
          s += i;
          i++;
        }
        return s;
      }
    `,
    expectedReturn: 10
  },
  {
    id: 'for-external-init',
    name: 'For loop with external init expression',
    code: `
      int test_entry() {
        int i = 0, s = 0;
        for(; i < 3; i++) s++;
        return s;
      }
    `,
    expectedReturn: 3
  },
  {
    id: 'nested-for-3x3',
    name: 'Nested for loops (3x3 matrix)',
    code: `
      int test_entry() {
        int s = 0;
        for(int i = 0; i < 3; i++)
          for(int j = 0; j < 3; j++)
            s++;
        return s;
      }
    `,
    expectedReturn: 9
  },
  {
    id: 'while-with-break',
    name: 'While loop with break statement',
    code: `
      int test_entry() {
        int i = 0;
        while(1) {
          i++;
          if(i == 3) break;
        }
        return i;
      }
    `,
    expectedReturn: 3
  },
  {
    id: 'nested-while-for',
    name: 'While loop containing for loop',
    code: `
      int test_entry() {
        int s = 0;
        int i = 0;
        while(i < 2) {
          for(int j = 0; j < 3; j++) s++;
          i++;
        }
        return s;
      }
    `,
    expectedReturn: 6
  },
  {
    id: 'nested-for-break-inner',
    name: 'Nested for loops with break in inner loop',
    code: `
      int test_entry() {
        int s = 0;
        for(int i = 0; i < 3; i++) {
          for(int j = 0; j < 3; j++) {
            s++;
            if(j == 0) break;
          }
        }
        return s;
      }
    `,
    expectedReturn: 3
  },
  {
    id: 'do-while-with-break',
    name: 'Do-while loop with break',
    code: `
      int test_entry() {
        int i = 0;
        do {
          i++;
          if(i == 5) break;
        } while(i < 10);
        return i;
      }
    `,
    expectedReturn: 5
  },
  {
    id: 'for-loop-post-expr',
    name: 'For loop counting with external post-expression',
    code: `
      int test_entry() {
        int s = 0;
        int i;
        for(i = 0; i < 3; i++) s++;
        return s;
      }
    `,
    expectedReturn: 3
  },
  {
    id: 'triple-nested-loops',
    name: 'Triple-nested for loops (2x2x2 cube)',
    code: `
      int test_entry() {
        int s = 0;
        for(int i = 0; i < 2; i++)
          for(int j = 0; j < 2; j++)
            for(int k = 0; k < 2; k++)
              s++;
        return s;
      }
    `,
    expectedReturn: 8
  },
  {
    id: 'for-decrement',
    name: 'For loop with decrement',
    code: `
      int test_entry() {
        int s = 0;
        for(int i = 4; i > 0; i--) s++;
        return s;
      }
    `,
    expectedReturn: 4
  },
  {
    id: 'continue-outside-loop-error',
    name: 'Continue outside loop is rejected (negative)',
    code: `
      int test_entry() {
        continue;
        return 1;
      }
    `,
    expectedError: "'continue' used outside a loop"
  },
  {
    id: 'break-outside-loop-error',
    name: 'Break outside loop is rejected (negative)',
    code: `
      int test_entry() {
        break;
        return 1;
      }
    `,
    expectedError: "'break' used outside a loop or switch"
  }
];

function runPhase7Diagnostics() {
  console.log('MaiaC Phase 7 - Iteration Statements Diagnostics\n');
  console.log('Testing while/do-while/for loops and loop control...\n');

  let passCount = 0;
  let failCount = 0;
  const results = [];

  for (const testCase of phase7Cases) {
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

  console.log(`Results: ${passCount}/${phase7Cases.length} PASS, ${failCount} FAIL/ERROR\n`);

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
    console.log(`\nPhase 7 Status: ${passCount}/${phase7Cases.length} tested features working`);
    process.exit(0);
  } else {
    console.log(`\nPhase 7 Status: ${passCount}/${phase7Cases.length} passing, ${failCount} still failing`);
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase7Diagnostics();
}

module.exports = { runPhase7Diagnostics, phase7Cases };
