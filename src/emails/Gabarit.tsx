import { Body, Container, Head, Hr, Html, Img, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { charte, urlDuSite } from "./charte";
import type { ContactEmail } from "./contact";

// Gabarit commun des emails ExploCardio.fr : logo officiel, Inter avec police de repli,
// couleur d'action unique, ton sobre et vouvoiement (principes VII et IX). F10 : pied selon la
// famille (raison de l'envoi, préférences, désinscription), expéditeur et mentions légales,
// lisible en mode sombre.

export type FamilleGabarit = "transactionnel" | "service" | "commercial";

export type PiedPreferences = {
  /** « Vous recevez cet email parce que… » */
  raison: string;
  preferences: string;
  /** Commercial : lien de désinscription en un clic. */
  desinscription?: string;
};

type GabaritProps = {
  apercu: string;
  titre: string;
  children: ReactNode;
  /** F09 : numéro, horaires et lien WhatsApp en pied de message (null sans numéro). */
  contact?: ContactEmail;
  famille?: FamilleGabarit;
  pied?: PiedPreferences;
  expediteur?: string;
  adresse?: string;
};

const petit = { fontSize: 12, lineHeight: 1.6, color: charte.secondaire, margin: "0 0 8px" } as const;

export function Gabarit({ apercu, titre, children, contact, famille = "transactionnel", pied, expediteur = "ExploCardio.fr", adresse }: GabaritProps) {
  const demonstration = process.env.SITE_MODE !== "prod";
  return (
    <Html lang="fr">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
      </Head>
      <Preview>{apercu}</Preview>
      <Body style={{ margin: 0, backgroundColor: charte.fond, fontFamily: charte.police, color: charte.encre }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "32px 16px" }}>
          {demonstration ? (
            <Text style={{ fontSize: 12, color: charte.secondaire, margin: "0 0 16px" }}>
              Version de démonstration — données fictives. Ce message n’a pas été envoyé.
            </Text>
          ) : null}
          <Img src={urlDuSite("/marque/explocardio-fr-logo.png")} alt="ExploCardio.fr" height={48} />
          <Section
            style={{
              backgroundColor: charte.carte,
              border: `1px solid ${charte.trait}`,
              borderRadius: charte.rayon,
              padding: 24,
              marginTop: 24,
            }}
          >
            <Text role="heading" aria-level={1} style={{ fontSize: 24, fontWeight: 300, lineHeight: 1.2, margin: "0 0 16px" }}>{titre}</Text>
            {children}
          </Section>
          {contact ? (
            <Section style={{ marginTop: 24 }}>
              <Text style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                Une question ? Appelez-nous ou écrivez-nous sur WhatsApp au <strong>{contact.numero}</strong> ({contact.horaires}).{" "}
                <a href={contact.ecrire} style={{ color: charte.action }}>Écrire sur WhatsApp</a>. Ne transmettez aucune donnée patient.
              </Text>
            </Section>
          ) : null}
          <Hr style={{ borderColor: charte.trait, margin: "32px 0 16px" }} />
          {famille !== "transactionnel" && pied ? (
            <Section>
              <Text style={petit}>{pied.raison}</Text>
              <Text style={petit}>
                <a href={pied.preferences} style={{ color: charte.action }}>Gérer mes préférences d’emails</a>
                {famille === "commercial" && pied.desinscription ? (
                  <>
                    {" · "}
                    <a href={pied.desinscription} style={{ color: charte.action }}>Se désinscrire</a>
                  </>
                ) : null}
              </Text>
            </Section>
          ) : null}
          <Text style={petit}>
            {expediteur} — Le spécialiste des explorations fonctionnelles cardiaques (hors imagerie).
            {adresse ? ` ${adresse}.` : ""}
          </Text>
          <Text style={{ ...petit, margin: 0 }}>
            <a href={urlDuSite("/mentions-legales")} style={{ color: charte.secondaire }}>Mentions légales</a>
            {" · "}
            <a href={urlDuSite("/confidentialite")} style={{ color: charte.secondaire }}>Confidentialité</a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

/** Paragraphe standard. */
export function Paragraphe({ children }: { children: ReactNode }) {
  return <Text style={{ fontSize: 16, lineHeight: 1.6, margin: "0 0 12px" }}>{children}</Text>;
}

/** Bouton d'action (pilule, couleur d'action unique). */
export function BoutonEmail({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: charte.action,
        color: charte.surAction,
        borderRadius: charte.pilule,
        padding: "12px 22px",
        fontWeight: 500,
        textDecoration: "none",
        marginTop: 8,
      }}
    >
      {children}
    </a>
  );
}
