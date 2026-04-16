'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { compileSource } = require('../c-compiler.js');
const { createDefaultHostBuiltins } = require('../../src/runtime/default-host-builtins.js');

let WatAssembler = null;
try {
  WatAssembler = require('../../maiawasm/assembler/wat-assembler.js');
} catch (_error) {
  WatAssembler = null;
}

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
    return { passed: true, name };
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    return { passed: false, name, error };
  }
}

function stripWatComments(source) {
  return String(source)
    .replace(/^\s*;;.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function assembleSetjmpWasm() {
  if (!WatAssembler) {
    throw new Error('MaiaWASM assembler unavailable for setjmp bootstrap test');
  }

  const watPath = path.join(__dirname, '..', '..', 'src', 'setjmp.wat');
  const wat = fs.readFileSync(watPath, 'utf8');
  const assembler = new WatAssembler();
  return Buffer.from(assembler.assemble(stripWatComments(wat)));
}

async function main() {
  const source = [
    '#include <setjmp.h>',
    '',
    'static jmp_buf env;',
    '',
    'int deep(int n) {',
    '  int scratch[32];',
    '  scratch[0] = n;',
    '  if (n <= 0) {',
    '    longjmp(env, 9);',
    '    return 99;',
    '  }',
    '  return deep(n - 1) + scratch[0];',
    '}',
    '',
    'int main(void) {',
    '  int rc = setjmp(env);',
    '  if (rc != 0) return rc;',
    '  return deep(10);',
    '}'
  ].join('\n');

  const compileResult = compileSource(source, {
    sourcePath: __filename,
    validate: true,
    printWat: false,
    resolveSystemIncludes: true
  });

  if (!compileResult.wasm) {
    throw compileResult.validationError || new Error('WASM output missing');
  }

  const setjmpWasm = assembleSetjmpWasm();
  const appWasm = Buffer.from(compileResult.wasm);

  let memoryRef = null;
  let appInstanceRef = null;
  let capturedContext = null;
  let longjmpObserved = null;
  const LONGJMP_SIGNAL = { __maiacLongjmp: true };

  function getExportedGlobalValue(name) {
    if (!appInstanceRef || !appInstanceRef.exports) return 0;
    const exported = appInstanceRef.exports[name];
    if (exported == null) return 0;
    if (typeof exported === 'number') return exported | 0;
    if (typeof exported.value === 'number') return exported.value | 0;
    return 0;
  }

  function setExportedGlobalValue(name, value) {
    if (!appInstanceRef || !appInstanceRef.exports) return;
    const exported = appInstanceRef.exports[name];
    if (exported == null) return;
    if (typeof exported.value === 'number') {
      exported.value = value | 0;
    }
  }

  const imports = {
    env: {
      ...createDefaultHostBuiltins(() => memoryRef, {
        getStackPointer: () => getExportedGlobalValue('__stack_ptr'),
        setStackPointer: (value) => setExportedGlobalValue('__stack_ptr', value),
        getFramePointer: () => getExportedGlobalValue('__frame_ptr'),
        setFramePointer: (value) => setExportedGlobalValue('__frame_ptr', value),
        onSetjmpCapture: (envPtr, snapshot) => {
          capturedContext = {
            envPtr: envPtr | 0,
            stackPtr: snapshot && Number.isInteger(snapshot.stackPtr) ? snapshot.stackPtr | 0 : null,
            framePtr: snapshot && Number.isInteger(snapshot.framePtr) ? snapshot.framePtr | 0 : null
          };
        },
        onLongjmp: (envPtr, value) => {
          longjmpObserved = {
            envPtr: envPtr | 0,
            value: value | 0,
            stackPtr: getExportedGlobalValue('__stack_ptr'),
            framePtr: getExportedGlobalValue('__frame_ptr')
          };
          throw LONGJMP_SIGNAL;
        }
      })
    }
  };

  const setjmpInstantiated = await WebAssembly.instantiate(setjmpWasm, imports);
  const setjmpInstance = setjmpInstantiated.instance || setjmpInstantiated;
  imports.env.setjmp = setjmpInstance.exports.setjmp;
  imports.env.longjmp = setjmpInstance.exports.longjmp;

  const appInstantiated = await WebAssembly.instantiate(appWasm, imports);
  appInstanceRef = appInstantiated.instance || appInstantiated;
  memoryRef = appInstanceRef.exports.memory || null;

  const entry = appInstanceRef.exports.main || appInstanceRef.exports.test_entry;
  if (typeof entry !== 'function') {
    throw new Error('Missing entrypoint export (expected main or test_entry)');
  }

  let thrown = null;
  try {
    entry();
  } catch (error) {
    thrown = error;
  }

  const tests = [
    runTest('longjmp triggers unwind signal in bootstrap mode', () => {
      assert.strictEqual(thrown, LONGJMP_SIGNAL);
    }),
    runTest('setjmp captures context and longjmp receives non-zero value', () => {
      assert.ok(capturedContext);
      assert.ok(longjmpObserved);
      assert.strictEqual(longjmpObserved.value, 9);
      assert.strictEqual(longjmpObserved.envPtr, capturedContext.envPtr);
    }),
    runTest('longjmp restores stack/frame pointers before unwind callback', () => {
      assert.ok(capturedContext);
      assert.ok(longjmpObserved);
      assert.strictEqual(longjmpObserved.stackPtr, capturedContext.stackPtr);
      assert.strictEqual(longjmpObserved.framePtr, capturedContext.framePtr);
    })
  ];

  const failed = tests.filter((t) => !t.passed);
  if (failed.length > 0) {
    console.error(`\nSummary: ${tests.length - failed.length} passed, ${failed.length} failed`);
    process.exit(1);
  }

  console.log(`\nSummary: ${tests.length} passed, 0 failed`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
