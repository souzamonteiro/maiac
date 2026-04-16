'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { compileSource } = require('../c-compiler.js');
const { createDefaultHostBuiltins, isLongjmpSignal } = require('../../src/runtime/default-host-builtins.js');

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
    throw new Error('MaiaWASM assembler unavailable for setjmp resume test');
  }

  const watPath = path.join(__dirname, '..', '..', 'src', 'setjmp.wat');
  const wat = fs.readFileSync(watPath, 'utf8');
  const assembler = new WatAssembler();
  return Buffer.from(assembler.assemble(stripWatComments(wat)));
}

function runWithLongjmpResume(entry, maxAttempts = 32) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return entry();
    } catch (error) {
      if (isLongjmpSignal(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Exceeded longjmp resume limit (${maxAttempts})`);
}

async function compileAndRunWithSetjmpLib(source) {
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
        setFramePointer: (value) => setExportedGlobalValue('__frame_ptr', value)
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

  return runWithLongjmpResume(entry);
}

async function main() {
  const sourceLongjmpValue = [
    '#include <setjmp.h>',
    '',
    'static jmp_buf env;',
    '',
    'int dive(int n) {',
    '  int s[16];',
    '  s[0] = n;',
    '  if (n == 0) longjmp(env, 7);',
    '  return dive(n - 1) + s[0];',
    '}',
    '',
    'int main(void) {',
    '  int rc = setjmp(env);',
    '  if (rc != 0) return rc;',
    '  return dive(4);',
    '}'
  ].join('\n');

  const sourceLongjmpZero = [
    '#include <setjmp.h>',
    '',
    'static jmp_buf env;',
    '',
    'int recurse(int n) {',
    '  if (n == 0) longjmp(env, 0);',
    '  return recurse(n - 1);',
    '}',
    '',
    'int main(void) {',
    '  int rc = setjmp(env);',
    '  if (rc != 0) return rc;',
    '  recurse(3);',
    '  return 99;',
    '}'
  ].join('\n');

  const results = [];

  {
    const rc = await compileAndRunWithSetjmpLib(sourceLongjmpValue);
    results.push(runTest('setjmp resumes with longjmp non-zero value', () => {
      assert.strictEqual(rc, 7);
    }));
  }

  {
    const rc = await compileAndRunWithSetjmpLib(sourceLongjmpZero);
    results.push(runTest('setjmp resumes with longjmp(0) normalized to 1', () => {
      assert.strictEqual(rc, 1);
    }));
  }

  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(`\nSummary: ${results.length - failed.length} passed, ${failed.length} failed`);
    process.exit(1);
  }

  console.log(`\nSummary: ${results.length} passed, 0 failed`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
