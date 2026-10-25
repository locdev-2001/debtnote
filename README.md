# Debtnote

Ứng dụng chia tiền và theo dõi các khoản cần thu, cần trả. Bản đầu là PWA: dùng ngay bằng link, có thể thêm vào màn hình chính. Người nhận yêu cầu thanh toán không phải cài ứng dụng.

Repo đã có khung kỹ thuật, bộ thiết kế và prototype S01–S05: Trang chủ, chọn người, chia tiền và chốt. Các thao tác ở trang chủ chỉ cập nhật dữ liệu mẫu trên thiết bị. Chưa có tài khoản, bảng nghiệp vụ, API ghi tiền thật, OCR hoặc kết nối thanh toán/nhắc tiền.

## Stack

- React, Vite, Tailwind CSS và TanStack Query cho giao diện.
- Node.js, Fastify và tRPC cho API.
- PostgreSQL và Drizzle cho dữ liệu.
- Redis và BullMQ cho tác vụ nền.
- pnpm workspace, TypeScript strict, Biome và Vitest.

Phiên bản dependency dùng chung khai báo ở `pnpm-workspace.yaml`; lockfile được commit để cài đặt lặp lại được.

## Chạy local

Cần Node.js theo `.node-version`, pnpm theo `packageManager` và Docker Compose nếu chưa có PostgreSQL/Redis riêng.

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm infra:up
pnpm dev
```

- Giao diện: http://localhost:5173
- API: http://127.0.0.1:3001
- PostgreSQL: cổng 55432; Redis: cổng 56379.

Nếu dùng PostgreSQL/Redis có sẵn, sửa `DATABASE_URL` và `REDIS_URL` trong `.env`, bỏ qua `pnpm infra:up`. API và worker kiểm tra cấu hình lúc khởi động; không đưa thông tin kết nối vào frontend.

`pnpm infra:down` dừng container và giữ nguyên volume dữ liệu. Tài khoản trong Compose chỉ dành cho local.

## Cấu trúc và hướng phụ thuộc

```text
apps/
  web/          PWA, gọi contract tRPC
  api/          HTTP adapter, ghép các dependency lúc khởi động
  worker/       Tiến trình xử lý tác vụ nền
packages/
  money-core/   Hàm tính tiền thuần, không phụ thuộc framework hay nhà cung cấp
  rpc/          Router và contract tRPC, frontend chỉ import type AppRouter
  database/     Kết nối PostgreSQL, schema và migration Drizzle
  jobs/         Kết nối Redis, định nghĩa queue và payload
  runtime/      Đọc môi trường và đóng tài nguyên khi dừng tiến trình
```

`money-core` dùng chung cho frontend/backend; số tiền là số nguyên theo đơn vị nhỏ nhất của loại tiền (VND là đồng), giới hạn trong `Number.MAX_SAFE_INTEGER`. Phần dư phân bổ theo thứ tự mã người ổn định. Chỉ đưa các phân bổ thanh toán đã xác nhận vào phép tính số còn nợ.

Các màn hình và router nghiệp vụ sẽ gọi application service; service phụ thuộc contract của domain. PostgreSQL, OCR, storage và kênh nhắc tiền triển khai các contract ở adapter. Không đặt nhánh theo nhà cung cấp trong lõi tính tiền. Composition root trong `apps/api` và `apps/worker` chịu trách nhiệm ghép implementation.

Database hiện chưa có bảng nghiệp vụ. Sau khi thêm schema, chạy `pnpm db:generate`, kiểm tra migration rồi mới `pnpm db:migrate`. Migration hiện tại rỗng và không tạo bảng nghiệp vụ.

## Kiểm tra

```bash
pnpm check
curl http://127.0.0.1:3001/healthz
curl http://127.0.0.1:3001/readyz
pnpm worker:probe
```

`pnpm check` chạy lint, kiểm tra kiểu dữ liệu, kiểm thử và build cả ba ứng dụng. Kiểm thử tính tiền bao gồm bill 1.500.000đ có người đến muộn, không uống bia, món riêng, phần dư và trả một phần.

`/healthz` kiểm tra tiến trình API; `/readyz` thực sự kiểm tra PostgreSQL và Redis, trả HTTP 503 nếu dependency lỗi. `worker:probe` cần worker đang chạy: tạo tác vụ thật qua Redis rồi chờ worker hoàn tất, không chỉ kiểm tra kết nối.

## Build và kiểm tra PWA

```bash
pnpm build
pnpm start:api
pnpm start:worker
```

Hai lệnh `start` chạy ở hai terminal riêng. Để xem bản build PWA, chạy thêm:

```bash
pnpm --filter @debtnote/web preview
```

Mở http://localhost:4173. Vite preview chỉ dùng để kiểm tra local. Khi triển khai, phục vụ `apps/web/dist` qua HTTPS và reverse proxy `/trpc`, `/healthz`, `/readyz` đến API trong cùng origin. API và database nên cùng khu vực triển khai.

Service worker chỉ cache tài nguyên giao diện, không cache response API hoặc trạng thái thanh toán. Phiên bản mới yêu cầu người dùng bấm cập nhật, không tự tải lại màn hình đang thao tác. PWA cần HTTPS hoặc localhost; chế độ dev không đăng ký service worker.

## Bước tiếp theo

Theo dõi [roadmap đầy đủ](docs/ROADMAP.md) để xem mốc bàn giao, thứ tự screen, công việc và tiêu chí nghiệm thu từng giai đoạn.

Bộ thiết kế gồm Manrope, Reicon, mascot hoạt hình, token và component nghiệp vụ được mô tả tại [hướng hình ảnh](docs/DESIGN.md). Khi chạy local, mở http://localhost:5173/design/ để thử nền trắng, xanh–vàng, component compact và các trạng thái tương tác.

Prototype [S01 — Trang chủ](docs/screens/S01-HOME.md) và [S02–S05 — Chia tiền](docs/screens/S02-S05-SPLIT.md) đã có tại http://localhost:5173/. Chọn Thêm khoản → Thử bill mẫu để xem bill trắng đen, bỏ người theo khoản và chốt vào sổ mẫu. Bản nháp giữ sau khi tải lại.
