import { useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Drawer, IconButton, MenuItem, Skeleton, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography, alpha } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useTranslation } from "react-i18next";
import type { LedgerEntry, LedgerKind } from "../../api/types";
import { useAddLedgerEntry, useDeleteLedgerEntry, useLedger, useStaffList } from "../../api/useOperations";
import { PageHeader } from "../../components/brand/PageHeader";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { formatDateLong, monthKey, todayIst } from "../../lib/date";
import { DateStrip } from "../attendance/DateStrip";
import { MonthSwitcher } from "../attendance/MyAttendancePage";
import dayjs from "dayjs";

const AMOUNT = /^\d{1,8}(\.\d{1,2})?$/;
const KINDS: LedgerKind[] = ["expense", "income", "staff_advance", "salary_payment", "advance_repayment"];
const STAFF_KINDS: LedgerKind[] = ["staff_advance", "salary_payment", "advance_repayment"];
const IN_KINDS: LedgerKind[] = ["income", "advance_repayment"];
const EXPENSE_CHIPS = ["vegetables", "grocery", "gas", "milk", "chicken", "rent", "electricity"] as const;
const RED = "#B91C1C";

function AddEntrySheet({ defaultDate, onClose }: { defaultDate: string; onClose: () => void }) {
  const { t } = useTranslation();
  const add = useAddLedgerEntry();
  const staff = useStaffList(monthKey());
  const [kind, setKind] = useState<LedgerKind>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [staffId, setStaffId] = useState<number | "">("");
  const [note, setNote] = useState("");
  const needsStaff = STAFF_KINDS.includes(kind);
  const valid = AMOUNT.test(amount) && Number(amount) > 0 && (needsStaff ? staffId !== "" : description.trim().length > 0);
  return (
    <Drawer anchor="bottom" open onClose={onClose} slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 2.5, pb: "calc(env(safe-area-inset-bottom) + 20px)", maxWidth: 600, mx: "auto", maxHeight: "92dvh" } } }}>
      <Stack spacing={1.5} sx={{ overflowY: "auto" }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.line, mx: "auto" }} />
        <Typography variant="h6">{t("ledger.add")}</Typography>
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          {KINDS.map((k) => (
            <Chip key={k} label={t(`ledger.kind.${k}`)} onClick={() => setKind(k)} sx={{ height: 36, fontWeight: 700, bgcolor: kind === k ? brand.red : brand.paper, color: kind === k ? "#fff" : "text.primary", border: `1px solid ${kind === k ? brand.red : brand.line}` }} />
          ))}
        </Box>
        <TextField label={t("payments.amount")} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.trim())} autoFocus />
        {needsStaff ? (
          <TextField select label={t("ledger.staff")} value={staffId} onChange={(e) => setStaffId(Number(e.target.value))}>
            {(staff.data ?? []).filter((s) => s.is_active).map((s) => (
              <MenuItem key={s.user_id} value={s.user_id}>{s.name}</MenuItem>
            ))}
          </TextField>
        ) : (
          <>
            <TextField label={t("ledger.description")} value={description} onChange={(e) => setDescription(e.target.value)} />
            {kind === "expense" ? (
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                {EXPENSE_CHIPS.map((c) => (
                  <Chip key={c} size="small" label={t(`ledger.chip.${c}`)} onClick={() => setDescription(t(`ledger.chip.${c}`))} sx={{ height: 32 }} />
                ))}
              </Box>
            ) : null}
          </>
        )}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField label={t("ledger.date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label={t("payments.note")} value={note} onChange={(e) => setNote(e.target.value)} />
        </Box>
        {add.error ? <Alert severity="error">{t("common.error")}</Alert> : null}
        <Button
          variant="contained"
          disabled={!valid || add.isPending}
          onClick={() =>
            add.mutate(
              { kind, amount, occurred_on: date, description: needsStaff ? t(`ledger.kind.${kind}`) : description.trim(), note: note || null, staff_user_id: needsStaff ? Number(staffId) : null },
              { onSuccess: onClose },
            )
          }
        >
          {t("common.save")} · {rupees(amount || 0)}
        </Button>
      </Stack>
    </Drawer>
  );
}

function Total({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <Box sx={{ flex: 1, p: 1.25, borderRadius: "12px", bgcolor: alpha(color, 0.08), textAlign: "center" }}>
      <Typography variant="caption">{label}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", color, fontVariantNumeric: "tabular-nums" }}>{rupees(value)}</Typography>
    </Box>
  );
}

