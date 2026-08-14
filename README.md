# KOC Việt

Ứng dụng gồm React + Vite (`front-end`), Express + TypeScript (`back-end`) và PostgreSQL.

## 1. Cài dependencies

PowerShell trên máy có thể chặn `npm.ps1`, vì vậy các lệnh bên dưới dùng `npm.cmd`:

```powershell
npm.cmd run setup
```

## 2. Kết nối PostgreSQL hiện có

Script sẽ tạo database `koc-viet` nếu chưa tồn tại, chỉ import
`database/postgresql_full.sql` khi database chưa có bảng, rồi tự tạo
`back-end/.env`. Dữ liệu hiện hữu không bị ghi đè.

```powershell
$env:KOC_VIET_POSTGRES_PASSWORD='MAT_KHAU_POSTGRES_CUA_BAN'
npm.cmd run db:init
Remove-Item Env:KOC_VIET_POSTGRES_PASSWORD
```

Nếu host, port hoặc user khác mặc định:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/init-postgres.ps1 `
  -DatabaseHost localhost -DatabasePort 5432 `
  -DatabaseUser postgres -DatabaseName koc-viet
```

Nếu không truyền mật khẩu, script sẽ hỏi mật khẩu theo cách ẩn ký tự.

## 3. Chạy frontend và backend

```powershell
npm.cmd run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health check PostgreSQL: http://localhost:3000/health

Vite tự chuyển tiếp `/api` đến backend. Backend kiểm tra PostgreSQL, chạy migration
an toàn và bổ sung seed data còn thiếu trước khi mở cổng HTTP. Lệnh chạy chung sẽ
đợi health check backend thành công rồi mới khởi động Vite, tránh lỗi proxy trong
lúc PostgreSQL đang được khởi tạo.

## PostgreSQL bằng Docker (tùy chọn)

Chỉ dùng lựa chọn này khi cổng `5432` chưa có PostgreSQL khác đang chạy:

```powershell
Copy-Item .env.example .env
docker compose up -d postgres
Copy-Item back-end/.env.example back-end/.env
npm.cmd run dev
```

Database Docker mặc định là `koc-viet`, user/password là `postgres/postgres`.

## Kiểm tra

```powershell
npm.cmd test
npm.cmd run build
```
