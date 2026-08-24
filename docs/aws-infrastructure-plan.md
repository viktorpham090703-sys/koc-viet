# Kế hoạch hạ tầng cho KOC Việt: AWS và phương án Viettel IDC

## 1. Phạm vi

Tài liệu này mô tả hạ tầng production của project KOC Việt theo hai trường hợp:

1. **Phương án hiện tại:** sử dụng AWS tại region Singapore.
2. **Phương án thay thế:** sử dụng Viettel IDC khi cơ quan chủ quản yêu cầu máy chủ và dữ liệu đặt tại Việt Nam.

Không triển khai đồng thời cả hai phương án. Quyết định cuối cùng phải căn cứ vào hợp đồng, yêu cầu kỹ thuật, phân loại dữ liệu và văn bản phê duyệt của đơn vị phụ trách CNTT thuộc cơ quan chủ quản.

Project hiện gồm:

- Frontend: React/Vite.
- Backend: Node.js/Express.
- Database: PostgreSQL.
- Ảnh: avatar, ảnh bìa, logo và ảnh hồ sơ của KOC/doanh nghiệp.
- Video: hệ thống chỉ lưu đường dẫn video, không tải và không lưu file video trên AWS S3.

Ba dịch vụ chính được sử dụng:

1. Amazon EC2 để chạy frontend, backend và Nginx bằng Docker.
2. Amazon RDS for PostgreSQL để lưu dữ liệu nghiệp vụ.
3. Amazon S3 để lưu ảnh của KOC và doanh nghiệp.

## 2. Kiến trúc đề xuất

### 2.1. Phương án hiện tại: AWS

```text
Người dùng
    |
    | HTTPS
    v
Elastic IP / Public IPv4
    |
    v
EC2 t4g.medium - 4 GB RAM
    |-- Docker Compose
    |    |-- Nginx phục vụ frontend React/Vite
    |    +-- Backend Node.js (không chứa PostgreSQL)
    |
    |-- Backend đọc/ghi ảnh qua S3
    |-- Backend đọc/ghi dữ liệu qua kết nối nội bộ
    |
    +--------------------> Amazon S3 (chỉ lưu ảnh)
    |
    +--------------------> Amazon RDS PostgreSQL
```

Video từ TikTok, Facebook, YouTube hoặc nền tảng khác chỉ được lưu dưới dạng URL trong PostgreSQL. File video không đi qua EC2 và không được lưu trong S3.

### 2.2. Phương án trong nước: Viettel IDC

Sử dụng phương án này khi có yêu cầu máy chủ, database, ảnh và backup phải được lưu trữ tại Việt Nam.

```text
Người dùng
    |
    | HTTPS
    v
Public IP
    |
    v
Viettel Cloud Server - 2 vCPU, 4 GB RAM
    |-- Docker Compose
    |    |-- Nginx phục vụ frontend React/Vite
    |    +-- Backend Node.js
    |
    |-- Backend đọc/ghi ảnh qua vCOS
    |-- Backend đọc/ghi dữ liệu qua Private Access
    |
    +--------------------> Viettel Cloud Object Storage (chỉ lưu ảnh)
    |
    +--------------------> Viettel Database Service PostgreSQL
```

Các dịch vụ tương đương:

| AWS hiện tại | Viettel IDC thay thế | Mục đích |
|---|---|---|
| EC2 `t4g.medium` | Viettel Cloud Server, 2 vCPU/4 GB RAM | Chạy Docker, frontend, backend và Nginx |
| EBS gp3 | SSD/Block Storage của Cloud Server | Ổ đĩa máy chủ |
| Elastic IP | Public IP | IP cố định để trỏ domain |
| RDS PostgreSQL | Viettel Database Service PostgreSQL | Database managed |
| Amazon S3 | Viettel Cloud Object Storage (`vCOS`) | Lưu ảnh |
| Security Group | vFirewall/Cloud Firewall | Kiểm soát truy cập mạng |
| ECR hoặc GHCR | Viettel Container Registry (`vCR`), tùy chọn | Lưu Docker image |

