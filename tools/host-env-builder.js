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
  const baseType = String(paramDef && paramDef.cType ? paramDef.cType : '')
    .replace(/\bconst\b|\bvolatile\b|\brestrict\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return (paramDef.pointerDepth || 0) > 0
    && (baseType === 'char' || baseType === 'signed char' || baseType === 'unsigned char');
}

function isConsoleStringHost(envKey, paramDefs) {
  return /^__console__(log|warn|error)$/.test(String(envKey || ''))
    && Array.isArray(paramDefs)
    && paramDefs.length === 1;
}

function alignUp(value, alignment) {
  const a = Math.max(1, Number(alignment) | 0);
  const v = Number(value) | 0;
  return (v + (a - 1)) & ~(a - 1);
}

function createLinearAllocator(getMemory) {
  let top = 0;

  function ensureCapacity(bytes) {
    const memory = getMemory();
    if (!memory) return 0;
    const need = Math.max(0, Number(bytes) | 0);

    if (top === 0) {
      top = memory.buffer.byteLength;
    }

    if (top + need > memory.buffer.byteLength) {
      const missing = top + need - memory.buffer.byteLength;
      const pages = Math.ceil(missing / 65536);
      if (pages > 0) {
        memory.grow(pages);
      }
    }

    return 1;
  }

  function alloc(bytes, align = 8) {
    const size = Math.max(0, Number(bytes) | 0);
    if (size === 0) return 0;
    if (!ensureCapacity(size + align)) return 0;
    top = alignUp(top, align);
    const ptr = top;
    top += size;
    return ptr >>> 0;
  }

  function free(_ptr) {
    return;
  }

  return { alloc, free };
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
  const allocator = createLinearAllocator(getMemory);

  for (const imp of (hostImports || [])) {
    const { envKey, parts } = imp.hostInfo;
    const paramDefs = imp.paramDefs || [];
    const hasResult = imp.resultType !== null;

    if (envKey === '__malloc') {
      env[envKey] = (bytes) => allocator.alloc(bytes, 8);
      Object.defineProperty(env[envKey], 'name', { value: envKey, configurable: true });
      continue;
    }

    if (envKey === '__free') {
      env[envKey] = (ptr) => {
        allocator.free(ptr);
        return undefined;
      };
      Object.defineProperty(env[envKey], 'name', { value: envKey, configurable: true });
      continue;
    }

    env[envKey] = (...rawArgs) => {
      // Coerce each raw WASM argument to the correct JS value.
      const forceConsoleString = isConsoleStringHost(envKey, paramDefs);
      const jsArgs = paramDefs.map((p, i) => {
        const raw = rawArgs[i] != null ? rawArgs[i] : 0;

        if (isStringParam(p) || (forceConsoleString && i === 0)) {
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
      if (typeof fn !== 'function') {
        return hasResult ? 0 : undefined;
      }
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
    '  function alignUp(value, alignment) {',
    '    const a = Math.max(1, Number(alignment) | 0);',
    '    const v = Number(value) | 0;',
    '    return (v + (a - 1)) & ~(a - 1);',
    '  }',
    '  let __allocTop = 0;',
    '  function __ensureAlloc(bytes) {',
    '    const memory = getMemory();',
    '    if (!memory) return 0;',
    '    const need = Math.max(0, Number(bytes) | 0);',
    '    if (__allocTop === 0) __allocTop = memory.buffer.byteLength;',
    '    if (__allocTop + need > memory.buffer.byteLength) {',
    '      const missing = __allocTop + need - memory.buffer.byteLength;',
    '      const pages = Math.ceil(missing / 65536);',
    '      if (pages > 0) memory.grow(pages);',
    '    }',
    '    return 1;',
    '  }',
    '  function __malloc(bytes) {',
    '    const size = Math.max(0, Number(bytes) | 0);',
    '    if (size === 0) return 0;',
    '    if (!__ensureAlloc(size + 8)) return 0;',
    '    __allocTop = alignUp(__allocTop, 8);',
    '    const ptr = __allocTop;',
    '    __allocTop += size;',
    '    return ptr >>> 0;',
    '  }',
    '  function __free(_ptr) { return; }',
    "  function readCString(ptr) {",
    "    const memory = getMemory();",
    "    if (!memory) return '';",
    "    const mem = new Uint8Array(memory.buffer);",
    "    const offset = ptr >>> 0; let end = offset;",
    "    while (end < mem.length && mem[end] !== 0) end++;",
    "    return new TextDecoder('utf-8').decode(mem.subarray(offset, end));",
    "  }",
    "  function __globalRoot() {",
    "    if (typeof globalThis !== 'undefined') return globalThis;",
    "    if (typeof window !== 'undefined') return window;",
    "    if (typeof self !== 'undefined') return self;",
    "    return {};",
    "  }",
    "  function __resolveHost(parts) {",
    "    let obj = __globalRoot();",
    "    if (!Array.isArray(parts) || parts.length === 0) return { thisValue: null, fn: null };",
    "    for (let i = 0; i < parts.length - 1; i++) {",
    "      if (obj == null) return { thisValue: null, fn: null };",
    "      obj = obj[parts[i]];",
    "    }",
    "    if (obj == null) return { thisValue: null, fn: null };",
    "    return { thisValue: obj, fn: obj[parts[parts.length - 1]] };",
    "  }",
    "  return {"
  ];

  for (const imp of (hostImports || [])) {
    const { envKey, jsExpr, parts } = imp.hostInfo;
    const paramDefs = imp.paramDefs || [];
    const hasResult = imp.resultType !== null;

    if (envKey === '__malloc') {
      lines.push(`    ${JSON.stringify(envKey)}: (p0) => __malloc(p0),`);
      continue;
    }

    if (envKey === '__free') {
      lines.push(`    ${JSON.stringify(envKey)}: (p0) => __free(p0),`);
      continue;
    }

    const paramNames = paramDefs.map((p, i) => `p${i}`);
    const forceConsoleString = isConsoleStringHost(envKey, paramDefs);
    const argExprs = paramDefs.map((p, i) => {
      if (isStringParam(p) || (forceConsoleString && i === 0)) return `readCString(p${i})`;
      return `p${i}`;
    });

    const fnParams = paramNames.join(', ');
    const fnArgs = argExprs.join(', ');

    if (parts.length > 1 && parts[0] === 'new') {
      const ctorPath = JSON.stringify(parts.slice(1));
      const callArgs = fnArgs ? `, ${fnArgs}` : '';
      const missingValue = hasResult ? '0' : 'undefined';
      const returnValue = hasResult ? '(result ?? 0)' : 'undefined';
      lines.push(
        `    ${JSON.stringify(envKey)}: (${fnParams}) => { const target = __resolveHost(${ctorPath}); if (typeof target.fn !== 'function') return ${missingValue}; const result = new target.fn(${fnArgs}); return ${returnValue}; },`
      );
      continue;
    }

    const pathLiteral = JSON.stringify(parts);
    const callArgs = fnArgs ? `, ${fnArgs}` : '';
    const missingValue = hasResult ? '0' : 'undefined';
    const returnValue = hasResult ? '(result ?? 0)' : 'undefined';
    lines.push(
      `    ${JSON.stringify(envKey)}: (${fnParams}) => { const target = __resolveHost(${pathLiteral}); if (typeof target.fn !== 'function') return ${missingValue}; const result = target.fn.call(target.thisValue${callArgs}); return ${returnValue}; },`
    );
  }

  lines.push('  };', '})');
  return lines.join('\n');
}

module.exports = { buildHostEnv, generateHostEnvSource, readCString, isStringParam };
