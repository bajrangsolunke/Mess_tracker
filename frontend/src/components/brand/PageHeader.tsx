import type { ReactNode } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import { useNavigate } from "react-router-dom";

/** In-content page header for sub-screens: back arrow, title, optional right action. */
export function PageHeader({ title, back, action, subtitle }: { title: string; back?: string; action?: ReactNode; subtitle?: string }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5, minHeight: 44 }}>
      {back !== undefined ? (
        <IconButton aria-label="back" onClick={() => (back ? navigate(back) : navigate(-1))} sx={{ ml: -1 }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      ) : null}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h5" component="h1" noWrap>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Box>
  );
}
