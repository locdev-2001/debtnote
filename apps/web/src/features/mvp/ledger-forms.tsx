import type { DebtView, Direction, LedgerSnapshot, Person } from '@debtnote/contracts';
import { useState } from 'react';
import { ActionButton } from '../../components/actions/action-button';
import { ChoiceGroup } from '../../components/actions/choice-group';
import { DatePickerField } from '../../components/dates/date-picker-field';
import { PromiseDateField } from '../../components/dates/promise-date-field';
import { AmountField } from '../../components/money/amount-field';
import { AmountPresets } from '../../components/money/amount-presets';
import { MoneyAmount } from '../../components/money/money-amount';
import { addDays } from '../../lib/calendar';
import { apiClient } from '../../lib/rpc';

type Performer = <Result>(
  operation: () => Promise<Result>,
  message?: string,
) => Promise<Result | undefined>;

export function QuickDebtEditor({
  people,
  today,
  pending,
  perform,
  onSaved,
}: {
  people: readonly Person[];
  today: string;
  pending: boolean;
  perform: Performer;
  onSaved: (direction: Direction) => void;
}) {
  const [commandId] = useState(() => crypto.randomUUID());
  const [personId, setPersonId] = useState(people[0]?.id ?? 'new');
  const [name, setName] = useState('');
  const [direction, setDirection] = useState<Direction>('receivable');
  const [amount, setAmount] = useState('');
  const [valid, setValid] = useState(true);
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const ready = valid && Number(amount) > 0 && (personId !== 'new' || name.trim());
  return (
    <form
      className="mvp-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!ready) return;
        const result = await perform(
          () =>
            apiClient.ledger.createDebt.mutate({
              commandId,
              ...(personId === 'new' ? { personName: name.trim() } : { personId }),
              direction,
              amount: Number(amount),
              note,
              dueDate: dueDate || null,
            }),
          'Đã thêm khoản.',
        );
        if (result) onSaved(direction);
      }}
    >
      <fieldset disabled={pending}>
        <ChoiceGroup
          label="Chiều tiền"
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
            <option value="new">Thêm người…</option>
          </select>
        </label>
        {personId === 'new' && (
          <label className="money-form-field">
            Tên người
            <input
              value={name}
              maxLength={60}
              required
              onChange={(event) => setName(event.target.value)}
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
        <details className="mvp-details">
          <summary>Thêm ghi chú, ngày hẹn</summary>
          <div className="mvp-form">
            <label className="money-form-field">
              Ghi chú
              <input
                maxLength={160}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <DatePickerField
              label="Ngày đến hạn"
              value={dueDate}
              minDate={addDays(today, -36525)}
              onChange={setDueDate}
            />
          </div>
        </details>
        <ActionButton type="submit" icon="add" pending={pending} disabled={!ready}>
          Thêm khoản
        </ActionButton>
      </fieldset>
    </form>
  );
}

export function PaymentEditor({
  records,
  personId,
  direction,
  initialIds,
  pending,
  perform,
  onSaved,
}: {
  records: readonly DebtView[];
  personId: string;
  direction: Direction;
  initialIds: readonly string[];
  pending: boolean;
  perform: Performer;
  onSaved: () => void;
}) {
  const [commandId] = useState(() => crypto.randomUUID());
  const available = records
    .filter(
      (record) =>
        record.personId === personId &&
        record.direction === direction &&
        record.remainingAmount > 0,
    )
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(initialIds);
  const total = available
    .filter((record) => selectedIds.includes(record.id))
    .reduce((sum, record) => sum + record.remainingAmount, 0);
  const [amount, setAmount] = useState(String(total));
  const [valid, setValid] = useState(true);
  const [autoAmount, setAutoAmount] = useState(true);
  const excess = Math.max(0, Number(amount) - total);
  return (
    <form
      className="mvp-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!valid || !selectedIds.length || Number(amount) <= 0) return;
        const result = await perform(
          () =>
            apiClient.ledger.payment.mutate({
              commandId,
              personId,
              direction,
              debtIds: available
                .filter((record) => selectedIds.includes(record.id))
                .map((record) => record.id),
              amount: Number(amount),
              note: '',
            }),
          direction === 'receivable' ? 'Đã nhận tiền.' : 'Đã ghi nhận trả tiền.',
        );
        if (result) onSaved();
      }}
    >
      <fieldset disabled={pending}>
        {available.length > 1 && (
          <div className="mvp-list">
            {available.map((record) => (
              <label className="mvp-checkbox-row" key={record.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(record.id)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...selectedIds, record.id]
                      : selectedIds.filter((id) => id !== record.id);
                    setSelectedIds(next);
                    if (autoAmount)
                      setAmount(
                        String(
                          available
                            .filter((item) => next.includes(item.id))
                            .reduce((sum, item) => sum + item.remainingAmount, 0),
                        ),
                      );
                  }}
                />
                <span>{record.note || 'Khoản tiền'}</span>
                <MoneyAmount amount={record.remainingAmount} />
              </label>
            ))}
          </div>
        )}
        <div className="mvp-line">
          <span>Còn lại</span>
          <MoneyAmount amount={total} />
        </div>
        <AmountField
          label={direction === 'receivable' ? 'Số đã nhận' : 'Số đã trả'}
          value={amount}
          onChange={(value) => {
            setAmount(value);
            setAutoAmount(false);
          }}
          onValidityChange={setValid}
        />
        <AmountPresets
          amounts={[50_000, 100_000, total].filter((preset) => preset > 0)}
          fullAmount={total}
          fullLabel="Toàn bộ"
          selected={amount}
          onSelect={(preset) => {
            setAmount(String(preset));
            setAutoAmount(preset === total);
            setValid(true);
          }}
        />
        {excess > 0 && (
          <p className="mvp-caption">
            Tiền thừa giữ riêng: <MoneyAmount amount={excess} />
          </p>
        )}
        <ActionButton
          type="submit"
          icon="check"
          pending={pending}
          disabled={!valid || !selectedIds.length || Number(amount) <= 0}
        >
          Xác nhận
        </ActionButton>
      </fieldset>
    </form>
  );
}

