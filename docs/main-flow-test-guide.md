# Hướng dẫn kiểm thử các luồng chính — KOC Việt

> Cập nhật: 03/09/2026  
> Domain kiểm thử: <https://kocviet.com/>  
> Phạm vi: production đã deploy, frontend JavaScript, backend Express và PostgreSQL.  
> Nguyên tắc: ưu tiên kiểm thử chỉ đọc và dữ liệu test được phê duyệt. Không thực hiện thanh toán, payout, duyệt tài khoản thật hoặc xóa dữ liệu production khi chưa có xác nhận của người phụ trách.

## 1. Mục tiêu

Tài liệu này dùng để kiểm tra thủ công các luồng quan trọng của hệ thống:

1. Khởi động hệ thống, đăng nhập và phân quyền.
2. KOC onboarding và xác minh ảnh follower.
3. Đăng ký doanh nghiệp.
4. Booking Marketplace từ lúc tạo đến lúc giải ngân.
5. Ví doanh nghiệp, nạp tiền PayOS và KOC rút tiền qua PayOS Payout.
6. Affiliate và đối soát hoa hồng.
7. Chiến dịch lớn.
8. AI Clone Avatar.
9. Yêu cầu KOL/Nghệ sĩ.
10. Khiếu nại, thông báo và các màn vận hành Admin.

## 2. Chuẩn bị kiểm thử trên domain đã deploy

### 2.1. Kiểm tra nhanh hạ tầng production

Các URL cần xác nhận trước khi bắt đầu:

- Trang chủ: <https://kocviet.com/>
- Trang giới thiệu: <https://kocviet.com/trang-chu>
- Dành cho KOC: <https://kocviet.com/koc>
- Dành cho doanh nghiệp: <https://kocviet.com/doanh-nghiep>
- Marketplace: <https://kocviet.com/marketplace>
- AI Clone: <https://kocviet.com/ai-clone>
- Bảng giá: <https://kocviet.com/bang-gia>
- Cộng đồng: <https://kocviet.com/cong-dong>
- Hỗ trợ: <https://kocviet.com/ho-tro>
- Health check: <https://kocviet.com/health>
- Cấu hình công khai: <https://kocviet.com/api/config>

Kết quả đã xác nhận ngày 03/09/2026: các URL public trên trả HTTP `200`; `/health` trả `{"ok":true,"database":"postgresql"}`; `/api/config` trả danh sách hạng KOC, ngành hàng, tỉnh/thành và ngân hàng payout.

### 2.2. Tài khoản test production

Không dùng tài khoản demo seed trên production nếu chưa được người phụ trách phê duyệt. Chuẩn bị ba tài khoản test riêng:

| Vai trò | Email test | Quyền/dữ liệu cần có |
|---|---|---|
| KOC | Điền trước khi test | Hồ sơ active, ngân hàng test hợp lệ, có thể nhận booking |
| Doanh nghiệp | Điền trước khi test | Tài khoản active, ví có hạn mức test đã duyệt |
| Admin | Điền trước khi test | Chỉ cấp cho QA được ủy quyền; bật audit log |

Quy ước dữ liệu test:

- Tên hồ sơ, campaign và booking phải có tiền tố `QA-YYYYMMDD-`.
- Dùng sản phẩm/link bài đăng thử nghiệm; không dùng thông tin khách hàng thật.
- Ghi lại ID và mã nghiệp vụ để dọn dữ liệu sau test.
- Không chia sẻ mật khẩu, OTP hoặc khóa PayOS trong tài liệu và ảnh chụp.

### 2.3. Tích hợp ngoài

