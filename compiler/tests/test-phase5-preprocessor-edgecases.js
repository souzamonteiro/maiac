'use strict';

const assert = require('assert');
const path = require('path');

const { preprocessCSource } = require('../c-preprocessor.js');
const { compileSource } = require('../c-compiler.js');

const fixturesDir = path.join(__dirname, 'fixtures', 'preprocessor');
const sourcePath = path.join(fixturesDir, 'entry.c');

function runEntryFromSource(source) {
  const result = compileSource(source, { sourcePath, validate: true, printWat: false });
  assert.ok(result.wasm, 'expected wasm output');
  const wasmBytes = Buffer.from(result.wasm);
  const wasmModule = new WebAssembly.Module(wasmBytes);
  const instance = new WebAssembly.Instance(wasmModule, { env: { printf: () => 0 } });
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
    name: 'token pasting (##) builds identifiers',
    fn: () => {
      const source = [
        '#define CAT(a, b) a ## b',
        'int xy = 7;',
        'int test_entry(void) { return CAT(x, y); }'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      assert.ok(pre.includes('return xy;') || pre.includes('return (xy);'));
      assert.strictEqual(runEntryFromSource(source), 7);
    }
  },
  {
    name: 'stringification (#) emits string literal text',
    fn: () => {
      const source = [
        '#define STR(x) #x',
        'const char *s = STR(alpha + beta);',
        'int test_entry(void) { return 1; }'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      assert.ok(pre.includes('"alpha + beta"'));
    }
  },
  {
    name: 'recursive macro chain stabilizes by iterative expansion',
    fn: () => {
      const source = [
        '#define A B',
        '#define B C',
        '#define C 13',
        'int test_entry(void) { return A; }'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      assert.ok(/return\s*\(+\s*13\s*\)+\s*;/.test(pre));
      assert.strictEqual(runEntryFromSource(source), 13);
    }
  },
  {
    name: 'nested conditional expression with defined() and arithmetic',
    fn: () => {
      const source = [
        '#define X 2',
        '#define Y 5',
        '#if defined(X) && ((X + Y) == 7)',
        'int test_entry(void) { return 9; }',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 9);
    }
  },
  {
    name: 'native arrow operator passes through preprocessing unchanged',
    fn: () => {
      const source = [
        'struct Node { int value; };',
        'int test_entry(void) {',
        '  struct Node n;',
        '  struct Node *p = &n;',
        '  n.value = 12;',
        '  return p->value;',
        '}'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      assert.ok(pre.includes('p->value'));
      assert.ok(!pre.includes('__arrow__'));
      assert.strictEqual(runEntryFromSource(source), 12);
    }
  },
  {
    name: '#if with relational and equality operators',
    fn: () => {
      const source = [
        '#define VERSION 3',
        '#if VERSION >= 3',
        'int test_entry(void) { return 1; }',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 1);
    }
  },
  {
    name: '#if with logical NOT and comparison',
    fn: () => {
      const source = [
        '#define DEBUG 0',
        '#if !DEBUG',
        'int test_entry(void) { return 5; }',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 5);
    }
  },
  {
    name: '#if with shift and bitwise expression',
    fn: () => {
      const source = [
        '#define FLAGS 0x04',
        '#if (FLAGS >> 1) == 2',
        'int test_entry(void) { return 77; }',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 77);
    }
  },
  {
    name: 'multi-level include nesting: feature.h -> nested/math.h',
    fn: () => {
      const source = [
        `#include "feature.h"`,
        'int test_entry(void) { return DOUBLE(FEATURE_VAL); }'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      assert.ok(!pre.includes('#include'), 'includes should be expanded');
      assert.strictEqual(runEntryFromSource(source), 14);
    }
  },
  {
    name: 'include with constants.h macros in #if guard',
    fn: () => {
      const source = [
        `#include "constants.h"`,
        '#if BASE == 10',
        'int test_entry(void) { return INC(BASE); }',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 11);
    }
  },
  {
    name: '#elif chooses middle branch correctly',
    fn: () => {
      const source = [
        '#define MODE 2',
        '#if MODE == 1',
        'int test_entry(void) { return 11; }',
        '#elif MODE == 2',
        'int test_entry(void) { return 22; }',
        '#else',
        'int test_entry(void) { return 33; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 22);
    }
  },
  {
    name: '#undef removes macro from defined() checks',
    fn: () => {
      const source = [
        '#define FLAG 1',
        '#undef FLAG',
        '#if defined(FLAG)',
        'int test_entry(void) { return 0; }',
        '#else',
        'int test_entry(void) { return 5; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 5);
    }
  },
  {
    name: '#ifdef and #ifndef both resolve active branch',
    fn: () => {
      const source = [
        '#define FOO 1',
        '#ifdef FOO',
        '#ifndef BAR',
        'int test_entry(void) { return 17; }',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 17);
    }
  },
  {
    name: 'defined macro without parentheses in #if',
    fn: () => {
      const source = [
        '#define Q 1',
        '#if defined Q',
        'int test_entry(void) { return 4; }',
        '#else',
        'int test_entry(void) { return 0; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 4);
    }
  },
  {
    name: 'recursive include guards expose both macro sets',
    fn: () => {
      const source = [
        '#include "recursive_a.h"',
        'int test_entry(void) { return A_VAL + B_VAL; }'
      ].join('\n');

      const pre = preprocessCSource(source, { sourcePath });
      assert.ok(!pre.includes('#include'), 'recursive include chain should be expanded');
      assert.strictEqual(runEntryFromSource(source), 33);
    }
  },
  {
    name: '#elif fallback path hits #else when no branch matches',
    fn: () => {
      const source = [
        '#define MODE 9',
        '#if MODE == 1',
        'int test_entry(void) { return 1; }',
        '#elif MODE == 2',
        'int test_entry(void) { return 2; }',
        '#else',
        'int test_entry(void) { return 30; }',
        '#endif'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 30);
    }
  }
];

let failed = 0;
console.log('Running MaiaC Phase 5 preprocessor edge-case tests...\n');

for (const testCase of cases) {
  const ok = runCase(testCase.name, testCase.fn);
  if (!ok) {
    failed += 1;
  }
}

console.log(`\nSummary: ${cases.length - failed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
