import { enApercu } from "@/lib/apercu";

// Bandeau affiché pendant l'aperçu des contenus en préparation (F13, D7) : équipe seulement.
export async function BandeauApercu() {
  if (!(await enApercu())) return null;
  return (
    <div role="region" aria-label="Aperçu" className="bg-ink px-4 py-2 text-center text-small text-surface">
      Aperçu de l’équipe : les contenus en préparation sont visibles.{" "}
      {/* Navigation complète : la route pose le cookie de l'aperçu, ce que <Link> ne ferait pas. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/api/apercu?quitter=1" className="inline-flex min-h-11 items-center text-surface underline">Quitter l’aperçu</a>
    </div>
  );
}
