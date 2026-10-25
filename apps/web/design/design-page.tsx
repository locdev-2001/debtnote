import { useEffect, useState } from 'react';
import { ActionButton } from '../src/components/actions/action-button';
import { ActionSheet } from '../src/components/actions/action-sheet';
import { ChoiceGroup } from '../src/components/actions/choice-group';
import {
  MascotIllustration,
  type MascotState,
  mascotStates,
} from '../src/components/illustrations/mascot-illustration';
import { AmountField } from '../src/components/money/amount-field';
import { DebtListItem } from '../src/components/money/debt-list-item';
import { formatVnd } from '../src/components/money/format-vnd';
import { MoneyAmount } from '../src/components/money/money-amount';
import { MoneySummaryCard } from '../src/components/money/money-summary-card';
import {
  type MoneyDirection,
  moneyDirections,
  type SettlementState,
  settlementStates,
} from '../src/components/money/presentation';
import {
  DeadlineBadge,
  DisputeBadge,
  SettlementBadge,
} from '../src/components/money/settlement-badge';
import { exampleDebts } from './fixtures';
import { IconGallery } from './icons';
import { ComponentSizes } from './component-sizes';

const brandColors = [
  { label: 'Xanh chính', token: '--brand-green' },
  { label: 'Xanh sáng', token: '--brand-green-bright' },
  { label: 'Vàng', token: '--brand-yellow' },
  { label: 'Vàng đậm', token: '--brand-gold' },
] as const;

const paletteRoles = [
  { label: 'Nền ứng dụng', token: '--surface-app' },
  { label: 'Bề mặt đọc', token: '--surface-card' },
  { label: 'Hành động chính', token: '--action-primary' },
  { label: 'Khoản cần thu', token: '--money-receivable-surface' },
  { label: 'Khoản cần trả', token: '--money-payable-surface' },
  { label: 'Cần chú ý', token: '--deadline-attention-surface' },
] as const;

