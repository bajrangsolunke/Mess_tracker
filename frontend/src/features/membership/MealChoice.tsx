import { Box, ButtonBase, Typography, alpha } from "@mui/material";
import WbSunnyIcon from "@mui/icons-material/WbSunnyRounded";
import NightsStayIcon from "@mui/icons-material/NightsStayRounded";
import { useTranslation } from "react-i18next";
import type { Plan } from "../../api/types";
import type { Choice } from "../../lib/membership";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";

function Tile({ active, onClick, title, sub, icon }: { active: boolean; onClick: () => void; title: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <ButtonBase
      onClick={onClick}
      aria-pressed={active}
      sx={{ flex: 1, flexDirection: "column", alignItems: "stretch", textAlign: "left", p: 1.5, minHeight: 72, borderRadius: "14px", border: `1.5px solid ${active ? brand.red : brand.line}`, bgcolor: active ? alpha(brand.red, 0.06) : brand.paper }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: active ? brand.red : "text.secondary" }}>
        {icon}
        <Typography sx={{ fontWeight: 700, color: "text.primary" }}>{title}</Typography>
      </Box>
      {sub ? <Typography variant="body2" sx={{ fontWeight: 700, color: active ? brand.red : "text.secondary", mt: 0.25 }}>{sub}</Typography> : null}
    </ButtonBase>
  );
}

/** "1 वेळ / 2 वेळा" with the price, then lunch or dinner for 1 time. */
export function MealChoice({ plans, value, onChange }: { plans: Plan[]; value: Choice | null; onChange: (c: Choice) => void }) {
  const { t } = useTranslation();
  const one = plans.find((p) => p.kind === "one_lunch" || p.kind === "one_dinner");
  const two = plans.find((p) => p.kind === "two");
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 1 }}>{t("pricing.howManyTimes")}</Typography>
      <Box sx={{ display: "flex", gap: 1.25 }}>
        <Tile active={value?.times === 1} onClick={() => onChange({ times: 1, meal: value?.meal ?? "dinner" })} title={t("pricing.oneMeal")} sub={one ? `${rupees(one.monthly_fee)}/${t("members.perMonth")}${one.meal_credits ? ` · ${t("pack.count", { count: one.meal_credits })}` : ""}` : undefined} />
        <Tile active={value?.times === 2} onClick={() => onChange({ times: 2, meal: "lunch" })} title={t("pricing.twoMeals")} sub={two ? `${rupees(two.monthly_fee)}/${t("members.perMonth")}${two.meal_credits ? ` · ${t("pack.count", { count: two.meal_credits })}` : ""}` : undefined} />
      </Box>
      {value?.times === 1 ? (
        <>
          <Typography variant="subtitle2" sx={{ color: "text.secondary", mt: 1.5, mb: 1 }}>{t("pricing.whichMeal")}</Typography>
          <Box sx={{ display: "flex", gap: 1.25 }}>
            <Tile active={value.meal === "lunch"} onClick={() => onChange({ times: 1, meal: "lunch" })} title={t("meal.lunch")} icon={<WbSunnyIcon fontSize="small" />} />
            <Tile active={value.meal === "dinner"} onClick={() => onChange({ times: 1, meal: "dinner" })} title={t("meal.dinner")} icon={<NightsStayIcon fontSize="small" />} />
          </Box>
        </>
      ) : null}
    </Box>
  );
}
