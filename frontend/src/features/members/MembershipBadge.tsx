import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { brand } from "../../app/theme";
import { todayIst } from "../../lib/date";
import dayjs from "dayjs";

/** "6 days left" / "Expired" chip from a valid-until date. Nothing when > 5 days left. */
export function MembershipBadge({ validUntil, always = false }: { validUntil: string | null; always?: boolean }) {
  const { t } = useTranslation();
  if (!validUntil) return null;
  const days = dayjs(validUntil).diff(dayjs(todayIst()), "day");
  if (!always && days > 5) return null;
  const expired = days < 0;
  const color = expired ? "#A61B1B" : days <= 5 ? brand.goldDark : brand.greenDark;
  const bg = expired ? "#DC262614" : days <= 5 ? `${brand.gold}26` : `${brand.green}1F`;
  const label = expired ? t("membership.expired") : days === 0 ? t("membership.endsToday") : t("membership.daysLeft", { count: days });
  return (
    <Box component="span" sx={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, px: 0.9, py: 0.2, borderRadius: 999, bgcolor: bg, color, whiteSpace: "nowrap" }}>
      {label}
    </Box>
  );
}
