import { Alert, Box, ButtonBase, Stack, Typography, alpha } from "@mui/material";
import CheckIcon from "@mui/icons-material/CheckRounded";
import WbSunnyIcon from "@mui/icons-material/WbSunnyRounded";
import NightsStayIcon from "@mui/icons-material/NightsStayRounded";
import { useTranslation } from "react-i18next";
import type { MealType, SearchMeal, SearchRow } from "../../api/types";
import { useQuickMark } from "../../api/useAttendance";
import { ApiError } from "../../api/client";
import { Avatar } from "../../components/brand/Avatar";
import { brand } from "../../app/theme";
import { formatTime } from "../../lib/date";
import { TiffinsLeft } from "./TiffinsLeft";

const RED = "#B91C1C";

function MealButton({ meal, state, busy, onMark }: { meal: MealType; state: SearchMeal; busy: boolean; onMark: () => void }) {
  const { t, i18n } = useTranslation();
  const icon = meal === "lunch" ? <WbSunnyIcon sx={{ fontSize: 18 }} /> : <NightsStayIcon sx={{ fontSize: 18 }} />;
  const base = { flex: 1, minHeight: 52, borderRadius: "14px", px: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.1, fontWeight: 700, fontSize: "0.85rem" } as const;
  if (state.status) {
    const present = state.status === "present";
    const color = present ? brand.greenDark : RED;
    return (
      <Box sx={{ ...base, bgcolor: alpha(present ? brand.green : RED, 0.1), color }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>{icon}{t(`meal.${meal}Short`)} · {t(`status.${state.status}`)}</Box>
        <Typography variant="caption" sx={{ color, lineHeight: 1.2 }}>
          {state.marked_at ? formatTime(state.marked_at, i18n.language) : ""}{state.auto ? ` · ${t("attendance.byAuto")}` : state.marked_by_name ? ` · ${state.marked_by_name}` : ""}
        </Typography>
      </Box>
    );
  }
  if (!state.allowed) {
    return (
      <Box sx={{ ...base, bgcolor: alpha(brand.inkSoft, 0.07), color: "text.secondary" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>{icon}{t(`meal.${meal}Short`)}</Box>
        <Typography variant="caption" sx={{ lineHeight: 1.2 }}>{t(`search.block.${state.reason ?? "MEMBERSHIP_EXPIRED"}`)}</Typography>
      </Box>
    );
  }
  return (
    <ButtonBase onClick={onMark} disabled={busy} aria-label={`${t(`meal.${meal}`)}: ${t("status.present")}`} sx={{ ...base, bgcolor: brand.green, color: "#fff", "&:active": { transform: "scale(.97)" } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>{icon}{t(`meal.${meal}Short`)}</Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}><CheckIcon sx={{ fontSize: 16 }} />{t("search.ate")}</Box>
    </ButtonBase>
  );
}

/** Search hits with one-tap "ate" buttons per meal; marks are final (owner corrects on the sheet). */
export function SearchResults({ rows, date, meals = ["lunch", "dinner"], onOpen }: { rows: SearchRow[]; date: string; meals?: MealType[]; onOpen?: (memberId: number) => void }) {
  const { t } = useTranslation();
  const mark = useQuickMark();
  const err = mark.error instanceof ApiError ? t(`search.block.${mark.error.code}`, { defaultValue: mark.error.message }) : mark.error ? t("common.error") : null;
  return (
    <Stack spacing={1.25}>
      {err ? <Alert severity="warning">{err}</Alert> : null}
      {rows.map((r) => (
        <Box key={r.member.id} sx={{ p: 1.5, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, opacity: r.active ? 1 : 0.6 }}>
          <ButtonBase disabled={!onOpen} onClick={() => onOpen?.(r.member.id)} sx={{ width: "100%", display: "flex", alignItems: "center", gap: 1.25, textAlign: "left", justifyContent: "flex-start", mb: 1.25, borderRadius: "10px" }}>
            <Avatar name={r.member.name} size={40} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap sx={{ lineHeight: 1.3 }}>{r.member.name}</Typography>
              <Typography variant="caption" sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
                <Box component="span" sx={{ fontWeight: 800, color: brand.red }}>#{r.member.member_no}</Box>
                <span>{r.member.phone}</span>
              </Typography>
            </Box>
            {r.credits ? <TiffinsLeft left={r.credits.left} total={r.credits.total} /> : null}
          </ButtonBase>
          <Box sx={{ display: "flex", gap: 1 }}>
            {meals.map((m) => (
              <MealButton key={m} meal={m} state={r[m]} busy={mark.isPending} onMark={() => mark.mutate({ date, meal: m, member_id: r.member.id, status: "present" })} />
            ))}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
