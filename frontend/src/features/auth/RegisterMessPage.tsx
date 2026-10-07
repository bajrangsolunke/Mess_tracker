import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Box, Button, Container, Stack, TextField, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError, type TokenResponse } from "../../api/client";
import { authStore } from "./authStore";
import { brand } from "../../app/theme";
import { Logo } from "../../components/brand/Logo";
import { normalizePhoneInput } from "../../lib/phone";
import { storage } from "../../lib/storage";

/** One-time setup for a new mess: creates the mess and its owner login (needs the invite code). */
export function RegisterMessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [v, setV] = useState({ mess_name: "", owner_name: "", phone: "", password: "", confirm: "", invite_code: "" });
  const phone = normalizePhoneInput(v.phone);
  const tooLong = new TextEncoder().encode(v.password).length > 72;
  const valid = v.mess_name.trim().length >= 2 && v.owner_name.trim() && /^[6-9]\d{9}$/.test(phone) && v.password.length >= 6 && !tooLong && v.password === v.confirm && v.invite_code.trim();
  const register = useMutation({
    mutationFn: () =>
      api<TokenResponse>("/auth/register-owner", {
        method: "POST",
        body: JSON.stringify({ mess_name: v.mess_name.trim(), owner_name: v.owner_name.trim(), phone, password: v.password, invite_code: v.invite_code.trim(), language: storage.getLanguage() ?? "mr" }),
      }),
    onSuccess: (b) => {
      authStore.setSession({ access: b.access_token, refresh: b.refresh_token, user: b.user, organization: b.organization, member: null });
      navigate("/owner/pricing", { replace: true });
    },
  });
  const err = register.error instanceof ApiError
    ? register.error.code === "INVALID_INVITE" ? t("registerMess.badInvite") : register.error.code === "DUPLICATE_PHONE" ? t("members.duplicatePhone") : t("common.error")
    : register.error ? t("common.error") : null;
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <Box sx={{ minHeight: "100dvh" }}>
      <Box sx={{ bgcolor: brand.red, borderBottomLeftRadius: "28px", borderBottomRightRadius: "28px", py: 3, display: "grid", placeItems: "center" }}>
        <Box sx={{ bgcolor: brand.paper, borderRadius: "20px", px: 2.5, py: 1.5 }}>
          <Logo variant="full" height={64} />
        </Box>
      </Box>
      <Container maxWidth="xs" sx={{ py: 3 }}>
        <Stack spacing={1.5} component="form" noValidate onSubmit={(e) => { e.preventDefault(); if (valid) register.mutate(); }}>
          <Typography variant="h5" component="h1">{t("registerMess.title")}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>{t("registerMess.hint")}</Typography>
          <TextField label={t("registerMess.messName")} value={v.mess_name} onChange={set("mess_name")} />
          <TextField label={t("registerMess.ownerName")} value={v.owner_name} onChange={set("owner_name")} />
          <TextField label={t("auth.phone")} type="tel" inputMode="numeric" value={v.phone} onChange={set("phone")} error={!!v.phone && !/^[6-9]\d{9}$/.test(phone)} />
          <TextField label={t("password.new")} type="password" autoComplete="new-password" value={v.password} onChange={set("password")} error={!!v.password && (v.password.length < 6 || tooLong)} helperText={t("password.min")} />
          <TextField label={t("password.confirm")} type="password" autoComplete="new-password" value={v.confirm} onChange={set("confirm")} error={!!v.confirm && v.confirm !== v.password} />
          <TextField label={t("registerMess.invite")} value={v.invite_code} onChange={set("invite_code")} helperText={t("registerMess.inviteHint")} />
          {err ? <Alert severity="error">{err}</Alert> : null}
          <Button type="submit" variant="contained" disabled={!valid || register.isPending}>{register.isPending ? t("common.loading") : t("registerMess.submit")}</Button>
          <Button variant="text" onClick={() => navigate("/login")}>{t("registerMess.haveLogin")}</Button>
        </Stack>
      </Container>
    </Box>
  );
}
