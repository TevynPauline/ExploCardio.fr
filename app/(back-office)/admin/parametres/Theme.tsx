import Link from "next/link";
import { lireTheme, THEMES, type Theme } from "@/domaine/parametres";
import { exigerEquipe } from "@/lib/roles";
import { peut, type RoleEquipe } from "@/lib/droits";
import { Kicker, Retour } from "@/ui";
import { ParametreForm } from "./ParametreForm";
import { RappelPatient } from "@/ui/admin";

// Écran Paramètres (F13, US4, D3) : un thème à la fois ; rappel de ce qui se règle dans Odoo.

const ORDRE = Object.keys(THEMES) as Theme[];

export function cheminTheme(theme: Theme) {
  return theme === "bienvenue" ? "/admin/parametres/bienvenue" : `/admin/parametres?theme=${theme}`;
}

export async function EcranParametres({ theme, r }: { theme: Theme; r: { ok?: string; erreur?: string } }) {
  const { role } = await exigerEquipe();
  const parametres = await lireTheme(theme);
  const modifiable = peut(role as RoleEquipe, theme === "bienvenue" ? "parametres.bienvenue" : "parametres", "modifier");
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Paramètres</Kicker>
      <h1 className="text-h2 font-light">Fonctionnement du site</h1>
      <p className="ec-box--promo p-4">
        Les prix, tarifs de mise à disposition, remises, promotions, bons d’achat, droits d’assistance et garanties se règlent dans Odoo, pas ici.
      </p>
      <nav aria-label="Thèmes des paramètres">
        <ul className="flex flex-wrap gap-2">
          {ORDRE.map((t) => (
            <li key={t}>
              <Link href={cheminTheme(t)} aria-current={t === theme ? "page" : undefined} className={`ec-btn ${t === theme ? "ec-btn--primary" : "ec-btn--secondary"}`}>
                {THEMES[t].libelle}
              </Link>
            </li>
          ))}
          {role === "admin" ? (
            <li><Link href="/admin/emails/scenarios" className="ec-btn ec-btn--secondary">Emails automatiques</Link></li>
          ) : null}
        </ul>
      </nav>
      <h2 className="text-h3 font-semibold">{THEMES[theme].libelle}</h2>
      <p className="text-muted">{THEMES[theme].description}</p>
      {!modifiable ? <p className="text-small text-muted">Lecture seule : ces réglages sont modifiés par l’administrateur.</p> : null}
      <Retour {...r} />
      <RappelPatient />
      {parametres.map((p) => <ParametreForm key={p.cle} p={p} modifiable={modifiable} retour={cheminTheme(theme)} />)}
    </div>
  );
}
