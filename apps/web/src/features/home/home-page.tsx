import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { ActionButton } from '../../components/actions/action-button';
import { ActionSheet } from '../../components/actions/action-sheet';
import { ChoiceGroup } from '../../components/actions/choice-group';
import { AppIcon } from '../../components/app-icon';
import { MascotIllustration } from '../../components/illustrations/mascot-illustration';
import { DebtListItem } from '../../components/money/debt-list-item';
import { formatVnd } from '../../components/money/format-vnd';
import { MoneyAmount } from '../../components/money/money-amount';
import { MoneySummaryCard } from '../../components/money/money-summary-card';
import { type MoneyDirection, moneyDirections } from '../../components/money/presentation';
import { DeadlineBadge, SettlementBadge } from '../../components/money/settlement-badge';
import type { HomePrototypeStore } from './demo-store';
import {
  getTodayKey,
  type HomeFilter,
  type HomeRecord,
  matchesFilter,
  remainingAmount,
  settlementState,
  summarize,
  visibleRecords,
} from './ledger';
import { deadlineView, recordView, relativeDate } from './presentation';
import {
  PromiseForm,
  QuickEntryForm,
  type QuickRecordDraft,
  ReceivePaymentForm,
} from './record-forms';
import { useHomePrototype } from './use-home-prototype';
import './home.css';

type Sheet =
  | { type: 'record' | 'receive' | 'promise' | 'remind'; id: string }
  | { type: 'add' | 'quick-entry' | 'photo' | 'attention' }
  | null;
type Scenario = 'sample' | 'loading' | 'error';

