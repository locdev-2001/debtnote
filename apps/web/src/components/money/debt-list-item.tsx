import type { ComponentSize } from '../../design/component-size';
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
  size?: ComponentSize;
  showDescription?: boolean;
}

export function DebtListItem({
  name,
  amount,
  direction,
  state,
  description,
  deadline,
  onOpen,
  size = 'regular',
  showDescription = false,
}: DebtListItemProps) {
  return (
    <button
      type="button"
      className="debt-list-item"
      data-component-size={size}
      onClick={onOpen}
      title={description}
    >
      <PersonAvatar name={name} size={size} />
      <span className="debt-person">
        <span className="debt-name">{name}</span>
        {showDescription && <span className="debt-description">{description}</span>}
        <span className="debt-signals">
          {!deadline || state === 'confirmation' || state === 'paid' ? (
            <SettlementBadge state={state} />
          ) : (
            <DeadlineBadge label={deadline.label} kind={deadline.kind} />
          )}
        </span>
      </span>
      <span className="debt-trailing">
        <MoneyAmount amount={amount} direction={direction} />
        <AppIcon name="open" size="compact" />
      </span>
    </button>
  );
}
