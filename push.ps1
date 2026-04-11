# push.ps1 — Check for changes and push to GitHub
# Usage: Right-click -> "Run with PowerShell"  OR  .\push.ps1 in terminal

Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=== GitHub Push Tool ===" -ForegroundColor Cyan

# Check for changes
$status = git status --porcelain
if (-not $status) {
    Write-Host "Δεν υπαρχουν αλλαγες. Τιποτα να ανεβει." -ForegroundColor Yellow
    Read-Host "Πατα Enter για να κλεισεις"
    exit 0
}

Write-Host ""
Write-Host "Αλλαγες που βρεθηκαν:" -ForegroundColor Green
git status --short
Write-Host ""

# Ask for commit message
$msg = Read-Host "Γραψε μηνυμα commit (Enter για default)"
if (-not $msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $msg = "Update $timestamp"
}

# Stage all, commit, push
git add -A
git commit -m "$msg

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Αποτυχια commit!" -ForegroundColor Red
    Read-Host "Πατα Enter"
    exit 1
}

Write-Host ""
Write-Host "Ανεβαινει στο GitHub..." -ForegroundColor Cyan
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Επιτυχια! Οι αλλαγες ειναι στο GitHub." -ForegroundColor Green
} else {
    Write-Host "Αποτυχια push! Ελεγξε αν εχεις internet και δικαιωματα." -ForegroundColor Red
}

Read-Host "Πατα Enter για να κλεισεις"
