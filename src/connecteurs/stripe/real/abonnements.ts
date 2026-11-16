import type Stripe from "stripe";
import { NotFound, OperationRefusee } from "../../erreurs";
import type { SdkStripe } from "./sdk";

// Opérations de l'équipe sur les abonnements (F24, research R7, R8, R10). Les retraits de
// locations et la date de fin sont gardés dans les métadonnées de l'abonnement ; le calendrier
// de prélèvement (Subscription Schedule) en est recalculé à chaque changement, sans prorata.

type Etat = { retraits: Record<string, number>; fin: number | null };
type Article = { element: string; price: string };

const echapper = (v: string) => v.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
const secondes = (d: Date) => Math.floor(d.getTime() / 1000);

export async function trouverAbonnement(sdk: SdkStripe, abonnementRef: string): Promise<Stripe.Subscription> {
  const r = await sdk.subscriptions.search({ query: `metadata['abonnementRef']:'${echapper(abonnementRef)}'`, limit: 1, expand: ["data.default_payment_method"] });
  const sub = r.data[0];
  if (!sub) throw new NotFound("Abonnement de paiement", abonnementRef);
  return sub;
}

function etatDe(sub: Stripe.Subscription): Etat {
  let retraits: Record<string, number> = {};
  try {
    retraits = JSON.parse(sub.metadata?.retraits || "{}") as Record<string, number>;
  } catch {
    retraits = {};
  }
  const fin = sub.metadata?.fin ? Number(sub.metadata.fin) : null;
  return { retraits, fin: Number.isFinite(fin) ? fin : null };
}

/** Articles de l'abonnement, avec l'élément (location) porté par le produit (R5). */
async function articles(sdk: SdkStripe, sub: Stripe.Subscription): Promise<Article[]> {
  const liste: Article[] = [];
  for (const item of sub.items.data) {
    const produit = typeof item.price.product === "string" ? await sdk.products.retrieve(item.price.product) : item.price.product;
    const element = "metadata" in produit ? produit.metadata?.element : undefined;
    liste.push({ element: element ?? item.id, price: item.price.id });
  }
  return liste;
}

/**
 * Recalcule le calendrier de prélèvement : une phase entre chaque date de retrait, puis la
 * suite (libérée) ou la fin (résiliation). Sans retrait ni fin : calendrier libéré.
 */
async function appliquer(sdk: SdkStripe, sub: Stripe.Subscription, etat: Etat, maintenant: Date): Promise<void> {
  const liste = await articles(sdk, sub);
  const presents = new Set(liste.map((a) => a.element));
  const retraits = Object.fromEntries(Object.entries(etat.retraits).filter(([e]) => presents.has(e)));
  const metadata = { retraits: JSON.stringify(retraits), fin: etat.fin ? String(etat.fin) : "" };
  const scheduleId = typeof sub.schedule === "string" ? sub.schedule : (sub.schedule?.id ?? null);

  const bornes = [...new Set([...Object.values(retraits), ...(etat.fin ? [etat.fin] : [])])].sort((a, b) => a - b);
  if (!bornes.length) {
    if (scheduleId) await sdk.subscriptionSchedules.release(scheduleId);
    await sdk.subscriptions.update(sub.id, { metadata, cancel_at: "", proration_behavior: "none" });
    return;
  }

  await sdk.subscriptions.update(sub.id, { metadata });
  const schedule = scheduleId ? await sdk.subscriptionSchedules.retrieve(scheduleId) : await sdk.subscriptionSchedules.create({ from_subscription: sub.id });
  const debut = schedule.current_phase?.start_date ?? schedule.phases[0]?.start_date ?? secondes(maintenant);
  const actifsA = (t: number) => liste.filter((a) => !(retraits[a.element] !== undefined && retraits[a.element]! <= t));
  const maintenantS = secondes(maintenant);

  const phases: Stripe.SubscriptionScheduleUpdateParams.Phase[] = [];
  let depart = debut;
  let termine = false;
  for (const borne of bornes) {
    const items = actifsA(depart).map((a) => ({ price: a.price, quantity: 1 }));
    if (!items.length) {
      termine = true;
      break;
    }
    phases.push({ items, ...(phases.length ? {} : { start_date: depart }), end_date: borne <= maintenantS ? "now" : borne, proration_behavior: "none" });
    depart = Math.max(borne, maintenantS);
    if (etat.fin !== null && borne >= etat.fin) {
      termine = true;
      break;
    }
  }
  if (!termine) {
    const items = actifsA(depart).map((a) => ({ price: a.price, quantity: 1 }));
    if (items.length) phases.push({ items, duration: { interval: "month", interval_count: 1 }, proration_behavior: "none" });
    else termine = true;
  }
  await sdk.subscriptionSchedules.update(schedule.id, { phases, end_behavior: termine ? "cancel" : "release", proration_behavior: "none" });
}

