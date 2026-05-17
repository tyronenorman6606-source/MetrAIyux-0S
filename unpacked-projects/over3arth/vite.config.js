import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const neuralSpaceRuntimeTarget = process.env.NEURALSPACE_RUNTIME_TARGET || 'http://127.0.0.1:4121';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react';
          if (id.includes('/framer-motion/')) return 'motion';
          if (id.includes('/three/')) return 'visuals';
          return undefined;
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/runtime/standalone-apps/NeuralSpacePro': {
        target: neuralSpaceRuntimeTarget,
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    proxy: {
      '/runtime/standalone-apps/NeuralSpacePro': {
        target: neuralSpaceRuntimeTarget,
        changeOrigin: true,
        secure: false
      }
    }
  }
});
