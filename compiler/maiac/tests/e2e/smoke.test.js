const { test } = require('node:test');
const assert = require('node:assert/strict');

const WatAssembler = require('../../../../maiawasm/assembler/wat-assembler.js');
const { compileCStringToWat } = require('../../src/pipeline/compile');

test('C subset compiles to runnable wasm using host imports', async () => {
  const source = `
int main() {
  js_print_i32(40 + 2);
  return 7;
}
`;

  const { wat } = compileCStringToWat(source, { mode: 'subset' });

  const assembler = new WatAssembler();
  const wasmBytes = assembler.assemble(wat);

  const printed = [];
  const mod = await WebAssembly.instantiate(new Uint8Array(wasmBytes), {
    env: {
      print_i32(v) {
        printed.push(v | 0);
      },
      abort() {
        throw new Error('abort called');
      },
    },
  });

  const ret = mod.instance.exports.main();
  assert.equal(ret, 7);
  assert.deepEqual(printed, [42]);
});
