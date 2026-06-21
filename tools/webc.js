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

const { compileSource, parseCSource } = require('../compiler/c-compiler.js');
const { printTree } = require('../compiler/parse-tree-collector.js');
const { generateHostEnvSource } = require('./host-env-builder.js');
const { createPrintfHost }      = require('../src/runtime/stdio.js');
const { buildHostEnv }          = require('./host-env-builder.js');
const { createDefaultHostBuiltins, isLongjmpSignal } = require('../src/runtime/default-host-builtins.js');
const { createC89JsHosts } = require('../src/runtime/c89-js-hosts.js');

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
  --parser-only    Parse only (skip WAT/WASM generation)
  --ast            Print parse tree
  --print-json     Print parse tree JSON
  --print-xml      Print parse tree XML
  --json-out <f>   Save parse tree JSON to file
  --xml-out <f>    Save parse tree XML to file
  --dist          Create a distributable output folder (browser + Node runner)
  --dist-run      Create dist and run dist/node-runner.js immediately
  --out-dir <dir> Dist output directory (used with --dist; default: ./dist)
  -n, --name      Base app name used inside dist (default: input/output stem)
  --run           Execute the compiled module immediately after building
  -h, --help      Show this message

Examples:
  node tools/webc.js compiler/examples/test-extern.c
  node tools/webc.js hello.c -o ./out/hello --wat --run
  node tools/webc.js compiler/examples/test.c --parser-only --print-json
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
    parserOnly: false,
    showAst: false,
    printJson: false,
    printXml: false,
    jsonOut: null,
    xmlOut: null,
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
    else if (a === '--parser-only')   { opts.parserOnly = true; }
    else if (a === '--ast')           { opts.showAst = true; }
    else if (a === '--print-json')    { opts.printJson = true; }
    else if (a === '--print-xml')     { opts.printXml = true; }
    else if (a === '--json-out') {
      i++;
      opts.jsonOut = args[i] || null;
    }
    else if (a === '--xml-out') {
      i++;
      opts.xmlOut = args[i] || null;
    }
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

