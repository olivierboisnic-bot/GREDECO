const fs = require('fs');
const path = require('path');

const esbuildDir = path.join(__dirname, 'node_modules', 'esbuild');
const wasmDir = path.join(__dirname, 'node_modules', 'esbuild-wasm');

if (!fs.existsSync(wasmDir)) {
  console.log('[patch-esbuild] esbuild-wasm not found, skipping patch');
  process.exit(0);
}

if (!fs.existsSync(esbuildDir)) {
  console.log('[patch-esbuild] esbuild not found, skipping patch');
  process.exit(0);
}

const filesToCopy = [
  ['lib/main.js', 'lib/main.js'],
  ['lib/main.d.ts', 'lib/main.d.ts'],
  ['bin/esbuild', 'bin/esbuild'],
  ['esbuild.wasm', 'esbuild.wasm'],
  ['wasm_exec_node.js', 'wasm_exec_node.js'],
  ['wasm_exec.js', 'wasm_exec.js'],
];

for (const [from, to] of filesToCopy) {
  const src = path.join(wasmDir, from);
  const dest = path.join(esbuildDir, to);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`[patch-esbuild] Copied ${from} -> ${to}`);
  }
}

console.log('[patch-esbuild] Patched esbuild to use esbuild-wasm (in-process, no child process)');
