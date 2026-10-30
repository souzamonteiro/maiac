'use strict';

const assert = require('node:assert/strict');
const { parseCSource, compileSource } = require('../c-compiler');
const { ParseTreeCollector } = require('../parse-tree-collector');

const programs = [
  ['scalar', 'int test_entry(void) { return 19 + 23; }', 42],
  ['static array', 'static unsigned int values[3]={19,23,77}; int test_entry(void) { return values[0]+values[1]; }', 42],
  ['struct and loop', 'struct S {int value; int guard;}; static struct S s={19,77}; int test_entry(void) {int i; for(i=0;i<3;++i) s.value+=2; return s.value+s.guard;}', 102],
  ['preprocessing and literal concatenation', '#define AT 2\nint test_entry(void) {char text[]="a" "bc"; return text[AT];}', 99],
];

function execute(result, expected) {
  assert.ok(result.wasm, result.validationError?.message);
  const module = new WebAssembly.Module(result.wasm);
  assert.deepEqual(WebAssembly.Module.imports(module), []);
  const instance = new WebAssembly.Instance(module);
  const stack = instance.exports.__stack_ptr;
  const before = stack?.value;
  assert.equal(instance.exports.test_entry(), expected);
  if (stack) assert.equal(stack.value, before);
}

for (const [name, source, expected] of programs) {
  const parsed = parseCSource(source);
  const baseline = compileSource(source, { validate: true });
  const explicit = compileSource(source, { serializeParseTrees: true, validate: true });
  assert.equal(baseline.json, parsed.json, name);
  assert.equal(baseline.xml, parsed.xml, name);
  assert.equal(explicit.json, baseline.json, name);
  assert.equal(explicit.xml, baseline.xml, name);
  assert.deepEqual(JSON.parse(parsed.json), parsed.ast, name);
  assert.equal(parsed.ast, parsed.collector.root);
  execute(baseline, expected);

  // Simulate a serializer that cannot represent a diagnostic. The opt-out must
  // still parse, lower, assemble and execute; no giant host string is needed.
  const json = ParseTreeCollector.prototype.toJSON;
  const xml = ParseTreeCollector.prototype.toXml;
  let jsonCalls = 0, xmlCalls = 0;
  try {
    ParseTreeCollector.prototype.toJSON = function () { ++jsonCalls; throw new RangeError('diagnostic JSON unavailable'); };
    ParseTreeCollector.prototype.toXml = function () { ++xmlCalls; throw new RangeError('diagnostic XML unavailable'); };
    assert.throws(() => parseCSource(source), /diagnostic JSON unavailable/);
    assert.throws(() => compileSource(source, { validate: true }), /diagnostic JSON unavailable/);
    jsonCalls = 0;
    const options = Object.freeze({ serializeParseTrees: false, validate: true });
    const noText = parseCSource(source, options);
    const compiled = compileSource(source, options);
    for (const result of [noText, compiled]) {
      assert.equal(result.json, null, name);
      assert.equal(result.xml, null, name);
      assert.deepEqual(result.ast, baseline.ast, name);
      assert.equal(result.ast, result.collector.root);
      assert.equal(result.normalizedSource, baseline.normalizedSource, name);
    }
    assert.deepEqual(compiled.module, baseline.module, name);
    assert.equal(compiled.wat, baseline.wat, name);
    assert.deepEqual(compiled.wasm, baseline.wasm, name);
    assert.equal(jsonCalls, 0);
    assert.equal(xmlCalls, 0);
    execute(compiled, expected);
  } finally {
    ParseTreeCollector.prototype.toJSON = json;
    ParseTreeCollector.prototype.toXml = xml;
  }
  assert.equal(parseCSource(source).xml, parsed.xml, 'serializer restoration');
}

for (const serializeParseTrees of [undefined, true, false]) {
  for (const parse of [parseCSource, compileSource]) {
    assert.throws(() => parse('int test_entry( { return 0; }', { serializeParseTrees }), /Parse failed/);
  }
  assert.throws(() => compileSource('int test_entry(void) { return absent; }', { serializeParseTrees }), /absent/);
}
console.log('PASS optional parse serialization: four C89 programs; default/true exact JSON/XML; opt-out retains full AST/model and identical WAT/WASM/results without either serializer; parse/semantic errors unchanged.');
