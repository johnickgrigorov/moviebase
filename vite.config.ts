import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || '/';

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        },
        manifest: {
          name: 'Moviebase Personal',
          short_name: 'Moviebase',
          description: 'Личный трекер фильмов и сериалов',
          theme_color: '#0a0908',
          background_color: '#0a0908',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'ru',
          scope: base,
          start_url: base,
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    server: { port: 5173, host: true },
    build: {
      target: 'es2020',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (/[\\/]react(-dom|-router-dom)?[\\/]/.test(id)) return 'react';
              if (id.includes('@tanstack')) return 'query';
              if (id.includes('dexie')) return 'db';
            }
            return undefined;
          },
        },
      },
    },
  };
});
