# Implementation Plan: F10 — Emailing automatisé

**Branch**: `010-emailing-automatise` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-emailing-automatise/spec.md`

## Summary

F10 fait passer **tous** les emails du site par un point unique qui décide (famille,
consentement, préférences, adresse rejetée, fréquence, plages horaires), trace, envoie par le
connecteur emailing et réessaie. Il ajoute les scénarios automatisés (réapprovisionnement,
alertes de bons et de droits, panier abandonné, relances d'impayés), les campagnes
commerciales réservées aux abonnés, un centre de préférences (connecté ou par lien signé, sans
connexion) et les écrans d'administration (scénarios, modèles modifiables, campagnes, suivi des
envois).

Approche : **aucune nouvelle dépendance**. Les ~65 modèles existants (F02 à F12) gardent leur
mise en page React Email ; leurs **textes** deviennent modifiables au back-office (valeurs par
défaut dans le code, version publiée en base). Une table `Envoi` sert à la fois de trace et de
file d'envoi (relève toutes les minutes par pg-boss). L'outil réel retenu pour F14 est
**Brevo** ; en phase 1, la boîte de démonstration existante. Détails : [research.md](research.md).

## Technical Context

**Language/Version** : TypeScript (mode strict) sur Node.js 24 LTS — inchangé

**Primary Dependencies** : celles de F11 à F12 (React Email, pg-boss, Prisma), sans ajout

**Storage** : base du site — `Envoi`, `ModeleEmail`, `PreferencesEmail`, `AdresseRejetee`,
`Campagne` ; consentements dans `Consentement` (existant) ; paramètres dans `Parametre` —
voir [data-model.md](data-model.md). Base de démonstration : niveaux de relance d'impayés
(équivalent des relances de factures d'Odoo).

**Testing** : Vitest (décision d'envoi par famille, préférences, fréquence, plages, rythme de
commande, échéances uniques, relances d'impayés, jetons signés, variables manquantes, reprise
après panne sans doublon) ; tests de contrat du connecteur emailing (deux modes) ; Playwright
avec axe-core (centre de préférences, page sans connexion, écrans d'administration, boîte de
démonstration, emails lisibles sur mobile)

**Target Platform** : navigateurs récents et clients de messagerie (Gmail, Outlook, Apple
Mail, mobile, mode sombre, images bloquées) ; serveur Node.js (Scalingo)

**Project Type** : application web unique

**Performance Goals** : email transactionnel parti en moins de 5 minutes (SC-003), en pratique
immédiatement ; désinscription effective en moins d'une minute, y compris pour les envois
programmés (SC-004)

**Constraints** : aucun email réel en phase 1 (FR-042) ; transactionnels jamais retardés ni
bloqués par une préférence (FR-003, FR-031) ; aucune donnée de patient, de carte ni de mot de
passe (SC-011) ; seules les données nécessaires transmises à l'outil (FR-039) ; WCAG 2.2 AA

**Scale/Scope** : quelques centaines de clients, quelques milliers d'emails par mois ;
~65 modèles ; 4 scénarios + relances d'impayés + campagnes ; 1 page « Mon compte », 1 page
publique de préférences, 4 écrans du back-office

## Constitution Check

| Principe | Vérification | État |
|---|---|---|
| I. Spécialisation | Relances centrées sur les consommables du cardiologue | ✅ |
| II. Simplicité | Recommander en un geste ; préférences en une page, sans connexion | ✅ |
| III. Connecteurs | Tout envoi par le connecteur emailing, appelé par un seul module (`src/domaine/emailing/`) ; données des scénarios lues par le connecteur Odoo ; aucune donnée fictive vers un service réel | ✅ |
| IV. Aucune donnée patient | Variables des modèles en liste fermée ; contrôle avant envoi | ✅ |
| V. Sécurité et conformité | Consentement pour le commercial, preuve horodatée (`Consentement`) ; désinscription en un clic (en-tête List-Unsubscribe en mode réel) ; liens signés ; contenu sensible effacé après envoi ; mesure d'ouverture mentionnée dans la politique de confidentialité | ✅ |
| VI. Paramètres | Délais des scénarios, fréquence, plages au back-office ; niveaux de relance d'impayés lus dans Odoo ; délais de prévenance de F06 inchangés | ✅ |
| VII. Identité visuelle | Gabarit commun existant, complété (pied de préférences, mentions, mode sombre) | ✅ |
| VIII. Accessibilité | Structure, textes de remplacement, version texte, contrastes de la charte | ✅ |
| IX. Ton éditorial | Textes par défaut sobres, vouvoiement ; modifiables sans développeur | ✅ |
| X. Petits incréments | 8 user stories testables séparément ; tests de contrat du connecteur | ✅ |
| XI. Langue et périmètre | Français | ✅ |

Aucune violation. ✅

## Project Structure

```text
specs/010-emailing-automatise/ : spec, plan, research, data-model, quickstart, contracts/(emailing.md, interfaces.md)
src/domaine/emailing/ : catalogue (familles, modèles), envoi (décision, trace, file), preferences,
  jetons, frequence, modeles (textes modifiables), scenarios/(reapprovisionnement, panier, alertes, impayes),
  campagnes, suivi (remise, ouvertures, conversions), rejets
