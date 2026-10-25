# Nền tảng thiết kế Debtnote

Ngày: 25/10/2026. Đây là bộ thiết kế và component dùng chung, chưa phải các screen nghiệp vụ đã hoàn thành. Dữ liệu ở trang xem thử là dữ liệu mẫu.

Xem và tương tác tại http://localhost:5173/design/ khi chạy `pnpm dev`.

## Hướng được đề xuất: Trà xanh · Kem

Nền trung tính ấm, pastel dùng cho vùng nhỏ và trạng thái, chữ xanh đậm. Hạn chế mảng màu bão hòa lớn và nền trắng thuần toàn màn hình. Đây là đề xuất để duyệt cùng hai phương án so sánh; không tự động coi template đã được duyệt.

| Template                   | Tính chất                              | Hành động chính |
| -------------------------- | -------------------------------------- | --------------- |
| Trà xanh · Kem (`sage`)    | Dịu, ấm, gần gũi; đề xuất cho Debtnote | Xanh trầm       |
| Oải hương · Sương (`mist`) | Mát, yên tĩnh, trung tính hơn          | Tím xám         |
| Đào · Cát (`sand`)         | Ấm và mềm hơn                          | Nâu đất         |

Các template giữ cùng cách hiểu nghiệp vụ: cần thu là xanh, cần trả là đào/nâu, quá hạn là hổ phách. Không đổi màu trạng thái tùy tiện khi đổi theme.

## Token theo nghiệp vụ

Nguồn duy nhất cho token UI là `apps/web/src/design/tokens.css`. Các component sử dụng biến CSS, không tự chọn mã màu. Token được chia thành:

| Nhóm       | Token tiêu biểu                                                                                          | Mục đích                                   |
| ---------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Bề mặt đọc | `--surface-app`, `--surface-card`, `--surface-subtle`                                                    | Nền ứng dụng, nội dung và vùng phụ         |
| Thông tin  | `--text-primary`, `--text-secondary`                                                                     | Tên người, số tiền, nội dung bổ trợ        |
| Hành động  | `--action-primary`, `--action-on-primary`, `--focus-ring`                                                | Hành động chính và focus bàn phím          |
| Cần thu    | `--money-receivable-text`, `--money-receivable-surface`                                                  | Tiền người khác còn phải trả mình          |
| Cần trả    | `--money-payable-text`, `--money-payable-surface`                                                        | Tiền mình còn phải trả người khác          |
| Thanh toán | `--settlement-pending-*`, `--settlement-partial-*`, `--settlement-confirmation-*`, `--settlement-paid-*` | Tiến độ thanh toán                         |
| Hạn trả    | `--deadline-attention-*`                                                                                 | Việc đã quá hạn cần xử lý                  |
| Đồng thuận | `--dispute-*`                                                                                            | Khoản đang được báo sai                    |
| Lỗi nhập   | `--feedback-error-*`, `--border-control`                                                                 | Thông báo lỗi và biên nhập liệu dễ nhận ra |
| Hình ảnh   | `--mascot-welcome-surface`, `--mascot-settled-surface`, `--mascot-reminder-surface`                      | Nền nhẹ cho minh họa                       |

Màu của template đề xuất: nền `#F6F5F1`, bề mặt `#FDFCF9`, chữ chính `#293A35`, hành động `#355E50`, nền cần thu `#E4EEE5`, nền cần trả `#F3E6DF`.

## Manrope và kích thước

Manrope Variable được tự host từ package `@fontsource-variable/manrope`. Chỉ nạp hai tập Latin và tiếng Việt; không gọi Google Fonts hoặc CDN lúc sử dụng. Nguồn cấu hình font: `apps/web/src/design/fonts.css`.

| Vai trò                               | Kích thước mặc định            |
| ------------------------------------- | ------------------------------ |
| Chú thích và badge                    | 12 px                          |
| Nhãn bổ trợ                           | 13 px                          |
| Nội dung                              | 14–16 px                       |
| Tiêu đề section                       | 22 px                          |
| Tiêu đề screen                        | 28 px                          |
| Số tiền tổng                          | 32 px; 28 px trên điện thoại   |
| Số tiền trong dòng                    | 16 px                          |
| Icon                                  | 18 / 20 / 24 / 28 px qua token |
| Avatar                                | 44 px                          |
| Vùng chạm và control                  | 48 px                          |
| Bo góc control / card / bảng thao tác | 14 / 20 / 28 px                |

Spacing theo thang 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px. Tiền dùng `tabular-nums`; không chạy hiệu ứng đếm làm chậm việc đọc. Token còn có line-height, font-weight, border, shadow và thời gian phản hồi. Tùy chọn giảm chuyển động được tôn trọng.

## Component dùng chung

