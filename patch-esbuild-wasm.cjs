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

// Copy all files from esbuild-wasm over esbuild so that when Vite
// requires('esbuild'), it gets the WASM version that runs in-process
// instead of spawning a native binary child process.
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(wasmDir, esbuildDir);

// Also overwrite package.json so Node knows it's the wasm version
const wasmPkg = JSON.parse(fs.readFileSync(path.join(wasmDir, 'package.json'), 'utf8'));
const esbuildPkgPath = path.join(esbuildDir, 'package.json');
const esbuildPkg = JSON.parse(fs.readFileSync(esbuildPkgPath, 'utf8'));
esbuildPkg.bin = wasmPkg.bin;
esbuildPkg.main = wasmPkg.main;
esbuildPkg.types = wasmPkg.types;
esbuildPkg.scripts = wasmPkg.scripts || {};
fs.writeFileSync(esbuildPkgPath, JSON.stringify(esbuildPkg, null, 2));

console.log('[patch-esbuild] Patched esbuild -> esbuild-wasm (in-process WASM, no child process)');
