import { describe, expect, it } from 'vitest';
import { NapasPaymentCodeFormatter, PaymentCodeRenderer } from './payment-code';

function crc(payload: string) {
  let result = 0xffff;
  for (const byte of Buffer.from(payload)) {
    result ^= byte << 8;
    for (let bit = 0; bit < 8; bit++)
      result = result & 0x8000 ? ((result << 1) ^ 0x1021) & 0xffff : (result << 1) & 0xffff;
  }
  return result.toString(16).toUpperCase().padStart(4, '0');
}
const source = '00020101021138140010A00000072753037045802VN6304';
describe('adapter mã nhận tiền', () => {
  it('giữ nguyên mã app không thuộc chuẩn đã hỗ trợ', () => {
    const renderer = new PaymentCodeRenderer([new NapasPaymentCodeFormatter()]);
    const opaque = 'bankapp://receive?account=synthetic-fixture';
    expect(renderer.build(opaque, 160_000, 'DNTEST')).toBe(opaque);
  });
  it('thêm số tiền/nội dung vào mã đúng chuẩn và tính lại CRC, giữ phần người nhận', () => {
    const formatter = new NapasPaymentCodeFormatter();
    const payload = source + crc(source);
    expect(formatter.supports(payload)).toBe(true);
    const result = formatter.format(payload, 160_000, 'DNTEST');
    expect(result).toContain('38140010A000000727');
    expect(result).toContain('5406160000');
    expect(result).toContain('0806DNTEST');
    expect(formatter.supports(result)).toBe(true);
    expect(result.slice(-4)).toBe(crc(result.slice(0, -4)));
    expect(formatter.supports(payload.slice(0, -1) + 'Z')).toBe(false);
  });
});
