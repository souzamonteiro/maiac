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

  const hosts = createDefaultHostBuiltins(
    () => memory,
    {
      write: (text) => writes.push(String(text)),
      readLine: () => 'stdin-line'
    }
  );

  const tests = [
    runTest('fread sets feof at end of file', () => {
      const namePtr = 64;
      const modeWPtr = 128;
      const modeRPtr = 160;
      const srcPtr = 192;
      const dstPtr = 256;

      const uniqueName = `maiac_stdio_edge_${Date.now()}_${Math.floor(Math.random() * 1e6)}.tmp`;
      writeCString(memory, namePtr, uniqueName);
      writeCString(memory, modeWPtr, 'w+');
      writeCString(memory, modeRPtr, 'r');
      writeCString(memory, srcPtr, 'abc');

      const stream = hosts.fopen(namePtr, modeWPtr);
      assert.ok(stream > 0);
      assert.strictEqual(hosts.fwrite(srcPtr, 1, 3, stream), 3);
      assert.strictEqual(hosts.fseek(stream, 0, 0), 0);

      assert.strictEqual(hosts.fread(dstPtr, 1, 3, stream), 3);
      assert.strictEqual(readCString(memory, dstPtr), 'abc');
      assert.strictEqual(hosts.feof(stream), 0);

      assert.strictEqual(hosts.fread(dstPtr, 1, 1, stream), 0);
      assert.strictEqual(hosts.feof(stream), 1);
      assert.strictEqual(hosts.ferror(stream), 0);

      assert.strictEqual(hosts.fclose(stream), 0);
      assert.strictEqual(hosts.remove(namePtr), 0);
    }),

    runTest('ferror returns 1 for invalid stream and fseek fails', () => {
      const invalid = 999999;
      assert.strictEqual(hosts.ferror(invalid), 1);
      assert.strictEqual(hosts.fseek(invalid, 0, 0), -1);
      assert.strictEqual(hosts.fclose(invalid), -1);
    }),

    runTest('ungetc rewinds one byte for file stream', () => {
      const namePtr = 320;
      const modePtr = 384;
      const srcPtr = 448;

      const uniqueName = `maiac_ungetc_${Date.now()}_${Math.floor(Math.random() * 1e6)}.tmp`;
      writeCString(memory, namePtr, uniqueName);
      writeCString(memory, modePtr, 'w+');
      writeCString(memory, srcPtr, 'xy');

      const stream = hosts.fopen(namePtr, modePtr);
      assert.ok(stream > 0);
      assert.strictEqual(hosts.fwrite(srcPtr, 1, 2, stream), 2);
      assert.strictEqual(hosts.fseek(stream, 0, 0), 0);

      const ch1 = hosts.fgetc(stream);
      assert.strictEqual(ch1, 'x'.charCodeAt(0));

      assert.strictEqual(hosts.ungetc(ch1, stream), ch1);
      const ch2 = hosts.fgetc(stream);
      assert.strictEqual(ch2, 'x'.charCodeAt(0));

      assert.strictEqual(hosts.fclose(stream), 0);
      assert.strictEqual(hosts.remove(namePtr), 0);
    }),

    runTest('tmpnam and tmpfile return usable handles', () => {
      const nameBufPtr = 512;
      const modeRPtr = 640;
      writeCString(memory, modeRPtr, 'r');

      const retPtr = hosts.tmpnam(nameBufPtr);
      assert.strictEqual(retPtr, nameBufPtr);
      const name = readCString(memory, nameBufPtr);
      assert.ok(name.length > 0);

      const tmpStream = hosts.tmpfile();
      assert.ok(tmpStream > 0);

      assert.strictEqual(hosts.fclose(tmpStream), 0);
    }),

    runTest('getchar pulls from configured readLine source', () => {
      const ch = hosts.getchar();
      assert.strictEqual(ch, 's'.charCodeAt(0));
    }),

    runTest('perror writes error text to sink', () => {
      const msgPtr = 704;
      writeCString(memory, msgPtr, 'io-fail');
      const before = writes.length;
      hosts.perror(msgPtr);
      assert.ok(writes.length > before);
      assert.ok(writes[writes.length - 1].includes('io-fail'));
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
