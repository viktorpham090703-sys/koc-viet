# KOC Việt — Runbook chuyển server và vận hành production

> Cập nhật: 26/08/2026  
> Mục đích: ghi lại quá trình chuyển AWS account/server, cấu hình production hiện tại, cách triển khai và quy trình xử lý sự cố.  
> Không ghi private key, mật khẩu database, JWT secret, PayOS key, Brevo key hoặc AWS secret vào tài liệu này.

## 1. Sơ đồ production hiện tại

```text
Người dùng
   |
   | HTTPS 443
   v
Namecheap DNS
   |
   | kocviet.com -> 54.251.228.218
   | www.kocviet.com -> 301 -> kocviet.com
   v
AWS EC2 / Nginx
   |-- /                 -> front-end/dist
   |-- /api/*            -> 127.0.0.1:3000
   `-- /health           -> 127.0.0.1:3000/health
                              |
                              v
                         Node.js API / PM2
                           |          |
                           |          `-> S3 private qua IAM Role
                           v
                    PostgreSQL 17 Docker
```

## 2. Thông tin tài nguyên

### Tài khoản/server cũ — chỉ giữ tạm để rollback

| Thuộc tính | Giá trị |
|---|---|
| Instance name | `koc-viet-production` |
| Instance ID | `i-01e057567096c9ecf` |
| Region | `ap-southeast-1` |
| Elastic IP cũ | `3.1.146.117` |
| EBS | `vol-0d6d3cd4872771e7b`, 30 GiB |
| Snapshot rollback | `snap-0fa9926f3194c6574`, Completed |
| Database | PostgreSQL 17 Docker, database `koc_viet` |
| Trạng thái ứng dụng sau cutover | `koc-viet-api` phải giữ ở trạng thái stopped |

### Tài khoản/server mới — production hiện hành

| Thuộc tính | Giá trị |
|---|---|
| Instance name | `koc-viet-production` |
| Instance ID | `i-00b82dd40be6dd411` |
| Region | `ap-southeast-1` |
| Elastic IP | `54.251.228.218` |
| Private IP tại thời điểm tạo | `172.31.33.13` |
| OS | Ubuntu Server 24.04 LTS x86_64 |
| Instance type | `m7i-flex.large` |
| EBS | 30 GiB gp3 |
| Key pair | `key-koc-viet` |
| IAM Role | `KocVietProductionEc2Role` |
| S3 identity bucket | `kocviet-identity` |
| Domain | `kocviet.com` |
| DNS provider | Namecheap |

Security Group hiện cho phép:

| Port | Nguồn | Ghi chú |
|---|---|---|
| 22/TCP | `0.0.0.0/0` | Dùng cho GitHub Actions SSH; đây là điểm rủi ro của mô hình CI/CD hiện tại |
| 80/TCP | `0.0.0.0/0` | HTTP và redirect HTTPS |
| 443/TCP | `0.0.0.0/0` | HTTPS public |

## 3. Dữ liệu và backup đã thực hiện

### PostgreSQL

- Container: `koc-viet-postgres`
- Image: `postgres:17-alpine`
- Docker volume: `koc-viet-postgres-data`
- Mount dữ liệu: `/var/lib/postgresql/data`
- Database thực tế: `koc_viet` — dùng dấu gạch dưới, không phải `koc-viet`
- Bản final dump được tạo lúc `26/08/2026 14:00:27 GMT+7`
- Final dump SHA-256:

```text
fc07381fc723d6ac1a8d09063d638e82578c9136f3af8be7840c27ab52f9cde1
```

- Sau restore có 37 bảng public.

File `database/postgresql_full.sql` chỉ là dữ liệu khởi tạo container lần đầu. Không dùng file này thay cho backup production mới nhất.

### S3

Bucket cũ có 6 ảnh trong `private/identity/`. Theo quyết định khi migration, dữ liệu ảnh cũ không được sao chép; người dùng liên quan có thể phải tải lại.

Bucket mới:

```text
s3://kocviet-identity/private/identity/<koc-id>/...
```

Cấu hình bắt buộc:

- Block all public access: bật.
- ACL disabled.
- Versioning: bật.
- Encryption: SSE-S3.
- Backend truy cập bằng IAM Role, không dùng Access Key dài hạn.

IAM inline policy chỉ cho phép `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` trong:

