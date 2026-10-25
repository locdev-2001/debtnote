import type { DebtView, Direction, Identity, LedgerSnapshot } from '@debtnote/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ActionButton } from '../../components/actions/action-button';
import { ActionSheet } from '../../components/actions/action-sheet';
import { ChoiceGroup } from '../../components/actions/choice-group';
import { AppIcon, type AppIconName } from '../../components/app-icon';
import { Brand } from '../../components/brand/brand';
import { MascotIllustration } from '../../components/illustrations/mascot-illustration';
import { DebtListItem } from '../../components/money/debt-list-item';
import { formatVnd } from '../../components/money/format-vnd';
import { MoneyAmount } from '../../components/money/money-amount';
import { MoneySummaryCard } from '../../components/money/money-summary-card';
import { getDeadlineView, getSettlementState } from '../../components/money/presentation';
import { SettlementBadge } from '../../components/money/settlement-badge';
import { prepareReceiptImage } from '../../lib/images';
import type { QrRenderer } from '../../lib/qr/qr-renderer';
import { apiClient } from '../../lib/rpc';
import type { SplitDraft, SplitPreview } from '../split/split-draft';
import { SplitExpenseFlow } from '../split/split-expense-flow';
import { AccessLinks } from './access-links';
import {
  LedgerHistory,
  OwnerPromiseEditor,
  PaymentEditor,
  PersonEditor,
  QuickDebtEditor,
} from './ledger-forms';
import { PhotoPanel } from './photo-panel';
import { BillReceipt } from './receipt-detail';
import { SettingsPage } from './settings-page';
import { SharePanel } from './share-panel';
import { createBillCommand } from './split-command';
import { useLedger } from './use-ledger';
import { useServerDraft } from './use-server-draft';
import './mvp.css';

type Tab = 'home' | 'monitor' | 'reports' | 'settings';
type Filter = 'all' | 'today' | 'overdue' | 'confirmation' | 'disputed' | 'paid';
type Sheet =
  | { type: 'sources' | 'quick' | 'notifications' | 'people' | 'new-person' }
  | {
      type: 'debt' | 'person' | 'bill' | 'promise' | 'cancel' | 'photo' | 'edit-person';
      id: string;
    }
  | { type: 'payment'; personId: string; direction: Direction; debtIds: string[] }
  | { type: 'share'; personId: string; debtIds: string[] }
  | null;
