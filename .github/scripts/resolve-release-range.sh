#!/usr/bin/env bash
# Resolve the baseline tag and pending commit count for release automation.
# Uses the nearest ancestor v* tag (git describe), ignoring startos-v*.
# If HEAD is already a release tag, there is nothing new to release.

set -euo pipefail

HEAD_SHA="${1:-HEAD}"
OUTPUT_FILE="${2:-}"

git fetch --tags origin >/dev/null 2>&1 || true

head_sha="$(git rev-parse "$HEAD_SHA")"

# Exact release tag on HEAD (v1.2.3) — not startos-v*.
head_release_tag="$(
  git tag --points-at "$head_sha" \
    | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+' \
    | sort -V \
    | tail -1 \
    || true
)"

if [ -n "$head_release_tag" ]; then
  last_tag="$head_release_tag"
  base_ref="$head_release_tag"
  pending=0
  has_changes=false
else
  last_tag="$(git describe --tags --abbrev=0 --match 'v[0-9]*' "$head_sha" 2>/dev/null || true)"
  if [ -n "$last_tag" ]; then
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
