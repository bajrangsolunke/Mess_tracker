import { Box, Button, Stack, Typography, alpha } from "@mui/material";
import WbSunnyIcon from "@mui/icons-material/WbSunnyRounded";
import NightsStayIcon from "@mui/icons-material/NightsStayRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSession } from "../auth/authStore";
import { StatCard } from "../../components/brand/StatCard";
import { QuickAction } from "../../components/brand/QuickAction";
import { SectionTitle } from "../../components/brand/SectionTitle";
import { MealCard } from "../../components/brand/MealCard";
import { StatusChip } from "../../components/brand/StatusChip";
import { ChefSays } from "../../components/brand/ChefSays";
import { FamilyIcon, PlateCheckIcon, ThaliIcon, WalletRupeeIcon, BellSpoonIcon } from "../../components/brand/icons";
import { brand } from "../../app/theme";
import { formatTodayLong } from "../../lib/date";

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

/* Counts and menu arrive with Phases 3–7; until then tiles show "—" and the menu teaches the next step. */
const PENDING_AMOUNT: number | undefined = undefined;
export function OwnerHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Stack spacing={3}>
      <Greeting says={t("chef.ownerWelcome")} />

      <Box>
        <SectionTitle>{t("dashboard.todayGlance")}</SectionTitle>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
        <StatCard label={t("dashboard.members")} value={undefined} tone="red" icon={<FamilyIcon fontSize="small" />} onClick={() => navigate("/owner/members")} />
        <StatCard label={t("meal.lunchShort")} value={undefined} tone="gold" icon={<WbSunnyIcon fontSize="small" />} />
        <StatCard label={t("meal.dinnerShort")} value={undefined} tone="green" icon={<NightsStayIcon fontSize="small" />} />
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 2,
          borderRadius: "16px",
          bgcolor: alpha(brand.gold, 0.12),
          border: `1px solid ${alpha(brand.gold, 0.35)}`,
        }}
      >
        <WalletRupeeIcon sx={{ color: brand.goldDark }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
            {t("dashboard.pendingPayments")}
          </Typography>
          <Typography variant="h5" component="div" sx={{ color: "text.secondary" }}>
            —
          </Typography>
        </Box>
        {PENDING_AMOUNT !== undefined ? <StatusChip status="pending" /> : null}
      </Box>

      <Box>
        <SectionTitle>{t("dashboard.quickActions")}</SectionTitle>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <QuickAction label={t("nav.attendance")} icon={<PlateCheckIcon />} tone="green" onClick={() => navigate("/owner/attendance")} />
          <QuickAction label={t("dashboard.addMember")} icon={<FamilyIcon />} tone="red" onClick={() => navigate("/owner/members/new")} />
          <QuickAction label={t("nav.payments")} icon={<WalletRupeeIcon />} tone="gold" onClick={() => navigate("/owner/payments")} />
          <QuickAction label={t("nav.menu")} icon={<ThaliIcon />} tone="neutral" onClick={() => navigate("/owner/more")} />
        </Box>
      </Box>

      <Box>
        <SectionTitle
          action={
            <Button size="small" variant="text" startIcon={<EditIcon />} sx={{ minHeight: 36 }} onClick={() => navigate("/owner/more")}>
              {t("menu.edit")}
            </Button>
          }
        >
          {t("menu.today")}
        </SectionTitle>
        <Stack spacing={1.5}>
          <MealCard meal="lunch" items={[]} emptyHint={t("menu.ownerEmpty")} />
          <MealCard meal="dinner" items={[]} emptyHint={t("menu.ownerEmpty")} />
        </Stack>
      </Box>

    </Stack>
  );
}

export function CustomerHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Stack spacing={3}>
      <Greeting says={t("chef.customerWelcome")} />

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <StatCard label={t("customer.plan")} value={undefined} tone="red" icon={<ThaliIcon fontSize="small" />} />
        <StatCard label={t("customer.mealsThisMonth")} value={undefined} tone="green" icon={<PlateCheckIcon fontSize="small" />} onClick={() => navigate("/app/attendance")} />
      </Box>

      <Box
        sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, cursor: "pointer" }}
        role="button"
        tabIndex={0}
        onClick={() => navigate("/app/payments")}
        onKeyDown={(e) => e.key === "Enter" && navigate("/app/payments")}
      >
        <WalletRupeeIcon sx={{ color: brand.red }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
            {t("customer.thisMonthBill")}
          </Typography>
          <Typography variant="h5" component="div" sx={{ color: "text.secondary" }}>
            —
          </Typography>
        </Box>
        <BellSpoonIcon sx={{ color: brand.inkSoft }} />
      </Box>

      <Box>
        <SectionTitle>{t("menu.today")}</SectionTitle>
        <Stack spacing={1.5}>
          <MealCard meal="lunch" items={[]} />
          <MealCard meal="dinner" items={[]} />
        </Stack>
      </Box>

      <Button variant="contained" startIcon={<PlateCheckIcon />} onClick={() => navigate("/app/attendance")}>
        {t("customer.skipMeal")}
      </Button>

    </Stack>
  );
}
