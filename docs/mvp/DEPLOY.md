# Chạy Debtnote trên aaPanel

Domain: https://debtnote.robertnguyen.io.vn/ — server `103.166.182.185` — source `/www/wwwroot/debtnote.robertnguyen.io.vn`.

Nginx phục vụ `apps/web/dist`; API và worker chạy trực tiếp bằng Node.js/PM2. PostgreSQL và Redis được cài trên server. Các script production không dùng Docker. CI tự động đã tắt theo yêu cầu.

## 1. Cài phần mềm trong aaPanel

- App Store: Nginx, Node.js Version Manager, PostgreSQL Manager và Redis.
- Node.js Version Manager: cài Node.js 22 từ 22.18 trở lên, chọn làm **Command line ver**. Repo dùng Node 22.23.4. Terminal và tiến trình PM2 phải dùng cùng bản Node.
- PostgreSQL Manager: cài PostgreSQL hiện hành tương thích, tạo database `debtnote`, user `debtnote`, mật khẩu riêng. Repo đã kiểm tra với PostgreSQL 18; schema dùng các tính năng tiêu chuẩn PostgreSQL.
- Redis: bật dịch vụ trên `127.0.0.1:6379`, cấu hình mật khẩu nếu dùng và bật persistence. Giữ `maxmemory-policy noeviction` cho hàng đợi BullMQ.

