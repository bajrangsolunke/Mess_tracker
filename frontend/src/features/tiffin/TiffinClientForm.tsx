import { useState } from "react";
import { Alert, Box, Button, Drawer, FormControlLabel, Stack, Switch, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { TiffinClient } from "../../api/types";
import { useSaveTiffinClient } from "../../api/useTiffin";
import { brand } from "../../app/theme";
import { normalizePhoneInput } from "../../lib/phone";

/** Bottom sheet to add or edit a company that orders tiffins. Prices come from the price list. */
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
  }));
  const phone = normalizePhoneInput(v.phone);
  const phoneOk = !v.phone || /^[6-9]\d{9}$/.test(phone);
  const valid = v.name.trim() && phoneOk;

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose} slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 2.5, pb: "calc(env(safe-area-inset-bottom) + 20px)", maxWidth: 600, mx: "auto", maxHeight: "92dvh" } } }}>
      <Stack spacing={1.5}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.line, mx: "auto" }} />
        <Typography variant="h6">{client ? t("tiffin.editCompany") : t("tiffin.addCompany")}</Typography>
        <TextField label={t("tiffin.companyName")} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoFocus={!client} />
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <TextField label={t("tiffin.contactName")} value={v.contact_name} onChange={(e) => setV({ ...v, contact_name: e.target.value })} />
          <TextField label={t("auth.phone")} type="tel" inputMode="numeric" value={v.phone} error={!phoneOk} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </Box>
        <TextField label={t("members.deliveryAddress")} value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
        <TextField label={t("members.notes")} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} multiline minRows={1} />
        <Typography variant="caption">{t("tiffin.pricesFromList")}</Typography>
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
                { id: client?.id, name: v.name.trim(), contact_name: v.contact_name || null, phone: v.phone ? phone : null, address: v.address || null, notes: v.notes || null, ...(client ? { is_active: v.is_active } : {}) },
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
