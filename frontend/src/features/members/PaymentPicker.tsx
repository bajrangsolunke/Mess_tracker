import { Box, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { PaymentMethod } from "../../api/types";
import { paidAmount, type PayStatus, type PayValue } from "../../lib/payment";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";

/** Paid in full / part / not paid, with cash or UPI. Whatever is left stays due on the bill. */
export function PaymentPicker({ fee, value, onChange }: { fee: string | number; value: PayValue; onChange: (v: PayValue) => void }) {
  const { t } = useTranslation();
  const amount = paidAmount(value, fee);
  const left = amount === null ? null : Math.max(0, Number(fee) - Number(amount));
  const partialError = value.status === "partial" && value.amount !== "" && amount === null;
  return (
    <Box sx={{ p: 1.5, borderRadius: "14px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{t("pay.title")}</Typography>
      <ToggleButtonGroup exclusive fullWidth value={value.status} onChange={(_, s: PayStatus | null) => s && onChange({ ...value, status: s })}>
        {(["paid", "partial", "unpaid"] as PayStatus[]).map((s) => (
          <ToggleButton key={s} value={s} sx={{ minHeight: 48, fontWeight: 700, px: 0.5 }}>{t(`pay.${s}`)}</ToggleButton>
        ))}
      </ToggleButtonGroup>
      {value.status === "partial" ? (
        <TextField
          label={t("pay.receivedNow")}
          inputMode="decimal"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value.trim() })}
          error={partialError}
          helperText={partialError ? t("pay.partialInvalid", { fee: rupees(fee) }) : " "}
          sx={{ mt: 1.5 }}
          fullWidth
          autoFocus
        />
      ) : null}
      {value.status !== "unpaid" ? (
        <ToggleButtonGroup exclusive fullWidth size="small" value={value.method} onChange={(_, m: PaymentMethod | null) => m && onChange({ ...value, method: m })} sx={{ mt: value.status === "partial" ? 0 : 1.5 }}>
          {(["cash", "upi"] as PaymentMethod[]).map((m) => (
            <ToggleButton key={m} value={m} sx={{ minHeight: 40, fontWeight: 600 }}>{t(`payments.method.${m}`)}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      ) : null}
      {left !== null ? (
        <Typography variant="body2" sx={{ mt: 1, fontWeight: 700, color: left > 0 ? brand.goldDark : brand.greenDark }}>
          {left > 0 ? t("pay.leftDue", { amount: rupees(left) }) : t("pay.fullyPaid")}
        </Typography>
      ) : null}
    </Box>
  );
}
