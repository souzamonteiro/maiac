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

  runCase('indexed struct destination copies every field and preserves its neighbor', `
struct Cell {int op; unsigned int first; unsigned int count;};
int test_entry(void) {
  struct Cell array[2]; struct Cell source;
  array[0].op=-1;array[0].first=0;array[0].count=0;
  array[1].op=99;array[1].first=98;array[1].count=97;
  source.op=3;source.first=46;source.count=7;array[0]=source;
  return !(array[0].op==3 && array[0].first==46 && array[0].count==7
    && array[1].op==99 && array[1].first==98 && array[1].count==97);
}`, 0);
  runCase('indexed source and destination evaluate subscripts once', `
struct Cell {int op; int first; int count;};
int test_entry(void) {
  struct Cell source[2];struct Cell target[2];int i;int j;
  source[0].op=3;source[0].first=46;source[0].count=7;
  source[1].op=1;source[1].first=2;source[1].count=3;
  target[0].op=99;target[0].first=98;target[0].count=97;
  target[1].op=0;target[1].first=0;target[1].count=0;
  i=1;j=0;target[i++]=source[j++];
  return !(i==2 && j==1 && target[1].op==3 && target[1].first==46 && target[1].count==7
    && target[0].op==99 && source[0].count==7);
}`, 0);
  runCase('struct pointer indexing copies values through a function parameter', `
struct Cell {int op; int first; int count;};
void copy(struct Cell *target, const struct Cell *source) {target[1]=source[0];}
int test_entry(void) {
  struct Cell a[2];struct Cell b[1];a[1].op=0;a[1].first=0;a[1].count=0;
  b[0].op=3;b[0].first=46;b[0].count=7;copy(a,b);
  return !(a[1].op==3 && a[1].first==46 && a[1].count==7);
}`, 0);
  runCase('nested member arrays are complete struct values on both sides', `
struct Cell {int op; int first; int count;};
struct Owner {struct Cell items[2];struct Cell *pointer;};
int test_entry(void) {
  struct Owner left;struct Owner right;struct Owner *a;struct Owner *b;struct Cell value;
  a=&left;b=&right;left.pointer=left.items;right.pointer=right.items;
  right.items[1].op=3;right.items[1].first=46;right.items[1].count=7;
  left.items[0].op=0;left.items[0].first=0;left.items[0].count=0;
  a->items[0]=b->pointer[1];value=a->items[0];
  return !(value.op==3 && value.first==46 && value.count==7 && left.items[0].count==7);
}`, 0);
  runCase('multidimensional struct array copy retains the final element layout', `
struct Cell {int x;int y;};
int test_entry(void) {
  struct Cell a[2][2];struct Cell source;
  source.x=11;source.y=22;a[1][1]=source;source.x=0;source.y=0;source=a[1][1];
  return !(source.x==11 && source.y==22);
}`, 0);
  runCase('struct pointer array assignment remains a pointer-sized store', `
struct Cell {int x;int y;};
int test_entry(void) {
  struct Cell a;struct Cell b;struct Cell *items[2];a.x=11;a.y=22;b.x=33;b.y=44;
  items[0]=&a;items[1]=&b;items[0]=items[1];
  return !(items[0]==&b && items[1]==&b && a.x==11 && a.y==22 && items[0]->y==44);
}`, 0);
  const assert = require('node:assert/strict');
  assert.throws(() => compileSource(`
struct Cell {int x;int y;};
int test_entry(void) {const struct Cell a[1]={{1,2}};struct Cell b;b.x=3;b.y=4;a[0]=b;return 0;}
`), /read-only/i, 'Const indexed struct objects remain read-only');

  runCase('member-array arithmetic retains byte, struct and row element sizes', `
struct Item {int a;int b;int c;};
struct Buffer {unsigned char text[64];struct Item items[4];struct Item rows[2][3];struct Item *slots[4];};
int test_entry(void) {
  struct Buffer value;
  if((unsigned int)(value.text+5)-(unsigned int)value.text!=5)return 1;
  if((unsigned int)(value.items+1)-(unsigned int)value.items!=12)return 2;
  if((unsigned int)(value.rows+1)-(unsigned int)value.rows!=36)return 3;
  if((unsigned int)(value.slots+1)-(unsigned int)value.slots!=4)return 4;
  return 0;
}`, 0);
  runCase('pointer fields use pointee sizes and integer casts stop scaling', `
struct Item {int a;int b;int c;};
struct Buffer {unsigned char *text;struct Item *items;struct Item **slots;};
int test_entry(void) {
  struct Buffer value;unsigned char bytes[64];struct Item items[4];struct Item *slots[4];
  value.text=bytes;value.items=items;value.slots=slots;
  if((unsigned int)(value.text+5)-(unsigned int)value.text!=5)return 1;
  if((unsigned int)(value.items+1)-(unsigned int)value.items!=12)return 2;
  if((unsigned int)(value.slots+1)-(unsigned int)value.slots!=4)return 3;
  if((unsigned int)value.items+1-(unsigned int)value.items!=1)return 4;
  return 0;
}`, 0);

  console.log('struct assignment by value tests: PASS');
})();