Cấu hình Viettel IDC cần yêu cầu:

- Cloud Server: 2 vCPU, 4 GB RAM, Ubuntu, SSD 30–50 GB và một Public IP.
- Database Service: PostgreSQL 15, 2 vCPU, 2 GB RAM, standalone, storage 20–30 GB.
- Database dùng Private Access, cùng VPC với Cloud Server và không public port 5432.
- Backup database hằng ngày, giữ tối thiểu 7 ngày.
- vCOS: bucket private, dự kiến dưới 10 GB ảnh.
- Backup, log và snapshot cũng phải lưu trong hạ tầng tại Việt Nam nếu hợp đồng yêu cầu.

Giá Viettel IDC không được giả định từ giá AWS. Phải lấy báo giá chính thức bao gồm Public IP, storage, băng thông, backup, SLA, hỗ trợ và thuế trước khi phê duyệt phương án.

## 3. Cấu hình dịch vụ

### 3.1. Amazon EC2

| Thuộc tính | Cấu hình đề xuất |
|---|---|
| Region | Singapore (`ap-southeast-1`) |
| Instance | `t4g.medium` |
| CPU/RAM | 2 vCPU, 4 GB RAM |
| Kiến trúc | ARM64/Graviton |
| Hệ điều hành | Ubuntu Server LTS ARM64 |
| Ổ đĩa | EBS gp3, 30 GB |
| Public IP | 1 Elastic IP/Public IPv4 |
| Phần mềm | Docker Engine, Docker Compose |

EC2 này chạy hai container chính:

- Container web: Nginx phục vụ bản build frontend và reverse proxy `/api`.
- Container backend: Node.js/Express API.

PostgreSQL **không chạy trong EC2 này** ở môi trường production. Với 4 GB RAM, tách database sang RDS giúp ứng dụng không tranh chấp bộ nhớ với PostgreSQL và tránh việc EC2 hỏng làm mất đồng thời website lẫn database.

`t4g.medium` là lựa chọn chính vì có 4 GB RAM và chi phí tốt. Trước khi triển khai cần bảo đảm package Node.js và Docker image, nếu có, hỗ trợ ARM64. Nếu có dependency chỉ hỗ trợ x86, sử dụng `t3.medium` với 2 vCPU và 4 GB RAM; chi phí sẽ cao hơn.

Elastic IP không nằm trong giá thuê EC2. AWS tính phí địa chỉ IPv4 công khai khoảng `$0.005/giờ`, tương đương khoảng `$3.65/tháng` khi dùng liên tục. Nên gắn Elastic IP vào EC2 để IP không thay đổi sau khi stop/start máy.

### 3.2. Amazon RDS for PostgreSQL

| Thuộc tính | Cấu hình khởi đầu |
|---|---|
| Engine | PostgreSQL |
| Instance | `db.t4g.micro` |
| Triển khai | Single-AZ |
| Storage | gp3, 20–30 GB |
| Backup tự động | 7 ngày |
| Public access | Tắt |
| Port | 5432 |

Quy tắc kết nối:

- RDS và EC2 đặt cùng VPC.
- Không mở cổng 5432 ra Internet.
- Security Group của RDS chỉ cho phép cổng 5432 từ Security Group của EC2.
- Backend dùng RDS endpoint trong `DATABASE_URL`, không dùng `localhost`.

Ví dụ cấu hình:

```env
DATABASE_URL=postgresql://app_user:STRONG_PASSWORD@RDS_ENDPOINT:5432/koc_viet
```

Không dùng tài khoản quản trị PostgreSQL cho ứng dụng. Tạo riêng `app_user` với đúng quyền cần thiết. Khi CPU, RAM hoặc số kết nối thường xuyên cao, nâng lên `db.t4g.small` mà không cần thay đổi mã nguồn.

### 3.3. Amazon S3

S3 chỉ lưu:

