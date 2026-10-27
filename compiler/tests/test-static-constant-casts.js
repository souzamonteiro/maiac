'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {compileSource}=require('../c-compiler');

const cases=[
  ['uchar identity','int','(unsigned char)19','19'],
  ['uchar narrowing','int','(unsigned char)275','19'],
  ['ushort narrowing','int','(unsigned short)65555','19'],
  ['signed char negative','int','(signed char)-19','-19'],
  ['signed short negative','int','(signed short)-300','-300'],
  ['uint conversion','unsigned int','(unsigned int)-1','4294967295U'],
  ['float to int','int','(int)3.9','3'],
  ['negative float to int','int','(int)-3.9','-3'],
  ['integer to double','double','(double)19','19.0'],
  ['float rounding','double','(float)16777217','16777216.0'],
  ['nested casts','int','(unsigned char)(unsigned short)65555','19'],
  ['cast arithmetic','int','(unsigned char)275+1','20'],
  ['typedef cast','int','(Byte)275','19'],
  ['safe wide cast','long','(long)4294967297.0','4294967297L'],
];
const definitions=cases.map(([,type,expression,expected],i)=>`
struct S${i} {${type} value; int guard;};
static struct S${i} global_${i}={${expression},77};
${type} aggregate_${i}(void){if(global_${i}.guard!=77) return 0; return global_${i}.value;}
${type} local_${i}(void){static struct S${i} local={${expression},77};if(local.guard!=77) return 0; return local.value;}
static ${type} scalar_${i}=${expression};
${type} scalar_${i}_check(void){return scalar_${i};}
`).join('\n');
const source='typedef unsigned char Byte;\n'+definitions;
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'maiac-static-constant-casts-'));
try {
  const checks=cases.flatMap((_,i)=>[`aggregate_${i}`,`local_${i}`,`scalar_${i}_check`]);
  const file=path.join(temporary,'native.c'),binary=path.join(temporary,'native');
  fs.writeFileSync(file,source+'\nint main(void){'+checks.map((name,i)=>`if(${name}()!=${cases[Math.floor(i/3)][3]}) return ${i+1};`).join('')+'return 0;}');
  execFileSync(process.env.CC||'clang',['-std=c89','-pedantic-errors','-O1','-fsanitize=address,undefined',file,'-o',binary]);
  execFileSync(binary);
  const compiled=compileSource(source,{validate:true});
  assert.ok(compiled.wasm,compiled.validationError?.message);
  assert.ok(WebAssembly.validate(compiled.wasm));
  const instance=new WebAssembly.Instance(new WebAssembly.Module(compiled.wasm));
  for(const [i,name] of checks.entries()) {
    const [,type,,expected]=cases[Math.floor(i/3)];
    const number=Number(expected.replace(/[UL]+$/,''));
    const value=type==='long'?BigInt(number):type==='unsigned int'?(number|0):number;
    assert.equal(instance.exports[name](),value,name);
  }
  // These valid C forms exceed this bounded evaluator; fail explicitly, not as zero.
  for(const expression of ['(unsigned long)-1','(long)9007199254740992.0']) {
    assert.throws(()=>compileSource(`struct S {unsigned long value;}; static struct S g={${expression}}; int test_entry(void){return g.value!=0;}`,{validate:true}),/exceeds exact integer range/);
  }
  console.log(`PASS static numeric casts: ${cases.length} conversions x3 storage paths = ${checks.length} native C89/ASan/UBSan/WASM checks; two exact-range diagnostics`);
} finally {fs.rmSync(temporary,{recursive:true,force:true});}
