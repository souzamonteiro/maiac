'use strict';

const assert = require('node:assert/strict');
const { compileSource } = require('../c-compiler.js');

function execute(source) {
  const result = compileSource(source, { validate: true });
  assert.ok(result.wasm, result.validationError && result.validationError.message);
  const instance = new WebAssembly.Instance(new WebAssembly.Module(Buffer.from(result.wasm)), {});
  return instance.exports.test_entry();
}

const cases = [
  ['generated lexer tables retain instruction values and table addresses', `
    struct Instruction { int op; unsigned int first; unsigned int second; unsigned int next; };
    struct Pattern { const struct Instruction *code; unsigned int count; unsigned int entry; };
    static const struct Instruction code[] = {{0,0,0,0},{1,43,0,0}};
    static const struct Pattern patterns[] = {{code,2,1},{code,2,0}};
    int test_entry(void) {
      const struct Pattern *p; const struct Instruction *c;
      p=patterns; c=p->code+1;
      if(p->count!=2 || p->entry!=1 || c->op!=1 || c->first!=43) return 1;
      ++p; if(p->count!=2 || p->entry!=0 || p->code!=code) return 2;
      return 0;
    }`, 0],
  ['partially initialized rows preserve braces and zero padding', `
    static int matrix[2][3]={{1},{2,3}};
    int test_entry(void) {return matrix[0][0]+matrix[0][1]+matrix[1][0]*10+matrix[1][1]*100+matrix[1][2];}
  `, 321],
  ['brace elision fills nested arrays in order', `
    static int matrix[2][2]={1,2,3,4};
    int test_entry(void) {return matrix[0][1]+matrix[1][0]*10+matrix[1][1]*100;}
  `, 432],
  ['nested struct initialization uses member offsets', `
    struct Inner {int a; int b;}; struct Outer {int tag; struct Inner inner; int tail;};
    static struct Outer value={7,{11},13};
    int test_entry(void) {struct Outer *p; p=&value; return p->tag+p->inner.a+p->inner.b+p->tail;}
  `, 31],
  ['string fields and numeric fields share static storage', `
    struct Row {char label[4]; int value;}; static struct Row rows[]={{"ab",7},{"c",9}};
    int test_entry(void) {struct Row *p; p=rows; if(p->label[2]!=0 || p->value!=7) return 1; ++p; return p->label[0]=='c' && p->label[1]==0 && p->value==9;}
  `, 1],
  ['pointer arrays retain string literal addresses', `
    static const char *names[]={"first","second"};
    int test_entry(void) {const char *first; const char *second; first=names[0]; second=names[1]; return first[0]=='f' && second[0]=='s' && second[6]==0;}
  `, 1],
  ['static pointer fields can address a scalar object', `
    static int value=37; struct Ref {int *ptr;}; static struct Ref refs[]={{&value}};
    int test_entry(void) {struct Ref *p; p=refs; return *p->ptr;}
  `, 37],
  ['floating arrays preserve scalar widths and signs', `
    static double values[]={1.25,-2.5};
    int test_entry(void) {return values[0]==1.25 && values[1]==-2.5;}
  `, 1],
  ['static local aggregate storage is initialized once', `
    int next(void) {static int values[2]={5,7}; values[0]+=1; return values[0]+values[1];}
    int test_entry(void) {int first; first=next(); return first*100+next();}
  `, 1314],
  ['excess initializers produce a diagnostic', `
    static int values[1]={1,2}; int test_entry(void) {return values[0];}
  `, /Too many static initializer elements/],
  ['unsupported dynamic static initializers are rejected', `
    int get(void) {return 9;} static int values[]={get()}; int test_entry(void) {return values[0];}
  `, /Unsupported static initializer expression/],
];

for (const [name, source, expected] of cases) {
  if (expected instanceof RegExp) assert.throws(() => execute(source), expected, name);
  else assert.equal(execute(source), expected, name);
  console.log(`PASS ${name}`);
}
console.log(`Static aggregate initialization: ${cases.length} checks passed`);
