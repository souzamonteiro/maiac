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
  const memoryFiles = new Map();

  const hosts = createDefaultHostBuiltins(
    () => memory,
    {
      forceMemoryFiles: true,
      memoryFiles,
      write: (text) => writes.push(String(text)),
      readLine: () => 'browser-stdin'
    }
  );

  const tests = [
    runTest('memory-file fopen/fwrite/fseek/fread roundtrip', () => {
      const namePtr = 64;
      const modePtr = 128;
      const srcPtr = 192;
      const dstPtr = 256;

      writeCString(memory, namePtr, 'virtual.mem');
      writeCString(memory, modePtr, 'w+');
      writeCString(memory, srcPtr, 'memdata');

      const stream = hosts.fopen(namePtr, modePtr);
      assert.ok(stream > 0);
      assert.strictEqual(hosts.fwrite(srcPtr, 1, 7, stream), 7);
      assert.strictEqual(hosts.fseek(stream, 0, 0), 0);
      assert.strictEqual(hosts.fread(dstPtr, 1, 7, stream), 7);
      assert.strictEqual(readCString(memory, dstPtr), 'memdata');
      assert.strictEqual(hosts.fclose(stream), 0);
    }),

    runTest('remove/rename return -1 without fs backend', () => {
      const oldPtr = 320;
      const newPtr = 384;
      writeCString(memory, oldPtr, 'old.file');
      writeCString(memory, newPtr, 'new.file');
      assert.strictEqual(hosts.remove(oldPtr), -1);
      assert.strictEqual(hosts.rename(oldPtr, newPtr), -1);
    }),

    runTest('rename/remove work for memory VFS entries', () => {
      const oldPtr = 320;
      const newPtr = 384;
      const modePtr = 512;
      const srcPtr = 544;

      writeCString(memory, oldPtr, 'vfs-old.file');
      writeCString(memory, newPtr, 'vfs-new.file');
      writeCString(memory, modePtr, 'w+');
      writeCString(memory, srcPtr, 'vfsdata');

      const stream = hosts.fopen(oldPtr, modePtr);
      assert.ok(stream > 0);
      assert.strictEqual(hosts.fwrite(srcPtr, 1, 7, stream), 7);
      assert.strictEqual(hosts.fflush(stream), 0);
      assert.strictEqual(hosts.fclose(stream), 0);

      assert.strictEqual(hosts.rename(oldPtr, newPtr), 0);
      assert.strictEqual(hosts.remove(newPtr), 0);
    }),

    runTest('tmpfile works in memory backend', () => {
      const stream = hosts.tmpfile();
      assert.ok(stream > 0);
      assert.strictEqual(hosts.fclose(stream), 0);
    }),

    runTest('getchar uses configured readLine in browser mode', () => {
      const ch = hosts.getchar();
      assert.strictEqual(ch, 'b'.charCodeAt(0));
    }),

    runTest('stdout/stderr still write through sink', () => {
      const sPtr = 448;
      writeCString(memory, sPtr, 'browser host');
      const before = writes.length;
      hosts.puts(sPtr);
      assert.ok(writes.length > before);
      assert.ok(writes[writes.length - 1].includes('browser host'));
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
