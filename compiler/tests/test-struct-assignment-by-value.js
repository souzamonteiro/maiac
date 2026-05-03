'use strict';

const { compileSource } = require('../c-compiler.js');

function runCase(name, source, expected) {
  const result = compileSource(source);
  const instance = new WebAssembly.Instance(new WebAssembly.Module(result.wasm));
  const returned = instance.exports.test_entry();
  if (returned !== expected) {
    throw new Error(`${name}: got ${returned}, expected ${expected}`);
  }
  console.log(`PASS: ${name}`);
}

(() => {
  runCase(
    'local struct copy assignment',
    `
struct Pair { int x; int y; };
int test_entry(void) {
  struct Pair a;
  struct Pair b;
  a.x = 4;
  a.y = 9;
  b = a;
  return b.x * 10 + b.y;
}
`,
    49
  );

  runCase(
    'nested struct field copy assignment',
    `
struct Inner { int value; };
struct Outer { struct Inner inner; int tag; };
int test_entry(void) {
  struct Outer a;
  struct Outer b;
  a.inner.value = 7;
  a.tag = 3;
  b.inner.value = 0;
  b.tag = 0;
  b.inner = a.inner;
  return b.inner.value;
}
`,
    7
  );

  runCase(
    'pointer-dereferenced struct copy assignment',
    `
struct S { int v; int w; };
int test_entry(void) {
  struct S a;
  struct S b;
  struct S *pa;
  struct S *pb;
  a.v = 11;
  a.w = 22;
  b.v = 0;
  b.w = 0;
  pa = &a;
  pb = &b;
  *pb = *pa;
  return b.v + b.w;
}
`,
    33
  );

  console.log('struct assignment by value tests: PASS');
})();