| Tích hợp | Biến môi trường chính | Dùng để test |
|---|---|---|
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | OTP và email thông báo |
| S3 | `AWS_REGION`, `AWS_S3_IDENTITY_BUCKET`, thông tin truy cập S3 | CCCD, giấy phép và tệp định danh |
| PayOS nạp tiền | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` | Tạo link/QR nạp ví và webhook thanh toán |
| PayOS rút tiền | `PAYOS_PAYOUT_CLIENT_ID`, `PAYOS_PAYOUT_API_KEY`, `PAYOS_PAYOUT_CHECKSUM_KEY` | Chuyển tiền từ ví KOC về ngân hàng |
| Web Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Thông báo đẩy |

Lưu ý quan trọng:

- Bộ khóa PayOS nạp tiền và PayOS Payout phải thuộc đúng kênh tương ứng và không được dùng chung.
- Tài khoản/kênh PayOS Payout phải có đủ số dư thực tế. Số dư ví KOC trong database không đảm bảo tài khoản ngân hàng dùng để payout có đủ tiền.
- Khi PayOS từ chối payout, hệ thống phải hiển thị lỗi nhà cung cấp và không tạo giao dịch rút thành công trong ví.
- Chỉ test PayOS bằng tài khoản/kênh test hoặc số tiền nhỏ đã được người phụ trách tài chính phê duyệt.
- OTP, challenge xác minh follower và một số trạng thái ngắn hạn được giữ trong bộ nhớ backend; khởi động lại backend sẽ làm các mã đang dùng hết hiệu lực.

### 2.4. Quy ước ghi nhận kết quả

Với mỗi test case, ghi lại:

- Người test, thời gian và môi trường.
- Vai trò/tài khoản đang đăng nhập.
- Mã booking, campaign, KOL request hoặc mã giao dịch liên quan.
- Số dư `available` và `escrow` trước/sau thao tác có tiền.
- Ảnh chụp màn hình và response lỗi trong Network nếu test thất bại.
- Kết quả: `PASS`, `FAIL`, `BLOCKED` hoặc `NOT RUN`.
- Với lỗi production, ghi thêm `request URL`, HTTP status, thời điểm đến giây và mã tham chiếu nhưng phải che cookie/token/OTP.

## 3. Smoke test nhanh

Chạy nhóm này sau mỗi lần deploy. Thời gian dự kiến 20–30 phút nếu đã có dữ liệu seed.

| ID | Kiểm tra | Kết quả mong đợi |
|---|---|---|
| SMK-01 | Mở `/health` | Backend và PostgreSQL sẵn sàng |
| SMK-02 | Đăng nhập lần lượt bằng 3 tài khoản demo | Điều hướng đúng portal, không lộ màn hình của vai trò khác |
| SMK-03 | Doanh nghiệp mở `#/find`, xem một KOC | Danh sách và hồ sơ KOC hiển thị được |
| SMK-04 | KOC mở `#/bookings`, `#/wallet`, `#/affiliate` | Các trang tải thành công, không có lỗi API 5xx |
| SMK-05 | Admin mở `#/queue`, `#/allbookings`, `#/settle` | Dữ liệu quản trị tải thành công |
| SMK-06 | Chạy `npm.cmd test` | Tất cả test backend hiện có đều pass |
| SMK-07 | Chạy `npm.cmd run build` | Backend và frontend build thành công |

## 4. Test xác thực và phân quyền

### AUTH-01 — Đăng nhập đúng vai trò

1. Mở <https://kocviet.com/#/login>.
2. Đăng nhập bằng tài khoản KOC.
3. Đăng xuất và lặp lại với Business, Admin.

Kết quả mong đợi:

- KOC vào `#/home`.
- Business và Admin vào `#/dashboard`.
- Cookie phiên được tạo; refresh trang vẫn giữ phiên.
- Menu hiển thị đúng theo vai trò.

### AUTH-02 — Sai mật khẩu

1. Nhập email demo và mật khẩu sai.
2. Bấm đăng nhập nhiều lần nhưng không vượt quá giới hạn an toàn của môi trường.

Kết quả mong đợi:

- Không tạo phiên đăng nhập.
- Hiển thị lỗi rõ ràng, không lộ mật khẩu hoặc thông tin nội bộ.
- Khi bị rate limit, response phải là `429` và người dùng được yêu cầu thử lại sau.

