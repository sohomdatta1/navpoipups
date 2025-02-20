import { defineConfig } from 'vite';
import fileIncluderPlugin from './scripts/vite-plugin-file-includer.js';
import eslint from 'vite-plugin-eslint';

export default defineConfig({
	plugins: [
		fileIncluderPlugin(),
		eslint()
	],
	build: {
		rollupOptions: {
			input: 'boilerplate.tmpl',
			output: {
				entryFileNames: 'index.js',
				dir: 'dist'
			}
		},
		minify: false,
		treeshake: false
	}
});
