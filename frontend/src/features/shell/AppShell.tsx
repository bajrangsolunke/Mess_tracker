import { Box, Container } from "@mui/material";
import { Outlet } from "react-router-dom";
import { BottomNav, type NavItem } from "../../components/BottomNav";

export function AppShell({ items }: { items: NavItem[] }) {
  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <Container maxWidth="sm" sx={{ px: 2, pt: 2, pb: "88px" }}>
        <Outlet />
      </Container>
      <BottomNav items={items} />
    </Box>
  );
}
