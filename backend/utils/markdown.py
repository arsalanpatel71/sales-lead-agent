"""
Utilities for parsing markdown-formatted agent responses.
Agents often return JSON wrapped in code fences, or structured markdown sections.
"""
import json
import re


def extract_code_block(text: str, lang: str = "") -> str | None:
    """Return the content of the first fenced code block, optionally filtered by language tag."""
    pattern = rf"```{lang}\s*\n?([\s\S]*?)```" if lang else r"```(?:\w+)?\s*\n?([\s\S]*?)```"
    match = re.search(pattern, text, re.IGNORECASE)
    return match.group(1).strip() if match else None


def parse_json_from_markdown(text: str) -> dict | list | None:
    """
    Extract and parse a JSON value from markdown text.
    Tries, in order:
      1. JSON inside a ```json … ``` code fence
      2. JSON inside any ``` … ``` code fence
      3. First JSON array  [ … ]  in the raw text
      4. First JSON object { … }  in the raw text
    Returns the parsed Python object, or None if nothing valid is found.
    """
    # 1. json-tagged code fence
    raw = extract_code_block(text, lang="json")
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass

    # 2. any code fence
    raw = extract_code_block(text)
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass

    # 3. bare JSON array
    m = re.search(r"\[[\s\S]*\]", text)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass

    # 4. bare JSON object
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return json.loads(m.group())
        except json.JSONDecodeError:
            pass

    return None


def parse_markdown_sections(text: str) -> dict[str, list[str]]:
    """
    Split markdown into sections by heading (# / ## / ### / ####).
    Returns {heading_text_lower: [lines_in_section]}.
    """
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for line in text.splitlines():
        heading = re.match(r"^#{1,4}\s+(.+)", line)
        if heading:
            current = heading.group(1).strip().lower()
            sections[current] = []
        elif current is not None:
            sections[current].append(line)
    return sections
