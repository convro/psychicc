import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['tone']
  },
  define: {
    // Ensure environment variables are accessible
    global: 'globalThis'
  }
});
