import { Box, Skeleton, Typography, alpha } from "@mui/material";
import CheckIcon from "@mui/icons-material/CheckRounded";
import ScheduleIcon from "@mui/icons-material/ScheduleRounded";
import WbSunnyIcon from "@mui/icons-material/WbSunnyRounded";
import NightsStayIcon from "@mui/icons-material/NightsStayRounded";
import { useTranslation } from "react-i18next";
import type { MealToday, MealType } from "../../api/types";
import { useMyToday } from "../../api/useMembership";
import { brand } from "../../app/theme";
import { formatTime } from "../../lib/date";

function MealStatus({ meal, state }: { meal: MealType; state: MealToday }) {
  const { t, i18n } = useTranslation();
  const at = state.marked_at ? formatTime(state.marked_at, i18n.language) : "";
  const icon = meal === "lunch" ? <WbSunnyIcon /> : <NightsStayIcon />;
  if (state.holiday) return <Box sx={{ flex: 1, p: 1.5, borderRadius: "14px", bgcolor: brand.cream, textAlign: "center" }}>{icon}<Typography variant="body2">{t("checkin.closed")}</Typography></Box>;
  if (state.status === "present")
    return (
      <Box sx={{ flex: 1, p: 1.25, borderRadius: "14px", bgcolor: alpha(brand.green, 0.12), border: `1.5px solid ${brand.green}`, textAlign: "center" }}>
        <Box sx={{ color: brand.green, display: "flex", justifyContent: "center", gap: 0.5, alignItems: "center" }}><CheckIcon /> {icon}</Box>
        <Typography variant="body2" sx={{ fontWeight: 700, color: brand.greenDark }}>{t("checkin.done", { meal: t(`meal.${meal}Short`) })}</Typography>
        <Typography variant="caption" sx={{ display: "block" }}>{at}</Typography>
      </Box>
    );
  if (state.status === "absent")
    return (
      <Box sx={{ flex: 1, p: 1.5, borderRadius: "14px", bgcolor: "#DC262610", textAlign: "center" }}>
        {icon}
        <Typography variant="body2" sx={{ fontWeight: 700, color: "#B91C1C" }}>{state.auto ? t("checkin.missed") : t("checkin.markedAbsent")}</Typography>
        <Typography variant="caption">{at} · {t("checkin.askOwner")}</Typography>
      </Box>
    );
  if (state.closed)
    return (
      <Box sx={{ flex: 1, p: 1.5, borderRadius: "14px", bgcolor: brand.cream, textAlign: "center" }}>
        {icon}
        <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("checkin.timeOver")}</Typography>
      </Box>
    );
  return (
    <Box sx={{ flex: 1, p: 1.5, borderRadius: "14px", bgcolor: state.on_leave ? alpha(brand.gold, 0.12) : brand.cream, textAlign: "center" }}>
      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, alignItems: "center", color: "text.secondary" }}><ScheduleIcon fontSize="small" /> {icon}</Box>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>{state.on_leave ? t("checkin.onLeave") : t("checkin.notYet")}</Typography>
      {state.ends_at ? <Typography variant="caption">{t("checkin.until", { time: formatTime(state.ends_at, i18n.language) })}</Typography> : null}
    </Box>
  );
}

/** Today's meals as marked by the mess (members only view; staff or owner mark). */
export function CheckInCard() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyToday();
  if (isLoading) return <Skeleton variant="rounded" height={120} sx={{ borderRadius: "16px" }} />;
  if (!data || data.expired) return null;
  const meals = (["lunch", "dinner"] as const).filter((m) => data[m].expected);
  if (!meals.length) return null;
  return (
    <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
      <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>{t("checkin.todayTitle")}</Typography>
      <Box sx={{ display: "flex", gap: 1.25 }}>
        {meals.map((m) => (
          <MealStatus key={m} meal={m} state={data[m]} />
        ))}
      </Box>
    </Box>
  );
}
