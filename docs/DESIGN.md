# Nền tảng thiết kế Debtnote

Ngày: 25/10/2026. Đây là bộ thiết kế và component dùng chung, chưa phải các screen nghiệp vụ đã hoàn thành. Dữ liệu ở trang xem thử là dữ liệu mẫu.

Xem và tương tác tại http://localhost:5173/design/ khi chạy `pnpm dev`.

## Hướng được đề xuất: Trà xanh · Kem

Nền trung tính có màu rõ hơn; card cần thu/cần trả và badge dùng màu solid đậm với chữ sáng. Bố cục không có border trang trí: phân biệt khối, dòng và trạng thái bằng màu nền, khoảng cách và nhãn. Chỉ giữ outline focus khi thao tác bàn phím. Đây là đề xuất để duyệt cùng hai phương án so sánh; không tự động coi template đã được duyệt.

| Template                   | Tính chất                              | Hành động chính |
| -------------------------- | -------------------------------------- | --------------- |
| Trà xanh · Kem (`sage`)    | Dịu, ấm, gần gũi; đề xuất cho Debtnote | Xanh trầm       |
| Oải hương · Sương (`mist`) | Mát, yên tĩnh, trung tính hơn          | Tím xám         |
| Đào · Cát (`sand`)         | Ấm và mềm hơn                          | Nâu đất         |

Các template giữ cùng cách hiểu nghiệp vụ: cần thu là xanh, cần trả là đào/nâu, quá hạn là hổ phách. Không đổi màu trạng thái tùy tiện khi đổi theme.

## Token theo nghiệp vụ

Nguồn duy nhất cho token UI là `apps/web/src/design/tokens.css`. Các component sử dụng biến CSS, không tự chọn mã màu. Token được chia thành:

| Nhóm       | Token tiêu biểu                                                                                          | Mục đích                               |
| ---------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Bề mặt đọc | `--surface-app`, `--surface-card`, `--surface-subtle`                                                    | Nền ứng dụng, nội dung và vùng phụ     |
| Thông tin  | `--text-primary`, `--text-secondary`                                                                     | Tên người, số tiền, nội dung bổ trợ    |
| Hành động  | `--action-primary`, `--action-on-primary`, `--focus-ring`                                                | Hành động chính và focus bàn phím      |
| Cần thu    | `--money-receivable-text`, `--money-receivable-surface`                                                  | Tiền người khác còn phải trả mình      |
| Cần trả    | `--money-payable-text`, `--money-payable-surface`                                                        | Tiền mình còn phải trả người khác      |
| Thanh toán | `--settlement-pending-*`, `--settlement-partial-*`, `--settlement-confirmation-*`, `--settlement-paid-*` | Tiến độ thanh toán                     |
| Hạn trả    | `--deadline-attention-*`                                                                                 | Việc đã quá hạn cần xử lý              |
| Đồng thuận | `--dispute-*`                                                                                            | Khoản đang được báo sai                |
| Lỗi nhập   | `--feedback-error-*`, `--input-error-*`                                                                  | Thông báo lỗi và nền nhập liệu đổi màu |
| Hình ảnh   | `--mascot-welcome-surface`, `--mascot-settled-surface`, `--mascot-reminder-surface`                      | Nền nhẹ cho minh họa                   |

Màu của template đề xuất: nền `#E5ECE6`, bề mặt `#FBFCF8`, chữ chính `#20392F`, hành động `#275A41`, card cần thu `#337357`, card cần trả `#A35339`. Badge dùng màu solid theo nghiệp vụ; tiền trong dòng dùng token màu đậm riêng để không lấy màu chữ sáng của card.

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

Spacing theo thang 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px. Tiền dùng `tabular-nums`; không chạy hiệu ứng đếm làm chậm việc đọc. Token còn có line-height, font-weight, outline focus, nền nhập liệu và thời gian phản hồi; card không dùng border hoặc shadow để phân tách. Tùy chọn giảm chuyển động được tôn trọng.

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

