import { createTheme, alpha } from "@mui/material/styles";

/** Brand palette — from the स्वाद branding sheet. */
export const brand = {
  maroon: "#B30000",
  maroonDark: "#8A0000",
  maroonDeep: "#5C0000",
  saffron: "#FF8A00",
  amber: "#FFC107",
  leaf: "#10B981",
  cream: "#F8F7F2",
  creamDark: "#F1EEE4",
  paper: "#FFFDF9",
  ink: "#2B1A1A",
  inkSoft: "#6E5A5A",
  line: "#E9E1D6",
} as const;

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: brand.maroon, dark: brand.maroonDark, light: "#D32F2F", contrastText: "#FFFDF9" },
    secondary: { main: brand.saffron, dark: "#E07400", light: "#FFA640", contrastText: "#2B1A1A" },
    success: { main: brand.leaf, contrastText: "#FFFDF9" },
    warning: { main: brand.saffron, light: brand.amber, contrastText: "#2B1A1A" },
    error: { main: "#D62828", contrastText: "#FFFDF9" },
    background: { default: brand.cream, paper: brand.paper },
    text: { primary: brand.ink, secondary: brand.inkSoft },
    divider: brand.line,
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Mukta", "Noto Sans Devanagari", system-ui, sans-serif',
    fontSize: 16,
    h4: { fontFamily: '"Baloo 2", "Mukta", sans-serif', fontWeight: 800, fontSize: "clamp(1.6rem, 6vw, 2rem)", lineHeight: 1.15 },
    h5: { fontFamily: '"Baloo 2", "Mukta", sans-serif', fontWeight: 700, fontSize: "clamp(1.35rem, 5vw, 1.6rem)", lineHeight: 1.2 },
    h6: { fontFamily: '"Baloo 2", "Mukta", sans-serif', fontWeight: 700, fontSize: "1.15rem", lineHeight: 1.25 },
    subtitle1: { fontWeight: 600, lineHeight: 1.35 },
    subtitle2: { fontWeight: 600, fontSize: "0.9rem", letterSpacing: 0.2 },
    body1: { fontSize: "1rem", lineHeight: 1.5 },
    body2: { fontSize: "0.9rem", lineHeight: 1.45 },
    caption: { fontSize: "0.8rem", color: brand.inkSoft },
    button: { textTransform: "none", fontWeight: 700, fontSize: "1rem", fontFamily: '"Mukta", sans-serif' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: brand.cream, WebkitFontSmoothing: "antialiased" },
        "@media (prefers-reduced-motion: reduce)": {
          "*": { animation: "none !important", transition: "none !important" },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, size: "large" },
      styleOverrides: {
        root: { minHeight: 52, borderRadius: 14, paddingInline: 20 },
        contained: {
          boxShadow: `0 6px 16px -6px ${alpha(brand.maroon, 0.55)}`,
          "&:hover": { backgroundColor: brand.maroonDark },
        },
        outlined: { borderWidth: 1.5, "&:hover": { borderWidth: 1.5 } },
      },
    },
    MuiTextField: { defaultProps: { fullWidth: true, variant: "outlined" } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundColor: brand.paper,
          "& fieldset": { borderColor: brand.line },
          "&:hover fieldset": { borderColor: alpha(brand.maroon, 0.4) },
          minHeight: 56,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        rounded: { borderRadius: 18 },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${brand.line}`,
          boxShadow: `0 10px 24px -18px ${alpha(brand.maroonDeep, 0.35)}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700, borderRadius: 999, height: 28 },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: { root: { backgroundColor: brand.paper, height: 68 } },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          minWidth: 48,
          color: brand.inkSoft,
          paddingTop: 8,
          "&.Mui-selected": { color: brand.maroon },
          "& .MuiBottomNavigationAction-label": { fontWeight: 600, fontSize: "0.75rem" },
          "& .MuiBottomNavigationAction-label.Mui-selected": { fontSize: "0.78rem" },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderColor: brand.line,
          "&.Mui-selected": {
            backgroundColor: alpha(brand.maroon, 0.08),
            color: brand.maroon,
            borderColor: alpha(brand.maroon, 0.5),
            "&:hover": { backgroundColor: alpha(brand.maroon, 0.12) },
          },
        },
      },
    },
  },
});
