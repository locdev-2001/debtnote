import type { BillInput } from '@debtnote/contracts';
import type { SplitDraft } from '../split/split-draft';

export function createBillCommand(draft: SplitDraft): BillInput {
  return {
    commandId: draft.id,
    title: draft.title || 'Khoản chung',
    payerId: draft.payerId,
    mode: draft.mode,
    participants: draft.participants.map(({ id, name }) => ({ id, name })),
    items: draft.items.map((item) => ({
      id: item.id,
      title: item.title || 'Khoản chung',
      amount: Number(item.amount),
      participantIds: draft.participants
        .filter((person) => draft.mode === 'equal' || !item.excludedIds.includes(person.id))
        .map((person) => person.id),
    })),
    fee: Number(draft.fee || 0),
    discount: Number(draft.discount || 0),
    dueDate: draft.dueDate ?? null,
    attachmentId: draft.attachmentId ?? null,
  };
}
