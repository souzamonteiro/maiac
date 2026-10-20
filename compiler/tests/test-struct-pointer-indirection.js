'use strict';
const assert = require('node:assert/strict');
const { compileSource } = require('../c-compiler');

const cases = [
  ['append updates a tail pointer without copying a struct over the pointer slot', `
    struct Item { int value; struct Item* next; };
    void append(struct Item** tail, struct Item* item) { (*tail)->next=item; *tail=item; }
    int test_entry(void) {
      struct Item a; struct Item b; struct Item c; struct Item* tail;
      a.value=1;b.value=2;c.value=3;a.next=0;b.next=0;c.next=0;tail=&a;
      append(&tail,&b);append(&tail,&c);
      if(tail!=&c) return 1;
      if(a.next!=&b || b.next!=&c || c.next!=0) return 2;
      return a.next->value*10+a.next->next->value==23 ? 0 : 3;
    }`],
  ['storing through a double pointer preserves adjacent storage', `
    struct Item {int value; int extra; int another;};
    struct Box {struct Item* pointer; int canary;};
    void set(struct Item** target, struct Item* value) { *target=value; }
    int test_entry(void) {
      struct Item item; struct Box box; item.value=7;item.extra=8;item.another=9;
      box.pointer=0;box.canary=12345;set(&box.pointer,&item);
      return !(box.pointer==&item && box.canary==12345 && box.pointer->another==9);
    }`],
  ['dereferenced double pointer still supports arrow member updates', `
    struct Item {int value;};
    int test_entry(void) {
      struct Item item; struct Item* pointer; struct Item** alias;
      item.value=11;pointer=&item;alias=&pointer;(*alias)->value+=5;
      return (*alias)->value==16 ? 0 : 1;
    }`],
  ['single struct pointer assignment continues to copy the whole value', `
    struct Item {int first; int second;};
    void copy(struct Item* target, struct Item* source) { *target=*source; }
    int test_entry(void) {
      struct Item left;struct Item right;left.first=1;left.second=2;right.first=7;right.second=9;
      copy(&left,&right);return left.first==7 && left.second==9 ? 0 : 1;
    }`],
];
for (const [name, source] of cases) {
  const result = compileSource(source, { validate: true });
  assert.ok(result.wasm, result.validationError && result.validationError.message);
  const instance = new WebAssembly.Instance(new WebAssembly.Module(Buffer.from(result.wasm)), {});
  assert.equal(instance.exports.test_entry(), 0, name);
  console.log(`PASS ${name}`);
}
