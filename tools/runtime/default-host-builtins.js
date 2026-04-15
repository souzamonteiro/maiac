'use strict';

function createDefaultHostBuiltins(getMemory, opts = {}) {
  const onAbort = typeof opts.onAbort === 'function'
    ? opts.onAbort
    : () => { throw new Error('abort() called'); };
  const onExit = typeof opts.onExit === 'function'
    ? opts.onExit
    : (status) => { throw new Error('exit(' + (status | 0) + ') called'); };
  const system = typeof opts.system === 'function' ? opts.system : () => -1;
  const getenv = typeof opts.getenv === 'function' ? opts.getenv : () => 0;

  const memoryGrowHost = (_memoryIndex, pages) => {
    const memory = getMemory();
    if (!memory) return -1;
    try {
      return memory.grow((pages | 0) >>> 0);
    } catch (_error) {
      return -1;
    }
  };

  const memorySizeHost = (_memoryIndex) => {
    const memory = getMemory();
    if (!memory) return 0;
    return (memory.buffer.byteLength / 65536) | 0;
  };

  return {
    _memory_grow_js: memoryGrowHost,
    _memory_size_js: memorySizeHost,
    _abort_js: () => onAbort(),
    _exit_js: (status) => onExit(status),
    _system_js: (commandPtr) => system(commandPtr),
    _getenv_js: (namePtr) => getenv(namePtr)
  };
}

module.exports = { createDefaultHostBuiltins };
