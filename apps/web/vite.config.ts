import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const workspaceRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, workspaceRoot, '');
  const apiTarget = `http://127.0.0.1:${environment.API_PORT || '3001'}`;
  const proxy = Object.fromEntries(
    ['/trpc', '/healthz', '/readyz'].map((path) => [path, { target: apiTarget }]),
  );

  return {
    envDir: workspaceRoot,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: '/',
          name: 'Debtnote',
          short_name: 'Debtnote',
          description: 'Chia tiền và theo dõi các khoản cần thu, cần trả.',
          lang: 'vi',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          theme_color: '#172c28',
          background_color: '#f7f8f5',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: '/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallbackDenylist: [/^\/trpc(?:\/|$)/, /^\/healthz$/, /^\/readyz$/],
          runtimeCaching: [],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    server: {
      host: '127.0.0.1',
      port: Number(environment.WEB_PORT || 5173),
      strictPort: true,
      proxy,
    },
    preview: { host: '127.0.0.1', port: 4173, strictPort: true, proxy },
  };
});
