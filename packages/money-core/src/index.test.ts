import { describe, expect, it } from 'vitest';
import { calculateBillSplit, calculateOutstandingAmount, splitEvenly } from './index';

describe('chia tiền', () => {
  it('chia đúng bill có người đến muộn, không uống bia và dùng món riêng', () => {
    const participants = ['an', 'binh', 'chi', 'dung', 'em'];
    const itemShares = [
      ...splitEvenly(600_000, participants.slice(0, 4)),
      ...splitEvenly(300_000, participants),
      ...splitEvenly(450_000, participants.slice(0, 3)),
      ...splitEvenly(150_000, ['em']),
    ];
    const participantTotals = Object.fromEntries(
      participants.map((participantId) => [
        participantId,
        itemShares
          .filter((share) => share.participantId === participantId)
          .reduce((total, share) => total + share.amount, 0),
      ]),
    );

    expect(participantTotals).toEqual({
      an: 360_000,
      binh: 360_000,
      chi: 360_000,
      dung: 210_000,
      em: 210_000,
    });
    expect(Object.values(participantTotals).reduce((total, amount) => total + amount, 0)).toBe(
      1_500_000,
    );
  });

  it('phân bổ phần dư ổn định dù thứ tự chọn người thay đổi', () => {
    expect(splitEvenly(100, ['chi', 'an', 'binh'])).toEqual([
      { participantId: 'an', amount: 34 },
      { participantId: 'binh', amount: 33 },
      { participantId: 'chi', amount: 33 },
    ]);
    expect(splitEvenly(100, ['chi', 'an', 'binh'])).toEqual(
      splitEvenly(100, ['binh', 'chi', 'an']),
    );
  });

  it('giữ đúng tổng ở giới hạn số nguyên an toàn', () => {
    const shares = splitEvenly(Number.MAX_SAFE_INTEGER, ['an', 'binh', 'chi']);
    expect(shares.reduce((total, share) => total + share.amount, 0)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('cho phép chia khoản bằng không', () => {
    expect(splitEvenly(0, ['an'])).toEqual([{ participantId: 'an', amount: 0 }]);
  });

  it.each([-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'từ chối số tiền không hợp lệ: %s',
    (amount) => expect(() => splitEvenly(amount, ['an'])).toThrow(RangeError),
  );

  it.each([{ participantIds: [] }, { participantIds: ['an', 'an'] }, { participantIds: [' '] }])(
    'từ chối danh sách người không hợp lệ: $participantIds',
    ({ participantIds }) => {
      expect(() => splitEvenly(100, participantIds)).toThrow();
    },
  );
});

describe('số tiền còn nợ', () => {
  it('hỗ trợ nhiều lần trả một phần', () => {
    expect(calculateOutstandingAmount(360_000, [100_000, 100_000])).toBe(160_000);
  });

  it('cho kết quả bằng không khi thanh toán đủ', () => {
    expect(calculateOutstandingAmount(360_000, [200_000, 160_000])).toBe(0);
  });

  it('không cho phân bổ quá số nợ hoặc phân bổ âm', () => {
    expect(() => calculateOutstandingAmount(360_000, [400_000])).toThrow(RangeError);
    expect(() => calculateOutstandingAmount(360_000, [-1])).toThrow(RangeError);
  });
});

describe('phí và giảm giá theo phần dùng thực tế', () => {
  it('giữ từng đồng ở biên số nguyên an toàn', () => {
    const result = calculateBillSplit(
      [{ amount: Number.MAX_SAFE_INTEGER - 5, participantIds: ['a', 'b', 'c'] }],
      ['a', 'b', 'c'],
      'custom',
      5,
      7,
    );
    expect(result.shares.reduce((sum, share) => sum + share.amount, 0)).toBe(
      Number.MAX_SAFE_INTEGER - 7,
    );
    expect(
      result.shares.every((share) => Number.isSafeInteger(share.amount) && share.amount >= 0),
    ).toBe(true);
  });
  it('người không dùng món không bị gánh phí và giảm giá của món đó', () => {
    const result = calculateBillSplit(
      [{ amount: 101, participantIds: ['a', 'b'] }],
      ['a', 'b', 'c'],
      'custom',
      10,
      8,
    );
    expect(result.totalAmount).toBe(103);
    expect(result.shares.find((share) => share.participantId === 'c')?.amount).toBe(0);
    expect(result.shares.reduce((sum, share) => sum + share.amount, 0)).toBe(103);
    expect(
      calculateBillSplit(
        [{ amount: 101, participantIds: ['b', 'a'] }],
        ['c', 'b', 'a'],
        'custom',
        10,
        8,
      )
        .shares.slice()
        .sort((left, right) => left.participantId.localeCompare(right.participantId)),
    ).toEqual(result.shares);
  });
  it('từ chối giảm quá tổng hoặc cộng phí tràn số', () => {
    expect(() =>
      calculateBillSplit([{ amount: 100, participantIds: ['a'] }], ['a'], 'equal', 0, 101),
    ).toThrow();
    expect(() =>
      calculateBillSplit(
        [{ amount: Number.MAX_SAFE_INTEGER, participantIds: ['a'] }],
        ['a'],
        'equal',
        1,
      ),
    ).toThrow();
  });
});
