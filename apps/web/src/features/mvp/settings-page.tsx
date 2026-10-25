import type { Identity, ReceivingProfile } from '@debtnote/contracts';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ActionButton } from '../../components/actions/action-button';
import { ActionSheet } from '../../components/actions/action-sheet';
import { QrPreview } from '../../components/qr/qr-preview';
import { decodeReceivingQr } from '../../lib/images';
import type { QrRenderer } from '../../lib/qr/qr-renderer';
import { apiClient, queryClient } from '../../lib/rpc';

export function SettingsPage({
  user,
  renderer,
  onLogout,
}: {
  user: Identity;
  renderer: QrRenderer;
  onLogout: () => Promise<void>;
}) {
  const profile = useQuery({
    queryKey: ['settings', user.id],
    queryFn: () => apiClient.settings.get.query(),
  });
  if (profile.isPending) return <p role="status">Đang mở thiết lập…</p>;
  if (profile.isError)
    return (
      <div className="mvp-form">
        <p className="mvp-error">{profile.error.message}</p>
        <ActionButton onClick={() => void profile.refetch()}>Thử lại</ActionButton>
      </div>
    );
  return (
    <SettingsEditor
      key={user.id}
      user={user}
      initial={profile.data}
      renderer={renderer}
      onLogout={onLogout}
    />
  );
}
function SettingsEditor({
  user,
  initial,
  renderer,
  onLogout,
}: {
  user: Identity;
  initial: ReceivingProfile;
  renderer: QrRenderer;
  onLogout: () => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [payload, setPayload] = useState(initial.paymentQrPayload);
  const [enabled, setEnabled] = useState(initial.remindersEnabled);
  const [hour, setHour] = useState(initial.remindHour);
  const [pending, setPending] = useState(false);
  const [issue, setIssue] = useState('');
  const [notice, setNotice] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [savePin, setSavePin] = useState('');
  const [sheet, setSheet] = useState<'pin' | 'recovery' | null>(null);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [recovery, setRecovery] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  async function operation(work: () => Promise<unknown>, message: string) {
    setPending(true);
    setIssue('');
    setNotice('');
    try {
      await work();
      await queryClient.invalidateQueries({ queryKey: ['settings', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      setNotice(message);
      return true;
    } catch (error) {
      setIssue(error instanceof Error ? error.message : 'Chưa lưu được.');
      return false;
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="mvp-list">
      <div className="mvp-card">
        <strong>{user.phone}</strong>
        <form
          className="mvp-form"
          onSubmit={async (event) => {
            event.preventDefault();
            await operation(
              () =>
                apiClient.settings.save.mutate({
                  name: name.trim(),
                  paymentQrPayload: payload,
                  remindersEnabled: enabled,
                  remindHour: hour,
                  ...(payload !== initial.paymentQrPayload ? { pin: savePin } : {}),
                }),
              'Đã lưu thiết lập.',
            );
          }}
        >
          <fieldset disabled={pending}>
            <label className="money-form-field">
              Tên hiển thị
              <input
                value={name}
                maxLength={60}
                required
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <h2>Nhận tiền</h2>
            <input
              type="file"
              accept="image/*"
              ref={imageInput}
              hidden
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setPending(true);
                setIssue('');
                try {
                  setPayload(await decodeReceivingQr(file));
                  setNotice('Đã đọc QR. Bấm Lưu để áp dụng.');
                } catch (error) {
                  setIssue(error instanceof Error ? error.message : 'Chưa đọc được QR.');
                } finally {
                  setPending(false);
                }
              }}
            />
            <div className="mvp-actions">
              <ActionButton
                emphasis="secondary"
                icon="qr"
                onClick={() => imageInput.current?.click()}
              >
                {payload ? 'Đổi ảnh QR' : 'Thêm ảnh QR'}
              </ActionButton>
              {payload && (
                <>
                  <ActionButton emphasis="quiet" onClick={() => setShowQr(!showQr)}>
                    Xem QR
                  </ActionButton>
                  <ActionButton
                    emphasis="quiet"
                    onClick={() => {
                      setPayload(null);
                      setShowQr(false);
                    }}
                  >
                    Xóa
                  </ActionButton>
                </>
              )}
            </div>
            {showQr && payload && (
              <QrPreview payload={payload} renderer={renderer} label="QR nhận tiền đã cấu hình" />
            )}
            <details className="mvp-details">
              <summary>Dán nội dung QR</summary>
              <label className="money-form-field">
                <span className="visually-hidden">Nội dung gốc của QR</span>
                <textarea
                  value={payload ?? ''}
                  maxLength={1024}
                  onChange={(event) => setPayload(event.target.value || null)}
                />
              </label>
            </details>
            {payload !== initial.paymentQrPayload && (
              <label className="money-form-field">
                PIN để đổi QR
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={savePin}
                  onChange={(event) => setSavePin(event.target.value.replace(/\D/g, ''))}
                />
              </label>
            )}
            <h2>Nhắc hạn</h2>
            <label className="mvp-checkbox-row">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              Nhắc trong ứng dụng
            </label>
            {enabled && (
              <label className="money-form-field">
                Giờ nhắc
                <select value={hour} onChange={(event) => setHour(Number(event.target.value))}>
                  {[7, 8, 9, 10, 12, 15, 17, 18, 20].map((value) => (
                    <option value={value} key={value}>
                      {String(value).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </label>
            )}
            {issue && (
              <p className="mvp-error" role="alert">
                {issue}
              </p>
            )}
            {notice && (
              <p className="mvp-caption" role="status">
                {notice}
              </p>
            )}
            <ActionButton
              type="submit"
              pending={pending}
              disabled={
                !name.trim() || (payload !== initial.paymentQrPayload && !/^\d{6}$/.test(savePin))
              }
            >
              Lưu
            </ActionButton>
          </fieldset>
        </form>
      </div>
      <div className="mvp-card">
        <h2>Tài khoản</h2>
        <ActionButton
          emphasis="secondary"
          onClick={() => {
            setSheet('pin');
            setCurrentPin('');
            setNewPin('');
            setIssue('');
          }}
        >
          Đổi PIN
        </ActionButton>
        <ActionButton
          emphasis="secondary"
          onClick={() => {
            setSheet('recovery');
            setCurrentPin('');
            setRecovery('');
            setIssue('');
          }}
        >
          Mã khôi phục
        </ActionButton>
        <ActionButton emphasis="quiet" disabled={pending} onClick={() => void onLogout()}>
          Đăng xuất
        </ActionButton>
      </div>
      <ActionSheet
        open={sheet !== null}
        title={sheet === 'pin' ? 'Đổi PIN' : 'Mã khôi phục'}
        onClose={() => setSheet(null)}
      >
        <form
          className="mvp-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (sheet === 'pin') {
              if (
                await operation(
                  () => apiClient.auth.changePin.mutate({ currentPin, newPin }),
                  'Đã đổi PIN.',
                )
              )
                setSheet(null);
            } else
              await operation(async () => {
                const result = await apiClient.auth.createRecovery.mutate({ pin: currentPin });
                setRecovery(result.code);
              }, 'Giữ mã này để khôi phục khi quên PIN.');
          }}
        >
          <fieldset disabled={pending}>
            {!recovery && (
              <label className="money-form-field">
                PIN hiện tại
                <input
                  inputMode="numeric"
                  type="password"
                  maxLength={6}
                  value={currentPin}
                  onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ''))}
                />
              </label>
            )}
            {sheet === 'pin' && (
              <label className="money-form-field">
                PIN mới
                <input
                  inputMode="numeric"
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ''))}
                />
              </label>
            )}
            {recovery ? (
              <>
                <code className="mvp-share-link">{recovery}</code>
                <p className="mvp-caption">
                  Mã chỉ hiện ở lượt này. Cất riêng, không gửi cho người khác.
                </p>
                <ActionButton
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(recovery)
                      .then(() => setNotice('Đã sao chép mã.'))
                      .catch(() => setIssue('Chưa sao chép được.'))
                  }
                >
                  Sao chép mã
                </ActionButton>
              </>
            ) : (
              <ActionButton
                type="submit"
                pending={pending}
                disabled={
                  !/^\d{6}$/.test(currentPin) || (sheet === 'pin' && !/^\d{6}$/.test(newPin))
                }
              >
                {sheet === 'pin' ? 'Đổi PIN' : 'Tạo mã khôi phục'}
              </ActionButton>
            )}
            {issue && (
              <p className="mvp-error" role="alert">
                {issue}
              </p>
            )}
          </fieldset>
        </form>
      </ActionSheet>
    </div>
  );
}
