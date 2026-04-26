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
    kind: 'runtime-success',
    limitation: 'Resolved: direct dist/example path now compiles and runs FILE-backed stdio file workflow.'
  },
  {
    file: '02_stdarg_variadics.c',
    kind: 'runtime-success',
    limitation: 'Resolved: direct dist/example path now compiles and runs stdarg.h variadic example.'
  },
  {
    file: '03_setjmp_dist_runner.c',
    kind: 'runtime-success',
    limitation: 'Resolved: generated dist node runner now supports setjmp/longjmp import path.'
  },
  {
    file: '04_time_basic_dist.c',
    kind: 'runtime-success',
    limitation: 'Resolved: direct dist runner now returns usable values for basic time() and clock() in standalone examples.'
  },
  {
    file: '05_time_struct_runtime.c',
    kind: 'runtime-success',
    limitation: 'Resolved: direct dist runner now supports gmtime/strftime flow in standalone examples.'
  },
  {
    file: '06_locale_basic_dist.c',
    kind: 'runtime-success',
    limitation: 'Resolved: direct dist runner now returns non-null from basic setlocale() in standalone examples.'
  },
  {
    file: '07_localeconv_structs.c',
    kind: 'runtime-success',
    limitation: 'Resolved: direct dist runner now supports localeconv() struct-backed decimal_point access in standalone examples.'
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

  if (testCase.kind === 'compile-success') {
    if (compile.status === 0) {
      return { status: 'RESOLVED', message: testCase.limitation };
    }
    return { status: 'FAIL', message: `Compilation failed unexpectedly: ${compileOutput.trim()}` };
  }

  if (testCase.kind === 'compile-failure') {
    if (compile.status !== 0 && testCase.expectedPattern.test(compileOutput)) {
      return { status: 'KNOWN', message: testCase.limitation };
    }
    if (compile.status === 0) {
      return { status: 'RESOLVED', message: testCase.limitation };
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

  if (testCase.kind === 'runtime-success') {
    if (run.status === 0) {
      return { status: 'RESOLVED', message: testCase.limitation };
    }
    return { status: 'FAIL', message: `Runtime failed unexpectedly: ${runOutput.trim()}` };
  }

  if (run.status !== 0 && testCase.expectedPattern.test(runOutput)) {
    return { status: 'KNOWN', message: testCase.limitation };
  }
  if (run.status === 0) {
    return { status: 'RESOLVED', message: testCase.limitation };
  }
  return { status: 'FAIL', message: `Unexpected runtime result: ${runOutput.trim()}` };
}

(() => {
  let failed = 0;
  let known = 0;
  let resolved = 0;

  console.log('Running MaiaC diagnostic example suite...\n');

  for (const testCase of cases) {
    process.stdout.write(`  ${testCase.file} ... `);
    const result = runCase(testCase);
    if (result.status === 'KNOWN') {
      known += 1;
      console.log('KNOWN');
      console.log(`    ${result.message}`);
    } else if (result.status === 'RESOLVED') {
      resolved += 1;
      console.log('RESOLVED');
      console.log(`    ${result.message}`);
    } else {
      failed += 1;
      console.log('FAIL');
      console.log(`    ${result.message}`);
    }
  }

  console.log(`\nSummary: ${known} known, ${resolved} resolved, ${failed} unexpected failures`);
  process.exit(failed === 0 ? 0 : 1);
})();