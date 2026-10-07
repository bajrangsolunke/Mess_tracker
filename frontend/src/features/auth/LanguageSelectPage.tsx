import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Box, Button, ButtonBase, Container, Stack, Typography, alpha } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import { changeLanguage } from "../../i18n";
import { LANGS, storage, type Lang } from "../../lib/storage";
import { brand } from "../../app/theme";
import { Logo } from "../../components/brand/Logo";

const NATIVE: Record<Lang, { name: string; sample: string }> = {
  en: { name: "English", sample: "Attendance • Payments • Menu" },
  mr: { name: "मराठी", sample: "उपस्थिती • पेमेंट • मेनू" },
  hi: { name: "हिन्दी", sample: "उपस्थिति • भुगतान • मेनू" },
};

export function LanguageSelectPage({ next = "/login" }: { next?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [lang, setLang] = useState<Lang>(storage.getLanguage() ?? "mr");

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          background: `linear-gradient(180deg, ${brand.maroon}, ${brand.maroonDark})`,
          borderBottomLeftRadius: "32px",
          borderBottomRightRadius: "32px",
          pt: "calc(env(safe-area-inset-top) + 28px)",
          pb: 3,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Box sx={{ bgcolor: brand.paper, borderRadius: "20px", px: 2.5, py: 1.5 }}>
          <Logo variant="full" height={72} />
        </Box>
      </Box>

      <Container maxWidth="xs" sx={{ flex: 1, py: 3, display: "flex", flexDirection: "column" }}>
        <Typography variant="h5" component="h1">
          {t("lang.select")}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.5 }}>
          {t("lang.hint")}
        </Typography>

        <Stack spacing={1.25} role="radiogroup" aria-label={t("lang.select")}>
          {LANGS.map((l) => {
            const selected = l === lang;
            return (
              <ButtonBase
                key={l}
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setLang(l);
                  changeLanguage(l);
                }}
                sx={{
                  justifyContent: "space-between",
                  textAlign: "left",
                  px: 2,
                  py: 1.5,
                  minHeight: 68,
                  borderRadius: "16px",
                  bgcolor: selected ? alpha(brand.maroon, 0.06) : brand.paper,
                  border: `1.5px solid ${selected ? brand.maroon : brand.line}`,
                  transition: "border-color 160ms, background-color 160ms",
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontSize: "1.15rem", fontFamily: '"Baloo 2"', fontWeight: 700 }}>
                    {NATIVE[l].name}
                  </Typography>
                  <Typography variant="caption">{NATIVE[l].sample}</Typography>
                </Box>
                <CheckCircleIcon sx={{ color: selected ? brand.maroon : brand.line, fontSize: 28 }} />
              </ButtonBase>
            );
          })}
        </Stack>

        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          onClick={() => {
            changeLanguage(lang);
            navigate(next, { replace: true });
          }}
          sx={{ mt: 3 }}
        >
          {t("lang.continue")}
        </Button>
      </Container>
    </Box>
  );
}
