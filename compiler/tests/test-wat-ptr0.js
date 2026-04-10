const { compileSource } = require('../c-compiler.js');

const code = `
struct Node { int value; };
int test_entry() {
  struct Node nodes[2];
  struct Node *ptrs[2];
  nodes[0].value = 10;
  nodes[1].value = 20;
  ptrs[0] = &nodes[0];
  ptrs[1] = &nodes[1];
  return ptrs[0]->value;
}
`;

try {
  const result = compileSource(code);
  console.log('=== WAT ===');
  console.log(result.wat);
  const instance = new WebAssembly.Instance(new WebAssembly.Module(result.wasm));
  console.log('Result:', instance.exports.test_entry(), '(expected 10)');
} catch (error) {
  console.error('Error:', error.message);
}
