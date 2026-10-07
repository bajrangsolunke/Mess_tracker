import { Box, Divider, Skeleton, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useMyBills } from "../../api/useBilling";
import { PageHeader } from "../../components/brand/PageHeader";
import { StatusChip } from "../../components/brand/StatusChip";
import { ChefSays } from "../../components/brand/ChefSays";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { formatDateLong, formatMonth } from "../../lib/date";

export function MyBillsPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useMyBills();
  const current = data?.[0];
  return (
    <Stack spacing={2.5}>
      <PageHeader title={t("nav.payments")} />
      {isLoading ? <Skeleton variant="rounded" height={140} sx={{ borderRadius: "16px" }} /> : null}
      {current ? (
        <Box sx={{ p: 2.5, borderRadius: "20px", bgcolor: current.status === "paid" ? `${brand.green}14` : `${brand.gold}1A`, border: `1px solid ${current.status === "paid" ? brand.green : brand.gold}55` }}>
          <Typography variant="caption">{formatMonth(current.month.slice(0, 7), i18n.language)}</Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h4" sx={{ color: current.status === "paid" ? brand.greenDark : brand.goldDark }}>{current.status === "paid" ? rupees(current.amount) : rupees(current.due)}</Typography>
            <StatusChip status={current.status === "unpaid" ? "pending" : current.status} size="medium" />
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {current.status === "paid" ? t("payments.thanks") : t("payments.customerDue", { paid: rupees(current.paid), total: rupees(current.amount) })}
          </Typography>
        </Box>
      ) : data ? (
        <ChefSays pose="thali" size={72}>{t("chef.noBillYet")}</ChefSays>
      ) : null}
      {data && data.length > 0 ? (
        <Box>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>{t("payments.history")}</Typography>
          <Box sx={{ borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, px: 2 }}>
            {data.map((b, i) => (
              <Box key={b.id}>
                {i > 0 ? <Divider /> : null}
                <Box sx={{ py: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography sx={{ fontWeight: 700 }}>{formatMonth(b.month.slice(0, 7), i18n.language)}</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{rupees(b.amount)}</Typography>
                  </Box>
                  {b.payments.map((p) => (
                    <Typography key={p.id} variant="caption" sx={{ display: "block" }}>
                      {formatDateLong(p.paid_on, i18n.language)} · {rupees(p.amount)} · {t(`payments.method.${p.method}`)}
                    </Typography>
                  ))}
                  {b.status !== "paid" ? <Typography variant="caption" sx={{ color: brand.goldDark, fontWeight: 600 }}>{t("payments.due")} {rupees(b.due)}</Typography> : null}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}
    </Stack>
  );
}
