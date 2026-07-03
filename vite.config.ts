import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// DatoCMS loads the plugin in an <iframe> from the registered URL, so assets must
// be referenced with relative paths (base: './').
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
  },
});
