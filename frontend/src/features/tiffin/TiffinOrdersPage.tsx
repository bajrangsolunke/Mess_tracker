import { useMemo, useState } from "react";
import { Alert, Box, Button, Skeleton, Stack, Tab, Tabs, TextField, Typography, alpha } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopyRounded";
import BusinessIcon from "@mui/icons-material/BusinessRounded";
import LockIcon from "@mui/icons-material/LockRounded";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { MealType, TiffinSheet } from "../../api/types";
import { useCopyTiffinOrders, useSaveTiffinOrders, useTiffinSheet } from "../../api/useTiffin";
import { PageHeader } from "../../components/brand/PageHeader";
import { EmptyState } from "../../components/brand/EmptyState";
import { CountStepper } from "../../components/brand/CountStepper";
import { NONVEG_COLOR, VEG_COLOR, VegMark } from "../../components/brand/VegMark";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { addDays, formatDateLong, todayIst } from "../../lib/date";
import { DateStrip } from "../attendance/DateStrip";
import { TiffinClientForm } from "./TiffinClientForm";

type Draft = Record<number, { veg: number; nonveg: number; note: string }>;

function fromSheet(sheet: TiffinSheet): Draft {
  return Object.fromEntries(sheet.items.map((r) => [r.client.id, { veg: r.veg_count, nonveg: r.nonveg_count, note: r.note ?? "" }]));
}

