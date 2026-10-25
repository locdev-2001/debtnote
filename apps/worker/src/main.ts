import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { LedgerService } from '@debtnote/application';
import { createDatabase, PostgresLedgerRepository } from '@debtnote/database';
import {
  closeRedisConnection,
  createReceiptOcrQueue,
  createRedisConnection,
  scheduleReceiptOcr,
  workerProbeJobName,
  workerProbePayloadSchema,
  workerProbeQueueName,
} from '@debtnote/jobs';
import { readWorkerEnvironment, registerShutdown, systemClock, systemIds } from '@debtnote/runtime';
import { Worker } from 'bullmq';
import { receiptAiConfig } from './receipt-ai-config';
import { createFallbackReceiptReader } from './receipt-readers/fallback-receipt-reader';
import type { ReceiptReader } from './receipt-readers/receipt-reader';
import { createTesseractReceiptReader } from './receipt-readers/tesseract-receipt-reader';
import { createVisionModelReceiptReader } from './receipt-readers/vision-model-receipt-reader';
import { startReceiptWorker } from './receipt-worker';

const environment = readWorkerEnvironment();
const connection = createRedisConnection(environment.REDIS_URL, true);
const database = createDatabase(environment.DATABASE_URL);
const repository = new PostgresLedgerRepository(database.pool);
const ledger = new LedgerService(repository, systemClock, systemIds);
const cachePath = join(environment.UPLOAD_DIR, '.ocr-models');
await mkdir(cachePath, { recursive: true, mode: 0o700 });
connection.on('error', () => console.error('Worker không thể kết nối Redis.'));
const probe = new Worker(
  workerProbeQueueName,
  async (job) => {
    if (job.name !== workerProbeJobName) throw new Error('Loại tác vụ chưa được đăng ký.');
    workerProbePayloadSchema.parse(job.data);
    return { status: 'ok', processedAt: new Date().toISOString() };
  },
  { connection, concurrency: 5 },
);
probe.on('failed', (job) => console.error(`Tác vụ kiểm tra ${job?.id} thất bại.`));
probe.on('error', () => console.error('Worker gặp lỗi.'));
const receiptReaders: ReceiptReader[] = [createTesseractReceiptReader(cachePath)];
if (environment.RECEIPT_AI_API_KEY)
  receiptReaders.unshift(
    createVisionModelReceiptReader({ ...receiptAiConfig, apiKey: environment.RECEIPT_AI_API_KEY }),
  );
const ocr = startReceiptWorker(
  connection,
  database.pool,
  createFallbackReceiptReader(receiptReaders),
);
const ocrQueue = createReceiptOcrQueue(connection);
let reminding = false;
async function processReminders() {
  if (reminding) return;
  reminding = true;
  try {
    for (const ownerId of await repository.dueOwners(systemClock.now()))
      await ledger.processReminders(ownerId);
    await database.pool.query('DELETE FROM sessions WHERE expires_at<now()');
    await database.pool.query("DELETE FROM auth_limits WHERE expires_at<now()-interval '1 day'");
  } catch {
    console.error('Chưa xử lý được lịch nhắc. Sẽ thử lại.');
  } finally {
    reminding = false;
  }
}
const reminderTimer = setInterval(() => void processReminders(), 30_000);
registerShutdown(async () => {
  clearInterval(reminderTimer);
  await Promise.all([probe.close(), ocr.close()]);
  await ocrQueue.close();
  await database.close();
  await closeRedisConnection(connection);
});
await probe.waitUntilReady();
const unfinished = await database.pool.query(
  "SELECT id FROM attachments WHERE status IN ('queued','processing')",
);
for (const attachment of unfinished.rows) await scheduleReceiptOcr(ocrQueue, attachment.id);
void processReminders();
console.info('Worker đã sẵn sàng.');
