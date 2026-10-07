import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mt: 1, mb: 1 }}>
      <Typography variant="h6" component="h2">
        {children}
      </Typography>
      {action}
    </Box>
  );
}
