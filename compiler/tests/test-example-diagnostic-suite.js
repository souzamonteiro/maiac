'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.join(__dirname, '..', '..');
const suiteDir = path.join(__dirname, '..', 'examples', 'diagnostic-suite');
const webcPath = path.join(rootDir, 'tools', 'webc.js');

const cases = [
  {
    file: '01_stdio_file_handles.c',
    kind: 'compile-failure',
    expectedPattern: /Unknown symbol 'FILE'/,
    limitation: 'Direct example dist path still does not resolve FILE-backed stdio declarations from stdio.h.'
  },
  {
    file: '02_stdarg_variadics.c',
    kind: 'compile-failure',
    expectedPattern: /Expected at least one translationUnitItem/,
    limitation: 'Direct example dist path still fails on stdarg.h-backed variadic example compilation.'
  },
  {
    file: '03_setjmp_dist_runner.c',
    kind: 'runtime-failure',
    expectedPattern: /imported function does not match the expected type/,
    limitation: 'Generated dist node runner still does not provide a compatible setjmp/longjmp import path.'
  },
  {
    file: '04_time_basic_dist.c',
    kind: 'runtime-failure',
    expectedPattern: /program returned: 31/,
    limitation: 'Direct dist runner still returns a non-positive value for basic time() in standalone examples.'
  },
  {
    file: '05_time_struct_runtime.c',
    kind: 'runtime-failure',
    expectedPattern: /program returned: 11/,
    limitation: 'Direct dist runner still does not produce a usable gmtime/strftime flow in standalone examples.'
  },
  {
    file: '06_locale_basic_dist.c',
    kind: 'runtime-failure',
    expectedPattern: /program returned: 41/,
    limitation: 'Direct dist runner still returns null from basic setlocale() in standalone examples.'
  },
  {
    file: '07_localeconv_structs.c',
    kind: 'compile-failure',
    expectedPattern: /Unknown struct layout for pointer 'conv'/,
    limitation: 'Direct dist/example path still cannot compile localeconv()-backed lconv struct access.'
  }
];

function runCase(testCase) {
  const sourcePath = path.join(suiteDir, testCase.file);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maiac-diagnostic-'));
  const appName = path.basename(testCase.file, '.c');
  const distDir = path.join(tempDir, 'dist');

  const compile = spawnSync(process.execPath, [webcPath, sourcePath, '--dist', '--out-dir', distDir, '--name', appName], {
    cwd: rootDir,
    env: process.env,
    encoding: 'utf8'
  });

  const compileOutput = `${compile.stdout || ''}${compile.stderr || ''}`;

  if (testCase.kind === 'compile-failure') {
    if (compile.status !== 0 && testCase.expectedPattern.test(compileOutput)) {
      return { status: 'KNOWN', message: testCase.limitation };
    }
    if (compile.status === 0) {
      return { status: 'IMPROVED', message: 'Compilation now succeeds; reassess whether this case should move into the green suite.' };
    }
    return { status: 'FAIL', message: `Unexpected compile result: ${compileOutput.trim()}` };
  }

  if (compile.status !== 0) {
    return { status: 'FAIL', message: `Compilation failed unexpectedly: ${compileOutput.trim()}` };
  }

  const runnerPath = path.join(distDir, 'node-runner.sh');
  const run = spawnSync('bash', [runnerPath], {
    cwd: rootDir,
    env: process.env,
    encoding: 'utf8'
  });
  const runOutput = `${run.stdout || ''}${run.stderr || ''}`;

  if (run.status !== 0 && testCase.expectedPattern.test(runOutput)) {
    return { status: 'KNOWN', message: testCase.limitation };
  }
  if (run.status === 0) {
    return { status: 'IMPROVED', message: 'Runtime now succeeds; reassess whether this case should move into the green suite.' };
  }
  return { status: 'FAIL', message: `Unexpected runtime result: ${runOutput.trim()}` };
}

(() => {
  let failed = 0;
  let known = 0;
  let improved = 0;

  console.log('Running MaiaC diagnostic example suite...\n');

  for (const testCase of cases) {
    process.stdout.write(`  ${testCase.file} ... `);
    const result = runCase(testCase);
    if (result.status === 'KNOWN') {
      known += 1;
      console.log('KNOWN');
      console.log(`    ${result.message}`);
    } else if (result.status === 'IMPROVED') {
      improved += 1;
      console.log('IMPROVED');
      console.log(`    ${result.message}`);
    } else {
      failed += 1;
      console.log('FAIL');
      console.log(`    ${result.message}`);
    }
  }

  console.log(`\nSummary: ${known} known, ${improved} improved, ${failed} unexpected failures`);
  process.exit(failed === 0 ? 0 : 1);
})();