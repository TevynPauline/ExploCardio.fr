# Interfaces — F10 Emailing automatisé

## Domaine (`src/domaine/emailing/`)

```ts
/** Seul point d'envoi du site (R1). Idempotent par clé. */
demanderEnvoi(demande: {
  modele: CodeModele;
  destinataire?: string;      // ou compteId
  compteId?: string;
  variables: Record<string, string | number | Date | object>;
  cle: string;
  declencheur: string;
  programmeLe?: Date;          // défaut : maintenant (puis règles de fréquence et de plages)
  references?: string[];
  rendu?: EmailRendu;          // transactionnel avec lien secret, rendu tout de suite
}): Promise<{ envoiId: string; etat: EtatEnvoi }>;

notifierEquipe(n: { canal: "email" | "sms"; objet?: string; texte: string; declencheur: string; cle: string }): Promise<void>;

/** Fonction pure : règles de la famille (R3). */
decider(envoi, contexte: { preferences, abonne, statutCompte, adresseSuspendue, envoisRecents, objetToujoursValide }, maintenant): Decision;

releverEnvois(maintenant?): Promise<Bilan>;      // tâche emails-envoi, chaque minute
suivreEnvois(maintenant?): Promise<Bilan>;       // tâche emails-suivi, toutes les 15 min
traiterScenarios(maintenant?): Promise<Bilan>;   // tâche emails-scenarios, 8 h 30 et toutes les heures (panier)

rythme(dates: Date[], regles): { prochaine: Date; intervalleJours: number } | null;   // pure
prochainCreneau(date, plages, joursFeries): Date;                                    // pure
signerJeton(email): string; lireJeton(jeton): string | null;                         // HMAC
lirePreferences(email); changerPreference(email, type, actif, origine);
textesDuModele(code): Promise<TextesModele>; publierModele(code, textes, auteur);
programmerCampagne(id, auteur); annulerCampagne(id, auteur);
statistiquesScenario(scenario, periode): { envoyes, remis, ouverts, commandes };
```

`envoyer(destinataire, email, declencheur, cle)` de `src/domaine/commande/notifications.ts`
devient un relais vers `demanderEnvoi` (le modèle est lu dans `email.modele`).

## Pages et routes

| Adresse | Accès | Rôle |
|---|---|---|
| `/mon-compte/preferences` | client connecté | newsletter, types facultatifs, emails toujours envoyés et leur justification |
| `/preferences/[jeton]` | sans connexion | mêmes réglages pour l'adresse signée ; aucun renseignement du compte |
| `POST /api/emails/desinscription?j=…&objet=…` | sans connexion | désinscription en un clic (RFC 8058), réponse 200 |
| `/panier/recommander?ref=…&quantite=…` | connexion exigée | ajoute l'article au panier puis affiche le panier |
| `/admin/emails` | administrateur | suivi des envois : recherche par client ou adresse, état, motif, aperçu ; lever une suspension ; enregistrer une désinscription reçue par réponse |
| `/admin/emails/scenarios` | administrateur | activer, régler, résultats (envoyés, remis, ouverts, suivis d'une commande) |
| `/admin/emails/modeles` et `/[code]` | administrateur | liste par famille ; modifier, aperçu, email de test, publier, revenir au texte d'origine |
| `/admin/emails/campagnes` et `/[id]` | administrateur | créer, tester, programmer, annuler, résultats |

## Tâches pg-boss

| File | Planification | Rôle |
|---|---|---|
| `emails-envoi` | `* * * * *` | envois dus et reprises après panne |
| `emails-suivi` | `*/15 * * * *` | remise, rejets, ouvertures |
| `emails-scenarios` | `30 8 * * *` | réapprovisionnement, impayés |
| `emails-paniers` | `20 * * * *` | paniers abandonnés |
