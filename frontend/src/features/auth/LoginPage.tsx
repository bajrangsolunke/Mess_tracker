import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LanguageIcon from "@mui/icons-material/LanguageRounded";
import VisibilityIcon from "@mui/icons-material/VisibilityRounded";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOffRounded";
import { useState } from "react";
import { useLogin } from "../../api/useAuth";
import { ApiError } from "../../api/client";
import { HOME_BY_ROLE } from "./routes";
import { brand } from "../../app/theme";
import { Logo } from "../../components/brand/Logo";
import { normalizePhoneInput } from "../../lib/phone";

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "auth.phoneRequired"),
  password: z.string().min(1, "auth.passwordRequired"),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useLogin();
  const [showPw, setShowPw] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { phone: "", password: "" } });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: (body) => navigate(HOME_BY_ROLE[body.user.role], { replace: true }),
    });
  });

  const serverError =
    login.error instanceof ApiError
      ? login.error.code === "INVALID_CREDENTIALS"
        ? t("auth.invalid")
        : login.error.code === "VALIDATION_ERROR"
          ? t("auth.phoneRequired")
          : t("common.error")
      : login.error
        ? t("common.error")
        : null;

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          position: "relative",
          background: `linear-gradient(180deg, ${brand.maroon}, ${brand.maroonDark})`,
          borderBottomLeftRadius: "36px",
          borderBottomRightRadius: "36px",
          pt: "calc(env(safe-area-inset-top) + 20px)",
          pb: 7,
          px: 3,
          color: brand.paper,
        }}
      >
        <IconButton
          aria-label={t("lang.select")}
          onClick={() => navigate("/select-language")}
          sx={{ position: "absolute", top: "calc(env(safe-area-inset-top) + 10px)", right: 10, color: "inherit" }}
        >
          <LanguageIcon />
        </IconButton>
        <Typography sx={{ fontFamily: '"Baloo 2"', fontWeight: 600, opacity: 0.85 }}>लातूरकर यांचे…</Typography>
        <Typography component="h1" sx={{ fontFamily: '"Baloo 2"', fontWeight: 800, fontSize: "2.6rem", lineHeight: 1, color: brand.amber }}>
          स्वाद
        </Typography>
        <Typography sx={{ fontFamily: '"Baloo 2"', fontWeight: 700 }}>भोजनालय &amp; नाश्ता हाऊस</Typography>
        <Logo
          variant="chef"
          height={150}
          sx={{ position: "absolute", right: 8, bottom: -6, filter: "drop-shadow(0 10px 16px rgba(0,0,0,.35))" }}
        />
      </Box>

      <Container maxWidth="xs" sx={{ flex: 1, pt: 3, pb: 4 }}>
        <Stack component="form" onSubmit={onSubmit} spacing={2} noValidate>
          <Box sx={{ mb: 0.5 }}>
            <Typography variant="h5" component="h2">
              {t("auth.login")}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {t("auth.loginHint")}
            </Typography>
          </Box>
          <TextField
            label={t("auth.phone")}
            type="tel"
            inputMode="numeric"
            autoComplete="username"
            error={!!errors.phone}
            helperText={errors.phone?.message ? t(errors.phone.message) : " "}
            {...register("phone", { setValueAs: (v: string) => normalizePhoneInput(v) })}
          />
          <TextField
            label={t("auth.password")}
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            error={!!errors.password}
            helperText={errors.password?.message ? t(errors.password.message) : " "}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")}
                      onClick={() => setShowPw((s) => !s)}
                      edge="end"
                    >
                      {showPw ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            {...register("password")}
          />
          {serverError && <Alert severity="error">{serverError}</Alert>}
          <Button type="submit" variant="contained" disabled={login.isPending}>
            {login.isPending ? t("common.loading") : t("auth.signIn")}
          </Button>
          <Typography variant="caption" sx={{ textAlign: "center", pt: 1 }}>
            {t("auth.noAccount")}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
