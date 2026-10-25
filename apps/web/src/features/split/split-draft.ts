import { assertMinorUnits, splitExpenseItems } from '@debtnote/money-core';

export interface SplitPerson {
  id: string;
  name: string;
}
export interface SplitItem {
  id: string;
  title: string;
  amount: string;
  excludedIds: string[];
}
export interface SplitDraft {
  id: string;
  step: 0 | 1 | 2;
  mode: 'equal' | 'custom';
  participants: SplitPerson[];
  payerId: string;
  items: SplitItem[];
}
export interface SplitPreview {
  id: string;
  totalAmount: number;
  ownAmount: number;
  settlementAmount: number;
  direction: 'receivable' | 'payable';
  payer: SplitPerson;
  lines: { title: string; amount: number; people: string[] }[];
  shares: (SplitPerson & { amount: number; itemTitles: string[] })[];
}
export const currentPerson: SplitPerson = { id: 'self', name: 'Bạn' };

export function createSplitDraft(): SplitDraft {
  return {
    id: crypto.randomUUID(),
    step: 0,
    mode: 'equal',
    participants: [currentPerson],
    payerId: currentPerson.id,
    items: [{ id: crypto.randomUUID(), title: 'Khoản chung', amount: '', excludedIds: [] }],
  };
}

export function createSampleSplitDraft(): SplitDraft {
  return {
    ...createSplitDraft(),
    participants: [
      currentPerson,
      { id: 'binh', name: 'Bình' },
      { id: 'chi', name: 'Chi' },
      { id: 'dung', name: 'Dũng' },
      { id: 'em', name: 'Em' },
    ],
    items: [
      { id: 'shared', title: 'Đồ ăn', amount: '1050000', excludedIds: [] },
      { id: 'beer', title: 'Bia', amount: '450000', excludedIds: [] },
    ],
  };
}

export function calculateSplitPreview(draft: SplitDraft): SplitPreview {
  if (!draft.participants.length) throw new Error('Chọn ít nhất một người.');
  if (!draft.items.length) throw new Error('Thêm một khoản tiền.');
  const participantIds = draft.participants.map((person) => person.id);
  const payer = [currentPerson, ...draft.participants].find(
    (person) => person.id === draft.payerId,
  );
  if (!payer) throw new Error('Chọn người đã trả.');
  const items = draft.items.map((item) => {
    const amount = Number(item.amount);
    assertMinorUnits(amount);
    if (amount === 0) throw new Error('Nhập số tiền lớn hơn 0 ₫.');
    const included = participantIds.filter(
      (id) => draft.mode === 'equal' || !item.excludedIds.includes(id),
    );
    if (!included.length) throw new Error(`${item.title || 'Khoản tiền'}: chọn người được chia.`);
    return { amount, participantIds: included };
  });
  const totalAmount = splitDraftTotal(draft);
  const shares = splitExpenseItems(
    draft.mode === 'equal' ? [{ amount: totalAmount, participantIds }] : items,
    participantIds,
  ).map((share) => ({
    ...(draft.participants.find((person) => person.id === share.participantId) as SplitPerson),
    amount: share.amount,
    itemTitles: draft.items
      .filter((_, index) => items[index]?.participantIds.includes(share.participantId))
      .map((item) => item.title || 'Khoản chung'),
  }));
  const ownAmount = shares.find((share) => share.id === currentPerson.id)?.amount ?? 0;
  const direction = payer.id === currentPerson.id ? 'receivable' : 'payable';
  return {
    id: draft.id,
    totalAmount,
    ownAmount,
    direction,
    payer,
    lines: draft.items.map((item, index) => ({
      title: item.title || 'Khoản chung',
      amount: Number(item.amount),
      people: draft.participants
        .filter((person) => items[index]?.participantIds.includes(person.id))
        .map((person) => person.name),
    })),
    shares,
    settlementAmount: direction === 'receivable' ? totalAmount - ownAmount : ownAmount,
  };
}

export function splitDraftTotal(draft: SplitDraft): number {
  return draft.items.reduce((total, item) => {
    const amount = Number(item.amount);
    assertMinorUnits(amount);
    const nextTotal = total + amount;
    assertMinorUnits(nextTotal);
    return nextTotal;
  }, 0);
}

export function toggleSplitPerson(draft: SplitDraft, person: SplitPerson): SplitDraft {
  const selected = draft.participants.some((participant) => participant.id === person.id);
  const participants = selected
    ? draft.participants.filter((participant) => participant.id !== person.id)
    : [...draft.participants, person];
  return {
    ...draft,
    participants,
    payerId: participants.some((participant) => participant.id === draft.payerId)
      ? draft.payerId
      : currentPerson.id,
    items: draft.items.map((item) => ({
      ...item,
      excludedIds: item.excludedIds.filter((id) =>
        participants.some((participant) => participant.id === id),
      ),
    })),
  };
}
