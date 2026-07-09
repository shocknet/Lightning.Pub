#!/usr/bin/env bash
# Resolve the baseline tag and pending commit count for release automation.
# Uses the nearest ancestor v* tag (git describe), ignoring startos-v*.

set -euo pipefail

HEAD_SHA="${1:-HEAD}"
OUTPUT_FILE="${2:-}"

git fetch --tags origin >/dev/null 2>&1 || true

head_sha="$(git rev-parse "$HEAD_SHA")"

find_last_release_tag() {
  local head_sha="$1"
  local tag

  tag="$(git describe --tags --abbrev=0 --match 'v[0-9]*' "$head_sha" 2>/dev/null || true)"
  if [ -z "$tag" ]; then
    return 1
  fi

  # If HEAD itself is tagged, step back one commit and describe again.
  if [ "$(git rev-parse "$tag")" = "$head_sha" ]; then
    tag="$(git describe --tags --abbrev=0 --match 'v[0-9]*' "${head_sha}^" 2>/dev/null || true)"
  fi

  if [ -z "$tag" ]; then
    return 1
  fi

  echo "$tag"
}

last_tag=""
if last_tag="$(find_last_release_tag "$head_sha")"; then
  base_ref="$last_tag"
  pending="$(git rev-list "${last_tag}..${head_sha}" --count)"
else
  last_tag="none"
  root_commit="$(git rev-list --max-parents=0 "$head_sha" | tail -1)"
  base_ref="$root_commit"
  pending="$(git rev-list "${root_commit}..${head_sha}" --count)"
fi

has_changes=false
if [ "$pending" -gt 0 ]; then
  has_changes=true
fi

if [ -n "$OUTPUT_FILE" ]; then
  {
    echo "last_tag=${last_tag}"
    echo "base_ref=${base_ref}"
    echo "pending=${pending}"
    echo "has_changes=${has_changes}"
    echo "head_sha=${head_sha}"
  } >> "$OUTPUT_FILE"
fi

echo "head=${head_sha} last_tag=${last_tag} pending=${pending} has_changes=${has_changes}"
