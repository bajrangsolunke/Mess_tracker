import { useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../../api/client";
import { authStore, type AuthOrganization } from "../auth/authStore";
import { brand } from "../../app/theme";

type Org = AuthOrganization & { lunch_end_time: string; dinner_end_time: string; leave_cutoff_time: string };

function Form({ org }: { org: Org }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [lunch, setLunch] = useState(org.lunch_end_time.slice(0, 5));
  const [dinner, setDinner] = useState(org.dinner_end_time.slice(0, 5));
  const [cutoff, setCutoff] = useState(org.leave_cutoff_time.slice(0, 5));
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: () => api<Org>("/organization", { method: "PATCH", body: JSON.stringify({ lunch_end_time: lunch, dinner_end_time: dinner, leave_cutoff_time: cutoff }) }),
    onSuccess: (o) => {
      qc.setQueryData(["organization"], o);
      authStore.setSession({ ...authStore.get(), organization: { ...authStore.get().organization, ...o } });
      void qc.invalidateQueries({ queryKey: ["attendance"] });
      setSaved(true);
    },
  });
  const changed = lunch !== org.lunch_end_time.slice(0, 5) || dinner !== org.dinner_end_time.slice(0, 5) || cutoff !== org.leave_cutoff_time.slice(0, 5);
  const field = (label: string, hint: string, value: string, set: (v: string) => void) => (
    <TextField label={label} helperText={hint} type="time" value={value} onChange={(e) => { set(e.target.value); setSaved(false); }} slotProps={{ inputLabel: { shrink: true } }} />
  );
  return (
    <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
      <Stack spacing={1.5}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          {field(t("times.lunchEnd"), t("times.lunchEndHint"), lunch, setLunch)}
          {field(t("times.dinnerEnd"), t("times.dinnerEndHint"), dinner, setDinner)}
        </Box>
        {field(t("times.leaveCutoff"), t("times.leaveCutoffHint"), cutoff, setCutoff)}
        {saved ? <Alert severity="success">{t("times.saved")}</Alert> : null}
        <Button variant="contained" disabled={!changed || save.isPending} onClick={() => save.mutate()}>{t("common.save")}</Button>
      </Stack>
    </Box>
  );
}

/** Meal end times (missed marks become absent after these) and the leave cutoff. */
export function MealTimesCard() {
  const { t } = useTranslation();
  const { data } = useQuery({ queryKey: ["organization"], queryFn: () => api<Org>("/organization") });
  return (
    <Box>
      <Typography variant="h6" component="h2">{t("times.title")}</Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>{t("times.hint")}</Typography>
      {data ? <Form key={`${data.lunch_end_time}-${data.dinner_end_time}-${data.leave_cutoff_time}`} org={data} /> : null}
    </Box>
  );
}
