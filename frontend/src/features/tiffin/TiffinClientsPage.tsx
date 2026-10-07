import { useState } from "react";
import { Box, Button, ButtonBase, Skeleton, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useTiffinSummary } from "../../api/useTiffin";
import { PageHeader } from "../../components/brand/PageHeader";
import { StatCard } from "../../components/brand/StatCard";
import { Avatar } from "../../components/brand/Avatar";
import { VegMark } from "../../components/brand/VegMark";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { monthKey } from "../../lib/date";
import { MonthSwitcher } from "../attendance/MyAttendancePage";
import { TiffinClientForm } from "./TiffinClientForm";

export function TiffinClientsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [month, setMonth] = useState(monthKey());
  const { data, isLoading } = useTiffinSummary(month);
  const [adding, setAdding] = useState(false);

  return (
    <Stack spacing={2}>
      <PageHeader title={t("tiffin.companies")} back="/owner/tiffins" action={<Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={() => setAdding(true)} sx={{ minHeight: 44 }}>{t("tiffin.addCompany")}</Button>} />
      <MonthSwitcher month={month} onChange={setMonth} />
      {isLoading && !data ? (
        <Skeleton variant="rounded" height={100} sx={{ borderRadius: "16px" }} />
      ) : data ? (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
            <StatCard label={t("tiffin.tiffins")} value={data.totals.total} tone="red" hint={`${t("tiffin.veg")} ${data.totals.veg} · ${t("tiffin.nonvegEgg")} ${data.totals.nonveg}`} />
            <StatCard label={t("payments.billed")} value={rupees(data.totals.amount)} tone="neutral" />
            <StatCard label={Number(data.totals.due) < 0 ? t("tiffin.advance") : t("payments.due")} value={rupees(Math.abs(Number(data.totals.due)))} tone={Number(data.totals.due) > 0 ? "gold" : "green"} />
          </Box>
          <Stack spacing={1.25}>
            {data.items.map((r) => (
              <ButtonBase key={r.client.id} onClick={() => navigate(`/owner/tiffin-clients/${r.client.id}?month=${month}`)} sx={{ display: "flex", alignItems: "center", gap: 1.25, p: 1.5, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, textAlign: "left", opacity: r.client.is_active ? 1 : 0.6 }}>
                <Avatar name={r.client.name} size={44} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap>{r.client.name}</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{t("tiffin.tiffinCount", { count: r.total })}</Typography>
                    <VegMark kind="veg" size={13} />
                    <Typography variant="caption">{r.veg}</Typography>
                    <VegMark kind="nonveg" size={13} />
                    <Typography variant="caption">{r.nonveg}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: Number(r.due) > 0 ? brand.goldDark : brand.greenDark, fontWeight: 600 }}>
                    {rupees(r.amount)} · {Number(r.due) > 0 ? `${t("payments.due")} ${rupees(r.due)}` : Number(r.due) < 0 ? `${t("tiffin.advance")} ${rupees(Math.abs(Number(r.due)))}` : t("status.paid")}
                  </Typography>
                </Box>
                <ChevronRightIcon sx={{ color: "text.secondary" }} />
              </ButtonBase>
            ))}
            {data.items.length === 0 ? <Typography sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>{t("tiffin.noCompaniesTitle")}</Typography> : null}
          </Stack>
        </>
      ) : null}
      {adding ? <TiffinClientForm open onClose={() => setAdding(false)} onSaved={(c) => navigate(`/owner/tiffin-clients/${c.id}`)} /> : null}
    </Stack>
  );
}
