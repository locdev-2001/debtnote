import { type ReactNode, useEffect, useRef } from 'react';
import { AppIcon } from '../app-icon';

interface ActionSheetProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function ActionSheet({ open, title, children, onClose }: ActionSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
    if (open && title) closeButtonRef.current?.focus();
  }, [open, title]);

  return (
    <dialog className="money-action-sheet" ref={dialogRef} onClose={onClose} aria-label={title}>
      <div className="money-sheet-header">
        <h2>{title}</h2>
        <button
          ref={closeButtonRef}
          type="button"
          className="icon-action"
          aria-label="Đóng"
          onClick={onClose}
        >
          <AppIcon name="close" />
        </button>
      </div>
      <div className="money-sheet-body">{children}</div>
    </dialog>
  );
}
