import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopyRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { useTranslation } from "react-i18next";
import { brand } from "../../app/theme";

/** Shown once after creating a member or resetting a password. Lets the owner copy or WhatsApp it. */
export function TempPasswordDialog({
  open,
  onClose,
  name,
  phone,
  password,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  phone: string;
  password: string;
}) {
  const { t } = useTranslation();
  const message = t("members.whatsappText", { name, phone, password, app: window.location.origin });
  const wa = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "20px", m: 2 } } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{t("members.loginReady", { name })}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          {t("members.loginReadyHint")}
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 1, alignItems: "center", p: 1.5, borderRadius: "14px", bgcolor: brand.cream, border: `1px dashed ${brand.gold}` }}>
          <Box>
            <Typography variant="caption">{t("auth.phone")}</Typography>
            <Typography sx={{ fontWeight: 600 }}>{phone}</Typography>
            <Typography variant="caption">{t("members.tempPassword")}</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: "1.6rem", letterSpacing: 4, fontVariantNumeric: "tabular-nums" }}>{password}</Typography>
          </Box>
          <IconButton aria-label={t("common.copy")} onClick={() => void navigator.clipboard?.writeText(`${phone} / ${password}`)}>
            <ContentCopyIcon />
          </IconButton>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>
          {t("common.done")}
        </Button>
        <Button variant="contained" color="success" startIcon={<WhatsAppIcon />} href={wa} target="_blank" rel="noopener" sx={{ flex: 1, backgroundImage: "none", bgcolor: "#25D366", "&:hover": { bgcolor: "#1DA851" } }}>
          WhatsApp
        </Button>
      </DialogActions>
    </Dialog>
  );
}