const tabs: { id: Tab; label: string; icon: AppIconName }[] = [
  { id: 'home', label: 'Tổng quan', icon: 'home' },
  { id: 'monitor', label: 'Theo dõi', icon: 'calendar' },
  { id: 'reports', label: 'Báo cáo', icon: 'reports' },
  { id: 'settings', label: 'Thiết lập', icon: 'settings' },
];
function RecordCard({
  record,
  today,
  onOpen,
  amount,
  showDescription = false,
}: {
  amount?: number | undefined;
  showDescription?: boolean;
  record: DebtView;
  today: string;
  onOpen: () => void;
}) {
  const deadline = getDeadlineView(record.attentionDate, Boolean(record.promisedDate), today);
  return (
    <DebtListItem
      name={record.personName}
      amount={amount ?? record.remainingAmount}
      showDescription={showDescription}
      direction={record.direction}
      state={getSettlementState(
        record.remainingAmount,
        record.awaitingConfirmation,
        record.confirmedAmounts.length,
      )}
      description={record.note}
      {...(deadline ? { deadline } : {})}
      onOpen={onOpen}
    />
  );
}
export function OwnerApp({
  user,
  renderer,
  onLogout,
}: {
  user: Identity;
  renderer: QrRenderer;
  onLogout: () => Promise<void>;
}) {
  const controller = useLedger(user.id);
  if (controller.snapshot.isPending)
    return (
      <main className="auth-page">
        <Brand />
        <p role="status">Đang mở sổ…</p>
      </main>
    );
  if (!controller.snapshot.data)
    return (
      <main className="auth-page">
        <Brand />
        <p className="mvp-error">{controller.snapshot.error?.message ?? 'Chưa mở được sổ.'}</p>
        <ActionButton onClick={() => void controller.snapshot.refetch()}>Thử lại</ActionButton>
        <ActionButton emphasis="quiet" onClick={() => void onLogout()}>
          Đăng nhập lại
        </ActionButton>
      </main>
    );
  return (
    <OwnerWorkspace
      user={user}
      renderer={renderer}
      onLogout={onLogout}
      snapshot={controller.snapshot.data}
      controller={controller}
    />
  );
}
function OwnerWorkspace({
  user,
  renderer,
  onLogout,
  snapshot,
  controller,
}: {
  user: Identity;
  renderer: QrRenderer;
  onLogout: () => Promise<void>;
  snapshot: LedgerSnapshot;
  controller: ReturnType<typeof useLedger>;
}) {
  const { perform, pending, issue, notice } = controller;
  const split = useServerDraft(user.id, snapshot.drafts);
  const [tab, setTab] = useState<Tab>('home');
  const [direction, setDirection] = useState<Direction>('receivable');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [forecastGroup, setForecastGroup] = useState<DebtView['forecastGroup']>(null);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const appliedOcr = useRef(new Set<string>());
  const photoInput = useRef<HTMLInputElement>(null);
  const attachment = useQuery({
    queryKey: ['attachment', user.id, photoId],
    queryFn: () => apiClient.files.status.query({ id: photoId as string }),
    enabled: Boolean(photoId),
    refetchInterval: (query) =>
      ['queued', 'processing'].includes(query.state.data?.status ?? '') ? 1_000 : false,
  });
  useEffect(() => {
    const result = attachment.data?.ocrResult;
    const draft = split.draft;
    if (
      !result?.items.length ||
      !photoId ||
      appliedOcr.current.has(photoId) ||
      draft?.attachmentId !== photoId ||
      draft.items.some((item) => item.amount !== '')
    )
      return;
    appliedOcr.current.add(photoId);
    split.update({
      ...draft,
      items: result.items.map((item) => ({
        ...item,
        amount: String(item.amount),
        excludedIds: [],
      })),
    });
  }, [attachment.data, photoId, split]);
  const records = snapshot.records;
  const openRecords = records.filter((record) => record.remainingAmount > 0);
  const attention = openRecords.filter(
    (record) =>
      record.deadlineState === 'overdue' ||
      record.deadlineState === 'today' ||
      record.awaitingConfirmation ||
      record.disputed,
  );
  const reports = snapshot.payments.filter((payment) => payment.status === 'pending');
  const selected =
    sheet && 'id' in sheet ? records.find((record) => record.id === sheet.id) : undefined;
  const person =
    sheet && 'id' in sheet ? snapshot.people.find((person) => person.id === sheet.id) : undefined;
  const bill =
    sheet && 'id' in sheet ? snapshot.bills.find((bill) => bill.id === sheet.id) : undefined;
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase();
  const list = records
    .filter(
      (record) =>
        record.direction === direction &&
        (filter === 'paid' ? record.remainingAmount === 0 : record.remainingAmount > 0) &&
        (filter === 'all' || filter === 'paid' || filter === 'confirmation'
          ? filter !== 'confirmation' || record.awaitingConfirmation
          : filter === 'disputed'
            ? record.disputed
            : record.deadlineState === filter) &&
        (!forecastGroup || record.forecastGroups.includes(forecastGroup)) &&
        normalize(`${record.personName} ${record.note}`).includes(normalize(search)),
    )
    .sort(
      (left, right) =>
        (left.awaitingConfirmation ? 0 : left.deadlineState === 'overdue' ? 1 : 2) -
          (right.awaitingConfirmation ? 0 : right.deadlineState === 'overdue' ? 1 : 2) ||
        (left.attentionDate ?? '9999').localeCompare(right.attentionDate ?? '9999'),
    );
  function openSheet(next: Sheet) {
    controller.setIssue('');
    setSheet(next);
  }
  function openPayment(record: DebtView) {
    openSheet({
      type: 'payment',
      personId: record.personId,
      direction: record.direction,
      debtIds: [record.id],
    });
  }
  function startSplit(prepared?: SplitDraft) {
    setSheet(null);
    split.start(prepared);
  }
  async function commitSplit(preview: SplitPreview, draft: SplitDraft) {
    await split.flush();
    const input = createBillCommand(draft);
    const result = await perform(() => apiClient.ledger.createBill.mutate(input), 'Đã chốt bill.');
    if (!result) return false;
    setDirection(preview.direction);
    setTab('home');
    split.finish(preview);
    return true;
  }
  function sheetTitle() {
    if (!sheet) return '';
    if (sheet.type === 'sources') return 'Thêm khoản';
    if (sheet.type === 'quick') return 'Ghi khoản tiền';
    if (sheet.type === 'notifications') return 'Cần xem';
    if (sheet.type === 'people') return 'Mọi người';
    if (sheet.type === 'new-person') return 'Thêm người';
    if (sheet.type === 'edit-person') return 'Sửa người';
    if (sheet.type === 'payment')
      return sheet.direction === 'receivable' ? 'Nhận tiền' : 'Ghi đã trả';
    if (sheet.type === 'share') return 'Yêu cầu thanh toán';
    if (sheet.type === 'photo') return 'Ảnh bill';
    if (sheet.type === 'person') return person?.name ?? 'Một người';
    if (sheet.type === 'bill') return bill?.title ?? 'Bill';
    if (sheet.type === 'promise') return `Hẹn với ${selected?.personName ?? ''}`;
    if (sheet.type === 'cancel') return 'Hủy khoản tiền';
    return selected?.personName ?? 'Khoản tiền';
  }
  const ocrNotice =
    photoId && split.draft?.attachmentId === photoId
      ? attachment.data?.status === 'processing' || attachment.data?.status === 'queued'
        ? 'Đang đọc bill…'
        : (attachment.data?.ocrResult?.issues[0] ??
          (attachment.data?.status === 'ready'
            ? 'Kiểm tra các khoản đã đọc từ ảnh.'
            : (attachment.data?.error ?? '')))
      : '';
  const card = (record: DebtView, amount?: number) => (
    <RecordCard
      key={record.id}
      amount={amount}
      showDescription={
        Boolean(record.note) &&
        records.filter(
          (entry) =>
            entry.personId === record.personId &&
            entry.direction === record.direction &&
            entry.remainingAmount > 0,
        ).length > 1
      }
      record={record}
      today={snapshot.today}
      onOpen={() => openSheet({ type: 'debt', id: record.id })}
    />
  );
  return (
    <div className="mvp-app">
      <header className="mvp-header">
        <Brand href="/" />
        <button
          className="icon-action"
          type="button"
          aria-label={`Cần xem: ${attention.length}`}
          onClick={() => {
            openSheet({ type: 'notifications' });
            void apiClient.ledger.readNotifications
              .mutate()
              .catch(() => controller.setIssue('Chưa đánh dấu đã đọc được.'));
          }}
        >
          <AppIcon name="reminder" />
        </button>
        <ActionButton icon="add" size="small" onClick={() => openSheet({ type: 'sources' })}>
          Thêm khoản
        </ActionButton>
      </header>
      <main className="mvp-main">
        <div className="mvp-line">
          <h1>{tabs.find((item) => item.id === tab)?.label}</h1>
          {tab !== 'settings' && (
            <ActionButton
              emphasis="quiet"
              size="small"
              icon="people"
              onClick={() => openSheet({ type: 'people' })}
            >
              Mọi người
            </ActionButton>
          )}
        </div>
        {notice && (
          <div className="mvp-notice" role="status">
            <span>{notice}</span>
            <button
              className="icon-action"
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => controller.setNotice('')}
            >
              <AppIcon name="close" size="small" />
            </button>
          </div>
        )}
        {issue && (
          <p className="mvp-error" role="alert">
            {issue}
          </p>
        )}
        {tab === 'home' && (
          <>
            <div className="mvp-overview">
              <MoneySummaryCard
                direction="receivable"
                amount={snapshot.totals.receivable}
                description={`${new Set(openRecords.filter((record) => record.direction === 'receivable').map((record) => record.personId)).size} người`}
                selected={direction === 'receivable'}
                onSelect={() => {
                  setDirection('receivable');
                  setFilter('all');
                  setForecastGroup(null);
                }}
              />
              <MoneySummaryCard
                direction="payable"
                amount={snapshot.totals.payable}
                description={`${new Set(openRecords.filter((record) => record.direction === 'payable').map((record) => record.personId)).size} người`}
                selected={direction === 'payable'}
                onSelect={() => {
                  setDirection('payable');
                  setFilter('all');
                  setForecastGroup(null);
                }}
              />
            </div>
            {split.draft && (
              <ActionButton emphasis="secondary" icon="receipt" onClick={() => startSplit()}>
                Tiếp tục chia tiền
              </ActionButton>
            )}
            {attention.length > 0 && (
              <button
                className="mvp-list-button"
                type="button"
                onClick={() => openSheet({ type: 'notifications' })}
              >
                <MascotIllustration
                  state={
                    attention.some((record) => record.deadlineState === 'overdue')
                      ? 'overdue'
                      : 'reminder'
                  }
                  size="inline"
                  decorative
                />
                <strong>Cần xem · {attention.length}</strong>
                <AppIcon name="open" size="small" />
              </button>
            )}
          </>
        )}
        {(tab === 'home' || tab === 'monitor') && (
          <>
            {tab === 'monitor' && (
              <ChoiceGroup
                label="Chiều tiền"
                value={direction}
                onChange={setDirection}
                options={[
                  { value: 'receivable', label: 'Cần thu' },
                  { value: 'payable', label: 'Cần trả' },
                ]}
              />
            )}
            <div className="mvp-line">
              <h2>
                {direction === 'receivable' ? 'Cần thu' : 'Cần trả'} · {list.length}
              </h2>
              <button
                className="icon-action"
                type="button"
                aria-label="Tìm khoản tiền"
                onClick={() => setSearchOpen(!searchOpen)}
              >
                <AppIcon name="search" size="small" />
              </button>
            </div>
            {searchOpen && (
              <input
                className="mvp-search"
                aria-label="Tìm người hoặc khoản"
                placeholder="Tìm…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            )}
            <div className="mvp-filters">
              <ChoiceGroup
                label="Lọc khoản"
                value={filter}
                onChange={(next) => {
                  setFilter(next);
                  setForecastGroup(null);
                }}
                options={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'today', label: 'Hôm nay' },
                  { value: 'overdue', label: 'Quá hạn' },
                  { value: 'confirmation', label: 'Chờ xác nhận' },
                  { value: 'disputed', label: 'Báo sai' },
                  { value: 'paid', label: 'Đã xong' },
                ]}
              />
            </div>
            {forecastGroup && (
              <ActionButton emphasis="quiet" size="small" onClick={() => setForecastGroup(null)}>
                Bỏ lọc lịch thu
              </ActionButton>
            )}
            {list.length ? (
              <div className="mvp-list">
                {list.map((record) =>
                  card(record, forecastGroup ? record.forecastAmounts[forecastGroup] : undefined),
                )}
              </div>
            ) : (
              <div className="mvp-empty">
                <MascotIllustration state={records.length ? 'settled' : 'welcome'} size="small" />
                <h2>{records.length ? 'Chưa có khoản phù hợp' : 'Sổ đang trống'}</h2>
                {!records.length && (
                  <ActionButton icon="add" onClick={() => openSheet({ type: 'sources' })}>
                    Thêm khoản đầu tiên
                  </ActionButton>
                )}
              </div>
            )}
          </>
        )}
        {tab === 'reports' && (
          <>
            <div className="mvp-grid">
              {[
                { label: 'Đã ứng', amount: snapshot.totals.advanced },
                { label: 'Phần của bạn trong bill', amount: snapshot.totals.ownExpense },
                { label: 'Đã nhận', amount: snapshot.totals.received },
                { label: 'Đã trả', amount: snapshot.totals.paid },
              ].map((metric) => (
                <div className="mvp-card" key={metric.label}>
                  <span className="mvp-caption">{metric.label}</span>
                  <MoneyAmount amount={metric.amount} size="summary" />
                </div>
              ))}
            </div>
            {snapshot.totals.excess > 0 && (
              <div className="mvp-card">
                <span>Tiền thừa giữ riêng</span>
                <MoneyAmount amount={snapshot.totals.excess} />
                <p className="mvp-caption">Chưa phân bổ vào khoản khác.</p>
              </div>
            )}
            <h2>Lịch thu 7 ngày</h2>
            <div className="mvp-grid">
              {(
                [
                  { id: 'promised', label: 'Có lời hẹn' },
                  { id: 'due', label: 'Đến hạn' },
                  { id: 'overdue', label: 'Quá hạn' },
                  { id: 'later', label: 'Sau 7 ngày' },
                  { id: 'undated', label: 'Chưa có ngày' },
                ] as const
              ).map((group) => (
                <button
                  className="mvp-metric"
                  type="button"
                  key={group.id}
                  onClick={() => {
                    setDirection('receivable');
                    setFilter('all');
                    setForecastGroup(group.id);
                    setTab('monitor');
                  }}
                >
                  <span>{group.label}</span>
                  <MoneyAmount amount={snapshot.forecast[group.id]} />
                </button>
              ))}
            </div>
            <p className="mvp-caption">Theo lịch, chưa phải tiền chắc chắn thu được.</p>
            <h2>Bill</h2>
            <div className="mvp-list">
              {snapshot.bills
                .slice()
                .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
                .map((item) => (
                  <button
                    className="mvp-list-button"
                    key={item.id}
                    type="button"
                    onClick={() => openSheet({ type: 'bill', id: item.id })}
                  >
                    <span>
                      {item.title}
                      <small>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</small>
                    </span>
                    <MoneyAmount amount={item.totalAmount} />
                  </button>
                ))}
            </div>
            <details className="mvp-details">
              <summary>Lịch sử gần đây</summary>
              <LedgerHistory snapshot={snapshot} />
            </details>
          </>
        )}
        {tab === 'settings' && (
          <SettingsPage
            user={user}
            renderer={renderer}
            onLogout={async () => {
              await split.flush();
              await onLogout();
            }}
          />
        )}
      </main>
      <nav className="mvp-nav" aria-label="Điều hướng chính">
        {tabs.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => {
              setTab(item.id);
              setForecastGroup(null);
            }}
          >
            <AppIcon name={item.icon} size="small" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <input
        type="file"
        hidden
        ref={photoInput}
        accept="image/*"
        capture="environment"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          const photo = await perform(
            async () => apiClient.files.upload.mutate(await prepareReceiptImage(file)),
            'Đã lưu ảnh.',
          );
          if (photo) {
            setPhotoId(photo.id);
            openSheet({ type: 'photo', id: photo.id });
          }
        }}
      />
      <ActionSheet open={sheet !== null} title={sheetTitle()} onClose={() => setSheet(null)}>
        {issue && (
          <p className="mvp-error" role="alert">
            {issue}
          </p>
        )}
        {sheet?.type === 'sources' && (
          <div className="mvp-form">
            <ActionButton icon="people" onClick={() => startSplit()}>
              Chia nhóm
            </ActionButton>
            <ActionButton
              emphasis="secondary"
              icon="receipt"
              onClick={() => openSheet({ type: 'quick' })}
            >
              Ghi khoản tiền
            </ActionButton>
            <ActionButton
              emphasis="secondary"
              icon="camera"
              pending={pending}
              onClick={() => photoInput.current?.click()}
            >
              Chụp bill
            </ActionButton>
          </div>
        )}
        {sheet?.type === 'quick' && (
          <QuickDebtEditor
            people={snapshot.people}
            today={snapshot.today}
            pending={pending}
            perform={perform}
            onSaved={(way) => {
              setDirection(way);
              setFilter('all');
              setTab('home');
              setSheet(null);
            }}
          />
        )}
        {sheet?.type === 'payment' && (
          <PaymentEditor
            records={records}
            personId={sheet.personId}
            direction={sheet.direction}
            initialIds={sheet.debtIds}
            pending={pending}
            perform={perform}
            onSaved={() => setSheet(null)}
          />
        )}
        {sheet?.type === 'promise' && selected && (
          <OwnerPromiseEditor
            record={selected}
            today={snapshot.today}
            pending={pending}
            perform={perform}
            onSaved={() => setSheet(null)}
          />
        )}
        {sheet?.type === 'share' && (
          <SharePanel
            ownerId={user.id}
            personId={sheet.personId}
            debtIds={sheet.debtIds}
            renderer={renderer}
          />
        )}
        {sheet?.type === 'photo' && (
          <PhotoPanel id={sheet.id} ownerId={user.id} onContinue={(draft) => startSplit(draft)} />
        )}
        {(sheet?.type === 'new-person' || sheet?.type === 'edit-person') && (
          <PersonEditor
            {...(person ? { person } : {})}
            perform={perform}
            pending={pending}
            onSaved={() => setSheet(null)}
          />
        )}
        {sheet?.type === 'people' && (
          <>
            <ActionButton
              emphasis="secondary"
              icon="add"
              onClick={() => openSheet({ type: 'new-person' })}
            >
              Thêm người
            </ActionButton>
            <div className="mvp-list">
              {snapshot.people.map((person) => (
                <button
                  className="mvp-list-button"
                  key={person.id}
                  type="button"
                  onClick={() => openSheet({ type: 'person', id: person.id })}
                >
                  <span>{person.name}</span>
                  <AppIcon name="open" size="small" />
                </button>
              ))}
            </div>
          </>
        )}
        {sheet?.type === 'person' && person && (
          <>
            <div className="mvp-line">
              <span>{person.phone}</span>
              <ActionButton
                emphasis="quiet"
                size="small"
                onClick={() => openSheet({ type: 'edit-person', id: person.id })}
              >
                Sửa tên
              </ActionButton>
            </div>
            {(['receivable', 'payable'] as const).map((way) => {
              const entries = records.filter(
                (record) =>
                  record.personId === person.id &&
                  record.direction === way &&
                  record.remainingAmount > 0,
              );
              return entries.length ? (
                <section className="mvp-form" key={way}>
                  <div className="mvp-line">
                    <h3>{way === 'receivable' ? 'Cần thu' : 'Cần trả'}</h3>
                    <MoneyAmount
                      direction={way}
                      amount={entries.reduce((total, record) => total + record.remainingAmount, 0)}
                    />
                  </div>
                  {entries.map((record) => card(record))}
                  <ActionButton
                    onClick={() =>
                      openSheet({
                        type: 'payment',
                        personId: person.id,
                        direction: way,
                        debtIds: entries.map((record) => record.id),
                      })
                    }
                  >
                    {way === 'receivable' ? 'Nhận tiền' : 'Ghi đã trả'}
                  </ActionButton>
                  {way === 'receivable' && (
                    <ActionButton
                      emphasis="secondary"
                      icon="share"
                      onClick={() =>
                        openSheet({
                          type: 'share',
                          personId: person.id,
                          debtIds: entries.map((record) => record.id),
                        })
                      }
                    >
                      Gửi yêu cầu
                    </ActionButton>
                  )}
                </section>
              ) : null;
            })}
            <details className="mvp-details">
              <summary>Lịch sử</summary>
              <LedgerHistory snapshot={snapshot} personId={person.id} />
            </details>
            <AccessLinks ownerId={user.id} personId={person.id} />
          </>
        )}
        {sheet?.type === 'bill' && bill && (
          <>
            <BillReceipt bill={bill} snapshot={snapshot} />
            {bill.attachmentId && (
              <img className="mvp-photo" src={`/files/${bill.attachmentId}`} alt="Ảnh bill gốc" />
            )}
            <div className="mvp-list">
              {records.filter((record) => record.billId === bill.id).map((record) => card(record))}
            </div>
            <details className="mvp-details">
              <summary>Lịch sử</summary>
              <LedgerHistory snapshot={snapshot} billId={bill.id} />
            </details>
          </>
        )}
        {sheet?.type === 'debt' && selected && (
          <>
            <div className="mvp-line">
              <span>{selected.direction === 'receivable' ? 'Cần thu' : 'Cần trả'}</span>
              <MoneyAmount
                amount={selected.remainingAmount}
                direction={selected.direction}
                size="summary"
              />
            </div>
            {selected.note && <p className="mvp-caption">{selected.note}</p>}
            {selected.promisedDate && (
              <div className="mvp-line">
                <span className="mvp-caption">
                  Hẹn {selected.promisedDate.split('-').reverse().join('/')}
                </span>
                <MoneyAmount amount={selected.promisedAmount} />
              </div>
            )}
            <SettlementBadge
              state={getSettlementState(
                selected.remainingAmount,
                selected.awaitingConfirmation,
                selected.confirmedAmounts.length,
              )}
            />
            {selected.remainingAmount > 0 && (
              <>
                <ActionButton icon="check" disabled={pending} onClick={() => openPayment(selected)}>
                  {selected.direction === 'receivable' ? 'Nhận tiền' : 'Ghi đã trả'}
                </ActionButton>
                <div className="mvp-actions">
                  {selected.direction === 'receivable' && (
                    <ActionButton
                      emphasis="secondary"
                      icon="share"
                      onClick={() =>
                        openSheet({
                          type: 'share',
                          personId: selected.personId,
                          debtIds: [selected.id],
                        })
                      }
                    >
                      Gửi yêu cầu
                    </ActionButton>
                  )}
                  <ActionButton
                    emphasis="secondary"
                    icon="calendar"
                    onClick={() => openSheet({ type: 'promise', id: selected.id })}
                  >
                    Hẹn lại
                  </ActionButton>
                </div>
              </>
            )}
            {reports
              .filter((report) => report.allocations.some((part) => part.debtId === selected.id))
              .map((report) => (
                <div className="mvp-card" key={report.id}>
                  <div className="mvp-line">
                    <strong>Báo đã chuyển</strong>
                    <MoneyAmount amount={report.amount} />
                  </div>
                  <div className="mvp-actions">
                    <ActionButton
                      disabled={pending}
                      onClick={() =>
                        void perform(
                          () =>
                            apiClient.ledger.confirmReport.mutate({
                              commandId: crypto.randomUUID(),
                              paymentId: report.id,
                              accept: true,
                            }),
                          'Đã xác nhận tiền về.',
                        )
                      }
                    >
                      Xác nhận
                    </ActionButton>
                    <ActionButton
                      emphasis="quiet"
                      disabled={pending}
                      onClick={() =>
                        void perform(
                          () =>
                            apiClient.ledger.confirmReport.mutate({
                              commandId: crypto.randomUUID(),
                              paymentId: report.id,
                              accept: false,
                            }),
                          'Đã từ chối báo chuyển.',
                        )
                      }
                    >
                      Chưa nhận được
                    </ActionButton>
                  </div>
                </div>
              ))}
            {snapshot.disputes
              .filter((dispute) => dispute.debtId === selected.id && dispute.status === 'open')
              .map((dispute) => (
                <div className="mvp-card" key={dispute.id}>
                  <strong>Báo sai</strong>
                  <p className="mvp-caption">
                    {dispute.note ||
                      ({
                        amount: 'Sai số tiền',
                        items: 'Không dùng khoản này',
                        paid: 'Đã trả rồi',
                        other: 'Lý do khác',
                      }[dispute.reason] ??
                        dispute.reason)}
                  </p>
                  <ActionButton
                    emphasis="secondary"
                    disabled={pending}
                    onClick={() =>
                      void perform(
                        () => apiClient.ledger.resolveDispute.mutate({ id: dispute.id }),
                        'Đã xử lý báo sai.',
                      )
                    }
                  >
                    Đã xử lý
                  </ActionButton>
                </div>
              ))}
            <div className="mvp-actions">
              {selected.billId && (
                <ActionButton
                  emphasis="quiet"
                  icon="receipt"
                  onClick={() => openSheet({ type: 'bill', id: selected.billId as string })}
                >
                  Xem bill
                </ActionButton>
              )}
              <ActionButton
                emphasis="quiet"
                icon="people"
                onClick={() => openSheet({ type: 'person', id: selected.personId })}
              >
                Xem người
              </ActionButton>
            </div>
            <details className="mvp-details">
              <summary>Lịch sử</summary>
              <LedgerHistory snapshot={snapshot} debtId={selected.id} />
            </details>
            {!selected.confirmedAmounts.length && (
              <ActionButton
                emphasis="quiet"
                onClick={() => openSheet({ type: 'cancel', id: selected.id })}
              >
                Hủy khoản
              </ActionButton>
            )}
          </>
        )}
        {sheet?.type === 'cancel' && selected && (
          <>
            <p className="mvp-caption">
              Hủy khoản {formatVnd(selected.principalAmount)} của {selected.personName}?
            </p>
            <ActionButton
              disabled={pending}
              onClick={async () => {
                const result = await perform(
                  () =>
                    apiClient.ledger.cancel.mutate({
                      commandId: crypto.randomUUID(),
                      id: selected.id,
                    }),
                  'Đã hủy khoản.',
                );
                if (result) setSheet(null);
              }}
            >
              Hủy khoản này
            </ActionButton>
          </>
        )}
        {sheet?.type === 'notifications' && (
          <>
            {reports.length > 0 && <h3>Chờ xác nhận · {reports.length}</h3>}
            <div className="mvp-list">{attention.map((record) => card(record))}</div>
            {snapshot.notifications.length > 0 && (
              <details className="mvp-details">
                <summary>Lần nhắc gần đây</summary>
                <div className="mvp-list">
                  {snapshot.notifications
                    .slice()
                    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
                    .slice(0, 30)
                    .map((notification) => (
                      <button
                        className="mvp-list-button"
                        type="button"
                        key={notification.id}
                        onClick={() =>
                          notification.debtId &&
                          openSheet({ type: 'debt', id: notification.debtId })
                        }
                      >
                        <span>
                          {notification.title}
                          <small>{notification.body}</small>
                        </span>
                      </button>
                    ))}
                </div>
              </details>
            )}
            {!attention.length && <p className="mvp-caption">Chưa có khoản cần xử lý.</p>}
          </>
        )}
      </ActionSheet>
      <SplitExpenseFlow
        previewMode={false}
        open={split.open}
        draft={split.draft}
        completed={split.completed}
        people={snapshot.people}
        storageIssue={split.storageIssue}
        notice={ocrNotice}
        onChange={split.update}
        onClose={split.close}
        onDiscard={() => void split.discard()}
        onConfirm={commitSplit}
      />
    </div>
  );
}
