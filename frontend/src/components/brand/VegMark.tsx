import { Box } from "@mui/material";

const VEG = "#15803D";
const NONVEG = "#7C2D12";

/** Indian food-label mark: green square + dot for veg, brown square + triangle for non-veg. */
export function VegMark({ kind, size = 16 }: { kind: "veg" | "nonveg"; size?: number }) {
  const color = kind === "veg" ? VEG : NONVEG;
  const inner = size * 0.5;
  return (
    <Box
      component="span"
      role="img"
      aria-label={kind === "veg" ? "veg" : "non-veg"}
      sx={{ width: size, height: size, border: `1.5px solid ${color}`, borderRadius: "3px", display: "inline-grid", placeItems: "center", flexShrink: 0, bgcolor: "#fff" }}
    >
      {kind === "veg" ? (
        <Box component="span" sx={{ width: inner, height: inner, borderRadius: "50%", bgcolor: color }} />
      ) : (
        <Box component="span" sx={{ width: 0, height: 0, borderLeft: `${inner / 2}px solid transparent`, borderRight: `${inner / 2}px solid transparent`, borderBottom: `${inner * 0.9}px solid ${color}` }} />
      )}
    </Box>
  );
}

export const VEG_COLOR = VEG;
export const NONVEG_COLOR = NONVEG;
