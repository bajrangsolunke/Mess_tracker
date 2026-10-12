import { useState } from "react";
import { Alert, Box, Button, Chip, Drawer, IconButton, Skeleton, Stack, Switch, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import PhoneIcon from "@mui/icons-material/PhoneRounded";
import { useTranslation } from "react-i18next";
import { useAddOwner, useOwners, useSetOwnerActive, type Owner } from "../../api/useOperations";
import { ApiError } from "../../api/client";
import { PageHeader } from "../../components/brand/PageHeader";
import { Avatar } from "../../components/brand/Avatar";
import { brand } from "../../app/theme";
import { normalizePhoneInput } from "../../lib/phone";
import { TempPasswordDialog } from "../members/TempPasswordDialog";

function AddOwnerSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (o: Owner, password: string) => void }) {
  const { t } = useTranslation();
  const add = useAddOwner();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const p = normalizePhoneInput(phone);
  const valid = name.trim() && /^[6-9]\d{9}$/.test(p);
  const err = add.error instanceof ApiError && add.error.code === "DUPLICATE_PHONE" ? t("members.duplicatePhone") : add.error ? t("common.error") : null;
  return (
    <Drawer anchor="bottom" open onClose={onClose} slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 2.5, pb: "calc(env(safe-area-inset-bottom) + 20px)", maxWidth: 600, mx: "auto" } } }}>
      <Stack spacing={1.5}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.line, mx: "auto" }} />
        <Typography variant="h6">{t("owners.add")}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>{t("owners.addHint")}</Typography>
        <TextField label={t("members.name")} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <TextField label={t("auth.phone")} type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} helperText={t("owners.phoneHint")} />
        {err ? <Alert severity="error">{err}</Alert> : null}
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>{t("common.cancel")}</Button>
          <Button variant="contained" disabled={!valid || add.isPending} onClick={() => add.mutate({ name: name.trim(), phone: p }, { onSuccess: (r) => onCreated(r.owner, r.temp_password) })} sx={{ flex: 1 }}>
            {t("common.save")}
          </Button>
        </Box>
      </Stack>
    </Drawer>
  );
}

/** Partners who run the mess together: each has their own owner login with full access. */
export function OwnersPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useOwners();
  const setActive = useSetOwnerActive();
  const [adding, setAdding] = useState(false);
  const [login, setLogin] = useState<{ name: string; phone: string; password: string } | null>(null);

  return (
    <Stack spacing={2}>
      <PageHeader title={t("owners.title")} back="/owner/more" action={<Button variant="contained" size="medium" startIcon={<AddIcon />} onClick={() => setAdding(true)} sx={{ minHeight: 44 }}>{t("owners.addShort")}</Button>} />
      <Typography variant="body2" sx={{ color: "text.secondary" }}>{t("owners.hint")}</Typography>
      {isLoading || !data ? (
        <Skeleton variant="rounded" height={140} sx={{ borderRadius: "16px" }} />
      ) : (
        <Stack spacing={1.25}>
          {data.map((o) => (
            <Box key={o.id} sx={{ display: "flex", alignItems: "center", gap: 1.25, p: 1.5, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, opacity: o.is_active ? 1 : 0.6 }}>
              <Avatar name={o.name} size={44} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Typography variant="subtitle1" noWrap>{o.name}</Typography>
                  {o.is_me ? <Chip size="small" label={t("owners.you")} sx={{ height: 22, fontWeight: 700 }} /> : null}
                </Box>
                <Typography variant="caption">+91 {o.phone} · {o.is_active ? t("staff.canLogin") : t("staff.blocked")}</Typography>
              </Box>
              {!o.is_me ? (
                <>
                  <IconButton component="a" href={`tel:+91${o.phone}`} aria-label={t("members.call")}><PhoneIcon /></IconButton>
                  <Switch checked={o.is_active} disabled={setActive.isPending} onChange={(e) => setActive.mutate({ id: o.id, is_active: e.target.checked })} slotProps={{ input: { "aria-label": o.is_active ? t("staff.canLogin") : t("staff.blocked") } }} />
                </>
              ) : null}
            </Box>
          ))}
        </Stack>
      )}
      {adding ? (
        <AddOwnerSheet
          onClose={() => setAdding(false)}
          onCreated={(o, password) => {
            setAdding(false);
            setLogin({ name: o.name, phone: o.phone, password });
          }}
        />
      ) : null}
      {login ? <TempPasswordDialog open name={login.name} phone={login.phone} password={login.password} onClose={() => setLogin(null)} /> : null}
    </Stack>
  );
}
