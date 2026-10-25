# Roadmap Debtnote

Cập nhật: 25/10/2026. MVP đã chạy local với dữ liệu thật; xem [bằng chứng và giới hạn](mvp/PROGRESS.md). Production chưa nghiệm thu. Các mục chưa đánh dấu có thể là phần nâng cao hoặc kiểm tra trên thiết bị/dịch vụ thực tế.

## Đích đến và phạm vi

Debtnote giúp ghi nhận tiền giữa mọi người, chia tiền đúng phần, theo dõi khoản chưa trả và hỗ trợ thu hồi. Chia bill là một luồng đầu vào; cho vay, ứng hộ và mua hộ cũng tạo khoản phải thu/phải trả theo cùng mô hình.

- PWA dùng ngay bằng link; cài vào màn hình chính là tùy chọn.
- Người tạo có tài khoản để lưu và quản lý. Người nhận mở link riêng để xem khoản tiền, báo đã chuyển, hẹn trả hoặc báo sai mà không phải đăng ký.
- Luồng thông thường ưu tiên bấm chọn. Ghi chú và hạn trả không bắt buộc. Thêm người mới, nhập khoản tiền chưa có nguồn và sửa OCR sai là các trường hợp có thể cần gõ.
- Chia tiền chỉ có hai lựa chọn chính: chia đều hoặc tùy chỉnh người tham gia từng món.
- Mặc định mọi người cùng chịu khoản tiền; người tạo bấm bỏ các ngoại lệ, có thao tác chọn nhiều dòng và chỉ chọn một người.
- MVP dùng VND. QR hướng dẫn chuyển khoản; xác nhận tiền về ban đầu do người nhận tiền thực hiện.
- Dùng Manrope tự host, icon Reicon và mascot hoạt hình riêng. Card và badge dùng màu solid đậm, bố cục borderless phân biệt bằng màu nền; tiền nhập và hiển thị cùng được format. Token và component đặt theo nghiệp vụ, mô tả tại [hướng hình ảnh](DESIGN.md).

## Mốc bàn giao

| Mốc                                  | Phạm vi       | Bằng chứng hoàn thành                                                 |
| ------------------------------------ | ------------- | --------------------------------------------------------------------- |
| M0 — Khung kỹ thuật                  | Giai đoạn 0   | Build, kiểm thử, API/database/worker và CI hoạt động                  |
| M1 — Prototype để duyệt              | Giai đoạn 1   | Bấm được flow bằng dữ liệu mẫu; rõ đầu vào, đầu ra và số thao tác     |
| M2 — Alpha dùng được từ đầu đến cuối | Giai đoạn 2–5 | Tạo khoản tiền thật, chia, chia sẻ, trả một phần/đủ và lưu sau reload |
| M3 — MVP dùng thử thực tế            | Giai đoạn 6–8 | Theo dõi, nhắc, báo cáo, dự toán theo lịch và vận hành production     |
| M4 — Mở rộng                         | Giai đoạn 9   | Chọn tính năng dựa trên số liệu và phản hồi từ M3                     |

Không ấn định ngày giao trong tài liệu này. Ước lượng lịch sau khi có prototype được duyệt và biết nguồn lực thực hiện.

## 0. Khung kỹ thuật — hoàn thành

- [x] Monorepo pnpm, TypeScript strict và catalog dependency dùng chung.
- [x] PWA React/Vite/Tailwind; màn hình khởi động và client tRPC/TanStack Query.
- [x] Fastify/tRPC; endpoint liveness và readiness kiểm tra PostgreSQL/Redis.
- [x] PostgreSQL/Drizzle, Redis/BullMQ, worker độc lập và tác vụ kiểm tra đi hết hàng đợi.
- [x] `money-core`: chia đều, phân bổ phần dư ổn định và tính số còn nợ từ các thanh toán được xác nhận.
- [x] Môi trường local, Docker Compose, build production và hướng dẫn chạy.
- [x] CI: lint, typecheck, kiểm thử, build, migration và kiểm tra API/worker thực tế.

Đã có bảng nghiệp vụ, SĐT/PIN, lưu bill, OCR, link khách và nhắc trong ứng dụng. Prototype chỉ mở riêng trong development; Trang chủ dùng PostgreSQL.

## 1. Thiết kế screen và prototype

