import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      hmr: { clientPort: 3000 },
    },
    build: {
      // Split vendor libs into separate chunks so they cache independently and
      // first-paint downloads less.
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (!id.includes('node_modules')) return;
            if (id.includes('three') || id.includes('@react-three')) return 'three';
            if (id.includes('framer-motion') || id.includes('motion')) return 'framer';
            if (id.includes('react-router')) return 'router';
            if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'react';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('@base-ui') || id.includes('class-variance-authority') || id.includes('tailwind-merge') || id.includes('clsx')) return 'ui';
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },
  };
});
