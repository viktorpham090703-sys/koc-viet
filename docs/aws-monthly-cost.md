# Chi phí AWS hàng tháng cho KOC Việt

## 1. Cấu hình đang tính

- EC2 `t4g.medium`: 2 vCPU, 4 GB RAM.
- EBS gp3: ổ đĩa 30 GB cho EC2.
- 1 Elastic IP/Public IPv4.
- RDS PostgreSQL `db.t4g.micro`, Single-AZ.
- Dung lượng RDS: 20–30 GB.
- S3 chỉ lưu ảnh KOC và doanh nghiệp.
- Video chỉ lưu đường link, không lưu file video trên S3.
- Frontend và backend chạy bằng Docker Compose trên EC2.

## 2. Số tiền phải trả mỗi tháng

Giá dưới đây được tính bằng USD, là ước tính tại region Singapore, chạy liên tục 24/7 và chưa bao gồm thuế.

| Dịch vụ | Dùng để làm gì? | Chi phí/tháng |
|---|---|---:|
| EC2 `t4g.medium` | Chạy website và backend | $30–$40 |
| EBS gp3 30 GB | Ổ đĩa của EC2 | $3–$4 |
| Elastic IP/Public IPv4 | Giữ IP cố định cho EC2 | Khoảng $3.65 |
| RDS PostgreSQL | Chạy database | $18–$30 |
| Ổ đĩa và backup RDS | Lưu dữ liệu và bản sao lưu | $3–$6 |
| S3 dưới 10 GB ảnh | Lưu avatar, logo và ảnh bìa | $0.25–$1 |
| GitHub Actions | Kiểm tra, build và triển khai | Thường $0 ở mức sử dụng ban đầu |
| **Tổng ước tính** | | **Khoảng $58–$85/tháng** |

Nên chuẩn bị ngân sách **$65–$95/tháng**. Phần dự phòng dùng cho lưu lượng mạng, log, snapshot và số lần tải ảnh.

## 3. Giải thích đơn giản

### EC2

EC2 giống như một máy tính thuê trên Internet. Máy này chạy frontend, backend, Nginx và Docker. Máy chạy cả tháng nên đây thường là khoản phí lớn nhất.

### EBS

EBS là ổ cứng gắn vào EC2. Nó chứa hệ điều hành, Docker image, mã ứng dụng và log. EBS vẫn có thể phát sinh phí khi EC2 đã tắt nếu ổ đĩa chưa được xóa.

### Elastic IP

Elastic IP là địa chỉ IP cố định để domain luôn trỏ đúng vào EC2. Khoản này tính riêng, không nằm trong giá EC2.

### RDS PostgreSQL

RDS là nơi lưu tài khoản, booking, số dư ví, escrow và các dữ liệu quan trọng. RDS đắt hơn PostgreSQL chạy chung trong Docker nhưng an toàn và dễ backup hơn. Với project có giao dịch tiền, nên giữ RDS riêng.

### S3

S3 chỉ lưu ảnh nên chi phí thấp. Database chỉ nên lưu đường dẫn hoặc object key của ảnh. Video được lưu dưới dạng link nên không tạo chi phí lưu video trên S3.

### GitHub Actions

GitHub Actions tự động kiểm tra, build Docker image và triển khai khi cập nhật mã nguồn. Với tần suất triển khai thấp, quota đi kèm tài khoản thường đủ. Nếu chạy workflow quá nhiều hoặc quá lâu thì GitHub có thể tính thêm phí; khoản đó không nằm trong hóa đơn AWS.

## 4. Số tiền dự kiến theo thời gian

Nếu cấu hình và lưu lượng không đổi:

| Thời gian | Chi phí hạ tầng ước tính | Ngân sách nên chuẩn bị |
|---|---:|---:|
| 1 tháng | $58–$85 | $65–$95 |
| 3 tháng | $174–$255 | $195–$285 |
| 6 tháng | $348–$510 | $390–$570 |
| 12 tháng | $696–$1,020 | $780–$1,140 |

Đây là phép nhân theo chi phí hàng tháng, chưa tính tăng người dùng hoặc nâng cấp máy.

## 5. Khi nào hóa đơn tăng?

Chi phí có thể tăng khi:

- Có nhiều người truy cập và tải ảnh hơn.
- Dung lượng ảnh trên S3 tăng.
- Log hoặc snapshot được giữ quá lâu.
- Database cần nâng từ `db.t4g.micro` lên máy lớn hơn.
- EC2 cần nâng từ 4 GB lên 8 GB RAM.
- Thêm Load Balancer, CloudFront, WAF hoặc máy EC2 thứ hai.
- Data transfer từ AWS ra Internet tăng.

## 6. Các khoản chưa được tính

- Thuế và phí thanh toán quốc tế.
- Mua và gia hạn tên miền.
- Dịch vụ gửi email hoặc OTP.
- Phí cổng thanh toán.
- Phí AI tạo Clone Avatar hoặc video.
- Chi phí nhân sự vận hành hệ thống.
- Phí GitHub Actions vượt quota của gói GitHub.

## 7. Kết luận ngắn

Mức ngân sách hợp lý để chạy project hiện tại là khoảng **$65–$95 mỗi tháng**.

Trong đó:

- Khoảng $37–$48 dành cho EC2, ổ đĩa và IP.
- Khoảng $21–$36 dành cho PostgreSQL RDS và backup.
- S3 lưu ảnh chỉ tốn một khoản nhỏ ở giai đoạn đầu.

Không nên bỏ RDS để tiết kiệm nếu hệ thống đã xử lý booking, ví và escrow thật.

## 8. Nguồn kiểm tra giá

- EC2: <https://aws.amazon.com/ec2/pricing/on-demand/>
- EBS: <https://aws.amazon.com/ebs/pricing/>
- Public IPv4: <https://aws.amazon.com/vpc/pricing/>
- RDS PostgreSQL: <https://aws.amazon.com/rds/postgresql/pricing/>
- S3: <https://aws.amazon.com/s3/pricing/>
- AWS Pricing Calculator: <https://calculator.aws/>

Giá AWS thay đổi theo region và thời điểm. Trước khi tạo tài nguyên thật, cần nhập lại cấu hình trên AWS Pricing Calculator để xem số tiền mới nhất.
