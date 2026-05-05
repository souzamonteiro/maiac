/**
 * Fase 6 - Diagnostics: Selection Statements Completeness
 *
 * Focus:
 * - if/else basic and nested forms
 * - if-else-if chains and combinations
 * - switch with fall-through, break, default
 * - ternary conditional operator
 * - Complex logical conditions (&&, ||)
 * - Error cases (break outside loop, switch without expr)
 */

'use strict';

const { compileSource } = require('../c-compiler.js');

const phase6Cases = [
  {
    id: 'if-basic-true',
    name: 'If statement with true condition',
    code: `
      int test_entry() {
        if (1) return 5;
        return 0;
      }
    `,
    expectedReturn: 5
  },
  {
    id: 'if-else-basic',
    name: 'If-else statement',
    code: `
      int test_entry() {
        if (0) return 5;
        else return 10;
      }
    `,
    expectedReturn: 10
  },
  {
    id: 'if-nested',
    name: 'Nested if statements',
    code: `
      int test_entry() {
        if (1) {
          if (1) return 7;
        }
        return 0;
      }
    `,
    expectedReturn: 7
  },
  {
    id: 'if-else-if-chain',
    name: 'If-else-if chain: middle branch selected',
    code: `
      int test_entry() {
        int x = 2;
        if (x == 1) return 1;
        else if (x == 2) return 2;
        else return 3;
      }
    `,
    expectedReturn: 2
  },
  {
    id: 'switch-basic-case',
    name: 'Switch with matching case',
    code: `
      int test_entry() {
        int x = 2;
        switch(x) {
          case 2: return 9;
          default: return 0;
        }
      }
    `,
    expectedReturn: 9
  },
  {
    id: 'switch-default-path',
    name: 'Switch routes to default when no case matches',
    code: `
      int test_entry() {
        int x = 5;
        switch(x) {
          case 1: return 1;
          default: return 8;
        }
      }
    `,
    expectedReturn: 8
  },
  {
    id: 'switch-fall-through',
    name: 'Switch with fall-through between cases',
    code: `
      int test_entry() {
        int x = 1;
        switch(x) {
          case 1:
          case 2: return 12;
          default: break;
        }
        return 0;
      }
    `,
    expectedReturn: 12
  },
  {
    id: 'switch-break-in-case',
    name: 'Switch with break statement isolates cases',
    code: `
      int test_entry() {
        int x = 1;
        int r = 0;
        switch(x) {
          case 1: r = 1; break;
          case 2: r = 2; break;
          default: r = 0;
        }
        return r;
      }
    `,
    expectedReturn: 1
  },
  {
    id: 'ternary-basic',
    name: 'Ternary conditional operator',
    code: `
      int test_entry() {
        int x = 1;
        return x ? 11 : 22;
      }
    `,
    expectedReturn: 11
  },
  {
    id: 'ternary-nested',
    name: 'Nested ternary conditional',
    code: `
      int test_entry() {
        int a = 1, b = 0;
        return a ? (b ? 5 : 15) : 25;
      }
    `,
    expectedReturn: 15
  },
  {
    id: 'if-logical-and',
    name: 'If with logical AND operator',
    code: `
      int test_entry() {
        int x = 1, y = 1;
        if (x && y) return 6;
        return 0;
      }
    `,
    expectedReturn: 6
  },
  {
    id: 'if-logical-or',
    name: 'If with logical OR operator',
    code: `
      int test_entry() {
        int x = 0, y = 1;
        if (x || y) return 7;
        return 0;
      }
    `,
    expectedReturn: 7
  },
  {
    id: 'if-else-if-else-chain',
    name: 'If-else-if-else multi-branch chain',
    code: `
      int test_entry() {
        int x = 4;
        if (x == 1) return 1;
        else if (x == 2) return 2;
        else if (x == 3) return 3;
        else return 4;
      }
    `,
    expectedReturn: 4
  },
  {
    id: 'switch-break-preserves-case-value',
    name: 'Switch with break prevents fall-through',
    code: `
      int test_entry() {
        int x = 1;
        switch(x) {
          case 1: return 1; break;
          case 2: return 2; break;
          default: return 0;
        }
      }
    `,
    expectedReturn: 1
  },
  {
    id: 'nested-if-in-switch',
    name: 'Nested if statement inside switch case',
    code: `
      int test_entry() {
        int x = 1;
        switch(x) {
          case 1:
            if(x) return 7;
            break;
          default: return 0;
        }
        return 0;
      }
    `,
    expectedReturn: 7
  },
  {
    id: 'if-comparison-chain',
    name: 'If with chained comparison operators',
    code: `
      int test_entry() {
        int x = 5;
        if (x > 3 && x < 10) return 1;
        return 0;
      }
    `,
    expectedReturn: 1
  },
  {
    id: 'switch-fall-through-with-break',
    name: 'Switch with selective fall-through and break',
    code: `
      int test_entry() {
        int x = 1;
        switch(x) {
          case 1:
          case 2: return 15;
          case 3: return 3;
          default: break;
        }
        return 0;
      }
    `,
    expectedReturn: 15
  },
  {
    id: 'break-outside-loop-error',
    name: 'Break outside loop/switch is rejected (negative)',
    code: `
      int test_entry() {
        break;
        return 1;
      }
    `,
    expectedError: "'break' used outside a loop or switch"
  },
  {
    id: 'switch-without-expr-parse-error',
    name: 'Switch missing expression is parse error (negative)',
    code: `
      int test_entry() {
        switch {
          case 1: return 1;
        }
        return 0;
      }
    `,
    expectedError: 'Parse failed'
  },
  {
    id: 'missing-brace-parse-error',
    name: 'Missing closing brace causes parse error (negative)',
    code: `
      int test_entry() {
        if (1) {
          return 5;
        return 0;
      }
    `,
    expectedError: 'Parse failed'
  }
];

function runPhase6Diagnostics() {
  console.log('MaiaC Phase 6 - Selection Statements Diagnostics\n');
  console.log('Testing if/switch/ternary forms and control flow...\n');

  let passCount = 0;
  let failCount = 0;
  const results = [];

  for (const testCase of phase6Cases) {
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

  console.log(`Results: ${passCount}/${phase6Cases.length} PASS, ${failCount} FAIL/ERROR\n`);

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
    console.log(`\nPhase 6 Status: ${passCount}/${phase6Cases.length} tested features working`);
    process.exit(0);
  } else {
    console.log(`\nPhase 6 Status: ${passCount}/${phase6Cases.length} passing, ${failCount} still failing`);
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase6Diagnostics();
}

module.exports = { runPhase6Diagnostics, phase6Cases };
