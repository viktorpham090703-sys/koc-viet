# Chuyển KOC Việt sang tài khoản AWS và server mới

## 1. Phạm vi cần chuyển

| Thành phần hiện tại | Thành phần ở tài khoản mới | Dữ liệu/cấu hình cần xử lý |
|---|---|---|
| EC2 | EC2 mới | Build frontend, backend, Nginx/Docker, biến môi trường và log cần giữ |
| EBS của EC2 | EBS mới | Chỉ sao chép dữ liệu ứng dụng nếu production đang lưu PostgreSQL trong Docker/EBS |
| Elastic IP/Public IPv4 | Elastic IP mới | Không chuyển được IP giữa hai tài khoản; phải cập nhật DNS |
| PostgreSQL Docker hoặc RDS | PostgreSQL/RDS mới | `pg_dump` rồi `pg_restore`; đây là dữ liệu nghiệp vụ quan trọng nhất |
| S3 identity bucket | S3 bucket mới | Sao chép toàn bộ prefix `private/identity/` và giữ nguyên object key |
| IAM Role/Policy | IAM Role/Policy mới | Tạo lại; không sao chép Access Key cũ |
| VPC/Security Group | VPC/Security Group mới | Tạo lại rule 80/443, SSH giới hạn IP và PostgreSQL chỉ từ app server |
| Route 53 hoặc DNS ngoài AWS | Bản ghi DNS mới | Trỏ `kocviet.com`/`www` tới IP mới sau khi kiểm thử |
| HTTPS | Chứng chỉ mới | Cấp lại Let's Encrypt trên server mới hoặc cấu hình ALB/CloudFront nếu dùng |
| CloudWatch/Budget | Alarm/Budget mới | Tạo lại vì chúng thuộc tài khoản AWS cũ |

`AWS Glue` không được project sử dụng và không cần chuyển. `Data Transfer` là loại
chi phí mạng, không phải tài nguyên cần sao chép. Các ảnh landing đang dùng Cloudinary;
chúng không nằm trong tài khoản AWS, nên không đổi nếu tài khoản Cloudinary vẫn còn hoạt động.

## 2. Dữ liệu đang nằm ở đâu

### PostgreSQL

PostgreSQL chứa tài khoản, hồ sơ KOC/doanh nghiệp, booking, chiến dịch, ví, ledger,
giao dịch, hợp đồng, lead và object key của giấy tờ định danh. Không được khởi tạo
server mới chỉ từ `database/postgresql_full.sql`, vì file đó không phải bản sao live mới nhất.

