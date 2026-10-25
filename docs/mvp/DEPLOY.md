# Đưa MVP lên debtnote.robertnguyen.io.vn

Thư mục server: `/www/wwwroot/debtnote.robertnguyen.io.vn`, IP `103.166.182.185`. Người quản trị tự Git pull. Cấu hình này dùng Docker Engine và Docker Compose v2; Nginx/SSL hiện có của aaPanel vẫn nhận domain bên ngoài.

## Lần đầu

```bash
cd /www/wwwroot/debtnote.robertnguyen.io.vn
git pull --ff-only origin main
bash scripts/production-init.sh
bash scripts/production-deploy.sh
```

`production-init` sinh mật khẩu DB và khóa mã hóa riêng vào `.env.production` quyền 600. Chạy lại không đổi khóa. Không commit file này. DB, Redis và ảnh nằm trong volume; chỉ web được bind tại `127.0.0.1:18080`. Không dùng credential local ở production.

Trong vhost HTTPS của domain, thay `location /` cũ bằng nội dung [nginx-domain.conf](../../deploy/nginx-domain.conf). Giữ SSL hiện có và redirect HTTP sang HTTPS. Tắt các location regex phục vụ tài nguyên tĩnh cũ để `/assets/` cũng đi qua proxy. Không phục vụ thẳng source hoặc `.env`; tất cả request đi qua proxy. Đổi log format ở vhost ngoài để chỉ chứa IP, method, status và thời gian, không chứa `$request`, `$request_uri` hoặc query: link `/p/` là quyền xem riêng. Proxy trong container đã dùng log không chứa URL.

Sau khi kiểm tra cấu hình Nginx bằng chức năng của panel, reload Nginx. Kiểm tra:

```bash
curl --fail https://debtnote.robertnguyen.io.vn/readyz
curl --fail https://debtnote.robertnguyen.io.vn/trpc/system.status
```

Mở app trên hai trình duyệt: SĐT → PIN, ghi khoản, tải lại, tạo link; khách báo đã chuyển; chủ sổ xác nhận rồi đối chiếu số còn nợ. SĐT mới tự mở sổ với PIN lần đầu. SĐT là định danh tự khai, chưa được xác minh bằng OTP. Không tự liên kết người trong sổ với tài khoản theo SĐT.

## Cập nhật

```bash
cd /www/wwwroot/debtnote.robertnguyen.io.vn
git pull --ff-only origin main
bash scripts/production-deploy.sh
```

Script build image gắn Git revision, giữ DB/Redis, backup trước migration nếu đã có bảng, migrate rồi thay API/worker/web. Bản app mới được đề nghị cập nhật qua PWA; không tự tải lại form đang thao tác. Trình quản lý container tự khởi động lại dịch vụ sau reboot nếu Docker được bật cùng hệ thống.

## Backup và khôi phục thử

```bash
bash scripts/production-backup.sh
bash scripts/production-verify-restore.sh /duong/dan/backup
```

Backup gồm PostgreSQL dạng custom, ảnh, Git revision, `.env.production` và checksum. Chuyển bản backup sang nơi lưu riêng có giới hạn quyền; bản trên cùng server không chống mất server. Khóa `APP_DATA_KEY` cần được giữ cùng backup để đọc QR nhận tiền đã mã hóa.

Lệnh kiểm tra restore tạo DB tạm riêng, khôi phục vào đó, đếm bản ghi rồi xóa DB tạm; không sửa DB đang dùng. Kiểm tra kho ảnh bằng `tar`. Khi cần phục hồi thực sự, dừng API/worker, phục hồi DB và kho ảnh cùng một bộ backup, giữ đúng khóa mã hóa rồi khởi động lại. Chỉ thực hiện việc ghi đè DB sau khi đã xác định đúng bộ backup và có bản sao hiện trạng.

## Rollback app

Giữ image bản trước. Sau một lần cập nhật thành công, revision trước nằm tại `.local/previous-release`.

```bash
RELEASE_TAG="$(cat .local/previous-release)" docker compose --env-file .env.production -f compose.production.yaml up -d --no-build api worker web
```

Rollback này đổi ứng dụng; không tự đảo migration. Kiểm tra tương thích schema trước khi rollback. Bản MVP đầu chỉ tạo bảng và thêm constraint; các migration sau cần được đánh giá riêng. Không chạy `docker compose down -v` khi cập nhật vì `-v` xóa volume dữ liệu.

## Vận hành và giới hạn MVP

- `/healthz`: tiến trình API. `/readyz`: PostgreSQL và Redis. `docker compose ... logs --tail=100 api worker` để xem lỗi; không log PIN, session, QR hoặc nguyên link khách.
- Worker OCR dùng Tesseract tiếng Việt/Anh, concurrency 1; tải model ở lần đọc đầu và cache trong volume ảnh. Có giới hạn ảnh, timeout và retry. OCR là gợi ý cần người dùng kiểm tra, chưa được đánh giá trên bộ bill thực tế đa dạng.
- Worker nhắc trong ứng dụng mỗi ngày vào giờ đã cấu hình, không tự gửi SMS/Zalo/email. Nút chia sẻ mở chức năng của thiết bị; app không ghi nhận là đã gửi/đọc.
- QR dạng cây dùng mã gốc đã nhập. Mã app chưa nhận diện được giữ nguyên. Adapter hỗ trợ NAPAS mới điền số tiền/nội dung và CRC; không coi quét QR hay báo chuyển là tiền đã về.
- Đã kiểm tra local và cấu hình shell; máy phát triển hiện không có Docker nên chưa chạy image/Compose. Production chỉ được coi là đã triển khai sau khi lệnh trên được chạy ở server và đối chiếu HTTPS cùng luồng browser thực tế.
