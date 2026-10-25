import type { IconWeight } from 'reicon-react';
import { Add } from 'reicon-react/icons/Add';
import { ArrowDownLeft } from 'reicon-react/icons/ArrowDownLeft';
import { ArrowUpRight } from 'reicon-react/icons/ArrowUpRight';
import { Bell } from 'reicon-react/icons/Bell';
import { Calendar } from 'reicon-react/icons/Calendar';
import { Camera } from 'reicon-react/icons/Camera';
import { CheckCircle } from 'reicon-react/icons/CheckCircle';
import { ChevronRight } from 'reicon-react/icons/ChevronRight';
import { Home } from 'reicon-react/icons/Home';
import { MoreH } from 'reicon-react/icons/MoreH';
import { Qr } from 'reicon-react/icons/Qr';
import { Receipt } from 'reicon-react/icons/Receipt';
import { Search3 } from 'reicon-react/icons/Search3';
import { Share } from 'reicon-react/icons/Share';
import { Users } from 'reicon-react/icons/Users';
import { X } from 'reicon-react/icons/X';

export const appIconDefinitions = {
  add: { component: Add, label: 'Thêm khoản' },
  camera: { component: Camera, label: 'Chụp bill' },
  receipt: { component: Receipt, label: 'Khoản tiền' },
  people: { component: Users, label: 'Mọi người' },
  receive: { component: ArrowDownLeft, label: 'Cần thu' },
  send: { component: ArrowUpRight, label: 'Cần trả' },
  reminder: { component: Bell, label: 'Nhắc tiền' },
  calendar: { component: Calendar, label: 'Hẹn ngày' },
  check: { component: CheckCircle, label: 'Đã nhận' },
  share: { component: Share, label: 'Chia sẻ' },
  home: { component: Home, label: 'Trang chủ' },
  search: { component: Search3, label: 'Tìm kiếm' },
  open: { component: ChevronRight, label: 'Mở chi tiết' },
  close: { component: X, label: 'Đóng' },
  more: { component: MoreH, label: 'Tùy chọn' },
  qr: { component: Qr, label: 'Mã QR' },
} as const;

export type AppIconName = keyof typeof appIconDefinitions;

interface AppIconProps {
  name: AppIconName;
  label?: string;
  className?: string;
  size?: 'compact' | 'small' | 'regular' | 'large';
  weight?: IconWeight;
}

export function AppIcon({
  name,
  label,
  className,
  size = 'regular',
  weight = 'Outline',
}: AppIconProps) {
  const ReiconComponent = appIconDefinitions[name].component;
  const iconSize = size === 'regular' ? 'var(--size-icon)' : `var(--size-icon-${size})`;

  return (
    <ReiconComponent
      size={iconSize}
      style={{ width: iconSize, height: iconSize }}
      weight={weight}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      className={className}
    />
  );
}
