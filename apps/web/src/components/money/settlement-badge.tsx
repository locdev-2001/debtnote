import type { ComponentSize } from '../../design/component-size';
import { type DeadlineKind, type SettlementState, settlementStates } from './presentation';

export function SettlementBadge({
  state,
  size = 'small',
}: {
  state: SettlementState;
  size?: ComponentSize;
}) {
  const presentation = settlementStates[state];
  return (
    <span className="settlement-badge" data-tone={presentation.tone} data-component-size={size}>
      <span className="settlement-dot" aria-hidden="true" />
      {presentation.label}
    </span>
  );
}

export function DeadlineBadge({
  label,
  kind,
  size = 'small',
}: {
  label: string;
  kind: DeadlineKind;
  size?: ComponentSize;
}) {
  return (
    <span className="deadline-badge" data-deadline={kind} data-component-size={size}>
      {label}
    </span>
  );
}

export function DisputeBadge({ size = 'small' }: { size?: ComponentSize }) {
  return (
    <span className="dispute-badge" data-component-size={size}>
      Báo sai
    </span>
  );
}
