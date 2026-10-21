"use server";

import { exigerDroit } from "@/lib/droits";
import { redirect } from "next/navigation";
import { SaisieRefusee } from "@/domaine/admin-contenus";
import { enregistrerContenuAide, ETAPES_MAX, publierContenuAide, retirerContenuAide, type SaisieAide } from "@/domaine/aide/administration";
import { FichierRefuse } from "@/lib/stockage";

// Centre d'aide au back-office (F09, US4) : administrateur ; validation, journal, publication.

const t = (d: FormData, cle: string) => String(d.get(cle) ?? "");
const f = (d: FormData, cle: string) => {
  const v = d.get(cle);
  return v instanceof File && v.size > 0 ? v : null;
};

async function auteur() {
  const { user } = await exigerDroit("contenus", "modifier");
  return { id: user.id, libelle: `${user.name} (${user.email})` };
}

function retour(id: string, r: { ok: string } | { erreur: string }): never {
  redirect(`/admin/contenus/aide/${id}?${new URLSearchParams(r).toString()}`);
}

export async function actionEnregistrerAide(d: FormData) {
  const a = await auteur();
  const id = t(d, "id") || null;
  const saisie: SaisieAide = {
    type: t(d, "type"),
    titre: t(d, "titre"),
    resume: t(d, "resume"),
    theme: t(d, "theme"),
    references: t(d, "references"),
    transcription: t(d, "transcription"),
    reponse: t(d, "reponse"),
    etapes: Array.from({ length: ETAPES_MAX }, (_, i) => ({
      texte: t(d, `etape-${i}-texte`),
      texteRemplacement: t(d, `etape-${i}-alt`),
      image: f(d, `etape-${i}-image`),
      imageActuelle: t(d, `etape-${i}-image-actuelle`) || null,
    })),
    video: f(d, "video"),
    sousTitres: f(d, "sousTitres"),
    document: f(d, "document"),
  };
  let enregistre: string;
  try {
    enregistre = (await enregistrerContenuAide(id, saisie, a)).id;
  } catch (e) {
    if (e instanceof SaisieRefusee || e instanceof FichierRefuse) retour(id ?? "nouveau", { erreur: e.message });
    throw e;
  }
  retour(enregistre, { ok: "Contenu enregistré." });
}

export async function actionPublierAide(d: FormData) {
  const a = await auteur();
  const id = t(d, "id");
  try {
    await publierContenuAide(id, a);
  } catch (e) {
    if (e instanceof SaisieRefusee) retour(id, { erreur: e.message });
    throw e;
  }
  retour(id, { ok: "Contenu publié : visible dans le centre d'aide." });
}

export async function actionRetirerAide(d: FormData) {
  const a = await auteur();
  const id = t(d, "id");
  await retirerContenuAide(id, a);
  retour(id, { ok: "Contenu retiré : il n'est plus visible du public." });
}
