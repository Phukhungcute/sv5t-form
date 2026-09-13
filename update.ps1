```powershell
$ErrorActionPreference = "Stop"

# ============================================
# FUNCTIONS
# ============================================

function Abort-Update {
    param (
        [string]$Message
    )

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "          UPDATE ABORTED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host $Message -ForegroundColor Yellow
    Write-Host ""

    exit 1
}

function Run-Git {
    param (
        [string[]]$Arguments
    )

    & git @Arguments

    if ($LASTEXITCODE -ne 0) {
        Abort-Update "Git command thất bại: git $($Arguments -join ' ')"
    }
}

function Read-Required {
    param (
        [string]$Prompt
    )

    while ($true) {
        $Value = Read-Host $Prompt

        if (-not [string]::IsNullOrWhiteSpace($Value)) {
            return $Value.Trim()
        }

        Write-Host "Không được để trống. Vui lòng nhập lại." -ForegroundColor Yellow
    }
}

function Read-Changes {
    param (
        [string]$Title
    )

    Write-Host ""
    Write-Host "[$Title]" -ForegroundColor Cyan
    Write-Host "Nhập từng thay đổi."
    Write-Host "Nhấn Enter ở dòng trống để kết thúc."

    $Changes = @()

    while ($true) {
        $Item = Read-Host "-"

        if ([string]::IsNullOrWhiteSpace($Item)) {
            break
        }

        $Changes += $Item.Trim()
    }

    if ($Changes.Count -eq 0) {
        $Changes += "Không có thay đổi"
    }

    return $Changes
}

# ============================================
# HEADER
# ============================================

Clear-Host

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "           SV5T FORM UPDATE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# CHECK GIT REPOSITORY
# ============================================

git rev-parse --is-inside-work-tree *> $null

if ($LASTEXITCODE -ne 0) {
    Abort-Update "Thư mục hiện tại không phải Git repository."
}

# ============================================
# CHECK GIT STATUS
# ============================================

$GitStatus = git status --porcelain

if ([string]::IsNullOrWhiteSpace($GitStatus)) {
    Abort-Update "Không có thay đổi nào để commit."
}

# ============================================
# BASIC INFORMATION
# ============================================

Write-Host "THÔNG TIN CẬP NHẬT" -ForegroundColor Green
Write-Host ""

$Message = Read-Required "Cập nhật những gì trong code?"
$Version = Read-Required "Phiên bản (vd: v1.3.0)"

# ============================================
# VALIDATE VERSION
# ============================================

if ($Version -notmatch '^v\d+\.\d+\.\d+$') {
    Abort-Update "Version không hợp lệ. Hãy dùng dạng vX.Y.Z, ví dụ v1.3.0"
}

# ============================================
# CHECK EXISTING TAG
# ============================================

$ExistingTag = git tag -l $Version

if (-not [string]::IsNullOrWhiteSpace($ExistingTag)) {
    Abort-Update "Version $Version đã tồn tại. Hãy chọn version khác."
}

# ============================================
# CHANGELOG INPUT
# ============================================

$Added = Read-Changes "Added"
$Fixed = Read-Changes "Fixed"
$Updated = Read-Changes "Updated"
$Removed = Read-Changes "Removed"

# ============================================
# BUILD CHANGELOG TEXT
# ============================================

$Date = Get-Date -Format "yyyy-MM-dd"

$AddedText = ($Added | ForEach-Object {
    "- $_"
}) -join "`r`n"

$FixedText = ($Fixed | ForEach-Object {
    "- $_"
}) -join "`r`n"

$UpdatedText = ($Updated | ForEach-Object {
    "- $_"
}) -join "`r`n"

$RemovedText = ($Removed | ForEach-Object {
    "- $_"
}) -join "`r`n"

$NewRelease = @(
    "## $Version - $Date"
    ""
    "### Added"
    $AddedText
    ""
    "### Fixed"
    $FixedText
    ""
    "### Updated"
    $UpdatedText
    ""
    "### Removed"
    $RemovedText
    ""
) -join "`r`n"

# ============================================
# CONFIRM
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "            XÁC NHẬN CẬP NHẬT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Message:" -ForegroundColor Yellow
Write-Host "  $Message"

Write-Host ""
Write-Host "Version:" -ForegroundColor Yellow
Write-Host "  $Version"

Write-Host ""
Write-Host "Added:" -ForegroundColor Yellow

foreach ($Item in $Added) {
    Write-Host "  - $Item"
}

Write-Host ""
Write-Host "Fixed:" -ForegroundColor Yellow

foreach ($Item in $Fixed) {
    Write-Host "  - $Item"
}

Write-Host ""
Write-Host "Updated:" -ForegroundColor Yellow

foreach ($Item in $Updated) {
    Write-Host "  - $Item"
}

Write-Host ""
Write-Host "Removed:" -ForegroundColor Yellow

foreach ($Item in $Removed) {
    Write-Host "  - $Item"
}

Write-Host ""
$Confirm = Read-Host "Xác nhận? (Y/N)"

if ($Confirm -notmatch '^[Yy]$') {
    Abort-Update "Bạn đã huỷ cập nhật."
}

# ============================================
# UPDATE CHANGELOG.MD
# ============================================

$ChangelogPath = Join-Path (Get-Location) "CHANGELOG.md"

if (Test-Path $ChangelogPath) {

    $OldChangelog = Get-Content $ChangelogPath -Raw

    $NewChangelog = @(
        "# Changelog"
        ""
        $NewRelease
        $OldChangelog
    ) -join "`r`n"

}
else {

    $NewChangelog = @(
        "# Changelog"
        ""
        $NewRelease
    ) -join "`r`n"
}

Set-Content `
    -Path $ChangelogPath `
    -Value $NewChangelog `
    -Encoding UTF8

Write-Host ""
Write-Host "✓ CHANGELOG.md updated" -ForegroundColor Green

# ============================================
# GIT ADD
# ============================================

Write-Host ""
Write-Host "→ git add ." -ForegroundColor Cyan

Run-Git @(
    "add",
    "."
)

# ============================================
# GIT COMMIT
# ============================================

Write-Host ""
Write-Host "→ git commit" -ForegroundColor Cyan

Run-Git @(
    "commit",
    "-m",
    $Message
)

# ============================================
# GIT PUSH
# ============================================

Write-Host ""
Write-Host "→ git push" -ForegroundColor Cyan

Run-Git @(
    "push"
)

# ============================================
# CREATE TAG
# ============================================

Write-Host ""
Write-Host "→ git tag $Version" -ForegroundColor Cyan

Run-Git @(
    "tag",
    "-a",
    $Version,
    "-m",
    $Version
)

# ============================================
# PUSH TAG
# ============================================

Write-Host ""
Write-Host "→ git push origin $Version" -ForegroundColor Cyan

Run-Git @(
    "push",
    "origin",
    $Version
)

# ============================================
# COMPLETE
# ============================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "         UPDATE COMPLETED ✓" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Version: $Version" -ForegroundColor Green
Write-Host "GitHub đã được cập nhật." -ForegroundColor Green
Write-Host ""
```
