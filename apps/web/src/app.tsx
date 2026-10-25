import { useRegisterSW } from 'virtual:pwa-register/react';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from './components/actions/action-button';
import { rpc } from './lib/rpc';

export function App() {
  const connection = useQuery(rpc.system.status.queryOptions());
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <main className="foundation-page">
      <section className="foundation-panel" aria-labelledby="app-title">
        <img src="/favicon.svg" alt="" width="56" height="56" className="foundation-logo" />
        <p className="foundation-brand">Debtnote</p>
        <h1 id="app-title">Khung ứng dụng đã sẵn sàng.</h1>
        <p className="foundation-description">
          Mình sẽ cùng thiết kế từng màn hình và thao tác ở bước tiếp theo.
        </p>
        <div role="status" className="connection-status" data-connected={connection.isSuccess}>
          <span aria-hidden="true" className="connection-dot" />
          {connection.isPending && 'Đang kết nối…'}
          {connection.isSuccess && 'Đã kết nối.'}
          {connection.isError && 'Chưa thể kết nối. Vui lòng thử lại.'}
        </div>
        {connection.isError && (
          <ActionButton onClick={() => void connection.refetch()}>Thử lại</ActionButton>
        )}
        {needRefresh && (
          <aside className="foundation-update">
            <p>Có phiên bản mới.</p>
            <ActionButton emphasis="secondary" onClick={() => void updateServiceWorker(true)}>
              Cập nhật
            </ActionButton>
          </aside>
        )}
      </section>
    </main>
  );
}
