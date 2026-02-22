#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only sync files in notes/finalized/
[[ "$FILE_PATH" == */notes/finalized/* ]] || exit 0

GIST_ID_FILE="$CLAUDE_PROJECT_DIR/.claude/gist-id"
[[ -f "$GIST_ID_FILE" ]] || exit 0
GIST_ID=$(cat "$GIST_ID_FILE" | tr -d '[:space:]')

# Update just the changed file in the gist
gh gist edit "$GIST_ID" "$FILE_PATH" 2>/dev/null
