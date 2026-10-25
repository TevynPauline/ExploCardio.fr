"use server";

import { exigerDroit } from "@/lib/droits";
import { redirect } from "next/navigation";
import { registre } from "@/connecteurs/registre";
import { SaisieRefusee, dateFacultative, exigerLien, exigerTexte, exigerTexteRemplacement, journaliser, verifierVersionContenu } from "@/domaine/admin-contenus";
import { invaliderDepuisAction } from "@/lib/cache";
import { dbSite } from "@/lib/db/site";
import { ecrireParametre } from "@/lib/parametres";
import { FichierRefuse, deposerImage } from "@/lib/stockage";

// Actions du mini back-office (US6) : administrateur, validation, journal, invalidation du
// cache « contenus » pour un affichage sur le site en moins d'une minute (SC-003).

type Auteur = { id: string; libelle: string };

async function auteur(): Promise<Auteur> {
  const { user } = await exigerDroit("contenus", "modifier");
  return { id: user.id, libelle: `${user.name} (${user.email})` };
}

function retour(chemin: string, r: { ok: string } | { erreur: string }): never {
  redirect(`${chemin}?${new URLSearchParams(r).toString()}`);
}

async function executer(chemin: string, succes: string, operation: (a: Auteur) => Promise<void>): Promise<never> {
  const a = await auteur();
  try {
    await operation(a);
  } catch (e) {
    if (e instanceof SaisieRefusee || e instanceof FichierRefuse) retour(chemin, { erreur: e.message });
    throw e;
  }
  invaliderDepuisAction("contenus");
  retour(chemin, { ok: succes });
}

const t = (d: FormData, cle: string) => String(d.get(cle) ?? "");

/** Verrou optimiste (F13, D9) : refuse si le contenu a changé depuis l'ouverture du formulaire. */
const verifierVersion = (id: string, d: FormData) => verifierVersionContenu(id, t(d, "modifieLe"));

/** État choisi dans le formulaire (F13, US2) ; « publié » par défaut. */
function etatChoisi(d: FormData): "preparation" | "publie" | "retire" {
  const e = t(d, "etat");
  return e === "preparation" || e === "retire" ? e : "publie";
}

// ------------------------------------------------------------------ Bandeau

export async function enregistrerMessageBandeau(d: FormData) {
  const chemin = "/admin/contenus/bandeau";
  await executer(chemin, "Message enregistré.", async (a) => {
    const id = t(d, "id");
    await verifierVersion(id, d);
    const debut = dateFacultative(t(d, "debut"), "Début");
    const fin = dateFacultative(t(d, "fin"), "Fin");
    if (debut && fin && fin <= debut) throw new SaisieRefusee("La date de fin doit être après la date de début.");
    const donnees = {
      corps: exigerTexte(t(d, "texte"), "Texte du message", 1, 140),
      lien: exigerLien(t(d, "lien"), false),
      ordre: Number.parseInt(t(d, "ordre") || "0", 10) || 0,
      etat: etatChoisi(d),
      debut,
      fin,
    };
    if (id) {
      const avant = await dbSite().contenu.findUniqueOrThrow({ where: { id } });
      await dbSite().contenu.update({ where: { id }, data: donnees });
      await journaliser(a, "contenus.bandeau.modifie", id, avant, donnees);
    } else {
      const cree = await dbSite().contenu.create({ data: { ...donnees, type: "bandeau", titre: "Message du bandeau" } });
      await journaliser(a, "contenus.bandeau.cree", cree.id, null, donnees);
    }
  });
}

export async function supprimerMessageBandeau(d: FormData) {
  await executer("/admin/contenus/bandeau", "Message supprimé.", async (a) => {
    const id = t(d, "id");
    const avant = await dbSite().contenu.delete({ where: { id } });
    await journaliser(a, "contenus.bandeau.supprime", id, avant, null);
  });
}

// ------------------------------------------------------------------ Tuiles

const FONDS = ["pale", "blue-soft", "lin", "mint"];

export async function enregistrerTuile(d: FormData) {
  await executer("/admin/contenus/tuiles", "Tuile enregistrée.", async (a) => {
    const id = t(d, "id");
    const fond = t(d, "fond");
    if (!FONDS.includes(fond)) throw new SaisieRefusee("Fond : choisissez un encart de la charte.");
    const donnees = {
      titre: exigerTexte(t(d, "titre"), "Titre", 1, 40),
      corps: exigerTexte(t(d, "phrase"), "Phrase", 1, 120),
      lien: exigerLien(t(d, "lien"), true),
      badge: t(d, "badge").trim() || null,
      fond,
      ordre: Number.parseInt(t(d, "ordre") || "0", 10) || 0,
    };
    const avant = await dbSite().contenu.findUniqueOrThrow({ where: { id } });
    await dbSite().contenu.update({ where: { id }, data: donnees });
    await journaliser(a, "contenus.tuile.modifiee", id, avant, donnees);
  });
}

