import { useState } from "react";
import { Box, Button, Divider, IconButton, Skeleton, Stack, TextField, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import { useBills, useDeletePayment, useUpdateBill } from "../../api/useBilling";
import { PageHeader } from "../../components/brand/PageHeader";
import { StatusChip } from "../../components/brand/StatusChip";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { formatDateLong, formatMonth, monthKey } from "../../lib/date";
import { RecordPaymentSheet } from "./RecordPaymentSheet";

export function BillDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [params] = useSearchParams();
  const month = params.get("month") ?? monthKey();
  const { data } = useBills(month);
  const bill = data?.items.find((b) => b.id === Number(id));
  const del = useDeletePayment();
  const update = useUpdateBill();
  const [paying, setPaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  if (!bill) {
    return (
      <Stack spacing={2}>
        <PageHeader title=" " back="/owner/payments" />
        <Skeleton variant="rounded" height={140} sx={{ borderRadius: "16px" }} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <PageHeader title={bill.member.name} subtitle={formatMonth(bill.month.slice(0, 7), i18n.language)} back="/owner/payments" />

      <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="caption">{t("payments.bill")}</Typography>
          <StatusChip status={bill.status === "unpaid" ? "pending" : bill.status} />
        </Box>
        {editing ? (
          <Stack spacing={1.5}>
            <TextField label={t("payments.billed")} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <TextField label={t("payments.note")} value={note} onChange={(e) => setNote(e.target.value)} />
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Button variant="outlined" onClick={() => setEditing(false)} sx={{ flex: 1 }}>{t("common.cancel")}</Button>
              <Button variant="contained" disabled={update.isPending || !/^\d{1,8}(\.\d{1,2})?$/.test(amount)} sx={{ flex: 1 }} onClick={() => update.mutate({ billId: bill.id, amount, note: note || null }, { onSuccess: () => setEditing(false) })}>{t("common.save")}</Button>
            </Box>
          </Stack>
        ) : (
          <>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, textAlign: "center" }}>
              {[["billed", bill.amount, "text.primary"], ["paid", bill.paid, brand.greenDark], ["due", bill.due, Number(bill.due) > 0 ? brand.goldDark : "text.secondary"]].map(([k, v, c]) => (
                <Box key={k as string}>
                  <Typography variant="caption">{t(`payments.${k}`)}</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color: c as string }}>{rupees(v as string)}</Typography>
                </Box>
              ))}
            </Box>
            {bill.note ? <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>{bill.note}</Typography> : null}
            <Button size="small" variant="text" startIcon={<EditIcon />} sx={{ mt: 1, minHeight: 36 }} onClick={() => { setAmount(String(Number(bill.amount))); setNote(bill.note ?? ""); setEditing(true); }}>
              {t("payments.editBill")}
            </Button>
          </>
        )}
      </Box>

      {bill.status !== "paid" ? <Button variant="contained" onClick={() => setPaying(true)}>{t("payments.record")} · {rupees(bill.due)}</Button> : null}

      <Box>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>{t("payments.history")}</Typography>
        <Box sx={{ borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, px: 2 }}>
          {bill.payments.map((p, i) => (
            <Box key={p.id}>
              {i > 0 ? <Divider /> : null}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.25 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>{rupees(p.amount)} · {t(`payments.method.${p.method}`)}</Typography>
                  <Typography variant="caption">{formatDateLong(p.paid_on, i18n.language)}{p.note ? ` · ${p.note}` : ""}</Typography>
                </Box>
                <IconButton aria-label={t("common.delete")} onClick={() => del.mutate(p.id)} disabled={del.isPending}><DeleteIcon /></IconButton>
              </Box>
            </Box>
          ))}
          {bill.payments.length === 0 ? <Typography variant="body2" sx={{ color: "text.secondary", py: 2, textAlign: "center" }}>{t("payments.noPayments")}</Typography> : null}
        </Box>
      </Box>

      <RecordPaymentSheet bill={paying ? bill : null} onClose={() => setPaying(false)} />
    </Stack>
  );
}
