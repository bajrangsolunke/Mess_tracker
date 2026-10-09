/** Name matching across scripts and spellings: "राहुल" finds "Rahul", "Patil" finds "पाटील".
 *  Mirrors backend/app/core/phonetic.py; both are tested with the same cases. */

const VOWELS: Record<string, string> = { अ: "a", आ: "a", इ: "i", ई: "i", उ: "u", ऊ: "u", ऋ: "ru", ए: "e", ऐ: "ai", ओ: "o", औ: "au", ॲ: "a", ऑ: "o" };
const SIGNS: Record<string, string> = { "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "ृ": "ru", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॅ": "a", "ॉ": "o" };
const CONSONANTS: Record<string, string> = {
  क: "k", ख: "kh", ग: "g", घ: "gh", ङ: "n", च: "ch", छ: "chh", ज: "j", झ: "jh", ञ: "n",
  ट: "t", ठ: "th", ड: "d", ढ: "dh", ण: "n", त: "t", थ: "th", द: "d", ध: "dh", न: "n",
  प: "p", फ: "ph", ब: "b", भ: "bh", म: "m", य: "y", र: "r", ल: "l", ळ: "l", व: "v",
  श: "sh", ष: "sh", स: "s", ह: "h",
};
const NASAL = new Set(["ं", "ँ"]);
const VIRAMA = "्";
const SKIP = new Set(["़", "ः", "ऽ"]);

export function toAsciiDigits(text: string): string {
  return text.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - 0x0966));
}

export function transliterate(text: string): string {
  const chars = [...toAsciiDigits(text)];
  let out = "";
  chars.forEach((ch, i) => {
    const next = chars[i + 1] ?? "";
    if (ch in CONSONANTS) {
      out += CONSONANTS[ch];
      if (next in SIGNS || next === VIRAMA || SKIP.has(next)) return;
      if (next && (next in CONSONANTS || NASAL.has(next) || next in VOWELS)) out += "a"; // inherent vowel, not at word end
    } else if (ch in SIGNS) out += SIGNS[ch];
    else if (ch in VOWELS) out += VOWELS[ch];
    else if (NASAL.has(ch)) out += "n";
    else if (ch === VIRAMA || SKIP.has(ch)) return;
    else out += ch;
  });
  return out;
}

function key(word: string): string {
  let w = transliterate(word).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [a, b] of [["ee", "i"], ["ii", "i"], ["oo", "u"], ["uu", "u"], ["w", "v"], ["z", "j"], ["q", "k"]] as const) w = w.split(a).join(b);
  if (w.length > 1) w = w[0] + w.slice(1).replace(/a/g, "");
  return w.replace(/(.)\1+/g, "$1");
}

export function phoneticKeys(text: string): string[] {
  return text.trim().split(/\s+/).map(key).filter(Boolean);
}

/** Every word typed/spoken is the start of some word of the name. */
export function nameMatches(name: string, query: string): boolean {
  const q = phoneticKeys(query);
  if (!q.length) return false;
  const n = phoneticKeys(name);
  return q.every((k) => n.some((part) => part.startsWith(k)));
}
