import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { AttendanceStatus, MealType } from "../../api/types";
import { formatDateLong } from "../../lib/date";

export interface Correction {
  memberId: number;
  name: string;
  date: string;
  meal: MealType;
  from: AttendanceStatus;
}

/** Marks are final; only the owner corrects one, and only after confirming. */
export function CorrectMarkDialog({ value, busy, onCancel, onConfirm }: { value: Correction; busy?: boolean; onCancel: () => void; onConfirm: (to: AttendanceStatus) => void }) {
  const { t, i18n } = useTranslation();
  const to: AttendanceStatus = value.from === "present" ? "absent" : "present";
  return (
    <Dialog open onClose={onCancel} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "20px", m: 2 } } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("attendance.correctTitle")}</DialogTitle>
      <DialogContent>
        <Typography>
          {t("attendance.correctBody", {
            name: value.name,
            meal: t(`meal.${value.meal}`),
            date: formatDateLong(value.date, i18n.language),
            from: t(`status.${value.from}`),
            to: t(`status.${to}`),
          })}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button variant="outlined" onClick={onCancel} sx={{ flex: 1 }}>{t("common.cancel")}</Button>
        <Button variant="contained" color={to === "present" ? "success" : "error"} disabled={busy} onClick={() => onConfirm(to)} sx={{ flex: 1, backgroundImage: "none" }}>
          {t("attendance.changeTo", { status: t(`status.${to}`) })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
