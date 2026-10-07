import type { ReactNode } from "react";
import { AppBar, Box, IconButton, Toolbar, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIosNew";
import { useNavigate } from "react-router-dom";
import { brand } from "../../app/theme";
import { Logo } from "./Logo";

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
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: `linear-gradient(180deg, ${brand.maroon} 0%, ${brand.maroonDark} 100%)`,
        color: "primary.contrastText",
        borderBottomLeftRadius: "22px",
        borderBottomRightRadius: "22px",
        pt: "env(safe-area-inset-top)",
      }}
    >
      <Toolbar sx={{ minHeight: 60, px: 2, gap: 1 }}>
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
                bgcolor: brand.paper,
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
                  fontFamily: '"Baloo 2", "Mukta", sans-serif',
                  fontWeight: 800,
                  fontSize: "1.55rem",
                  lineHeight: 1,
                  color: brand.amber,
                  letterSpacing: 0.3,
                }}
              >
                स्वाद
              </Typography>
              <Typography
                component="span"
                sx={{ display: "block", fontSize: "0.7rem", fontWeight: 600, opacity: 0.9, letterSpacing: 0.4, mt: 0.25 }}
              >
                भोजनालय &amp; नाश्ता हाऊस
              </Typography>
            </Box>
          </Box>
        )}
        {actions}
      </Toolbar>
    </AppBar>
  );
}
