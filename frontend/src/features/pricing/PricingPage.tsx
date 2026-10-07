import { useState } from "react";
import { Alert, Box, Button, Checkbox, Divider, Drawer, FormControlLabel, IconButton, InputAdornment, Skeleton, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import { useTranslation } from "react-i18next";
import type { FoodType, Pricing, TiffinItem } from "../../api/types";
import { usePricing, useSavePricing } from "../../api/useMembership";
import { useSaveTiffinItem, useTiffinItems } from "../../api/useTiffin";
import { PageHeader } from "../../components/brand/PageHeader";
import { SectionTitle } from "../../components/brand/SectionTitle";
import { VegMark } from "../../components/brand/VegMark";
import { ThaliIcon } from "../../components/brand/icons";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";

const money = /^\d{1,8}(\.\d{1,2})?$/;

function MessPrices({ pricing }: { pricing: Pricing }) {
  const { t } = useTranslation();
  const save = useSavePricing();
  const [one, setOne] = useState(pricing.one_meal_price ? String(Number(pricing.one_meal_price)) : "");
  const [two, setTwo] = useState(pricing.two_meal_price ? String(Number(pricing.two_meal_price)) : "");
  const [apply, setApply] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const changed = one !== (pricing.one_meal_price ? String(Number(pricing.one_meal_price)) : "") || two !== (pricing.two_meal_price ? String(Number(pricing.two_meal_price)) : "");
  const valid = money.test(one) && Number(one) > 0 && money.test(two) && Number(two) > 0;
  const rupee = { input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } };

  return (
    <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
      <Stack spacing={2}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>{t("pricing.oneMeal")}</Typography>
            <Typography variant="caption" sx={{ display: "block", mb: 1 }}>{t("pricing.oneMealHint")}</Typography>
            <TextField inputMode="decimal" value={one} onChange={(e) => { setOne(e.target.value); setDone(null); }} slotProps={rupee} aria-label={t("pricing.oneMeal")} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>{t("pricing.twoMeals")}</Typography>
            <Typography variant="caption" sx={{ display: "block", mb: 1 }}>{t("pricing.twoMealsHint")}</Typography>
            <TextField inputMode="decimal" value={two} onChange={(e) => { setTwo(e.target.value); setDone(null); }} slotProps={rupee} aria-label={t("pricing.twoMeals")} />
          </Box>
        </Box>
        {pricing.one_meal_price ? (
          <FormControlLabel control={<Checkbox checked={apply} onChange={(e) => setApply(e.target.checked)} />} label={<Typography variant="body2">{t("pricing.applyExisting")}</Typography>} />
        ) : null}
        {done !== null ? <Alert severity="success">{t("pricing.saved", { count: done })}</Alert> : null}
        <Button variant="contained" disabled={!valid || !changed || save.isPending} onClick={() => save.mutate({ one_meal_price: one, two_meal_price: two, apply_to_existing: apply }, { onSuccess: (p) => setDone(p.updated_members) })}>
          {t("pricing.save")}
        </Button>
      </Stack>
    </Box>
  );
}

function ItemSheet({ item, onClose }: { item: TiffinItem | null | "new"; onClose: () => void }) {
  const { t } = useTranslation();
  const save = useSaveTiffinItem();
  const existing = item && item !== "new" ? item : null;
  const [name, setName] = useState(existing?.name ?? "");
  const [price, setPrice] = useState(existing ? String(Number(existing.price)) : "");
  const [food, setFood] = useState<FoodType>(existing?.food_type ?? "veg");
  const [active, setActive] = useState(existing?.is_active ?? true);
  const valid = name.trim() && money.test(price) && Number(price) > 0;
  return (
    <Drawer anchor="bottom" open={!!item} onClose={onClose} slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 2.5, pb: "calc(env(safe-area-inset-bottom) + 20px)", maxWidth: 600, mx: "auto" } } }}>
      <Stack spacing={2}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: brand.line, mx: "auto" }} />
        <Typography variant="h6">{existing ? t("pricing.editItem") : t("pricing.addItem")}</Typography>
        <TextField label={t("pricing.itemName")} placeholder={t("pricing.itemNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} autoFocus={!existing} />
        <TextField label={t("pricing.itemPrice")} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> } }} />
        <ToggleButtonGroup exclusive fullWidth value={food} onChange={(_, v: FoodType | null) => v && setFood(v)}>
          {(["veg", "egg", "nonveg"] as FoodType[]).map((f) => (
            <ToggleButton key={f} value={f} sx={{ minHeight: 48, gap: 1, fontWeight: 600 }}>
              <VegMark kind={f} /> {t(`food.${f}`)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {existing ? <FormControlLabel control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />} label={t("pricing.itemActive")} /> : null}
        {save.error ? <Alert severity="error">{t("common.error")}</Alert> : null}
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>{t("common.cancel")}</Button>
          <Button variant="contained" disabled={!valid || save.isPending} sx={{ flex: 1 }} onClick={() => save.mutate({ id: existing?.id, name: name.trim(), price, food_type: food, ...(existing ? { is_active: active } : {}) }, { onSuccess: onClose })}>
            {t("common.save")}
          </Button>
        </Box>
      </Stack>
    </Drawer>
  );
}

export function PricingPage() {
  const { t } = useTranslation();
  const pricing = usePricing();
  const items = useTiffinItems();
  const [editing, setEditing] = useState<TiffinItem | null | "new">(null);

  return (
    <Stack spacing={2.5}>
      <PageHeader title={t("pricing.title")} back="/owner/more" />

      <Box>
        <SectionTitle>{t("pricing.messSection")}</SectionTitle>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>{t("pricing.messHint")}</Typography>
        {pricing.data ? <MessPrices key={`${pricing.data.one_meal_price}-${pricing.data.two_meal_price}`} pricing={pricing.data} /> : <Skeleton variant="rounded" height={200} sx={{ borderRadius: "16px" }} />}
      </Box>

      <Divider />

      <Box>
        <SectionTitle action={<Button size="small" startIcon={<AddIcon />} onClick={() => setEditing("new")} sx={{ minHeight: 40 }}>{t("pricing.addItem")}</Button>}>
          {t("pricing.tiffinSection")}
        </SectionTitle>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>{t("pricing.tiffinHint")}</Typography>
        <Box sx={{ borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, overflow: "hidden" }}>
          {(items.data ?? []).map((it, i) => (
            <Box key={it.id} sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.75, py: 1.25, borderTop: i ? `1px solid ${brand.line}` : "none", opacity: it.is_active ? 1 : 0.5 }}>
              <VegMark kind={it.food_type} size={18} />
              <Typography sx={{ flex: 1, fontWeight: 600, lineHeight: 1.3 }}>{it.name}</Typography>
              <Typography sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{rupees(it.price)}</Typography>
              <IconButton aria-label={t("common.edit")} onClick={() => setEditing(it)}><EditIcon fontSize="small" /></IconButton>
            </Box>
          ))}
          {items.data && items.data.length === 0 ? (
            <Box sx={{ p: 2.5, textAlign: "center" }}>
              <ThaliIcon sx={{ color: brand.gold, fontSize: 36 }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>{t("pricing.noItems")}</Typography>
            </Box>
          ) : null}
        </Box>
      </Box>

      {editing ? <ItemSheet key={editing === "new" ? "new" : editing.id} item={editing} onClose={() => setEditing(null)} /> : null}
    </Stack>
  );
}
