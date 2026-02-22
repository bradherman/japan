#!/bin/bash
# Rebuild app data when source markdown files are edited.
# Triggered as a PostToolUse hook on Edit|Write.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Source files that feed the app's build-data pipeline
case "$FILE_PATH" in
  */notes/finalized/itinerary.md|\
  */notes/finalized/daily-schedule.md|\
  */notes/finalized/reservation-tracker.md|\
  */notes/finalized/transport-cheatsheet.md|\
  */notes/finalized/packing-list.md|\
  */notes/restaurant-guide.md|\
  */data/nightlife-guide.md)
    ;;
  *)
    exit 0
    ;;
esac

cd "$CLAUDE_PROJECT_DIR/app" || exit 0
npm run build:data 2>/dev/null
