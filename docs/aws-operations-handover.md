# KOC Việt — Biên bản thao tác AWS và tài liệu bàn giao vận hành

> Cập nhật: 11/09/2026  
> Phạm vi: production `kocviet.com` trên AWS Singapore (`ap-southeast-1`).  
> Mục đích: ghi lại những việc đã thực hiện, trạng thái hạ tầng, cách vận hành, sao lưu, triển khai và bàn giao quyền quản trị.

## 1. Quy tắc bảo mật khi dùng tài liệu này

Tài liệu không chứa và không được bổ sung các giá trị sau:

- Private key `.pem` hoặc nội dung GitHub secret.
- Mật khẩu PostgreSQL, `DATABASE_URL` đầy đủ, JWT secret.
- Khóa PayOS, Brevo/email, OAuth hoặc AWS Access Key.
- Dữ liệu định danh người dùng, ảnh CCCD/selfie hoặc bản database dump.

Secret phải được chuyển qua kênh quản lý mật khẩu được phê duyệt, không gửi qua Git, chat hoặc email thông thường. Người nhận bàn giao phải đổi/rotate secret phù hợp sau khi tiếp nhận.

## 2. Nguồn sự thật và phạm vi xác minh

Tài liệu này được tổng hợp từ:

- Cấu hình production và lịch sử migration trong `docs/production-operations-runbook.md`.
- Kế hoạch chuyển account trong `docs/aws-account-migration.md`.
- Workflow đang dùng tại `.github/workflows/deploy-production.yml`.
- Cấu hình PostgreSQL tại `compose.yaml`.
- Các thao tác và kết quả kiểm tra production đã ghi nhận đến ngày 10/09/2026.

Lưu ý quan trọng:

- Production thực tế hiện dùng PostgreSQL 17 chạy trong Docker trên cùng EC2.
- `docs/aws-infrastructure-plan.md` và `docs/aws-monthly-cost.md` có phần mô tả phương án dự kiến dùng RDS và cấu hình máy khác; không dùng hai tài liệu đó để kết luận trạng thái production hiện hành.
- Các giá trị trạng thái động như EC2 đang `Running`, dung lượng đĩa, ngày hết hạn SSL, backup gần nhất và AWS Billing phải được kiểm tra lại trực tiếp khi bàn giao.

## 3. Kiến trúc production hiện hành

