import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState } from 'react';
import { ActionButton } from './components/actions/action-button';
import { browserPrototypeStorage, createHomePrototypeStore } from './features/home/demo-store';
import { HomePage } from './features/home/home-page';
import { getTodayKey } from './features/home/ledger';
import { createSplitDraftStore } from './features/split/draft-store';

export function App() {
  const [store] = useState(() => createHomePrototypeStore(browserPrototypeStorage(), getTodayKey));
  const [splitStore] = useState(() => createSplitDraftStore(browserPrototypeStorage()));
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <>
      <HomePage store={store} splitStore={splitStore} />
      {needRefresh && (
        <aside className="home-app-update" aria-label="Phiên bản mới">
          <p>Có phiên bản mới. Cập nhật khi bạn đã xong thao tác.</p>
          <ActionButton emphasis="secondary" onClick={() => void updateServiceWorker(true)}>
            Cập nhật
          </ActionButton>
        </aside>
      )}
    </>
  );
}
