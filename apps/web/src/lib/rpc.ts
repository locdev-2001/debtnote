import type { AppRouter } from '@debtnote/rpc';
import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, retry: 1 },
    mutations: { retry: false },
  },
});

const rpcClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: '/trpc' })],
});

export const rpc = createTRPCOptionsProxy<AppRouter>({
  client: rpcClient,
  queryClient,
});
