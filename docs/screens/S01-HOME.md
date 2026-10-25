# S01 — Trang chủ

Prototype để duyệt ngày 25/10/2026. Mở http://localhost:5173/.

## Mục tiêu và bố cục

Mở ứng dụng là thấy số cần thu/cần trả và việc cần xử lý. Bấm khoản để thao tác trong bảng trượt; đóng bảng vẫn giữ bộ lọc và tìm kiếm.

- Header: Debtnote, nhãn dữ liệu mẫu và nút các khoản cần chú ý.
- Hai card solid: cần thu/cần trả; bấm để đổi chiều danh sách, không bù trừ hai số.
- Banner: đến hạn hôm nay/quá hạn, mở thẳng danh sách cần xem.
- Danh sách: lọc tất cả/hôm nay/quá hạn/chờ xác nhận; tìm tên/nội dung không bắt buộc dấu.
- Chi tiết: nhận một phần/đủ, hẹn lại, soạn lời nhắc; khoản cần trả có đánh dấu đã chuyển.
- Thêm khoản: Chụp bill hoặc Ghi khoản tiền. Ghi nhanh dùng người có sẵn, chiều tiền và số tiền; không bắt nhập ghi chú.
- Màn nhỏ: Thêm khoản cố định phía dưới, có đệm để không che nội dung cuối. Màn rộng thêm cột lời hẹn và minh họa.

## Quy tắc dữ liệu mẫu

- Ban đầu cần thu 940.000 ₫, cần trả 200.000 ₫, 1 khoản đến hạn hôm nay và 1 khoản quá hạn.
- Số còn nợ dùng `calculateOutstandingAmount` của `money-core`. Tổng quan, danh sách, chi tiết và thao tác cùng dùng một read model.
- Nhận 100.000 ₫ từ Dũng: còn 110.000 ₫; tổng cần thu 840.000 ₫; reload vẫn đúng.
- Báo đã chuyển cho Linh: vẫn cần trả 200.000 ₫, chờ người nhận xác nhận.
- Ngày hẹn mới là ngày cần xử lý tiếp theo trong prototype. Hẹn Dũng sang ngày mai đưa khoản khỏi bộ lọc quá hạn. Hạn gốc/lời hẹn/lịch sử của hệ thống thật sẽ triển khai ở giai đoạn nghiệp vụ.
- Nhận tiền mẫu giới hạn đến số còn nợ. Luồng nhận thừa để ở màn thanh toán chi tiết theo roadmap.
- Lời nhắc có thể sửa và sao chép, không tự gửi hoặc đánh dấu đã gửi khi sao chép.
- Ảnh chỉ xem trước trong phiên trên thiết bị, chưa upload/OCR/tạo nợ; tải lại cần chọn ảnh lại.

## Ranh giới kỹ thuật

`ledger.ts` là hàm nghiệp vụ thuần; `demo-store.ts` là adapter dữ liệu mẫu/localStorage; hook nối thao tác với store; Trang chủ và các form nhận kết quả/phát lệnh. Store prototype là cổng riêng cho bản xem thử, không thay thế thiết kế API sổ thật.

Key lưu mẫu: `debtnote:home-prototype:v1`. Đọc lại phải kiểm tra hình dạng, số nguyên an toàn, tổng tiền, mã trùng và ngày hợp lệ; hỏng thì trở về mẫu. Chưa có dữ liệu người thật hoặc backend nghiệp vụ.

## Công cụ duyệt ở cuối trang

- Thử sổ trống: xóa riêng mẫu để xem trạng thái bắt đầu và tạo khoản đầu tiên.
- Khôi phục mẫu: quay lại bộ ban đầu.
- Dropdown: loading/error và thử lại; loading không giả số dư bằng 0.

## Bằng chứng kiểm tra

- Unit test: tổng hai chiều; lọc/sắp xếp/tìm không dấu; nhận một phần/đủ; chờ xác nhận; hẹn lại; từ chối số tiền/ngày sai và tổng vượt giới hạn; lưu/đọc lại, storage hỏng; ngày Việt Nam ở ranh giới UTC.
- Browser ở bố cục hẹp: lọc quá hạn → mở Dũng → nhận 100.000 ₫ → thấy 840.000 ₫ và giữ bộ lọc; reload vẫn đúng.
- Browser: hẹn lại → quá hạn từ 1 về 0; khoản cần chú ý từ 2 về 1.
- Browser: báo chuyển cho Linh → vẫn cần trả 200.000 ₫ và chờ xác nhận.
- Browser: sổ trống → Thêm khoản → Ghi khoản tiền → chọn 100.000 ₫ → tạo khoản đầu tiên.
- Browser: lỗi có thử lại, loading có skeleton và không giả số dư bằng 0.

S01 đang ở bước duyệt giao diện; không coi đăng nhập, OCR, thanh toán hoặc nhắc tự động đã hoàn thành.
