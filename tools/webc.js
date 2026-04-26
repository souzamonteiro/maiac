#!/usr/bin/env node
'use strict';

/**
 * tools/webc.js
 *
 * MaiaC compiler driver: compiles a C source file and emits:
 *
 *   <output>.wasm   – binary WebAssembly module
 *   <output>.wat    – WebAssembly Text (optional, --wat)
 *   <output>.js     – JS wrapper with a ready-to-use `createImports(getMemory)`
 *                     factory that wires printf + all __extern__ host imports
 *
 * Usage:
 *   node tools/webc.js <input.c> [options]
 *
 * Options:
 *   -o <name>       Base name (without extension) for output files.
 *                   Defaults to the input filename stem.
 *                   Example: -o out/hello  →  out/hello.wasm, out/hello.js
 *   --wat           Also write the WAT source file (<output>.wat)
 *   --no-validate   Skip WAT/WASM validation
 *   --resolve-system-includes  Expand system includes (<...>) via include dirs (default)
 *   --no-system-includes       Disable system include expansion
 *   --run           After compiling, run the WASM module with Node (requires
 *                   a main() export)
 *   -h, --help      Show this help message
 */

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { compileSource }         = require('../compiler/c-compiler.js');
const { generateHostEnvSource } = require('./host-env-builder.js');
const { createPrintfHost }      = require('../src/runtime/stdio.js');
const { buildHostEnv }          = require('./host-env-builder.js');
const { createDefaultHostBuiltins, isLongjmpSignal } = require('../src/runtime/default-host-builtins.js');

const ROOT = path.resolve(__dirname, '..');
const JS_RUNTIME_HEADERS = new Set(['stdio', 'math', 'time', 'locale', 'signal']);
const BROWSER_MEMORY_FILE_STORE = path.join(ROOT, 'src', 'runtime', 'browser-memory-file-store.js');

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function usage() {
  console.log(`
Usage:
  node tools/webc.js <input.c> [options]

Options:
  -o <base>       Output base path (no extension). Default: same dir as input.
  --wat           Also emit a .wat source file alongside the .wasm
  --no-validate   Skip WAT/WASM validation step
  --resolve-system-includes  Enable system include expansion (default)
  --no-system-includes       Disable system include expansion
  --dist          Create a distributable output folder (browser + Node runner)
  --dist-run      Create dist and run dist/node-runner.js immediately
  --out-dir <dir> Dist output directory (used with --dist; default: ./dist)
  -n, --name      Base app name used inside dist (default: input/output stem)
  --run           Execute the compiled module immediately after building
  -h, --help      Show this message

Examples:
  node tools/webc.js compiler/examples/test-extern.c
  node tools/webc.js hello.c -o ./out/hello --wat --run
  node tools/webc.js compiler/examples/test.c --dist --out-dir dist --name test
  node tools/webc.js compiler/examples/test.c --dist-run --out-dir dist --name test
`.trim());
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    input:    null,
    outBase:  null,
    wat:      false,
    validate: true,
    resolveSystemIncludes: true,
    dist:     false,
    distRun:  false,
    outDir:   null,
    distName: null,
    run:      false,
    help:     false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-h' || a === '--help') { opts.help = true; }
    else if (a === '--wat')           { opts.wat = true; }
    else if (a === '--no-validate')   { opts.validate = false; }
    else if (a === '--resolve-system-includes') { opts.resolveSystemIncludes = true; }
    else if (a === '--no-system-includes')      { opts.resolveSystemIncludes = false; }
    else if (a === '--dist')          { opts.dist = true; }
    else if (a === '--dist-run')      { opts.dist = true; opts.distRun = true; }
    else if (a === '--out-dir') {
      i++;
      opts.outDir = args[i] || null;
      opts.dist = true;
    }
    else if (a === '-n' || a === '--name') {
      i++;
      opts.distName = (args[i] || '').trim() || null;
      opts.dist = true;
    }
    else if (a === '--run')           { opts.run = true; }
    else if (a === '-o') {
      i++;
      opts.outBase = args[i];
    } else if (!a.startsWith('-')) {
      opts.input = a;
    } else {
      console.error(`Unknown option: ${a}`);
      process.exit(1);
    }
  }

  return opts;
}

