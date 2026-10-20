'use strict';
const assert = require('node:assert/strict');
const { compileSource, parseCSource } = require('../c-compiler');

const cases = [
  ['unsigned suffix survives normalization and selects unsigned comparison',
    'int test_entry(void) { return 3 <= 4294967295U && -1 > 1U; }'],
  ['hexadecimal/octal and both suffix orders retain their unsigned value',
    'int test_entry(void) { return -1 == 0xffffffffUL && -1 == 037777777777LU && 3 < 4294967295uL; }'],
  ['UINT_MAX boundary guards work for unsigned struct fields',
    'struct Text {char* data; unsigned int length;}; int test_entry(void) { struct Text t; t.length=3; return t.length<=4294967295U && t.length<(unsigned int)-1; }'],
  ['unsigned field metadata drives comparison even without an unsigned literal',
    'struct Text {unsigned int length;}; int test_entry(void) { struct Text t; struct Text* p; p=&t; t.length=0xffffffffU; return t.length>0 && p->length>0 && t.length/-1==1; }'],
  ['decimal literal exceeding signed target range uses unsigned long in C89',
    'int test_entry(void) { return -1 == 4294967295 && 4294967295 > 1; }'],
  ['unsigned member after a function returning a struct pointer',
    'struct Text {unsigned int length;}; struct Text* same(struct Text* p) {return p;} int test_entry(void) {struct Text t;t.length=0xffffffffU;return same(&t)->length>0;}'],
];
for (const [name, source] of cases) {
  const compiled = compileSource(source, { validate: true });
  assert.ok(compiled.wasm, compiled.validationError && compiled.validationError.message);
  const instance = new WebAssembly.Instance(new WebAssembly.Module(Buffer.from(compiled.wasm)), {});
  assert.equal(instance.exports.test_entry(), 1, name);
  console.log(`PASS ${name}`);
}
assert.match(parseCSource('int test(void) {return 1U;}').normalizedSource, /1U/);
