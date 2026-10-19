'use strict';

const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '../..');
const output = execFileSync(process.execPath, [
  path.join(root, 'tools/run-test-node.js'),
  path.join(root, 'compiler/examples/test-maiaregex.c'),
  '--resolve-system-includes',
], { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024 });

assert.match(output, /^MAIA_REGEX_PROGRAM: \d+ checks, 0 failures$/m);
assert.match(output, /^\[maiac\] program returned: 0$/m);
console.log(output.trim());