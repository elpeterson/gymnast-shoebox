param(
  [string]$DatabaseUrl = $env:SUPABASE_DB_URL,
  [string]$BackupRoot = "$PSScriptRoot\..\backups",
  [string]$NasPath = $env:GYMNAST_SHOEBOX_NAS_BACKUP_PATH,
  [int]$RetentionDays = 30,
  [string]$PgDumpPath = "pg_dump"
)

$ErrorActionPreference = "Stop"

if (-not $DatabaseUrl) {
  throw "Set SUPABASE_DB_URL or pass -DatabaseUrl."
}

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$backupDir = Join-Path $BackupRoot $timestamp
$dumpPath = Join-Path $backupDir "gymnast-shoebox-$timestamp.dump"
$schemaPath = Join-Path $backupDir "gymnast-shoebox-schema-$timestamp.sql"
$manifestPath = Join-Path $backupDir "manifest.txt"
$hashPath = Join-Path $backupDir "checksums.sha256.txt"

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

& $PgDumpPath $DatabaseUrl `
  --format=custom `
  --no-owner `
  --no-privileges `
  --file=$dumpPath

& $PgDumpPath $DatabaseUrl `
  --schema-only `
  --no-owner `
  --no-privileges `
  --file=$schemaPath

@(
  "project=gymnast-shoebox"
  "created_utc=$timestamp"
  "dump=$([System.IO.Path]::GetFileName($dumpPath))"
  "schema=$([System.IO.Path]::GetFileName($schemaPath))"
) | Set-Content -Path $manifestPath -Encoding utf8

Get-FileHash -Algorithm SHA256 -Path $dumpPath, $schemaPath, $manifestPath |
  ForEach-Object { "$($_.Hash.ToLowerInvariant())  $([System.IO.Path]::GetFileName($_.Path))" } |
  Set-Content -Path $hashPath -Encoding utf8

if ($NasPath) {
  $nasBackupDir = Join-Path $NasPath $timestamp
  New-Item -ItemType Directory -Path $nasBackupDir -Force | Out-Null
  Copy-Item -Path (Join-Path $backupDir "*") -Destination $nasBackupDir -Recurse -Force
}

$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupRoot -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.CreationTime -lt $cutoff } |
  Remove-Item -Recurse -Force

Write-Host "Backup created: $backupDir"
if ($NasPath) {
  Write-Host "Backup copied to NAS: $nasBackupDir"
}
