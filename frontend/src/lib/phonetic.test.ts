import { describe, expect, it } from "vitest";
import { nameMatches, toAsciiDigits } from "./phonetic";

// keep in step with backend/tests/test_phonetic.py
const CASES: [string, string][] = [
  ["Rahul Sharma", "राहुल"],
  ["Rahul Sharma", "शर्मा"],
  ["Priya Deshmukh", "देशमुख"],
  ["Sandeep Yadav", "संदीप"],
  ["Vikas Jadhav", "विकास जाधव"],
  ["Sneha Patil", "पाटील"],
  ["Kiran Shinde", "शिंदे"],
  ["Pooja Kulkarni", "पूजा"],
  ["Vijay Bhosale", "भोसले"],
  ["राहुल शर्मा", "Rahul"],
  ["सचिन पाटील", "sachin pat"],
  ["Rahul Sharma", "rah"],
];
const NOT: [string, string][] = [["Rahul Sharma", "सचिन"], ["Sneha Patil", "राहुल"], ["Amit Kumar", "Sumit"]];

describe("nameMatches", () => {
  it.each(CASES)("%s ← %s", (name, q) => expect(nameMatches(name, q)).toBe(true));
  it.each(NOT)("%s ✗ %s", (name, q) => expect(nameMatches(name, q)).toBe(false));
  it("converts Devanagari digits", () => expect(toAsciiDigits("१००५")).toBe("1005"));
});
