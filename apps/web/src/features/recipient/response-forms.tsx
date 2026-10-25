import { useState } from 'react';
import { ActionButton } from '../../components/actions/action-button';
import { ChoiceGroup } from '../../components/actions/choice-group';
import { PromiseDateField } from '../../components/dates/promise-date-field';
import { AmountField } from '../../components/money/amount-field';
import { AmountPresets } from '../../components/money/amount-presets';
import { addDays, isDateKey } from '../../lib/calendar';
import {
  type DisputeReason,
  disputeReasons,
  type PaymentRequest,
  type RecipientResponse,
  reportAmountIssue,
  requestOutstanding,
} from './payment-request';

export function ReportPaymentForm({
  request,
  response,
  onConfirm,
}: {
  request: PaymentRequest;
  response: RecipientResponse;
  onConfirm: (amount: number) => void;
}) {
  const outstanding = requestOutstanding(request);
  const [amount, setAmount] = useState(String(response.reportedAmount ?? outstanding));
  const [valid, setValid] = useState(true);
  const issue = amount ? reportAmountIssue(request, Number(amount)) : undefined;
  return (
    <form
      className="recipient-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && amount && !issue) onConfirm(Number(amount));
      }}
    >
      <AmountField
        label="Số đã chuyển"
        value={amount}
        onChange={setAmount}
        onValidityChange={setValid}
        {...(issue ? { error: issue } : {})}
      />
      <AmountPresets
        amounts={[50_000, 100_000, outstanding].filter((preset) => preset <= outstanding)}
        fullAmount={outstanding}
        fullLabel="Toàn bộ"
        selected={amount}
        onSelect={(preset) => {
          setAmount(String(preset));
          setValid(true);
        }}
      />
      <p className="recipient-caption">Chờ {request.collectorName} xác nhận tiền về.</p>
      <ActionButton type="submit" icon="check" disabled={!valid || !amount || Boolean(issue)}>
        Báo đã chuyển
      </ActionButton>
    </form>
  );
}

export function RecipientPromiseForm({
  today,
  promisedDate,
  promisedAmount,
  outstanding,
  onConfirm,
}: {
  today: string;
  promisedDate: string | null;
  promisedAmount?: number | null | undefined;
  outstanding: number;
  onConfirm: (date: string, amount: number) => void;
}) {
  const [date, setDate] = useState(
    promisedDate && promisedDate >= today ? promisedDate : addDays(today, 1),
  );
  const [amount, setAmount] = useState(String(promisedAmount ?? outstanding));
  const [valid, setValid] = useState(true);
  const amountValid = valid && Number(amount) > 0 && Number(amount) <= outstanding;
  return (
    <form
      className="recipient-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (isDateKey(date) && date >= today && amountValid) onConfirm(date, Number(amount));
      }}
    >
      <AmountField
        label="Số hẹn trả"
        value={amount}
        onChange={setAmount}
        onValidityChange={setValid}
      />
      <AmountPresets
        amounts={[100_000, outstanding].filter((preset) => preset <= outstanding)}
        fullAmount={outstanding}
        fullLabel="Toàn bộ"
        selected={amount}
        onSelect={(preset) => {
          setAmount(String(preset));
          setValid(true);
        }}
      />
      <PromiseDateField today={today} value={date} onChange={setDate} />
      <ActionButton
        type="submit"
        icon="calendar"
        disabled={!isDateKey(date) || date < today || !amountValid}
      >
        Hẹn ngày này
      </ActionButton>
    </form>
  );
}

export function DisputeForm({
  request,
  dispute,
  onConfirm,
}: {
  request: PaymentRequest;
  dispute: RecipientResponse['dispute'];
  onConfirm: (reason: DisputeReason, note: string, itemId: string | null) => void;
}) {
  const [reason, setReason] = useState<DisputeReason>(dispute?.reason ?? 'amount');
  const [note, setNote] = useState(dispute?.note ?? '');
  const personalLines = request.lines.filter(
    (line) => line.personalAmount > 0 && line.disputable !== false,
  );
  const [itemId, setItemId] = useState(dispute?.itemId ?? personalLines[0]?.id ?? '');
  return (
    <form
      className="recipient-form"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm(reason, note, reason === 'items' ? itemId : null);
      }}
    >
      <div className="recipient-reasons">
        <ChoiceGroup
          label="Lý do báo sai"
          value={reason}
          onChange={setReason}
          options={(Object.keys(disputeReasons) as DisputeReason[]).map((value) => ({
            value,
            label: disputeReasons[value],
          }))}
        />
      </div>
      {reason === 'items' && (
        <ChoiceGroup
          label="Khoản cần kiểm tra"
          value={itemId}
          onChange={setItemId}
          options={personalLines.map((line) => ({ value: line.id, label: line.title }))}
        />
      )}
      <details className="recipient-note" open={Boolean(dispute?.note) || undefined}>
        <summary>Thêm ghi chú</summary>
        <label className="money-form-field">
          <span className="visually-hidden">Ghi chú báo sai</span>
          <textarea
            aria-label="Ghi chú báo sai"
            maxLength={240}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
      </details>
      <ActionButton type="submit">Lưu báo sai</ActionButton>
    </form>
  );
}
