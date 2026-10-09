import { useState } from "react";
import { Alert, Box, Button, Chip, Drawer, FormControlLabel, IconButton, Skeleton, Stack, Switch, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import PhoneIcon from "@mui/icons-material/PhoneRounded";
import { useTranslation } from "react-i18next";
import type { LedgerKind, Staff } from "../../api/types";
import { useAddLedgerEntry, useCreateStaff, useStaffList, useUpdateStaff } from "../../api/useOperations";
import { ApiError } from "../../api/client";
import { PageHeader } from "../../components/brand/PageHeader";
import { EmptyState } from "../../components/brand/EmptyState";
import { Avatar } from "../../components/brand/Avatar";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { monthKey, todayIst } from "../../lib/date";
import { normalizePhoneInput } from "../../lib/phone";
import { MonthSwitcher } from "../attendance/MyAttendancePage";
import { SalaryCard } from "../staff/SalaryCard";
import { TempPasswordDialog } from "../members/TempPasswordDialog";

const AMOUNT = /^\d{1,8}(\.\d{1,2})?$/;
const sheetPaper = { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 2.5, pb: "calc(env(safe-area-inset-bottom) + 20px)", maxWidth: 600, mx: "auto", maxHeight: "92dvh" } };

function Handle() {
  return <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.line, mx: "auto" }} />;
}

function StaffForm({ staff, onClose, onCreated }: { staff?: Staff; onClose: () => void; onCreated: (s: Staff, password: string) => void }) {
  const { t } = useTranslation();
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const [name, setName] = useState(staff?.name ?? "");
  const [phone, setPhone] = useState(staff?.phone ?? "");
  const [salary, setSalary] = useState(staff ? String(Number(staff.monthly_salary)) : "");
  const [active, setActive] = useState(staff?.is_active ?? true);
  const p = normalizePhoneInput(phone);
  const valid = name.trim() && /^[6-9]\d{9}$/.test(p) && AMOUNT.test(salary) && Number(salary) > 0;
  const err = create.error ?? update.error;
  const busy = create.isPending || update.isPending;
  const save = () =>
    staff
      ? update.mutate({ id: staff.id, monthly_salary: salary, is_active: active }, { onSuccess: onClose })
      : create.mutate({ name: name.trim(), phone: p, monthly_salary: salary }, { onSuccess: (r) => onCreated(r.staff, r.temp_password) });
  return (
    <Drawer anchor="bottom" open onClose={onClose} slotProps={{ paper: sheetPaper }}>
      <Stack spacing={1.5}>
        <Handle />
        <Typography variant="h6">{staff ? t("staff.edit") : t("staff.add")}</Typography>
        <TextField label={t("members.name")} value={name} disabled={!!staff} onChange={(e) => setName(e.target.value)} autoFocus={!staff} />
        <TextField label={t("auth.phone")} type="tel" inputMode="numeric" value={phone} disabled={!!staff} onChange={(e) => setPhone(e.target.value)} helperText={staff ? " " : t("staff.phoneHint")} />
        <TextField label={t("staff.monthlySalary")} inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value.trim())} error={!!salary && !AMOUNT.test(salary)} />
        {staff ? <FormControlLabel control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />} label={active ? t("staff.canLogin") : t("staff.blocked")} /> : null}
        {err ? <Alert severity="error">{err instanceof ApiError && err.code === "DUPLICATE_PHONE" ? t("members.duplicatePhone") : t("common.error")}</Alert> : null}
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>{t("common.cancel")}</Button>
          <Button variant="contained" disabled={!valid || busy} onClick={save} sx={{ flex: 1 }}>{t("common.save")}</Button>
        </Box>
      </Stack>
    </Drawer>
  );
}

