import { Box, type SxProps, type Theme } from "@mui/material";
import logoFull from "../../assets/brand/logo-full.png";
import chef from "../../assets/brand/chef.png";
import wordmark from "../../assets/brand/wordmark.png";

type Variant = "full" | "chef" | "wordmark";
const SRC: Record<Variant, string> = { full: logoFull, chef, wordmark };

export function Logo({
  variant = "full",
  height = 48,
  sx,
}: {
  variant?: Variant;
  height?: number | string;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box
      component="img"
      src={SRC[variant]}
      alt="स्वाद भोजनालय & नाश्ता हाऊस"
      draggable={false}
      sx={{ height, width: "auto", display: "block", userSelect: "none", ...sx }}
    />
  );
}