function extractHeaderLibraries(source) {
  const includeRegex = /^\s*#\s*include\s*[<"]([^">]+)[">]/gm;
  const libraries = [];
  const seen = new Set();
  let match;

  while ((match = includeRegex.exec(String(source || ''))) !== null) {
    const includePath = String(match[1] || '').trim();
    if (!includePath.toLowerCase().endsWith('.h')) {
      continue;
    }
    const headerBase = path.basename(includePath, '.h');
    if (!headerBase || seen.has(headerBase)) {
      continue;
    }
    seen.add(headerBase);
    libraries.push(headerBase);
  }

  return libraries;
}

function runEntrypointWithLongjmpResume(entry, maxAttempts = 32) {
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

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function writeBrowserRunner(outDir, appName) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${appName} Browser Runner</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4efe8;
      --panel: #fffaf2;
      --ink: #1f1c19;
      --line: #d9cbb8;
      --accent: #9a3412;
    }
    body {
      margin: 0;
      padding: 24px;
      background: radial-gradient(circle at top, #fff7ed 0%, var(--bg) 55%, #efe4d5 100%);
      color: var(--ink);
      font: 16px/1.45 "Iowan Old Style", "Palatino Linotype", serif;
    }
    main {
      max-width: 980px;
      margin: 0 auto;
      background: color-mix(in srgb, var(--panel) 92%, white 8%);
      border: 1px solid var(--line);
      box-shadow: 0 18px 50px rgba(80, 50, 20, 0.08);
      padding: 24px;
    }
    h1 { margin-top: 0; font-size: 2rem; }
    p { margin: 0 0 16px; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    button {
      border: 0;
      background: var(--accent);
      color: white;
      padding: 10px 16px;
      cursor: pointer;
      font: inherit;
    }
    label { display: inline-flex; align-items: center; gap: 8px; }
    pre {
      min-height: 280px;
      margin: 0;
      padding: 16px;
      white-space: pre-wrap;
      background: #201a17;
      color: #f8efe2;
      overflow: auto;
    }
    .muted { color: #6b6258; }
  </style>
</head>
<body>
  <main>
    <h1>${appName}</h1>
    <p>Browser runner generated by MaiaC distribution packaging. StdIO file persistence is backed by <code>localStorage</code>.</p>
    <div class="row">
      <button id="run">Run</button>
      <button id="clear-vfs">Clear VFS</button>
      <label><input id="persist-vfs" type="checkbox" checked> Persist stdio VFS in localStorage</label>
    </div>
    <p id="status" class="muted">Idle</p>
    <pre id="output"></pre>
  </main>

  <script src="./browser-memory-file-store.js"></script>
  <script src="./${appName}.js?v=${Date.now()}"></script>
  <script>
    (function () {
      const runBtn = document.getElementById('run');
      const clearBtn = document.getElementById('clear-vfs');
      const persistBox = document.getElementById('persist-vfs');
      const statusEl = document.getElementById('status');
      const outputEl = document.getElementById('output');
      const storagePrefix = 'maiac:${appName}:vfs:';

      function write(text) {
        outputEl.textContent += String(text);
        outputEl.scrollTop = outputEl.scrollHeight;
      }

      function isLongjmpLike(error) {
        if (typeof isLongjmpSignal === 'function' && isLongjmpSignal(error)) {
          return true;
        }
        return !!(error && typeof error === 'object' && error.__maiacLongjmp === true);
      }

      function runEntryWithLongjmpResume(entry, maxAttempts) {
        const attempts = Number.isInteger(maxAttempts) && maxAttempts > 0 ? maxAttempts : 32;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
          try {
            return entry();
          } catch (error) {
            if (isLongjmpLike(error)) {
              continue;
            }
            throw error;
          }
        }
        throw new Error('Exceeded longjmp resume limit (' + attempts + ')');
      }

      function clearStoredFiles() {
        const keys = [];
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (key && key.indexOf(storagePrefix) === 0) {
            keys.push(key);
          }
        }
        keys.forEach((key) => localStorage.removeItem(key));
      }

      function createMachineAwareBridgeResolver(runtimeBridgeEntries, availableBridgeSymbols) {
        const pointerToBridge = new Map();
        const bridgeToPointer = new Map();

        return function resolveResumeBridge(event) {
          if (!event || availableBridgeSymbols.length === 0) {
            return null;
          }

          const stateId = Number(event.stateId) | 0;
          for (const entry of runtimeBridgeEntries) {
            if (!entry || typeof entry.bridgeSymbol !== 'string') {
              continue;
            }

            const start = entry.scheduleStateStart;
            const end = entry.scheduleStateEnd;
            if (Number.isInteger(start) && Number.isInteger(end) && stateId >= start && stateId <= end) {
              return entry.bridgeSymbol;
            }
          }

          const ptr = Number(event.smPtr) >>> 0;
          const existing = pointerToBridge.get(ptr);
          if (typeof existing === 'string') {
            return existing;
          }

          let index = ptr % availableBridgeSymbols.length;
          for (let attempt = 0; attempt < availableBridgeSymbols.length; attempt += 1) {
            const candidate = availableBridgeSymbols[index];
            const owner = bridgeToPointer.get(candidate);
            if (owner == null || owner === ptr) {
              pointerToBridge.set(ptr, candidate);
              bridgeToPointer.set(candidate, ptr);
              return candidate;
            }
            index = (index + 1) % availableBridgeSymbols.length;
          }

          return null;
        };
      }

      async function runApp() {
        outputEl.textContent = '';
        statusEl.textContent = 'Running...';

        try {
          const manifestResponse = await fetch('./manifest.json');
          const manifest = await manifestResponse.json();
          const runtimeBridgeMeta = manifest
            && manifest.asyncRuntime
            && Array.isArray(manifest.asyncRuntime.resumeBridges)
            ? manifest.asyncRuntime.resumeBridges
            : [];
          const runtimeBridgeEntries = runtimeBridgeMeta.map((item) => ({
            bridgeSymbol: item && typeof item.bridgeSymbol === 'string' ? item.bridgeSymbol : null,
            scheduleStateStart: Number.isInteger(item.scheduleStateStart) ? item.scheduleStateStart : null,
            scheduleStateEnd: Number.isInteger(item.scheduleStateEnd) ? item.scheduleStateEnd : null
          })).filter((item) => typeof item.bridgeSymbol === 'string' && item.bridgeSymbol.length > 0);
          const availableBridgeSymbols = runtimeBridgeEntries.map((item) => item.bridgeSymbol);
          const response = await fetch('./${appName}.wasm');
          const bytes = await response.arrayBuffer();
          let memoryRef = null;
          const imports = createImports(
            function () { return memoryRef; },
            {
              write,
              forceMemoryFiles: true,
              memoryFileStore: persistBox.checked
                ? MaiaMemoryFileStore.createLocalStorageMemoryFileStore({ prefix: storagePrefix })
                : MaiaMemoryFileStore.createMapMemoryFileStore(new Map())
            }
          );

          const copiedLibraries = Array.isArray(manifest.copiedLibraries)
            ? manifest.copiedLibraries
            : [];

          for (const libName of copiedLibraries) {
            const libResponse = await fetch('./' + libName + '.wasm');
            const libBytes = await libResponse.arrayBuffer();
            const libInstantiated = await WebAssembly.instantiate(libBytes, imports);
            const libInstance = libInstantiated.instance || libInstantiated;

            if (!memoryRef && libInstance.exports && libInstance.exports.memory) {
              memoryRef = libInstance.exports.memory;
            }

            const env = imports && imports.env ? imports.env : {};
            Object.entries(libInstance.exports || {}).forEach(function (entry) {
              const exportName = entry[0];
              const exportValue = entry[1];
              if (typeof exportValue === 'function' && env[exportName] == null) {
                env[exportName] = exportValue;
              }
            });
          }

          const instantiated = await WebAssembly.instantiate(bytes, imports);
          const instance = instantiated.instance || instantiated;
          memoryRef = instance.exports.memory || null;

          const exceptionRuntime = imports
            && imports.env
            && imports.env.__exceptionRuntime
            && imports.env.__exceptionRuntime.scheduler
            ? imports.env.__exceptionRuntime
            : null;

          if (exceptionRuntime && exceptionRuntime.scheduler && typeof exceptionRuntime.scheduler.setAutoResumeResolver === 'function') {
            exceptionRuntime.scheduler.setAutoResumeResolver(
              instance.exports,
              createMachineAwareBridgeResolver(runtimeBridgeEntries, availableBridgeSymbols)
            );
          }

          const entry = instance.exports.main || instance.exports.test_entry;
          if (typeof entry !== 'function') {
            throw new Error('No main() or test_entry export found');
          }

          const result = runEntryWithLongjmpResume(entry);
          write('\\n[webc] program returned: ' + result + '\\n');
          statusEl.textContent = 'Done';
        } catch (error) {
          write('\\n[runner-error] ' + error.message + '\\n');
          statusEl.textContent = 'Error';
        }
      }

      runBtn.addEventListener('click', runApp);
      clearBtn.addEventListener('click', function () {
        clearStoredFiles();
        statusEl.textContent = 'Persisted VFS cleared';
      });
    })();
  </script>
</body>
</html>
`;

  fs.writeFileSync(path.join(outDir, 'browser-runner.html'), html, 'utf8');
}

function writeNodeRunnerJs(outDir, appName) {
  const source = `#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const app = require('./${appName}.js');

function createMachineAwareBridgeResolver(runtimeBridgeEntries, availableBridgeSymbols) {
  const pointerToBridge = new Map();
  const bridgeToPointer = new Map();

  return function resolveResumeBridge(event) {
    if (!event || availableBridgeSymbols.length === 0) {
      return null;
    }

    const stateId = Number(event.stateId) | 0;
    for (const entry of runtimeBridgeEntries) {
      if (!entry || typeof entry.bridgeSymbol !== 'string') {
        continue;
      }

      const start = entry.scheduleStateStart;
      const end = entry.scheduleStateEnd;
      if (Number.isInteger(start) && Number.isInteger(end) && stateId >= start && stateId <= end) {
        return entry.bridgeSymbol;
      }
    }

    const ptr = Number(event.smPtr) >>> 0;
    const existing = pointerToBridge.get(ptr);
    if (typeof existing === 'string') {
      return existing;
    }

    let index = ptr % availableBridgeSymbols.length;
    for (let attempt = 0; attempt < availableBridgeSymbols.length; attempt += 1) {
      const candidate = availableBridgeSymbols[index];
      const owner = bridgeToPointer.get(candidate);
      if (owner == null || owner === ptr) {
        pointerToBridge.set(ptr, candidate);
        bridgeToPointer.set(candidate, ptr);
        return candidate;
      }
      index = (index + 1) % availableBridgeSymbols.length;
    }

    return null;
  };
}

async function main() {
  const manifestPath = path.join(__dirname, 'manifest.json');
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : {};
  const runtimeBridgeMeta = manifest
    && manifest.asyncRuntime
    && Array.isArray(manifest.asyncRuntime.resumeBridges)
    ? manifest.asyncRuntime.resumeBridges
    : [];
  const runtimeBridgeEntries = runtimeBridgeMeta.map((item) => ({
    bridgeSymbol: item && typeof item.bridgeSymbol === 'string' ? item.bridgeSymbol : null,
    scheduleStateStart: Number.isInteger(item.scheduleStateStart) ? item.scheduleStateStart : null,
    scheduleStateEnd: Number.isInteger(item.scheduleStateEnd) ? item.scheduleStateEnd : null
  })).filter((item) => typeof item.bridgeSymbol === 'string' && item.bridgeSymbol.length > 0);
  const availableBridgeSymbols = runtimeBridgeEntries.map((item) => item.bridgeSymbol);
  const resolveResumeExportName = createMachineAwareBridgeResolver(runtimeBridgeEntries, availableBridgeSymbols);

  const wasmPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(__dirname, '${appName}.wasm');
  const exitCode = await app.run(wasmPath, { resolveResumeExportName });
  process.stdout.write('\\n[node-runner] program returned: ' + exitCode + '\\n');
  process.exitCode = Number.isInteger(exitCode) ? exitCode : 0;
}

main().catch((error) => {
  console.error('[node-runner] ' + error.message);
  process.exit(1);
});
`;

  const outFile = path.join(outDir, 'node-runner.js');
  fs.writeFileSync(outFile, source, 'utf8');
  fs.chmodSync(outFile, 0o755);
}

function writeNodeRunnerShell(outDir, appName) {
  const source = `#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd -P)"
DEFAULT_WASM="$SCRIPT_DIR/${appName}.wasm"

if [[ $# -eq 0 ]]; then
  exec node "$SCRIPT_DIR/node-runner.js" "$DEFAULT_WASM"
fi

exec node "$SCRIPT_DIR/node-runner.js" "$@"
`;

  const outFile = path.join(outDir, 'node-runner.sh');
  fs.writeFileSync(outFile, source, 'utf8');
  fs.chmodSync(outFile, 0o755);
}

function findLibraryWasm(sourceDir, libName) {
  const candidates = [
    path.join(sourceDir, `${libName}.wasm`),
    path.join(ROOT, 'lib', `${libName}.wasm`)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function maybeCopyArtifact(src, dst) {
  if (!fs.existsSync(src)) {
    return;
  }
  if (path.resolve(src) === path.resolve(dst)) {
    return;
  }
  copyFile(src, dst);
}

function createDistPackage(opts) {
  const {
    inputPath,
    source,
    outBase,
    wasmOut,
    jsOut,
    watOut,
    requiredLibraries,
    emitWat,
    distOutDir,
    distName,
  } = opts;

  const sourceDir = path.dirname(inputPath);
  const appName = distName || path.basename(outBase);
  const outDir = distOutDir || path.join(process.cwd(), 'dist');

  fs.mkdirSync(outDir, { recursive: true });

  const appWasm = path.join(outDir, `${appName}.wasm`);
  const appJs = path.join(outDir, `${appName}.js`);
  const appWat = path.join(outDir, `${appName}.wat`);

  maybeCopyArtifact(wasmOut, appWasm);
  maybeCopyArtifact(jsOut, appJs);
  if (emitWat) {
    maybeCopyArtifact(watOut, appWat);
  }

  copyFile(BROWSER_MEMORY_FILE_STORE, path.join(outDir, 'browser-memory-file-store.js'));

  const linkedLibs = requiredLibraries;
  const copiedLibs = [];
  const runtimeProvided = [];
  const missingLibs = [];

  for (const libName of linkedLibs) {
    const libSrc = findLibraryWasm(sourceDir, libName);
    if (!libSrc) {
      if (JS_RUNTIME_HEADERS.has(libName)) {
        runtimeProvided.push(libName);
      } else {
        missingLibs.push(libName);
      }
      continue;
    }

    const libDst = path.join(outDir, `${libName}.wasm`);

    if (path.resolve(libDst) === path.resolve(appWasm) && path.resolve(libSrc) !== path.resolve(libDst)) {
      continue;
    }

    copyFile(libSrc, libDst);
    copiedLibs.push({ name: libName, source: libSrc, target: libDst });
  }

  writeBrowserRunner(outDir, appName);
  writeNodeRunnerJs(outDir, appName);
  writeNodeRunnerShell(outDir, appName);

  const manifest = {
    generatedAt: new Date().toISOString(),
    input: inputPath,
    outDir,
    appName,
    artifacts: {
      wasm: `${appName}.wasm`,
      wrapper: `${appName}.js`,
      wat: emitWat ? `${appName}.wat` : null,
      browserRunner: 'browser-runner.html',
      browserMemoryFileStore: 'browser-memory-file-store.js',
      nodeRunner: 'node-runner.js',
      nodeRunnerShell: 'node-runner.sh'
    },
    linkedLibraries: linkedLibs,
    copiedLibraries: copiedLibs.map((item) => item.name),
    runtimeProvidedHeaders: runtimeProvided,
    missingLibraries: missingLibs,
    sourceBytes: Buffer.byteLength(String(source || ''), 'utf8')
  };

  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`[webc] dist wasm           → ${appWasm}`);
  console.log(`[webc] dist wrapper        → ${appJs}`);
  if (emitWat) {
    console.log(`[webc] dist wat            → ${appWat}`);
  }
  console.log(`[webc] dist browser runner → ${path.join(outDir, 'browser-runner.html')}`);
  console.log(`[webc] dist node runner    → ${path.join(outDir, 'node-runner.js')}`);
  console.log(`[webc] dist node wrapper   → ${path.join(outDir, 'node-runner.sh')}`);
  console.log(`[webc] dist linked libs copied: ${copiedLibs.length}`);
  if (runtimeProvided.length > 0) {
    console.log(`[webc] dist runtime-provided headers: ${runtimeProvided.join(', ')}`);
  }
  if (missingLibs.length > 0) {
    console.log(`[webc] dist missing libs (not copied): ${missingLibs.join(', ')}`);
  }
  console.log(`[webc] dist manifest       → ${path.join(outDir, 'manifest.json')}`);

  return {
    outDir,
    appName,
    nodeRunnerPath: path.join(outDir, 'node-runner.js'),
    nodeRunnerShellPath: path.join(outDir, 'node-runner.sh')
  };
}

function runDistNodeRunner(distInfo) {
  const runnerPath = distInfo && distInfo.nodeRunnerPath ? distInfo.nodeRunnerPath : null;
  if (!runnerPath || !fs.existsSync(runnerPath)) {
    throw new Error('Dist node runner was not generated');
  }

  console.log(`[webc] dist-run → node ${runnerPath}`);
  const result = spawnSync(process.execPath, [runnerPath], {
    stdio: 'inherit',
    env: process.env,
    cwd: distInfo.outDir || process.cwd()
  });

  if (result.status !== 0) {
    throw new Error(`Dist node runner failed with exit code ${result.status}`);
  }
}

// ---------------------------------------------------------------------------
// JS wrapper generator
// ---------------------------------------------------------------------------

/**
 * Generates the contents of the <output>.js wrapper file.
 *
 * The emitted module exports:
 *   createImports(getMemory)  – returns a WebAssembly imports object
 *   run(wasmPath)             – convenience: loads + instantiates the .wasm
 *                               and calls main()
 */
function generateWrapper(hostImports, requiredLibraries) {
  const hostEnvSrc = generateHostEnvSource(hostImports);
  const serializedLibraries = JSON.stringify(requiredLibraries || []);

  function sanitizeRuntimeModuleSource(source, options = {}) {
    let out = String(source || '');
    out = out.replace(/^'use strict';\s*/m, '');

    if (options.stripRequireSprintf) {
      out = out.replace(/^const\s*\{\s*sprintf\s*,\s*parseFormatSpec\s*\}\s*=\s*require\('\.\/sprintf\.js'\);\s*/m, '');
    }

    if (options.stripRequireC89Hosts) {
      out = out.replace(/^const\s*\{\s*createC89JsHosts\s*\}\s*=\s*require\('\.\/c89-js-hosts\.js'\);\s*/m, '');
    }

    // Remove trailing CommonJS exports in both multiline and inline forms.
    out = out.replace(/\nmodule\.exports\s*=\s*\{[\s\S]*?\};?\s*$/m, '\n');
    out = out.replace(/\nmodule\.exports\.[^\n]*\n?/g, '\n');
    out = out.replace(/\nmodule\.exports\s*=\s*[^\n]*\n?/g, '\n');

    return out.trimEnd();
  }

  // Read the real sprintf/printf-host sources so the wrapper is self-contained
  // and handles all C format specifiers (width, precision, %lu, %.2f, etc.).
  const sprintfSrc = sanitizeRuntimeModuleSource(
    fs.readFileSync(path.join(__dirname, '..', 'src', 'runtime', 'sprintf.js'), 'utf8')
  );
  const stdioRuntimeSrc = sanitizeRuntimeModuleSource(
    fs.readFileSync(path.join(__dirname, '..', 'src', 'runtime', 'stdio.js'), 'utf8'),
    { stripRequireSprintf: true }
  );
  const defaultHostBuiltinsSrc = sanitizeRuntimeModuleSource(
    fs.readFileSync(path.join(__dirname, '..', 'src', 'runtime', 'default-host-builtins.js'), 'utf8'),
    { stripRequireC89Hosts: true }
  );
  const c89JsHostsSrc = sanitizeRuntimeModuleSource(
    fs.readFileSync(path.join(__dirname, '..', 'src', 'runtime', 'c89-js-hosts.js'), 'utf8')
  );

  return `\
// Auto-generated by webc – do not edit manually.
// Re-run  webc.js <source.c>  to regenerate.
'use strict';

// ---------- sprintf (full C format support: width, precision, %lu, %.2f …) ----------
${sprintfSrc}

// ---------- stdio bridge (variadic C printf → stdout) ----------
${stdioRuntimeSrc}

// ---------- default WASM host builtins ----------
${defaultHostBuiltinsSrc}

// ---------- C89 JS host implementations ----------
${c89JsHostsSrc}

// ---------- host-extern wrappers (auto-generated from source) ----------
const _buildHostEnv = ${hostEnvSrc};
const _linkedLibraries = ${serializedLibraries};

function _mergeLibraryExports(env, instance) {
  const exportsObj = (instance && instance.exports) ? instance.exports : null;
  const entries = exportsObj ? Object.entries(exportsObj) : [];
  for (const pair of entries) {
    const name = pair[0];
    const value = pair[1];
    if (typeof value === 'function' && env[name] == null) {
      env[name] = value;
    }
  }
}

async function _loadLinkedLibraries(baseDir, imports) {
  if (!_linkedLibraries.length) {
    return [];
  }

  const fs = require('fs');
  const path = require('path');
  const loaded = [];
  const env = (imports && imports.env) ? imports.env : {};

  for (const libName of _linkedLibraries) {
    const wasmPath = path.join(baseDir, libName + '.wasm');
    if (!fs.existsSync(wasmPath)) {
      continue;
    }
    const bytes = fs.readFileSync(wasmPath);
    const instantiated = await WebAssembly.instantiate(bytes, imports);
    const instance = instantiated && (instantiated.instance || instantiated);
    _mergeLibraryExports(env, instance);
    loaded.push({ name: libName, path: wasmPath, instance });
  }

  return loaded;
}

function _runEntrypointWithLongjmpResume(entry, maxAttempts = 32) {
  const isLongjmpLike = (error) => {
    if (typeof isLongjmpSignal === 'function' && isLongjmpSignal(error)) {
      return true;
    }
    return !!(error && typeof error === 'object' && error.__maiacLongjmp === true);
  };

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return entry();
    } catch (error) {
      if (isLongjmpLike(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error('Exceeded longjmp resume limit (' + maxAttempts + ')');
}

// ---------- public API ----------

/**
 * Create a WebAssembly imports object for this module.
 *
 * @param {() => WebAssembly.Memory | null} getMemory
 * @param {{ write?: (s: string) => void }} [opts]
 * @returns {WebAssembly.Imports}
 */
function createImports(getMemory, opts = {}) {
  const write = opts.write || (s => process.stdout.write(s));
  const defaultBuiltins = createDefaultHostBuiltins(getMemory, opts);

  return {
    env: {
      printf: createPrintfHost({ getMemory, write }),
      ...defaultBuiltins,
      ..._buildHostEnv(getMemory),
    }
  };
}

/**
 * Load, instantiate and run the compiled WASM module (Node.js).
 *
 * @param {string} wasmPath  – path to the .wasm file
 * @returns {Promise<number>} – exit code returned by main()
 */
async function run(wasmPath) {
  const fs   = require('fs');
  const path = require('path');
  const bytes = fs.readFileSync(wasmPath);
  let memoryRef = null;
  const imports = createImports(() => memoryRef);

  const baseDir = path.dirname(path.resolve(wasmPath));
  await _loadLinkedLibraries(baseDir, imports);

  const { instance } = await WebAssembly.instantiate(bytes, imports);
  memoryRef = instance.exports.memory || null;
  const entry = instance.exports.main || instance.exports.test_entry;
  if (typeof entry !== 'function') throw new Error('No main() export found');
  return _runEntrypointWithLongjmpResume(entry);
}

if (typeof module !== 'undefined') {
  module.exports = { createImports, run };
}

// When executed directly (node <file>.js [wasm-path]), run main() immediately.
if (typeof require !== 'undefined' && require.main === module) {
  const _path  = require('path');
  const _wasm  = process.argv[2]
    || _path.join(__dirname, _path.basename(__filename, '.js') + '.wasm');
  run(_wasm)
    .then((code) => { process.stdout.write('\\n[webc] program returned: ' + code + '\\n'); process.exitCode = code; })
    .catch((err) => { console.error('[webc] ' + err.message); process.exitCode = 1; });
}
`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv);

  if (opts.help) { usage(); return; }
  if (!opts.input) { usage(); process.exit(1); }

  const inputPath = path.resolve(opts.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: file not found: ${inputPath}`);
    process.exit(1);
  }

  // Derive output base path
  const stem    = path.basename(inputPath, path.extname(inputPath));
  const outBase = opts.outBase
    ? path.resolve(opts.outBase)
    : path.join(path.dirname(inputPath), stem);

  // Ensure output directory exists
  const outDir = path.dirname(outBase);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const wasmOut = outBase + '.wasm';
  const watOut  = outBase + '.wat';
  const jsOut   = outBase + '.js';
  const distOutDir = opts.outDir ? path.resolve(opts.outDir) : null;

  // ------------------------------------------------------------------
  // Compile
  // ------------------------------------------------------------------
  const source = fs.readFileSync(inputPath, 'utf8');
  const requiredLibraries = extractHeaderLibraries(source);

  let result;
  try {
    result = compileSource(source, {
      sourcePath: inputPath,
      validate:   opts.validate,
      printWat:   false,
      resolveSystemIncludes: opts.resolveSystemIncludes,
    });
  } catch (err) {
    console.error(`[webc] Compilation error: ${err.message}`);
    process.exit(1);
  }

  if (result.validationError) {
    console.error(`[webc] Validation error: ${result.validationError.message}`);
    process.exit(1);
  }

  if (!result.wasm) {
    console.error('[webc] Compiler did not produce a WASM binary. Re-run with --no-validate to check the WAT.');
    process.exit(1);
  }

  // ------------------------------------------------------------------
  // Write outputs
  // ------------------------------------------------------------------
  fs.writeFileSync(wasmOut, Buffer.from(result.wasm));
  console.log(`[webc] wasm  → ${wasmOut}`);

  if (opts.wat && result.wat) {
    fs.writeFileSync(watOut, result.wat, 'utf8');
    console.log(`[webc] wat   → ${watOut}`);
  }

  const wrapperSrc = generateWrapper(result.hostImports || [], requiredLibraries);
  fs.writeFileSync(jsOut, wrapperSrc, 'utf8');
  console.log(`[webc] js    → ${jsOut}`);

  let distInfo = null;
  if (opts.dist) {
    distInfo = createDistPackage({
      inputPath,
      source,
      outBase,
      wasmOut,
      jsOut,
      watOut,
      requiredLibraries,
      emitWat: !!opts.wat,
      distOutDir,
      distName: opts.distName,
    });

    if (opts.distRun) {
      runDistNodeRunner(distInfo);
    }
  }

  // ------------------------------------------------------------------
  // Optionally run
  // ------------------------------------------------------------------
  if (opts.run) {
    console.log('[webc] running...');
    let memoryRef = null;
    const hostEnv = buildHostEnv(result.hostImports, { getMemory: () => memoryRef });
    const defaultBuiltins = createDefaultHostBuiltins(() => memoryRef);
    const imports = {
      env: {
        printf: createPrintfHost({
          getMemory: () => memoryRef,
          write: (text) => process.stdout.write(String(text)),
        }),
        ...defaultBuiltins,
        ...hostEnv,
      }
    };

    for (const libName of requiredLibraries) {
      const libPath = path.join(path.dirname(jsOut), `${libName}.wasm`);
      if (!fs.existsSync(libPath)) {
        continue;
      }

      const libBytes = fs.readFileSync(libPath);
      const libInstantiated = await WebAssembly.instantiate(libBytes, imports);
      const libInstance = libInstantiated.instance || libInstantiated;
      const exported = libInstance && libInstance.exports ? Object.entries(libInstance.exports) : [];

      for (const entryPair of exported) {
        const exportName = entryPair[0];
        const exportValue = entryPair[1];
        if (typeof exportValue === 'function' && imports.env[exportName] == null) {
          imports.env[exportName] = exportValue;
        }
      }

      if (!memoryRef && libInstance.exports && libInstance.exports.memory) {
        memoryRef = libInstance.exports.memory;
      }
    }

    const bytes = Buffer.from(result.wasm);
    const { instance } = await WebAssembly.instantiate(bytes, imports);
    memoryRef = instance.exports.memory || null;
    const entry = instance.exports.main || instance.exports.test_entry;
    if (typeof entry !== 'function') {
      console.error('[webc] No main() export found in compiled module');
      process.exit(1);
    }
    const exitCode = runEntrypointWithLongjmpResume(entry);
    process.stdout.write(`\n[webc] program returned: ${exitCode}\n`);
    process.exitCode = exitCode;
  }
}

main().catch((err) => {
  console.error(`[webc] ${err.message}`);
  process.exit(1);
});
