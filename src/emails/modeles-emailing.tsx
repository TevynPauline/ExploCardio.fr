import { euros } from "@/lib/montants";
import { urlDuSite } from "./charte";
import { BoutonEmail, Paragraphe, type PiedPreferences } from "./Gabarit";
import { rendreEmail, type EmailRendu } from "./rendu";
import { rendreModele, type TextesModele } from "./textes";

// Emails des scénarios de F10 (relance de réapprovisionnement, panier en attente, relance
// d'impayé, campagnes) : rendus au moment de l'envoi, aux prix et disponibilités du moment.
// Textes modifiables au back-office (D2), sauf les campagnes, écrites une par une.

const dateFr = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

export type ArticleRelance = { nom: string; quantite: number; prixHt: number; prochaine: Date; lien: string };

/** Paragraphes d'un texte saisi au back-office (lignes vides = nouveau paragraphe). */
export function paragraphes(texte: string): string[] {
  return texte
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

export const TEXTES_EMAILING = {
  relance_reapprovisionnement: {
    objet: "Bientôt à court de {{article}} ?",
    apercu: "Recommandez en un geste, avant d’en manquer",
    blocs: {
      un: "Bonjour,\n\nD’après vos commandes habituelles, vous devriez recommander cet article vers le {{date_prevue}}.",
      plusieurs: "Bonjour,\n\nD’après vos commandes habituelles, vous devriez bientôt recommander ces articles.",
      bons: "Cette commande vous rapporterait {{bons_ht}} HT de bons d'achat.",
      droits: "Elle prolongerait votre assistance gratuite jusqu'au {{droits_jusqu_au}}.",
      fin: "Vous pouvez modifier la quantité dans votre panier avant de valider.",
    },
  },
  panier_abandonne: {
    objet: "Votre panier vous attend",
    apercu: "Retrouvez les articles que vous avez choisis",
    blocs: {
      corps: "Bonjour,\n\nVotre panier contient des articles que vous n’avez pas encore commandés :",
      fin: "Prix et disponibilités d’aujourd’hui ; ils sont confirmés dans votre panier avant toute commande.",
    },
  },
  relance_impaye: {
    objet: "{{niveau}} : paiement de votre {{objet}} attendu avant le {{date_consequence}}",
    apercu: "{{montant_ttc}} TTC à régler",
    blocs: {
      corps: "Bonjour,\n\nSauf erreur de notre part, le paiement de votre {{objet}} ne nous est pas encore parvenu : {{montant_ttc}} TTC.",
      regulariser: "{{comment_regulariser}}",
      echeance: "Merci de régulariser avant le {{date_consequence}}.",
      consequence: "**Sans règlement avant le {{date_consequence}}, {{consequence}}.**",
      fin: "Si vous avez réglé entre-temps, ne tenez pas compte de ce message.",
    },
  },
} satisfies Record<string, TextesModele>;

export const emailsEmailing = {
  relanceImpaye: (p: {
    niveau: string;
    objet: string;
    montantTtc: number;
    consequence: string;
    dateConsequence: Date;
    annonce: boolean;
    regulariser: string;
    lien: string;
    libelleLien: string;
  }): Promise<EmailRendu> =>
    rendreModele({
      modele: "relance_impaye",
      defaut: TEXTES_EMAILING.relance_impaye,
      variables: { niveau: p.niveau, objet: p.objet, montant_ttc: euros(p.montantTtc), consequence: p.consequence, date_consequence: dateFr(p.dateConsequence), comment_regulariser: p.regulariser },
      corps: (t) => (
        <>
          {t.bloc("corps")}
          {t.bloc("regulariser")}
          {t.bloc(p.annonce ? "consequence" : "echeance")}
          <BoutonEmail href={p.lien}>{p.libelleLien}</BoutonEmail>
          {t.bloc("fin")}
        </>
      ),
    }),
  panier: (p: {
    lignes: { libelle: string; quantite: number; prixUnitaireHt: number | null; miseADisposition: boolean; disponibilite: string }[];
    lien: string;
    pied: PiedPreferences;
  }): Promise<EmailRendu> =>
    rendreModele({
      modele: "panier_abandonne",
      defaut: TEXTES_EMAILING.panier_abandonne,
      famille: "service",
      pied: p.pied,
      corps: (t) => (
        <>
          {t.bloc("corps")}
          {p.lignes.map((l, i) => (
            <Paragraphe key={i}>
              {l.quantite} × {l.libelle}
              {l.prixUnitaireHt !== null ? ` — ${euros(l.prixUnitaireHt)} HT${l.miseADisposition ? " par mois" : " l’unité"}` : ""} ({l.disponibilite}).
            </Paragraphe>
          ))}
          {t.bloc("fin")}
          <BoutonEmail href={p.lien}>Voir mon panier</BoutonEmail>
        </>
      ),
    }),
  campagne: (p: { objet: string; titre: string; texte: string; lien: string | null; libelleLien: string | null; pied: PiedPreferences }): Promise<EmailRendu> =>
    rendreEmail({
      modele: "campagne",
      famille: "commercial",
      pied: p.pied,
      objet: p.objet,
      titre: p.titre,
      apercu: paragraphes(p.texte)[0]?.slice(0, 120) ?? p.titre,
      corps: (
        <>
          <Paragraphe>Bonjour,</Paragraphe>
          {paragraphes(p.texte).map((t, i) => (
            <Paragraphe key={i}>{t}</Paragraphe>
          ))}
          {p.lien ? <BoutonEmail href={p.lien}>{p.libelleLien || "En savoir plus"}</BoutonEmail> : null}
        </>
      ),
    }),
  reapprovisionnement: (p: { articles: ArticleRelance[]; gains: { bonsAchatHt: number; droitsJusquAu: Date | null } | null; pied: PiedPreferences }): Promise<EmailRendu> => {
    const un = p.articles.length === 1;
    return rendreModele({
      modele: "relance_reapprovisionnement",
      defaut: TEXTES_EMAILING.relance_reapprovisionnement,
      famille: "service",
      pied: p.pied,
      variables: {
        article: un ? p.articles[0]!.nom : "vos consommables habituels",
        date_prevue: dateFr(p.articles[0]!.prochaine),
        bons_ht: p.gains ? euros(p.gains.bonsAchatHt) : "",
        droits_jusqu_au: p.gains?.droitsJusquAu ? dateFr(p.gains.droitsJusquAu) : "",
      },
      corps: (t) => (
        <>
          {t.bloc(un ? "un" : "plusieurs")}
          {p.articles.map((a) => (
            <div key={a.lien} style={{ margin: "0 0 16px" }}>
              <Paragraphe>
                <strong>{a.nom}</strong> — {a.quantite} × {euros(a.prixHt)} HT, soit {euros(a.prixHt * a.quantite)} HT
                {un ? "" : ` (vers le ${dateFr(a.prochaine)})`}.
              </Paragraphe>
              <BoutonEmail href={a.lien}>{un ? "Commander de nouveau" : `Commander de nouveau : ${a.nom}`}</BoutonEmail>
            </div>
          ))}
          {p.gains && p.gains.bonsAchatHt > 0 ? t.bloc("bons") : null}
          {p.gains?.droitsJusquAu ? t.bloc("droits") : null}
          {t.bloc("fin")}
          <Paragraphe>
            <a href={urlDuSite("/accessoires-consommables")}>Voir tous les consommables</a>
          </Paragraphe>
        </>
      ),
    });
  },
};