```text
arn:aws:s3:::kocviet-identity/private/identity/*
```

## 4. Các bước migration đã thực hiện

1. Kiểm kê EC2, EBS, Elastic IP, Security Group, key pair, PostgreSQL và S3 cũ.
2. Tạo EBS snapshot trên account cũ.
3. Dừng ghi dữ liệu ở server cũ trước lần backup cuối.
4. Tạo `pg_dump` custom format và kiểm tra bằng `pg_restore -l`.
5. Kiểm tra SHA-256 ở server cũ, Windows và server mới.
6. Tạo EC2 Ubuntu 24.04, `m7i-flex.large`, EBS 30 GiB gp3 trên account mới.
7. Tạo và gắn Elastic IP `54.251.228.218`.
8. Cài Docker Engine, Docker Compose, Node.js 22, PM2, Nginx và Certbot.
9. Chuyển source bằng tar/SCP, không chuyển `.env`, `.git`, `node_modules` và `dist`.
10. Tạo PostgreSQL container, restore final dump và kiểm tra 37 bảng.
11. Chuyển `back-end/.env`, cập nhật `DATABASE_URL`, `FRONTEND_ORIGIN`, S3 bucket và bỏ AWS Access Key cũ.
12. Tạo IAM Role cho EC2, kiểm tra Put/Get/Delete object trên S3.
13. Build backend/frontend và chạy API bằng PM2.
14. Cấu hình Nginx, cấp Let's Encrypt cho domain và bật Certbot timer.
15. Đổi DNS Namecheap sang IP mới.
16. Cấu hình `www` redirect 301 về domain gốc.
17. Cập nhật GitHub Actions để deploy qua SSH vào server mới.

## 5. Vị trí file quan trọng trên server

```text
/var/www/koc-viet/                         Source production
/var/www/koc-viet/.env                    Biến PostgreSQL Docker
/var/www/koc-viet/back-end/.env           Secret/config backend
/var/www/koc-viet/back-end/dist/          Backend build
/var/www/koc-viet/front-end/dist/         Frontend build
/var/www/koc-viet/compose.yaml             PostgreSQL compose
/etc/nginx/sites-available/koc-viet        Nginx domain chính
/etc/nginx/sites-available/koc-viet-www-redirect
/etc/letsencrypt/live/kocviet.com/         Chứng chỉ SSL
/home/ubuntu/.pm2/                         PM2 state và log
/var/lib/docker/volumes/koc-viet-postgres-data/_data
```

Quyền file environment nên là:

```bash
chmod 600 /var/www/koc-viet/.env
chmod 600 /var/www/koc-viet/back-end/.env
```

## 6. Vận hành thường ngày

### Kiểm tra nhanh toàn hệ thống

```bash
uptime
df -h /
free -h
pm2 list
docker compose -f /var/www/koc-viet/compose.yaml ps
sudo systemctl is-active nginx
curl -fsS http://127.0.0.1:3000/health
curl -fsS -H 'Host: kocviet.com' http://127.0.0.1/health
curl -I https://kocviet.com
```

### Khởi động lại từng thành phần

Backend:

```bash
pm2 restart koc-viet-api
pm2 save
```

PostgreSQL:

```bash
cd /var/www/koc-viet
docker compose restart postgres
docker compose ps
```

Nginx — luôn test trước khi reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Reboot EC2 an toàn

```bash
sudo reboot
```

Sau khi kết nối lại:

```bash
pm2 list
docker compose -f /var/www/koc-viet/compose.yaml ps
sudo systemctl is-active nginx
curl -fsS https://kocviet.com/health
```

## 7. Log và lệnh truy xuất lỗi

### Tổng quan tài nguyên

```bash
uptime
df -h
df -i
free -h
top
sudo dmesg -T | tail -n 100
```

### Backend/PM2

```bash
pm2 list
pm2 describe koc-viet-api
pm2 logs koc-viet-api --lines 100 --nostream
tail -n 100 /home/ubuntu/.pm2/logs/koc-viet-api-error.log
tail -n 100 /home/ubuntu/.pm2/logs/koc-viet-api-out.log
ss -lntp | grep ':3000'
curl -v http://127.0.0.1:3000/health
```

Nếu API offline:

```bash
cd /var/www/koc-viet/back-end
npm run build
pm2 restart koc-viet-api --update-env
pm2 save
```

