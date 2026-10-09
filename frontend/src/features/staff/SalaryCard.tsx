import { Box, Divider, Typography, alpha } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { StaffMonth } from "../../api/types";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { formatMonth } from "../../lib/date";

/** Salary for the month: salary − advances (+ repaid) − already paid = still payable. */
export function SalaryCard({ month, title }: { month: StaffMonth; title?: string }) {
  const { t, i18n } = useTranslation();
  const payable = Number(month.payable);
  const lines: [string, string][] = [
    [t("staff.salary"), rupees(month.salary)],
    [t("staff.advances"), `− ${rupees(month.advances)}`],
    ...(Number(month.repaid) > 0 ? ([[t("staff.repaid"), `+ ${rupees(month.repaid)}`]] as [string, string][]) : []),
    [t("staff.paid"), `− ${rupees(month.paid)}`],
  ];
  return (
    <Box sx={{ p: 2, borderRadius: "16px", bgcolor: payable > 0 ? alpha(brand.gold, 0.1) : alpha(brand.green, 0.08), border: `1px solid ${payable > 0 ? alpha(brand.gold, 0.4) : alpha(brand.green, 0.35)}` }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{title ?? t("staff.monthTitle", { month: formatMonth(month.month.slice(0, 7), i18n.language) })}</Typography>
      {lines.map(([label, value]) => (
        <Box key={label} sx={{ display: "flex", justifyContent: "space-between", py: 0.35 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>{label}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
        </Box>
      ))}
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography sx={{ fontWeight: 700 }}>{payable < 0 ? t("staff.owes") : t("staff.payable")}</Typography>
        <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color: payable > 0 ? brand.goldDark : brand.greenDark }}>{rupees(Math.abs(payable))}</Typography>
      </Box>
    </Box>
  );
}
