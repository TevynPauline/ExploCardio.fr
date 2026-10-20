# Contrat du connecteur emailing — évolution F10

Complète le contrat de F11 (`specs/011-connecteurs-base-demonstration/contracts/`). Les deux
modes (démonstration et réel) passent les mêmes tests de contrat
(`tests/contract/emailing/`). Seul `src/domaine/emailing/` appelle ce connecteur.

```ts
export type FamilleEmail = "transactionnel" | "service" | "commercial";

export type EmailClient = {
  modele: string;
  famille: FamilleEmail;
  destinataire: string;
  objet: string;
  /** Rendu HTML final, à la charte. */
  rendu: string;
  /** Version texte (lecteurs d'écran, clients sans HTML). */
  texte: string;
  declencheur: string;
  /** Service et commercial : adresse de désinscription en un clic (en-tête List-Unsubscribe, RFC 8058). */
  desinscription?: string;
};

export type SuiviEnvoi = {
  etat: "envoye" | "remis" | "rejete";
  ouvertLe: Date | null;
  motifRejet: string | null;
  /** Rejet définitif (adresse inexistante) plutôt que temporaire (boîte pleine). */
  rejetDefinitif: boolean;
};

export interface ConnecteurEmailing {
  /** Idempotent par clé : rejouer la même clé ne renvoie rien et rend le même envoiId. */
  envoyerEmail(email: EmailClient, cle: Cle): Promise<{ envoiId: string }>;
  envoyerNotificationEquipe(notification: NotificationEquipe, cle: Cle): Promise<{ envoiId: string }>;
  mettreAJourContact(contact: { email: string; consentements: Record<string, boolean> }): Promise<void>;
  lireSuivi(envoiId: string): Promise<SuiviEnvoi>;
}
```

`envoyerTransactionnel` et `lireEtatRemise` (F11) sont remplacés par `envoyerEmail` et
`lireSuivi` ; tous leurs appels sont dans `src/domaine/emailing/`.

## Erreurs (communes aux deux modes)

| Situation | Erreur |
|---|---|
| Outil indisponible, délai dépassé | `Unavailable` (l'envoi reste programmé) |
| Panne simulée « emailing » (F11) | `Unavailable` |
| Adresse syntaxiquement invalide | `ValidationError` (envoi bloqué, alerte) |
| `lireSuivi` d'un envoi inconnu | `NotFound` |
| Mode réel non configuré | `ConfigurationIncomplete` |

## Démonstration

- Aucun email ni SMS réel ; chaque message va dans `MessageDemonstration` (rendu, texte,
  famille, adresse de désinscription affichée).
- `lireSuivi` : `remis`, ou `rejete` définitif pour `…@rejet.demo.explocardio.test`, ou
  `rejete` temporaire pour `…@temporaire.demo.explocardio.test` ; `ouvertLe` = première
  consultation dans la boîte de démonstration.

## Réel (F14, Brevo — D1)

`POST /v3/smtp/email` avec en-têtes `List-Unsubscribe` et `List-Unsubscribe-Post`, clé
d'idempotence en en-tête personnalisé ; `GET /v3/smtp/emails/{messageId}` ou webhook pour le
suivi ; SMS transactionnels pour les notifications d'équipe. Seuls l'adresse, l'objet, le
rendu et le texte sont transmis (FR-039).
