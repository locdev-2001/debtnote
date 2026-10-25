import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActionButton } from '../../components/actions/action-button';
import { QrPreview } from '../../components/qr/qr-preview';
import type { QrRenderer } from '../../lib/qr/qr-renderer';
import { apiClient } from '../../lib/rpc';

export function SharePanel({
  ownerId,
  personId,
  debtIds,
  renderer,
}: {
  ownerId: string;
  personId: string;
  debtIds: string[];
  renderer: QrRenderer;
}) {
  const [commandId] = useState(() => crypto.randomUUID());
  const [notice, setNotice] = useState('');
  const [showQr, setShowQr] = useState(false);
  const request = useQuery({
    queryKey: ['share-created', ownerId, commandId],
    queryFn: () => apiClient.ledger.share.mutate({ commandId, personId, debtIds, days: 30 }),
    staleTime: Infinity,
    retry: 1,
  });
  if (request.isPending)
    return (
      <p className="mvp-caption" role="status">
        Đang tạo link…
      </p>
    );
  if (request.isError)
    return (
      <div className="mvp-form">
        <p className="mvp-error" role="alert">
          {request.error.message}
        </p>
        <ActionButton onClick={() => void request.refetch()}>Thử lại</ActionButton>
      </div>
    );
  const href = new URL(`/p/${request.data.key}`, window.location.origin).href;
  return (
    <div className="mvp-form">
      <a className="mvp-share-link" href={href} target="_blank" rel="noreferrer">
        Mở yêu cầu thanh toán ↗
      </a>
      <div className="mvp-actions">
        <ActionButton
          icon="share"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(href);
              setNotice('Đã sao chép link.');
            } catch {
              setNotice('Chưa sao chép được. Bạn có thể mở link và sao chép từ trình duyệt.');
            }
          }}
        >
          Sao chép link
        </ActionButton>
        {typeof navigator.share === 'function' && (
          <ActionButton
            emphasis="secondary"
            onClick={() =>
              void navigator
                .share({
                  title: 'Yêu cầu thanh toán',
                  text: 'Bạn xem phần tiền của mình nhé.',
                  url: href,
                })
                .catch(() => undefined)
            }
          >
            Gửi
          </ActionButton>
        )}
        <ActionButton emphasis="secondary" icon="qr" onClick={() => setShowQr(!showQr)}>
          QR
        </ActionButton>
      </div>
      {showQr && (
        <QrPreview payload={href} renderer={renderer} label="Mã QR mở yêu cầu thanh toán" />
      )}
      {notice && (
        <p className="mvp-caption" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
