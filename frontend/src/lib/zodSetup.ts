// Loaded first (see main.tsx): the security policy forbids eval, so zod must not probe for it.
import { z } from "zod";

z.config({ jitless: true });
