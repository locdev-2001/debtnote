import type { ComponentSize } from '../../design/component-size';

export function PersonAvatar({ name, size = 'regular' }: { name: string; size?: ComponentSize }) {
  const nameParts = name.trim().split(/\s+/).filter(Boolean);
  const firstInitial = nameParts[0]?.[0] ?? '?';
  const lastInitial = nameParts.length > 1 ? (nameParts.at(-1)?.[0] ?? '') : '';

  return (
    <span className="person-avatar" aria-hidden="true" data-component-size={size}>
      {`${firstInitial}${lastInitial}`.toLocaleUpperCase('vi-VN')}
    </span>
  );
}