### AUTH-03 — Quên mật khẩu

1. Mở <https://kocviet.com/#/forgot-password>.
2. Nhập email hợp lệ và yêu cầu OTP.
3. Nhập OTP sai, sau đó nhập OTP đúng.
4. Đặt mật khẩu mới rồi đăng nhập lại.

Kết quả mong đợi:

- OTP sai/hết hạn bị từ chối.
- Mật khẩu mới đăng nhập được; mật khẩu cũ không còn dùng được.
- Nếu SMTP chưa cấu hình, giao diện phải báo lỗi gửi OTP thay vì báo thành công giả.

### AUTH-04 — Kiểm tra chặn truy cập chéo vai trò

Trong lúc đăng nhập KOC, thử gọi hoặc mở chức năng chỉ dành cho Business/Admin; thực hiện tương tự với Business.

Kết quả mong đợi: API trả `403`, dữ liệu không bị thay đổi.

## 5. Test KOC onboarding

Luồng chuẩn:

```text
Email & OTP
→ Hồ sơ và mạng xã hội
→ Nhập follower và kênh mạng xã hội
→ Phân hạng và bảng giá
→ Danh tính và ngân hàng
→ Hợp đồng
→ Chờ Admin duyệt
```

### ONB-KOC-01 — Onboarding thành công

Điều kiện:

- Dùng email chưa tồn tại.
- SMTP và S3 đã cấu hình.

Các bước:

1. Mở <https://kocviet.com/#/tuyen-koc> và bắt đầu đăng ký.
2. Nhập email, nhận OTP và xác minh.
3. Nhập hồ sơ, chọn một kênh được hỗ trợ: TikTok, Facebook, Instagram, YouTube hoặc Threads.
4. Nhập tổng số follower hiện tại.
5. Nhập bảng giá theo hạng được tính từ follower.
6. Tải giấy tờ định danh, nhập ngân hàng/BIN, số tài khoản và chủ tài khoản.
7. Đọc, ký hợp đồng và hoàn tất.
8. Đăng nhập Admin → `#/queue` → kiểm tra thông tin và duyệt KOC.

Kết quả mong đợi:

- Số follower được lưu ở trạng thái chưa xác minh để Admin kiểm duyệt.
- Tạo tài khoản/hồ sơ KOC ở trạng thái chờ duyệt.
- Sau khi Admin duyệt, KOC đăng nhập và xuất hiện trong Marketplace.

### ONB-KOC-02 — Follower không hợp lệ

Nhập follower âm, số thập phân hoặc vượt quá `2.000.000.000`.

Kết quả mong đợi:

- Frontend không cho sang bước tiếp theo.
- Backend từ chối dữ liệu nếu gọi API trực tiếp.
- Không tạo tài khoản KOC.

### ONB-KOC-03 — Thiếu kênh mạng xã hội hợp lệ

Không chọn kênh hoặc nhập URL kênh không hợp lệ.

Kết quả mong đợi:

- Hiển thị lỗi tiếng Việt rõ ràng.
- Không cho hoàn tất hồ sơ.

### ONB-KOC-04 — Admin từ chối hồ sơ

1. Hoàn tất một hồ sơ KOC mới.
2. Admin từ chối và nhập lý do.

Kết quả mong đợi:

- Hồ sơ không xuất hiện như KOC active.
- KOC nhận được lý do từ chối qua kênh thông báo đã cấu hình.

## 6. Test đăng ký doanh nghiệp

### ONB-BIZ-01 — Đăng ký và được duyệt

1. Mở <https://kocviet.com/#/business-register>.
2. Dùng email mới, xác minh OTP.
3. Nhập tên doanh nghiệp, người liên hệ, mã số thuế và thông tin bắt buộc.
4. Tải giấy phép doanh nghiệp.
5. Gửi hồ sơ.
6. Admin vào `#/businesses`, mở hồ sơ và duyệt.

Kết quả mong đợi:

