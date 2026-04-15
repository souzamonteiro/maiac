'use strict';

const assert = require('assert');
const { createDefaultHostBuiltins } = require('../../src/runtime/default-host-builtins.js');

function writeCString(memory, ptr, text) {
  const bytes = new Uint8Array(memory.buffer);
  const encoded = new TextEncoder().encode(String(text || ''));
  bytes.set(encoded, ptr >>> 0);
  bytes[(ptr >>> 0) + encoded.length] = 0;
}

function readCString(memory, ptr) {
  const bytes = new Uint8Array(memory.buffer);
  const offset = ptr >>> 0;
  let end = offset;
  while (end < bytes.length && bytes[end] !== 0) {
    end += 1;
  }
  return new TextDecoder('utf-8').decode(bytes.subarray(offset, end));
}

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
    return { passed: true, name };
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    return { passed: false, name, error };
  }
}

function main() {
  const memory = new WebAssembly.Memory({ initial: 2 });
  const writes = [];

  function i32Write(ptr, value) {
    new DataView(memory.buffer).setInt32(ptr, value, true);
  }

  function i32Read(ptr) {
    return new DataView(memory.buffer).getInt32(ptr, true);
  }

  function f64Write(ptr, value) {
    new DataView(memory.buffer).setFloat64(ptr, value, true);
  }

  function f64Read(ptr) {
    return new DataView(memory.buffer).getFloat64(ptr, true);
  }

  const hosts = createDefaultHostBuiltins(
    () => memory,
    {
      nowMs: () => 1700000000000,
      perfNow: () => 123.456,
      write: (text) => writes.push(String(text))
    }
  );

  const tests = [
    runTest('frexp writes exponent pointer', () => {
      const expPtr = 8;
      i32Write(expPtr, 0);
      const mantissa = hosts.frexp(8.0, expPtr);
      assert.ok(Math.abs(mantissa - 0.5) < 1e-12);
      assert.strictEqual(i32Read(expPtr), 4);
    }),

    runTest('modf writes integral part as f64', () => {
      const iptr = 16;
      f64Write(iptr, 0);
      const frac = hosts.modf(3.75, iptr);
      assert.ok(Math.abs(frac - 0.75) < 1e-12);
      assert.ok(Math.abs(f64Read(iptr) - 3.0) < 1e-12);
    }),

    runTest('time writes timer pointer and clock uses perfNow', () => {
      const timerPtr = 32;
      const t = hosts.time(timerPtr);
      assert.strictEqual(t, 1700000000);
      assert.strictEqual(i32Read(timerPtr), 1700000000);
      assert.strictEqual(hosts.clock(), 123456);
    }),

    runTest('localtime/gmtime/strftime produce struct-backed output', () => {
      const timerPtr = 40;
      i32Write(timerPtr, 1700000000);
      const localPtr = hosts.localtime(timerPtr);
      const gmtPtr = hosts.gmtime(timerPtr);
      assert.ok(localPtr > 0);
      assert.ok(gmtPtr > 0);

      const fmtPtr = 128;
      const outPtr = 256;
      writeCString(memory, fmtPtr, '%Y-%m-%d %H:%M:%S');
      const written = hosts.strftime(outPtr, 64, fmtPtr, gmtPtr);
      assert.ok(written > 0);
      const out = readCString(memory, outPtr);
      assert.ok(/^20\d\d-\d\d-\d\d \d\d:\d\d:\d\d$/.test(out));
    }),

    runTest('locale setlocale/localeconv return stable pointers', () => {
      const localePtr = 512;
      writeCString(memory, localePtr, 'en_US.UTF-8');
      const ret = hosts.setlocale(0, localePtr);
      assert.ok(ret > 0);
      assert.strictEqual(readCString(memory, ret), 'en_US.UTF-8');

      const conv = hosts.localeconv();
      assert.ok(conv > 0);
      const decimalPtr = i32Read(conv + 0);
      assert.ok(decimalPtr > 0);
      assert.strictEqual(readCString(memory, decimalPtr), '.');
    }),

    runTest('stdio fopen/fwrite/fseek/fread/fclose roundtrip', () => {
      const namePtr = 768;
      const modeWPtr = 896;
      const modeRPtr = 928;
      const srcPtr = 1024;
      const dstPtr = 1152;

      const uniqueName = `maiac_runtime_host_${Date.now()}_${Math.floor(Math.random() * 1e6)}.tmp`;
      writeCString(memory, namePtr, uniqueName);
      writeCString(memory, modeWPtr, 'w+');
      writeCString(memory, modeRPtr, 'r');
      writeCString(memory, srcPtr, 'abc123');

      const stream = hosts.fopen(namePtr, modeWPtr);
      assert.ok(stream > 0);
      const wrote = hosts.fwrite(srcPtr, 1, 6, stream);
      assert.strictEqual(wrote, 6);
      assert.strictEqual(hosts.fflush(stream), 0);
      assert.strictEqual(hosts.fseek(stream, 0, 0), 0);

      const read = hosts.fread(dstPtr, 1, 6, stream);
      assert.strictEqual(read, 6);
      assert.strictEqual(readCString(memory, dstPtr), 'abc123');
      assert.strictEqual(hosts.fclose(stream), 0);

      assert.strictEqual(hosts.remove(namePtr), 0);
    }),

    runTest('puts writes to configured sink', () => {
      const sPtr = 1408;
      writeCString(memory, sPtr, 'hello host');
      const before = writes.length;
      hosts.puts(sPtr);
      assert.ok(writes.length > before);
      assert.ok(writes[writes.length - 1].includes('hello host'));
    })
  ];

  const failed = tests.filter((t) => !t.passed);
  if (failed.length > 0) {
    console.error(`\nSummary: ${tests.length - failed.length} passed, ${failed.length} failed`);
    process.exit(1);
  }

  console.log(`\nSummary: ${tests.length} passed, 0 failed`);
}

main();
