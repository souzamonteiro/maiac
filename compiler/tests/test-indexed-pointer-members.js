'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {compileSource}=require('../c-compiler');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'maiac-pointer-members-'));
const cases=[];
for(const storage of ['','static '])for(const local of [false,true])for(const type of ['char','const char','int','struct Element']){
 const declarations='struct Element {int a; int b;}; struct Token {int guard; '+type+' *value; int end;};';
 const objects=`${storage}${type} data[8]; ${storage}struct Token tokens[3];`;
 const body='tokens[1].guard=77; tokens[1].value=data+5; tokens[1].end=91; '+
 'return tokens[1].value-data==5 && data-tokens[1].value==-5 && '+
 '(tokens[1].value+2)-data==7 && (2+tokens[1].value)-data==7 && '+
 '(tokens[1].value-3)-data==2 && tokens[1].value>data && '+
 'tokens[1].guard==77 && tokens[1].end==91;';
 cases.push([`${local?'local':'global'} ${storage}${type}`,declarations+(local?'':objects)+`\nint test_entry(void){${local?objects:''}${body}}`]);
}
cases.push(['pointer to pointer member','struct Token {int **value;}; static int *data[8]; static struct Token tokens[2];\nint test_entry(void){tokens[1].value=data+6;return tokens[1].value-data==6 && data-tokens[1].value==-6;}']);
cases.push(['nested member','struct Inner {char *value;}; struct Outer {int guard; struct Inner inner;}; static char data[8]; static struct Outer tokens[2];\nint test_entry(void){tokens[1].inner.value=data+6;return tokens[1].inner.value-data==6 && data-tokens[1].inner.value==-6;}']);
cases.push(['selected array field','struct Token {int data[5];}; static struct Token tokens[2];\nint test_entry(void){return (tokens[1].data+3)-tokens[1].data==3;}']);
cases.push(['pointer field through struct pointer','struct Token {int *value;}; static int data[8]; static struct Token tokens[2];\nint test_entry(void){struct Token *p=tokens; p[1].value=data+4;return p[1].value-data==4 && data-p[1].value==-4;}']);
try{
 for(const [name,source]of cases){const file=path.join(temporary,'case.c'),binary=path.join(temporary,'native');fs.writeFileSync(file,source+'\nint main(void){return test_entry()!=1;}\n');
 execFileSync('clang',['-std=c89','-pedantic-errors','-O1','-fsanitize=address,undefined',file,'-o',binary]);execFileSync(binary);
 const r=compileSource(source,{validate:true,serializeParseTrees:false});assert.ok(r.wasm,r.validationError?.message);const instance=new WebAssembly.Instance(new WebAssembly.Module(r.wasm));assert.equal(instance.exports.test_entry(),1,name);console.log(`PASS C89 native/ASan/UBSan/WASM: ${name}`);}
 for(const source of ['int data[4]; int f(void){return 2-data;}','struct Token {int value;}; struct Token a[2]; int data[4]; int f(void){return a[1].value-data;}']){
 const file=path.join(temporary,'invalid.c');fs.writeFileSync(file,source);assert.throws(()=>execFileSync('clang',['-std=c89','-pedantic-errors','-fsyntax-only',file],{stdio:'pipe'}));assert.throws(()=>compileSource(source,{validate:true}),/Integer minus pointer/);}
 console.log(`PASS indexed pointer member metadata: ${cases.length} positive, 2 negative cases`);
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
