import { splitEvenly } from '@debtnote/money-core';
import { addDays } from '../../lib/calendar';
import type { PaymentRequest, PaymentRequestReader } from './payment-request';

export function createSamplePaymentRequestReader(today: () => string): PaymentRequestReader {
  return { load: async (requestId) => samplePaymentRequest(requestId, today()) };
}

export function samplePaymentRequest(id: string, today: string): PaymentRequest | null {
  const recipients: Record<
    string,
    { personId: string; name: string; confirmed: number[]; access: 'active' | 'expired' }
  > = {
    'mau-binh': { personId: 'binh', name: 'Bình', confirmed: [200_000], access: 'active' },
    'mau-dung': { personId: 'dung', name: 'Dũng', confirmed: [], access: 'active' },
    'mau-da-tra': { personId: 'binh', name: 'Bình', confirmed: [360_000], access: 'active' },
    'mau-het-han': { personId: 'binh', name: 'Bình', confirmed: [], access: 'expired' },
  };
  const recipient = Object.hasOwn(recipients, id) ? recipients[id] : undefined;
  if (!recipient) return null;
  const lines = [
    {
      id: 'shared',
      title: 'Đồ ăn',
      totalAmount: 1_050_000,
      people: ['an', 'binh', 'chi', 'dung', 'em'],
    },
    { id: 'beer', title: 'Bia', totalAmount: 450_000, people: ['an', 'binh', 'chi'] },
  ].map((line) => ({
    id: line.id,
    title: line.title,
    totalAmount: line.totalAmount,
    participantCount: line.people.length,
    personalAmount:
      splitEvenly(line.totalAmount, line.people).find(
        (share) => share.participantId === recipient.personId,
      )?.amount ?? 0,
  }));
  return {
    id,
    recipientName: recipient.name,
    collectorName: 'An',
    principalAmount: lines.reduce((amount, line) => amount + line.personalAmount, 0),
    confirmedAmounts: recipient.confirmed,
    access: recipient.access,
    paymentQrPayload: null,
    dueDate: recipient.personId === 'dung' ? addDays(today, -2) : today,
    billTotal: lines.reduce((amount, line) => amount + line.totalAmount, 0),
    lines,
  };
}
