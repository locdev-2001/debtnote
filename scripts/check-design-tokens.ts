import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tokenCss = readFileSync(
  new URL('../apps/web/src/design/tokens.css', import.meta.url),
  'utf8',
);

function parseDeclarations(css: string): Record<string, string> {
  return Object.fromEntries(
    [...css.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((match) => [
      match[1] ?? '',
      match[2]?.trim() ?? '',
    ]),
  );
}

function luminance(hexColor: string): number {
  assert.match(hexColor, /^#[a-f0-9]{6}$/i, 'Màu kiểm tra phải là hex 6 ký tự.');
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(hexColor.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return (channels[0] ?? 0) * 0.2126 + (channels[1] ?? 0) * 0.7152 + (channels[2] ?? 0) * 0.0722;
}

const baseTokens = parseDeclarations(tokenCss.slice(0, tokenCss.indexOf('}')));
const contrastPairs = [
  ['--text-primary', '--surface-app', 4.5],
  ['--text-secondary', '--surface-app', 4.5],
  ['--text-secondary', '--surface-card', 4.5],
  ['--text-secondary', '--surface-subtle', 4.5],
  ['--text-primary', '--mascot-welcome-surface', 4.5],
  ['--text-primary', '--mascot-settled-surface', 4.5],
  ['--text-primary', '--mascot-reminder-surface', 4.5],
  ['--text-primary', '--mascot-upcoming-surface', 4.5],
  ['--text-primary', '--mascot-overdue-surface', 4.5],
  ['--text-primary', '--mascot-snoozed-surface', 4.5],
  ['--text-primary', '--mascot-partial-surface', 4.5],
  ['--text-primary', '--mascot-confirmation-surface', 4.5],
  ['--action-on-primary', '--action-primary', 4.5],
  ['--action-on-primary', '--action-primary-hover', 4.5],
  ['--money-receivable-text', '--money-receivable-surface', 4.5],
  ['--money-payable-text', '--money-payable-surface', 4.5],
  ['--money-receivable-text', '--money-receivable-selected', 4.5],
  ['--money-payable-text', '--money-payable-selected', 4.5],
  ['--money-receivable-amount', '--surface-row', 4.5],
  ['--money-payable-amount', '--surface-row', 4.5],
  ['--settlement-pending-text', '--settlement-pending-surface', 4.5],
  ['--settlement-partial-text', '--settlement-partial-surface', 4.5],
  ['--settlement-confirmation-text', '--settlement-confirmation-surface', 4.5],
  ['--settlement-paid-text', '--settlement-paid-surface', 4.5],
  ['--deadline-attention-text', '--deadline-attention-surface', 4.5],
  ['--dispute-text', '--dispute-surface', 4.5],
  ['--feedback-error-text', '--feedback-error-surface', 4.5],
  ['--input-text', '--input-surface', 4.5],
  ['--input-error-text', '--input-error-surface', 4.5],
  ['--input-surface', '--surface-card', 3],
] as const;

for (const template of ['sage', 'mist', 'sand']) {
  const templateBlock =
    tokenCss.match(new RegExp(`\\[data-design-theme="${template}"\\]\\s*\\{([^}]+)\\}`))?.[1] ?? '';
  const templateTokens = { ...baseTokens, ...parseDeclarations(templateBlock) };

  for (const [foreground, background, minimum] of contrastPairs) {
    const foregroundLuminance = luminance(templateTokens[foreground] ?? '');
    const backgroundLuminance = luminance(templateTokens[background] ?? '');
    const ratio =
      (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
      (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
    assert.ok(
      ratio >= minimum,
      `${template}: ${foreground}/${background} chỉ đạt ${ratio.toFixed(2)}:1.`,
    );
  }
}

assert.equal(baseTokens['--font-body']?.startsWith('"Manrope Variable"'), true);
assert.ok(Number.parseFloat(baseTokens['--size-touch-target'] ?? '') * 16 >= 44);
assert.ok(Number.parseFloat(baseTokens['--size-control'] ?? '') * 16 >= 44);
console.info('Đã kiểm tra 3 template: chữ trên màu solid, nền nhập liệu, Manrope và vùng chạm.');
