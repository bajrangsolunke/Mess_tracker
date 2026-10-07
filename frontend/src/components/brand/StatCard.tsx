import type { ReactNode } from "react";
import { Box, Typography, alpha } from "@mui/material";
import { brand } from "../../app/theme";

export type StatTone = "red" | "gold" | "green" | "neutral";

const TONES: Record<StatTone, { bg: string; fg: string; icon: string }> = {
  red: { bg: alpha(brand.red, 0.08), fg: brand.red, icon: brand.red },
  gold: { bg: alpha(brand.gold, 0.16), fg: brand.goldDark, icon: brand.gold },
  green: { bg: alpha(brand.green, 0.12), fg: brand.greenDark, icon: brand.green },
  neutral: { bg: brand.cream, fg: brand.ink, icon: brand.inkSoft },
};

/** Compact number tile. `value` undefined renders an em dash — data not wired yet. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: ReactNode | undefined;
  hint?: string;
  icon?: ReactNode;
  tone?: StatTone;
  onClick?: () => void;
}) {
  const t = TONES[tone];
  return (
    <Box
      component={onClick ? "button" : "div"}
      onClick={onClick}
      sx={{
        all: onClick ? "unset" : undefined,
        boxSizing: "border-box",
        width: "100%",
        bgcolor: brand.paper,
        border: `1px solid ${brand.line}`,
        borderRadius: "18px",
        p: 1.75,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        minHeight: 96,
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "auto -18px -18px auto",
          width: 64,
          height: 64,
          borderRadius: "50%",
          bgcolor: t.bg,
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: t.icon }}>
        {icon}
        <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
          {label}
        </Typography>
      </Box>
      <Typography
        variant="h4"
        component="div"
        sx={{ color: value === undefined ? "text.secondary" : t.fg, fontVariantNumeric: "tabular-nums" }}
      >
        {value ?? "—"}
      </Typography>
      {hint ? <Typography variant="caption">{hint}</Typography> : null}
    </Box>
  );
}
