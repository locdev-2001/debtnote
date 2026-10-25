import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from '../../components/actions/action-button';
import { ActionSheet } from '../../components/actions/action-sheet';
import { AppIcon } from '../../components/app-icon';
import {
  MascotIllustration,
  type MascotState,
} from '../../components/illustrations/mascot-illustration';
import { ExpenseReceipt, ReceiptAmountRow } from '../../components/money/expense-receipt';
import { formatVnd } from '../../components/money/format-vnd';
import { getTodayKey } from '../../lib/calendar';
import {
  applyRecipientCommand,
  emptyRecipientResponse,
  type PaymentRequest,
  type PaymentRequestReader,
  type RecipientCommand,
  requestOutstanding,
} from './payment-request';
import { DisputeForm, RecipientPromiseForm, ReportPaymentForm } from './response-forms';
import type { RecipientResponseStore } from './response-store';
import './recipient.css';

type RecipientSheet = 'payment' | 'report' | 'promise' | 'dispute' | null;
const sheetTitles = {
  payment: 'Thông tin nhận tiền',
  report: 'Báo đã chuyển',
  promise: 'Hẹn trả',
  dispute: 'Báo sai',
};
const shortDate = (date: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${date}T12:00:00Z`));

function RecipientHeader() {
  return (
    <header className="recipient-header">
      <div className="recipient-brand">
        <img src="/favicon.svg" alt="" />
        <span>debtnote.</span>
      </div>
      <span className="recipient-demo-label">Link mẫu</span>
    </header>
  );
}

export function RecipientPage({
  requestId,
  store,
  reader,
}: {
  requestId: string;
  store: RecipientResponseStore;
  reader: PaymentRequestReader;
}) {
  const requestQuery = useQuery({
    queryKey: ['payment-request', requestId],
    queryFn: () => reader.load(requestId),
  });
  if (requestQuery.isPending || requestQuery.isError)
    return (
      <div className="recipient-page">
        <RecipientHeader />
        <main className="recipient-content">
          <section className="recipient-empty">
            {requestQuery.isPending ? (
              <p role="status">Đang mở khoản tiền…</p>
            ) : (
              <>
                <MascotIllustration state="confirmation" size="small" />
                <h2>Chưa mở được khoản tiền</h2>
                <ActionButton onClick={() => void requestQuery.refetch()}>Thử lại</ActionButton>
              </>
            )}
          </section>
        </main>
      </div>
    );
  return <RecipientRequestPage key={requestId} request={requestQuery.data} store={store} />;
}

function RecipientRequestPage({
  request,
  store,
}: {
  request: PaymentRequest | null;
  store: RecipientResponseStore;
}) {
  const today = getTodayKey();
  const [response, setResponse] = useState(() =>
    request ? store.load(request) : emptyRecipientResponse(),
  );
  const [sheet, setSheet] = useState<RecipientSheet>(null);
  const [issue, setIssue] = useState('');
  const outstanding = request ? requestOutstanding(request) : 0;
  const active = request?.access === 'active';
  const canRespond = active && outstanding > 0;
  function dispatch(command: RecipientCommand) {
    if (!request) return;
    try {
      const nextResponse = applyRecipientCommand(request, response, command, today);
      setResponse(nextResponse);
      setIssue(store.save(request.id, nextResponse) ? '' : 'Chưa lưu được trên thiết bị.');
      setSheet(null);
    } catch (error) {
      setIssue(error instanceof Error ? error.message : 'Chưa lưu được.');
    }
  }
  function openSheet(nextSheet: RecipientSheet) {
    setIssue('');
    setSheet(nextSheet);
  }
  const status: {
    mascot: MascotState;
    title: string;
    detail?: string;
    action?: () => void;
  } | null =
    !request || !active
      ? null
      : outstanding === 0
        ? { mascot: 'settled', title: 'Đã trả đủ' }
        : response.dispute
          ? { mascot: 'confirmation', title: 'Đã lưu báo sai', action: () => openSheet('dispute') }
          : response.reportedAmount !== null
            ? {
                mascot: 'confirmation',
                title: `Chờ ${request.collectorName} xác nhận`,
                detail: formatVnd(response.reportedAmount),
                action: () => openSheet('report'),
              }
            : response.promisedDate
              ? {
                  mascot: 'snoozed',
                  title: `Hẹn ${shortDate(response.promisedDate)}`,
                  action: () => openSheet('promise'),
                }
              : null;
  return (
    <div className="recipient-page">
      <RecipientHeader />
      <main className="recipient-content">
        <h1 className="visually-hidden">
          {request && active
            ? `Phần của ${request.recipientName}`
            : request
              ? 'Link đã hết hạn'
              : 'Link không hợp lệ'}
        </h1>
        {!request || !active ? (
          <section className="recipient-empty">
            <MascotIllustration state="confirmation" size="small" />
            <h2>{request ? 'Link đã hết hạn' : 'Link không hợp lệ'}</h2>
            <p>
              {request
                ? `Nhờ ${request.collectorName} gửi lại link.`
                : 'Kiểm tra lại link bạn nhận được.'}
            </p>
          </section>
        ) : (
          <>
            {status && (
              <div className="recipient-status" role="status">
                <MascotIllustration state={status.mascot} size="inline" decorative />
                <div>
                  <strong>{status.title}</strong>
                  {status.detail && <span>{status.detail}</span>}
                </div>
                {status.action && (
                  <button
                    type="button"
                    className="icon-action"
                    aria-label="Xem trạng thái"
                    onClick={status.action}
                  >
                    <AppIcon name="open" size="small" />
                  </button>
                )}
              </div>
            )}
            <ExpenseReceipt meta={`${request.recipientName} → ${request.collectorName}`}>
              {request.dueDate && outstanding > 0 && (
                <p className="recipient-due">
                  {request.dueDate === today
                    ? 'Đến hạn hôm nay'
                    : `${request.dueDate < today ? 'Quá hạn' : 'Đến hạn'} ${shortDate(request.dueDate)}`}
                </p>
              )}
              <div className="receipt-column-labels">
                <span>Khoản của bạn</span>
                <span>Thành tiền</span>
              </div>
              <div className="receipt-rows">
                {request.lines
                  .filter((line) => line.personalAmount > 0)
                  .map((line) => (
                    <ReceiptAmountRow
                      key={line.id}
                      label={line.title}
                      amount={line.personalAmount}
                      detail={`${formatVnd(line.totalAmount)} / ${line.participantCount} người`}
                    />
                  ))}
              </div>
              <ReceiptAmountRow
                label="Phần của bạn"
                amount={request.principalAmount}
                emphasis="total"
              />
              {request.confirmedAmounts.length > 0 && (
                <ReceiptAmountRow label="Đã nhận" amount={request.principalAmount - outstanding} />
              )}
              <ReceiptAmountRow label="Cần trả" amount={outstanding} emphasis="settlement" />
              <details className="recipient-original">
                <summary>Xem bill gốc</summary>
                <div className="recipient-original-rows">
                  {request.lines.map((line) => (
                    <ReceiptAmountRow
                      key={line.id}
                      label={line.title}
                      amount={line.totalAmount}
                      {...(line.personalAmount === 0 ? { detail: 'Không tính vào phần bạn' } : {})}
                    />
                  ))}
                  <ReceiptAmountRow label="Tổng bill" amount={request.billTotal} emphasis="total" />
                </div>
              </details>
            </ExpenseReceipt>
            {canRespond && (
              <div className="recipient-actions">
                <div className="recipient-primary-actions">
                  <ActionButton emphasis="secondary" icon="qr" onClick={() => openSheet('payment')}>
                    Mã QR
                  </ActionButton>
                  <ActionButton icon="send" onClick={() => openSheet('report')}>
                    {response.reportedAmount !== null ? 'Sửa báo chuyển' : 'Đã chuyển'}
                  </ActionButton>
                </div>
                <div className="recipient-secondary-actions">
                  <ActionButton
                    emphasis="quiet"
                    icon="calendar"
                    onClick={() => openSheet('promise')}
                  >
                    Hẹn trả
                  </ActionButton>
                  <ActionButton emphasis="quiet" onClick={() => openSheet('dispute')}>
                    Báo sai
                  </ActionButton>
                </div>
              </div>
            )}
          </>
        )}
        {issue && (
          <p className="recipient-error" role="alert">
            {issue}
          </p>
        )}
        <p className="recipient-local-note">Bản mẫu · Chỉ lưu trên thiết bị này.</p>
        <details className="recipient-preview">
          <summary>Tùy chọn mẫu</summary>
          <nav aria-label="Các mẫu người nhận">
            <a href="/p/mau-binh">Trả một phần</a>
            <a href="/p/mau-dung">Chưa trả</a>
            <a href="/p/mau-da-tra">Đã trả đủ</a>
            <a href="/p/mau-het-han">Hết hạn</a>
            <a href="/">Tổng quan</a>
            {request && (
              <button
                type="button"
                onClick={() => {
                  setResponse(emptyRecipientResponse());
                  setIssue(store.reset(request.id) ? '' : 'Chưa xóa được lượt mẫu.');
                }}
              >
                Khôi phục lượt này
              </button>
            )}
          </nav>
        </details>
      </main>
      <ActionSheet
        open={sheet !== null && canRespond}
        title={sheet ? sheetTitles[sheet] : ''}
        onClose={() => {
          setSheet(null);
        }}
      >
        {request && canRespond && (
          <div className="recipient-sheet">
            {sheet === 'report' && (
              <>
                <ReportPaymentForm
                  request={request}
                  response={response}
                  onConfirm={(amount) => dispatch({ type: 'report-payment', amount })}
                />
                {response.reportedAmount !== null && (
                  <ActionButton
                    emphasis="quiet"
                    onClick={() => dispatch({ type: 'cancel-report' })}
                  >
                    Rút báo chuyển
                  </ActionButton>
                )}
              </>
            )}
            {sheet === 'promise' && (
              <RecipientPromiseForm
                today={today}
                promisedDate={response.promisedDate}
                onConfirm={(date) => dispatch({ type: 'promise', date })}
              />
            )}
            {sheet === 'dispute' && (
              <DisputeForm
                request={request}
                dispute={response.dispute}
                onConfirm={(reason, note, itemId) =>
                  dispatch({ type: 'dispute', reason, note, itemId })
                }
              />
            )}
            {sheet === 'payment' && (
              <div className="recipient-payment-empty">
                <AppIcon name="qr" size="large" />
                <h3>Chưa có mã QR</h3>
                <p>{request.collectorName} chưa thêm tài khoản nhận tiền.</p>
                <ActionButton onClick={() => openSheet('report')}>Tôi đã chuyển</ActionButton>
              </div>
            )}
            {issue && (
              <p className="recipient-error" role="alert">
                {issue}
              </p>
            )}
          </div>
        )}
      </ActionSheet>
    </div>
  );
}
