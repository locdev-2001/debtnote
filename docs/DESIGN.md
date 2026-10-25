# Design system Debtnote

Manrope · Reicon · nền trắng · xanh–vàng · component compact. Xem tại `/design/`, Trang chủ tại `/`.

## Nguồn chuẩn

- `apps/web/src/design/tokens.css`: primitive → semantic → recipe component.
- `apps/web/src/design/component-size.ts`: contract `small | regular | large`.
- Screen chỉ bố trí layout, không tự đặt size, font, padding hoặc màu riêng.
- Ngoại lệ: breakpoint, kích thước ảnh gốc và tiện ích ẩn 1 px cho accessibility.

## Màu

| Màu        | Giá trị   | Vai trò               |
| ---------- | --------- | --------------------- |
| Xanh chính | `#1B8366` | Hành động, cần thu    |
| Xanh sáng  | `#57C478` | Đã trả                |
| Vàng       | `#FFDD0E` | Cần trả, hôm nay      |
| Vàng đậm   | `#E9AE0B` | Quá hạn, trả một phần |
| Trắng      | `#FFFFFF` | Nền chính             |

Chữ trên vàng/xanh sáng dùng màu tối. Chữ trên xanh chính dùng trắng. Màu lỗi dùng semantic riêng. Không có border trang trí; giữ focus ring khi dùng bàn phím.

## Cỡ và mật độ

| Thành phần        | Nhỏ   | Chuẩn | Lớn   |
| ----------------- | ----- | ----- | ----- |
| Nút               | 30 px | 36 px | 40 px |
| Input             | 32 px | 36 px | 40 px |
| Choice group      | 30 px | 36 px | 40 px |
| Avatar            | 24 px | 32 px | 40 px |
| Font badge        | 11 px | 12 px | 13 px |
| Padding card      | 10 px | 12 px | 16 px |
| Padding dòng tiền | 8 px  | 10 px | 12 px |
- Nội dung 13–14 px; nhãn 12 px; chú thích 11 px.
- Tiêu đề 17/22 px; số tiền 14/22–24 px.
- Icon 14/16/18/20 px; icon button hiển thị 32 px, vùng chạm trong suốt 44 px.
- Radius control/card/sheet 8/12/16 px; CTA điện thoại 44 px.
- Thiết bị con trỏ thô dùng control chuẩn 40 px, font input 16 px để tránh zoom.
- Không dùng zoom hoặc transform để thu nhỏ toàn màn hình.

## Component và pattern dùng chung

| Component                             | Trách nhiệm                                           |
| ------------------------------------- | ----------------------------------------------------- |
| `ActionButton`                        | Primary/secondary/quiet, size, disabled, pending      |
| `AmountField`                         | Tiền đã format, size, nhãn, helper/error              |
| `ChoiceGroup`                         | Nhóm lựa chọn đơn, size, trạng thái chọn              |
| `AppIcon`                             | Ánh xạ hành động sang Reicon, bốn cỡ                  |
| `PersonAvatar`                        | Chữ viết tắt, ba cỡ                                   |
| `SettlementBadge`                     | Chưa trả/một phần/chờ xác nhận/đã trả                 |
| `DeadlineBadge`                       | Ngày hẹn/hôm nay/quá hạn                              |
| `DisputeBadge`                        | Báo sai                                               |
| `MoneySummaryCard`                    | Tổng theo chiều tiền, chọn bộ lọc, size               |
| `DebtListItem`                        | Tên, tiền, một badge ưu tiên; ghi chú trong chi tiết  |
| `MoneyAmount`                         | Format VND và cấp nhấn mạnh                           |
| `ExpenseReceipt` / `ReceiptAmountRow` | Giấy bill trắng đen, các dòng tiền, tổng và phần chia |
| `ActionSheet`                         | Dialog giữa desktop, bảng đáy điện thoại, focus/đóng  |
| `MascotIllustration`                  | Inline 40 px, nhỏ 80 px, chuẩn 128 px, lớn 160 px     |
| `.money-form-field`                   | Input/select/textarea dùng cùng recipe                |

`AmountPresets` dùng chung cho nhận tiền và báo chuyển, nhãn nhận đủ/toàn bộ tùy thao tác. `PromiseDateField` dùng chung cho ngày hẹn với các lựa chọn ngày mai/3 ngày/tuần sau.

Component nhận props và phát sự kiện, không gọi API hoặc database. Nhãn trạng thái ở `components/money/presentation.ts`; format ở `components/money/format-vnd.ts`. `money-core` giữ quy tắc số tiền trung tính.

## Nội dung

Màn chính chỉ giữ tên, số tiền, một trạng thái và hành động. Bỏ khẩu hiệu/hướng dẫn lặp. Ghi chú trong chi tiết; tùy chọn mẫu mặc định đóng. Trạng thái thanh toán và hạn trả độc lập, không gộp vào một enum backend.

Phần chia tiền dùng kiểu giấy bill quán ăn: nền trắng, mực đen, không hoa văn, tên bên trái và tiền bên phải, tổng in đậm. Ngoại lệ màu này chỉ nằm trong component bill và luồng chia; Trang chủ vẫn xanh–vàng. Input/select/textarea trên mobile dùng token 16 px để tránh tự zoom khi focus; giữ khả năng zoom thủ công của người dùng.

## Tài nguyên

PNG gốc: `design-assets/mascot/`. WebP: `apps/web/public/visuals/mascot-{state}.webp`.

| Trạng thái   | File gốc           |
| ------------ | ------------------ |
| Bắt đầu      | `welcome.png`      |
| Sắp đến hẹn  | `upcoming.png`     |
| Đến ngày hẹn | `reminder.png`     |
| Quá hạn      | `overdue.png`      |
| Hẹn lại      | `snoozed.png`      |
| Một phần     | `partial.png`      |
| Chờ xác nhận | `confirmation.png` |
| Đã xong      | `settled.png`      |

Ảnh tạo bằng imagegen tích hợp. Prompt và ảnh tham chiếu: `design-assets/mascot/prompts.json`. Giao diện lazy-load WebP, không precache toàn bộ mascot. Logo nguồn ở `public/favicon.svg`; chạy `pnpm icons:generate` để xuất PNG. `pnpm mascot:export` xuất WebP từ ảnh gốc.

## Review

Theo `AGENTS.md`: chụp và tự xem ảnh desktop, 390 px, modal, component liên quan. Sửa lỗi thấy trên ảnh rồi chụp lại. Xem bố cục hẹp tại `/design/mobile.html`.

Lượt chỉnh này chỉ format source và review ảnh; không chạy test/build/CI theo yêu cầu.

## Nguồn thư viện

- [Reicon](https://github.com/dqev/reicon), MIT; credits gồm Solar Icons của 480 Design (CC BY 4.0) và Zappicon.
- [Manrope](https://fontsource.org/fonts/manrope), SIL Open Font License 1.1; font tự host, chỉ nạp Latin và tiếng Việt.

Mascot trạng thái của người nhận được đặt làm hình chìm ở giữa bill qua prop `watermark` của `ExpenseReceipt`. Ảnh giữ nguyên màu, độ hiện 24%, nằm dưới chữ, không nhận thao tác và không được đọc như nội dung. Kích thước/độ mờ nằm trong token `receipt-watermark-*`; không lặp ảnh trên thanh trạng thái.
