import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// DatoCMS loads the plugin in an <iframe> from the registered URL, so assets must
// be referenced with relative paths (base: './').
export default defineConfig({
  base: './',
  plugins: [react()],
  // Guarantee a single React instance in the bundle. datocms-react-ui's
  // dependency tree can otherwise drag in a second (React 18) copy, which breaks
  // hooks with a null dispatcher. `overrides` in package.json handles install;
  // this dedupes at bundle time too.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
  },
});
