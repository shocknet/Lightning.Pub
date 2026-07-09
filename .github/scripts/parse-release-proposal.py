#!/usr/bin/env python3
"""Extract and validate a release proposal from Cursor agent output."""

import json
import re
import sys
from pathlib import Path


def extract_json_blob(text: str) -> dict:
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        return json.loads(fenced.group(1))

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in agent output")

    return json.loads(text[start : end + 1])


def parse_version(version: str) -> tuple[int, int, int]:
    parts = version.split(".")
    if len(parts) != 3 or not all(part.isdigit() for part in parts):
        raise ValueError(f"Invalid semver: {version}")
    return int(parts[0]), int(parts[1]), int(parts[2])


def bump_version(current: str, bump: str) -> str:
    major, minor, patch = parse_version(current)
    if bump == "major":
        return f"{major + 1}.0.0"
    if bump == "minor":
        return f"{major}.{minor + 1}.0"
    if bump == "patch":
        return f"{major}.{minor}.{patch + 1}"
    raise ValueError(f"Invalid bump type: {bump}")


def compare_versions(left: str, right: str) -> int:
    left_parts = parse_version(left)
    right_parts = parse_version(right)
    if left_parts < right_parts:
        return -1
    if left_parts > right_parts:
        return 1
    return 0


def load_context(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def validate_proposal(proposal: dict, context: dict) -> dict:
    for key in ("version", "bump", "release_notes"):
        if key not in proposal or not str(proposal[key]).strip():
            raise ValueError(f"Missing required field: {key}")

    version = str(proposal["version"]).strip().lstrip("v")
    bump = str(proposal["bump"]).strip().lower()
    release_notes = str(proposal["release_notes"]).strip()
    warnings: list[str] = []

    if bump not in {"major", "minor", "patch"}:
        raise ValueError(f"Invalid bump type: {bump}")

    parse_version(version)

    current_version = str(context.get("current_version", "")).strip()
    if current_version:
        expected = bump_version(current_version, bump)
        if version != expected:
            raise ValueError(
                f"Version {version} does not match {bump} bump from "
                f"{current_version} (expected {expected})"
            )
        if compare_versions(version, current_version) <= 0:
            raise ValueError(
                f"Proposed version {version} must be greater than {current_version}"
            )

    if context.get("buf_breaking") and bump != "major":
        raise ValueError(
            "buf detected breaking proto changes; bump must be major"
        )

    min_bump = str(context.get("min_bump", "")).strip().lower()
    if min_bump in {"major", "minor", "patch"}:
        bump_rank = {"patch": 0, "minor": 1, "major": 2}
        if bump_rank[bump] < bump_rank[min_bump]:
            raise ValueError(
                f"Bump {bump} is below required minimum {min_bump}"
            )

    if bump == "major" and not context.get("buf_breaking"):
        warnings.append(
            "Major bump proposed without buf breaking changes; verify manually."
        )

    if context.get("proto_changed") and bump == "patch":
        warnings.append(
            "Proto files changed but bump is patch; confirm API compatibility."
        )

    return {
        "version": version,
        "bump": bump,
        "release_notes": release_notes,
        "warnings": warnings,
    }


def main() -> None:
    raw = Path(sys.argv[1]).read_text(encoding="utf-8")
    proposal = extract_json_blob(raw)
    context = load_context(Path(sys.argv[3])) if len(sys.argv) > 3 else {}
    validated = validate_proposal(proposal, context)

    Path(sys.argv[2]).write_text(json.dumps(validated, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
