#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { compileCStringToWat } = require('../pipeline/compile');

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node src/cli/maiac.js <input.c> [output.wat]');
    process.exit(1);
  }

  const output = process.argv[3] || input.replace(/\.c$/i, '.wat');
  const source = fs.readFileSync(input, 'utf8');

  const result = compileCStringToWat(source, { mode: 'subset' });
  fs.writeFileSync(output, result.wat, 'utf8');

  const relativeOut = path.relative(process.cwd(), output);
  console.log(`WAT generated: ${relativeOut}`);
}

main();
