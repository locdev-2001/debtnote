import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActionButton } from '../../components/actions/action-button';
import { apiClient } from '../../lib/rpc';

export function AccessLinks({ ownerId, personId }: { ownerId: string; personId: string }) {
  const cache = useQueryClient();
  const [issue, setIssue] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const links = useQuery({
    queryKey: ['links', ownerId],
    queryFn: () => apiClient.ledger.links.query(),
  });
  const active = links.data?.filter(
    (link) =>
      link.personId === personId && !link.revokedAt && Date.parse(link.expiresAt) > Date.now(),
  );
  return (
    <details className="mvp-details">
      <summary>Link đã tạo{active ? ` · ${active.length}` : ''}</summary>
      {links.isError && (
        <ActionButton emphasis="quiet" onClick={() => void links.refetch()}>
          Thử lại
        </ActionButton>
      )}
      {links.isPending && <p role="status">Đang mở link…</p>}
      <div className="mvp-list">
        {active?.map((link) => (
          <div className="mvp-line" key={link.id}>
            <a href={`/p/${link.key}`} target="_blank" rel="noreferrer">
              {link.debtIds.length} khoản · {new Date(link.expiresAt).toLocaleDateString('vi-VN')}
            </a>
            <ActionButton
              emphasis="quiet"
              size="small"
              disabled={pendingId !== null}
              onClick={async () => {
                setPendingId(link.id);
                setIssue('');
                try {
                  await apiClient.ledger.revoke.mutate({ id: link.id });
                  await cache.invalidateQueries({ queryKey: ['links', ownerId] });
                } catch {
                  setIssue('Chưa thu hồi được link.');
                } finally {
                  setPendingId(null);
                }
              }}
            >
              Thu hồi
            </ActionButton>
          </div>
        ))}
      </div>
      {issue && (
        <p className="mvp-error" role="alert">
          {issue}
        </p>
      )}
    </details>
  );
}