// ------------------------------------------------------------------ Carrousel (F16)

const FONDS_VIGNETTE = ["pale", "blue-soft", "lin", "mint"];

/** Lien d'une vignette : page du site, fiche produit publiée ou adresse https:// (F16, FR-013). */
async function lienVignette(saisie: string): Promise<string | null> {
  const lien = saisie.trim();
  if (!lien) return null;
  const { cheminsFichesPubliees, lienDisponible } = await import("@/domaine/vignettes");
  if (lienDisponible(lien, await cheminsFichesPubliees())) return lien;
  return exigerLien(lien, true);
}

export async function enregistrerVignette(d: FormData) {
  await executer("/admin/contenus/carrousel", "Vignette enregistrée.", async (a) => {
    const id = t(d, "id");
    await verifierVersion(id, d);
    const fond = t(d, "fond") || "pale";
    if (!FONDS_VIGNETTE.includes(fond)) throw new SaisieRefusee("Fond : choisissez un encart de la charte.");
    const lien = await lienVignette(t(d, "lien"));
    const libelleLien = exigerTexte(t(d, "libelleLien"), "Texte du bouton", 0, 30) || null;
    if (Boolean(lien) !== Boolean(libelleLien)) throw new SaisieRefusee("Bouton : indiquez à la fois son texte et son lien, ou aucun des deux.");
    const image = d.get("image");
    const texteRemplacement = t(d, "texteRemplacement").trim();
    let images: { url: string; texteRemplacement: string }[] | undefined;
    if (image instanceof File && image.size > 0) {
      images = [{ url: await deposerImage(image, "vignettes"), texteRemplacement: exigerTexteRemplacement(texteRemplacement) }];
    } else if (id && texteRemplacement) {
      const existant = await dbSite().contenu.findUniqueOrThrow({ where: { id } });
      const actuelles = (existant.images as { url: string; texteRemplacement: string }[]) ?? [];
      if (actuelles[0]) images = [{ ...actuelles[0], texteRemplacement: exigerTexteRemplacement(texteRemplacement) }];
    }
    if (d.get("retirerImage") === "oui") images = [];
    const donnees = {
      titre: exigerTexte(t(d, "titre"), "Titre", 1, 60),
      corps: exigerTexte(t(d, "phrase"), "Phrase", 1, 140),
      lien,
      libelleLien,
      fond,
      etat: etatChoisi(d),
      debut: dateFacultative(t(d, "debut"), "Début"),
      fin: dateFacultative(t(d, "fin"), "Fin"),
      ...(images !== undefined ? { images } : {}),
    };
    if (donnees.debut && donnees.fin && donnees.debut >= donnees.fin) throw new SaisieRefusee("La fin doit être après le début.");
    if (id) {
      const avant = await dbSite().contenu.findUniqueOrThrow({ where: { id } });
      await dbSite().contenu.update({ where: { id }, data: donnees });
      await journaliser(a, "contenus.vignette.modifiee", id, avant, donnees);
    } else {
      const ordre = (await dbSite().contenu.aggregate({ where: { type: "vignette" }, _max: { ordre: true } }))._max.ordre ?? 0;
      const cree = await dbSite().contenu.create({ data: { ...donnees, type: "vignette", ordre: ordre + 1 } });
      await journaliser(a, "contenus.vignette.creee", cree.id, null, donnees);
    }
  });
}

/** Monte ou descend une vignette d'un cran dans l'ordre du carrousel. */
export async function deplacerVignette(d: FormData) {
  await executer("/admin/contenus/carrousel", "Ordre du carrousel enregistré.", async (a) => {
    const id = t(d, "id");
    const sens = t(d, "sens") === "haut" ? -1 : 1;
    const liste = await dbSite().contenu.findMany({ where: { type: "vignette" }, orderBy: [{ ordre: "asc" }, { creeLe: "asc" }], select: { id: true } });
    const i = liste.findIndex((v) => v.id === id);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= liste.length) return;
    [liste[i], liste[j]] = [liste[j]!, liste[i]!];
    await dbSite().$transaction(liste.map((v, k) => dbSite().contenu.update({ where: { id: v.id }, data: { ordre: k + 1 } })));
    await journaliser(a, "contenus.vignette.deplacee", id, { position: i + 1 }, { position: j + 1 });
  });
}

