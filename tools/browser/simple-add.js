/* eslint-disable no-console */
(function () {
  var outputEl = document.getElementById('output');
  var inputEl = document.getElementById('input');
  var runBtn = document.getElementById('run');

  var instancePromise = null;

  function write(text) {
    outputEl.textContent += String(text) + '\n';
  }

  async function loadInstance() {
    if (instancePromise) {
      return instancePromise;
    }

    instancePromise = (async function () {
      var response = await fetch('/compiler/examples/simple_add.wasm');
      if (!response.ok) {
        throw new Error('Failed to fetch /compiler/examples/simple_add.wasm: HTTP ' + response.status);
      }
      var bytes = await response.arrayBuffer();
      var instantiated = await WebAssembly.instantiate(bytes, {});
      return instantiated.instance;
    })();

    return instancePromise;
  }

  runBtn.addEventListener('click', async function () {
    outputEl.textContent = '';
    try {
      var instance = await loadInstance();
      if (typeof instance.exports.add_one !== 'function') {
        throw new Error('Exported function add_one was not found');
      }

      var value = Number(inputEl.value || 0) | 0;
      var result = instance.exports.add_one(value);
      write('add_one(' + value + ') = ' + result);
    } catch (error) {
      write('[simple-add-browser-error] ' + error.message);
      console.error(error);
    }
  });
})();
