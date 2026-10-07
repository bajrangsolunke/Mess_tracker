# स्वाद — Brand Guide (app)

**Identity:** Traditional Taste × Modern Technology. Tagline: *घरच्या चवीचा विश्वास* / *Authentic Taste · Modern Experience*.

| Token | Value | Use |
|-------|-------|-----|
| red | `#B91C1C` | primary actions, app bar, active nav |
| redDark / redDeep / maroonInk | `#991B1B` / `#5F0F0F` / `#3B0A0A` | hover, splash depth |
| gold | `#F59E0B` (dark `#B45309`) | accent, wordmark on red, pending |
| green | `#16A34A` (dark `#15803D`) | success, present, paid |
| cream / bg / paper | `#FFF8F0` / `#FEFCF8` / `#FFFFFF` | surfaces |
| ink / inkSoft / line | `#1F1414` / `#6B5B5B` / `#F0E4D8` | text, borders |

**Type:** Poppins (Latin), Noto Sans Devanagari (hi/mr). Headings 700, body 400–600. Base 16px.

**Shape:** 14px buttons/inputs, 16–18px cards, 28px hero panels. Gradient only on primary buttons (red → gold).

**Components:** `BrandBar`, `StatCard`, `QuickAction`, `StatusChip`, `MealCard`, `SectionTitle`, `ChefSays`, `EmptyState`, `BrandPattern`, custom icons in `components/brand/icons.tsx`.

**Mascot — Chef Anna:** one pose today (thumbs up). Add poses as `assets/brand/chef-<pose>.png` and map them in `ChefSays.tsx` (`POSES`). Planned: waving (splash/greeting), thali (menu), cooking (empty), sleeping (closed day), celebrating (payment success), confused (no menu).

**Pattern:** thali, spoon, leaf, grain, plus — 160px tile, 5–8% opacity, decorative only.

**Out of scope for code (needs design assets):** mascot poses, food photography, receipts, social templates, packaging, sounds.
