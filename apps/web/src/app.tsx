import { useRegisterSW } from 'virtual:pwa-register/react';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { createRecipientApiAdapter } from './adapters/api/recipient';
import { createWebglQrRenderer } from './adapters/qr/webgl-qr-renderer';
import { ActionButton } from './components/actions/action-button';
import { Brand } from './components/brand/brand';
import { browserPrototypeStorage, createHomePrototypeStore } from './features/home/demo-store';
import { HomePage } from './features/home/home-page';
import { createRecipientResponseStore } from './features/recipient/response-store';
import { createSamplePaymentRequestReader } from './features/recipient/sample-requests';
import { createSplitDraftStore } from './features/split/draft-store';
import { getTodayKey } from './lib/calendar';
import { apiClient, queryClient } from './lib/rpc';
import './features/mvp/mvp.css';

const AuthPage = lazy(() =>
  import('./features/mvp/auth-page').then((module) => ({ default: module.AuthPage })),
);
const OwnerApp = lazy(() =>
  import('./features/mvp/owner-app').then((module) => ({ default: module.OwnerApp })),
);
const RecipientPage = lazy(() =>
  import('./features/recipient/recipient-page').then((module) => ({
    default: module.RecipientPage,
  })),
);
const qrRenderer = createWebglQrRenderer();
function AccountGate() {
  const session = useQuery({
    queryKey: ['session'],
    queryFn: () => apiClient.auth.me.query(),
    refetchInterval: 60_000,
  });
  if (session.isPending)
    return (
      <main className="auth-page">
        <Brand />
        <p role="status">Đang mở sổ…</p>
      </main>
    );
  if (session.isError && !session.data)
    return (
      <main className="auth-page">
        <Brand />
        <p role="alert">Chưa kết nối được.</p>
        <ActionButton onClick={() => void session.refetch()}>Thử lại</ActionButton>
      </main>
    );
  if (!session.data)
    return (
      <AuthPage
        onAuthenticated={() => {
          queryClient.clear();
          void session.refetch();
        }}
      />
    );
  const user = session.data;
  return (
    <OwnerApp
      key={user.id}
      user={user}
      renderer={qrRenderer}
      onLogout={async () => {
        await apiClient.auth.logout.mutate();
        try {
          localStorage.removeItem(`debtnote:draft:${user.id}`);
        } catch {
          /* Phiên đăng nhập đã được hủy trên server. */
        }
        queryClient.clear();
        await session.refetch();
      }}
    />
  );
}
function Demo() {
  const [store] = useState(() => createHomePrototypeStore(browserPrototypeStorage(), getTodayKey));
  const [splitStore] = useState(() => createSplitDraftStore(browserPrototypeStorage()));
  return <HomePage store={store} splitStore={splitStore} />;
}
function Guest({ token, demo }: { token: string; demo: boolean }) {
  const [adapter] = useState(() =>
    demo
      ? {
          store: createRecipientResponseStore(browserPrototypeStorage()),
          reader: createSamplePaymentRequestReader(getTodayKey),
        }
      : createRecipientApiAdapter(token),
  );
  return (
    <RecipientPage
      requestId={token}
      store={adapter.store}
      reader={adapter.reader}
      qrRenderer={qrRenderer}
      preview={demo}
    />
  );
}
export function App() {
  const path = window.location.pathname;
  const token = path.slice(3).replace(/\/$/, '');
  const guest = path.startsWith('/p/');
  const demo = import.meta.env.DEV && token.startsWith('mau-');
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  return (
    <>
      <Suspense
        fallback={
          <main className="auth-page">
            <Brand />
            <p role="status">Đang mở…</p>
          </main>
        }
      >
        {guest ? (
          <Guest key={token} token={token} demo={demo} />
        ) : import.meta.env.DEV && path === '/demo' ? (
          <Demo />
        ) : (
          <AccountGate />
        )}
      </Suspense>
      {needRefresh && (
        <aside className="home-app-update" aria-label="Phiên bản mới">
          <p>Có phiên bản mới.</p>
          <ActionButton emphasis="secondary" onClick={() => void updateServiceWorker(true)}>
            Cập nhật
          </ActionButton>
        </aside>
      )}
    </>
  );
}
