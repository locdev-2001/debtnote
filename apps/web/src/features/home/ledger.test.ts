import { describe, expect, it } from 'vitest';
import { createDemoRecords, createHomePrototypeStore } from './demo-store';
import {
  applyHomeCommand,
  getTodayKey,
  matchesFilter,
  remainingAmount,
  settlementState,
  summarize,
  visibleRecords,
} from './ledger';

const today = '2026-10-25';
describe('read model và thao tác trang chủ mẫu', () => {
  it('chốt ngày theo giờ Việt Nam khi UTC vẫn còn ở ngày trước', () => {
    expect(getTodayKey(new Date('2026-10-24T18:00:00Z'))).toBe('2026-10-25');
  });
  it('không tạo khoản khiến tổng tiền vượt giới hạn số nguyên an toàn', () => {
    const record = createDemoRecords(today)[0];
    if (!record) throw new Error('Thiếu dữ liệu mẫu.');
    expect(() =>
      applyHomeCommand(createDemoRecords(today), {
        type: 'add',
        record: {
          ...record,
          id: 'large',
          principalAmount: Number.MAX_SAFE_INTEGER,
          confirmedAmounts: [],
        },
      }),
    ).toThrow();
  });
  it('tổng cần thu và cần trả không bù trừ hoặc cộng nhầm phần đã nhận', () => {
    const records = createDemoRecords(today);
    expect(summarize(records, 'receivable')).toEqual({ amount: 940_000, people: 4, count: 4 });
    expect(summarize(records, 'payable').amount).toBe(200_000);
  });
  it('sắp xếp quá hạn trước, tìm tên không cần dấu', () => {
    const records = createDemoRecords(today);
    expect(visibleRecords(records, 'receivable', 'all', '', today)[0]?.id).toBe('dung');
    expect(
      visibleRecords(records, 'receivable', 'all', 'Dung', today).map((record) => record.id),
    ).toEqual(['dung']);
    expect(records.filter((record) => matchesFilter(record, 'attention', today))).toHaveLength(2);
  });
  it('nhận một phần cập nhật số dư và trạng thái cùng lúc', () => {
    const records = applyHomeCommand(createDemoRecords(today), {
      type: 'receive',
      id: 'dung',
      amount: 100_000,
    });
    const record = records.find((entry) => entry.id === 'dung');
    expect(record && remainingAmount(record)).toBe(110_000);
    expect(record && settlementState(record)).toBe('partial');
    expect(summarize(records, 'receivable').amount).toBe(840_000);
  });
  it('trả đủ loại khoản đã xong khỏi danh sách cần thu', () => {
    const records = applyHomeCommand(createDemoRecords(today), {
      type: 'receive',
      id: 'binh',
      amount: 160_000,
    });
    expect(summarize(records, 'receivable')).toEqual({ amount: 780_000, people: 3, count: 3 });
    expect(
      visibleRecords(records, 'receivable', 'all', '', today).some(
        (record) => record.id === 'binh',
      ),
    ).toBe(false);
  });
  it('báo đã chuyển vẫn giữ số cần trả cho đến khi có xác nhận', () => {
    const records = applyHomeCommand(createDemoRecords(today), {
      type: 'report-payment',
      id: 'linh',
    });
    expect(summarize(records, 'payable').amount).toBe(200_000);
    expect(visibleRecords(records, 'payable', 'confirmation', '', today)).toHaveLength(1);
    expect(visibleRecords(records, 'payable', 'all', '', today)[0]?.awaitingConfirmation).toBe(
      true,
    );
  });
  it('hẹn mới chuyển việc cần nhắc sang ngày đã thống nhất', () => {
    const records = applyHomeCommand(createDemoRecords(today), {
      type: 'promise',
      id: 'dung',
      date: '2026-10-27',
    });
    expect(visibleRecords(records, 'receivable', 'overdue', '', today)).toHaveLength(0);
    expect(summarize(records, 'receivable').amount).toBe(940_000);
  });
  it.each([0, -1, 210_001, 0.5])('từ chối nhận tiền không hợp lệ: %s', (amount) => {
    expect(() =>
      applyHomeCommand(createDemoRecords(today), { type: 'receive', id: 'dung', amount }),
    ).toThrow();
  });
  it('không áp dụng nhận tiền cho khoản phải trả hoặc ngày hẹn sai', () => {
    expect(() =>
      applyHomeCommand(createDemoRecords(today), { type: 'receive', id: 'linh', amount: 100_000 }),
    ).toThrow();
    expect(() =>
      applyHomeCommand(createDemoRecords(today), {
        type: 'promise',
        id: 'linh',
        date: '2026-02-30',
      }),
    ).toThrow();
  });
  it('lưu mẫu sau reload và phục hồi an toàn khi storage hỏng', () => {
    const entries = new Map<string, string>();
    const storage = {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => {
        entries.set(key, value);
      },
      removeItem: (key: string) => {
        entries.delete(key);
      },
    };
    const store = createHomePrototypeStore(storage, () => today);
    store.save(applyHomeCommand(store.load(), { type: 'receive', id: 'binh', amount: 160_000 }));
    expect(
      summarize(createHomePrototypeStore(storage, () => today).load(), 'receivable').amount,
    ).toBe(780_000);
    storage.setItem('debtnote:home-prototype:v1', '{invalid');
    expect(summarize(store.load(), 'receivable').amount).toBe(940_000);
    store.save([]);
    expect(store.load()).toEqual([]);
  });
});
