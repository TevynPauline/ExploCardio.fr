// Données structurées (F21, R6) : bloc JSON-LD lu par les moteurs, invisible à l'écran.
// « < » est échappé pour qu'aucun texte ne puisse fermer la balise script.

export function DonneesStructurees({ donnees }: { donnees: object | object[] }) {
  const json = JSON.stringify(donnees).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