export async function supprimerVignette(d: FormData) {
  await executer("/admin/contenus/carrousel", "Vignette supprimée.", async (a) => {
    const id = t(d, "id");
    const v = await dbSite().contenu.findUniqueOrThrow({ where: { id } });
    if (v.cle === "offre-bienvenue") throw new SaisieRefusee("La vignette de l'offre de bienvenue ne se supprime pas : retirez-la, ou désactivez l'offre dans Paramètres.");
    await dbSite().contenu.delete({ where: { id } });
    await journaliser(a, "contenus.vignette.supprimee", id, v, null);
  });
}

// ------------------------------------------------------------------ Pourquoi préférer ExploCardio.fr (F16)

export async function enregistrerArguments(d: FormData) {
  await executer("/admin/contenus/accueil", "Arguments enregistrés.", async (a) => {
    const lignes = await dbSite().contenu.findMany({ where: { type: "argument" } });
    // Verrou (F13, D9) : la version lue est celle de la ligne modifiée le plus récemment.
    const lu = t(d, "modifieLe");
    const recente = lignes.reduce<Date | null>((m, l) => (!m || l.modifieLe > m ? l.modifieLe : m), null);
    if (lu && recente && recente.toISOString() !== lu) {
      const derniere = await dbSite().journalAction.findFirst({ where: { action: "contenus.argument.modifie" }, orderBy: { date: "desc" } });
      throw new SaisieRefusee(`Ces arguments ont été modifiés${derniere ? ` par ${derniere.auteur}` : ""} depuis que vous avez ouvert la page : rien n'a été écrasé. Rechargez la page.`);
    }
    const saisies = [
      { cle: "intro", titre: exigerTexte(t(d, "titre-intro"), "Titre de la section", 1, 60), corps: exigerTexte(t(d, "corps-intro"), "Introduction", 0, 200) },
      ...["1", "2", "3", "4"].map((c) => ({ cle: c, titre: exigerTexte(t(d, `titre-${c}`), `Argument ${c} : titre`, 1, 60), corps: exigerTexte(t(d, `corps-${c}`), `Argument ${c} : phrase`, 1, 200) })),
    ];
    for (const [i, s] of saisies.entries()) {
      const avant = lignes.find((l) => l.cle === s.cle);
      if (avant && avant.titre === s.titre && avant.corps === s.corps) continue;
      await dbSite().contenu.upsert({
        where: { type_cle: { type: "argument", cle: s.cle } },
        create: { type: "argument", cle: s.cle, titre: s.titre, corps: s.corps, ordre: i, etat: "publie" },
        update: { titre: s.titre, corps: s.corps },
      });
      await journaliser(a, "contenus.argument.modifie", s.cle, avant ? { titre: avant.titre, corps: avant.corps } : null, { titre: s.titre, corps: s.corps });
    }
  });
}

// ------------------------------------------------------------------ Coordonnées et textes

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Coordonnées affichées et textes (F01, F05, F12) ; les paramètres de fonctionnement sont dans
// l'écran Paramètres (F13, D3).
export async function enregistrerCoordonnees(d: FormData) {
  await executer("/admin/contenus/coordonnees", "Coordonnées et textes enregistrés.", async (a) => {
    const email = t(d, "email").trim();
    const telephone = t(d, "telephone").trim();
    if (email && !EMAIL.test(email)) throw new SaisieRefusee("Email : adresse invalide.");
    if (telephone && !/^[+0-9 ().-]{6,20}$/.test(telephone)) throw new SaisieRefusee("Téléphone : numéro invalide.");
    const motifs = t(d, "motifs").split("\n").map((m) => m.trim()).filter(Boolean);
    if (!motifs.length) throw new SaisieRefusee("Motifs : indiquez au moins un motif (un par ligne).");
    const valeurs: Record<string, string> = {
      "contact.email": email,
      "contact.telephone": telephone,
      "contact.adresse": exigerTexte(t(d, "adresse"), "Adresse", 0, 200),
      "contact.motifs": JSON.stringify(motifs),
      "location.conditions": exigerTexte(t(d, "conditionsLocation"), "Conditions de location", 20, 4000),
      "cloud.aide_premiere_connexion": exigerTexte(t(d, "aideConnexion"), "Aide à la première connexion", 20, 1500),
      "accueil.engagements_reactivite": exigerTexte(t(d, "engagements"), "Engagements de réactivité", 0, 400),
      "accueil.badge_hebergement": exigerTexte(t(d, "badgeHebergement"), "Badge de l'hébergement", 0, 30),
      "accueil.badge_logiciel_cloud": exigerTexte(t(d, "badgeLogicielCloud"), "Badge du logiciel Cloud", 0, 30),
    };
    for (const [cle, valeur] of Object.entries(valeurs)) {
      const avant = await dbSite().parametre.findUnique({ where: { cle } });
      if (avant?.valeur === valeur) continue;
      await ecrireParametre(cle, valeur, a.id);
      await journaliser(a, "contenus.parametre.modifie", cle, avant?.valeur ?? null, valeur);
    }
  });
}