aaPanel có thể hiển thị plugin ở nhóm Deployment hoặc Plug-ins tùy bản. Tài liệu chính thức: [Node.js](https://www.aapanel.com/docs/Function/Node.html), [PostgreSQL Manager](https://www.aapanel.com/docs/Function/Plug-ins.html), [Redis](https://www.aapanel.com/docs/Function/Redis.html).

Mở Terminal aaPanel, kiểm tra và cài công cụ:

```bash
node -v
npm install -g pnpm@11.8.0 pm2@6
pnpm -v
pm2 -v
psql --version
pg_dump --version
```

Nếu `psql`/`pg_dump` chưa nằm trong PATH, thêm thư mục `bin` của PostgreSQL đã cài trong panel vào PATH. Dùng pg_dump cùng major với PostgreSQL server hoặc mới hơn.

Chạy các lệnh deploy và PM2 bằng cùng một tài khoản hệ thống. Tài khoản đó cần đọc source/`.env.production`, ghi `.local` và kết nối PostgreSQL/Redis. Không đổi user PM2 giữa các lần cập nhật.

## 2. Pull và điền kết nối

```bash
cd /www/wwwroot/debtnote.robertnguyen.io.vn
git pull --ff-only origin main
bash scripts/production-init.sh
```

Script tạo `.env.production` quyền 600 và sinh `APP_DATA_KEY`. Mở file bằng trình sửa file của aaPanel, sửa:

```dotenv
NODE_ENV=production
APP_ORIGIN=https://debtnote.robertnguyen.io.vn
APP_DATA_KEY=GIU_NGUYEN_KHOA_SCRIPT_DA_SINH
DATABASE_URL=postgresql://debtnote:MAT_KHAU_DB@127.0.0.1:5432/debtnote
REDIS_URL=redis://:MAT_KHAU_REDIS@127.0.0.1:6379/0
API_HOST=127.0.0.1
API_PORT=3001
API_TRUST_PROXY_HOPS=1
UPLOAD_DIR=.local/uploads
LOG_LEVEL=info
```

Redis không đặt mật khẩu: `REDIS_URL=redis://127.0.0.1:6379/0`. Nếu mật khẩu chứa ký tự đặc biệt như `@`, `#`, `/`, dùng dạng URL-encoded trong URL kết nối. Không thay `APP_DATA_KEY` đã sinh; khóa này cần để đọc QR nhận tiền đã lưu. Nếu trước đó có file cấu hình Docker, bổ sung DATABASE_URL/REDIS_URL trỏ server thật và giữ khóa cũ.

## 3. Deploy

```bash
bash scripts/production-deploy.sh
```

Script kiểm tra cấu hình/công cụ, cài dependencies, build web/API/worker, backup DB đã có, migrate, khởi động hoặc restart đúng hai app PM2, kiểm tra `/readyz`, gửi tác vụ probe thật qua worker và `pm2 save`.

Tên tiến trình: `debtnote-api`, `debtnote-worker`. Log tại `.local/logs`. Ảnh và model OCR tại `.local/uploads`. Script không tự cài/thay đổi PostgreSQL, Redis hoặc Nginx của panel.

```bash
pm2 status
curl --fail http://127.0.0.1:3001/readyz
```

Kết quả readiness phải có database/redis đều `ok`. Lần OCR đầu tải model Việt/Anh; các lần sau dùng cache.

## 4. Website và Nginx trong aaPanel

Dùng website hiện có của domain, giữ SSL/HTTPS. Đặt **Document Root** thành:

```text
/www/wwwroot/debtnote.robertnguyen.io.vn/apps/web/dist
```

Trong cấu hình Nginx của website, áp dụng các location từ [nginx-domain.conf](../../deploy/nginx-domain.conf). Thay `root`/`index`/`location /` cũ; không dán thêm directive trùng. Giữ các directive SSL/listen/certificate của panel. Cấu hình này phục vụ SPA và proxy `/trpc`, `/files`, `/readyz`, `/healthz` đến API port 3001. Nếu đổi API_PORT thì sửa cả proxy.

Tắt các location static cũ có thể chặn proxy `/files`; block API phải được ưu tiên trước regex tài nguyên tĩnh. Dùng log format không chứa URI/query ở vhost ngoài vì link `/p/` là quyền xem riêng. Kiểm tra cấu hình rồi reload Nginx trong aaPanel.

```bash
curl --fail https://debtnote.robertnguyen.io.vn/readyz
curl --fail https://debtnote.robertnguyen.io.vn/trpc/system.status
```

Mở domain: SĐT → PIN, ghi khoản, reload, tạo link, khách báo chuyển, chủ sổ xác nhận và đối chiếu số dư.

## 5. Tự chạy sau reboot

Cùng tài khoản đã deploy:

```bash
pm2 startup
```

Chạy đúng lệnh mà PM2 in ra để đăng ký startup với hệ điều hành, sau đó:

```bash
pm2 save
```

PostgreSQL/Redis/Nginx cần bật khởi động cùng server trong aaPanel. Sau khi nâng bản Node, cập nhật lại startup PM2 theo hướng dẫn PM2 vì đường dẫn Node có thể thay đổi.

## Quản lý trực tiếp bằng Node.js Project của aaPanel

Script deploy ở trên đã quản lý hai tiến trình qua PM2. Nếu muốn tự tạo project trong giao diện panel thay cho bước PM2 của script, dùng các file khởi động sau:

| Thuộc tính | API | Worker |
| --- | --- | --- |
| Startup File | `deploy/api.mjs` | `deploy/worker.mjs` |
| Run Directory | thư mục source | thư mục source |
| Node Version | 22.18+ | 22.18+ |
| Instances | 1 | 1 |
| Port | 3001 | Không bind cổng HTTP |

Hai launcher tự đọc `.env.production`; không cần chép secret vào cấu hình panel. Chọn cùng user có quyền đọc file/ghi `.local`. Không tạo thêm bản tiến trình trùng với hai app đã chạy bằng script. Domain phục vụ web tĩnh bằng Nginx, chỉ các đường API/ảnh được proxy.

## Cập nhật và log

```bash
cd /www/wwwroot/debtnote.robertnguyen.io.vn
git pull --ff-only origin main
bash scripts/production-deploy.sh
pm2 logs debtnote-api --lines 100
pm2 logs debtnote-worker --lines 100
```

Deploy native có restart tiến trình; không cam kết zero downtime. Không tự reload toàn bộ app PM2 khác trên server. Giữ `.env.production` và `.local` khi pull/cập nhật.

## Backup và khôi phục

```bash
bash scripts/production-backup.sh
bash scripts/production-verify-restore.sh /duong/dan/backup
```

Backup gồm PostgreSQL custom dump, ảnh/model OCR, env, Git revision và checksum; quyền chỉ tài khoản triển khai đọc được. Giữ một bản ở nơi lưu riêng và giữ đúng khóa mã hóa.

Restore thử cần role PostgreSQL có quyền CREATEDB: script tạo database tên ngẫu nhiên riêng, restore/đếm bản ghi rồi xóa DB tạm, không ghi vào DB đang chạy. Nếu role app không có quyền này, nhờ quản trị PostgreSQL thực hiện kiểm tra restore.

Khi cần phục hồi thật, dừng đúng API/worker, phục hồi DB và ảnh của cùng bộ backup, giữ khóa mã hóa rồi khởi động lại. Rollback source cần chọn Git revision tương thích schema và build/deploy lại; script không tự đảo migration.
