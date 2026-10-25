import { appRouter } from '@debtnote/rpc';
import { type CreateFastifyContextOptions, fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import Fastify, { type FastifyServerOptions } from 'fastify';

interface ServerOptions {
  logger?: FastifyServerOptions['logger'];
  readinessChecks?: Readonly<Record<string, () => Promise<void>>>;
}

export function createServer({ logger = false, readinessChecks = {} }: ServerOptions = {}) {
  const server = Fastify({
    logger,
    bodyLimit: 1_048_576,
    routerOptions: { maxParamLength: 5_000 },
    requestTimeout: 15_000,
  });

  server.get('/healthz', async () => ({ status: 'ok' as const }));

  server.get('/readyz', async (_request, reply) => {
    const checkResults = await Promise.all(
      Object.entries(readinessChecks).map(async ([name, check]) => {
        try {
          await check();
          return [name, 'ok'] as const;
        } catch {
          return [name, 'error'] as const;
        }
      }),
    );
    const ready = checkResults.every(([, status]) => status === 'ok');

    reply.code(ready ? 200 : 503);
    return { status: ready ? 'ok' : 'degraded', checks: Object.fromEntries(checkResults) };
  });

  server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext: ({ req }: CreateFastifyContextOptions) => ({ requestId: req.id }),
    },
  });

  return server;
}
