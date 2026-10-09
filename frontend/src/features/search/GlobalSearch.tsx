import { useEffect, useState } from "react";
import { Box, CircularProgress, Dialog, IconButton, InputBase, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import SearchIcon from "@mui/icons-material/SearchRounded";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMemberSearch } from "../../api/useAttendance";
import { useSession } from "../auth/authStore";
import { ChefSays } from "../../components/brand/ChefSays";
import { brand } from "../../app/theme";
import { todayIst } from "../../lib/date";
import { SearchResults } from "./SearchResults";

/** Full-screen member search from the top bar: find by name, phone or #ID and mark today's meal. */
export function GlobalSearch({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useSession();
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQ(text), 250);
    return () => clearTimeout(id);
  }, [text]);
  const { data, isFetching } = useMemberSearch(q);
  const isOwner = user?.role === "owner";
  const rows = q.trim() ? data ?? [] : [];

  return (
    <Dialog open fullScreen onClose={onClose} slotProps={{ paper: { sx: { bgcolor: "background.default" } } }}>
      <Box sx={{ position: "sticky", top: 0, zIndex: 1, display: "flex", alignItems: "center", gap: 0.5, px: 1, pt: "calc(env(safe-area-inset-top) + 8px)", pb: 1, bgcolor: brand.paper, borderBottom: `1px solid ${brand.line}` }}>
        <IconButton aria-label="back" onClick={onClose}><ArrowBackIcon fontSize="small" /></IconButton>
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 1, px: 1.5, minHeight: 48, borderRadius: "14px", bgcolor: brand.cream, border: `1.5px solid ${brand.line}` }}>
          <SearchIcon sx={{ color: "text.secondary" }} />
          <InputBase autoFocus fullWidth value={text} onChange={(e) => setText(e.target.value)} placeholder={t("search.placeholder")} inputProps={{ "aria-label": t("search.placeholder"), enterKeyHint: "search" }} sx={{ fontSize: "1.05rem" }} />
          {isFetching ? <CircularProgress size={18} /> : text ? <IconButton size="small" aria-label={t("common.clear", { defaultValue: "clear" })} onClick={() => setText("")}><CloseIcon fontSize="small" /></IconButton> : null}
        </Box>
      </Box>
      <Box sx={{ px: 2, py: 2, maxWidth: 600, width: "100%", mx: "auto" }}>
        {!q.trim() ? (
          <ChefSays pose="thumbsUp" size={60}>{t("search.hint")}</ChefSays>
        ) : rows.length === 0 && !isFetching ? (
          <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>{t("search.none")}</Typography>
        ) : (
          <SearchResults
            rows={rows}
            date={todayIst()}
            onOpen={isOwner ? (id) => { onClose(); navigate(`/owner/members/${id}`); } : undefined}
          />
        )}
      </Box>
    </Dialog>
  );
}
