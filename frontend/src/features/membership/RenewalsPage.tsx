import { useState } from "react";
import { Box, Button, Skeleton, Stack, Typography, alpha } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Member } from "../../api/types";
import { useRenewalsDue } from "../../api/useMembership";
import { api } from "../../api/client";
import { PageHeader } from "../../components/brand/PageHeader";
import { Avatar } from "../../components/brand/Avatar";
import { ChefSays } from "../../components/brand/ChefSays";
import { brand } from "../../app/theme";
import { formatDateLong } from "../../lib/date";
import { planName } from "../../lib/plans";
import { TiffinsLeft } from "../search/TiffinsLeft";
import { RenewSheet } from "./RenewSheet";
import { daysLeftLabel } from "../../lib/membership";

export function RenewalsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useRenewalsDue();
  const [renewing, setRenewing] = useState<Member | null>(null);

  return (
    <Stack spacing={2}>
      <PageHeader title={t("membership.renewalsTitle")} back="/owner" subtitle={t("membership.renewalsHint")} />
      {isLoading ? <Skeleton variant="rounded" height={160} sx={{ borderRadius: "16px" }} /> : null}
      {data && data.length === 0 ? <ChefSays pose="thumbsUp" size={72}>{t("chef.noRenewals")}</ChefSays> : null}
      <Stack spacing={1.25}>
        {(data ?? []).map((r) => {
          const expired = r.days_left < 0;
          const color = expired ? "#DC2626" : brand.goldDark;
          return (
            <Box key={r.member.id} sx={{ p: 1.5, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${r.renewal_requested_at ? alpha(brand.green, 0.5) : brand.line}` }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }} role="button" tabIndex={0} onClick={() => navigate(`/owner/members/${r.member.id}`)}>
                <Avatar name={r.member.name} size={40} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap>{r.member.name} <Typography component="span" variant="caption">#{r.member.member_no}</Typography></Typography>
                  {r.used_up ? (
                    <Typography variant="body2" sx={{ color: "#DC2626", fontWeight: 700 }}>{t("pack.usedUpRenew", { total: r.credits?.total ?? "" })}</Typography>
                  ) : (
                    <Typography variant="body2" sx={{ color, fontWeight: 600 }}>{daysLeftLabel(r.days_left, t)} · {formatDateLong(r.valid_until, i18n.language)}</Typography>
                  )}
                  {r.credits && !r.used_up ? <TiffinsLeft left={r.credits.left} total={r.credits.total} /> : null}
                  {r.renewal_plan ? (
                    <Typography variant="caption" sx={{ color: brand.greenDark, fontWeight: 600 }}>{t("membership.requested", { plan: planName(r.renewal_plan, t) })}</Typography>
                  ) : null}
                </Box>
                <Button variant="contained" size="small" sx={{ minHeight: 40 }} onClick={async (e) => { e.stopPropagation(); setRenewing(await api<Member>(`/members/${r.member.id}`)); }}>
                  {t("membership.renew")}
                </Button>
              </Box>
            </Box>
          );
        })}
      </Stack>
      {renewing ? <RenewSheet member={renewing} onClose={() => setRenewing(null)} onRenewed={(bill) => navigate(`/owner/payments/${bill.id}?month=${bill.month.slice(0, 7)}`)} /> : null}
    </Stack>
  );
}
