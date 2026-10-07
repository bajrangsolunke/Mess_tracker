# Design review — 2026-10-07

Reviewed every screen in Chromium at 360×780 and 768×900, measured DOM sizes, and checked fonts actually loaded (Poppins + Noto Sans Devanagari confirmed). Screenshots in `screens/`.

## Verdict
Does not read as generic AI output: the mascot, red/gold/cream palette, Devanagari type and custom food icons give it a real identity. Weak points were structural, not stylistic: wasted space above the fold, an unbranded splash, a neglected bottom nav and no spacing scale.

## Fixed in this pass

| # | Screen | Issue | Fix |
|---|--------|-------|-----|
| 1 | Splash | Logo artwork never shown; brand lines retyped in system font next to a cropped chef | Full logo on a cream 28px card with ring shadow; typed duplicates removed; tagline mr + en kept; steam rises above the card |
| 2 | Owner home | Full-width Members tile with one dash; chef bubble repeated the greeting | Three-up stat row under "आज एका नजरेत" with short labels (दुपार / रात्री); chef now states the next action ("attendance not marked yet, start?") |
| 3 | Bottom nav | Labels rendered in Arial 13px (font not inherited); height 64 vs theme 70; labels < 12px | Font set on action root and label; 72px with top hairline; 12px labels |
| 4 | All | Spacing values 10/12/14/20/28 mixed | 8-pt scale: 12px grid gaps, 16px card padding, 24px between sections, 24px container top |
| 5 | Home | Logout as a loose text row on the home screen | Removed; real More (owner) and Profile (customer) pages with identity card, language row, logout |
| 6 | Quick actions | Marathi labels wrapped unevenly against a bare icon | Icon in 40px tinted square, label 15px/1.25, 76px tile, white surface with hairline |
| 7 | Stat cards | Values misaligned when one label wrapped | Label row fixed at 24px; value h5 |
| 8 | Home | "Pending" chip shown next to a dash | Chip only renders when an amount exists |
| 9 | Home | Menu section action was "Announce" | Now "मेनू बदला" (edit menu) |
| 10 | App bar | Subtitle 11px | 12.5px Noto Sans Devanagari; toolbar 64px |
| 11 | Login | Globe icon touched the chef's hat | Header 8 units taller, chef 124px |
| 12 | Onboarding | 300px panel around a 64px icon | 240px panel, 120px disc, 60px icon |
| 13 | Language | Logo card small | Logo 88px; "Continue" returns to role home when already logged in |

## Still open (needs assets or later phases)
- Mascot poses: one illustration reused everywhere. `ChefSays` has a pose slot ready.
- Steam on splash is a CSS blur; a drawn steam asset would look sharper.
- Change-password row in Profile is disabled until Phase 2.
- Tablet (768px) is a centred phone layout. Acceptable for V1; a two-column dashboard can come with reports.
- Dark mode not designed.

## Spacing and size reference
- Touch targets ≥ 48px (buttons 52, nav 72, list rows 60, quick actions 76).
- Type: h5 20.8px, body 16px, secondary 14.4px, caption 12.5px, nav 12px. No text under 12px.
- Radii: inputs/buttons 14px, cards 16px, hero panels 28px, app bar 22px bottom corners.
- Horizontal gutter 16px at phone width; content max 600px.
