import { useEffect, useState } from "react";
import { storage } from "../../lib/storage";
import { Box, Container, Skeleton, Stack, Typography, alpha } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { usePublicMember } from "../../api/useMembers";
import { Logo } from "../../components/brand/Logo";
import { ChefSays } from "../../components/brand/ChefSays";
import { StatCard } from "../../components/brand/StatCard";
import { StatusChip } from "../../components/brand/StatusChip";
import { PlateCheckIcon } from "../../components/brand/icons";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { formatDateLong, formatTime, monthKey } from "../../lib/date";
import { AttendanceCalendar } from "../attendance/AttendanceCalendar";
import { MonthSwitcher } from "../attendance/MyAttendancePage";
import { TiffinPackCard } from "../members/TiffinPackCard";

/** What a member opens from their WhatsApp link: meals, membership and dues. No login, read-only. */
export function PublicMemberPage() {
  const { t, i18n } = useTranslation();
  const { token = "" } = useParams();
  const [month, setMonth] = useState(monthKey());
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading, isError } = usePublicMember(token, month);
  const m = data?.member;
  const due = Number(data?.due ?? 0);
  const daysLeft = data?.days_left ?? null;
  const dayItems = (data?.history.items ?? []).filter((i) => i.date === selected);
  const messLang = data?.language;
  // show the mess's language unless this phone already chose one
  useEffect(() => {
    if (messLang && !storage.getLanguage() && i18n.language !== messLang) void i18n.changeLanguage(messLang);
  }, [messLang, i18n]);

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <Box sx={{ bgcolor: brand.cream, borderBottom: `3px solid ${brand.red}`, py: 1.25, display: "flex", justifyContent: "center" }}>
        <Logo variant="full" height={56} />
      </Box>
      <Container maxWidth="sm" sx={{ px: 2, pt: 3, pb: 6 }}>
        {isError ? (
          <ChefSays pose="confused">{t("track.invalid")}</ChefSays>
        ) : isLoading || !data || !m ? (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={110} sx={{ borderRadius: "16px" }} />
            <Skeleton variant="rounded" height={300} sx={{ borderRadius: "16px" }} />
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Box>
              <Typography variant="h5" component="h1">{t("track.hello", { name: m.name.split(" ")[0] })}</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>{data.mess_name} · #{m.member_no}</Typography>
            </Box>

            <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
              <Typography variant="subtitle1">{m.plan_name}</Typography>
              {m.valid_until ? (
                <Typography variant="body2" sx={{ color: daysLeft !== null && daysLeft < 0 ? "#B91C1C" : daysLeft !== null && daysLeft <= 3 ? brand.goldDark : "text.secondary", fontWeight: 600 }}>
                  {daysLeft !== null && daysLeft < 0 ? t("track.expired", { date: formatDateLong(m.valid_until, i18n.language) }) : t("track.validTill", { date: formatDateLong(m.valid_until, i18n.language), count: Math.max(daysLeft ?? 0, 0) })}
                </Typography>
              ) : null}
            </Box>

            {data.credits ? <TiffinPackCard credits={data.credits} /> : null}

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderRadius: "16px", bgcolor: due > 0 ? alpha(brand.gold, 0.12) : alpha(brand.green, 0.1), border: `1px solid ${due > 0 ? alpha(brand.gold, 0.4) : alpha(brand.green, 0.35)}` }}>
              <Typography sx={{ fontWeight: 700 }}>{due > 0 ? t("payments.due") : t("track.allPaid")}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: due > 0 ? brand.goldDark : brand.greenDark }}>{rupees(due)}</Typography>
            </Box>

            <MonthSwitcher month={month} onChange={(v) => { setMonth(v); setSelected(null); }} />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <StatCard label={t("attendance.mealsTaken")} value={data.history.present_count} tone="green" icon={<PlateCheckIcon fontSize="small" />} />
              <StatCard label={t("attendance.missed")} value={data.history.absent_count} tone="gold" />
            </Box>
            <Box sx={{ p: 1.5, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
              <AttendanceCalendar month={month} data={data.history} selected={selected} onSelect={setSelected} />
            </Box>
            {selected ? (
              <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.cream, border: `1px solid ${brand.line}` }}>
                <Typography variant="subtitle1">{formatDateLong(selected, i18n.language)}</Typography>
                {(["lunch", "dinner"] as const).map((meal) => {
                  const it = dayItems.find((x) => x.meal_type === meal);
                  return (
                    <Box key={meal} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1 }}>
                      <Typography>{t(`meal.${meal}`)}</Typography>
                      {it ? (
                        <Box sx={{ textAlign: "right" }}>
                          <StatusChip status={it.status} />
                          {it.marked_at ? <Typography variant="caption" sx={{ display: "block", mt: 0.25 }}>{formatTime(it.marked_at, i18n.language)}</Typography> : null}
                        </Box>
                      ) : (
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>—</Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ) : null}

            {data.bills.length > 0 ? (
              <Box>
                <Typography variant="h6" component="h2" sx={{ mb: 1 }}>{t("track.payments")}</Typography>
                <Box sx={{ borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, px: 2 }}>
                  {data.bills.map((b, i) => (
                    <Box key={b.id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.25, borderTop: i ? `1px solid ${brand.line}` : "none" }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {b.period_start && b.period_end ? `${formatDateLong(b.period_start, i18n.language)} – ${formatDateLong(b.period_end, i18n.language)}` : b.month.slice(0, 7)}
                        </Typography>
                        <Typography variant="caption">{rupees(b.amount)} · {t("payments.paid")} {rupees(b.paid)}</Typography>
                      </Box>
                      <StatusChip status={b.status === "unpaid" ? "pending" : b.status} />
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : null}
            <Typography variant="caption" sx={{ textAlign: "center" }}>{t("track.footer")}</Typography>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
