import { Button, Card, CardContent, Stack, Typography } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSession } from "../auth/authStore";
import { useLogout } from "../../api/useAuth";

export function HomePage({ introKey }: { introKey: "dashboard.ownerIntro" | "dashboard.customerIntro" }) {
  const { t } = useTranslation();
  const { user, organization } = useSession();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <Stack spacing={2}>
      <Typography variant="h5">{t("dashboard.welcome", { name: user?.name ?? "" })}</Typography>
      <Typography color="text.secondary">{organization?.name}</Typography>
      <Card>
        <CardContent>
          <Typography variant="h6">{t(introKey)}</Typography>
          <Typography color="text.secondary">{t("common.comingSoon")}</Typography>
        </CardContent>
      </Card>
      <Button
        variant="outlined"
        color="inherit"
        startIcon={<LogoutIcon />}
        onClick={() => logout.mutate(undefined, { onSettled: () => navigate("/login", { replace: true }) })}
      >
        {t("auth.logout")}
      </Button>
    </Stack>
  );
}

export function OwnerHome() {
  return <HomePage introKey="dashboard.ownerIntro" />;
}

export function CustomerHome() {
  return <HomePage introKey="dashboard.customerIntro" />;
}
