import { IconButton, Tooltip, alpha, keyframes } from "@mui/material";
import MicIcon from "@mui/icons-material/MicRounded";
import MicOffIcon from "@mui/icons-material/MicOffRounded";
import { useTranslation } from "react-i18next";
import { brand } from "../app/theme";
import { useVoiceInput, voiceSupported } from "../lib/speech";

const pulse = keyframes`0% { box-shadow: 0 0 0 0 ${alpha(brand.red, 0.45)} } 70% { box-shadow: 0 0 0 12px ${alpha(brand.red, 0)} } 100% { box-shadow: 0 0 0 0 ${alpha(brand.red, 0)} }`;

/** 🎤 next to a search box: speak a name or ID (in the app's language) instead of typing. */
export function MicButton({ onText }: { onText: (text: string) => void }) {
  const { t, i18n } = useTranslation();
  const { listening, error, start, stop } = useVoiceInput(i18n.language, (text) => onText(text));
  if (!voiceSupported()) return null;
  const label = error === "denied" ? t("voice.denied") : listening ? t("voice.listening") : t("voice.speak");
  return (
    <Tooltip title={label} open={listening || error === "denied" ? true : undefined} placement="bottom-end" arrow>
      <IconButton
        aria-label={label}
        onClick={() => (listening ? stop() : start())}
        sx={{
          width: 40,
          height: 40,
          color: listening ? "#fff" : brand.red,
          bgcolor: listening ? brand.red : alpha(brand.red, 0.08),
          animation: listening ? `${pulse} 1.4s infinite` : "none",
          "&:hover": { bgcolor: listening ? brand.redDark : alpha(brand.red, 0.14) },
        }}
      >
        {error === "denied" ? <MicOffIcon /> : <MicIcon />}
      </IconButton>
    </Tooltip>
  );
}
