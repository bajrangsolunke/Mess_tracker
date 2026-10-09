"""Name matching across scripts and spellings: "राहुल" finds "Rahul", "Patil" finds "पाटील".

Devanagari is transliterated to simple Latin, then both sides are reduced to a loose key
(lower case, ee/ii→i, oo/uu→u, w→v, no 'a' after the first letter, no doubled letters), so
voice input in Marathi/Hindi and English spellings meet in the middle. Must stay in step with
frontend/src/lib/phonetic.ts (same cases are tested on both sides).
"""

import re

_VOWELS = {
    "अ": "a",
    "आ": "a",
    "इ": "i",
    "ई": "i",
    "उ": "u",
    "ऊ": "u",
    "ऋ": "ru",
    "ए": "e",
    "ऐ": "ai",
    "ओ": "o",
    "औ": "au",
    "ॲ": "a",
    "ऑ": "o",
}
_SIGNS = {
    "ा": "a",
    "ि": "i",
    "ी": "i",
    "ु": "u",
    "ू": "u",
    "ृ": "ru",
    "े": "e",
    "ै": "ai",
    "ो": "o",
    "ौ": "au",
    "ॅ": "a",
    "ॉ": "o",
}
_CONSONANTS = {
    "क": "k",
    "ख": "kh",
    "ग": "g",
    "घ": "gh",
    "ङ": "n",
    "च": "ch",
    "छ": "chh",
    "ज": "j",
    "झ": "jh",
    "ञ": "n",
    "ट": "t",
    "ठ": "th",
    "ड": "d",
    "ढ": "dh",
    "ण": "n",
    "त": "t",
    "थ": "th",
    "द": "d",
    "ध": "dh",
    "न": "n",
    "प": "p",
    "फ": "ph",
    "ब": "b",
    "भ": "bh",
    "म": "m",
    "य": "y",
    "र": "r",
    "ल": "l",
    "ळ": "l",
    "व": "v",
    "श": "sh",
    "ष": "sh",
    "स": "s",
    "ह": "h",
}
_NASAL = {"ं": "n", "ँ": "n"}
_VIRAMA = "्"
_SKIP = {"़", "ः", "ऽ"}
_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")


def to_ascii_digits(text: str) -> str:
    return text.translate(_DIGITS)


def transliterate(text: str) -> str:
    """Devanagari → plain Latin (inherent 'a' kept except at the end of a word)."""
    out: list[str] = []
    chars = list(to_ascii_digits(text))
    for i, ch in enumerate(chars):
        nxt = chars[i + 1] if i + 1 < len(chars) else ""
        if ch in _CONSONANTS:
            out.append(_CONSONANTS[ch])
            if nxt in _SIGNS or nxt == _VIRAMA or nxt in _SKIP:
                continue
            # inherent vowel, dropped at the end of a word
            if nxt and (nxt in _CONSONANTS or nxt in _NASAL or nxt in _VOWELS):
                out.append("a")
        elif ch in _SIGNS:
            out.append(_SIGNS[ch])
        elif ch in _VOWELS:
            out.append(_VOWELS[ch])
        elif ch in _NASAL:
            out.append("n")
        elif ch == _VIRAMA or ch in _SKIP:
            continue
        else:
            out.append(ch)
    return "".join(out)


def _key(word: str) -> str:
    w = transliterate(word).lower()
    w = re.sub(r"[^a-z0-9]", "", w)
    for a, b in (
        ("ee", "i"),
        ("ii", "i"),
        ("oo", "u"),
        ("uu", "u"),
        ("w", "v"),
        ("z", "j"),
        ("q", "k"),
    ):
        w = w.replace(a, b)
    if len(w) > 1:
        w = w[0] + w[1:].replace("a", "")
    return re.sub(r"(.)\1+", r"\1", w)


def keys(text: str) -> list[str]:
    return [k for k in (_key(p) for p in re.split(r"\s+", text.strip())) if k]


def matches(name: str, query: str) -> bool:
    """Every word typed/spoken is the start of some word of the name."""
    q = keys(query)
    if not q:
        return False
    n = keys(name)
    return all(any(part.startswith(k) for part in n) for k in q)
