'use strict';

/**
 * host-env-builder.test.js
 *
 * Unit tests for generateHostEnvSource() in tools/host-env-builder.js.
 *
 * Focuses on the ABI contract: the C-side __obj__method naming convention
 * must map to the correct JS call expression without syntax errors.
 *
 * Run with: node --test tools/tests/host-env-builder.test.js
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { generateHostEnvSource } = require(path.resolve(__dirname, '..', 'host-env-builder'));

/**
 * Helper: build a minimal hostImports entry as produced by the MaiaC compiler.
 */
function makeImport(envKey, parts, paramDefs = [], resultType = null) {
  return {
    sourceName: envKey,
    hostInfo: { envKey, jsExpr: parts.join('.'), parts },
    paramDefs,
    resultType
  };
}

// ---------------------------------------------------------------------------
// Basic method-call mapping
// ---------------------------------------------------------------------------

test('generateHostEnvSource maps __console__log to console.log call', () => {
  const src = generateHostEnvSource([
    makeImport('__console__log', ['console', 'log'], [{ cType: 'char', pointerDepth: 1 }], null)
  ]);

  assert.match(src, /"__console__log"/, 'must include env key');
  assert.match(src, /console\.log\(/, 'must emit console.log call');
  assert.doesNotMatch(src, /console\.log\s*=/, 'must not assign, only call');
});

test('generateHostEnvSource maps __Math__sin to Math.sin call', () => {
  const src = generateHostEnvSource([
    makeImport('__Math__sin', ['Math', 'sin'], [{ cType: 'double', pointerDepth: 0 }], 'double')
  ]);

  assert.match(src, /"__Math__sin"/, 'must include env key');
  assert.match(src, /Math\.sin\(/, 'must emit Math.sin call');
});

test('generateHostEnvSource maps __alert to global alert call', () => {
  const src = generateHostEnvSource([
    makeImport('__alert', ['alert'], [{ cType: 'char', pointerDepth: 1 }], null)
  ]);

  assert.match(src, /"__alert"/, 'must include env key');
  // Must call alert(...) directly (no leading dot)
  assert.match(src, /\balert\(/, 'must emit alert call');
  assert.doesNotMatch(src, /\.alert\(/, 'global function must not be accessed via dot');
});

// ---------------------------------------------------------------------------
// Constructor bridge: __new__X → new X(...)
// ---------------------------------------------------------------------------

test('generateHostEnvSource maps __new__Animal to new Animal() – not new.Animal()', () => {
  const src = generateHostEnvSource([
    makeImport('__new__Animal', ['new', 'Animal'], [], null)
  ]);

  assert.match(src, /"__new__Animal"/, 'must include constructor env key');
  // The correct form uses a space between new and the constructor name
  assert.match(src, /new Animal\(/, 'must emit "new Animal(" constructor syntax');
  // The old broken form used dot notation: new.Animal(
  assert.doesNotMatch(src, /new\.Animal\(/, 'must NOT emit "new.Animal(" – that is invalid JS');
});

test('generateHostEnvSource maps __new__EventEmitter to new EventEmitter()', () => {
  const src = generateHostEnvSource([
    makeImport('__new__EventEmitter', ['new', 'EventEmitter'],
      [{ cType: 'void', pointerDepth: 1 }], null)
  ]);

  assert.match(src, /new EventEmitter\(/, 'must emit new EventEmitter constructor syntax');
  assert.doesNotMatch(src, /new\.EventEmitter\(/, 'must not use dot for constructor new');
});

test('generateHostEnvSource maps __new__Promise to new Promise() passing a param', () => {
  const src = generateHostEnvSource([
    makeImport('__new__Promise', ['new', 'Promise'],
      [{ cType: 'void', pointerDepth: 1 }], null)
  ]);

  assert.match(src, /new Promise\(p0\)/, 'must forward single param to constructor');
  assert.doesNotMatch(src, /new\.Promise\(/, 'must not use dot-notation for new');
});

// ---------------------------------------------------------------------------
// Multiple imports coexist without interference
// ---------------------------------------------------------------------------

test('generateHostEnvSource emits multiple mappings without cross-contamination', () => {
  const src = generateHostEnvSource([
    makeImport('__console__log', ['console', 'log'], [{ cType: 'char', pointerDepth: 1 }], null),
    makeImport('__new__Animal',  ['new', 'Animal'], [], null),
    makeImport('__Math__floor',  ['Math', 'floor'], [{ cType: 'double', pointerDepth: 0 }], 'double')
  ]);

  assert.match(src, /console\.log\(/, 'console.log must appear');
  assert.match(src, /new Animal\(/, '"new Animal" must appear');
  assert.match(src, /Math\.floor\(/, 'Math.floor must appear');
  // None of them should have leaked dot-notation for 'new'
  assert.doesNotMatch(src, /new\.Animal\(/, 'constructor must not use dot notation');
});

// ---------------------------------------------------------------------------
// Output is syntactically valid JS (evaluable)
// ---------------------------------------------------------------------------

test('generateHostEnvSource output is a syntactically valid IIFE wrapper', () => {
  const src = generateHostEnvSource([
    makeImport('__console__log', ['console', 'log'], [{ cType: 'char', pointerDepth: 1 }], null)
  ]);

  // The generated source must be parseable as JS (no syntax errors).
  assert.doesNotThrow(() => {
    new Function('"use strict";\nreturn ' + src + '(() => null);');
  }, 'generated source must be syntactically valid JavaScript');
});

test('generateHostEnvSource with constructor is syntactically valid JS', () => {
  const src = generateHostEnvSource([
    makeImport('__new__Animal', ['new', 'Animal'], [], null)
  ]);

  assert.doesNotThrow(() => {
    new Function('"use strict";\nreturn ' + src + '(() => null);');
  }, 'constructor bridge output must be syntactically valid JavaScript');
});
