import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from './app';

const openServers: ReturnType<typeof createServer>[] = [];

function setupServer(options: Parameters<typeof createServer>[0] = {}) {
  const server = createServer(options);
  openServers.push(server);
  return server;
}

afterEach(async () => {
  await Promise.all(openServers.splice(0).map((server) => server.close()));
});

describe('khung API', () => {
  it('liveness vẫn hoạt động khi hạ tầng chưa sẵn sàng', async () => {
    const server = setupServer({
      readinessChecks: {
        database: async () => {
          throw new Error('Thông tin kết nối nội bộ không được trả ra ngoài.');
        },
      },
    });

    expect((await server.inject('/healthz')).statusCode).toBe(200);
    const readinessResponse = await server.inject('/readyz');
    expect(readinessResponse.statusCode).toBe(503);
    expect(readinessResponse.json()).toEqual({
      status: 'degraded',
      checks: { database: 'error' },
    });
  });

  it('readiness xác nhận từng dependency', async () => {
    const server = setupServer({
      readinessChecks: { database: async () => {}, redis: async () => {} },
    });
    const response = await server.inject('/readyz');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', checks: { database: 'ok', redis: 'ok' } });
  });

  it('tRPC thực sự đi qua HTTP adapter', async () => {
    const response = await setupServer().inject('/trpc/system.status');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      result: { data: { service: 'debtnote', status: 'ok' } },
    });
  });
});
