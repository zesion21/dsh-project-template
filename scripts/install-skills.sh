#!/usr/bin/env bash
# 将 .dsh/skills 下的技能安装到用户级技能目录（$DSH_HOME/skills，默认 ~/.dsh/skills）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_SKILLS="$SCRIPT_DIR/../.dsh/skills"

if [ ! -d "$SOURCE_SKILLS" ]; then
  echo "未找到技能目录：$SOURCE_SKILLS" >&2
  exit 1
fi

DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
DEST_SKILLS="$DSH_HOME/skills"
mkdir -p "$DEST_SKILLS"

count=0
for skill in "$SOURCE_SKILLS"/*/; do
  [ -d "$skill" ] || continue
  name="$(basename "$skill")"
  dest="$DEST_SKILLS/$name"
  if [ -e "$dest" ]; then
    echo "已存在同名技能，跳过：$name（$dest）"
    continue
  fi
  cp -r "$skill" "$dest"
  echo "已安装技能：$name"
  count=$((count + 1))
done

echo ""
echo "完成。共安装 $count 个技能到 $DEST_SKILLS"
echo "新技能将在 DSH 的下一次会话中生效。"
