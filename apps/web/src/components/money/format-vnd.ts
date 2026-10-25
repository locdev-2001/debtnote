import { assertMinorUnits } from '@debtnote/money-core';
import { numericFormatter } from 'react-number-format';

export const vndCurrencySymbol = '₫';
export const vndNumberFormat = {
  thousandSeparator: '.',
  decimalSeparator: ',',
  decimalScale: 0,
  allowNegative: false,
  allowLeadingZeros: false,
  allowedDecimalSeparators: [] as string[],
};

export function formatVnd(amount: number): string {
  assertMinorUnits(amount);
  return `${numericFormatter(String(amount), vndNumberFormat)}\u00a0${vndCurrencySymbol}`;
}

export function isSafeVndInput(digits: string): boolean {
  if (digits === '') return true;
  if (!/^\d+$/.test(digits)) return false;
  try {
    assertMinorUnits(Number(digits));
    return true;
  } catch {
    return false;
  }
}

export function parseVndPaste(input: string): string | null {
  const amountText = input
    .trim()
    .replace(/^VND\s*/i, '')
    .replace(/\s*(?:₫|đ|VND)$/iu, '')
    .trim();
  if (amountText === '') return '';
  if (!/^\d+$/.test(amountText) && !/^\d{1,3}([.\s])\d{3}(?:\1\d{3})*$/.test(amountText)) {
    return null;
  }
  const digits = amountText.replace(/[.,\s]/g, '').replace(/^0+(?=\d)/, '');
  return isSafeVndInput(digits) ? digits : null;
}
