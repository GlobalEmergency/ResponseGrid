import { EmailMessage } from '../domain/ports/email-sender';

export interface SetPasswordEmailParams {
  /** Recipient email address. */
  to: string;
  /** Display name, used in the greeting. */
  name: string;
  /** Absolute URL of the set-password page, carrying the token. */
  link: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render the bilingual (ES/EN) "create your password" email. The donor's locale
 * is not known at pre-registration time, so both languages ship in one message —
 * Spanish first (the platform's primary language), English below.
 */
export function renderSetPasswordEmail(
  params: SetPasswordEmailParams,
): EmailMessage {
  const name = params.name.trim() || 'Hola';
  const { link } = params;
  const safeName = escapeHtml(name);
  const safeLink = escapeHtml(link);

  const subject = 'Crea tu contraseña · Create your password — ResponseGrid';

  const text = [
    `Hola ${name},`,
    '',
    'Se ha creado un perfil para ti en ResponseGrid a partir de tu donación.',
    'Crea tu contraseña para acceder y ver tus donaciones:',
    link,
    '',
    'Este enlace caduca y solo puede usarse una vez. Si no reconoces esta',
    'solicitud, puedes ignorar este mensaje.',
    '',
    '— — —',
    '',
    `Hi ${name},`,
    '',
    'A profile was created for you on ResponseGrid from your donation.',
    'Set your password to sign in and see your donations:',
    link,
    '',
    'This link expires and can only be used once. If you did not expect this,',
    'you can safely ignore this email.',
  ].join('\n');

  const html = [
    '<div>',
    `<p>Hola ${safeName},</p>`,
    '<p>Se ha creado un perfil para ti en ResponseGrid a partir de tu donación. ',
    'Crea tu contraseña para acceder y ver tus donaciones:</p>',
    `<p><a href="${safeLink}">Crear mi contraseña</a></p>`,
    '<p>Este enlace caduca y solo puede usarse una vez. Si no reconoces esta ',
    'solicitud, puedes ignorar este mensaje.</p>',
    '<hr />',
    `<p>Hi ${safeName},</p>`,
    '<p>A profile was created for you on ResponseGrid from your donation. ',
    'Set your password to sign in and see your donations:</p>',
    `<p><a href="${safeLink}">Set your password</a></p>`,
    '<p>This link expires and can only be used once. If you did not expect ',
    'this, you can safely ignore this email.</p>',
    '</div>',
  ].join('');

  return { to: params.to, subject, text, html };
}
