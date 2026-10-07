/** Mirrors backend normalize_phone: digits only, strip +91 / 91 / 0091 / leading 0. */
export function normalizePhoneInput(v: string): string {
  let d = v.replace(/\D/g, "");
  if (d.length === 14 && d.startsWith("0091")) d = d.slice(4);
  else if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}
