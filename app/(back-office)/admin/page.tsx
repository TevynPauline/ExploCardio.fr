import { registre } from "@/connecteurs/registre";
import { modeDuSite } from "@/lib/config";
import { Card, Kicker } from "@/ui";

export default async function TableauDeBord({
  searchParams,
}: {
  searchParams: Promise<{ acces?: string }>;
}) {
  const { acces } = await searchParams;
  const modes = registre.modes();
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Back-office</Kicker>
      <h1 className="text-h2 font-light">Tableau de bord</h1>
      {acces === "refuse" ? (
        <p role="alert" className="ec-box--info p-4">
          Cette page est réservée à un autre rôle.
        </p>
      ) : null}
      <Card>
        <h2 className="text-h3 font-semibold">Mode des connecteurs</h2>
        <p className="text-muted">Site : {modeDuSite() === "demo" ? "démonstration" : "production"}</p>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {Object.entries(modes).map(([nom, mode]) => (
            <li key={nom}>
              <span className="font-medium">{nom}</span> : {mode === "demo" ? "démonstration" : "réel"}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