- Hồ sơ được tạo ở trạng thái chờ duyệt.
- Trước khi duyệt, doanh nghiệp không dùng được các chức năng yêu cầu tài khoản active.
- Sau khi duyệt, đăng nhập được và thấy portal doanh nghiệp.

### ONB-BIZ-02 — Dữ liệu không hợp lệ

Kiểm tra email trùng, OTP sai, thiếu mã số thuế, thiếu giấy phép hoặc file không hợp lệ.

Kết quả mong đợi: chặn đúng trường, hiển thị lỗi rõ ràng và không tạo hồ sơ dở dang thành tài khoản active.

## 7. Test Booking Marketplace

### BOOK-01 — Booking Review/Quảng cáo hoàn chỉnh

Điều kiện: ví khả dụng của doanh nghiệp lớn hơn giá booking.

1. Đăng nhập Business → `#/find`.
2. Chọn KOC, ngành hàng và loại Review hoặc Quảng cáo.
3. Nhập link dữ liệu sản phẩm dạng `http/https`, yêu cầu và deadline tương lai.
4. Ghi lại số dư ví khả dụng và escrow, sau đó tạo booking.
5. Đăng nhập KOC → `#/bookings` → xác nhận booking.
6. KOC chuyển sang sản xuất và tải video lên.
7. Business mở `#/orders`, duyệt video.
8. KOC nộp link bài đăng hợp lệ.
9. Business hoàn tất booking.

Kết quả mong đợi theo từng mốc:

| Mốc | Booking status | Kiểm tra tiền |
|---|---|---|
| Vừa tạo | `pending` | Business `available` giảm bằng giá booking; `escrow` tăng tương ứng |
| KOC nhận | `confirmed` | Không giải ngân |
| Đang làm | `producing` | Không giải ngân |
| Tải video | `pending_review` | Không giải ngân |
| Business duyệt | `video_approved` | Không giải ngân |
| KOC nộp bài | `posted` | Không giải ngân |
| Business hoàn tất | `completed` | Escrow giảm; 95% giá booking vào ví KOC; 5% vào doanh thu nền tảng |

Kiểm tra thêm:

- KOC và Business nhận thông báo ở các mốc chính.
- Hoàn tất lại cùng booking không được giải ngân lần hai.
- Sau khi hoàn tất, Business có thể đánh giá; điểm tổng hợp của KOC được cập nhật.

### BOOK-02 — Ví doanh nghiệp không đủ

Tạo booking có giá lớn hơn số dư `available`.

Kết quả mong đợi:

- Booking không được tạo.
- Thông báo cho biết số dư hiện có và số tiền cần thiết.
- `available`, `escrow` và sổ cái không thay đổi.

### BOOK-03 — KOC từ chối

1. Business tạo booking thành công.
2. KOC từ chối và nhập lý do.

Kết quả mong đợi:

- Booking chuyển `rejected`.
- Toàn bộ tiền giữ trong escrow được hoàn về `available` của Business.
- Không có tiền vào ví KOC hoặc doanh thu nền tảng.

### BOOK-04 — Yêu cầu sửa video

1. KOC tải video.
2. Business yêu cầu sửa và nhập ghi chú.
3. KOC tải phiên bản mới.
4. Business duyệt phiên bản mới.

Kết quả mong đợi:

- Trạng thái đi qua `revision_requested` rồi quay lại `pending_review`.
- Ghi chú sửa hiển thị cho KOC.
- Phiên bản video mới được nhận diện đúng; chưa giải ngân trước khi hoàn tất.

### BOOK-05 — Kiểm tra validation

Kiểm tra các trường hợp:

- Link dữ liệu sản phẩm thiếu hoặc không bắt đầu bằng `http://`/`https://`.
- Ngành hàng không có bảng giá.
- Deadline sai định dạng.
- Link bài đăng sai định dạng.
- Người không sở hữu booking cố thay đổi trạng thái.

Kết quả mong đợi: request bị từ chối, trạng thái và số dư không đổi.

## 8. Test ví, PayOS và payout

