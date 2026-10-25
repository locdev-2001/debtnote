import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActionButton } from '../../components/actions/action-button';
import { apiClient } from '../../lib/rpc';
import { createSplitDraft, type SplitDraft, type SplitPerson } from '../split/split-draft';

export function PhotoPanel({
  id,
  ownerId,
  people,
  onContinue,
}: {
  id: string;
  ownerId: string;
  people: readonly SplitPerson[];
  onContinue: (draft: SplitDraft) => void;
}) {
  const queryClient = useQueryClient();
  const [retryIssue, setRetryIssue] = useState('');
  const attachment = useQuery({
    queryKey: ['attachment', ownerId, id],
    queryFn: () => apiClient.files.status.query({ id }),
    refetchInterval: (query) =>
      ['queued', 'processing'].includes(query.state.data?.status ?? '') ? 1_000 : false,
  });
  if (attachment.isPending) return <p className="mvp-caption">Đang mở ảnh…</p>;
  if (attachment.isError)
    return (
      <p className="mvp-error" role="alert">
        {attachment.error.message}
      </p>
    );
  const photo = attachment.data;
  return (
    <div className="mvp-form">
      <img className="mvp-photo" src={`/files/${id}`} alt="Ảnh bill vừa tải lên" />
      {['queued', 'processing'].includes(photo.status) && (
        <p className="mvp-caption" role="status">
          Đang đọc bill…
        </p>
      )}
      {photo.status === 'error' && (
        <>
          <p className="mvp-error">{photo.error}</p>
          <ActionButton
            emphasis="secondary"
            onClick={() =>
              void apiClient.files.retry
                .mutate({ id })
                .then(() =>
                  queryClient.invalidateQueries({ queryKey: ['attachment', ownerId, id] }),
                )
                .catch(() => setRetryIssue('Chưa đọc lại được. Thử lại nhé.'))
            }
          >
            Đọc lại
          </ActionButton>
        </>
      )}
      {retryIssue && (
        <p className="mvp-error" role="alert">
          {retryIssue}
        </p>
      )}
      {photo.ocrResult?.issues.map((issue) => (
        <p className="mvp-caption" key={issue}>
          {issue}
        </p>
      ))}
      <ActionButton
        onClick={() => {
          const draft = createSplitDraft(people);
          draft.attachmentId = id;
          if (photo.ocrResult?.items.length)
            draft.items = photo.ocrResult.items.map((item) => ({
              ...item,
              amount: String(item.amount),
              excludedIds: [],
            }));
          onContinue(draft);
        }}
      >
        Chọn người
      </ActionButton>
    </div>
  );
}
