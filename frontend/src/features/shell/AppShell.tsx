import { Box, Container } from "@mui/material";
import { Outlet } from "react-router-dom";
import { BottomNav, type NavItem } from "../../components/BottomNav";
import { BrandBar } from "../../components/brand/BrandBar";
import { useEffect } from "react";
import { useMe } from "../../api/useAuth";
import { authStore } from "../auth/authStore";

export function AppShell({ items }: { items: NavItem[] }) {
  // Re-sync the cached session with the server on load (role, must_change_password, member).
  const me = useMe();
  useEffect(() => {
    if (me.data) {
      const cur = authStore.get();
      authStore.setSession({ ...cur, user: me.data.user, organization: me.data.organization, member: me.data.member });
    }
  }, [me.data]);
  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <BrandBar />
      <Container maxWidth="sm" sx={{ px: 2, pt: 3, pb: "104px" }}>
        <Outlet />
      </Container>
      <BottomNav items={items} />
    </Box>
  );
}
