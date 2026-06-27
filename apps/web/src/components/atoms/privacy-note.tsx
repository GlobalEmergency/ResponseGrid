/**
 * PrivacyNote — Prominent callout reminding users that data is private
 * and only accessible to authorised emergency personnel.
 */
export function PrivacyNote() {
  return (
    <div
      role="note"
      aria-label="Aviso de privacidad"
      className="flex items-start gap-3 rounded-lg border-2 border-blue-300 bg-blue-50 px-4 py-3"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex-shrink-0 text-blue-600 text-lg leading-none"
      >
        🔒
      </span>
      <p className="text-sm text-blue-900 leading-snug">
        <strong className="font-semibold">Tus datos son privados.</strong> La
        información que facilites solo es accesible para el personal autorizado
        de la emergencia. Nunca se publica ni comparte públicamente.
      </p>
    </div>
  );
}
