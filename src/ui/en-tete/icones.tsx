// Icônes simples au trait, en couleur courante (aucun pictogramme médical, principe VII).

type Props = { className?: string };

export function IconeRecherche({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" strokeLinecap="round" />
    </svg>
  );
}

export function IconePanier({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Z" strokeLinejoin="round" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </svg>
  );
}

export function IconeCompte({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c1.2-3.5 3.8-5 7-5s5.8 1.5 7 5" strokeLinecap="round" />
    </svg>
  );
}

export function IconeMenu({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

export function IconeFermer({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

export function IconeChevron({ className }: Props) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
