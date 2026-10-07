import { useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import { useTranslation } from "react-i18next";
import { useCreatePlan, usePlans, useUpdatePlan, type PlanInput } from "../../api/usePlans";
import type { Plan } from "../../api/types";
import { PageHeader } from "../../components/brand/PageHeader";
import { ThaliIcon } from "../../components/brand/icons";
import { rupees } from "../../lib/money";
import { brand } from "../../app/theme";

const EMPTY: PlanInput = { name: "", includes_lunch: true, includes_dinner: true, monthly_fee: "" };

function PlanForm({ initial, onSave, onCancel, pending }: { initial: PlanInput; onSave: (v: PlanInput) => void; onCancel: () => void; pending: boolean }) {
  const { t } = useTranslation();
  const [v, setV] = useState<PlanInput>(initial);
  const valid = v.name.trim().length > 0 && /^\d{1,8}(\.\d{1,2})?$/.test(v.monthly_fee) && (v.includes_lunch || v.includes_dinner);
  return (
    <Stack spacing={1.5} sx={{ p: 2, borderRadius: "16px", bgcolor: brand.cream, border: `1px solid ${brand.line}` }}>
      <TextField label={t("plans.name")} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus />
      <TextField label={t("plans.monthlyFee")} inputMode="decimal" value={v.monthly_fee} onChange={(e) => setV({ ...v, monthly_fee: e.target.value })} />
      <Box sx={{ display: "flex", gap: 2 }}>
        <FormControlLabel control={<Checkbox checked={v.includes_lunch} onChange={(e) => setV({ ...v, includes_lunch: e.target.checked })} />} label={t("meal.lunch")} />
        <FormControlLabel control={<Checkbox checked={v.includes_dinner} onChange={(e) => setV({ ...v, includes_dinner: e.target.checked })} />} label={t("meal.dinner")} />
      </Box>
      <Box sx={{ display: "flex", gap: 1.5 }}>
        <Button variant="outlined" onClick={onCancel} sx={{ flex: 1 }}>
          {t("common.cancel")}
        </Button>
        <Button variant="contained" disabled={!valid || pending} onClick={() => onSave(v)} sx={{ flex: 1 }}>
          {t("common.save")}
        </Button>
      </Box>
    </Stack>
  );
}

export function PlansPage() {
  const { t } = useTranslation();
  const plans = usePlans();
  const create = useCreatePlan();
  const update = useUpdatePlan();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t("plans.title")}
        back="/owner/more"
        action={
          !adding ? (
            <Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={() => setAdding(true)} sx={{ minHeight: 44 }}>
              {t("plans.create")}
            </Button>
          ) : null
        }
      />
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {t("plans.hint")}
      </Typography>

      {adding ? (
        <PlanForm initial={EMPTY} pending={create.isPending} onCancel={() => setAdding(false)} onSave={(v) => create.mutate(v, { onSuccess: () => setAdding(false) })} />
      ) : null}

      <Stack spacing={1.5}>
        {(plans.data ?? []).map((p) =>
          editing?.id === p.id ? (
            <PlanForm
              key={p.id}
              initial={{ name: p.name, includes_lunch: p.includes_lunch, includes_dinner: p.includes_dinner, monthly_fee: String(Number(p.monthly_fee)) }}
              pending={update.isPending}
              onCancel={() => setEditing(null)}
              onSave={(v) => update.mutate({ id: p.id, ...v }, { onSuccess: () => setEditing(null) })}
            />
          ) : (
            <Box key={p.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, opacity: p.is_active ? 1 : 0.6 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: "12px", bgcolor: `${brand.red}14`, color: brand.red, display: "grid", placeItems: "center" }}>
                <ThaliIcon />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" noWrap>
                  {p.name}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {[p.includes_lunch && t("meal.lunchShort"), p.includes_dinner && t("meal.dinnerShort")].filter(Boolean).join(" + ")} · {rupees(p.monthly_fee)}/{t("members.perMonth")}
                </Typography>
              </Box>
              <Switch checked={p.is_active} onChange={(e) => update.mutate({ id: p.id, is_active: e.target.checked })} slotProps={{ input: { "aria-label": t("plans.active") } }} />
              <Button size="small" variant="text" onClick={() => setEditing(p)} sx={{ minHeight: 40 }}>
                {t("common.edit")}
              </Button>
            </Box>
          ),
        )}
        {plans.data && plans.data.length === 0 && !adding ? (
          <Typography sx={{ color: "text.secondary", textAlign: "center", py: 3 }}>{t("plans.empty")}</Typography>
        ) : null}
      </Stack>
    </Stack>
  );
}
