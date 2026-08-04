# 状态文件检查钩子（由 .codex/config.toml 的 [hooks.Stop] 调用）
#
# 逻辑：
# - 非 Git 仓库时跳过检查（静默退出 0）
# - 若存在代码/文档/配置修改，且 docs/PROJECT_STATUS.md 未被同步修改，
#   则输出告警并以非零码退出，提醒 Agent 更新状态记录
#
# 用法：
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/check-status.ps1

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cwd = (Get-Location).Path

# 优先使用当前工作目录作为项目根（Codex 在项目根启动）；否则回退到脚本所在目录
if (Test-Path (Join-Path $cwd ".git")) {
    $projectRoot = $cwd
} else {
    $projectRoot = Split-Path -Parent $scriptDir
}
$statusFile = "docs/PROJECT_STATUS.md"

# 非 Git 仓库：无法判断改动，静默跳过
if (-not (Test-Path (Join-Path $projectRoot ".git"))) {
    exit 0
}

# 获取当前 Git 仓库中所有变更（含未跟踪文件）
$porcelain = git -C $projectRoot status --porcelain 2>$null
if ($LASTEXITCODE -ne 0) {
    exit 0
}

$changedFiles = @()
foreach ($line in $porcelain) {
    if ($line -match "^.{2} (.*)$") {
        $path = $Matches[1]
        # 处理重命名格式："R  old -> new"
        if ($path -match "^(.*) -> (.*)$") {
            $path = $Matches[2]
        }
        $changedFiles += $path.Trim('"')
    }
}

if ($changedFiles.Count -eq 0) {
    exit 0
}

# 判断某条变更路径是否覆盖状态文件（处理 "docs/" 这类目录级条目）
function Test-PathCovers([string]$changedPath, [string]$targetPath) {
    $p = $changedPath.Replace("\", "/")
    if ($p -eq $targetPath) { return $true }
    if ($p.EndsWith("/") -and $targetPath.StartsWith($p, [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
    return $false
}

# 除了状态文件本身以外的其他改动，都要求状态文件同步更新
$statusChanged = @($changedFiles | Where-Object { Test-PathCovers $_ $statusFile })
$otherChanged = @($changedFiles | Where-Object { -not (Test-PathCovers $_ $statusFile) })

if ($otherChanged.Count -gt 0 -and $statusChanged.Count -eq 0) {
    Write-Output ""
    Write-Output "==============================================================="
    Write-Output "  WARNING: 检测到文件修改，但 docs/PROJECT_STATUS.md 未同步更新"
    Write-Output ""
    Write-Output "  已变更文件："
    $otherChanged | ForEach-Object { Write-Output "    - $_" }
    Write-Output ""
    Write-Output "  请更新 docs/PROJECT_STATUS.md（已完成功能、待开发项、变更记录），"
    Write-Output "  未更新状态文件视为任务未完成。"
    Write-Output "==============================================================="
    Write-Output ""
    exit 1
}

exit 0
