import { Box, Button, Divider, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography, alpha } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import LanguageIcon from "@mui/icons-material/LanguageRounded";
import LogoutIcon from "@mui/icons-material/LogoutRounded";
import BadgeIcon from "@mui/icons-material/BadgeRounded";
import { InstallAppCard } from "../../components/InstallAppCard";
import { PushToggle } from "../../components/PushToggle";
import { CheckUpdateRow } from "../../components/CheckUpdateRow";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useSession } from "../auth/authStore";
import { useLogout } from "../../api/useAuth";
import { brand } from "../../app/theme";
import { NotebookIcon, ProfileIcon, ThaliIcon, WalletRupeeIcon } from "../../components/brand/icons";
import BeachAccessIcon from "@mui/icons-material/BeachAccessRounded";
import LockIcon from "@mui/icons-material/LockRounded";
import EventBusyIcon from "@mui/icons-material/EventBusyRounded";
import CampaignIcon from "@mui/icons-material/CampaignRounded";
import LocalShippingIcon from "@mui/icons-material/LocalShippingRounded";
import AutorenewIcon from "@mui/icons-material/AutorenewRounded";
import { SectionTitle } from "../../components/brand/SectionTitle";

const LANG_NAME: Record<string, string> = { en: "English", hi: "हिन्दी", mr: "मराठी" };

