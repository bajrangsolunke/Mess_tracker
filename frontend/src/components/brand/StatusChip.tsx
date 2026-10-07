import { Chip, alpha } from "@mui/material";
import { useTranslation } from "react-i18next";
import { brand } from "../../app/theme";

export type Status = "paid" | "pending" | "partial" | "present" | "absent" | "active" | "inactive";

const STYLE: Record<Status, { bg: string; fg: string }> = {
  paid: { bg: alpha(brand.green, 0.14), fg: brand.greenDark },
  present: { bg: alpha(brand.green, 0.14), fg: brand.greenDark },
  active: { bg: alpha(brand.green, 0.14), fg: brand.greenDark },
  pending: { bg: alpha(brand.gold, 0.18), fg: brand.goldDark },
  partial: { bg: alpha(brand.gold, 0.28), fg: brand.goldDark },
  absent: { bg: alpha("#D62828", 0.12), fg: "#A61B1B" },
  inactive: { bg: brand.cream, fg: brand.inkSoft },
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
