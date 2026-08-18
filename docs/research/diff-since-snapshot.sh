#!/bin/zsh
# 2026-08-16 스냅샷 이후 사용자가 무엇을 고쳤는지 본다.
# 사용법: ./docs/research/diff-since-snapshot.sh [--stat]
cd "$(dirname "$0")/../.." || exit 1
SNAP="docs/research/snapshot-20260816"
FILES=(
  "content/260703/index.md:content_260703_index.md"
  "content/260723/index.md:content_260723_index.md"
  "content/260617/index.md:content_260617_index.md"
  "CLAUDE.md:CLAUDE.md"
  ".claude/commands/write-post.md:.claude_commands_write-post.md"
  ".claude/commands/refine-post.md:.claude_commands_refine-post.md"
)
for pair in $FILES; do
  cur="${pair%%:*}"; snap="$SNAP/${pair##*:}"
  [ -f "$cur" ] || { echo "### $cur (삭제됨)"; continue; }
  if ! diff -q "$snap" "$cur" >/dev/null 2>&1; then
    echo "### $cur"
    if [ "$1" = "--stat" ]; then
      diff "$snap" "$cur" | grep -c '^[<>]' | sed 's/^/  변경 줄 수: /'
    else
      diff -u "$snap" "$cur" | tail -n +3
    fi
    echo
  fi
done
