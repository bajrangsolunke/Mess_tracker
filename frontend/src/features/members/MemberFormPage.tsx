import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Alert, Box, Button, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { usePlans } from "../../api/usePlans";
import { useCreateMember, useMember, useUpdateMember } from "../../api/useMembers";
import { ApiError } from "../../api/client";
import { PageHeader } from "../../components/brand/PageHeader";
import { TempPasswordDialog } from "./TempPasswordDialog";
import { normalizePhoneInput } from "../../lib/phone";
import { todayIst } from "../../lib/date";
import { rupees } from "../../lib/money";

const money = z.string().regex(/^\d{1,8}(\.\d{1,2})?$/, "members.invalidAmount");

const schema = z.object({
  name: z.string().trim().min(1, "members.nameRequired").max(120),
  phone: z.string().regex(/^[6-9]\d{9}$/, "auth.phoneRequired"),
  plan_id: z.number().int().positive("members.planRequired"),
  joining_date: z.string().min(1),
  monthly_fee: money,
  room_no: z.string().trim().max(30),
  member_type: z.enum(["dine_in", "tiffin"]),
  company: z.string().trim().max(120),
  delivery_address: z.string().trim().max(300),
  deposit: money,
  emergency_contact: z.string().trim().max(120),
  notes: z.string().trim().max(2000),
});
type FormValues = z.infer<typeof schema>;

