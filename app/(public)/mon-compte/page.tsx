import Link from "next/link";
import { etatBienvenue } from "@/domaine/comptes/bienvenue";
import { compteCourant } from "@/domaine/comptes/session";
import { peutCommander, type Statut } from "@/domaine/comptes/statuts";
import { lireParametresPublics } from "@/domaine/contenus";
import { liensContact } from "@/lib/contact-whatsapp";
import { Card, Kicker } from "@/ui";
import { EncartBienvenue } from "@/ui/comptes/EncartBienvenue";
import { LIBELLES_STATUT } from "@/ui/comptes/libelles";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

const RUBRIQUES = [
  { href: "/mon-compte/commandes", titre: "Commandes", texte: "Suivi de vos commandes." },
  { href: "/mon-compte/factures", titre: "Factures", texte: "Vos factures et avoirs." },
  { href: "/mon-compte/locations", titre: "Locations en cours", texte: "Vos mises à disposition." },
  { href: "/mon-compte/bons-achat", titre: "Bons d'achat", texte: "Le solde de votre cagnotte." },
  { href: "/mon-compte/assistance", titre: "Droits d'assistance", texte: "Votre assistance offerte." },
  { href: "/mon-compte/logiciels", titre: "Logiciels Cloud", texte: "Vos accès à la plateforme." },
  { href: "/mon-compte/informations", titre: "Informations et adresses", texte: "Identité, coordonnées, adresses." },
  { href: "/mon-compte/preferences", titre: "Préférences de communication", texte: "Newsletter." },
];

// Tableau de bord « Mon compte » (FR-036) : statut, offre de bienvenue, rubriques, contact WhatsApp.
export default async function MonCompte() {
  const { compte } = await compteCourant("/mon-compte");
  const [bienvenue, p, contact] = await Promise.all([etatBienvenue(compte.id), lireParametresPublics(), liensContact()]);
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
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p>Une question ? Notre équipe vous répond par téléphone ou sur WhatsApp.</p>
        <div className="flex flex-wrap gap-2">
          <a href={contact.appeler} className="ec-btn ec-btn--primary">Appeler</a>
          <a href={contact.ecrire} className="ec-btn ec-btn--secondary">Écrire sur WhatsApp</a>
        </div>
      </Card>
    </>
  );
}
