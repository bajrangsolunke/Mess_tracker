import { useEffect, useState } from "react";
import { Alert, Box, Button, Switch, Typography, alpha } from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActiveRounded";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { brand } from "../app/theme";
import { disablePush, enablePush, pushState, type PushState, type PushTarget } from "../lib/push";

/** Turn phone notifications on/off for this device (owner, staff, or a member's link). */
export function PushToggle({ target, compact }: { target: PushTarget; compact?: boolean }) {
  const { t } = useTranslation();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [tested, setTested] = useState(false);
  useEffect(() => {
    void pushState().then(setState);
  }, []);
  if (state === null || state === "unsupported") return null;
  const on = state === "on";
  const toggle = async () => {
    setBusy(true);
    setError(false);
    try {
      setState(on ? await disablePush(target) : await enablePush(target));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box sx={{ p: 2, borderRadius: "16px", bgcolor: on ? alpha(brand.green, 0.08) : brand.paper, border: `1px solid ${on ? alpha(brand.green, 0.35) : brand.line}` }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <NotificationsActiveIcon sx={{ color: on ? brand.greenDark : brand.red, fontSize: 30 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1">{t("push.title")}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {state === "install-first" ? t("push.installFirst") : state === "denied" ? t("push.denied") : on ? t("push.onHint") : compact ? t("push.memberHint") : t("push.offHint")}
          </Typography>
        </Box>
        {state === "on" || state === "off" ? <Switch checked={on} disabled={busy} onChange={() => void toggle()} slotProps={{ input: { "aria-label": t("push.title") } }} /> : null}
      </Box>
      {state === "off" ? (
        <Button variant="contained" fullWidth disabled={busy} onClick={() => void toggle()} sx={{ mt: 1.5 }}>
          {t("push.turnOn")}
        </Button>
      ) : null}
      {on && target.kind === "user" ? (
        <Button size="small" disabled={busy} onClick={() => void api<void>("/push/test", { method: "POST" }).then(() => setTested(true))} sx={{ mt: 1, minHeight: 36 }}>
          {tested ? t("push.testSent") : t("push.test")}
        </Button>
      ) : null}
      {error ? <Alert severity="error" sx={{ mt: 1.5 }}>{t("push.error")}</Alert> : null}
    </Box>
  );
}
