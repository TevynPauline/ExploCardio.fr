// Erreurs typées communes à tous les connecteurs, identiques dans les deux modes
// (contracts/common.md, FR-005). Le code est stable : les pages s'en servent pour afficher le
// message client prévu par chaque spec. Le message est destiné à l'équipe.

export type CodeErreurConnecteur =
  | "SERVICE_UNAVAILABLE"
  | "PAYMENT_DECLINED"
  | "AUTHENTICATION_REQUIRED"
  | "OUT_OF_STOCK"
  | "CLOUD_ACCESS_DENIED"
  | "NOT_FOUND"
  | "CONFIGURATION_INCOMPLETE"
  | "DEMO_DATA_REJECTED"
  | "INVALID_SIGNATURE";

export abstract class ErreurConnecteur extends Error {
  abstract readonly code: CodeErreurConnecteur;
  constructor(
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ServiceUnavailable extends ErreurConnecteur {
  readonly code = "SERVICE_UNAVAILABLE";
  constructor(service: string, details?: Record<string, unknown>) {
    super(`Le service ${service} ne répond pas.`, details);
  }
}

export class PaymentDeclined extends ErreurConnecteur {
  readonly code = "PAYMENT_DECLINED";
  constructor(details?: Record<string, unknown>) {
    super("Le paiement a été refusé.", details);
  }
}

export class AuthenticationRequired extends ErreurConnecteur {
  readonly code = "AUTHENTICATION_REQUIRED";
  constructor(details?: Record<string, unknown>) {
    super("Une authentification forte du porteur de la carte est demandée.", details);
  }
}

export class OutOfStock extends ErreurConnecteur {
  readonly code = "OUT_OF_STOCK";
  constructor(references: string[]) {
    super(`Quantité indisponible pour : ${references.join(", ")}.`, { references });
  }
}

export class CloudAccessDenied extends ErreurConnecteur {
  readonly code = "CLOUD_ACCESS_DENIED";
  constructor(motif: string, details?: Record<string, unknown>) {
    super(`La plateforme Cloud a refusé l'ouverture de l'accès : ${motif}.`, details);
  }
}

export class NotFound extends ErreurConnecteur {
  readonly code = "NOT_FOUND";
  constructor(objet: string, reference: string) {
    super(`${objet} introuvable : ${reference}.`, { objet, reference });
  }
}

export class ConfigurationIncomplete extends ErreurConnecteur {
  readonly code = "CONFIGURATION_INCOMPLETE";
  constructor(connecteur: string, variablesManquantes: string[]) {
    super(
      `Le connecteur ${connecteur} est en mode réel mais sa configuration est incomplète (${variablesManquantes.join(", ") || "implémentation réelle non livrée"}). Il ne bascule pas en démonstration.`,
      { connecteur, variablesManquantes },
    );
  }
}

export class DemoDataRejected extends ErreurConnecteur {
  readonly code = "DEMO_DATA_REJECTED";
  constructor(connecteur: string) {
    super(
      `Donnée de démonstration refusée : elle ne doit jamais être envoyée au service réel ${connecteur}.`,
      { connecteur },
    );
  }
}

export class InvalidSignature extends ErreurConnecteur {
  readonly code = "INVALID_SIGNATURE";
  constructor() {
    super("La signature de l'événement reçu est invalide.");
  }
}

export function estErreurConnecteur(e: unknown): e is ErreurConnecteur {
  return e instanceof ErreurConnecteur;
}
