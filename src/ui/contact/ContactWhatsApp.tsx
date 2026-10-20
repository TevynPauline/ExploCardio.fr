import Link from "next/link";
import { contactAffiche } from "@/domaine/contact/contact";
import { cx } from "../cx";

const MENTION = "Ne transmettez aucune donnée patient.";

/**
 * Contact WhatsApp (F09, FR-001 à FR-007) : numéro, horaires, état, boutons « Appeler » et
 * « Écrire sur WhatsApp » (ils ouvrent une autre application), mention sur les données de
 * patients. Sans numéro renseigné : lien vers le formulaire de contact (D7).
 */
export async function ContactWhatsApp({ variante = "complete", titre = "Besoin d’aide ?", className }: { variante?: "complete" | "compacte"; titre?: string; className?: string }) {
  const { liens, horaires, etat } = await contactAffiche();
  if (!liens) {
    return (
      <p className={cx(variante === "compacte" ? "text-small text-white" : "", className)}>
        Une question ?{" "}
        <Link href="/qui-sommes-nous#contact" className={variante === "compacte" ? "text-white underline underline-offset-2" : ""}>
          Écrivez-nous
        </Link>
        .
      </p>
    );
  }
  const appeler = `Appeler le ${liens.numeroAffiche}`;
  if (variante === "compacte") {
    return (
      <section aria-label="Contact rapide" className={cx("flex flex-col gap-1 text-small text-white", className)}>
        <p className="font-semibold">{liens.numeroAffiche} · appel ou WhatsApp</p>
        <p>{horaires}. {etat.libelle}</p>
        <p className="flex flex-wrap gap-x-4">
          <a href={liens.appeler} aria-label={`${appeler} (ouvre votre téléphone)`} className="inline-flex min-h-11 items-center text-white underline underline-offset-2">Appeler</a>
          <a href={liens.ecrire} aria-label="Écrire sur WhatsApp (ouvre WhatsApp)" className="inline-flex min-h-11 items-center text-white underline underline-offset-2">Écrire sur WhatsApp</a>
        </p>
        <p>{MENTION}</p>
      </section>
    );
  }
  return (
    <section aria-label="Contacter l’équipe" className={cx("ec-card flex flex-col gap-3", className)}>
      <p className="text-h3 font-semibold">{titre} Écrivez-nous ou appelez-nous sur WhatsApp.</p>
      <p>
        <strong className="text-ink">{liens.numeroAffiche}</strong> — {horaires}.
        <span className="block text-small">{etat.libelle}</span>
      </p>
      <div className="flex flex-wrap gap-3">
        <a href={liens.appeler} aria-label={`${appeler} (ouvre votre téléphone)`} className="ec-btn ec-btn--primary">Appeler</a>
        <a href={liens.ecrire} aria-label="Écrire sur WhatsApp (ouvre WhatsApp)" className="ec-btn ec-btn--secondary">Écrire sur WhatsApp</a>
      </div>
      <p className="text-small text-muted">{MENTION}</p>
    </section>
  );
}
