import type { ReceiptOcrResult } from '@debtnote/contracts';

export type { ReceiptOcrResult } from '@debtnote/contracts';

const amountPattern = String.raw`\d{1,3}(?:[., ]\d{3})+|\d{4,12}`;
const priceLinePattern = new RegExp(
  String.raw`^(.*?)\s*(?:(${amountPattern})\s+(\d{1,3})\s+)?(${amountPattern}|\d{1,3})(?:\s*[₫đd]|\s*VND)?$`,
  'iu',
);
const totalLabel = /^t[eoa]ng\b|total|thanh toan|t\.cong|cong tien/;
const ignoredLabel =
  /vat|thue|tax|giam gia|chiet khau|discount|khuyen mai|phu thu|phi dich vu|service|tien mat|chuyen khoan|khach tra|tien thua|cash|change|so du|tai khoan|mst|dien thoai|hotline|thu ngan/;
const columnHeader = /ten hang|d\.?\s?gia|don gia|\bsl\b|thanh tien/;

function readAmount(value: string | undefined) {
  if (!value || !new RegExp(`^(?:${amountPattern})$`).test(value)) return null;
  const amount = Number(value.replace(/[., ]/g, ''));
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 1_000_000_000_000 ? amount : null;
}

function foldVietnamese(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
}

function cleanTitle(value: string) {
  const words = value
    .replace(new RegExp(String.raw`\s(?:${amountPattern})(?:\s.*)?$`, 'u'), '')
    .split(' ')
    .filter((word) => word.length > 1 && /\p{L}/u.test(word));
  const isUppercaseName = words.some((word) => word.length > 1 && word === word.toUpperCase());
  return words
    .filter((word) => !isUppercaseName || word !== word.toLowerCase())
    .join(' ')
    .replace(/^[^\p{L}]+/u, '')
    .replace(/[^\p{L}\p{N})]+$/u, '');
}

function isNameFragment(line: string) {
  const visible = line.replace(/\s/g, '');
  const letters = visible.match(/\p{L}/gu)?.length ?? 0;
  return letters >= 2 && letters / visible.length >= 0.8;
}

export interface ReceiptLine {
  title: string;
  amount: number;
}

export function summarizeReceipt(reading: {
  text: string;
  confidence: number | null;
  items: ReceiptLine[];
  detectedTotal: number | null;
}): ReceiptOcrResult {
  const items = reading.items
    .filter(
      (item) =>
        item.title.trim().length >= 2 && Number.isSafeInteger(item.amount) && item.amount > 0,
    )
    .slice(0, 100)
    .map((item, index) => ({
      id: `ocr-${index + 1}`,
      title: item.title.trim().slice(0, 80),
      amount: item.amount,
    }));
  const issues: string[] = [];
  if (!items.length) issues.push('Chưa đọc được các khoản. Bạn có thể nhập tay.');
  if (reading.confidence !== null && reading.confidence < 75)
    issues.push('Ảnh chưa rõ. Kiểm tra lại tên và số tiền.');
  if (
    reading.detectedTotal !== null &&
    items.reduce((total, item) => total + item.amount, 0) !== reading.detectedTotal
  )
    issues.push('Tổng các khoản chưa khớp tổng bill.');
  return {
    text: reading.text.slice(0, 30_000),
    confidence: reading.confidence,
    items,
    detectedTotal: reading.detectedTotal,
    issues,
  };
}

export function parseReceiptText(text: string, confidence: number): ReceiptOcrResult {
  const items: ReceiptLine[] = [];
  let detectedTotal: number | null = null;
  let pendingName = '';
  for (const original of text.split(/\r?\n/)) {
    const line = original.trim().replace(/\s+/g, ' ');
    if (!line) continue;
    const folded = foldVietnamese(line);
    const match = line.match(priceLinePattern);
    const unitPrice = readAmount(match?.[2]);
    const quantity = Number(match?.[3] ?? 0);
    const amount = readAmount(match?.[4]) ?? (unitPrice && quantity ? unitPrice * quantity : null);
    if (!match || amount === null) {
      pendingName =
        isNameFragment(line) && !columnHeader.test(folded) && !ignoredLabel.test(folded)
          ? cleanTitle(line)
          : '';
      continue;
    }
    const label = cleanTitle(match[1] ?? '');
    const foldedLabel = foldVietnamese(label);
    if (totalLabel.test(foldedLabel)) {
      detectedTotal = amount;
      pendingName = '';
      continue;
    }
    if (ignoredLabel.test(foldedLabel) || columnHeader.test(foldedLabel)) {
      pendingName = '';
      continue;
    }
    const title = `${pendingName} ${label}`.trim();
    pendingName = '';
    if (title.length < 2 || !/\p{L}/u.test(title)) continue;
    items.push({ title, amount });
  }
  return summarizeReceipt({ text, confidence, items, detectedTotal });
}
