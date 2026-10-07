import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import { Providers } from "./app/providers";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);