### WALLET-01 — Nạp ví doanh nghiệp qua PayOS

1. Đăng nhập Business → `#/wallet`.
2. Nhập số tiền hợp lệ và tạo yêu cầu nạp.
3. Mở checkout/QR PayOS và thanh toán trên tài khoản test/staging.
4. Chờ redirect/webhook rồi tải lại ví.

Kết quả mong đợi:

- Tạo một `payment_request` trạng thái chờ thanh toán.
- Chữ ký webhook hợp lệ mới được chấp nhận.
- Sau thanh toán, payment chuyển `paid` và ví Business tăng đúng một lần.
- Gửi lại cùng webhook không cộng tiền lần hai.
- Webhook sai chữ ký không làm thay đổi số dư.

### WALLET-02 — Rút tiền KOC thành công

Điều kiện:

- Ví KOC có ít nhất `10.000đ` khả dụng.
- Hồ sơ có ngân hàng, BIN 6 chữ số, số tài khoản và chủ tài khoản hợp lệ.
- Kênh PayOS Payout có đủ số dư thực tế.

Các bước:

1. KOC vào `#/wallet` và chọn rút tiền.
2. Yêu cầu OTP qua email.
3. Nhập OTP đúng và số tiền từ `10.000đ` trở lên nhưng không vượt số dư.
4. Gửi yêu cầu.

Kết quả mong đợi:

- PayOS Payout chấp nhận yêu cầu trước khi hệ thống ghi giao dịch rút.
- Tạo `wallet_tx` loại `withdraw`, trạng thái `processing`.
- Ví khả dụng KOC giảm đúng số tiền; tài khoản `system/payos/cash_clearing` tăng tương ứng.
- Audit log ghi nhận yêu cầu rút.

### WALLET-03 — Các lỗi rút tiền bắt buộc

| Trường hợp | Kết quả mong đợi |
|---|---|
| OTP sai/hết hạn | Từ chối; không gọi payout thành công; số dư không đổi |
| Số tiền dưới `10.000đ` | Báo ngưỡng rút tối thiểu |
| Rút lớn hơn số dư KOC | Báo số dư khả dụng không đủ |
| Thiếu ngân hàng/BIN/số tài khoản | Yêu cầu cập nhật hồ sơ |
| BIN không khớp ngân hàng | HTTP `422`, nêu rõ thông tin cần sửa |
| PayOS báo tài khoản nhận không hợp lệ, ví dụ mã `607` | HTTP `422`; không tạo giao dịch rút |
| PayOS rate limit | HTTP `429`, có thời gian thử lại nếu nhà cung cấp trả về |
| Tài khoản payout không đủ tiền | Hiển thị lỗi PayOS; ví KOC và sổ cái nội bộ không bị trừ |

### WALLET-04 — Đối chiếu sổ cái

Sau mỗi thao tác tiền, kiểm tra:

- Tổng posting của một journal entry bằng `0`.
- Không có tài khoản âm ngoài quy tắc nghiệp vụ cho phép.
- Cùng một `idempotency_key` không tạo hai journal entry.
- Tổng tiền chuyển khỏi Business bằng tổng vào KOC + nền tảng.
- Số dư hiển thị trên UI khớp dữ liệu `wallet_accounts`/`ledger_postings`.

## 9. Test Affiliate

Dữ liệu seed có thể bao gồm booking `AF-QC-001`, `CB-QC-001` và các đơn `QC-ORDER-EXPECTED`, `QC-ORDER-RECONCILED`, `QC-ORDER-CANCELLED`, `QC-ORDER-REFUNDED`.

### AFF-01 — Tạo link affiliate

1. Business tạo booking Affiliate hoặc Combo với sàn hợp lệ, link sản phẩm và hoa hồng từ 1–90%.
2. KOC xác nhận booking.

Kết quả mong đợi: link tracking được tạo một lần và hiển thị trong trang hoa hồng của KOC.

### AFF-02 — Đồng bộ và đối soát đơn

