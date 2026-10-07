import { useState } from "react";
import { Box, Button, IconButton, MenuItem, Stack, TextField, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddIcon from "@mui/icons-material/AddRounded";
import { useTranslation } from "react-i18next";
import type { HolidayMeal } from "../../api/types";
import { useCreateHoliday, useDeleteHoliday, useHolidays } from "../../api/useAttendance";
import { PageHeader } from "../../components/brand/PageHeader";
import { brand } from "../../app/theme";
import { formatDateLong, monthKey, todayIst } from "../../lib/date";
import { MonthSwitcher } from "../attendance/MyAttendancePage";
import dayjs from "dayjs";

export function HolidaysPage() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(monthKey());
  const from = `${month}-01`;
  const to = dayjs(from).endOf("month").format("YYYY-MM-DD");
  const { data } = useHolidays(from, to);
  const create = useCreateHoliday();
  const del = useDeleteHoliday();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ date: string; meal_type: HolidayMeal; reason: string }>({ date: todayIst(), meal_type: "all", reason: "" });

  return (
    <Stack spacing={2}>
      <PageHeader title={t("holidays.title")} back="/owner/more" action={!adding ? <Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={() => setAdding(true)} sx={{ minHeight: 44 }}>{t("holidays.add")}</Button> : null} />
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {t("holidays.hint")}
      </Typography>
      {adding ? (
        <Stack spacing={1.5} sx={{ p: 2, borderRadius: "16px", bgcolor: brand.cream, border: `1px solid ${brand.line}` }}>
          <TextField label={t("holidays.date")} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField select label={t("holidays.meal")} value={form.meal_type} onChange={(e) => setForm({ ...form, meal_type: e.target.value as HolidayMeal })}>
            <MenuItem value="all">{t("holidays.wholeDay")}</MenuItem>
            <MenuItem value="lunch">{t("meal.lunch")}</MenuItem>
            <MenuItem value="dinner">{t("meal.dinner")}</MenuItem>
          </TextField>
          <TextField label={t("holidays.reason")} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button variant="outlined" onClick={() => setAdding(false)} sx={{ flex: 1 }}>{t("common.cancel")}</Button>
            <Button variant="contained" disabled={create.isPending || !form.date} sx={{ flex: 1 }} onClick={() => create.mutate({ date: form.date, meal_type: form.meal_type, reason: form.reason || undefined }, { onSuccess: () => { setAdding(false); setMonth(monthKey(form.date)); } })}>
              {t("common.save")}
            </Button>
          </Box>
        </Stack>
      ) : null}
      <MonthSwitcher month={month} onChange={setMonth} />
      <Stack spacing={1.25}>
        {(data ?? []).map((h) => (
          <Box key={h.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1">{formatDateLong(h.date, i18n.language)}</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {h.meal_type === "all" ? t("holidays.wholeDay") : t(`meal.${h.meal_type}`)}{h.reason ? ` · ${h.reason}` : ""}
              </Typography>
            </Box>
            <IconButton aria-label={t("common.delete")} onClick={() => del.mutate(h.id)} disabled={del.isPending}>
              <DeleteIcon />
            </IconButton>
          </Box>
        ))}
        {data && data.length === 0 ? <Typography sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>{t("holidays.empty")}</Typography> : null}
      </Stack>
    </Stack>
  );
}
