import { receiptOcrPayloadSchema, receiptOcrQueueName } from '@debtnote/jobs';
import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Pool } from 'pg';
import type { ReceiptReader } from './receipt-readers/receipt-reader';

export function startReceiptWorker(connection: Redis, pool: Pool, reader: ReceiptReader) {
  const worker = new Worker(
    receiptOcrQueueName,
    async (job) => {
      const { attachmentId } = receiptOcrPayloadSchema.parse(job.data);
      const result = await pool.query(
        "UPDATE attachments SET status='processing',error=NULL WHERE id=$1 AND status<>'ready' RETURNING path,mime",
        [attachmentId],
      );
      if (!result.rowCount) return { skipped: true };
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const expiry = new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('OCR timeout')), 150_000);
        });
        const parsed = await Promise.race([reader.read(result.rows[0]), expiry]);
        await pool.query(
          "UPDATE attachments SET status='ready',ocr_result=$2,error=NULL WHERE id=$1",
          [attachmentId, JSON.stringify(parsed)],
        );
        return { read: true };
      } catch (error) {
        await pool.query(
          "UPDATE attachments SET status='error',error='Chưa đọc được bill. Bạn có thể nhập tay hoặc thử lại.' WHERE id=$1",
          [attachmentId],
        );
        throw error;
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    },
    { connection, concurrency: 1, lockDuration: 180_000 },
  );
  worker.on('failed', (job) => console.error(`Chưa đọc được ảnh ${job?.id}.`));
  worker.on('error', () => console.error('OCR worker gặp lỗi.'));
  return {
    async close() {
      await worker.close();
      await reader.close();
    },
  };
}
