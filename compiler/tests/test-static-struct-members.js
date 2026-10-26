'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { compileSource } = require('../c-compiler');

// Every expected result is checked independently by strict native C89 and WASM.
const cases = [
  ['zero-filled global', 'struct S {int x; int guard;}; static struct S g;',
    'g.x=7; return g.x==7 && g.guard==0;'],
  ['external-linkage global', 'struct S {int x;}; struct S g={7};',
    'g.x+=9; return g.x==16;'],
  ['initialized fields and alias coherence', 'struct S {int x; int y;}; static struct S g={7,9};',
    'struct S *p=&g; g.x+=p->y; p->y=g.x+1; return g.x==16 && g.y==17;'],
  ['nested member and address', 'struct I {int x;}; struct O {int guard; struct I i;}; static struct O g={31,{11}};',
    'int *p=&g.i.x; *p+=12; return g.i.x==23 && g.guard==31;'],
  ['compound assignment and update results', 'struct S {int x; int guard;}; static struct S g={3,77};',
    'int a; int b; a=g.x++; b=++g.x; g.x*=2; g.x-=1; return a==3 && b==5 && g.x==9 && g.guard==77;'],
  ['unsigned field arithmetic', 'struct S {unsigned int x; int guard;}; static struct S g={4294967295U,77};',
    'g.x/=10; g.x%=10; g.x>>=1; return g.x==4 && g.guard==77;'],
  ['narrow field stores preserve neighbors', 'struct S {unsigned char a; unsigned char b; unsigned short c; int guard;}; static struct S g={1,22,33,77};',
    'g.a=255; g.c=65535; return g.a==255 && g.b==22 && g.c==65535 && g.guard==77;'],
  ['floating fields', 'struct S {double x; float y; int guard;}; static struct S g={8.0,2.0,77};',
    'g.x/=g.y; g.y+=1.0; return g.x==4.0 && g.y==3.0 && g.guard==77;'],
  ['pointer field and runtime global arrow', 'struct S {int x; int *p;}; static struct S g; static struct S *view;',
    'int n=13; g.p=&n; *g.p+=4; view=&g; view->x=*g.p; return g.x==17 && n==17;'],
  ['nested arrow through global field', 'struct I {int x;}; struct O {struct I *p; int guard;}; static struct I inner={4}; static struct O g;',
    'g.p=&inner; g.guard=77; g.p->x+=3; return inner.x==7 && g.guard==77;'],
  ['aggregate copies and global array control', 'struct S {int x; int y;}; static struct S g={4,9}; static struct S a[2];',
    'struct S local; a[0]=g; a[1].x=77; local=a[0]; g=local; return g.x==4 && g.y==9 && a[1].x==77;'],
  ['nested aggregate copy', 'struct I {int x; int y;}; struct O {struct I i; int guard;}; static struct O a={{4,9},77}; static struct O b;',
    'b.i=a.i; return b.i.x==4 && b.i.y==9 && b.guard==0 && a.guard==77;'],
  ['static local initialized once', 'struct S {int x; int guard;}; int tick(void) {static struct S s={19,77}; s.x++; return s.x+s.guard;}',
    'int a; int b; a=tick(); b=tick(); return a==97 && b==98;'],
  ['const global reads', 'struct I {int x;}; struct O {struct I i;}; static const struct O g={{19}};',
    'return g.i.x==19;'],
  ['single evaluation of RHS', 'struct S {int x;}; static struct S g; static int calls; int next(void){calls++; return 7;}',
    'g.x+=next(); return g.x==7 && calls==1;'],
  ['callback field', 'int add(int x){return x+1;} struct S {int (*fn)(int); int guard;}; static struct S g;',
    'g.fn=add; g.guard=77; return g.fn(6)==7 && g.guard==77;'],
];

const negatives = [
  ['unknown field', 'struct S {int x;}; static struct S g;', 'return g.missing;', /Unknown struct field/],
  ['global scalar dot', 'static int g;', 'return g.x;', /Struct member access/],
  ['pointer dot', 'struct S {int x;}; static struct S *g;', 'return g.x;', /Struct member access/],
  ['global object arrow', 'struct S {int x;}; static struct S g;', 'return g->x;', /not a pointer-to-struct/],
  ['const assignment', 'struct S {int x;}; static const struct S g={7};', 'g.x=9; return 0;', /read-only/],
  ['const compound update', 'struct S {int x;}; static const struct S g={7};', 'g.x+=1; return 0;', /read-only/],
  ['const postfix update', 'struct S {int x;}; static const struct S g={7};', 'g.x++; return 0;', /read-only/],
  ['const nested member', 'struct I {int x;}; struct O {struct I i;}; static const struct O g={{7}};', 'g.i.x=9; return 0;', /read-only/],
  ['const static local', 'struct S {int x;};', 'static const struct S g={7}; g.x=9; return 0;', /read-only/],
];

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'maiac-static-members-'));
try {
  for (const [name, declarations, body] of cases) {
    const source = `${declarations}\nint test_entry(void){${body}}\n`;
    const file = path.join(temporary, 'case.c');
    const native = path.join(temporary, 'native');
    fs.writeFileSync(file, source + 'int main(void){return test_entry()!=1;}\n');
    execFileSync(process.env.CC || 'clang', ['-std=c89', '-pedantic-errors', '-O1',
      '-fsanitize=address,undefined', file, '-o', native]);
    execFileSync(native);
    const compiled = compileSource(source, {validate:true});
    assert.ok(compiled.wasm, compiled.validationError?.message);
    assert.ok(WebAssembly.validate(compiled.wasm));
    const instance = new WebAssembly.Instance(new WebAssembly.Module(compiled.wasm));
    assert.equal(instance.exports.test_entry(), 1, name);
    console.log(`PASS native C89/ASan/UBSan/WASM: ${name}`);
  }
  for (const [name, declarations, body, diagnostic] of negatives) {
    const source = `${declarations}\nint test_entry(void){${body}}\n`;
    const file = path.join(temporary, 'invalid.c');
    fs.writeFileSync(file, source);
    assert.throws(() => execFileSync(process.env.CC || 'clang',
      ['-std=c89', '-pedantic-errors', '-fsyntax-only', file], {stdio:'pipe'}), name);
    assert.throws(() => compileSource(source, {validate:true}), diagnostic, name);
    console.log(`PASS native/MaiaC rejection: ${name}`);
  }
  console.log(`PASS static struct members: ${cases.length} native/WASM cases, ${negatives.length} negative cases`);
} finally {
  fs.rmSync(temporary, {recursive:true, force:true});
}
