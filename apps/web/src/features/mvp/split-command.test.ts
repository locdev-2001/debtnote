import { randomUUID } from 'node:crypto';
import { billInputSchema } from '@debtnote/contracts';
import { expect, it } from 'vitest';
import { createBillCommand } from './split-command';

it('chỉ chuyển id và tên từ liên hệ sang contract chốt bill', () => {
  const person = { id: randomUUID(), name: 'Bình', phone: '0900000000', createdAt: '2026-10-25' };
  const command = createBillCommand({
    id: randomUUID(),
    step: 2,
    payerId: 'self',
    mode: 'equal',
    participants: [{ id: 'self', name: 'Bạn' }, person],
    items: [{ id: 'food', title: 'Đồ ăn', amount: '300000', excludedIds: [] }],
  });
  expect(billInputSchema.safeParse(command).success).toBe(true);
  expect(command.participants[1]).toEqual({ id: person.id, name: person.name });
});
