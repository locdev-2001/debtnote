import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { z } from 'zod';

export const workerProbeQueueName = 'debtnote-worker-probes';
export const workerProbeJobName = 'health-check';
export const workerProbePayloadSchema = z.object({ requestedAt: z.iso.datetime() });
export type WorkerProbePayload = z.infer<typeof workerProbePayloadSchema>;

export function createRedisConnection(redisUrl: string, consumer = false): Redis {
  return new Redis(redisUrl, {
    lazyConnect: true,
    connectTimeout: 2_000,
    ...(consumer
      ? { maxRetriesPerRequest: null }
      : { maxRetriesPerRequest: 1, enableOfflineQueue: false, commandTimeout: 2_000 }),
  });
}

export function createWorkerProbeQueue(connection: Redis) {
  return new Queue<WorkerProbePayload>(workerProbeQueueName, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    },
  });
}

export function createWorkerProbeEvents(connection: Redis) {
  return new QueueEvents(workerProbeQueueName, { connection });
}

export async function closeRedisConnection(connection: Redis): Promise<void> {
  if (connection.status === 'ready') {
    await connection.quit();
  } else {
    connection.disconnect();
  }
}