/** Account page used as "More" (owner) and "Profile" (customer): identity, language, logout. */
export function ProfilePage({ titleKey, children }: { titleKey: "nav.more" | "nav.profile" | "nav.me"; children?: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, organization, member } = useSession();
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
            {member?.member_no ? ` · #${member.member_no}` : ""}
          </Typography>
          <Typography variant="caption">{organization?.name}</Typography>
        </Box>
      </Box>

      {children}

      {user?.role !== "customer" ? <InstallAppCard /> : null}
      {user?.role !== "customer" ? <PushToggle target={{ kind: "user" }} /> : null}

      <Box>
        <SectionTitle>{t("profile.settings")}</SectionTitle>
        <List disablePadding sx={{ bgcolor: brand.paper, border: `1px solid ${brand.line}`, borderRadius: "16px", overflow: "hidden" }}>
          {user?.role === "owner" ? (
            <>
              <ListItemButton onClick={() => navigate("/owner/ledger")} sx={{ minHeight: 60 }}>
                <ListItemIcon sx={{ color: brand.green, minWidth: 44 }}>
                  <WalletRupeeIcon />
                </ListItemIcon>
                <ListItemText primary={t("ledger.title")} secondary={t("ledger.hintShort")} />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>
              <Divider component="li" />
              <ListItemButton onClick={() => navigate("/owner/staff")} sx={{ minHeight: 60 }}>
                <ListItemIcon sx={{ color: brand.red, minWidth: 44 }}>
                  <BadgeIcon />
                </ListItemIcon>
                <ListItemText primary={t("staff.title")} secondary={t("staff.hintShort")} />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>
              <Divider component="li" />
              <ListItemButton onClick={() => navigate("/owner/pricing")} sx={{ minHeight: 60 }}>
                <ListItemIcon sx={{ color: brand.red, minWidth: 44 }}>
                  <ThaliIcon />
                </ListItemIcon>
                <ListItemText primary={t("pricing.title")} secondary={t("pricing.hintShort")} />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>
              <Divider component="li" />
              <ListItemButton onClick={() => navigate("/owner/renewals")} sx={{ minHeight: 60 }}>
                <ListItemIcon sx={{ color: brand.green, minWidth: 44 }}>
                  <AutorenewIcon />
                </ListItemIcon>
                <ListItemText primary={t("membership.renewalsTitle")} secondary={t("membership.renewalsHint")} />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>
              <Divider component="li" />
              <ListItemButton onClick={() => navigate("/owner/plans")} sx={{ minHeight: 60 }}>
                <ListItemIcon sx={{ color: brand.inkSoft, minWidth: 44 }}>
                  <ThaliIcon />
                </ListItemIcon>
                <ListItemText primary={t("plans.title")} secondary={t("plans.hintShort")} />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>
              <Divider component="li" />
              <ListItemButton onClick={() => navigate("/owner/tiffins")} sx={{ minHeight: 60 }}>
                <ListItemIcon sx={{ color: brand.red, minWidth: 44 }}>
                  <LocalShippingIcon />
                </ListItemIcon>
                <ListItemText primary={t("tiffin.title")} secondary={t("tiffin.hintShort")} />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>
              <Divider component="li" />
              <ListItemButton onClick={() => navigate("/owner/reports")} sx={{ minHeight: 60 }}>
                <ListItemIcon sx={{ color: brand.inkSoft, minWidth: 44 }}>
                  <NotebookIcon />
                </ListItemIcon>
                <ListItemText primary={t("reports.title")} secondary={t("reports.hintShort")} />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>
              <Divider component="li" />
              <ListItemButton onClick={() => navigate("/owner/menu")} sx={{ minHeight: 60 }}>
                <ListItemIcon sx={{ color: brand.gold, minWidth: 44 }}>
                  <ThaliIcon />
                </ListItemIcon>
                <ListItemText primary={t("nav.menu")} secondary={t("menu.hintShort")} />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>
              <Divider component="li" />
              <ListItemButton onClick={() => navigate("/owner/announcements")} sx={{ minHeight: 60 }}>
                <ListItemIcon sx={{ color: brand.red, minWidth: 44 }}>
                  <CampaignIcon />
                </ListItemIcon>
                <ListItemText primary={t("announcements.title")} secondary={t("announcements.hintShort")} />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>
              <Divider component="li" />
              <ListItemButton onClick={() => navigate("/owner/leaves")} sx={{ minHeight: 60 }}>
                <ListItemIcon sx={{ color: brand.green, minWidth: 44 }}>
                  <EventBusyIcon />
                </ListItemIcon>
                <ListItemText primary={t("leave.ownerTitle")} secondary={t("leave.ownerHint")} />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>
              <Divider component="li" />
              <ListItemButton onClick={() => navigate("/owner/holidays")} sx={{ minHeight: 60 }}>
                <ListItemIcon sx={{ color: brand.gold, minWidth: 44 }}>
                  <BeachAccessIcon />
                </ListItemIcon>
                <ListItemText primary={t("holidays.title")} secondary={t("holidays.hintShort")} />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>
              <Divider component="li" />
              <ListItemButton onClick={() => navigate("/owner/months")} sx={{ minHeight: 60 }}>
                <ListItemIcon sx={{ color: brand.inkSoft, minWidth: 44 }}>
                  <LockIcon />
                </ListItemIcon>
                <ListItemText primary={t("months.title")} secondary={t("months.hintShort")} />
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ListItemButton>
              <Divider component="li" />
            </>
          ) : null}
          <ListItemButton onClick={() => navigate("/select-language")} sx={{ minHeight: 60 }}>
            <ListItemIcon sx={{ color: brand.red, minWidth: 44 }}>
              <LanguageIcon />
            </ListItemIcon>
            <ListItemText primary={t("profile.language")} secondary={LANG_NAME[i18n.language] ?? i18n.language} />
            <ChevronRightIcon sx={{ color: "text.secondary" }} />
          </ListItemButton>
          <Divider component="li" />
          <ListItemButton onClick={() => navigate(user?.role === "owner" ? "/owner/change-password" : user?.role === "staff" ? "/staff/change-password" : "/app/change-password")} sx={{ minHeight: 60 }}>
            <ListItemIcon sx={{ color: brand.inkSoft, minWidth: 44 }}>
              <ProfileIcon />
            </ListItemIcon>
            <ListItemText primary={t("profile.changePassword")} />
            <ChevronRightIcon sx={{ color: "text.secondary" }} />
          </ListItemButton>
          <Divider component="li" />
          <CheckUpdateRow />
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
