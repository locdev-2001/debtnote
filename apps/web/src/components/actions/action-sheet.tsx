import { type MouseEvent, type ReactNode, useEffect, useRef } from 'react';
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
  const pointerStartedOutside = useRef(false);

  function isOutsideSheet(event: MouseEvent<HTMLDialogElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    );
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    pointerStartedOutside.current = false;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
    if (open && title) closeButtonRef.current?.focus();
  }, [open, title]);

  return (
    <dialog
      className="money-action-sheet"
      ref={dialogRef}
      onClose={onClose}
      aria-label={title}
      onPointerDown={(event) => {
        pointerStartedOutside.current =
          event.button === 0 && event.target === event.currentTarget && isOutsideSheet(event);
      }}
      onPointerCancel={() => {
        pointerStartedOutside.current = false;
      }}
      onClick={(event) => {
        const dismiss =
          pointerStartedOutside.current &&
          event.target === event.currentTarget &&
          isOutsideSheet(event);
        pointerStartedOutside.current = false;
        if (dismiss) onClose();
      }}
    >
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