export function DesignPage() {
  useEffect(() => {
    const sectionId = window.location.hash.slice(1);
    if (sectionId) document.getElementById(sectionId)?.scrollIntoView();
  }, []);
  const [direction, setDirection] = useState<MoneyDirection>('receivable');
  const [selectedDebt, setSelectedDebt] = useState<(typeof exampleDebts)[number] | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('200000');
  const [pending, setPending] = useState(false);
  const [paymentInputValid, setPaymentInputValid] = useState(true);
  const [notice, setNotice] = useState('');
  const [mascotGroup, setMascotGroup] = useState<'all' | 'reminder' | 'payment'>('reminder');
  const visibleMascots = (Object.keys(mascotStates) as MascotState[])
    .filter((state) => mascotGroup === 'all' || mascotStates[state].group === mascotGroup)
    .sort((left, right) => mascotStates[left].order - mascotStates[right].order);
  const visibleDebts = exampleDebts.filter((debt) => debt.direction === direction);
  const amountError =
    paymentAmount !== '' && !/^\d+$/.test(paymentAmount)
      ? `Nhập số tiền bằng đồng, ví dụ ${formatVnd(200_000)}.`
      : undefined;

  function showExampleNotice() {
    setNotice('Đã chọn · Dữ liệu mẫu.');
  }

  return (
    <div className="design-page" data-design-theme="money-gold">
      <div className="design-sheet">
        <header className="sheet-header">
          <a className="wordmark" href="/" aria-label="Debtnote, về ứng dụng">
            <img src="/favicon.svg" alt="" />
            <span>
              debtnote<span className="wordmark-dot">.</span>
            </span>
          </a>
          <nav aria-label="Nội dung bộ thiết kế">
            <a href="#templates">Giao diện</a>
            <a href="#business">Thành phần</a>
            <a href="#illustrations">Nhân vật</a>
            <a href="#icons">Reicon</a>
          </nav>
        </header>

        <main>
          <h1 className="design-heading">Bộ thiết kế</h1>

          <section id="templates" aria-labelledby="templates-title">
            <div className="section-heading">
              <div>
                <h2 id="templates-title">Màu sắc</h2>
              </div>
            </div>
            <div className="brand-pattern" aria-label="Bảng màu Xanh và Vàng">
              {brandColors.map((color) => (
                <div key={color.token}>
                  <span style={{ background: `var(${color.token})` }} />
                  <strong>{color.label}</strong>
                </div>
              ))}
            </div>
            <div className="workbench-grid">
              <section className="money-preview panel" aria-label="Ví dụ các khoản tiền">
                <div className="preview-title">
                  <div>
                    <h3>Tổng quan</h3>
                  </div>
                  <span className="example-label">Dữ liệu mẫu</span>
                </div>
                <div className="summary-grid">
                  <MoneySummaryCard
                    direction="receivable"
                    amount={940_000}
                    description="4 người"
                    selected={direction === 'receivable'}
                    onSelect={() => setDirection('receivable')}
                  />
                  <MoneySummaryCard
                    direction="payable"
                    amount={200_000}
                    description="1 người"
                    selected={direction === 'payable'}
                    onSelect={() => setDirection('payable')}
                  />
                </div>
                <div className="list-caption">
                  <h4>{direction === 'receivable' ? 'Cần thu' : 'Các khoản cần trả'}</h4>
                  <span>{visibleDebts.length} khoản</span>
                </div>
                <div className="debt-list">
                  {visibleDebts.map((debt) => (
                    <DebtListItem {...debt} key={debt.id} onOpen={() => setSelectedDebt(debt)} />
                  ))}
                </div>
              </section>

              <aside className="token-column">
                <section className="panel">
                  <h3>Màu nghiệp vụ</h3>
                  <div className="semantic-palette">
                    {paletteRoles.map((role) => (
                      <div key={role.token}>
                        <span
                          className="semantic-swatch"
                          style={{ background: `var(${role.token})` }}
                        />
                        <span>
                          <strong>{role.label}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel type-panel">
                  <h3>Số tiền</h3>
                  <MoneyAmount amount={940_000} size="summary" />
                </section>
              </aside>
            </div>
          </section>

          <section id="business" aria-labelledby="business-title">
            <div className="section-heading">
              <div>
                <h2 id="business-title">Thành phần</h2>
              </div>
            </div>
            <div className="component-grid">
              <section className="panel">
                <h3>Trạng thái</h3>

                <div className="badge-examples">
                  {(Object.keys(settlementStates) as SettlementState[]).map((state) => (
                    <SettlementBadge key={state} state={state} />
                  ))}
                </div>

                <div className="badge-examples">
                  <DeadlineBadge label="Hẹn ngày mai" kind="promised" />
                  <DeadlineBadge label="Quá hạn 2 ngày" kind="overdue" />
                  <DisputeBadge />
                </div>
              </section>
              <section className="panel">
                <h3>Nhận tiền</h3>
                <AmountField
                  label="Số tiền"
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  onValidityChange={setPaymentInputValid}
                  {...(amountError ? { error: amountError } : {})}
                />

                <div className="demo-actions">
                  <ActionButton
                    icon="check"
                    pending={pending}
                    disabled={!paymentInputValid || Boolean(amountError) || paymentAmount === ''}
                    onClick={showExampleNotice}
                  >
                    Xác nhận
                  </ActionButton>
                  <label className="pending-control">
                    <input
                      type="checkbox"
                      checked={pending}
                      onChange={(event) => setPending(event.target.checked)}
                    />
                    Đang xử lý
                  </label>
                </div>
              </section>
              <section className="panel">
                <h3>Nút bấm</h3>

                <div className="action-examples">
                  <ActionButton icon="camera" onClick={showExampleNotice}>
                    Chụp bill
                  </ActionButton>
                  <ActionButton icon="reminder" emphasis="secondary" onClick={showExampleNotice}>
                    Nhắc tiền
                  </ActionButton>
                  <ActionButton
                    emphasis="quiet"
                    onClick={() => setNotice('Đã thử thao tác quay lại trong bảng thiết kế.')}
                  >
                    Để sau
                  </ActionButton>
                </div>
              </section>
            </div>
            <ComponentSizes />
            {notice && (
              <p className="demo-feedback" role="status">
                {notice}
              </p>
            )}
          </section>

          <section id="illustrations" aria-labelledby="illustrations-title">
            <div className="section-heading">
              <div>
                <h2 id="illustrations-title">Mascot</h2>
              </div>
            </div>
            <ChoiceGroup
              label="Nhóm trạng thái mascot"
              value={mascotGroup}
              onChange={setMascotGroup}
              options={[
                { value: 'reminder', label: 'Nhắc hẹn' },
                { value: 'payment', label: 'Thanh toán' },
                { value: 'all', label: 'Tất cả' },
              ]}
            />
            <div className="illustration-grid">
              {visibleMascots.map((state, index) => (
                <article
                  className="illustration-card"
                  key={state}
                  data-mascot={state}
                  style={{ background: `var(--mascot-${state}-surface)` }}
                >
                  <span className="card-index">0{index + 1}</span>
                  <MascotIllustration state={state} />
                  <h3>{mascotStates[state].title}</h3>
                </article>
              ))}
            </div>
          </section>

          <section id="icons" aria-labelledby="icons-title">
            <div className="section-heading">
              <div>
                <h2 id="icons-title">Icon</h2>
              </div>
            </div>
            <IconGallery />
          </section>
          <footer className="sheet-footer">
            <span>debtnote.</span>

            <a href="/">Về ứng dụng ↗</a>
          </footer>
        </main>
      </div>

      <ActionSheet
        open={selectedDebt !== null}
        title={selectedDebt ? `Khoản tiền với ${selectedDebt.name}` : 'Khoản tiền'}
        onClose={() => setSelectedDebt(null)}
      >
        {selectedDebt && (
          <>
            <MoneyAmount
              amount={selectedDebt.amount}
              direction={selectedDebt.direction}
              size="summary"
            />
            <p>{selectedDebt.description}</p>
            <SettlementBadge state={selectedDebt.state} />
            <ActionButton
              icon={moneyDirections[selectedDebt.direction].actionIcon}
              onClick={() => {
                showExampleNotice();
                setSelectedDebt(null);
              }}
            >
              {moneyDirections[selectedDebt.direction].actionLabel}
            </ActionButton>
          </>
        )}
      </ActionSheet>
    </div>
  );
}
