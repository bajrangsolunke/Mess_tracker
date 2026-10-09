import { Box, alpha } from "@mui/material";
import { useTranslation } from "react-i18next";
import { brand } from "../../app/theme";

/** "12 / 30 left" pill; red when used up, gold when 5 or fewer remain. */
export function TiffinsLeft({ left, total }: { left: number; total?: number }) {
  const { t } = useTranslation();
  const color = left <= 0 ? "#B91C1C" : left <= 5 ? brand.goldDark : brand.greenDark;
  return (
    <Box component="span" sx={{ flexShrink: 0, fontSize: "0.75rem", fontWeight: 800, px: 1, py: 0.3, borderRadius: 999, bgcolor: alpha(color, 0.12), color, whiteSpace: "nowrap" }}>
      {left <= 0 ? t("pack.usedUp") : total ? t("pack.leftOf", { left, total }) : t("pack.left", { left })}
    </Box>
  );
}