export function OwnerPromiseEditor({
  record,
  today,
  pending,
  perform,
  onSaved,
}: {
  record: DebtView;
  today: string;
  pending: boolean;
  perform: Performer;
  onSaved: () => void;
}) {
  const [commandId] = useState(() => crypto.randomUUID());
  const [date, setDate] = useState(
    record.promisedDate && record.promisedDate >= today ? record.promisedDate : addDays(today, 1),
  );
  const [amount, setAmount] = useState(String(record.promisedAmount || record.remainingAmount));
  const [valid, setValid] = useState(true);
  return (
    <form
      className="mvp-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!valid || Number(amount) <= 0 || Number(amount) > record.remainingAmount) return;
        const result = await perform(
          () =>
            apiClient.ledger.promise.mutate({
              commandId,
              debtId: record.id,
              date,
              amount: Number(amount),
            }),
          'Đã lưu hẹn.',
        );
        if (result) onSaved();
      }}
    >
      <fieldset disabled={pending}>
        <PromiseDateField value={date} today={today} onChange={setDate} />
        <details
          className="mvp-details"
          open={
            (record.promisedAmount > 0 && record.promisedAmount < record.remainingAmount) ||
            undefined
          }
        >
          <summary>Hẹn một phần</summary>
          <AmountField
            label="Số hẹn trả"
            value={amount}
            onChange={setAmount}
            onValidityChange={setValid}
            {...(Number(amount) > record.remainingAmount ? { error: 'Vượt số còn nợ.' } : {})}
          />
        </details>
        <ActionButton
          type="submit"
          icon="calendar"
          pending={pending}
          disabled={
            !valid || Number(amount) <= 0 || Number(amount) > record.remainingAmount || date < today
          }
        >
          Lưu hẹn
        </ActionButton>
      </fieldset>
    </form>
  );
}

export function PersonEditor({
  person,
  perform,
  pending,
  onSaved,
}: {
  person?: Person;
  perform: Performer;
  pending: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState(person?.name ?? '');
  const [phone, setPhone] = useState(person?.phone ?? '');
  return (
    <form
      className="mvp-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await perform(
          () =>
            apiClient.ledger.person.mutate({
              ...(person ? { id: person.id } : {}),
              name: name.trim(),
              phone,
            }),
          'Đã lưu người.',
        );
        if (result) onSaved();
      }}
    >
      <fieldset disabled={pending}>
        <label className="money-form-field">
          Tên
          <input
            value={name}
            maxLength={60}
            required
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="money-form-field">
          SĐT · tùy chọn
          <input
            type="tel"
            value={phone}
            maxLength={20}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <ActionButton type="submit" pending={pending} disabled={!name.trim()}>
          Lưu
        </ActionButton>
      </fieldset>
    </form>
  );
}

export function LedgerHistory({
  snapshot,
  debtId,
  personId,
  billId,
}: {
  snapshot: LedgerSnapshot;
  debtId?: string;
  personId?: string;
  billId?: string;
}) {
  const events = snapshot.events
    .filter(
      (event) =>
        (!debtId || event.debtId === debtId) &&
        (!personId || event.personId === personId) &&
        (!billId || event.billId === billId),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return events.length ? (
    <ol className="mvp-timeline">
      {events.map((event) => (
        <li key={event.id}>
          <span>{event.summary}</span>
          {event.amount !== null && <MoneyAmount amount={event.amount} />}
          <time dateTime={event.createdAt}>
            {new Date(event.createdAt).toLocaleString('vi-VN')}
          </time>
        </li>
      ))}
    </ol>
  ) : (
    <p className="mvp-caption">Chưa có lịch sử.</p>
  );
}
