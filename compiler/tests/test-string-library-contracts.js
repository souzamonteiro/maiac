'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { compileSource } = require('../c-compiler');

const sourcePath = path.resolve(__dirname, '../../src/string.c');
// Including its own header makes every definition check the public C ABI.
execFileSync(process.env.CC || 'clang', [
  '-std=c89', '-pedantic-errors', '-Wall', '-Wextra', '-Werror',
  '-ffreestanding', '-fsyntax-only', sourcePath,
]);
const source = fs.readFileSync(sourcePath, 'utf8') + `
struct Output {char *data; size_t length;};
void append(struct Output *output, const char *text, size_t length) {
  memcpy(output->data + output->length, text, length);
  output->length += length;
  output->data[output->length] = 0;
}
int test_entry(void) {
  char buffer[16];
  struct Output output;
  size_t (*length)(const char *);
  size_t (*span)(const char *, const char *);
  length = strlen;
  span = strspn;
  if (length("hello") != 5) return 1;
  if (span("abba!", "ab") != 4) return 2;
  if (strcspn("abc!def", "!") != 3) return 3;
  memset(buffer, 0, 16);
  memcpy(buffer, "abc", 4);
  memmove(buffer + 1, buffer, 4);
  if (strcmp(buffer, "aabc")) return 4;
  strncpy(buffer, "xy", 5);
  if (buffer[2] || buffer[3] || buffer[4]) return 5;
  strncat(buffer, "z!", 1);
  if (strncmp(buffer, "xyz", 4)) return 6;
  if (strxfrm(buffer, "copy", 16) != 4 || strcmp(buffer, "copy")) return 7;
  if (memcmp(buffer, "copy", 4)) return 8;
  if (memchr(buffer, 'p', 4) != buffer + 2) return 9;
  if (strlen("") || strspn("", "ab") || strcspn("", "!")) return 10;
  if (strxfrm(buffer, "longer", 0) != 6) return 11;
  output.data = buffer;
  output.length = 0;
  append(&output, "abc", 3);
  append(&output, "def", 3);
  if (strcmp(buffer, "abcdef")) return 12;
  return 0;
}
`;
const result = compileSource(source, { sourcePath, resolveSystemIncludes: true, validate: true });
assert.ok(result.wasm, result.validationError && result.validationError.message);
const instance = new WebAssembly.Instance(new WebAssembly.Module(Buffer.from(result.wasm)), {});
assert.equal(instance.exports.test_entry(), 0);
console.log('String library: strict C89 header compatibility and 12 guest checks passed');
