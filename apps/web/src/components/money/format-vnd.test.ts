import { describe, expect, it } from 'vitest';
import { formatVnd, isSafeVndInput, parseVndPaste } from './format-vnd';

describe('tiền VND dùng chung cho nhập và hiển thị', () => {
  it('format số không, số lớn và giới hạn an toàn mà không làm tròn', () => {
    expect(formatVnd(0)).toBe('0\u00a0₫');
    expect(formatVnd(1_234_567)).toBe('1.234.567\u00a0₫');
    expect(formatVnd(Number.MAX_SAFE_INTEGER)).toBe('9.007.199.254.740.991\u00a0₫');
    expect(() => formatVnd(1.5)).toThrow();
  });

  it.each(['1.234.567 ₫', '1.234.567đ', 'VND 1234567', '1 234 567'])(
    'đọc đúng tiền dán: %s',
    (amount) => {
      expect(parseVndPaste(amount)).toBe('1234567');
    },
  );

  it.each(['-1000', '1.234,56', '1,50', '1,234,567', '12.34', '9.007.199.254.740.992', 'abc'])(
    'không tự cắt phần lẻ hoặc đổi nghĩa: %s',
    (amount) => {
      expect(parseVndPaste(amount)).toBeNull();
    },
  );

  it('cho phép xóa trắng và từ chối số vượt giới hạn', () => {
    expect(isSafeVndInput('')).toBe(true);
    expect(isSafeVndInput('9007199254740992')).toBe(false);
    expect(parseVndPaste('0001000')).toBe('1000');
  });
});