function writeOutputFile(filePath, content) {
  const absolutePath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content);
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
  <script>
    (function () {
      const defaultAppName = ${JSON.stringify(appName)};
      const params = new URLSearchParams(window.location.search);
      const requestedWasm = params.get('wasm');
      const requestedApp = params.get('app');
      const selectedStem = requestedApp
        || (requestedWasm ? requestedWasm.replace(/^.*\\//, '').replace(/\\.wasm$/i, '') : '')
        || defaultAppName;
      const storagePrefix = 'maiac:' + selectedStem + ':vfs:';
      const runBtn = document.getElementById('run');
      const clearBtn = document.getElementById('clear-vfs');
      const persistBox = document.getElementById('persist-vfs');
      const statusEl = document.getElementById('status');
      const outputEl = document.getElementById('output');

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

      function loadScript(src) {
        return new Promise(function (resolve, reject) {
          const script = document.createElement('script');
          script.src = src;
          script.async = false;
          script.onload = function () { resolve(); };
          script.onerror = function () { reject(new Error('Failed to load ' + src)); };
          document.head.appendChild(script);
        });
      }

      async function loadManifestForStem(stem) {
        const candidates = ['./' + stem + '.manifest.json', './manifest.json'];
        for (const candidate of candidates) {
          try {
            const response = await fetch(candidate, { cache: 'no-store' });
            if (response.ok) {
              return await response.json();
            }
          } catch (_) {}
        }
        return {};
      }

      async function runApp() {
        outputEl.textContent = '';
        statusEl.textContent = 'Running...';

        try {
          const manifest = await loadManifestForStem(selectedStem);
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
          const wasmAsset = requestedWasm || ((manifest.artifacts && manifest.artifacts.wasm) || (selectedStem + '.wasm'));
          const wrapperAsset = (manifest.artifacts && manifest.artifacts.wrapper) || (selectedStem + '.js');
          await loadScript('./' + wrapperAsset + '?v=' + Date.now());
          if (typeof createImports !== 'function') {
            throw new Error('Wrapper did not expose createImports(): ' + wrapperAsset);
          }

          const response = await fetch('./' + wasmAsset);
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

function loadAppModule(wasmPath) {
  const stem = path.basename(wasmPath, '.wasm');
  const wrapperPath = path.join(__dirname, stem + '.js');
  if (!fs.existsSync(wrapperPath)) {
    throw new Error('Wrapper not found for ' + path.basename(wasmPath) + ': ' + wrapperPath);
  }
  return require(wrapperPath);
}

function loadManifestForStem(stem) {
  const manifestCandidates = [
    path.join(__dirname, stem + '.manifest.json'),
    path.join(__dirname, 'manifest.json')
  ];

  for (const manifestPath of manifestCandidates) {
    if (fs.existsSync(manifestPath)) {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    }
  }

  return {};
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

async function main() {
  const wasmPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(__dirname, '${appName}.wasm');
  const stem = path.basename(wasmPath, '.wasm');
  const manifest = loadManifestForStem(stem);
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
  const app = loadAppModule(wasmPath);
  // Args after the wasm path are forwarded to the C program as argv[1+].
  const _progStem = stem;
  const _distDir = path.dirname(wasmPath);
  const _appDir = path.basename(_distDir) === 'dist' ? path.dirname(_distDir) : _distDir;
  const _progName  = _progStem;
  const _extraArgs = process.argv.slice(3);
  const _argv = [_progName].concat(_extraArgs);
  const _env  = (() => {
    try {
      const { spawnSync } = require('child_process');
      const out = spawnSync('env', ['-0'], { encoding: 'utf8' });
      if (out && out.status === 0 && typeof out.stdout === 'string') {
        return out.stdout.split('\0').filter((entry) => entry && entry.includes('='));
      }
    } catch (_) {}
    return Object.keys(process.env).map(function(k) { return k + '=' + process.env[k]; });
  })();
  const exitCode = await app.run(wasmPath, { resolveResumeExportName, argv: _argv, env: _env });
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
  fs.writeFileSync(path.join(outDir, `${appName}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

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
  console.log(`[webc] dist app manifest   → ${path.join(outDir, `${appName}.manifest.json`)}`);

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
  const c89Hosts = createC89JsHosts(getMemory, opts);

  return {
    env: {
      printf: createPrintfHost({ getMemory, write }),
      ...defaultBuiltins,
      ...c89Hosts,
      ..._buildHostEnv(getMemory, { write }),
    }
  };
}

/**
 * Load, instantiate and run the compiled WASM module (Node.js).
 *
 * @param {string} wasmPath  – path to the .wasm file
 * @returns {Promise<number>} – exit code returned by main()
 */
// Write argc/argv/env into WASM linear memory and return { argc, argvPtr, envPtr }.
// Strings are packed at the top of linear memory. The buffer grows when needed
// so large host environments do not overflow a fixed-size region.
function _buildArgvInMemory(memory, argv, env) {
  const MIN_SAFE_BASE = 32768;

  function alignedStrBytes(s) {
    const raw = String(s).length + 1;
    return (raw + 3) & ~3;
  }

  const argvStrings = argv.map(String);
  const envStrings = env.map(String);
  const stringsBytes = argvStrings.reduce((n, s) => n + alignedStrBytes(s), 0)
    + envStrings.reduce((n, s) => n + alignedStrBytes(s), 0);
  const ptrBytes = (argvStrings.length + 1 + envStrings.length + 1) * 4;
  const totalBytes = stringsBytes + ptrBytes + 8;

  while ((memory.buffer.byteLength - totalBytes) < MIN_SAFE_BASE) {
    memory.grow(1);
  }

  const mem8  = new Uint8Array(memory.buffer);
  const memSz = memory.buffer.byteLength;
  let ptr = (memSz - totalBytes) & ~3;

  function writeStr(s) {
    const start = ptr;
    for (let i = 0; i < s.length; i++) { mem8[ptr++] = s.charCodeAt(i) & 0xFF; }
    mem8[ptr++] = 0;
    // Align to 4 bytes.
    while (ptr & 3) { mem8[ptr++] = 0; }
    return start;
  }

  function writeI32(v) {
    const start = ptr;
    mem8[ptr++] = v & 0xFF; mem8[ptr++] = (v >>> 8) & 0xFF;
    mem8[ptr++] = (v >>> 16) & 0xFF; mem8[ptr++] = (v >>> 24) & 0xFF;
    return start;
  }

  // Write string data first.
  const argPtrs = argvStrings.map(writeStr);
  const envPtrs = envStrings.map(writeStr);

  // Write argv[] pointer array (null-terminated).
  const argvPtr = ptr;
  argPtrs.forEach(writeI32);
  writeI32(0);

  // Write env[] pointer array (null-terminated).
  const envPtr = ptr;
  envPtrs.forEach(writeI32);
  writeI32(0);

  return { argc: argvStrings.length, argvPtr, envPtr };
}

async function run(wasmPath, opts) {
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

  // If main() accepts argc/argv/env, populate them based on environment.
  if (entry.length >= 2 && memoryRef) {
    let argv, env;
    if (typeof process !== 'undefined' && process.argv) {
      // Node.js: derive argv from process.argv / process.env.
      // opts.argv can override (e.g. node-runner passes its own argv).
      if (opts && Array.isArray(opts.argv)) {
        argv = opts.argv.map(String);
        env  = Array.isArray(opts.env) ? opts.env.map(String) : [];
      } else {
        // Standalone execution: [node, script.js, wasm-path?, arg1, arg2, ...]
        const _pathMod = require('path');
        const _progStem = _pathMod.basename(wasmPath, '.wasm');
        const _distDir = _pathMod.dirname(wasmPath);
        const _appDir = _pathMod.basename(_distDir) === 'dist' ? _pathMod.dirname(_distDir) : _distDir;
        const progName = _appDir + '//' + _progStem;
        argv = [progName].concat(process.argv.slice(3));
        try {
          const { spawnSync } = require('child_process');
          const out = spawnSync('env', ['-0'], { encoding: 'utf8' });
          if (out && out.status === 0 && typeof out.stdout === 'string') {
            env = out.stdout.split('\0').filter((entry) => entry && entry.includes('='));
          } else {
            env = Object.keys(process.env).map(function(k) { return k + '=' + process.env[k]; });
          }
        } catch (_) {
          env = Object.keys(process.env).map(function(k) { return k + '=' + process.env[k]; });
        }
      }
    } else {
      // Browser: no access to process — pass empty argc/argv/env.
      argv = [];
      env  = [];
    }
    if (argv.length > 0) {
      const { argc, argvPtr, envPtr } = _buildArgvInMemory(memoryRef, argv, env);
      const boundEntry = () => entry(argc, argvPtr, envPtr);
      return _runEntrypointWithLongjmpResume(boundEntry);
    }
    // Browser with empty argv: call with explicit zeros so WASM doesn't read garbage.
    const boundEntry = () => entry(0, 0, 0);
    return _runEntrypointWithLongjmpResume(boundEntry);
  }

  return _runEntrypointWithLongjmpResume(entry);
}

if (typeof module !== 'undefined') {
  module.exports = { createImports, run };
}

// When executed directly (node <file>.js [wasm-path] [args...]), run main().
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

  const parserOnlyMode = opts.parserOnly
    || opts.showAst
    || opts.printJson
    || opts.printXml
    || !!opts.jsonOut
    || !!opts.xmlOut;

  if (parserOnlyMode) {
    const parseResult = parseCSource(source, {
      sourcePath: inputPath,
      includeDirs: [
        path.join(ROOT, 'compiler', 'include'),
        path.join(ROOT, 'include')
      ],
      resolveSystemIncludes: opts.resolveSystemIncludes,
    });

    const shouldPrintAst = opts.showAst || (!opts.printJson && !opts.printXml && !opts.jsonOut && !opts.xmlOut);

    if (shouldPrintAst) {
      console.log('--- AST ---');
      printTree(parseResult.ast);
      console.log('');
    }

    if (opts.printXml) {
      console.log('--- XML ---');
      console.log(parseResult.xml);
      console.log('');
    }

    if (opts.printJson) {
      console.log('--- JSON ---');
      console.log(parseResult.json);
      console.log('');
    }

    if (opts.jsonOut) {
      writeOutputFile(opts.jsonOut, parseResult.json);
      console.log(`[webc] json  → ${path.resolve(opts.jsonOut)}`);
    }

    if (opts.xmlOut) {
      writeOutputFile(opts.xmlOut, parseResult.xml);
      console.log(`[webc] xml   → ${path.resolve(opts.xmlOut)}`);
    }

    return;
  }

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

  // Always persist WAT when requested, even if validation/assembly fails.
  if (opts.wat && result.wat) {
    fs.writeFileSync(watOut, result.wat, 'utf8');
    console.log(`[webc] wat   → ${watOut}`);
  }

  if (result.validationError) {
    console.error(`[webc] Validation error: ${result.validationError.message}`);
    process.exit(1);
  }

  if (!result.wasm) {
    if (opts.validate === false) {
      console.log('[webc] wasm not emitted (validation disabled).');
      return;
    }
    console.error('[webc] Compiler did not produce a WASM binary. Re-run with --no-validate to check the WAT.');
    process.exit(1);
  }

  // ------------------------------------------------------------------
  // Write outputs
  // ------------------------------------------------------------------
  fs.writeFileSync(wasmOut, Buffer.from(result.wasm));
  console.log(`[webc] wasm  → ${wasmOut}`);

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
    const c89Hosts = createC89JsHosts(() => memoryRef);
    const imports = {
      env: {
        printf: createPrintfHost({
          getMemory: () => memoryRef,
          write: (text) => process.stdout.write(String(text)),
        }),
        ...defaultBuiltins,
        ...c89Hosts,
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
