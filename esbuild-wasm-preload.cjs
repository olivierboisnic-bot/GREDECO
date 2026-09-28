// Preload script: run with `node --require ./esbuild-wasm-preload.cjs` before vite.
// Patches Node's module resolution so `require('esbuild')` resolves to esbuild-wasm,
// which runs in-process via WebAssembly instead of spawning a native binary.
const Module = require('module');
const original = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'esbuild') {
    try {
      return original.call(this, 'esbuild-wasm', parent, isMain, options);
    } catch (e) {
      // fall through
    }
  }
  return original.call(this, request, parent, isMain, options);
};
