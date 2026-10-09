import { useState } from "react";
import { Alert, Box, Button, Drawer, FormControlLabel, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { VegMark } from "../../components/brand/VegMark";
import { useTranslation } from "react-i18next";
import type { TiffinClient } from "../../api/types";
import { useSaveTiffinClient } from "../../api/useTiffin";
import { brand } from "../../app/theme";
import { normalizePhoneInput } from "../../lib/phone";

const AMOUNT = /^\d{1,6}(\.\d{1,2})?$/;

/** Bottom sheet to add or edit a company: which meals they take and the rate per veg / non-veg tiffin. */
export function TiffinClientForm({ open, client, onClose, onSaved }: { open: boolean; client?: TiffinClient | null; onClose: () => void; onSaved?: (c: TiffinClient) => void }) {
  const { t } = useTranslation();
  const save = useSaveTiffinClient();
  const [v, setV] = useState(() => ({
    name: client?.name ?? "",
    contact_name: client?.contact_name ?? "",
    phone: client?.phone ?? "",
    address: client?.address ?? "",
    notes: client?.notes ?? "",
    is_active: client?.is_active ?? true,
    veg_price: client?.veg_price ? String(Number(client.veg_price)) : "",
    nonveg_price: client?.nonveg_price ? String(Number(client.nonveg_price)) : "",
    meals: client ? ([client.lunch && "lunch", client.dinner && "dinner"].filter(Boolean) as string[]) : ["lunch"],
  }));
  const ratesOk = (!v.veg_price || AMOUNT.test(v.veg_price)) && (!v.nonveg_price || AMOUNT.test(v.nonveg_price));
  const phone = normalizePhoneInput(v.phone);
  const phoneOk = !v.phone || /^[6-9]\d{9}$/.test(phone);
  const valid = v.name.trim() && phoneOk && ratesOk && v.meals.length > 0;

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose} slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 2.5, pb: "calc(env(safe-area-inset-bottom) + 20px)", maxWidth: 600, mx: "auto", maxHeight: "92dvh" } } }}>
      <Stack spacing={1.5} sx={{ overflowY: "auto" }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.line, mx: "auto" }} />
        <Typography variant="h6">{client ? t("tiffin.editCompany") : t("tiffin.addCompany")}</Typography>
        <TextField label={t("tiffin.companyName")} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus={!client} />
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField label={t("tiffin.contactName")} value={v.contact_name} onChange={(e) => setV({ ...v, contact_name: e.target.value })} />
          <TextField label={t("auth.phone")} type="tel" inputMode="numeric" value={v.phone} error={!phoneOk} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </Box>
        <Typography variant="subtitle2">{t("tiffin.mealsTaken")}</Typography>
        <ToggleButtonGroup fullWidth value={v.meals} onChange={(_, m: string[]) => setV({ ...v, meals: m })}>
          <ToggleButton value="lunch" sx={{ minHeight: 48, fontWeight: 700 }}>{t("meal.lunch")}</ToggleButton>
          <ToggleButton value="dinner" sx={{ minHeight: 48, fontWeight: 700 }}>{t("meal.dinner")}</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField label={t("tiffin.vegRate")} inputMode="decimal" value={v.veg_price} error={!!v.veg_price && !AMOUNT.test(v.veg_price)} onChange={(e) => setV({ ...v, veg_price: e.target.value.trim() })} slotProps={{ input: { startAdornment: <Box sx={{ mr: 1, display: "flex" }}><VegMark kind="veg" size={14} /></Box> } }} />
          <TextField label={t("tiffin.nonvegRate")} inputMode="decimal" value={v.nonveg_price} error={!!v.nonveg_price && !AMOUNT.test(v.nonveg_price)} onChange={(e) => setV({ ...v, nonveg_price: e.target.value.trim() })} slotProps={{ input: { startAdornment: <Box sx={{ mr: 1, display: "flex" }}><VegMark kind="nonveg" size={14} /></Box> } }} />
        </Box>
        <TextField label={t("members.deliveryAddress")} value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
        <TextField label={t("members.notes")} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} multiline minRows={1} />
        <Typography variant="caption">{t("tiffin.ratesHint")}</Typography>
        {client ? <FormControlLabel control={<Switch checked={v.is_active} onChange={(e) => setV({ ...v, is_active: e.target.checked })} />} label={t("tiffin.active")} /> : null}
        {save.error ? <Alert severity="error">{t("common.error")}</Alert> : null}
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            disabled={!valid || save.isPending}
            sx={{ flex: 1 }}
            onClick={() =>
              save.mutate(
                { id: client?.id, name: v.name.trim(), contact_name: v.contact_name || null, phone: v.phone ? phone : null, address: v.address || null, notes: v.notes || null, veg_price: v.veg_price || null, nonveg_price: v.nonveg_price || null, lunch: v.meals.includes("lunch"), dinner: v.meals.includes("dinner"), ...(client ? { is_active: v.is_active } : {}) },
                { onSuccess: (c) => { onSaved?.(c); onClose(); } },
              )
            }
          >
            {t("common.save")}
          </Button>
        </Box>
      </Stack>
    </Drawer>
  );
}
