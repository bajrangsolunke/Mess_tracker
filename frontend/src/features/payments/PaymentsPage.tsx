import { useState } from "react";
import { Box, Button, ButtonBase, Chip, LinearProgress, Skeleton, Stack, Typography, alpha } from "@mui/material";
import CampaignIcon from "@mui/icons-material/CampaignRounded";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLongRounded";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Bill, BillStatus } from "../../api/types";
import { useBills, useGenerateBills, useSendReminders } from "../../api/useBilling";
import { PageHeader } from "../../components/brand/PageHeader";
import { Avatar } from "../../components/brand/Avatar";
import { StatusChip } from "../../components/brand/StatusChip";
import { EmptyState } from "../../components/brand/EmptyState";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { monthKey } from "../../lib/date";
import { MonthSwitcher } from "../attendance/MyAttendancePage";
import { RecordPaymentSheet } from "./RecordPaymentSheet";

export function PaymentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [month, setMonth] = useState(monthKey());
  const [filter, setFilter] = useState<BillStatus | "">("");
  const { data, isLoading } = useBills(month, filter);
  const generate = useGenerateBills();
  const remind = useSendReminders();
  const [selected, setSelected] = useState<Bill | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const totals = data?.totals;
  const pct = totals && Number(totals.billed) > 0 ? Math.round((Number(totals.collected) / Number(totals.billed)) * 100) : 0;
  const noBills = data && totals?.members === 0;

  return (
    <Stack spacing={2}>
      <PageHeader title={t("nav.payments")} />
      <MonthSwitcher month={month} onChange={(m) => { setMonth(m); setFilter(""); }} />

      {isLoading && !data ? (
        <Skeleton variant="rounded" height={120} sx={{ borderRadius: "16px" }} />
      ) : noBills ? (
        <EmptyState
          pose="thali"
          says={t("chef.noBills")}
          title={t("payments.noBillsTitle")}
          hint={t("payments.noBillsHint")}
          actionLabel={t("payments.generate")}
          onAction={() => generate.mutate(month, { onSuccess: (r) => setToast(t("payments.generated", { count: r.created })) })}
        />
      ) : totals ? (
        <>
          <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <Box>
                <Typography variant="caption">{t("payments.collected")}</Typography>
                <Typography variant="h5" sx={{ color: brand.greenDark }}>{rupees(totals.collected)}</Typography>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption">{t("payments.pending")}</Typography>
                <Typography variant="h5" sx={{ color: Number(totals.pending) > 0 ? brand.goldDark : "text.secondary" }}>{rupees(totals.pending)}</Typography>
              </Box>
            </Box>
            <LinearProgress variant="determinate" value={pct} sx={{ my: 1.25, height: 10, borderRadius: 5, bgcolor: alpha(brand.gold, 0.2), "& .MuiLinearProgress-bar": { bgcolor: brand.green, borderRadius: 5 } }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="caption">{t("payments.progress", { pct, paid: totals.paid, total: totals.members })}</Typography>
              <Typography variant="caption">{t("payments.billed")} {rupees(totals.billed)}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="medium" startIcon={<ReceiptLongIcon />} disabled={generate.isPending} onClick={() => generate.mutate(month, { onSuccess: (r) => setToast(t("payments.generated", { count: r.created })) })} sx={{ flex: 1, minHeight: 44 }}>
              {t("payments.generateMissing")}
            </Button>
            <Button variant="outlined" size="medium" startIcon={<CampaignIcon />} disabled={remind.isPending || Number(totals.pending) === 0} onClick={() => remind.mutate(month, { onSuccess: (r) => setToast(t("payments.remindersSent", { count: r.sent })) })} sx={{ flex: 1, minHeight: 44 }}>
              {t("payments.remind")}
            </Button>
          </Box>
          {toast ? <Typography variant="body2" sx={{ color: brand.greenDark, fontWeight: 600 }}>{toast}</Typography> : null}

          <Box sx={{ display: "flex", gap: 1 }}>
            {([["", t("members.all")], ["unpaid", t("status.pending")], ["partial", t("status.partial")], ["paid", t("status.paid")]] as const).map(([k, label]) => (
              <Chip key={k} label={label} onClick={() => setFilter(k)} sx={{ height: 36, bgcolor: filter === k ? brand.red : brand.paper, color: filter === k ? "#fff" : "text.primary", border: `1px solid ${filter === k ? brand.red : brand.line}`, fontWeight: 600 }} />
            ))}
          </Box>

          <Stack spacing={1.25}>
            {data.items.map((b) => (
              <Box key={b.id} sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, pl: 1.5, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
                <ButtonBase onClick={() => navigate(`/owner/payments/${b.id}?month=${month}`)} sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 1.25, textAlign: "left", py: 0.5, borderRadius: "12px" }}>
                  <Avatar name={b.member.name} size={40} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap>{b.member.name}</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {b.status === "paid" ? rupees(b.amount) : `${t("payments.due")} ${rupees(b.due)} / ${rupees(b.amount)}`}
                    </Typography>
                  </Box>
                  <StatusChip status={b.status === "unpaid" ? "pending" : b.status} />
                </ButtonBase>
                {b.status !== "paid" ? (
                  <Button size="small" variant="contained" sx={{ minHeight: 40, px: 1.5 }} onClick={() => setSelected(b)}>
                    {t("payments.pay")}
                  </Button>
                ) : null}
              </Box>
            ))}
            {data.items.length === 0 ? <Typography sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>{t("payments.noneInFilter")}</Typography> : null}
          </Stack>
        </>
      ) : null}

      <RecordPaymentSheet bill={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}
