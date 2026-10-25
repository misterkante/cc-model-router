import re


def parse_duration(text):
    """Parse a duration like "1h30m", "45m" or "2h" into minutes.

    An empty string means zero minutes. Minutes must be between 0 and 59.
    Raise ValueError for anything else.
    """
    match = re.fullmatch(r"(?:(\d+)h)?(?:(\d+)m)?", text)
    if not match:
        raise ValueError(f"invalid duration: {text}")
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    return hours * 60 + minutes
