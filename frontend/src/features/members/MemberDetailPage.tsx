import { useState } from "react";
import { Box, Button, Divider, Skeleton, Stack, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/EditRounded";
import KeyIcon from "@mui/icons-material/KeyRounded";
import PhoneIcon from "@mui/icons-material/PhoneRounded";
import PersonOffIcon from "@mui/icons-material/PersonOffRounded";
import PersonIcon from "@mui/icons-material/PersonRounded";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMember, useResetMemberPassword, useSetMemberStatus } from "../../api/useMembers";
import { PageHeader } from "../../components/brand/PageHeader";
import { Avatar } from "../../components/brand/Avatar";
import { StatusChip } from "../../components/brand/StatusChip";
import { TempPasswordDialog } from "./TempPasswordDialog";
import { planLabel } from "./planLabel";
import { rupees } from "../../lib/money";
import { formatDateLong } from "../../lib/date";
import { brand } from "../../app/theme";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 1.25 }}>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 600, textAlign: "right" }}>
        {value || "—"}
      </Typography>
    </Box>
  );
}

export function MemberDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const memberId = Number(id);
  const { data: m, isLoading } = useMember(memberId);
  const setStatus = useSetMemberStatus();
  const resetPw = useResetMemberPassword();
  const [temp, setTemp] = useState<string | null>(null);

  if (isLoading || !m) {
    return (
      <Stack spacing={2}>
        <PageHeader title=" " back="/owner/members" />
        <Skeleton variant="rounded" height={120} sx={{ borderRadius: "16px" }} />
        <Skeleton variant="rounded" height={240} sx={{ borderRadius: "16px" }} />
      </Stack>
    );
  }

  const active = m.status === "active";

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title={t("members.profile")}
        back="/owner/members"
        action={
          <Button variant="outlined" size="medium" startIcon={<EditIcon />} onClick={() => navigate(`/owner/members/${m.id}/edit`)} sx={{ minHeight: 44 }}>
            {t("common.edit")}
          </Button>
        }
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
        <Avatar name={m.name} size={60} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {m.name}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {planLabel(m, t)} · {rupees(m.monthly_fee)}/{t("members.perMonth")}
          </Typography>
          <Box sx={{ mt: 0.75 }}>
            <StatusChip status={m.status} />
          </Box>
        </Box>
        <Button component="a" href={`tel:+91${m.phone}`} variant="outlined" sx={{ minWidth: 48, px: 1.25 }} aria-label={t("members.call")}>
          <PhoneIcon />
        </Button>
      </Box>

      <Box sx={{ px: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
        <Row label={t("auth.phone")} value={`+91 ${m.phone}`} />
        <Divider />
        <Row label={t("members.room")} value={m.room_no} />
        <Divider />
        <Row label={t("members.plan")} value={m.plan.name} />
        <Divider />
        <Row label={t("members.joiningDate")} value={formatDateLong(m.joining_date, i18n.language)} />
        <Divider />
        <Row label={t("members.deposit")} value={rupees(m.deposit)} />
        <Divider />
        <Row label={t("members.emergencyContact")} value={m.emergency_contact} />
        {m.notes ? (
          <>
            <Divider />
            <Box sx={{ py: 1.25 }}>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("members.notes")}
              </Typography>
              <Typography sx={{ whiteSpace: "pre-wrap" }}>{m.notes}</Typography>
            </Box>
          </>
        ) : null}
        {!active && m.inactive_from ? (
          <>
            <Divider />
            <Row label={t("members.inactiveFrom")} value={formatDateLong(m.inactive_from, i18n.language)} />
          </>
        ) : null}
      </Box>

      <Stack spacing={1.5}>
        <Button
          variant="outlined"
          startIcon={<KeyIcon />}
          disabled={!m.user_id || resetPw.isPending}
          onClick={() => resetPw.mutate(m.id, { onSuccess: (r) => setTemp(r.temp_password) })}
        >
          {t("members.resetPassword")}
        </Button>
        <Button
          variant="outlined"
          color={active ? "error" : "success"}
          startIcon={active ? <PersonOffIcon /> : <PersonIcon />}
          disabled={setStatus.isPending}
          onClick={() => setStatus.mutate({ id: m.id, active: !active })}
        >
          {active ? t("members.deactivate") : t("members.activate")}
        </Button>
      </Stack>

      {temp ? <TempPasswordDialog open name={m.name} phone={m.phone} password={temp} onClose={() => setTemp(null)} /> : null}
    </Stack>
  );
}
