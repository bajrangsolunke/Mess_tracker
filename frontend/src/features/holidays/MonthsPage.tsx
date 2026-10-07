import { useState } from "react";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/LockRounded";
import LockOpenIcon from "@mui/icons-material/LockOpenRounded";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import { useTranslation } from "react-i18next";
import { useMonths, useSetMonthClosed } from "../../api/useAttendance";
import { PageHeader } from "../../components/brand/PageHeader";
import { brand } from "../../app/theme";
import { formatMonth, monthKey } from "../../lib/date";

export function MonthsPage() {
  const { t, i18n } = useTranslation();
  const [year, setYear] = useState(Number(monthKey().slice(0, 4)));
  const { data } = useMonths(year);
  const set = useSetMonthClosed();
  const current = monthKey();
  return (
    <Stack spacing={2}>
      <PageHeader title={t("months.title")} back="/owner/more" />
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {t("months.hint")}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: brand.paper, border: `1px solid ${brand.line}`, borderRadius: "14px", px: 0.5 }}>
        <IconButton aria-label="previous year" onClick={() => setYear(year - 1)}><ChevronLeftIcon /></IconButton>
        <Typography sx={{ fontWeight: 700 }}>{year}</Typography>
        <IconButton aria-label="next year" onClick={() => setYear(year + 1)}><ChevronRightIcon /></IconButton>
      </Box>
      <Stack spacing={1}>
        {(data ?? []).filter((m) => m.month.slice(0, 7) <= current).reverse().map((m) => {
          const key = m.month.slice(0, 7);
          return (
            <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: "14px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
              {m.closed ? <LockIcon sx={{ color: brand.red }} /> : <LockOpenIcon sx={{ color: brand.green }} />}
              <Typography sx={{ flex: 1, fontWeight: 600 }}>{formatMonth(key, i18n.language)}</Typography>
              <Button size="small" variant={m.closed ? "outlined" : "contained"} sx={{ minHeight: 40 }} disabled={set.isPending} onClick={() => set.mutate({ month: key, closed: !m.closed })}>
                {m.closed ? t("months.reopen") : t("months.close")}
              </Button>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}
