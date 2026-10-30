"""Server-side skill matching. See README "Skill-matching algorithm"."""
import re
from dataclasses import dataclass

# A skill counts only if not glued to other letters/digits/+/# (so "Java" != "JavaScript",
# "C" != "C++"). A trailing plural "s"/"es" is tolerated ("REST APIs" matches "REST API").
_BEFORE = r"(?<![A-Za-z0-9+#])"
_AFTER = r"(?:e?s)?(?![A-Za-z0-9+#])"


@dataclass
class MatchResult:
    matched: list[str]
    missing: list[str]
    score: int


def normalize_skills(skills) -> list[str]:
    """Trim, collapse whitespace, drop empties/non-strings, dedupe case-insensitively (keep first display name)."""
    seen, out = set(), []
    for s in skills or []:
        if not isinstance(s, str):
            continue
        s = " ".join(s.split())
        if s and s.lower() not in seen:
            seen.add(s.lower())
            out.append(s)
    return out


def _skill_pattern(skill: str) -> re.Pattern:
    words = [re.escape(w) for w in skill.split()]
    return re.compile(_BEFORE + r"\s+".join(words) + _AFTER, re.IGNORECASE)


def match_resume(resume_text: str, required_skills) -> MatchResult:
    skills = normalize_skills(required_skills)
    if not skills:
        return MatchResult([], [], 0)
    text = " ".join((resume_text or "").split())
    matched = [s for s in skills if _skill_pattern(s).search(text)]
    missing = [s for s in skills if s not in matched]
    # integer half-up rounding: round(matched/total*100)
    score = (len(matched) * 200 + len(skills)) // (2 * len(skills))
    return MatchResult(matched, missing, score)
