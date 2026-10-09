import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Skeleton, Stack, Tab, Tabs, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/LockRounded";
import { useTranslation } from "react-i18next";
import type { AttendanceStatus, MealType } from "../../api/types";
import { useRegister } from "../../api/useMembership";
import { useMarkCell } from "../../api/useAttendance";
import { CorrectMarkDialog, type Correction } from "../attendance/CorrectMarkDialog";
import { PageHeader } from "../../components/brand/PageHeader";
import { SearchBar } from "../../components/SearchBar";
import { brand } from "../../app/theme";
import { monthKey, todayIst } from "../../lib/date";
import { MonthSwitcher } from "../attendance/MyAttendancePage";
import dayjs from "dayjs";

const CELL = 34;
const NAME_W = 132;

function Cell({ iso, status, applicable, holiday, onTap, disabled }: { iso: string; status?: AttendanceStatus; applicable: boolean; holiday: boolean; onTap: () => void; disabled: boolean }) {
  const today = iso === todayIst();
  let content: React.ReactNode = "";
  let bg: string = "transparent";
  let color: string = brand.inkSoft;
  if (!applicable) {
    bg = brand.cream;
  } else if (holiday) {
    content = "H";
    color = brand.goldDark;
  } else if (status === "present") {
    content = "✓";
    bg = `${brand.green}22`;
    color = brand.greenDark;
  } else if (status === "absent") {
    content = "✗";
    bg = "#DC262614";
    color = "#B91C1C";
  } else {
    content = "·";
  }
  return (
    <Box
      component="button"
      onClick={onTap}
      disabled={disabled || !applicable || holiday}
      aria-label={`${iso} ${status ?? ""}`}
      sx={{ all: "unset", boxSizing: "border-box", width: CELL, minWidth: CELL, height: CELL, display: "grid", placeItems: "center", fontWeight: 800, fontSize: "0.95rem", color, bgcolor: bg, borderLeft: `1px solid ${brand.line}`, outline: today ? `2px solid ${brand.gold}` : "none", outlineOffset: -2, cursor: applicable && !holiday && !disabled ? "pointer" : "default" }}
    >
      {content}
    </Box>
  );
}

