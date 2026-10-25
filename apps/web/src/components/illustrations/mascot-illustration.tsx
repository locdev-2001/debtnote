export const mascotStates = {
  welcome: {
    order: 0,
    group: 'start',
    source: '/visuals/mascot-welcome.webp',
    alt: 'Rái cá xanh ngọc ôm sổ và vẫy chào',
    title: 'Chưa có khoản tiền',
    description: 'Bắt đầu bằng một khoản nhỏ. Mọi chuyện sẽ rõ ràng hơn.',
  },
  settled: {
    order: 7,
    group: 'payment',
    source: '/visuals/mascot-settled.webp',
    alt: 'Rái cá vui mừng bên dấu kiểm đã hoàn tất',
    title: 'Mọi khoản đã xong',
    description: 'Tiền đã đủ, đầu nhẹ tênh. Mọi khoản đã được chốt.',
  },
  reminder: {
    order: 2,
    group: 'reminder',
    source: '/visuals/mascot-reminder.webp',
    alt: 'Rái cá chỉ vào ngày hẹn trên lịch',
    title: 'Đến ngày hẹn',
    description: 'Một lời nhắc nhỏ để mọi người nhớ đúng hẹn.',
  },
  upcoming: {
    order: 1,
    group: 'reminder',
    source: '/visuals/mascot-upcoming.webp',
    alt: 'Rái cá cầm đồng hồ và nhắc trước ngày hẹn',
    title: 'Sắp đến hẹn',
    description: 'Nhắc trước một chút để mọi người chủ động chuẩn bị.',
  },
  overdue: {
    order: 3,
    group: 'reminder',
    source: '/visuals/mascot-overdue.webp',
    alt: 'Rái cá ôm đồng hồ cát, nhẹ nhàng nhắc khoản quá hạn',
    title: 'Đã quá hạn',
    description: 'Hẹn đã qua. Mình cùng thống nhất thời gian thanh toán nhé.',
  },
  snoozed: {
    order: 4,
    group: 'reminder',
    source: '/visuals/mascot-snoozed.webp',
    alt: 'Rái cá chỉ ngày mới trên lịch sau khi đổi hẹn',
    title: 'Đã hẹn lại',
    description: 'Ngày mới đã được thống nhất, lời nhắc cũng cần đổi theo.',
  },
  partial: {
    order: 5,
    group: 'payment',
    source: '/visuals/mascot-partial.webp',
    alt: 'Rái cá đếm một phần tiền với vòng tiến độ chưa đầy',
    title: 'Đã trả một phần',
    description: 'Đã nhận một phần. Số còn lại vẫn được theo dõi riêng.',
  },
  confirmation: {
    order: 6,
    group: 'payment',
    source: '/visuals/mascot-confirmation.webp',
    alt: 'Rái cá kiểm tra biên nhận bằng kính lúp và chờ xác nhận',
    title: 'Chờ xác nhận',
    description: 'Đã báo chuyển tiền. Chờ người nhận kiểm tra tiền về.',
  },
} as const;

export type MascotState = keyof typeof mascotStates;

export function MascotIllustration({
  state,
  priority = false,
  decorative = false,
  size = 'regular',
}: {
  state: MascotState;
  priority?: boolean;
  decorative?: boolean;
  size?: 'inline' | 'small' | 'regular' | 'large';
}) {
  const illustration = mascotStates[state];
  return (
    <img
      className="mascot-illustration"
      data-illustration-size={size}
      src={illustration.source}
      alt={decorative ? '' : illustration.alt}
      width={1254}
      height={1254}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
