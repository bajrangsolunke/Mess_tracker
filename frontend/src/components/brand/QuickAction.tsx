import type { ReactNode } from "react";
import { Box, ButtonBase, Typography, alpha } from "@mui/material";
import { brand } from "../../app/theme";
import type { StatTone } from "./StatCard";

const TONES: Record<StatTone, string> = {
  red: brand.red,
  gold: brand.gold,
  green: brand.green,
  neutral: brand.inkSoft,
};

/** Large touch tile for the owner's most frequent jobs. */
export function QuickAction({
  label,
  icon,
  tone = "red",
  onClick,
}: {
  label: string;
  icon: ReactNode;
  tone?: StatTone;
  onClick: () => void;
}) {
  const c = TONES[tone];
  return (
    <ButtonBase
      onClick={onClick}
      focusRipple
      sx={{
        width: "100%",
        minHeight: 76,
        borderRadius: "16px",
        bgcolor: brand.paper,
        border: `1px solid ${brand.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 1.5,
        px: 1.5,
        py: 1.5,
        color: c,
        textAlign: "left",
        transition: "transform 160ms cubic-bezier(.2,.8,.2,1), background-color 160ms",
        "&:active": { transform: "scale(0.98)" },
      }}
    >
      <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: alpha(c, 0.12), display: "grid", placeItems: "center", flexShrink: 0 }}>
        {icon}
      </Box>
      <Typography variant="subtitle1" sx={{ color: brand.ink, fontSize: "0.95rem", lineHeight: 1.25 }}>
        {label}
      </Typography>
    </ButtonBase>
  );
}
