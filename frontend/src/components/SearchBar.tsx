import { InputAdornment, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/SearchRounded";
import CloseIcon from "@mui/icons-material/CloseRounded";
import { IconButton } from "@mui/material";
import { MicButton } from "./MicButton";

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type="text"
      inputMode="search"
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: "text.secondary" }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end" sx={{ gap: 0.5 }}>
              {value ? (
                <IconButton size="small" aria-label="clear" onClick={() => onChange("")}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              ) : null}
              <MicButton onText={onChange} />
            </InputAdornment>
          ),
          sx: { minHeight: 52 },
        },
      }}
    />
  );
}
