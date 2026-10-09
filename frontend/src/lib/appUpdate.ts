import { useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";

/** The installed app's version handling: the browser checks when the app is opened, and
 *  people can check by hand from Settings. A new version waits until they tap "Update". */

declare const __BUILD_TIME__: string;
export const BUILD_TIME: string = typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "";

let registration: ServiceWorkerRegistration | undefined;
let needRefresh = false;
let apply: (reload?: boolean) => Promise<void> = async () => undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function initAppUpdate(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  apply = registerSW({
    onNeedRefresh() {
      needRefresh = true;
      emit();
    },
    onRegisteredSW(_url, r) {
      registration = r;
    },
  });
}

export function useNeedRefresh(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => needRefresh,
    () => false,
  );
}

/** Reload into the waiting version. */
export function applyUpdate(): void {
  void apply(true);
  // fallback when the new version did not take over the page by itself
  setTimeout(() => window.location.reload(), 2500);
}

export type CheckResult = "available" | "latest" | "offline" | "unsupported";

export async function checkForUpdate(): Promise<CheckResult> {
  const r = registration ?? (await navigator.serviceWorker?.getRegistration());
  if (!r) return "unsupported";
  if (!navigator.onLine) return "offline";
  if (r.waiting || needRefresh) return "available";
  await r.update();
  const installing = r.installing;
  if (installing) {
    await new Promise<void>((resolve) => {
      const done = () => (installing.state === "installed" || installing.state === "redundant" ? resolve() : undefined);
      installing.addEventListener("statechange", done);
      setTimeout(resolve, 20_000);
    });
  }
  if (r.waiting) {
    needRefresh = true;
    emit();
    return "available";
  }
  return "latest";
}
