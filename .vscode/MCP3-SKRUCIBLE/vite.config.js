import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'postprocessing',
      'maath',
      'framer-motion',
      'motion',
      'gsap',
      'lenis',
      'animejs',
      '@react-spring/three',
      '@use-gesture/react',
      'zustand',
      'pixi.js',
      '@theatre/core',
      '@react-three/rapier',
      'lucide-react',
    ],
  },
  build: {
    target: 'esnext',
  },
});
