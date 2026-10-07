import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: { main: "#10B981", contrastText: "#FFFFFF" },
    success: { main: "#10B981" },
    warning: { main: "#F59E0B" },
    error: { main: "#EF4444" },
    background: { default: "#F9FAFB", paper: "#FFFFFF" },
    text: { primary: "#111827", secondary: "#6B7280" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Noto Sans", "Noto Sans Devanagari", Roboto, system-ui, sans-serif',
    fontSize: 16,
    h5: { fontWeight: 700, fontSize: "1.5rem" },
    h6: { fontWeight: 600, fontSize: "1.25rem" },
    button: { textTransform: "none", fontWeight: 600, fontSize: "1rem" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true, size: "large" },
      styleOverrides: { root: { minHeight: 48 } },
    },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiBottomNavigationAction: { styleOverrides: { root: { minWidth: 48, minHeight: 56 } } },
  },
});
