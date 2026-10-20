'use strict';

const assert = require('node:assert/strict');
const { compileSource } = require('../c-compiler');

const definitions = `
  struct Events {void *context; void (*call)(void*, unsigned int);};
  void callback(void *context, unsigned int value) {int *target; target=context; *target=value;}
`;
const cases = [
  ['member after a function returning a struct pointer', `
    struct Token {int prefix; int type;}; static struct Token token={99,4};
    struct Token *peek(void) {return &token;}
    int test_entry(void) {return peek()->type;}
  `, 4],
  ['floating member after a struct pointer return', `
    struct Token {int prefix; double value;}; static struct Token token={99,1.25};
    struct Token *peek(void) {return &token;}
    int test_entry(void) {return (int)(peek()->value * 4.0);}
  `, 5],
  ['nested arrow and dot after a struct pointer return', `
    struct Inner {int value;}; struct Token {int prefix; struct Inner inner; struct Token *next;};
    static struct Token second={1,{37},0}; static struct Token first={2,{17},&second};
    struct Token *peek(void) {return &first;}
    int test_entry(void) {return peek()->next->inner.value;}
  `, 37],
  ['void callback stored in a struct', `
    ${definitions}
    int test_entry(void) {struct Events e; int value; value=0; e.context=&value; e.call=callback; e.call(e.context,17); return value;}
  `, 17],
  ['void callback through a nested arrow path', `
    ${definitions}
    struct Owner {struct Events *events;};
    int test_entry(void) {struct Events e; struct Owner owner; struct Owner *p; int value;
      value=0; e.context=&value; e.call=callback; owner.events=&e; p=&owner; p->events->call(p->events->context,23); return value;}
  `, 23],
  ['void callback through a local function pointer', `
    ${definitions}
    int test_entry(void) {void (*call)(void*, unsigned int); int value; value=0; call=callback; call(&value,29); return value;}
  `, 29],
  ['void callback through an indexed function pointer', `
    ${definitions}
    int test_entry(void) {void (*calls[1])(void*, unsigned int); int value; value=0; calls[0]=callback; calls[0](&value,31); return value;}
  `, 31],
  ['void callback retains floating argument types', `
    struct E {void (*call)(double);}; static int result;
    void callback(double value) {result=(int)(value*4.0);}
    int test_entry(void) {struct E e; e.call=callback; e.call(1.25); return result;}
  `, 5],
];
for (const [name, source, expected] of cases) {
  const result = compileSource(source, { validate: true });
  assert.ok(result.wasm, result.validationError && result.validationError.message);
  const instance = new WebAssembly.Instance(new WebAssembly.Module(Buffer.from(result.wasm)), {});
  assert.equal(instance.exports.test_entry(), expected, name);
  console.log(`PASS ${name}`);
}
console.log(`Callbacks and struct pointer returns: ${cases.length} checks passed`);
