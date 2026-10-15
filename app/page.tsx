import { Kicker, Logo } from "@/ui";

// Page d'accueil provisoire : remplacée par F01.
export default function Accueil() {
  return (
    <main className="mx-auto max-w-page px-4 py-16">
      <Logo priority />
      <Kicker>Explorations fonctionnelles cardiaques</Kicker>
      <h1 className="text-display font-light">ExploCardio.fr</h1>
      <p className="text-muted">Site en construction.</p>
    </main>
  );
}
