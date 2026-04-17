#!/usr/bin/env node
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WEB_CLI = path.join(ROOT, 'tools', 'webc.js');
const DEFAULT_OUT_DIR = path.join(ROOT, 'dist');

function usage() {
  console.log([
    'Usage: node tools/create-dist.js <input.c> [options]',
    '',
    'Options:',
    '  -o, --out-dir <dir>   Output directory for distributable files (default: dist)',
    '  -n, --name <name>     Base name for generated app files (default: input file stem)',
    '  --wat                 Also include generated .wat file',
    '  -h, --help            Show this help'
  ].join('\n'));
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    input: null,
    outDir: DEFAULT_OUT_DIR,
    name: null,
    emitWat: false,
    help: false
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
      continue;
    }

    if (arg === '--wat') {
      opts.emitWat = true;
      continue;
    }

    if (arg === '-o' || arg === '--out-dir') {
      i += 1;
      opts.outDir = path.resolve(args[i] || DEFAULT_OUT_DIR);
      continue;
    }

    if (arg === '-n' || arg === '--name') {
      i += 1;
      opts.name = String(args[i] || '').trim() || null;
      continue;
    }

    if (!arg.startsWith('-') && !opts.input) {
      opts.input = path.resolve(arg);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return opts;
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help || !opts.input) {
    usage();
    process.exit(opts.help ? 0 : 1);
  }

  const args = [
    WEB_CLI,
    opts.input,
    '--dist',
    '--out-dir',
    opts.outDir,
  ];

  if (opts.name) {
    args.push('--name', opts.name);
  }

  if (opts.emitWat) {
    args.push('--wat');
  }

  const result = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: process.env,
    cwd: ROOT
  });

  if (result.status !== 0) {
    throw new Error('webc dist packaging failed');
  }
}

try {
  main();
} catch (error) {
  console.error(`[create-dist] ${error.message}`);
  process.exit(1);
}