- Avatar KOC và doanh nghiệp.
- Ảnh bìa, logo.
- Ảnh hồ sơ hoặc ảnh nội dung mà hệ thống thực sự cần quản lý.

S3 không lưu:

- Video review.
- Video AI Clone Avatar.
- Video TikTok, Facebook hoặc YouTube.

Cấu hình đề xuất:

| Thuộc tính | Cấu hình |
|---|---|
| Storage class | S3 Standard |
| Block Public Access | Bật |
| Versioning | Bật nếu cần khôi phục ảnh bị ghi đè |
| Encryption | SSE-S3 |
| CORS | Chỉ cho phép domain frontend của hệ thống |

Backend nên lưu `object key` vào PostgreSQL, ví dụ `avatars/koc/123/avatar.webp`, thay vì lưu URL tạm thời. Việc upload dùng presigned URL hoặc đi qua backend. EC2 sử dụng IAM Role chỉ có quyền cần thiết trên bucket, không lưu AWS Access Key trong source code.

Nếu muốn ảnh có URL ổn định và tải nhanh, có thể bổ sung CloudFront sau. CloudFront là thành phần tùy chọn, chưa được tính vào cấu hình tối thiểu này.

## 4. Dự toán chi phí hàng tháng

Mức dưới đây là dự toán cho region Singapore, chạy khoảng 730 giờ/tháng, ít lưu lượng, trước thuế. Giá thực tế thay đổi theo region, lưu lượng, tỷ giá và bảng giá AWS tại thời điểm thanh toán.

| Hạng mục | Cấu hình | Ước tính/tháng |
|---|---|---:|
| EC2 | `t4g.medium`, chạy liên tục | $30–$40 |
| EBS | gp3, 30 GB | $3–$4 |
| Public IPv4 | 1 Elastic IP gắn với EC2 | khoảng $3.65 |
| RDS PostgreSQL | `db.t4g.micro`, Single-AZ | $18–$30 |
| RDS storage/backup | gp3, 20–30 GB | $3–$6 |
| S3 | Dưới 10 GB ảnh và ít request | $0.25–$1 |
| **Tổng hạ tầng chính** | | **$58–$85** |

Nên chuẩn bị ngân sách thực tế khoảng **$65–$95/tháng** để có biên cho data transfer, log và snapshot.

### So sánh với PostgreSQL chạy trong Docker

| Phương án | Ước tính/tháng | Phù hợp | Đánh giá |
|---|---:|---|---|
| EC2 4 GB + PostgreSQL Docker | $38–$53 | Demo, môi trường test, MVP chưa có giao dịch thật | Rẻ nhất nhưng chung một điểm lỗi, phải tự backup và 4 GB RAM khá sát |
| **EC2 4 GB + RDS PostgreSQL** | **$65–$95** | **Production có booking, ví và escrow** | **Phương án được chọn** |
| EC2 8 GB + PostgreSQL Docker | $57–$76 | Đội ngũ có khả năng tự vận hành database | Nhiều RAM hơn nhưng vẫn phải tự chịu trách nhiệm backup và khôi phục |

Chạy PostgreSQL trong Docker có thể tiết kiệm khoảng $20–$35/tháng, nhưng không phải lựa chọn hợp lý nhất cho dữ liệu ví và escrow. Khoản tiết kiệm này đổi lại các rủi ro:

- Website và database cùng ngừng khi EC2 gặp sự cố.
- Backend và PostgreSQL tranh chấp 4 GB RAM.
- Phải tự xây dựng, kiểm tra và giám sát backup.
- Phải tự vá lỗi, nâng phiên bản và phục hồi PostgreSQL.
- Việc mở rộng hoặc chuyển database sau này phức tạp hơn.

Vì vậy, cấu hình chính thức trong tài liệu vẫn là Docker cho ứng dụng trên EC2 và RDS cho PostgreSQL. PostgreSQL Docker chỉ nên dùng ở máy phát triển hoặc môi trường demo không chứa dữ liệu thật.

Các khoản chưa bao gồm:

