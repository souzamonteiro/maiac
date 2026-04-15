#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const createDistPath = path.join(repoRoot, 'tools', 'create-dist.js');
const sourcePath = path.join(repoRoot, 'compiler', 'examples', 'vfs_persist_demo.c');
const outDir = path.join(repoRoot, 'dist-vfs-demo');
const wasmPath = path.join(outDir, 'vfsdemo.wasm');
const wrapperPath = path.join(outDir, 'vfsdemo.js');
const hostFilePath = path.join(repoRoot, 'session.log');

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env
  });
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} failed with status ${result.status}`);
  }
}

function getArg(name) {
  return process.argv.includes(name);
}

function main() {
  const clean = getArg('--clean');

  if (clean && fs.existsSync(hostFilePath)) {
    fs.unlinkSync(hostFilePath);
    console.log('[demo:vfs:node] removed previous session.log');
  }

  run(process.execPath, [createDistPath, sourcePath, '-o', outDir, '-n', 'vfsdemo'], repoRoot);
  run(process.execPath, [wrapperPath, wasmPath], repoRoot);

  if (fs.existsSync(hostFilePath)) {
    const size = fs.statSync(hostFilePath).size;
    console.log(`[demo:vfs:node] host file: ${hostFilePath} (${size} bytes)`);
  } else {
    console.log('[demo:vfs:node] session.log not created');
  }
}

try {
  main();
} catch (error) {
  console.error(`[demo:vfs:node] ${error.message}`);
  process.exitCode = 1;
}
