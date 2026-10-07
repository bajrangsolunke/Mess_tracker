import { Chip, alpha } from "@mui/material";
import { useTranslation } from "react-i18next";
import { brand } from "../../app/theme";

export type Status = "paid" | "pending" | "partial" | "present" | "absent" | "active" | "inactive";

const STYLE: Record<Status, { bg: string; fg: string }> = {
  paid: { bg: alpha(brand.leaf, 0.14), fg: "#0B6B4F" },
  present: { bg: alpha(brand.leaf, 0.14), fg: "#0B6B4F" },
  active: { bg: alpha(brand.leaf, 0.14), fg: "#0B6B4F" },
  pending: { bg: alpha(brand.saffron, 0.18), fg: "#9A4B00" },
  partial: { bg: alpha(brand.amber, 0.28), fg: "#7A5800" },
  absent: { bg: alpha("#D62828", 0.12), fg: "#A61B1B" },
  inactive: { bg: brand.creamDark, fg: brand.inkSoft },
};

export function StatusChip({ status, size = "small" }: { status: Status; size?: "small" | "medium" }) {
  const { t } = useTranslation();
  const s = STYLE[status];
  return (
    <Chip
      size={size}
      label={t(`status.${status}`)}
      sx={{ bgcolor: s.bg, color: s.fg, "& .MuiChip-label": { px: 1.25 } }}
    />
  );
}
