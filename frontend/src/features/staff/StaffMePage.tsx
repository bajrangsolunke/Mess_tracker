import { Box, Skeleton, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStaffMe } from "../../api/useOperations";
import { SectionTitle } from "../../components/brand/SectionTitle";
import { brand } from "../../app/theme";
import { rupees } from "../../lib/money";
import { formatDateLong, monthKey } from "../../lib/date";
import { MonthSwitcher } from "../attendance/MyAttendancePage";
import { ProfilePage } from "../profile/ProfilePage";
import { SalaryCard } from "./SalaryCard";

/** Staff "Me": own salary and advances (read-only), then language, password and logout. */
export function StaffMePage() {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(monthKey());
  const { data, isLoading } = useStaffMe(month);
  return (
    <ProfilePage titleKey="nav.me">
      <Box>
        <SectionTitle>{t("staff.mySalary")}</SectionTitle>
        <Stack spacing={1.5}>
          <MonthSwitcher month={month} onChange={setMonth} />
          {isLoading || !data ? <Skeleton variant="rounded" height={160} sx={{ borderRadius: "16px" }} /> : <SalaryCard month={data.month} />}
          {data && data.entries.length > 0 ? (
            <Box sx={{ borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}`, px: 2 }}>
              {data.entries.map((e, i) => (
                <Box key={e.id} sx={{ display: "flex", justifyContent: "space-between", gap: 1, py: 1.1, borderTop: i ? `1px solid ${brand.line}` : "none" }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{t(`ledger.kind.${e.kind}`)}</Typography>
                    <Typography variant="caption">{formatDateLong(e.occurred_on, i18n.language)}{e.description ? ` · ${e.description}` : ""}</Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 800 }}>{rupees(e.amount)}</Typography>
                </Box>
              ))}
            </Box>
          ) : null}
        </Stack>
      </Box>
    </ProfilePage>
  );
}
