import { useState } from "react";
import { Alert, Box, Button, Drawer, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { Bill, PaymentMethod } from "../../api/types";
import { useRecordPayment } from "../../api/useBilling";
import { ApiError } from "../../api/client";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { todayIst } from "../../lib/date";

/** Bottom sheet to record a cash/UPI/bank payment against a bill. Defaults to the full due amount. */
export function RecordPaymentSheet({ bill, onClose }: { bill: Bill | null; onClose: () => void }) {
  const { t } = useTranslation();
  const record = useRecordPayment();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [paidOn, setPaidOn] = useState(todayIst());
  const [note, setNote] = useState("");
  const due = bill ? Number(bill.due) : 0;
  const value = amount === "" ? String(due) : amount;
  const valid = /^\d{1,8}(\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= due;
  const err = record.error instanceof ApiError ? (record.error.code === "OVERPAYMENT" ? t("payments.overpayment") : t("common.error")) : record.error ? t("common.error") : null;

  return (
    <Drawer anchor="bottom" open={!!bill} onClose={onClose} slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 2.5, pb: "calc(env(safe-area-inset-bottom) + 20px)", maxWidth: 600, mx: "auto" } } }}>
      {bill ? (
        <Stack spacing={2}>
          <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.line, mx: "auto" }} />
          <Box>
            <Typography variant="h6">{bill.member.name}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("payments.due")}: <b>{rupees(bill.due)}</b> · {t("payments.billed")}: {rupees(bill.amount)}
            </Typography>
          </Box>
          <TextField label={t("payments.amount")} inputMode="decimal" value={value} onChange={(e) => setAmount(e.target.value)} autoFocus />
          <ToggleButtonGroup exclusive fullWidth value={method} onChange={(_, v: PaymentMethod | null) => v && setMethod(v)}>
            {(["cash", "upi", "bank"] as PaymentMethod[]).map((m) => (
              <ToggleButton key={m} value={m} sx={{ minHeight: 48, fontWeight: 600 }}>{t(`payments.method.${m}`)}</ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            <TextField label={t("payments.paidOn")} type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField label={t("payments.note")} value={note} onChange={(e) => setNote(e.target.value)} />
          </Box>
          {err ? <Alert severity="error">{err}</Alert> : null}
          <Button
            variant="contained"
            disabled={!valid || record.isPending}
            onClick={() => record.mutate({ billId: bill.id, amount: value, method, paid_on: paidOn, note: note || undefined }, { onSuccess: () => { setAmount(""); setNote(""); onClose(); } })}
          >
            {t("payments.record")} · {rupees(value)}
          </Button>
        </Stack>
      ) : null}
    </Drawer>
  );
}
