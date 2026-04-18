import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls to the Express backend during development
    proxy: {
      '/analyze':    'http://localhost:4000',
      '/blacklist':  'http://localhost:4000',
      '/api':        'http://localhost:4000',
    },
  },
});
