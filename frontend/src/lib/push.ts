import { api } from "../api/client";
import { isIos, isStandalone } from "./install";

/** Where the subscription belongs: the logged-in user, or a member via their link token. */
export type PushTarget = { kind: "user" } | { kind: "member"; token: string };
export type PushState = "on" | "off" | "denied" | "unsupported" | "install-first";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ?? null;
}

export async function pushState(): Promise<PushState> {
  // iPhone only allows push for apps added to the home screen
  if (isIos() && !isStandalone()) return "install-first";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await registration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function path(target: PushTarget): string {
  return target.kind === "user" ? "/push/subscriptions" : `/public/members/${target.token}/push`;
}

export async function enablePush(target: PushTarget): Promise<PushState> {
  const state = await pushState();
  if (state === "unsupported" || state === "install-first" || state === "denied") return state;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const reg = (await registration()) ?? (await navigator.serviceWorker.ready);
  const { public_key } = await api<{ public_key: string }>("/push/key");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(public_key) });
  await api<void>(path(target), { method: "POST", body: JSON.stringify(sub.toJSON()) });
  return "on";
}

export async function disablePush(target: PushTarget): Promise<PushState> {
  const reg = await registration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await api<void>(`${path(target)}?endpoint=${encodeURIComponent(sub.endpoint)}`, { method: "DELETE" }).catch(() => undefined);
    await sub.unsubscribe();
  }
  return "off";
}
