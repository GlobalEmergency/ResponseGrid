/**
 * Raised when a registration/onboarding attempt does not provide a contact
 * phone (required for every account). Mapped to HTTP 400.
 */
export class PhoneRequiredError extends Error {
  constructor() {
    super('El teléfono de contacto es obligatorio');
    this.name = 'PhoneRequiredError';
  }
}