// ------------------------------------------------------------------ Menus

const ENTREES = ["holter_ecg", "holter_tensionnel", "epreuve_effort", "accessoires", "services", "financement", "qui_sommes_nous"] as const;

export async function ajouterElementMenu(d: FormData) {
  await executer("/admin/contenus/menus", "Élément ajouté au menu.", async (a) => {
    const entree = t(d, "entree") as (typeof ENTREES)[number];
    if (!ENTREES.includes(entree)) throw new SaisieRefusee("Entrée de menu inconnue.");
    const type: "lien_rapide" | "produit_phare" = t(d, "type") === "lien_rapide" ? "lien_rapide" : "produit_phare";
    const deja = await dbSite().elementMenu.count({ where: { entree, type } });
    if (deja >= 4) throw new SaisieRefusee("4 éléments de ce type au plus par entrée.");
    let donnees;
    if (type === "produit_phare") {
      const reference = t(d, "reference").trim();
      const references = await registre.odoo().catalogue.listerReferences();
      const article = references.find((r) => r.defaultCode === reference || r.referenceArticle === reference);
      if (!article) throw new SaisieRefusee(`Référence inconnue dans le catalogue : ${reference || "(vide)"}.`);
      donnees = { entree, type, defaultCode: article.referenceArticle, ordre: deja + 1 };
    } else {
      donnees = { entree, type, libelle: exigerTexte(t(d, "libelle"), "Libellé", 1, 50), lien: exigerLien(t(d, "lien"), true), ordre: deja + 1 };
    }
    const cree = await dbSite().elementMenu.create({ data: donnees });
    await journaliser(a, "contenus.menu.ajoute", cree.id, null, donnees);
    invaliderDepuisAction("catalogue");
  });
}

export async function supprimerElementMenu(d: FormData) {
  await executer("/admin/contenus/menus", "Élément retiré du menu.", async (a) => {
    const avant = await dbSite().elementMenu.delete({ where: { id: t(d, "id") } });
    await journaliser(a, "contenus.menu.retire", avant.id, avant, null);
    invaliderDepuisAction("catalogue");
  });
}

// ------------------------------------------------------------------ Marques

export async function enregistrerMarque(d: FormData) {
  await executer("/admin/contenus/marques", "Marque enregistrée.", async (a) => {
    const id = t(d, "id");
    const familles = d.getAll("familles").map(String).filter((f) => ["holter-ecg", "mapa", "effort"].includes(f));
    const logo = d.get("logo");
    const donnees = {
      nom: exigerTexte(t(d, "nom"), "Nom", 1, 50),
      familles,
      ordre: Number.parseInt(t(d, "ordre") || "0", 10) || 0,
      visible: d.get("visible") === "oui",
      ...(logo instanceof File && logo.size > 0 ? { logo: await deposerImage(logo, "marques") } : {}),
      ...(d.get("retirerLogo") === "oui" ? { logo: null } : {}),
    };
    const homonyme = await dbSite().marque.findUnique({ where: { nom: donnees.nom } });
    if (homonyme && homonyme.id !== id) throw new SaisieRefusee("Une marque porte déjà ce nom.");
    if (id) {
      const avant = await dbSite().marque.findUniqueOrThrow({ where: { id } });
      await dbSite().marque.update({ where: { id }, data: donnees });
      await journaliser(a, "contenus.marque.modifiee", id, avant, donnees);
    } else {
      const cree = await dbSite().marque.create({ data: donnees });
      await journaliser(a, "contenus.marque.creee", cree.id, null, donnees);
    }
  });
}
