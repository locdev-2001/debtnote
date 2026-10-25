import { useState } from 'react';
import { ActionButton } from '../../components/actions/action-button';
import { ActionSheet } from '../../components/actions/action-sheet';
import { ChoiceGroup } from '../../components/actions/choice-group';
import { AppIcon } from '../../components/app-icon';
import { DatePickerField } from '../../components/dates/date-picker-field';
import { MascotIllustration } from '../../components/illustrations/mascot-illustration';
import { AmountField } from '../../components/money/amount-field';
import { ExpenseReceipt, ReceiptAmountRow } from '../../components/money/expense-receipt';
import { MoneyAmount } from '../../components/money/money-amount';
import { getTodayKey } from '../../lib/calendar';
import {
  calculateSplitPreview,
  currentPerson,
  type SplitDraft,
  type SplitItem,
  type SplitPerson,
  type SplitPreview,
  splitDraftTotal,
  toggleSplitPerson,
} from './split-draft';
import './split.css';

interface SplitExpenseFlowProps {
  open: boolean;
  previewMode?: boolean;
  draft: SplitDraft | null;
  completed: SplitPreview | null;
  people: readonly SplitPerson[];
  storageIssue: string;
  notice?: string;
  onChange: (draft: SplitDraft) => void;
  onClose: () => void;
  onDiscard: () => void;
  onConfirm: (preview: SplitPreview, draft: SplitDraft) => boolean | Promise<boolean>;
}

function ParticipantChoices({
  participants,
  includedIds,
  onToggle,
}: {
  participants: readonly SplitPerson[];
  includedIds: readonly string[];
  onToggle: (person: SplitPerson) => void;
}) {
  return (
    <div className="split-person-choices">
      {participants.map((person) => (
        <button
          type="button"
          key={person.id}
          aria-pressed={includedIds.includes(person.id)}
          onClick={() => onToggle(person)}
        >
          <span>{person.name}</span>
        </button>
      ))}
    </div>
  );
}

