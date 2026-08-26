#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" != "--confirm-target-replace" || -z "${2:-}" ]]; then
  echo "Usage: TARGET_DATABASE_URL=... TARGET_AWS_S3_IDENTITY_BUCKET=... $0 --confirm-target-replace <backup-directory>" >&2
  exit 1
fi

if [[ -z "${TARGET_DATABASE_URL:-}" ]]; then
  echo "TARGET_DATABASE_URL is required." >&2
  exit 1
fi

backup_root="$2"
dump_file="$backup_root/postgresql.dump"
[[ -f "$dump_file" ]] || { echo "$dump_file was not found." >&2; exit 1; }

for command_name in pg_restore sha256sum; do
  command -v "$command_name" >/dev/null 2>&1 || {
    echo "$command_name is required." >&2
    exit 1
  }
done

echo "Verifying backup checksums..."
(
  cd "$backup_root"
  sha256sum --check SHA256SUMS
)

echo "Replacing objects in the target PostgreSQL database..."
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --exit-on-error \
  --dbname="$TARGET_DATABASE_URL" \
  "$dump_file"

if [[ -d "$backup_root/s3-identity/private/identity" ]]; then
  if [[ -z "${TARGET_AWS_S3_IDENTITY_BUCKET:-}" ]]; then
    echo "TARGET_AWS_S3_IDENTITY_BUCKET is required for the included S3 identity backup." >&2
    exit 1
  fi
  command -v aws >/dev/null 2>&1 || { echo "aws CLI is required." >&2; exit 1; }
  profile_args=()
  if [[ -n "${TARGET_AWS_PROFILE:-}" ]]; then
    profile_args=(--profile "$TARGET_AWS_PROFILE")
  fi
  echo "Uploading private identity objects to s3://$TARGET_AWS_S3_IDENTITY_BUCKET ..."
  aws "${profile_args[@]}" s3 sync \
    "$backup_root/s3-identity/private/identity/" \
    "s3://$TARGET_AWS_S3_IDENTITY_BUCKET/private/identity/" \
    --sse AES256 \
    --only-show-errors
fi

echo "Restore completed. Run the backend health check and migration verification checklist before DNS cutover."
