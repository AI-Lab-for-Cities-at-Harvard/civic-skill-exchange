#!/usr/bin/env python3
"""Flesch-Kincaid grade level for a text file. No dependencies, no network.

    reading_level.py notice.txt

Reports the grade level plus the longest sentences, which is almost always where
the grade level actually comes from.
"""

import re
import sys
from pathlib import Path

VOWELS = "aeiouy"


def syllables(word: str) -> int:
    """Approximate. Good enough for a grade-level estimate, not for linguistics."""
    word = word.lower().strip(".,;:!?()[]\"'")
    if not word:
        return 0
    count, previous_was_vowel = 0, False
    for char in word:
        is_vowel = char in VOWELS
        if is_vowel and not previous_was_vowel:
            count += 1
        previous_was_vowel = is_vowel
    if word.endswith("e") and count > 1:
        count -= 1
    return max(count, 1)


def sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2

    text = Path(sys.argv[1]).read_text(encoding="utf-8")
    sents = sentences(text)
    words = re.findall(r"[A-Za-z']+", text)

    if not sents or not words:
        print("Nothing to score.")
        return 1

    total_syllables = sum(syllables(w) for w in words)
    words_per_sentence = len(words) / len(sents)
    syllables_per_word = total_syllables / len(words)
    grade = 0.39 * words_per_sentence + 11.8 * syllables_per_word - 15.59

    print(f"Grade level:          {grade:.1f}")
    print(f"Sentences:            {len(sents)}")
    print(f"Words:                {len(words)}")
    print(f"Words per sentence:   {words_per_sentence:.1f}")
    print(f"Syllables per word:   {syllables_per_word:.2f}")

    longest = sorted(sents, key=lambda s: len(s.split()), reverse=True)[:3]
    if longest:
        print("\nLongest sentences — usually where the grade level comes from:")
        for sentence in longest:
            print(f"  [{len(sentence.split()):>3} words] {sentence[:100]}...")

    if grade > 8:
        print("\nAbove grade 8. Split the sentences above before reaching for shorter words.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
