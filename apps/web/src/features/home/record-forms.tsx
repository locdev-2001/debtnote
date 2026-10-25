import { type FormEvent, useState } from 'react';
import { ActionButton } from '../../components/actions/action-button';
import { ChoiceGroup } from '../../components/actions/choice-group';
import { AmountField } from '../../components/money/amount-field';
import { formatVnd } from '../../components/money/format-vnd';
import { MoneyAmount } from '../../components/money/money-amount';
import type { MoneyDirection } from '../../components/money/presentation';
import { addDays, type HomeRecord, receiptError, remainingAmount } from './ledger';

function AmountPresets({
  amounts,
  selected,
  onSelect,
  fullAmount,
}: {
  amounts: readonly number[];
  selected: string;
  onSelect: (amount: number) => void;
  fullAmount?: number;
}) {
  return (
    <div className="home-money-presets">
      {[...new Set(amounts)].map((amount) => (
        <button
          type="button"
          key={amount}
          aria-pressed={selected === String(amount)}
          onClick={() => onSelect(amount)}
        >
          {amount === fullAmount ? 'Nhận đủ' : formatVnd(amount)}
        </button>
      ))}
    </div>
  );
}

export function ReceivePaymentForm({
  record,
  onConfirm,
}: {
  record: HomeRecord;
  onConfirm: (amount: number) => void;
}) {
  const outstanding = remainingAmount(record);
  const [amount, setAmount] = useState(String(outstanding));
  const [valid, setValid] = useState(true);
  const issue = amount === '' ? undefined : receiptError(record, Number(amount));
  function submit(event: FormEvent) {
    event.preventDefault();
    if (valid && amount && !issue) onConfirm(Number(amount));
  }
  return (
    <form className="home-form" onSubmit={submit}>
      <p className="home-sheet-description">
        Còn lại <MoneyAmount amount={outstanding} />.
      </p>
      <AmountField
        label="Số tiền"
        value={amount}
        onChange={setAmount}
        onValidityChange={setValid}
        {...(issue ? { error: issue } : {})}
      />
      <AmountPresets
        amounts={[50_000, 100_000, outstanding].filter((preset) => preset <= outstanding)}
        selected={amount}
        fullAmount={outstanding}
        onSelect={(preset) => {
          setAmount(String(preset));
          setValid(true);
        }}
      />
      <ActionButton type="submit" icon="check" disabled={!valid || !amount || Boolean(issue)}>
        Xác nhận
      </ActionButton>
    </form>
  );
}

export function PromiseForm({
  record,
  today,
  onConfirm,
}: {
  record: HomeRecord;
  today: string;
  onConfirm: (date: string) => void;
}) {
  const [date, setDate] = useState(
    record.deadline && record.deadline.date >= today ? record.deadline.date : addDays(today, 1),
  );
  function submit(event: FormEvent) {
    event.preventDefault();
    if (date >= today) onConfirm(date);
  }
  return (
    <form className="home-form" onSubmit={submit}>
      <p className="home-sheet-description">Còn {formatVnd(remainingAmount(record))}.</p>
      <label className="money-form-field">
        Ngày hẹn
        <input
          type="date"
          required
          min={today}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>
      <div className="home-money-presets">
        {[
          { days: 1, label: 'Ngày mai' },
          { days: 3, label: '3 ngày nữa' },
          { days: 7, label: 'Tuần sau' },
        ].map((option) => (
          <button
            type="button"
            key={option.days}
            aria-pressed={date === addDays(today, option.days)}
            onClick={() => setDate(addDays(today, option.days))}
          >
            {option.label}
          </button>
        ))}
      </div>
      <ActionButton type="submit" icon="calendar" disabled={!date || date < today}>
        Lưu hẹn
      </ActionButton>
    </form>
  );
}

export interface QuickRecordDraft {
  personId: string | null;
  personName: string;
  direction: MoneyDirection;
  amount: number;
}

export function QuickEntryForm({
  people,
  onConfirm,
}: {
  people: readonly { id: string; name: string }[];
  onConfirm: (draft: QuickRecordDraft) => void;
}) {
  const [direction, setDirection] = useState<MoneyDirection>('receivable');
  const [personId, setPersonId] = useState(people[0]?.id ?? 'other');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [valid, setValid] = useState(true);
  const selectedName =
    personId === 'other'
      ? personName.trim()
      : (people.find((person) => person.id === personId)?.name ?? '');
  const ready = valid && amount !== '' && Number(amount) > 0 && Boolean(selectedName);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (ready)
      onConfirm({
        personId: personId === 'other' ? null : personId,
        personName: selectedName,
        direction,
        amount: Number(amount),
      });
  }
  return (
    <form className="home-form" onSubmit={submit}>
      <ChoiceGroup
        label="Chiều khoản tiền"
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'receivable', label: 'Cần thu' },
          { value: 'payable', label: 'Cần trả' },
        ]}
      />
      <label className="money-form-field">
        Người
        <select value={personId} onChange={(event) => setPersonId(event.target.value)}>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
          <option value="other">Người khác…</option>
        </select>
      </label>
      {personId === 'other' && (
        <label className="money-form-field">
          Tên người
          <input
            value={personName}
            onChange={(event) => setPersonName(event.target.value)}
            required
            maxLength={60}
          />
        </label>
      )}
      <AmountField
        label="Số tiền"
        value={amount}
        onChange={setAmount}
        onValidityChange={setValid}
      />
      <AmountPresets
        amounts={[50_000, 100_000, 200_000, 500_000]}
        selected={amount}
        onSelect={(preset) => {
          setAmount(String(preset));
          setValid(true);
        }}
      />
      <ActionButton type="submit" icon="add" disabled={!ready}>
        Thêm khoản
      </ActionButton>
    </form>
  );
}
