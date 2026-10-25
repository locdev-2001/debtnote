import type { ButtonHTMLAttributes } from 'react';
import { AppIcon, type AppIconName } from '../app-icon';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: AppIconName;
  emphasis?: 'primary' | 'secondary' | 'quiet';
  pending?: boolean;
}

export function ActionButton({
  icon,
  emphasis = 'primary',
  pending = false,
  disabled,
  children,
  type = 'button',
  ...buttonProps
}: ActionButtonProps) {
  return (
    <button
      {...buttonProps}
      type={type}
      className={['action-button', buttonProps.className].filter(Boolean).join(' ')}
      data-emphasis={emphasis}
      aria-busy={pending}
      disabled={disabled || pending}
    >
      {icon && <AppIcon name={icon} size="small" />}
      {pending ? 'Đang xử lý…' : children}
    </button>
  );
}
