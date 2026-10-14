# Contrats des connecteurs — F11

Chaque fichier décrit **ce qu'un connecteur promet aux pages du site**, indépendamment de son
mode (démonstration ou réel). Les tests de contrat vérifient ces promesses dans les deux
modes (FR-006).

| Fichier | Connecteur | Mode démonstration | Mode réel (F14) |
|---|---|---|---|
| [common.md](common.md) | Règles communes, erreurs, registre | — | — |
| [odoo.md](odoo.md) | Odoo, découpé en 8 domaines | Base de démonstration | API externe d'Odoo |
| [stripe.md](stripe.md) | Paiements et abonnements | Page de paiement de démonstration | Stripe Checkout, Billing, webhooks |
| [pca.md](pca.md) | Accès à la plateforme Cloud | Simulation (modes automatique et manuel) | API Nelson ou tâches manuelles |
| [emailing.md](emailing.md) | Emails et SMS | Boîte de démonstration | Outil d'emailing (Brevo par défaut) |

Il n'y a **pas** de connecteur d'agenda (prise de rendez-vous hors du site) ni de téléphonie
(la ligne WhatsApp est un simple paramètre affiché).
