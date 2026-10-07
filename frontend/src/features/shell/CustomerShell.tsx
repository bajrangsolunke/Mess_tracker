import { AppShell } from "./AppShell";
import { CUSTOMER_NAV } from "./customerNav";

export function CustomerShell() {
  return <AppShell items={CUSTOMER_NAV} />;
}
