import { open } from 'node:fs/promises';
import { idSchema } from '@debtnote/contracts';
import { type ApiServices, appRouter } from '@debtnote/rpc';
import { type CreateFastifyContextOptions, fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import Fastify, { type FastifyServerOptions } from 'fastify';

interface ServerOptions {
  logger?: FastifyServerOptions['logger'];
  readinessChecks?: Readonly<Record<string, () => Promise<void>>>;
  services?: ApiServices;
  appOrigin?: string;
  production?: boolean;
  trustProxy?: FastifyServerOptions['trustProxy'];
}
function sessionCookie(request: { headers: { cookie?: string | undefined } }, cookieName: string) {
  return request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
}
export function createServer({
  logger = false,
  readinessChecks = {},
  services,
  appOrigin = 'http://localhost:5173',
  production = false,
  trustProxy = 'loopback',
}: ServerOptions = {}) {
  const cookieName = production ? '__Host-debtnote' : 'debtnote_session';
  const configuredOrigin = new URL(appOrigin).origin;
  const server = Fastify({
    logger,
    bodyLimit: 15_000_000,
    routerOptions: { maxParamLength: 5_000 },
    requestTimeout: 30_000,
    trustProxy,
  });
  const requestBuckets = new Map<string, { attempts: number; reset: number }>();
  server.addHook('onRequest', async (request, reply) => {
    reply
      .header('X-Content-Type-Options', 'nosniff')
      .header('Referrer-Policy', 'no-referrer')
      .header('Cache-Control', 'no-store');
    if (!services) return;
    const now = Date.now();
    if (requestBuckets.size > 10_000)
      for (const [ip, bucket] of requestBuckets) if (bucket.reset < now) requestBuckets.delete(ip);
    const previous = requestBuckets.get(request.ip);
    const bucket =
      previous && previous.reset > now ? previous : { attempts: 0, reset: now + 60_000 };
    bucket.attempts += 1;
    requestBuckets.set(request.ip, bucket);
    if (bucket.attempts > 300)
      return reply.code(429).send({ error: 'Thử quá nhiều lần. Vui lòng quay lại sau.' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const origin = request.headers.origin;
      const allowed =
        origin === configuredOrigin ||
        (!production &&
          [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'http://localhost:4173',
            'http://127.0.0.1:4173',
          ].includes(origin ?? ''));
      if (!allowed) return reply.code(403).send({ error: 'Nguồn yêu cầu không hợp lệ.' });
    }
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
  server.get<{ Params: { id: string } }>('/files/:id', async (request, reply) => {
    if (!services) return reply.code(503).send({ error: 'Chưa sẵn sàng.' });
    const user = await services.auth.identify(sessionCookie(request, cookieName));
    if (!user) return reply.code(401).send({ error: 'Vui lòng đăng nhập.' });
    if (!idSchema.safeParse(request.params.id).success)
      return reply.code(404).send({ error: 'Không tìm thấy ảnh.' });
    try {
      const file = await services.files.file(user.id, request.params.id);
      reply
        .header('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`)
        .type(file.mime);
      const handle = await open(file.path, 'r');
      return reply.send(handle.createReadStream());
    } catch {
      return reply.code(404).send({ error: 'Không tìm thấy ảnh.' });
    }
  });
  server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext: async ({ req, res }: CreateFastifyContextOptions) => {
        const token = sessionCookie(req, cookieName);
        const user = services ? await services.auth.identify(token) : null;
        return {
          requestId: req.id,
          ...(services ? { services } : {}),
          user,
          ...(token ? { sessionToken: token } : {}),
          ip: req.ip,
          setSession: (nextToken: string | null) =>
            res.header(
              'Set-Cookie',
              `${cookieName}=${nextToken ?? ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${nextToken ? 30 * 86_400 : 0}${production ? '; Secure' : ''}`,
            ),
        };
      },
    },
  });
  return server;
}
