import { initTRPC } from '@trpc/server';
import { z } from 'zod';

export interface RpcContext {
  requestId: string;
}

const rpc = initTRPC.context<RpcContext>().create();

export const appRouter = rpc.router({
  system: rpc.router({
    status: rpc.procedure
      .output(z.object({ service: z.literal('debtnote'), status: z.literal('ok') }))
      .query(() => ({ service: 'debtnote' as const, status: 'ok' as const })),
  }),
});

export type AppRouter = typeof appRouter;
