import { useState, type ReactNode } from "react";
import SearchIcon from "@mui/icons-material/SearchRounded";
import { useTranslation } from "react-i18next";
import { GlobalSearch } from "../../features/search/GlobalSearch";
import { AppBar, Badge, Box, IconButton, Toolbar, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIosNew";
import { useNavigate } from "react-router-dom";
import { brand } from "../../app/theme";
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
      <Toolbar sx={{ minHeight: 74, px: 1.5, gap: 0.5 }}>
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
          <Box sx={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }}>
            {/* thin white outline keeps the red lettering readable on the red bar */}
            <Logo
              variant="transparent"
              height={64}
              sx={{
                maxWidth: "62vw",
                objectFit: "contain",
                objectPosition: "left center",
                filter:
                  "drop-shadow(1px 0 0 #fff) drop-shadow(-1px 0 0 #fff) drop-shadow(0 1px 0 #fff) drop-shadow(0 -1px 0 #fff) drop-shadow(0 2px 4px rgba(0,0,0,.25))",
              }}
            />
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
