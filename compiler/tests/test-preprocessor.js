'use strict';

const assert = require('assert');
const path = require('path');

const { preprocessCSource } = require('../c-preprocessor.js');
const { compileSource } = require('../c-compiler.js');

const fixturesDir = path.join(__dirname, 'fixtures', 'preprocessor');
const sourcePath = path.join(fixturesDir, 'entry.c');

function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function runEntryFromSource(source) {
  const result = compileSource(source, { sourcePath, validate: true, printWat: false });
  assert.ok(result.wasm, 'expected wasm output');
  const wasmBytes = Buffer.from(result.wasm);
  const module = new WebAssembly.Module(wasmBytes);
  const instance = new WebAssembly.Instance(module, {});
  const entry = instance.exports && instance.exports.test_entry;
  assert.strictEqual(typeof entry, 'function', 'missing test_entry export');
  return entry();
}

function runCase(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
    return true;
  } catch (error) {
    console.log(`FAIL ${name}`);
    console.log(`  ${String(error && error.message ? error.message : error)}`);
    return false;
  }
}

const cases = [
  {
    name: 'object and function macro expansion',
    fn: () => {
      const source = [
        '#define BASE 10',
        '#define ADD1(v) ((v) + 1)',
        'int test_entry(void) { return ADD1(BASE); }'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      assert.ok(!pre.includes('ADD1'));
      assert.ok(!pre.includes('BASE'));
      assert.strictEqual(runEntryFromSource(source), 11);
    }
  },
  {
    name: 'conditional directives ifdef/ifndef/if/elif/else',
    fn: () => {
      const source = [
        '#define FLAG 1',
        '#ifdef FLAG',
        'int yes(void) { return 1; }',
        '#else',
        'int no(void) { return 0; }',
        '#endif',
        '#ifndef UNKNOWN_FLAG',
        'int ok(void) { return 2; }',
        '#endif',
        '#if defined(FLAG) && (FLAG == 1)',
        'int cond(void) { return 3; }',
        '#elif 1',
        'int wrong(void) { return -1; }',
        '#else',
        'int wrong2(void) { return -2; }',
        '#endif',
        'int test_entry(void) { return yes() + ok() + cond(); }'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      assert.ok(pre.includes('int yes(void) { return 1; }'));
      assert.ok(pre.includes('int ok(void) { return 2; }'));
      assert.ok(pre.includes('int cond(void) { return 3; }'));
      assert.ok(!pre.includes('int no(void) { return 0; }'));
      assert.ok(!pre.includes('int wrong(void) { return -1; }'));
      assert.ok(!pre.includes('int wrong2(void) { return -2; }'));
    }
  },
  {
    name: 'undef disables macro substitution',
    fn: () => {
      const source = [
        '#define TEMP 99',
        '#undef TEMP',
        '#ifdef TEMP',
        'int test_entry(void) { return TEMP; }',
        '#else',
        'int test_entry(void) { return 5; }',
        '#endif'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      assert.ok(pre.includes('return 5;'));
      assert.ok(!pre.includes('return 99;'));
    }
  },
  {
    name: 'local include and nested include expansion',
    fn: () => {
      const source = [
        '#include "constants.h"',
        '#include "feature.h"',
        'int test_entry(void) { return DOUBLE(INC(BASE)) + FEATURE_VAL; }'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      const oneLine = normalize(pre);
      assert.ok(!oneLine.includes('DOUBLE('));
      assert.ok(!oneLine.includes('INC('));
      assert.ok(!oneLine.includes('BASE'));
      assert.ok(!oneLine.includes('FEATURE_VAL'));
      assert.ok(oneLine.includes('return'));
      assert.ok(oneLine.includes('7'));
    }
  },
  {
    name: 'recursive include does not loop forever',
    fn: () => {
      const source = [
        '#include "recursive_a.h"',
        'int test_entry(void) { return A_VAL + B_VAL; }'
      ].join('\n');

      const started = Date.now();
      const pre = preprocessCSource(source, { sourcePath });
      const elapsed = Date.now() - started;
      assert.ok(elapsed < 2000, `preprocess took too long (${elapsed}ms)`);
      assert.ok(pre.includes('return (11) + (22);') || pre.includes('return 11 + 22;'));
    }
  },
  {
    name: 'compileSource accepts preprocessor directives with sourcePath',
    fn: () => {
      const source = [
        '#define FLAG 1',
        '#if FLAG',
        'int test_entry(void) { return 123; }',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 123);
    }
  }
];

let failed = 0;
console.log('Running MaiaC preprocessor tests...\n');

for (const testCase of cases) {
  const ok = runCase(testCase.name, testCase.fn);
  if (!ok) {
    failed += 1;
  }
}

console.log(`\nSummary: ${cases.length - failed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