1. Đồng bộ/tạo đơn test cho link affiliate.
2. Kiểm tra các trạng thái `pending`, `confirmed`, `settled`, `cancelled`, `refunded`.
3. Admin vào `#/affiliate` hoặc `#/settle` và chạy đối soát.

Kết quả mong đợi:

- `pending`: hoa hồng dự kiến, chưa rút được.
- `confirmed`: đã đối soát nhưng chưa được giải ngân trùng.
- `settled`: ghi nhận vào ví theo đúng số tiền.
- `cancelled`/`refunded`: không cộng hoa hồng; nếu đã cộng thì có bút toán đảo phù hợp.
- Đơn bị đánh dấu tự mua không được tính hoa hồng.

## 10. Test chiến dịch lớn

### CAMP-01 — Luồng thành công

1. Business → `#/campaigns` → tạo chiến dịch, nhập ngân sách, số KOC, hạng, ngành và deadline.
2. Admin → `#/campaigns` → gửi báo giá phí quản lý.
3. Business chấp nhận và ký quỹ.
4. Admin bắt đầu chiến dịch và phân KOC sao cho tổng allocation bằng ngân sách.
5. KOC nhận lời, nộp nội dung.
6. Business duyệt nội dung.
7. Admin giải ngân từng allocation và hoàn tất chiến dịch.

Chuỗi trạng thái mong đợi:

```text
quote_pending → quoted → funded → coordinating → assigned/in_progress → completed
```

Kiểm tra tiền:

- Khi `funded`: tổng ngân sách + phí quản lý chuyển từ `available` sang `escrow`.
- Khi bắt đầu: giải phóng 20% phí quản lý cho nền tảng.
- Mỗi KOC chỉ được giải ngân allocation đã duyệt một lần.
- Chỉ hoàn tất khi toàn bộ ngân sách đã được phân bổ và giải ngân.
- Khi hoàn tất, phần phí quản lý còn lại được chuyển cho nền tảng.

### CAMP-02 — Hủy chiến dịch

Kiểm tra hủy trước ký quỹ, sau ký quỹ và sau khi đã giải ngân một phần.

Kết quả mong đợi: chỉ phần escrow chưa sử dụng được hoàn về Business; khoản đã giải ngân không bị hoàn trùng.

### CAMP-03 — KOC từ chối hoặc thiếu phân bổ

Kết quả mong đợi: Admin không thể hoàn tất khi tổng allocation/settlement chưa bằng ngân sách.

## 11. Test AI Clone Avatar

### AI-01 — Luồng thành công

1. KOC vào trang AI Clone, đọc điều khoản và đăng ký.
2. Business → `#/aiclone-booking` → chọn KOC đủ điều kiện, nhập brief, sản phẩm và phạm vi video.
3. Admin → `#/aiclone` → nhập phí sản xuất, phí từng KOC, phí nền tảng và phụ phí.
4. Business chấp nhận báo giá và ký quỹ/thanh toán.
5. Admin nhập kịch bản và sản xuất.
6. Admin giao bản dựng cho Business.
7. Business duyệt.
8. KOC duyệt quyền sử dụng hình ảnh/video.
9. KOC đăng bài và nộp link.
10. Hoàn tất và đối chiếu giải ngân.

Chuỗi trạng thái chính mong đợi:

```text
quote_pending → quote_sent → payment/escrow → brief_review
→ producing → pending_business_review → pending_koc_review
→ video_approved → posted → completed
```

Kết quả mong đợi:

- Báo giá theo batch bằng tổng phí sản xuất + tổng phí từng KOC + phí nền tảng + phụ phí.
- Video luôn được Business duyệt trước, sau đó mới chuyển KOC duyệt.
- Yêu cầu sửa quay về đúng bước, không giải ngân sớm.
- Khi hoàn tất, KOC nhận đúng `aiclone_quote_koc`; các phần phí còn lại vào đúng tài khoản nền tảng/dịch vụ.

### AI-02 — Các trường hợp chặn

