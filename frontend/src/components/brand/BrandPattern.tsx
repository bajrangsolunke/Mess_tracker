import { Box, type SxProps, type Theme } from "@mui/material";

/** Repeating food motifs (thali, spoon, leaf, grain) at low opacity. Decorative only. */
export function BrandPattern({ color = "#FFFFFF", opacity = 0.08, sx }: { color?: string; opacity?: number; sx?: SxProps<Theme> }) {
  const svg = encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160' fill='none' stroke='${color}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>
  <circle cx='30' cy='30' r='14'/><circle cx='30' cy='30' r='6'/>
  <path d='M110 20c0 8-4 12-4 20v14M104 20c0 4 2 6 3 6s3-2 3-6'/>
  <path d='M24 120c0-14 10-24 26-26-2 16-12 26-26 26z'/><path d='M24 120c6-7 12-13 20-18'/>
  <path d='M118 112c-6 6-6 14 0 20 6-6 6-14 0-20zM118 112v22'/>
  <path d='M70 72h20M80 62v20'/>
</svg>`);
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        backgroundSize: "160px 160px",
        ...sx,
      }}
    />
  );
}