Không chạy `cat back-end/.env` khi đang chia sẻ màn hình hoặc log.

### PostgreSQL/Docker

```bash
cd /var/www/koc-viet
docker compose ps
docker logs koc-viet-postgres --tail 100
docker inspect koc-viet-postgres --format '{{json .State.Health}}'
docker exec koc-viet-postgres pg_isready -U postgres -d koc_viet
docker exec koc-viet-postgres psql -U postgres -d koc_viet -Atc "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';"
docker exec koc-viet-postgres psql -U postgres -d koc_viet -c "SELECT pg_size_pretty(pg_database_size('koc_viet'));"
docker system df
```

Không chạy:

```text
docker compose down -v
docker volume rm koc-viet-postgres-data
```

Hai lệnh trên có thể xóa database.

### Nginx/HTTP

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo journalctl -u nginx --since '30 minutes ago' --no-pager
sudo tail -n 100 /var/log/nginx/error.log
sudo tail -n 100 /var/log/nginx/access.log
curl -v -H 'Host: kocviet.com' http://127.0.0.1/health
curl -I https://kocviet.com
curl -I https://www.kocviet.com
```

Kết quả đúng:

- `https://kocviet.com`: 200.
- `https://www.kocviet.com`: 301 tới `https://kocviet.com/...`.
- `/health`: JSON `{"ok":true,"database":"postgresql"}`.

### SSL/Certbot

```bash
sudo certbot certificates
systemctl status certbot.timer --no-pager
sudo certbot renew --dry-run
sudo journalctl -u certbot --since '7 days ago' --no-pager
```

Nếu renewal thành công nhưng Nginx chưa nhận certificate:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### DNS

Trên Windows PowerShell:

```powershell
nslookup kocviet.com 1.1.1.1
nslookup www.kocviet.com 1.1.1.1
nslookup kocviet.com 8.8.8.8
```

Kết quả phải quy về `54.251.228.218`.

### S3/IAM Role

Kiểm tra EC2 đã nhận role:

```bash
TOKEN="$(curl -sS -X PUT -H 'X-aws-ec2-metadata-token-ttl-seconds: 21600' http://169.254.169.254/latest/api/token)"
curl -sS -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/iam/security-credentials/
unset TOKEN
```

Kết quả phải là `KocVietProductionEc2Role`.

Kiểm tra backend không còn static AWS key:

```bash
grep -E '^(AWS_REGION|AWS_S3_IDENTITY_BUCKET)=' /var/www/koc-viet/back-end/.env
grep -E '^AWS_(ACCESS_KEY_ID|SECRET_ACCESS_KEY)=' /var/www/koc-viet/back-end/.env
```

Lệnh thứ hai không được trả dòng nào.

Nếu upload S3 báo `AccessDenied`, kiểm tra:

1. IAM Role có gắn vào đúng EC2.
2. ARN policy đúng bucket `kocviet-identity` và prefix `private/identity/*`.
3. `.env` dùng `AWS_REGION=ap-southeast-1` và `AWS_S3_IDENTITY_BUCKET=kocviet-identity`.
4. Không tắt Block Public Access để xử lý lỗi IAM.

### Email/PayOS

Chỉ kiểm tra tên biến, không in giá trị:

```bash
grep -E '^(BREVO|EMAIL|PAYOS)_[A-Z0-9_]*=' /var/www/koc-viet/back-end/.env | cut -d= -f1
pm2 logs koc-viet-api --lines 200 --nostream | grep -iE 'brevo|email|smtp|payos|webhook|payment|error'
```

Khi callback thanh toán lỗi, kiểm tra thêm DNS, HTTPS, URL callback trong PayOS và thời gian hệ thống:

```bash
timedatectl
curl -I https://kocviet.com
```

## 8. CI/CD GitHub Actions

Workflow:

```text
.github/workflows/deploy-production.yml
```

Trigger:

- Push vào `main`.
- Chạy thủ công bằng `workflow_dispatch`.

Pipeline:

1. Checkout.
2. Cài dependency, test và build trên GitHub runner.
3. Đóng gói source, không gồm `.git`, `.env`, `node_modules`, `dist`.
4. SCP artifact vào EC2.
5. `rsync` source vào `/var/www/koc-viet` nhưng giữ `.env`, `node_modules`, `dist`.
6. Bật PostgreSQL, cài dependency và build trên EC2.
7. PM2 reload, health check, Nginx test/reload.

