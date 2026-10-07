import { Card, CardContent, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export function ComingSoon({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{t(titleKey)}</Typography>
        <Typography color="text.secondary">{t("common.comingSoon")}</Typography>
      </CardContent>
    </Card>
  );
}