function EntryRow({ e, onDelete }: { e: LedgerEntry; onDelete: () => void }) {
  const { t } = useTranslation();
  const incoming = IN_KINDS.includes(e.kind);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1.1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{e.staff_name ? `${t(`ledger.kind.${e.kind}`)} · ${e.staff_name}` : e.description}</Typography>
        <Typography variant="caption">{t(`ledger.kind.${e.kind}`)}{e.note ? ` · ${e.note}` : ""}</Typography>
      </Box>
      <Typography sx={{ fontWeight: 800, color: incoming ? brand.greenDark : RED, fontVariantNumeric: "tabular-nums" }}>{incoming ? "+" : "−"} {rupees(e.amount)}</Typography>
      <IconButton aria-label={t("common.delete")} onClick={onDelete} size="small"><DeleteIcon fontSize="small" /></IconButton>
    </Box>
  );
}

/** Daily khata: money in (member fees, company payments, other) and out (expenses, advances, salaries). */
export function LedgerPage() {
  const { t, i18n } = useTranslation();
  const [mode, setMode] = useState<"day" | "month">("day");
  const [day, setDay] = useState(todayIst());
  const [month, setMonth] = useState(monthKey());
  const [from, to] = mode === "day" ? [day, day] : [`${month}-01`, dayjs(`${month}-01`).endOf("month").format("YYYY-MM-DD")];
  const { data, isLoading } = useLedger(from, to);
  const del = useDeleteLedgerEntry();
  const [adding, setAdding] = useState(false);
  const byDate = useMemo(() => {
    const groups = new Map<string, LedgerEntry[]>();
    for (const e of data?.entries ?? []) groups.set(e.occurred_on, [...(groups.get(e.occurred_on) ?? []), e]);
    return [...groups.entries()];
  }, [data]);
  const tt = data?.totals;
  const net = Number(tt?.net ?? 0);

  return (
    <Stack spacing={2}>
      <PageHeader title={t("ledger.title")} back="/owner/more" action={<Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={() => setAdding(true)} sx={{ minHeight: 44 }}>{t("ledger.addShort")}</Button>} />
      <ToggleButtonGroup exclusive fullWidth value={mode} onChange={(_, v: "day" | "month" | null) => v && setMode(v)}>
        <ToggleButton value="day" sx={{ minHeight: 44, fontWeight: 700 }}>{t("ledger.day")}</ToggleButton>
        <ToggleButton value="month" sx={{ minHeight: 44, fontWeight: 700 }}>{t("ledger.month")}</ToggleButton>
      </ToggleButtonGroup>
      {mode === "day" ? <DateStrip value={day} onChange={setDay} /> : <MonthSwitcher month={month} onChange={setMonth} />}

      {isLoading && !data ? (
        <Skeleton variant="rounded" height={160} sx={{ borderRadius: "16px" }} />
      ) : tt ? (
        <>
          <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1.5 }}>
              <Typography sx={{ fontWeight: 700 }}>{net >= 0 ? t("ledger.netIn") : t("ledger.netOut")}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.8rem", color: net >= 0 ? brand.greenDark : RED }}>{rupees(Math.abs(net))}</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Total label={t("ledger.cashIn")} value={tt.cash_in} color={brand.green} />
              <Total label={t("ledger.cashOut")} value={tt.cash_out} color={RED} />
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 2, rowGap: 0.5, mt: 1.5 }}>
              {(
                [
                  ["ledger.memberFees", tt.member_collections, true],
                  ["ledger.kind.expense", tt.expense, false],
                  ["ledger.companyPayments", tt.company_collections, true],
                  ["ledger.kind.staff_advance", tt.staff_advance, false],
                  ["ledger.kind.income", tt.income, true],
                  ["ledger.kind.salary_payment", tt.salary_payment, false],
                ] as const
              ).map(([k, v, incoming]) => (
                <Box key={k} sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography variant="caption" noWrap>{t(k)}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: Number(v) ? (incoming ? brand.greenDark : RED) : "text.disabled" }}>{rupees(v)}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {byDate.length === 0 ? (
            <Typography sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>{t("ledger.empty")}</Typography>
          ) : (
            byDate.map(([d, entries]) => (
              <Box key={d}>
                {mode === "month" ? <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{formatDateLong(d, i18n.language)}</Typography> : null}
                <Box sx={{ borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, px: 1.5 }}>
                  {entries.map((e, i) => (
                    <Box key={e.id} sx={{ borderTop: i ? `1px solid ${brand.line}` : "none" }}>
                      <EntryRow e={e} onDelete={() => window.confirm(t("ledger.deleteConfirm")) && del.mutate(e.id)} />
                    </Box>
                  ))}
                </Box>
              </Box>
            ))
          )}
          <Typography variant="caption" sx={{ textAlign: "center" }}>{t("ledger.autoNote")}</Typography>
        </>
      ) : null}
      {adding ? <AddEntrySheet defaultDate={mode === "day" ? day : todayIst()} onClose={() => setAdding(false)} /> : null}
    </Stack>
  );
}
