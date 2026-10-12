import { useEffect } from "react";
import { Box, Button, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useRouteError } from "react-router-dom";
import { ChefSays } from "./brand/ChefSays";
import { reportError } from "../lib/monitoring";

const STALE_CHUNK = /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch/i;
const RELOADED = "mt.chunk-reload";

/** Friendly screen when a page crashes. After a new deploy, an old open app may ask for a
 *  screen file that no longer exists: then it reloads once into the new version. */
export function RouteError() {
  const { t } = useTranslation();
  const error = useRouteError();
  const message = error instanceof Error ? error.message : String(error ?? "");
  const stale = STALE_CHUNK.test(message);

  useEffect(() => {
    if (stale) {
      let done = false;
      try {
        done = sessionStorage.getItem(RELOADED) === "1";
        sessionStorage.setItem(RELOADED, "1");
      } catch {
        /* storage unavailable */
      }
      if (!done) {
        window.location.reload();
        return;
      }
    }
    reportError(error);
  }, [error, stale]);

  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 3, bgcolor: "background.default" }}>
      <Stack spacing={2.5} sx={{ maxWidth: 420, width: "100%" }}>
        <ChefSays pose="confused" size={72}>{t("errorPage.title")}</ChefSays>
        <Button variant="contained" onClick={() => window.location.reload()}>{t("errorPage.reload")}</Button>
        <Button variant="outlined" onClick={() => window.location.assign("/")}>{t("errorPage.home")}</Button>
      </Stack>
    </Box>
  );
}
