import { useMemo, useState } from "react";
import { Alert, Box, Button, Drawer, Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { Bill, Member, Plan } from "../../api/types";
import { usePlans } from "../../api/usePlans";
import { useRenew } from "../../api/useMembership";
import { ApiError } from "../../api/client";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { formatDateLong } from "../../lib/date";
import { MealChoice } from "./MealChoice";
import { PaymentPicker } from "../members/PaymentPicker";
import { PAY_DEFAULT, paidAmount, type PayValue } from "../../lib/payment";
import { mealChoiceFromPlan, membershipEnd, nextStart, planForChoice, type Choice } from "../../lib/membership";

/** Owner renews a membership for one more month; plan can switch between 1 time and 2 times. */
export function RenewSheet({ member, onClose, onRenewed }: { member: Member; onClose: () => void; onRenewed?: (bill: Bill) => void }) {
  const { t, i18n } = useTranslation();
  const plans = usePlans();
  const renew = useRenew();
  const requested = member.renewal_plan;
  const [choice, setChoice] = useState<Choice | null>(() => mealChoiceFromPlan(requested ?? member.plan));
  const [start, setStart] = useState(nextStart(member.valid_until));
  const [pay, setPay] = useState<PayValue>(PAY_DEFAULT);
  const standard = (plans.data ?? []).filter((p) => p.kind && p.is_active);
  const target: Plan | undefined = useMemo(() => (choice ? planForChoice(standard, choice) : undefined) ?? (requested ?? member.plan), [choice, standard, requested, member.plan]);
  const switching = target && target.id !== member.plan.id;
  const amount = switching ? target.monthly_fee : member.monthly_fee;
  const paid = paidAmount(pay, amount);
  const err = renew.error instanceof ApiError ? (renew.error.code === "PERIOD_EXISTS" ? t("membership.periodExists") : t("common.error")) : renew.error ? t("common.error") : null;

  return (
    <Drawer anchor="bottom" open onClose={onClose} slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 2.5, pb: "calc(env(safe-area-inset-bottom) + 20px)", maxWidth: 600, mx: "auto" } } }}>
      <Stack spacing={2} sx={{ maxHeight: "86dvh", overflowY: "auto" }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.line, mx: "auto" }} />
        <Box>
          <Typography variant="h6">{t("membership.renewTitle", { name: member.name })}</Typography>
          {requested ? <Typography variant="body2" sx={{ color: brand.greenDark, fontWeight: 600 }}>{t("membership.memberRequested")}</Typography> : null}
        </Box>
        {standard.length ? <MealChoice plans={standard} value={choice} onChange={setChoice} /> : null}
        <TextField label={t("membership.startDate")} type="date" value={start} onChange={(e) => setStart(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} helperText={t("membership.validTill", { date: formatDateLong(membershipEnd(start), i18n.language) })} />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1.5, borderRadius: "14px", bgcolor: brand.cream }}>
          <Typography>{t("membership.amount")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "1.3rem" }}>{rupees(amount)}</Typography>
        </Box>
        <PaymentPicker fee={amount} value={pay} onChange={setPay} />
        {err ? <Alert severity="error">{err}</Alert> : null}
        <Button variant="contained" disabled={renew.isPending || paid === null} onClick={() => paid !== null && renew.mutate({ memberId: member.id, plan_id: target?.id, start_date: start, paid_amount: paid, payment_method: pay.method }, { onSuccess: (r) => { onRenewed?.(r.bill); onClose(); } })}>
          {t("membership.renew")}
        </Button>
      </Stack>
    </Drawer>
  );
}
