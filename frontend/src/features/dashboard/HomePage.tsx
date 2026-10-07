import { Box, Button, Skeleton, Stack, Typography, alpha } from "@mui/material";
import WbSunnyIcon from "@mui/icons-material/WbSunnyRounded";
import NightsStayIcon from "@mui/icons-material/NightsStayRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import CampaignIcon from "@mui/icons-material/CampaignRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSession } from "../auth/authStore";
import { useCustomerDashboard, useOwnerDashboard } from "../../api/useDashboard";
import { StatCard } from "../../components/brand/StatCard";
import { QuickAction } from "../../components/brand/QuickAction";
import { SectionTitle } from "../../components/brand/SectionTitle";
import { MealCard } from "../../components/brand/MealCard";
import { StatusChip } from "../../components/brand/StatusChip";
import { ChefSays } from "../../components/brand/ChefSays";
import { FamilyIcon, PlateCheckIcon, ThaliIcon, WalletRupeeIcon, NotebookIcon } from "../../components/brand/icons";
import { brand } from "../../app/theme";
import { formatDateLong, formatTodayLong } from "../../lib/date";
import { rupees } from "../../lib/money";

function Greeting({ says }: { says: string }) {
  const { t, i18n } = useTranslation();
  const { user, organization } = useSession();
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" component="h1">
          {t("dashboard.welcome", { name: user?.name?.split(" ")[0] ?? "" })}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {organization?.name} · {formatTodayLong(i18n.language)}
        </Typography>
      </Box>
      <ChefSays pose="waving" size={64}>
        {says}
      </ChefSays>
    </Stack>
  );
}

function ownerSays(t: (k: string, o?: Record<string, unknown>) => string, d: ReturnType<typeof useOwnerDashboard>["data"]) {
  if (!d) return t("chef.ownerWelcome");
  if (d.holiday_today) return t("chef.holidayToday", { reason: d.holiday_today });
  if (d.late_leaves > 0) return t("chef.lateLeaves", { count: d.late_leaves });
  if (d.lunch.unmarked > 0 && d.lunch.expected > 0) return t("chef.ownerWelcome");
  if (d.dinner.unmarked > 0 && d.dinner.expected > 0) return t("chef.dinnerPending", { count: d.dinner.unmarked });
  if (!d.menu.lunch.length && !d.menu.dinner.length) return t("chef.noMenu");
  return t("chef.allDone");
}

export function OwnerHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useOwnerDashboard();
  return (
    <Stack spacing={3}>
      <Greeting says={ownerSays(t, data)} />

      <Box>
        <SectionTitle>{t("dashboard.todayGlance")}</SectionTitle>
        {isLoading && !data ? (
          <Skeleton variant="rounded" height={96} sx={{ borderRadius: "16px" }} />
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
            <StatCard label={t("dashboard.members")} value={data?.active_members} hint={data && data.tiffin_members > 0 ? t("dashboard.tiffinCount", { count: data.tiffin_members }) : undefined} tone="red" icon={<FamilyIcon fontSize="small" />} onClick={() => navigate("/owner/members")} />
            <StatCard label={t("meal.lunchShort")} value={data ? `${data.lunch.present}/${data.lunch.expected}` : undefined} hint={data && data.lunch.unmarked > 0 ? t("dashboard.unmarkedHint", { count: data.lunch.unmarked }) : undefined} tone="gold" icon={<WbSunnyIcon fontSize="small" />} onClick={() => navigate("/owner/attendance?meal=lunch")} />
            <StatCard label={t("meal.dinnerShort")} value={data ? `${data.dinner.present}/${data.dinner.expected}` : undefined} hint={data && data.dinner.unmarked > 0 ? t("dashboard.unmarkedHint", { count: data.dinner.unmarked }) : undefined} tone="green" icon={<NightsStayIcon fontSize="small" />} onClick={() => navigate("/owner/attendance?meal=dinner")} />
          </Box>
        )}
      </Box>

      <Box
        role="button"
        tabIndex={0}
        onClick={() => navigate("/owner/payments")}
        onKeyDown={(e) => e.key === "Enter" && navigate("/owner/payments")}
        sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, borderRadius: "16px", bgcolor: alpha(brand.gold, 0.12), border: `1px solid ${alpha(brand.gold, 0.35)}`, cursor: "pointer" }}
      >
        <WalletRupeeIcon sx={{ color: brand.goldDark }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
            {t("dashboard.pendingPayments")}
          </Typography>
          <Typography variant="h5" component="div" sx={{ color: data && Number(data.payments.pending) > 0 ? brand.goldDark : "text.secondary" }}>
            {data ? rupees(data.payments.pending) : "—"}
          </Typography>
          {data ? (
            <Typography variant="caption">{t("payments.progress", { pct: Number(data.payments.billed) > 0 ? Math.round((Number(data.payments.collected) / Number(data.payments.billed)) * 100) : 0, paid: data.payments.paid, total: data.payments.members })}</Typography>
          ) : null}
        </Box>
        {data && Number(data.payments.pending) > 0 ? <StatusChip status="pending" /> : <ChevronRightIcon sx={{ color: "text.secondary" }} />}
      </Box>

      <Box>
        <SectionTitle>{t("dashboard.quickActions")}</SectionTitle>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <QuickAction label={t("nav.attendance")} icon={<PlateCheckIcon />} tone="green" onClick={() => navigate("/owner/attendance")} />
          <QuickAction label={t("dashboard.addMember")} icon={<FamilyIcon />} tone="red" onClick={() => navigate("/owner/members/new")} />
          <QuickAction label={t("nav.payments")} icon={<WalletRupeeIcon />} tone="gold" onClick={() => navigate("/owner/payments")} />
          <QuickAction label={t("reports.title")} icon={<NotebookIcon />} tone="neutral" onClick={() => navigate("/owner/reports")} />
        </Box>
      </Box>

      <Box>
        <SectionTitle
          action={
            <Button size="small" variant="text" startIcon={<EditIcon />} sx={{ minHeight: 36 }} onClick={() => navigate("/owner/menu")}>
              {t("menu.edit")}
            </Button>
          }
        >
          {t("menu.today")}
        </SectionTitle>
        <Stack spacing={1.5}>
          <MealCard meal="lunch" items={data?.menu.lunch ?? []} emptyHint={t("menu.ownerEmpty")} />
          <MealCard meal="dinner" items={data?.menu.dinner ?? []} emptyHint={t("menu.ownerEmpty")} />
        </Stack>
      </Box>

      <Button variant="outlined" startIcon={<CampaignIcon />} onClick={() => navigate("/owner/announcements")}>
        {t("dashboard.announce")}
      </Button>
    </Stack>
  );
}

