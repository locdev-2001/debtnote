import { calculateSplitPreview, type SplitDraft } from './split-draft';

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export interface SplitDraftStore {
  load: () => SplitDraft | null;
  save: (draft: SplitDraft | null) => boolean;
}
const draftKey = 'debtnote:split-prototype:v1';

function isSplitDraft(candidate: unknown): candidate is SplitDraft {
  if (!candidate || typeof candidate !== 'object') return false;
  const draft = candidate as SplitDraft;
  if (
    typeof draft.id !== 'string' ||
    !draft.id ||
    ![0, 1, 2].includes(draft.step) ||
    !['equal', 'custom'].includes(draft.mode) ||
    typeof draft.payerId !== 'string' ||
    !Array.isArray(draft.participants) ||
    draft.participants.length > 50 ||
    !Array.isArray(draft.items) ||
    draft.items.length > 100
  )
    return false;
  const validPeople = draft.participants.every(
    (person) =>
      person &&
      typeof person.id === 'string' &&
      person.id &&
      typeof person.name === 'string' &&
      person.name.trim() &&
      person.name.length <= 60,
  );
  if (
    !validPeople ||
    new Set(draft.participants.map((person) => person.id)).size !== draft.participants.length
  )
    return false;
  if (draft.payerId !== 'self' && !draft.participants.some((person) => person.id === draft.payerId))
    return false;
  return (
    new Set(draft.items.map((item) => item?.id)).size === draft.items.length &&
    draft.items.every(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        item.id &&
        typeof item.title === 'string' &&
        item.title.length <= 80 &&
        typeof item.amount === 'string' &&
        /^\d*$/.test(item.amount) &&
        Number.isSafeInteger(Number(item.amount)) &&
        Array.isArray(item.excludedIds) &&
        item.excludedIds.every(
          (id) => typeof id === 'string' && draft.participants.some((person) => person.id === id),
        ),
    )
  );
}

export function createSplitDraftStore(storage: DraftStorage | undefined): SplitDraftStore {
  return {
    load() {
      try {
        const candidate: unknown = JSON.parse(storage?.getItem(draftKey) ?? 'null');
        if (!isSplitDraft(candidate)) return null;
        if (candidate.step === 2) {
          try {
            calculateSplitPreview(candidate);
          } catch {
            return { ...candidate, step: candidate.participants.length ? 1 : 0 };
          }
        }
        return candidate;
      } catch {
        return null;
      }
    },
    save(draft) {
      try {
        if (!storage) return false;
        if (draft) storage.setItem(draftKey, JSON.stringify(draft));
        else storage.removeItem(draftKey);
        return true;
      } catch {
        return false;
      }
    },
  };
}
