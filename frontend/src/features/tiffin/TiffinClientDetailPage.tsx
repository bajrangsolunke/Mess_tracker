import { useState } from "react";
import { Alert, Box, Button, Divider, Drawer, IconButton, Skeleton, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/EditRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import PhoneIcon from "@mui/icons-material/PhoneRounded";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import type { PaymentMethod } from "../../api/types";
import { useDeleteTiffinPayment, useRecordTiffinPayment, useTiffinStatement } from "../../api/useTiffin";
import { PageHeader } from "../../components/brand/PageHeader";
import { StatCard } from "../../components/brand/StatCard";
import { VegMark } from "../../components/brand/VegMark";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { formatDateLong, monthKey, todayIst } from "../../lib/date";
import { MonthSwitcher } from "../attendance/MyAttendancePage";
import { TiffinClientForm } from "./TiffinClientForm";
import dayjs from "dayjs";

function PaymentSheet({ open, onClose, clientId, month, due }: { open: boolean; onClose: () => void; clientId: number; month: string; due: number }) {
  const { t } = useTranslation();
  const record = useRecordTiffinPayment(clientId);
  const [amount, setAmount] = useState(due > 0 ? String(due) : "");
  const [method, setMethod] = useState<PaymentMethod>("bank");
  const [paidOn, setPaidOn] = useState(todayIst());
  const [note, setNote] = useState("");
  const valid = /^\d{1,8}(\.\d{1,2})?$/.test(amount) && Number(amount) > 0;
  return (
    <Drawer anchor="bottom" open={open} onClose={onClose} slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 2.5, pb: "calc(env(safe-area-inset-bottom) + 20px)", maxWidth: 600, mx: "auto" } } }}>
      <Stack spacing={2}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.line, mx: "auto" }} />
        <Typography variant="h6">{t("payments.record")}</Typography>
        <TextField label={t("payments.amount")} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        <ToggleButtonGroup exclusive fullWidth value={method} onChange={(_, v: PaymentMethod | null) => v && setMethod(v)}>
          {(["bank", "upi", "cash"] as PaymentMethod[]).map((m) => (
            <ToggleButton key={m} value={m} sx={{ minHeight: 48, fontWeight: 600 }}>{t(`payments.method.${m}`)}</ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField label={t("payments.paidOn")} type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label={t("payments.note")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="UTR / cheque no." />
        </Box>
        {record.error ? <Alert severity="error">{t("common.error")}</Alert> : null}
        <Button variant="contained" disabled={!valid || record.isPending} onClick={() => record.mutate({ month, amount, method, paid_on: paidOn, note: note || undefined }, { onSuccess: onClose })}>
          {t("payments.record")} · {rupees(amount || 0)}
        </Button>
      </Stack>
    </Drawer>
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
  const due = Number(data.due);

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title={c.name}
        subtitle={`${t("tiffin.veg")} ${rupees(c.veg_rate)} · ${t("tiffin.nonveg")} ${rupees(c.nonveg_rate)}`}
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

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
        <StatCard label={t("tiffin.tiffins")} value={data.totals.total} tone="red" hint={`${t("tiffin.veg")} ${data.totals.veg} · ${t("tiffin.nonvegShort")} ${data.totals.nonveg}`} />
        <StatCard label={t("payments.billed")} value={rupees(data.amount)} tone="neutral" hint={`${t("payments.paid")} ${rupees(data.paid)}`} />
        <StatCard label={due < 0 ? t("tiffin.advance") : t("payments.due")} value={rupees(Math.abs(due))} tone={due > 0 ? "gold" : "green"} />
      </Box>

      <Button variant="contained" onClick={() => setPaying(true)}>{t("payments.record")}</Button>

      <Box>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>{t("tiffin.dailyOrders")}</Typography>
        <Box sx={{ borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, overflow: "hidden" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", px: 1.5, py: 1, bgcolor: brand.cream }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{t("holidays.date")}</Typography>
            <Box sx={{ display: "flex", justifyContent: "center" }}><VegMark kind="veg" size={14} /></Box>
            <Box sx={{ display: "flex", justifyContent: "center" }}><VegMark kind="nonveg" size={14} /></Box>
            <Typography variant="caption" sx={{ fontWeight: 700, textAlign: "right" }}>₹</Typography>
          </Box>
          {data.days.map((d) => (
            <Box key={d.date} sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", px: 1.5, py: 1, borderTop: `1px solid ${brand.line}`, alignItems: "center" }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{dayjs(d.date).locale(locale).format("D MMM, ddd")}</Typography>
              <Typography variant="body2" sx={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{d.lunch_veg + d.dinner_veg}</Typography>
              <Typography variant="body2" sx={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{d.lunch_nonveg + d.dinner_nonveg}</Typography>
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
      {paying ? <PaymentSheet open clientId={c.id} month={month} due={due} onClose={() => setPaying(false)} /> : null}
    </Stack>
  );
}
