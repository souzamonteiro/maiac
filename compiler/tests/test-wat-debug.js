const { compileSource } = require('../c-compiler.js');

const code = `
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
`;

try {
  const result = compileSource(code);
  
  if (!result || result.success === false) {
    console.log('Compilation failed!', result?.error);
    process.exit(1);
  }
  
  console.log('=== WAT CODE ===');
  console.log(result.wat);
  
  console.log('\n=== RUNNING ===');
  const instance = new WebAssembly.Instance(new WebAssembly.Module(result.wasm));
  const returnValue = instance.exports.test_entry();
  console.log(`Result: ${returnValue} (expected 10)`);
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
