'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { compileSource } = require('../c-compiler');

const sourcePath = path.resolve(__dirname, '../../src/stdlib.c');
const source = fs.readFileSync(sourcePath, 'utf8') + `
int test_entry(void) {
  unsigned int round;
  unsigned int index;
  unsigned int length;
  unsigned char *bytes;
  unsigned char *grown;
  if ((unsigned char)256 != 0 || (unsigned char)-1 != 255) return 9;
  if ((signed char)255 != -1 || (unsigned short)65536 != 0 || (short)65535 != -1) return 10;
  for (round = 0; round < 12; ++round) {
    length = 128 + round * 257;
    bytes = (unsigned char*)calloc(length, 1);
    if (!bytes) return 1;
    for (index = 0; index < length; ++index) {
      if (bytes[index]) return 2;
      bytes[index] = (unsigned char)(index + round);
    }
    grown = (unsigned char*)realloc(bytes, length * 3);
    if (!grown) return 3;
    for (index = 0; index < length; ++index) {
      if (grown[index] != (unsigned char)(index + round)) return 4;
    }
    bytes = (unsigned char*)realloc(grown, length / 2);
    if (!bytes) return 5;
    for (index = 0; index < length / 2; ++index) {
      if (bytes[index] != (unsigned char)(index + round)) return 6;
    }
    free(bytes);
  }
  bytes = (unsigned char*)malloc(2 * 1024 * 1024);
  if (!bytes) return 7;
  bytes[0] = 17;
  bytes[2 * 1024 * 1024 - 1] = 29;
  if (bytes[0] != 17 || bytes[2 * 1024 * 1024 - 1] != 29) return 8;
  free(bytes);
  return 0;
}
`;
const result = compileSource(source, { sourcePath, resolveSystemIncludes: true, validate: true });
assert.ok(result.wasm, result.validationError && result.validationError.message);
const wasmModule = new WebAssembly.Module(Buffer.from(result.wasm));
let instance;
let growths = 0;
const env = {
  __builtin_wasm_memory_size: (index) => index === 0 ? instance.exports.memory.buffer.byteLength / 65536 : -1,
  __builtin_wasm_memory_grow: (index, pages) => {
    if (index !== 0) return -1;
    ++growths;
    try { return instance.exports.memory.grow(pages); } catch { return -1; }
  },
};
assert.deepEqual(WebAssembly.Module.imports(wasmModule).map((entry) => entry.name).sort(), Object.keys(env).sort());
instance = new WebAssembly.Instance(wasmModule, { env });
assert.equal(instance.exports.test_entry(), 0);
assert.ok(growths > 0, 'The guest allocator must grow actual linear memory');
console.log('C allocator: 12 calloc/realloc/free cycles and actual memory growth passed');
