import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Patch Node's module resolution to redirect 'esbuild' to 'esbuild-wasm'
// This ensures Vite's internal require('esbuild') loads the WASM version
// which runs in-process instead of spawning a child process that gets killed
// in the WebContainer environment.
function patchEsbuildResolution(): Plugin {
  const Module = require('module');
  const originalResolve = Module._resolveFilename;
  let patched = false;

  return {
    name: 'patch-esbuild-wasm',
    config() {
      if (patched) return;
      patched = true;
      Module._resolveFilename = function (
        request: string,
        parent: Node.Module | undefined,
        isMain?: boolean,
        options?: Record<string, unknown>
      ) {
        if (request === 'esbuild') {
          try {
            return originalResolve.call(
              this,
              'esbuild-wasm',
              parent,
              isMain,
              options
            );
          } catch {
            // fall through to original resolution
          }
        }
        return originalResolve.call(this, request, parent, isMain, options);
      };
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), patchEsbuildResolution()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@supabase/supabase-js',
      'lucide-react',
      'jspdf',
      'jspdf-autotable',
      'html2canvas',
      'xlsx',
    ],
  },
});
