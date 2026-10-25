import { useState } from 'react';
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

const templates = [
  { id: 'sage', name: 'Trà xanh · Kem', description: 'Dịu, ấm và rõ ràng', recommended: true },
  { id: 'mist', name: 'Oải hương · Sương', description: 'Mát và yên tĩnh', recommended: false },
  { id: 'sand', name: 'Đào · Cát', description: 'Ấm áp và gần gũi', recommended: false },
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
  const [template, setTemplate] = useState<(typeof templates)[number]['id']>('sage');
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
    setNotice('Đã thử thao tác. Đây là dữ liệu minh họa, chưa ghi nhận hoặc gửi thanh toán thật.');
  }

  return (
    <div className="design-page" data-design-theme={template}>
      <div className="design-sheet">
        <header className="sheet-header">
          <a className="wordmark" href="/" aria-label="Debtnote, về ứng dụng">
            <img src="/favicon.svg" width="36" height="36" alt="" />
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
          <span className="edition">MANROPE · SOLID</span>
        </header>

        <main>
          <section className="introduction" aria-labelledby="visual-title">
            <div>
              <p className="eyebrow">DEBTNOTE / NỀN TẢNG THIẾT KẾ</p>
              <h1 id="visual-title">
                Rõ chuyện tiền.
                <br />
                <span>Nhẹ cả ngày.</span>
              </h1>
              <p className="introduction-copy">
                Màu rõ hơn, chữ Manrope dễ đọc. Màu sắc giúp nhận ra việc cần làm, để những con số
                luôn là điều dễ thấy nhất.
              </p>
              <div className="design-principles">
                <span>Font tự host</span>
                <span>Token theo nghiệp vụ</span>
                <span>Thao tác bằng chạm</span>
              </div>
            </div>
            <div className="brand-art">
              <span className="art-caption">
                <span className="small-dot" /> Có bạn đồng hành rồi.
              </span>
              <MascotIllustration state="welcome" priority decorative />
              <span className="art-signature">Một lời chào nhỏ, chuyện tiền nhẹ hơn.</span>
            </div>
          </section>

          <section id="templates" aria-labelledby="templates-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">01 / TEMPLATE</p>
                <h2 id="templates-title">Dịu mắt, vẫn rõ việc.</h2>
              </div>
              <p>
                Cùng component, đổi phối màu để so sánh.
                <br />
                Tao đề xuất Trà xanh · Kem cho Debtnote.
              </p>
            </div>
            <fieldset className="template-picker">
              <legend className="visually-hidden">Chọn template màu</legend>
              {templates.map((choice) => (
                <button
                  type="button"
                  key={choice.id}
                  data-template-choice={choice.id}
                  aria-pressed={template === choice.id}
                  onClick={() => setTemplate(choice.id)}
                >
                  <span className="template-color" />
                  <span>
                    <strong>{choice.name}</strong>
                    <small>{choice.description}</small>
                  </span>
                  {choice.recommended && <span className="recommended-label">Đề xuất</span>}
                </button>
              ))}
            </fieldset>

            <div className="workbench-grid">
              <section className="money-preview panel" aria-label="Ví dụ các khoản tiền">
                <div className="preview-title">
                  <div>
                    <span className="eyebrow">VÍ DỤ GIAO DIỆN</span>
                    <h3>Tổng quan của bạn</h3>
                  </div>
                  <span className="example-label">Dữ liệu mẫu</span>
                </div>
                <div className="summary-grid">
                  <MoneySummaryCard
                    direction="receivable"
                    amount={940_000}
                    description="4 người còn cần thanh toán"
                    selected={direction === 'receivable'}
                    onSelect={() => setDirection('receivable')}
                  />
                  <MoneySummaryCard
                    direction="payable"
                    amount={200_000}
                    description="1 khoản bạn cần thanh toán"
                    selected={direction === 'payable'}
                    onSelect={() => setDirection('payable')}
                  />
                </div>
                <div className="list-caption">
                  <h4>{direction === 'receivable' ? 'Các khoản cần thu' : 'Các khoản cần trả'}</h4>
                  <span>{visibleDebts.length} khoản</span>
                </div>
                <div className="debt-list">
                  {visibleDebts.map((debt) => (
                    <DebtListItem {...debt} key={debt.id} onOpen={() => setSelectedDebt(debt)} />
                  ))}
                </div>
                <p className="sample-caption">
                  Bấm số dư để lọc; bấm một người để xem bảng thao tác mẫu.
                </p>
              </section>

              <aside className="token-column">
                <section className="panel">
                  <p className="eyebrow">MÀU CÓ VAI TRÒ</p>
                  <h3>
                    Màu solid cho trạng thái.
                    <br />
                    Màu đậm cho thông tin.
                  </h3>
                  <div className="semantic-palette">
                    {paletteRoles.map((role) => (
                      <div key={role.token}>
                        <span
                          className="semantic-swatch"
                          style={{ background: `var(${role.token})` }}
                        />
                        <span>
                          <strong>{role.label}</strong>
                          <code>{role.token}</code>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel type-panel">
                  <p className="eyebrow">MANROPE · TIẾNG VIỆT</p>
                  <h3>Đúng số, đúng người.</h3>
                  <MoneyAmount amount={940_000} size="summary" />
                  <p>
                    Chữ số thẳng hàng. Cần thu và cần trả có nhãn riêng, không chỉ phân biệt bằng
                    màu.
                  </p>
                </section>
              </aside>
            </div>
          </section>

          <section id="business" aria-labelledby="business-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">02 / COMPONENT THEO NGHIỆP VỤ</p>
                <h2 id="business-title">Mỗi trạng thái, một ý nghĩa.</h2>
              </div>
              <p>
                Thanh toán, hạn trả và báo sai được tách riêng.
                <br />
                Dùng chung cho bill, ứng hộ và cho vay.
              </p>
            </div>
            <div className="component-grid">
              <section className="panel">
                <h3>Trạng thái khoản tiền</h3>
                <p className="component-note">Tiến độ thanh toán</p>
                <div className="badge-examples">
                  {(Object.keys(settlementStates) as SettlementState[]).map((state) => (
                    <SettlementBadge key={state} state={state} />
                  ))}
                </div>
                <p className="component-note">Lịch hẹn và đồng thuận</p>
                <div className="badge-examples">
                  <DeadlineBadge label="Hẹn ngày mai" kind="promised" />
                  <DeadlineBadge label="Quá hạn 2 ngày" kind="overdue" />
                  <DisputeBadge />
                </div>
                <p className="sample-caption">Một khoản có thể vừa trả một phần, vừa quá hạn.</p>
              </section>
              <section className="panel">
                <h3>Ghi nhận thanh toán</h3>
                <AmountField
                  label="Số tiền đã nhận"
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  onValidityChange={setPaymentInputValid}
                  {...(amountError
                    ? { error: amountError }
                    : { helperText: 'Có thể nhận một phần khoản tiền.' })}
                />
                <p className="sample-caption">
                  Số tiền xác nhận: <MoneyAmount amount={Number(paymentAmount || '0')} />
                </p>
                <div className="demo-actions">
                  <ActionButton
                    icon="check"
                    pending={pending}
                    disabled={!paymentInputValid || Boolean(amountError) || paymentAmount === ''}
                    onClick={showExampleNotice}
                  >
                    Xác nhận đã nhận
                  </ActionButton>
                  <label className="pending-control">
                    <input
                      type="checkbox"
                      checked={pending}
                      onChange={(event) => setPending(event.target.checked)}
                    />
                    Thử trạng thái đang xử lý
                  </label>
                </div>
              </section>
              <section className="panel">
                <h3>Hành động rõ ràng</h3>
                <p className="component-note">Một hành động chính trong mỗi bước.</p>
                <div className="action-examples">
                  <ActionButton icon="camera" onClick={showExampleNotice}>
                    Chụp bill
                  </ActionButton>
                  <ActionButton icon="reminder" emphasis="secondary" onClick={showExampleNotice}>
                    Nhắc thanh toán
                  </ActionButton>
                  <ActionButton
                    emphasis="quiet"
                    onClick={() => setNotice('Đã thử thao tác quay lại trong bảng thiết kế.')}
                  >
                    Để sau
                  </ActionButton>
                </div>
                <div className="size-specs">
                  <span>
                    Vùng chạm <strong>48 px</strong>
                  </span>
                  <span>
                    Nội dung <strong>14–16 px</strong>
                  </span>
                  <span>
                    Số tiền <strong>28–32 px</strong>
                  </span>
                </div>
              </section>
            </div>
            {notice && (
              <p className="demo-feedback" role="status">
                {notice}
              </p>
            )}
          </section>

          <section id="illustrations" aria-labelledby="illustrations-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">03 / MASCOT RIÊNG</p>
                <h2 id="illustrations-title">Một chút vui, đúng lúc.</h2>
              </div>
              <p>
                Rái cá xanh ngọc, cùng một nhân vật ở tám trạng thái.
                <br />
                Chỉ xuất hiện ở chỗ cần hướng dẫn hoặc xác nhận.
              </p>
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
                  <p>{mascotStates[state].description}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="icons" aria-labelledby="icons-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">04 / REICON</p>
                <h2 id="icons-title">Nhìn rõ, bấm nhanh.</h2>
              </div>
              <p>
                Import đúng từng icon được dùng.
                <br />
                Thử hai kiểu nét và đặc ngay bên dưới.
              </p>
            </div>
            <IconGallery />
          </section>
          <footer className="sheet-footer">
            <span>debtnote.</span>
            <p>Manrope · Reicon · Token nghiệp vụ · Mascot tạo bằng imagegen</p>
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
            <p className="sample-caption">
              Bảng thao tác minh họa; không gửi thông báo hoặc ghi nhận tiền thật.
            </p>
          </>
        )}
      </ActionSheet>
    </div>
  );
}