src/emails/ : Gabarit (pied selon la famille, mentions), textes par défaut des modèles existants
src/connecteurs/emailing/ : contrat complété (famille, version texte, désinscription, suivi)
src/connecteurs/odoo/ : niveaux de relance d'impayés (démo + interface)
src/domaine/commande/notifications.ts : `envoyer()` redirigé vers F10 (aucun module à réécrire)
app/(public)/mon-compte/preferences/ ; app/(public)/preferences/[jeton]/ ; app/(public)/panier/recommander/
app/api/emails/desinscription/ (désinscription en un clic, POST)
app/(back-office)/admin/emails/(envois|scenarios|modeles|campagnes)/
prisma/site/schema.prisma ; prisma/demo/schema.prisma (NiveauRelance)
tests/unit/emailing/, tests/contract/emailing/, tests/e2e/f10/
```

## Décisions à prendre par la porteuse du projet

**Toutes les propositions par défaut ont été validées le 2026-10-20.**

| # | Question | Proposition par défaut | Quand |
|---|---|---|---|
| D1 | **Outil d'envoi réel** (branché en F14) | **Brevo** (entreprise française, données hébergées dans l'Union européenne, emails transactionnels et commerciaux, SMS pour les alertes d'équipe, suivi de remise et d'ouverture, désinscription en un clic). Envoi d'un sous-domaine dédié (`mail.explocardio.fr`) avec SPF, DKIM et DMARC | Avant F14 (aucun impact en phase 1) |
| D2 | **Modification des modèles** | Au **back-office du site**, pas dans Brevo : objet, titre, texte d'aperçu et paragraphes de chaque modèle, avec des variables (`{{nom}}`, `{{date_fin}}` …) choisies dans une liste ; la mise en page, les tableaux (lignes de commande, RIB) et les boutons restent fixes. Brouillon → aperçu → email de test → publication ; « Revenir au texte d'origine » | Avant l'implémentation |
| D3 | **Familles des emails existants** | Tous transactionnels, sauf les rappels de fin des droits d'assistance et d'expiration des bons (F06), qui deviennent des emails de service désactivables. Les rappels de fin de période Cloud et d'échéance de location restent transactionnels (engagement en cours) | Avant l'implémentation |
| D4 | **Relances d'impayés** | Trois niveaux **lus dans Odoo** (relances de factures), fixés en jours avant la conséquence : J-5, J-2, et la veille (dernière relance, qui annonce la conséquence et sa date). Concernés : virement attendu (conséquence : annulation de la commande, F04) et prélèvement refusé d'une location ou d'un abonnement logiciel (conséquence : suspension, F05 et F12). Ils remplacent le rappel de virement actuel de F04 ; l'email immédiat « prélèvement refusé » de F05 reste. Un niveau déjà dépassé n'est pas rattrapé | Avant l'implémentation |
| D5 | **Relance de réapprovisionnement** | Consommables uniquement ; au moins 3 commandes du même article ; chaque intervalle à ±50 % de l'intervalle moyen ; envoi 7 jours avant la date prévue (réglable) ; plusieurs consommables dus à moins de 7 jours d'écart regroupés dans un seul email ; article retiré ou en rupture : pas de relance. Bouton « Commander de nouveau » : ajoute l'article (même quantité) au panier, après connexion | Avant l'implémentation |
| D6 | **Fréquence et plages** | Au plus 2 emails facultatifs ou commerciaux par client et par période de 7 jours ; au-delà, l'email est **reporté** au premier jour possible (abandonné s'il n'a plus d'objet ou après 7 jours). Commerciaux : jours ouvrés de 8 h à 19 h (heure de Paris, jours fériés exclus). Les emails de service partent aussi dans ces plages ; les transactionnels, toujours immédiatement | Avant l'implémentation |
| D7 | **Campagnes commerciales** | Écran Back-office → Emails → Campagnes : type (promotion, vente flash, nouveauté), objet, texte, lien, date d'envoi ; destinataires = abonnés confirmés à la newsletter (comptes et inscrits du pied de page), comptes suspendus ou refusés exclus ; email de test obligatoire avant programmation ; annulable jusqu'à l'envoi | Avant l'implémentation |
| D8 | **Lien de préférences sans connexion** | Lien signé propre à l'adresse, sans date d'expiration (comme une désinscription), qui ne montre que les réglages, jamais d'information du compte. Désinscription en un clic depuis l'email ; en mode réel, en-tête `List-Unsubscribe` exigé par Gmail et Yahoo | Avant l'implémentation |
| D9 | **Mesure des ouvertures** | Ouvertures et remise lues auprès de l'outil (en démonstration : « ouvert » quand le message est consulté dans la boîte de démonstration) ; « suivi d'une commande » = commande passée dans les 14 jours (pour une relance de consommable : contenant cet article). Pas de suivi des clics en phase 1. Mention à ajouter dans la politique de confidentialité (à valider par le conseil juridique) | Avant l'implémentation |
| D10 | **Adresse qui rejette les messages** | Un rejet définitif (adresse inexistante) ou trois rejets temporaires successifs → envois facultatifs et commerciaux suspendus vers cette adresse, alerte à l'équipe ; les transactionnels continuent d'être tentés, et chaque échec de transactionnel est signalé. L'administrateur peut lever la suspension | Avant l'implémentation |

## Complexity Tracking

Aucune violation de la constitution à justifier.