GitHub Environment `production` cần các secret:

| Secret | Nội dung |
|---|---|
| `EC2_HOST` | `54.251.228.218` |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Private key của key pair mới |
| `EC2_KNOWN_HOSTS` | Dòng ED25519 known-host của `54.251.228.218` |

Không đặt secret thật trong workflow hoặc repository.

### CI/CD lỗi ở Configure SSH

- `Permission denied (publickey)`: sai `EC2_SSH_KEY`, `EC2_USER` hoặc key pair không khớp instance.
- `Host key verification failed`: `EC2_KNOWN_HOSTS` sai hoặc Elastic IP đã đổi.
- `Connection timed out`: kiểm tra EC2 running, Elastic IP association và Security Group port 22.

Lấy lại known host trên Windows sau khi đã SSH thủ công và xác minh fingerprint:

```powershell
$knownHost = ssh-keygen -F '54.251.228.218' -f "$env:USERPROFILE\.ssh\known_hosts" | Where-Object { $_ -match ' ssh-ed25519 ' }
$knownHost | Set-Content "$env:TEMP\kocviet-known-hosts" -Encoding ascii
ssh-keygen -lf "$env:TEMP\kocviet-known-hosts"
Get-Content "$env:TEMP\kocviet-known-hosts" -Raw | Set-Clipboard
```

Fingerprint ED25519 đã xác minh lúc tạo server:

```text
SHA256:8EalxiLOja36SiHjFKkGsKQZZPh0ILFRhOS0kurn67Y
```

### CI/CD lỗi ở Upload application

```bash
df -h /
ls -lh /home/ubuntu/koc-viet-release.tar.gz
sudo journalctl -u ssh --since '30 minutes ago' --no-pager
```

### CI/CD lỗi ở Deploy application

Kiểm tra thủ công:

```bash
rsync --version | head -n 1
node --version
npm --version
docker --version
docker compose version
pm2 list
pm2 logs koc-viet-api --lines 100 --nostream
sudo nginx -t
```

Workflow không cập nhật `.env`. Khi thêm biến môi trường mới, phải cập nhật thủ công file `/var/www/koc-viet/back-end/.env`, đặt quyền 600 rồi restart PM2 với `--update-env`.

## 9. Quy trình backup định kỳ

Tạo thư mục và backup:

```bash
backup_dir="/home/ubuntu/koc-viet-backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
docker exec koc-viet-postgres pg_dump -U postgres -d koc_viet -Fc > "$backup_dir/postgresql.dump"
sha256sum "$backup_dir/postgresql.dump" > "$backup_dir/postgresql.dump.sha256"
chmod 600 "$backup_dir/postgresql.dump" "$backup_dir/postgresql.dump.sha256"
docker exec -i koc-viet-postgres pg_restore -l < "$backup_dir/postgresql.dump" | head
sha256sum -c "$backup_dir/postgresql.dump.sha256"
```

Backup chỉ nằm cùng EBS chưa đủ an toàn. Phải định kỳ tải bản dump ra thiết bị khác hoặc đẩy vào kho backup private/encrypted.

## 10. Restore database

> `--clean` thay thế object hiện có trong database đích. Luôn kiểm tra đúng server, đúng database và có backup trước khi chạy.

```bash
pm2 stop koc-viet-api
docker exec -i koc-viet-postgres pg_restore \
  -U postgres \
  -d koc_viet \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  < /duong-dan/toi/postgresql.dump \
  2> /home/ubuntu/pg-restore.log
```

Kiểm tra:

```bash
echo $?
cat /home/ubuntu/pg-restore.log
docker exec koc-viet-postgres psql -U postgres -d koc_viet -Atc "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public';"
pm2 start koc-viet-api
pm2 save
curl -fsS http://127.0.0.1:3000/health
```

## 11. Quy trình rollback về server cũ

Chỉ rollback khi server mới gặp lỗi nghiêm trọng không thể sửa nhanh.

1. Dừng ghi trên server mới:

```bash
pm2 stop koc-viet-api
```

2. Backup dữ liệu phát sinh trên server mới trước khi đổi DNS.
3. Xác định cách đưa phần dữ liệu mới về server cũ; không đổi DNS ngay nếu chưa xử lý chênh lệch dữ liệu.
4. Trên server cũ, kiểm tra PostgreSQL và bật API:

