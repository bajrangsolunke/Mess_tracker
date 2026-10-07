import { useState } from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, IconButton, Stack, TextField, Typography, alpha } from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import ScheduleIcon from "@mui/icons-material/ScheduleRounded";
import { useTranslation } from "react-i18next";
import type { MealType } from "../../api/types";
import { useCancelLeave, useCreateLeave, useMyLeaves } from "../../api/useLeaves";
import { ApiError } from "../../api/client";
import { useSession } from "../auth/authStore";
import { PageHeader } from "../../components/brand/PageHeader";
import { ChefSays } from "../../components/brand/ChefSays";
import { brand } from "../../app/theme";
import { addDays, formatDateLong, todayIst } from "../../lib/date";
import dayjs from "dayjs";

function statusColor(s: string) {
  return s === "approved" ? brand.greenDark : s === "late" ? brand.goldDark : "#DC2626";
}

/** Customer: skip meals in advance. Shows the cutoff rule and upcoming leaves. */
export function LeavePage() {
  const { t, i18n } = useTranslation();
  const { organization, member } = useSession();
  const today = todayIst();
  const [date, setDate] = useState(addDays(today, 1));
  const [meals, setMeals] = useState<MealType[]>(["lunch", "dinner"]);
  const [reason, setReason] = useState("");
  const create = useCreateLeave();
  const cancel = useCancelLeave();
  const { data: leaves } = useMyLeaves(today, addDays(today, 60));

  const cutoff = organization?.leave_cutoff_time?.slice(0, 5) ?? "22:00";
  const allowed: MealType[] = [member?.plan.includes_lunch && "lunch", member?.plan.includes_dinner && "dinner"].filter(Boolean) as MealType[];
  const toggle = (m: MealType) => setMeals((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));
  const chosen = meals.filter((m) => allowed.length === 0 || allowed.includes(m));
  const isLate = !(dayjs(date).isAfter(dayjs(today).add(1, "day"), "day") || (date === addDays(today, 1) && dayjs().tz("Asia/Kolkata").format("HH:mm") < cutoff));

  const err = create.error instanceof ApiError ? create.error : null;
  const errText = err ? (err.code === "LEAVE_IN_PAST" ? t("leave.pastError") : err.code === "MONTH_CLOSED" ? t("attendance.locked") : t("common.error")) : create.error ? t("common.error") : null;

  return (
    <Stack spacing={2.5}>
      <PageHeader title={t("leave.title")} back="/app" />
      <ChefSays pose="waving" size={60}>
        {t("chef.leaveHint", { time: cutoff })}
      </ChefSays>

      <Stack spacing={1.5} sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
        <TextField label={t("leave.date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today } }} />
        <Box sx={{ display: "flex", gap: 1 }}>
          {(["lunch", "dinner"] as MealType[]).map((m) => (
            <FormControlLabel
              key={m}
              control={<Checkbox checked={meals.includes(m)} onChange={() => toggle(m)} disabled={allowed.length > 0 && !allowed.includes(m)} />}
              label={t(`meal.${m}`)}
              sx={{ flex: 1, m: 0, px: 1, borderRadius: "12px", border: `1px solid ${brand.line}`, minHeight: 52 }}
            />
          ))}
        </Box>
        <TextField label={t("leave.reason")} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("leave.reasonPlaceholder")} />
        {isLate ? (
          <Alert severity="warning" icon={<ScheduleIcon />}>
            {t("leave.lateWarning", { time: cutoff })}
          </Alert>
        ) : null}
        {errText ? <Alert severity="error">{errText}</Alert> : null}
        <Button
          variant="contained"
          disabled={create.isPending || chosen.length === 0 || !date}
          onClick={() => create.mutate({ date, meal_types: chosen, reason: reason || undefined }, { onSuccess: () => setReason("") })}
        >
          {t("leave.submit")}
        </Button>
      </Stack>

      <Box>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          {t("leave.upcoming")}
        </Typography>
        <Stack spacing={1.25}>
          {(leaves ?? []).map((lv) => (
            <Box key={lv.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: "14px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1">{formatDateLong(lv.date, i18n.language)} · {t(`meal.${lv.meal_type}`)}</Typography>
                <Typography variant="body2" sx={{ color: statusColor(lv.status), fontWeight: 600, display: "inline-block", px: 1, borderRadius: 999, bgcolor: alpha(statusColor(lv.status), 0.1) }}>
                  {t(`leave.status.${lv.status}`)}
                </Typography>
                {lv.reason ? <Typography variant="caption" sx={{ display: "block" }}>{lv.reason}</Typography> : null}
              </Box>
              {lv.status !== "rejected" ? (
                <IconButton aria-label={t("leave.cancel")} onClick={() => cancel.mutate(lv.id)} disabled={cancel.isPending}>
                  <DeleteIcon />
                </IconButton>
              ) : null}
            </Box>
          ))}
          {leaves && leaves.length === 0 ? <Typography sx={{ color: "text.secondary", textAlign: "center", py: 2 }}>{t("leave.none")}</Typography> : null}
        </Stack>
      </Box>
    </Stack>
  );
}