export function CustomerHome() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data } = useCustomerDashboard();
  const bill = data?.bill;
  const says = !data ? t("chef.customerWelcome") : bill && bill.status !== "paid" ? t("chef.billPending", { amount: rupees(bill.due) }) : data.menu.lunch.length || data.menu.dinner.length ? t("chef.customerWelcome") : t("chef.noMenuCustomer");
  const planLabel = data ? [data.member.plan.includes_lunch && t("meal.lunchShort"), data.member.plan.includes_dinner && t("meal.dinnerShort")].filter(Boolean).join(" + ") : undefined;

  return (
    <Stack spacing={3}>
      <Greeting says={says} />

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <StatCard label={t("customer.plan")} value={planLabel} hint={data ? `${rupees(data.member.plan.monthly_fee)}/${t("members.perMonth")}` : undefined} tone="red" icon={<ThaliIcon fontSize="small" />} />
        <StatCard label={t("customer.mealsThisMonth")} value={data?.meals_this_month} tone="green" icon={<PlateCheckIcon fontSize="small" />} onClick={() => navigate("/app/attendance")} />
      </Box>

      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, borderRadius: "16px", bgcolor: bill?.status === "paid" ? alpha(brand.green, 0.1) : bill ? alpha(brand.gold, 0.12) : brand.paper, border: `1px solid ${bill?.status === "paid" ? alpha(brand.green, 0.4) : bill ? alpha(brand.gold, 0.4) : brand.line}`, cursor: "pointer" }}
        role="button"
        tabIndex={0}
        onClick={() => navigate("/app/payments")}
        onKeyDown={(e) => e.key === "Enter" && navigate("/app/payments")}
      >
        <WalletRupeeIcon sx={{ color: bill?.status === "paid" ? brand.greenDark : brand.goldDark }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
            {t("customer.thisMonthBill")}
          </Typography>
          <Typography variant="h5" component="div" sx={{ color: bill ? (bill.status === "paid" ? brand.greenDark : brand.goldDark) : "text.secondary" }}>
            {bill ? (bill.status === "paid" ? rupees(bill.amount) : rupees(bill.due)) : "—"}
          </Typography>
        </Box>
        {bill ? <StatusChip status={bill.status === "unpaid" ? "pending" : bill.status} /> : <Typography variant="caption">{t("chef.noBillYetShort")}</Typography>}
      </Box>

      <Box>
        <SectionTitle>{t("menu.today")}</SectionTitle>
        <Stack spacing={1.5}>
          <MealCard meal="lunch" items={data?.menu.lunch ?? []} />
          <MealCard meal="dinner" items={data?.menu.dinner ?? []} />
        </Stack>
      </Box>

      {data && data.upcoming_leaves.length > 0 ? (
        <Box>
          <SectionTitle>{t("leave.upcoming")}</SectionTitle>
          <Box sx={{ p: 1.5, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
            {data.upcoming_leaves.map((lv) => (
              <Typography key={lv.id} variant="body2" sx={{ py: 0.5 }}>
                {formatDateLong(lv.date, i18n.language)} · {t(`meal.${lv.meal_type}`)} · <b style={{ color: lv.status === "approved" ? brand.greenDark : brand.goldDark }}>{t(`leave.status.${lv.status}`)}</b>
              </Typography>
            ))}
          </Box>
        </Box>
      ) : null}

      {data && data.announcements.length > 0 ? (
        <Box>
          <SectionTitle action={<Button size="small" sx={{ minHeight: 36 }} onClick={() => navigate("/app/announcements")}>{t("members.all")}</Button>}>{t("announcements.title")}</SectionTitle>
          <Stack spacing={1}>
            {data.announcements.slice(0, 2).map((a) => (
              <Box key={a.id} sx={{ p: 1.5, borderRadius: "14px", bgcolor: alpha(brand.red, 0.05), border: `1px solid ${alpha(brand.red, 0.15)}` }}>
                <Typography variant="subtitle2">{a.title}</Typography>
                {a.body ? <Typography variant="body2" sx={{ color: "text.secondary" }}>{a.body}</Typography> : null}
              </Box>
            ))}
          </Stack>
        </Box>
      ) : null}

      <Button variant="contained" startIcon={<PlateCheckIcon />} onClick={() => navigate("/app/leave")}>
        {t("customer.skipMeal")}
      </Button>
    </Stack>
  );
}
