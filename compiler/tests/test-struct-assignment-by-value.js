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
    'casts determine struct-pointer arithmetic and integer casts stop pointer scaling',
    `
struct Header { int size; int available; struct Header *next; };
int test_entry(void) {
  char buffer[100];
  return (unsigned int)((struct Header *)buffer + 1) - (unsigned int)buffer;
}
`,
    12
  );
  runCase(
    'cast struct-pointer subtraction recovers the allocation header',
    `
struct Header { int size; int available; struct Header *next; };
int test_entry(void) {
  char buffer[100];
  void *payload;
  struct Header *header;
  payload = buffer + 12;
  header = (struct Header *)payload - 1;
  return (unsigned int)header - (unsigned int)buffer;
}
`,
    0
  );
  runCase(
    'struct array and pointer indexing agree with pointer arithmetic',
    `
struct Entry { int first; int second; int third; };
struct Holder { struct Entry *entries; };
int test_entry(void) {
  struct Entry entries[3];
  struct Entry *cursor;
  struct Holder holder;
  cursor = entries;
  holder.entries = entries;
  entries[2].second = 17;
  cursor[1].third = 23;
  holder.entries[0].first = 5;
  return (cursor + 2)->second + entries[1].third + entries[0].first;
}
`,
    45
  );
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
