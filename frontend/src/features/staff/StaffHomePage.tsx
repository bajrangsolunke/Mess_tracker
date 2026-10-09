import { Box, Skeleton, Stack, Typography } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShippingRounded";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useKitchenToday } from "../../api/useOperations";
import { useSession } from "../auth/authStore";
import { ChefSays } from "../../components/brand/ChefSays";
import { QuickAction } from "../../components/brand/QuickAction";
import { PlateCheckIcon } from "../../components/brand/icons";
import { formatTodayLong } from "../../lib/date";
import { KitchenCard } from "./KitchenCard";

/** Staff start screen: today's cooking counts and the two jobs they do (mark meals, enter tiffins). */
export function StaffHomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, organization } = useSession();
  const { data, isLoading } = useKitchenToday();
  const pending = data ? data.lunch.counts.unmarked + data.dinner.counts.unmarked : 0;
  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" component="h1">{t("dashboard.welcome", { name: user?.name?.split(" ")[0] ?? "" })}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>{organization?.name} · {formatTodayLong(i18n.language)}</Typography>
      </Box>
      <ChefSays pose="cooking" size={64}>{pending > 0 ? t("kitchen.chefPending", { count: pending }) : t("kitchen.chefAllDone")}</ChefSays>
      {isLoading || !data ? (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={170} sx={{ borderRadius: "16px" }} />
          <Skeleton variant="rounded" height={170} sx={{ borderRadius: "16px" }} />
        </Stack>
      ) : (
        <>
          <KitchenCard meal="lunch" data={data.lunch} onMark={() => navigate("/staff/attendance?meal=lunch")} />
          <KitchenCard meal="dinner" data={data.dinner} onMark={() => navigate("/staff/attendance?meal=dinner")} />
        </>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <QuickAction label={t("nav.attendance")} icon={<PlateCheckIcon />} tone="green" onClick={() => navigate("/staff/attendance")} />
        <QuickAction label={t("tiffin.short")} icon={<LocalShippingIcon />} tone="red" onClick={() => navigate("/staff/tiffins")} />
      </Box>
    </Stack>
  );
}