Mascot là rái cá xanh ngọc nguyên bản, tám tư thế được tạo bằng công cụ imagegen tích hợp. Nhóm Nhắc hẹn gồm sắp đến hẹn, đến ngày hẹn, quá hạn và hẹn lại; nhóm Thanh toán gồm trả một phần, chờ xác nhận và đã xong. Ảnh nền trong suốt và giữ cùng nhận diện nhân vật:

| Trạng thái   | PNG gốc                                 | WebP dùng trên web                                 |
| ------------ | --------------------------------------- | -------------------------------------------------- |
| Chào/bắt đầu | `design-assets/mascot/welcome.png`      | `apps/web/public/visuals/mascot-welcome.webp`      |
| Đã xong      | `design-assets/mascot/settled.png`      | `apps/web/public/visuals/mascot-settled.webp`      |
| Đến ngày hẹn | `design-assets/mascot/reminder.png`     | `apps/web/public/visuals/mascot-reminder.webp`     |
| Sắp đến hẹn  | `design-assets/mascot/upcoming.png`     | `apps/web/public/visuals/mascot-upcoming.webp`     |
| Đã quá hạn   | `design-assets/mascot/overdue.png`      | `apps/web/public/visuals/mascot-overdue.webp`      |
| Đã hẹn lại   | `design-assets/mascot/snoozed.png`      | `apps/web/public/visuals/mascot-snoozed.webp`      |
| Trả một phần | `design-assets/mascot/partial.png`      | `apps/web/public/visuals/mascot-partial.webp`      |
| Chờ xác nhận | `design-assets/mascot/confirmation.png` | `apps/web/public/visuals/mascot-confirmation.webp` |

Prompt chính xác và quan hệ ảnh tham chiếu lưu trong `design-assets/mascot/prompts.json`. PNG gốc nằm ngoài public; giao diện dùng WebP đã nén để dùng trên web. Không precache toàn bộ mascot khi mở app. Chỉ đặt minh họa ở trạng thái rỗng, hướng dẫn hoặc hoàn tất; danh sách giao dịch ưu tiên thông tin.

Logo chữ D/gáy sổ vẫn là SVG riêng của Debtnote, nguồn tại `apps/web/public/favicon.svg`.

## Kiểm tra và xuất tài nguyên

```bash
pnpm design:check
pnpm icons:generate
pnpm mascot:export
pnpm check
```

`design:check` kiểm tra tương phản các cặp chữ/nền nghiệp vụ trong cả ba theme, tương phản nền nhập liệu, Manrope và kích thước control/vùng chạm. Mục tiêu chữ thông thường tối thiểu 4,5:1 và nền nhập liệu so với bề mặt xung quanh 3:1; đây là kiểm tra token, không thay thế kiểm tra accessibility toàn screen.

Hai lệnh xuất ảnh cần ImageMagick. Tài nguyên đã xuất được commit sẵn, build/chạy app không cần ImageMagick. Trang `/design/` chỉ dùng khi chạy Vite dev, không thêm vào bản build production.

## Nguồn thư viện

- [Reicon](https://github.com/dqev/reicon), MIT; phần credits của Reicon có Solar Icons của 480 Design (CC BY 4.0) và Zappicon.
- [Manrope trên Fontsource](https://fontsource.org/fonts/manrope), SIL Open Font License 1.1; license gốc đi kèm package.

## Format tiền dùng chung

`components/money/format-vnd.ts` là nguồn cấu hình format duy nhất. `MoneyAmount` và `AmountField` cùng dùng dấu chấm phân nhóm nghìn, không có phần lẻ và ký hiệu ₫. Ô nhập hiển thị `1.234.567` với đơn vị ₫ bên cạnh; callback chỉ trả chuỗi chữ số `1234567`, không lưu dấu phân cách hoặc ép về số thực.

`react-number-format` quản lý con trỏ, chèn/xóa và định dạng khi gõ. Dán tiền theo định dạng Việt Nam được hỗ trợ; dữ liệu âm, có phần lẻ, định dạng mơ hồ hoặc vượt giới hạn số nguyên an toàn bị từ chối mà không đổi giá trị hiện tại. Giới hạn số tiền dùng lại `assertMinorUnits` của `money-core`. Có kiểm thử format, số không, giới hạn an toàn và dữ liệu dán không hợp lệ.
