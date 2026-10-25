# S02–S05 — Prototype chia tiền

## Luồng

Trang chủ → Thêm khoản → Chia nhóm → Người → Chia → Chốt.

- Người: chọn/bỏ người quen, thêm người mới, chọn ai đã trả. Mặc định bạn là người trả.
- Chia: nhập tổng hoặc các khoản; chia đều tổng tiền hoặc tùy chỉnh người chịu từng dòng. Mặc định tất cả cùng chịu; bấm bỏ ngoại lệ.
- Bấm biểu tượng khoản để chọn nhiều dòng; chọn một người ở nhóm thao tác để áp dụng đồng thời. Menu ba chấm có Tất cả và Chỉ 1 người.
- Chốt: xem các khoản, tổng, phần mỗi người và số bạn cần thu/cần trả. Chốt một lần thêm cả nhóm khoản vào sổ mẫu.
- Đóng hoặc tải lại vẫn giữ bản nháp và bước đang thực hiện. Bỏ bản nháp nằm ở bước Người.
- Thử bill mẫu là fixture riêng: đồ ăn 1.050.000 ₫ và bia 450.000 ₫ cho năm người. Không giả lập đọc OCR từ ảnh người dùng chọn.

## Hướng hình ảnh được chốt

Theo ảnh hóa đơn quán ăn do người dùng cung cấp: giấy phẳng chữ đen trên trắng, tiêu đề giữa, cột tiền thẳng phải, đường phân cách mảnh, tổng tiền in đậm. Không dùng viền hoa văn hay màu xanh bên trong bill. Mascot trạng thái có thể làm hình chìm đơn sắc, mờ qua component dùng chung. Manrope được giữ theo bộ thiết kế chung.

`ExpenseReceipt` và `ReceiptAmountRow` là component trình bày dùng chung. Token giấy/mực/khoảng cách ở `tokens.css`. Lựa chọn người và nút của luồng chia dùng đen; phần tổng quan giữ bảng màu của app.

Input/select/textarea dưới 620 px hoặc trên thiết bị con trỏ thô dùng token tối thiểu 16 px. Không khóa khả năng phóng to của người dùng bằng viewport meta.

## Quy tắc tiền

- Chia đều tính trên tổng; tùy chỉnh chia từng dòng và cộng phần của mỗi người.
- Phần dư được phân bổ ổn định theo mã người bằng `money-core`.
- Chặn tổng vượt số nguyên an toàn, khoản bằng 0 và dòng chưa có người chịu.
- Bạn trả: tạo các khoản cần thu từ người khác, không tạo nợ với chính mình.
- Người khác trả: chỉ ghi phần bạn cần trả cho người đó trong sổ của bạn.
- Các khoản trong một lần chốt được kiểm tra và thêm cùng lúc. Mã khoản theo mã bản nháp và người để chặn thêm trùng.

## Bằng chứng local

Đã thao tác trên trình duyệt, xem ảnh desktop và khổ 390 px:

- Chia đều bill mẫu: mỗi người 300.000 ₫; bạn cần thu 1.200.000 ₫.
- Bỏ Dũng/Em khỏi bia: Bạn/Bình/Chi 360.000 ₫; Dũng/Em 210.000 ₫; cần thu 1.140.000 ₫.
- Chọn nhiều dòng và Chỉ 1 người; bỏ hết người của dòng thì không được sang bước chốt.
- Chọn Chi trả hộ: phần bạn cần trả 300.000 ₫. Chốt và tải lại giữ tổng cần trả 500.000 ₫ gồm 200.000 ₫ ban đầu.
- Chốt bản tùy chỉnh và tải lại: tổng cần thu 2.080.000 ₫ gồm 940.000 ₫ ban đầu, không có nợ với chính mình.
- Đã đọc computed style của input tên, tiền và select ở 390 px: 16 px. Chưa kiểm tra Safari trên iPhone thật.

Theo yêu cầu, không chạy bộ test/build/CI trong lượt prototype này. Dữ liệu chỉ lưu localStorage trên một trình duyệt; chưa có database nghiệp vụ, link khách, đồng bộ, phí/giảm giá, OCR hoặc gửi nhắc.
