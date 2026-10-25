import { expect, it, vi } from 'vitest';
import { apiClient } from '../../lib/rpc';
import { createRecipientApiAdapter } from './recipient';

vi.mock('../../lib/rpc', () => ({
  apiClient: {
    guest: { view: { query: vi.fn() }, promise: { mutate: vi.fn() }, report: { mutate: vi.fn() } },
  },
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined) },
}));

it('lưu hẹn không gửi lại báo chuyển cũ khi chủ sổ vừa xác nhận từ phiên khác', async () => {
  const view = {
    id: 'share',
    debtIds: ['debt'],
    recipientName: 'Bình',
    collectorName: 'An',
    principalAmount: 360_000,
    confirmedAmounts: [200_000],
    dueDate: null,
    access: 'active' as const,
    billTotal: 360_000,
    paymentQrPayload: null,
    reference: 'DNTEST',
    originalLines: [],
    lines: [],
    response: { reportedAmount: null, promisedDate: null, promisedAmount: null, dispute: null },
  };
  vi.mocked(apiClient.guest.view.query).mockResolvedValue(view);
  const adapter = createRecipientApiAdapter('synthetic-fixture-key');
  await adapter.reader.load('share');
  await adapter.store.save(
    'share',
    { reportedAmount: 200_000, promisedDate: '2026-10-26', promisedAmount: 100_000, dispute: null },
    { type: 'promise', date: '2026-10-26', amount: 100_000 },
  );
  expect(apiClient.guest.promise.mutate).toHaveBeenCalledWith(
    expect.objectContaining({ date: '2026-10-26', amount: 100_000 }),
  );
  expect(apiClient.guest.report.mutate).not.toHaveBeenCalled();
});
