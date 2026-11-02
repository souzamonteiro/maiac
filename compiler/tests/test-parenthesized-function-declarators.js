'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { compileSource } = require('../c-compiler');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'maiac-function-identity-'));
const cases = [];
const group = (name, depth) => '('.repeat(depth) + name + ')'.repeat(depth);
for (const storage of ['', 'static ']) {
  for (const prototypeDepth of [0, 1, 3]) {
    for (const definitionDepth of [0, 1, 3]) {
      for (const definitionFirst of [false, true]) {
        const prototype = `${storage}int ${group('apply', prototypeDepth)}(int);`;
        const definition = `${storage}int ${group('apply', definitionDepth)}(int n){calls+=1;return n+3;}`;
        cases.push([
          `${storage}prototype ${prototypeDepth}, definition ${definitionDepth}, first ${definitionFirst}`,
          'static int calls;' + (definitionFirst ? definition + prototype : prototype + prototype + definition) +
          'int test_entry(void){int (((*callback)))(int); int a; int b; calls=0; callback=apply;' +
          'a=apply(4);b=callback(6);return a==7 && b==9 && calls==2;}',
          'apply'
        ]);
      }
    }
  }
}
cases.push(['void pointer parameter',
  'void (release)(void *pointer); void release(void *pointer){(void)pointer;} int test_entry(void){release(0);return 1;}', 'release']);
cases.push(['pointer return and global function pointer object',
  'static int value; int *(get)(void); int *get(void){return &value;} int (((*callback)))(int);' +
  'int add(int n){return n+1;} int test_entry(void){int *p; p=get();*p=9;callback=add;return *get()==9 && callback(3)==4;}', 'get']);
cases.push(['returned function pointer signature',
  'int add(int n){return n+1;} int (*get(void))(int); int (*get(void))(int){return add;}' +
  'int test_entry(void){int (*callback)(int);callback=get();return callback(5)==6;}', 'get']);

const invalid = [
  ['int (f)(int);long f(int x){return x;}', /Conflicting return type/],
  ['int ((f))(int);int f(long x){return (int)x;}', /Conflicting parameter type/],
  ['int (f)(void);int f(int x){return x;}', /Conflicting parameter list/],
  ['int (f)(int);static int f(int x){return x;}', /Conflicting linkage/],
  ['int (f)(int x){return x;}int ((f))(int x){return x;}', /Redefinition of function/]
];
try {
  for (const [name, source, functionName] of cases) {
    const file = path.join(directory, 'case.c');
    const native = path.join(directory, 'case');
    fs.writeFileSync(file, source + '\nint main(void){return test_entry()!=1;}\n');
    execFileSync('clang', ['-std=c89', '-pedantic-errors', '-O1', '-fsanitize=address,undefined', file, '-o', native]);
    execFileSync(native);
    const result = compileSource(source, { validate: true, serializeParseTrees: false });
    assert.ok(result.wasm, result.validationError?.message);
    assert.equal(result.module.functions.filter(fn => fn.sourceName === functionName).length, 1, name);
    assert.equal(result.module.functionsByName.get(functionName), result.module.functions.find(fn => fn.sourceName === functionName), name);
    assert.equal(result.module.globals.some(global => global.sourceName === functionName), false, name);
    const module = new WebAssembly.Module(result.wasm);
    assert.equal(WebAssembly.Module.exports(module).filter(e => e.name === functionName).length, 1, name);
    const instance = new WebAssembly.Instance(module);
    assert.equal(instance.exports.test_entry(), 1, name);
    assert.equal(instance.exports.test_entry(), 1, name + ' repeated');
    console.log('PASS C89/native/ASan/UBSan/WASM: ' + name);
  }
  for (const [source, diagnostic] of invalid) {
    const file = path.join(directory, 'invalid.c');
    fs.writeFileSync(file, source);
    assert.throws(() => execFileSync('clang', ['-std=c89', '-pedantic-errors', '-fsyntax-only', file], { stdio: 'pipe' }));
    assert.throws(() => compileSource(source, { validate: true, serializeParseTrees: false }), diagnostic);
  }
  console.log(`PASS parenthesized function identity: ${cases.length} positive, ${invalid.length} negative cases`);
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
