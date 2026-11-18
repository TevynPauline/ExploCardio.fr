import { NotFound, OperationRefusee } from "../../erreurs";
import type { AdressePartenaire, ClientsOdoo, IdentitePartenaire, Partenaire, SituationClient } from "../interfaces";
import { idDe, texteDe, type ClientOdoo, type Enregistrement } from "./client";
import type { Ecritures } from "./ecritures";
import { conditionPartenaire, refPartenaire } from "./partenaires";

// Domaine « Clients » en mode réel (F14 lot 2, plan-lots-2-3.md D2).
// - La fiche principale (sans parent) porte le nom du cabinet s'il y en a un ; le médecin y est
//   rattaché comme contact. Odoo 20 calcule lui-même « société » (fiches avec n° de TVA) : le
//   site ne s'appuie pas sur ce champ.
// - Adresses de livraison et de facturation : fiches enfants (`type` delivery / invoice).
// - Recherche avant création : clé déjà vue → SIRET → email. Le RPPS est noté sur la fiche.
// - Le site ne modifie jamais SIRET ni RPPS d'une fiche existante.

type Fiche = Enregistrement & {
  name: string;
  is_company: boolean;
  email: string | false;
  phone: string | false;
  comment: string | false;
  l10n_fr_siret: string | false;
  street: string | false;
  street2: string | false;
  zip: string | false;
  city: string | false;
  active: boolean;
  type: string | false;
  parent_id: [number, string] | false;
  commercial_partner_id: [number, string] | false;
  trust?: string | false;
};

const CHAMPS = ["name", "is_company", "email", "phone", "comment", "l10n_fr_siret", "street", "street2", "zip", "city", "active", "type", "parent_id", "commercial_partner_id"];
/** Fiche principale seulement : « Degré de confiance » (Comptabilité), dépendant de la société. */
const CHAMPS_PRINCIPALE = [...CHAMPS, "trust"];
const TOUTES = { contexte: { active_test: false } };
const TYPE_ODOO = { livraison: "delivery", facturation: "invoice" } as const;

const chiffres = (s: unknown) => (typeof s === "string" ? s.replace(/\D/g, "") : "");

function rppsDe(comment: unknown): string | null {
  return typeof comment === "string" ? (/RPPS\s*(\d{11})/.exec(comment.replace(/<[^>]+>/g, " "))?.[1] ?? null) : null;
}

function adresseDe(f: Fiche, type: AdressePartenaire["type"]): AdressePartenaire | null {
  const ligne1 = texteDe(f.street);
  if (!ligne1) return null;
  const a: AdressePartenaire = { type, ligne1, codePostal: texteDe(f.zip) ?? "", ville: texteDe(f.city) ?? "" };
  const ligne2 = texteDe(f.street2);
  if (ligne2) a.ligne2 = ligne2;
  return a;
}

function champsAdresse(a: AdressePartenaire) {
  return { street: a.ligne1, street2: a.ligne2 ?? false, zip: a.codePostal, city: a.ville };
}

