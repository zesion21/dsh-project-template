# 将 .dsh/skills 下的技能安装到用户级技能目录（$DSH_HOME/skills，默认 ~/.dsh/skills）
# 安装后可在所有 DSH 项目中自动发现这些技能

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SourceSkills = Join-Path $ProjectRoot ".dsh\skills"

if (-not (Test-Path $SourceSkills)) {
    Write-Error "未找到技能目录：$SourceSkills"
    exit 1
}

$DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME ".dsh" }
$DestSkills = Join-Path $DshHome "skills"

New-Item -ItemType Directory -Path $DestSkills -Force | Out-Null

$skillNames = Get-ChildItem -Path $SourceSkills -Directory | Select-Object -ExpandProperty Name
$installed = 0
foreach ($skill in $skillNames) {
    $src = Join-Path $SourceSkills $skill
    $dest = Join-Path $DestSkills $skill
    if (Test-Path $dest) {
        Write-Warning "已存在同名技能，跳过：$skill（$dest）"
        continue
    }
    Copy-Item -Path $src -Destination $dest -Recurse
    Write-Host "已安装技能：$skill"
    $installed++
}

Write-Host ""
Write-Host "完成。共安装 $installed 个技能到 $DestSkills"
Write-Host "新技能将在 DSH 的下一次会话中生效。"
