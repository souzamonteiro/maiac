'use strict';
const { compileSource } = require('../c-compiler.js');
const code = `struct Node { int value; };
int test_entry() {
  struct Node nodes[2];
  struct Node *ptrs[2];
  nodes[0].value = 10;
  nodes[1].value = 20;
  ptrs[0] = &nodes[0];
  ptrs[1] = &nodes[1];
  return ptrs[0]->value + ptrs[1]->value;
}`;
const result = compileSource(code);
console.log(result.wat);
