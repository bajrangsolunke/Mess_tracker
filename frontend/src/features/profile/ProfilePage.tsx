import { Box, Button, Divider, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography, alpha } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import LanguageIcon from "@mui/icons-material/LanguageRounded";
import LogoutIcon from "@mui/icons-material/LogoutRounded";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSession } from "../auth/authStore";
import { useLogout } from "../../api/useAuth";
import { brand } from "../../app/theme";
import { ProfileIcon } from "../../components/brand/icons";
import { SectionTitle } from "../../components/brand/SectionTitle";

const LANG_NAME: Record<string, string> = { en: "English", hi: "हिन्दी", mr: "मराठी" };

/** Account page used as "More" (owner) and "Profile" (customer): identity, language, logout. */
export function ProfilePage({ titleKey }: { titleKey: "nav.more" | "nav.profile" }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, organization } = useSession();
  const logout = useLogout();

  return (
    <Stack spacing={3}>
      <Typography variant="h5" component="h1">
        {t(titleKey)}
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
        <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: alpha(brand.red, 0.1), color: brand.red, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <ProfileIcon sx={{ fontSize: 30 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {user?.name}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {user?.phone ? `+91 ${user.phone}` : ""} · {t(`role.${user?.role ?? "customer"}`)}
          </Typography>
          <Typography variant="caption">{organization?.name}</Typography>
        </Box>
      </Box>

      <Box>
        <SectionTitle>{t("profile.settings")}</SectionTitle>
        <List disablePadding sx={{ bgcolor: brand.paper, border: `1px solid ${brand.line}`, borderRadius: "16px", overflow: "hidden" }}>
          <ListItemButton onClick={() => navigate("/select-language")} sx={{ minHeight: 60 }}>
            <ListItemIcon sx={{ color: brand.red, minWidth: 44 }}>
              <LanguageIcon />
            </ListItemIcon>
            <ListItemText primary={t("profile.language")} secondary={LANG_NAME[i18n.language] ?? i18n.language} />
            <ChevronRightIcon sx={{ color: "text.secondary" }} />
          </ListItemButton>
          <Divider component="li" />
          <ListItemButton disabled sx={{ minHeight: 60 }}>
            <ListItemIcon sx={{ minWidth: 44 }}>
              <ProfileIcon />
            </ListItemIcon>
            <ListItemText primary={t("profile.changePassword")} secondary={t("common.comingSoon")} />
          </ListItemButton>
        </List>
      </Box>

      <Button
        variant="outlined"
        color="inherit"
        startIcon={<LogoutIcon />}
        onClick={() => logout.mutate(undefined, { onSettled: () => navigate("/login", { replace: true }) })}
        sx={{ color: brand.red, borderColor: alpha(brand.red, 0.35) }}
      >
        {t("auth.logout")}
      </Button>
    </Stack>
  );
}