/** Notebook view: one row per member, one column per day. Tap a cell to mark present → absent → present. */
export function RegisterPage() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(monthKey());
  const [meal, setMeal] = useState<MealType>("lunch");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useRegister(month);
  const mark = useMarkCell(meal);

  const days = useMemo(() => Array.from({ length: data?.days ?? 0 }, (_, i) => dayjs(`${month}-01`).date(i + 1).format("YYYY-MM-DD")), [data, month]);
  const holidays = useMemo(() => new Set((data?.holidays ?? []).filter((h) => h.meal_type === "all" || h.meal_type === meal).map((h) => h.date)), [data, meal]);
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.rows ?? []).filter((r) => (meal === "lunch" ? r.member.plan.includes_lunch : r.member.plan.includes_dinner)).filter((r) => !q || r.member.name.toLowerCase().includes(q) || String(r.member.member_no).includes(q));
  }, [data, meal, search]);
  const today = todayIst();
  const scroller = useRef<HTMLDivElement>(null);
  // Open with today's column in view (like opening the notebook at today's page).
  useEffect(() => {
    const el = scroller.current;
    if (!el || !data || month !== today.slice(0, 7)) return;
    const day = Number(today.slice(-2));
    el.scrollLeft = Math.max(0, NAME_W + 40 + (day - 4) * CELL - (el.clientWidth - NAME_W - 40) / 2);
  }, [data, month, today]);

  const [correcting, setCorrecting] = useState<Correction | null>(null);
  const tap = (memberId: number, iso: string, current?: AttendanceStatus) => {
    if (current) {
      const name = data?.rows.find((r) => r.member.id === memberId)?.member.name ?? "";
      setCorrecting({ memberId, name, date: iso, meal, from: current });
      return;
    }
    mark.mutate({ date: iso, member_id: memberId, status: "present" });
  };

  return (
    <Stack spacing={2}>
      <PageHeader title={t("register.title")} subtitle={t("register.hint")} back="/owner/attendance" />
      <MonthSwitcher month={month} onChange={setMonth} />
      <Tabs value={meal} onChange={(_, v: MealType) => setMeal(v)} variant="fullWidth" sx={{ minHeight: 44, "& .MuiTab-root": { minHeight: 44, fontWeight: 600 } }}>
        <Tab value="lunch" label={t("meal.lunch")} />
        <Tab value="dinner" label={t("meal.dinner")} />
      </Tabs>
      <SearchBar value={search} onChange={setSearch} placeholder={t("members.searchPlaceholder")} />
      {data?.locked ? <Alert severity="warning" icon={<LockIcon />}>{t("attendance.locked")}</Alert> : null}
      {isLoading && !data ? (
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: "16px" }} />
      ) : (
        <Box ref={scroller} sx={{ borderRadius: "16px", border: `1px solid ${brand.line}`, bgcolor: brand.paper, overflow: "auto", maxHeight: "65dvh" }}>
          <Box sx={{ display: "inline-block", minWidth: "100%" }}>
            <Box sx={{ display: "flex", position: "sticky", top: 0, zIndex: 2, bgcolor: brand.cream, borderBottom: `1px solid ${brand.line}` }}>
              <Box sx={{ width: NAME_W, minWidth: NAME_W, position: "sticky", left: 0, bgcolor: brand.cream, zIndex: 3, px: 1, display: "flex", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>{t("register.member")}</Typography>
              </Box>
              <Box sx={{ width: 40, minWidth: 40, display: "grid", placeItems: "center", borderLeft: `1px solid ${brand.line}` }}>
                <Typography variant="caption" sx={{ fontWeight: 800 }}>∑</Typography>
              </Box>
              {days.map((d) => (
                <Box key={d} sx={{ width: CELL, minWidth: CELL, height: CELL, display: "grid", placeItems: "center", borderLeft: `1px solid ${brand.line}`, bgcolor: d === today ? `${brand.gold}33` : "transparent" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: holidays.has(d) ? brand.goldDark : "text.primary" }}>{Number(d.slice(-2))}</Typography>
                </Box>
              ))}
            </Box>
            {rows.map((r) => {
              const presentThisMeal = Object.values(r.marks).filter((m) => m[meal] === "present").length;
              return (
                <Box key={r.member.id} sx={{ display: "flex", borderBottom: `1px solid ${brand.line}` }}>
                  <Box sx={{ width: NAME_W, minWidth: NAME_W, position: "sticky", left: 0, bgcolor: brand.paper, zIndex: 1, px: 1, py: 0.25, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600, lineHeight: 1.2 }}>{r.member.name}</Typography>
                    <Typography variant="caption" sx={{ color: brand.red, fontWeight: 700, lineHeight: 1.1 }}>#{r.member.member_no}</Typography>
                  </Box>
                  <Box sx={{ width: 40, minWidth: 40, display: "grid", placeItems: "center", borderLeft: `1px solid ${brand.line}`, fontWeight: 800 }}>{presentThisMeal}</Box>
                  {days.map((d) => {
                    const applicable = d >= r.joining_date && (!r.valid_until || d <= r.valid_until) && (!r.inactive_from || d < r.inactive_from) && d <= today;
                    return <Cell key={d} iso={d} status={r.marks[d]?.[meal]} applicable={applicable} holiday={holidays.has(d)} disabled={!!data?.locked || mark.isPending} onTap={() => tap(r.member.id, d, r.marks[d]?.[meal])} />;
                  })}
                </Box>
              );
            })}
            {rows.length === 0 ? <Typography sx={{ p: 3, color: "text.secondary" }}>{t("members.noResults")}</Typography> : null}
          </Box>
        </Box>
      )}
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
        {[["✓", t("status.present"), brand.greenDark], ["✗", t("status.absent"), "#B91C1C"], ["·", t("attendance.unmarked"), brand.inkSoft], ["H", t("attendance.messClosed"), brand.goldDark]].map(([s, l, c]) => (
          <Typography key={l} variant="caption"><b style={{ color: c }}>{s}</b> {l}</Typography>
        ))}
      </Box>
      {correcting ? (
        <CorrectMarkDialog
          value={correcting}
          busy={mark.isPending}
          onCancel={() => setCorrecting(null)}
          onConfirm={(to) => mark.mutate({ date: correcting.date, member_id: correcting.memberId, status: to, override: true }, { onSettled: () => setCorrecting(null) })}
        />
      ) : null}
    </Stack>
  );
}
