import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react({
        babel: {
          plugins: [
            // Ensure compatibility with older JS engines
            ['@babel/plugin-transform-optional-chaining', { loose: true }],
            ['@babel/plugin-transform-nullish-coalescing-operator', { loose: true }],
          ],
        },
      }),
      tailwindcss(),
    ],
    build: {
      target: ['es2015', 'chrome60', 'edge79', 'firefox68', 'safari12'],
      cssTarget: ['chrome60', 'edge79', 'firefox68', 'safari12'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
