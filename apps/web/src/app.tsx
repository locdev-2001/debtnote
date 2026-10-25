import { useRegisterSW } from 'virtual:pwa-register/react';
import { useQuery } from '@tanstack/react-query';
import { rpc } from './lib/rpc';

export function App() {
  const connection = useQuery(rpc.system.status.queryOptions());
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <section className="w-full max-w-md" aria-labelledby="app-title">
        <img src="/favicon.svg" alt="" width="56" height="56" className="mb-8 rounded-2xl" />
        <p className="mb-3 text-sm font-medium tracking-wide text-stone-500">Debtnote</p>
        <h1 id="app-title" className="text-3xl font-semibold tracking-tight text-stone-900">
          Khung ứng dụng đã sẵn sàng.
        </h1>
        <p className="mt-4 text-base leading-7 text-stone-600">
          Mình sẽ cùng thiết kế từng màn hình và thao tác ở bước tiếp theo.
        </p>
        <div role="status" className="mt-8 flex items-center gap-2 text-sm text-stone-600">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${connection.isSuccess ? 'bg-emerald-600' : 'bg-amber-600'}`}
          />
          {connection.isPending && 'Đang kết nối…'}
          {connection.isSuccess && 'Đã kết nối.'}
          {connection.isError && 'Chưa thể kết nối. Vui lòng thử lại.'}
        </div>
        {connection.isError && (
          <button
            type="button"
            onClick={() => void connection.refetch()}
            className="mt-4 min-h-11 rounded-xl bg-stone-900 px-5 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            Thử lại
          </button>
        )}
        {needRefresh && (
          <aside className="mt-8 rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-600">Có phiên bản mới.</p>
            <button
              type="button"
              onClick={() => void updateServiceWorker(true)}
              className="mt-2 min-h-11 font-medium text-stone-900 underline underline-offset-4"
            >
              Cập nhật
            </button>
          </aside>
        )}
      </section>
    </main>
  );
}