function Editor({ sheet, date, meal }: { sheet: TiffinSheet; date: string; meal: MealType }) {
  const { t } = useTranslation();
  const save = useSaveTiffinOrders(date, meal);
  const [draft, setDraft] = useState<Draft>(() => fromSheet(sheet));
  const initial = useMemo(() => fromSheet(sheet), [sheet]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const locked = sheet.locked;

  const totals = useMemo(() => {
    let veg = 0;
    let nonveg = 0;
    let amount = 0;
    for (const r of sheet.items) {
      const d = draft[r.client.id];
      if (!d) continue;
      veg += d.veg;
      nonveg += d.nonveg;
      amount += d.veg * Number(r.client.veg_rate) + d.nonveg * Number(r.client.nonveg_rate);
    }
    return { veg, nonveg, total: veg + nonveg, amount };
  }, [draft, sheet.items]);

  const update = (id: number, patch: Partial<Draft[number]>) => setDraft((cur) => ({ ...cur, [id]: { ...cur[id], ...patch } }));

  return (
    <Stack spacing={2}>
      <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 1, alignItems: "end" }}>
        <Box>
          <Typography variant="caption">{t("tiffin.totalTiffins")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "2rem", lineHeight: 1.1, color: brand.red, fontVariantNumeric: "tabular-nums" }}>{totals.total}</Typography>
          <Typography variant="caption">{rupees(totals.amount)}</Typography>
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

      {locked ? <Alert severity="warning" icon={<LockIcon />}>{t("attendance.locked")}</Alert> : null}

      <Stack spacing={1.5}>
        {sheet.items.map((r) => {
          const d = draft[r.client.id] ?? { veg: 0, nonveg: 0, note: "" };
          const sub = d.veg * Number(r.client.veg_rate) + d.nonveg * Number(r.client.nonveg_rate);
          return (
            <Box key={r.client.id} sx={{ p: 1.75, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${d.veg + d.nonveg > 0 ? alpha(brand.red, 0.3) : brand.line}`, opacity: r.client.is_active ? 1 : 0.7 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1.25 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap>{r.client.name}</Typography>
                  <Typography variant="caption">
                    {t("tiffin.veg")} {rupees(r.client.veg_rate)} · {t("tiffin.nonveg")} {rupees(r.client.nonveg_rate)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.15rem" }}>{d.veg + d.nonveg}</Typography>
                  <Typography variant="caption">{rupees(sub)}</Typography>
                </Box>
              </Box>
              <Stack spacing={1}>
                {([["veg", VEG_COLOR], ["nonveg", NONVEG_COLOR]] as const).map(([kind, color]) => (
                  <Box key={kind} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <VegMark kind={kind} size={18} />
                      <Typography sx={{ fontWeight: 600 }}>{t(`tiffin.${kind}`)}</Typography>
                    </Box>
                    <CountStepper value={d[kind]} color={color} label={`${r.client.name} ${t(`tiffin.${kind}`)}`} disabled={locked} onChange={(n) => update(r.client.id, { [kind]: n })} />
                  </Box>
                ))}
                {d.veg + d.nonveg > 0 ? (
                  <TextField size="small" placeholder={t("tiffin.notePlaceholder")} value={d.note} disabled={locked} onChange={(e) => update(r.client.id, { note: e.target.value })} slotProps={{ input: { sx: { minHeight: 44 } } }} />
                ) : null}
              </Stack>
            </Box>
          );
        })}
      </Stack>

      {dirty && !locked ? (
        <Box sx={{ position: "sticky", bottom: 88, zIndex: 2, pt: 1 }}>
          <Button
            variant="contained"
            fullWidth
            disabled={save.isPending}
            onClick={() => save.mutate(sheet.items.map((r) => ({ client_id: r.client.id, veg_count: draft[r.client.id]?.veg ?? 0, nonveg_count: draft[r.client.id]?.nonveg ?? 0, note: draft[r.client.id]?.note || null })))}
            sx={{ boxShadow: "0 12px 24px -10px rgba(0,0,0,.4)" }}
          >
            {save.isPending ? t("common.loading") : t("tiffin.saveOrders", { count: totals.total })}
          </Button>
        </Box>
      ) : null}
    </Stack>
  );
}

export function TiffinOrdersPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const date = params.get("date") ?? todayIst();
  const meal = (params.get("meal") as MealType | null) ?? "lunch";
  const setDate = (d: string) => setParams({ date: d, meal }, { replace: true });
  const setMeal = (m: MealType) => setParams({ date, meal: m }, { replace: true });
  const { data, isLoading } = useTiffinSheet(date, meal);
  const copy = useCopyTiffinOrders();
  const [adding, setAdding] = useState(false);

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t("tiffin.title")}
        subtitle={formatDateLong(date, i18n.language)}
        action={<Button variant="outlined" size="medium" startIcon={<BusinessIcon />} onClick={() => navigate("/owner/tiffin-clients")} sx={{ minHeight: 44 }}>{t("tiffin.companies")}</Button>}
      />
      <DateStrip value={date} onChange={setDate} />
      <Tabs value={meal} onChange={(_, v: MealType) => setMeal(v)} variant="fullWidth" sx={{ minHeight: 44, "& .MuiTab-root": { minHeight: 44, fontWeight: 600 } }}>
        <Tab value="lunch" label={t("meal.lunch")} />
        <Tab value="dinner" label={t("meal.dinner")} />
      </Tabs>

      {isLoading && !data ? (
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" height={100} sx={{ borderRadius: "16px" }} />
          <Skeleton variant="rounded" height={140} sx={{ borderRadius: "16px" }} />
        </Stack>
      ) : data && data.items.length === 0 ? (
        <EmptyState pose="thali" says={t("chef.noCompanies")} title={t("tiffin.noCompaniesTitle")} hint={t("tiffin.noCompaniesHint")} actionLabel={t("tiffin.addCompany")} onAction={() => setAdding(true)} />
      ) : data ? (
        <>
          {data.totals.total === 0 && !data.locked ? (
            <Button variant="outlined" startIcon={<ContentCopyIcon />} disabled={copy.isPending} onClick={() => copy.mutate({ from: addDays(date, -1), to: date })}>
              {t("tiffin.copyYesterday")}
            </Button>
          ) : null}
          <Editor key={`${date}-${meal}-${JSON.stringify(data.items.map((r) => [r.client.id, r.veg_count, r.nonveg_count, r.note]))}`} sheet={data} date={date} meal={meal} />
        </>
      ) : null}

      {adding ? <TiffinClientForm open onClose={() => setAdding(false)} /> : null}
    </Stack>
  );
}
