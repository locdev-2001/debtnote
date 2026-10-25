import type { ReceiptReader } from './receipt-reader';

export function createFallbackReceiptReader(readers: ReceiptReader[]): ReceiptReader {
  return {
    name: readers.map((reader) => reader.name).join('>'),
    async read(image) {
      let lastError: unknown = new Error('Chưa cấu hình bộ đọc bill.');
      for (const reader of readers) {
        try {
          return await reader.read(image);
        } catch (error) {
          lastError = error;
          const reason = error instanceof Error ? ` (${error.message})` : '';
          console.error(`Bộ đọc bill ${reader.name} lỗi${reason}; chuyển bộ đọc kế tiếp.`);
        }
      }
      throw lastError;
    },
    async close() {
      await Promise.all(readers.map((reader) => reader.close()));
    },
  };
}
