'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { compileSource } = require('../c-compiler.js');

const rootDir = path.join(__dirname, '..', '..');
const webcPath = path.join(rootDir, 'tools', 'webc.js');
const courseDir = path.join(rootDir, 'compiler', 'examples', 'programming_in_c_course_en');

function fail(message) {
  throw new Error(message);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    fail(`${label}: got ${actual}, expected ${expected}`);
  }
}

function runPointerIncrementRegression() {
  const source = `
int test_entry(void) {
  char a[] = "A=1";
  char b[] = "B=2";
  char *envv[3];
  char **p;
  int n = 0;
  envv[0] = a;
  envv[1] = b;
  envv[2] = 0;
  p = envv;
  while (*p) {
    n++;
    p++;
  }
  return n;
}
`;

  const result = compileSource(source);
  const instance = new WebAssembly.Instance(new WebAssembly.Module(result.wasm));
  const returned = instance.exports.test_entry();
  assertEqual(returned, 2, 'char** p++ stride regression');
}

function runLargeArgvEnvRegression() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maiac-argv-env-reg-'));
  const srcPath = path.join(tmpDir, 'large_env.c');
  const distDir = path.join(tmpDir, 'dist');
  const appName = 'large_env';

  const source = `
#include <stdio.h>

int main(int argc, char *argv[], char **env) {
  int n = 0;
  char **p = env;
  if (argc < 1) return 9;
  while (*p) {
    n++;
    p++;
  }
  if (n < 180) return 7;
  return 0;
}
`;

  fs.writeFileSync(srcPath, source, 'utf8');

  const compile = spawnSync(process.execPath, [webcPath, srcPath, '--dist', '--out-dir', distDir, '--name', appName], {
    cwd: rootDir,
    env: process.env,
    encoding: 'utf8'
  });

  if (compile.status !== 0) {
    fail(`webc compile failed: ${(compile.stdout || '')}${(compile.stderr || '')}`);
  }

  const appJs = path.join(distDir, `${appName}.js`);
  const appWasm = path.join(distDir, `${appName}.wasm`);
  const envList = [];
  for (let i = 0; i < 220; i += 1) {
    envList.push(`VAR_${i}=${'x'.repeat(120)}`);
  }

  const invoke = `
const app = require(${JSON.stringify(appJs)});
(async () => {
  const code = await app.run(${JSON.stringify(appWasm)}, {
    argv: ['large_env', 'hello'],
    env: ${JSON.stringify(envList)}
  });
  process.stdout.write(String(code));
})().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
`;

  const run = spawnSync(process.execPath, ['-e', invoke], {
    cwd: rootDir,
    env: process.env,
    encoding: 'utf8'
  });

  if (run.status !== 0) {
    fail(`large argv/env run failed: ${(run.stdout || '')}${(run.stderr || '')}`);
  }

  assertEqual((run.stdout || '').trim(), '0', 'large argv/env injection regression');
}

function runCommandLineArgsParityRegression() {
  const runAll = path.join(courseDir, 'run_all.sh');
  const run = spawnSync('bash', [runAll, '13_misc'], {
    cwd: courseDir,
    env: process.env,
    encoding: 'utf8'
  });

  if (run.status !== 0) {
    fail(`course run_all 13_misc failed: ${(run.stdout || '')}${(run.stderr || '')}`);
  }

  const output = `${run.stdout || ''}${run.stderr || ''}`;
  if (!/Results:\s*1 passed\s*\/\s*0 failed\s*\/\s*0 skipped/.test(output)) {
    fail(`unexpected 13_misc summary:\n${output}`);
  }
}

(() => {
  console.log('Running argv/pointer regression tests...');
  runPointerIncrementRegression();
  runLargeArgvEnvRegression();
  runCommandLineArgsParityRegression();
  console.log('argv/pointer regression tests: PASS');
})();
