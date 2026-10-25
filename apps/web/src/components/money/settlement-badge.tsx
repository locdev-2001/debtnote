import { type DeadlineKind, type SettlementState, settlementStates } from './presentation';

export function SettlementBadge({ state }: { state: SettlementState }) {
  const presentation = settlementStates[state];
  return (
    <span className="settlement-badge" data-tone={presentation.tone}>
      <span className="settlement-dot" aria-hidden="true" />
      {presentation.label}
    </span>
  );
}

export function DeadlineBadge({ label, kind }: { label: string; kind: DeadlineKind }) {
  return (
    <span className="deadline-badge" data-deadline={kind}>
      {label}
    </span>
  );
}

export function DisputeBadge() {
  return <span className="dispute-badge">Đang báo sai</span>;
}
