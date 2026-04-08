/* eslint-disable no-console */
(function () {
  function readCString(memory, ptr) {
    var mem = new Uint8Array(memory.buffer);
    var end = ptr;
    while (end < mem.length && mem[end] !== 0) {
      end += 1;
    }
    return new TextDecoder('utf-8').decode(mem.subarray(ptr, end));
  }

  function normalizeCFormat(formatText) {
    return String(formatText)
      .replace(/%([0-9.+\-#']*)l([diuoxX])/g, '%$1$2')
      .replace(/%p/g, '0x%x');
  }

  function parsePlaceholders(formatText) {
    var re = /%(?:[1-9]\d*\$|\([^)]*\))?(?:\+)?(?:0|'[^$])?(?:-)?(?:\d+)?(?:\.\d+)?([b-gijostTuvxX])/g;
    var types = [];
    var match;
    while ((match = re.exec(formatText)) !== null) {
      types.push(match[1]);
    }
    return types;
  }

  function simpleFormat(formatText, values) {
    var idx = 0;
    return formatText.replace(/%(?:[1-9]\d*\$|\([^)]*\))?(?:\+)?(?:0|'[^$])?(?:-)?(?:\d+)?(?:\.\d+)?([b-gijostTuvxX])/g, function (_full, type) {
      var value = values[idx++];
      switch (type) {
        case 'd':
        case 'i':
          return String(value | 0);
        case 'u':
          return String((value >>> 0));
        case 'x':
          return (value >>> 0).toString(16);
        case 'X':
          return (value >>> 0).toString(16).toUpperCase();
        case 's':
          return String(value);
        case 'c':
          return String.fromCharCode((value | 0) & 0xff);
        case 'f':
        case 'e':
        case 'g':
          return String(Number(value));
        default:
          return String(value);
      }
    }).replace(/%%/g, '%');
  }

  var outputEl = document.getElementById('output');
  var runBtn = document.getElementById('run');
  var wasmInput = document.getElementById('wasm-url');
  var statusEl = document.getElementById('status');

  function write(text) {
    outputEl.textContent += String(text);
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  async function run() {
    outputEl.textContent = '';
    statusEl.textContent = 'Running...';

    var wasmUrl = wasmInput.value.trim();
    if (!wasmUrl) {
      statusEl.textContent = 'Missing wasm URL';
      return;
    }

    var memoryRef = null;
    var imports = {
      env: {
        printf: function (fmtPtr, a1, a2, a3, a4, a5, a6, a7) {
          if (!memoryRef) {
            return 0;
          }

          try {
            var raw = readCString(memoryRef, fmtPtr >>> 0);
            var fmt = normalizeCFormat(raw);
            var rawArgs = [a1, a2, a3, a4, a5, a6, a7];
            var types = parsePlaceholders(fmt);
            var values = types.map(function (type, index) {
              var v = rawArgs[index] || 0;
              return type === 's' ? readCString(memoryRef, v >>> 0) : v;
            });
            var text = simpleFormat(fmt, values);
            write(text);
            return text.length | 0;
          } catch (error) {
            console.error(error);
            write('[printf-host-error]');
            return 0;
          }
        }
      }
    };

    try {
      var response = await fetch(wasmUrl);
      var bytes = await response.arrayBuffer();
      var instantiated = await WebAssembly.instantiate(bytes, imports);
      var instance = instantiated.instance;
      memoryRef = instance.exports.memory || null;

      var entry = instance.exports.main || instance.exports.test_entry;
      if (typeof entry !== 'function') {
        throw new Error('Missing entrypoint (main or test_entry)');
      }

      var result = entry();
      write('\n[maiac] program returned: ' + result + '\n');
      statusEl.textContent = 'Done';
    } catch (error) {
      statusEl.textContent = 'Error';
      write('\n[runner-error] ' + error.message + '\n');
    }
  }

  runBtn.addEventListener('click', run);
})();
