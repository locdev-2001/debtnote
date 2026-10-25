# Debtnote

PWA ghi tiền giữa mọi người: chia bill đều/theo món, theo dõi cần thu/cần trả và xác nhận thanh toán. Người nhận dùng link riêng, không phải cài app.

## MVP hiện có

- Một luồng SĐT → PIN 6 số. Số mới dùng PIN lần đầu; thiết bị nhớ SĐT. Có đổi PIN, mã khôi phục và giới hạn đăng nhập.
- Sổ PostgreSQL riêng; tạo khoản nhanh, chọn người trả, chia theo món, phí/giảm giá, lưu nháp và chốt bill trong transaction.
- Chụp bill/OCR bất đồng bộ; sửa trước khi chốt. Ảnh chỉ chủ sổ được đọc.
- Link khách có hạn/thu hồi: xem phần mình, QR cây 3D, báo chuyển một phần, hẹn một phần, báo sai. Chủ sổ xác nhận tiền về.
- Phân bổ một lần trả nhiều khoản, giữ tiền thừa riêng, lịch sử; chống request lặp và xác nhận đồng thời.
- Theo dõi hạn/hẹn/báo sai, thống kê, dự toán 7 ngày, nhắc trong app và cấu hình QR nhận tiền từ ảnh.
- Manrope, Reicon, token nghiệp vụ, logo mascot và bill giấy đã chốt.

SĐT chưa được xác minh OTP; không tự ghép danh bạ với tài khoản. MVP chưa tự đối soát ngân hàng hoặc gửi SMS/Zalo/email. Số liệu lịch thu là lịch dự kiến, không phải cam kết thu được.

## Local

Cần Node theo `.node-version`, pnpm theo `packageManager`, PostgreSQL và Redis.

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm infra:up
pnpm db:migrate
pnpm dev
```

Nếu đã có PostgreSQL/Redis, sửa URL trong `.env` và bỏ `infra:up`. Web: http://localhost:5173, API: http://127.0.0.1:3001. `.local/data-key` là khóa mã hóa local được tạo lần đầu; giữ khóa nếu còn QR đã lưu. Không dùng cấu hình local trên server.

Trang chính dùng API thật. Prototype chỉ còn ở `/demo` và `/p/mau-*` khi chạy development. Bộ thiết kế tại `/design/`.

## Kiến trúc

`web → rpc → application → contracts/money-core`. API và worker ghép các adapter PostgreSQL, storage, OCR và QR. `money-core` tính tiền nguyên an toàn, phân bổ phần dư ổn định, không biết nhà cung cấp. Application service dùng repository/clock/id qua contract; PostgreSQL khóa theo chủ sổ trong transaction.

`packages/database/migrations` chứa schema thật. Sinh migration bằng `pnpm db:generate`, đọc SQL rồi áp dụng bằng `pnpm db:migrate`.

## Kiểm tra và build

```bash
pnpm check
pnpm test:integration
pnpm worker:probe
```

`check` gồm lint, typecheck, kiểm tra token, unit test và build. Tích hợp dùng schema PostgreSQL tạm riêng, thử qua HTTP với chủ sổ/khách, session, Origin, PIN, quyền ảnh, idempotency và đồng thời. `worker:probe` cần worker/Redis đang chạy.

```bash
pnpm start:api
pnpm start:worker
pnpm --filter @debtnote/web preview
```

Chạy ba lệnh ở terminal riêng để xem bản build tại http://localhost:4173. API và ảnh dùng cùng origin qua proxy; service worker chỉ cache tài nguyên giao diện.

## Production và tiến độ

- [Triển khai aaPanel/PM2 và backup](docs/mvp/DEPLOY.md).
- [Tiến độ MVP và bằng chứng](docs/mvp/PROGRESS.md).
- [Roadmap toàn sản phẩm](docs/ROADMAP.md).
- [Design system](docs/DESIGN.md).
- [Tích hợp QR cây](docs/integrations/WEBGL-QR.md).
