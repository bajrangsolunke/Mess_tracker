/** Links shared with members on WhatsApp (one-tap, no API cost). */
import type { TFunction } from "i18next";
import type { Member } from "../api/types";
import { formatDateLong } from "./date";
import { rupees } from "./money";
import { planName } from "./plans";

export function trackUrl(token: string): string {
  return `${window.location.origin}/m/${token}`;
}

/** wa.me link with a prefilled message; Indian numbers get the 91 prefix. */
export function whatsappUrl(phone: string | null | undefined, text: string): string {
  const to = phone ? `91${phone.replace(/\D/g, "").slice(-10)}` : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

/** The WhatsApp message that carries the member's view-only tracking link. */
export function welcomeText(m: Member, mess: string, t: TFunction, lang: string): string {
  return t("track.welcomeText", {
    name: m.name,
    mess,
    no: m.member_no,
    plan: planName(m.plan, t),
    till: m.valid_until ? formatDateLong(m.valid_until, lang) : "—",
    due: Number(m.due) > 0 ? t("track.dueLine", { amount: rupees(m.due) }) : t("track.paidLine"),
    link: m.share_token ? trackUrl(m.share_token) : "",
  });
}

export function shareLinkText(m: Member, mess: string, t: TFunction): string {
  return t("track.linkText", { name: m.name, mess, link: m.share_token ? trackUrl(m.share_token) : "" });
}
