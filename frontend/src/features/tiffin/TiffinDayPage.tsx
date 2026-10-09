import { useMemo, useState } from "react";
import { Alert, Box, Button, ButtonBase, Skeleton, Stack, Typography, alpha } from "@mui/material";
import BusinessIcon from "@mui/icons-material/BusinessRounded";
import LockIcon from "@mui/icons-material/LockRounded";
import ReplayIcon from "@mui/icons-material/ReplayRounded";
import WbSunnyIcon from "@mui/icons-material/WbSunnyRounded";
import NightsStayIcon from "@mui/icons-material/NightsStayRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { MealType, TiffinDay, TiffinDayRow } from "../../api/types";
import { useSaveTiffinDay, useTiffinDay } from "../../api/useTiffin";
import { useSession } from "../auth/authStore";
import { PageHeader } from "../../components/brand/PageHeader";
import { EmptyState } from "../../components/brand/EmptyState";
import { CountStepper } from "../../components/brand/CountStepper";
import { NONVEG_COLOR, VEG_COLOR, VegMark } from "../../components/brand/VegMark";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { formatDateLong, formatDayChip, todayIst } from "../../lib/date";
import { DateStrip } from "../attendance/DateStrip";
import { TiffinClientForm } from "./TiffinClientForm";

type Key = `${number}-${MealType}`;
type Draft = Record<Key, { veg: number; nonveg: number }>;

const keyOf = (r: Pick<TiffinDayRow, "client_id" | "meal_type">): Key => `${r.client_id}-${r.meal_type}`;
const fromDay = (day: TiffinDay): Draft => Object.fromEntries(day.rows.map((r) => [keyOf(r), { veg: r.veg, nonveg: r.nonveg }]));

function CompanyCard({ row, value, onChange, locked, showMoney }: { row: TiffinDayRow; value: { veg: number; nonveg: number }; onChange: (v: { veg: number; nonveg: number }) => void; locked: boolean; showMoney: boolean }) {
  const { t, i18n } = useTranslation();
  const total = value.veg + value.nonveg;
  const amount = Number(row.veg_price ?? 0) * value.veg + Number(row.nonveg_price ?? 0) * value.nonveg;
  const hasLast = row.last_date && row.last_veg + row.last_nonveg > 0;
  const sameAsLast = hasLast && value.veg === row.last_veg && value.nonveg === row.last_nonveg;
  const last = row.last_date ? formatDayChip(row.last_date, i18n.language) : null;
  return (
    <Box sx={{ p: 1.75, borderRadius: "16px", bgcolor: brand.paper, border: `1.5px solid ${total > 0 ? alpha(brand.red, 0.3) : brand.line}` }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {row.client_name}
            {row.saved && total > 0 ? <CheckCircleIcon sx={{ fontSize: 18, color: brand.green }} /> : null}
          </Typography>
          {showMoney && total > 0 ? <Typography variant="caption">{rupees(amount)}</Typography> : null}
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: "1.5rem", color: total ? brand.red : "text.disabled", fontVariantNumeric: "tabular-nums" }}>{total}</Typography>
      </Box>
      <Stack spacing={1}>
        {([["veg", VEG_COLOR, row.veg_price], ["nonveg", NONVEG_COLOR, row.nonveg_price]] as const).map(([k, color, price]) => (
          <Box key={k} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <VegMark kind={k} size={18} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>{t(k === "veg" ? "tiffin.veg" : "tiffin.nonveg")}</Typography>
                {showMoney && price ? <Typography variant="caption">{rupees(price)}</Typography> : null}
              </Box>
            </Box>
            <CountStepper value={value[k]} color={color} label={`${row.client_name} ${t(k === "veg" ? "tiffin.veg" : "tiffin.nonveg")}`} disabled={locked} onChange={(n) => onChange({ ...value, [k]: n })} />
          </Box>
        ))}
      </Stack>
      {hasLast && !sameAsLast && !locked ? (
        <ButtonBase onClick={() => onChange({ veg: row.last_veg, nonveg: row.last_nonveg })} sx={{ mt: 1.25, px: 1.25, py: 0.75, borderRadius: "999px", bgcolor: alpha(brand.gold, 0.14), color: brand.goldDark, fontWeight: 700, fontSize: "0.85rem", gap: 0.5 }}>
          <ReplayIcon sx={{ fontSize: 16 }} />
          {t("tiffin.sameAsLast", { day: last ? `${last.weekday} ${last.day}` : "", veg: row.last_veg, nonveg: row.last_nonveg })}
        </ButtonBase>
      ) : null}
    </Box>
  );
}

