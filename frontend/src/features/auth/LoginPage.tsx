import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Box, Button, Container, Stack, TextField, Typography } from "@mui/material";
import LanguageIcon from "@mui/icons-material/Language";
import { useLogin } from "../../api/useAuth";
import { ApiError } from "../../api/client";
import { HOME_BY_ROLE } from "./routes";

const schema = z.object({
  phone: z.string().regex(/^\d{10}$/, "auth.phoneRequired"),
  password: z.string().min(1, "auth.passwordRequired"),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useLogin();
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
        : login.error.message
      : login.error
        ? t("common.error")
        : null;

  return (
    <Container maxWidth="xs" sx={{ py: 6 }}>
      <Stack component="form" onSubmit={onSubmit} spacing={3} noValidate>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h5">{t("app.name")}</Typography>
          <Typography color="text.secondary">{t("auth.login")}</Typography>
        </Box>
        <TextField
          label={t("auth.phone")}
          type="tel"
          inputMode="numeric"
          autoComplete="username"
          error={!!errors.phone}
          helperText={errors.phone?.message ? t(errors.phone.message) : " "}
          {...register("phone", { setValueAs: (v: string) => v.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "") })}
        />
        <TextField
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          error={!!errors.password}
          helperText={errors.password?.message ? t(errors.password.message) : " "}
          {...register("password")}
        />
        {serverError && <Alert severity="error">{serverError}</Alert>}
        <Button type="submit" variant="contained" disabled={login.isPending}>
          {login.isPending ? t("common.loading") : t("auth.signIn")}
        </Button>
        <Button
          variant="text"
          startIcon={<LanguageIcon />}
          onClick={() => navigate("/select-language")}
        >
          {t("lang.select")}
        </Button>
      </Stack>
    </Container>
  );
}
