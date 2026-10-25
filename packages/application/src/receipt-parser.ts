import type { ReceiptOcrResult } from '@debtnote/contracts';

export type { ReceiptOcrResult } from '@debtnote/contracts';
export function parseReceiptText(text: string, confidence: number): ReceiptOcrResult {
  const items: ReceiptOcrResult['items'] = [];
  let detectedTotal: number | null = null;
  for (const original of text.split(/\r?\n/)) {
    const line = original.trim().replace(/\s+/g, ' ');
    const match = line.match(/^(.*?)\s+(\d{1,3}(?:[.,]\d{3})+|\d{4,12})(?:\s*[₫đd]|\s*VND)?$/iu);
    if (!match?.[1] || !match[2]) continue;
    const amount = Number(match[2].replace(/[., ]/g, ''));
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000_000) continue;
    const normalized = match[1]
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/đ/g, 'd')
      .toLowerCase();
    if (/tong|total|thanh toan|t\.cong|cong tien/.test(normalized)) {
      detectedTotal = amount;
      continue;
    }
    if (
      /vat|thue|tax|giam gia|discount|khuyen mai|phi dich vu|service|tien mat|chuyen khoan|tien thua|cash|change|so du|tai khoan|mst|dien thoai|hotline/.test(
        normalized,
      )
    )
      continue;
    const title = match[1]
      .replace(/^\d+[).]?\s*/, '')
      .replace(/\s+\d+(?:[.,]\d{3})*$/, '')
      .trim()
      .slice(0, 80);
    if (title.length < 2 || !/[\p{L}]/u.test(title)) continue;
    if (items.length < 100) items.push({ id: `ocr-${items.length + 1}`, title, amount });
  }
  const issues: string[] = [];
  if (!items.length) issues.push('Chưa đọc được các khoản. Bạn có thể nhập tay.');
  if (confidence < 75) issues.push('Ảnh chưa rõ. Kiểm tra lại tên và số tiền.');
  if (
    detectedTotal !== null &&
    items.reduce((total, item) => total + item.amount, 0) !== detectedTotal
  )
    issues.push('Tổng các khoản chưa khớp tổng bill.');
  return { text: text.slice(0, 30_000), confidence, items, detectedTotal, issues };
}