export function SplitExpenseFlow({
  open,
  previewMode = true,
  draft,
  completed,
  people,
  storageIssue,
  notice,
  onChange,
  onClose,
  onDiscard,
  onConfirm,
}: SplitExpenseFlowProps) {
  const [newPersonName, setNewPersonName] = useState('');
  const [addingPerson, setAddingPerson] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [invalidAmountIds, setInvalidAmountIds] = useState<string[]>([]);
  const [commitIssue, setCommitIssue] = useState('');
  const [committing, setCommitting] = useState(false);
  const titles = ['Chọn người', 'Chia tiền', 'Xem lại'];
  let preview: SplitPreview | null = null;
  let totalAmount: number | null = null;
  let calculationIssue = '';
  if (draft) {
    try {
      totalAmount = splitDraftTotal(draft);
      preview = calculateSplitPreview(draft);
      totalAmount = preview.totalAmount;
    } catch (error) {
      calculationIssue = error instanceof Error ? error.message : 'Kiểm tra lại khoản tiền.';
    }
  }
  const candidates = [
    ...new Map(
      [currentPerson, ...people, ...(draft?.participants ?? [])].map((person) => [
        person.id,
        person,
      ]),
    ).values(),
  ];
  function updateItem(itemId: string, changes: Partial<SplitItem>) {
    if (draft)
      onChange({
        ...draft,
        items: draft.items.map((item) => (item.id === itemId ? { ...item, ...changes } : item)),
      });
  }
  function toggleIncluded(itemIds: readonly string[], person: SplitPerson) {
    if (!draft) return;
    const allIncluded = draft.items
      .filter((item) => itemIds.includes(item.id))
      .every((item) => !item.excludedIds.includes(person.id));
    onChange({
      ...draft,
      items: draft.items.map((item) =>
        !itemIds.includes(item.id)
          ? item
          : {
              ...item,
              excludedIds: allIncluded
                ? [...new Set([...item.excludedIds, person.id])]
                : item.excludedIds.filter((id) => id !== person.id),
            },
      ),
    });
  }
  function changeStep(step: 0 | 1 | 2) {
    if (!draft) return;
    setCommitIssue('');
    setSelectedItemIds([]);
    onChange({ ...draft, step });
  }
  const result = completed;
  return (
    <ActionSheet
      open={open}
      title={result ? 'Đã ghi khoản' : (titles[draft?.step ?? 0] ?? 'Chia tiền')}
      onClose={onClose}
    >
      {result ? (
        <div className="split-success">
          <MascotIllustration state="settled" size="small" />
          <span>{result.direction === 'receivable' ? 'Cần thu' : 'Cần trả'}</span>
          <MoneyAmount
            amount={result.settlementAmount}
            size="summary"
            direction={result.direction}
          />
          <ActionButton onClick={onClose}>Về tổng quan</ActionButton>
        </div>
      ) : (
        draft && (
          <fieldset className="split-flow" disabled={committing}>
            <nav className="split-steps" aria-label="Các bước chia tiền">
              {['Người', 'Chia', 'Chốt'].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  aria-current={draft.step === index ? 'step' : undefined}
                  disabled={index > draft.step}
                  onClick={() => changeStep(index as 0 | 1 | 2)}
                >
                  <span>{index + 1}</span>
                  {label}
                </button>
              ))}
            </nav>
            {draft.step === 0 && (
              <>
                <ParticipantChoices
                  participants={candidates}
                  includedIds={draft.participants.map((person) => person.id)}
                  onToggle={(person) => onChange(toggleSplitPerson(draft, person))}
                />
                {addingPerson ? (
                  <form
                    className="split-add-person"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!newPersonName.trim()) return;
                      onChange(
                        toggleSplitPerson(draft, {
                          id: crypto.randomUUID(),
                          name: newPersonName.trim(),
                        }),
                      );
                      setNewPersonName('');
                      setAddingPerson(false);
                    }}
                  >
                    <label className="money-form-field">
                      Tên người
                      <input
                        aria-label="Tên người mới"
                        maxLength={60}
                        value={newPersonName}
                        onChange={(event) => setNewPersonName(event.target.value)}
                      />
                    </label>
                    <ActionButton type="submit" disabled={!newPersonName.trim()}>
                      Thêm
                    </ActionButton>
                  </form>
                ) : (
                  <ActionButton emphasis="quiet" icon="add" onClick={() => setAddingPerson(true)}>
                    Thêm người
                  </ActionButton>
                )}
                <label className="money-form-field">
                  Ai đã trả?
                  <select
                    value={draft.payerId}
                    onChange={(event) => onChange({ ...draft, payerId: event.target.value })}
                  >
                    {[
                      ...new Map(
                        [currentPerson, ...draft.participants].map((person) => [person.id, person]),
                      ).values(),
                    ].map((person) => (
                      <option value={person.id} key={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                </label>
                <ActionButton disabled={!draft.participants.length} onClick={() => changeStep(1)}>
                  Tiếp · {draft.participants.length} người
                </ActionButton>
                <ActionButton emphasis="quiet" size="small" onClick={onDiscard}>
                  Bỏ bản nháp
                </ActionButton>
              </>
            )}
            {draft.step === 1 && (
              <>
                <ChoiceGroup
                  label="Cách chia"
                  value={draft.mode}
                  onChange={(mode) => {
                    onChange({ ...draft, mode });
                    setSelectedItemIds([]);
                  }}
                  options={[
                    { value: 'equal', label: 'Chia đều' },
                    { value: 'custom', label: 'Tùy chỉnh' },
                  ]}
                />
                {selectedItemIds.length > 0 && (
                  <section className="split-bulk" aria-label="Chia nhiều khoản">
                    <div className="split-line">
                      <strong>{selectedItemIds.length} khoản</strong>
                      <ActionButton
                        emphasis="quiet"
                        size="small"
                        onClick={() => setSelectedItemIds([])}
                      >
                        Bỏ chọn
                      </ActionButton>
                    </div>
                    <ParticipantChoices
                      participants={draft.participants}
                      includedIds={draft.participants
                        .filter((person) =>
                          draft.items
                            .filter((item) => selectedItemIds.includes(item.id))
                            .every((item) => !item.excludedIds.includes(person.id)),
                        )
                        .map((person) => person.id)}
                      onToggle={(person) => toggleIncluded(selectedItemIds, person)}
                    />
                  </section>
                )}
                <ExpenseReceipt
                  meta={`${draft.participants.length} người · ${candidates.find((person) => person.id === draft.payerId)?.name ?? 'Bạn'} đã trả`}
                >
                  <div className="receipt-column-labels">
                    <span>Khoản</span>
                    <span>Thành tiền</span>
                  </div>
                  <div className="split-items">
                    {draft.items.map((item, index) => (
                      <section
                        className="split-item"
                        key={item.id}
                        aria-label={`Khoản ${item.title || index + 1}`}
                      >
                        <div className="split-line">
                          {draft.mode === 'custom' && (
                            <button
                              type="button"
                              className="icon-action"
                              aria-label={`Chọn khoản ${item.title || index + 1}`}
                              aria-pressed={selectedItemIds.includes(item.id)}
                              onClick={() =>
                                setSelectedItemIds(
                                  selectedItemIds.includes(item.id)
                                    ? selectedItemIds.filter((id) => id !== item.id)
                                    : [...selectedItemIds, item.id],
                                )
                              }
                            >
                              <AppIcon
                                name={selectedItemIds.includes(item.id) ? 'check' : 'receipt'}
                                size="small"
                              />
                            </button>
                          )}
                          <button
                            type="button"
                            className="split-item-heading"
                            aria-label={`Sửa ${item.title || `khoản ${index + 1}`}`}
                            aria-expanded={editingItemId === item.id}
                            onClick={() =>
                              setEditingItemId(editingItemId === item.id ? null : item.id)
                            }
                          >
                            <strong>{item.title || `Khoản ${index + 1}`}</strong>
                            <MoneyAmount amount={Number(item.amount)} />
                          </button>
                          {draft.mode === 'custom' && (
                            <details className="split-item-tools">
                              <summary
                                className="icon-action"
                                aria-label={`Tùy chọn ${item.title || index + 1}`}
                              >
                                <AppIcon name="more" size="small" />
                              </summary>
                              <div className="split-item-tools-panel">
                                <ActionButton
                                  emphasis="quiet"
                                  size="small"
                                  onClick={() => updateItem(item.id, { excludedIds: [] })}
                                >
                                  Tất cả
                                </ActionButton>
                                <label className="money-form-field">
                                  <span className="visually-hidden">
                                    Chỉ một người cho {item.title}
                                  </span>
                                  <select
                                    aria-label={`Chỉ một người cho ${item.title}`}
                                    value=""
                                    onChange={(event) => {
                                      if (event.target.value)
                                        updateItem(item.id, {
                                          excludedIds: draft.participants
                                            .filter((person) => person.id !== event.target.value)
                                            .map((person) => person.id),
                                        });
                                    }}
                                  >
                                    <option value="">Chỉ 1 người</option>
                                    {draft.participants.map((person) => (
                                      <option key={person.id} value={person.id}>
                                        {person.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            </details>
                          )}
                        </div>
                        {(editingItemId === item.id || !item.amount) && (
                          <div className="split-item-editor">
                            <label className="money-form-field">
                              Tên khoản
                              <input
                                maxLength={80}
                                value={item.title}
                                onChange={(event) =>
                                  updateItem(item.id, { title: event.target.value })
                                }
                              />
                            </label>
                            <AmountField
                              label="Số tiền"
                              value={item.amount}
                              onChange={(amount) => updateItem(item.id, { amount })}
                              onValidityChange={(valid) =>
                                setInvalidAmountIds((ids) =>
                                  valid
                                    ? ids.filter((id) => id !== item.id)
                                    : [...new Set([...ids, item.id])],
                                )
                              }
                            />
                            {draft.items.length > 1 && (
                              <ActionButton
                                emphasis="quiet"
                                size="small"
                                onClick={() => {
                                  onChange({
                                    ...draft,
                                    items: draft.items.filter((entry) => entry.id !== item.id),
                                  });
                                  setInvalidAmountIds((ids) => ids.filter((id) => id !== item.id));
                                  setSelectedItemIds((ids) => ids.filter((id) => id !== item.id));
                                }}
                              >
                                Xóa khoản
                              </ActionButton>
                            )}
                          </div>
                        )}
                        {draft.mode === 'custom' && (
                          <>
                            <ParticipantChoices
                              participants={draft.participants}
                              includedIds={draft.participants
                                .filter((person) => !item.excludedIds.includes(person.id))
                                .map((person) => person.id)}
                              onToggle={(person) => toggleIncluded([item.id], person)}
                            />
                          </>
                        )}
                      </section>
                    ))}
                  </div>
                  <ActionButton
                    emphasis="secondary"
                    icon="add"
                    onClick={() => {
                      const item: SplitItem = {
                        id: crypto.randomUUID(),
                        title: '',
                        amount: '',
                        excludedIds: [],
                      };
                      onChange({ ...draft, items: [...draft.items, item] });
                      setEditingItemId(item.id);
                    }}
                  >
                    Thêm khoản
                  </ActionButton>
                  <details className="split-options">
                    <summary>Tùy chọn</summary>
                    <div className="split-item-editor">
                      <label className="money-form-field">
                        Tên bill
                        <input
                          maxLength={80}
                          value={draft.title ?? ''}
                          placeholder="Khoản chung"
                          onChange={(event) => onChange({ ...draft, title: event.target.value })}
                        />
                      </label>
                      <AmountField
                        label="Phí"
                        value={draft.fee ?? ''}
                        onChange={(fee) => onChange({ ...draft, fee })}
                      />
                      <AmountField
                        label="Giảm giá"
                        value={draft.discount ?? ''}
                        onChange={(discount) => onChange({ ...draft, discount })}
                      />
                      <DatePickerField
                        label="Ngày hẹn"
                        value={draft.dueDate ?? ''}
                        minDate={getTodayKey()}
                        onChange={(dueDate) => onChange({ ...draft, dueDate })}
                      />
                    </div>
                  </details>
                  {totalAmount === null ? (
                    <p className="split-error">Tổng tiền vượt giới hạn.</p>
                  ) : (
                    <ReceiptAmountRow label="Tổng cộng" amount={totalAmount} emphasis="total" />
                  )}
                </ExpenseReceipt>
                {calculationIssue && draft.items.some((item) => item.amount) && (
                  <p className="split-error" role="alert">
                    {calculationIssue}
                  </p>
                )}
                <footer className="split-flow-footer">
                  <ActionButton
                    disabled={!preview || invalidAmountIds.length > 0}
                    onClick={() => changeStep(2)}
                  >
                    Xem lại
                  </ActionButton>
                </footer>
              </>
            )}
            {draft.step === 2 && preview && (
              <>
                <ExpenseReceipt
                  meta={`${preview.shares.length} người · ${preview.payer.name} đã trả`}
                >
                  <div className="receipt-column-labels">
                    <span>Khoản</span>
                    <span>Thành tiền</span>
                  </div>
                  <div className="receipt-rows">
                    {preview.lines.map((line, index) => (
                      <ReceiptAmountRow
                        key={`${index}:${line.title}`}
                        label={line.title}
                        amount={line.amount}
                        {...(line.people.length !== preview.shares.length
                          ? { detail: line.people.join(', ') }
                          : {})}
                      />
                    ))}
                  </div>
                  {preview.fee > 0 && <ReceiptAmountRow label="Phí" amount={preview.fee} />}
                  {preview.discount > 0 && (
                    <ReceiptAmountRow label="Giảm giá" amount={preview.discount} deduction />
                  )}
                  <ReceiptAmountRow
                    label="Tổng cộng"
                    amount={preview.totalAmount}
                    emphasis="total"
                  />
                  <div className="receipt-column-labels">
                    <span>Người</span>
                    <span>Phần chia</span>
                  </div>
                  <div className="receipt-rows">
                    {preview.shares.map((person) => (
                      <ReceiptAmountRow
                        key={person.id}
                        label={person.name}
                        amount={person.amount}
                        {...(person.id === preview.payer.id ? { detail: 'Đã ứng' } : {})}
                      />
                    ))}
                  </div>

                  <ReceiptAmountRow
                    label={preview.direction === 'receivable' ? 'Cần thu' : 'Cần trả'}
                    amount={preview.settlementAmount}
                    emphasis="settlement"
                  />
                </ExpenseReceipt>
                <footer className="split-flow-footer">
                  <ActionButton
                    icon="check"
                    pending={committing}
                    onClick={async () => {
                      if (committing) return;
                      setCommitting(true);
                      try {
                        if (!(await onConfirm(preview, draft)))
                          setCommitIssue('Chưa chốt được. Vui lòng thử lại.');
                      } catch {
                        setCommitIssue('Chưa chốt được. Vui lòng thử lại.');
                      } finally {
                        setCommitting(false);
                      }
                    }}
                  >
                    Chốt khoản
                  </ActionButton>
                  {previewMode && (
                    <p className="split-caption">Chỉ lưu trong sổ mẫu trên thiết bị.</p>
                  )}
                </footer>
              </>
            )}
            {notice && (
              <p className="split-caption" role="status">
                {notice}
              </p>
            )}
            {(storageIssue || commitIssue) && (
              <p className="split-error" role="alert">
                {commitIssue || storageIssue}
              </p>
            )}
          </fieldset>
        )
      )}
    </ActionSheet>
  );
}
