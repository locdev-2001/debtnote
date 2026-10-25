import { describe, expect, it } from 'vitest';
import { parseReceiptText } from './receipt-parser';

describe('gợi ý OCR bill', () => {
  it('chỉ lấy thành tiền cuối dòng, không ghép số lượng và đơn giá thành tiền khổng lồ', () => {
    const result = parseReceiptText(
      '1) Nước 2 25.000 50.000\n2) Đồ ăn 1 150.000 150.000\nTổng 200.000\nVAT 10.000\nTiền mặt 210.000',
      95,
    );
    expect(result.items.map((item) => item.amount)).toEqual([50_000, 150_000]);
    expect(result.detectedTotal).toBe(200_000);
    expect(result.issues).toEqual([]);
  });
  it('cảnh báo ảnh mờ, lệch tổng và không tạo khoản nợ', () => {
    const result = parseReceiptText('Cơm 30.000\nTổng 50.000', 40);
    expect(result.items).toHaveLength(1);
    expect(result.issues).toHaveLength(2);
    expect(parseReceiptText('Ảnh không có món', 90).items).toEqual([]);
  });
});
