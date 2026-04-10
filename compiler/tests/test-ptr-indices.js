const { compileSource } = require('../c-compiler.js');

// Tests for different pointer indices
const tests = [
  [`ptrs[0]->value (nodes[0]=10)`, `
struct Node { int value; };
int test_entry() {
  struct Node nodes[2];
  struct Node *ptrs[2];
  nodes[0].value = 10;
  ptrs[0] = &nodes[0];
  return ptrs[0]->value;
}
`, 10],
  [`ptrs[0]->value (nodes[1]=20, ptrs[0]=&nodes[1])`, `
struct Node { int value; };
int test_entry() {
  struct Node nodes[2];
  struct Node *ptrs[2];
  nodes[1].value = 20;
  ptrs[0] = &nodes[1];
  return ptrs[0]->value;
}
`, 20],
  [`ptrs[1]->value (nodes[1]=20, ptrs[1]=&nodes[1])`, `
struct Node { int value; };
int test_entry() {
  struct Node nodes[2];
  struct Node *ptrs[2];
  nodes[1].value = 20;
  ptrs[1] = &nodes[1];
  return ptrs[1]->value;
}
`, 20],
];

for (const [name, code, expected] of tests) {
  try {
    const result = compileSource(code);
    const instance = new WebAssembly.Instance(new WebAssembly.Module(result.wasm));
    const returned = instance.exports.test_entry();
    const status = returned === expected ? 'PASS' : 'FAIL';
    console.log(`${status}: ${name} => got ${returned} (expected ${expected})`);
  } catch (error) {
    console.log(`ERROR: ${name} => ${error.message}`);
  }
}
