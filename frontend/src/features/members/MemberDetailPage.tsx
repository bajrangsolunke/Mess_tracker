import { useState } from "react";
import { Box, Button, Divider, Skeleton, Stack, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/EditRounded";
import KeyIcon from "@mui/icons-material/KeyRounded";
import PhoneIcon from "@mui/icons-material/PhoneRounded";
import PersonOffIcon from "@mui/icons-material/PersonOffRounded";
import PersonIcon from "@mui/icons-material/PersonRounded";
import { PlateCheckIcon } from "../../components/brand/icons";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMember, useResetMemberPassword, useRotateShareLink, useSetMemberStatus } from "../../api/useMembers";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import LinkIcon from "@mui/icons-material/LinkRounded";
import { alpha } from "@mui/material";
import { useSession } from "../auth/authStore";
import { shareLinkText, whatsappUrl } from "../../lib/share";
import { PageHeader } from "../../components/brand/PageHeader";
import { Avatar } from "../../components/brand/Avatar";
import { StatusChip } from "../../components/brand/StatusChip";
import { TempPasswordDialog } from "./TempPasswordDialog";
import { planLabel } from "./planLabel";
import { MembershipBadge } from "./MembershipBadge";
import { RenewSheet } from "../membership/RenewSheet";
import { planName } from "../../lib/plans";
import AutorenewIcon from "@mui/icons-material/AutorenewRounded";
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
  const rotate = useRotateShareLink();
  const { organization } = useSession();
  const [temp, setTemp] = useState<string | null>(null);
  const [renewing, setRenewing] = useState(false);

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
  const due = Number(m.due);

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
          <Typography variant="body2" sx={{ fontWeight: 800, color: brand.red }}>#{m.member_no}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {planLabel(m, t)} · {rupees(m.monthly_fee)}/{t("members.perMonth")}
          </Typography>
          <Box sx={{ mt: 0.75, display: "flex", gap: 0.75, alignItems: "center" }}>
            <StatusChip status={m.status} />
          </Box>
        </Box>
        <Button component="a" href={`tel:+91${m.phone}`} variant="outlined" sx={{ minWidth: 48, px: 1.25 }} aria-label={t("members.call")}>
          <PhoneIcon />
        </Button>
      </Box>

      {m.valid_until ? (
        <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
            <Box>
              <Typography variant="caption">{t("membership.validUntilLabel")}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>{formatDateLong(m.valid_until, i18n.language)}</Typography>
              <MembershipBadge validUntil={m.valid_until} always />
            </Box>
            <Button variant="contained" startIcon={<AutorenewIcon />} onClick={() => setRenewing(true)} sx={{ minHeight: 44 }}>{t("membership.renew")}</Button>
          </Box>
          {m.next_plan && m.next_plan_from ? (
            <Typography variant="body2" sx={{ mt: 1, color: brand.red, fontWeight: 600 }}>
              {t("membership.nextPlan", { date: formatDateLong(m.next_plan_from, i18n.language), plan: planName(m.next_plan, t) })}
            </Typography>
          ) : null}
          {m.renewal_plan ? <Typography variant="body2" sx={{ mt: 1, color: brand.greenDark, fontWeight: 600 }}>{t("membership.requested", { plan: planName(m.renewal_plan, t) })}</Typography> : null}
        </Box>
      ) : null}

      {due > 0 ? (
        <Box role="button" tabIndex={0} onClick={() => navigate("/owner/payments")} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderRadius: "16px", bgcolor: alpha(brand.gold, 0.12), border: `1px solid ${alpha(brand.gold, 0.4)}`, cursor: "pointer" }}>
          <Typography sx={{ fontWeight: 700 }}>{t("payments.due")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "1.25rem", color: brand.goldDark }}>{rupees(due)}</Typography>
        </Box>
      ) : null}

      {m.share_token ? (
        <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
          <Typography variant="subtitle1">{t("track.cardTitle")}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5 }}>{t("track.cardHint")}</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<WhatsAppIcon />} href={whatsappUrl(m.phone, shareLinkText(m, organization?.name ?? "", t))} target="_blank" rel="noopener" sx={{ flex: 1, backgroundImage: "none", bgcolor: "#25D366", "&:hover": { bgcolor: "#1DA851" } }}>
              {t("track.send")}
            </Button>
            <Button variant="outlined" startIcon={<LinkIcon />} disabled={rotate.isPending} onClick={() => window.confirm(t("track.rotateConfirm")) && rotate.mutate(m.id)}>
              {t("track.newLink")}
            </Button>
          </Box>
        </Box>
      ) : null}

      <Box sx={{ px: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
        <Row label={t("members.memberNo")} value={`#${m.member_no}`} />
        <Divider />
        <Row label={t("auth.phone")} value={`+91 ${m.phone}`} />
        <Divider />
        {m.member_type === "tiffin" ? (
          <>
            <Row label={t("members.type.label")} value={t("members.type.tiffin")} />
            <Divider />
            <Row label={t("members.company")} value={m.company} />
            <Divider />
            <Row label={t("members.deliveryAddress")} value={m.delivery_address} />
          </>
        ) : null}
        {m.member_type === "tiffin" ? <Divider /> : null}
        <Row label={t("members.plan")} value={planName(m.plan, t)} />
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
        <Button variant="contained" startIcon={<PlateCheckIcon />} onClick={() => navigate(`/owner/members/${m.id}/attendance`)}>
          {t("members.viewAttendance")}
        </Button>
        {m.user_id ? (
          <Button variant="outlined" startIcon={<KeyIcon />} disabled={resetPw.isPending} onClick={() => resetPw.mutate(m.id, { onSuccess: (r) => setTemp(r.temp_password) })}>
            {t("members.resetPassword")}
          </Button>
        ) : null}
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

      {renewing ? <RenewSheet member={m} onClose={() => setRenewing(false)} onRenewed={(bill) => navigate(`/owner/payments/${bill.id}?month=${bill.month.slice(0, 7)}`)} /> : null}
      {temp ? <TempPasswordDialog open name={m.name} phone={m.phone} password={temp} onClose={() => setTemp(null)} /> : null}
    </Stack>
  );
}
