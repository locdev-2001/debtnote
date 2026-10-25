# WebGL QR Tree — tích hợp và bằng chứng

Khảo sát ngày 25/10/2026 theo skill `reverse-engineer-anything` do người dùng chỉ định.

## Kết luận

[WebGL QR Tree](https://webgl-qr.pages.dev/docs) là ứng dụng Three.js hỗ trợ iframe. Phần nhúng có thể nhận nội dung QR gốc qua query `url`; không chỉ nhận đường dẫn ảnh QR. Debtnote giữ cây 3D làm giao diện duy nhất, người dùng chạm cây để chuyển sang hình QR phẳng rồi quét.

- `embed=true`: ẩn giao diện ngoài.
- `url`: nội dung cần mã hóa, truyền bằng `URLSearchParams` để giữ đúng chuỗi.
- `season=summer`: cây xanh.
- `flat=false`: bắt đầu ở cây 3D.
- `controls=false`: ẩn lựa chọn mùa.

Không có SDK npm được xác nhận trong trang tài liệu. Link GitHub mà trang cung cấp trả 404 khi khảo sát. Tích hợp dùng iframe được tài liệu hướng dẫn; không chép bộ render/shader vào repo.

## Luồng dữ liệu

`PaymentRequest.paymentQrPayload` → `QrRenderer` → adapter WebGL → iframe.

Nếu đã có payload chuyển khoản, dùng nguyên chuỗi đó. Nếu người tạo cấu hình bằng ảnh QR, lớp nhập cấu hình cần đọc chuỗi từ ảnh trước. Nếu QR gốc chưa chứa số tiền/nội dung, chỉ tạo payload mới theo bill khi định dạng của ngân hàng/app cho phép; bộ render cây không tự thêm tài khoản hoặc sửa số tiền. Không mặc định mọi mã là VietQR: giữ nguyên dữ liệu của ngân hàng/app đã cấu hình, kể cả link/deep link nếu mã thực sự chứa loại đó.

Các fixture hiện để `paymentQrPayload = null`: QR mở link bill mẫu. Nhãn rút gọn thành `QR bill mẫu`. Chưa có màn cấu hình tài khoản thật hoặc bộ sinh VietQR động. Bill đã trả đủ vẫn mở được QR để xem bill, nhưng không có hành động báo chuyển/hẹn trả.

Lõi và UI không chứa URL nhà cung cấp. Địa chỉ/tham số WebGL nằm tại `adapters/qr/webgl-qr-renderer.ts`; App truyền renderer vào màn người nhận. Iframe chỉ được tạo khi mở sheet, và bị gỡ khi đóng. Không thêm Three.js/qrcode vào bundle Debtnote.

## Quan sát trực tiếp

Đã đọc trang docs bằng trình duyệt, chọn chế độ 2D và tắt controls để đối chiếu HTML embed do trang sinh. Đã quan sát cây 3D trong iframe sandbox, bấm cây và thấy chuyển sang QR. Đã xem ảnh mobile 390 px và desktop.

Các quan sát này đến từ trình duyệt CUA; không gán chúng cho REA. Không chạy bộ test/build/CI của dự án theo yêu cầu.

## Bằng chứng REA và phạm vi

- Bundle tải trực tiếp: `/assets/index-DrTOpwyr.js`, 752.739 byte; CSS `/assets/index-BU6O_obo.css`.
- Phân tích toàn bundle không hoàn tất do heap của worker; parent Evidence: `ev_08e770467b07e09db1e908f2f9c261f77925d7301453981c561f0beafa20d37a`. Không dùng kết quả này để khẳng định đã phân tích hết.
- Thu hẹp tới đúng byte 687.202–752.739 (kết thúc loại trừ), phần ứng dụng sau React/Three.js/encoder. Parent Evidence: `ev_0029374aa263c77cb0429d9eac3f59a7c4ad48d8dd17267d838e18061e689957`; summary view: `ev_b7fa3b6dc3ade6edade8de6cdbb30f7f3d64462d4ac8b664026a16cbce5c718a`.
- REA đọc 65.537 byte, parse một file, 10.781 AST node, tám findings. Graph vẫn partial; giữ giới hạn 3.000 semantic node và 1.000 unknown. Không thực thi bundle bằng REA; các binding từ thư viện bên ngoài slice chưa được phân tích.
- Provenance slice, mã tải về, ảnh và kết quả giải mã giữ trong `.local/research/webgl-qr/` (không commit).

Đọc tĩnh đoạn ứng dụng cho thấy query `url` đi vào hàm tạo ma trận QR, với correction level M. Việc nhập URL trên giao diện có kiểm tra HTTP/HTTPS, nhưng đường query khởi tạo truyền thẳng nội dung cho encoder. Đây là lý do cần kiểm chứng riêng payload không phải URL.

## Kiểm tra payload VietQR

Dùng chuỗi demo công khai từ [Pay2S Developer](https://developer.pay2s.vn/docs/vietqr/generate/markdown/): tài khoản UAT `P2S99999999`, 2.000 VND, nội dung `THANHTOANDEMO`. Không dùng tài khoản của người dùng hoặc thực hiện chuyển tiền. CRC của mẫu khớp `D27B`.

Truyền nguyên chuỗi 129 ký tự vào `url`, mở QR phẳng của cùng bộ render, chụp ảnh rồi giải mã bằng jsQR 1.4.0. Sau nhị phân hóa ảnh ở ngưỡng 180/200/220, kết quả trùng toàn bộ payload đầu vào, gồm cả CRC.

Ảnh màu nguyên bản trong lượt thử không giải mã được trực tiếp bởi jsQR. Kết quả chỉ chứng minh payload được giữ nguyên trong bộ render; không chứng minh mọi camera/app ngân hàng quét ổn định, và không xác nhận tiền đã chuyển. Chưa thử app ngân hàng thật. Không quảng bá góc nhìn cây 3D là QR quét trực tiếp; thao tác đã quan sát là chạm cây để trải thành QR phẳng.

## Trước khi dùng cho chuyển khoản thật

Nguồn tạo payload VietQR, cấu hình tài khoản và đối soát là các adapter nghiệp vụ riêng. Cần kiểm tra bằng app ngân hàng mục tiêu, đúng ngân hàng/tài khoản/số tiền/nội dung và đối chiếu payload gốc sau giải mã. Tài khoản thật không thuộc fixture hiện tại; cần chọn cách triển khai renderer trong hạ tầng ứng dụng trước khi đưa dữ liệu đó vào bản production. Quét QR/báo đã chuyển không tự xác nhận đã thu tiền.

## Mẫu do người dùng gửi

Đã giải mã ngay trên máy bằng ZXing 0.21.3; ảnh dùng chấm tròn nên jsQR không đọc được trực tiếp. Nội dung dài 93 ký tự, checksum khớp. Dữ liệu có thông tin ngân hàng/tài khoản, không có URL/deep link, không có số tiền hoặc dữ liệu bổ sung. Không suy ra khả năng tự mở app từ tên/logo trên ảnh.

Không đưa ảnh, số tài khoản hoặc chuỗi QR thật vào repo/fixture, không gửi chúng sang website nhúng. Bản app hiện vẫn dùng QR bill mẫu. Việc tự mở app phụ thuộc loại dữ liệu mã gốc và trình quét; cần kiểm tra với đúng ngân hàng/app của mẫu, không coi giải mã QR thành công là đã kiểm tra ứng dụng ngân hàng.