Xác định database production đang chạy ở đâu trước khi chuyển:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Mounts}}'
docker volume ls
printenv DATABASE_URL
```

- Nếu `DATABASE_URL` trỏ `localhost`, tên container hoặc private IP của EC2: database
  có khả năng nằm trong Docker volume/EBS trên EC2.
- Nếu host là endpoint dạng `*.rds.amazonaws.com`: database nằm trên RDS.

Trong cả hai trường hợp đều dùng logical backup `pg_dump`; snapshot EBS/RDS chỉ là
lớp rollback bổ sung, không thay thế việc test restore.

### S3

Backend lưu ảnh CCCD mặt trước, mặt sau và selfie ở prefix:

```text
private/identity/<koc-id>/...
```

PostgreSQL lưu object key, không lưu presigned URL. Vì vậy có thể đổi tên bucket bằng
`AWS_S3_IDENTITY_BUCKET` miễn là sao chép nguyên cấu trúc key. Bucket phải private,
bật Block Public Access và encryption. Dữ liệu này nhạy cảm; không công khai bucket.

### Secret và tích hợp

Sao chép an toàn sang secret store hoặc file environment có quyền hạn chế:

- `DATABASE_URL` (thay endpoint/user/password bằng database mới).
- `JWT_SECRET`: giữ nguyên nếu muốn token đăng nhập hiện tại tiếp tục hợp lệ; đổi secret
  nếu muốn buộc toàn bộ người dùng đăng nhập lại.
- `AWS_REGION` và `AWS_S3_IDENTITY_BUCKET`.
- PayOS keys, SMTP credentials và `EMAIL_FROM`.
- `FRONTEND_ORIGIN` và các callback/webhook đang đăng ký với nhà cung cấp thanh toán.

Không đưa secret vào Git, Docker image, ảnh chụp màn hình hoặc tài liệu bàn giao.
Không tái sử dụng IAM Access Key của tài khoản cũ; gắn IAM Role mới vào EC2.

## 3. Chuẩn bị tài khoản AWS mới

1. Bật MFA cho root, tạo IAM admin vận hành và AWS Budget.
2. Chọn cùng region `ap-southeast-1` nếu muốn đơn giản hóa độ trễ và sao chép dữ liệu.
3. Tạo VPC, subnet, Security Group và EC2 mới.
4. Tạo PostgreSQL đích:
   - Khuyến nghị production: RDS PostgreSQL private, automated backup tối thiểu 7 ngày.
   - Phương án tiết kiệm: PostgreSQL Docker trên EBS, nhưng phải tự backup và giám sát.
5. Tạo S3 bucket mới, Block Public Access, versioning và encryption.
6. Tạo IAM Role chỉ cho phép thao tác trên bucket/prefix cần thiết và gắn vào EC2.
7. Cài Docker/Nginx, deploy code nhưng chưa trỏ DNS.

Ví dụ environment trên server mới:

```dotenv
NODE_ENV=production
PORT=3000
FRONTEND_ORIGIN=https://kocviet.com
DATABASE_URL=postgresql://app_user:STRONG_PASSWORD@NEW_DATABASE_HOST:5432/koc_viet
JWT_SECRET=KEEP_OR_ROTATE_EXPLICITLY
AWS_REGION=ap-southeast-1
AWS_S3_IDENTITY_BUCKET=NEW_PRIVATE_BUCKET
AWS_S3_ENDPOINT=
AWS_S3_FORCE_PATH_STYLE=false
```

Trên AWS S3 thật, để trống `AWS_S3_ENDPOINT` và dùng IAM Role. Hai biến endpoint/path
style chỉ dành cho S3-compatible storage hoặc môi trường test.

## 4. Backup dữ liệu từ hệ thống cũ

Chạy trên máy có quyền kết nối database production và đọc bucket cũ:

```bash
export DATABASE_URL='postgresql://...OLD_DATABASE...'
export AWS_REGION='ap-southeast-1'
export AWS_S3_IDENTITY_BUCKET='OLD_BUCKET'
export AWS_PROFILE='old-account'
bash scripts/backup-production.sh
```

Backup mặc định nằm trong `migration-backups/<UTC timestamp>/`, đã được `.gitignore`.
Thư mục này có thể chứa CCCD/selfie nên phải mã hóa ổ đĩa, giới hạn quyền truy cập và
không tải lên nơi công cộng.

Trước lần backup cuối, nên tạo thêm snapshot RDS hoặc EBS để có đường rollback.

## 5. Restore vào tài khoản mới

Lệnh restore có thao tác `--clean` trên database đích và chỉ chạy khi truyền cờ xác nhận:

```bash
export TARGET_DATABASE_URL='postgresql://...NEW_DATABASE...'
export TARGET_AWS_S3_IDENTITY_BUCKET='NEW_BUCKET'
export TARGET_AWS_PROFILE='new-account'
bash scripts/restore-production.sh --confirm-target-replace migration-backups/<timestamp>
```

Sau restore, đặt `DATABASE_URL` và `AWS_S3_IDENTITY_BUCKET` của backend sang tài nguyên mới.
Không thay đổi object key trong PostgreSQL.

## 6. Kiểm tra trước khi chuyển DNS

1. `/health` trả `ok` và kết nối PostgreSQL thành công.
2. Đếm và đối chiếu các bảng quan trọng ở nguồn/đích:
   - `users`, `kocs`, `businesses`, `bookings`.
   - `wallet_accounts`, ledger/giao dịch và yêu cầu rút tiền.
   - hợp đồng, chiến dịch và lead.
3. Đối chiếu số object S3 trong `private/identity/`.
4. Đăng nhập bằng tài khoản test, mở dashboard và hồ sơ.
5. Kiểm tra signed URL ảnh định danh bằng tài khoản admin được phép.
6. Kiểm tra upload mới vào bucket mới.
7. Kiểm tra email, PayOS callback/webhook và một giao dịch sandbox/test.
8. Kiểm tra frontend, API, HTTPS, `kocviet.com` và `www`.

## 7. Cutover ít downtime

1. Trước 24 giờ, giảm TTL DNS xuống khoảng 300 giây.
2. Deploy và test server mới bằng host tạm hoặc file hosts.
3. Bật maintenance/read-only trên server cũ để không phát sinh hai nguồn ghi.
4. Chạy backup cuối và restore lại vào database mới.
5. Đồng bộ S3 lần cuối; `aws s3 sync` chỉ chuyển phần thay đổi.
6. Chạy checklist kiểm tra dữ liệu.
7. Đổi DNS sang Elastic IP mới và cập nhật webhook/callback nếu có URL/IP allowlist.
8. Theo dõi lỗi, database, thanh toán và upload trong ít nhất 24–48 giờ.

Không để ứng dụng cũ và mới cùng ghi vào hai database độc lập. Nếu cần rollback, dừng
ghi ở hệ thống mới trước, phục hồi dữ liệu phát sinh trong cửa sổ cutover rồi mới trỏ DNS về cũ.

## 8. Khi nào được xóa tài khoản/server cũ

Chỉ đóng tài nguyên cũ sau khi:

- Website mới ổn định và dữ liệu đã đối chiếu.
- Backup mới đã test restore thành công.
- Không còn callback, DNS hoặc job nền trỏ vào server cũ.
- Đã hết thời gian rollback nội bộ, khuyến nghị tối thiểu 7 ngày.
- Đã tải hóa đơn và lưu thông tin cần thiết từ tài khoản cũ.

Khi đóng, xóa/thu hồi IAM key cũ, snapshot không cần giữ và backup tạm chứa dữ liệu định
danh theo đúng chính sách lưu trữ dữ liệu của doanh nghiệp.
