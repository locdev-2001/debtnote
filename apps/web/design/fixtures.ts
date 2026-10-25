import type { DebtListItemProps } from '../src/components/money/debt-list-item';
import { formatVnd } from '../src/components/money/format-vnd';

export const exampleDebts: (Omit<DebtListItemProps, 'onOpen'> & { id: string })[] = [
  {
    id: 'binh',
    name: 'Bình',
    amount: 160_000,
    direction: 'receivable',
    state: 'partial',
    description: `Đã nhận ${formatVnd(200_000)} · còn một phần`,
  },
  {
    id: 'chi',
    name: 'Chi',
    amount: 360_000,
    direction: 'receivable',
    state: 'unpaid',
    description: 'Phần chia bill cuối tuần',
    deadline: { label: 'Hẹn ngày mai', kind: 'promised' },
  },
  {
    id: 'dung',
    name: 'Dũng',
    amount: 210_000,
    direction: 'receivable',
    state: 'unpaid',
    description: 'Khoản ứng hộ',
    deadline: { label: 'Quá hạn 2 ngày', kind: 'overdue' },
  },
  {
    id: 'em',
    name: 'Em',
    amount: 210_000,
    direction: 'receivable',
    state: 'unpaid',
    description: 'Phần chia bill cuối tuần',
  },
  {
    id: 'linh',
    name: 'Linh',
    amount: 200_000,
    direction: 'payable',
    state: 'unpaid',
    description: 'Tiền vé Linh đã trả hộ',
    deadline: { label: 'Cuối tuần này', kind: 'upcoming' },
  },
];
