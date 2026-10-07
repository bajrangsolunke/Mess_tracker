import { useMemo, useState } from "react";
import { Box, Button, Chip, Stack, Typography, alpha } from "@mui/material";
import CheckIcon from "@mui/icons-material/CheckRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { useTranslation } from "react-i18next";
import type { LeaveStatus } from "../../api/types";
import { useDecideLeave, useLeaves } from "../../api/useLeaves";
import { PageHeader } from "../../components/brand/PageHeader";
import { Avatar } from "../../components/brand/Avatar";
import { brand } from "../../app/theme";
import { addDays, formatDateLong, todayIst } from "../../lib/date";

const COLORS: Record<LeaveStatus, string> = { approved: brand.greenDark, late: brand.goldDark, rejected: "#DC2626" };

export function OwnerLeavesPage() {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<"" | "late">("");
  const today = todayIst();
  const { data } = useLeaves(addDays(today, -7), addDays(today, 30), filter);
  const decide = useDecideLeave();

  const groups = useMemo(() => {
    const map = new Map<string, typeof data>();
    for (const lv of data ?? []) map.set(lv.date, [...(map.get(lv.date) ?? []), lv]);
    return [...map.entries()];
  }, [data]);

  return (
    <Stack spacing={2}>
      <PageHeader title={t("leave.ownerTitle")} back="/owner/more" subtitle={t("leave.ownerHint")} />
      <Box sx={{ display: "flex", gap: 1 }}>
        {([["", t("members.all")], ["late", t("leave.needsDecision")]] as const).map(([k, label]) => (
          <Chip key={k} label={label} onClick={() => setFilter(k)} sx={{ height: 36, bgcolor: filter === k ? brand.red : brand.paper, color: filter === k ? "#fff" : "text.primary", border: `1px solid ${filter === k ? brand.red : brand.line}` }} />
        ))}
      </Box>
      {groups.map(([date, items]) => (
        <Box key={date}>
          <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 1 }}>
            {formatDateLong(date, i18n.language)}
          </Typography>
          <Stack spacing={1.25}>
            {(items ?? []).map((lv) => (
              <Box key={lv.id} sx={{ display: "flex", alignItems: "center", gap: 1.25, p: 1.5, borderRadius: "14px", bgcolor: brand.paper, border: `1px solid ${lv.status === "late" ? alpha(brand.gold, 0.6) : brand.line}` }}>
                <Avatar name={lv.member.name} size={40} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap>{lv.member.name}</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {t(`meal.${lv.meal_type}`)}{lv.reason ? ` · ${lv.reason}` : ""}
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS[lv.status], fontWeight: 600 }}>{t(`leave.status.${lv.status}`)}</Typography>
                </Box>
                {lv.status === "late" ? (
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    <Button variant="contained" size="small" disabled={decide.isPending} onClick={() => decide.mutate({ id: lv.id, approve: true })} sx={{ minWidth: 44, px: 1, minHeight: 44, backgroundImage: "none", bgcolor: brand.green, "&:hover": { bgcolor: brand.greenDark } }} aria-label={t("leave.approve")}>
                      <CheckIcon />
                    </Button>
                    <Button variant="outlined" color="error" size="small" disabled={decide.isPending} onClick={() => decide.mutate({ id: lv.id, approve: false })} sx={{ minWidth: 44, px: 1, minHeight: 44 }} aria-label={t("leave.reject")}>
                      <CloseIcon />
                    </Button>
                  </Box>
                ) : null}
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
      {data && data.length === 0 ? <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>{t("leave.ownerEmpty")}</Typography> : null}
    </Stack>
  );
}
