import { useState } from "react";
import { Box, Button, Stack, Typography, alpha } from "@mui/material";
import AutorenewIcon from "@mui/icons-material/AutorenewRounded";
import { useTranslation } from "react-i18next";
import type { MembershipInfo, Plan } from "../../api/types";
import { useMyPlans, useRequestRenewal } from "../../api/useMembership";
import { brand } from "../../app/theme";
import { formatDateLong } from "../../lib/date";
import { planName } from "../../lib/plans";
import { MealChoice } from "./MealChoice";
import { mealChoiceFromPlan, planForChoice, type Choice } from "../../lib/membership";

/** Validity + renewal request for the member's own home screen. */
export function MyMembershipCard({ info, currentPlan }: { info: MembershipInfo; currentPlan: Plan }) {
  const { t, i18n } = useTranslation();
  const plans = useMyPlans();
  const request = useRequestRenewal();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(() => mealChoiceFromPlan(currentPlan));
  if (!info.valid_until) return null;
  const days = info.days_left ?? 0;
  const dueSoon = info.expired || days <= 5;
  const standard = (plans.data ?? []).filter((p) => p.kind);
  const target = choice ? planForChoice(standard, choice) : undefined;
  const tone = info.expired ? "#DC2626" : dueSoon ? brand.gold : brand.green;

  return (
    <Box sx={{ p: 2, borderRadius: "16px", bgcolor: alpha(tone, 0.08), border: `1px solid ${alpha(tone, 0.4)}` }}>
      <Typography variant="caption">{info.expired ? t("membership.endedOn") : t("membership.validUntilLabel")}</Typography>
      <Typography sx={{ fontWeight: 800, fontSize: "1.2rem" }}>{formatDateLong(info.valid_until, i18n.language)}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color: info.expired ? "#B91C1C" : dueSoon ? brand.goldDark : brand.greenDark }}>
        {info.expired ? t("membership.expiredRenew") : t("membership.daysLeft", { count: days })}
      </Typography>

      {info.renewal_plan ? (
        <Box sx={{ mt: 1.5, p: 1.25, borderRadius: "12px", bgcolor: brand.paper }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: brand.greenDark }}>{t("membership.requestSent", { plan: planName(info.renewal_plan, t) })}</Typography>
          <Typography variant="caption">{t("membership.payAtCounter")}</Typography>
          <Button size="small" onClick={() => request.mutate(null)} disabled={request.isPending} sx={{ minHeight: 32, display: "block", mt: 0.5 }}>{t("membership.cancelRequest")}</Button>
        </Box>
      ) : dueSoon ? (
        open ? (
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {standard.length ? <MealChoice plans={standard} value={choice} onChange={setChoice} /> : null}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button variant="outlined" onClick={() => setOpen(false)} sx={{ flex: 1 }}>{t("common.cancel")}</Button>
              <Button variant="contained" disabled={!target || request.isPending} onClick={() => target && request.mutate(target.id, { onSuccess: () => setOpen(false) })} sx={{ flex: 1 }}>{t("membership.sendRequest")}</Button>
            </Box>
          </Stack>
        ) : (
          <Button variant="contained" startIcon={<AutorenewIcon />} fullWidth sx={{ mt: 1.5 }} onClick={() => setOpen(true)}>{t("membership.renewMine")}</Button>
        )
      ) : null}
    </Box>
  );
}
