import { Box, ButtonBase, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import { useTranslation } from "react-i18next";
import type { Member } from "../../api/types";
import { brand } from "../../app/theme";
import { Avatar } from "../../components/brand/Avatar";
import { StatusChip } from "../../components/brand/StatusChip";
import { rupees } from "../../lib/money";
import { planLabel } from "./planLabel";
import { MembershipBadge } from "./MembershipBadge";
import { TiffinsLeft } from "../search/TiffinsLeft";

export function MemberCard({ member, onClick }: { member: Member; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <ButtonBase onClick={onClick} sx={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, opacity: member.status === "inactive" ? 0.65 : 1 }}>
      <Box sx={{ position: "relative" }}>
        <Avatar name={member.name} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.75, minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>{member.name}</Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: brand.red, flexShrink: 0 }}>#{member.member_no}</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.35 }}>
          {member.member_type === "tiffin" ? (
            <Box component="span" sx={{ fontSize: "0.7rem", fontWeight: 700, px: 0.75, py: 0.1, mr: 0.75, borderRadius: 999, bgcolor: `${brand.gold}26`, color: brand.goldDark, verticalAlign: "middle" }}>
              {t("members.type.tiffin")}
            </Box>
          ) : null}
          {planLabel(member, t)} · {rupees(member.monthly_fee)}
          {member.member_type === "tiffin" && member.company ? ` · ${member.company}` : ""}
        </Typography>
        <Box sx={{ mt: 0.25, display: "flex", gap: 0.75 }}>
          <MembershipBadge validUntil={member.valid_until} />
          {member.credits ? <TiffinsLeft left={member.credits.left} total={member.credits.total} /> : null}
          {member.renewal_requested_at ? <Box component="span" sx={{ fontSize: "0.72rem", fontWeight: 700, px: 0.9, py: 0.2, borderRadius: 999, bgcolor: `${brand.green}1F`, color: brand.greenDark }}>{t("membership.renewalAsked")}</Box> : null}
        </Box>
      </Box>
      {member.status === "inactive" ? <StatusChip status="inactive" /> : null}
      <ChevronRightIcon sx={{ color: "text.secondary" }} />
    </ButtonBase>
  );
}
