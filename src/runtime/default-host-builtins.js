'use strict';

const { createC89JsHosts } = require('./c89-js-hosts.js');
const LONGJMP_SIGNAL_TAG = '__maiacLongjmp';

function createLongjmpSignal(envPtr, value) {
  return {
    [LONGJMP_SIGNAL_TAG]: true,
    envPtr: (envPtr | 0) >>> 0,
    value: value | 0
  };
}

function isLongjmpSignal(error) {
  return !!(error && typeof error === 'object' && error[LONGJMP_SIGNAL_TAG] === true);
}

function createDefaultHostBuiltins(getMemory, opts = {}) {
  const setjmpContexts = new Map();
  let pendingLongjmp = null;
  const onAbort = typeof opts.onAbort === 'function'
    ? opts.onAbort
    : () => { throw new Error('abort() called'); };
  const onExit = typeof opts.onExit === 'function'
    ? opts.onExit
    : (status) => { throw new Error('exit(' + (status | 0) + ') called'); };
  const onSetjmpCapture = typeof opts.onSetjmpCapture === 'function'
    ? opts.onSetjmpCapture
    : null;
  const onLongjmp = typeof opts.onLongjmp === 'function'
    ? opts.onLongjmp
    : () => {};
  const system = typeof opts.system === 'function' ? opts.system : () => -1;
  const getenv = typeof opts.getenv === 'function' ? opts.getenv : () => 0;

  const getStackPointer = typeof opts.getStackPointer === 'function' ? opts.getStackPointer : null;
  const setStackPointer = typeof opts.setStackPointer === 'function' ? opts.setStackPointer : null;
  const getFramePointer = typeof opts.getFramePointer === 'function' ? opts.getFramePointer : null;
  const setFramePointer = typeof opts.setFramePointer === 'function' ? opts.setFramePointer : null;

  function captureSetjmpContext(envPtr) {
    const key = (envPtr | 0) >>> 0;
    const snapshot = {
      stackPtr: getStackPointer ? (getStackPointer() | 0) : null,
      framePtr: getFramePointer ? (getFramePointer() | 0) : null
    };
    setjmpContexts.set(key, snapshot);
    if (onSetjmpCapture) {
      onSetjmpCapture(key, { ...snapshot });
    }

    if (pendingLongjmp && pendingLongjmp.envPtr === key) {
      const resumeValue = pendingLongjmp.value | 0;
      pendingLongjmp = null;
      return resumeValue;
    }

    return 0;
  }

  function restoreLongjmpContext(envPtr, value) {
    const key = (envPtr | 0) >>> 0;
    const normalizedValue = (value | 0) === 0 ? 1 : (value | 0);
    const snapshot = setjmpContexts.get(key) || null;

    if (snapshot && setStackPointer && Number.isInteger(snapshot.stackPtr)) {
      setStackPointer(snapshot.stackPtr);
    }
    if (snapshot && setFramePointer && Number.isInteger(snapshot.framePtr)) {
      setFramePointer(snapshot.framePtr);
    }

    pendingLongjmp = { envPtr: key, value: normalizedValue };

    try {
      onLongjmp(key, normalizedValue);
    } catch (error) {
      throw error;
    }

    throw createLongjmpSignal(key, normalizedValue);
  }

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

  const c89Hosts = createC89JsHosts(getMemory, opts);

  return {
    _memory_grow_js: memoryGrowHost,
    _memory_size_js: memorySizeHost,
    _abort_js: () => onAbort(),
    _exit_js: (status) => onExit(status),
    _system_js: (commandPtr) => system(commandPtr),
    _getenv_js: (namePtr) => getenv(namePtr),
    _setjmp_capture_js: (envPtr) => captureSetjmpContext(envPtr),
    _longjmp_unwind_js: (envPtr, value) => restoreLongjmpContext(envPtr, value),
    ...c89Hosts
  };
}

module.exports = {
  LONGJMP_SIGNAL_TAG,
  createLongjmpSignal,
  isLongjmpSignal,
  createDefaultHostBuiltins
};
