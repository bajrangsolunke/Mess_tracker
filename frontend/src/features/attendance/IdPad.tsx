import { useState } from "react";
import { Box, ButtonBase, Drawer, Stack, Typography, alpha } from "@mui/material";
import BackspaceIcon from "@mui/icons-material/BackspaceRounded";
import CheckIcon from "@mui/icons-material/CheckRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { useTranslation } from "react-i18next";
import type { AttendanceRow, AttendanceStatus, MealType } from "../../api/types";
import { useMemberSearch } from "../../api/useAttendance";
import { Avatar } from "../../components/brand/Avatar";
import { brand } from "../../app/theme";
import { SearchResults } from "../search/SearchResults";

const RED = "#DC2626";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const;

/** Door-side marking: type the member ID on big keys, tap ✓. Clears for the next person. */
export function IdPad({
  open,
  onClose,
  rows,
  date,
  meal,
  locked,
  onMark,
}: {
  open: boolean;
  onClose: () => void;
  rows: AttendanceRow[];
  date: string;
  meal: MealType;
  locked: boolean;
  onMark: (memberId: number, status: AttendanceStatus) => void;
}) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState("");
  const listed = rows.filter((r) => digits && String(r.member.member_no).startsWith(digits)).slice(0, 3);
  const exactListed = listed.some((r) => String(r.member.member_no) === digits);
  // members not on this meal's list (e.g. a 1-time member's other meal)
  const others = useMemberSearch(digits.length >= 3 && !exactListed ? digits : "", date);
  const ids = new Set(rows.map((r) => r.member.id));
  const extra = digits.length >= 3 && !exactListed ? (others.data ?? []).filter((r) => !ids.has(r.member.id) && String(r.member.member_no).startsWith(digits)).slice(0, 2) : [];

  const press = (k: (typeof KEYS)[number]) => {
    if (k === "back") setDigits((d) => d.slice(0, -1));
    else if (k === "clear") setDigits("");
    else setDigits((d) => (d.length < 6 ? d + k : d));
  };
  const mark = (id: number, s: AttendanceStatus) => {
    onMark(id, s);
    setDigits("");
  };

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose} slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 2, pb: "calc(env(safe-area-inset-bottom) + 16px)", maxWidth: 600, mx: "auto", maxHeight: "94dvh" } } }}>
      <Stack spacing={1.5}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.line, mx: "auto" }} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>{t("idpad.title", { meal: t(`meal.${meal}`) })}</Typography>
          <ButtonBase onClick={onClose} aria-label={t("common.close", { defaultValue: "close" })} sx={{ width: 40, height: 40, borderRadius: "12px" }}><CloseIcon /></ButtonBase>
        </Box>
        <Box sx={{ textAlign: "center", py: 1, borderRadius: "14px", bgcolor: brand.cream, border: `1.5px solid ${brand.line}` }}>
          <Typography sx={{ fontWeight: 800, fontSize: "2.2rem", letterSpacing: 6, lineHeight: 1.2, color: digits ? brand.red : "text.disabled", fontVariantNumeric: "tabular-nums" }}>
            {digits ? `#${digits}` : t("idpad.placeholder")}
          </Typography>
        </Box>

        <Box sx={{ minHeight: 76 }}>
          {digits && listed.length === 0 && extra.length === 0 && !others.isFetching ? (
            <Typography sx={{ color: "text.secondary", textAlign: "center", py: 2.5 }}>{t("idpad.none")}</Typography>
          ) : null}
          <Stack spacing={1}>
            {listed.map((r) => (
              <Box key={r.member.id} sx={{ display: "flex", alignItems: "center", gap: 1, p: 1, borderRadius: "14px", border: `1px solid ${brand.line}` }}>
                <Avatar name={r.member.name} size={36} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }} noWrap>{r.member.name}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: brand.red }}>#{r.member.member_no}</Typography>
                </Box>
                {r.status ? (
                  <Typography sx={{ fontWeight: 700, color: r.status === "present" ? brand.greenDark : RED }}>{t(`status.${r.status}`)}</Typography>
                ) : (
                  <>
                    <ButtonBase disabled={locked} onClick={() => mark(r.member.id, "present")} aria-label={`${r.member.name}: ${t("status.present")}`} sx={{ height: 52, px: 2, borderRadius: "14px", bgcolor: brand.green, color: "#fff", fontWeight: 800, gap: 0.5 }}>
                      <CheckIcon /> {t("status.present")}
                    </ButtonBase>
                    <ButtonBase disabled={locked} onClick={() => mark(r.member.id, "absent")} aria-label={`${r.member.name}: ${t("status.absent")}`} sx={{ width: 52, height: 52, borderRadius: "14px", bgcolor: alpha(RED, 0.08), color: RED }}>
                      <CloseIcon />
                    </ButtonBase>
                  </>
                )}
              </Box>
            ))}
            {extra.length ? <SearchResults rows={extra} date={date} meals={[meal]} /> : null}
          </Stack>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
          {KEYS.map((k) => (
            <ButtonBase
              key={k}
              onClick={() => press(k)}
              aria-label={k === "back" ? "backspace" : k === "clear" ? t("idpad.clear") : k}
              sx={{
                height: 58,
                borderRadius: "14px",
                fontSize: k.length === 1 ? "1.6rem" : "0.95rem",
                fontWeight: 800,
                bgcolor: k.length === 1 ? brand.paper : alpha(brand.inkSoft, 0.08),
                border: `1px solid ${brand.line}`,
                color: k === "clear" ? brand.red : "text.primary",
                "&:active": { transform: "scale(.96)", bgcolor: alpha(brand.red, 0.08) },
              }}
            >
              {k === "back" ? <BackspaceIcon /> : k === "clear" ? t("idpad.clear") : k}
            </ButtonBase>
          ))}
        </Box>
      </Stack>
    </Drawer>
  );
}
