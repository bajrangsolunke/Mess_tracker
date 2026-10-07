import { useMemo, useState } from "react";
import { Alert, Box, Button, Skeleton, Stack, Tab, Tabs, TextField, Typography, alpha } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopyRounded";
import BusinessIcon from "@mui/icons-material/BusinessRounded";
import LockIcon from "@mui/icons-material/LockRounded";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { MealType, TiffinItem, TiffinSheet } from "../../api/types";
import { useCopyTiffinOrders, useSaveTiffinOrders, useTiffinSheet } from "../../api/useTiffin";
import { PageHeader } from "../../components/brand/PageHeader";
import { EmptyState } from "../../components/brand/EmptyState";
import { CountStepper } from "../../components/brand/CountStepper";
import { FOOD_COLORS, NONVEG_COLOR, VEG_COLOR, VegMark } from "../../components/brand/VegMark";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { addDays, formatDateLong, todayIst } from "../../lib/date";
import { DateStrip } from "../attendance/DateStrip";
import { TiffinClientForm } from "./TiffinClientForm";

type Draft = Record<number, { q: Record<number, number>; note: string }>;

function fromSheet(sheet: TiffinSheet): Draft {
  return Object.fromEntries(
    sheet.rows.map((r) => [r.client.id, { q: Object.fromEntries(Object.entries(r.quantities).map(([k, v]) => [Number(k), v])), note: r.note ?? "" }]),
  );
}

function totalsOf(draft: Draft, items: TiffinItem[]) {
  const byItem: Record<number, number> = {};
  let veg = 0;
  let nonveg = 0;
  let amount = 0;
  for (const d of Object.values(draft)) {
    for (const it of items) {
      const q = d.q[it.id] ?? 0;
      if (!q) continue;
      byItem[it.id] = (byItem[it.id] ?? 0) + q;
      amount += q * Number(it.price);
      if (it.food_type === "veg") veg += q;
      else nonveg += q;
    }
  }
  return { byItem, veg, nonveg, total: veg + nonveg, amount };
}

function Editor({ sheet, date, meal }: { sheet: TiffinSheet; date: string; meal: MealType }) {
  const { t } = useTranslation();
  const save = useSaveTiffinOrders(date, meal);
  const [draft, setDraft] = useState<Draft>(() => fromSheet(sheet));
  const initial = useMemo(() => fromSheet(sheet), [sheet]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const locked = sheet.locked;
  const totals = useMemo(() => totalsOf(draft, sheet.items), [draft, sheet.items]);
  const setQty = (cid: number, iid: number, n: number) => setDraft((cur) => ({ ...cur, [cid]: { ...cur[cid], q: { ...cur[cid].q, [iid]: n } } }));
  const setNote = (cid: number, note: string) => setDraft((cur) => ({ ...cur, [cid]: { ...cur[cid], note } }));

  return (
    <Stack spacing={2}>
      <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 1, alignItems: "end" }}>
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
            <Typography variant="caption">{t("tiffin.nonvegEgg")}</Typography>
          </Box>
        </Box>
        {totals.total > 0 ? (
          <Stack spacing={0.5} sx={{ mt: 1.5, pt: 1.5, borderTop: `1px dashed ${brand.line}` }}>
            {sheet.items.filter((it) => totals.byItem[it.id]).map((it) => (
              <Box key={it.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <VegMark kind={it.food_type} size={14} />
                <Typography variant="body2" sx={{ flex: 1 }} noWrap>{it.name}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{totals.byItem[it.id]}</Typography>
              </Box>
            ))}
          </Stack>
        ) : null}
      </Box>

      {locked ? <Alert severity="warning" icon={<LockIcon />}>{t("attendance.locked")}</Alert> : null}

      <Stack spacing={1.5}>
        {sheet.rows.map((r) => {
          const d = draft[r.client.id] ?? { q: {}, note: "" };
          const qty = sheet.items.reduce((n, it) => n + (d.q[it.id] ?? 0), 0);
          const sub = sheet.items.reduce((n, it) => n + (d.q[it.id] ?? 0) * Number(it.price), 0);
          return (
            <Box key={r.client.id} sx={{ p: 1.75, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${qty > 0 ? alpha(brand.red, 0.3) : brand.line}`, opacity: r.client.is_active ? 1 : 0.7 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1 }}>
                <Typography variant="subtitle1" noWrap sx={{ minWidth: 0 }}>{r.client.name}</Typography>
                <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.15rem" }}>{qty}</Typography>
                  <Typography variant="caption">{rupees(sub)}</Typography>
                </Box>
              </Box>
              <Stack spacing={1}>
                {sheet.items.map((it) => (
                  <Box key={it.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
                      <Box sx={{ pt: "3px" }}><VegMark kind={it.food_type} size={16} /></Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{it.name}</Typography>
                        <Typography variant="caption">{rupees(it.price)}</Typography>
                      </Box>
                    </Box>
                    <CountStepper value={d.q[it.id] ?? 0} color={FOOD_COLORS[it.food_type]} label={`${r.client.name} ${it.name}`} disabled={locked} onChange={(n) => setQty(r.client.id, it.id, n)} />
                  </Box>
                ))}
                {qty > 0 ? (
                  <TextField size="small" placeholder={t("tiffin.notePlaceholder")} value={d.note} disabled={locked} onChange={(e) => setNote(r.client.id, e.target.value)} slotProps={{ input: { sx: { minHeight: 44 } } }} />
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
            onClick={() =>
              save.mutate(
                sheet.rows.map((r) => ({
                  client_id: r.client.id,
                  lines: sheet.items.map((it) => ({ item_id: it.id, quantity: draft[r.client.id]?.q[it.id] ?? 0 })).filter((l) => l.quantity > 0),
                  note: draft[r.client.id]?.note || null,
                })),
              )
            }
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
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: "16px" }} />
        </Stack>
      ) : data && data.items.length === 0 ? (
        <EmptyState pose="thali" says={t("chef.noPriceList")} title={t("tiffin.noItemsTitle")} hint={t("tiffin.noItemsHint")} actionLabel={t("pricing.title")} onAction={() => navigate("/owner/pricing")} />
      ) : data && data.rows.length === 0 ? (
        <EmptyState pose="thali" says={t("chef.noCompanies")} title={t("tiffin.noCompaniesTitle")} hint={t("tiffin.noCompaniesHint")} actionLabel={t("tiffin.addCompany")} onAction={() => setAdding(true)} />
      ) : data ? (
        <>
          {data.totals.total === 0 && !data.locked ? (
            <Button variant="outlined" startIcon={<ContentCopyIcon />} disabled={copy.isPending} onClick={() => copy.mutate({ from: addDays(date, -1), to: date })}>
              {t("tiffin.copyYesterday")}
            </Button>
          ) : null}
          <Editor key={`${date}-${meal}-${JSON.stringify(data.rows.map((r) => [r.client.id, r.quantities, r.note]))}-${data.items.map((i) => i.id).join(",")}`} sheet={data} date={date} meal={meal} />
        </>
      ) : null}

      {adding ? <TiffinClientForm open onClose={() => setAdding(false)} /> : null}
    </Stack>
  );
}
