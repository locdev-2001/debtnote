import './brand.css';

export function Brand({
  href,
  size = 'regular',
}: {
  href?: string;
  size?: 'small' | 'regular' | 'large';
}) {
  const content = (
    <>
      <img src="/visuals/brand-mark.webp" width={256} height={256} alt="" />
      <span>
        debtnote<span className="brand-dot">.</span>
      </span>
    </>
  );
  return href ? (
    <a className="app-brand" data-brand-size={size} href={href} aria-label="Debtnote, trang chủ">
      {content}
    </a>
  ) : (
    <span className="app-brand" data-brand-size={size}>
      {content}
    </span>
  );
}
