'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { compileSource } = require('../c-compiler');

const cases = [
  ['unsigned local division', 'unsigned int x=4294967295U; x/=10; return x==429496729U;'],
  ['unsigned local remainder', 'unsigned int x=2147483648U; x%=10; return x==8;'],
  ['unsigned local shift', 'unsigned int x=4294967295U; x>>=1; return x==2147483647U;'],
  ['signed division remains signed', 'int x=-31; x/=10; return x==-3;'],
  ['signed remainder remains signed', 'int x=-31; x%=10; return x==-1;'],
  ['shift ignores unsigned RHS for signedness', 'int x=-8; unsigned int n=1; x>>=n; return x==-4;'],
  ['division uses unsigned RHS conversion', 'int x=-1; unsigned int n=2; x/=n; return x==2147483647;'],
  ['remainder uses unsigned RHS conversion', 'int x=-1; unsigned int n=10; x%=n; return x==5;'],
  ['unsigned LHS converts negative RHS', 'unsigned int x=4294967295U; int n=-1; x/=n; return x==1;'],
  ['array targets', 'unsigned int a[2]; a[0]=4294967295U; a[1]=123; a[0]/=10; return a[0]==429496729U && a[1]==123;'],
  ['pointer targets', 'unsigned int x=4294967295U; unsigned int* p=&x; *p%=10; return x==5;'],
  ['struct member', 'struct S {unsigned int x; int guard;}; struct S s; s.x=4294967295U; s.guard=123; s.x>>=1; return s.x==2147483647U && s.guard==123;'],
  ['struct pointer member', 'struct S {unsigned int x;}; struct S s; struct S* p=&s; p->x=2147483648U; p->x/=10; return s.x==214748364U;'],
  ['indexed struct member', 'struct S {unsigned int x;}; struct S a[2]; a[1].x=4294967295U; a[1].x%=10; return a[1].x==5;'],
  ['nested assignment result', 'unsigned int x=4294967295U; unsigned int y; y=(x/=10); return y==429496729U && x==y;'],
  ['unsigned char promotion and store', 'unsigned char x=200; x/=-2; return (x&255)==156;'],
  ['unsigned char RHS promotion', 'int x=-400; unsigned char n=200; x/=n; return x==-2;'],
  ['unsigned short RHS promotion', 'int x=-6; unsigned short n=2; x/=n; return x==-3;'],
  ['unsigned return value RHS', 'int x=-1; x/=unsigned_divisor(); return x==2147483647;'],
  ['cast RHS', 'int x=-1; x%=(unsigned int)10; return x==5;'],
  ['float path retained', 'double x=8.0; x/=2.0; return x==4.0;'],
];
const definitions = cases.map(([, body], i) => `int case_${i}(void) { ${body} }`).join('\n');
const globalCase = 'unsigned int global_value; int global_case(void) {global_value=4294967295U; global_value/=10; return global_value==429496729U;}';
const wide = 'unsigned long wide_div(unsigned long x,unsigned long y){x/=y;return x;} unsigned long wide_rem(unsigned long x,unsigned long y){x%=y;return x;} unsigned long wide_shift(unsigned long x,unsigned int y){x>>=y;return x;} long wide_signed_mixed(long x,unsigned int y){x/=y;return x;} unsigned long wide_unsigned_mixed(unsigned long x,unsigned int y){x/=y;return x;}';
const source = 'unsigned int unsigned_divisor(void){return 2;}\n'+definitions+'\n'+globalCase+'\n'+wide;
const temporary = fs.mkdtempSync(path.join(os.tmpdir(),'maiac-unsigned-compound-'));
try {
  const file=path.join(temporary,'native.c'), native=path.join(temporary,'native');
  fs.writeFileSync(file,source+'\nint main(void) {\n'+cases.map((_,i)=>`if (!case_${i}()) return ${i+1};`).join('\n')+'\nreturn global_case()?0:99;}');
  execFileSync(process.env.CC||'clang',['-std=c89','-pedantic-errors',file,'-o',native]);
  execFileSync(native);
  const compiled=compileSource(source,{validate:true});
  assert.ok(compiled.wasm,compiled.validationError?.message);
  const instance=new WebAssembly.Instance(new WebAssembly.Module(Buffer.from(compiled.wasm)),{});
  for(let i=0;i<cases.length;i++)assert.equal(instance.exports['case_'+i](),1,cases[i][0]);
  assert.equal(instance.exports.global_case(),1,'unsigned global storage');
  const max=(1n<<64n)-1n;
  assert.equal(BigInt.asUintN(64,instance.exports.wide_div(-1n,10n)),max/10n);
  assert.equal(BigInt.asUintN(64,instance.exports.wide_rem(-1n,10n)),max%10n);
  assert.equal(BigInt.asUintN(64,instance.exports.wide_shift(-1n,1)),max>>1n);
  assert.equal(instance.exports.wide_signed_mixed(-1n,-1),0n,'unsigned i32 RHS zero-extends before signed i64 division');
  assert.equal(BigInt.asUintN(64,instance.exports.wide_unsigned_mixed(-1n,-1)),max/4294967295n,'mixed-width unsigned division');
  console.log(`PASS unsigned compound assignment: ${cases.length+1} native-C89/WASM cases plus i64 division/remainder/shift`);
} finally {fs.rmSync(temporary,{recursive:true,force:true});}
