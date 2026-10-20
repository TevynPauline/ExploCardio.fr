import type { PrismaClient } from "@generated/site/client";

// Contenus d'aide de départ (F09, D4) : exemples FICTIFS, sans donnée de patient, à remplacer
// par les vrais contenus de l'équipe. Créés seulement si le centre d'aide est vide.

const ILLUSTRATION = (n: number) => `/demonstration/aide/etape-${n}.svg`;

export async function remplirAideInitiale(db: PrismaClient) {
  if ((await db.contenuAide.count()) > 0) return;
  const publie = { etat: "publie" as const, publieLe: new Date() };
  await db.contenuAide.createMany({
    data: [
      {
        slug: "poser-un-holter-dms-300-4l",
        type: "mode_emploi",
        titre: "Poser un enregistreur Holter DMS 300-4L",
        resume: "Préparer l'enregistreur, placer les électrodes et lancer l'enregistrement (exemple de démonstration).",
        theme: "enregistrement",
        references: ["EC-DMS-3004L", "EC-DMS-3004L-CLOUD", "EC-DMS-3004L-PACK"],
        etapes: [
          { texte: "Insérez une pile neuve et une carte mémoire vide dans l'enregistreur.", image: ILLUSTRATION(1), texteRemplacement: "Enregistreur ouvert, pile et carte mémoire" },
          { texte: "Placez les électrodes selon le schéma de la notice, puis reliez le câble patient.", image: ILLUSTRATION(2), texteRemplacement: "Câble relié à l'enregistreur" },
          { texte: "Lancez l'enregistrement : le voyant confirme le démarrage.", image: ILLUSTRATION(3), texteRemplacement: "Voyant de démarrage allumé" },
        ],
        ordre: 1,
        ...publie,
      },
      {
        slug: "retourner-un-appareil-loue",
        type: "notice",
        titre: "Retourner un appareil en location",
        resume: "Emballer l'appareil, coller l'étiquette de retour et le déposer (procédure de démonstration).",
        theme: "materiel",
        document: "/demonstration/notice-demonstration.pdf",
        ordre: 2,
        ...publie,
      },
      {
        slug: "prolonger-mes-droits-d-assistance",
        type: "faq",
        titre: "Comment prolonger mes droits d'assistance ?",
        resume: "Une commande de consommables au-dessus du seuil prolonge vos droits.",
        theme: "compte",
        reponse: "Chaque commande de consommables ou d'accessoires au-dessus du seuil affiché dans **Mon compte › Droits d'assistance** prolonge votre assistance gratuite. Sans droits actifs, l'assistance à l'acte reste possible.",
        ordre: 1,
        ...publie,
      },
      {
        slug: "recuperer-mes-donnees-cloud",
        type: "faq",
        titre: "Comment récupérer mes données après la fin d'un accès Cloud ?",
        resume: "Pendant le délai de grâce, exportez vos données depuis la plateforme.",
        theme: "logiciels_cloud",
        reponse: "À la fin d'un accès, vous disposez d'un délai de grâce pour consulter et exporter vos données depuis la plateforme. La date est indiquée dans **Mon compte › Logiciels Cloud**.",
        ordre: 2,
        ...publie,
      },
      {
        slug: "enregistrement-interrompu",
        type: "faq",
        titre: "Que faire si un enregistrement s'est interrompu ?",
        resume: "Vérifiez la pile et la carte mémoire, puis contactez-nous.",
        theme: "enregistrement",
        references: ["EC-DMS-3004L", "EC-DMS-3004L-CLOUD"],
        reponse: "Vérifiez la pile et la carte mémoire. Si l'interruption se reproduit, écrivez-nous sur WhatsApp en indiquant le modèle de l'appareil, **sans aucune donnée de patient**.",
        ordre: 3,
        ...publie,
      },
      {
        slug: "retour-appareil-loue",
        type: "faq",
        titre: "Comment retourner un appareil loué ?",
        resume: "Téléchargez l'étiquette de retour depuis Mon compte.",
        theme: "materiel",
        reponse: "Après la résiliation, téléchargez l'étiquette de retour dans **Mon compte › Locations** et déposez le colis avant la date indiquée.",
        ordre: 4,
        ...publie,
      },
      {
        slug: "prise-en-main-cardioscan",
        type: "video",
        titre: "Prise en main de CardioScan Holter ECG",
        resume: "Vidéo à venir : première analyse d'un enregistrement sur la plateforme Cloud.",
        theme: "prise_en_main",
        references: ["EC-DMS-CS-HOLTER-CLOUD"],
        ordre: 3,
        etat: "preparation",
      },
    ],
  });
}
