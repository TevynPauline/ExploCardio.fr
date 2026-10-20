# Recherche et décisions techniques — F09 Contact WhatsApp et centre d'aide

Point de départ : F01 a posé le module `src/lib/contact-whatsapp.ts` (liens « Appeler » et
« Écrire sur WhatsApp », page de démonstration en phase 1 : aucun `tel:` ni `wa.me` vers un vrai
numéro), le paramètre `contact.whatsapp` et les boutons de la page « Assistance » et de « Mon
compte ». Le modèle `Contenu` connaît déjà les types `faq`, `tutoriel` et `notice`, et la
recherche (F01) réserve les groupes « Tutoriels » et « Questions fréquentes », encore sans
source. F06 a livré la page « Assistance » de l'équipe (recherche par nom, cabinet, email,
téléphone, RPPS, SIRET ; droits en lecture seule). **Aucune nouvelle technologie.**

## R1. Un seul composant de contact

- **Decision** : un composant `ContactWhatsApp` (numéro, horaires, état « nous répondons
  maintenant / nous vous répondrons lundi à 9 h », boutons « Appeler » et « Écrire sur
  WhatsApp » au libellé explicite, mention « Ne transmettez aucune donnée patient ») en deux
  variantes : complète (page Assistance, Mon compte, pages d'aide, fiches) et compacte (pied de
  page). Les emails reçoivent un bloc équivalent dans le gabarit commun (F10 l'héritera).
- Sans numéro renseigné : aucun bouton vide, lien vers le formulaire de contact de F01.
- Le site reste **sans lien technique** avec WhatsApp (FR-002) : des liens `tel:` et
  `https://wa.me/…?text=…` en mode réel, la page de démonstration en phase 1 (FR-017).

## R2. Horaires de réponse (FR-006, FR-008)

- **Decision** : horaires par jour de la semaine (plages début–fin), jours fériés français
  calculés par le calendrier existant (`src/lib/calendrier.ts`, heure de Paris), fermetures
  exceptionnelles (dates ou périodes) ; réglés dans Back-office → Contenus → Coordonnées et
  textes, comme le numéro. Une fonction pure calcule l'état et la prochaine ouverture ; le
  composant est rendu côté serveur à chaque affichage (pas de cache plus long qu'une minute).

## R3. Message pré-rempli (FR-005, SC-005)

- **Decision** : fonction pure `messagePrerempli(compte | null)` : « Bonjour, je suis le Dr
  [nom], cabinet [cabinet]. » (sans cabinet : « Bonjour, je suis le Dr [nom]. » ; compte cabinet
  sans médecin nommé : « Bonjour, cabinet [cabinet]. ») ; visiteur : « Bonjour, je suis le
  Dr …, cabinet … ». Rien d'autre : ni email, ni RPPS, ni numéro de compte. Encodage URL sûr
  (caractères spéciaux, emojis).

## R4. Centre d'aide (FR-011 à FR-016)

- **Decision** : nouveau modèle `ContenuAide` (base du site), plutôt que le `Contenu`
  générique : type (`video`, `mode_emploi`, `notice`, `faq`), titre, résumé, thème, articles et
  logiciels liés (références d'Odoo), corps selon le type (vidéo + sous-titres WebVTT +
  transcription ; étapes texte + image ; PDF ; réponse de FAQ), état (préparation, publié),
  ordre, nombre de consultations. Les types `faq`, `tutoriel`, `notice` de `Contenu`,
  inutilisés, sont retirés.
- **Vidéos hébergées par le site** (stockage existant de F03, comme les notices PDF) : pas de
  YouTube ni Vimeo (service externe et cookies tiers, principes III et V). Sous-titres et
  transcription **obligatoires** pour publier une vidéo (FR-015).
- Pages : `/aide` (recherche, filtres appareil / logiciel / thème, FAQ les plus consultées en
  tête), `/aide/[slug]` (contenu, puis « Besoin d'aide ? » avec les boutons), recherche du
  site complétée (groupes Tutoriels et Questions fréquentes) ; fiches produit : « Aide pour ce
  modèle » ; « Mes logiciels Cloud » : l'aide à la première connexion pointe vers le centre
  d'aide.
- **FAQ « les plus consultées »** : compteur anonyme incrémenté à l'ouverture d'une question
  (sans cookie ni donnée personnelle, limité par session) ; les 5 premières en tête.

## R5. Back-office (FR-008, FR-013)

- Réglages du contact dans Coordonnées et textes ; contenus d'aide dans une nouvelle
  rubrique Contenus → Centre d'aide (administrateur) : création, téléversements (vidéo, VTT,
  PDF, images des étapes), liens aux produits, publication. F13 reprendra ces écrans.

## R6. Droits d'assistance (FR-009, FR-010)

- Déjà livrés par F06 (page Assistance de l'équipe, « Mon compte › Droits d'assistance »). F09
  ajoute l'état des droits **à côté du contact** dans le tableau de bord de « Mon compte ».

## R7. Confidentialité

- La politique de confidentialité mentionne que le médecin transmet lui-même son nom et son
  cabinet à WhatsApp (texte éditable, à valider par le conseil juridique).