```bash
docker ps
docker exec koc-viet-postgres pg_isready -U postgres -d koc_viet
pm2 start koc-viet-api
pm2 save
curl -fsS http://127.0.0.1:3000/health
```

5. Tại Namecheap đổi A record `@` về `3.1.146.117`; giữ `www` là CNAME tới `kocviet.com`.
6. Kiểm tra DNS công cộng và HTTPS.
7. Không cho cả hai server cùng ghi vào hai database độc lập.

Nếu server cũ bị mất nhưng snapshot còn, dùng snapshot `snap-0fa9926f3194c6574` để tạo volume/AMI phục hồi trong account cũ.

## 12. Xử lý theo triệu chứng

### Website không mở

1. Kiểm tra DNS.
2. Kiểm tra EC2 `Running`, status `2/2` và Elastic IP association.
3. Kiểm tra Security Group 80/443.
4. Kiểm tra Nginx và certificate.
5. Kiểm tra disk đầy.

### Frontend mở nhưng API lỗi

1. `pm2 list`.
2. `curl http://127.0.0.1:3000/health`.
3. `pm2 logs`.
4. Kiểm tra PostgreSQL healthy.
5. Kiểm tra `DATABASE_URL` nhưng không in mật khẩu ra chat/log.

### API báo lỗi database

1. Kiểm tra container và volume.
2. Kiểm tra `pg_isready`.
3. Kiểm tra dung lượng đĩa/inode.
4. Đọc Docker log.
5. Chỉ restore khi đã xác nhận database hỏng hoặc mất dữ liệu.

### Upload ảnh lỗi

1. Kiểm tra IAM Role gắn đúng EC2.
2. Kiểm tra S3 policy/prefix.
3. Kiểm tra bucket/region trong `.env`.
4. Xem PM2 error log.
5. Không public bucket để chữa lỗi.

### Deploy lỗi nhưng website vẫn đang chạy

Không restart ngẫu nhiên. Đọc log GitHub Actions và PM2 trước. Workflow giữ `dist` hiện hành trong giai đoạn đồng bộ source, nhưng build frontend có thể thay đổi `dist`; nếu cần phục hồi nhanh, deploy lại commit tốt gần nhất bằng `workflow_dispatch` hoặc checkout/revert commit rồi push.

### Disk đầy

```bash
df -h
docker system df
sudo du -xhd1 /var /home /var/www 2>/dev/null | sort -h
journalctl --disk-usage
```

Không chạy `docker system prune -a` khi chưa kiểm tra image/container/volume cần giữ.

## 13. Dọn tài nguyên cũ

Chỉ dọn sau khi production mới ổn định qua thời gian rollback đã thống nhất:

1. Tải hóa đơn và kiểm tra callback/webhook không còn dùng IP cũ.
2. Giữ ít nhất một PostgreSQL dump đã kiểm tra checksum ngoài server.
3. Quyết định thời hạn giữ snapshot cũ.
4. Vô hiệu hóa/xóa AWS Access Key cũ.
5. Xóa bản sao tạm `backend-production.env` sau khi đã có phương án quản lý secret an toàn.
6. Terminate EC2 cũ và kiểm tra EBS/Elastic IP không còn phát sinh phí ngoài ý muốn.
7. Chỉ đóng account cũ sau khi xác nhận không còn tài nguyên cần dùng.

## 14. Nguyên tắc an toàn

- Không gửi `.pem`, `.env`, database URL hoặc API secret qua chat.
- Không commit secret vào Git.
- Không tắt S3 Block Public Access cho bucket identity.
- Không mở PostgreSQL 5432 trong Security Group.
- Không chạy `docker compose down -v` trên production.
- Không terminate server/volume khi chưa có backup ngoài server.
- Luôn chạy `sudo nginx -t` trước khi reload Nginx.
- Luôn dừng nguồn ghi trước final backup/restore/cutover.
- Khi rollback, phải xử lý dữ liệu mới phát sinh trước khi đổi DNS.

## 15. Tăng dung lượng và thêm dữ liệu

### Dữ liệu nào đi vào đâu

