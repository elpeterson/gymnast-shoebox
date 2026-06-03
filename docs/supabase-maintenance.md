# Supabase Maintenance

This project uses Supabase Free for PostgreSQL and Auth. Free projects can be paused for inactivity, and paused projects are only restorable for a limited window, so the repo includes two scheduled workflows:

- `Supabase Heartbeat` runs daily and performs a small authenticated REST query against the database.
- `Supabase Backup` runs weekly and exports a PostgreSQL dump as a GitHub Actions artifact.
- `scripts/backup-supabase.ps1` creates a local dump and can copy it to a NAS share.

## Required GitHub Secrets

Create these in GitHub under `Settings > Secrets and variables > Actions`.

| Secret | Used by | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | Heartbeat | The project API URL, for example `https://<project-ref>.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Heartbeat | Supabase service role key. Store only as a GitHub secret. Never expose it in client code. |
| `SUPABASE_DB_URL` | Backup | Direct database connection string from Supabase. Use the URI format with the database password. |

## Backup Notes

GitHub Actions artifacts are useful for quick recovery, but they are not a forever archive. The workflow keeps artifacts for 90 days, which is GitHub's maximum artifact retention for most repositories.

For stronger protection, periodically download an artifact or extend the workflow to copy the dump to durable storage such as Backblaze B2, Cloudflare R2, S3, or Google Drive.

## Local NAS Backups

For the strongest day-to-day protection, run a local backup from a trusted computer and copy it to your NAS.

Install the PostgreSQL client tools so `pg_dump` is available, then set:

```powershell
$env:SUPABASE_DB_URL = "postgresql://postgres:<password>@<host>:5432/postgres"
$env:GYMNAST_SHOEBOX_NAS_BACKUP_PATH = "\\NAS\Backups\gymnast-shoebox"
```

Run:

```powershell
.\scripts\backup-supabase.ps1
```

The script creates:

- A custom-format PostgreSQL dump, suitable for `pg_restore`.
- A schema-only SQL file, useful for quick inspection.
- A manifest and SHA-256 checksums.
- An optional copy under the NAS path when `GYMNAST_SHOEBOX_NAS_BACKUP_PATH` is set.

Use Windows Task Scheduler to run the script daily or weekly. Run it from the repository root and configure the task with the same environment variables, or pass them as parameters:

```powershell
.\scripts\backup-supabase.ps1 -DatabaseUrl "postgresql://..." -NasPath "\\NAS\Backups\gymnast-shoebox"
```

## Restore Sketch

Download the `.dump` artifact, then restore it into a target Postgres database with:

```bash
pg_restore --clean --if-exists --no-owner --no-privileges --dbname "$TARGET_DATABASE_URL" gymnast-shoebox-YYYYMMDDTHHMMSSZ.dump
```

Use a fresh database or a carefully chosen restore target. Restoring over production can delete existing rows.