| Component            | Trách nhiệm                                                 | Không làm                               |
| -------------------- | ----------------------------------------------------------- | --------------------------------------- |
| `MoneyAmount`        | Hiển thị VND, cấp nhấn mạnh và chiều cần thu/trả            | Tính số dư hoặc xác nhận tiền           |
| `MoneySummaryCard`   | Tóm tắt một chiều tiền và phát sự kiện chọn bộ lọc          | Tự truy vấn hoặc tự cộng nợ             |
| `DebtListItem`       | Tên, avatar, số còn lại, trạng thái và sự kiện mở chi tiết  | Gửi nhắc hoặc đổi số nợ                 |
| `SettlementBadge`    | Hiển thị tiến độ thanh toán                                 | Suy ra quá hạn từ trạng thái thanh toán |
| `DeadlineBadge`      | Hiển thị đến hạn, lời hẹn hoặc quá hạn                      | Thay đổi tiến độ thanh toán             |
| `DisputeBadge`       | Đánh dấu đang báo sai                                       | Coi là thanh toán thất bại              |
| `AmountField`        | Nhập tiền, nhãn, lỗi, hướng dẫn và focus                    | Thực hiện phép chia hoặc lưu tiền       |
| `ActionButton`       | Hành động chính/phụ, disabled và đang xử lý                 | Gọi API ngầm                            |
| `ActionSheet`        | Bảng thao tác bằng dialog, quản lý đóng/mở và focus native  | Chứa logic thanh toán                   |
| `PersonAvatar`       | Chữ viết tắt tên người                                      | Ghép danh tính hoặc dùng ảnh người giả  |
| `AppIcon`            | Ánh xạ tên thao tác sang Reicon và size token               | Đưa chi tiết thư viện vào lõi nghiệp vụ |
| `MascotIllustration` | Ánh xạ trạng thái sang ảnh, alt, kích thước và lazy loading | Thay cho thông báo chữ                  |

Những component này chỉ nhận props và phát sự kiện. Application service sẽ cung cấp trạng thái thật ở bước triển khai nghiệp vụ. Không có HTTP, database hoặc logic kênh nhắc tiền trong component; `money-core` không phụ thuộc UI. Nhãn và ý nghĩa trạng thái hiển thị tập trung tại `components/money/presentation.ts`.

Thanh toán, hạn trả và báo sai là các chiều độc lập. Ví dụ một khoản có thể vừa trả một phần, vừa quá hạn. Component không suy diễn tình trạng này từ màu sắc hoặc tự gộp chúng thành một enum nghiệp vụ dùng chung với backend.

## Reicon và mascot

Icon dùng package `reicon-react`, import trực tiếp từng icon. `AppIcon` là nơi ánh xạ các tên nghiệp vụ như `receive`, `send`, `reminder`, `check` sang icon. Trang xem thử có nút đổi nét/đặc. Biểu tượng không tự vẽ lại.

Mascot là rái cá xanh ngọc nguyên bản, ba tư thế được tạo bằng công cụ imagegen tích hợp. Ảnh nền trong suốt và giữ cùng nhận diện nhân vật:

| Trạng thái   | PNG gốc                             | WebP dùng trên web                             |
| ------------ | ----------------------------------- | ---------------------------------------------- |
| Chào/bắt đầu | `design-assets/mascot/welcome.png`  | `apps/web/public/visuals/mascot-welcome.webp`  |
| Đã xong      | `design-assets/mascot/settled.png`  | `apps/web/public/visuals/mascot-settled.webp`  |
| Đến ngày hẹn | `design-assets/mascot/reminder.png` | `apps/web/public/visuals/mascot-reminder.webp` |

Prompt chính xác và quan hệ ảnh tham chiếu lưu trong `design-assets/mascot/prompts.json`. PNG gốc nằm ngoài public; giao diện dùng WebP khoảng 110–125 KB/ảnh. Không precache toàn bộ mascot khi mở app. Chỉ đặt minh họa ở trạng thái rỗng, hướng dẫn hoặc hoàn tất; danh sách giao dịch ưu tiên thông tin.

Logo chữ D/gáy sổ vẫn là SVG riêng của Debtnote, nguồn tại `apps/web/public/favicon.svg`.

## Kiểm tra và xuất tài nguyên

```bash
pnpm design:check
pnpm icons:generate
pnpm mascot:export
pnpm check
```

`design:check` kiểm tra tương phản các cặp chữ/nền nghiệp vụ trong cả ba theme, tương phản biên nhập liệu, Manrope và kích thước control/vùng chạm. Mục tiêu chữ thông thường tối thiểu 4,5:1 và biên nhập liệu 3:1; đây là kiểm tra token, không thay thế kiểm tra accessibility toàn screen.

Hai lệnh xuất ảnh cần ImageMagick. Tài nguyên đã xuất được commit sẵn, build/chạy app không cần ImageMagick. Trang `/design/` chỉ dùng khi chạy Vite dev, không thêm vào bản build production.

## Nguồn thư viện

- [Reicon](https://github.com/dqev/reicon), MIT; phần credits của Reicon có Solar Icons của 480 Design (CC BY 4.0) và Zappicon.
- [Manrope trên Fontsource](https://fontsource.org/fonts/manrope), SIL Open Font License 1.1; license gốc đi kèm package.
