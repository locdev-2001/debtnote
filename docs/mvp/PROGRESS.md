# MVP Debtnote — tiến độ và bằng chứng

Cập nhật 25/10/2026. Bản local dùng PostgreSQL thật. Production chưa được triển khai/đối chiếu từ phiên làm việc này.

## Phạm vi đã chạy

- [x] Contracts, schema/migration và application service; money-core thuần dùng chung. Transaction PostgreSQL khóa theo chủ sổ, idempotency và kiểm tra giới hạn tiền an toàn.
- [x] Một luồng SĐT → PIN 6 số. Số mới tự mở sổ, không có mục tạo tài khoản, không OTP. Thiết bị nhớ SĐT. Session HttpOnly, lockout, đổi PIN và mã khôi phục dùng một lần. SĐT tự khai không được coi là đã xác minh.
- [x] Khoản trực tiếp, bill đều/theo món, phí/giảm giá, bản nháp và người đã lưu. Tách phần tự chi khỏi cần thu; chỉ ghi nghĩa vụ thuộc chủ sổ.
- [x] Chủ sổ/khách: link riêng có thời hạn/thu hồi, báo chuyển chờ xác nhận, hẹn một phần, báo sai, lịch sử; nhận/trả nhiều lần và nhiều khoản, giữ tiền thừa riêng.
- [x] UI thật: Trang chủ, chi tiết bill/người, theo dõi, thống kê, lịch thu 7 ngày và thiết lập. Prototype chỉ còn riêng trong development.
- [x] Upload riêng tư và OCR bất đồng bộ; giới hạn ảnh/timeout/retry, sửa trước khi chốt. Worker đưa lại ảnh queued/processing vào queue sau khởi động. Nhập QR bằng giải mã ảnh tại thiết bị hoặc chuỗi; đổi QR cần PIN.
- [x] Worker nhắc trong ứng dụng, giờ/tắt nhắc, đổi hẹn, chống trùng trong ngày và dừng khi trả đủ. Chia sẻ do người dùng bấm; không ghi mở chia sẻ thành đã gửi/đọc.
- [x] Logo mascot mới, wordmark component chung, favicon và icon PWA.
- [x] Kiểm thử tiền/quyền/đồng thời, browser thật và reload trên máy phát triển; build đầy đủ.
- [x] Gói Docker/Compose, cấu hình proxy domain, deploy/migration, backup, restore thử và rollback app đã chuẩn bị; shell/YAML đã kiểm tra.
- [ ] Chạy image/Compose trên server và xác nhận HTTPS/API/browser production. Máy phát triển không có Docker; người quản trị tự pull/chạy ở `/www/wwwroot/debtnote.robertnguyen.io.vn`.
- [ ] Nghiệm thu Android/iPhone vật lý và dùng thử nhóm. Các kích thước mobile/desktop bên dưới là kiểm tra viewport trên browser, không thay thế thiết bị thật.

CI tự động đã tắt theo yêu cầu; chỉ giữ workflow chạy tay khi cần. Kết quả nghiệm thu dưới đây là kiểm tra local.

## Bằng chứng local

- `pnpm check`: 63 kiểm thử unit, lint, typecheck toàn workspace, token, unit test và build web/API/worker. Bộ kiểm thử bảo vệ phép chia, phần dư, phí/giảm giá, input tiền, pending/confirmed, tách tiền thừa, phạm vi link và trùng request.
- `pnpm test:integration`: schema PostgreSQL tạm riêng, HTTP thật qua Fastify/tRPC. Kiểm tra SĐT/PIN, session, Origin, lockout/recovery; hai chủ sổ và khách không session; xác nhận đồng thời, thu hồi link, mã hóa QR và quyền đọc ảnh.
- Browser: SĐT → PIN riêng, không nút tạo tài khoản; ghi 360.000 ₫, reload vẫn còn; khách báo 200.000 ₫ chưa trừ nợ; chủ xác nhận thì khách reload còn 160.000 ₫.
- Browser: bill đồ ăn 300.000 ₫ + bia 120.000 ₫, loại Bình khỏi bia → Bình 150.000 ₫, chủ sổ 270.000 ₫. Bản nháp khôi phục được; chốt vào PostgreSQL, tổng cần thu thành 310.000 ₫ cùng khoản trước.
- OCR worker thật: ảnh kiểm tra đọc hai dòng 300.000 ₫/120.000 ₫, tổng 420.000 ₫; browser nhận các dòng trong bản nháp, không tự phát sinh khoản nợ.
- Bản build API/worker: chạy riêng trên cổng 3002 và Redis DB 1; HTTP đăng nhập/snapshot, tác vụ probe và khôi phục ảnh queued sau startup đều qua. 80 request snapshot tuần tự trên máy local đạt p50 5,82 ms/p95 9,34 ms; phép chia 50 người/100 dòng, 100 lượt đạt p95 1,29 ms. Đây là số đo local với sổ nhỏ, không phải cam kết production hay mạng di động.
- Backup native PostgreSQL: `pg_dump -Fc` → `pg_restore` vào DB tạm; số khoản, thanh toán và ảnh khớp, DB tạm đã đóng/xóa. File ảnh được kiểm tra riêng qua HTTP có session và không session.
- Ảnh QA nằm tại `.local/mvp-*.png`, `.local/auth-*.png`; đã tự xem ảnh. `.local` bị loại khỏi Git. Ghi nhận riêng local, push/CI và production; không suy từ build sang đã deploy.

## Giới hạn của bản này

- Tiền do chủ sổ xác nhận, chưa tự đối soát ngân hàng. QR app không thuộc định dạng hỗ trợ được giữ nguyên; chưa xác nhận hành vi mở app trên thiết bị ngân hàng thật.
- Nhắc trong app; chưa tự gửi SMS/Zalo/email/push bên ngoài. Không cần dịch vụ OTP.
- Chưa benchmark OCR trên bộ bill tiếng Việt đa dạng; người dùng phải kiểm tra kết quả. File bỏ dở vẫn giữ riêng tư, chưa có lịch tự xóa.
- Thống kê tổng/lịch 7 ngày và chi tiết người đã có. Bộ lọc báo cáo theo kỳ, 30 ngày, nhóm quen và điều chỉnh bằng bút toán sau thanh toán để bản tiếp theo.
- Hủy được khoản chưa có thanh toán, có lịch sử. Không ghi đè khoản đã có thanh toán.

## Bàn giao server

Dùng [DEPLOY.md](DEPLOY.md). Domain hiện cần API cùng origin và worker/DB/Redis, không chỉ upload thư mục web tĩnh. Lượt kiểm tra domain trong phiên này: `/readyz` trả 404, chưa phải API MVP.
