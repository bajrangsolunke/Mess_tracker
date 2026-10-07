import { Box, ButtonBase, InputBase, alpha } from "@mui/material";
import AddIcon from "@mui/icons-material/AddRounded";
import RemoveIcon from "@mui/icons-material/RemoveRounded";

/** Large − [n] + control for counts. Typing a number works too. */
export function CountStepper({ value, onChange, color, label, disabled }: { value: number; onChange: (n: number) => void; color: string; label: string; disabled?: boolean }) {
  const set = (n: number) => onChange(Math.max(0, Math.min(5000, Number.isFinite(n) ? Math.round(n) : 0)));
  const btn = {
    width: 44,
    height: 44,
    borderRadius: "12px",
    bgcolor: alpha(color, 0.1),
    color,
    flexShrink: 0,
    "&:active": { transform: "scale(.94)" },
    "&.Mui-disabled": { opacity: 0.4 },
  } as const;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <ButtonBase aria-label={`${label} −`} sx={btn} disabled={disabled || value <= 0} onClick={() => set(value - 1)}>
        <RemoveIcon />
      </ButtonBase>
      <InputBase
        value={value === 0 ? "" : String(value)}
        placeholder="0"
        disabled={disabled}
        onChange={(e) => set(Number(e.target.value.replace(/\D/g, "") || 0))}
        onFocus={(e) => e.target.select()}
        inputProps={{ inputMode: "numeric", "aria-label": label, style: { textAlign: "center", fontWeight: 800, fontSize: "1.2rem", padding: 0 } }}
        sx={{ width: 56, height: 44, borderRadius: "12px", border: `1.5px solid ${alpha(color, 0.35)}`, color: "text.primary", fontVariantNumeric: "tabular-nums" }}
      />
      <ButtonBase aria-label={`${label} +`} sx={btn} disabled={disabled} onClick={() => set(value + 1)}>
        <AddIcon />
      </ButtonBase>
    </Box>
  );
}
