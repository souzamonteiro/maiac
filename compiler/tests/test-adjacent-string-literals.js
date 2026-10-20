'use strict';
const assert = require('node:assert/strict');
const { compileSource } = require('../c-compiler');

const cases = [
  ['static aggregate and scalar pointer strings', `
    struct Asset { const char* name; const char* text; };
    static const struct Asset assets[] = {{"first", "one\\n" "two\\n"}, {"second", "a" "" "b\\\"c\\\\d"}};
    static const char* label = "hello" " world";
    int test_entry(void) {
      if (assets[0].text[3] != 10 || assets[0].text[4] != 't' || assets[0].text[8] != 0) return 1;
      if (assets[1].text[2] != '"' || assets[1].text[4] != 92) return 2;
      if (label[5] != ' ' || label[10] != 'd' || label[11] != 0) return 3;
      return 0;
    }`],
  ['local array size and string sizeof do not decay', `
    int test_entry(void) {
      char text[] = "a" "b";
      if (sizeof(text) != 3 || sizeof("a" "b") != 3 || sizeof(("ab")) != 3) return 1;
      if (sizeof("ab" + 0) != 4 || text[1] != 'b' || text[2] != 0) return 2;
      return 0;
    }`],
  ['numeric escapes end at each literal boundary', `
    int test_entry(void) {
      const char* a; const char* b; const char* c;
      a="\\x1" "F"; b="\\1" "7"; c="\\000" "9";
      if (a[0]!=1 || a[1]!='F' || a[2]!=0) return 1;
      if (b[0]!=1 || b[1]!='7' || b[2]!=0) return 2;
      if (c[0]!=0 || c[1]!='9' || c[2]!=0) return 3;
      return 0;
    }`],
  ['all simple escapes accepted without ambiguous EBNF hex codes', `
    int test_entry(void) {
      const char* p; p="\\a\\b\\f\\n\\r\\t\\v\\\\\\\"\\'\\?";
      return !(p[0]==7 && p[1]==8 && p[2]==12 && p[3]==10 && p[4]==13
        && p[5]==9 && p[6]==11 && p[7]==92 && p[8]==34 && p[9]==39 && p[10]==63 && p[11]==0);
    }`],
];
for (const [name, source] of cases) {
  const result = compileSource(source, { validate: true });
  assert.ok(result.wasm, result.validationError && result.validationError.message);
  const instance = new WebAssembly.Instance(new WebAssembly.Module(Buffer.from(result.wasm)), {});
  assert.equal(instance.exports.test_entry(), 0, name);
  console.log(`PASS ${name}`);
}
