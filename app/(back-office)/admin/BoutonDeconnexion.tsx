"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/ui";

export function BoutonDeconnexion() {
  const router = useRouter();
  return (
    <Button
      variante="secondaire"
      onClick={async () => {
        await authClient.signOut();
        router.push("/connexion");
        router.refresh();
      }}
    >
      Se déconnecter
    </Button>
  );
}
