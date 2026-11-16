# Quickstart — vérifier F25

## Phase 1 (sans clé Brevo)

```bash
npx vitest run tests/contract/emailing.test.ts tests/unit/emailing-reel
```

Attendu : suite de contrat verte en démonstration (dont la plainte simulée) ; tests du client
(`fetch` simulé) : envoi, idempotence par étiquette, correspondance des événements, erreurs,
masquage de la clé ; garde : recette sans liste → configuration incomplète, adresse hors liste
→ refus, production avec liste → signalement.

## Phase 3 (site de recette)

Prérequis : application Scalingo de recette ; variables `CONNECTOR_EMAILING=real`,
`EMAILING_API_KEY` (saisie par Pauline ou Régis), `EMAILING_ENVIRONNEMENT=recette`,
`EMAILING_ADRESSES_AUTORISEES` (équipe + boîtes de test Gmail, Outlook, o2switch),
`EMAILING_TEST_DESTINATAIRE`.

1. **Contrat réel** : lancer la suite de contrat depuis la recette → verte.
2. **Remise** : déclencher inscription, commande payée et facture vers les trois boîtes de test.
   Attendu : arrivée en boîte de réception en moins de 2 minutes ; expéditeur
   « ExploCardio.fr » ; rendu identique à l'aperçu ; ni logo ni pied de page Brevo ; en-têtes
   `dkim=pass` et `dmarc=pass` (afficher l'original du message).
3. **Réponse** : répondre à un email → arrivée dans la boîte contact@explocardio.fr.
4. **Suivi** : back-office › Emails → état « remis » en moins de 5 minutes ; ouvrir l'email →
   date d'ouverture affichée.
5. **Rejet** : ajouter temporairement une adresse inexistante d'un domaine autorisé, envoyer →
   « rejeté », définitif, adresse suspendue, alerte reçue.
6. **Désinscription en un clic** : sur un email de service reçu dans Gmail, bouton
   « Se désabonner » → préférence retirée sur le site en moins d'une minute.
7. **Plainte** : marquer un email commercial comme indésirable → consentement commercial retiré
   au relevé suivant.
8. **Garde de recette** : déclencher un email vers un client réel de la copie Odoo → aucun envoi,
   ligne « Bloqué en recette » consultable au back-office.
9. **Indisponibilité** : remplacer temporairement la clé par une valeur fausse → envois
   conservés, alerte ; remettre la clé → départ unique de chaque email.
10. **Démonstration inchangée** : site de démonstration (`CONNECTOR_EMAILING=demo`) → suite
    complète verte.
