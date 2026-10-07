import { useState } from "react";
import { Box, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import { useTranslation } from "react-i18next";
import { useAttendanceHistory } from "../../api/useAttendance";
import { PageHeader } from "../../components/brand/PageHeader";
import { StatCard } from "../../components/brand/StatCard";
import { StatusChip } from "../../components/brand/StatusChip";
import { PlateCheckIcon } from "../../components/brand/icons";
import { brand } from "../../app/theme";
import { addMonths, formatDateLong, formatMonth, formatTime, monthKey } from "../../lib/date";
import { AttendanceCalendar } from "./AttendanceCalendar";

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const { i18n } = useTranslation();
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: brand.paper, border: `1px solid ${brand.line}`, borderRadius: "14px", px: 0.5 }}>
      <IconButton aria-label="previous month" onClick={() => onChange(addMonths(month, -1))}>
        <ChevronLeftIcon />
      </IconButton>
      <Typography sx={{ fontWeight: 700 }}>{formatMonth(month, i18n.language)}</Typography>
      <IconButton aria-label="next month" onClick={() => onChange(addMonths(month, 1))} disabled={month >= monthKey()}>
        <ChevronRightIcon />
      </IconButton>
    </Box>
  );
}

/** Customer: own attendance for a month, calendar + day detail. Owner passes memberId to reuse. */
export function MyAttendancePage({ memberId, back }: { memberId?: number; back?: string }) {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(monthKey());
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading } = useAttendanceHistory(month, memberId);

  const dayItems = (data?.items ?? []).filter((i) => i.date === selected);
  const dayLeaves = (data?.leaves ?? []).filter((i) => i.date === selected);

  return (
    <Stack spacing={2}>
      <PageHeader title={t("nav.attendance")} subtitle={data && memberId ? data.member.name : undefined} back={back} />
      <MonthSwitcher month={month} onChange={(m) => { setMonth(m); setSelected(null); }} />
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <StatCard label={t("attendance.mealsTaken")} value={data?.present_count} tone="green" icon={<PlateCheckIcon fontSize="small" />} />
        <StatCard label={t("attendance.missed")} value={data ? data.absent_count + data.leaves.length : undefined} tone="gold" />
      </Box>
      <Box sx={{ p: 1.5, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
        {isLoading && !data ? <Skeleton variant="rounded" height={260} /> : <AttendanceCalendar month={month} data={data} selected={selected} onSelect={setSelected} />}
      </Box>
      {selected ? (
        <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.cream, border: `1px solid ${brand.line}` }}>
          <Typography variant="subtitle1">{formatDateLong(selected, i18n.language)}</Typography>
          {(["lunch", "dinner"] as const).map((meal) => {
            const it = dayItems.find((x) => x.meal_type === meal);
            const lv = dayLeaves.find((x) => x.meal_type === meal);
            return (
              <Box key={meal} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1 }}>
                <Typography>{t(`meal.${meal}`)}</Typography>
                {it ? (
                  <Box sx={{ textAlign: "right" }}>
                    <StatusChip status={it.status} />
                    <Typography variant="caption" sx={{ display: "block", mt: 0.25 }}>
                      {it.marked_at ? formatTime(it.marked_at, i18n.language) : ""}
                      {it.auto ? ` · ${t("attendance.byAuto")}` : it.self_marked ? ` · ${t("attendance.selfMarked")}` : ` · ${t("attendance.byOwner")}`}
                    </Typography>
                  </Box>
                ) : lv ? <Typography variant="body2" sx={{ color: brand.goldDark, fontWeight: 600 }}>{t("attendance.legend.leave")}</Typography> : <Typography variant="body2" sx={{ color: "text.secondary" }}>—</Typography>}
              </Box>
            );
          })}
        </Box>
      ) : null}
    </Stack>
  );
}
