import { Box, ButtonBase, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRightRounded";
import { useTranslation } from "react-i18next";
import type { Member } from "../../api/types";
import { brand } from "../../app/theme";
import { Avatar } from "../../components/brand/Avatar";
import { StatusChip } from "../../components/brand/StatusChip";
import { rupees } from "../../lib/money";
import { planLabel } from "./planLabel";

export function MemberCard({ member, onClick }: { member: Member; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: "100%",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        borderRadius: "16px",
        bgcolor: brand.paper,
        border: `1px solid ${brand.line}`,
        opacity: member.status === "inactive" ? 0.65 : 1,
      }}
    >
      <Avatar name={member.name} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" noWrap>
          {member.name}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.35 }}>
          {planLabel(member, t)} · {rupees(member.monthly_fee)}
          {member.room_no ? ` · ${t("members.room")} ${member.room_no}` : ""}
        </Typography>
      </Box>
      <StatusChip status={member.status} />
      <ChevronRightIcon sx={{ color: "text.secondary" }} />
    </ButtonBase>
  );
}
