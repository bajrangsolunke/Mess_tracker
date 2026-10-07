import { Box, Button, Stack, Typography, alpha } from "@mui/material";
import GroupIcon from "@mui/icons-material/GroupsRounded";
import WbSunnyIcon from "@mui/icons-material/WbSunnyRounded";
import NightsStayIcon from "@mui/icons-material/NightsStayRounded";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupeeRounded";
import FactCheckIcon from "@mui/icons-material/FactCheckRounded";
import PersonAddIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenuRounded";
import CampaignIcon from "@mui/icons-material/CampaignRounded";
import EventBusyIcon from "@mui/icons-material/EventBusyRounded";
import LogoutIcon from "@mui/icons-material/LogoutRounded";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSession } from "../auth/authStore";
import { useLogout } from "../../api/useAuth";
import { StatCard } from "../../components/brand/StatCard";
import { QuickAction } from "../../components/brand/QuickAction";
import { SectionTitle } from "../../components/brand/SectionTitle";
import { MealCard } from "../../components/brand/MealCard";
import { StatusChip } from "../../components/brand/StatusChip";
import { brand } from "../../app/theme";
import { formatTodayLong } from "../../lib/date";

function Greeting() {
  const { t, i18n } = useTranslation();
  const { user, organization } = useSession();
  return (
    <Box>
      <Typography variant="h5" component="h1">
        {t("dashboard.welcome", { name: user?.name?.split(" ")[0] ?? "" })}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {organization?.name} · {formatTodayLong(i18n.language)}
      </Typography>
    </Box>
  );
}

function LogoutRow() {
  const { t } = useTranslation();
  const logout = useLogout();
  const navigate = useNavigate();
  return (
    <Button
      variant="text"
      color="inherit"
      startIcon={<LogoutIcon />}
      onClick={() => logout.mutate(undefined, { onSettled: () => navigate("/login", { replace: true }) })}
      sx={{ alignSelf: "flex-start", color: "text.secondary", minHeight: 44, px: 1 }}
    >
      {t("auth.logout")}
    </Button>
  );
}

/* Counts and menu arrive with Phases 3–7; until then tiles show "—" and menu teaches the next step. */
export function OwnerHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Stack spacing={2.5}>
      <Greeting />

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
        <Box sx={{ gridColumn: "1 / -1" }}>
          <StatCard label={t("dashboard.members")} value={undefined} tone="maroon" icon={<GroupIcon fontSize="small" />} onClick={() => navigate("/owner/members")} />
        </Box>
        <StatCard label={t("meal.lunch")} value={undefined} tone="saffron" icon={<WbSunnyIcon fontSize="small" />} hint={t("dashboard.presentToday")} />
        <StatCard label={t("meal.dinner")} value={undefined} tone="leaf" icon={<NightsStayIcon fontSize="small" />} hint={t("dashboard.presentToday")} />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.75,
          borderRadius: "18px",
          bgcolor: alpha(brand.saffron, 0.12),
          border: `1px solid ${alpha(brand.saffron, 0.3)}`,
        }}
      >
        <CurrencyRupeeIcon sx={{ color: brand.saffron }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
            {t("dashboard.pendingPayments")}
          </Typography>
          <Typography variant="h5" component="div" sx={{ color: "#9A4B00" }}>
            —
          </Typography>
        </Box>
        <StatusChip status="pending" />
      </Box>

      <Box>
        <SectionTitle>{t("dashboard.quickActions")}</SectionTitle>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
          <QuickAction label={t("nav.attendance")} icon={<FactCheckIcon />} tone="leaf" onClick={() => navigate("/owner/attendance")} />
          <QuickAction label={t("dashboard.addMember")} icon={<PersonAddIcon />} tone="maroon" onClick={() => navigate("/owner/members")} />
          <QuickAction label={t("nav.payments")} icon={<CurrencyRupeeIcon />} tone="saffron" onClick={() => navigate("/owner/payments")} />
          <QuickAction label={t("nav.menu")} icon={<RestaurantMenuIcon />} tone="amber" onClick={() => navigate("/owner/more")} />
        </Box>
      </Box>

      <Box>
        <SectionTitle
          action={
            <Button size="small" variant="text" startIcon={<CampaignIcon />} sx={{ minHeight: 36 }} onClick={() => navigate("/owner/more")}>
              {t("dashboard.announce")}
            </Button>
          }
        >
          {t("menu.today")}
        </SectionTitle>
        <Stack spacing={1.25}>
          <MealCard meal="lunch" items={[]} emptyHint={t("menu.ownerEmpty")} />
          <MealCard meal="dinner" items={[]} emptyHint={t("menu.ownerEmpty")} />
        </Stack>
      </Box>

      <LogoutRow />
    </Stack>
  );
}

export function CustomerHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Stack spacing={2.5}>
      <Greeting />

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
        <StatCard label={t("customer.plan")} value={undefined} tone="maroon" icon={<RestaurantMenuIcon fontSize="small" />} />
        <StatCard label={t("customer.mealsThisMonth")} value={undefined} tone="leaf" icon={<FactCheckIcon fontSize="small" />} onClick={() => navigate("/app/attendance")} />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.75,
          borderRadius: "18px",
          bgcolor: brand.paper,
          border: `1px solid ${brand.line}`,
        }}
        role="button"
        tabIndex={0}
        onClick={() => navigate("/app/payments")}
        onKeyDown={(e) => e.key === "Enter" && navigate("/app/payments")}
      >
        <CurrencyRupeeIcon sx={{ color: brand.maroon }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
            {t("customer.thisMonthBill")}
          </Typography>
          <Typography variant="h5" component="div" sx={{ color: "text.secondary" }}>
            —
          </Typography>
        </Box>
        <Typography variant="caption">{t("common.comingSoon")}</Typography>
      </Box>

      <Box>
        <SectionTitle>{t("menu.today")}</SectionTitle>
        <Stack spacing={1.25}>
          <MealCard meal="lunch" items={[]} />
          <MealCard meal="dinner" items={[]} />
        </Stack>
      </Box>

      <Button variant="contained" startIcon={<EventBusyIcon />} onClick={() => navigate("/app/attendance")}>
        {t("customer.skipMeal")}
      </Button>

      <LogoutRow />
    </Stack>
  );
}
