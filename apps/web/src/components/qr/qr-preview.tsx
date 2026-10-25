import { useEffect, useState } from 'react';
import type { QrPresentation, QrRenderer } from '../../lib/qr/qr-renderer';
import { ActionButton } from '../actions/action-button';
import './qr-preview.css';

interface QrPreviewProps {
  payload: string;
  renderer: QrRenderer;
  label: string;
}

export function QrPreview(props: QrPreviewProps) {
  const [attempt, setAttempt] = useState(0);
  return (
    <QrPreviewAttempt key={attempt} {...props} onRetry={() => setAttempt((value) => value + 1)} />
  );
}

function QrPreviewAttempt({
  payload,
  renderer,
  label,
  onRetry,
}: QrPreviewProps & { onRetry: () => void }) {
  const [presentation, setPresentation] = useState<QrPresentation | null>(null);
  const [issue, setIssue] = useState('');
  useEffect(() => {
    let active = true;
    setPresentation(null);
    setIssue('');
    renderer
      .render(payload)
      .then((nextPresentation) => {
        if (active) setPresentation(nextPresentation);
      })
      .catch(() => {
        if (active) setIssue('Chưa tạo được mã QR.');
      });
    return () => {
      active = false;
    };
  }, [payload, renderer]);
  return (
    <section className="qr-preview" aria-label={label}>
      <div className="qr-preview-media" aria-busy={!presentation && !issue}>
        {issue ? (
          <div className="qr-preview-error">
            <p role="alert">{issue}</p>
            <ActionButton emphasis="secondary" onClick={onRetry}>
              Thử lại
            </ActionButton>
          </div>
        ) : !presentation ? (
          <p className="qr-preview-hint" role="status">
            Đang tạo mã…
          </p>
        ) : (
          <iframe
            className="qr-preview-frame"
            src={presentation.source}
            title={label}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts"
            onError={() => setIssue('Chưa tải được mã QR.')}
          />
        )}
      </div>
    </section>
  );
}
