#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required." >&2
  exit 1
fi

for command_name in pg_dump pg_restore sha256sum; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "$command_name is required." >&2
    exit 1
  }
done

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_root="${1:-migration-backups/$timestamp}"
mkdir -p "$backup_root"
chmod 700 "$backup_root"

echo "Creating a consistent PostgreSQL backup..."
pg_dump \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  --file="$backup_root/postgresql.dump" \
  "$DATABASE_URL"
pg_restore --list "$backup_root/postgresql.dump" > "$backup_root/postgresql.contents.txt"

if [[ -n "${AWS_S3_IDENTITY_BUCKET:-}" ]]; then
  command -v aws >/dev/null 2>&1 || {
    echo "aws CLI is required when AWS_S3_IDENTITY_BUCKET is set." >&2
    exit 1
  }
  profile_args=()
  if [[ -n "${AWS_PROFILE:-}" ]]; then
    profile_args=(--profile "$AWS_PROFILE")
  fi
  mkdir -p "$backup_root/s3-identity"
  echo "Downloading private identity objects from s3://$AWS_S3_IDENTITY_BUCKET ..."
  aws "${profile_args[@]}" s3 sync \
    "s3://$AWS_S3_IDENTITY_BUCKET/private/identity/" \
    "$backup_root/s3-identity/private/identity/" \
    --only-show-errors
fi

(
  cd "$backup_root"
  find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS
)

cat > "$backup_root/README.txt" <<EOF
KOC Viet production migration backup
Created UTC: $timestamp
Database: postgresql.dump (custom pg_dump format)
S3 identity objects included: $([[ -n "${AWS_S3_IDENTITY_BUCKET:-}" ]] && echo yes || echo no)

This directory may contain personal and identity data. Keep it encrypted,
restrict access, and delete it securely after the rollback window ends.
EOF

echo "Backup completed: $backup_root"
echo "Verify SHA256SUMS and perform a test restore before switching production."
