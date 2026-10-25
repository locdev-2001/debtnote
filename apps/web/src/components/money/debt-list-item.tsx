import { AppIcon } from '../app-icon';
import { PersonAvatar } from '../people/person-avatar';
import { MoneyAmount } from './money-amount';
import type { DeadlineKind, MoneyDirection, SettlementState } from './presentation';
import { DeadlineBadge, SettlementBadge } from './settlement-badge';

export interface DebtListItemProps {
  name: string;
  amount: number;
  direction: MoneyDirection;
  state: SettlementState;
  description: string;
  deadline?: { label: string; kind: DeadlineKind };
  onOpen: () => void;
}

export function DebtListItem({
  name,
  amount,
  direction,
  state,
  description,
  deadline,
  onOpen,
}: DebtListItemProps) {
  return (
    <button type="button" className="debt-list-item" onClick={onOpen}>
      <PersonAvatar name={name} />
      <span className="debt-person">
        <span className="debt-name">{name}</span>
        <span className="debt-description">{description}</span>
        <span className="debt-signals">
          <SettlementBadge state={state} />
          {deadline && <DeadlineBadge label={deadline.label} kind={deadline.kind} />}
        </span>
      </span>
      <span className="debt-trailing">
        <MoneyAmount amount={amount} direction={direction} />
        <AppIcon name="open" size="compact" />
      </span>
    </button>
  );
}