- [x] P1.0 Có nền tảng thiết kế bản đầu: Manrope, nền trắng, xanh–vàng, component compact, token nghiệp vụ, component dùng chung, Reicon, 8 ảnh mascot và trang xem thử riêng.
- [x] P1.1 Chốt cấu trúc điều hướng, hành động tạo mới và cách quay lại mà không mất bản nháp.
- [x] P1.2 Dựng prototype Trang chủ: cần thu, cần trả, đến hạn/quá hạn, danh sách cần xử lý và nút tạo khoản tiền. Bản đầu để duyệt, xem [S01](screens/S01-HOME.md).
- [x] P1.3 Prototype tạo/chia khoản thủ công và bill mẫu: chọn người; chia đều/tùy chỉnh; xem lại và chốt vào sổ mẫu. Ảnh bill hiện chỉ xem trước, chưa nối OCR. Xem [S02–S05](screens/S02-S05-SPLIT.md).
- [x] P1.4 Prototype người nhận S08: bill riêng, báo đã chuyển/một phần, hẹn trả, báo sai theo dòng, đã trả đủ và link hết hạn. QR dùng cây 3D, fixture mở bill mẫu; chưa có cấu hình nhận tiền/link/backend thật. Xem [S08](screens/S08-RECIPIENT.md).
- [x] P1.5 Thiết kế chi tiết người/khoản tiền, nhận một phần, nhận đủ và xử lý nhận thừa.
- [x] P1.6 Thiết kế theo dõi, báo cáo và thiết lập nhận tiền/nhắc hạn.
- [ ] P1.7 Duyệt prototype trên điện thoại: ghi số lần chạm, số lần gõ và thời gian cho từng nhiệm vụ.

Nghiệm thu: có flow bấm được với dữ liệu mẫu và các trạng thái rỗng, tải, lỗi, mất mạng, thành công. Không dùng nút không có phản hồi. Dữ liệu mẫu phải được nhận biết rõ.

### Thứ tự screen

| Thứ tự | Screen hoặc bảng thao tác | Hành động cần duyệt                                                           |
| ------ | ------------------------- | ----------------------------------------------------------------------------- |
| S01    | Trang chủ                 | Xem số dư, lọc cần thu/cần trả, mở người hoặc khoản, tạo mới                  |
| S02    | Nguồn khoản tiền          | Chụp/chọn bill, tạo khoản trực tiếp                                           |
| S03    | Chọn người                | Người gần đây, nhóm quen, thêm người, chọn/bỏ nhiều người                     |
| S04    | Chia tiền                 | Chia đều, bỏ người theo món, chọn nhiều dòng, chỉ một người                   |
| S05    | Xem lại và chốt           | Ai đã trả, phần của mình, từng người cần chuyển, phí/giảm giá                 |
| S06    | Chi tiết khoản/bill       | Nguồn tiền, phép chia, còn nợ, lịch sử, chia sẻ, đề nghị điều chỉnh           |
| S07    | Chi tiết một người        | Tổng cần thu/cần trả, các khoản cấu thành, lịch sử thanh toán                 |
| S08    | Trang người nhận qua link | Xem phần mình, QR, báo đã chuyển, hẹn trả, báo sai                            |
| S09    | Ghi nhận tiền             | Nhận đủ, nhận một phần, chọn các khoản được trả, xử lý thừa                   |
| S10    | Theo dõi                  | Đến hạn, quá hạn, lời hẹn, trạng thái cần xác nhận, thao tác nhắc             |
| S11    | Báo cáo và lịch thu       | Tiền đã ứng, chi tiêu cá nhân, đã thu, còn nợ, lịch dự kiến                   |
| S12    | Thiết lập                 | Thông tin nhận tiền, quy tắc nhắc, tùy chọn tài khoản                         |
| S13    | Đăng nhập và tiếp tục     | Đăng nhập cho người tạo, quay lại bản nháp, liên kết người nhận với tài khoản |

Đây là thứ tự duyệt nghiệp vụ, không phải bắt người dùng đi qua 13 màn hình. Các thao tác ngắn có thể dùng bảng trượt trong cùng màn hình. Sau khi có cấu trúc chung, triển khai và duyệt từng screen theo giai đoạn liên quan.

## 2. Danh tính, dữ liệu và quyền truy cập

Phụ thuộc: cấu trúc và flow đầu tiên ở giai đoạn 1.

