import { useState, type ReactNode } from "react";
import SearchIcon from "@mui/icons-material/SearchRounded";
import { useTranslation } from "react-i18next";
import { GlobalSearch } from "../../features/search/GlobalSearch";
import { AppBar, Badge, Box, IconButton, Toolbar, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIosNew";
import { useNavigate } from "react-router-dom";
import { brand, FONT_DEVA } from "../../app/theme";
import { Logo } from "./Logo";
import { BellSpoonIcon } from "./icons";
import { useNotifications } from "../../api/useLeaves";
import { useSession } from "../../features/auth/authStore";

/** Maroon brand header. With `title` it becomes a page header with a back arrow;
 *  without it, the स्वाद wordmark anchors the shell. */
export function BrandBar({
  title,
  back,
  actions,
}: {
  title?: string;
  back?: boolean | string;
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useSession();
  const [searching, setSearching] = useState(false);
  const { data } = useNotifications(!!user);
  const unread = data?.unread ?? 0;
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: brand.red,
        color: "primary.contrastText",
        borderBottomLeftRadius: "22px",
        borderBottomRightRadius: "22px",
        pt: "env(safe-area-inset-top)",
      }}
    >
      <Toolbar sx={{ minHeight: 64, px: 2, gap: 1 }}>
        {back ? (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="back"
            onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
            sx={{ mr: 0.5 }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
        ) : null}
        {title ? (
          <Typography variant="h6" component="h1" sx={{ flex: 1, color: "inherit" }}>
            {title}
          </Typography>
        ) : (
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: brand.cream,
                display: "grid",
                placeItems: "end center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <Logo variant="chef" height={36} />
            </Box>
            <Box sx={{ lineHeight: 1 }}>
              <Typography
                component="span"
                sx={{
                  display: "block",
                  fontFamily: FONT_DEVA,
                  fontWeight: 800,
                  fontSize: "1.45rem",
                  lineHeight: 1,
                  color: brand.gold,
                  letterSpacing: 0.3,
                }}
              >
                स्वाद
              </Typography>
              <Typography
                component="span"
                sx={{ display: "block", fontFamily: FONT_DEVA, fontSize: "0.78rem", fontWeight: 600, opacity: 0.92, letterSpacing: 0.3, mt: 0.25 }}
              >
                भोजनालय &amp; नाश्ता हाऊस
              </Typography>
            </Box>
          </Box>
        )}
        {actions}
        {user && user.role !== "customer" ? (
          <IconButton color="inherit" aria-label={t("search.open")} onClick={() => setSearching(true)}>
            <SearchIcon />
          </IconButton>
        ) : null}
        {user ? (
          <IconButton color="inherit" aria-label={`notifications${unread ? ` (${unread})` : ""}`} onClick={() => navigate(user.role === "owner" ? "/owner/notifications" : user.role === "staff" ? "/staff/notifications" : "/app/notifications")}>
            <Badge badgeContent={unread} color="secondary" max={9} sx={{ "& .MuiBadge-badge": { fontWeight: 700 } }}>
              <BellSpoonIcon />
            </Badge>
          </IconButton>
        ) : null}
      </Toolbar>
      {searching ? <GlobalSearch onClose={() => setSearching(false)} /> : null}
    </AppBar>
  );
}
