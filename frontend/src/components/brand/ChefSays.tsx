import { Box, Typography } from "@mui/material";
import { brand } from "../../app/theme";
import { Logo } from "./Logo";

export type ChefPose = "thumbsUp" | "waving" | "thali" | "cooking" | "sleeping" | "celebrating" | "confused";

/* Pose slot: one illustration today (thumbs up). Drop new poses into assets/brand/chef-<pose>.png
   and map them here — every usage site already passes a pose. */
const POSES: Partial<Record<ChefPose, "chef">> = {};

/** Chef Anna with a speech bubble. Gives the mascot a voice across greetings, empty states and success. */
export function ChefSays({
  pose = "thumbsUp",
  children,
  size = 88,
  align = "left",
}: {
  pose?: ChefPose;
  children: React.ReactNode;
  size?: number;
  align?: "left" | "center";
}) {
  const variant = POSES[pose] ?? "chef";
  return (
    <Box sx={{ display: "flex", alignItems: align === "center" ? "center" : "flex-end", gap: 1.5, flexDirection: align === "center" ? "column" : "row", textAlign: align }}>
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: "50%",
          bgcolor: brand.cream,
          overflow: "hidden",
          display: "grid",
          placeItems: "end center",
          flexShrink: 0,
          border: `2px solid ${brand.line}`,
        }}
      >
        <Logo variant={variant} height={size * 0.92} />
      </Box>
      <Box
        sx={{
          position: "relative",
          bgcolor: brand.paper,
          border: `1px solid ${brand.line}`,
          borderRadius: "16px",
          px: 2,
          py: 1.25,
          mb: align === "left" ? 1 : 0,
          maxWidth: 320,
          "&::before": align === "left"
            ? { content: '""', position: "absolute", left: -7, bottom: 14, width: 12, height: 12, bgcolor: brand.paper, borderLeft: `1px solid ${brand.line}`, borderBottom: `1px solid ${brand.line}`, transform: "rotate(45deg)" }
            : undefined,
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {children}
        </Typography>
      </Box>
    </Box>
  );
}
