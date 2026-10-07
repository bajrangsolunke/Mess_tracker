import { createTheme, alpha } from "@mui/material/styles";

/** स्वाद brand tokens — "Traditional Taste × Modern Technology". */
export const brand = {
  red: "#B91C1C",
  redDark: "#991B1B",
  redDeep: "#5F0F0F",
  maroonInk: "#3B0A0A",
  gold: "#F59E0B",
  goldDark: "#B45309",
  goldSoft: "#FDE68A",
  green: "#16A34A",
  greenDark: "#15803D",
  cream: "#FFF8F0",
  bg: "#FEFCF8",
  paper: "#FFFFFF",
  ink: "#1F1414",
  inkSoft: "#6B5B5B",
  line: "#F0E4D8",
  tagline: { mr: "घरच्या चवीचा विश्वास", en: "Authentic Taste · Modern Experience" },
} as const;

export const FONT_LATIN = '"Poppins", "Noto Sans Devanagari", system-ui, sans-serif';
export const FONT_DEVA = '"Noto Sans Devanagari", "Poppins", system-ui, sans-serif';

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: brand.red, dark: brand.redDark, light: "#DC2626", contrastText: "#FFFFFF" },
    secondary: { main: brand.gold, dark: brand.goldDark, light: "#FBBF24", contrastText: brand.ink },
    success: { main: brand.green, dark: brand.greenDark, contrastText: "#FFFFFF" },
    warning: { main: brand.gold, dark: brand.goldDark, contrastText: brand.ink },
    error: { main: "#DC2626", contrastText: "#FFFFFF" },
    background: { default: brand.bg, paper: brand.paper },
    text: { primary: brand.ink, secondary: brand.inkSoft },
    divider: brand.line,
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: FONT_LATIN,
    fontSize: 16,
    h4: { fontWeight: 700, fontSize: "clamp(1.5rem, 6vw, 1.9rem)", lineHeight: 1.2, letterSpacing: -0.3 },
    h5: { fontWeight: 700, fontSize: "clamp(1.3rem, 5vw, 1.5rem)", lineHeight: 1.25, letterSpacing: -0.2 },
    h6: { fontWeight: 600, fontSize: "1.1rem", lineHeight: 1.3 },
    subtitle1: { fontWeight: 600, lineHeight: 1.4 },
    subtitle2: { fontWeight: 600, fontSize: "0.85rem", letterSpacing: 0.2 },
    body1: { fontSize: "1rem", lineHeight: 1.55 },
    body2: { fontSize: "0.9rem", lineHeight: 1.5 },
    caption: { fontSize: "0.78rem", color: brand.inkSoft },
    button: { textTransform: "none", fontWeight: 600, fontSize: "1rem" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: brand.bg, WebkitFontSmoothing: "antialiased" },
        "@media (prefers-reduced-motion: reduce)": {
          "*": { animation: "none !important", transition: "none !important" },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, size: "large" },
      styleOverrides: {
        root: { minHeight: 52, borderRadius: 14, paddingInline: 22 },
        contained: {
          backgroundImage: `linear-gradient(135deg, ${brand.red} 0%, #E0421F 60%, ${brand.gold} 160%)`,
          boxShadow: `0 10px 20px -10px ${alpha(brand.red, 0.6)}`,
          "&:hover": { backgroundImage: `linear-gradient(135deg, ${brand.redDark} 0%, #C9381A 60%, ${brand.goldDark} 160%)` },
          "&.Mui-disabled": { backgroundImage: "none" },
        },
        outlined: { borderWidth: 1.5, borderColor: brand.line, backgroundColor: brand.paper, "&:hover": { borderWidth: 1.5, borderColor: alpha(brand.red, 0.4), backgroundColor: brand.cream } },
      },
    },
    MuiTextField: { defaultProps: { fullWidth: true, variant: "outlined" } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: brand.paper,
          minHeight: 56,
          "& fieldset": { borderColor: brand.line },
          "&:hover fieldset": { borderColor: alpha(brand.red, 0.4) },
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" }, rounded: { borderRadius: 18 } } },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: `1px solid ${brand.line}` } },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 999, height: 28 } } },
    MuiBottomNavigation: { styleOverrides: { root: { backgroundColor: brand.paper, height: 72, borderTop: `1px solid ${brand.line}` } } },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 56,
          color: brand.inkSoft,
          paddingTop: 10,
          paddingBottom: 8,
          fontFamily: FONT_LATIN,
          "&.Mui-selected": { color: brand.red },
          "& .MuiBottomNavigationAction-label": { fontFamily: FONT_LATIN, fontWeight: 600, fontSize: "0.75rem", lineHeight: 1.2, marginTop: 4 },
          "& .MuiBottomNavigationAction-label.Mui-selected": { fontSize: "0.75rem" },
        },
      },
    },
  },
});
