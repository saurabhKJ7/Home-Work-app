"""
PromptFilterEngine: fast, rule-based input filter for teacher prompts.

- Pure Python (no external deps)
- Keyword/regex checks for vague or malicious inputs
- Lightweight fuzzy matching using difflib for obfuscations (optional)
"""
from __future__ import annotations

from dataclasses import dataclass, field
import re
from difflib import SequenceMatcher
from typing import List, Tuple, Iterable


def _normalize(text: str) -> str:
    # Lowercase and collapse whitespace; simple leetspeak normalization
    t = text.lower()
    t = t.replace("0", "o").replace("1", "i").replace("3", "e").replace("5", "s").replace("7", "t")
    t = re.sub(r"\s+", " ", t).strip()
    return t


def _tokenize(text: str) -> List[str]:
    return re.findall(r"[a-z0-9_]+", text.lower())


def _fuzzy_contains(text: str, keywords: Iterable[str], threshold: float = 0.9) -> bool:
    if not keywords:
        return False
    tokens = _tokenize(text)
    if not tokens:
        return False
    for kw in keywords:
        kw_n = _normalize(kw)
        if kw_n in text:
            return True
        # Check against tokens and short n-grams
        for tok in tokens:
            if SequenceMatcher(None, kw_n, tok).ratio() >= threshold:
                return True
        # 2-3 gram windows
        for n in (2, 3):
            for i in range(max(0, len(tokens) - n + 1)):
                gram = " ".join(tokens[i : i + n])
                if SequenceMatcher(None, kw_n, gram).ratio() >= threshold:
                    return True
    return False


@dataclass
class PromptFilterConfig:
    min_length: int = 10
    vague_keywords: List[str] = field(default_factory=lambda: [
        "anything",
        "something",
        "whatever",
        "idk",
        "don't know",
        "anything is fine",
        "random",
        "blah",
        "nonsense",
    ])
    malicious_keywords: List[str] = field(default_factory=lambda: [
        "ignore",
        "bypass",
        "delete",
        "drop table",
        "system prompt",
        "inject",
        "hack",
        "prompt injection",
        "sudo",
        "rm -rf",
    ])
    # Regexes
    only_symbols_re: re.Pattern = re.compile(r"[^a-zA-Z0-9]+\Z")
    repeated_word_re: re.Pattern = re.compile(r"\b(\w+)\b\s+\1", re.IGNORECASE)
    # Fuzzy matching threshold (0 disables fuzzy layer)
    fuzzy_threshold: float = 0.9


class PromptFilterEngine:
    def __init__(self, config: PromptFilterConfig | None = None) -> None:
        self.config = config or PromptFilterConfig()

    def check(self, prompt: str) -> Tuple[bool, str]:
        if prompt is None:
            return False, "Empty prompt"
        p = _normalize(prompt)

        # 1) Length
        if len(p.strip()) < self.config.min_length:
            return False, "Prompt too short"

        # 2) Symbols-only
        if self.config.only_symbols_re.fullmatch(p):
            return False, "Invalid characters"

        # 3) Repeated words (spam)
        if self.config.repeated_word_re.search(p):
            return False, "Repeated words detected"

        # 4) Vague keywords
        if any(k in p for k in map(_normalize, self.config.vague_keywords)):
            return False, "Prompt too vague"
        if self.config.fuzzy_threshold and _fuzzy_contains(p, self.config.vague_keywords, self.config.fuzzy_threshold):
            return False, "Prompt too vague (fuzzy)"

        # 5) Malicious/injection keywords
        if any(k in p for k in map(_normalize, self.config.malicious_keywords)):
            return False, "Possible injection detected"
        if self.config.fuzzy_threshold and _fuzzy_contains(p, self.config.malicious_keywords, self.config.fuzzy_threshold):
            return False, "Possible injection detected (fuzzy)"

        return True, "Valid prompt"


