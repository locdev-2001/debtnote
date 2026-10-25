import { createHash, randomUUID } from 'node:crypto';
import { emptyLedgerState, type LedgerRepository, type LedgerState } from '@debtnote/contracts';
import { describe, expect, it } from 'vitest';
import { LedgerService } from './ledger-service';

class MemoryLedger implements LedgerRepository {
  private readonly ledgers = new Map<string, LedgerState>();
  private queue: Promise<unknown> = Promise.resolve();
  async read(ownerId: string) {
    return structuredClone(this.ledgers.get(ownerId) ?? emptyLedgerState());
  }
  transaction<Result>(
    ownerId: string,
    operation: (state: LedgerState) => Result | Promise<Result>,
  ): Promise<Result> {
    const result = this.queue
      .catch(() => undefined)
      .then(async () => {
        const state = await this.read(ownerId);
        const value = await operation(state);
        this.ledgers.set(ownerId, state);
        return structuredClone(value);
      });
    this.queue = result;
    return result;
  }
}
function setup() {
  const repository = new MemoryLedger();
  const clock = {
    now: () => '2026-10-25T06:00:00.000Z',
    today: () => '2026-10-25',
    scheduledAt: (date: string, hour: number) =>
      `${date}T${String(hour).padStart(2, '0')}:00:00+07:00`,
  };
  const ledger = new LedgerService(repository, clock, {
    create: randomUUID,
    digest: (value) => createHash('sha256').update(value).digest('hex'),
  });
  const owner = randomUUID();
  async function debt(amount = 360_000, personId?: string) {
    return ledger.createDebt(owner, {
      commandId: randomUUID(),
      ...(personId ? { personId } : { personName: 'Bình' }),
      direction: 'receivable',
      amount,
      note: 'Khoản chung',
      dueDate: '2026-10-25',
    });
  }
  return { repository, clock, ledger, owner, debt };
}
describe('nghiệp vụ sổ tiền', () => {
  it('chia theo món, loại bia, phí và giảm giá vẫn khớp tổng; không tạo nợ với bản thân', async () => {
    const { ledger, owner } = setup();
    const an = randomUUID();
    const binh = randomUUID();
    const result = await ledger.createBill(owner, {
      commandId: randomUUID(),
      title: 'Ăn tối',
      payerId: 'self',
      mode: 'custom',
      participants: [
        { id: 'self', name: 'Bạn' },
        { id: an, name: 'An' },
        { id: binh, name: 'Bình' },
      ],
      items: [
        { id: 'food', title: 'Đồ ăn', amount: 300_000, participantIds: ['self', an, binh] },
        { id: 'beer', title: 'Bia', amount: 120_000, participantIds: ['self', an] },
      ],
      fee: 42_000,
      discount: 21_000,
      dueDate: null,
      attachmentId: null,
    });
    expect(result.bill.totalAmount).toBe(441_000);
    expect(result.debts).toHaveLength(2);
    expect(
      result.debts.reduce((sum, debt) => sum + debt.principalAmount, result.bill.ownAmount),
    ).toBe(441_000);
    expect(result.debts.find((debt) => debt.personId === binh)?.principalAmount).toBe(105_000);
    expect(result.bill.ownAmount).toBe(168_000);
    expect((await ledger.snapshot(owner)).totals.receivable).toBe(273_000);
    const entry = result.debts.find((debt) => debt.personId === binh);
    if (!entry) throw new Error('Thiếu phần chia của Bình');
    const share = await ledger.createShare(owner, {
      commandId: randomUUID(),
      personId: binh,
      debtIds: [entry.id],
      days: 30,
    });
    const guest = await ledger.guestView({ ownerId: owner, shareId: share.id }, 'An');
    expect(
      guest.lines.reduce(
        (total, line) => total + (line.deduction ? -line.personalAmount : line.personalAmount),
        0,
      ),
    ).toBe(105_000);
    expect(
      guest.originalLines.reduce(
        (total, line) => total + (line.deduction ? -line.amount : line.amount),
        0,
      ),
    ).toBe(441_000);
    expect(guest.lines.find((line) => line.title === 'Bia')?.personalAmount).toBe(0);
  });
  it('người khác ứng bill chỉ sinh phần phải trả của chủ sổ', async () => {
    const { ledger, owner } = setup();
    const payer = randomUUID();
    const result = await ledger.createBill(owner, {
      commandId: randomUUID(),
      title: 'Xe',
      payerId: payer,
      mode: 'equal',
      participants: [
        { id: 'self', name: 'Bạn' },
        { id: payer, name: 'An' },
        { id: randomUUID(), name: 'Bình' },
      ],
      items: [{ id: 'taxi', title: 'Xe', amount: 300_000, participantIds: ['self', payer] }],
      fee: 0,
      discount: 0,
      dueDate: null,
      attachmentId: null,
    });
    expect(result.debts).toMatchObject([
      { direction: 'payable', personId: payer, principalAmount: 100_000 },
    ]);
  });
  it('lặp command không sinh thêm khoản; đổi nội dung cùng command bị chặn', async () => {
    const { ledger, owner } = setup();
    const input = {
      commandId: randomUUID(),
      personName: 'An',
      amount: 100,
      direction: 'receivable' as const,
      note: '',
      dueDate: null,
    };
    const [first, second] = await Promise.all([
      ledger.createDebt(owner, input),
      ledger.createDebt(owner, input),
    ]);
    expect(first.id).toBe(second.id);
    expect((await ledger.snapshot(owner)).records).toHaveLength(1);
    await expect(ledger.createDebt(owner, { ...input, amount: 101 })).rejects.toThrow(
      'nội dung khác',
    );
  });
  it('tiền chưa xác nhận không trừ nợ; hai lần xác nhận đồng thời chỉ ghi một lần', async () => {
    const { ledger, owner, debt } = setup();
    const record = await debt();
    const share = await ledger.createShare(owner, {
      commandId: randomUUID(),
      personId: record.personId,
      debtIds: [record.id],
      days: 30,
    });
    const scope = { ownerId: owner, shareId: share.id };
    await ledger.guestReport(scope, randomUUID(), 200_000);
    let snapshot = await ledger.snapshot(owner);
    expect(snapshot.totals.receivable).toBe(360_000);
    const report = snapshot.payments[0];
    if (!report) throw new Error('Thiếu báo chuyển');
    const confirmations = await Promise.allSettled([
      ledger.confirmReport(owner, randomUUID(), report.id, true),
      ledger.confirmReport(owner, randomUUID(), report.id, true),
    ]);
    expect(confirmations.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    snapshot = await ledger.snapshot(owner);
    expect(snapshot.totals.receivable).toBe(160_000);
    expect(snapshot.totals.received).toBe(200_000);
  });
  it('phân bổ nhiều khoản và tách tiền thừa, không âm dư nợ', async () => {
    const { ledger, owner, debt } = setup();
    const first = await debt(100_000);
    const second = await debt(60_000, first.personId);
    const payment = await ledger.recordPayment(owner, {
      commandId: randomUUID(),
      personId: first.personId,
      direction: 'receivable',
      debtIds: [first.id, second.id],
      amount: 180_000,
      note: '',
    });
    expect(payment.allocations.map((part) => part.amount)).toEqual([100_000, 60_000]);
    expect(payment.excessAmount).toBe(20_000);
    const snapshot = await ledger.snapshot(owner);
    expect(snapshot.totals.receivable).toBe(0);
    expect(snapshot.totals.excess).toBe(20_000);
    expect(snapshot.reminders.every((reminder) => reminder.status === 'cancelled')).toBe(true);
  });
  it('không cho trộn người, trộn chiều tiền hoặc chạm sổ người khác', async () => {
    const { ledger, owner, debt } = setup();
    const first = await debt(100);
    const second = await debt(200);
    await expect(
      ledger.recordPayment(owner, {
        commandId: randomUUID(),
        personId: first.personId,
        direction: 'receivable',
        debtIds: [first.id, second.id],
        amount: 300,
        note: '',
      }),
    ).rejects.toThrow('cùng người');
    await expect(
      ledger.promise(randomUUID(), {
        commandId: randomUUID(),
        debtId: first.id,
        date: '2026-10-26',
      }),
    ).rejects.toThrow('Không tìm thấy');
    expect((await ledger.snapshot(owner)).totals.receivable).toBe(300);
  });
  it('link chỉ lộ phần của người nhận; thu hồi chặn cả đọc và ghi', async () => {
    const { ledger, owner, debt } = setup();
    const first = await debt(100);
    const other = await debt(200);
    const share = await ledger.createShare(owner, {
      commandId: randomUUID(),
      personId: first.personId,
      debtIds: [first.id],
      days: 30,
    });
    const scope = { ownerId: owner, shareId: share.id };
    const guest = await ledger.guestView(scope, 'An');
    expect(guest.principalAmount).toBe(100);
    expect(guest.debtIds).toEqual([first.id]);
    await expect(
      ledger.guestDispute(scope, {
        commandId: randomUUID(),
        debtId: other.id,
        reason: 'amount',
        note: '',
        itemId: null,
      }),
    ).rejects.toThrow('không thuộc link');
    await ledger.revokeShare(owner, share.id);
    await expect(ledger.guestView(scope, 'An')).rejects.toThrow('thu hồi');
    await expect(ledger.guestReport(scope, randomUUID(), 100)).rejects.toThrow('thu hồi');
  });
  it('hẹn một phần, đổi hẹn không nhân đôi; worker không nhắc lặp trong ngày', async () => {
    const { ledger, owner, debt } = setup();
    const record = await debt();
    const share = await ledger.createShare(owner, {
      commandId: randomUUID(),
      personId: record.personId,
      debtIds: [record.id],
      days: 30,
    });
    const scope = { ownerId: owner, shareId: share.id };
    await ledger.guestPromise(scope, randomUUID(), '2026-10-26', 100_000);
    await ledger.guestPromise(scope, randomUUID(), '2026-10-25', 150_000);
    await ledger.processReminders(owner);
    await ledger.processReminders(owner);
    const snapshot = await ledger.snapshot(owner);
    expect(snapshot.forecast.promised).toBe(150_000);
    expect(snapshot.forecast.due).toBe(210_000);
    expect(snapshot.records[0]?.forecastAmounts).toEqual({ promised: 150_000, due: 210_000 });
    expect(snapshot.promises).toHaveLength(1);
    expect(snapshot.promises[0]?.amount).toBe(150_000);
    expect(
      snapshot.notifications.filter((notice) => notice.eventKey.startsWith('reminder:')),
    ).toHaveLength(1);
    expect(snapshot.reminders.filter((reminder) => reminder.status === 'scheduled')).toHaveLength(
      1,
    );
    expect(snapshot.records[0]?.dueDate).toBe('2026-10-25');
    expect((await ledger.guestView(scope, 'An')).response.promisedAmount).toBe(150_000);
  });
  it('từ chối tổng vượt số nguyên an toàn và giữ sổ ở trạng thái hợp lệ', async () => {
    const { ledger, owner, debt } = setup();
    await debt(Number.MAX_SAFE_INTEGER);
    await expect(debt(1)).rejects.toThrow('giới hạn');
    const snapshot = await ledger.snapshot(owner);
    expect(snapshot.records).toHaveLength(1);
    expect(snapshot.totals.receivable).toBe(Number.MAX_SAFE_INTEGER);
  });
});
