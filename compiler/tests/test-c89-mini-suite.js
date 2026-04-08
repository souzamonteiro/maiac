'use strict';

const fs = require('fs');
const path = require('path');

const { compileSource } = require('../c-compiler.js');
const { preprocessCSource } = require('../c-preprocessor.js');

const suiteDir = path.join(__dirname, '..', 'examples', 'c89-mini-suite');
const outDir = path.join(__dirname, 'outputs', 'c89-mini-suite');
const writeArtifacts = process.env.MAIAC_WRITE_TEST_OUTPUTS === '1';

const cases = [
  { file: '01_arithmetic_ops.c', expectedReturn: 222 },
  { file: '02_control_flow.c', expectedReturn: 83 },
  { file: '03_functions_recursion.c', expectedReturn: 145 },
  { file: '04_arrays_matrix.c', expectedReturn: 88 },
  { file: '05_pointers_and_funcptr.c', expectedReturn: 47 },
  { file: '06_struct_union_enum.c', expectedReturn: 150 },
  { file: '07_globals_static_memory.c', expectedReturn: 50 },
  { file: '08_bitwise_casts.c', expectedReturn: 1283 },
  { file: '09_preprocessor_strings.c', expectedReturn: 32 }
];

async function runCase(testCase) {
  const sourcePath = path.join(suiteDir, testCase.file);
  const baseName = path.basename(testCase.file, '.c');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const preprocessed = preprocessCSource(source);

  if (writeArtifacts) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, `${baseName}.pre.c`), preprocessed, 'utf8');
  }

  const result = compileSource(source, { validate: true, printWat: false });
  if (writeArtifacts) {
    fs.writeFileSync(path.join(outDir, `${baseName}.wat`), result.wat, 'utf8');
  }

  if (!result.wasm) {
    throw result.validationError || new Error('WASM validation did not return a binary module');
  }

  const wasmBytes = Buffer.from(result.wasm);
  if (writeArtifacts) {
    fs.writeFileSync(path.join(outDir, `${baseName}.wasm`), wasmBytes);
  }

  if (!WebAssembly.validate(new Uint8Array(wasmBytes))) {
    throw new Error('Generated WASM is invalid');
  }

  if (testCase.skipRuntime) {
    return `assemble ok; runtime skipped (${testCase.skipRuntime})`;
  }

  const { instance } = await WebAssembly.instantiate(wasmBytes, {});
  if (!instance.exports || typeof instance.exports.test_entry !== 'function') {
    throw new Error('Missing exported test_entry function');
  }

  const got = instance.exports.test_entry();
  if (got !== testCase.expectedReturn) {
    throw new Error(`Runtime returned ${got}, expected ${testCase.expectedReturn}`);
  }

  return `runtime=${got}`;
}

(async () => {
  if (!fs.existsSync(suiteDir)) {
    console.error('Missing mini-suite folder:', suiteDir);
    process.exit(1);
  }

  let failed = 0;
  let knownLimitations = 0;
  console.log('Running maiac compiler C89 mini-suite validation...\n');
  console.log(`  Artifacts: ${writeArtifacts ? `enabled (${outDir})` : 'disabled (set MAIAC_WRITE_TEST_OUTPUTS=1 to enable)'}`);

  for (const testCase of cases) {
    process.stdout.write(`  ${testCase.file} ... `);
    try {
      const note = await runCase(testCase);
      if (testCase.knownFailure) {
        console.log(`PASS (known limitation no longer reproduces; ${note})`);
      } else {
        console.log(`PASS (${note})`);
      }
    } catch (error) {
      const message = String(error.message || error).split('\n')[0];
      if (testCase.knownFailure) {
        knownLimitations += 1;
        console.log('KNOWN');
        console.log(`    ${testCase.knownFailure}`);
        console.log(`    current result: ${message}`);
      } else {
        failed += 1;
        console.log('FAIL');
        console.log(`    ${message}`);
      }
    }
  }

  console.log(`\nSummary: ${cases.length - failed - knownLimitations} passed, ${knownLimitations} known limitations, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})();
