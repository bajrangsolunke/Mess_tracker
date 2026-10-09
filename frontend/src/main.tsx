import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import "./lib/install"; // capture the install prompt early
import { Providers } from "./app/providers";
import App from "./App";
import { UpdatePrompt } from "./components/UpdatePrompt";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <App />
      <UpdatePrompt />
    </Providers>
  </StrictMode>,
);