- Thuế VAT và phí quy đổi ngoại tệ của ngân hàng.
- Tên miền.
- Dịch vụ gửi email/OTP.
- Phí cổng thanh toán.
- Phí dịch vụ AI tạo video/avatar.
- Data transfer ra Internet khi lưu lượng tăng cao.
- CloudFront, Load Balancer, WAF hoặc môi trường staging riêng.

## 5. Cổng mạng và bảo mật

### Security Group của EC2

| Cổng | Nguồn | Mục đích |
|---|---|---|
| 80 | `0.0.0.0/0`, `::/0` | HTTP, chuyển hướng sang HTTPS |
| 443 | `0.0.0.0/0`, `::/0` | Website và API HTTPS |
| 22 | Chỉ IP quản trị | SSH; không mở cho toàn Internet |

Không mở trực tiếp port backend như 3000 ra Internet. Nginx gọi backend qua Docker network nội bộ tại `backend:3000`.

### Security Group của RDS

| Cổng | Nguồn | Mục đích |
|---|---|---|
| 5432 | Security Group của EC2 | Kết nối PostgreSQL từ backend |

### Bí mật hệ thống

Các giá trị sau không được commit lên Git:

- `DATABASE_URL`.
- JWT secret.
- Mật khẩu database.
- API key email, thanh toán hoặc AI.

Giai đoạn đầu có thể đặt chúng trong file environment trên EC2 với quyền đọc hạn chế. Khi cần vận hành nghiêm túc hơn, chuyển sang AWS Systems Manager Parameter Store hoặc Secrets Manager.

## 6. Cấu hình Docker và ứng dụng production

Docker Compose trên EC2 chỉ gồm frontend/Nginx và backend. Không thêm service `postgres` trong file production.

Ví dụ cấu trúc:

```yaml
services:
  web:
    image: koc-viet-web
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend

  backend:
    image: koc-viet-backend
    env_file:
      - .env.production
    restart: unless-stopped
```

Không publish port backend ra Internet. Container `web` gọi backend thông qua Docker network nội bộ.

Ví dụ các biến môi trường chính:

```env
NODE_ENV=production
PORT=3000
FRONTEND_ORIGIN=https://ten-mien-cua-ban.vn
DATABASE_URL=postgresql://app_user:STRONG_PASSWORD@RDS_ENDPOINT:5432/koc_viet
AWS_REGION=ap-southeast-1
S3_IMAGE_BUCKET=koc-viet-images-production
```

Không khai báo `AWS_ACCESS_KEY_ID` và `AWS_SECRET_ACCESS_KEY` trên EC2 nếu đã gắn IAM Role đúng cách.

Nếu chuyển sang Viettel IDC, ứng dụng vẫn sử dụng `@aws-sdk/client-s3` nhưng phải cấu hình endpoint vCOS và Access Key do Viettel cấp:

```env
NODE_ENV=production
PORT=3000
FRONTEND_ORIGIN=https://ten-mien-cua-ban.vn
DATABASE_URL=postgresql://app_user:STRONG_PASSWORD@PRIVATE_VDBS_ENDPOINT:5432/koc_viet
S3_ENDPOINT=https://VCOS_ENDPOINT
S3_REGION=VCOS_REGION
S3_IMAGE_BUCKET=koc-viet-images-production
S3_ACCESS_KEY_ID=VCOS_ACCESS_KEY
S3_SECRET_ACCESS_KEY=VCOS_SECRET_KEY
```

Không ghi các Access Key này vào Git hoặc Docker image. Giá trị `endpoint`, `region`, chứng chỉ kết nối database và chế độ `forcePathStyle` phải được xác nhận theo cụm dịch vụ Viettel IDC thực tế.

Nginx trong container `web` phục vụ frontend tại `/` và chuyển các request `/api` tới container backend:

```text
/       -> frontend React/Vite đã build
/api/*  -> http://backend:3000
```

