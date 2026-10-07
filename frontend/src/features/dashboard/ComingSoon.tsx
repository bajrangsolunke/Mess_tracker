import { Box, Typography } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/ConstructionRounded";
import { useTranslation } from "react-i18next";
import { brand } from "../../app/theme";

export function ComingSoon({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <Box sx={{ textAlign: "center", pt: 8, px: 2 }}>
      <Box sx={{ mx: "auto", mb: 2, width: 72, height: 72, borderRadius: "50%", bgcolor: brand.creamDark, display: "grid", placeItems: "center", color: brand.saffron }}>
        <ConstructionIcon fontSize="large" />
      </Box>
      <Typography variant="h5" component="h1">
        {t(titleKey)}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
        {t("common.comingSoonHint")}
      </Typography>
    </Box>
  );
}
