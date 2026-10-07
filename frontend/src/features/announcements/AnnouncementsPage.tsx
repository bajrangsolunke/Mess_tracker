import { useState } from "react";
import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import CampaignIcon from "@mui/icons-material/CampaignRounded";
import { useTranslation } from "react-i18next";
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from "../../api/useMenus";
import { useSession } from "../auth/authStore";
import { PageHeader } from "../../components/brand/PageHeader";
import { brand } from "../../app/theme";
import dayjs from "dayjs";

export function AnnouncementsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const owner = user?.role === "owner";
  const { data } = useAnnouncements();
  const create = useCreateAnnouncement();
  const del = useDeleteAnnouncement();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  const locale = i18n.language === "mr" || i18n.language === "hi" ? i18n.language : "en";

  return (
    <Stack spacing={2}>
      <PageHeader title={t("announcements.title")} back={owner ? "/owner/more" : "/app"} action={owner && !open ? <Button variant="contained" size="medium" startIcon={<CampaignIcon />} onClick={() => setOpen(true)} sx={{ minHeight: 44 }}>{t("announcements.new")}</Button> : null} />
      {owner && open ? (
        <Stack spacing={1.5} sx={{ p: 2, borderRadius: "16px", bgcolor: brand.cream, border: `1px solid ${brand.line}` }}>
          <TextField label={t("announcements.titleField")} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          <TextField label={t("announcements.body")} value={body} onChange={(e) => setBody(e.target.value)} multiline minRows={2} />
          <Typography variant="caption">{t("announcements.notifyHint")}</Typography>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button variant="outlined" onClick={() => setOpen(false)} sx={{ flex: 1 }}>{t("common.cancel")}</Button>
            <Button variant="contained" disabled={!title.trim() || create.isPending} sx={{ flex: 1 }} onClick={() => create.mutate({ title: title.trim(), body: body.trim() || undefined }, { onSuccess: () => { setTitle(""); setBody(""); setOpen(false); } })}>
              {t("announcements.publish")}
            </Button>
          </Box>
        </Stack>
      ) : null}
      <Stack spacing={1.25}>
        {(data ?? []).map((a) => (
          <Box key={a.id} sx={{ display: "flex", gap: 1.5, p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ lineHeight: 1.3 }}>{a.title}</Typography>
              {a.body ? <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "pre-wrap" }}>{a.body}</Typography> : null}
              <Typography variant="caption">{dayjs(a.published_at).locale(locale).format("D MMM, h:mm A")}</Typography>
            </Box>
            {owner ? <IconButton aria-label={t("common.delete")} onClick={() => del.mutate(a.id)} disabled={del.isPending}><DeleteIcon /></IconButton> : null}
          </Box>
        ))}
        {data && data.length === 0 ? <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>{t("announcements.empty")}</Typography> : null}
      </Stack>
    </Stack>
  );
}