export function HomePage({ store }: { store: HomePrototypeStore }) {
  const ledger = useHomePrototype(store);
  const today = getTodayKey();
  const [direction, setDirection] = useState<MoneyDirection>('receivable');
  const [filter, setFilter] = useState<HomeFilter>('all');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [scenario, setScenario] = useState<Scenario>('sample');
  const [reminderDraft, setReminderDraft] = useState('');
  const [reminderError, setReminderError] = useState('');
  const [photo, setPhoto] = useState<{ url: string; name: string } | null>(null);
  const [photoError, setPhotoError] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const receivable = summarize(ledger.records, 'receivable');
  const payable = summarize(ledger.records, 'payable');
  const activeRecords = ledger.records.filter((record) => remainingAmount(record) > 0);
  const attention = activeRecords.filter((record) => matchesFilter(record, 'attention', today));
  const dueToday = activeRecords.filter((record) => matchesFilter(record, 'today', today));
  const overdue = activeRecords.filter((record) => matchesFilter(record, 'overdue', today));
  const list = visibleRecords(ledger.records, direction, filter, search, today);
  const selectedRecord =
    sheet && 'id' in sheet ? ledger.records.find((record) => record.id === sheet.id) : undefined;
  const promises = activeRecords
    .filter((record) => record.deadline?.promised && record.deadline.date >= today)
    .sort((left, right) => (left.deadline?.date ?? '').localeCompare(right.deadline?.date ?? ''));
  const people = ledger.people;
  const selectedDeadline = selectedRecord ? deadlineView(selectedRecord, today) : undefined;
  const dayTitle = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date());
  const filterChoices = [
    { value: 'all', label: 'Tất cả' },
    {
      value: 'today',
      label: `Hôm nay ${activeRecords.filter((record) => record.direction === direction && matchesFilter(record, 'today', today)).length}`,
    },
    {
      value: 'overdue',
      label: `Quá hạn ${activeRecords.filter((record) => record.direction === direction && matchesFilter(record, 'overdue', today)).length}`,
    },
    { value: 'confirmation', label: 'Chờ xác nhận' },
  ] as const;

  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );

  function openRecord(record: HomeRecord) {
    setSheet({ type: 'record', id: record.id });
  }
  function selectDirection(nextDirection: MoneyDirection) {
    setDirection(nextDirection);
    setFilter('all');
    setSearch('');
  }
  function openReceipt(record: HomeRecord) {
    setSheet({ type: 'receive', id: record.id });
  }
  function openPromise(record: HomeRecord) {
    setSheet({ type: 'promise', id: record.id });
  }
  function openReminder(record: HomeRecord) {
    setReminderError('');
    setReminderDraft(
      `${record.personName} ơi, phần còn lại của bạn là ${formatVnd(remainingAmount(record))}. Bạn xem và thanh toán giúp mình nhé. Cảm ơn bạn!`,
    );
    setSheet({ type: 'remind', id: record.id });
  }
  function createQuickRecord(draft: QuickRecordDraft) {
    const record: HomeRecord = {
      id: crypto.randomUUID(),
      personId: draft.personId ?? crypto.randomUUID(),
      personName: draft.personName,
      direction: draft.direction,
      principalAmount: draft.amount,
      confirmedAmounts: [],
      awaitingConfirmation: false,
      deadline: null,
      note: 'Khoản ghi nhanh',
    };
    if (
      ledger.dispatch(
        { type: 'add', record },
        `Đã thêm khoản ${formatVnd(record.principalAmount)} với ${record.personName} vào dữ liệu mẫu.`,
      )
    ) {
      selectDirection(record.direction);
      setScenario('sample');
      setSheet(null);
    }
  }
  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      setPhotoError('Chọn ảnh hóa đơn dưới 10 MB.');
      return;
    }
    setPhoto({ url: URL.createObjectURL(file), name: file.name });
    setPhotoError('');
    setSheet({ type: 'photo' });
  }
  async function copyReminder() {
    try {
      await navigator.clipboard.writeText(reminderDraft);
      ledger.setNotice('Đã sao chép lời nhắc. Chưa gửi thông báo cho ai.');
      setSheet(null);
    } catch {
      setReminderError(
        'Chưa sao chép được. Bạn có thể chọn và sao chép nội dung trong ô lời nhắc.',
      );
    }
  }
  function sheetTitle(): string {
    if (!sheet) return '';
    if (sheet.type === 'add') return 'Thêm khoản tiền';
    if (sheet.type === 'quick-entry') return 'Ghi khoản tiền';
    if (sheet.type === 'photo') return 'Ảnh hóa đơn';
    if (sheet.type === 'attention') return 'Các khoản cần bạn xem';
    const name = selectedRecord?.personName ?? '';
    if (sheet.type === 'receive') return `Nhận tiền từ ${name}`;
    if (sheet.type === 'promise') return `Hẹn lại với ${name}`;
    if (sheet.type === 'remind') return `Nhắc ${name} thanh toán`;
    return `Khoản tiền với ${name}`;
  }

  return (
    <div className="home-page">
      <header className="home-header">
        <a className="home-brand" href="/" aria-label="Debtnote, trang chủ">
          <img src="/favicon.svg" alt="" width="36" height="36" />
          <span>
            debtnote<span className="home-brand-dot">.</span>
          </span>
        </a>
        <span className="home-demo-label">Dữ liệu mẫu</span>
        <button
          type="button"
          className="home-attention-button"
          aria-label={
            scenario === 'sample'
              ? `Các khoản cần chú ý: ${attention.length}`
              : 'Các khoản cần chú ý'
          }
          disabled={scenario !== 'sample'}
          onClick={() => setSheet({ type: 'attention' })}
        >
          <AppIcon name="reminder" />
          {scenario === 'sample' && attention.length > 0 && <span>{attention.length}</span>}
        </button>
      </header>

      <main className="home-content">
        <div className="home-title-row">
          <div>
            <p className="home-date">{dayTitle}</p>
            <h1>Tổng quan</h1>
          </div>
          <ActionButton
            className="home-add-button"
            icon="add"
            onClick={() => setSheet({ type: 'add' })}
          >
            Thêm khoản
          </ActionButton>
        </div>
        {ledger.notice && (
          <div className="home-notice" role="status">
            <span>{ledger.notice}</span>
            <button type="button" aria-label="Đóng thông báo" onClick={() => ledger.setNotice('')}>
              <AppIcon name="close" size="small" />
            </button>
          </div>
        )}

        {scenario === 'loading' ? (
          <div className="home-loading" role="status">
            <span className="home-skeleton" />
            <span className="home-skeleton" />
            <p>Đang tải các khoản tiền…</p>
          </div>
        ) : scenario === 'error' ? (
          <section className="home-state-card">
            <MascotIllustration state="confirmation" />
            <h2>Chưa tải được các khoản tiền</h2>
            <p>Thử lại để xem số dư và những việc cần xử lý.</p>
            <ActionButton onClick={() => setScenario('sample')}>Thử lại</ActionButton>
          </section>
        ) : (
          <>
            <section className="home-overview" aria-label="Số tiền cần thu và cần trả">
              <MoneySummaryCard
                direction="receivable"
                amount={receivable.amount}
                description={`${receivable.people} người · ${receivable.count} khoản còn lại`}
                selected={direction === 'receivable'}
                onSelect={() => selectDirection('receivable')}
              />
              <MoneySummaryCard
                direction="payable"
                amount={payable.amount}
                description={`${payable.people} người · ${payable.count} khoản còn lại`}
                selected={direction === 'payable'}
                onSelect={() => selectDirection('payable')}
              />
            </section>

            {activeRecords.length === 0 ? (
              <section className="home-state-card home-empty" aria-label="Chưa có khoản cần xử lý">
                <MascotIllustration
                  state={ledger.records.length === 0 ? 'welcome' : 'settled'}
                  priority
                />
                <span className="home-section-kicker">CHUYỆN TIỀN, GỌN LẠI</span>
                <h2>
                  {ledger.records.length === 0
                    ? 'Khoản đầu tiên, bắt đầu thôi.'
                    : 'Mọi khoản đã xong rồi.'}
                </h2>
                <p>
                  {ledger.records.length === 0
                    ? 'Chụp một bill hoặc ghi nhanh ai đang nợ ai. Phần còn lại mình cùng theo dõi.'
                    : 'Các khoản mẫu đã được xử lý đủ. Bạn có thể thêm khoản mới khi cần.'}
                </p>
                <ActionButton icon="add" onClick={() => setSheet({ type: 'add' })}>
                  {ledger.records.length === 0 ? 'Thêm khoản đầu tiên' : 'Thêm khoản mới'}
                </ActionButton>
              </section>
            ) : (
              <div className="home-workspace">
                <section className="home-ledger" aria-label="Danh sách khoản tiền">
                  <button
                    type="button"
                    className="home-task-banner"
                    onClick={() => setSheet({ type: 'attention' })}
                  >
                    <MascotIllustration
                      state={
                        overdue.length > 0
                          ? 'overdue'
                          : attention.length > 0
                            ? 'reminder'
                            : 'upcoming'
                      }
                      decorative
                    />
                    <span>
                      <strong>
                        {attention.length > 0
                          ? `${attention.length} khoản cần bạn xem`
                          : 'Hôm nay chưa có khoản đến hạn'}
                      </strong>
                      <span>
                        {dueToday.length} đến hạn hôm nay · {overdue.length} quá hạn
                      </span>
                    </span>
                    <AppIcon name="open" size="small" />
                  </button>
                  {photo && (
                    <button
                      type="button"
                      className="home-photo-draft"
                      onClick={() => setSheet({ type: 'photo' })}
                    >
                      <AppIcon name="camera" size="small" />
                      <span>Ảnh hóa đơn đã chọn</span>
                      <AppIcon name="open" size="small" />
                    </button>
                  )}
                  <div className="home-list-heading">
                    <h2>
                      {direction === 'receivable' ? 'Khoản cần thu' : 'Khoản cần trả'}{' '}
                      <span>{list.length}</span>
                    </h2>
                    <button
                      type="button"
                      className="icon-action"
                      aria-label="Tìm khoản tiền"
                      aria-expanded={searchOpen}
                      onClick={() => setSearchOpen(!searchOpen)}
                    >
                      <AppIcon name="search" size="small" />
                    </button>
                  </div>
                  {searchOpen && (
                    <div className="home-search">
                      <AppIcon name="search" size="small" />
                      <input
                        aria-label="Tìm tên người hoặc nội dung"
                        placeholder="Tìm tên người hoặc nội dung"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                      {search && (
                        <button
                          type="button"
                          aria-label="Xóa tìm kiếm"
                          onClick={() => setSearch('')}
                        >
                          <AppIcon name="close" size="small" />
                        </button>
                      )}
                    </div>
                  )}
                  <ChoiceGroup
                    label="Lọc khoản tiền"
                    value={filter}
                    options={filterChoices}
                    onChange={setFilter}
                  />
                  {list.length > 0 ? (
                    <div className="debt-list">
                      {list.map((record) => (
                        <DebtListItem
                          {...recordView(record, today)}
                          key={record.id}
                          onOpen={() => openRecord(record)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="home-filter-empty">
                      <MascotIllustration
                        state={filter === 'confirmation' ? 'confirmation' : 'settled'}
                      />
                      <h3>
                        {search ? 'Chưa tìm thấy khoản phù hợp' : 'Không có khoản trong mục này'}
                      </h3>
                      <p>
                        {search
                          ? 'Thử tên khác hoặc xóa tìm kiếm nhé.'
                          : 'Các khoản còn lại vẫn ở mục Tất cả.'}
                      </p>
                      <ActionButton
                        emphasis="secondary"
                        onClick={() => {
                          setFilter('all');
                          setSearch('');
                        }}
                      >
                        Xem tất cả
                      </ActionButton>
                    </div>
                  )}
                </section>

                <aside className="home-sidebar">
                  <section className="home-promise-card">
                    <div className="home-card-heading">
                      <AppIcon name="calendar" size="small" />
                      <h2>Lời hẹn sắp tới</h2>
                    </div>
                    {promises.length > 0 ? (
                      <div className="home-promise-list">
                        {promises.map((record) => (
                          <button
                            type="button"
                            className="home-promise-row"
                            key={record.id}
                            onClick={() => openRecord(record)}
                          >
                            <span className="home-promise-day">
                              {record.deadline ? relativeDate(record.deadline.date, today) : ''}
                            </span>
                            <strong>{record.personName}</strong>
                            <MoneyAmount
                              amount={remainingAmount(record)}
                              direction={record.direction}
                            />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p>Chưa có lời hẹn nào. Bạn có thể hẹn ngày trả ngay trong từng khoản.</p>
                    )}
                  </section>
                  <section className="home-companion">
                    <MascotIllustration state="reminder" decorative />
                    <h3>
                      Nhắc một chút.
                      <br />
                      Nhẹ chuyện tiền.
                    </h3>
                    <p>Mở một khoản để soạn lời nhắc hoặc thống nhất ngày thanh toán.</p>
                  </section>
                </aside>
              </div>
            )}
          </>
        )}

        <footer className="home-prototype-controls">
          <div>
            <strong>Bản xem thử S01</strong>
            <p>Thao tác chỉ thay đổi dữ liệu mẫu trên thiết bị.</p>
          </div>
          <label>
            <span className="visually-hidden">Trạng thái xem thử</span>
            <select
              aria-label="Trạng thái xem thử"
              value={scenario}
              onChange={(event) => setScenario(event.target.value as Scenario)}
            >
              <option value="sample">Dữ liệu đang có</option>
              <option value="loading">Thử trạng thái tải</option>
              <option value="error">Thử trạng thái lỗi</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              ledger.clear();
              setScenario('sample');
              setFilter('all');
              setSearch('');
            }}
          >
            Thử sổ trống
          </button>
          <button
            type="button"
            onClick={() => {
              ledger.reset();
              setScenario('sample');
              selectDirection('receivable');
            }}
          >
            Khôi phục mẫu
          </button>
          {import.meta.env.DEV && <a href="/design/">Bộ thiết kế ↗</a>}
        </footer>
      </main>

      <input
        ref={photoInput}
        hidden
        aria-hidden="true"
        tabIndex={-1}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Chọn ảnh hóa đơn"
        onChange={choosePhoto}
      />
      <ActionSheet
        open={sheet !== null}
        title={sheetTitle()}
        onClose={() => {
          ledger.clearCommandError();
          setSheet(null);
        }}
      >
        {ledger.commandError && (
          <p className="home-inline-error" role="alert">
            {ledger.commandError}
          </p>
        )}
        {sheet?.type === 'add' && (
          <>
            <p className="home-sheet-description">Bạn muốn bắt đầu từ đâu?</p>
            <button
              type="button"
              className="home-source-choice"
              onClick={() => photoInput.current?.click()}
            >
              <span className="home-source-icon">
                <AppIcon name="camera" />
              </span>
              <span>
                <strong>Chụp bill</strong>
                <small>Chụp hoặc chọn ảnh hóa đơn</small>
              </span>
              <AppIcon name="open" size="small" />
            </button>
            <button
              type="button"
              className="home-source-choice"
              onClick={() => {
                setSheet({ type: 'quick-entry' });
              }}
            >
              <span className="home-source-icon" data-tone="payable">
                <AppIcon name="receipt" />
              </span>
              <span>
                <strong>Ghi khoản tiền</strong>
                <small>Cho vay, mượn tiền, ứng hoặc trả hộ</small>
              </span>
              <AppIcon name="open" size="small" />
            </button>
            <p className="home-sheet-footnote">
              Đây là bản xem thử. Ảnh chỉ xem trên thiết bị, chưa đọc bill hoặc tạo khoản nợ tự
              động.
            </p>
            {photoError && (
              <p className="home-inline-error" role="alert">
                {photoError}
              </p>
            )}
          </>
        )}
        {sheet?.type === 'quick-entry' && (
          <QuickEntryForm people={people} onConfirm={createQuickRecord} />
        )}
        {sheet?.type === 'photo' && photo && (
          <div className="home-photo-preview">
            <img
              src={photo.url}
              alt="Ảnh hóa đơn vừa chọn"
              onError={() =>
                setPhotoError('Chưa xem được định dạng này. Chọn ảnh JPG, PNG hoặc WebP nhé.')
              }
            />
            {photoError && <p role="alert">{photoError}</p>}
            <p>{photo.name}</p>
            <p>
              Ảnh chỉ giữ trong phiên xem thử; tải lại sẽ cần chọn lại. Chưa có khoản tiền nào được
              tạo từ ảnh.
            </p>
            <ActionButton
              emphasis="secondary"
              icon="camera"
              onClick={() => photoInput.current?.click()}
            >
              Chọn ảnh khác
            </ActionButton>
          </div>
        )}
        {sheet?.type === 'attention' &&
          (attention.length > 0 ? (
            <>
              <p className="home-sheet-description">
                {dueToday.length} khoản đến hạn hôm nay, {overdue.length} khoản đã quá hạn.
              </p>
              <div className="debt-list">
                {attention.map((record) => (
                  <DebtListItem
                    {...recordView(record, today)}
                    key={record.id}
                    onOpen={() => openRecord(record)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="home-filter-empty">
              <MascotIllustration state="settled" />
              <h3>Hôm nay chưa có khoản đến hạn</h3>
              <p>Bạn vẫn có thể xem và hẹn ngày trả cho các khoản còn lại.</p>
            </div>
          ))}
        {selectedRecord && sheet?.type === 'record' && (
          <>
            <div className="home-record-amount">
              <span>{moneyDirections[selectedRecord.direction].label}</span>
              <MoneyAmount
                amount={remainingAmount(selectedRecord)}
                direction={selectedRecord.direction}
                size="summary"
              />
            </div>
            <p className="home-sheet-description">{selectedRecord.note}</p>
            <div className="home-record-signals">
              <SettlementBadge state={settlementState(selectedRecord)} />
              {selectedDeadline && <DeadlineBadge {...selectedDeadline} />}
            </div>
            {selectedRecord.direction === 'receivable' ? (
              <ActionButton icon="check" onClick={() => openReceipt(selectedRecord)}>
                Ghi nhận tiền đã nhận
              </ActionButton>
            ) : (
              <ActionButton
                icon="send"
                disabled={selectedRecord.awaitingConfirmation}
                onClick={() => {
                  if (
                    ledger.dispatch(
                      { type: 'report-payment', id: selectedRecord.id },
                      'Đã đánh dấu đã chuyển trong dữ liệu mẫu. Số cần trả vẫn giữ đến khi người nhận xác nhận.',
                    )
                  )
                    setSheet(null);
                }}
              >
                {selectedRecord.awaitingConfirmation
                  ? 'Đang chờ người nhận xác nhận'
                  : 'Đánh dấu đã chuyển'}
              </ActionButton>
            )}
            <div className="home-sheet-action-row">
              {selectedRecord.direction === 'receivable' && (
                <ActionButton
                  emphasis="secondary"
                  icon="reminder"
                  onClick={() => openReminder(selectedRecord)}
                >
                  Soạn lời nhắc
                </ActionButton>
              )}
              <ActionButton
                emphasis="secondary"
                icon="calendar"
                onClick={() => openPromise(selectedRecord)}
              >
                Hẹn lại
              </ActionButton>
            </div>
            <p className="home-sheet-footnote">
              Mọi thao tác trong bản xem thử chỉ cập nhật sổ mẫu, không chuyển tiền hoặc gửi thông
              báo thật.
            </p>
          </>
        )}
        {selectedRecord && sheet?.type === 'receive' && (
          <ReceivePaymentForm
            record={selectedRecord}
            onConfirm={(amount) => {
              if (
                ledger.dispatch(
                  { type: 'receive', id: selectedRecord.id, amount },
                  `Đã ghi nhận ${formatVnd(amount)} từ ${selectedRecord.personName} trong dữ liệu mẫu.`,
                )
              )
                setSheet(null);
            }}
          />
        )}
        {selectedRecord && sheet?.type === 'promise' && (
          <PromiseForm
            record={selectedRecord}
            today={today}
            onConfirm={(date) => {
              if (
                ledger.dispatch(
                  { type: 'promise', id: selectedRecord.id, date },
                  `Đã đổi hẹn với ${selectedRecord.personName} sang ${relativeDate(date, today)} trong dữ liệu mẫu.`,
                )
              )
                setSheet(null);
            }}
          />
        )}
        {sheet?.type === 'remind' && (
          <div className="home-form">
            <label className="home-field-label">
              Nội dung lời nhắc
              <textarea
                rows={5}
                value={reminderDraft}
                onChange={(event) => setReminderDraft(event.target.value)}
              />
            </label>
            <ActionButton
              icon="share"
              disabled={!reminderDraft.trim()}
              onClick={() => void copyReminder()}
            >
              Sao chép lời nhắc
            </ActionButton>
            {reminderError && (
              <p className="home-inline-error" role="alert">
                {reminderError}
              </p>
            )}
            <p className="home-sheet-footnote">
              Chỉ sao chép nội dung. Bạn chủ động gửi qua ứng dụng chat của mình.
            </p>
          </div>
        )}
      </ActionSheet>
    </div>
  );
}
