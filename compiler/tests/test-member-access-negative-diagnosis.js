'use strict';

const { compileSource } = require('../c-compiler.js');

const cases = [
  {
    id: 'member-access-non-struct',
    name: 'Dot member access rejects non-struct base',
    code: `
      int test_entry() {
        int x = 1;
        return x.y;
      }
    `,
    expectedError: 'Struct member access'
  },
  {
    id: 'arrow-access-non-pointer',
    name: 'Arrow member access rejects non-pointer base',
    code: `
      struct S { int x; };
      int test_entry() {
        struct S s;
        return s->x;
      }
    `,
    expectedError: 'not a pointer-to-struct'
  }
];

function runMemberAccessNegativeDiagnostics() {
  console.log('MaiaC member-access negative diagnostics\n');

  let passCount = 0;
  let failCount = 0;

  for (const testCase of cases) {
    try {
      compileSource(testCase.code, { validate: false, printWat: false });
      console.log(`[✗ FAIL] ${testCase.name}`);
      console.log(`  ID: ${testCase.id}`);
      console.log(`  Expected error containing: ${testCase.expectedError}`);
      console.log('  Error: Code compiled successfully\n');
      failCount += 1;
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      const ok = message.includes(testCase.expectedError);
      const icon = ok ? '✓' : '✗';
      const label = ok ? 'PASS' : 'ERROR';
      console.log(`[${icon} ${label}] ${testCase.name}`);
      console.log(`  ID: ${testCase.id}`);
      console.log(`  Expected error: ${testCase.expectedError}`);
      console.log(`  Error: ${message}\n`);
      if (ok) {
        passCount += 1;
      } else {
        failCount += 1;
      }
    }
  }

  console.log(`Summary: ${passCount}/${cases.length} PASS, ${failCount} FAIL/ERROR`);
  process.exit(failCount === 0 ? 0 : 1);
}

if (require.main === module) {
  runMemberAccessNegativeDiagnostics();
}

module.exports = { runMemberAccessNegativeDiagnostics, cases };
