/**
 * Debug: Struct with array of pointer members - progressive test
 */

'use strict';

const { compileSource } = require('../c-compiler.js');

// Test 1: Simple pointer access
const test1 = `
struct Node { int value; };
int test_entry() {
  struct Node node;
  struct Node *p = &node;
  node.value = 10;
  return p->value;
}
`;

// Test 2: Array access
const test2 = `
struct Node { int value; };
int test_entry() {
  struct Node nodes[3];
  nodes[0].value = 10;
  return nodes[0].value;
}
`;

// Test 3: Pointer to array element
const test3 = `
struct Node { int value; };
int test_entry() {
  struct Node nodes[3];
  struct Node *p;
  nodes[0].value = 10;
  p = &nodes[0];
  return p->value;
}
`;

// Test 4: Array of pointers
const test4 = `
struct Node { int value; };
int test_entry() {
  struct Node nodes[3];
  struct Node *ptrs[3];
  nodes[0].value = 10;
  ptrs[0] = &nodes[0];
  return ptrs[0]->value;
}
`;

// Test 5: Array of pointers - sum
const test5 = `
struct Node { int value; };
int test_entry() {
  struct Node nodes[3];
  struct Node *ptrs[3];
  nodes[0].value = 10;
  nodes[1].value = 20;
  nodes[2].value = 30;
  ptrs[0] = &nodes[0];
  ptrs[1] = &nodes[1];
  ptrs[2] = &nodes[2];
  return ptrs[0]->value + ptrs[1]->value + ptrs[2]->value;
}
`;

function runTest(testNum, code, expectedValue) {
  try {
    const result = compileSource(code, { validate: true, printWat: false });
    
    if (!result.wasm) {
      console.error(`Test ${testNum}: WASM compilation failed`);
      return false;
    }

    const wasmBytes = Buffer.from(result.wasm);
    const wasmModule = new WebAssembly.Module(wasmBytes);
    const instance = new WebAssembly.Instance(wasmModule, {
      env: { printf: () => 0 }
    });
    
    const returnValue = instance.exports.test_entry();
    const passed = returnValue === expectedValue;
    
    console.log(`Test ${testNum}: ${passed ? 'PASS' : 'FAIL'} (got ${returnValue}, expected ${expectedValue})`);
    return passed;
  } catch (error) {
    console.error(`Test ${testNum}: ERROR - ${error.message}`);
    return false;
  }
}

console.log('Progressive struct pointer tests:\n');

runTest(1, test1, 10);
runTest(2, test2, 10);
runTest(3, test3, 10);
runTest(4, test4, 10);
runTest(5, test5, 60);
