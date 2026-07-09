#!/usr/bin/env bash
# Resolve the baseline tag and pending commit count for release automation.
# Ignores startos-v* tags and v* tags that point at HEAD (e.g. accidental releases).

set -euo pipefail

HEAD_SHA="${1:-HEAD}"
OUTPUT_FILE="${2:-}"

git fetch --tags origin >/dev/null 2>&1 || true

resolve_head_sha() {
  git rev-parse "$HEAD_SHA"
}

find_last_release_tag() {
  local head_sha="$1"
  local tag

  while IFS= read -r tag; do
    [ -n "$tag" ] || continue
    if [ "$(git rev-parse "$tag")" != "$head_sha" ]; then
      echo "$tag"
      return 0
    fi
  done < <(git tag -l 'v[0-9]*' --sort=-v:refname)

  return 1
}

head_sha="$(resolve_head_sha)"
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