- [x] P2.1 Chọn và triển khai cơ chế đăng nhập, session, đăng xuất và quay lại bản nháp sau đăng nhập.
- [x] P2.2 Tạo schema nền: tài khoản, sổ, người tham gia; sổ cá nhân được tạo tự động.
- [x] P2.3 Tách người được ghi trong sổ khỏi tài khoản đăng nhập; không tự ghép người vì trùng tên.
- [x] P2.4 Xác định quyền chủ sổ, người tham gia và khách mở link; kiểm tra quyền tại application service.
- [x] P2.5 Hoàn thiện contract, migration và application service theo từng luồng, dùng adapter cho hạ tầng.
- [x] P2.6 Có lịch sử thay đổi cho các thao tác ảnh hưởng tiền, người được chia và trạng thái xác nhận.

Nghiệm thu: hai tài khoản không xem/sửa chéo sổ; link khách không truy cập được thông tin ngoài phạm vi cho phép; reload và đăng nhập lại vẫn đúng danh tính/sổ.

## 3. Ghi khoản tiền và chia bill

Phụ thuộc: giai đoạn 2; áp dụng S01–S07 theo từng lát chức năng.

- [x] P3.1 Tạo schema khoản chi, dòng khoản chi, phần chia và khoản nợ theo ERD.
- [x] P3.2 Tạo khoản trực tiếp: chọn người, số tiền và chiều cần thu/cần trả; ghi chú/hạn trả tùy chọn.
- [x] P3.3 Tạo bill nháp; chọn người trả và người tham gia từ người đã lưu. Nhóm quen mở rộng để sau MVP.
- [x] P3.4 Chia đều hoặc chọn người chịu từng dòng; chọn nhiều dòng, bỏ ngoại lệ và chỉ một người.
- [x] P3.5 Chốt quy tắc phí, giảm giá và phần dư; hiển thị cách phân bổ trước khi chốt.
- [x] P3.6 Lưu bản nháp, mở lại sau reload; đánh dấu rõ nội dung chưa lưu hoặc chưa đồng bộ.
- [x] P3.7 Chốt bill và tạo các khoản nợ trong một transaction; chống tạo trùng khi bấm lại/retry.
- [x] P3.8 Hủy khoản chưa có thanh toán với lịch sử. Khoản đã có thanh toán không bị ghi đè; điều chỉnh bằng bút toán riêng thuộc bản sau.

Nghiệm thu: tổng phần chia bằng tổng bill; không tạo khoản nợ người trả với chính họ; hiển thị riêng tiền đã ứng và chi tiêu thực tế. Bill mẫu 1.500.000đ cho kết quả An/Bình/Chi 360.000đ, Dũng/Em 210.000đ; An cần thu 1.140.000đ.

## 4. Chụp bill, OCR và storage

Phụ thuộc: giai đoạn 3. Có thể thử chất lượng nhà cung cấp từ sớm; tích hợp vào flow sau khi contract bill ổn định.

- [ ] P4.1 Tạo contract đọc hóa đơn và lưu ảnh; chọn adapter sau khi thử trên bộ bill tiếng Việt đa dạng.
- [ ] P4.2 Đo độ đúng món, số lượng, thành tiền, phí/giảm giá; thời gian p50/p95 và chi phí mỗi bill.
- [x] P4.3 Chụp/chọn ảnh trên điện thoại; xử lý xoay, kích thước và tải lên storage riêng tư.
- [x] P4.4 Worker đọc ảnh bất đồng bộ; người dùng chọn người trong lúc chờ; có retry, giới hạn thời gian và báo lỗi.
- [x] P4.5 Chuyển kết quả OCR sang bill nháp; kiểm tra tổng, chỉ rõ dòng cần kiểm tra, cho bấm sửa/chụp lại.
- [ ] P4.6 Giữ lựa chọn và bản nháp khi OCR lỗi; quản lý quyền xem ảnh và vòng đời file bỏ dở.

Nghiệm thu: không để tác vụ OCR chặn API thao tác; không báo đọc đúng chỉ vì tổng khớp. Người dùng xem và xác nhận trước khi phát sinh nợ. Có báo cáo kết quả bộ bill thử trước khi chọn adapter.

## 5. Chia sẻ và nhận tiền

Phụ thuộc: giai đoạn 2–3; dùng bill OCR từ giai đoạn 4 khi sẵn sàng.

