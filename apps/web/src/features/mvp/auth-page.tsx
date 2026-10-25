import { phoneSchema } from '@debtnote/contracts';
import { useState } from 'react';
import { ActionButton } from '../../components/actions/action-button';
import { Brand } from '../../components/brand/brand';
import { apiClient } from '../../lib/rpc';
import './mvp.css';

function rememberedPhone() {
  try {
    return localStorage.getItem('debtnote:last-phone') ?? '';
  } catch {
    return '';
  }
}
type AuthMode = 'login' | 'recover';
export function AuthPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [phone, setPhone] = useState(rememberedPhone);
  const [step, setStep] = useState<'phone' | 'pin'>(() => (rememberedPhone() ? 'pin' : 'phone'));
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [pending, setPending] = useState(false);
  const [issue, setIssue] = useState('');
  const ready =
    /^\d{6}$/.test(pin) &&
    (mode !== 'recover' || pin === confirmation) &&
    (mode !== 'recover' || recoveryCode.length >= 16);
  function switchMode(next: AuthMode) {
    setMode(next);
    setStep('phone');
    setPin('');
    setConfirmation('');
    setRecoveryCode('');
    setIssue('');
  }
  function backToPhone() {
    try {
      localStorage.removeItem('debtnote:last-phone');
    } catch {
      /* Vẫn đổi SĐT được khi storage bị chặn. */
    }
    setStep('phone');
    setPin('');
    setConfirmation('');
    setIssue('');
  }
  return (
    <main className="auth-page">
      <Brand size="large" />
      <section className="auth-card">
        <h1>
          {step === 'phone'
            ? mode === 'recover'
              ? 'Khôi phục PIN'
              : 'Đăng nhập'
            : mode === 'recover'
              ? 'Đặt lại PIN'
              : 'Nhập PIN'}
        </h1>
        {step === 'phone' ? (
          <form
            className="mvp-form"
            onSubmit={(event) => {
              event.preventDefault();
              const parsed = phoneSchema.safeParse(phone);
              if (!parsed.success) {
                setIssue('Kiểm tra lại số điện thoại.');
                return;
              }
              setPhone(parsed.data);
              setIssue('');
              setStep('pin');
            }}
          >
            <label className="money-form-field">
              Số điện thoại
              <input
                key="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setIssue('');
                }}
                placeholder="09…"
                required
                maxLength={20}
              />
            </label>
            {issue && (
              <p className="mvp-error" role="alert">
                {issue}
              </p>
            )}
            <ActionButton type="submit" disabled={!phone.trim()}>
              Tiếp tục
            </ActionButton>
          </form>
        ) : (
          <>
            <div className="mvp-line">
              <strong>{phone}</strong>
              <ActionButton emphasis="quiet" size="small" disabled={pending} onClick={backToPhone}>
                Đổi SĐT
              </ActionButton>
            </div>
            {mode === 'login' && (
              <p className="mvp-caption">Lần đầu? Chọn PIN để dùng cho lần sau.</p>
            )}
            <form
              className="mvp-form"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!ready || pending) return;
                setPending(true);
                setIssue('');
                try {
                  if (mode === 'recover') {
                    await apiClient.auth.recover.mutate({ phone, code: recoveryCode, newPin: pin });
                    setMode('login');
                    setPin('');
                    setConfirmation('');
                    setRecoveryCode('');
                    setIssue('Đã đổi PIN. Đăng nhập lại nhé.');
                  } else {
                    await apiClient.auth.enter.mutate({ phone, pin });
                    try {
                      localStorage.setItem('debtnote:last-phone', phone);
                    } catch {
                      /* Phiên đăng nhập không phụ thuộc localStorage. */
                    }
                    onAuthenticated();
                  }
                } catch (error) {
                  setIssue(error instanceof Error ? error.message : 'Chưa đăng nhập được.');
                } finally {
                  setPending(false);
                }
              }}
            >
              <fieldset disabled={pending}>
                {mode === 'recover' && (
                  <label className="money-form-field">
                    Mã khôi phục
                    <input
                      key="recovery"
                      value={recoveryCode}
                      onChange={(event) => setRecoveryCode(event.target.value.trim())}
                      maxLength={64}
                      autoComplete="off"
                    />
                  </label>
                )}
                <label className="money-form-field">
                  {mode === 'recover' ? 'PIN mới · 6 số' : 'PIN · 6 số'}
                  <input
                    key={`${mode}-pin`}
                    type="password"
                    inputMode="numeric"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                  />
                </label>
                {mode === 'recover' && (
                  <label className="money-form-field">
                    Nhập lại PIN
                    <input
                      key="confirmation"
                      type="password"
                      inputMode="numeric"
                      autoComplete="new-password"
                      value={confirmation}
                      onChange={(event) =>
                        setConfirmation(event.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      maxLength={6}
                      required
                    />
                  </label>
                )}
                {issue && (
                  <p className="mvp-error" role="alert">
                    {issue}
                  </p>
                )}
                <ActionButton type="submit" pending={pending} disabled={!ready}>
                  {mode === 'recover' ? 'Đổi PIN' : 'Vào sổ'}
                </ActionButton>
              </fieldset>
            </form>
          </>
        )}
        <div className="auth-alternatives">
          {mode === 'login' ? (
            <>
              <ActionButton
                emphasis="quiet"
                size="small"
                disabled={pending}
                onClick={() => switchMode('recover')}
              >
                Quên PIN
              </ActionButton>
            </>
          ) : (
            <ActionButton emphasis="quiet" disabled={pending} onClick={() => switchMode('login')}>
              Đăng nhập
            </ActionButton>
          )}
        </div>
      </section>
    </main>
  );
}
