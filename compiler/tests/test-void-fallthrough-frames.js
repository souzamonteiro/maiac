'use strict';

const assert = require('node:assert/strict');
const { compileSource } = require('../c-compiler');

const source = `
void add(int *total, int value) {
  int local;
  local = value;
  *total += local;
}
void relay(int *total, int value) {
  if (value < 0) return;
  add(total, value);
}
void void_entry(void) {
  int total;
  total = 0;
  relay(&total, 1);
}
int test_entry(void) {
  int total;
  int index;
  total = 0;
  for (index = 0; index < 20000; ++index) {
    relay(&total, 1);
    relay(&total, -1);
  }
  return total;
}
`;
const result = compileSource(source, { validate: true });
assert.ok(result.wasm, result.validationError && result.validationError.message);
const instance = new WebAssembly.Instance(new WebAssembly.Module(Buffer.from(result.wasm)), {});
const stack = instance.exports.__stack_ptr;
const before = stack.value;
instance.exports.void_entry();
assert.equal(stack.value, before, 'Falling through a void function must restore its stack frame');
assert.equal(instance.exports.test_entry(), 20000, 'Nested void calls must retain caller locals');
assert.equal(stack.value, before, 'Repeated implicit and explicit void returns must preserve the stack');
console.log('Void fallthrough: nested frames and 20,000 repeated calls preserve the stack');
