'use strict';

/**
 * host-env-builder.js
 *
 * Builds a WebAssembly `imports.env` object dynamically from the `hostImports`
 * metadata emitted by the MaiaC compiler.
 *
 * Host-extern naming convention (C side):
 *
 *   extern void __console__log(char *message);
 *   extern double __Math__sin(double x);
 *   extern void __alert(char *message);
 *
 * The double-underscore segments encode the JS call path:
 *   __console__log  →  console.log(...)
 *   __Math__sin     →  Math.sin(...)
 *   __alert         →  alert(...)       (global function)
 *
 * The generated env key preserves the full C name (e.g. "__console__log"),
 * which is also what the WAT import field contains.
 *
 * Parameters typed as `char *` (pointer to char) are automatically
 * dereferenced from WASM linear memory to JS strings.
 *
 * Usage:
 *
 *   const { buildHostEnv } = require('./tools/host-env-builder');
 *   ...
 *   const result = compileSource(source, { validate: true });
 *   ...
 *   const imports = {
 *     env: {
 *       printf: createPrintfHost({ getMemory: () => memoryRef, write: process.stdout.write.bind(process.stdout) }),
 *       ...buildHostEnv(result.hostImports, { getMemory: () => memoryRef })
 *     }
 *   };
 */

/**
 * Read a null-terminated C string from WASM linear memory.
 *
 * @param {WebAssembly.Memory} memory
 * @param {number} ptr  – 32-bit byte offset into the memory buffer
 * @returns {string}
 */
function readCString(memory, ptr) {
  const mem = new Uint8Array(memory.buffer);
  const offset = ptr >>> 0;
  let end = offset;
  while (end < mem.length && mem[end] !== 0) {
    end += 1;
  }
  return new TextDecoder('utf-8').decode(mem.subarray(offset, end));
}

/**
 * Resolve a dotted path like ['console', 'log'] against `globalThis`,
 * returning { thisValue, fn } so the function can be called correctly.
 *
 * Throws a descriptive error if any segment is missing.
 *
 * @param {string[]} parts
 * @returns {{ thisValue: object|null, fn: Function }}
 */
function resolveJsTarget(parts) {
  if (parts.length === 0) throw new Error('Empty host-extern path');

  if (parts.length === 1) {
    const fn = globalThis[parts[0]];
    if (typeof fn !== 'function') {
      throw new Error(`Host function '${parts[0]}' is not a function on globalThis`);
    }
    return { thisValue: globalThis, fn };
  }

  let obj = globalThis;
  for (let i = 0; i < parts.length - 1; i += 1) {
    obj = obj[parts[i]];
    if (obj == null) {
      throw new Error(`Host object '${parts.slice(0, i + 1).join('.')}' not found`);
    }
  }

  const methodName = parts[parts.length - 1];
  const fn = obj[methodName];
  if (typeof fn !== 'function') {
    throw new Error(`Host method '${parts.join('.')}' is not a function`);
  }

  return { thisValue: obj, fn };
}

/**
 * Determines whether a parameter descriptor describes a C string (`char *`).
 *
 * @param {{ cType: string, pointerDepth: number }} paramDef
 * @returns {boolean}
 */
function isStringParam(paramDef) {
  return (paramDef.pointerDepth || 0) > 0
    && (paramDef.cType === 'char' || paramDef.cType === 'signed char' || paramDef.cType === 'unsigned char');
}

/**
 * Build a plain JS object suitable for use as `imports.env` that provides
 * implementations for every host import declared with the `__` naming convention.
 *
 * @param {Array<{
 *   sourceName: string,
 *   hostInfo:  { envKey: string, jsExpr: string, parts: string[] },
 *   paramDefs: Array<{ cType: string, pointerDepth: number }>,
 *   resultType: string|null
 * }>} hostImports  – the `result.hostImports` array from compileSource()
 *
 * @param {{ getMemory: () => WebAssembly.Memory|null }} opts
 *   getMemory  – thunk that returns the live WebAssembly.Memory instance
 *                (may return null before the module is instantiated)
 *
 * @returns {Record<string, Function>}
 */
function buildHostEnv(hostImports, opts = {}) {
  const getMemory = typeof opts.getMemory === 'function' ? opts.getMemory : () => null;
  const env = {};

  for (const imp of (hostImports || [])) {
    const { envKey, parts } = imp.hostInfo;
    const paramDefs = imp.paramDefs || [];
    const hasResult = imp.resultType !== null;

    env[envKey] = (...rawArgs) => {
      // Coerce each raw WASM argument to the correct JS value.
      const jsArgs = paramDefs.map((p, i) => {
        const raw = rawArgs[i] != null ? rawArgs[i] : 0;

        if (isStringParam(p)) {
          const memory = getMemory();
          if (!memory) {
            throw new Error(
              `Host function '${envKey}' received a string pointer but WASM memory is not yet available`
            );
          }
          return readCString(memory, Math.trunc(Number(raw)) >>> 0);
        }

        return raw;
      });

      // Resolve the JS target lazily (only once per call site in practice
      // if the JS engine inlines, but we keep it simple and correct).
      const { thisValue, fn } = resolveJsTarget(parts);
      const returnValue = fn.call(thisValue, ...jsArgs);

      // WASM expects a numeric return value for non-void functions.
      return hasResult ? (returnValue ?? 0) : undefined;
    };

    // Provide a human-readable name for stack traces.
    Object.defineProperty(env[envKey], 'name', { value: envKey, configurable: true });
  }

  return env;
}

/**
 * Generates a self-contained JavaScript source string that, when evaluated,
 * provides a `buildEnv(getMemory)` factory for the host imports.
 *
 * Useful for browser environments where you cannot use `require`.
 *
 * @param {Array} hostImports  – same as passed to buildHostEnv
 * @returns {string}
 */
function generateHostEnvSource(hostImports) {
  const lines = [
    '// Auto-generated host env – do not edit manually',
    '(function buildEnv(getMemory) {',
    "  function readCString(ptr) {",
    "    const memory = getMemory();",
    "    if (!memory) return '';",
    "    const mem = new Uint8Array(memory.buffer);",
    "    const offset = ptr >>> 0; let end = offset;",
    "    while (end < mem.length && mem[end] !== 0) end++;",
    "    return new TextDecoder('utf-8').decode(mem.subarray(offset, end));",
    "  }",
    "  return {"
  ];

  for (const imp of (hostImports || [])) {
    const { envKey, jsExpr, parts } = imp.hostInfo;
    const paramDefs = imp.paramDefs || [];

    const paramNames = paramDefs.map((p, i) => `p${i}`);
    const argExprs = paramDefs.map((p, i) => {
      if (isStringParam(p)) return `readCString(p${i})`;
      return `p${i}`;
    });

    // Build the JS call expression: console.log(...) or alert(...) etc.
    const callTarget = parts.length > 1
      ? `${parts.slice(0, -1).join('.')}.${parts[parts.length - 1]}`
      : parts[0];

    const fnParams = paramNames.join(', ');
    const fnArgs = argExprs.join(', ');

    lines.push(`    ${JSON.stringify(envKey)}: (${fnParams}) => ${callTarget}(${fnArgs}),`);
  }

  lines.push('  };', '})');
  return lines.join('\n');
}

module.exports = { buildHostEnv, generateHostEnvSource, readCString, isStringParam };
