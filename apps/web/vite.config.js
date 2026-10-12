import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, projectRoot, '');
  const apiPort = Number(environment.API_PORT || 4001);
  return {
    plugins: [react()],
    server: {
      port: Number(environment.WEB_PORT || 5173),
      proxy: { '/api': `http://localhost:${apiPort}` }
    },
    build: { outDir: 'dist' }
  };
});
