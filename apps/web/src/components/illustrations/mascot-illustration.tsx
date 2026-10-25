export const mascotStates = {
  welcome: {
    source: '/visuals/mascot-welcome.webp',
    alt: 'Rái cá xanh ngọc ôm sổ và vẫy chào',
    title: 'Chưa có khoản tiền',
    description: 'Bắt đầu bằng một khoản nhỏ. Mọi chuyện sẽ rõ ràng hơn.',
  },
  settled: {
    source: '/visuals/mascot-settled.webp',
    alt: 'Rái cá vui mừng bên dấu kiểm đã hoàn tất',
    title: 'Mọi khoản đã xong',
    description: 'Tiền đã đủ, đầu nhẹ tênh. Mọi khoản đã được chốt.',
  },
  reminder: {
    source: '/visuals/mascot-reminder.webp',
    alt: 'Rái cá chỉ vào ngày hẹn trên lịch',
    title: 'Đến ngày hẹn',
    description: 'Một lời nhắc nhỏ để mọi người nhớ đúng hẹn.',
  },
} as const;

export type MascotState = keyof typeof mascotStates;

export function MascotIllustration({
  state,
  priority = false,
  decorative = false,
}: {
  state: MascotState;
  priority?: boolean;
  decorative?: boolean;
}) {
  const illustration = mascotStates[state];
  return (
    <img
      className="mascot-illustration"
      src={illustration.source}
      alt={decorative ? '' : illustration.alt}
      width={1254}
      height={1254}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
