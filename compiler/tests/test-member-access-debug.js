const { compileSource } = require('../c-compiler.js');

function test(description, code, expectedValue) {
  try {
    const result = compileSource(code);
    if (!result || result.success === false) {
      const errorMsg = result && result.error ? (result.error.message || String(result.error)) : 'Unknown error';
      console.log(`${description}: FAIL - Compilation error: ${errorMsg}`);
      return false;
    }

    const instance = new WebAssembly.Instance(new WebAssembly.Module(result.wasm));
    const returnValue = instance.exports.test_entry();
    
    if (returnValue === expectedValue) {
      console.log(`${description}: PASS (got ${returnValue})`);
      return true;
    } else {
      console.log(`${description}: FAIL (got ${returnValue}, expected ${expectedValue})`);
      return false;
    }
  } catch (error) {
    console.log(`${description}: ERROR - ${error.message}`);
    console.error(error);
    return false;
  }
}

console.log('Member access debugging:\n');

// Test 1: Simple arrow access works
test('Test 1: Simple pointer arrow', `
struct Node {
  int value;
};

int test_entry() {
  struct Node node;
  node.value = 42;
  struct Node *p = &node;
  return p->value;
}
`, 42);

// Test 2: Array of structs, dot access
test('Test 2: Array dot access', `
struct Node {
  int value;
};

int test_entry() {
  struct Node nodes[2];
  nodes[0].value = 10;
  nodes[1].value = 20;
  return nodes[0].value;
}
`, 10);

// Test 3: Array of structs, pointer, arrow access
test('Test 3: Array pointer to element arrow', `
struct Node {
  int value;
};

int test_entry() {
  struct Node nodes[2];
  nodes[0].value = 10;
  struct Node *p = &nodes[0];
  return p->value;
}
`, 10);

// Test 5: Array of pointers - member access
test('Test 5: Array of pointers - member access', `
struct Node {
  int value;
};

int test_entry() {
  struct Node node1;
  node1.value = 10;
  struct Node *ptrs[2];
  ptrs[0] = &node1;
  return ptrs[0]->value;
}
`, 10);

// Test 6: Multiple indices
test('Test 6: 2D array member access', `
struct Node {
  int v;
};

int test_entry() {
  struct Node arr[2][2];
  arr[0][0].v = 5;
  arr[0][1].v = 6;
  arr[1][0].v = 7;
  arr[1][1].v = 8;
  return arr[0][1].v;
}
`, 6);
