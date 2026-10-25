import { createHash, randomUUID } from 'node:crypto';

export const systemClock = {
  now: () => new Date().toISOString(),
  today: () =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
  scheduledAt: (date: string, hour: number) =>
    new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+07:00`).toISOString(),
};
export const systemIds = {
  create: randomUUID,
  digest: (value: string) => createHash('sha256').update(value).digest('hex'),
};
