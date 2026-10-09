import { useState } from "react";
import { Alert, Box, Button, Divider, Drawer, IconButton, Skeleton, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography, alpha } from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { whatsappUrl } from "../../lib/share";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import PhoneIcon from "@mui/icons-material/PhoneRounded";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import type { PaymentMethod } from "../../api/types";
import { useDeleteTiffinPayment, useRecordTiffinPayment, useTiffinStatement } from "../../api/useTiffin";
import { PageHeader } from "../../components/brand/PageHeader";
import { NONVEG_COLOR, VEG_COLOR, VegMark } from "../../components/brand/VegMark";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { formatDateLong, monthKey, todayIst } from "../../lib/date";
import { MonthSwitcher } from "../attendance/MyAttendancePage";
import { TiffinClientForm } from "./TiffinClientForm";
import dayjs from "dayjs";

function PaymentSheet({ open, onClose, clientId, due }: { open: boolean; onClose: () => void; clientId: number; due: number }) {
  const { t } = useTranslation();
  const record = useRecordTiffinPayment(clientId);
  const [amount, setAmount] = useState(due > 0 ? String(due) : "");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [paidOn, setPaidOn] = useState(todayIst());
  const [note, setNote] = useState("");
  const valid = /^\d{1,8}(\.\d{1,2})?$/.test(amount) && Number(amount) > 0;
  return (
    <Drawer anchor="bottom" open={open} onClose={onClose} slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 2.5, pb: "calc(env(safe-area-inset-bottom) + 20px)", maxWidth: 600, mx: "auto" } } }}>
      <Stack spacing={2}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.line, mx: "auto" }} />
        <Typography variant="h6">{t("payments.record")}</Typography>
        {due > 0 ? <Typography variant="body2" sx={{ color: brand.goldDark, fontWeight: 700 }}>{t("tiffin.balanceNow", { amount: rupees(due) })}</Typography> : null}
        <TextField label={t("payments.amount")} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <ToggleButtonGroup exclusive fullWidth value={method} onChange={(_, v: PaymentMethod | null) => v && setMethod(v)}>
          {(["cash", "upi", "bank"] as PaymentMethod[]).map((m) => (
            <ToggleButton key={m} value={m} sx={{ minHeight: 48, fontWeight: 600 }}>{t(`payments.method.${m}`)}</ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField label={t("payments.paidOn")} type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label={t("payments.note")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="UTR / cheque no." />
        </Box>
        {record.error ? <Alert severity="error">{t("common.error")}</Alert> : null}
        <Button variant="contained" disabled={!valid || record.isPending} onClick={() => record.mutate({ amount, method, paid_on: paidOn, note: note || undefined }, { onSuccess: onClose })}>
          {t("payments.record")} · {rupees(amount || 0)}
        </Button>
      </Stack>
    </Drawer>
  );
}

function MealCell({ veg, nonveg }: { veg: number; nonveg: number }) {
  if (!veg && !nonveg) return <Typography variant="body2" sx={{ textAlign: "center", color: "text.disabled" }}>—</Typography>;
  return (
    <Typography variant="body2" sx={{ textAlign: "center", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
      <Box component="span" sx={{ color: VEG_COLOR }}>{veg}</Box>
      <Box component="span" sx={{ color: "text.disabled" }}> + </Box>
      <Box component="span" sx={{ color: NONVEG_COLOR }}>{nonveg}</Box>
    </Typography>
  );
}

export function TiffinClientDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const clientId = Number(id);
  const [params] = useSearchParams();
  const [month, setMonth] = useState(params.get("month") ?? monthKey());
  const { data } = useTiffinStatement(clientId, month);
  const del = useDeleteTiffinPayment();
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const locale = i18n.language === "mr" || i18n.language === "hi" ? i18n.language : "en";

  if (!data) {
    return (
      <Stack spacing={2}>
        <PageHeader title=" " back="/owner/tiffin-clients" />
        <Skeleton variant="rounded" height={160} sx={{ borderRadius: "16px" }} />
      </Stack>
    );
  }
  const c = data.client;
  const balance = Number(data.balance);
  const statementText = t("tiffin.statementText", {
    name: c.name,
    month: dayjs(`${month}-01`).locale(locale).format("MMMM YYYY"),
    count: data.totals.total,
    veg: data.totals.veg,
    nonveg: data.totals.nonveg,
    amount: rupees(data.amount),
    opening: rupees(data.opening_due),
    paid: rupees(data.paid),
    balance: rupees(balance),
  });

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title={c.name}
        subtitle={c.contact_name ?? undefined}
        back="/owner/tiffin-clients"
        action={<Button variant="outlined" size="medium" startIcon={<EditIcon />} onClick={() => setEditing(true)} sx={{ minHeight: 44 }}>{t("common.edit")}</Button>}
      />
      {c.contact_name || c.phone || c.address ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: "14px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {c.contact_name ? <Typography variant="subtitle2">{c.contact_name}</Typography> : null}
            {c.address ? <Typography variant="body2" sx={{ color: "text.secondary" }}>{c.address}</Typography> : null}
          </Box>
          {c.phone ? (
            <Button component="a" href={`tel:+91${c.phone}`} variant="outlined" sx={{ minWidth: 48, px: 1.25 }} aria-label={t("members.call")}>
              <PhoneIcon />
            </Button>
          ) : null}
        </Box>
      ) : null}

      <MonthSwitcher month={month} onChange={setMonth} />

      <Box sx={{ p: 2, borderRadius: "16px", bgcolor: balance > 0 ? alpha(brand.gold, 0.1) : alpha(brand.green, 0.08), border: `1px solid ${balance > 0 ? alpha(brand.gold, 0.4) : alpha(brand.green, 0.35)}` }}>
        {[
          [t("tiffin.openingBalance"), rupees(data.opening_due)],
          [t("tiffin.monthTiffins", { count: data.totals.total, veg: data.totals.veg, nonveg: data.totals.nonveg }), `+ ${rupees(data.amount)}`],
          [t("tiffin.monthPaid"), `− ${rupees(data.paid)}`],
        ].map(([label, value]) => (
          <Box key={label} sx={{ display: "flex", justifyContent: "space-between", gap: 1, py: 0.4 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>{label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
          </Box>
        ))}
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Typography sx={{ fontWeight: 700 }}>{balance < 0 ? t("tiffin.advance") : t("tiffin.balance")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", color: balance > 0 ? brand.goldDark : brand.greenDark }}>{rupees(Math.abs(balance))}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="contained" onClick={() => setPaying(true)} sx={{ flex: 1.3 }}>{t("payments.record")}</Button>
        <Button variant="outlined" startIcon={<WhatsAppIcon />} href={whatsappUrl(c.phone, statementText)} target="_blank" rel="noopener" sx={{ flex: 1, color: "#1DA851", borderColor: alpha("#25D366", 0.6) }}>
          {t("tiffin.sendStatement")}
        </Button>
      </Box>

      {data.by_item.length > 0 ? (
        <Box>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>{t("tiffin.byItem")}</Typography>
          <Box sx={{ borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, px: 1.5 }}>
            {data.by_item.map((it, i) => (
              <Box key={it.item_id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.1, borderTop: i ? `1px solid ${brand.line}` : "none" }}>
                <VegMark kind={it.food_type} size={14} />
                <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{it.name}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, width: 48, textAlign: "right" }}>{it.quantity}</Typography>
                <Typography variant="body2" sx={{ width: 84, textAlign: "right" }}>{rupees(it.amount)}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}

      <Box>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>{t("tiffin.dailyOrders")}</Typography>
        <Box sx={{ borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, overflow: "hidden" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", px: 1.5, py: 1, bgcolor: brand.cream }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{t("holidays.date")}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: "center" }}>{t("meal.lunchShort")}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: "center" }}>{t("meal.dinnerShort")}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: "right" }}>₹</Typography>
          </Box>
          {data.days.map((d) => (
            <Box key={d.date} sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", px: 1.5, py: 1, borderTop: `1px solid ${brand.line}`, alignItems: "center" }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(d.date).locale(locale).format("D MMM, ddd")}</Typography>
              <MealCell veg={d.lunch_veg} nonveg={d.lunch_nonveg} />
              <MealCell veg={d.dinner_veg} nonveg={d.dinner_nonveg} />
              <Typography variant="body2" sx={{ textAlign: "right", fontWeight: 600 }}>{rupees(d.amount)}</Typography>
            </Box>
          ))}
          {data.days.length === 0 ? <Typography variant="body2" sx={{ color: "text.secondary", p: 2, textAlign: "center" }}>{t("tiffin.noOrders")}</Typography> : null}
        </Box>
      </Box>

      <Box>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>{t("payments.history")}</Typography>
        <Box sx={{ borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, px: 2 }}>
          {data.payments.map((p, i) => (
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
          {data.payments.length === 0 ? <Typography variant="body2" sx={{ color: "text.secondary", py: 2, textAlign: "center" }}>{t("payments.noPayments")}</Typography> : null}
        </Box>
      </Box>

      {editing ? <TiffinClientForm open client={c} onClose={() => setEditing(false)} /> : null}
      {paying ? <PaymentSheet open clientId={c.id} due={balance} onClose={() => setPaying(false)} /> : null}
    </Stack>
  );
}
