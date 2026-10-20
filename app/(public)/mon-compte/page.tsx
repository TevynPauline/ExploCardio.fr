import Link from "next/link";
import { etatBienvenue } from "@/domaine/comptes/bienvenue";
import { compteCourant } from "@/domaine/comptes/session";
import { peutCommander, type Statut } from "@/domaine/comptes/statuts";
import { lireParametresPublics } from "@/domaine/contenus";
import { ContactWhatsApp } from "@/ui/contact/ContactWhatsApp";
import { assistanceDuCompte } from "@/domaine/fidelite/droits";
import { Card, Kicker } from "@/ui";
import { EncartBienvenue } from "@/ui/comptes/EncartBienvenue";
import { LIBELLES_STATUT } from "@/ui/comptes/libelles";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

const RUBRIQUES = [
  { href: "/mon-compte/commandes", titre: "Commandes", texte: "Suivi de vos commandes." },
  { href: "/mon-compte/factures", titre: "Factures", texte: "Vos factures et avoirs." },
  { href: "/mon-compte/locations", titre: "Locations en cours", texte: "Vos mises à disposition." },
  { href: "/mon-compte/financements", titre: "Financements", texte: "Vos demandes et leur statut." },
  { href: "/mon-compte/bons-achat", titre: "Bons d'achat", texte: "Le solde de votre cagnotte." },
  { href: "/mon-compte/assistance", titre: "Droits d'assistance", texte: "Votre assistance offerte." },
  { href: "/mon-compte/logiciels", titre: "Logiciels Cloud", texte: "Vos accès à la plateforme." },
  { href: "/mon-compte/informations", titre: "Informations et adresses", texte: "Identité, coordonnées, adresses." },
  { href: "/mon-compte/preferences", titre: "Préférences de communication", texte: "Newsletter." },
];

// Tableau de bord « Mon compte » (FR-036) : statut, offre de bienvenue, rubriques, contact WhatsApp.
export default async function MonCompte() {
  const { compte } = await compteCourant("/mon-compte");
  const [bienvenue, p, assistance] = await Promise.all([etatBienvenue(compte.id), lireParametresPublics(), assistanceDuCompte(compte.id)]);
  const commande = peutCommander({ statut: compte.statut as Statut });
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-display font-light">Bonjour {compte.utilisateur.civilite ?? ""} {compte.utilisateur.nom ?? compte.utilisateur.name}</h1>
      <NavMonCompte actif="/mon-compte" />
      <Card className="flex flex-col gap-2">
        <p>
          Statut de votre compte : <span className="ec-badge">{LIBELLES_STATUT[compte.statut]}</span>
        </p>
        {!commande.autorise ? <p role="status">{commande.message}</p> : <p>Vous pouvez commander.</p>}
      </Card>
      <EncartBienvenue etat={bienvenue} texte={p.offreBienvenue} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RUBRIQUES.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="ec-card flex h-full flex-col gap-1 no-underline hover:border-action">
              <span className="text-h3 font-semibold text-ink">{r.titre}</span>
              <span className="text-muted">{r.texte}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ContactWhatsApp titre="Une question ?" />
        {/* F09 (FR-009) : l'état des droits d'assistance à côté du contact. */}
        <section aria-label="Vos droits d’assistance" className="ec-card flex flex-col gap-2">
          <p className="font-semibold text-ink">Vos droits d’assistance</p>
          {assistance.droits?.statut === "actif" ? (
            <p>Assistance offerte jusqu’au {assistance.droits.fin.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}.</p>
          ) : assistance.droits ? (
            <p>Pas de droits en cours : une commande de consommables les ouvre, ou l’assistance à l’acte.</p>
          ) : (
            <p>Information momentanément indisponible.</p>
          )}
          <Link href="/mon-compte/assistance" className="inline-flex min-h-11 items-center">Mes droits d’assistance</Link>
        </section>
      </div>
    </>
  );
}
