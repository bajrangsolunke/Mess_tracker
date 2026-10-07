import { Box } from "@mui/material";

const VEG = "#15803D";
const EGG = "#D97706";
const NONVEG = "#7C2D12";
const COLORS = { veg: VEG, egg: EGG, nonveg: NONVEG } as const;

/** Indian food-label mark: green square + dot (veg), amber square + dot (egg), brown square + triangle (non-veg). */
export function VegMark({ kind, size = 16 }: { kind: "veg" | "egg" | "nonveg"; size?: number }) {
  const color = COLORS[kind];
  const inner = size * 0.5;
  return (
    <Box
      component="span"
      role="img"
      aria-label={kind}
      sx={{ width: size, height: size, border: `1.5px solid ${color}`, borderRadius: "3px", display: "inline-grid", placeItems: "center", flexShrink: 0, bgcolor: "#fff" }}
    >
      {kind === "nonveg" ? (
        <Box component="span" sx={{ width: 0, height: 0, borderLeft: `${inner / 2}px solid transparent`, borderRight: `${inner / 2}px solid transparent`, borderBottom: `${inner * 0.9}px solid ${color}` }} />
      ) : (
        <Box component="span" sx={{ width: inner, height: inner, borderRadius: "50%", bgcolor: color }} />
      )}
    </Box>
  );
}

export const VEG_COLOR = VEG;
export const EGG_COLOR = EGG;
export const NONVEG_COLOR = NONVEG;
export const FOOD_COLORS = COLORS;
