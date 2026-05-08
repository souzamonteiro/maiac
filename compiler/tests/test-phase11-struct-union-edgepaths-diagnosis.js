'use strict';

const assert = require('assert');

const { compileSource } = require('../c-compiler.js');

function runEntryFromSource(source) {
  const result = compileSource(source, { validate: true, printWat: false });
  assert.ok(result.wasm, 'expected wasm output');
  const wasmBytes = Buffer.from(result.wasm);
  const wasmModule = new WebAssembly.Module(wasmBytes);
  const instance = new WebAssembly.Instance(wasmModule, { env: { printf: () => 0 } });
  const entry = instance.exports && instance.exports.test_entry;
  assert.strictEqual(typeof entry, 'function', 'missing test_entry export');
  return entry();
}

function runCase(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
    return true;
  } catch (error) {
    console.log(`FAIL ${name}`);
    console.log(`  ${String(error && error.message ? error.message : error)}`);
    return false;
  }
}

const cases = [
  {
    name: 'nested dot chain updates and reads member value',
    fn: () => {
      const source = [
        'struct In { int v; };',
        'struct Mid { struct In in; };',
        'struct Out { struct Mid mid; };',
        'int test_entry(void) {',
        '  struct Out o;',
        '  o.mid.in.v = 13;',
        '  return o.mid.in.v;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 13);
    }
  },
  {
    name: 'nested arrow and dot chain through pointer base works',
    fn: () => {
      const source = [
        'struct In { int v; };',
        'struct Mid { struct In in; };',
        'struct Out { struct Mid mid; };',
        'int test_entry(void) {',
        '  struct Out o;',
        '  struct Out *p = &o;',
        '  p->mid.in.v = 21;',
        '  return p->mid.in.v;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 21);
    }
  },
  {
    name: 'mixed dot then arrow path via pointer member works',
    fn: () => {
      const source = [
        'struct In { int v; };',
        'struct Mid { struct In in; };',
        'struct Out { struct Mid *pm; };',
        'int test_entry(void) {',
        '  struct Mid m;',
        '  struct Out o;',
        '  o.pm = &m;',
        '  o.pm->in.v = 9;',
        '  return o.pm->in.v;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 9);
    }
  },
  {
    name: 'union assignment by value preserves active integer member',
    fn: () => {
      const source = [
        'union U { int i; int j; };',
        'int test_entry(void) {',
        '  union U a;',
        '  union U b;',
        '  a.i = 15;',
        '  b.i = 0;',
        '  b = a;',
        '  return b.i;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 15);
    }
  },
  {
    name: 'struct containing union field supports member access',
    fn: () => {
      const source = [
        'union U { int i; int j; };',
        'struct S { union U u; int tag; };',
        'int test_entry(void) {',
        '  struct S s;',
        '  s.u.i = 8;',
        '  s.tag = 3;',
        '  return s.u.i + s.tag;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 11);
    }
  },
  {
    name: 'array element first struct field can be written/read',
    fn: () => {
      const source = [
        'struct S { int x; int y; };',
        'int test_entry(void) {',
        '  struct S a[2];',
        '  a[1].x = 4;',
        '  return a[1].x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 4);
    }
  },
  {
    name: 'pointer indexing over struct array supports first field path',
    fn: () => {
      const source = [
        'struct S { int x; int y; };',
        'int test_entry(void) {',
        '  struct S a[2];',
        '  struct S *p = a;',
        '  p[1].x = 4;',
        '  return p[1].x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 4);
    }
  },
  {
    name: 'arrow on non-pointer struct base is rejected (negative)',
    fn: () => {
      const source = [
        'struct S { int x; };',
        'int test_entry(void) {',
        '  struct S s;',
        '  return s->x;',
        '}'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /not a pointer-to-struct/);
    }
  },
  {
    name: 'unknown struct field is rejected (negative)',
    fn: () => {
      const source = [
        'struct S { int x; };',
        'int test_entry(void) {',
        '  struct S s;',
        '  s.y = 1;',
        '  return s.y;',
        '}'
      ].join('\n');

      assert.throws(() => runEntryFromSource(source), /Unknown struct field 'y'/);
    }
  },
  {
    name: 'second field in struct-array element is written/read correctly',
    fn: () => {
      const source = [
        'struct S { int x; int y; };',
        'int test_entry(void) {',
        '  struct S a[2];',
        '  a[1].y = 8;',
        '  return a[1].y;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 8);
    }
  },
  {
    name: 'address-of indexed struct then arrow assignment works',
    fn: () => {
      const source = [
        'struct S { int x; int y; };',
        'int test_entry(void) {',
        '  struct S a[2];',
        '  (&a[1])->x = 4;',
        '  return a[1].x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 4);
    }
  },
  {
    name: 'pointer-array element arrow write updates target correctly',
    fn: () => {
      const source = [
        'struct S { int x; };',
        'int test_entry(void) {',
        '  struct S arr[2];',
        '  struct S *ptrs[2];',
        '  ptrs[1] = &arr[1];',
        '  ptrs[1]->x = 77;',
        '  return ptrs[1]->x;',
        '}'
      ].join('\n');

      assert.strictEqual(runEntryFromSource(source), 77);
    }
  }
];

let failed = 0;
console.log('Running MaiaC Phase 11 struct/union edge-path diagnostics...\n');

for (const testCase of cases) {
  const ok = runCase(testCase.name, testCase.fn);
  if (!ok) {
    failed += 1;
  }
}

console.log(`\nSummary: ${cases.length - failed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
