import { useMemo, useState } from "react";
import { Box, Button, Chip, IconButton, Stack, TextField, Typography, alpha } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopyRounded";
import WbSunnyIcon from "@mui/icons-material/WbSunnyRounded";
import NightsStayIcon from "@mui/icons-material/NightsStayRounded";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import type { MealType, MenuEntry } from "../../api/types";
import { useCopyMenu, useMenus, usePutMenu } from "../../api/useMenus";
import { useSession } from "../auth/authStore";
import { PageHeader } from "../../components/brand/PageHeader";
import { MealCard } from "../../components/brand/MealCard";
import { DateStrip } from "../attendance/DateStrip";
import { brand } from "../../app/theme";
import { addDays, formatDateLong, todayIst } from "../../lib/date";

const SUGGESTIONS = ["चपाती", "भात", "डाळ", "भाजी", "पोळी", "आमटी", "कोशिंबीर", "पापड", "लोणचं", "ताक", "पनीर", "गुलाबजाम"];

function MealEditor({ meal, entry, date }: { meal: MealType; entry: MenuEntry | undefined; date: string }) {
  const { t } = useTranslation();
  const put = usePutMenu();
  const [items, setItems] = useState<string[]>(entry?.items ?? []);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const accent = meal === "lunch" ? brand.gold : brand.red;
  const add = (v: string) => {
    const x = v.trim();
    if (!x || items.includes(x)) return;
    setItems([...items, x]);
    setDirty(true);
    setDraft("");
  };
  return (
    <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, color: accent }}>
        {meal === "lunch" ? <WbSunnyIcon /> : <NightsStayIcon />}
        <Typography variant="h6" sx={{ color: "text.primary" }}>{t(`meal.${meal}`)}</Typography>
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5, minHeight: 36 }}>
        {items.map((x) => (
          <Chip key={x} label={x} onDelete={() => { setItems(items.filter((i) => i !== x)); setDirty(true); }} deleteIcon={<CloseIcon />} sx={{ height: 36, fontSize: "0.95rem", bgcolor: alpha(accent, 0.1), color: "text.primary" }} />
        ))}
        {items.length === 0 ? <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>{t("menu.addDishes")}</Typography> : null}
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField size="small" placeholder={t("menu.dishPlaceholder")} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }} slotProps={{ input: { sx: { minHeight: 48 } } }} />
        <IconButton aria-label={t("menu.addDish")} onClick={() => add(draft)} sx={{ bgcolor: alpha(accent, 0.12), color: accent, borderRadius: "12px", width: 48, height: 48 }}>
          <AddIcon />
        </IconButton>
      </Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.25 }}>
        {SUGGESTIONS.filter((s) => !items.includes(s)).slice(0, 8).map((s) => (
          <Chip key={s} label={s} size="small" variant="outlined" onClick={() => add(s)} sx={{ height: 30 }} />
        ))}
      </Box>
      <Button variant="contained" fullWidth disabled={!dirty || put.isPending} sx={{ mt: 1.5 }} onClick={() => put.mutate({ date, meal_type: meal, items }, { onSuccess: () => setDirty(false) })}>
        {put.isPending ? t("common.loading") : t("menu.save")}
      </Button>
    </Box>
  );
}

/** Owner: edit; customer: read-only view with week navigation. */
export function MenuPage() {
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const owner = user?.role === "owner";
  const [params, setParams] = useSearchParams();
  const date = params.get("date") ?? todayIst();
  const setDate = (d: string) => setParams({ date: d }, { replace: true });
  const { data } = useMenus(addDays(date, -3), addDays(date, 3));
  const copy = useCopyMenu();
  const byMeal = useMemo(() => Object.fromEntries((data ?? []).filter((m) => m.date === date).map((m) => [m.meal_type, m])) as Partial<Record<MealType, MenuEntry>>, [data, date]);
  const yesterdayHas = (data ?? []).some((m) => m.date === addDays(date, -1));

  return (
    <Stack spacing={2}>
      <PageHeader title={t("nav.menu")} subtitle={formatDateLong(date, i18n.language)} back={owner ? "/owner/more" : undefined} />
      <DateStrip value={date} onChange={setDate} />
      {owner ? (
        <>
          {yesterdayHas && !byMeal.lunch && !byMeal.dinner ? (
            <Button variant="outlined" startIcon={<ContentCopyIcon />} disabled={copy.isPending} onClick={() => copy.mutate({ from: addDays(date, -1), to: date })}>
              {t("menu.copyYesterday")}
            </Button>
          ) : null}
          <MealEditor key={`lunch-${date}-${byMeal.lunch?.items.join("|") ?? ""}`} meal="lunch" entry={byMeal.lunch} date={date} />
          <MealEditor key={`dinner-${date}-${byMeal.dinner?.items.join("|") ?? ""}`} meal="dinner" entry={byMeal.dinner} date={date} />
        </>
      ) : (
        <Stack spacing={1.5}>
          <MealCard meal="lunch" items={byMeal.lunch?.items ?? []} />
          <MealCard meal="dinner" items={byMeal.dinner?.items ?? []} />
        </Stack>
      )}
    </Stack>
  );
}