- KOC chưa đồng ý điều khoản nhưng cố nhận booking.
- Báo giá thiếu allocation của một KOC trong batch.
- Kịch bản ngắn hơn 20 ký tự.
- Link video hoặc link bài đăng không hợp lệ.
- Admin giao video thẳng cho KOC trước khi Business duyệt.
- Business/KOC duyệt lại cùng một bước.

Kết quả mong đợi: hệ thống từ chối và không thay đổi tiền/trạng thái ngoài luồng.

## 12. Test KOL/Nghệ sĩ

### KOL-01 — Luồng thành công

1. Business → `#/kol` → chọn KOL, nhập ngân sách nguyên VND dương và brief tối thiểu 10 ký tự.
2. Admin → `#/kol` → báo giá gồm phí KOL, phí nền tảng và phụ phí.
3. Business xác nhận và ký quỹ.
4. Admin nhập mã hợp đồng/xác nhận lịch.
5. Admin giao sản phẩm bằng URL hợp lệ.
6. Business nghiệm thu.
7. Admin giải ngân.

Chuỗi trạng thái mong đợi:

```text
pending → quoted → funded → confirmed → delivered → approved → completed
```

Kiểm tra tiền:

- Khi ký quỹ, tổng báo giá chuyển từ `available` sang `escrow`.
- Khi giải ngân, phí KOL vào ví KOL; phí nền tảng + phụ phí vào doanh thu nền tảng.
- `escrow_amount` về `0` khi hoàn tất.

### KOL-02 — Yêu cầu sửa và hủy

- Business yêu cầu sửa khi trạng thái `delivered`, có ghi chú bắt buộc.
- Admin giao lại rồi Business nghiệm thu.
- Thử hủy ở các trạng thái cho phép.

Kết quả mong đợi: trạng thái sửa là `revision_requested`; khi hủy, phần escrow chưa giải ngân được hoàn đúng một lần.

## 13. Test khiếu nại và thông báo

### CMP-01 — Khiếu nại booking

1. KOC hoặc Business mở booking thuộc quyền sở hữu.
2. Tạo khiếu nại với lý do hợp lệ.
3. Admin vào `#/complaints`, chuyển qua các bước xử lý và nhập ghi chú.

Kết quả mong đợi:

- Khiếu nại ban đầu ở `open`.
- Chỉ hai bên của booking và Admin xem được dữ liệu liên quan.
- Quyết định hoàn tiền phải tạo bút toán phù hợp và không hoàn hai lần.
- Audit log lưu người xử lý và hành động.

### NOTI-01 — Thông báo trong ứng dụng

Thực hiện một booking mới, duyệt video, hoàn tất, đối soát affiliate và xử lý KOL/campaign.

Kết quả mong đợi:

- Đúng người nhận thấy thông báo mới.
- Badge chưa đọc tăng; đánh dấu đã đọc làm badge giảm.
- Link trong thông báo mở đúng màn hình.
- Nếu chưa cấu hình VAPID, thông báo trong database vẫn hoạt động và UI không báo push đã bật giả.

## 14. Test các chức năng vận hành Admin

| Màn hình | Kiểm tra tối thiểu |
|---|---|
| `#/businesses` | Tìm kiếm, phân trang, duyệt/từ chối/khóa doanh nghiệp |
| `#/queue` | Duyệt KOC, xem định danh, hợp đồng và lý do từ chối |
| `#/allbookings` | Lọc theo trạng thái/loại, mở đúng booking |
| `#/complaints` | Tiếp nhận, xử lý, hoàn tiền hoặc từ chối |
| `#/affiliate` | Xem GMV/hoa hồng/phí và trạng thái đơn |
| `#/kol` | Báo giá, xác nhận, bàn giao, giải ngân/hủy |
| `#/leads` | Gán người phụ trách, thêm hoạt động, chuyển trạng thái hợp lệ |
| `#/campaigns` | Báo giá, phân KOC, giải ngân và hoàn tất |
| `#/settle` | Tổng hợp escrow, chi trả KOC, KOL, campaign và phí nền tảng |
| `#/aiclone` | Báo giá batch, kịch bản, sản xuất và bàn giao đúng thứ tự |
| `#/tiers` | Chỉ chấp nhận đủ 5 hạng Nano/Micro/Mid/Macro/Mega và khoảng giá hợp lệ |