| Loại dữ liệu | Nơi lưu | Có làm đầy EBS không? |
|---|---|---|
| Tài khoản, booking, ví, giao dịch, hồ sơ | PostgreSQL Docker volume | Có |
| Ảnh CCCD/selfie mới | S3 `kocviet-identity` | Không |
| Source, frontend/backend build | EBS | Có, nhưng tăng chậm |
| Docker image/container/log | EBS | Có |
| PostgreSQL dump lưu trên EC2 | EBS | Có |

Không tải file nghiệp vụ lớn trực tiếp vào `/var/www` hoặc database nếu có thể lưu object trong S3. Dữ liệu nghiệp vụ bình thường được thêm qua ứng dụng/API; không chép trực tiếp file vào Docker volume PostgreSQL.

### Theo dõi dung lượng

```bash
df -h /
df -i /
docker system df
sudo du -xhd1 /var/lib/docker /var/www /home/ubuntu 2>/dev/null | sort -h
docker exec koc-viet-postgres psql -U postgres -d koc_viet -c "SELECT pg_size_pretty(pg_database_size('koc_viet'));"
```

Ngưỡng vận hành đề xuất:

- Dưới 70%: bình thường.
- 70–80%: kiểm tra log, backup và Docker image cũ.
- Trên 80%: lên kế hoạch mở rộng EBS.
- Trên 90%: xử lý ngay; PostgreSQL có thể lỗi nếu hết chỗ ghi.

### Mở rộng EBS hiện tại

EBS có thể tăng dung lượng mà không tạo lại EC2. Không thể giảm trực tiếp dung lượng EBS hiện hành.

1. Tạo snapshot của root volume trước khi thay đổi.
2. Vào `EC2 → Instances → koc-viet-production → Storage`, mở Volume ID.
3. Chọn `Actions → Modify volume`.
4. Tăng `Size` từ 30 GiB lên mức cần thiết, ví dụ 50 hoặc 100 GiB; giữ `gp3` và IOPS mặc định nếu chưa có nhu cầu đặc biệt.
5. Chờ volume vào trạng thái `optimizing` hoặc `completed`.
6. Trên server, xác định thiết bị và filesystem thật trước khi resize:

```bash
findmnt -no SOURCE,FSTYPE,SIZE,USED,AVAIL /
lsblk -f
df -hT /
```

Ubuntu EC2 hiện thường trả root partition dạng `/dev/nvme0n1p1` với filesystem `ext4`, nhưng phải dùng kết quả thực tế của máy thay vì đoán.

Nếu root đúng là `/dev/nvme0n1p1` và filesystem là `ext4`:

```bash
sudo apt install -y cloud-guest-utils
sudo growpart /dev/nvme0n1 1
sudo resize2fs /dev/nvme0n1p1
df -hT /
```

Nếu filesystem là XFS, không chạy `resize2fs`; dùng:

```bash
sudo growpart /dev/nvme0n1 1
sudo xfs_growfs -d /
df -hT /
```

Nếu tên thiết bị khác, thay `/dev/nvme0n1` và số partition bằng kết quả `lsblk`. Không chạy lệnh resize lên thiết bị chưa xác định. AWS yêu cầu mở rộng partition/filesystem sau khi tăng EBS để Linux sử dụng phần dung lượng mới.

### Khi nào nên thêm EBS thứ hai

Thêm volume riêng khi muốn tách backup, log hoặc dữ liệu dung lượng lớn khỏi root volume. Quy trình tổng quát:

1. Tạo EBS gp3 cùng Availability Zone với EC2.
2. Attach vào instance.
3. Xác định đúng disk mới bằng `lsblk`.
4. Format chỉ disk mới chưa có dữ liệu, tạo mount point và mount bằng UUID trong `/etc/fstab`.
5. Test `sudo mount -a` trước khi reboot.

Không format disk nếu chưa xác nhận đó là volume mới. Không tự chuyển Docker volume PostgreSQL sang EBS thứ hai trong lúc ứng dụng đang chạy; phải có maintenance window, backup và quy trình copy/restore riêng.

### S3 tăng dung lượng như thế nào

S3 tự mở rộng, không cần resize trước. Ứng dụng chỉ cần tiếp tục upload đúng bucket/prefix. Theo dõi số object và chi phí trong S3/Billing; đặt lifecycle cho version cũ nếu dung lượng tăng mạnh nhưng phải phù hợp chính sách lưu trữ hồ sơ định danh.