HTTPS trên mô hình một EC2 có thể dùng Nginx với Let's Encrypt. ACM không thể gắn trực tiếp chứng chỉ public vào một EC2; ACM thường cần Load Balancer hoặc CloudFront, làm tăng chi phí.

## 7. Sao lưu và giám sát trên AWS hiện tại

- Bật RDS automated backup trong 7 ngày.
- Tạo snapshot thủ công trước migration database lớn.
- Bật cảnh báo CloudWatch cho CPU EC2, CPU/RAM database, dung lượng RDS và lỗi ứng dụng.
- Giới hạn thời gian lưu log để tránh tăng chi phí không cần thiết.
- Bật S3 lifecycle để xóa ảnh tạm hoặc upload lỗi sau một khoảng thời gian xác định.
- Kiểm tra định kỳ khả năng khôi phục database từ backup, không chỉ kiểm tra rằng backup đã được tạo.

## 8. Trình tự triển khai AWS hiện tại

1. Chọn region Singapore và tạo VPC/subnet phù hợp.
2. Tạo RDS PostgreSQL, tắt Public Access và cấu hình backup.
3. Tạo S3 bucket ảnh, bật Block Public Access và encryption.
4. Tạo IAM Role cho EC2 với quyền giới hạn trên bucket ảnh.
5. Tạo EC2 `t4g.medium`, EBS gp3 30 GB và gắn Elastic IP.
6. Cài Docker Engine và Docker Compose trên EC2.
7. Build image frontend/backend, sau đó chạy bằng Docker Compose.
8. Cấu hình biến môi trường với RDS endpoint và S3 bucket.
9. Chạy migration database.
10. Cấu hình domain, HTTPS và CORS.
11. Kiểm tra đăng nhập, upload avatar, booking, ví/escrow, OTP và các luồng chính.
12. Bật backup, cảnh báo và theo dõi chi phí AWS Budget.

## 9. Khi nào cần nâng cấp AWS hiện tại

- Nâng EC2 lên `t4g.large` 8 GB RAM nếu RAM thường xuyên trên 75%, API chậm hoặc tiến trình bị restart do thiếu bộ nhớ.
- Nâng RDS lên `db.t4g.small` nếu database thường xuyên thiếu RAM, CPU cao hoặc có quá nhiều kết nối.
- Bổ sung CloudFront nếu số lượng ảnh và người dùng tăng hoặc cần tải ảnh nhanh ở nhiều khu vực.
- Bổ sung Application Load Balancer và EC2 thứ hai khi cần high availability; cấu hình hiện tại có một EC2 nên EC2 là single point of failure.
- Chuyển RDS sang Multi-AZ khi downtime database gây ảnh hưởng lớn tới hoạt động kinh doanh.

## 10. Cấu hình chốt và điều kiện chuyển đổi

### 10.1. Khi chưa có yêu cầu đặt máy chủ trong nước

| Dịch vụ | Lựa chọn chốt |
|---|---|
| Compute | EC2 `t4g.medium`, 2 vCPU, **4 GB RAM** |
| Disk | EBS gp3 30 GB |
| IP | 1 Elastic IP/Public IPv4, tính phí riêng |
| Database | RDS PostgreSQL `db.t4g.micro`, Single-AZ, 20–30 GB |
| Image storage | S3 Standard, private bucket |
| Video storage | Không lưu video; chỉ lưu URL trong PostgreSQL |
| Cách triển khai | Docker Compose trên EC2 |
| Web server | Nginx container |
| Backend | Node.js container |
| PostgreSQL Docker | Không dùng trong production |
| HTTPS | Let's Encrypt trên Nginx |
| Ngân sách | Khoảng $65–$95/tháng trước thuế |

### 10.2. Khi có yêu cầu đặt máy chủ hoặc dữ liệu tại Việt Nam

