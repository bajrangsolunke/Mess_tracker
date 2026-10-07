import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, Button, Container, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { changeLanguage } from "../../i18n";
import { LANGS, storage, type Lang } from "../../lib/storage";

export function LanguageSelectPage({ next = "/login" }: { next?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>(storage.getLanguage() ?? "en");

  return (
    <Container maxWidth="xs" sx={{ py: 6 }}>
      <Stack spacing={4}>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h5">{t("app.name")}</Typography>
          <Typography color="text.secondary">{t("lang.select")}</Typography>
        </Box>
        <ToggleButtonGroup
          orientation="vertical"
          exclusive
          value={lang}
          onChange={(_, v: Lang | null) => {
            if (v) {
              setLang(v);
              changeLanguage(v);
            }
          }}
          fullWidth
        >
          {LANGS.map((l) => (
            <ToggleButton key={l} value={l} sx={{ minHeight: 56, fontSize: "1.1rem" }}>
              {t(`lang.${l}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Button
          variant="contained"
          onClick={() => {
            changeLanguage(lang);
            navigate(next, { replace: true });
          }}
        >
          {t("lang.continue")}
        </Button>
      </Stack>
    </Container>
  );
}
