'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.join(__dirname, '..', '..');
const suiteDir = path.join(__dirname, '..', 'examples', 'suite');
const buildScript = path.join(suiteDir, 'build_all.sh');
const runScript = path.join(suiteDir, 'run_all.sh');

function runShellScript(scriptPath, label) {
  const result = spawnSync('bash', [scriptPath], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env
  });

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

(() => {
  console.log('Running MaiaC example suite E2E...');
  console.log(`  Suite: ${suiteDir}`);

  runShellScript(buildScript, 'suite build');
  runShellScript(runScript, 'suite run');

  console.log('MaiaC example suite E2E: PASS');
})();