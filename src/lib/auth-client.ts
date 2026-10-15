"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

// La redirection vers la saisie du code est gérée par le formulaire de connexion.
export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});
