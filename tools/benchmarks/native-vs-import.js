#!/usr/bin/env node
'use strict';

const { performance } = require('perf_hooks');
const { compileSource } = require('../../compiler/c-compiler.js');

const LOOP_COUNT = 2_000_000;
const WARMUP_RUNS = 3;
const SAMPLE_RUNS = 10;

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function formatMs(value) {
  return `${value.toFixed(3)} ms`;
}

function compile(name, source) {
  const result = compileSource(source, {
    sourcePath: `${name}.bench.c`,
    validate: true,
    printWat: false,
    resolveSystemIncludes: false
  });

  if (!result.wasm) {
    throw result.validationError || new Error(`Failed to compile benchmark source: ${name}`);
  }

  return Buffer.from(result.wasm);
}

async function instantiate(wasmBytes, env = {}) {
  const instantiated = await WebAssembly.instantiate(wasmBytes, { env });
  return instantiated.instance || instantiated;
}

function timeMain(instance, runs) {
  if (!instance || !instance.exports || typeof instance.exports.main !== 'function') {
    throw new Error('Benchmark module missing main() export');
  }

  const samples = [];
  let lastReturn = null;

  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    lastReturn = instance.exports.main();
    const end = performance.now();
    samples.push(end - start);
  }

  return { samples, lastReturn };
}

async function run() {
  const nativeSource = [
    'static int inc_native(int x) {',
    '  return x + 1;',
    '}',
    '',
    'int main(void) {',
    '  int i;',
    '  int s = 0;',
    `  for (i = 0; i < ${LOOP_COUNT}; i++) {`,
    '    s = inc_native(s);',
    '  }',
    '  return s;',
    '}'
  ].join('\n');

  const importSource = [
    'extern int __bench__inc(int x);',
    '',
    'int main(void) {',
    '  int i;',
    '  int s = 0;',
    `  for (i = 0; i < ${LOOP_COUNT}; i++) {`,
    '    s = __bench__inc(s);',
    '  }',
    '  return s;',
    '}'
  ].join('\n');

  const nativeWasm = compile('native', nativeSource);
  const importWasm = compile('import', importSource);

  const nativeInstance = await instantiate(nativeWasm, {});
  const importInstance = await instantiate(importWasm, {
    __bench__inc: (x) => ((x | 0) + 1) | 0
  });

  timeMain(nativeInstance, WARMUP_RUNS);
  timeMain(importInstance, WARMUP_RUNS);

  const nativeRun = timeMain(nativeInstance, SAMPLE_RUNS);
  const importRun = timeMain(importInstance, SAMPLE_RUNS);

  const expected = LOOP_COUNT | 0;
  if ((nativeRun.lastReturn | 0) !== expected) {
    throw new Error(`Unexpected native return value: ${nativeRun.lastReturn}`);
  }
  if ((importRun.lastReturn | 0) !== expected) {
    throw new Error(`Unexpected import return value: ${importRun.lastReturn}`);
  }

  const nativeMedian = median(nativeRun.samples);
  const importMedian = median(importRun.samples);
  const nativeMean = mean(nativeRun.samples);
  const importMean = mean(importRun.samples);
  const ratio = nativeMedian > 0 ? importMedian / nativeMedian : 0;

  console.log('MaiaC benchmark: native vs JS import call overhead');
  console.log(`  loops per run: ${LOOP_COUNT}`);
  console.log(`  warmup runs:   ${WARMUP_RUNS}`);
  console.log(`  sample runs:   ${SAMPLE_RUNS}`);
  console.log('');
  console.log(`  native median: ${formatMs(nativeMedian)}`);
  console.log(`  import median: ${formatMs(importMedian)}`);
  console.log(`  native mean:   ${formatMs(nativeMean)}`);
  console.log(`  import mean:   ${formatMs(importMean)}`);
  console.log(`  ratio (import/native, median): ${ratio.toFixed(3)}x`);
}

run().catch((error) => {
  console.error(`[benchmark] ${error.message}`);
  process.exit(1);
});
