import { useState } from "react";
import { Box, Skeleton, Stack, Tab, Tabs, Typography, alpha } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useAttendanceReport, useMealsReport, usePaymentsReport } from "../../api/useDashboard";
import { PageHeader } from "../../components/brand/PageHeader";
import { StatCard } from "../../components/brand/StatCard";
import { Avatar } from "../../components/brand/Avatar";
import { MonthSwitcher } from "../attendance/MyAttendancePage";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { formatMonth, monthKey } from "../../lib/date";
import dayjs from "dayjs";

/** Simple vertical bars; height scales to the max value. */
function Bars({ data, colors, labels }: { data: { label: string; values: number[] }[]; colors: string[]; labels: string[] }) {
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.5, height: 140, px: 0.5 }}>
        {data.map((d) => (
          <Box key={d.label} sx={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "2px", height: "100%" }} title={`${d.label}: ${d.values.join(" / ")}`}>
            {d.values.map((v, i) => (
              <Box key={i} sx={{ flex: 1, height: `${(v / max) * 100}%`, minHeight: v > 0 ? 3 : 0, bgcolor: colors[i], borderRadius: "3px 3px 0 0", transition: "height 300ms" }} />
            ))}
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "flex", gap: 0.5, px: 0.5, mt: 0.5 }}>
        {data.map((d, i) => (
          <Typography key={d.label} variant="caption" sx={{ flex: 1, textAlign: "center", fontSize: "0.65rem", visibility: data.length > 12 && i % 3 !== 0 ? "hidden" : "visible" }}>
            {d.label}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
        {labels.map((l, i) => (
          <Box key={l} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: 2, bgcolor: colors[i] }} />
            <Typography variant="caption">{l}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function MealsTab({ month }: { month: string }) {
  const { t } = useTranslation();
  const { data } = useMealsReport(month);
  if (!data) return <Skeleton variant="rounded" height={240} sx={{ borderRadius: "16px" }} />;
  const days = dayjs(`${month}-01`).daysInMonth();
  const byDate = new Map(data.days.map((d) => [d.date, d]));
  const series = Array.from({ length: days }, (_, i) => {
    const iso = dayjs(`${month}-01`).date(i + 1).format("YYYY-MM-DD");
    const d = byDate.get(iso);
    return { label: String(i + 1), values: [d?.lunch ?? 0, d?.dinner ?? 0] };
  });
  return (
    <Stack spacing={2}>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
        <StatCard label={t("reports.totalMeals")} value={data.totals.total} tone="red" />
        <StatCard label={t("meal.lunchShort")} value={data.totals.lunch} tone="gold" />
        <StatCard label={t("meal.dinnerShort")} value={data.totals.dinner} tone="green" />
      </Box>
      {data.totals.tiffin > 0 ? <Typography variant="body2" sx={{ color: "text.secondary" }}>{t("reports.tiffinMeals", { count: data.totals.tiffin })}</Typography> : null}
      <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t("reports.mealsPerDay")}</Typography>
        <Bars data={series} colors={[brand.gold, brand.green]} labels={[t("meal.lunchShort"), t("meal.dinnerShort")]} />
      </Box>
    </Stack>
  );
}

function PaymentsTab({ month }: { month: string }) {
  const { t, i18n } = useTranslation();
  const { data } = usePaymentsReport(month);
  if (!data) return <Skeleton variant="rounded" height={240} sx={{ borderRadius: "16px" }} />;
  const pct = Number(data.totals.billed) > 0 ? Math.round((Number(data.totals.collected) / Number(data.totals.billed)) * 100) : 0;
  const series = data.months.map((m) => ({ label: dayjs(m.month).locale(i18n.language === "en" ? "en" : i18n.language).format("MMM"), values: [Number(m.billed), Number(m.collected)] }));
  return (
    <Stack spacing={2}>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <StatCard label={t("payments.collected")} value={rupees(data.totals.collected)} tone="green" hint={t("reports.pctCollected", { pct })} />
        <StatCard label={t("payments.pending")} value={rupees(data.totals.pending)} tone="gold" hint={t("reports.ofBilled", { billed: rupees(data.totals.billed) })} />
      </Box>
      <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>{t("reports.byMethod")}</Typography>
        {(["cash", "upi", "bank"] as const).map((m) => {
          const v = Number(data.by_method[m]);
          const share = Number(data.totals.collected) > 0 ? (v / Number(data.totals.collected)) * 100 : 0;
          return (
            <Box key={m} sx={{ mb: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">{t(`payments.method.${m}`)}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{rupees(v)}</Typography>
              </Box>
              <Box sx={{ height: 8, borderRadius: 4, bgcolor: alpha(brand.red, 0.08) }}>
                <Box sx={{ width: `${share}%`, height: "100%", borderRadius: 4, bgcolor: brand.red }} />
              </Box>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>{t("reports.sixMonths")}</Typography>
        <Bars data={series} colors={[alpha(brand.gold, 0.6), brand.green]} labels={[t("payments.billed"), t("payments.collected")]} />
      </Box>
    </Stack>
  );
}

function AttendanceTab({ month }: { month: string }) {
  const { t } = useTranslation();
  const { data } = useAttendanceReport(month);
  if (!data) return <Skeleton variant="rounded" height={240} sx={{ borderRadius: "16px" }} />;
  const max = Math.max(1, ...data.map((r) => r.total_present));
  return (
    <Stack spacing={1}>
      {[...data].sort((a, b) => b.total_present - a.total_present).map((r) => (
        <Box key={r.member.id} sx={{ display: "flex", alignItems: "center", gap: 1.25, p: 1.25, borderRadius: "14px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
          <Avatar name={r.member.name} size={36} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="subtitle2" noWrap>{r.member.name}</Typography>
              <Typography variant="subtitle2">{r.total_present}</Typography>
            </Box>
            <Box sx={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", bgcolor: brand.cream, mt: 0.5 }}>
              <Box sx={{ width: `${(r.lunch_present / max) * 100}%`, bgcolor: brand.gold }} />
              <Box sx={{ width: `${(r.dinner_present / max) * 100}%`, bgcolor: brand.green }} />
            </Box>
            <Typography variant="caption">{t("meal.lunchShort")} {r.lunch_present} · {t("meal.dinnerShort")} {r.dinner_present}</Typography>
          </Box>
        </Box>
      ))}
      {data.length === 0 ? <Typography sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>{t("members.emptyTitle")}</Typography> : null}
    </Stack>
  );
}

export function ReportsPage() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(monthKey());
  const [tab, setTab] = useState<"meals" | "payments" | "attendance">("meals");
  return (
    <Stack spacing={2}>
      <PageHeader title={t("reports.title")} back="/owner" subtitle={formatMonth(month, i18n.language)} />
      <MonthSwitcher month={month} onChange={setMonth} />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ minHeight: 44, "& .MuiTab-root": { minHeight: 44, fontWeight: 600 } }}>
        <Tab value="meals" label={t("reports.meals")} />
        <Tab value="payments" label={t("nav.payments")} />
        <Tab value="attendance" label={t("nav.attendance")} />
      </Tabs>
      {tab === "meals" ? <MealsTab month={month} /> : tab === "payments" ? <PaymentsTab month={month} /> : <AttendanceTab month={month} />}
    </Stack>
  );
}
