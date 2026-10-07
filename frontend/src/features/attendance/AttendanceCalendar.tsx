import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { HistoryOut } from "../../api/types";
import { brand } from "../../app/theme";
import { monthGrid, todayIst } from "../../lib/date";

type Cell = { lunch?: "present" | "absent" | "leave"; dinner?: "present" | "absent" | "leave" };

function dotColor(v?: string) {
  if (v === "present") return brand.green;
  if (v === "absent") return "#DC2626";
  if (v === "leave") return brand.gold;
  return brand.line;
}

/** Month grid: each day shows two dots (lunch, dinner). */
export function AttendanceCalendar({ month, data, selected, onSelect }: { month: string; data: HistoryOut | undefined; selected: string | null; onSelect: (iso: string) => void }) {
  const { t, i18n } = useTranslation();
  const cells = monthGrid(month);
  const byDay = new Map<string, Cell>();
  for (const it of data?.items ?? []) byDay.set(it.date, { ...(byDay.get(it.date) ?? {}), [it.meal_type]: it.status });
  for (const lv of data?.leaves ?? []) {
    const c = byDay.get(lv.date) ?? {};
    if (!c[lv.meal_type]) byDay.set(lv.date, { ...c, [lv.meal_type]: "leave" });
  }
  const today = todayIst();
  const locale = i18n.language === "mr" || i18n.language === "hi" ? i18n.language : "en";
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2024, 0, 1 + i)));

  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5, mb: 0.5 }}>
        {weekdays.map((w, i) => (
          <Typography key={i} variant="caption" sx={{ textAlign: "center", fontWeight: 600 }}>
            {w}
          </Typography>
        ))}
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
        {cells.map((iso, i) =>
          iso === null ? (
            <Box key={`b${i}`} />
          ) : (
            <Box
              key={iso}
              component="button"
              onClick={() => onSelect(iso)}
              aria-label={iso}
              aria-pressed={selected === iso}
              sx={{
                all: "unset",
                cursor: "pointer",
                textAlign: "center",
                py: 0.75,
                borderRadius: "10px",
                bgcolor: selected === iso ? `${brand.red}14` : "transparent",
                border: `1px solid ${selected === iso ? brand.red : iso === today ? brand.gold : "transparent"}`,
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.2 }}>{Number(iso.slice(-2))}</Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, mt: 0.25 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: dotColor(byDay.get(iso)?.lunch) }} />
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: dotColor(byDay.get(iso)?.dinner) }} />
              </Box>
            </Box>
          ),
        )}
      </Box>
      <Box sx={{ display: "flex", gap: 2, mt: 1.5, flexWrap: "wrap" }}>
        {[
          ["present", brand.green],
          ["absent", "#DC2626"],
          ["leave", brand.gold],
        ].map(([k, c]) => (
          <Box key={k} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: c }} />
            <Typography variant="caption">{t(`attendance.legend.${k}`)}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
