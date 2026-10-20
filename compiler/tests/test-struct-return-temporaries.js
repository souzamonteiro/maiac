'use strict';
const assert = require('node:assert/strict');
const { compileSource } = require('../c-compiler');
const source = `
struct Pair { int first; int second; };
struct Pair make(int value) { struct Pair p; p.first=value; p.second=value+10; return p; }
struct Pair add(struct Pair left, struct Pair right) {
  struct Pair p; p.first=left.first+right.first; p.second=left.second+right.second; return p;
}
struct Pair pass(struct Pair value) { return value; }
int calls;
struct Pair consume(struct Pair* source) {
  struct Pair result; result=*source; source->first=0; source->second=0; ++calls; return result;
}
struct Pair delegate(struct Pair* source) { return consume(source); }
int once_entry(void) {
  struct Pair source; struct Pair result; source=make(9); calls=0;
  result=delegate(&source); return calls*10000+result.first*100+result.second;
}
int nested_entry(void) { struct Pair result; result=add(make(2),make(3)); return result.first*100+result.second; }
int chained_entry(void) { struct Pair result; result=pass(pass(make(7))); return result.first*100+result.second; }
int indirect_entry(void) {
  struct Pair (*call)(struct Pair,struct Pair); struct Pair result;
  call=add; result=call(make(4),make(5)); return result.first*100+result.second;
}
int loop_entry(void) {
  int index; struct Pair result;
  for(index=0;index<20000;++index) result=pass(make(index));
  return result.first+result.second;
}
`;
const compiled = compileSource(source, { validate: true });
assert.ok(compiled.wasm, compiled.validationError && compiled.validationError.message);
const instance = new WebAssembly.Instance(new WebAssembly.Module(Buffer.from(compiled.wasm)), {});
for (const [name, expected] of [['nested_entry', 525], ['chained_entry', 717], ['indirect_entry', 929], ['loop_entry', 40008], ['once_entry', 10919]]) {
  const stack = instance.exports.__stack_ptr.value;
  assert.equal(instance.exports[name](), expected, name);
  assert.equal(instance.exports.__stack_ptr.value, stack, `${name} must restore its frame`);
  console.log(`PASS nested struct return storage: ${name}`);
}