function Editor({ day, showMoney }: { day: TiffinDay; showMoney: boolean }) {
  const { t } = useTranslation();
  const save = useSaveTiffinDay(day.date);
  const [draft, setDraft] = useState<Draft>(() => fromDay(day));
  const initial = useMemo(() => fromDay(day), [day]);
  const changed = day.rows.filter((r) => {
    const a = draft[keyOf(r)];
    const b = initial[keyOf(r)];
    return a.veg !== b.veg || a.nonveg !== b.nonveg;
  });
  const totals = day.rows.reduce(
    (acc, r) => {
      const v = draft[keyOf(r)];
      acc.veg += v.veg;
      acc.nonveg += v.nonveg;
      acc.amount += Number(r.veg_price ?? 0) * v.veg + Number(r.nonveg_price ?? 0) * v.nonveg;
      return acc;
    },
    { veg: 0, nonveg: 0, amount: 0 },
  );
  const meals = (["lunch", "dinner"] as const).filter((m) => day.rows.some((r) => r.meal_type === m));

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 1, p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, alignItems: "end" }}>
        <Box>
          <Typography variant="caption">{t("tiffin.totalTiffins")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "2rem", lineHeight: 1.1, color: brand.red, fontVariantNumeric: "tabular-nums" }}>{totals.veg + totals.nonveg}</Typography>
          {showMoney ? <Typography variant="caption">{rupees(totals.amount)}</Typography> : null}
        </Box>
        <Box sx={{ textAlign: "center", p: 1, borderRadius: "12px", bgcolor: alpha(VEG_COLOR, 0.08) }}>
          <VegMark kind="veg" />
          <Typography sx={{ fontWeight: 800, fontSize: "1.3rem", color: VEG_COLOR }}>{totals.veg}</Typography>
          <Typography variant="caption">{t("tiffin.veg")}</Typography>
        </Box>
        <Box sx={{ textAlign: "center", p: 1, borderRadius: "12px", bgcolor: alpha(NONVEG_COLOR, 0.08) }}>
          <VegMark kind="nonveg" />
          <Typography sx={{ fontWeight: 800, fontSize: "1.3rem", color: NONVEG_COLOR }}>{totals.nonveg}</Typography>
          <Typography variant="caption">{t("tiffin.nonveg")}</Typography>
        </Box>
      </Box>

      {day.locked ? <Alert severity="warning" icon={<LockIcon />}>{t("attendance.locked")}</Alert> : null}

      {meals.map((m) => (
        <Box key={m}>
          <Typography variant="h6" component="h2" sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
            {m === "lunch" ? <WbSunnyIcon sx={{ color: brand.gold }} /> : <NightsStayIcon sx={{ color: brand.redDeep }} />}
            {t(`meal.${m}`)}
          </Typography>
          <Stack spacing={1.25}>
            {day.rows.filter((r) => r.meal_type === m).map((r) => (
              <CompanyCard key={keyOf(r)} row={r} value={draft[keyOf(r)]} locked={day.locked} showMoney={showMoney} onChange={(v) => setDraft((cur) => ({ ...cur, [keyOf(r)]: v }))} />
            ))}
          </Stack>
        </Box>
      ))}

      {save.error ? <Alert severity="error">{t("common.error")}</Alert> : null}
      {changed.length > 0 && !day.locked ? (
        <Box sx={{ position: "sticky", bottom: 88, zIndex: 2, pt: 1 }}>
          <Button
            variant="contained"
            fullWidth
            disabled={save.isPending}
            onClick={() => save.mutate(changed.map((r) => ({ client_id: r.client_id, meal_type: r.meal_type, ...draft[keyOf(r)] })))}
            sx={{ boxShadow: "0 12px 24px -10px rgba(0,0,0,.4)" }}
          >
            {save.isPending ? t("common.loading") : t("tiffin.saveCounts", { count: totals.veg + totals.nonveg })}
          </Button>
        </Box>
      ) : null}
    </Stack>
  );
}

/** Daily company tiffins: just veg and non-veg counts per company and meal. */
export function TiffinDayPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const isOwner = user?.role === "owner";
  const [params, setParams] = useSearchParams();
  const date = isOwner ? params.get("date") ?? todayIst() : todayIst();
  const { data, isLoading } = useTiffinDay(date);
  const [adding, setAdding] = useState(false);

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t("tiffin.title")}
        subtitle={formatDateLong(date, i18n.language)}
        action={isOwner ? <Button variant="outlined" size="medium" startIcon={<BusinessIcon />} onClick={() => navigate("/owner/tiffin-clients")} sx={{ minHeight: 44 }}>{t("tiffin.companies")}</Button> : undefined}
      />
      {isOwner ? <DateStrip value={date} onChange={(d) => setParams({ date: d }, { replace: true })} /> : null}

      {isLoading && !data ? (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={100} sx={{ borderRadius: "16px" }} />
          <Skeleton variant="rounded" height={180} sx={{ borderRadius: "16px" }} />
        </Stack>
      ) : data && data.rows.length === 0 ? (
        <EmptyState pose="thali" says={t("chef.noCompanies")} title={t("tiffin.noCompaniesTitle")} hint={t("tiffin.noCompaniesHint")} actionLabel={isOwner ? t("tiffin.addCompany") : undefined} onAction={isOwner ? () => setAdding(true) : undefined} />
      ) : data ? (
        <Editor key={`${data.date}-${JSON.stringify(data.rows.map((r) => [r.client_id, r.meal_type, r.veg, r.nonveg]))}`} day={data} showMoney={isOwner} />
      ) : null}

      {adding ? <TiffinClientForm open onClose={() => setAdding(false)} /> : null}
    </Stack>
  );
}
