import type { ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";
import { BrandPattern } from "./BrandPattern";
import { ChefSays, type ChefPose } from "./ChefSays";
import { brand } from "../../app/theme";

/** Chef-led empty state: tells the user what this screen is for and what to do first. */
export function EmptyState({
  pose = "cooking",
  says,
  title,
  hint,
  actionLabel,
  onAction,
  icon,
}: {
  pose?: ChefPose;
  says: string;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <Box sx={{ position: "relative", pt: 4, pb: 6, px: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", overflow: "hidden" }}>
      <BrandPattern color={brand.red} opacity={0.05} />
      <Box sx={{ position: "relative" }}>
        <ChefSays pose={pose} align="center" size={120}>
          {says}
        </ChefSays>
      </Box>
      {icon ? <Box sx={{ color: brand.gold, mt: 3 }}>{icon}</Box> : null}
      <Typography variant="h5" component="h1" sx={{ mt: 2.5 }}>
        {title}
      </Typography>
      {hint ? (
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.75, maxWidth: 300 }}>
          {hint}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="contained" onClick={onAction} sx={{ mt: 3, minWidth: 220 }}>
          {actionLabel}
        </Button>
      ) : null}
    </Box>
  );
}
