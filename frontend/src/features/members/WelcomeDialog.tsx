import { Box, Button, Dialog, DialogActions, DialogContent, IconButton, Typography, alpha } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopyRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Member } from "../../api/types";
import { useSession } from "../auth/authStore";
import { ChefSays } from "../../components/brand/ChefSays";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { trackUrl, welcomeText, whatsappUrl } from "../../lib/share";

/** After registering a member: one tap sends the welcome + tracking link on WhatsApp. */
export function WelcomeDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const { organization } = useSession();
  const [copied, setCopied] = useState(false);
  const link = member.share_token ? trackUrl(member.share_token) : "";
  const text = welcomeText(member, organization?.name ?? "", t, i18n.language);
  const due = Number(member.due);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" slotProps={{ paper: { sx: { borderRadius: "20px", m: 2 } } }}>
      <DialogContent sx={{ pt: 3 }}>
        <ChefSays pose="celebrating" size={64}>{t("track.added", { name: member.name, no: member.member_no })}</ChefSays>
        <Box sx={{ mt: 2, p: 1.5, borderRadius: "14px", bgcolor: due > 0 ? alpha(brand.gold, 0.12) : alpha(brand.green, 0.1) }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: due > 0 ? brand.goldDark : brand.greenDark }}>
            {due > 0 ? t("pay.leftDue", { amount: rupees(due) }) : t("pay.fullyPaid")}
          </Typography>
        </Box>
        {link ? (
          <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1, p: 1.25, borderRadius: "14px", bgcolor: brand.cream, border: `1px dashed ${brand.gold}` }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption">{t("track.linkLabel")}</Typography>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{link}</Typography>
            </Box>
            <IconButton aria-label={t("common.copy")} onClick={() => void navigator.clipboard?.writeText(link).then(() => setCopied(true))}>
              <ContentCopyIcon />
            </IconButton>
          </Box>
        ) : null}
        <Typography variant="caption" sx={{ display: "block", mt: 1 }}>{copied ? t("track.copied") : t("track.linkHint")}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>{t("common.done")}</Button>
        <Button variant="contained" startIcon={<WhatsAppIcon />} href={whatsappUrl(member.phone, text)} target="_blank" rel="noopener" sx={{ flex: 1.4, backgroundImage: "none", bgcolor: "#25D366", "&:hover": { bgcolor: "#1DA851" } }}>
          {t("track.sendWelcome")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
