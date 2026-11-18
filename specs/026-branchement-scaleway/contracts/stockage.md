# Contrat — connecteur « stockage » (F26)

Interface : `src/connecteurs/stockage/interfaces/index.ts`. Accès par
`registre.stockage()` uniquement.

```ts
type Plage = { debut: number; fin: number }; // octets inclus, fin ≤ taille - 1

interface ConnecteurStockage {
  /** Range un fichier sous son chemin public (« /stockage/<dossier>/<nom>.<ext> »). */
  deposer(chemin: string, type: string, octets: Uint8Array): Promise<void>;

  /** Lit un fichier entier, ou une plage. NotFound s'il n'existe pas. */
  lire(chemin: string, plage?: Plage): Promise<{
    taille: number;               // taille totale du fichier
    plage: Plage | null;          // plage effectivement servie
    corps: ReadableStream<Uint8Array>;
  }>;

  /** Présence d'un fichier (taille et empreinte MD5 hexadécimale si connues). */
  existe(chemin: string): Promise<{ taille: number; md5: string | null } | null>;
}
```

## Règles communes aux deux modes

| Cas | Résultat |
|---|---|
| Chemin hors de `/stockage/…`, avec `..`, `\` ou vide | `ValidationError` (aucun appel) |
| Fichier absent | `lire` → `NotFound("Fichier", chemin)` ; `existe` → `null` |
| Plage hors des limites | `ValidationError` (la route en fait un `416`) |
| Service injoignable, délai dépassé | `ServiceUnavailable("stockage")` |
| Mode réel incomplet ou compartiment incohérent | `ConfigurationIncomplete("stockage", […])` |
| Dépôt du même chemin | remplace le contenu (n'arrive pas : noms aléatoires) |

## Correspondance du mode réel (Scaleway, S3)

| Opération | Appel | Clé d'objet |
|---|---|---|
| `deposer` | `PutObject` (`ContentType`, `ContentMD5`) | chemin sans le `/` initial : `stockage/<dossier>/<nom>` |
| `lire` | `GetObject` (`Range: bytes=d-f` si plage) | idem |
| `existe` | `HeadObject` | idem |

Erreurs S3 : `NoSuchKey` / `404` → `NotFound` ; `403`, `InvalidAccessKeyId`,
`SignatureDoesNotMatch`, `NoSuchBucket` → `ConfigurationIncomplete` ; réseau, `5xx`,
délai → `ServiceUnavailable`. La clé n'apparaît dans aucun message.

## Tests de contrat

`tests/contract/stockage.test.ts` (harnais `suiteDeContrat`) : dépôt puis lecture
identique ; lecture d'une plage ; `existe` avant et après dépôt ; fichier absent ; chemin
refusé ; plage hors limites. En mode réel, la suite s'exécute contre le compartiment de
recette et n'y laisse que des fichiers sous `stockage/tests-contrat/`.
