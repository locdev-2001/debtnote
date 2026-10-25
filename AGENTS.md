# Quy ước làm việc trong Debtnote

## UI và design system

- Sau mỗi thay đổi UI, luôn chụp screenshot và tự xem ảnh để phát hiện lỗi trước khi bàn giao. Chụp ảnh không đồng nghĩa đã review.
- Xem lại cả Trang chủ, bảng thao tác và các component bị ảnh hưởng; kiểm tra bố cục hẹp khoảng 390 px và bố cục desktop.
- Rà chữ/nút bị cắt, overflow, xuống dòng sai, khoảng cách, icon, input, trạng thái focus và các khối che nội dung. Sửa lỗi thấy trên ảnh rồi chụp lại.
- Kích thước, typography, spacing, màu và recipe của component lấy từ `apps/web/src/design/tokens.css`. Không đặt size riêng theo cảm tính ở từng screen.
- Mặc định nền trắng, Manrope, Reicon, card/badge solid theo bảng màu xanh–vàng hiện tại. Giá trị tiền luôn dùng formatter chung.
- Riêng hóa đơn và luồng chia tiền dùng giấy trắng/mực đen như bill quán ăn, không hoa văn. Mascot trạng thái có thể làm hình chìm giữ nguyên màu, rõ vừa đủ, nằm dưới nội dung bill; không lặp lại ảnh trên thanh trạng thái. Input/select/textarea trên mobile tối thiểu 16 px qua token chung; không khóa zoom bằng viewport meta.
- Ưu tiên ít chữ: màn chính chỉ giữ tên, số tiền, trạng thái cần biết và hành động. Ghi chú/giải thích để trong chi tiết; không thêm đoạn hướng dẫn hoặc khẩu hiệu lặp lại.
- Khi người dùng yêu cầu bỏ test cho lượt chỉnh UI, không chạy test/build/CI thay cho review ảnh; ghi đúng những kiểm tra thực sự đã làm.

- Ngày hẹn dùng `DatePickerField`/`PromiseDateField` chung, tiếng Việt và `dd/MM/yyyy`; không dùng input date mặc định của trình duyệt. Dữ liệu ngày vẫn giữ dạng `YYYY-MM-DD`.
