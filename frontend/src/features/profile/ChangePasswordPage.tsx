import { useState } from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "../../api/client";
import type { MeResponse } from "../../api/useAuth";
import { authStore, useSession } from "../auth/authStore";
import { HOME_BY_ROLE } from "../auth/routes";
import { PageHeader } from "../../components/brand/PageHeader";
import { ChefSays } from "../../components/brand/ChefSays";

/** Change password. Forced (no back, no skip) when the account has a temporary password. */
export function ChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useSession();
  const forced = !!session.user?.must_change_password;
  const home = session.user ? HOME_BY_ROLE[session.user.role] : "/login";
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const change = useMutation({
    mutationFn: () => api<MeResponse>("/auth/me", { method: "PATCH", body: JSON.stringify({ current_password: current, new_password: next }) }),
    onSuccess: (me) => {
      authStore.setSession({ ...authStore.get(), user: me.user, organization: me.organization, member: me.member });
      navigate(home, { replace: true });
    },
  });
  const tooLong = new TextEncoder().encode(next).length > 72;
  const valid = current.length > 0 && next.length >= 6 && !tooLong && next === confirm;
  const err = change.error instanceof ApiError ? (change.error.code === "WRONG_PASSWORD" ? t("password.wrongCurrent") : t("common.error")) : change.error ? t("common.error") : null;

  return (
    <Stack component="form" spacing={2} noValidate onSubmit={(e) => { e.preventDefault(); if (valid) change.mutate(); }}>
      <PageHeader title={t("password.title")} back={forced ? undefined : `${home}/${session.user?.role === "owner" ? "more" : "profile"}`} />
      <ChefSays pose="waving" size={60}>{forced ? t("chef.forcedPassword") : t("chef.changePassword")}</ChefSays>
      <TextField label={forced ? t("password.temp") : t("password.current")} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
      <TextField label={t("password.new")} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={next.length > 0 && (next.length < 6 || tooLong)} helperText={next.length > 0 && next.length < 6 ? t("password.min") : tooLong ? t("password.tooLong") : " "} />
      <TextField label={t("password.confirm")} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={confirm.length > 0 && confirm !== next} helperText={confirm.length > 0 && confirm !== next ? t("password.mismatch") : " "} />
      {err ? <Alert severity="error">{err}</Alert> : null}
      <Button type="submit" variant="contained" disabled={!valid || change.isPending}>{t("password.save")}</Button>
      {forced ? <Typography variant="caption" sx={{ textAlign: "center" }}>{t("password.forcedHint")}</Typography> : null}
    </Stack>
  );
}
