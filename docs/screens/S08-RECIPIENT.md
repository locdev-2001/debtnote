# S08 — Người nhận qua link

## Phạm vi prototype

Mở trực tiếp `/p/mau-binh`, không cần đăng nhập. Đây là link mẫu trên thiết bị đang dùng, chưa phải link chia sẻ thật giữa hai người hay hai thiết bị.

- Bill trắng đen chỉ hiện phần của người nhận, người nhận tiền, hạn trả và số đã được xác nhận.
- Xem bill gốc là phần mở rộng; không hiện tên/phần tiền của những người khác.
- Bình có phần 360.000 ₫, đã được xác nhận nhận 200.000 ₫, còn 160.000 ₫.
- Dũng không chịu tiền bia; phần chính chỉ có đồ ăn 210.000 ₫. Trong bill gốc, bia được ghi không tính vào phần Dũng.

## Thao tác

| Việc                       | Thao tác chính                       | Số lần chạm từ bill          |
| -------------------------- | ------------------------------------ | ---------------------------- |
| Báo đã chuyển đủ           | Đã chuyển → Báo đã chuyển            | 2                            |
| Báo chuyển một phần có sẵn | Đã chuyển → mức tiền → Báo đã chuyển | 3                            |
| Hẹn ngày mai               | Hẹn trả → Hẹn ngày này               | 2                            |
| Hẹn ngày khác có sẵn       | Hẹn trả → chọn ngày → Hẹn ngày này   | 3                            |
| Báo sai                    | Báo sai → lý do → Lưu báo sai        | 3                            |
| Báo không dùng một khoản   | Chọn lý do → chọn dòng bill → lưu    | Thêm 1 lần chọn dòng khi cần |

Ghi chú không bắt buộc, mặc định thu gọn. Chỉ cần gõ nếu số tiền/ngày/lý do không nằm trong lựa chọn sẵn.

## Trạng thái và quy tắc

- Báo đã chuyển tạo số đang chờ xác nhận. Không cộng vào tiền đã nhận, không trừ số còn cần trả.
- Có thể sửa hoặc rút báo chuyển. Báo lại thay giá trị trước, không cộng dồn.
- Chặn số tiền không hợp lệ, bằng 0 hoặc vượt số còn cần trả.
- Lời hẹn độc lập với hạn gốc. Không đổi tiền hoặc tự xác nhận người nhận tiền đã đồng ý.
- Báo sai giữ lý do, dòng bill bị báo và ghi chú. Không tự sửa phần chia hoặc đóng nợ.
- Khi đã được xác nhận đủ, ẩn các hành động báo chuyển/hẹn/báo sai.
- Link hết hạn hoặc không hợp lệ không hiện bill hay các hành động thanh toán.
- Có trạng thái tải/lỗi và nút thử lại cho nguồn đọc khoản tiền.

`Mã QR` hiện trạng thái chưa thiết lập vì người tạo chưa có thông tin nhận tiền. Không tạo QR giả hoặc số tài khoản có thể bị hiểu là tài khoản thật.

## Kiến trúc

- `payment-request.ts`: contract đọc khoản tiền, tính còn nợ và quy tắc phản hồi; không biết localStorage hoặc mẫu cụ thể.
- `sample-requests.ts`: adapter dữ liệu mẫu cho `PaymentRequestReader`. App khởi tạo và truyền reader vào UI; UI không gọi fixture trực tiếp.
- `response-store.ts`: lưu/kiểm tra phản hồi mẫu theo mã link riêng.
- `recipient-page.tsx` và `response-forms.tsx`: trình bày, trạng thái tải/lỗi, sheet và bấm chọn.
- Dùng chung `ExpenseReceipt`, `ReceiptAmountRow`, `AmountField`, `AmountPresets`, `PromiseDateField`. Quy tắc ngày nằm ở `lib/calendar.ts`.

Thay nguồn đọc khoản tiền qua reader khi triển khai API. Việc lưu phản hồi thật, phân quyền link, đồng bộ sang người tạo và thông báo vẫn thuộc giai đoạn backend.

## Bằng chứng local

Đã thao tác và xem ảnh ở 390 px cùng desktop:

- Báo 100.000 ₫ cho Bình rồi tải lại: vẫn chờ An xác nhận, số cần trả vẫn 160.000 ₫.
- Rút báo chuyển rồi tải lại: về trạng thái chưa báo, số cần trả không đổi.
- Nhập 200.000 ₫ khi còn 160.000 ₫: hiện lỗi và vô hiệu nút xác nhận.
- Hẹn Dũng ngày mai: lưu sau tải lại, không đổi khoản cần trả.
- Báo không dùng dòng Đồ ăn và tải lại: giữ đúng lý do/dòng, không trừ nợ.
- Đã trả đủ: cần trả 0 ₫ và không còn nút báo chuyển.
- Link hết hạn/link sai: không hiện bill.
- Đã xem lại hai form nhận tiền/hẹn trả ở Trang chủ sau khi tách component dùng chung.
- Đã đọc computed style input tiền và ngày ở 390 px: 16 px. Chưa kiểm tra Safari trên iPhone thật.

Không chạy test/build/CI theo yêu cầu cho lượt prototype này. Chưa có QR thật, xác nhận tiền từ ngân hàng, link có phân quyền, gửi thông báo hoặc đồng bộ giữa thiết bị. Trạng thái mẫu của S08 tách khỏi sổ mẫu S01, không âm thầm sửa nợ của người tạo.
