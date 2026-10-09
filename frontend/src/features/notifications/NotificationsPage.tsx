import { Box, Button, Stack, Typography, alpha } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Notification } from "../../api/types";
import { useMarkNotificationsRead, useNotifications } from "../../api/useLeaves";
import { useSession } from "../auth/authStore";
import { PageHeader } from "../../components/brand/PageHeader";
import { BellSpoonIcon, PlateCheckIcon, ThaliIcon, WalletRupeeIcon } from "../../components/brand/icons";
import { brand } from "../../app/theme";
import dayjs from "dayjs";
import LocalShippingIcon from "@mui/icons-material/LocalShippingRounded";
import AutorenewIcon from "@mui/icons-material/AutorenewRounded";
import BadgeIcon from "@mui/icons-material/BadgeRounded";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const ICON: Record<Notification["type"], { el: React.ReactNode; color: string }> = {
  payment_due: { el: <WalletRupeeIcon />, color: brand.goldDark },
  leave_decided: { el: <PlateCheckIcon />, color: brand.green },
  announcement: { el: <ThaliIcon />, color: brand.red },
  general: { el: <BellSpoonIcon />, color: brand.inkSoft },
  meal: { el: <PlateCheckIcon />, color: brand.green },
  tiffin: { el: <LocalShippingIcon />, color: brand.red },
  payment: { el: <WalletRupeeIcon />, color: brand.greenDark },
  membership: { el: <AutorenewIcon />, color: brand.goldDark },
  staff: { el: <BadgeIcon />, color: brand.inkSoft },
};

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const { data } = useNotifications();
  const mark = useMarkNotificationsRead();
  const home = user?.role === "owner" ? "/owner" : user?.role === "staff" ? "/staff" : "/app";
  const locale = i18n.language === "mr" || i18n.language === "hi" ? i18n.language : "en";

  return (
    <Stack spacing={2}>
      <PageHeader title={t("notifications.title")} back={home} action={data && data.unread > 0 ? <Button size="small" onClick={() => mark.mutate(undefined)} sx={{ minHeight: 40 }}>{t("notifications.readAll")}</Button> : null} />
      <Stack spacing={1.25}>
        {(data?.items ?? []).map((n) => {
          const ic = ICON[n.type];
          const unread = !n.read_at;
          return (
            <Box
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (unread) mark.mutate(n.id);
                if (n.ref_type === "leave") navigate(user?.role === "owner" ? "/owner/leaves" : "/app/leave");
                if (n.ref_type === "bill") navigate(user?.role === "owner" ? "/owner/payments" : "/app/payments");
              }}
              sx={{ display: "flex", gap: 1.5, p: 1.5, borderRadius: "14px", bgcolor: unread ? alpha(brand.gold, 0.08) : brand.paper, border: `1px solid ${unread ? alpha(brand.gold, 0.4) : brand.line}`, cursor: "pointer" }}
            >
              <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: alpha(ic.color, 0.12), color: ic.color, display: "grid", placeItems: "center", flexShrink: 0 }}>{ic.el}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ lineHeight: 1.3, fontWeight: unread ? 700 : 600 }}>{n.title}</Typography>
                {n.body ? <Typography variant="body2" sx={{ color: "text.secondary" }}>{n.body}</Typography> : null}
                <Typography variant="caption">{dayjs(n.created_at).locale(locale).fromNow()}</Typography>
              </Box>
            </Box>
          );
        })}
        {data && data.items.length === 0 ? <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>{t("notifications.empty")}</Typography> : null}
      </Stack>
    </Stack>
  );
}
