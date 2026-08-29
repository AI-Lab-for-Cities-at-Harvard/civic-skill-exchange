#!/usr/bin/env python3
"""Signature scanning for submitted skills — scan layers L2 and L3.

L2 signatures are high precision and fail the build. L3 signatures are noisy by
nature and route to a human instead; several of them fire on entirely legitimate
skills, which is why they must never auto-block.

This is triage, not a gate. Published bypass rates against open-source skill
scanners run 11.6-33.5%, via payloads hidden in archive formats and code examples.
A clean result means no known-bad signal matched. It does not mean a skill is safe.
See docs/SECURITY.md for the threat model and what this deliberately does not cover.

Usage:
    scan.py all --out findings.json
    scan.py --changed changed.txt --out findings.json
    scan.py skills/octocat/permit-status-explainer

Exit code 1 if any L2 signature matched, 0 otherwise.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = ROOT / "skills"

Signature = tuple[str, re.Pattern[str], str]

# --------------------------------------------------------------------------- #
# L2 — hard signatures. High precision. These fail the build.
#
# When one of these fires, ask the contributor rather than assuming malice: there
# are legitimate reasons to need environment access. But do not merge past it, and
# never accept an obfuscated rewrite that dodges the pattern.

HARD: list[Signature] = [
    (
        "dynamic-context-exec",
        re.compile(r"!`[^`\n]*\b(?:curl|wget|nc|bash|sh|eval)\b", re.IGNORECASE),
        "Dynamic-context command invoking a network or shell tool. These execute on "
        "the host during preprocessing, before any model reads the file — a model "
        "cannot refuse what has already run.",
    ),
    (
        "dynamic-context-secrets",
        re.compile(
            r"!`[^`\n]*(?:cat[^`\n]*env|find[^`\n]*secret|grep[^`\n]*password|auth[^`\n]*token)",
            re.IGNORECASE,
        ),
        "Dynamic-context command reading credentials or environment state during "
        "preprocessing.",
    ),
    (
        "wildcard-bash-grant",
        re.compile(r"allowed-tools:.*Bash\(\s*\*\s*\)", re.IGNORECASE),
        "Unrestricted Bash grant. allowed-tools applies without a permission prompt "
        "and is not gated by workspace trust. Automatic rejection, no exceptions.",
    ),
    (
        "credential-access",
        re.compile(r"(?:os\.environ|getenv|process\.env|printenv|\$AWS_|\.ssh/|\.aws/credentials)"),
        "Credential or environment access. Must be declared in compatibility and "
        "consistent with civic.data-sensitivity.",
    ),
]

# --------------------------------------------------------------------------- #
# L3 — soft signatures. Noisy. These route to a human and never block.

SOFT: list[Signature] = [
    (
        "external-url",
        re.compile(r"https?://(?!(?:www\.)?(?:github\.com|agentskills\.io|w3\.org|schema\.org))[^\s)\"'<>]+"),
        "External URL. Fires on virtually any skill that cites documentation, so it "
        "is useless as a blocker and useful as a triage signal — check the domains.",
    ),
    (
        "network-in-script",
        re.compile(r"\b(?:requests\.(?:get|post|put)|urllib\.request|http\.client|socket\.socket|fetch\(|axios\.)"),
        "Network call in executable code. Check it against the skill's stated purpose.",
    ),
    (
        "dynamic-execution",
        re.compile(r"\b(?:eval\(|exec\(|__import__\(|importlib\.import_module|new Function\()"),
        "Dynamic code execution. Rarely necessary in a skill helper.",
    ),
    (
        "encoded-blob",
        re.compile(r"[A-Za-z0-9+/]{200,}={0,2}"),
        "Long encoded blob. Decode it before signing off on anything.",
    ),
    (
        "bidi-or-invisible",
        re.compile(r"[‪-‮⁦-⁩​-‏﻿]"),
        "Bidirectional or invisible control characters. These hide text from a human "
        "reader while leaving it visible to the agent.",
    ),
    (
        "instruction-suppression",
        re.compile(
            r"(?:ignore\s+(?:all\s+)?previous\s+instructions"
            r"|disregard\s+(?:the\s+)?(?:above|prior|previous)"
            r"|do\s+not\s+(?:tell|inform|mention\s+to)\s+the\s+user"
            r"|without\s+(?:telling|informing|notifying)\s+the\s+user"
            r"|don't\s+(?:mention|report|summarize)\s+this)",
            re.IGNORECASE,
        ),
        "Language instructing the agent to disregard instructions or conceal an "
        "action. Legitimate skills never need to hide work from the person running "
        "them — treat as disqualifying regardless of stated rationale.",
    ),
]

SCANNABLE_SUFFIXES = {
    ".md", ".txt", ".yml", ".yaml", ".json", ".toml", ".csv", ".tsv",
    ".py", ".sh", ".bash", ".js", ".mjs", ".ts", ".sql", ".jinja", ".j2",
    ".html", ".css", ".xml", ".ini", ".cfg",
}


# --------------------------------------------------------------------------- #


def scan_text(text: str, signatures: list[Signature], rel: str) -> list[dict]:
    findings = []
    for name, pattern, explanation in signatures:
        for match in pattern.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            excerpt = match.group(0)
            findings.append(
                {
                    "signature": name,
                    "file": rel,
                    "line": line,
                    "excerpt": excerpt[:160],
                    "explanation": explanation,
                }
            )
            break  # one hit per signature per file is enough to route it
    return findings


def scan_skill(skill_dir: Path) -> dict:
    blocking: list[dict] = []
    flags: list[dict] = []

    for path in sorted(skill_dir.rglob("*")):
        if not path.is_file() or path.is_symlink():
            continue
        if path.suffix.lower() not in SCANNABLE_SUFFIXES:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        rel = str(path.relative_to(skill_dir))
        blocking.extend(scan_text(text, HARD, rel))
        flags.extend(scan_text(text, SOFT, rel))

    return {"blocking": blocking, "flags": flags}


def discover(changed_file: Path) -> list[Path]:
    dirs: set[Path] = set()
    for line in changed_file.read_text(encoding="utf-8").splitlines():
        parts = Path(line.strip()).parts
        if len(parts) >= 3 and parts[0] == "skills":
            candidate = ROOT / parts[0] / parts[1] / parts[2]
            if candidate.is_dir():
                dirs.add(candidate)
    return sorted(dirs)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("target", nargs="?", help="'all', or a path to one skill directory")
    parser.add_argument("--changed", type=Path, help="file listing changed paths, one per line")
    parser.add_argument("--out", type=Path, help="write findings JSON here")
    parser.add_argument("--pr", help="pull request number, recorded in the output")
    args = parser.parse_args()

    if args.changed:
        targets = discover(args.changed)
    elif args.target == "all":
        targets = sorted(p for p in SKILLS_DIR.glob("*/*") if p.is_dir())
    elif args.target:
        targets = [Path(args.target).resolve()]
    else:
        parser.error("give a target, 'all', or --changed")

    results: dict[str, dict] = {}
    total_blocking = 0
    total_flags = 0

    for skill_dir in targets:
        skill_id = f"{skill_dir.parent.name}/{skill_dir.name}"
        result = scan_skill(skill_dir)
        results[skill_id] = result
        total_blocking += len(result["blocking"])
        total_flags += len(result["flags"])

        if result["blocking"]:
            print(f"BLOCK {skill_id}")
            for f in result["blocking"]:
                print(f"        [{f['signature']}] {f['file']}:{f['line']}  {f['excerpt']}")
        elif result["flags"]:
            print(f"flag  {skill_id}  ({len(result['flags'])} for review)")
            for f in result["flags"]:
                print(f"        [{f['signature']}] {f['file']}:{f['line']}  {f['excerpt']}")
        else:
            print(f"ok    {skill_id}")

    payload = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "pr": args.pr,
        "skills_scanned": len(targets),
        "blocking_count": total_blocking,
        "flag_count": total_flags,
        "results": results,
    }

    if args.out:
        args.out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    print(
        f"\n{len(targets)} scanned — {total_blocking} blocking, {total_flags} flagged for review."
    )
    print("Signature scanning is triage. A clean result is not a safety guarantee.")
    return 1 if total_blocking else 0


if __name__ == "__main__":
    sys.exit(main())
