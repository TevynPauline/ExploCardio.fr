# F17 — Page d'attente sur explocardio.fr

**Statut** : démarche allégée (demande urgente du 2026-10-27, salon de cardiologie du lendemain).

## Contexte et objectif

Les brochures distribuées au salon portent un QR code vers `https://www.explocardio.fr`. Le site
n'est pas encore ouvert : seule la démonstration existe, protégée par mot de passe. Le QR code doit
mener à une page publique qui annonce l'ouverture prochaine et permet aux cardiologues de demander
à être prévenus. La démonstration reste à son adresse actuelle, protégée.

## Parcours

1. **Visiteur du QR code** : il arrive sur `www.explocardio.fr`, voit le logo, la signature, ce
   que proposera le site et un formulaire « Être prévenu de l'ouverture » (nom, adresse email,
   case de consentement). Après l'envoi, un message confirme l'inscription. Le formulaire se vide :
   Régis peut inscrire plusieurs visiteurs à la suite sur sa tablette.
2. **Équipe** : dans le back-office, Demandes → « Inscriptions à l'ouverture », elle voit la
   liste (date, nom, email), l'exporte en CSV pour l'annonce d'ouverture et peut supprimer une
   inscription (demande RGPD).

## Exigences

- **FR-001** Sur les adresses déclarées comme « page d'attente » (configuration de
  l'hébergement), toute adresse du site affiche la page d'attente ou y renvoie. Aucune page de
  la démonstration, du back-office ni de l'API n'y est accessible, même avec le mot de passe de
  démonstration.
- **FR-002** La page d'attente est publique (sans mot de passe), sans bandeau « Version de
  démonstration », conforme à la charte, accessible (WCAG 2.2 AA) et lisible sur mobile. Elle
  n'est pas indexée par les moteurs de recherche.
- **FR-003** Le formulaire demande le nom (obligatoire, 120 caractères au plus), l'adresse email
  (obligatoire, valide), le téléphone (facultatif), un commentaire (facultatif, 2 000 caractères
  au plus, sans donnée de patient) et le consentement explicite (case non cochée par défaut). Le texte du
  consentement est conservé avec l'inscription et dans le registre des consentements.
- **FR-004** Une même adresse email n'est inscrite qu'une fois ; un nouvel envoi met à jour le nom
  et le téléphone et ajoute le commentaire, daté, à la suite des précédents. La réponse est la
  même dans tous les cas.
- **FR-005** Protection contre les robots identique aux autres formulaires publics (champ piège,
  délai minimal). La limite d'envois est relevée (30 par heure) pour permettre les inscriptions à
  la suite depuis un même appareil.
- **FR-006** Aucun email n'est envoyé à l'inscription (emailing encore en démonstration).
- **FR-007** Les inscriptions sont des données réelles : la réinitialisation de la démonstration
  ne les efface pas.
- **FR-008** Back-office : liste, export CSV (UTF-8, séparateur point-virgule pour Excel) et
  suppression journalisée, pour les rôles qui voient les demandes ; la suppression demande le
  droit de modifier les demandes.
- **FR-009** La page indique les coordonnées publiques (email, téléphone) si elles sont
  renseignées, et comment demander la suppression de ses données.

## Critères d'acceptation [Phase 1]

- **SC-001** Sur l'adresse de la page d'attente, `/` affiche la page et `/catalogue`, `/admin`,
  `/demo/acces` renvoient vers `/`, sans mot de passe.
- **SC-002** Une inscription valide apparaît dans le back-office et dans l'export CSV ; une
  seconde inscription avec la même adresse n'ajoute pas de ligne.
- **SC-003** L'adresse de démonstration reste protégée et inchangée.
- **SC-004** Aucun défaut d'accessibilité détecté (axe) sur la page d'attente, en mobile et sur
  ordinateur.

## Hors périmètre

Email de confirmation, double consentement, référencement de la page, envoi de l'annonce
d'ouverture (fait plus tard depuis l'outil d'emailing avec l'export).

## Révision du 2026-10-28 (retours de Pauline)

Titre « Plus que quelques jours avant le lancement officiel du site ExploCardio.fr », nouvelle
accroche, téléphone et commentaire facultatifs, bouton « Envoyer », confirmation « Message bien
envoyé, nous revenons vers vous rapidement. », consentement et mention de confidentialité
étendus à la réponse aux demandes. Back-office : téléphone et commentaires dans la liste
(cartes) et dans l'export CSV.
