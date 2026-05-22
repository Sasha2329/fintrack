import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), basicSsl()],
  define: {
    __LOCAL_HTTPS__: JSON.stringify(process.env.LOCAL_HTTPS !== 'false')
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    https: process.env.LOCAL_HTTPS !== 'false',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    https: process.env.LOCAL_HTTPS !== 'false',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
