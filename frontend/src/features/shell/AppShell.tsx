import { Box, Container } from "@mui/material";
import { Outlet } from "react-router-dom";
import { BottomNav, type NavItem } from "../../components/BottomNav";
import { BrandBar } from "../../components/brand/BrandBar";

export function AppShell({ items }: { items: NavItem[] }) {
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
