const { compileSource } = require('../c-compiler.js');

const code = `
struct Node {
  int value;
};

int test_entry() {
  struct Node nodes[2];
  struct Node *ptrs[2];
  nodes[0].value = 10;
  nodes[1].value = 20;
  ptrs[0] = &nodes[0];
  ptrs[1] = &nodes[1];
  int v2 = ptrs[1]->value;
  return v2;
}
`;

try {
  const result = compileSource(code);
  
  if (!result || result.success === false) {
    console.log('Compilation failed!', result?.error);
    process.exit(1);
  }
  
  console.log('Running...');
  const instance = new WebAssembly.Instance(new WebAssembly.Module(result.wasm));
  const returnValue = instance.exports.test_entry();
  console.log(`Result: ${returnValue} (expected 20)`);
  
} catch (error) {
  console.error('Error:', error.message);
}
