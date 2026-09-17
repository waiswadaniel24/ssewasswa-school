import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Expose only public client configuration to the browser; never expose service-role secrets.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: {
    host: true,
    allowedHosts: ['.vercel.run'],
  },
  preview: {
    host: true,
    allowedHosts: ['.vercel.run'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'pdf-vendor': ['jspdf', 'jspdf-autotable']
        }
      }
    }
  }
});
