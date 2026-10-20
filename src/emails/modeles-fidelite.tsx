import { euros } from "@/lib/montants";
import { urlDuSite } from "./charte";
import { BoutonEmail, type PiedPreferences } from "./Gabarit";
import { rendreModele, type TextesModele } from "./textes";

// Emails de F06 : gabarit de la charte, vouvoiement, montants HT, ton sobre. F10 (D2) : textes
// modifiables au back-office ; boutons fixes. Alertes (D3) : emails de service, avec le pied
// « pourquoi vous recevez cet email » et les préférences.

export const TEXTES_FIDELITE = {
  fidelite_credit: {
    objet: "{{montant_ht}} HT de bons d'achat crédités",
    apercu: "Votre cagnotte augmente",
    blocs: {
      corps: "Bonjour,\n\nVotre commande {{commande}} vous rapporte {{montant_ht}} HT de bons d'achat, utilisables sur vos prochains achats.",
      validite: "Ils sont valables jusqu'au {{validite_fin}}.",
    },
  },
  fidelite_retrait: {
    objet: "Bons d'achat retirés",
    apercu: "Suite à une annulation ou un remboursement",
    blocs: {
      corps:
        "Bonjour,\n\nSuite à l'annulation ou au remboursement de la commande {{commande}}, {{montant_ht}} HT de bons d'achat qu'elle vous avait apportés sont retirés de votre cagnotte.",
    },
  },
  fidelite_restitution: {
    objet: "Bons d'achat rendus",
    apercu: "Vos bons sont de nouveau disponibles",
    blocs: {
      corps: "Bonjour,\n\nLes {{montant_ht}} HT de bons d'achat utilisés pour la commande {{commande}} vous sont rendus.",
      validite: "Ils sont utilisables jusqu'au {{validite_fin}}.",
    },
  },
  fidelite_ajustement: {
    objet: "Votre cagnotte a été ajustée",
    apercu: "Ajustement de votre cagnotte",
    blocs: { corps: "Bonjour,\n\nNotre équipe a ajusté votre cagnotte de {{montant_ht}} HT.", motif: "Motif : {{motif}}." },
  },
  droits_ouverture: {
    objet: "Votre assistance est offerte",
    apercu: "Droits d'assistance",
    blocs: { corps: "Bonjour,\n\nVotre commande vous ouvre l'assistance gratuite : hotline et SAV réactif, jusqu'au {{fin}}." },
  },
  droits_prolongation: {
    objet: "Votre assistance est offerte",
    apercu: "Droits d'assistance",
    blocs: { corps: "Bonjour,\n\nVotre commande prolonge votre assistance gratuite jusqu'au {{fin}}." },
  },
  droits_retrait: {
    objet: "Vos droits d'assistance ont changé",
    apercu: "Droits d'assistance",
    blocs: { corps: "Bonjour,\n\nSuite à l'annulation ou au remboursement d'une commande, vos droits d'assistance vont désormais jusqu'au {{fin}}." },
  },
  droits_ajustement: {
    objet: "Votre assistance est offerte",
    apercu: "Droits d'assistance",
    blocs: { corps: "Bonjour,\n\nNotre équipe a ajusté vos droits d'assistance : ils vont jusqu'au {{fin}}.", motif: "Motif : {{motif}}." },
  },
  droits_rappel_fin: {
    objet: "Votre assistance gratuite se termine bientôt",
    apercu: "Comment la prolonger",
    blocs: {
      corps:
        "Bonjour,\n\nVotre assistance gratuite (hotline et SAV) se termine le {{fin}}.\n\nCommandez avant le {{fin}} pour garder votre assistance : une commande de consommables d'au moins {{seuil_ht}} HT la prolonge.",
    },
  },
  bons_rappel_expiration: {
    objet: "Des bons d'achat expirent bientôt",
    apercu: "Pensez à les utiliser",
    blocs: {
      solde: "Bonjour,\n\nVotre solde de bons d'achat : {{solde_ht}} HT.",
      corps: "{{montant_ht}} HT de bons d'achat expirent le {{date}}. Utilisez-les dans votre panier lors de votre prochaine commande.",
    },
  },
  intervention_cloturee: {
    objet: "Votre intervention d'assistance est terminée",
    apercu: "Intervention close",
    blocs: { corps: "Bonjour,\n\nVotre intervention d’assistance à l’acte est terminée. Merci de votre confiance." },
  },
} satisfies Record<string, TextesModele>;

