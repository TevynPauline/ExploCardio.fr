"use server";

import { redirect } from "next/navigation";
import { registre } from "@/connecteurs/registre";
import { SaisieRefusee, dateFacultative, exigerLien, exigerTexte, journaliser } from "@/domaine/admin-contenus";
import { invaliderDepuisAction } from "@/lib/cache";
import { dbSite } from "@/lib/db/site";
import { ecrireParametre } from "@/lib/parametres";
import { exigerAdministrateur } from "@/lib/roles";
import { FichierRefuse, deposerImage } from "@/lib/stockage";

// Actions du mini back-office (US6) : administrateur, validation, journal, invalidation du
// cache « contenus » pour un affichage sur le site en moins d'une minute (SC-003).

type Auteur = { id: string; libelle: string };

async function auteur(): Promise<Auteur> {
  const { user } = await exigerAdministrateur();
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

// ------------------------------------------------------------------ Bandeau

export async function enregistrerMessageBandeau(d: FormData) {
  const chemin = "/admin/contenus/bandeau";
  await executer(chemin, "Message enregistré.", async (a) => {
    const id = t(d, "id");
    const debut = dateFacultative(t(d, "debut"), "Début");
    const fin = dateFacultative(t(d, "fin"), "Fin");
    if (debut && fin && fin <= debut) throw new SaisieRefusee("La date de fin doit être après la date de début.");
    const donnees = {
      corps: exigerTexte(t(d, "texte"), "Texte du message", 1, 140),
      lien: exigerLien(t(d, "lien"), false),
      ordre: Number.parseInt(t(d, "ordre") || "0", 10) || 0,
      etat: d.get("actif") === "oui" ? ("publie" as const) : ("retire" as const),
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

// ------------------------------------------------------------------ Actualités

export async function enregistrerActualite(d: FormData) {
  await executer("/admin/contenus/actualites", "Actualité enregistrée.", async (a) => {
    const id = t(d, "id");
    const type = t(d, "typeActualite");
    if (!["actualite", "nouveau_produit", "nouvelle_offre"].includes(type)) throw new SaisieRefusee("Type d'actualité invalide.");
    const image = d.get("image");
    const texteRemplacement = t(d, "texteRemplacement").trim();
    let images: { url: string; texteRemplacement: string }[] | undefined;
    if (image instanceof File && image.size > 0) {
      if (!texteRemplacement) throw new SaisieRefusee("Image : le texte de remplacement est obligatoire.");
      images = [{ url: await deposerImage(image, "actualites"), texteRemplacement }];
    } else if (id && texteRemplacement) {
      const existant = await dbSite().contenu.findUniqueOrThrow({ where: { id } });
      const actuelles = (existant.images as { url: string; texteRemplacement: string }[]) ?? [];
      if (actuelles[0]) images = [{ ...actuelles[0], texteRemplacement }];
    }
    if (d.get("retirerImage") === "oui") images = [];
    const donnees = {
      titre: exigerTexte(t(d, "titre"), "Titre", 1, 90),
      corps: exigerTexte(t(d, "texte"), "Texte", 1, 300),
      lien: exigerLien(t(d, "lien"), false),
      typeActualite: type as "actualite" | "nouveau_produit" | "nouvelle_offre",
      etat: d.get("publie") === "oui" ? ("publie" as const) : ("retire" as const),
      publieLe: dateFacultative(t(d, "publieLe"), "Date") ?? new Date(),
      ...(images !== undefined ? { images } : {}),
    };
    if (id) {
      const avant = await dbSite().contenu.findUniqueOrThrow({ where: { id } });
      await dbSite().contenu.update({ where: { id }, data: donnees });
      await journaliser(a, "contenus.actualite.modifiee", id, avant, donnees);
    } else {
      const cree = await dbSite().contenu.create({ data: { ...donnees, type: "actualite" } });
      await journaliser(a, "contenus.actualite.creee", cree.id, null, donnees);
    }
  });
}

export async function supprimerActualite(d: FormData) {
  await executer("/admin/contenus/actualites", "Actualité supprimée.", async (a) => {
    const id = t(d, "id");
    const avant = await dbSite().contenu.delete({ where: { id } });
    await journaliser(a, "contenus.actualite.supprimee", id, avant, null);
  });
}

// ------------------------------------------------------------------ Coordonnées et textes

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function enregistrerCoordonnees(d: FormData) {
  await executer("/admin/contenus/coordonnees", "Coordonnées et textes enregistrés.", async (a) => {
    const email = t(d, "email").trim();
    const destinataire = t(d, "destinataire").trim();
    const telephone = t(d, "telephone").trim();
    if (email && !EMAIL.test(email)) throw new SaisieRefusee("Email : adresse invalide.");
    if (destinataire && !EMAIL.test(destinataire)) throw new SaisieRefusee("Destinataire des messages : adresse invalide.");
    if (telephone && !/^[+0-9 ().-]{6,20}$/.test(telephone)) throw new SaisieRefusee("Téléphone : numéro invalide.");
    const motifs = t(d, "motifs").split("\n").map((m) => m.trim()).filter(Boolean);
    if (!motifs.length) throw new SaisieRefusee("Motifs : indiquez au moins un motif (un par ligne).");
    const iban = t(d, "iban").replace(/\s+/g, "").toUpperCase();
    if (iban && !/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) throw new SaisieRefusee("IBAN : format invalide.");
    const bic = t(d, "bic").trim().toUpperCase();
    if (bic && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bic)) throw new SaisieRefusee("BIC : format invalide (8 ou 11 caractères).");
    const heureExpress = t(d, "heureExpress").trim();
    if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(heureExpress)) throw new SaisieRefusee("Heure limite express : format HH:MM attendu.");
    const rappel = Number(t(d, "rappelJours"));
    if (!Number.isInteger(rappel) || rappel < 1 || rappel > 15) throw new SaisieRefusee("Rappel de virement : entre 1 et 15 jours.");
    // F05 : calendrier de livraison et rappels des locations (FR-007, FR-040).
    const jours = t(d, "joursNonLivres").split(/\s+/).map((x) => x.trim()).filter(Boolean);
    const joursInvalide = jours.find((x) => !/^\d{4}-\d{2}-\d{2}$/.test(x) || Number.isNaN(new Date(`${x}T12:00:00Z`).getTime()));
    if (joursInvalide) throw new SaisieRefusee(`Jours non livrés : « ${joursInvalide} » n'est pas une date AAAA-MM-JJ.`);
    const zones = t(d, "zones").split(",").map((x) => x.trim()).filter(Boolean);
    if (zones.some((z) => !/^\d{2,5}$/.test(z))) throw new SaisieRefusee("Zones : début de code postal attendu (exemple : 20).");
    const entier = (nom: string, libelle: string, min: number, max: number) => {
      const n = Number(t(d, nom));
      if (!Number.isInteger(n) || n < min || n > max) throw new SaisieRefusee(`${libelle} : nombre entier entre ${min} et ${max}.`);
      return String(n);
    };
    // F09 : numéro WhatsApp, horaires de réponse et fermetures exceptionnelles (FR-008).
    const whatsapp = t(d, "whatsapp").trim();
    if (whatsapp && !/^\+?[0-9 ().-]{6,20}$/.test(whatsapp)) throw new SaisieRefusee("Numéro WhatsApp : numéro invalide (format international, ex. +33 6 12 34 56 78).");
    const horaires: Record<string, [string, string][]> = {};
    for (const j of ["1", "2", "3", "4", "5", "6", "7"]) {
      const brut = t(d, `horaires-${j}`).trim();
      horaires[j] = [];
      for (const plage of brut ? brut.split(/[,;]\s*/) : []) {
        const m = /^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/.exec(plage.trim());
        if (!m || `${m[1]}:${m[2]}` >= `${m[3]}:${m[4]}`) throw new SaisieRefusee(`Horaires : « ${plage} » n'est pas une plage valide (exemple : 09:00-18:00).`);
        horaires[j].push([`${m[1]}:${m[2]}`, `${m[3]}:${m[4]}`]);
      }
    }
    const fermetures = t(d, "fermetures").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = /^(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})\s*(.*)$/.exec(l);
      if (!m || m[1]! > m[2]!) throw new SaisieRefusee(`Fermetures : « ${l} » attendu sous la forme AAAA-MM-JJ AAAA-MM-JJ motif.`);
      return { du: m[1]!, au: m[2]!, ...(m[3] ? { motif: m[3].slice(0, 80) } : {}) };
    });
    // F06 et F12 : rappels et accès Cloud (principe VI).
    const urlPlateforme = t(d, "urlPlateforme").trim();
    if (!/^(https:\/\/[^\s]+|\/[A-Za-z0-9/_-]*)$/.test(urlPlateforme)) throw new SaisieRefusee("Adresse de la plateforme : https://… ou chemin du site commençant par /.");
    const valeurs: Record<string, string> = {
      "contact.whatsapp": whatsapp,
      "contact.horaires": JSON.stringify(horaires),
      "contact.fermetures": JSON.stringify(fermetures),
      "fidelite.rappel_droits_jours": entier("rappelDroits", "Rappel avant la fin des droits", 1, 60),
      "fidelite.rappel_expiration_jours": entier("rappelExpiration", "Rappel avant l'expiration de bons", 1, 120),
      "cloud.delai_grace_jours": entier("delaiGrace", "Délai de grâce", 0, 180),
      "cloud.rappel_periode_jours": entier("rappelPeriode", "Rappel avant la fin d'une période incluse", 1, 120),
      "cloud.rappel_fin_jours": entier("rappelFinCloud", "Rappel avant la fin d'un accès Cloud", 1, 60),
      "cloud.url_plateforme": urlPlateforme,
      "cloud.aide_premiere_connexion": exigerTexte(t(d, "aideConnexion"), "Aide à la première connexion", 20, 1500),
      "livraison.jours_non_livres": JSON.stringify([...new Set(jours)].sort()),
      "livraison.zones_sans_lendemain": JSON.stringify(zones),
      "livraison.delai_zones_jours": entier("delaiZones", "Délai des zones éloignées", 0, 10),
      "location.rappel_echeance_jours": entier("rappelEcheance", "Rappel avant échéance", 1, 15),
      "location.rappel_retour_jours": entier("rappelRetour", "Rappel de retour", 1, 15),
      "location.conditions": exigerTexte(t(d, "conditionsLocation"), "Conditions de location", 20, 4000),
      "virement.titulaire": exigerTexte(t(d, "titulaire"), "Titulaire du compte", 0, 100),
      "virement.iban": iban,
      "virement.bic": bic,
      "virement.rappel_jours": String(rappel),
      "commande.heure_limite_express": heureExpress,
      "contact.email": email,
      "contact.telephone": telephone,
      "contact.adresse": exigerTexte(t(d, "adresse"), "Adresse", 0, 200),
      "contact.destinataire_messages": destinataire,
      "contact.motifs": JSON.stringify(motifs),
      "accueil.offre_bienvenue": exigerTexte(t(d, "offreBienvenue"), "Texte de l'offre de bienvenue", 0, 300),
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
