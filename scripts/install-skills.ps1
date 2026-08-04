# 将 .codex/skills 下的技能安装到用户级技能目录（~/.codex/skills）
# 安装后可在所有 Codex 项目中自动发现这些技能

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SourceSkills = Join-Path $ProjectRoot ".codex\skills"

if (-not (Test-Path $SourceSkills)) {
    Write-Error "未找到技能目录：$SourceSkills"
    exit 1
}

$CodexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$DestSkills = Join-Path $CodexHome "skills"

New-Item -ItemType Directory -Path $DestSkills -Force | Out-Null

$skillNames = Get-ChildItem -Path $SourceSkills -Directory | Select-Object -ExpandProperty Name
foreach ($skill in $skillNames) {
    $src = Join-Path $SourceSkills $skill
    $dest = Join-Path $DestSkills $skill
    if (Test-Path $dest) {
        Write-Warning "已存在同名技能，跳过：$skill（$dest）"
        continue
    }
    Copy-Item -Path $src -Destination $dest -Recurse
    Write-Host "已安装技能：$skill"
}

Write-Host ""
Write-Host "完成。共安装 $($skillNames.Count) 个技能到 $DestSkills"
Write-Host "新技能将在 Codex 的下一次会话中生效。"