- [x] P5.1 Tạo link riêng có phạm vi, thời hạn và khả năng thu hồi; mở được mà không cài app/đăng ký.
- [x] P5.2 Hiện số cần trả và các dòng tạo nên số tiền đó; có luồng báo sai cụ thể.
- [x] P5.3 Thiết lập thông tin nhận tiền và QR đúng người nhận, số tiền, nội dung; chọn adapter QR phù hợp.
- [x] P5.4 Tạo schema thanh toán và phân bổ thanh toán: một lần trả nhiều khoản, một khoản được trả nhiều lần.
- [x] P5.5 Người trả báo đã chuyển; người nhận xác nhận hoặc từ chối. Bằng chứng ảnh không tự đóng khoản nợ.
- [x] P5.6 Ghi nhận nhận đủ/một phần/tiền mặt; tiền thừa được giữ thành khoản cần xử lý, không làm nợ âm.
- [x] P5.7 Khóa/kiểm tra đồng thời và idempotency để xác nhận lặp không làm trừ tiền hai lần.

Nghiệm thu: Bình trả 200.000đ trên khoản 360.000đ thì còn 160.000đ; An còn cần thu 940.000đ. Một lần chuyển 260.000đ phân bổ được vào hai khoản 160.000đ và 100.000đ. Chuyển 400.000đ cho khoản 360.000đ hiện 40.000đ thừa riêng. Tất cả giữ đúng sau reload và trên hai thiết bị.

## 6. Theo dõi, lời hẹn và nhắc tiền

Phụ thuộc: giai đoạn 5.

- [x] P6.1 Tạo schema lời hẹn và lần nhắc; tách hạn trả khỏi lời hẹn thực tế, giữ lịch sử đổi hẹn.
- [x] P6.2 Danh sách đến hạn/quá hạn/chờ xác nhận/đang báo sai; thao tác ngay trên từng khoản.
- [x] P6.3 Người nhận chọn ngày trả nhanh và hẹn trả một phần; lời hẹn mới không cộng trùng lời hẹn cũ.
- [x] P6.4 Nội dung nhắc có sẵn và chia sẻ qua chức năng của thiết bị; không coi mở chia sẻ là đã gửi/đã đọc.
- [x] P6.5 Worker nhắc theo lịch trong ứng dụng. SMS/Zalo/email/Web Push cần tích hợp và quyền nhận, chưa thuộc bản MVP này.
- [x] P6.6 Nhắc tối đa một lần/khoản/ngày trong app; đổi lời hẹn để hoãn, có tắt nhắc và giờ nhắc. Trả đủ/đổi hẹn dừng lịch cũ; worker thử lại sau lỗi và chống tạo thông báo trùng.

Nghiệm thu: khoản trả đủ không còn trong danh sách cần nhắc; trả một phần nhắc đúng số còn lại; thay ngày hẹn không tạo hai lịch gửi; lỗi kênh không làm mất lịch sử hoặc đổi trạng thái tiền.

## 7. Thống kê và dự toán theo lịch

Phụ thuộc: số dư và lịch sử đáng tin cậy từ giai đoạn 5–6.

- [x] P7.1 Trang chủ dùng số thật: cần thu, cần trả, đến hạn, quá hạn; không cộng phần cá nhân vào khoản cần thu.
- [ ] P7.2 Báo cáo tiền đã ứng, chi tiêu cá nhân, tiền đã thu/trả, còn nợ; lọc theo người, sổ và khoảng thời gian.
- [x] P7.3 MVP có lịch 7 ngày: đến hạn, có lời hẹn, quá hạn, chưa có ngày; mỗi phần tiền chỉ nằm trong một nhóm. Hẹn một phần tách khỏi phần còn lại. Tùy chọn 30 ngày để bản sau.
- [x] P7.4 Bấm các nhóm lịch thu ra khoản cấu thành; số tổng và chi tiết dùng projection chung. Drill-down toàn bộ chỉ số báo cáo và lọc kỳ nâng cao để bản sau.
- [ ] P7.5 Mốc thời gian rõ ràng: báo cáo lịch sử dựa vào thời điểm xác nhận/điều chỉnh; phân biệt tình trạng hiện tại với tình trạng tại ngày báo cáo.

Nghiệm thu bộ dữ liệu còn nợ 940.000đ: Chi hẹn 360.000đ trong 7 ngày; Em đến hạn 210.000đ chưa hẹn; Dũng quá hạn 210.000đ; Bình chưa có hạn 160.000đ. Không gọi 570.000đ đến hạn là tiền chắc chắn thu được.

## 8. Nghiệm thu toàn luồng, production và dùng thử

Thực hiện kiểm tra chức năng trong từng giai đoạn; đây là cửa nghiệm thu phát hành, không phải đợi đến cuối mới kiểm thử.