/** Give an advance, pay salary, or record an advance returned in cash. */
function MoneySheet({ staff, kind, onClose }: { staff: Staff; kind: LedgerKind; onClose: () => void }) {
  const { t } = useTranslation();
  const add = useAddLedgerEntry();
  const payable = Number(staff.month?.payable ?? 0);
  const [amount, setAmount] = useState(kind === "salary_payment" && payable > 0 ? String(payable) : "");
  const [date, setDate] = useState(todayIst());
  const [note, setNote] = useState("");
  const valid = AMOUNT.test(amount) && Number(amount) > 0;
  return (
    <Drawer anchor="bottom" open onClose={onClose} slotProps={{ paper: sheetPaper }}>
      <Stack spacing={1.5}>
        <Handle />
        <Typography variant="h6">{t(`staff.action.${kind}`, { name: staff.name })}</Typography>
        {kind === "salary_payment" && staff.month ? <Typography variant="body2" sx={{ color: brand.goldDark, fontWeight: 700 }}>{t("staff.payableNow", { amount: rupees(staff.month.payable) })}</Typography> : null}
        <TextField label={t("payments.amount")} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.trim())} autoFocus />
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField label={t("ledger.date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label={t("payments.note")} value={note} onChange={(e) => setNote(e.target.value)} />
        </Box>
        {add.error ? <Alert severity="error">{t("common.error")}</Alert> : null}
        <Button
          variant="contained"
          disabled={!valid || add.isPending}
          onClick={() => add.mutate({ kind, amount, occurred_on: date, description: t(`ledger.kind.${kind}`), note: note || null, staff_user_id: staff.user_id }, { onSuccess: onClose })}
        >
          {t("common.save")} · {rupees(amount || 0)}
        </Button>
      </Stack>
    </Drawer>
  );
}

export function StaffPage() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(monthKey());
  const { data, isLoading } = useStaffList(month);
  const [form, setForm] = useState<{ staff?: Staff } | null>(null);
  const [money, setMoney] = useState<{ staff: Staff; kind: LedgerKind } | null>(null);
  const [login, setLogin] = useState<{ name: string; phone: string; password: string } | null>(null);

  return (
    <Stack spacing={2}>
      <PageHeader title={t("staff.title")} back="/owner/more" action={<Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={() => setForm({})} sx={{ minHeight: 44 }}>{t("staff.add")}</Button>} />
      <MonthSwitcher month={month} onChange={setMonth} />
      {isLoading && !data ? (
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: "16px" }} />
      ) : !data || data.length === 0 ? (
        <EmptyState pose="cooking" says={t("staff.emptySays")} title={t("staff.emptyTitle")} hint={t("staff.emptyHint")} actionLabel={t("staff.add")} onAction={() => setForm({})} />
      ) : (
        <Stack spacing={1.5}>
          {data.map((s) => (
            <Box key={s.id} sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, opacity: s.is_active ? 1 : 0.65 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
                <Avatar name={s.name} size={44} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap>{s.name}</Typography>
                  <Typography variant="caption">+91 {s.phone} · {rupees(s.monthly_salary)}/{t("members.perMonth")}</Typography>
                </Box>
                {!s.is_active ? <Chip size="small" label={t("staff.blocked")} /> : null}
                <IconButton component="a" href={`tel:+91${s.phone}`} aria-label={t("members.call")}><PhoneIcon /></IconButton>
                <IconButton aria-label={t("common.edit")} onClick={() => setForm({ staff: s })}><EditIcon /></IconButton>
              </Box>
              {s.month ? <SalaryCard month={s.month} /> : null}
              <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
                <Button variant="outlined" onClick={() => setMoney({ staff: s, kind: "staff_advance" })} sx={{ flex: 1 }}>{t("staff.giveAdvance")}</Button>
                <Button variant="contained" onClick={() => setMoney({ staff: s, kind: "salary_payment" })} sx={{ flex: 1 }}>{t("staff.paySalary")}</Button>
              </Box>
              <Button size="small" onClick={() => setMoney({ staff: s, kind: "advance_repayment" })} sx={{ mt: 0.5, minHeight: 36 }}>{t("staff.recordRepaid")}</Button>
            </Box>
          ))}
        </Stack>
      )}
      {form ? (
        <StaffForm
          staff={form.staff}
          onClose={() => setForm(null)}
          onCreated={(s, password) => {
            setForm(null);
            setLogin({ name: s.name, phone: s.phone, password });
          }}
        />
      ) : null}
      {money ? <MoneySheet staff={money.staff} kind={money.kind} onClose={() => setMoney(null)} /> : null}
      {login ? <TempPasswordDialog open name={login.name} phone={login.phone} password={login.password} onClose={() => setLogin(null)} /> : null}
    </Stack>
  );
}