export function MemberFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const memberId = id ? Number(id) : undefined;
  const editing = memberId !== undefined;
  const plans = usePlans();
  const existing = useMember(memberId);
  const create = useCreateMember();
  const update = useUpdateMember();
  const [created, setCreated] = useState<{ name: string; phone: string; password: string } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      plan_id: 0,
      joining_date: todayIst(),
      monthly_fee: "",
      room_no: "",
      member_type: "dine_in",
      company: "",
      delivery_address: "",
      deposit: "0",
      emergency_contact: "",
      notes: "",
    },
  });
  const { register, handleSubmit, control, setValue, reset, formState: { errors } } = form;

  useEffect(() => {
    if (existing.data) {
      const m = existing.data;
      reset({
        name: m.name,
        phone: m.phone,
        plan_id: m.plan.id,
        joining_date: m.joining_date,
        monthly_fee: String(Number(m.monthly_fee)),
        room_no: m.room_no ?? "",
        member_type: m.member_type,
        company: m.company ?? "",
        delivery_address: m.delivery_address ?? "",
        deposit: String(Number(m.deposit)),
        emergency_contact: m.emergency_contact ?? "",
        notes: m.notes ?? "",
      });
    }
  }, [existing.data, reset]);

  const planId = useWatch({ control, name: "plan_id" });
  const memberType = useWatch({ control, name: "member_type" });
  const activePlans = (plans.data ?? []).filter((p) => p.is_active || p.id === planId);

  // Default the fee to the chosen plan's fee when creating.
  useEffect(() => {
    if (editing) return;
    const p = plans.data?.find((x) => x.id === planId);
    if (p) setValue("monthly_fee", String(Number(p.monthly_fee)), { shouldValidate: true });
  }, [planId, plans.data, editing, setValue]);

  const onSubmit = handleSubmit((v) => {
    const common = {
      name: v.name,
      plan_id: v.plan_id,
      joining_date: v.joining_date,
      monthly_fee: v.monthly_fee,
      room_no: v.room_no || null,
      member_type: v.member_type,
      company: v.member_type === "tiffin" ? v.company || null : null,
      delivery_address: v.member_type === "tiffin" ? v.delivery_address || null : null,
      deposit: v.deposit || "0",
      emergency_contact: v.emergency_contact || null,
      notes: v.notes || null,
    };
    if (editing) {
      update.mutate({ id: memberId, ...common }, { onSuccess: () => navigate(`/owner/members/${memberId}`, { replace: true }) });
    } else {
      create.mutate(
        { ...common, phone: v.phone, create_login: true },
        {
          onSuccess: (res) => {
            if (res.temp_password) setCreated({ name: res.member.name, phone: res.member.phone, password: res.temp_password });
            else navigate(`/owner/members/${res.member.id}`, { replace: true });
          },
        },
      );
    }
  });

  const err = (create.error ?? update.error) as unknown;
  const serverError = err instanceof ApiError ? (err.code === "DUPLICATE_PHONE" ? t("members.duplicatePhone") : err.message) : err ? t("common.error") : null;
  const pending = create.isPending || update.isPending;
  const helper = (key?: string) => (key ? t(key) : " ");

  return (
    <Stack component="form" onSubmit={onSubmit} noValidate spacing={1}>
      <PageHeader title={editing ? t("members.edit") : t("members.add")} back={editing ? `/owner/members/${memberId}` : "/owner/members"} />

      {plans.data && plans.data.length === 0 ? (
        <Alert severity="warning" action={<Button size="small" onClick={() => navigate("/owner/plans")}>{t("plans.create")}</Button>}>
          {t("members.noPlansYet")}
        </Alert>
      ) : null}

      <Controller
        control={control}
        name="member_type"
        render={({ field }) => (
          <ToggleButtonGroup exclusive fullWidth value={field.value} onChange={(_, v: "dine_in" | "tiffin" | null) => v && field.onChange(v)} sx={{ mb: 1 }}>
            <ToggleButton value="dine_in" sx={{ minHeight: 52, fontWeight: 600 }}>{t("members.type.dine_in")}</ToggleButton>
            <ToggleButton value="tiffin" sx={{ minHeight: 52, fontWeight: 600 }}>{t("members.type.tiffin")}</ToggleButton>
          </ToggleButtonGroup>
        )}
      />
      <TextField label={t("members.name")} autoFocus={!editing} error={!!errors.name} helperText={helper(errors.name?.message)} {...register("name")} />
      <TextField
        label={t("auth.phone")}
        type="tel"
        inputMode="numeric"
        disabled={editing}
        error={!!errors.phone}
        helperText={editing ? t("members.phoneLocked") : helper(errors.phone?.message)}
        {...register("phone", { setValueAs: (v: string) => normalizePhoneInput(v) })}
      />
      <Controller
        control={control}
        name="plan_id"
        render={({ field }) => (
          <TextField select label={t("members.plan")} value={field.value || ""} onChange={(e) => field.onChange(Number(e.target.value))} error={!!errors.plan_id} helperText={helper(errors.plan_id?.message)}>
            {activePlans.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} · {rupees(p.monthly_fee)}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <TextField label={t("members.monthlyFee")} inputMode="decimal" error={!!errors.monthly_fee} helperText={helper(errors.monthly_fee?.message)} {...register("monthly_fee")} />
        <TextField label={t("members.joiningDate")} type="date" slotProps={{ inputLabel: { shrink: true } }} error={!!errors.joining_date} helperText=" " {...register("joining_date")} />
      </Box>
      {memberType === "tiffin" ? (
        <>
          <TextField label={t("members.company")} helperText=" " {...register("company")} />
          <TextField label={t("members.deliveryAddress")} multiline minRows={2} helperText=" " {...register("delivery_address")} />
        </>
      ) : null}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <TextField label={t("members.room")} error={!!errors.room_no} helperText=" " {...register("room_no")} />
        <TextField label={t("members.deposit")} inputMode="decimal" error={!!errors.deposit} helperText={helper(errors.deposit?.message)} {...register("deposit")} />
      </Box>
      <TextField label={t("members.emergencyContact")} type="tel" helperText=" " {...register("emergency_contact")} />
      <TextField label={t("members.notes")} multiline minRows={2} helperText=" " {...register("notes")} />

      {serverError ? <Alert severity="error">{serverError}</Alert> : null}
      {!editing ? (
        <Typography variant="caption" sx={{ px: 0.5 }}>
          {t("members.loginNote")}
        </Typography>
      ) : null}
      <Button type="submit" variant="contained" disabled={pending || (plans.data?.length ?? 0) === 0} sx={{ mt: 1 }}>
        {pending ? t("common.loading") : editing ? t("common.save") : t("members.add")}
      </Button>

      {created ? (
        <TempPasswordDialog
          open
          name={created.name}
          phone={created.phone}
          password={created.password}
          onClose={() => navigate("/owner/members", { replace: true })}
        />
      ) : null}
    </Stack>
  );
}