- [ ] P8.1 Chạy toàn bộ use case trên browser thật, hai thiết bị và tài khoản khác nhau; mọi thay đổi tiền giữ đúng sau reload.
- [ ] P8.2 Kiểm tra Android Chrome, iPhone Safari và link mở từ ứng dụng chat phổ biến; có đường mở bằng trình duyệt ngoài khi cần.
- [ ] P8.3 Kiểm tra thao tác bàn phím, vùng chạm, nội dung đọc được, trạng thái lỗi, nút quay lại và cập nhật PWA không làm mất thao tác.
- [ ] P8.4 Đo hiệu năng trên cấu hình thiết bị/mạng/tải được ghi lại: phản hồi chia tiền mục tiêu dưới 50 ms; nội dung chính link thanh toán trong 2,5 giây; API thông thường p95 dưới 300 ms tại server, gồm truy vấn DB và không gồm OCR.
- [x] P8.5 Kiểm tra quyền, token hết hạn/thu hồi, upload, rate limit, sửa đồng thời, request lặp và khôi phục khi worker chạy lại.
- [ ] P8.6 Deploy staging rồi production: HTTPS, domain, cùng origin cho web/API, cấu hình riêng từng môi trường và migration được kiểm tra.
- [ ] P8.7 Backup database, thử restore, rollback phiên bản, log/metrics có giới hạn dữ liệu nhạy cảm và cảnh báo lỗi API/queue.
- [ ] P8.8 Dùng thử với mục tiêu 5–10 người trong 2–3 nhóm; đo thời gian tạo khoản, tỷ lệ gửi yêu cầu/thanh toán, số lần sửa phép chia và phản hồi.
- [ ] P8.9 Sửa các lỗi chặn sử dụng; đối chiếu kết quả thử với mục tiêu rồi quyết định phạm vi phát hành rộng hơn.

Các con số hiệu năng và quy mô dùng thử là mục tiêu nghiệm thu, chưa phải kết quả đạt được. OCR có báo cáo riêng về thời gian, độ đúng và lỗi cần sửa.

## 9. Mở rộng sau dữ liệu dùng thật

Ưu tiên lại sau M3; không đưa tất cả vào đường găng MVP.

- [ ] P9.1 Mẫu khoản định kỳ cho tiền nhà, điện nước, hội phí; xác nhận kỳ mới và ngăn tạo trùng.
- [ ] P9.2 Gộp nhiều khoản thành một yêu cầu thanh toán; không làm mất nguồn gốc từng khoản.
- [ ] P9.3 Bù trừ hai chiều có xác nhận; giữ lịch sử nghĩa vụ và bút toán bù trừ, không xóa/đổi chiều khoản cũ.
- [ ] P9.4 Nhiều người ứng một bill; thêm mô hình đóng góp thay cho giả định một người trả.
- [ ] P9.5 Đối soát giao dịch qua nhà cung cấp được chọn; ghép đúng người/số tiền/nội dung, trường hợp mơ hồ cần xác nhận.
- [ ] P9.6 Dự báo thu tiền theo lịch sử: đủ dữ liệu mới ước tính, có khoảng dự báo/lý do và đo sai số; không tạo điểm tín dụng công khai.
- [ ] P9.7 Import/export, nhiều loại tiền và nhóm dùng chung nâng cao theo nhu cầu thực tế.
- [ ] P9.8 Đánh giá app iOS/Android khi có nhu cầu quay lại hoặc tích hợp thiết bị; tiếp tục duy trì web cho người nhận link.

## Quy tắc hoàn thành một lát chức năng

1. Duyệt screen, thao tác và trạng thái trước khi cố định API/schema liên quan.
2. Hoàn thiện UI, application service, contract và adapter cần thiết của luồng đó.
3. Kiểm thử các quy tắc tiền/quyền quan trọng; kiểm tra browser thật và reload cho thay đổi lưu trữ.
4. Ghi lại bằng chứng, giới hạn còn lại và cập nhật checkbox trong roadmap.
5. Phân biệt rõ local đã qua, code đã push, CI đã qua và production đã chạy; chỉ đánh dấu mốc phát hành sau khi có bằng chứng tương ứng.

## Việc thực hiện tiếp theo

Chạy [hướng dẫn deploy](mvp/DEPLOY.md) trên server sau khi pull, cấu hình proxy cùng origin và kiểm tra domain. Sau đó nghiệm thu trên Android/iPhone thật và nhóm dùng thử. Các phần chưa nằm trong MVP: nhóm quen, điều chỉnh sau khi đã có thanh toán, bộ benchmark OCR đa dạng, báo cáo theo khoảng thời gian/30 ngày, push hoặc kênh gửi bên ngoài, đối soát ngân hàng.
