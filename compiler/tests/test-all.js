'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const scripts = [
  'test-preprocessor.js',
  'test-c89-mini-suite.js',
  'test-example-suite.js',
  'test-example-diagnostic-suite.js',
  'test-large-example-e2e.js',
  'test-phase3-initializers-diagnosis.js',
  'test-phase4-abstract-declarators-diagnosis.js',
  'test-phase5-preprocessor-edgecases.js',
  'test-phase6-selection-statements-diagnosis.js',
  'test-phase7-iteration-statements-diagnosis.js',
  'test-phase8-unary-postfix-diagnosis.js',
  'test-phase9-preprocessor-advanced-diagnosis.js',
  'test-phase10-function-definitions-diagnosis.js',
  'test-phase11-struct-union-edgepaths-diagnosis.js',
  'test-member-access-negative-diagnosis.js',
  'test-runtime-js-hosts.js',
  'test-runtime-stdio-edgecases.js',
  'test-runtime-stdio-browser-fallback.js',
  'test-runtime-stdio-printf-family.js',
  'test-struct-assignment-by-value.js',
  'test-argv-pointer-regressions.js',
  'test-stdarg-e2e.js',
  'test-setjmp-resume.js',
  'test-setjmp-bootstrap.js',
  'test-runtime-memory-file-store.js'
];

function parseJsonOutPath(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json-out') {
      return argv[index + 1] || null;
    }
  }

  return process.env.MAIAC_TEST_REPORT_JSON || null;
}

function writeJsonReport(reportPath, report) {
  const targetPath = path.resolve(reportPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return targetPath;
}

console.log('Running MaiaC full test bundle...\n');

const jsonOut = parseJsonOutPath(process.argv.slice(2));
const suiteStartedAt = Date.now();
const report = {
  generatedAt: new Date().toISOString(),
  suite: 'maiac-full-bundle',
  scripts: [],
  totals: {
    total: scripts.length,
    passed: 0,
    failed: 0,
    elapsedMs: 0
  }
};

let failed = 0;
for (const script of scripts) {
  const scriptPath = path.join(__dirname, script);
  console.log(`==> ${script}`);

  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [scriptPath], {
    stdio: 'inherit',
    env: process.env
  });
  const elapsedMs = Date.now() - startedAt;
  const passed = result.status === 0;

  report.scripts.push({
    script,
    passed,
    exitCode: result.status,
    signal: result.signal || null,
    elapsedMs
  });

  if (!passed) {
    failed += 1;
    console.log(`\n${script}: FAIL\n`);
  } else {
    console.log(`\n${script}: PASS\n`);
  }
}

report.totals.failed = failed;
report.totals.passed = scripts.length - failed;
report.totals.elapsedMs = Date.now() - suiteStartedAt;

if (jsonOut) {
  const writtenPath = writeJsonReport(jsonOut, report);
  console.log(`JSON report written to: ${writtenPath}`);
}

if (failed > 0) {
  console.log(`Full bundle summary: ${scripts.length - failed} passed, ${failed} failed`);
  process.exit(1);
}

console.log(`Full bundle summary: ${scripts.length} passed, 0 failed`);
