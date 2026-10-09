import { Box } from "@mui/material";
import { brand } from "../../app/theme";

const PALETTE = ["#B91C1C", "#B45309", "#15803D", "#7C2D12", "#9D174D", "#1D4ED8"];

/** Initials avatar tinted from the name so the same member always gets the same colour. */
export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const color = PALETTE[hash % PALETTE.length];
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: `${color}1A`,
        color,
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize: size * 0.38,
        flexShrink: 0,
        border: `1px solid ${brand.line}`,
      }}
    >
      {initials}
    </Box>
  );
}
