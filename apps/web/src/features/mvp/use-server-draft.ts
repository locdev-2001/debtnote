import type { Draft } from '@debtnote/contracts';
import { useRef, useState } from 'react';
import { apiClient } from '../../lib/rpc';
import { isSplitDraft } from '../split/draft-store';
import { createSplitDraft, type SplitDraft, type SplitPreview } from '../split/split-draft';

export function useServerDraft(ownerId: string, serverDrafts: readonly Draft[]) {
  const storageKey = `debtnote:draft:${ownerId}`;
  const [draft, setDraft] = useState<SplitDraft | null>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (saved?.unsynced && isSplitDraft(saved.draft)) return saved.draft;
    } catch {
      /* Bản nháp server vẫn được giữ. */
    }
    const latest = [...serverDrafts]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .find((entry) => isSplitDraft(entry.content));
    return (latest?.content as unknown as SplitDraft) ?? null;
  });
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState<SplitPreview | null>(null);
  const [storageIssue, setStorageIssue] = useState('');
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const version = useRef(0);
  function persist(nextDraft: SplitDraft | null) {
    const revision = ++version.current;
    try {
      if (nextDraft)
        localStorage.setItem(storageKey, JSON.stringify({ draft: nextDraft, unsynced: true }));
      else localStorage.removeItem(storageKey);
    } catch {
      /* Việc lưu server vẫn tiếp tục. */
    }
    if (!nextDraft) return;
    queue.current = queue.current
      .catch(() => undefined)
      .then(() =>
        apiClient.ledger.saveDraft.mutate({
          id: nextDraft.id,
          content: nextDraft as unknown as Record<string, unknown>,
        }),
      )
      .then(() => {
        if (revision !== version.current) return;
        setStorageIssue('');
        try {
          localStorage.setItem(storageKey, JSON.stringify({ draft: nextDraft, unsynced: false }));
        } catch {
          /* Có bản nháp trên server. */
        }
      })
      .catch(() => {
        if (revision === version.current) setStorageIssue('Chưa đồng bộ bản nháp.');
      });
  }
  function update(nextDraft: SplitDraft) {
    setDraft(nextDraft);
    persist(nextDraft);
  }
  return {
    draft,
    open,
    completed,
    storageIssue,
    update,
    start: (prepared?: SplitDraft) => {
      setCompleted(null);
      if (prepared) update(prepared);
      else if (!draft) update(createSplitDraft());
      else persist(draft);
      setOpen(true);
    },
    close: () => setOpen(false),
    discard: async () => {
      try {
        const previous = draft;
        await queue.current.catch(() => undefined);
        if (previous) await apiClient.ledger.saveDraft.mutate({ id: previous.id, content: null });
        setDraft(null);
        persist(null);
        setOpen(false);
      } catch {
        setStorageIssue('Chưa xóa được bản nháp.');
      }
    },
    finish: (result: SplitPreview) => {
      setDraft(null);
      persist(null);
      setCompleted(result);
    },
    flush: () => queue.current,
  };
}
