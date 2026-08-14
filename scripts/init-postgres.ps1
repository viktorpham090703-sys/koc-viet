param(
  [string]$DatabaseHost = 'localhost',
  [ValidateRange(1, 65535)][int]$DatabasePort = 5432,
  [ValidatePattern('^[A-Za-z0-9_-]+$')][string]$DatabaseName = 'koc-viet',
  [ValidatePattern('^[A-Za-z0-9_.-]+$')][string]$DatabaseUser = 'postgres',
  [string]$DatabasePassword = $env:KOC_VIET_POSTGRES_PASSWORD
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$schemaFile = Join-Path $projectRoot 'database\postgresql_full.sql'
$backendEnvFile = Join-Path $projectRoot 'back-end\.env'

foreach ($command in @('psql', 'createdb')) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "$command was not found. Install PostgreSQL command-line tools and add its bin directory to PATH."
  }
}

if ([string]::IsNullOrWhiteSpace($DatabasePassword)) {
  $securePassword = Read-Host "PostgreSQL password for user $DatabaseUser" -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  try {
    $DatabasePassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

$previousPassword = $env:PGPASSWORD
$env:PGPASSWORD = $DatabasePassword
try {
  $commonArgs = @('-w', '-h', $DatabaseHost, '-p', $DatabasePort, '-U', $DatabaseUser)
  $databaseExists = & psql @commonArgs -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName'"
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL login failed. Check the host, port, user, and password.' }

  if (($databaseExists | Out-String).Trim() -ne '1') {
    & createdb @commonArgs --encoding UTF8 $DatabaseName
    if ($LASTEXITCODE -ne 0) { throw "Could not create database $DatabaseName." }
    Write-Host "Created database $DatabaseName."
  } else {
    Write-Host "Database $DatabaseName already exists."
  }

  $tableCount = & psql @commonArgs -d $DatabaseName -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"
  if ($LASTEXITCODE -ne 0) { throw "Could not inspect database $DatabaseName." }
  if ([int](($tableCount | Out-String).Trim()) -eq 0) {
    & psql @commonArgs -d $DatabaseName -v ON_ERROR_STOP=1 -f $schemaFile
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL schema/data import failed.' }
    Write-Host 'Imported the schema and sample data.'
  } else {
    Write-Host 'The database already has tables; skipped import to preserve existing data.'
  }

  $encodedUser = [Uri]::EscapeDataString($DatabaseUser)
  $encodedPassword = [Uri]::EscapeDataString($DatabasePassword)
  $encodedDatabase = [Uri]::EscapeDataString($DatabaseName)
  $databaseUrl = "postgresql://${encodedUser}:${encodedPassword}@${DatabaseHost}:${DatabasePort}/${encodedDatabase}"
  $backendEnv = if (Test-Path $backendEnvFile) {
    [Collections.Generic.List[string]]::new([string[]][IO.File]::ReadAllLines($backendEnvFile))
  } else {
    [Collections.Generic.List[string]]::new([string[]][IO.File]::ReadAllLines((Join-Path $projectRoot 'back-end\.env.example')))
  }
  $databaseUrlUpdated = $false
  for ($index = 0; $index -lt $backendEnv.Count; $index += 1) {
    if ($backendEnv[$index] -match '^DATABASE_URL=') {
      $backendEnv[$index] = "DATABASE_URL=$databaseUrl"
      $databaseUrlUpdated = $true
    }
  }
  if (-not $databaseUrlUpdated) {
    $backendEnv.Insert(0, "DATABASE_URL=$databaseUrl")
  }
  [IO.File]::WriteAllLines($backendEnvFile, $backendEnv, [Text.UTF8Encoding]::new($false))
  Write-Host "Wrote backend configuration: $backendEnvFile"
} finally {
  if ($null -eq $previousPassword) {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  } else {
    $env:PGPASSWORD = $previousPassword
  }
}