export function creerClientsReels(client: ClientOdoo, ecritures: Ecritures): ClientsOdoo & { lireFiche(ref: string): Promise<Fiche> } {
  let france: Promise<number | null> | null = null;
  const paysFrance = () =>
    (france ??= client.searchRead("res.country", [["code", "=", "FR"]], ["id"], { limite: 1 }).then((l) => l[0]?.id ?? null));

  async function lireFiche(ref: string): Promise<Fiche> {
    const [f] = await client.searchRead<Fiche>("res.partner", [conditionPartenaire(ref)], CHAMPS_PRINCIPALE, { ...TOUTES, limite: 1 });
    if (!f) throw new NotFound("Partenaire", ref);
    return f;
  }

  const enfants = (id: number) => client.searchRead<Fiche>("res.partner", [["parent_id", "=", id]], CHAMPS);

  /** Fiche principale déjà connue d'Odoo pour ce SIRET ou cet email, ou null. */
  async function chercher(identite: IdentitePartenaire): Promise<Fiche | null> {
    const siret = chiffres(identite.siret);
    if (siret.length === 14) {
      // `l10n_fr_siret` est calculé (non stocké) : lecture des fiches principales, comparaison ici.
      const societes = await client.searchRead<Fiche>("res.partner", [["parent_id", "=", false]], CHAMPS, TOUTES);
      const memes = societes.filter((s) => chiffres(s.l10n_fr_siret) === siret);
      const actives = memes.filter((s) => s.active);
      if (actives.length > 1) {
        throw new OperationRefusee(
          `Plusieurs fiches clients d'Odoo portent le SIRET ${siret} : l'équipe doit fusionner les fiches ou en archiver une avant de relier ce compte.`,
          { cause: "siret_en_double", fiches: actives.map((s) => refPartenaire(s.id)) },
        );
      }
      if (actives[0] ?? memes[0]) return actives[0] ?? memes[0]!;
    }
    const email = identite.email.trim();
    if (!email) return null;
    const parEmail = await client.searchRead<Fiche>("res.partner", [["email", "=ilike", email]], CHAMPS, TOUTES);
    const principales = [...new Set(parEmail.map((f) => idDe(f.commercial_partner_id) ?? f.id))];
    if (principales.length > 1) {
      throw new OperationRefusee(
        `Plusieurs fiches clients d'Odoo portent l'adresse ${email} : l'équipe doit indiquer la bonne fiche avant de relier ce compte.`,
        { cause: "email_en_double", fiches: principales.map(refPartenaire) },
      );
    }
    if (!principales.length) return null;
    const [principale] = await client.searchRead<Fiche>("res.partner", [["id", "=", principales[0]]], CHAMPS, { ...TOUTES, limite: 1 });
    return principale ?? null;
  }

  async function ecrireAdresses(fiche: Fiche, adresses: AdressePartenaire[]) {
    const existants = await enfants(fiche.id);
    for (const a of adresses) {
      const t = a.type;
      if (t === "cabinet") {
        await client.appeler("res.partner", "write", [[fiche.id], champsAdresse(a)]);
        continue;
      }
      const enfant = existants.find((e) => e.type === TYPE_ODOO[t]);
      if (enfant) await client.appeler("res.partner", "write", [[enfant.id], champsAdresse(a)]);
      else {
        await client.appeler("res.partner", "create", [
          { parent_id: fiche.id, type: TYPE_ODOO[t], name: t === "livraison" ? "Livraison" : "Facturation", country_id: await paysFrance(), ...champsAdresse(a) },
        ]);
      }
    }
  }

  async function creer(identite: IdentitePartenaire): Promise<number> {
    const nomFiche = identite.cabinet?.trim() || identite.nom;
    const cabinet = identite.adresses.find((a) => a.type === "cabinet");
    const id = (await client.appeler("res.partner", "create", [
      {
        name: nomFiche,
        email: identite.email,
        phone: identite.telephone ?? false,
        lang: "fr_FR",
        country_id: await paysFrance(),
        customer_rank: 1,
        ...(chiffres(identite.siret).length === 14 ? { l10n_fr_siret: chiffres(identite.siret) } : {}),
        ...(identite.rpps ? { comment: `<p>RPPS ${identite.rpps} (inscription sur le site)</p>` } : {}),
        ...(cabinet ? champsAdresse(cabinet) : {}),
      },
    ])) as number;
    if (identite.nom !== nomFiche) {
      await client.appeler("res.partner", "create", [
        { parent_id: id, type: "contact", name: identite.nom, email: identite.email, phone: identite.telephone ?? false, lang: "fr_FR" },
      ]);
    }
    const [fiche] = await client.searchRead<Fiche>("res.partner", [["id", "=", id]], CHAMPS, { limite: 1 });
    await ecrireAdresses(fiche!, identite.adresses.filter((a) => a.type !== "cabinet"));
    return id;
  }

  return {
    lireFiche,

    async creerOuRetrouverPartenaire(identite, cle) {
      const { resultat, deja } = await ecritures.uneFois(`partenaire:${cle}`, "clients.creerOuRetrouverPartenaire", async () => {
        const existante = await chercher(identite);
        if (existante) {
          // Fiche archivée (client parti puis revenu) : réactivée, puis reliée.
          if (!existante.active) await client.appeler("res.partner", "write", [[existante.id], { active: true }]);
          return { ref: refPartenaire(existante.id), cree: false };
        }
        return { ref: refPartenaire(await creer(identite)), cree: true };
      });
      return deja ? { ref: resultat.ref, cree: false } : resultat;
    },

    async mettreAJourCoordonnees(ref, c) {
      const fiche = await lireFiche(ref);
      const contacts = (await enfants(fiche.id)).filter((e) => e.type === "contact");
      const principal: Record<string, unknown> = {};
      const contact: Record<string, unknown> = {};
      if (c.cabinet !== undefined && contacts.length) principal.name = c.cabinet;
      if (c.nom !== undefined) (contacts.length ? contact : principal).name = c.nom;
      if (c.email !== undefined) principal.email = contact.email = c.email;
      if (c.telephone !== undefined) principal.phone = contact.phone = c.telephone || false;
      if (Object.keys(principal).length) await client.appeler("res.partner", "write", [[fiche.id], principal]);
      if (contacts.length && Object.keys(contact).length) {
        // Seul le contact qui porte l'ancienne adresse du compte (ou l'unique contact) est mis à jour.
        const cible = contacts.find((x) => texteDe(x.email)?.toLowerCase() === texteDe(fiche.email)?.toLowerCase()) ?? (contacts.length === 1 ? contacts[0] : undefined);
        if (cible) await client.appeler("res.partner", "write", [[cible.id], contact]);
      }
      if (c.adresses?.length) await ecrireAdresses(fiche, c.adresses);
    },

    async lireSituation(ref): Promise<SituationClient> {
      const fiche = await lireFiche(ref);
      const adresses = [adresseDe(fiche, "cabinet")];
      for (const e of await enfants(fiche.id)) {
        if (e.type === "delivery") adresses.push(adresseDe(e, "livraison"));
        if (e.type === "invoice") adresses.push(adresseDe(e, "facturation"));
      }
      const partenaire: Partenaire = {
        ref: refPartenaire(fiche.id),
        nom: fiche.name,
        email: texteDe(fiche.email),
        telephone: texteDe(fiche.phone),
        rpps: rppsDe(fiche.comment),
        siret: chiffres(fiche.l10n_fr_siret) || null,
        adresses: adresses.filter((a): a is AdressePartenaire => a !== null),
        // Régis passe le client en « Mauvais débiteur » dans Odoo : plus de commande en ligne.
        commandesBloquees: fiche.trust === "bad",
        estFictif: false,
      };
      // Commandes : lot 3 ; factures et locations : lot 4 ; droits d'assistance : fidélité
      // masquée à l'ouverture (FR-026).
      return {
        partenaire,
        commandesRecentes: [],
        factures: [],
        locations: [],
        droitsAssistance: { statut: "inactif", fin: null, origine: null, historique: [] },
      };
    },

    async archiverPartenaire(ref, cle) {
      const fiche = await lireFiche(ref);
      await ecritures.uneFois(`archivage:${cle}`, "clients.archiverPartenaire", async () => {
        if (fiche.active) await client.appeler("res.partner", "write", [[fiche.id], { active: false }]);
        return { ref };
      });
    },
  };
}
