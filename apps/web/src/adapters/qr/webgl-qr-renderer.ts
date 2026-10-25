import type { QrRenderer } from '../../lib/qr/qr-renderer';

export function createWebglQrRenderer(): QrRenderer {
  return {
    async render(payload) {
      if (!payload || new TextEncoder().encode(payload).byteLength > 1024) {
        throw new Error('Nội dung QR cần từ 1 đến 1.024 byte.');
      }
      const source = new URL('/qr/webgl-embed.html', window.location.origin);
      source.searchParams.set('embed', 'true');
      source.searchParams.set('url', payload);
      source.searchParams.set('season', 'summer');
      source.searchParams.set('flat', 'false');
      source.searchParams.set('controls', 'false');
      return { kind: 'embed', source: source.href };
    },
  };
}
