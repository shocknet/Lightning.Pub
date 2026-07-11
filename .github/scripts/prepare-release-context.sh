#!/usr/bin/env bash
# Deterministic release guardrails only. Diffs are left for the Cursor agent to inspect in-repo.
set -euo pipefail

OUTPUT="${1:?output path required}"
BASE_REF="${2:?base ref required}"
CURRENT_VERSION="${3:?current version required}"
LAST_TAG="${4:-none}"

mkdir -p "$(dirname "$OUTPUT")"

BUF_OUT=/tmp/buf-breaking.txt
CURRENT_VERSION="${CURRENT_VERSION#v}"

# If package.json already declares a version that has never been tagged, ship that
# version as-is. Do not invent a further bump.
if git rev-parse "v${CURRENT_VERSION}" >/dev/null 2>&1; then
  SHIP_CURRENT=false
else
  SHIP_CURRENT=true
fi

if git diff --name-only "${BASE_REF}..HEAD" -- proto/service | grep -q .; then
  PROTO_CHANGED=true
else
  PROTO_CHANGED=false
fi

BUF_BREAKING=false
if [ "$LAST_TAG" != "none" ] && [ "$PROTO_CHANGED" = true ]; then
  if buf breaking proto --against ".git#ref=${LAST_TAG},subdir=proto" > "$BUF_OUT" 2>&1; then
    BUF_BREAKING=false
  else
    BUF_BREAKING=true
  fi
else
  echo "Skipped buf breaking (no prior tag or no proto/service changes)" > "$BUF_OUT"
fi

if [ "$SHIP_CURRENT" = true ]; then
  MIN_BUMP="none"
  TARGET_VERSION="$CURRENT_VERSION"
else
  MIN_BUMP="patch"
  if [ "$BUF_BREAKING" = true ]; then
    MIN_BUMP="major"
  elif git diff --name-only "${BASE_REF}..HEAD" -- proto/service/methods.proto | grep -q .; then
    MIN_BUMP="minor"
  fi
  TARGET_VERSION=""
fi

python3 - <<PY
import json
from pathlib import Path

buf_output = Path("${BUF_OUT}").read_text(encoding="utf-8")
if len(buf_output) > 8000:
    buf_output = buf_output[:8000] + "\n... truncated ..."

context = {
    "current_version": "${CURRENT_VERSION}",
    "last_tag": "${LAST_TAG}",
    "base_ref": "${BASE_REF}",
    "buf_breaking": "${BUF_BREAKING}" == "true",
    "buf_output": buf_output,
    "proto_changed": "${PROTO_CHANGED}" == "true",
    "ship_current": "${SHIP_CURRENT}" == "true",
    "min_bump": "${MIN_BUMP}",
    "target_version": "${TARGET_VERSION}",
}
Path("${OUTPUT}").write_text(json.dumps(context, indent=2) + "\n", encoding="utf-8")
PY

echo "Release context written to ${OUTPUT}"
echo "ship_current=${SHIP_CURRENT} target=${TARGET_VERSION:-n/a} buf_breaking=${BUF_BREAKING} min_bump=${MIN_BUMP} proto_changed=${PROTO_CHANGED}"
