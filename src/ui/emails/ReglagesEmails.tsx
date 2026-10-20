import { Button } from "@/ui";

// Réglages des emails facultatifs (F10, FR-022) : un réglage par type, sans JavaScript
// obligatoire. Partagé par « Mon compte » et la page de préférences sans connexion.

export type TypeReglable = { cle: string; libelle: string; description: string };

type Props = {
  types: readonly TypeReglable[];
  preferences: Record<string, boolean>;
  action: (d: FormData) => Promise<void>;
  /** Champs cachés communs (jeton du lien, par exemple). */
  champs?: Record<string, string>;
};

export function ReglagesEmails({ types, preferences, action, champs = {} }: Props) {
  return (
    <ul className="flex list-none flex-col gap-3 p-0">
      {types.map((t) => {
        const actif = preferences[t.cle] !== false;
        return (
          <li key={t.cle} aria-label={t.libelle} className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{t.libelle}</p>
              <p className="text-small text-muted">{t.description}</p>
              <p className="text-small">{actif ? "Activé" : "Désactivé"}</p>
            </div>
            <form action={action}>
              {Object.entries(champs).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
              <input type="hidden" name="type" value={t.cle} />
              <input type="hidden" name="actif" value={actif ? "non" : "oui"} />
              <Button type="submit" variante="secondaire">
                {actif ? "Désactiver" : "Activer"}
                <span className="sr-only"> : {t.libelle}</span>
              </Button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
