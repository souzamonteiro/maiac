'use strict';

const assert = require('assert');
const { createDefaultHostBuiltins } = require('../../src/runtime/default-host-builtins.js');
const {
  createMapMemoryFileStore,
  createLocalStorageMemoryFileStore
} = require('../../src/runtime/browser-memory-file-store.js');

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

function createFakeStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
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
  const tests = [
    runTest('map-backed memory file store persists bytes across host instances', () => {
      const memoryA = new WebAssembly.Memory({ initial: 2 });
      const mapStore = createMapMemoryFileStore(new Map());
      const hostsA = createDefaultHostBuiltins(() => memoryA, {
        forceMemoryFiles: true,
        memoryFileStore: mapStore
      });

      writeCString(memoryA, 64, 'persist.mem');
      writeCString(memoryA, 128, 'w+');
      writeCString(memoryA, 192, 'hello');

      const streamA = hostsA.fopen(64, 128);
      assert.ok(streamA > 0);
      assert.strictEqual(hostsA.fwrite(192, 1, 5, streamA), 5);
      assert.strictEqual(hostsA.fclose(streamA), 0);

      const memoryB = new WebAssembly.Memory({ initial: 2 });
      const hostsB = createDefaultHostBuiltins(() => memoryB, {
        forceMemoryFiles: true,
        memoryFileStore: mapStore
      });

      writeCString(memoryB, 64, 'persist.mem');
      writeCString(memoryB, 128, 'r');
      const streamB = hostsB.fopen(64, 128);
      assert.ok(streamB > 0);
      assert.strictEqual(hostsB.fread(256, 1, 5, streamB), 5);
      assert.strictEqual(readCString(memoryB, 256), 'hello');
      assert.strictEqual(hostsB.fclose(streamB), 0);
    }),

    runTest('localStorage-backed store renames and removes persisted files', () => {
      const fakeStorage = createFakeStorage();
      const localStore = createLocalStorageMemoryFileStore({
        storage: fakeStorage,
        prefix: 'maiac-test:'
      });
      const memory = new WebAssembly.Memory({ initial: 2 });
      const hosts = createDefaultHostBuiltins(() => memory, {
        forceMemoryFiles: true,
        memoryFileStore: localStore
      });

      writeCString(memory, 64, 'old.mem');
      writeCString(memory, 96, 'new.mem');
      writeCString(memory, 128, 'w+');
      writeCString(memory, 192, 'abc');

      const stream = hosts.fopen(64, 128);
      assert.ok(stream > 0);
      assert.strictEqual(hosts.fwrite(192, 1, 3, stream), 3);
      assert.strictEqual(hosts.fclose(stream), 0);
      assert.strictEqual(hosts.rename(64, 96), 0);
      assert.strictEqual(hosts.remove(96), 0);

      const memoryReload = new WebAssembly.Memory({ initial: 2 });
      const hostsReload = createDefaultHostBuiltins(() => memoryReload, {
        forceMemoryFiles: true,
        memoryFileStore: localStore
      });

      writeCString(memoryReload, 96, 'new.mem');
      writeCString(memoryReload, 128, 'r');
      assert.strictEqual(hostsReload.fopen(96, 128), 0);
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
