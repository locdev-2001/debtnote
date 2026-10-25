import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState } from 'react';
import { ActionButton } from './components/actions/action-button';
import { createWebglQrRenderer } from './adapters/qr/webgl-qr-renderer';
import { browserPrototypeStorage, createHomePrototypeStore } from './features/home/demo-store';
import { HomePage } from './features/home/home-page';
import { RecipientPage } from './features/recipient/recipient-page';
import { createRecipientResponseStore } from './features/recipient/response-store';
import { createSamplePaymentRequestReader } from './features/recipient/sample-requests';
import { createSplitDraftStore } from './features/split/draft-store';
import { getTodayKey } from './lib/calendar';

export function App() {
  const [store] = useState(() => createHomePrototypeStore(browserPrototypeStorage(), getTodayKey));
  const [splitStore] = useState(() => createSplitDraftStore(browserPrototypeStorage()));
  const [recipientStore] = useState(() => createRecipientResponseStore(browserPrototypeStorage()));
  const [recipientReader] = useState(() => createSamplePaymentRequestReader(getTodayKey));
  const [qrRenderer] = useState(() => createWebglQrRenderer());
  const currentPath = window.location.pathname;
  const isRecipientRoute = currentPath === '/p' || currentPath.startsWith('/p/');
  const requestId = currentPath.slice(3).replace(/\/$/, '');
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <>
      {isRecipientRoute ? (
        <RecipientPage
          requestId={requestId}
          store={recipientStore}
          reader={recipientReader}
          qrRenderer={qrRenderer}
        />
      ) : (
        <HomePage store={store} splitStore={splitStore} />
      )}
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
