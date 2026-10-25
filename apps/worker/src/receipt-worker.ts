import { parseReceiptText } from '@debtnote/application';
import { receiptOcrPayloadSchema, receiptOcrQueueName } from '@debtnote/jobs';
import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { Pool } from 'pg';
import { createWorker, type Worker as OcrWorker } from 'tesseract.js';

export function startReceiptWorker(connection: Redis, pool: Pool, modelCache: string) {
  let engine: Promise<OcrWorker> | null = null;
  const worker = new Worker(
    receiptOcrQueueName,
    async (job) => {
      const { attachmentId } = receiptOcrPayloadSchema.parse(job.data);
      const result = await pool.query(
        "UPDATE attachments SET status='processing',error=NULL WHERE id=$1 AND status<>'ready' RETURNING path",
        [attachmentId],
      );
      if (!result.rowCount) return { skipped: true };
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        engine ??= createWorker(['vie', 'eng'], 1, { cachePath: modelCache });
        const operation = (async () => {
          const activeEngine = await engine;
          if (!activeEngine) throw new Error();
          const response = await activeEngine.recognize(result.rows[0].path);
          return parseReceiptText(response.data.text, response.data.confidence);
        })();
        const expiry = new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('OCR timeout')), 120_000);
        });
        const parsed = await Promise.race([operation, expiry]);
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
        try {
          await (await engine)?.terminate();
        } catch {
          /* Engine lỗi được tạo lại ở tác vụ sau. */
        }
        engine = null;
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
      try {
        await (await engine)?.terminate();
      } catch {
        /* Tiến trình đang dừng. */
      }
    },
  };
}