## 15. Kiểm tra trực tiếp database (tùy chọn)

Chỉ chạy trên local/staging. Thay các mã mẫu bằng mã vừa tạo:

```sql
-- Booking và escrow
SELECT id, code, status, price, escrow, funding_mode, business_id, koc_id
FROM bookings
WHERE code = 'MA_BOOKING';

-- Payment PayOS
SELECT id, booking_id, order_code, amount, status, purpose, failure_reason
FROM payment_requests
ORDER BY created_at DESC
LIMIT 20;

-- Số dư các bucket ví
SELECT owner_type, owner_id, bucket, balance
FROM wallet_accounts
ORDER BY owner_type, owner_id, bucket;

-- Journal và postings gần nhất
SELECT id, idempotency_key, event_type, reference_type, reference_id, created_at
FROM journal_entries
ORDER BY created_at DESC
LIMIT 20;

SELECT journal_entry_id, account_id, amount
FROM ledger_postings
WHERE journal_entry_id = 'JOURNAL_ID';

-- Affiliate
SELECT platform_order_id, gmv, commission_amount, platform_fee, status, flagged
FROM affiliate_orders
ORDER BY ordered_at DESC
LIMIT 20;

-- Campaign/KOL/khiếu nại
SELECT id, status, budget, management_fee, total_amount FROM campaigns ORDER BY created_at DESC LIMIT 10;
SELECT campaign_id, koc_id, amount, status FROM campaign_allocations ORDER BY created_at DESC LIMIT 20;
SELECT id, status, quote_kol, quote_platform, quote_additional, total_amount, escrow_amount FROM kol_requests ORDER BY created_at DESC LIMIT 10;
SELECT id, booking_id, status, raised_by_role, admin_note FROM complaints ORDER BY created_at DESC LIMIT 10;
```

Với mỗi `journal_entry_id`, tổng `ledger_postings.amount` phải bằng `0`:

```sql
SELECT journal_entry_id, SUM(amount) AS net
FROM ledger_postings
GROUP BY journal_entry_id
HAVING SUM(amount) <> 0;
```

Kết quả mong đợi: không có dòng nào.

## 16. Regression tự động

Chạy trước khi bàn giao:

```powershell
npm.cmd test
npm.cmd --prefix front-end test
npm.cmd run build
```

Các test backend hiện có bao phủ adapter PostgreSQL, seed, thông báo, mạng xã hội, JWT, ngân hàng nhận tiền, PayOS Payout, SMTP và dữ liệu KOL. Test frontend hiện có kiểm tra danh sách kênh mạng xã hội.

## 17. Tiêu chí hoàn thành vòng test

Một bản build được xem là đạt khi:

- Tất cả smoke test pass.
- Không còn lỗi mức Blocker/Critical.
- Các luồng có tiền đều đối chiếu đúng `available`, `escrow`, KOC và phí nền tảng.
- Không có giải ngân, hoàn tiền, nạp tiền hoặc rút tiền trùng.
- Phân quyền API đúng cho KOC, Business và Admin.
- OTP và các tích hợp ngoài báo lỗi rõ ràng khi thiếu cấu hình.
- `npm.cmd test`, frontend test và `npm.cmd run build` đều pass.

## 18. Mẫu báo cáo lỗi

```text
Tiêu đề:
Môi trường / commit:
Test case ID:
Vai trò / tài khoản:
Điều kiện trước test:

Các bước tái hiện:
1.
2.
3.

Kết quả thực tế:
Kết quả mong đợi:
Mã booking/giao dịch:
Số dư trước/sau:
HTTP status và response:
Ảnh/video/log đính kèm:
Mức độ: Blocker / Critical / Major / Minor
```
