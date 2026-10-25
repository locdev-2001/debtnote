import { useState } from 'react';
import type { SplitDraftStore } from './draft-store';
import {
  createSampleSplitDraft,
  createSplitDraft,
  type SplitDraft,
  type SplitPreview,
} from './split-draft';

export function useSplitDraft(store: SplitDraftStore) {
  const [draft, setDraft] = useState<SplitDraft | null>(() => store.load());
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState<SplitPreview | null>(null);
  const [storageIssue, setStorageIssue] = useState('');
  function update(nextDraft: SplitDraft | null) {
    setDraft(nextDraft);
    setStorageIssue(store.save(nextDraft) ? '' : 'Chưa lưu được bản nháp trên thiết bị.');
  }
  function start(sample = false) {
    setCompleted(null);
    if (!draft) update(sample ? createSampleSplitDraft() : createSplitDraft());
    setOpen(true);
  }
  return {
    draft,
    open,
    completed,
    storageIssue,
    update,
    start,
    close: () => setOpen(false),
    discard: () => {
      update(null);
      setOpen(false);
    },
    finish: (result: SplitPreview) => {
      update(null);
      setCompleted(result);
    },
  };
}
