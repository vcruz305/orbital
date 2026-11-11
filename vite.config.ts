import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  base: './',
  plugins: [react(), cesium()],
  build: {
    chunkSizeWarningLimit: 6000,
    target: 'es2020',
  },
  server: { port: 5173, host: true },
  preview: { port: 4173, host: true },
});