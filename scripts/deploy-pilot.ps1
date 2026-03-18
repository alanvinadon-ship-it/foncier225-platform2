param(
  [string]$EnvFile = ".env",
  [switch]$SkipInstall,
  [switch]$SkipChecks,
  [switch]$SkipTests,
  [switch]$SkipBuild,
  [switch]$SkipMigrate,
  [switch]$StartApp
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Label" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Label"
  }
}

if (-not (Test-Path $EnvFile)) {
  throw "Environment file '$EnvFile' not found. Copy .env.example to .env and fill it before deploying."
}

Write-Host "Pilot deployment runbook starting..." -ForegroundColor Green
Write-Host "Reminder: take a database backup before running migrations." -ForegroundColor Yellow

if (-not $SkipInstall) {
  Invoke-Step "Install dependencies" { pnpm install --frozen-lockfile }
}

if (-not $SkipChecks) {
  Invoke-Step "Typecheck" { pnpm check }
}

if (-not $SkipTests) {
  Invoke-Step "Test suite" { pnpm test }
}

if (-not $SkipBuild) {
  Invoke-Step "Production build" { pnpm build }
}

if (-not $SkipMigrate) {
  Invoke-Step "Database migrations" { pnpm db:push }
}

if ($StartApp) {
  Invoke-Step "Start application" { pnpm start }
} else {
  Write-Host ""
  Write-Host "Deployment preparation complete." -ForegroundColor Green
  Write-Host "Next command: pnpm start" -ForegroundColor Green
}
