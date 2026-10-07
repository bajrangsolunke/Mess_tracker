import type { ReactElement } from "react";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export interface NavItem {
  labelKey: string;
  to: string;
  icon: ReactElement;
  /** Other route prefixes that belong to this tab (e.g. More owns /owner/pricing). */
  also?: string[];
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Longest matching prefix wins: "/owner" is a prefix of every owner page, so it must lose
  // to "/owner/attendance" when the user is on attendance.
  const matches = (prefix: string) => pathname === prefix || pathname.startsWith(prefix + "/");
  const current =
    items
      .flatMap((i) => [i.to, ...(i.also ?? [])].filter(matches).map((prefix) => ({ to: i.to, len: prefix.length })))
      .sort((a, b) => b.len - a.len)[0]?.to ?? items[0].to;

  return (
    <Paper
      elevation={3}
      sx={{ position: "fixed", bottom: 0, left: 0, right: 0, pb: "env(safe-area-inset-bottom)" }}
    >
      <BottomNavigation
        showLabels
        value={current}
        onChange={(_, value: string) => navigate(value)}
        sx={{ height: 72 }}
      >
        {items.map((item) => (
          <BottomNavigationAction
            key={item.to}
            value={item.to}
            label={t(item.labelKey)}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