| Thành phần | Lựa chọn Viettel IDC |
|---|---|
| Compute | Viettel Cloud Server, 2 vCPU, **4 GB RAM** |
| Disk | SSD/Block Storage 30–50 GB |
| IP | Một Public IP cố định |
| Database | Viettel Database Service PostgreSQL 15, private access |
| Database mode | Standalone ở giai đoạn đầu; replication nếu hồ sơ yêu cầu HA |
| Image storage | Viettel Cloud Object Storage, private bucket |
| Video storage | Không lưu video; chỉ lưu URL trong PostgreSQL |
| Cách triển khai | Docker Compose trên Cloud Server |
| Container registry | GHCR nếu được phép; nếu không dùng Viettel Container Registry |
| CI/CD | GitHub Actions hoặc self-hosted runner theo chính sách của cơ quan chủ quản |
| Chi phí | Theo báo giá chính thức của Viettel IDC, không dùng dự toán AWS |

Không tự chuyển dữ liệu production sang Singapore hoặc chuyển về Việt Nam mà chưa có kế hoạch migration, backup, thời gian bảo trì và phê duyệt của cơ quan chủ quản.

## 11. Nguyên tắc để có thể chuyển từ AWS sang Viettel IDC

Mã nguồn phải tránh phụ thuộc cứng vào một nhà cung cấp:

- Database luôn kết nối qua `DATABASE_URL`.
- Lưu `object key` của ảnh trong PostgreSQL, không lưu URL tạm thời.
- S3 client nhận `endpoint`, `region`, bucket và credentials từ biến môi trường.
- Docker image không chứa secret hoặc cấu hình cloud cố định.
- Backup PostgreSQL phải được kiểm tra khôi phục trước khi chuyển production.
- Dùng DNS có TTL thấp trong thời gian migration để giảm thời gian chuyển hướng.
- Kiểm tra lại upload ảnh, presigned URL, đăng nhập, OTP, booking, ví và escrow sau khi chuyển.

Quy trình chuyển đổi ở mức tổng quát:

1. Tạo VPC, Cloud Server, vDBS và vCOS tại Viettel IDC.
2. Triển khai ứng dụng thử nghiệm bằng dữ liệu giả.
3. Sao chép ảnh từ S3 sang vCOS.
4. Backup RDS và restore vào Viettel Database Service.
5. Chạy kiểm thử và đối soát số dư, escrow, booking.
6. Tạm dừng ghi dữ liệu trong thời gian chuyển cuối cùng.
7. Đồng bộ phần dữ liệu phát sinh còn lại.
8. Chuyển DNS sang Public IP của Viettel Cloud Server.
9. Theo dõi log, hiệu năng và sai lệch dữ liệu.
10. Chỉ đóng tài nguyên AWS sau khi hết thời gian rollback đã được phê duyệt.

## 12. Tài liệu và nguồn kiểm tra

### AWS

- EC2 On-Demand: <https://aws.amazon.com/ec2/pricing/on-demand/>
- RDS for PostgreSQL: <https://aws.amazon.com/rds/postgresql/pricing/>
- Amazon S3: <https://aws.amazon.com/s3/pricing/>
- Public IPv4/Elastic IP: <https://aws.amazon.com/vpc/pricing/>
- Route 53 nếu sử dụng DNS AWS: <https://aws.amazon.com/route53/pricing/>

Trước khi tạo tài nguyên thật, nên nhập đúng region và cấu hình trên AWS Pricing Calculator để lấy giá mới nhất: <https://calculator.aws/>

### Viettel IDC

- Viettel Cloud Server: <https://viettelidc.com.vn/en/cloud-server>
- Viettel Database Service: <https://beta.viettelidc.com.vn/uploadimage/Root/root/VIETTEL-DATABASE-SERVICE2-3.pdf>
- Hướng dẫn IAM và vCOS: <https://cmp.viettelidc.com.vn/iam/docs/iam_guide.pdf>
- Danh sách dịch vụ và yêu cầu báo giá: <https://www.viettelidc.com.vn/en/Home/PriceList>

Tài liệu thao tác chi tiết và endpoint dịch vụ có thể chỉ xuất hiện trong cổng CMP sau khi tài khoản Viettel IDC được cấp.
