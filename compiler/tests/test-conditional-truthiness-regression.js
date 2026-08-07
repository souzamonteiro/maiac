'use strict';

const { compileSource } = require('../c-compiler.js');

const source = [
  'double choose_flag(double s, double m) {',
  '  return (((s == 10) ? (m == 21) : s) ? 1 : 0);',
  '}',
  '',
  'int test_entry(void) {',
  '  return choose_flag(10, 21) == 1 ? 0 : 29;',
  '}',
  ''
].join('\n');

const result = compileSource(source, {
  sourcePath: 'compiler/tests/conditional-truthiness-regression.c',
  validate: true,
  printWat: false
});

if (!result || result.success === false) {
  throw result?.error || new Error('Compilation failed');
}

if (!result.wat || !/f64\.const 0\s+f64\.ne/.test(result.wat)) {
  throw new Error('Expected mixed-type conditional truthiness to normalize through f64.ne in WAT output');
}

if (!result.wasm) {
  throw result.validationError || new Error('WASM binary was not produced');
}

const instance = new WebAssembly.Instance(new WebAssembly.Module(result.wasm), {});
const returnValue = instance.exports.test_entry();

if (returnValue !== 0) {
  throw new Error(`Expected test_entry() to return 0, got ${returnValue}`);
}

console.log('conditional truthiness regression: PASS');
