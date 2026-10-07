import { Alert, Box, Button, Skeleton, Typography, alpha } from "@mui/material";
import CheckIcon from "@mui/icons-material/CheckRounded";
import UndoIcon from "@mui/icons-material/UndoRounded";
import WbSunnyIcon from "@mui/icons-material/WbSunnyRounded";
import NightsStayIcon from "@mui/icons-material/NightsStayRounded";
import { useTranslation } from "react-i18next";
import type { MealToday, MealType } from "../../api/types";
import { useCheckIn, useMyToday } from "../../api/useMembership";
import { ApiError } from "../../api/client";
import { brand } from "../../app/theme";

function MealButton({ meal, state, onCheck, onUndo, busy }: { meal: MealType; state: MealToday; onCheck: () => void; onUndo: () => void; busy: boolean }) {
  const { t } = useTranslation();
  const icon = meal === "lunch" ? <WbSunnyIcon /> : <NightsStayIcon />;
  if (state.holiday) return <Box sx={{ flex: 1, p: 1.5, borderRadius: "14px", bgcolor: brand.cream, textAlign: "center" }}>{icon}<Typography variant="body2">{t("checkin.closed")}</Typography></Box>;
  if (state.status === "present")
    return (
      <Box sx={{ flex: 1, p: 1.25, borderRadius: "14px", bgcolor: alpha(brand.green, 0.12), border: `1.5px solid ${brand.green}`, textAlign: "center" }}>
        <Box sx={{ color: brand.green, display: "flex", justifyContent: "center", gap: 0.5, alignItems: "center" }}><CheckIcon /> {icon}</Box>
        <Typography variant="body2" sx={{ fontWeight: 700, color: brand.greenDark }}>{t("checkin.done", { meal: t(`meal.${meal}Short`) })}</Typography>
        {state.self_marked ? <Button size="small" startIcon={<UndoIcon />} onClick={onUndo} disabled={busy} sx={{ minHeight: 32, mt: 0.25 }}>{t("checkin.undo")}</Button> : <Typography variant="caption">{t("checkin.byOwner")}</Typography>}
      </Box>
    );
  if (state.status === "absent")
    return <Box sx={{ flex: 1, p: 1.5, borderRadius: "14px", bgcolor: "#DC262610", textAlign: "center" }}>{icon}<Typography variant="body2" sx={{ fontWeight: 700, color: "#B91C1C" }}>{t("checkin.markedAbsent")}</Typography><Typography variant="caption">{t("checkin.askOwner")}</Typography></Box>;
  return (
    <Button
      variant="contained"
      onClick={onCheck}
      disabled={busy}
      sx={{ flex: 1, flexDirection: "column", py: 1.25, minHeight: 84, gap: 0.25, borderRadius: "14px", ...(state.on_leave ? { backgroundImage: "none", bgcolor: brand.gold } : {}) }}
    >
      {icon}
      <span>{t("checkin.ate", { meal: t(`meal.${meal}Short`) })}</span>
      {state.on_leave ? <Typography variant="caption" sx={{ color: "inherit" }}>{t("checkin.onLeave")}</Typography> : null}
    </Button>
  );
}

/** Replaces signing the notebook: the member taps after eating. */
export function CheckInCard() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyToday();
  const check = useCheckIn();
  if (isLoading) return <Skeleton variant="rounded" height={120} sx={{ borderRadius: "16px" }} />;
  if (!data || data.expired) return null;
  const meals = (["lunch", "dinner"] as const).filter((m) => data[m].expected);
  if (!meals.length) return null;
  const err = check.error instanceof ApiError ? t(`checkin.error.${check.error.code}`, { defaultValue: t("common.error") }) : null;
  return (
    <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
      <Typography variant="h6" component="h2">{t("checkin.title")}</Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>{t("checkin.hint")}</Typography>
      <Box sx={{ display: "flex", gap: 1.25 }}>
        {meals.map((m) => (
          <MealButton key={m} meal={m} state={data[m]} busy={check.isPending} onCheck={() => check.mutate({ meal: m })} onUndo={() => check.mutate({ meal: m, undo: true })} />
        ))}
      </Box>
      {err ? <Alert severity="warning" sx={{ mt: 1.5 }}>{err}</Alert> : null}
    </Box>
  );
}
