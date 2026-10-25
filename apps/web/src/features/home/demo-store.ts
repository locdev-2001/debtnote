import { addDays, type HomeRecord, isDateKey, remainingAmount, summarize } from './ledger';

export function createDemoRecords(today: string): HomeRecord[] {
  return [
    {
      id: 'binh',
      personId: 'binh',
      personName: 'Bình',
      direction: 'receivable',
      principalAmount: 360_000,
      confirmedAmounts: [200_000],
      awaitingConfirmation: false,
      deadline: null,
      note: 'Phần chia bill cuối tuần',
    },
    {
      id: 'chi',
      personId: 'chi',
      personName: 'Chi',
      direction: 'receivable',
      principalAmount: 360_000,
      confirmedAmounts: [],
      awaitingConfirmation: false,
      deadline: { date: addDays(today, 1), promised: true },
      note: 'Phần chia bill cuối tuần',
    },
    {
      id: 'dung',
      personId: 'dung',
      personName: 'Dũng',
      direction: 'receivable',
      principalAmount: 210_000,
      confirmedAmounts: [],
      awaitingConfirmation: false,
      deadline: { date: addDays(today, -2), promised: false },
      note: 'Khoản ứng hộ',
    },
    {
      id: 'em',
      personId: 'em',
      personName: 'Em',
      direction: 'receivable',
      principalAmount: 210_000,
      confirmedAmounts: [],
      awaitingConfirmation: false,
      deadline: { date: today, promised: false },
      note: 'Phần chia bill cuối tuần',
    },
    {
      id: 'linh',
      personId: 'linh',
      personName: 'Linh',
      direction: 'payable',
      principalAmount: 200_000,
      confirmedAmounts: [],
      awaitingConfirmation: false,
      deadline: { date: addDays(today, 5), promised: false },
      note: 'Tiền vé Linh đã trả hộ',
    },
  ];
}

type PrototypeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export interface HomePrototypeStore {
  people: readonly { id: string; name: string }[];
  load: () => HomeRecord[];
  save: (records: readonly HomeRecord[]) => boolean;
  reset: () => HomeRecord[];
}
const storageKey = 'debtnote:home-prototype:v1';

function isHomeRecord(candidate: unknown): candidate is HomeRecord {
  if (!candidate || typeof candidate !== 'object') return false;
  const record = candidate as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    !record.id ||
    typeof record.personId !== 'string' ||
    !record.personId ||
    typeof record.personName !== 'string' ||
    !record.personName.trim() ||
    typeof record.note !== 'string' ||
    !['receivable', 'payable'].includes(String(record.direction)) ||
    typeof record.awaitingConfirmation !== 'boolean' ||
    !Number.isSafeInteger(record.principalAmount) ||
    Number(record.principalAmount) <= 0 ||
    !Array.isArray(record.confirmedAmounts) ||
    !record.confirmedAmounts.every(
      (amount: unknown) => Number.isSafeInteger(amount) && Number(amount) > 0,
    )
  )
    return false;
  if (record.deadline !== null) {
    if (!record.deadline || typeof record.deadline !== 'object') return false;
    const deadline = record.deadline as Record<string, unknown>;
    if (!isDateKey(deadline.date) || typeof deadline.promised !== 'boolean') return false;
  }
  try {
    remainingAmount(candidate as HomeRecord);
    return true;
  } catch {
    return false;
  }
}

export function createHomePrototypeStore(
  storage: PrototypeStorage | undefined,
  today: () => string,
): HomePrototypeStore {
  const seed = () => createDemoRecords(today());
  return {
    people: seed().map((record) => ({ id: record.personId, name: record.personName })),
    load() {
      try {
        const saved: unknown = JSON.parse(storage?.getItem(storageKey) ?? 'null');
        if (
          saved &&
          typeof saved === 'object' &&
          'version' in saved &&
          saved.version === 1 &&
          'records' in saved &&
          Array.isArray(saved.records) &&
          saved.records.every(isHomeRecord) &&
          new Set(saved.records.map((record) => record.id)).size === saved.records.length
        ) {
          summarize(saved.records, 'receivable');
          summarize(saved.records, 'payable');
          return saved.records;
        }
      } catch {
        /* Dữ liệu mẫu hỏng được thay bằng bộ mẫu, không ảnh hưởng sổ thật. */
      }
      return seed();
    },
    save(records) {
      try {
        if (!storage) return false;
        storage.setItem(storageKey, JSON.stringify({ version: 1, records }));
        return true;
      } catch {
        return false;
      }
    },
    reset() {
      try {
        storage?.removeItem(storageKey);
      } catch {
        /* Chế độ riêng tư có thể chặn storage. */
      }
      return seed();
    },
  };
}

export function browserPrototypeStorage(): PrototypeStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
