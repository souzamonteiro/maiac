const { compileSource } = require('../c-compiler.js');

// Test: Array of pointers with different scenarios
const code = `
struct Node {
  int value;
};

int test_entry() {
  struct Node node1;
  node1.value = 10;
  
  struct Node *ptrs[2];
  ptrs[0] = &node1;
  
  // Test A: Indirect access through temporary
  struct Node *temp = ptrs[0];
  int val_a = temp->value;  // Should be 10
  
  // Test B: Direct array indexing followed by member access
  int val_b = ptrs[0]->value;  // Should be 10, but getting 1024?
  
  // Return the difference to see what's happening
  return val_b;  // This should return 10
}
`;

try {
  console.log('Compiling...');
  const result = compileSource(code);
  
  if (!result || result.success === false) {
    console.log('Compilation failed:', result && result.error);
    process.exit(1);
  }
  
  console.log('Success! Running...');
  const instance = new WebAssembly.Instance(new WebAssembly.Module(result.wasm));
  const returnValue = instance.exports.test_entry();
  console.log(`Result: ${returnValue} (expected 10)`);
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
