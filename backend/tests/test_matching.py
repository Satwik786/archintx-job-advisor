from app.services.matching import match_resume

SKILLS = ["Python", "FastAPI", "PostgreSQL", "Git", "REST API"]


def test_spec_example_is_80_percent():
    r = match_resume("I have built applications using Python, FastAPI, and Git. I have experience creating REST APIs.", SKILLS)
    assert r.matched == ["Python", "FastAPI", "Git", "REST API"]
    assert r.missing == ["PostgreSQL"]
    assert r.score == 80


def test_case_and_whitespace_insensitive():
    assert match_resume("python   \n fastapi   rest\tapi", SKILLS).score == 60


def test_no_substring_false_positives():
    assert match_resume("I know JavaScript", ["Java"]).matched == []
    assert match_resume("I know C++", ["C"]).matched == []
    assert match_resume("pythonic code", ["Python"]).matched == []


def test_repeats_counted_once():
    r = match_resume("Python Python python PYTHON", SKILLS)
    assert r.matched == ["Python"] and r.score == 20


def test_special_characters_and_display_names():
    r = match_resume("Used Node.js and C# daily", ["Node.js", "C#", "Go"])
    assert r.matched == ["Node.js", "C#"] and r.missing == ["Go"] and r.score == 67


def test_empty_and_invalid_skill_lists():
    assert match_resume("python", []).score == 0
    assert match_resume("python", None).score == 0
    assert match_resume("python", ["", "  ", 5]).score == 0


def test_zero_and_full_scores():
    assert match_resume("nothing relevant", SKILLS).score == 0
    assert match_resume("Python FastAPI PostgreSQL Git REST API", SKILLS).score == 100


def test_duplicate_skills_deduped():
    assert match_resume("python", ["Python", "python"]).score == 100
