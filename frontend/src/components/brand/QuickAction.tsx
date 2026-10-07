import type { ReactNode } from "react";
import { ButtonBase, Typography, alpha } from "@mui/material";
import { brand } from "../../app/theme";
import type { StatTone } from "./StatCard";

const TONES: Record<StatTone, string> = {
  maroon: brand.maroon,
  saffron: brand.saffron,
  leaf: brand.leaf,
  amber: "#D39B00",
  neutral: brand.inkSoft,
};

/** Large touch tile for the owner's most frequent jobs. */
export function QuickAction({
  label,
  icon,
  tone = "maroon",
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
        minHeight: 64,
        borderRadius: "16px",
        bgcolor: alpha(c, 0.1),
        border: `1px solid ${alpha(c, 0.25)}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 1.5,
        px: 1.75,
        color: c,
        textAlign: "left",
        transition: "transform 160ms cubic-bezier(.2,.8,.2,1), background-color 160ms",
        "&:active": { transform: "scale(0.98)" },
      }}
    >
      {icon}
      <Typography variant="subtitle1" sx={{ color: brand.ink }}>
        {label}
      </Typography>
    </ButtonBase>
  );
}