export async function retirerElement(sdk: SdkStripe, abonnementRef: string, element: string, dateEffet: Date, maintenant = new Date()) {
  const sub = await trouverAbonnement(sdk, abonnementRef);
  if (!(await articles(sdk, sub)).some((a) => a.element === element)) throw new NotFound("Élément d'abonnement", element);
  const etat = etatDe(sub);
  const date = secondes(dateEffet);
  if (etat.retraits[element] === date) return; // déjà prévu à cette date (idempotent)
  etat.retraits[element] = date;
  await appliquer(sdk, sub, etat, maintenant);
}

export async function retablirElement(sdk: SdkStripe, abonnementRef: string, element: string, maintenant = new Date()) {
  const sub = await trouverAbonnement(sdk, abonnementRef);
  if (!(await articles(sdk, sub)).some((a) => a.element === element)) throw new NotFound("Élément d'abonnement", element);
  const etat = etatDe(sub);
  if (etat.retraits[element] === undefined) return;
  delete etat.retraits[element];
  await appliquer(sdk, sub, etat, maintenant);
}

export async function resilier(sdk: SdkStripe, abonnementRef: string, dateFin: Date, maintenant = new Date()) {
  const sub = await trouverAbonnement(sdk, abonnementRef);
  const etat = etatDe(sub);
  const fin = secondes(dateFin);
  if (etat.fin === fin) return;
  etat.fin = fin;
  if (!Object.keys(etat.retraits).length && !sub.schedule) {
    await sdk.subscriptions.update(sub.id, { cancel_at: Math.max(fin, secondes(maintenant) + 60), proration_behavior: "none", metadata: { fin: String(fin) } });
    return;
  }
  await appliquer(sdk, sub, etat, maintenant);
}

/** Prélèvement ponctuel sur l'autorisation conservée (R10) : payée ou refusée. */
export async function preleverPonctuel(sdk: SdkStripe, d: { abonnementRef: string; montantTtc: number; libelle: string }, cle: string) {
  const sub = await trouverAbonnement(sdk, d.abonnementRef);
  if (sub.metadata?.autorisationLiberee === "true") throw new OperationRefusee("Autorisation de prélèvement libérée.", { abonnementRef: d.abonnementRef });
  const pm = sub.default_payment_method;
  const pmId = typeof pm === "string" ? pm : pm?.id;
  if (!pmId) throw new OperationRefusee("Aucune autorisation de prélèvement enregistrée.", { abonnementRef: d.abonnementRef });
  const type = typeof pm === "object" && pm?.type === "sepa_debit" ? "sepa_debit" : "card";
  const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  try {
    const pi = await sdk.paymentIntents.create(
      {
        amount: d.montantTtc,
        currency: "eur",
        customer,
        payment_method: pmId,
        allowed_payment_method_types: [type],
        off_session: true,
        confirm: true,
        description: d.libelle,
        metadata: { abonnementRef: d.abonnementRef, libelle: d.libelle },
      },
      { idempotencyKey: cle },
    );
    // SEPA « en cours » : payé à titre provisoire ; un échec ultérieur arrive en échéance refusée.
    return { paiementRef: pi.id, etat: pi.status === "succeeded" || pi.status === "processing" ? ("payee" as const) : ("refusee" as const) };
  } catch (e) {
    const err = e as { type?: string; payment_intent?: { id?: string } };
    if (err.type === "StripeCardError") return { paiementRef: err.payment_intent?.id ?? "", etat: "refusee" as const };
    throw e;
  }
}

/** Libère l'autorisation après le retour et le règlement des sommes dues (R10). */
export async function libererAutorisation(sdk: SdkStripe, abonnementRef: string) {
  const sub = await trouverAbonnement(sdk, abonnementRef);
  if (sub.metadata?.autorisationLiberee === "true") return;
  const pm = sub.default_payment_method;
  const pmId = typeof pm === "string" ? pm : pm?.id;
  if (pmId) await sdk.paymentMethods.detach(pmId);
  await sdk.subscriptions.update(sub.id, { metadata: { autorisationLiberee: "true" } });
}
