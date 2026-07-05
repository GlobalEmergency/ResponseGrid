/**
 * Raised when a registration/onboarding attempt does not accept the required
 * legal documents (Terms of Service and/or Privacy Policy). Mapped to HTTP 400.
 */
export class ConsentRequiredError extends Error {
  constructor() {
    super(
      'Debes aceptar los términos del servicio y la política de privacidad',
    );
    this.name = 'ConsentRequiredError';
  }
}