type Code = keyof typeof TEXTES_FIDELITE;

const dateFr = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const MES_BONS = () => urlDuSite("/mon-compte/bons-achat");
const MES_DROITS = () => urlDuSite("/mon-compte/assistance");

function email(modele: Code, variables: Record<string, string | number>, blocs: (string | false)[], bouton: { href: string; libelle: string }, pied?: PiedPreferences) {
  return rendreModele({
    modele,
    defaut: TEXTES_FIDELITE[modele],
    variables,
    ...(pied ? { famille: "service" as const, pied } : {}),
    corps: (t) => (
      <>
        {blocs.filter((b): b is string => Boolean(b)).map((b) => (
          <span key={b}>{t.bloc(b)}</span>
        ))}
        <BoutonEmail href={bouton.href}>{bouton.libelle}</BoutonEmail>
      </>
    ),
  });
}

const CAGNOTTE = () => ({ href: MES_BONS(), libelle: "Voir ma cagnotte" });
const DROITS = () => ({ href: MES_DROITS(), libelle: "Mes droits d’assistance" });

export const emailsFidelite = {
  credit: (p: { montantHt: number; commandeRef: string | null; validiteFin: Date | null }) =>
    email(
      "fidelite_credit",
      { montant_ht: euros(p.montantHt), commande: p.commandeRef ?? "", validite_fin: p.validiteFin ? dateFr(p.validiteFin) : "" },
      ["corps", Boolean(p.validiteFin) && "validite"],
      CAGNOTTE(),
    ),
  retrait: (p: { montantHt: number; commandeRef: string | null }) => email("fidelite_retrait", { montant_ht: euros(p.montantHt), commande: p.commandeRef ?? "" }, ["corps"], CAGNOTTE()),
  restitution: (p: { montantHt: number; commandeRef: string | null; validiteFin: Date | null }) =>
    email(
      "fidelite_restitution",
      { montant_ht: euros(p.montantHt), commande: p.commandeRef ?? "", validite_fin: p.validiteFin ? dateFr(p.validiteFin) : "" },
      ["corps", Boolean(p.validiteFin) && "validite"],
      CAGNOTTE(),
    ),
  ajustement: (p: { montantHt: number; motif: string | null }) =>
    email("fidelite_ajustement", { montant_ht: `${p.montantHt > 0 ? "+" : ""}${euros(p.montantHt)}`, motif: p.motif ?? "" }, ["corps", Boolean(p.motif) && "motif"], CAGNOTTE()),
  droits: (p: { type: "ouverture" | "prolongation" | "retrait" | "ajustement"; fin: Date; motif: string | null }) =>
    email(`droits_${p.type}`, { fin: dateFr(p.fin), motif: p.motif ?? "" }, ["corps", p.type === "ajustement" && Boolean(p.motif) && "motif"], DROITS()),
  rappelFinDroits: (p: { fin: Date; seuilHt: number; pied?: PiedPreferences }) =>
    email("droits_rappel_fin", { fin: dateFr(p.fin), seuil_ht: euros(p.seuilHt) }, ["corps"], { href: urlDuSite("/accessoires-consommables"), libelle: "Voir les consommables" }, p.pied),
  rappelExpiration: (p: { montantHt: number; date: Date; soldeHt?: number; pied?: PiedPreferences }) =>
    email(
      "bons_rappel_expiration",
      { montant_ht: euros(p.montantHt), date: dateFr(p.date), solde_ht: p.soldeHt !== undefined ? euros(p.soldeHt) : "" },
      [p.soldeHt !== undefined && "solde", "corps"],
      CAGNOTTE(),
      p.pied,
    ),
  interventionClose: () => email("intervention_cloturee", {}, ["corps"], DROITS()),
};
