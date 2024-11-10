import { defineConfig } from 'vite';
import fileIncluderPlugin from './scripts/vite-plugin-file-includer.js';

export default defineConfig({
  plugins: [
    fileIncluderPlugin(),
  ],
  build: {
    rollupOptions: {
      input: 'boilerplate.tmpl',
      output: {
        entryFileNames: 'index.js',
        dir: 'dist',
      },
    },
    minify: false,
    treeshake: false,
  },
});