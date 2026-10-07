import { Box, ButtonBase, IconButton, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import { useTranslation } from "react-i18next";
import { brand } from "../../app/theme";
import { addDays, formatDayChip, todayIst } from "../../lib/date";

/** Seven-day strip centred on the selected date, with arrows to shift a week. */
export function DateStrip({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const { i18n, t } = useTranslation();
  const today = todayIst();
  const days = Array.from({ length: 7 }, (_, i) => addDays(value, i - 3));
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <IconButton aria-label={t("attendance.prevWeek")} onClick={() => onChange(addDays(value, -7))} size="small">
        <ChevronLeftIcon />
      </IconButton>
      <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
        {days.map((d) => {
          const sel = d === value;
          const isToday = d === today;
          const { weekday, day } = formatDayChip(d, i18n.language);
          return (
            <ButtonBase
              key={d}
              onClick={() => onChange(d)}
              aria-pressed={sel}
              sx={{
                flexDirection: "column",
                py: 0.75,
                borderRadius: "12px",
                bgcolor: sel ? brand.red : "transparent",
                color: sel ? "#fff" : "text.primary",
                border: `1px solid ${sel ? brand.red : isToday ? brand.gold : "transparent"}`,
                minHeight: 56,
              }}
            >
              <Typography variant="caption" sx={{ color: sel ? "#fff" : "text.secondary", lineHeight: 1 }}>
                {weekday}
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.3 }}>{day}</Typography>
            </ButtonBase>
          );
        })}
      </Box>
      <IconButton aria-label={t("attendance.nextWeek")} onClick={() => onChange(addDays(value, 7))} size="small">
        <ChevronRightIcon />
      </IconButton>
    </Box>
  );
}
