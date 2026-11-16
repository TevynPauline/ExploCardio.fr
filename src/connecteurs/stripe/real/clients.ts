import { NotFound } from "../../erreurs";
import type { ClientPaiement } from "../interfaces";
import type { SdkStripe } from "./sdk";

// Client Stripe d'un partenaire Odoo (F24, research R3) : retrouvé par sa métadonnée, sinon
// créé une seule fois (clé d'idempotence). Seuls l'email et la référence sont transmis (FR-026).

const echapper = (v: string) => v.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

export async function chercherClient(sdk: SdkStripe, partenaireRef: string): Promise<string | null> {
  const r = await sdk.customers.search({ query: `metadata['partenaireRef']:'${echapper(partenaireRef)}'`, limit: 1 });
  return r.data[0]?.id ?? null;
}

export async function clientStripe(sdk: SdkStripe, client: ClientPaiement): Promise<string> {
  const existant = await chercherClient(sdk, client.partenaireRef);
  if (existant) return existant;
  const cree = await sdk.customers.create({ email: client.email, metadata: { partenaireRef: client.partenaireRef } }, { idempotencyKey: `client:${client.partenaireRef}` });
  return cree.id;
}

export async function clientExistant(sdk: SdkStripe, partenaireRef: string): Promise<string> {
  const id = await chercherClient(sdk, partenaireRef);
  if (!id) throw new NotFound("Client de paiement", partenaireRef);
  return id;
}
