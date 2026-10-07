export type Lang = "en" | "hi" | "mr";
export const LANGS: Lang[] = ["en", "hi", "mr"];

const KEYS = {
  lang: "mt.lang",
  access: "mt.access",
  refresh: "mt.refresh",
  user: "mt.user",
  onboarded: "mt.onboarded",
} as const;

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function set(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

export const storage = {
  getLanguage: (): Lang | null => {
    const v = get(KEYS.lang);
    return v && (LANGS as string[]).includes(v) ? (v as Lang) : null;
  },
  setLanguage: (l: Lang) => set(KEYS.lang, l),
  getAccess: () => get(KEYS.access),
  getRefresh: () => get(KEYS.refresh),
  getUserJson: () => get(KEYS.user),
  setTokens: (access: string | null, refresh: string | null) => {
    set(KEYS.access, access);
    set(KEYS.refresh, refresh);
  },
  setUserJson: (json: string | null) => set(KEYS.user, json),
  getOnboarded: () => get(KEYS.onboarded) === "1",
  setOnboarded: () => set(KEYS.onboarded, "1"),
};