```text
Người dùng
   |
   | HTTPS 443
   v
Namecheap DNS
   |-- kocviet.com     -> 54.251.228.218
   `-- www.kocviet.com -> 301 -> https://kocviet.com
                             |
                             v
                     AWS EC2 / Nginx
                       |-- /       -> front-end/dist
                       |-- /api/*  -> 127.0.0.1:3000
                       `-- /health -> 127.0.0.1:3000/health
                                            |
                                            v
                                     Node.js API / PM2
                                       |           |
                                       |           `-> S3 private qua IAM Role
                                       v
                              PostgreSQL 17 / Docker volume
```

Đây là mô hình một EC2, do đó EC2 và EBS hiện là điểm lỗi đơn. Database không nằm trên RDS.

## 4. Kiểm kê tài nguyên AWS

### 4.1. Production hiện hành

| Thành phần | Giá trị đã ghi nhận |
|---|---|
| AWS Region | `ap-southeast-1` — Singapore |
| EC2 name | `koc-viet-production` |
| Instance ID | `i-00b82dd40be6dd411` |
| Instance type | `m7i-flex.large` |
| OS | Ubuntu Server 24.04 LTS x86_64 |
| Elastic IP | `54.251.228.218` |
| Private IP lúc tạo | `172.31.33.13` |
| Root EBS | 30 GiB, gp3 |
| EC2 key pair | `key-koc-viet` |
| IAM Role | `KocVietProductionEc2Role` |
| S3 bucket | `kocviet-identity` |
| Domain | `kocviet.com` |
| DNS provider | Namecheap |
| Backend process | PM2: `koc-viet-api` |
| PostgreSQL container | `koc-viet-postgres` |
| PostgreSQL image | `postgres:17-alpine` |
| Database | `koc_viet` |
| Docker volume | `koc-viet-postgres-data` |

### 4.2. Security Group đã ghi nhận

| Port | Source | Mục đích |
|---|---|---|
| `22/TCP` | `0.0.0.0/0` | SSH và GitHub Actions; cần siết lại khi đổi phương án CI/CD |
| `80/TCP` | `0.0.0.0/0` | HTTP và redirect sang HTTPS |
| `443/TCP` | `0.0.0.0/0` | Website/API HTTPS |

Không mở PostgreSQL `5432` hoặc backend `3000` ra Internet. Việc SSH đang mở toàn Internet là rủi ro đã biết; bù lại hệ thống chỉ cho đăng nhập bằng key. Nên chuyển CI/CD sang runner/IP cố định, AWS Systems Manager Session Manager hoặc cơ chế không cần mở SSH toàn Internet.

### 4.3. Server/account cũ dùng cho rollback

| Thành phần | Giá trị đã ghi nhận |
|---|---|
| EC2 name | `koc-viet-production` |
| Instance ID | `i-01e057567096c9ecf` |
| Elastic IP cũ | `3.1.146.117` |
| EBS cũ | `vol-0d6d3cd4872771e7b`, 30 GiB |
| Snapshot rollback | `snap-0fa9926f3194c6574` |
| Trạng thái ứng dụng sau cutover | PM2 `koc-viet-api` phải giữ `stopped` |

Phải kiểm tra trực tiếp account cũ trước khi kết luận các tài nguyên này còn tồn tại. Không bật đồng thời hai server ghi vào hai database độc lập.

## 5. Các thao tác AWS/migration đã thực hiện

### 5.1. Chuyển account và server production

Các bước đã được thực hiện trong đợt chuyển production ngày 26/08/2026:

1. Kiểm kê EC2, EBS, Elastic IP, Security Group, key pair, PostgreSQL và S3 ở account cũ.
2. Tạo snapshot EBS để có đường rollback.
3. Dừng nguồn ghi trên server cũ trước lần backup cuối.
4. Tạo PostgreSQL dump dạng custom bằng `pg_dump -Fc`.
5. Kiểm tra nội dung dump bằng `pg_restore -l` và đối chiếu SHA-256 qua các điểm truyền file.
6. Tạo EC2 Ubuntu 24.04 `m7i-flex.large`, EBS gp3 30 GiB trên account mới.
7. Tạo và gắn Elastic IP `54.251.228.218`.
8. Cài Docker Engine, Docker Compose, Node.js 22, PM2, Nginx và Certbot.
9. Chuyển source bằng tar/SCP; không chuyển `.git`, `.env`, `node_modules` và `dist`.
10. Khởi tạo PostgreSQL container và Docker volume.
11. Restore final database dump; sau restore đã kiểm tra có 37 bảng public.
12. Chuyển cấu hình `back-end/.env`, cập nhật database, frontend origin và bucket S3.
13. Bỏ AWS Access Key tĩnh khỏi backend.
14. Tạo/gắn IAM Role cho EC2 và kiểm tra quyền Put/Get/Delete đúng prefix S3.
15. Build frontend/backend, chạy API bằng PM2.
16. Cấu hình Nginx làm web server/reverse proxy.
17. Cấp chứng chỉ Let's Encrypt, bật Certbot timer.
18. Chuyển DNS Namecheap sang Elastic IP mới.
19. Cấu hình `www` redirect 301 về domain gốc.
20. Cập nhật GitHub Actions để tự động deploy `main` qua SSH.

Final dump tại thời điểm migration được ghi nhận:

- Thời gian: `26/08/2026 14:00:27 GMT+7`.
- SHA-256: `fc07381fc723d6ac1a8d09063d638e82578c9136f3af8be7840c27ab52f9cde1`.
- Số bảng public sau restore: `37`.

Đây là dump tại thời điểm migration, không phải backup production mới nhất. Không dùng `database/postgresql_full.sql` làm backup production; file đó chỉ phục vụ khởi tạo database trống.

### 5.2. S3 và dữ liệu định danh

Bucket production mới được cấu hình:

```text
s3://kocviet-identity/private/identity/<koc-id>/...
```

Thiết lập đã ghi nhận:

- Block all public access: bật.
- ACL: disabled.
- Versioning: bật.
- Encryption: SSE-S3.
- EC2 truy cập bằng IAM Role, không dùng Access Key dài hạn.
- Policy giới hạn `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` trong `arn:aws:s3:::kocviet-identity/private/identity/*`.

Bucket cũ từng có 6 ảnh tại `private/identity/`. Theo quyết định migration, các ảnh cũ không được sao chép; người dùng liên quan có thể phải tải lại.

### 5.3. Migration dữ liệu hạng KOC sau deploy

File `database/migrate_koc_tiers_5_levels.sql` đã được chạy thủ công trên production bằng `psql` trong container. Kết quả đã ghi nhận:

```text
BEGIN
UPDATE 14
COMMIT
```

Migration chỉ cập nhật cột text `kocs.tier`, không tạo bảng hay thay schema. Sau đó dữ liệu được kiểm tra:

```text
Macro: 2
Micro: 5
Mid:   2
Nano:  5
Mega:  0
```

Không có KOC Mega tại thời điểm kiểm tra vì chưa có bản ghi đủ từ 1.000.000 follower. Việc `Mega: 0` không có nghĩa migration bị lỗi.

### 5.4. Kiểm tra HTTP/HTTPS gần nhất đã ghi nhận

Lệnh HTTP nội bộ với `Host: kocviet.com` trả `301 Moved Permanently` tới HTTPS. Đây là hành vi đúng của Nginx, không phải lỗi API:

```bash
curl -i -H 'Host: kocviet.com' http://127.0.0.1/health
```

Các lệnh kiểm tra đúng mục đích:

```bash
# Backend trực tiếp, bỏ qua Nginx
curl -i http://127.0.0.1:3000/health

# HTTPS qua Nginx ngay trên EC2
curl -i --resolve kocviet.com:443:127.0.0.1 https://kocviet.com/health

# Public
curl -i https://kocviet.com/health
```

Kết quả mong đợi của health là HTTP 200 và JSON có `"ok": true`, `"database": "postgresql"`.

## 6. Vị trí file và service quan trọng trên EC2

```text
/var/www/koc-viet/                          Source production
/var/www/koc-viet/.env                     Biến PostgreSQL Docker
/var/www/koc-viet/back-end/.env            Secret/config backend
/var/www/koc-viet/back-end/dist/           Backend build
/var/www/koc-viet/front-end/dist/          Frontend build
/var/www/koc-viet/compose.yaml              PostgreSQL Compose
/etc/nginx/sites-available/koc-viet         Nginx domain chính
/etc/nginx/sites-available/koc-viet-www-redirect
/etc/letsencrypt/live/kocviet.com/          Chứng chỉ SSL
/home/ubuntu/.pm2/                          PM2 state và log
/var/lib/docker/volumes/koc-viet-postgres-data/_data
```

Không chỉnh trực tiếp dữ liệu bên trong Docker volume. Dùng `psql`, migration có kiểm soát hoặc restore từ dump.

## 7. Quyền truy cập cần bàn giao

Người tiếp nhận cần có quyền phù hợp cho từng hệ thống, theo nguyên tắc quyền tối thiểu:

| Hệ thống | Quyền cần có | Cách kiểm tra bàn giao |
|---|---|---|
| AWS account mới | IAM admin vận hành hoặc role phù hợp, MFA | Đăng nhập, xem EC2/S3/IAM/Billing theo phạm vi được cấp |
| EC2 | SSH key cá nhân hoặc Session Manager | SSH thành công và chạy được lệnh chỉ đọc |
| GitHub repository | Quyền đọc/merge và quản lý Environment phù hợp | Xem Actions và environment `production` |
| Namecheap | Quyền quản lý DNS | Xem A record `@` và CNAME `www` |
| PayOS/Brevo/OAuth | Quyền vận hành từng dịch vụ | Kiểm tra callback/domain mà không lộ secret |
| Kho backup ngoài EC2 | Quyền đọc/ghi có mã hóa | Xem backup gần nhất và checksum |

Không dùng chung một private key cho nhiều người. Mỗi quản trị viên nên có SSH key riêng; thêm public key vào `~/.ssh/authorized_keys` và xóa đúng key đó khi thu hồi quyền.

## 8. SSH vào EC2

Mẫu lệnh:

```powershell
ssh -i "ĐƯỜNG_DẪN_KEY_CÁ_NHÂN.pem" ubuntu@54.251.228.218
```

Fingerprint ED25519 đã ghi nhận khi tạo server:

```text
SHA256:8EalxiLOja36SiHjFKkGsKQZZPh0ILFRhOS0kurn67Y
```

Phải xác minh fingerprint qua kênh tin cậy trước khi chấp nhận lần đầu. Nếu Windows báo `UNPROTECTED PRIVATE KEY FILE`, giới hạn ACL của file key cho đúng tài khoản Windows đang dùng:

```powershell
icacls "ĐƯỜNG_DẪN_KEY_CÁ_NHÂN.pem" /inheritance:r
icacls "ĐƯỜNG_DẪN_KEY_CÁ_NHÂN.pem" /remove "NT AUTHORITY\Authenticated Users"
icacls "ĐƯỜNG_DẪN_KEY_CÁ_NHÂN.pem" /remove "BUILTIN\Users"
icacls "ĐƯỜNG_DẪN_KEY_CÁ_NHÂN.pem" /grant:r "$env:USERNAME:(R)"
```

Nếu SSH timeout, kiểm tra theo thứ tự: EC2 `Running` và status `2/2`, Elastic IP association, Security Group port 22, mạng phía người dùng. Nếu `Permission denied (publickey)`, kiểm tra user `ubuntu`, key pair và ACL file key.

## 9. Kiểm tra nhanh production

Sau khi SSH:

```bash
uptime
df -h /
df -i /
free -h
pm2 list
docker compose -f /var/www/koc-viet/compose.yaml ps
docker exec koc-viet-postgres pg_isready -U postgres -d koc_viet
sudo systemctl is-active nginx
curl -fsS http://127.0.0.1:3000/health
curl -I https://kocviet.com
curl -I https://www.kocviet.com
```

Kết quả đúng:

- PM2 `koc-viet-api`: online.
- PostgreSQL: healthy/accepting connections.
- Nginx: active.
- Backend trực tiếp: HTTP 200.
- `https://kocviet.com`: HTTP 200.
- `https://www.kocviet.com`: HTTP 301 về domain gốc.

## 10. Chỉnh `.env` an toàn trên EC2

Workflow deploy không cập nhật `.env`. Khi có biến mới, cập nhật thủ công:

```bash
cd /var/www/koc-viet/back-end
ls -la .env
cp .env "/home/ubuntu/back-end.env.$(date -u +%Y%m%dT%H%M%SZ).bak"
nano .env
chmod 600 .env
pm2 restart koc-viet-api --update-env
pm2 save
curl -fsS http://127.0.0.1:3000/health
```

Chỉ kiểm tra tên biến, không in giá trị khi chia sẻ màn hình/log:

```bash
cut -d= -f1 /var/www/koc-viet/back-end/.env | sed '/^#/d;/^$/d'
```

Nếu chỉnh `/var/www/koc-viet/.env` cho PostgreSQL Compose thì phải xác định biến nào thay đổi và lên kế hoạch restart container. Không restart PostgreSQL tùy tiện trong giờ có giao dịch.

Sau khi xác nhận bản mới hoạt động, chuyển/xóa bản backup `.env` theo chính sách secret; không để nhiều bản secret tồn tại lâu trong home directory.

## 11. CI/CD và triển khai production

Workflow: `.github/workflows/deploy-production.yml`.

Trigger:

- Push vào `main`.
- Chạy thủ công bằng `workflow_dispatch`.

Pipeline hiện tại:

1. Checkout source.
2. Dùng Node.js 22.
3. `npm ci` frontend/backend.
4. Test backend nếu có.
5. Build frontend/backend trên GitHub runner.
6. Đóng gói source, loại `.git`, `.env`, `node_modules`, `dist`.
7. SCP artifact vào EC2.
8. `rsync` vào `/var/www/koc-viet`, giữ lại `.env`, `node_modules`, `dist` hiện hữu trong bước đồng bộ.
9. Bật PostgreSQL container.
10. Cài dependency và build lại trên EC2.
11. Reload PM2 với `--update-env`, health check backend.
12. Test và reload Nginx.

GitHub Environment `production` cần bốn secret:

| Tên | Nội dung |
|---|---|
| `EC2_HOST` | Elastic IP production |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Private deployment key |
| `EC2_KNOWN_HOSTS` | Known-host ED25519 đã xác minh |

Không ghi giá trị thật của các secret này vào repository hoặc tài liệu.

Khi deploy lỗi nhưng website vẫn chạy, đọc GitHub Actions và PM2 log trước; không restart ngẫu nhiên. Có thể chạy lại commit tốt gần nhất bằng `workflow_dispatch` hoặc revert bằng quy trình Git bình thường.

## 12. Backup dữ liệu production

### 12.1. Backup PostgreSQL thủ công

```bash
backup_dir="/home/ubuntu/koc-viet-backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
docker exec koc-viet-postgres pg_dump -U postgres -d koc_viet -Fc > "$backup_dir/postgresql.dump"
sha256sum "$backup_dir/postgresql.dump" > "$backup_dir/postgresql.dump.sha256"
chmod 600 "$backup_dir/postgresql.dump" "$backup_dir/postgresql.dump.sha256"
docker exec -i koc-viet-postgres pg_restore -l < "$backup_dir/postgresql.dump" | head
sha256sum -c "$backup_dir/postgresql.dump.sha256"
```

Một dump chỉ nằm trên cùng EBS với database chưa phải backup an toàn. Phải sao chép bản dump sang kho private/encrypted ngoài EC2 và kiểm tra restore định kỳ.

### 12.2. Backup S3

S3 đã bật versioning nhưng versioning không thay thế backup độc lập. Khi cần tạo bản sao migration có thể dùng `scripts/backup-production.sh`; script hỗ trợ PostgreSQL dump, S3 sync và SHA-256. Dữ liệu identity là dữ liệu nhạy cảm, thư mục backup phải mã hóa và giới hạn người truy cập.

### 12.3. EBS snapshot

Tạo snapshot trước thay đổi lớn như mở rộng EBS hoặc migration database. Snapshot là lớp rollback bổ sung, không thay thế PostgreSQL logical dump đã test restore.

### 12.4. Thông tin phải ghi sau mỗi lần backup

| Trường | Giá trị cần điền |
|---|---|
| Thời gian UTC/GMT+7 | |
| Người thực hiện | |
| Kích thước dump | |
| SHA-256 | |
| Vị trí bản sao ngoài EC2 | Không ghi credential |
| `pg_restore -l` thành công | Có/Không |
| Test restore gần nhất | Ngày và kết quả |

## 13. Restore database — thao tác có rủi ro cao

Restore với `--clean` có thể thay thế dữ liệu hiện hành. Chỉ thực hiện khi đã:

1. Xác nhận đúng account, EC2, container và database `koc_viet`.
2. Có maintenance window và người phê duyệt.
3. Dừng nguồn ghi/API.
4. Tạo backup ngay trước restore và đưa một bản ra ngoài EC2.
5. Kiểm tra checksum và `pg_restore -l`.
6. Chuẩn bị kế hoạch rollback.

Lệnh chi tiết nằm tại mục “Restore database” trong `docs/production-operations-runbook.md` và `scripts/restore-production.sh`. Không chạy `docker compose down -v` hoặc xóa volume để restore.

## 14. Nginx, HTTPS và DNS

Kiểm tra Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
sudo journalctl -u nginx --since '30 minutes ago' --no-pager
sudo tail -n 100 /var/log/nginx/error.log
```

Luôn chạy `sudo nginx -t` trước khi reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Kiểm tra certificate:

```bash
sudo certbot certificates
systemctl status certbot.timer --no-pager
sudo certbot renew --dry-run
```

Kiểm tra DNS từ Windows:

```powershell
nslookup kocviet.com 1.1.1.1
nslookup www.kocviet.com 1.1.1.1
nslookup kocviet.com 8.8.8.8
```

Domain gốc phải quy về `54.251.228.218`; `www` phải chuyển về `kocviet.com`.

## 15. IAM Role và S3

Kiểm tra role từ EC2 bằng IMDSv2:

```bash
TOKEN="$(curl -sS -X PUT -H 'X-aws-ec2-metadata-token-ttl-seconds: 21600' http://169.254.169.254/latest/api/token)"
curl -sS -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/iam/security-credentials/
unset TOKEN
```

Kết quả phải là `KocVietProductionEc2Role`.

Kiểm tra backend không chứa static AWS key:

```bash
grep -E '^(AWS_REGION|AWS_S3_IDENTITY_BUCKET)=' /var/www/koc-viet/back-end/.env
grep -E '^AWS_(ACCESS_KEY_ID|SECRET_ACCESS_KEY)=' /var/www/koc-viet/back-end/.env
```

Lệnh thứ hai không được trả dòng nào. Nếu S3 `AccessDenied`, kiểm tra role gắn đúng EC2, ARN/prefix trong policy và bucket/region trong `.env`; không tắt Block Public Access để chữa lỗi IAM.

## 16. Log và xử lý sự cố nhanh

Backend/PM2:

```bash
pm2 list
pm2 describe koc-viet-api
pm2 logs koc-viet-api --lines 100 --nostream
tail -n 100 /home/ubuntu/.pm2/logs/koc-viet-api-error.log
ss -lntp | grep ':3000'
curl -v http://127.0.0.1:3000/health
```

PostgreSQL:

```bash
cd /var/www/koc-viet
docker compose ps
docker logs koc-viet-postgres --tail 100
docker inspect koc-viet-postgres --format '{{json .State.Health}}'
docker exec koc-viet-postgres pg_isready -U postgres -d koc_viet
docker exec koc-viet-postgres psql -U postgres -d koc_viet -c "SELECT pg_size_pretty(pg_database_size('koc_viet'));"
```

Disk:

```bash
df -h /
df -i /
docker system df
sudo du -xhd1 /var/lib/docker /var/www /home/ubuntu 2>/dev/null | sort -h
```

Ngưỡng đề xuất:

- Dưới 70%: bình thường.
- 70–80%: kiểm tra log, backup và Docker image cũ.
- Trên 80%: lên kế hoạch mở rộng EBS.
- Trên 90%: xử lý ngay; PostgreSQL có thể ngừng ghi khi hết dung lượng.

Không chạy `docker system prune -a`, `docker compose down -v` hoặc xóa Docker volume nếu chưa kiểm kê và có backup.

## 17. Reboot và restart an toàn

Restart backend:

```bash
pm2 restart koc-viet-api --update-env
pm2 save
```

Restart PostgreSQL khi đã có maintenance window:

```bash
cd /var/www/koc-viet
docker compose restart postgres
docker compose ps
```

Reboot EC2:

```bash
sudo reboot
```

Sau khi kết nối lại, chạy toàn bộ checklist tại mục 9.

## 18. Rủi ro và việc còn phải xác minh khi bàn giao

| Mục | Trạng thái tài liệu | Việc cần làm |
|---|---|---|
| SSH port 22 mở `0.0.0.0/0` | Rủi ro đã biết | Lập phương án giới hạn source hoặc dùng SSM |
| Database chạy cùng EC2 | Single point of failure | Backup ngoài EC2 và test restore; cân nhắc RDS |
| Backup tự động định kỳ | Chưa xác minh từ tài liệu | Kiểm tra cron/systemd/AWS Backup và backup gần nhất |
| CloudWatch alarm | Chưa xác minh | Kiểm tra alarm CPU, disk/log và người nhận cảnh báo |
| AWS Budget/Billing alert | Chưa xác minh | Thiết lập/kiểm tra ngân sách và email nhận cảnh báo |
| Tài nguyên account cũ | Chưa xác minh hiện trạng | Kiểm kê trước khi xóa để tránh phí hoặc mất rollback |
| Snapshot production mới | Chưa có ID trong tài liệu | Kiểm tra snapshot gần nhất và retention |
| Certbot renewal | Đã cấu hình, cần kiểm tra định kỳ | Chạy `certbot renew --dry-run` |
| S3 lifecycle/version retention | Versioning đã bật; lifecycle chưa rõ | Kiểm tra chi phí và chính sách lưu/xóa đúng pháp lý |
| Quản lý secret | `.env` cục bộ trên EC2 | Cân nhắc SSM Parameter Store/Secrets Manager |
| Tài liệu chi phí | Không khớp hạ tầng thực tế | Tính lại theo `m7i-flex.large`, EBS, IPv4, S3 và transfer |

## 19. Checklist bàn giao cuối cùng

### Quyền và tài khoản

- [ ] Người nhận đăng nhập được AWS bằng tài khoản riêng và MFA.
- [ ] Xác nhận đúng AWS account ID và region `ap-southeast-1`.
- [ ] Người nhận xem được EC2, EBS, snapshot, S3, IAM, Billing/Budget theo quyền được giao.
- [ ] SSH bằng key cá nhân thành công; không chia sẻ lại key cũ.
- [ ] Có quyền phù hợp trên GitHub repository và Environment `production`.
- [ ] Có quyền quản lý DNS Namecheap.
- [ ] Có đầu mối/quyền vận hành PayOS, Brevo/email và OAuth.

### Hạ tầng và ứng dụng

- [ ] EC2 `Running`, status check `2/2`.
- [ ] Elastic IP `54.251.228.218` gắn đúng instance.
- [ ] Security Group đã được rà soát.
- [ ] PM2, PostgreSQL và Nginx hoạt động.
- [ ] Health public trả HTTP 200.
- [ ] `www` redirect đúng domain gốc.
- [ ] SSL renewal dry-run thành công.
- [ ] Upload/download ảnh identity qua IAM Role thành công.
- [ ] GitHub Actions deploy thử thành công.

### Dữ liệu và khôi phục

- [ ] Có PostgreSQL dump mới, checksum đúng.
- [ ] Có ít nhất một bản backup mã hóa ngoài EC2.
- [ ] Đã test restore trên môi trường tách biệt và ghi ngày kiểm tra.
- [ ] Biết vị trí snapshot EBS gần nhất và thời hạn giữ.
- [ ] Đã thống nhất RPO/RTO và người có quyền phê duyệt restore/rollback.
- [ ] Đã xác định trạng thái và thời hạn dọn account/server cũ.

### Bảo mật

- [ ] Không có secret trong Git hoặc tài liệu.
- [ ] `.env` có quyền `600`.
- [ ] Backend không có AWS Access Key tĩnh.
- [ ] S3 Block Public Access vẫn bật.
- [ ] PostgreSQL `5432` và backend `3000` không public.
- [ ] Đã thu hồi quyền/key của người không còn phụ trách.

## 20. Mẫu nhật ký thao tác AWS sau bàn giao

Mỗi thay đổi production nên thêm một dòng vào bảng dưới hoặc hệ thống ticket chính thức:

| Thời gian | Người thực hiện | Tài nguyên | Thao tác | Lý do/Ticket | Backup trước thay đổi | Kết quả kiểm tra | Rollback |
|---|---|---|---|---|---|---|---|
| `YYYY-MM-DD HH:mm GMT+7` | | | | | Có/Không/N/A | | |

Không ghi secret, token hoặc dữ liệu cá nhân vào nhật ký.

## 21. Tài liệu liên quan

- `docs/production-operations-runbook.md`: lệnh vận hành và xử lý sự cố chi tiết.
- `docs/aws-account-migration.md`: quy trình chuyển sang account/server khác.
- `docs/aws-infrastructure-plan.md`: kiến trúc mục tiêu và phương án AWS/Viettel IDC, không phải trạng thái production hiện hành.
- `docs/aws-monthly-cost.md`: ước tính theo phương án dự kiến; phải tính lại trước khi dùng làm ngân sách hiện tại.
- `.github/workflows/deploy-production.yml`: CI/CD production thực tế.
- `scripts/backup-production.sh`: backup migration PostgreSQL/S3.
- `scripts/restore-production.sh`: restore có xác nhận thay thế dữ liệu đích.
- `database/migrate_koc_tiers_5_levels.sql`: migration dữ liệu 5 hạng KOC đã chạy trên production.

