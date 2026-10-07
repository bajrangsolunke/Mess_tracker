import { useTranslation } from "react-i18next";
import { EmptyState } from "../../components/brand/EmptyState";

export function ComingSoon({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return <EmptyState pose="cooking" says={t("chef.building")} title={t(titleKey)} hint={t("common.comingSoonHint")} />;
}
