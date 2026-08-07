'use strict';

const { compileSource } = require('../c-compiler.js');

const source = [
  'double eq_as_double(double a, double b) {',
  '  return a == b;',
  '}',
  '',
  'int test_entry(void) {',
  '  return eq_as_double(3.0, 3.0) == 1.0 ? 0 : 17;',
  '}',
  ''
].join('\n');

const result = compileSource(source, {
  sourcePath: 'compiler/tests/f64-comparison-return-regression.c',
  validate: true,
  printWat: false
});

if (!result || result.success === false) {
  throw result?.error || new Error('Compilation failed');
}

if (!result.wat || !result.wat.includes('f64.convert_i32_s')) {
  throw new Error('Expected f64 comparison return to be converted from i32 to f64 in WAT output');
}

if (!result.wasm) {
  throw result.validationError || new Error('WASM binary was not produced');
}

const instance = new WebAssembly.Instance(new WebAssembly.Module(result.wasm), {});
const returnValue = instance.exports.test_entry();

if (returnValue !== 0) {
  throw new Error(`Expected test_entry() to return 0, got ${returnValue}`);
}

console.log('f64 comparison return regression: PASS');
