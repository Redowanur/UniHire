"""Languages a question's code snippet can be tagged with (the client highlights these)."""

CODE_LANGUAGES = {
    "python", "javascript", "typescript", "java", "c", "cpp", "csharp", "go",
    "rust", "sql", "bash", "json", "php", "kotlin", "xml", "plaintext",
}

# Names models tend to use, mapped onto the list above
LANGUAGE_ALIASES = {
    "js": "javascript", "node": "javascript", "ts": "typescript", "py": "python", "python3": "python",
    "c++": "cpp", "c#": "csharp", "cs": "csharp", "golang": "go", "sh": "bash", "shell": "bash",
    "html": "xml", "text": "plaintext", "none": "plaintext", "pseudocode": "plaintext",
}


def normalize_language(value: str | None) -> str | None:
    if not value:
        return None
    key = value.strip().lower()
    key = LANGUAGE_ALIASES.get(key, key)
    return key if key in CODE_LANGUAGES else "plaintext"
